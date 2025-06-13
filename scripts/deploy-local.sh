#!/bin/bash

# Local VPS deployment script without Docker Hub
# Usage: ./scripts/deploy-local.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

PROJECT_DIR="/opt/scrum-poker"

print_status "Starting local deployment..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down || true

# Remove old images to force rebuild
print_status "Cleaning up old Docker images..."
docker image prune -a -f || true

# Build and start containers
print_status "Building and starting containers..."
docker-compose up -d --build

# Wait for application to start
print_status "Waiting for application to start..."
sleep 15

# Verify deployment
print_status "Verifying deployment..."
if curl -f http://localhost:5001 > /dev/null 2>&1; then
    print_status "✅ Deployment successful! Application is running on port 5001"
else
    print_error "❌ Deployment verification failed"
    print_status "Checking container logs..."
    docker-compose logs
    exit 1
fi

# Show container status
print_status "Container status:"
docker-compose ps

print_status "Deployment completed successfully!"
print_status "Access your application at: http://localhost:5001"