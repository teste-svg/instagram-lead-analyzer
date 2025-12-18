// Instagram Lead Analyzer - Main Application

class LeadAnalyzer {
    constructor() {
        this.n8nWebhookUrl = localStorage.getItem('n8nWebhook') || '';

        // Multi-expert system
        this.experts = JSON.parse(localStorage.getItem('experts')) || this.getDefaultExperts();
        this.activeExpertId = localStorage.getItem('activeExpertId') || '1';
        this.trainingData = this.getActiveExpert()?.data || {};

        this.history = JSON.parse(localStorage.getItem('analysisHistory')) || [];

        // Current lead context for conversation continuation
        this.currentLeadData = null;
        this.conversationHistory = [];

        // Progress tracking
        this.progressInterval = null;
        this.currentProgress = 0;
        this.currentStep = 0;
        this.progressSteps = [
            { step: 1, text: 'Conectando ao servidor...', maxProgress: 15 },
            { step: 2, text: 'Extraindo dados do perfil...', maxProgress: 40 },
            { step: 3, text: 'Analisando foto de perfil...', maxProgress: 60 },
            { step: 4, text: 'IA gerando análise e roteiros...', maxProgress: 85 },
            { step: 5, text: 'Finalizando...', maxProgress: 100 }
        ];

        this.init();
    }

    getDefaultExperts() {
        return [
            { id: '1', name: 'Expert 1', data: {} },
            { id: '2', name: 'Expert 2', data: {} },
            { id: '3', name: 'Expert 3', data: {} }
        ];
    }

    getActiveExpert() {
        return this.experts.find(e => e.id === this.activeExpertId) || this.experts[0];
    }

    setActiveExpert(expertId) {
        this.activeExpertId = expertId;
        localStorage.setItem('activeExpertId', expertId);
        this.trainingData = this.getActiveExpert()?.data || {};
        this.loadTrainingForm();
        this.updateExpertSelector();
    }

    saveCurrentExpert() {
        const expert = this.getActiveExpert();
        if (expert) {
            expert.name = this.trainingData.userName || `Expert ${expert.id}`;
            expert.data = { ...this.trainingData };
            localStorage.setItem('experts', JSON.stringify(this.experts));
            this.updateExpertCards();
            this.updateAnalyzeExpertSelector();
            this.showToast(`Expert "${expert.name}" salvo!`, 'success');
        }
    }

    editExpert(expertId) {
        this.activeExpertId = expertId;
        localStorage.setItem('activeExpertId', expertId);

        const expert = this.getActiveExpert();
        this.trainingData = expert?.data || {};

        // Update editing title
        const titleEl = document.getElementById('editingExpertName');
        if (titleEl) {
            titleEl.textContent = expert?.name || `Expert ${expertId}`;
        }

        // Load form with expert data
        this.loadTrainingForm();

        // Show edit form, hide cards
        const cardsGrid = document.getElementById('expertCardsGrid');
        const editForm = document.getElementById('expertEditForm');

        console.log('editExpert called:', expertId);
        console.log('cardsGrid:', cardsGrid);
        console.log('editForm:', editForm);

        if (cardsGrid) {
            cardsGrid.classList.add('hidden');
            console.log('Cards hidden');
        }
        if (editForm) {
            editForm.classList.remove('hidden');
            editForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            console.log('Form shown, classes:', editForm.className);
        }
    }

    showExpertList() {
        // Update expert cards with current data
        this.updateExpertCards();

        // Show cards, hide edit form
        const cardsGrid = document.getElementById('expertCardsGrid');
        const editForm = document.getElementById('expertEditForm');

        if (cardsGrid) cardsGrid.classList.remove('hidden');
        if (editForm) editForm.classList.add('hidden');
    }

    updateExpertCards() {
        this.experts.forEach(expert => {
            const nameEl = document.getElementById(`expertName${expert.id}`);
            const statusEl = document.getElementById(`expertStatus${expert.id}`);
            const previewEl = document.getElementById(`expertPreview${expert.id}`);
            const cardEl = document.querySelector(`[data-expert-id="${expert.id}"]`);

            const isConfigured = expert.data && expert.data.userName;

            if (nameEl) {
                nameEl.textContent = expert.name || `Expert ${expert.id}`;
            }

            if (statusEl) {
                if (isConfigured) {
                    statusEl.textContent = '✓ Configurado';
                    statusEl.className = 'expert-status configured';
                } else {
                    statusEl.textContent = 'Não configurado';
                    statusEl.className = 'expert-status not-configured';
                }
            }

            if (previewEl) {
                if (isConfigured) {
                    const data = expert.data;
                    previewEl.innerHTML = `
                        <p class="expert-preview-text">
                            <strong>Negócio:</strong> ${data.userBusiness || '-'}<br>
                            <strong>Nicho:</strong> ${data.userNiche || '-'}
                        </p>
                    `;
                } else {
                    previewEl.innerHTML = `<p class="expert-preview-text">Clique para configurar</p>`;
                }
            }

            if (cardEl) {
                if (isConfigured) {
                    cardEl.classList.add('configured');
                } else {
                    cardEl.classList.remove('configured');
                }
            }
        });
    }

    init() {
        this.bindNavigation();
        this.bindAnalyzer();
        this.bindTraining();
        this.bindSettings();
        this.bindConversation();
        this.bindMessageBuilder();
        this.loadSavedData();
        this.renderHistory();
        this.updateExpertCards();
        this.updateAnalyzeExpertSelector();
    }

    updateAnalyzeExpertSelector() {
        const selector = document.getElementById('analyzeExpertSelector');
        if (!selector) return;

        selector.innerHTML = '<option value="">Selecione um Expert</option>' +
            this.experts.map(expert => {
                const isConfigured = expert.data && expert.data.userName;
                const name = isConfigured ? expert.data.userName : `Expert ${expert.id} (não configurado)`;
                return `<option value="${expert.id}" ${!isConfigured ? 'disabled' : ''}>
                    ${name}
                </option>`;
            }).join('');
    }

    // Navigation
    bindNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.navigateTo(section);
            });
        });
    }

    navigateTo(sectionId) {
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });

        // Update sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.toggle('active', section.id === sectionId);
        });
    }

    // Analyzer
    bindAnalyzer() {
        const scrapeBtn = document.getElementById('scrapeBtn');
        const profileUrl = document.getElementById('profileUrl');
        const copyScript = document.getElementById('copyScript');

        if (scrapeBtn) {
            scrapeBtn.addEventListener('click', () => this.analyzeProfile());
        }

        if (profileUrl) {
            profileUrl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.analyzeProfile();
            });
        }

        if (copyScript) {
            copyScript.addEventListener('click', () => this.copyScriptToClipboard());
        }
    }

    async analyzeProfile() {
        const urlInput = document.getElementById('profileUrl');
        const url = urlInput.value.trim();

        if (!url) {
            this.showToast('Por favor, insira uma URL do Instagram', 'error');
            return;
        }

        // Validate Instagram URL
        const username = this.extractUsername(url);
        if (!username) {
            this.showToast('URL inválida. Use o formato: instagram.com/username', 'error');
            return;
        }

        // Check if expert is selected
        const expertSelector = document.getElementById('analyzeExpertSelector');
        const selectedExpertId = expertSelector?.value;

        if (!selectedExpertId) {
            this.showToast('Por favor, selecione um Expert antes de analisar', 'error');
            expertSelector?.focus();
            return;
        }

        // Load the selected expert's training data
        const selectedExpert = this.experts.find(e => e.id === selectedExpertId);
        if (selectedExpert?.data && selectedExpert.data.userName) {
            this.trainingData = selectedExpert.data;
        } else {
            this.showToast('O Expert selecionado não está configurado. Configure-o primeiro.', 'error');
            this.navigateTo('training');
            return;
        }

        // Check if n8n webhook is configured
        if (!this.n8nWebhookUrl) {
            this.showToast('Configure o webhook do n8n nas Configurações', 'error');
            this.navigateTo('settings');
            return;
        }

        this.showLoading(true);
        this.startProgressAnimation();

        try {
            // Create AbortController for timeout (4 minutes to allow for Apify + Claude processing)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 240000);

            const response = await fetch(this.n8nWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'analyze_profile',
                    username: username,
                    url: url,
                    training_data: this.trainingData
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Sem detalhes');
                console.error('Resposta do servidor:', response.status, errorText);
                throw new Error(`Erro do servidor (${response.status}): ${errorText.substring(0, 100)}`);
            }

            // Check if response has content
            const responseText = await response.text();
            if (!responseText || responseText.trim() === '') {
                throw new Error('n8n retornou resposta vazia. Verifique se o workflow está ativo e configurado corretamente.');
            }

            // Try to parse JSON
            let rawData;
            try {
                rawData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Erro ao fazer parse do JSON:', responseText.substring(0, 200));
                throw new Error('Resposta do n8n não é JSON válido. Verifique o workflow.');
            }

            console.log('Resposta do n8n:', rawData);

            let data;

            // Map n8n response structure to expected internal format
            // The n8n workflow can return different formats depending on version:
            // Format 1 (old): { status: 'success', data: {...}, metadata: {...} }
            // Format 2 (new): { profile: {...}, photo_analysis: '...', ... }

            if (rawData.profile) {
                // New format - already has profile object
                data = {
                    profile: {
                        username: rawData.profile.username || username,
                        full_name: rawData.profile.full_name || '',
                        profile_pic: rawData.profile.profile_pic || rawData.profile.profilePicUrl || '',
                        bio: rawData.profile.bio || '',
                        followers: rawData.profile.followers_formatted || rawData.profile.followers || 0,
                        following: rawData.profile.following_formatted || rawData.profile.following || 0,
                        posts: rawData.profile.posts_formatted || rawData.profile.posts || 0,
                        website: rawData.profile.website || '',
                        category: rawData.profile.category || '',
                        is_business: rawData.profile.is_business || false
                    },
                    // Map inspirational cards data
                    tactics: rawData.tactics || [],
                    messages: rawData.messages || [],
                    ideas: rawData.ideas || [],
                    triggers: rawData.triggers || [],
                    // Map deep analysis data
                    bio_analysis: rawData.bio_analysis || '',
                    gender: rawData.gender || 'unknown',
                    // Ensure posts_analyzed is an array (n8n may return count or array)
                    posts_analyzed: Array.isArray(rawData.recent_posts) ? rawData.recent_posts :
                        Array.isArray(rawData.posts_analyzed) ? rawData.posts_analyzed : [],
                    // Legacy fields
                    photo_analysis: rawData.photo_analysis || 'Análise visual não disponível.',
                    connection_points: rawData.connection_points || [],
                    sales_opportunities: rawData.sales_opportunities || [],
                    approach_script: rawData.approach_script || '',
                    conversation_guide: rawData.conversation_guide || '',
                    executive_summary: rawData.executive_summary || ''
                };

                console.log('Dados mapeados:', data);
                console.log('Tactics recebidos:', data.tactics);
                console.log('Messages recebidos:', data.messages);
            } else if (rawData.status === 'success' && rawData.data) {
                // Old format with status wrapper
                const aiAnalysis = rawData.data.ai_analysis?.[0] || rawData.data.ai_analysis || {};

                // Generate fallback profile pic URL if none provided
                const profilePicUrl = rawData.data.profile_pic
                    || rawData.data.profilePicUrl
                    || rawData.data.profilePicUrlNoIframeCookies
                    || `https://ui-avatars.com/api/?name=${encodeURIComponent(rawData.data.full_name || rawData.data.username || username)}&background=8b5cf6&color=fff&size=150&bold=true`;

                data = {
                    profile: {
                        username: rawData.data.username || username,
                        full_name: rawData.data.full_name || rawData.data.fullName || '',
                        profile_pic: profilePicUrl,
                        bio: rawData.data.bio || rawData.data.biography || '',
                        followers: rawData.metadata?.followers || rawData.data.followers || 0,
                        following: rawData.data.following || rawData.data.followingCount || 0,
                        posts: rawData.data.posts || rawData.data.postsCount || 0,
                        website: rawData.data.website || rawData.data.externalUrl || '',
                        category: rawData.data.category || rawData.data.businessCategoryName || '',
                        is_business: rawData.data.is_business || rawData.data.isBusinessAccount || false
                    },
                    // Map inspirational cards data (from rawData if available)
                    tactics: rawData.tactics || aiAnalysis.tactics || [],
                    messages: rawData.messages || aiAnalysis.messages || [],
                    ideas: rawData.ideas || aiAnalysis.ideas || [],
                    triggers: rawData.triggers || aiAnalysis.triggers || [],
                    // Deep analysis
                    bio_analysis: rawData.bio_analysis || '',
                    gender: rawData.gender || 'unknown',
                    posts_analyzed: rawData.posts_analyzed || [],
                    // Legacy fields
                    photo_analysis: aiAnalysis.photo_analysis || 'Análise visual não disponível.',
                    connection_points: aiAnalysis.connection_points || [],
                    sales_opportunities: aiAnalysis.sales_opportunities || [],
                    approach_script: aiAnalysis.approach_script || '',
                    conversation_guide: aiAnalysis.conversation_guide || '',
                    executive_summary: aiAnalysis.executive_summary || ''
                };
            } else {
                console.error('Estrutura de resposta inválida:', rawData);
                throw new Error('Resposta do servidor com formato inválido');
            }

            // Complete progress animation
            this.completeProgress();
            await this.delay(500);

            // Store current lead data for conversation continuation
            this.currentLeadData = data;
            this.conversationHistory = [];

            this.displayResults(data);
            this.saveToHistory(data);
            this.showLoading(false);
            this.showToast('Análise concluída com sucesso!', 'success');

        } catch (error) {
            console.error('Error:', error);
            this.stopProgressAnimation();
            this.showLoading(false);

            // Handle specific error types
            if (error.name === 'AbortError') {
                this.showToast('A análise demorou muito. Tente novamente.', 'error');
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                this.showToast('Modo demo: exibindo dados de exemplo', 'warning');
                const mockData = this.generateMockData(username);
                this.displayResults(mockData);
                this.saveToHistory(mockData);
            } else {
                this.showToast('Erro ao analisar perfil: ' + error.message, 'error');
            }
        }
    }

    extractUsername(url) {
        // Handle various Instagram URL formats
        const patterns = [
            /instagram\.com\/([^\/\?]+)/,
            /^@?([a-zA-Z0-9._]+)$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1].replace('@', '');
            }
        }
        return null;
    }

    generateMockData(username) {
        return {
            profile: {
                username: username,
                full_name: 'Nome do Usuário',
                bio: 'Empreendedor Digital | Ajudo pessoas a conquistarem liberdade financeira através do marketing digital 🚀\n📍 São Paulo, SP\n👇 Acesse meu conteúdo gratuito',
                followers: '15.2K',
                following: '892',
                posts: '347',
                profile_pic: 'https://via.placeholder.com/150',
                is_verified: false,
                is_business: true,
                category: 'Empreendedor',
                website: 'https://linktr.ee/exemplo'
            },
            photo_analysis: 'A foto de perfil mostra uma pessoa sorridente em ambiente profissional, transmitindo confiança e acessibilidade. O enquadramento frontal e iluminação adequada sugerem preocupação com a imagem pessoal. O fundo neutro indica profissionalismo.',
            connection_points: [
                'Interesse em empreendedorismo digital - tema central do perfil',
                'Localização em São Paulo - possível menção a eventos locais',
                'Foco em liberdade financeira - dor comum do público',
                'Presença ativa em redes sociais - oportunidade de engajamento',
                'Oferece conteúdo gratuito - abertura para relacionamento'
            ],
            sales_opportunities: [
                'Alta probabilidade de interesse em ferramentas de automação',
                'Potencial cliente para mentorias de escala',
                'Possível interesse em networking com outros empreendedores',
                'Abertura para parcerias e colaborações',
                'Busca por otimização de processos digitais'
            ],
            approach_script: this.generateApproachScript(username),
            conversation_guide: this.generateConversationGuide(),
            executive_summary: this.generateExecutiveSummary(username)
        };
    }

    generateApproachScript(username) {
        const tone = this.trainingData.communicationTone || 'casual';
        const style = this.trainingData.approachStyle || 'curious';
        const userName = this.trainingData.userName || 'você';

        let script = `
            <h4>1. Primeira Mensagem (Quebra-gelo)</h4>
            <p>Objetivo: Criar conexão genuína sem parecer vendedor</p>
            <div class="message-example">
                "E aí, ${username}! Vi seu conteúdo sobre empreendedorismo digital e achei muito massa. Também trabalho nessa área e curti demais sua abordagem sobre liberdade financeira. Qual foi o maior desafio que você enfrentou até aqui?"
            </div>

            <h4>2. Segunda Mensagem (Após resposta)</h4>
            <p>Objetivo: Aprofundar a conversa e identificar dores</p>
            <div class="message-example">
                "Cara, te entendo totalmente! [Referência à resposta dele]. Isso é super comum no nosso mercado. Eu passei por algo parecido quando [história breve relacionada]. O que você tá fazendo atualmente pra resolver isso?"
            </div>

            <h4>3. Terceira Mensagem (Transição)</h4>
            <p>Objetivo: Apresentar possibilidade de ajuda</p>
            <div class="message-example">
                "Interessante! Sabe, recentemente desenvolvi/descobri algo que me ajudou muito com isso. Não sei se faz sentido pra você, mas posso te contar mais se tiver interesse. Sem compromisso, só achei que poderia agregar."
            </div>

            <h4>4. Mensagem de Apresentação</h4>
            <p>Objetivo: Explicar sua solução de forma natural</p>
            <div class="message-example">
                "Basicamente, [breve explicação do seu produto/serviço]. O diferencial é que [proposta de valor]. Já ajudei [prova social] a [resultado]. Quer que eu te mostre como funciona?"
            </div>
        `;

        return script;
    }

    generateConversationGuide() {
        return `
            <h4>Fase 1: Rapport (1-2 mensagens)</h4>
            <ul>
                <li>Elogie algo específico do conteúdo ou perfil</li>
                <li>Faça uma pergunta aberta sobre a jornada dele</li>
                <li>Mostre que você pesquisou antes de abordar</li>
                <li>Não mencione vendas ou produtos</li>
            </ul>

            <h4>Fase 2: Descoberta (2-3 mensagens)</h4>
            <ul>
                <li>Identifique as principais dores e desafios</li>
                <li>Entenda o momento atual do negócio dele</li>
                <li>Descubra o que ele já tentou fazer</li>
                <li>Mapeie as prioridades e urgências</li>
            </ul>

            <h4>Fase 3: Conexão (1-2 mensagens)</h4>
            <ul>
                <li>Compartilhe uma experiência similar</li>
                <li>Demonstre empatia genuína</li>
                <li>Posicione-se como aliado, não vendedor</li>
                <li>Crie curiosidade sobre sua solução</li>
            </ul>

            <h4>Fase 4: Apresentação (2-3 mensagens)</h4>
            <ul>
                <li>Peça permissão antes de apresentar</li>
                <li>Foque nos benefícios, não nas features</li>
                <li>Use prova social relevante</li>
                <li>Ofereça próximo passo de baixo compromisso</li>
            </ul>

            <h4>Pontos de Atenção</h4>
            <ul>
                <li>⚠️ Evite mensagens muito longas</li>
                <li>⚠️ Não force a conversa se ele não responder</li>
                <li>⚠️ Respeite o tempo de resposta dele</li>
                <li>⚠️ Adapte a linguagem ao estilo dele</li>
            </ul>
        `;
    }

    generateExecutiveSummary(username) {
        return `
            <p><strong>Perfil:</strong> @${username} apresenta características de um empreendedor digital em crescimento, com foco em educação financeira e marketing digital. O perfil demonstra consistência na produção de conteúdo e engajamento ativo com a audiência.</p>

            <p><strong>Potencial:</strong> Alto potencial de conversão devido ao alinhamento com seu nicho de atuação. O lead demonstra abertura para relacionamentos profissionais e interesse em crescimento.</p>

            <p><strong>Estratégia Recomendada:</strong> Abordagem consultiva focada em agregar valor antes de apresentar qualquer oferta. Utilizar pontos de conexão identificados para criar rapport genuíno.</p>

            <div class="key-points">
                <h5>Pontos-Chave para a Abordagem</h5>
                <ul>
                    <li>Mencionar conteúdo específico do perfil</li>
                    <li>Demonstrar conhecimento sobre o nicho dele</li>
                    <li>Oferecer insight ou valor gratuito primeiro</li>
                    <li>Ser paciente e construir relacionamento</li>
                    <li>Propor call ou reunião apenas após rapport</li>
                </ul>
            </div>
        `;
    }

    displayResults(data) {
        const container = document.getElementById('resultsContainer');

        // Helper to proxy Instagram images through weserv.nl (bypasses CORS)
        const proxyImage = (url) => {
            if (!url || url.includes('placeholder') || url.includes('ui-avatars')) {
                return url;
            }
            return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=200&h=200&fit=cover`;
        };

        // Profile data - with image proxy and error handling
        const profilePicEl = document.getElementById('profilePic');
        const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.profile.full_name || data.profile.username || 'User')}&background=8b5cf6&color=fff&size=150&bold=true`;

        // Set error handler first
        profilePicEl.onerror = function () {
            this.onerror = null; // Prevent infinite loop
            this.src = fallbackAvatar;
        };

        // Use proxy for Instagram images
        const proxiedPic = proxyImage(data.profile.profile_pic);
        profilePicEl.src = proxiedPic || fallbackAvatar;

        document.getElementById('profileName').textContent = data.profile.full_name || '-';
        document.getElementById('profileUsername').textContent = '@' + data.profile.username;
        document.getElementById('postsCount').textContent = data.profile.posts || '0';
        document.getElementById('followersCount').textContent = data.profile.followers || '0';
        document.getElementById('followingCount').textContent = data.profile.following || '0';
        document.getElementById('profileBio').textContent = data.profile.bio || 'Bio não disponível';

        // Category
        const categoryEl = document.getElementById('profileCategory');
        if (data.profile.category) {
            categoryEl.querySelector('span').textContent = data.profile.category;
            categoryEl.classList.remove('hidden');
        } else {
            categoryEl.classList.add('hidden');
        }

        // Website
        const websiteEl = document.getElementById('profileWebsite');
        if (data.profile.website) {
            const link = websiteEl.querySelector('a');
            link.href = data.profile.website;
            link.textContent = data.profile.website.replace(/https?:\/\//, '');
            websiteEl.classList.remove('hidden');
        } else {
            websiteEl.classList.add('hidden');
        }

        // Populate new inspirational cards
        this.populateTactics(data.tactics || []);
        this.populateMessages(data.messages || []);
        this.populateIdeas(data.ideas || []);
        this.populateTriggers(data.triggers || []);

        // Populate deep analysis sections
        this.populateBioAnalysis(data.bio_analysis || data.profile?.bio || '', data.gender || 'unknown');

        // Populate lead interests card
        this.populateLeadInterests(data.lead_interests || []);

        // Populate message builder chips with lead data
        this.populateBuilderChips(data);

        // Populate reels and posts carousels separately
        const allPosts = data.posts_analyzed || data.recent_posts || [];
        this.populateReelsCarousel(allPosts);
        this.populatePostsCarousel(allPosts);

        // Reset conversation thread for new lead
        const threadEl = document.getElementById('conversationThread');
        if (threadEl) {
            threadEl.innerHTML = '';
            threadEl.classList.add('hidden');
        }

        // Hide follow-up result
        const followUpResult = document.getElementById('followUpResult');
        if (followUpResult) {
            followUpResult.classList.add('hidden');
        }

        // Show results
        container.classList.remove('hidden');
    }

    populateTactics(tactics) {
        const container = document.getElementById('tacticsContent');
        if (!container) return;

        if (!tactics || !tactics.length) {
            container.innerHTML = `
                <div class="tactic-item" style="opacity: 0.6;">
                    <span class="emoji">⚠️</span>
                    <span>Aguardando análise da IA...</span>
                </div>
            `;
            return;
        }

        container.innerHTML = tactics.map(t => `
            <div class="tactic-item">
                <span class="emoji">${t.emoji}</span>
                <span>${t.text}</span>
            </div>
        `).join('');
    }

    populateMessages(messages) {
        const container = document.getElementById('messagesContent');
        if (!container) return;

        if (!messages || !messages.length) {
            container.innerHTML = `
                <div class="message-item-enhanced" style="opacity: 0.6;">
                    <div class="message-header">
                        <span class="message-label">⚠️ CONFIGURE A IA</span>
                    </div>
                    <div class="message-text">Vá em "Treinar IA" e preencha seus exemplos de mensagens</div>
                </div>
            `;
            return;
        }

        container.innerHTML = messages.map((m, i) => `
            <div class="message-item-enhanced">
                <div class="message-header">
                    <span class="message-label">${m.label}</span>
                </div>
                <div class="message-text">${m.text}</div>
                <div class="message-actions">
                    <button class="btn-copy" onclick="app.copyMessageText(this, '${m.text.replace(/'/g, "\\'")}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copiar
                    </button>
                    <button class="btn-use" onclick="app.useMessageInBuilder('${m.text.replace(/'/g, "\\'")}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Usar no Compositor
                    </button>
                </div>
            </div>
        `).join('');
    }

    populateIdeas(ideas) {
        const container = document.getElementById('ideasContent');
        if (!container) return;

        if (!ideas || !ideas.length) {
            container.innerHTML = `
                <div class="idea-item" style="opacity: 0.6;">
                    <span>💭</span>
                    <span>Ideias serão geradas pela IA</span>
                </div>
            `;
            return;
        }

        container.innerHTML = ideas.map(idea => `
            <div class="idea-item">
                <span>💡</span>
                <span>${typeof idea === 'string' ? idea : idea.text}</span>
            </div>
        `).join('');
    }

    populateTriggers(triggers) {
        const container = document.getElementById('triggersContent');
        if (!container) return;

        if (!triggers || !triggers.length) {
            container.innerHTML = `
                <div class="trigger-item" style="opacity: 0.6;">
                    <span class="trigger-icon">💭</span>
                    <div class="trigger-content">
                        <h4>Aguardando</h4>
                        <p>Gatilhos serão sugeridos pela IA</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = triggers.map(t => `
            <div class="trigger-item">
                <span class="trigger-icon">${t.icon}</span>
                <div class="trigger-content">
                    <h4>${t.title}</h4>
                    <p>${t.text}</p>
                </div>
            </div>
        `).join('');
    }

    populateBioAnalysis(bioAnalysis, gender) {
        const container = document.getElementById('bioAnalysisContent');
        const genderTag = document.getElementById('genderTag');

        if (genderTag) {
            const genderText = gender === 'male' ? '♂️ Masculino' :
                gender === 'female' ? '♀️ Feminino' : '❓ Não identificado';
            genderTag.textContent = `Gênero: ${genderText}`;
            genderTag.className = `gender-tag ${gender}`;
        }

        if (!container) return;

        if (!bioAnalysis || typeof bioAnalysis === 'string') {
            // Use bio as fallback
            const bio = bioAnalysis || this.currentLeadData?.profile?.bio || '';
            container.innerHTML = `
                <div class="bio-insight">
                    <div class="bio-insight-title">Bio Completa</div>
                    <p>${bio || 'Nenhuma bio disponível'}</p>
                </div>
                <div class="bio-insight">
                    <div class="bio-insight-title">Aguardando Análise</div>
                    <p>Configure o webhook no n8n para análise detalhada</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                ${bioAnalysis.profile_type ? `
                <div class="bio-insight">
                    <div class="bio-insight-title">Tipo de Perfil</div>
                    <p>${bioAnalysis.profile_type}</p>
                </div>` : ''}
                ${bioAnalysis.interests ? `
                <div class="bio-insight">
                    <div class="bio-insight-title">Interesses Identificados</div>
                    <p>${Array.isArray(bioAnalysis.interests) ? bioAnalysis.interests.join(', ') : bioAnalysis.interests}</p>
                </div>` : ''}
                ${bioAnalysis.communication_tips ? `
                <div class="bio-insight">
                    <div class="bio-insight-title">Dicas de Comunicação</div>
                    <p>${bioAnalysis.communication_tips}</p>
                </div>` : ''}
            `;
        }
    }

    populateLeadInterests(interests) {
        const grid = document.getElementById('leadInterestsGrid');
        const emptyMsg = document.getElementById('noInterestsMessage');

        if (!grid) return;

        const interestsArray = Array.isArray(interests) ? interests : [];

        if (!interestsArray.length) {
            grid.innerHTML = '';
            if (emptyMsg) emptyMsg.classList.remove('hidden');
            return;
        }

        if (emptyMsg) emptyMsg.classList.add('hidden');

        grid.innerHTML = interestsArray.map(interest => `
            <div class="interest-item">
                <div class="interest-item-header">
                    <span class="interest-category">${interest.category || 'Interesse'}</span>
                </div>
                <div class="interest-detail">${interest.detail || 'Não especificado'}</div>
                <div class="interest-starter">${interest.conversation_starter || 'Explore esse tema na conversa'}</div>
            </div>
        `).join('');
    }

    populateReelsCarousel(posts) {
        const track = document.getElementById('reelsTrack');
        const countEl = document.getElementById('reelsCount');

        // Ensure posts is an array before filtering
        const postsArray = Array.isArray(posts) ? posts : [];

        // Filter for reels/videos only
        const reels = postsArray.filter(p => p.type === 'reel' || p.type === 'video' || p.isVideo);

        if (countEl) {
            countEl.textContent = `${reels.length} reels`;
        }

        if (!track) return;

        if (!reels.length) {
            track.innerHTML = `
                <div class="carousel-empty-state">
                    <div class="empty-icon">🎬</div>
                    <p>Nenhum reel encontrado neste perfil</p>
                </div>
            `;
            return;
        }

        track.innerHTML = reels.map((reel, index) => {
            // Get the caption for display
            const caption = reel.caption || reel.summary || 'Conteúdo de vídeo';
            const shortCaption = caption.length > 60 ? caption.substring(0, 60) + '...' : caption;

            // Try to get thumbnail via proxy if direct URL fails
            const thumbnailUrl = reel.thumbnail || reel.displayUrl || '';
            const proxyUrl = thumbnailUrl ? `https://images.weserv.nl/?url=${encodeURIComponent(thumbnailUrl)}&w=300&h=300&fit=cover` : '';

            return `
            <div class="content-thumbnail-card">
                <div class="thumbnail-image">
                    ${proxyUrl ?
                    `<img src="${proxyUrl}" alt="Reel" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="thumbnail-placeholder" style="display:none;">🎬</div>` :
                    `<div class="thumbnail-placeholder">🎬</div>`
                }
                    <span class="content-type-badge reel">Reel</span>
                </div>
                <div class="content-info">
                    <p class="content-title">${shortCaption}</p>
                    <ul class="content-bullets">
                        ${reel.insight ? `<li class="insight">💡 ${reel.insight}</li>` : ''}
                        ${reel.opportunity ? `<li class="opportunity">🎯 ${reel.opportunity}</li>` : ''}
                        ${reel.theme ? `<li class="theme">🏷️ Tema: ${reel.theme}</li>` : ''}
                        ${reel.engagement ? `<li class="engagement">❤️ ${reel.engagement} engajamento</li>` : ''}
                        ${!reel.insight && !reel.opportunity && !reel.theme ? `<li class="pending">📊 Analisar para oportunidades</li>` : ''}
                    </ul>
                </div>
            </div>
        `}).join('');
    }

    populatePostsCarousel(posts) {
        const track = document.getElementById('postsTrack');
        const countEl = document.getElementById('postsCount');

        // Ensure posts is an array before filtering
        const postsArray = Array.isArray(posts) ? posts : [];

        // Filter for images only (not reels)
        const imagePosts = postsArray.filter(p => p.type !== 'reel' && p.type !== 'video' && !p.isVideo);

        if (countEl) {
            countEl.textContent = `${imagePosts.length} posts`;
        }

        if (!track) return;

        if (!imagePosts.length) {
            track.innerHTML = `
                <div class="carousel-empty-state">
                    <div class="empty-icon">📸</div>
                    <p>Nenhum post encontrado neste perfil</p>
                </div>
            `;
            return;
        }

        track.innerHTML = imagePosts.slice(0, 5).map((post, index) => {
            // Get the caption for display
            const caption = post.caption || post.summary || 'Publicação';
            const shortCaption = caption.length > 60 ? caption.substring(0, 60) + '...' : caption;

            // Try to get thumbnail via proxy if direct URL fails
            const thumbnailUrl = post.thumbnail || post.displayUrl || '';
            const proxyUrl = thumbnailUrl ? `https://images.weserv.nl/?url=${encodeURIComponent(thumbnailUrl)}&w=300&h=300&fit=cover` : '';

            return `
            <div class="content-thumbnail-card">
                <div class="thumbnail-image">
                    ${proxyUrl ?
                    `<img src="${proxyUrl}" alt="Post" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="thumbnail-placeholder" style="display:none;">📸</div>` :
                    `<div class="thumbnail-placeholder">📸</div>`
                }
                    <span class="content-type-badge post">Post</span>
                </div>
                <div class="content-info">
                    <p class="content-title">${shortCaption}</p>
                    <ul class="content-bullets">
                        ${post.insight ? `<li class="insight">💡 ${post.insight}</li>` : ''}
                        ${post.opportunity ? `<li class="opportunity">🎯 ${post.opportunity}</li>` : ''}
                        ${post.theme ? `<li class="theme">🏷️ Tema: ${post.theme}</li>` : ''}
                        ${post.engagement ? `<li class="engagement">❤️ ${post.engagement} engajamento</li>` : ''}
                        ${!post.insight && !post.opportunity && !post.theme ? `<li class="pending">📊 Ponto de conexão potencial</li>` : ''}
                    </ul>
                </div>
            </div>
        `}).join('');
    }

    scrollCarousel(type, direction) {
        const trackId = type === 'reels' ? 'reelsTrack' : 'postsTrack';
        const track = document.getElementById(trackId);
        if (!track) return;

        const scrollAmount = 300;
        if (direction === 'left') {
            track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
            track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }

    // Helper: Format text content, handling objects, escape chars, and markdown
    formatTextContent(content) {
        if (!content) return '-';

        let text = '';
        if (typeof content === 'string') {
            text = content;
        } else if (typeof content === 'object') {
            // If it's an object, try to extract meaningful text
            text = content.text || content.content || content.message || JSON.stringify(content, null, 2);
        }

        // Clean up escape characters and format
        text = text
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\/g, '');

        // Convert line breaks to <br> and paragraphs
        const paragraphs = text.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
        return paragraphs || text;
    }

    // Helper: Ensure value is an array
    ensureArray(value) {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            // Try to parse if it looks like JSON array
            if (value.trim().startsWith('[')) {
                try { return JSON.parse(value); } catch (e) { /* ignore */ }
            }
            return [value];
        }
        if (value && typeof value === 'object') return [value];
        return [];
    }

    // Helper: Render approach script as nicely formatted HTML
    renderApproachScript(script) {
        if (!script) return '<p>Roteiro não disponível</p>';

        // If it's a string, format it directly
        if (typeof script === 'string') {
            return this.formatTextContent(script);
        }

        // If it's an array of steps, render each as a card
        if (Array.isArray(script)) {
            if (script.length === 0) return '<p>Roteiro não disponível</p>';

            return script.map((step, index) => {
                if (typeof step === 'string') {
                    return `<div class="script-step"><p>${step}</p></div>`;
                }

                const fase = step.fase || step.phase || step.step || `Etapa ${index + 1}`;
                const objetivo = step.objetivo || step.objective || step.goal || '';
                const mensagem = step.mensagem || step.message || step.content || '';
                const dicas = step.dicas || step.tips || step.notes || '';

                return `
                    <div class="script-step">
                        <h4>📌 ${fase}</h4>
                        ${objetivo ? `<p class="step-objective"><strong>Objetivo:</strong> ${objetivo}</p>` : ''}
                        ${mensagem ? `<div class="step-message"><strong>Mensagem:</strong><br><em>"${mensagem}"</em></div>` : ''}
                        ${dicas ? `<p class="step-tips"><strong>💡 Dicas:</strong> ${dicas}</p>` : ''}
                    </div>
                `;
            }).join('');
        }

        // Fallback for other object types
        return this.formatTextContent(script);
    }

    copyScriptToClipboard() {
        const scriptContent = document.getElementById('approachScript').innerText;
        navigator.clipboard.writeText(scriptContent).then(() => {
            this.showToast('Roteiro copiado para a área de transferência!', 'success');
        }).catch(() => {
            this.showToast('Erro ao copiar. Tente novamente.', 'error');
        });
    }

    // Training
    bindTraining() {
        const saveBtn = document.getElementById('saveTraining');
        const resetBtn = document.getElementById('resetTraining');

        saveBtn.addEventListener('click', () => this.saveTraining());
        resetBtn.addEventListener('click', () => this.resetTraining());
    }

    loadSavedData() {
        this.loadTrainingForm();

        // Load settings
        if (this.n8nWebhookUrl) {
            document.getElementById('n8nWebhook').value = this.n8nWebhookUrl;
        }

        const openaiKey = localStorage.getItem('openaiKey');
        if (openaiKey) {
            document.getElementById('openaiKey').value = openaiKey;
        }
    }

    loadTrainingForm() {
        // Load training data from active expert
        const fields = ['userName', 'userBusiness', 'userNiche', 'messageExamples',
            'valueProposition', 'targetAudience', 'avoidTopics',
            'whatYouDo', 'whatYouDeliver', 'problemYouSolve', 'yourMethodology'];

        fields.forEach(field => {
            const el = document.getElementById(field);
            if (el) el.value = this.trainingData[field] || '';
        });

        // Dropdowns
        const toneEl = document.getElementById('communicationTone');
        if (toneEl) toneEl.value = this.trainingData.communicationTone || 'casual';

        const styleEl = document.getElementById('approachStyle');
        if (styleEl) styleEl.value = this.trainingData.approachStyle || 'curious';
    }

    saveTraining() {
        this.trainingData = {
            userName: document.getElementById('userName').value,
            userBusiness: document.getElementById('userBusiness').value,
            userNiche: document.getElementById('userNiche').value,
            communicationTone: document.getElementById('communicationTone').value,
            approachStyle: document.getElementById('approachStyle').value,
            messageExamples: document.getElementById('messageExamples').value,
            valueProposition: document.getElementById('valueProposition').value,
            targetAudience: document.getElementById('targetAudience').value,
            avoidTopics: document.getElementById('avoidTopics').value,
            // New detailed fields
            whatYouDo: document.getElementById('whatYouDo')?.value || '',
            whatYouDeliver: document.getElementById('whatYouDeliver')?.value || '',
            problemYouSolve: document.getElementById('problemYouSolve')?.value || '',
            yourMethodology: document.getElementById('yourMethodology')?.value || ''
        };

        // Save to current expert profile
        this.saveCurrentExpert();

        // Return to expert list after saving
        setTimeout(() => {
            this.showExpertList();
        }, 1000);
    }

    resetTraining() {
        if (confirm('Tem certeza que deseja resetar todas as configurações de treinamento?')) {
            this.trainingData = {};

            // Update expert with empty data
            const expert = this.getActiveExpert();
            if (expert) {
                expert.data = {};
                localStorage.setItem('experts', JSON.stringify(this.experts));
            }

            // Clear form
            document.getElementById('userName').value = '';
            document.getElementById('userBusiness').value = '';
            document.getElementById('userNiche').value = '';
            document.getElementById('communicationTone').value = 'casual';
            document.getElementById('approachStyle').value = 'curious';
            document.getElementById('messageExamples').value = '';
            document.getElementById('valueProposition').value = '';
            document.getElementById('targetAudience').value = '';
            document.getElementById('avoidTopics').value = '';
            // Clear new fields
            const newFields = ['whatYouDo', 'whatYouDeliver', 'problemYouSolve', 'yourMethodology'];
            newFields.forEach(f => { const el = document.getElementById(f); if (el) el.value = ''; });

            this.updateExpertSelector();
            this.showToast('Configurações resetadas!', 'success');
        }
    }

    // Settings
    bindSettings() {
        const saveBtn = document.getElementById('saveSettings');
        const testN8n = document.getElementById('testN8n');
        const exportData = document.getElementById('exportData');
        const clearData = document.getElementById('clearData');

        saveBtn.addEventListener('click', () => this.saveSettings());
        testN8n.addEventListener('click', () => this.testN8nConnection());
        exportData.addEventListener('click', () => this.exportAllData());
        clearData.addEventListener('click', () => this.clearAllData());
    }

    saveSettings() {
        this.n8nWebhookUrl = document.getElementById('n8nWebhook').value;
        localStorage.setItem('n8nWebhook', this.n8nWebhookUrl);

        const openaiKey = document.getElementById('openaiKey').value;
        localStorage.setItem('openaiKey', openaiKey);

        this.showToast('Configurações salvas!', 'success');
    }

    async testN8nConnection() {
        const webhook = document.getElementById('n8nWebhook').value;

        if (!webhook) {
            this.showToast('Insira a URL do webhook primeiro', 'error');
            return;
        }

        try {
            const response = await fetch(webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'test_connection' })
            });

            if (response.ok) {
                this.showToast('Conexão com n8n estabelecida!', 'success');
            } else {
                this.showToast('Erro na conexão. Verifique o webhook.', 'error');
            }
        } catch (error) {
            this.showToast('Erro ao conectar com n8n: ' + error.message, 'error');
        }
    }

    exportAllData() {
        const data = {
            trainingData: this.trainingData,
            history: this.history,
            settings: {
                n8nWebhook: this.n8nWebhookUrl
            }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lead-analyzer-backup.json';
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('Dados exportados com sucesso!', 'success');
    }

    clearAllData() {
        if (confirm('Tem certeza que deseja apagar TODOS os dados? Esta ação não pode ser desfeita.')) {
            localStorage.clear();
            this.trainingData = {};
            this.history = [];
            this.n8nWebhookUrl = '';
            location.reload();
        }
    }

    // History
    saveToHistory(data) {
        const historyItem = {
            id: Date.now(),
            username: data.profile.username,
            full_name: data.profile.full_name,
            profile_pic: data.profile.profile_pic,
            date: new Date().toISOString(),
            data: data
        };

        this.history.unshift(historyItem);

        // Keep only last 50 items
        if (this.history.length > 50) {
            this.history = this.history.slice(0, 50);
        }

        localStorage.setItem('analysisHistory', JSON.stringify(this.history));
        this.renderHistory();
    }

    renderHistory() {
        const container = document.getElementById('historyList');

        if (this.history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    <h3>Nenhuma análise ainda</h3>
                    <p>As análises de perfis aparecerão aqui</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.history.map(item => `
            <div class="history-item" data-id="${item.id}">
                <img src="${item.profile_pic || 'https://via.placeholder.com/50'}" alt="${item.full_name}">
                <div class="history-item-info">
                    <h4>${item.full_name || item.username}</h4>
                    <p>@${item.username}</p>
                </div>
                <span class="history-item-date">${this.formatDate(item.date)}</span>
            </div>
        `).join('');

        // Bind click events
        container.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                this.loadHistoryItem(id);
            });
        });
    }

    loadHistoryItem(id) {
        const item = this.history.find(h => h.id === id);
        if (item) {
            document.getElementById('profileUrl').value = `instagram.com/${item.username}`;
            this.displayResults(item.data);
            this.navigateTo('analyzer');
            document.getElementById('resultsContainer').classList.remove('hidden');
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes}min atrás`;
        if (hours < 24) return `${hours}h atrás`;
        if (days < 7) return `${days}d atrás`;

        return date.toLocaleDateString('pt-BR');
    }

    // Utilities
    showLoading(show) {
        const loading = document.getElementById('loadingState');
        const results = document.getElementById('resultsContainer');

        if (show) {
            loading.classList.remove('hidden');
            results.classList.add('hidden');
            this.resetProgress();
        } else {
            loading.classList.add('hidden');
            this.stopProgressAnimation();
        }
    }

    updateLoadingText(text) {
        document.getElementById('loadingText').textContent = text;
    }

    // Progress Bar Methods
    resetProgress() {
        this.currentProgress = 0;
        this.currentStep = 0;
        this.updateProgressUI(0, 'Iniciando...');

        // Reset step indicators
        document.querySelectorAll('.progress-steps .step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
    }

    startProgressAnimation() {
        this.resetProgress();
        this.currentStep = 0;

        // Simulate progress through steps
        this.progressInterval = setInterval(() => {
            if (this.currentStep < this.progressSteps.length) {
                const step = this.progressSteps[this.currentStep];
                const targetProgress = step.maxProgress;

                // Gradually increase progress
                if (this.currentProgress < targetProgress) {
                    // Slow down progress as we approach each step's max
                    const increment = Math.max(0.3, (targetProgress - this.currentProgress) * 0.05);
                    this.currentProgress = Math.min(this.currentProgress + increment, targetProgress);
                    this.updateProgressUI(this.currentProgress, step.text);
                    this.updateStepIndicators(step.step);
                }

                // Move to next step when current is near complete
                if (this.currentProgress >= targetProgress - 1) {
                    this.currentStep++;
                }
            }
        }, 200);
    }

    stopProgressAnimation() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    completeProgress() {
        this.stopProgressAnimation();
        this.currentProgress = 100;
        this.updateProgressUI(100, 'Concluído!');

        // Mark all steps as completed
        document.querySelectorAll('.progress-steps .step').forEach(step => {
            step.classList.remove('active');
            step.classList.add('completed');
        });
    }

    updateProgressUI(progress, text) {
        const progressBar = document.getElementById('progressBar');
        const progressPercentage = document.getElementById('progressPercentage');
        const progressStep = document.getElementById('progressStep');
        const loadingText = document.getElementById('loadingText');

        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressPercentage) progressPercentage.textContent = `${Math.round(progress)}%`;
        if (progressStep) progressStep.textContent = text;
        if (loadingText) loadingText.textContent = text;
    }

    updateStepIndicators(currentStepNumber) {
        document.querySelectorAll('.progress-steps .step').forEach(stepEl => {
            const stepNum = parseInt(stepEl.dataset.step);

            if (stepNum < currentStepNumber) {
                stepEl.classList.remove('active');
                stepEl.classList.add('completed');
            } else if (stepNum === currentStepNumber) {
                stepEl.classList.add('active');
                stepEl.classList.remove('completed');
            } else {
                stepEl.classList.remove('active', 'completed');
            }
        });
    }

    // Conversation Continuation
    bindConversation() {
        const generateBtn = document.getElementById('generateFollowUp');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateFollowUp());
        }
    }

    async generateFollowUp() {
        const responseInput = document.getElementById('leadResponse');
        const leadResponse = responseInput.value.trim();

        if (!leadResponse) {
            this.showToast('Cole a resposta do lead primeiro', 'error');
            return;
        }

        if (!this.currentLeadData) {
            this.showToast('Analise um perfil primeiro', 'error');
            return;
        }

        if (!this.n8nWebhookUrl) {
            this.showToast('Configure o webhook do n8n', 'error');
            return;
        }

        // Add to conversation thread
        this.addToConversationThread(leadResponse, 'received');

        // Show loading state
        const generateBtn = document.getElementById('generateFollowUp');
        generateBtn.classList.add('loading');
        generateBtn.textContent = 'Gerando...';

        try {
            // Build context for the AI
            const conversationContext = this.conversationHistory
                .map(msg => `${msg.type === 'sent' ? 'Você enviou' : 'Lead respondeu'}: "${msg.message}"`)
                .join('\n');

            const response = await fetch(this.n8nWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'follow_up',
                    username: this.currentLeadData.profile.username,
                    lead_profile: this.currentLeadData.profile,
                    lead_response: leadResponse,
                    conversation_history: conversationContext,
                    training_data: this.trainingData
                })
            });

            const data = await response.json();

            // Extract follow-up message
            let followUpMessage = '';
            let tips = '';

            if (data.follow_up_message) {
                followUpMessage = data.follow_up_message;
                tips = data.tips || '';
            } else if (data.data?.ai_analysis?.[0]?.follow_up_message) {
                followUpMessage = data.data.ai_analysis[0].follow_up_message;
                tips = data.data.ai_analysis[0].tips || '';
            } else if (typeof data === 'string') {
                followUpMessage = data;
            } else {
                // Fallback - generate simple response
                followUpMessage = this.generateSimpleFollowUp(leadResponse);
                tips = 'Resposta gerada localmente. Configure o webhook para respostas personalizadas pela IA.';
            }

            // Display the result
            this.displayFollowUp(followUpMessage, tips);

            // Add to thread
            this.addToConversationThread(followUpMessage, 'sent');

            // Clear input
            responseInput.value = '';

            // Update history with conversation
            this.updateHistoryWithConversation();

        } catch (error) {
            console.error('Erro ao gerar follow-up:', error);

            // Generate local fallback
            const fallbackMessage = this.generateSimpleFollowUp(leadResponse);
            this.displayFollowUp(fallbackMessage, 'Resposta gerada localmente devido a erro de conexão.');
            this.addToConversationThread(fallbackMessage, 'sent');
            responseInput.value = '';
        }

        // Reset button
        generateBtn.classList.remove('loading');
        generateBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22,2 15,22 11,13 2,9 22,2"/>
            </svg>
            Gerar Próxima Mensagem
        `;
    }

    generateSimpleFollowUp(leadResponse) {
        const name = this.currentLeadData?.profile?.full_name?.split(' ')[0] || '';
        const responses = [
            `Interessante, ${name}! Me conta mais sobre isso...`,
            `Entendi! E como você está lidando com isso atualmente?`,
            `Faz sentido! Já tentou alguma abordagem diferente?`,
            `Legal! O que você está buscando como resultado ideal?`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    displayFollowUp(message, tips) {
        const resultSection = document.getElementById('followUpResult');
        const messageEl = document.getElementById('followUpMessage');
        const tipsEl = document.getElementById('followUpTips');

        messageEl.textContent = message;
        tipsEl.innerHTML = tips ? `<strong>💡 Dica:</strong> ${tips}` : '';

        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    addToConversationThread(message, type) {
        // Add to history
        this.conversationHistory.push({ message, type, timestamp: new Date().toISOString() });

        // Update UI
        const threadEl = document.getElementById('conversationThread');
        threadEl.classList.remove('hidden');

        const messageHtml = `
            <div class="thread-message ${type}">
                <div class="message-content">
                    <div class="message-label">${type === 'sent' ? '📤 Você' : '📥 Lead'}</div>
                    <div class="message-bubble">${message}</div>
                </div>
            </div>
        `;

        threadEl.insertAdjacentHTML('beforeend', messageHtml);
        threadEl.scrollTop = threadEl.scrollHeight;
    }

    updateHistoryWithConversation() {
        // Find current lead in history and update with conversation
        const historyItem = this.history.find(item =>
            item.username === this.currentLeadData?.profile?.username
        );

        if (historyItem) {
            historyItem.conversation = this.conversationHistory;
            historyItem.lastInteraction = new Date().toISOString();
            localStorage.setItem('analysisHistory', JSON.stringify(this.history));
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        toastMessage.textContent = message;
        toast.className = 'toast ' + type;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // =============================================
    // MESSAGE BUILDER FUNCTIONS
    // =============================================

    bindMessageBuilder() {
        // Bind chip selection
        document.querySelectorAll('.variable-chip').forEach(chip => {
            chip.addEventListener('click', (e) => this.handleChipSelection(e.target));
        });

        // Bind compose actions
        const clearBtn = document.getElementById('clearCompose');
        const copyBtn = document.getElementById('copyComposedMessage');
        const generateMoreBtn = document.getElementById('generateMoreMessages');

        if (clearBtn) clearBtn.addEventListener('click', () => this.clearComposer());
        if (copyBtn) copyBtn.addEventListener('click', () => this.copyComposedMessage());
        if (generateMoreBtn) generateMoreBtn.addEventListener('click', () => this.generateMoreMessages());

        // Initialize composer state
        this.composerState = {
            greeting: '',
            hook: '',
            interest: '',
            question: ''
        };
    }

    handleChipSelection(chip) {
        const type = chip.dataset.type;
        const value = chip.dataset.value;

        // Remove selection from same category
        const container = chip.parentElement;
        container.querySelectorAll('.variable-chip').forEach(c => c.classList.remove('selected'));

        // Select this chip
        chip.classList.add('selected');

        // Update state
        this.composerState[type] = value;

        // Update preview and textarea
        this.updateComposer();
    }

    updateComposer() {
        const preview = document.getElementById('composePreview');
        const textarea = document.getElementById('composedMessage');

        if (!preview || !textarea) return;

        // Build message parts
        const parts = [];
        const leadName = this.currentLeadData?.profile?.full_name?.split(' ')[0] || 'Nome';

        if (this.composerState.greeting) {
            const greeting = this.composerState.greeting.replace('{nome}', leadName);
            parts.push({ type: 'greeting', text: greeting });
        }
        if (this.composerState.hook) {
            parts.push({ type: 'hook', text: this.composerState.hook });
        }
        if (this.composerState.interest) {
            parts.push({ type: 'interest', text: this.composerState.interest });
        }
        if (this.composerState.question) {
            parts.push({ type: 'question', text: this.composerState.question });
        }

        // Update preview with styled chips
        if (parts.length === 0) {
            preview.innerHTML = '<span class="placeholder-text">Selecione os elementos acima para compor sua mensagem...</span>';
        } else {
            preview.innerHTML = parts.map(p =>
                `<span class="chip-tag ${p.type}">${p.text}</span>`
            ).join(' ');
        }

        // Update textarea with plain text
        const message = parts.map(p => p.text).join(' ');
        textarea.value = message;
    }

    populateBuilderChips(data) {
        // Populate hook chips based on lead profile
        const hookContainer = document.getElementById('hookChips');
        if (hookContainer) {
            const profile = data.profile || {};
            const hooks = [];

            // Generate hooks based on profile data
            if (profile.bio) {
                const bioSnippet = profile.bio.substring(0, 50);
                hooks.push({ label: '📝 Bio', value: `vi que ${bioSnippet}...` });
            }
            if (profile.category && profile.category !== 'Pessoal') {
                hooks.push({ label: `🏢 ${profile.category}`, value: `vi que trabalha com ${profile.category.toLowerCase()},` });
            }
            if (profile.followers > 10000) {
                hooks.push({ label: '📈 Audiência', value: `vi que tem uma boa audiência por aqui,` });
            }
            if (profile.full_name) {
                const firstName = profile.full_name.split(' ')[0];
                hooks.push({ label: '👋 Seguiu', value: `vi que me seguiu, seja bem-vindo por aqui ${firstName}!` });
            }

            if (hooks.length === 0) {
                hooks.push({ label: '👁️ Perfil', value: 'vi seu perfil por aqui,' });
            }

            hookContainer.innerHTML = hooks.map(h =>
                `<button class="variable-chip hook-chip" data-type="hook" data-value="${h.value}">${h.label}</button>`
            ).join('');
        }

        // Populate interest chips based on lead_interests
        const interestContainer = document.getElementById('interestChips');
        if (interestContainer) {
            const interests = data.lead_interests || [];

            if (interests.length === 0) {
                interestContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 12px;">Nenhum interesse identificado ainda</span>';
            } else {
                interestContainer.innerHTML = interests.map(i =>
                    `<button class="variable-chip interest-chip" data-type="interest" data-value="${i.conversation_starter || i.detail}">${i.category}: ${i.detail}</button>`
                ).join('');
            }
        }

        // Rebind chips after dynamic population
        document.querySelectorAll('.variable-chip').forEach(chip => {
            chip.addEventListener('click', (e) => this.handleChipSelection(e.target));
        });
    }

    clearComposer() {
        this.composerState = {
            greeting: '',
            hook: '',
            interest: '',
            question: ''
        };

        // Remove all selections
        document.querySelectorAll('.variable-chip.selected').forEach(c => c.classList.remove('selected'));

        // Clear preview and textarea
        this.updateComposer();
        this.showToast('Compositor limpo!', 'info');
    }

    copyComposedMessage() {
        const textarea = document.getElementById('composedMessage');
        if (!textarea || !textarea.value.trim()) {
            this.showToast('Nenhuma mensagem para copiar', 'error');
            return;
        }

        navigator.clipboard.writeText(textarea.value);
        this.showToast('Mensagem copiada!', 'success');
    }

    copyMessageText(button, text) {
        navigator.clipboard.writeText(text);
        button.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Copiado!`;
        setTimeout(() => {
            button.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar`;
        }, 2000);
    }

    useMessageInBuilder(text) {
        const textarea = document.getElementById('composedMessage');
        if (textarea) {
            textarea.value = text;
            // Scroll to builder
            document.querySelector('.message-builder-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.showToast('Mensagem carregada no compositor!', 'success');
        }
    }

    async generateMoreMessages() {
        if (!this.currentLeadData) {
            this.showToast('Analise um lead primeiro', 'error');
            return;
        }

        const btn = document.getElementById('generateMoreMessages');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> Gerando...`;
        }

        try {
            // Re-analyze with same data but request variations
            const response = await fetch(this.n8nWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...this.currentLeadData,
                    request_type: 'regenerate_messages',
                    training_data: this.trainingData
                })
            });

            const result = await response.json();

            if (result.messages && result.messages.length > 0) {
                this.populateMessages(result.messages);
                this.showToast('Novas mensagens geradas!', 'success');
            } else {
                this.showToast('Não foi possível gerar novas mensagens', 'error');
            }
        } catch (error) {
            console.error('Error generating messages:', error);
            this.showToast('Erro ao gerar mensagens: ' + error.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> Gerar Mais`;
            }
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LeadAnalyzer();
});
