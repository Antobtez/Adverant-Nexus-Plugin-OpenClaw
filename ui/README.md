# OpenClaw Assistant UI

Next.js 14 dashboard for the OpenClaw multi-channel AI assistant plugin.

## Features

- **ChatInterface**: WhatsApp-style real-time messaging with AI assistant
- **SkillBrowser**: Browse and execute 100+ skills with parameter input
- **ChannelManager**: Multi-channel configuration (WhatsApp, Telegram, Slack, Discord)
- **CronEditor**: Visual cron job scheduler with skill automation
- **AnalyticsDashboard**: Usage metrics with Recharts visualizations
- **SettingsPanel**: Plugin configuration and preferences

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Data Fetching**: TanStack Query
- **Real-time**: Socket.IO client
- **Charts**: Recharts
- **Markdown**: react-markdown with syntax highlighting

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your backend URL
# NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Development

```bash
# Start development server (port 3001)
npm run dev

# Open http://localhost:3001
```

### Build

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
ui/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Main dashboard page
│   ├── providers.tsx       # TanStack Query provider
│   └── globals.css         # Global styles
├── components/
│   ├── ChatInterface/      # Real-time chat component
│   ├── SkillBrowser/       # Skill browsing and execution
│   ├── ChannelManager/     # Channel configuration
│   ├── CronEditor/         # Cron job scheduler
│   ├── AnalyticsDashboard/ # Usage analytics
│   ├── SettingsPanel/      # Settings UI
│   └── ui/                 # Radix UI wrapper components
├── hooks/
│   ├── useAuth.ts          # Authentication hook
│   └── useWebSocket.ts     # WebSocket hook
├── lib/
│   ├── api-client.ts       # Axios API client
│   ├── websocket-client.ts # Socket.IO client
│   └── utils.ts            # Utility functions
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## API Integration

The UI connects to the OpenClaw backend service:

- **REST API**: `/api/*` endpoints via Axios
- **WebSocket**: Socket.IO for real-time updates
- **Authentication**: JWT token in localStorage

## Environment Variables

See `.env.example` for required configuration.

## Development Tips

- Use React DevTools for component debugging
- Use TanStack Query DevTools for data fetching inspection
- Check browser console for WebSocket connection status
- API responses are cached by TanStack Query (configurable)

## License

MIT
