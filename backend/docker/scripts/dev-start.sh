#!/bin/sh

# =====================================
# Development Startup Script
# =====================================

set -e

echo "🚀 Starting Messenger Backend in Development Mode..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 15

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
sleep 5

# Run database migrations
echo "🔄 Running database migrations..."
npm run migrate

# Seed database if needed
echo "🌱 Seeding database..."
npm run seed

# Start development server with hot reload
echo "🏃 Starting development server..."
exec npm run dev