console.log('[Server] Starting AMSAL FC application...');

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { put } = require('@vercel/blob');
const { Redis } = require('@upstash/redis');
const axios = require('axios');

// Upstash Redis setup
let redis = null;
let redisConnected = false;

if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
        redis = new Redis({
            url: process.env.KV_REST_API_URL,
            token: process.env.KV_REST_API_TOKEN,
        });

        // Test connection
        redis.ping().then(() => {
            redisConnected = true;
            console.log('[Database] ✅ Upstash Redis connection initialized and tested');
        }).catch((error) => {
            console.error('[Database] ❌ Redis connection test failed:', error.message);
            redis = null;
        });
    } catch (error) {
        console.error('[Database] ❌ Failed to initialize Redis:', error.message);
        redis = null;
    }
} else {
    console.log('[Database] ⚠️  Upstash Redis environment variables not found, using file storage');
}

console.log('[Server] Environment loaded, dependencies imported');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const CLUB_FILE = path.join(DATA_DIR, 'club.json');
const SLIDER_FILE = path.join(DATA_DIR, 'slider.json');

// Create uploads directory if it doesn't exist
try {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        console.log('[Init] Created uploads directory');
    }
} catch (error) {
    console.warn('[Init] Could not create uploads directory:', error.message);
}

// Configure multer for file uploads
// Use memoryStorage for Vercel (serverless), diskStorage for local development
const storage = (process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN)
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, UPLOADS_DIR);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve logo.png from both root and public directory
app.get('/logo.png', (req, res) => {
    const logoPath = path.join(__dirname, 'logo.png');
    if (fs.existsSync(logoPath)) {
        res.sendFile(logoPath);
    } else {
        res.sendFile(path.join(__dirname, 'public', 'logo.png'));
    }
});

// Debug endpoint to check database status
app.get('/api/debug', (req, res) => {
    res.json({
        environment: process.env.NODE_ENV || 'development',
        storageType: redisConnected ? 'redis' : 'file',
        redisAvailable: !!redis,
        redisConnected: redisConnected,
        hasRedisEnv: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
        hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
        hasImgbbKey: !!process.env.IMGBB_API_KEY,
        timestamp: new Date().toISOString()
    });
});

// Check current database content
app.get('/api/database-status', async (req, res) => {
    try {
        const status = {
            storageType: redisConnected ? 'redis' : 'file',
            redis: {
                available: !!redis,
                connected: redisConnected,
                hasEnvVars: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
            },
            blob: {
                available: !!process.env.BLOB_READ_WRITE_TOKEN
            },
            data: {}
        };

        // Check each data type
        const dataTypes = [
            { file: MEMBERS_FILE, key: 'members', name: 'members' },
            { file: NEWS_FILE, key: 'news', name: 'news' },
            { file: ADMINS_FILE, key: 'admins', name: 'admins' },
            { file: SLIDER_FILE, key: 'slider', name: 'slider' },
            { file: CLUB_FILE, key: 'club', name: 'club' }
        ];

        for (const { file, key, name } of dataTypes) {
            try {
                // Try Redis first
                if (redis && redisConnected) {
                    const redisData = await redis.get(key);
                    if (redisData !== null) {
                        status.data[name] = {
                            source: 'redis',
                            count: Array.isArray(redisData) ? redisData.length : Object.keys(redisData).length,
                            sample: Array.isArray(redisData) ? redisData.slice(0, 1) : redisData
                        };
                        continue;
                    }
                }

                // Fallback to file
                const localData = await readData(file);
                status.data[name] = {
                    source: 'file',
                    count: Array.isArray(localData) ? localData.length : Object.keys(localData).length,
                    sample: Array.isArray(localData) ? localData.slice(0, 1) : localData
                };
            } catch (error) {
                status.data[name] = { error: error.message };
            }
        }

        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Database export endpoint - export all data as JSON (for migration purposes)
app.get('/api/export-database', async (req, res) => {
    try {
        console.log('[Export] Starting database export...');

        const data = {
            members: await readData(MEMBERS_FILE),
            news: await readData(NEWS_FILE),
            admins: await readData(ADMINS_FILE),
            slider: await readData(SLIDER_FILE),
            club: await readData(CLUB_FILE),
            exportedAt: new Date().toISOString()
        };

        console.log('[Export] Database export completed');
        res.json({
            success: true,
            message: 'Database export completed',
            data
        });
    } catch (error) {
        console.error('[Export] ❌ Database export failed:', error);
        res.status(500).json({
            success: false,
            error: 'Database export failed',
            details: error.message
        });
    }
});

// Serve index.html as default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper to read data (Redis with file fallback)
const readData = async (filePath) => {
    const key = path.basename(filePath, '.json');

    // Try Redis first if available and connected
    if (redis && redisConnected) {
        try {
            const data = await redis.get(key);
            if (data !== null) {
                console.log(`[Database] ✅ Successfully read ${key} from Redis (${Array.isArray(data) ? data.length : Object.keys(data).length} items)`);
                return data;
            }
            console.log(`[Database] ⚠️  ${key} not found in Redis, returning defaults`);
            // Return appropriate default based on file type
            return key === 'club' ? {} : [];
        } catch (err) {
            console.error(`[Database] ❌ Failed to read ${key} from Redis:`, err.message);
            console.log(`[Database] Falling back to file storage for ${key}`);
        }
    }

    // Fallback to file storage (for local development or if Redis fails)
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`[Database] ${path.basename(filePath)} does not exist, returning defaults`);
            // Return appropriate default based on file type
            if (filePath === CLUB_FILE) return {};
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        if (!data || data.trim() === '') {
            console.log(`[Database] ${path.basename(filePath)} is empty, returning defaults`);
            return filePath === CLUB_FILE ? {} : [];
        }
        const parsedData = JSON.parse(data);
        console.log(`[Database] ✅ Successfully read ${key} from file (${Array.isArray(parsedData) ? parsedData.length : Object.keys(parsedData).length} items)`);
        return parsedData;
    } catch (err) {
        console.error(`[Database] ❌ Failed to read ${path.basename(filePath)} from file:`, err.message);
        return filePath === CLUB_FILE ? {} : [];
    }
};

// Helper to write data (Redis with file fallback)
const writeData = async (filePath, data) => {
    const key = path.basename(filePath, '.json');

    // Try Redis first if available and connected
    if (redis && redisConnected) {
        try {
            await redis.set(key, data);
            console.log(`[Database] ✅ Successfully saved ${key} to Redis (${Array.isArray(data) ? data.length : Object.keys(data).length} items)`);
            return;
        } catch (err) {
            console.error(`[Database] ❌ Failed to write ${key} to Redis:`, err.message);
            console.log(`[Database] Falling back to file storage for ${key}`);
            // Continue to file fallback
        }
    }

    // Fallback to file storage (for local development or if Redis fails)
    try {
        // Ensure data directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Atomic write: write to temp file first, then rename
        const tempPath = filePath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tempPath, filePath);
        console.log(`[Database] ✅ Successfully saved ${key} to file (${Array.isArray(data) ? data.length : Object.keys(data).length} items)`);
    } catch (err) {
        console.error(`[Database] ❌ Failed to write ${key} to file:`, err.message);
        throw err; // Re-throw to allow callers to handle errors
    }
};

// Initialize Admins if not exists
(async () => {
    try {
        // Check if admins exist in Redis
        if (redis && redisConnected) {
            const existingAdmins = await redis.get('admins');
            if (!existingAdmins) {
                const initialAdmin = [{
                    id: '1',
                    username: process.env.SUPER_ADMIN_USERNAME || 'admin',
                    password: process.env.SUPER_ADMIN_PASSWORD || 'password123',
                    role: 'super',
                    imageUrl: ''
                }];
                await redis.set('admins', initialAdmin);
                console.log('[Init] Created initial admin account in Redis');
            }
        } else {
            // Fallback to file storage
            if (!fs.existsSync(ADMINS_FILE)) {
                const initialAdmin = [{
                    id: '1',
                    username: process.env.SUPER_ADMIN_USERNAME || 'admin',
                    password: process.env.SUPER_ADMIN_PASSWORD || 'password123',
                    role: 'super',
                    imageUrl: ''
                }];
                await writeData(ADMINS_FILE, initialAdmin);
                console.log('[Init] Created initial admin account');
            }
        }
    } catch (error) {
        console.warn('[Init] Could not initialize admin data:', error.message);
    }
})();

// Initialize Slider if not exists
(async () => {
    try {
        // Check if slider exists in Redis
        if (redis && redisConnected) {
            const existingSlider = await redis.get('slider');
            if (!existingSlider) {
                const initialSlider = [
                    { id: '1', imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200', active: true },
                    { id: '2', imageUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=1200', active: true }
                ];
                await redis.set('slider', initialSlider);
                console.log('[Init] Created initial slider data in Redis');
            }
        } else {
            // Fallback to file storage
            if (!fs.existsSync(SLIDER_FILE)) {
                const initialSlider = [
                    { id: '1', imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200', active: true },
                    { id: '2', imageUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=1200', active: true }
                ];
                await writeData(SLIDER_FILE, initialSlider);
                console.log('[Init] Created initial slider data');
            }
        }
    } catch (error) {
        console.warn('[Init] Could not initialize slider data:', error.message);
    }
})();

// Initialize Club Settings if not exists
(async () => {
    try {
        // Check if club exists in Redis
        if (redis && redisConnected) {
            const existingClub = await redis.get('club');
            if (!existingClub) {
                const initialClub = {
                    name: 'AMSAL FC',
                    address: '',
                    groundLocation: '',
                    groundSize: '',
                    fieldType: 'Natural Grass',
                    groundImageUrl: ''
                };
                await redis.set('club', initialClub);
                console.log('[Init] Created initial club data in Redis');
            }
        } else {
            // Fallback to file storage
            if (!fs.existsSync(CLUB_FILE)) {
                const initialClub = {
                    name: 'AMSAL FC',
                    address: '',
                    groundLocation: '',
                    groundSize: '',
                    fieldType: 'Natural Grass',
                    groundImageUrl: ''
                };
                await writeData(CLUB_FILE, initialClub);
                console.log('[Init] Created initial club data');
            }
        }
    } catch (error) {
        console.warn('[Init] Could not initialize club data:', error.message);
    }
})();

// --- FILE UPLOAD ROUTES ---

// Upload generic image (handles player, slider, admin, news, etc.)
app.post('/api/upload/:type', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { type } = req.params;
        console.log(`[Upload] Processing ${type} image upload`);

        // Use Vercel Blob only if token is available
        if (process.env.BLOB_READ_WRITE_TOKEN) {
            try {
                console.log(`[Upload] Using Vercel Blob storage`);

                const blob = await put(`${type}-${Date.now()}-${req.file.originalname}`, req.file.buffer, {
                    access: 'public',
                    contentType: req.file.mimetype,
                });

                console.log(`[Upload] ✅ Uploaded to Vercel Blob:`, blob.url);
                res.json({ imageUrl: blob.url });

            } catch (blobError) {
                console.error(`[Upload] ❌ Vercel Blob failed:`, blobError.message);

                // When using memoryStorage, we can't fallback to disk storage easily
                // Return error - user needs to configure BLOB_READ_WRITE_TOKEN properly
                res.status(500).json({
                    error: 'Image upload failed',
                    details: 'Vercel Blob upload failed. Please check BLOB_READ_WRITE_TOKEN environment variable.',
                    blobError: blobError.message
                });
            }

        } else {
            // Local development fallback
            if (req.file && req.file.filename) {
                console.log(`[Upload] Using local disk storage`);
                const localUrl = `/uploads/${req.file.filename}`;
                console.log(`[Upload] ✅ Uploaded to local disk:`, localUrl);
                res.json({ imageUrl: localUrl });
            } else {
                // Fallback to placeholder if no file was saved (shouldn't happen with diskStorage)
                console.log(`[Upload] No storage configured and no local file saved, using placeholder`);
                const placeholderUrl = type === 'slider'
                    ? `https://via.placeholder.com/1200x400?text=${type}+image`
                    : `https://via.placeholder.com/400x300?text=${type}+image`;
                console.log(`[Upload] ✅ Using placeholder:`, placeholderUrl);
                res.json({ imageUrl: placeholderUrl });
            }
        }

    } catch (error) {
        console.error('[Upload] ❌ Upload error:', error);
        res.status(500).json({
            error: 'Failed to upload image',
            details: error.message
        });
    }
});

// Upload admin image
app.post('/api/upload/admin', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`[Upload] Processing admin image upload`);

        // Use Vercel Blob only if token is available
        if (process.env.BLOB_READ_WRITE_TOKEN) {
            try {
                console.log(`[Upload] Using Vercel Blob storage for admin`);

                const blob = await put(`admin-${Date.now()}-${req.file.originalname}`, req.file.buffer, {
                    access: 'public',
                    contentType: req.file.mimetype,
                });

                console.log(`[Upload] ✅ Admin image uploaded to Vercel Blob:`, blob.url);
                res.json({ imageUrl: blob.url });

            } catch (blobError) {
                console.error(`[Upload] ❌ Vercel Blob failed:`, blobError.message);
                // When using memoryStorage, we can't fallback to disk storage
                res.status(500).json({
                    error: 'Image upload failed',
                    details: 'Vercel Blob upload failed. Please check BLOB_READ_WRITE_TOKEN environment variable.',
                    blobError: blobError.message
                });
            }

        } else if (process.env.IMGBB_API_KEY) {
            // Use imgBB for free image storage
            try {
                console.log(`[Upload] Using imgBB storage for admin`);

                // Convert buffer to base64 for imgBB
                const base64Image = req.file.buffer.toString('base64');

                const formData = new FormData();
                formData.append('key', process.env.IMGBB_API_KEY);
                formData.append('image', base64Image);

                const imgbbResponse = await axios.post('https://api.imgbb.com/1/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                if (imgbbResponse.data && imgbbResponse.data.data && imgbbResponse.data.data.url) {
                    const imageUrl = imgbbResponse.data.data.url;
                    console.log(`[Upload] ✅ Uploaded to imgBB:`, imageUrl);
                    res.json({ imageUrl });
                } else {
                    throw new Error('Invalid imgBB response');
                }
            } catch (imgbbError) {
                console.error(`[Upload] ❌ imgBB failed:`, imgbbError.message);
                // Fallback to placeholder
                const placeholderUrl = `https://via.placeholder.com/200x200?text=Admin+Photo+(Upload+Failed)`;
                console.log(`[Upload] Using placeholder fallback:`, placeholderUrl);
                res.json({ imageUrl: placeholderUrl });
            }
        } else {
            // Local development fallback
            if (req.file && req.file.filename) {
                console.log(`[Upload] Using local disk storage`);
                const localUrl = `/uploads/${req.file.filename}`;
                console.log(`[Upload] ✅ Uploaded to local disk:`, localUrl);
                res.json({ imageUrl: localUrl });
            } else {
                // No storage configured - use placeholder
                console.log(`[Upload] No storage configured and no local file saved, using placeholder`);
                const placeholderUrl = `https://via.placeholder.com/200x200?text=No+Storage+Configured`;
                console.log(`[Upload] ✅ Using placeholder:`, placeholderUrl);
                res.json({ imageUrl: placeholderUrl });
            }
        }

    } catch (error) {
        console.error('[Upload] ❌ Admin upload error:', error);
        res.status(500).json({
            error: 'Failed to upload admin image',
            details: error.message
        });
    }
});

// --- CLUB SETTINGS ROUTES ---

// Get club settings
app.get('/api/club', async (req, res) => {
    try {
        const club = await readData(CLUB_FILE);
        res.json(club);
    } catch (error) {
        console.error('Error fetching club settings:', error);
        res.status(500).json({ error: 'Failed to fetch club settings' });
    }
});

// Update club settings
app.put('/api/club', async (req, res) => {
    try {
        const { name, address, groundLocation, groundSize, fieldType, groundImageUrl, stadiumCapacity, nightlight } = req.body;
        const clubData = {
            name: name ? name.trim() : 'AMSAL FC',
            address: address ? address.trim() : '',
            groundLocation: groundLocation ? groundLocation.trim() : '',
            groundSize: groundSize ? groundSize.trim() : '',
            fieldType: fieldType || 'Natural Grass',
            stadiumCapacity: stadiumCapacity || '',
            nightlight: nightlight || 'No',
            groundImageUrl: groundImageUrl || ''
        };
        await writeData(CLUB_FILE, clubData);

        // Real-time emission
        io.emit('club-updated', clubData);

        res.json(clubData);
    } catch (error) {
        console.error('Error updating club settings:', error);
        res.status(500).json({ error: 'Failed to update club settings' });
    }
});

// --- MEMBER ROUTES ---

// Get all members
app.get('/api/members', async (req, res) => {
    try {
        const members = await readData(MEMBERS_FILE);
        // Sort by jersey number if available, then by name
        const sortedMembers = members.sort((a, b) => {
            if (a.jerseyNo && b.jerseyNo) {
                return parseInt(a.jerseyNo) - parseInt(b.jerseyNo);
            }
            if (a.jerseyNo) return -1;
            if (b.jerseyNo) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });
        res.json(sortedMembers);
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// Alias for squad
app.get('/api/squad', async (req, res) => {
    const members = await readData(MEMBERS_FILE);
    res.json(members);
});

// Alias for ground (club data)
app.get('/api/ground', async (req, res) => {
    const club = await readData(CLUB_FILE);
    res.json(club);
});

// Add a new member with enhanced fields
app.post('/api/members', async (req, res) => {
    try {
        const {
            name, memberType, positions, jerseyNo, age, address, height,
            preferredFoot, imageUrl, status, notes
        } = req.body;

        if (!name || !memberType) {
            return res.status(400).json({ error: 'Name and member type are required' });
        }

        if (!positions || !Array.isArray(positions) || positions.length === 0) {
            return res.status(400).json({ error: 'At least one position is required' });
        }

        const members = await readData(MEMBERS_FILE);

        // Check for duplicate jersey numbers (if provided)
        if (jerseyNo) {
            const duplicate = members.find(m => m.jerseyNo === jerseyNo);
            if (duplicate) {
                return res.status(400).json({ error: `Jersey number ${jerseyNo} is already taken by ${duplicate.name}` });
            }
        }

        const newMember = {
            id: Date.now().toString(),
            name: name.trim(),
            memberType: memberType,
            positions: positions,
            jerseyNo: jerseyNo || '',
            age: age || '',
            address: address || '',
            height: height || '',
            preferredFoot: preferredFoot || '',
            imageUrl: imageUrl || 'https://ui-avatars.com/api/?name=Player&background=4F46E5&color=FFFFFF&size=150',
            status: status || 'Active',
            notes: notes || ''
        };

        members.push(newMember);
        await writeData(MEMBERS_FILE, members);

        // Emit real-time update
        io.emit('member-added', newMember);

        res.status(201).json(newMember);
    } catch (error) {
        console.error('Error adding member:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
});

// Update a member
app.put('/api/members/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, memberType, positions, jerseyNo, age, address, height,
            preferredFoot, imageUrl, status, notes
        } = req.body;

        console.log(`[API] Attempting to update member with ID: ${id}`);
        console.log(`[API] Update data received:`, { name, imageUrl, memberType });

        const members = await readData(MEMBERS_FILE);
        const memberIndex = members.findIndex(m => String(m.id) === String(id));

        if (memberIndex === -1) {
            console.log(`[API] Member with ID ${id} not found`);
            return res.status(404).json({ error: 'Member not found' });
        }

        const originalMember = members[memberIndex];
        console.log(`[API] Found member to update:`, originalMember.name);

        // Check for duplicate jersey numbers (if changing jersey number)
        if (jerseyNo !== undefined && jerseyNo !== members[memberIndex].jerseyNo) {
            const duplicate = members.find(m => m.jerseyNo === jerseyNo && String(m.id) !== String(id));
            if (duplicate) {
                return res.status(400).json({ error: `Jersey number ${jerseyNo} is already taken by ${duplicate.name}` });
            }
        }

        // Handle old image cleanup if imageUrl is being changed
        if (imageUrl !== undefined && imageUrl !== originalMember.imageUrl && originalMember.imageUrl) {
            // Handle Vercel Blob URLs
            if (originalMember.imageUrl.includes('vercel-storage.com') && process.env.BLOB_READ_WRITE_TOKEN) {
                try {
                    // For Vercel Blob, we can't easily delete individual files via API
                    // But we can log it for manual cleanup if needed
                    console.log(`[API] Old Vercel Blob image to be cleaned up: ${originalMember.imageUrl}`);
                } catch (blobError) {
                    console.warn(`[API] Note: Old Vercel Blob image may need manual cleanup:`, blobError.message);
                }
            }
            // Handle local files (development only)
            else if (originalMember.imageUrl.startsWith('/uploads/')) {
                try {
                    const oldImagePath = path.join(__dirname, 'public', originalMember.imageUrl);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                        console.log(`[API] Deleted old local image file: ${oldImagePath}`);
                    }
                } catch (imageError) {
                    console.warn(`[API] Failed to delete old local image file:`, imageError.message);
                }
            }
        }

        const updatedMember = {
            ...members[memberIndex],
            name: name ? name.trim() : members[memberIndex].name,
            memberType: memberType !== undefined ? memberType : members[memberIndex].memberType,
            positions: positions ? positions : members[memberIndex].positions,
            jerseyNo: jerseyNo !== undefined ? jerseyNo : members[memberIndex].jerseyNo,
            age: age !== undefined ? age : members[memberIndex].age,
            address: address !== undefined ? address : members[memberIndex].address,
            height: height !== undefined ? height : members[memberIndex].height,
            preferredFoot: preferredFoot !== undefined ? preferredFoot : members[memberIndex].preferredFoot,
            imageUrl: imageUrl !== undefined ? imageUrl : members[memberIndex].imageUrl,
            status: status !== undefined ? status : members[memberIndex].status,
            notes: notes !== undefined ? notes : members[memberIndex].notes
        };

        members[memberIndex] = updatedMember;

        console.log(`[API] Updated member data:`, {
            name: updatedMember.name,
            imageUrl: updatedMember.imageUrl,
            memberType: updatedMember.memberType
        });

        await writeData(MEMBERS_FILE, members);
        console.log(`[API] Successfully updated database`);

        // Emit real-time update
        io.emit('member-updated', updatedMember);
        console.log(`[API] Emitted real-time update`);

        res.json(updatedMember);
    } catch (error) {
        console.error('[API] Error updating member:', error);
        res.status(500).json({
            error: 'Failed to update member',
            details: error.message
        });
    }
});

// Delete a member
app.delete('/api/members/:id', async (req, res) => {
    try {
        console.log(`[API] Attempting to delete member with ID: ${req.params.id}`);

        let members = await readData(MEMBERS_FILE);
        const initialLength = members.length;
        const deletedMember = members.find(m => String(m.id) === String(req.params.id));

        if (!deletedMember) {
            console.log(`[API] Member with ID ${req.params.id} not found`);
            return res.status(404).json({ error: 'Member not found' });
        }

        console.log(`[API] Found member to delete:`, deletedMember.name);

        // Handle image cleanup
        if (deletedMember.imageUrl) {
            // Handle Vercel Blob URLs
            if (deletedMember.imageUrl.includes('vercel-storage.com') && process.env.BLOB_READ_WRITE_TOKEN) {
                try {
                    // For Vercel Blob, we can't easily delete individual files via API
                    // But we can log it for manual cleanup if needed
                    console.log(`[API] Vercel Blob image to be cleaned up: ${deletedMember.imageUrl}`);
                } catch (blobError) {
                    console.warn(`[API] Note: Vercel Blob image may need manual cleanup:`, blobError.message);
                }
            }
            // Handle local files (development only)
            else if (deletedMember.imageUrl.startsWith('/uploads/')) {
                try {
                    const imagePath = path.join(__dirname, 'public', deletedMember.imageUrl);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                        console.log(`[API] Deleted local image file: ${imagePath}`);
                    } else {
                        console.log(`[API] Local image file not found: ${imagePath}`);
                    }
                } catch (imageError) {
                    console.warn(`[API] Failed to delete local image file:`, imageError.message);
                }
            }
        }

        members = members.filter(m => String(m.id) !== String(req.params.id));
        console.log(`[API] Filtered members, new length: ${members.length}`);

        await writeData(MEMBERS_FILE, members);
        console.log(`[API] Successfully updated database`);

        // Emit real-time update
        io.emit('member-deleted', { id: req.params.id });
        console.log(`[API] Emitted real-time update`);

        res.json({
            success: true,
            deletedMember: {
                id: deletedMember.id,
                name: deletedMember.name,
                imageUrl: deletedMember.imageUrl
            }
        });
    } catch (error) {
        console.error('[API] Error deleting member:', error);
        res.status(500).json({
            error: 'Failed to delete member',
            details: error.message
        });
    }
});

// --- NEWS ROUTES ---

// Get all news
app.get('/api/news', async (req, res) => {
    try {
        const news = await readData(NEWS_FILE);
        // Sort by newest first (by date)
        const sortedNews = news.sort((a, b) => {
            const dateA = new Date(a.date || a.dateFormatted || 0);
            const dateB = new Date(b.date || b.dateFormatted || 0);
            return dateB - dateA; // Newest first
        });
        res.json(sortedNews);
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// Post news with publisher info & type
app.post('/api/news', async (req, res) => {
    try {
        const { headline, description, publisher, imageUrl, type } = req.body;
        if (!headline || !description) {
            return res.status(400).json({ error: 'Headline and Description required' });
        }

        const newsList = await readData(NEWS_FILE);
        const now = new Date();
        const newNews = {
            id: Date.now().toString(),
            headline: headline.trim(),
            description: description.trim(),
            publisher: publisher || 'Admin',
            imageUrl: imageUrl || '',
            type: type || 'news', // 'news' or 'notice'
            date: now.toISOString(),
            dateFormatted: now.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
        };

        newsList.push(newNews);
        await writeData(NEWS_FILE, newsList);

        // Real-time emission
        io.emit('new-news', newNews);

        res.status(201).json(newNews);
    } catch (error) {
        console.error('Error posting news:', error);
        res.status(500).json({ error: 'Failed to post news' });
    }
});

// Update news (Edit)
app.put('/api/news/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { headline, description, type, imageUrl } = req.body;

        const newsList = await readData(NEWS_FILE);
        const newsIndex = newsList.findIndex(n => String(n.id) === String(id));

        if (newsIndex === -1) {
            return res.status(404).json({ error: 'News item not found' });
        }

        newsList[newsIndex] = {
            ...newsList[newsIndex],
            headline: headline ? headline.trim() : newsList[newsIndex].headline,
            description: description ? description.trim() : newsList[newsIndex].description,
            type: type || newsList[newsIndex].type,
            imageUrl: imageUrl !== undefined ? imageUrl : newsList[newsIndex].imageUrl
        };

        await writeData(NEWS_FILE, newsList);

        // Emit real-time update
        io.emit('update-news', newsList[newsIndex]);

        res.json(newsList[newsIndex]);
    } catch (error) {
        console.error('Error updating news:', error);
        res.status(500).json({ error: 'Failed to update news' });
    }
});

// Delete news
app.delete('/api/news/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let newsList = await readData(NEWS_FILE);
        const initialLength = newsList.length;

        newsList = newsList.filter(n => String(n.id) !== String(id));

        if (newsList.length === initialLength) {
            return res.status(404).json({ error: 'News item not found' });
        }

        await writeData(NEWS_FILE, newsList);

        // Emit real-time update
        io.emit('news-deleted', { id });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting news:', error);
        res.status(500).json({ error: 'Failed to delete news' });
    }
});

// --- SLIDER ROUTES ---

// Get all slider images
app.get('/api/slider', async (req, res) => {
    try {
        const slides = await readData(SLIDER_FILE);
        // Filter to only active slides
        const activeSlides = slides.filter(s => s.active !== false);
        res.json(activeSlides);
    } catch (error) {
        console.error('Error fetching slider:', error);
        res.status(500).json({ error: 'Failed to fetch slider images' });
    }
});

// Update slider (save all)
app.post('/api/slider', async (req, res) => {
    try {
        const slides = req.body;
        if (!Array.isArray(slides)) {
            return res.status(400).json({ error: 'Slides must be an array' });
        }
        await writeData(SLIDER_FILE, slides);

        // Emit real-time update
        io.emit('slider-updated', slides);

        res.json({ success: true, slides });
    } catch (error) {
        console.error('Error updating slider:', error);
        res.status(500).json({ error: 'Failed to update slider' });
    }
});

// Upload slider image
app.post('/api/upload/slider', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`[Upload] Processing slider image upload`);

        // Use Vercel Blob only if token is available
        if (process.env.BLOB_READ_WRITE_TOKEN) {
            try {
                console.log(`[Upload] Using Vercel Blob storage for slider`);

                const blob = await put(`slider-${Date.now()}-${req.file.originalname}`, req.file.buffer, {
                    access: 'public',
                    contentType: req.file.mimetype,
                });

                console.log(`[Upload] ✅ Slider image uploaded to Vercel Blob:`, blob.url);
                res.json({ imageUrl: blob.url });

            } catch (blobError) {
                console.error(`[Upload] ❌ Vercel Blob failed:`, blobError.message);
                // When using memoryStorage, we can't fallback to disk storage
                res.status(500).json({
                    error: 'Image upload failed',
                    details: 'Vercel Blob upload failed. Please check BLOB_READ_WRITE_TOKEN environment variable.',
                    blobError: blobError.message
                });
            }

        } else {
            // Temporary solution: Return placeholder URL with upload info
            console.log(`[Upload] Using placeholder URL for slider (no storage configured)`);
            const placeholderUrl = `https://via.placeholder.com/1200x400/4F46E5/FFFFFF?text=Slider+Image+(Temporary)`;
            console.log(`[Upload] ✅ Using placeholder:`, placeholderUrl);
            res.json({
                imageUrl: placeholderUrl,
                note: "Using temporary placeholder. Add Vercel Blob token for real image storage."
            });
        }

    } catch (error) {
        console.error('[Upload] ❌ Slider upload error:', error);
        res.status(500).json({
            error: 'Failed to upload slider image',
            details: error.message
        });
    }
});

// --- ADMIN ROUTES ---

// Admin Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const admins = await readData(ADMINS_FILE);
        const admin = admins.find(a =>
            a.username.toLowerCase() === username.toLowerCase().trim() &&
            a.password === password
        );

        if (admin) {
            res.json({
                success: true,
                role: admin.role,
                username: admin.username,
                imageUrl: admin.imageUrl || ''
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// Get Admins
app.get('/api/admins', async (req, res) => {
    try {
        const admins = await readData(ADMINS_FILE);
        // Return admins without passwords for security
        const safeAdmins = admins.map(({ password, ...rest }) => rest);
        // Sort by role (super admins first), then by username
        safeAdmins.sort((a, b) => {
            if (a.role === 'super' && b.role !== 'super') return -1;
            if (a.role !== 'super' && b.role === 'super') return 1;
            return a.username.localeCompare(b.username);
        });
        res.json(safeAdmins);
    } catch (error) {
        console.error('Error fetching admins:', error);
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
});

// Add Admin
app.post('/api/admins', async (req, res) => {
    try {
        const { username, password, imageUrl } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (username.trim().length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }

        if (password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters' });
        }

        const admins = await readData(ADMINS_FILE);
        if (admins.find(a => a.username.toLowerCase() === username.toLowerCase().trim())) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const newAdmin = {
            id: Date.now().toString(),
            username: username.trim(),
            password: password,
            role: 'admin',
            imageUrl: imageUrl || ''
        };
        admins.push(newAdmin);
        await writeData(ADMINS_FILE, admins);

        const { password: _, ...safeAdmin } = newAdmin;
        res.status(201).json(safeAdmin);
    } catch (error) {
        console.error('Error adding admin:', error);
        res.status(500).json({ error: 'Failed to create admin account' });
    }
});

// Update Admin
app.put('/api/admins/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, imageUrl } = req.body;

        const admins = await readData(ADMINS_FILE);
        const adminIndex = admins.findIndex(a => String(a.id) === String(id));

        if (adminIndex === -1) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        // Check for duplicate username if changing username
        if (username && username.trim() !== admins[adminIndex].username) {
            const duplicate = admins.find(a => a.username.toLowerCase() === username.toLowerCase().trim() && String(a.id) !== String(id));
            if (duplicate) {
                return res.status(400).json({ error: 'Username already taken' });
            }
        }

        // Validate password if provided
        if (password && password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters' });
        }

        admins[adminIndex] = {
            ...admins[adminIndex],
            username: username ? username.trim() : admins[adminIndex].username,
            password: password || admins[adminIndex].password,
            imageUrl: imageUrl !== undefined ? imageUrl : admins[adminIndex].imageUrl
        };

        await writeData(ADMINS_FILE, admins);

        const { password: _, ...safeAdmin } = admins[adminIndex];
        res.json(safeAdmin);
    } catch (error) {
        console.error('Error updating admin:', error);
        res.status(500).json({ error: 'Failed to update admin' });
    }
});

// Delete Admin
app.delete('/api/admins/:id', async (req, res) => {
    try {
        let admins = await readData(ADMINS_FILE);
        const adminToDelete = admins.find(a => String(a.id) === String(req.params.id));

        if (!adminToDelete) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        if (adminToDelete.role === 'super') {
            return res.status(403).json({ error: 'Super Admin accounts cannot be deleted!' });
        }

        admins = admins.filter(a => String(a.id) !== String(req.params.id));
        await writeData(ADMINS_FILE, admins);

        // Emit real-time update
        io.emit('admin-deleted', { id: req.params.id });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting admin:', error);
        res.status(500).json({ error: 'Failed to delete admin' });
    }
});

// Start the server
console.log(`[Server] Attempting to start server on port ${PORT}`);

try {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`[Server] ✅ Server successfully started on port ${PORT}`);
        console.log(`[Server] 🚀 AMSAL FC application is running!`);
    });

    // Handle server errors
    server.on('error', (error) => {
        console.error('[Server] ❌ Server error:', error);
        process.exit(1);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('[Server] ❌ Uncaught Exception:', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('[Server] ❌ Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });

} catch (error) {
    console.error('[Server] ❌ Failed to start server:', error);
    process.exit(1);
}

// Export for serverless platforms (Vercel)
if (process.env.VERCEL) {
    module.exports = app;
}