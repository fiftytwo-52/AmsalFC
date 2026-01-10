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
echo "1) Full Express App (Recommended)"
echo "2) Static Site Only (Limited functionality)"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo "📦 Deploying full Express application..."
    
    # Backup current vercel.json
    if [ -f "vercel.json" ]; then
        mv vercel.json vercel.json.backup
    fi
    
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
    
elif [ "$choice" = "2" ]; then
    echo "📄 Deploying static site only..."
    
    # Backup current vercel.json
    if [ -f "vercel.json" ]; then
        mv vercel.json vercel.json.backup
    fi
    
    # Use the static config
    cp vercel-static.json vercel.json
fi

echo ""
echo "🚀 Starting deployment..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo "Check your Vercel dashboard for the live URL."
EOF && chmod +x deploy.sh
