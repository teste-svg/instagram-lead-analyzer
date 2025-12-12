# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Instagram Lead Analyzer - A web platform for scraping Instagram profiles and generating AI-powered sales approach strategies. The system extracts profile data, analyzes photos, identifies connection points, and creates personalized outreach scripts.

## Architecture

```
├── frontend/          # Static HTML/CSS/JS application (GitHub Pages)
│   ├── index.html     # Main SPA with all sections
│   ├── styles.css     # Dark theme UI styles
│   └── app.js         # LeadAnalyzer class - handles all frontend logic
├── backend/           # Node.js API server (optional, for direct deployment)
│   ├── server.js      # Express server with /api/analyze endpoint
│   └── services/
│       ├── scraper.js # Instagram profile scraping (API + Puppeteer fallback)
│       └── analyzer.js # OpenAI GPT-4 analysis generation
└── n8n-workflows/     # n8n workflow JSON for no-code deployment
```

## Key Components

**Frontend (`app.js`):**
- `LeadAnalyzer` class manages all state and interactions
- Data persisted to localStorage (trainingData, history, settings)
- Communicates with n8n webhook for profile analysis
- Has mock data fallback for demo/offline testing

**Backend Scraper (`scraper.js`):**
- Primary: Instagram public API (`/api/v1/users/web_profile_info/`)
- Fallback: Puppeteer headless browser scraping
- Handles rate limiting and private profiles

**AI Analyzer (`analyzer.js`):**
- GPT-4o for text analysis and strategy generation
- GPT-4o Vision for profile photo analysis
- Adapts output based on user's training data (tone, style, examples)

## Commands

```bash
# Backend development
cd backend && npm install
cp .env.example .env  # Add OPENAI_API_KEY
npm run dev           # Starts on port 3001

# Frontend (static files)
cd frontend && python -m http.server 8080
# Or use any static server

# Deploy frontend to GitHub Pages
git push origin main  # Auto-deploys via .github/workflows/deploy.yml
```

## n8n Integration

Import `n8n-workflows/instagram-lead-analyzer.json` into your n8n instance. Configure:
1. OpenAI credentials in the "OpenAI Analysis" node
2. Activate workflow and copy webhook URL
3. Paste webhook URL in frontend Settings

## Data Flow

1. User enters Instagram URL → Frontend extracts username
2. POST to n8n webhook with username + training_data
3. n8n fetches Instagram API → parses profile → sends to OpenAI
4. OpenAI returns structured analysis JSON
5. Frontend displays results in cards (profile, script, guide, summary)
