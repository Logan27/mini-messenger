#!/bin/sh

# =====================================
# Messenger Backend Startup Script
# =====================================

set -e

echo "🚀 Starting Messenger Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
sleep 5

# Run database migrations
echo "🔄 Running database migrations..."
npm run migrate

# Seed database if needed
if [ "$NODE_ENV" = "development" ]; then
    echo "🌱 Seeding database..."
    npm run seed
fi

# Start the application
echo "🏃 Starting application..."
exec npm start