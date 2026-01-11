// Vercel Deployment Check Script
// Run this to verify your Vercel deployment is working correctly

const https = require('https');

const VERCEL_APP_URL = 'https://amsalfc-p78s3zi2j-fiftytwo-52s-projects.vercel.app';

console.log('🔍 Checking Vercel Deployment Status...\n');

// Check 1: Basic connectivity
console.log('1. Testing basic connectivity...');
https.get(`${VERCEL_APP_URL}/api/debug`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const debug = JSON.parse(data);
            console.log('✅ API accessible');

            // Check 2: Redis status
            console.log('\n2. Checking Redis configuration...');
            if (debug.redisConnected) {
                console.log('✅ Redis connected');
            } else {
                console.log('❌ Redis not connected - check KV_REST_API_URL and KV_REST_API_TOKEN');
            }

            // Check 3: Blob status
            console.log('\n3. Checking Vercel Blob configuration...');
            if (debug.hasBlobToken) {
                console.log('✅ Vercel Blob configured');
            } else {
                console.log('❌ Vercel Blob not configured - check BLOB_READ_WRITE_TOKEN');
            }

            // Check 4: Environment
            console.log('\n4. Environment check...');
            console.log(`📍 Environment: ${debug.environment}`);

            if (debug.redisConnected && debug.hasBlobToken) {
                console.log('\n🎉 DEPLOYMENT READY! All systems operational.');
                console.log('\n📋 Next steps:');
                console.log('1. Run database sync: curl -X POST [your-url]/api/sync-database');
                console.log('2. Test image uploads on your live site');
                console.log('3. Test member CRUD operations');
            } else {
                console.log('\n⚠️  CONFIGURATION INCOMPLETE');
                console.log('\n📋 Missing environment variables:');
                if (!debug.redisConnected) console.log('- KV_REST_API_URL and KV_REST_API_TOKEN');
                if (!debug.hasBlobToken) console.log('- BLOB_READ_WRITE_TOKEN');
            }

        } catch (e) {
            console.log('❌ Failed to parse debug response');
            console.log('Response:', data);
        }
    });
}).on('error', (err) => {
    console.log('❌ Cannot reach Vercel deployment');
    console.log('Error:', err.message);
    console.log('\n💡 Possible issues:');
    console.log('- Vercel protection still enabled');
    console.log('- Deployment failed');
    console.log('- Wrong URL');
});