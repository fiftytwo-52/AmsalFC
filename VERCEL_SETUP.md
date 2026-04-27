# Vercel Production Setup Guide

> [!IMPORTANT]
> **Your specific issue**: The "image upload not syncing" problem happens because Vercel requires external storage services. Without them, your app "forgets" data every time it restarts.

To fix this, you need to configure two services in your Vercel Dashboard.

## 1. Fix Image Uploads (Vercel Blob)

This is why your images are not saving or showing up as "placeholders".

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Select your project **`amsalfc`**.
3. Click on the **Storage** tab.
4. Click **"Create Database"** (or "Connect Store") and select **Blob**.
5. Follow the steps to create a new Blob store (you can name it `amsalfc-images`).
6. Once created, go to the **Settings** of the Blob store (or look for "Environment Variables" in the creation flow).
7. You need to find the `BLOB_READ_WRITE_TOKEN`.
   - Usually, Vercel automatically adds this to your Environment Variables when you connect the store.
   - **Verification**: Go to **Settings** -> **Environment Variables**. Check if `BLOB_READ_WRITE_TOKEN` is present.

## 2. Fix Data Sync (Upstash Redis)

This is why your member data/news changes aren't "syncing" or persisting.

1. In Vercel Dashboard -> **Storage**.
2. Click **"Create Database"** and select **Redis** (Upstash).
3. Create the database (e.g., `amsal-fc-db`).
4. **Critical**: Vercel should automatically add these variables:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_URL` (optional but good to have)
   
   **If they are missing**:
   - Go to [Upstash Console](https://console.upstash.com/).
   - Click on your database.
   - Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
   - Go to Vercel -> Settings -> Environment Variables.
   - Add them as `KV_REST_API_URL` and `KV_REST_API_TOKEN`.

## 3. Verify The Fix

Once you have added these variables:

1. **Redeploy** your application (Environment variables often require a redeploy to take effect).
   - You can go to **Deployments** -> **...** (three dots on latest) -> **Redeploy**.
2. Run the deployment check script locally to test your LIVE site:
   ```bash
   node vercel-deploy-check.js
   ```
   (Note: You might need to edit `vercel-deploy-check.js` to ensure the URL matches your latest deployment if it changed).

3. Visit your site `/api/debug`. It should say:
   - `"storageType": "redis"`
   - `"redisConnected": true`
   - `"hasBlobToken": true`
