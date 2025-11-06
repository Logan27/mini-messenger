#!/bin/bash

echo "====================================="
echo "Messenger Application Startup"
echo "====================================="
echo ""

# Check if node_modules exist
echo "[1/5] Checking dependencies..."
if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo "[2/5] Dependencies ready!"
echo ""

# Kill any existing processes on ports 3000 and 4000
echo "[3/5] Cleaning up existing processes..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "[4/5] Ports cleaned!"
echo ""

# Start backend in background
echo "[5/5] Starting servers..."
echo "Starting Backend on http://localhost:4000"
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait 5 seconds for backend to start
echo "Waiting for backend to initialize..."
sleep 5

# Start frontend in background
echo "Starting Frontend on http://localhost:3000"
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo "====================================="
echo "Servers Running!"
echo "====================================="
echo "Backend:  http://localhost:4000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:4000/api-docs"
echo "Health:   http://localhost:4000/health"
echo "====================================="
echo ""
echo "Backend PID:  $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Logs:"
echo "  Backend:  tail -f logs/backend.log"
echo "  Frontend: tail -f logs/frontend.log"
echo ""
echo "Press Ctrl+C to stop all servers..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "Servers stopped."
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Wait indefinitely
wait
