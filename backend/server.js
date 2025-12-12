require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { scrapeInstagramProfile } = require('./services/scraper');
const { analyzeProfileWithAI } = require('./services/analyzer');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main analysis endpoint
app.post('/api/analyze', async (req, res) => {
    try {
        const { username, url, training_data } = req.body;

        if (!username) {
            return res.status(400).json({ error: 'Username é obrigatório' });
        }

        console.log(`[${new Date().toISOString()}] Iniciando análise para: @${username}`);

        // Step 1: Scrape Instagram profile
        const profileData = await scrapeInstagramProfile(username);

        if (!profileData) {
            return res.status(404).json({ error: 'Perfil não encontrado ou privado' });
        }

        // Step 2: Analyze with AI
        const analysis = await analyzeProfileWithAI(profileData, training_data);

        // Combine results
        const result = {
            profile: profileData,
            photo_analysis: analysis.photo_analysis,
            connection_points: analysis.connection_points,
            sales_opportunities: analysis.sales_opportunities,
            approach_script: analysis.approach_script,
            conversation_guide: analysis.conversation_guide,
            executive_summary: analysis.executive_summary
        };

        console.log(`[${new Date().toISOString()}] Análise concluída para: @${username}`);
        res.json(result);

    } catch (error) {
        console.error('Erro na análise:', error);
        res.status(500).json({
            error: 'Erro ao processar análise',
            message: error.message
        });
    }
});

// Test connection endpoint
app.post('/api/test', (req, res) => {
    res.json({
        status: 'connected',
        message: 'Conexão estabelecida com sucesso!'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API disponível em http://localhost:${PORT}/api/analyze`);
});
