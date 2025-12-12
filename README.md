# Instagram Lead Analyzer

Plataforma de análise de perfis do Instagram para geração de estratégias de abordagem comercial com IA.

## Funcionalidades

- **Scrapping de Perfis**: Extrai nome, bio, seguidores, posts e foto de perfil
- **Análise com IA**: GPT-4 analisa o perfil e gera insights de vendas
- **Roteiros Personalizados**: Cria scripts de abordagem adaptados ao seu estilo
- **Treinamento do Agent**: Configure tom de voz, estilo e exemplos de mensagens
- **Histórico**: Salva todas as análises realizadas

## Início Rápido

### Opção 1: Usar com n8n (Recomendado)

1. Importe o workflow `n8n-workflows/instagram-lead-analyzer.json` no seu n8n
2. Configure as credenciais do OpenAI no node "OpenAI Analysis"
3. Ative o workflow e copie a URL do webhook
4. Acesse o frontend e cole a URL em Configurações

### Opção 2: Rodar Backend Local

```bash
cd backend
npm install
cp .env.example .env
# Edite .env e adicione sua OPENAI_API_KEY
npm start
```

### Frontend

O frontend é hospedado automaticamente no GitHub Pages ao fazer push para `main`.

Para rodar localmente:
```bash
cd frontend
python -m http.server 8080
# Acesse http://localhost:8080
```

## Estrutura

```
├── frontend/           # Interface web (HTML/CSS/JS)
├── backend/            # API Node.js (opcional)
├── n8n-workflows/      # Workflow para n8n
└── .github/workflows/  # CI/CD para GitHub Pages
```

## Configuração

### Variáveis de Ambiente (Backend)

| Variável | Descrição |
|----------|-----------|
| `OPENAI_API_KEY` | Chave da API OpenAI (obrigatória) |
| `PORT` | Porta do servidor (default: 3001) |

### Treinamento do Agent

Na aba "Treinar Agent", configure:

- **Tom de Voz**: Formal, Casual, Energético, Consultivo ou Empático
- **Estilo de Abordagem**: Direto, Curioso, Storytelling, Valor Primeiro ou Relacionamento
- **Exemplos de Mensagens**: Cole mensagens que você já enviou para leads
- **Proposta de Valor**: Descreva seu diferencial
- **Público-Alvo**: Defina seu cliente ideal

## Licença

MIT
