@echo off
REM Stop all Messenger Docker containers

echo Stopping Messenger Application...
docker-compose down

echo.
echo All services stopped.
