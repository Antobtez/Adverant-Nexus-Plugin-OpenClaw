# OpenClaw UI - Quick Start Guide

## Installation & Setup (5 minutes)

### 1. Install Dependencies

```bash
cd /Users/don/Adverant/Adverant-Nexus-Plugin-OpenClaw/ui
npm install
```

This will install all required packages:
- Next.js 14 + React 18
- TanStack Query for data fetching
- Socket.IO client for WebSocket
- Radix UI components
- Tailwind CSS
- Recharts for analytics
- And all other dependencies

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Backend API URL (Nexus OpenClaw service)
NEXT_PUBLIC_API_URL=http://localhost:3000

# WebSocket URL (for real-time features)
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

Update these URLs to match your backend deployment.

### 3. Start Development Server

```bash
npm run dev
```

The UI will be available at: **http://localhost:3001**

### 4. Verify Setup

Open http://localhost:3001 and verify:
- Dashboard loads without errors
- All 6 tabs are visible (Chat, Skills, Channels, Automation, Analytics, Settings)
- Connection status badge shows WebSocket state
- Browser console shows no critical errors

## Component Overview

### Chat Tab
- Real-time messaging with AI assistant
- Markdown support with code highlighting
- Typing indicators and message status
- Session persistence

### Skills Tab
- Browse 100+ skills with search
- Filter by category
- Execute skills with parameters
- Favorite skills (saved to localStorage)

### Channels Tab
- Multi-channel management (WhatsApp, Telegram, Slack, Discord)
- QR code pairing for WhatsApp
- Connection testing
- Real-time status updates

### Automation Tab
- Cron job scheduler
- Visual cron builder with presets
- Enable/disable jobs
- Run jobs manually
- View execution history

### Analytics Tab
- Skills executed over time (line chart)
- Top skills by usage (bar chart)
- Channel distribution (pie chart)
- Session duration trends (line chart)
- API quota usage

### Settings Tab
- Model provider selection (Claude, OpenAI, OpenRouter)
- Session timeout configuration
- Notification preferences
- API key management
- Quota display

## Development Commands

```bash
# Start dev server (port 3001)
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Start production server
npm start

# Clean build artifacts
npm run clean
```

## Troubleshooting

### Port Already in Use
If port 3001 is busy, edit `package.json`:
```json
"dev": "next dev -p 3002"
```

### WebSocket Not Connecting
1. Check `NEXT_PUBLIC_WS_URL` in `.env.local`
2. Verify backend WebSocket server is running
3. Check browser console for connection errors

### API Errors
1. Verify `NEXT_PUBLIC_API_URL` in `.env.local`
2. Check backend service is running
3. Verify CORS is configured on backend
4. Check Network tab in browser DevTools

### TypeScript Errors
```bash
npm run typecheck
```
Fix any type errors before building.

### Build Errors
```bash
npm run clean
npm install
npm run build
```

## Production Deployment

### 1. Build

```bash
npm run build
```

### 2. Environment Variables

Set production URLs:
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

### 3. Start

```bash
npm start
```

Or use a process manager like PM2:
```bash
pm2 start npm --name "openclaw-ui" -- start
```

### 4. Docker (Optional)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
RUN npm ci --only=production
EXPOSE 3001
CMD ["npm", "start"]
```

## Integration with Backend

The UI expects these API endpoints:

### REST API
- `POST /api/chat/message` - Send message
- `GET /api/chat/history/:sessionId` - Get message history
- `POST /api/chat/session` - Create session
- `GET /api/skills` - List skills
- `POST /api/skills/:id/execute` - Execute skill
- `GET /api/channels` - List channels
- `POST /api/channels/connect` - Connect channel
- `GET /api/cron` - List cron jobs
- `POST /api/cron` - Create cron job
- `GET /api/analytics/metrics` - Get analytics
- `GET /api/settings` - Get settings
- `GET /api/auth/me` - Get current user

### WebSocket Events (Socket.IO)
- `message` - Chat messages
- `typing` - Typing indicators
- `skill:execution` - Skill execution status
- `channel:status` - Channel connection status
- `cron:run` - Cron job execution

## Next Steps

1. **Connect to Backend**: Update `.env.local` with backend URLs
2. **Test Authentication**: Implement login flow
3. **Verify API Responses**: Ensure backend matches expected types
4. **Test WebSocket**: Verify real-time events work
5. **Customize Branding**: Update colors in `tailwind.config.ts`
6. **Add Analytics**: Integrate with your analytics provider

## Support

For issues or questions:
- Check `IMPLEMENTATION_SUMMARY.md` for detailed component documentation
- Review `README.md` for project structure
- Check browser console for errors
- Verify backend logs for API issues

## Production Checklist

- [ ] Environment variables configured
- [ ] Backend API accessible
- [ ] WebSocket connection working
- [ ] Authentication flow tested
- [ ] All components loading correctly
- [ ] No console errors
- [ ] TypeScript checks passing (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Performance tested (Lighthouse)
- [ ] Mobile responsive verified
- [ ] Dark mode working
