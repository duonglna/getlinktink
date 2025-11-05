#!/bin/bash

# VietnamPlus Crawler API - Quick Deploy Script

echo "🚀 VietnamPlus Crawler API Deployment"
echo "======================================"

# Check if Fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI is not installed!"
    echo "Install it with:"
    echo "  macOS/Linux: curl -L https://fly.io/install.sh | sh"
    echo "  Windows: powershell -Command \"iwr https://fly.io/install.ps1 -useb | iex\""
    exit 1
fi

echo "✅ Fly CLI detected"

# Check if logged in
if ! fly auth whoami &> /dev/null; then
    echo "📝 Please login to Fly.io..."
    fly auth login
fi

echo "✅ Logged in to Fly.io"

# Check if fly.toml exists
if [ ! -f "fly.toml" ]; then
    echo "📝 Creating new Fly app..."
    fly launch --no-deploy
else
    echo "✅ fly.toml found"
fi

# Deploy
echo "🚢 Deploying to Fly.io..."
fly deploy

# Get app status
echo ""
echo "✅ Deployment complete!"
echo ""
fly status

# Get app URL
APP_NAME=$(grep "^app" fly.toml | cut -d'"' -f2)
echo ""
echo "🌐 Your API is live at: https://${APP_NAME}.fly.dev"
echo ""
echo "📡 Test endpoints:"
echo "   Health: curl https://${APP_NAME}.fly.dev/health"
echo "   Crawl:  curl https://${APP_NAME}.fly.dev/api/crawl?pages=10"
echo ""
echo "📊 View logs: fly logs"
echo "🔄 Restart:   fly apps restart ${APP_NAME}"
