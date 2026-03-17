# NexusHR AI Workforce Platform

Enterprise-grade AI workforce SaaS platform built on Cloudflare Workers, D1, KV, and React.

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Compute | Cloudflare Workers | Edge-first API (0ms cold start) |
| Database | Cloudflare D1 (SQLite) | Structured data, 100+ tables |
| Cache/Sessions | Cloudflare KV | Session management, API key store, response cache |
| Frontend | React + Vite (single-file SPA) | Enterprise admin dashboard |

## 35 Feature Modules

1. LLM API Proxy
2. Tool-Use Capabilities
3. Integration Marketplace
4. WebRTC Voice/Video
5. Multi-Agent Collaboration
6. NLU Engine
7. Billing & Payment
8. Trial & Conversion
9. User Preferences
10. Admin V2 (RBAC)
11. Database Layer
12. Security (JWT, CSRF, E2E)
13. Scalability (Multi-tenant)
14. Business Model Engine
15. AI Core
16. External Integrations
17. Platform Services
18. Training Datasets
19. Real-Time Voice AI
20. Memory System
21. Multi-Agent Collaboration
22. Enterprise Security
23. Industry Verticals
24. Guided Onboarding
25. Enterprise AI Employees
26. Pipeline Engine (DAG)
27. Continuous Learning
28. NLP Sentiment Engine
29. Secure Prompt Engine
30. Avatar Rendering
31. SaaS Frontend App
32. Security Vault
33. Data Architecture
34. Real-Time Infrastructure
35. Admin Control Center

## Quick Start

```bash
# Install dependencies
cd worker && npm install
cd ../frontend && npm install

# Local development
cd ../worker && npm run dev

# Deploy to Cloudflare
cd worker && npm run deploy
```

## Cloudflare Bindings

- **D1**: `nexushr-platform` (0f45ef81-1bc2-4143-bc2e-efe623ce4abe)
- **KV**: `NEXUSHR_SESSIONS`, `NEXUSHR_API_KEYS`, `NEXUSHR_CACHE`

## Project Structure

```
nexushr-platform/
  worker/           # Cloudflare Worker API (35 modules)
    src/
      index.ts      # Main router (40+ route prefixes)
      lib/           # Feature modules (33 files)
      routes/        # Legacy route handlers
    wrangler.toml    # Cloudflare config
  frontend/          # React SPA
    src/
      lib/           # API clients + React hooks (38 files)
    vite.config.ts
```
