# Upstash Redis Setup Guide for Vercel

This guide will help you set up Upstash Redis for your Vercel deployment so your data persists across deployments.

## Step 1: Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Sign up or log in
3. Click **"Create Database"**
4. Configure your database:
   - **Name**: `amsal-fc` (or any name you prefer)
   - **Type**: Regional (or Global for better performance)
   - **Region**: Choose a region close to your Vercel deployment
   - **Primary Region**: Select your preferred region
   - Click **"Create"**

## Step 2: Get Your Redis Credentials

After creating the database:

1. Click on your database name
2. You'll see two important values:
   - **UPSTASH_REDIS_REST_URL** (or **KV_REST_API_URL**)
   - **UPSTASH_REDIS_REST_TOKEN** (or **KV_REST_API_TOKEN**)

3. **Copy both values** - you'll need them in the next steps

## Step 3: Add Environment Variables to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

   - **Name**: `KV_REST_API_URL`
     - **Value**: Paste your Redis REST URL
     - **Environments**: Production, Preview, Development (check all)

   - **Name**: `KV_REST_API_TOKEN`
     - **Value**: Paste your Redis REST Token
     - **Environments**: Production, Preview, Development (check all)

5. Click **"Save"** for each variable

## Step 4: Export Current Data from Live Site

Before migrating, export your current data:

1. Visit your live site's export endpoint:
   ```
   https://your-app.vercel.app/api/export-database
   ```
   
   OR use curl:
   ```bash
   curl https://your-app.vercel.app/api/export-database > database-export.json
   ```

2. Save the JSON response - you'll use this to verify the migration

## Step 5: Migrate Local JSON Files to Redis (Optional)

If you have local JSON files you want to migrate:

1. Make sure your JSON files exist in the `data/` directory:
   - `data/members.json`
   - `data/news.json`
   - `data/admins.json`
   - `data/slider.json`
   - `data/club.json`

2. Create a `.env` file in your project root (if you don't have one):
   ```env
   KV_REST_API_URL=your_redis_url_here
   KV_REST_API_TOKEN=your_redis_token_here
   ```

3. Run the migration script:
   ```bash
   node migrate-to-redis.js
   ```

4. You should see output like:
   ```
   [Migration] ✅ Connected to Upstash Redis
   [Migration] ✅ Migrated X members to Redis
   [Migration] ✅ Migrated X news to Redis
   ...
   [Migration] 🎉 Migration completed successfully!
   ```

## Step 6: Deploy to Vercel

1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Add Upstash Redis support"
   git push
   ```

2. Vercel will automatically deploy your changes

3. After deployment, check if Redis is connected:
   - Visit: `https://your-app.vercel.app/api/debug`
   - You should see `"redisConnected": true`

## Step 7: Verify Migration

1. Check database status:
   ```
   https://your-app.vercel.app/api/database-status
   ```

2. Verify your data:
   - Visit your live site
   - Check if members, news, admins, etc. are showing correctly
   - Try adding/editing data to ensure writes work

## How It Works

- **Production (Vercel)**: Uses Upstash Redis for all data storage
- **Local Development**: Falls back to JSON file storage if Redis credentials are not set
- **Automatic Fallback**: If Redis connection fails, the app falls back to file storage (for local dev only)

## Troubleshooting

### Redis not connecting on Vercel
- Verify environment variables are set correctly in Vercel dashboard
- Check that variables are set for the correct environment (Production/Preview/Development)
- Make sure there are no extra spaces in the environment variable values

### Data not showing after migration
- Check Redis connection: `https://your-app.vercel.app/api/debug`
- Verify data exists in Redis using Upstash Console
- Check server logs in Vercel dashboard for errors

### Local migration script fails
- Make sure `.env` file exists with correct credentials
- Verify you have the JSON files in the `data/` directory
- Check that `@upstash/redis` package is installed: `npm install`

## Next Steps

After successful migration:
- Your data will persist across Vercel deployments
- All CRUD operations will use Redis
- You can safely delete local JSON files (they're now backups)

## Support

If you encounter issues:
1. Check Vercel function logs
2. Check Upstash Redis console for connection status
3. Verify environment variables are correctly set
