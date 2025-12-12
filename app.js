// Instagram Lead Analyzer - Main Application

class LeadAnalyzer {
    constructor() {
        this.n8nWebhookUrl = localStorage.getItem('n8nWebhook') || '';
        this.trainingData = JSON.parse(localStorage.getItem('trainingData')) || {};
        this.history = JSON.parse(localStorage.getItem('analysisHistory')) || [];

        this.init();
    }

    init() {
        this.bindNavigation();
        this.bindAnalyzer();
        this.bindTraining();
        this.bindSettings();
        this.loadSavedData();
        this.renderHistory();
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

        scrapeBtn.addEventListener('click', () => this.analyzeProfile());

        profileUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.analyzeProfile();
        });

        copyScript.addEventListener('click', () => this.copyScriptToClipboard());
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

        // Check if n8n webhook is configured
        if (!this.n8nWebhookUrl) {
            this.showToast('Configure o webhook do n8n nas Configurações', 'error');
            this.navigateTo('settings');
            return;
        }

        this.showLoading(true);
        this.updateLoadingText('Extraindo dados do perfil...');

        try {
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
                })
            });

            if (!response.ok) {
                throw new Error('Erro na resposta do servidor');
            }

            const data = await response.json();

            this.updateLoadingText('Analisando perfil com IA...');
            await this.delay(1000);

            this.displayResults(data);
            this.saveToHistory(data);
            this.showLoading(false);
            this.showToast('Análise concluída com sucesso!', 'success');

        } catch (error) {
            console.error('Error:', error);
            this.showLoading(false);

            // For demo/testing, show mock data
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
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

        // Profile data
        document.getElementById('profilePic').src = data.profile.profile_pic || 'https://via.placeholder.com/100';
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

        // Photo analysis
        document.getElementById('photoAnalysis').textContent = data.photo_analysis || '-';

        // Connection points
        const connectionList = document.getElementById('connectionPoints');
        connectionList.innerHTML = '';
        (data.connection_points || []).forEach(point => {
            const li = document.createElement('li');
            li.textContent = point;
            connectionList.appendChild(li);
        });

        // Sales opportunities
        const opportunitiesList = document.getElementById('salesOpportunities');
        opportunitiesList.innerHTML = '';
        (data.sales_opportunities || []).forEach(opp => {
            const li = document.createElement('li');
            li.textContent = opp;
            opportunitiesList.appendChild(li);
        });

        // Approach script
        document.getElementById('approachScript').innerHTML = data.approach_script || '-';

        // Conversation guide
        document.getElementById('conversationGuide').innerHTML = data.conversation_guide || '-';

        // Executive summary
        document.getElementById('executiveSummary').innerHTML = data.executive_summary || '-';

        // Show results
        container.classList.remove('hidden');
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
        // Load training data
        if (this.trainingData.userName) {
            document.getElementById('userName').value = this.trainingData.userName;
        }
        if (this.trainingData.userBusiness) {
            document.getElementById('userBusiness').value = this.trainingData.userBusiness;
        }
        if (this.trainingData.userNiche) {
            document.getElementById('userNiche').value = this.trainingData.userNiche;
        }
        if (this.trainingData.communicationTone) {
            document.getElementById('communicationTone').value = this.trainingData.communicationTone;
        }
        if (this.trainingData.approachStyle) {
            document.getElementById('approachStyle').value = this.trainingData.approachStyle;
        }
        if (this.trainingData.messageExamples) {
            document.getElementById('messageExamples').value = this.trainingData.messageExamples;
        }
        if (this.trainingData.valueProposition) {
            document.getElementById('valueProposition').value = this.trainingData.valueProposition;
        }
        if (this.trainingData.targetAudience) {
            document.getElementById('targetAudience').value = this.trainingData.targetAudience;
        }
        if (this.trainingData.avoidTopics) {
            document.getElementById('avoidTopics').value = this.trainingData.avoidTopics;
        }

        // Load settings
        if (this.n8nWebhookUrl) {
            document.getElementById('n8nWebhook').value = this.n8nWebhookUrl;
        }

        const openaiKey = localStorage.getItem('openaiKey');
        if (openaiKey) {
            document.getElementById('openaiKey').value = openaiKey;
        }
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
            avoidTopics: document.getElementById('avoidTopics').value
        };

        localStorage.setItem('trainingData', JSON.stringify(this.trainingData));
        this.showToast('Configurações de treinamento salvas!', 'success');
    }

    resetTraining() {
        if (confirm('Tem certeza que deseja resetar todas as configurações de treinamento?')) {
            this.trainingData = {};
            localStorage.removeItem('trainingData');

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
        } else {
            loading.classList.add('hidden');
        }
    }

    updateLoadingText(text) {
        document.getElementById('loadingText').textContent = text;
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
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LeadAnalyzer();
});
