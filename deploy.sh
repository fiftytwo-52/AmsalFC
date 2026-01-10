#!/bin/bash

echo "🚀 AMSAL FC Deployment Script"
echo "============================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if logged in
echo "🔐 Checking Vercel authentication..."
vercel whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo "Please login to Vercel:"
    vercel login
fi

echo ""
echo "Choose deployment method:"
echo "1) Render.com (Recommended - Full features with Socket.IO)"
echo "2) Vercel (Limited - No real-time features)"
echo "3) Static Site Only (Basic HTML/CSS/JS only)"
read -p "Enter choice (1, 2, or 3): " choice

if [ "$choice" = "1" ]; then
    echo "🌐 Deploying to Render.com (Recommended)..."
    echo "Please follow the Render.com deployment instructions in README.md"
    echo "Run: ./deploy-render.sh for detailed instructions"
    exit 0

elif [ "$choice" = "2" ]; then
    echo "⚠️  WARNING: Vercel deployment will DISABLE real-time features!"
    echo "Socket.IO will NOT work on Vercel. Continue? (y/N)"
    read -p "" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi

    echo "📦 Deploying Express app to Vercel (limited functionality)..."

    # Use the Express config
    cat > vercel.json << 'EOFF'
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
EOFF

else
    echo "📄 Deploying static site only (no backend functionality)..."
    echo "This will only serve HTML/CSS/JS files with no dynamic features."

    # Create basic static deployment config
    cat > vercel.json << 'EOFF'
{
  "version": 2,
  "builds": [
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ]
}
EOFF
fi

echo ""
echo "🚀 Starting deployment..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo "Check your Vercel dashboard for the live URL."
EOF && chmod +x deploy.sh
