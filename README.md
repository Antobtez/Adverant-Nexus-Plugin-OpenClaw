# OpenClaw Assistant - Nexus Marketplace Plugin

<div align="center">

![OpenClaw Logo](https://cdn.adverant.ai/icons/openclaw.svg)

**Multi-channel AI assistant with 100+ skills, autonomous automation, and deep Nexus integration**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-326CE5.svg)](https://kubernetes.io/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED.svg)](https://www.docker.com/)

[🚀 Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [🎯 Features](#-features) • [🛠️ Installation](#️-installation) • [🤝 Contributing](#-contributing)

</div>

---

## 🌟 Overview

**OpenClaw** is a production-ready AI assistant plugin for the Adverant Nexus ecosystem. It provides a unified interface for multi-channel communication (WhatsApp, Telegram, Discord, Slack, Web), 100+ AI-powered skills, and autonomous automation via cron jobs.

### Key Highlights

- ✨ **100+ Skills**: Pre-built integrations with Nexus services (GraphRAG, MageAgent, FileProcess)
- 🌐 **Multi-Channel**: WhatsApp, Telegram, Discord, Slack, Web - all in one platform
- ⚙️ **Autonomous Automation**: Schedule tasks with visual cron editor
- 🔐 **Enterprise Security**: Execution Mode 3 (hardened Docker), multi-tenant isolation
- 📊 **Real-Time Analytics**: Usage metrics, skill performance, quota tracking
- 🎨 **Beautiful UI**: Next.js 14 dashboard with WhatsApp-style chat interface

---

## 🎯 Features

### Multi-Channel Messaging

Connect with users across multiple platforms from a single interface:

| Channel | Authentication | Features |
|---------|---------------|----------|
| 🟢 WhatsApp | QR Code | Text, Media, Documents, Location |
| 🔵 Telegram | Bot Token | Commands, Inline Keyboards, Files |
| 🟣 Discord | Bot Token | Slash Commands, Embeds, Reactions |
| 🟠 Slack | OAuth 2.0 | Block Kit, Modals, Interactive Components |
| 🌐 Web | JWT | Real-time WebSocket, File Upload |

### 100+ AI Skills

Pre-integrated with Nexus services and external APIs:

**Knowledge Management** (20 skills)
- GraphRAG semantic search
- Knowledge graph storage
- Document analysis

**Communication** (15 skills)
- Email automation
- Slack/Teams messaging
- Calendar management

**Automation** (12 skills)
- Workflow orchestration
- Scheduled tasks
- Multi-agent coordination

**Data Processing** (10 skills)
- ETL operations
- File transformations
- Analytics queries

**Web Services** (8 skills)
- API integrations
- Web scraping
- Browser automation

**Utilities** (35 skills)
- File operations
- Text processing
- Image manipulation

### Autonomous Automation

Visual cron job editor with:
- Cron expression builder with presets
- Skill selection and parameter configuration
- Execution history and logs
- Timezone support
- Manual trigger capability
- Health monitoring

### Real-Time Dashboard

Next.js 14 dashboard with 6 core components:
1. **Chat Interface** - WhatsApp-style messaging with typing indicators
2. **Skill Browser** - Search, filter, and execute 100+ skills
3. **Channel Manager** - Configure multi-channel integrations
4. **Cron Editor** - Visual automation scheduler
5. **Analytics** - Usage metrics and performance charts
6. **Settings** - Plugin configuration and quota display

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- Kubernetes cluster (K3s/K8s)
- Nexus services (GraphRAG, MageAgent, Auth)

### 1. Clone Repository

```bash
git clone https://github.com/adverant/Adverant-Nexus-Plugin-OpenClaw.git
cd Adverant-Nexus-Plugin-OpenClaw
```

### 2. Install Dependencies

```bash
# Backend
cd services/nexus-openclaw
npm install

# Frontend
cd ../../ui
npm install
```

### 3. Configure Environment

```bash
# Backend
cp services/nexus-openclaw/.env.example services/nexus-openclaw/.env
# Edit .env with your configuration

# Frontend
cp ui/.env.example ui/.env.local
# Edit .env.local with API URLs
```

### 4. Run Database Migrations

```bash
# On your PostgreSQL server
psql -U nexus -d unified_nexus -f database/migrations/001_openclaw_schema.sql
```

### 5. Start Development Servers

```bash
# Backend (Terminal 1)
cd services/nexus-openclaw
npm run dev

# Frontend (Terminal 2)
cd ui
npm run dev
```

Access the UI at `http://localhost:3001`

---

## 🛠️ Installation

### Production Deployment (Kubernetes)

#### 1. Create Secrets

```bash
kubectl create secret generic nexus-secrets \
  --from-literal=POSTGRES_USER=nexus \
  --from-literal=POSTGRES_PASSWORD=<password> \
  --from-literal=NEXUS_API_KEY=<key> \
  --from-literal=ANTHROPIC_API_KEY=<key> \
  --from-literal=OPENROUTER_API_KEY=<key> \
  -n nexus
```

#### 2. Build Docker Image

```bash
cd services/nexus-openclaw
docker build -t openclaw:latest .
docker tag openclaw:latest localhost:5000/nexus-openclaw:latest
docker push localhost:5000/nexus-openclaw:latest
```

#### 3. Deploy to Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/virtualservice.yaml
kubectl apply -f k8s/destinationrule.yaml
kubectl apply -f k8s/networkpolicy.yaml
kubectl apply -f k8s/serviceaccount.yaml
```

#### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n nexus -l app=nexus-openclaw

# Check service
kubectl get svc nexus-openclaw -n nexus

# Test health endpoint
curl https://api.adverant.ai/openclaw/health
```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 📖 Documentation

### Core Documentation

- [📘 Architecture Guide](./ARCHITECTURE.md) - System design and data flow
- [🚀 Quick Start Guide](./QUICKSTART.md) - 5-minute setup
- [🔧 Deployment Guide](./DEPLOYMENT.md) - Production deployment (10 phases)
- [🔌 API Documentation](./services/nexus-openclaw/README.md) - REST API reference
- [🎨 UI Components](./ui/README.md) - Frontend components guide

### Phase Documentation

- [Phase 1-2: Foundation & Backend](./services/nexus-openclaw/README.md)
- [Phase 3: Nexus Skills](./services/nexus-openclaw/src/skills/README.md)
- [Phase 4: UI Development](./ui/README.md)
- [Phase 5: K8s Deployment](./k8s/README.md)
- [Phase 6: Multi-Channel](./services/nexus-openclaw/src/channels/README.md)
- [Phase 7: Cron Engine](./services/nexus-openclaw/src/cron/README.md)
- [Phase 8: Production Hardening](./monitoring/README.md)

---

## 🏗️ Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Adverant Nexus Ecosystem                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   GraphRAG   │◄───┤  OpenClaw    │───►│  MageAgent   │ │
│  │   Enhanced   │    │   Plugin     │    │   Service    │ │
│  └──────────────┘    └──────┬───────┘    └──────────────┘ │
│                              │                              │
│  ┌──────────────┐    ┌──────▼───────┐    ┌──────────────┐ │
│  │ FileProcess  │◄───┤  WebSocket   │───►│  Nexus Auth  │ │
│  │   Service    │    │   Gateway    │    │   Service    │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
OpenClaw Plugin
├── Next.js 14 Dashboard (Standalone UI at /openclaw/ui)
│   ├── Chat Interface (WebSocket)
│   ├── Skill Browser (100+ skills)
│   ├── Channel Manager (Multi-platform)
│   ├── Cron Editor (Visual scheduler)
│   ├── Analytics Dashboard (Metrics)
│   └── Settings Panel (Configuration)
│
├── Backend Service (TypeScript/Node.js 20+)
│   ├── WebSocket Gateway (Socket.IO + Redis adapter)
│   ├── REST API (Express + 7 route modules)
│   ├── Skill Executor (20 Nexus skills)
│   ├── Channel Adapters (5 platforms)
│   ├── Cron Scheduler (Automated tasks)
│   └── Security (JWT auth, rate limiting, quotas)
│
├── Multi-Channel Integration
│   ├── WhatsApp (Baileys)
│   ├── Telegram (Grammy)
│   ├── Discord (discord.js)
│   ├── Slack (@slack/bolt)
│   └── Web (Socket.IO)
│
└── Infrastructure (Kubernetes)
    ├── Deployment (2-5 replicas, HPA)
    ├── VirtualService (Istio routing)
    ├── NetworkPolicy (Zero-trust security)
    └── Monitoring (Prometheus + Grafana)
```

---

## 🔐 Security

OpenClaw follows **Execution Mode 3 (hardened_docker)** security standards:

- ✅ **Pod Security**: `runAsNonRoot`, `runAsUser: 1001`, drop ALL capabilities
- ✅ **Network Security**: Default deny, explicit allow rules, mTLS enabled
- ✅ **RBAC**: Minimal read-only permissions, resource-scoped
- ✅ **Secrets Management**: Kubernetes Secrets, never committed to git
- ✅ **Rate Limiting**: Tiered limits (100/500/2000 req/min by tier)
- ✅ **Quota Enforcement**: Monthly quotas per organization tier
- ✅ **Multi-Tenant Isolation**: Organization-based data segregation
- ✅ **Encryption**: AES-256-GCM for channel credentials

For security issues, see [SECURITY.md](./SECURITY.md)

---

## 📊 Tech Stack

### Backend
- **Runtime**: Node.js 20+, TypeScript 5.3
- **Framework**: Express.js
- **WebSocket**: Socket.IO with Redis adapter
- **Database**: PostgreSQL 14+ (connection pooling)
- **Cache**: Redis 7+ (pub/sub, rate limiting)
- **Authentication**: JWT validation via Nexus Auth
- **Monitoring**: Prometheus metrics, Winston logging

### Frontend
- **Framework**: Next.js 14.2 (App Router)
- **UI Library**: Radix UI (accessible components)
- **Styling**: Tailwind CSS 3.4
- **State Management**: TanStack Query
- **WebSocket**: Socket.IO client
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation

### Infrastructure
- **Container**: Docker (multi-stage builds)
- **Orchestration**: Kubernetes (K3s/K8s)
- **Service Mesh**: Istio (traffic management)
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston + JSON structured logs

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint + Prettier
- **Testing**: Jest (unit) + Supertest (integration)
- **Commits**: Conventional Commits format
- **Documentation**: JSDoc comments for all public APIs

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🌐 Links

- **Website**: [adverant.ai/products/plugins/openclaw](https://adverant.ai/products/plugins/openclaw)
- **Dashboard**: [dashboard.adverant.ai](https://dashboard.adverant.ai)
- **Documentation**: [docs.adverant.ai/plugins/openclaw](https://docs.adverant.ai/plugins/openclaw)
- **Support**: [openclaw-support@adverant.ai](mailto:openclaw-support@adverant.ai)
- **Issues**: [GitHub Issues](https://github.com/adverant/Adverant-Nexus-Plugin-OpenClaw/issues)

---

## 🙏 Acknowledgments

Built with ❤️ by [Adverant AI](https://adverant.ai)

Powered by:
- [Anthropic Claude](https://www.anthropic.com/claude) - AI foundation model
- [OpenRouter](https://openrouter.ai/) - Multi-model API
- [Next.js](https://nextjs.org/) - React framework
- [Socket.IO](https://socket.io/) - Real-time communication
- [Kubernetes](https://kubernetes.io/) - Container orchestration

---

<div align="center">

**[⬆ Back to Top](#openclaw-assistant---nexus-marketplace-plugin)**

Made with ☕ and 🤖 by the Adverant Team

</div>
