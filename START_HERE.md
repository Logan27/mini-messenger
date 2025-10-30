# 🚀 Quick Start Guide

## Starting the Application

### Option 1: Windows Batch Script (Recommended for Windows)

**Double-click** `start.bat` or run in terminal:
```bash
start.bat
```

This will:
- ✅ Check and install dependencies if needed
- ✅ Clean up any existing processes on ports 3000/4000
- ✅ Start backend on http://localhost:4000
- ✅ Start frontend on http://localhost:3000
- ✅ Open both in separate terminal windows

**Press any key** in the main terminal to stop all servers.

---

### Option 2: NPM Scripts (Cross-platform)

**Single command to run both:**
```bash
npm run dev
```

This uses `concurrently` to run backend and frontend simultaneously in one terminal with colored output.

**Individual commands:**
```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

---

### Option 3: Unix/Linux/Mac Script

```bash
./start.sh
```

**Press Ctrl+C** to stop all servers.

Logs are saved to:
- `logs/backend.log`
- `logs/frontend.log`

---

## Access Points

Once started, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application UI |
| **Backend API** | http://localhost:4000/api | REST API endpoints |
| **API Docs (Swagger)** | http://localhost:4000/api-docs | Interactive API documentation |
| **Health Check** | http://localhost:4000/health | Server health status |

---

## First Time Setup

If this is your first time running the app:

```bash
# Install all dependencies (root, backend, frontend)
npm run install:all
```

---

## Troubleshooting

### Port Already in Use

**Windows:**
```bash
# Find process using port 4000
netstat -ano | findstr :4000

# Kill it (replace XXXXX with PID)
taskkill /F /PID XXXXX
```

**Unix/Linux/Mac:**
```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Backend Connection Refused

Make sure backend is running:
```bash
curl http://localhost:4000/health
```

If not responding, restart backend:
```bash
cd backend
npm run dev
```

### Frontend WebSocket Errors

1. Make sure frontend is running on port 3000
2. Clear browser cache and reload
3. Check Vite config has correct HMR settings

---

## Useful Commands

```bash
# Run tests
npm test                    # Both backend and frontend
npm run test:backend        # Backend only
npm run test:frontend       # Frontend only

# Build for production
npm run build               # Build frontend

# Clean node_modules
npm run clean

# Docker commands
npm run docker:build        # Build Docker images
npm run docker:up           # Start with Docker Compose
npm run docker:down         # Stop Docker containers
npm run docker:logs         # View Docker logs
```

---

## Default Credentials

For testing, you can register a new account at http://localhost:3000/register

**Note:** New registrations require admin approval. Check the backend console for admin account details or seed data.

---

## Environment Variables

### Backend (.env)
Located in `backend/.env`
- `PORT=4000`
- `DATABASE_URL=...`
- `JWT_SECRET=...`
- `SWAGGER_ENABLED=true`

### Frontend (.env.development)
Located in `frontend/.env.development`
- `VITE_API_URL=http://localhost:4000/api`
- `VITE_SOCKET_URL=http://localhost:4000`

---

## Need Help?

- **API Documentation:** http://localhost:4000/api-docs (when backend running)
- **Project Docs:** Check the `docs/` folder
  - `docs/brd.md` - Business Requirements
  - `docs/frd.md` - Functional Requirements
  - `docs/api-spec.md` - Complete API Specification
  - `docs/arch.md` - Architecture Overview

---

## Quick Development Workflow

1. **Start servers:** `npm run dev` or `start.bat`
2. **Open browser:** http://localhost:3000
3. **View API docs:** http://localhost:4000/api-docs
4. **Make changes** - Both servers auto-reload
5. **Stop servers:** Ctrl+C or close terminal windows

---

**Happy coding! 🎉**
