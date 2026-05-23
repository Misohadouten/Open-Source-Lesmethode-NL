#!/bin/bash

set -e

echo "================================"
echo "LessenHub Docker Setup"
echo "================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    exit 1
fi

# Check if Docker daemon is running
if ! docker ps &> /dev/null; then
    echo "❌ Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker is installed and running"
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

echo "🔨 Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check service status
if docker-compose ps | grep -q "healthy"; then
    echo "✅ Services are starting..."
else
    echo "⚠️  Services may still be initializing, waiting a bit more..."
    sleep 10
fi

echo ""
echo "================================"
echo "✅ Deployment Complete!"
echo "================================"
echo ""
echo "Access the application at:"
echo "  • Frontend: http://localhost:3000"
echo "  • Backend API: http://localhost:5000"
echo ""
echo "View logs:"
echo "  docker-compose logs -f"
echo ""
echo "Stop services:"
echo "  docker-compose down"
echo ""
