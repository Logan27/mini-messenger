@echo off
echo =====================================
echo Messenger Application Startup
echo =====================================
echo.

REM Check if node_modules exist in both directories
echo [1/5] Checking dependencies...
if not exist "backend\node_modules\" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules\" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo [2/5] Dependencies ready!
echo.

REM Kill any existing processes on ports 3000 and 4000
echo [3/5] Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000 ^| findstr LISTENING') do (
    echo Killing process on port 4000 (PID %%a)
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing process on port 3000 (PID %%a)
    taskkill /F /PID %%a >nul 2>&1
)

echo [4/5] Ports cleaned!
echo.

REM Start backend in a new window
echo [5/5] Starting servers...
echo Starting Backend on http://localhost:4000
start "Messenger Backend" cmd /k "cd backend && npm run dev"

REM Wait 5 seconds for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend in a new window
echo Starting Frontend on http://localhost:3000
start "Messenger Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo =====================================
echo Servers Starting!
echo =====================================
echo Backend:  http://localhost:4000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:4000/api-docs
echo Health:   http://localhost:4000/health
echo =====================================
echo.
echo Press any key to stop all servers...
pause >nul

REM Kill the server processes
echo.
echo Stopping servers...
taskkill /FI "WINDOWTITLE eq Messenger Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Messenger Frontend*" /F >nul 2>&1

echo Servers stopped.
echo.
