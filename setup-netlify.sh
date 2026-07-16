#!/bin/bash

# Netlify Deployment Setup Script for Mainframe HQ
# This script automatically configures Netlify environment variables and deploys

set -e

echo "================================"
echo "🚀 Mainframe HQ Netlify Setup"
echo "================================"
echo ""

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

echo "✅ Netlify CLI ready"
echo ""

# Check if user is logged in
if ! netlify status &> /dev/null; then
    echo "📝 Logging in to Netlify..."
    netlify login
fi

echo ""
echo "📋 Checking for existing site..."

# Check if there's a netlify.toml
if [ ! -f "netlify.toml" ]; then
    echo "❌ netlify.toml not found. Creating..."
    cat > netlify.toml << 'EOF'
[build]
command = "npm run build"
functions = "functions"
publish = ".next"

[[redirects]]
from = "/*"
to = "/index.html"
status = 200

[dev]
command = "npm run dev"
port = 3000

[context.production.environment]
NODE_VERSION = "20"
NODE_ENV = "production"

[[headers]]
for = "/_next/static/*"
[headers.values]
Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
for = "/api/*"
[headers.values]
Cache-Control = "no-cache, no-store, must-revalidate"
EOF
    echo "✅ netlify.toml created"
fi

echo ""
echo "🔐 Setting up environment variables..."
echo ""

# Generate NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "Generated NEXTAUTH_SECRET: $NEXTAUTH_SECRET"

# Get site info
echo ""
echo "📍 Available Netlify sites:"
netlify sites:list

echo ""
echo "Enter your Netlify SITE_ID (from list above):"
read SITE_ID

# Get production domain
NEXTAUTH_URL="https://${SITE_ID}.netlify.app"
echo ""
echo "Your production URL will be: $NEXTAUTH_URL"

echo ""
echo "🔧 Configuring environment variables..."

# Set environment variables via Netlify API
netlify env:set NEXTAUTH_SECRET "$NEXTAUTH_SECRET" --scope production
netlify env:set NEXTAUTH_URL "$NEXTAUTH_URL" --scope production
netlify env:set NODE_ENV "production" --scope production
netlify env:set NEXT_PUBLIC_BRAND_NAME "Candelaria Agency" --scope production

echo ""
echo "✅ Environment variables configured:"
echo "   - NEXTAUTH_SECRET: [hidden]"
echo "   - NEXTAUTH_URL: $NEXTAUTH_URL"
echo "   - NODE_ENV: production"
echo "   - NEXT_PUBLIC_BRAND_NAME: Candelaria Agency"

echo ""
echo "🚀 Deploying to Netlify..."
netlify deploy --prod

echo ""
echo "================================"
echo "✅ Deployment Complete!"
echo "================================"
echo ""
echo "Your site is now live at: $NEXTAUTH_URL"
echo ""
echo "Next steps:"
echo "1. Visit $NEXTAUTH_URL"
echo "2. Login with:"
echo "   Email: j.candelaria171@gmail.com"
echo "   Password: TempPassword123!"
echo ""
echo "Dashboard: $NEXTAUTH_URL/dashboard"
echo ""
