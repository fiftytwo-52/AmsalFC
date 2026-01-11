const { Redis } = require('@upstash/redis');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function migrateAll() {
    // List of keys and their corresponding file names
    const filesToMigrate = [
        { key: 'members', file: './data/members.json' },
        { key: 'news', file: './data/news.json' },
        { key: 'club', file: './data/club.json' },
        { key: 'admins', file: './data/admins.json' }
    ];

    for (const item of filesToMigrate) {
        try {
            if (fs.existsSync(item.file)) {
                const data = fs.readFileSync(item.file, 'utf8');
                const jsonData = JSON.parse(data);
                
                console.log(`Uploading ${item.key}...`);
                await redis.set(item.key, jsonData);
                console.log(`✅ ${item.key} moved to cloud.`);
            } else {
                console.log(`⚠️ Skipping ${item.key}: File not found at ${item.file}`);
            }
        } catch (error) {
            console.error(`❌ Failed to migrate ${item.key}:`, error.message);
        }
    }
    console.log('\n--- All migrations finished! ---');
}

migrateAll();