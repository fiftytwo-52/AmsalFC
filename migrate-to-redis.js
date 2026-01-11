require('dotenv').config();
const { Redis } = require('@upstash/redis');
const fs = require('fs');
const path = require('path');

// Load environment variables from multiple possible files
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.development.local' });

// Initialize Redis
let redis;
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    redis = new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
    });
    console.log('✅ Found Redis credentials in environment');
} else {
    console.error('❌ Environment variables KV_REST_API_URL and KV_REST_API_TOKEN are required!');
    console.log('💡 Make sure you have run: vercel env pull .env.development.local');
    console.log('💡 Or create a .env file with your Redis credentials');
    process.exit(1);
}

const DATA_DIR = path.join(__dirname, 'data');
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const CLUB_FILE = path.join(DATA_DIR, 'club.json');
const SLIDER_FILE = path.join(DATA_DIR, 'slider.json');

async function migrate() {
    try {
        console.log('[Migration] Starting migration to Upstash Redis...');
        
        // Test connection
        await redis.ping();
        console.log('[Migration] ✅ Connected to Upstash Redis');

        const dataTypes = [
            { file: MEMBERS_FILE, key: 'members', name: 'members' },
            { file: NEWS_FILE, key: 'news', name: 'news' },
            { file: ADMINS_FILE, key: 'admins', name: 'admins' },
            { file: SLIDER_FILE, key: 'slider', name: 'slider' },
            { file: CLUB_FILE, key: 'club', name: 'club' }
        ];

        for (const { file, key, name } of dataTypes) {
            try {
                if (!fs.existsSync(file)) {
                    console.log(`[Migration] ⚠️  ${name} file not found, skipping...`);
                    continue;
                }

                const fileData = fs.readFileSync(file, 'utf8');
                if (!fileData || fileData.trim() === '') {
                    console.log(`[Migration] ⚠️  ${name} file is empty, skipping...`);
                    continue;
                }

                const data = JSON.parse(fileData);
                
                // Migrate to Redis
                await redis.set(key, data);
                
                const count = Array.isArray(data) ? data.length : Object.keys(data).length;
                console.log(`[Migration] ✅ Migrated ${count} ${name} to Redis`);
            } catch (error) {
                console.error(`[Migration] ❌ Failed to migrate ${name}:`, error.message);
            }
        }

        console.log('[Migration] 🎉 Migration completed successfully!');
        console.log('[Migration] Your data is now stored in Upstash Redis.');
        process.exit(0);

    } catch (error) {
        console.error('[Migration] ❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
