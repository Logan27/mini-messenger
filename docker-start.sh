#!/bin/bash
# Messenger Application - Docker Start Script (Linux/Mac)

set -e

echo "======================================"
echo "  Messenger Application - Docker"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "[WARNING] .env file not found"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "[IMPORTANT] Please edit .env file and set secure secrets before production use!"
    echo "Press Enter to continue with default development settings..."
    read -r
    echo ""
fi

echo "Starting Messenger Application..."
echo ""

# Start all services
docker-compose up -d

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Failed to start services"
    echo "Run 'docker-compose logs' to see errors"
    exit 1
fi

echo ""
echo "======================================"
echo "  Services Started Successfully!"
echo "======================================"
echo ""
echo "Frontend:  http://localhost:3000"
echo "Backend:   http://localhost:4000"
echo "API Docs:  http://localhost:4000/api-docs"
echo "Health:    http://localhost:4000/health"
echo ""
echo "Dev Tools (optional):"
echo "  - pgAdmin:         http://localhost:8080"
echo "  - Redis Commander: http://localhost:8081"
echo "  (Start with: docker-compose --profile dev up -d)"
echo ""
echo "======================================"
echo ""
echo "Viewing logs... (Ctrl+C to exit)"
docker-compose logs -f
