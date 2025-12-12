const OpenAI = require('openai');
const axios = require('axios');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Analyze Instagram profile data with AI
 */
async function analyzeProfileWithAI(profileData, trainingData = {}) {
    console.log('[Analyzer] Iniciando análise com IA');

    // Build context from training data
    const userContext = buildUserContext(trainingData);

    // Analyze profile photo if available
    let photoAnalysis = 'Análise de foto não disponível';
    if (profileData.profile_pic) {
        try {
            photoAnalysis = await analyzeProfilePhoto(profileData.profile_pic);
        } catch (error) {
            console.log('[Analyzer] Erro na análise de foto:', error.message);
        }
    }

    // Generate complete analysis
    const analysis = await generateCompleteAnalysis(profileData, photoAnalysis, userContext);

    return {
        photo_analysis: photoAnalysis,
        ...analysis
    };
}

/**
 * Build context string from training data
 */
function buildUserContext(trainingData) {
    if (!trainingData || Object.keys(trainingData).length === 0) {
        return 'Usuário não configurou preferências específicas. Use um tom casual e amigável.';
    }

    let context = `
INFORMAÇÕES DO VENDEDOR:
- Nome: ${trainingData.userName || 'Não informado'}
- Negócio/Produto: ${trainingData.userBusiness || 'Não informado'}
- Nicho: ${trainingData.userNiche || 'Não informado'}

ESTILO DE COMUNICAÇÃO:
- Tom de voz: ${getToneDescription(trainingData.communicationTone)}
- Estilo de abordagem: ${getApproachDescription(trainingData.approachStyle)}

PROPOSTA DE VALOR:
${trainingData.valueProposition || 'Não informada'}

PÚBLICO-ALVO:
${trainingData.targetAudience || 'Não informado'}

TÓPICOS A EVITAR:
${trainingData.avoidTopics || 'Nenhum especificado'}
`;

    if (trainingData.messageExamples) {
        context += `
EXEMPLOS DE MENSAGENS DO VENDEDOR (para replicar o estilo):
${trainingData.messageExamples}
`;
    }

    return context;
}

/**
 * Get description for communication tone
 */
function getToneDescription(tone) {
    const tones = {
        'formal': 'Formal e profissional - use linguagem corporativa, evite gírias',
        'casual': 'Casual e amigável - linguagem do dia a dia, natural e acessível',
        'energetic': 'Energético e entusiasmado - use expressões de empolgação, emojis moderados',
        'consultive': 'Consultivo e expert - posicione-se como autoridade, use dados',
        'empathetic': 'Empático e acolhedor - foque nas dores, demonstre compreensão'
    };
    return tones[tone] || tones['casual'];
}

/**
 * Get description for approach style
 */
function getApproachDescription(style) {
    const styles = {
        'direct': 'Direto ao ponto - vá rapidamente ao assunto principal',
        'curious': 'Curioso e investigativo - faça perguntas, demonstre interesse genuíno',
        'storytelling': 'Storytelling - use histórias e casos para criar conexão',
        'value-first': 'Valor primeiro - ofereça algo de valor antes de pedir algo',
        'relationship': 'Construção de relacionamento - foco em longo prazo, sem pressa'
    };
    return styles[style] || styles['curious'];
}

/**
 * Analyze profile photo using GPT-4 Vision
 */
async function analyzeProfilePhoto(photoUrl) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `Você é um especialista em análise de perfis para vendas.
                    Analise a foto de perfil e forneça insights sobre:
                    - Aparência e postura (profissional, casual, etc.)
                    - Ambiente ou contexto da foto
                    - Possíveis indicadores de personalidade
                    - Elementos que podem ser usados para criar conexão

                    Seja objetivo e útil para quem vai abordar essa pessoa para vendas.
                    Responda em português brasileiro.`
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Analise esta foto de perfil do Instagram e forneça insights úteis para uma abordagem de vendas:'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: photoUrl,
                                detail: 'low'
                            }
                        }
                    ]
                }
            ],
            max_tokens: 500
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('[Analyzer] Erro na análise de foto:', error.message);

        // Return a generic analysis if vision fails
        return 'A foto de perfil não pôde ser analisada em detalhe. Recomenda-se observar manualmente elementos como: expressão facial, ambiente, vestimenta e postura para identificar pontos de conexão.';
    }
}

/**
 * Generate complete analysis with AI
 */
async function generateCompleteAnalysis(profileData, photoAnalysis, userContext) {
    const prompt = `
Você é um especialista em vendas consultivas e análise de leads no Instagram.
Analise o perfil abaixo e gere uma estratégia completa de abordagem.

DADOS DO PERFIL:
- Username: @${profileData.username}
- Nome: ${profileData.full_name}
- Bio: ${profileData.bio || 'Não disponível'}
- Seguidores: ${profileData.followers}
- Seguindo: ${profileData.following}
- Posts: ${profileData.posts}
- Categoria: ${profileData.category || 'Não especificada'}
- Website: ${profileData.website || 'Não disponível'}
- Conta verificada: ${profileData.is_verified ? 'Sim' : 'Não'}
- Conta business: ${profileData.is_business ? 'Sim' : 'Não'}

ANÁLISE DA FOTO DE PERFIL:
${photoAnalysis}

CONTEXTO DO VENDEDOR:
${userContext}

Com base nessas informações, gere:

1. PONTOS DE CONEXÃO (5-7 pontos)
Liste elementos do perfil que podem ser usados para criar rapport e conexão genuína.

2. OPORTUNIDADES DE VENDA (4-6 pontos)
Identifique possíveis dores, necessidades ou desejos que seu produto/serviço pode atender.

3. ROTEIRO DE ABORDAGEM
Crie um roteiro com 4 mensagens progressivas:
- Mensagem 1: Quebra-gelo (criar interesse)
- Mensagem 2: Aprofundamento (após resposta)
- Mensagem 3: Transição (introduzir possibilidade de ajuda)
- Mensagem 4: Apresentação (mostrar solução)

Para cada mensagem, inclua:
- Objetivo da mensagem
- Exemplo de texto
- O que NÃO fazer

4. GUIA DE CONVERSA
Detalhe as fases da conversa:
- Fase Rapport
- Fase Descoberta
- Fase Conexão
- Fase Apresentação
- Pontos de atenção

5. RESUMO EXECUTIVO
Um parágrafo com:
- Avaliação do potencial do lead
- Principal estratégia recomendada
- Pontos-chave para sucesso

IMPORTANTE:
- Adapte TODO o conteúdo ao estilo de comunicação definido pelo vendedor
- Use a linguagem e tom especificados
- Se houver exemplos de mensagens do vendedor, replique o estilo
- Evite os tópicos listados para evitar
- Seja específico e prático, não genérico

Responda em formato JSON com a seguinte estrutura:
{
    "connection_points": ["ponto 1", "ponto 2", ...],
    "sales_opportunities": ["oportunidade 1", "oportunidade 2", ...],
    "approach_script": "<HTML formatado com h4 para títulos e p para textos, div.message-example para exemplos>",
    "conversation_guide": "<HTML formatado com h4 para títulos e ul/li para listas>",
    "executive_summary": "<HTML formatado com p para parágrafos, div.key-points com h5 e ul/li para pontos-chave>"
}
`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um especialista em vendas consultivas. Sempre responda em JSON válido conforme a estrutura solicitada. Todo conteúdo deve ser em português brasileiro.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 4000,
            temperature: 0.7,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0].message.content;
        return JSON.parse(content);

    } catch (error) {
        console.error('[Analyzer] Erro na geração de análise:', error.message);

        // Return fallback analysis
        return generateFallbackAnalysis(profileData, userContext);
    }
}

/**
 * Generate fallback analysis if AI fails
 */
function generateFallbackAnalysis(profileData, userContext) {
    const username = profileData.username;
    const name = profileData.full_name || username;
    const bio = profileData.bio || '';

    return {
        connection_points: [
            `Perfil @${username} com ${profileData.followers} seguidores`,
            bio ? `Bio menciona: "${bio.substring(0, 50)}..."` : 'Bio não disponível para análise',
            `Ativo no Instagram com ${profileData.posts} publicações`,
            profileData.is_business ? 'Conta business - potencial profissional' : 'Conta pessoal',
            profileData.website ? `Website disponível: ${profileData.website}` : 'Sem website externo'
        ],
        sales_opportunities: [
            'Potencial interesse em crescimento de presença digital',
            'Possível necessidade de ferramentas de produtividade',
            'Abertura para networking profissional',
            'Interesse em conteúdo educacional do nicho'
        ],
        approach_script: `
            <h4>1. Primeira Mensagem (Quebra-gelo)</h4>
            <p>Objetivo: Criar conexão genuína sem parecer vendedor</p>
            <div class="message-example">
                "Oi ${name}! Vi seu perfil e achei muito interessante seu trabalho. ${bio ? 'Curti especialmente ' + bio.substring(0, 30) + '...' : 'Gostei do seu conteúdo!'} Posso te perguntar uma coisa?"
            </div>

            <h4>2. Segunda Mensagem</h4>
            <p>Objetivo: Identificar necessidades</p>
            <div class="message-example">
                "Legal! E como está sendo sua jornada? Quais os maiores desafios que você tem enfrentado?"
            </div>

            <h4>3. Terceira Mensagem</h4>
            <p>Objetivo: Apresentar valor</p>
            <div class="message-example">
                "Entendo totalmente! Passei por algo parecido. Descobri algumas estratégias que me ajudaram muito. Posso compartilhar com você?"
            </div>

            <h4>4. Quarta Mensagem</h4>
            <p>Objetivo: Propor próximo passo</p>
            <div class="message-example">
                "Que bom que faz sentido pra você! Que tal a gente marcar uma call rápida pra eu te mostrar em detalhe? Sem compromisso."
            </div>
        `,
        conversation_guide: `
            <h4>Fase 1: Rapport</h4>
            <ul>
                <li>Mencione algo específico do perfil</li>
                <li>Faça uma pergunta aberta</li>
                <li>Demonstre interesse genuíno</li>
            </ul>

            <h4>Fase 2: Descoberta</h4>
            <ul>
                <li>Identifique dores e desafios</li>
                <li>Entenda o momento atual</li>
                <li>Mapeie prioridades</li>
            </ul>

            <h4>Fase 3: Conexão</h4>
            <ul>
                <li>Compartilhe experiência similar</li>
                <li>Posicione-se como aliado</li>
                <li>Crie curiosidade</li>
            </ul>

            <h4>Fase 4: Apresentação</h4>
            <ul>
                <li>Peça permissão</li>
                <li>Foque em benefícios</li>
                <li>Use prova social</li>
            </ul>
        `,
        executive_summary: `
            <p><strong>Perfil:</strong> @${username} apresenta potencial para abordagem comercial com base nos dados disponíveis.</p>
            <p><strong>Estratégia:</strong> Abordagem consultiva com foco em agregar valor antes de apresentar ofertas.</p>
            <div class="key-points">
                <h5>Pontos-Chave</h5>
                <ul>
                    <li>Personalizar abordagem com dados do perfil</li>
                    <li>Construir relacionamento antes de vender</li>
                    <li>Identificar dores específicas na conversa</li>
                    <li>Oferecer valor genuíno primeiro</li>
                </ul>
            </div>
        `
    };
}

module.exports = {
    analyzeProfileWithAI
};
