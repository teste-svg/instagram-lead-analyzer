const puppeteer = require('puppeteer');
const axios = require('axios');

/**
 * Scrape Instagram profile data using Puppeteer
 * Falls back to public API endpoints when possible
 */
async function scrapeInstagramProfile(username) {
    console.log(`[Scraper] Iniciando scraping para @${username}`);

    // Try public API first (faster and more reliable)
    try {
        const apiData = await fetchFromPublicAPI(username);
        if (apiData) {
            console.log('[Scraper] Dados obtidos via API pública');
            return apiData;
        }
    } catch (error) {
        console.log('[Scraper] API pública falhou, tentando Puppeteer...');
    }

    // Fallback to Puppeteer scraping
    return await scrapeWithPuppeteer(username);
}

/**
 * Fetch profile data from Instagram's public API endpoints
 */
async function fetchFromPublicAPI(username) {
    try {
        // Instagram's web profile data endpoint
        const response = await axios.get(
            `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'X-IG-App-ID': '936619743392459',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                timeout: 10000
            }
        );

        const userData = response.data?.data?.user;

        if (!userData) {
            return null;
        }

        return {
            username: userData.username,
            full_name: userData.full_name,
            bio: userData.biography,
            followers: formatNumber(userData.edge_followed_by?.count),
            following: formatNumber(userData.edge_follow?.count),
            posts: formatNumber(userData.edge_owner_to_timeline_media?.count),
            profile_pic: userData.profile_pic_url_hd || userData.profile_pic_url,
            is_verified: userData.is_verified,
            is_business: userData.is_business_account,
            is_private: userData.is_private,
            category: userData.category_name || userData.business_category_name,
            website: userData.external_url,
            recent_posts: extractRecentPosts(userData.edge_owner_to_timeline_media?.edges)
        };
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 429) {
            console.log('[Scraper] Rate limited or auth required');
        }
        throw error;
    }
}

/**
 * Scrape profile using Puppeteer (headless browser)
 */
async function scrapeWithPuppeteer(username) {
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080'
            ]
        });

        const page = await browser.newPage();

        // Set viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Navigate to profile
        const url = `https://www.instagram.com/${username}/`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for content to load
        await page.waitForSelector('header', { timeout: 10000 });

        // Check if profile exists and is not private
        const isPrivate = await page.evaluate(() => {
            const privateText = document.body.innerText;
            return privateText.includes('Esta conta é privada') ||
                privateText.includes('This account is private');
        });

        // Extract profile data
        const profileData = await page.evaluate(() => {
            const getTextContent = (selector) => {
                const el = document.querySelector(selector);
                return el ? el.textContent.trim() : '';
            };

            const getMetaContent = (property) => {
                const meta = document.querySelector(`meta[property="${property}"]`);
                return meta ? meta.getAttribute('content') : '';
            };

            // Get stats from header
            const statElements = document.querySelectorAll('header section ul li');
            const stats = Array.from(statElements).map(el => el.textContent);

            // Parse stats
            const parseStatValue = (stat) => {
                const match = stat.match(/[\d.,]+[KMkm]?/);
                return match ? match[0] : '0';
            };

            // Get profile picture
            const profilePic = document.querySelector('header img')?.src ||
                document.querySelector('img[alt*="profile"]')?.src;

            // Get bio - multiple possible selectors
            const bioElement = document.querySelector('header section > div:last-child span') ||
                document.querySelector('.-vDIg span') ||
                document.querySelector('header section div span:not([class])');

            // Get name
            const nameElement = document.querySelector('header section h2') ||
                document.querySelector('header section span');

            return {
                profile_pic: profilePic,
                bio: bioElement?.textContent || '',
                posts: stats[0] ? parseStatValue(stats[0]) : '0',
                followers: stats[1] ? parseStatValue(stats[1]) : '0',
                following: stats[2] ? parseStatValue(stats[2]) : '0',
                title: document.title,
                description: getMetaContent('og:description')
            };
        });

        // Extract name and other info from page title/meta
        const titleMatch = profileData.title.match(/(.+?)\s*\(@?(\w+)\)/);

        return {
            username: username,
            full_name: titleMatch ? titleMatch[1] : username,
            bio: profileData.bio || extractBioFromDescription(profileData.description),
            followers: profileData.followers,
            following: profileData.following,
            posts: profileData.posts,
            profile_pic: profileData.profile_pic,
            is_private: isPrivate,
            is_verified: false,
            is_business: false,
            category: null,
            website: null,
            recent_posts: []
        };

    } catch (error) {
        console.error('[Scraper] Puppeteer error:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Extract recent posts data
 */
function extractRecentPosts(edges) {
    if (!edges || !Array.isArray(edges)) return [];

    return edges.slice(0, 12).map(edge => {
        const node = edge.node;
        return {
            id: node.id,
            shortcode: node.shortcode,
            thumbnail: node.thumbnail_src || node.display_url,
            caption: node.edge_media_to_caption?.edges[0]?.node?.text || '',
            likes: node.edge_liked_by?.count || 0,
            comments: node.edge_media_to_comment?.count || 0,
            is_video: node.is_video,
            timestamp: node.taken_at_timestamp
        };
    });
}

/**
 * Format large numbers (e.g., 15000 -> "15K")
 */
function formatNumber(num) {
    if (!num) return '0';

    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    }
    return num.toString();
}

/**
 * Extract bio from Instagram meta description
 */
function extractBioFromDescription(description) {
    if (!description) return '';

    // Instagram description format: "X Followers, Y Following, Z Posts - See Instagram photos and videos from Name (@username)"
    // or includes bio after the stats
    const parts = description.split(' - ');
    if (parts.length > 1) {
        // Remove the "See Instagram photos..." part
        const bioText = parts.slice(1).join(' - ');
        return bioText.replace(/See Instagram photos and videos from .+$/, '').trim();
    }
    return '';
}

module.exports = {
    scrapeInstagramProfile
};
