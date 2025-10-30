#!/bin/bash

# Deployment script for Messenger Frontend
# Usage: ./scripts/deploy.sh [environment]

set -e  # Exit on any error

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "🚀 Starting deployment for ${ENVIRONMENT} environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration based on environment
case $ENVIRONMENT in
  "production")
    BUILD_COMMAND="build"
    DIST_DIR="dist"
    DEPLOY_TARGET="production-server"
    ;;
  "staging")
    BUILD_COMMAND="build:staging"
    DIST_DIR="dist-staging"
    DEPLOY_TARGET="staging-server"
    ;;
  "development")
    BUILD_COMMAND="build:dev"
    DIST_DIR="dist-dev"
    DEPLOY_TARGET="dev-server"
    ;;
  *)
    echo -e "${RED}❌ Unknown environment: ${ENVIRONMENT}${NC}"
    echo "Usage: $0 [production|staging|development]"
    exit 1
    ;;
esac

# Function to print status messages
print_status() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Check if required tools are installed
check_dependencies() {
  echo "🔍 Checking dependencies..."

  if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
  fi

  if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
  fi

  if ! command -v docker &> /dev/null && [[ "$ENVIRONMENT" == "production" ]]; then
    print_warning "Docker not found. Skipping containerized deployment."
  fi

  print_status "Dependencies check completed"
}

# Install dependencies
install_dependencies() {
  echo "📦 Installing dependencies..."

  cd "$PROJECT_ROOT"

  if [[ -f "package-lock.json" ]]; then
    npm ci
  else
    npm install
  fi

  print_status "Dependencies installed"
}

# Run tests before deployment
run_tests() {
  echo "🧪 Running tests..."

  cd "$PROJECT_ROOT"

  # Run linting
  npm run lint

  # Run type checking
  npm run type-check

  # Run test suite
  npm run test:run

  # Run build to ensure it works
  npm run $BUILD_COMMAND

  print_status "All tests passed"
}

# Build the application
build_application() {
  echo "🔨 Building application for ${ENVIRONMENT}..."

  cd "$PROJECT_ROOT"

  # Clean previous build
  rm -rf $DIST_DIR

  # Run the build
  npm run $BUILD_COMMAND

  # Verify build output
  if [[ ! -d "$DIST_DIR" ]]; then
    print_error "Build failed - no dist directory found"
    exit 1
  fi

  # Check build size
  BUILD_SIZE=$(du -sh "$DIST_DIR" | cut -f1)
  print_status "Build completed successfully (Size: $BUILD_SIZE)"

  # Generate build report
  if command -v npx &> /dev/null; then
    echo "📊 Generating build analysis..."
    npx vite-bundle-analyzer "$DIST_DIR" > "$DIST_DIR/build-analysis.html" 2>/dev/null || true
  fi
}

# Optimize assets
optimize_assets() {
  echo "⚡ Optimizing assets..."

  cd "$PROJECT_ROOT/$DIST_DIR"

  # Compress assets if gzip is available
  if command -v gzip &> /dev/null; then
    find . -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec gzip -k {} \;
    print_status "Assets compressed with gzip"
  fi

  # Generate service worker for caching (if applicable)
  if [[ -f "index.html" ]]; then
    print_status "Static assets optimized"
  fi
}

# Deploy to target environment
deploy_to_target() {
  echo "🚢 Deploying to ${DEPLOY_TARGET}..."

  cd "$PROJECT_ROOT"

  case $ENVIRONMENT in
    "production")
      deploy_production
      ;;
    "staging")
      deploy_staging
      ;;
    "development")
      deploy_development
      ;;
  esac
}

deploy_production() {
  # Production deployment with Docker
  if command -v docker &> /dev/null; then
    echo "🐳 Building production Docker image..."

    docker build -f Dockerfile.production \
                 -t messenger-frontend:${ENVIRONMENT} \
                 --build-arg NODE_ENV=production \
                 .

    # Tag with timestamp for rollbacks
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    docker tag messenger-frontend:${ENVIRONMENT} \
               messenger-frontend:${ENVIRONMENT}_${TIMESTAMP}

    # Deploy to production server (example)
    echo "📤 Pushing to production registry..."
    docker push messenger-frontend:${ENVIRONMENT}

    # Update production server
    ssh production-server "docker pull messenger-frontend:${ENVIRONMENT} && docker-compose up -d frontend"

    print_status "Production deployment completed"
  else
    # Fallback to static file deployment
    echo "📁 Deploying static files to production..."

    # Upload to CDN or static hosting
    rsync -avz --delete "$DIST_DIR/" "production-server:/var/www/messenger/"

    # Reload web server
    ssh production-server "sudo systemctl reload nginx"

    print_status "Static file deployment completed"
  fi
}

deploy_staging() {
  echo "🧪 Deploying to staging environment..."

  # Similar to production but with staging configurations
  rsync -avz --delete "$DIST_DIR/" "staging-server:/var/www/messenger-staging/"

  ssh staging-server "sudo systemctl reload nginx"

  print_status "Staging deployment completed"
}

deploy_development() {
  echo "🔧 Deploying to development environment..."

  # Simple file copy for development
  mkdir -p "../deployment/dev-frontend"
  rsync -avz --delete "$DIST_DIR/" "../deployment/dev-frontend/"

  print_status "Development deployment completed"
}

# Health check after deployment
health_check() {
  echo "🏥 Running health checks..."

  case $ENVIRONMENT in
    "production"|"staging")
      # Wait for deployment to be ready
      sleep 10

      # Check if application is responding
      if curl -f "https://${DEPLOY_TARGET}/health" > /dev/null 2>&1; then
        print_status "Health check passed"
      else
        print_warning "Health check failed - manual verification required"
      fi
      ;;
    "development")
      print_status "Development deployment - skipping health check"
      ;;
  esac
}

# Rollback function (if needed)
rollback() {
  if [[ -n "$TIMESTAMP" ]]; then
    echo "🔄 Rolling back to previous version..."

    ssh production-server "docker tag messenger-frontend:${ENVIRONMENT}_${TIMESTAMP} messenger-frontend:${ENVIRONMENT} && docker-compose up -d frontend"

    print_status "Rollback completed"
  else
    print_error "No previous version found for rollback"
  fi
}

# Main deployment flow
main() {
  check_dependencies
  install_dependencies
  run_tests
  build_application
  optimize_assets
  deploy_to_target
  health_check

  echo ""
  print_status "🎉 Deployment completed successfully!"
  echo ""
  echo "📋 Deployment Summary:"
  echo "  Environment: ${ENVIRONMENT}"
  echo "  Build Size: $(du -sh "$PROJECT_ROOT/$DIST_DIR" | cut -f1)"
  echo "  Deploy Target: ${DEPLOY_TARGET}"
  echo "  Timestamp: $(date)"
  echo ""
  echo "🔍 Next steps:"
  echo "  - Monitor application logs"
  echo "  - Run end-to-end tests"
  echo "  - Check performance metrics"
  echo "  - Verify all features work correctly"
}

# Handle script arguments
case "${2:-}" in
  "rollback")
    rollback
    ;;
  *)
    main
    ;;
esac