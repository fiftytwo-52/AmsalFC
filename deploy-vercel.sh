#!/bin/bash

echo "⚠️  VERCEL DEPLOYMENT WARNING"
echo "============================"
echo ""
echo "IMPORTANT: Vercel deployment will DISABLE real-time features!"
echo "Your app uses Socket.IO, which does NOT work on Vercel."
echo ""
echo "Features that WON'T work:"
echo "- Real-time member updates"
echo "- Live news notifications"
echo "- Real-time admin updates"
echo "- Any Socket.IO dependent features"
echo ""
echo "Only basic CRUD operations will work."
echo ""
read -p "Do you want to continue with limited Vercel deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled. Consider using Render.com instead."
    echo "Run: ./deploy-render.sh"
    exit 1
fi

echo ""
echo "🚀 Deploying to Vercel (Limited Features)"
echo "========================================="

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
echo "📦 Starting Vercel deployment..."
vercel --prod

echo ""
echo "✅ Vercel deployment complete!"
echo ""
echo "⚠️  REMEMBER: Real-time features are DISABLED on Vercel"
echo "🌐 Your app: Check Vercel dashboard for the URL"
echo ""
echo "💡 For full functionality, use Render.com instead:"
echo "   ./deploy-render.sh"