// Test Vercel Upload Issues
const https = require('https');

const VERCEL_URL = 'https://amsalfc-p78s3zi2j-fiftytwo-52s-projects.vercel.app';

console.log('🔍 Testing Vercel Image Upload...\n');

// Test 1: Check environment variables
console.log('1. Checking environment variables...');
https.get(`${VERCEL_URL}/api/debug`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const debug = JSON.parse(data);
            console.log('✅ Debug endpoint accessible');

            console.log('\n📊 Environment Status:');
            console.log(`   Redis Available: ${debug.redisAvailable}`);
            console.log(`   Redis Connected: ${debug.redisConnected}`);
            console.log(`   Blob Token Set: ${debug.hasBlobToken}`);
            console.log(`   Environment: ${debug.environment}`);

            if (!debug.hasBlobToken) {
                console.log('\n❌ ISSUE FOUND: BLOB_READ_WRITE_TOKEN not configured');
                console.log('\n🔧 SOLUTION: Add BLOB_READ_WRITE_TOKEN to Vercel environment variables');
                console.log('   1. Go to Vercel Dashboard → Settings → Environment Variables');
                console.log('   2. Add: BLOB_READ_WRITE_TOKEN = your_blob_token');
                console.log('   3. Redeploy the application');
                return;
            }

            // Test 2: Try image upload
            console.log('\n2. Testing image upload...');
            testImageUpload();

        } catch (e) {
            console.log('❌ Failed to parse debug response');
            console.log('Response:', data.substring(0, 200) + '...');
        }
    });
}).on('error', (err) => {
    console.log('❌ Cannot access Vercel deployment');
    console.log('Error:', err.message);
    console.log('\n💡 Possible issues:');
    console.log('- Vercel deployment protection is enabled');
    console.log('- Wrong Vercel URL');
    console.log('- Deployment failed');
});

function testImageUpload() {
    // Create a simple test image (1x1 pixel PNG in base64)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');

    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2);
    const postData = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="image"; filename="test.png"',
        'Content-Type: image/png',
        '',
        testImageBuffer,
        `--${boundary}--`
    ].join('\r\n');

    const options = {
        hostname: 'amsalfc-p78s3zi2j-fiftytwo-52s-projects.vercel.app',
        path: '/api/upload/slider',
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`Upload response status: ${res.statusCode}`);
            if (res.statusCode === 200) {
                console.log('✅ Image upload successful!');
                console.log('Response:', data);
            } else {
                console.log('❌ Image upload failed!');
                console.log('Response:', data);

                // Try to parse error details
                try {
                    const errorData = JSON.parse(data);
                    console.log('\n🔍 Error Details:');
                    console.log(`   Error: ${errorData.error}`);
                    if (errorData.details) {
                        console.log(`   Details: ${errorData.details}`);
                    }
                } catch (e) {
                    console.log('Could not parse error response');
                }
            }
        });
    });

    req.on('error', (err) => {
        console.log('❌ Upload request failed:', err.message);
    });

    req.write(postData);
    req.end();
}