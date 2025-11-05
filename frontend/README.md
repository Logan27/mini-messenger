# Messenger Frontend

Modern React + TypeScript messenger with real-time communication.

## Quick Start

```bash
npm install
npm run dev
```

Frontend runs on: http://localhost:3000
Backend must run on: http://localhost:4000

## Configuration

Create `.env`:
```
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

## Status

✅ API integration complete
✅ Authentication working (login/register)
✅ WebSocket real-time messaging
⚠️ Components need update to use real data (currently using mocks)

See [FRONTEND_INTEGRATION_SUMMARY.md](./FRONTEND_INTEGRATION_SUMMARY.md) for full details.
