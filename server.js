require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

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
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
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

// Serve index.html as default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper to read JSON
const readData = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            // Return appropriate default based on file type
            if (filePath === CLUB_FILE) return {};
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        if (!data || data.trim() === '') {
            return filePath === CLUB_FILE ? {} : [];
        }
        return JSON.parse(data);
    } catch (err) {
        console.error(`[Database Error] Failed to read ${path.basename(filePath)}:`, err);
        return filePath === CLUB_FILE ? {} : [];
    }
};

// Helper to write JSON with atomic write for data integrity
const writeData = (filePath, data) => {
    try {
        const tempPath = filePath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tempPath, filePath);
        console.log(`[Database] Successfully saved to ${path.basename(filePath)}`);
    } catch (err) {
        console.error(`[Database Error] Failed to write to ${path.basename(filePath)}:`, err);
        throw err; // Re-throw to allow callers to handle errors
    }
};

// Initialize Admins if not exists
if (!fs.existsSync(ADMINS_FILE)) {
    const initialAdmin = [{
        id: '1',
        username: process.env.SUPER_ADMIN_USERNAME || 'admin',
        password: process.env.SUPER_ADMIN_PASSWORD || 'password123',
        role: 'super',
        imageUrl: ''
    }];
    writeData(ADMINS_FILE, initialAdmin);
}

// Initialize Slider if not exists
if (!fs.existsSync(SLIDER_FILE)) {
    const initialSlider = [
        { id: '1', imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200', active: true },
        { id: '2', imageUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=1200', active: true }
    ];
    writeData(SLIDER_FILE, initialSlider);
}

// Initialize Club Settings if not exists
if (!fs.existsSync(CLUB_FILE)) {
    const initialClub = {
        name: 'AMSAL FC',
        address: '',
        groundLocation: '',
        groundSize: '',
        fieldType: 'Natural Grass',
        groundImageUrl: ''
    };
    writeData(CLUB_FILE, initialClub);
}

// --- FILE UPLOAD ROUTES ---

// Upload generic image (handles player, slider, admin, news, etc.)
app.post('/api/upload/:type', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({ imageUrl });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Upload admin image
app.post('/api/upload/admin', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({ imageUrl });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// --- CLUB SETTINGS ROUTES ---

// Get club settings
app.get('/api/club', (req, res) => {
    try {
        const club = readData(CLUB_FILE);
        res.json(club);
    } catch (error) {
        console.error('Error fetching club settings:', error);
        res.status(500).json({ error: 'Failed to fetch club settings' });
    }
});

// Update club settings
app.put('/api/club', (req, res) => {
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
        writeData(CLUB_FILE, clubData);

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
app.get('/api/members', (req, res) => {
    try {
        const members = readData(MEMBERS_FILE);
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
app.get('/api/squad', (req, res) => {
    const members = readData(MEMBERS_FILE);
    res.json(members);
});

// Alias for ground (club data)
app.get('/api/ground', (req, res) => {
    const club = readData(CLUB_FILE);
    res.json(club);
});

// Add a new member with enhanced fields
app.post('/api/members', (req, res) => {
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

        const members = readData(MEMBERS_FILE);

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
            imageUrl: imageUrl || 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?q=80&w=800',
            status: status || 'Active',
            notes: notes || ''
        };

        members.push(newMember);
        writeData(MEMBERS_FILE, members);
        
        // Emit real-time update
        io.emit('member-added', newMember);
        
        res.status(201).json(newMember);
    } catch (error) {
        console.error('Error adding member:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
});

// Update a member
app.put('/api/members/:id', (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, memberType, positions, jerseyNo, age, address, height,
            preferredFoot, imageUrl, status, notes
        } = req.body;

        const members = readData(MEMBERS_FILE);
        const memberIndex = members.findIndex(m => String(m.id) === String(id));

        if (memberIndex === -1) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Check for duplicate jersey numbers (if changing jersey number)
        if (jerseyNo !== undefined && jerseyNo !== members[memberIndex].jerseyNo) {
            const duplicate = members.find(m => m.jerseyNo === jerseyNo && String(m.id) !== String(id));
            if (duplicate) {
                return res.status(400).json({ error: `Jersey number ${jerseyNo} is already taken by ${duplicate.name}` });
            }
        }

        members[memberIndex] = {
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

        writeData(MEMBERS_FILE, members);
        
        // Emit real-time update
        io.emit('member-updated', members[memberIndex]);
        
        res.json(members[memberIndex]);
    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({ error: 'Failed to update member' });
    }
});

// Delete a member
app.delete('/api/members/:id', (req, res) => {
    try {
        const { id } = req.params;
        let members = readData(MEMBERS_FILE);
        const initialLength = members.length;
        const deletedMember = members.find(m => String(m.id) === String(id));

        members = members.filter(m => String(m.id) !== String(id));

        if (members.length === initialLength) {
            return res.status(404).json({ error: 'Member not found' });
        }

        writeData(MEMBERS_FILE, members);
        
        // Emit real-time update
        io.emit('member-deleted', { id });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting member:', error);
        res.status(500).json({ error: 'Failed to delete member' });
    }
});

// --- NEWS ROUTES ---

// Get all news
app.get('/api/news', (req, res) => {
    try {
        const news = readData(NEWS_FILE);
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
app.post('/api/news', (req, res) => {
    try {
        const { headline, description, publisher, imageUrl, type } = req.body;
        if (!headline || !description) {
            return res.status(400).json({ error: 'Headline and Description required' });
        }

        const newsList = readData(NEWS_FILE);
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
        writeData(NEWS_FILE, newsList);

        // Real-time emission
        io.emit('new-news', newNews);

        res.status(201).json(newNews);
    } catch (error) {
        console.error('Error posting news:', error);
        res.status(500).json({ error: 'Failed to post news' });
    }
});

// Update news (Edit)
app.put('/api/news/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { headline, description, type, imageUrl } = req.body;

        const newsList = readData(NEWS_FILE);
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

        writeData(NEWS_FILE, newsList);

        // Emit real-time update
        io.emit('update-news', newsList[newsIndex]);

        res.json(newsList[newsIndex]);
    } catch (error) {
        console.error('Error updating news:', error);
        res.status(500).json({ error: 'Failed to update news' });
    }
});

// Delete news
app.delete('/api/news/:id', (req, res) => {
    try {
        const { id } = req.params;
        let newsList = readData(NEWS_FILE);
        const initialLength = newsList.length;

        newsList = newsList.filter(n => String(n.id) !== String(id));

        if (newsList.length === initialLength) {
            return res.status(404).json({ error: 'News item not found' });
        }

        writeData(NEWS_FILE, newsList);
        
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
app.get('/api/slider', (req, res) => {
    try {
        const slides = readData(SLIDER_FILE);
        // Filter to only active slides
        const activeSlides = slides.filter(s => s.active !== false);
        res.json(activeSlides);
    } catch (error) {
        console.error('Error fetching slider:', error);
        res.status(500).json({ error: 'Failed to fetch slider images' });
    }
});

// Update slider (save all)
app.post('/api/slider', (req, res) => {
    try {
        const slides = req.body;
        if (!Array.isArray(slides)) {
            return res.status(400).json({ error: 'Slides must be an array' });
        }
        writeData(SLIDER_FILE, slides);
        
        // Emit real-time update
        io.emit('slider-updated', slides);
        
        res.json({ success: true, slides });
    } catch (error) {
        console.error('Error updating slider:', error);
        res.status(500).json({ error: 'Failed to update slider' });
    }
});

// Upload slider image
app.post('/api/upload/slider', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({ imageUrl });
    } catch (error) {
        console.error('Slider upload error:', error);
        res.status(500).json({ error: 'Failed to upload slider image' });
    }
});

// --- ADMIN ROUTES ---

// Admin Login
app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const admins = readData(ADMINS_FILE);
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
app.get('/api/admins', (req, res) => {
    try {
        const admins = readData(ADMINS_FILE);
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
app.post('/api/admins', (req, res) => {
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

        const admins = readData(ADMINS_FILE);
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
        writeData(ADMINS_FILE, admins);

        const { password: _, ...safeAdmin } = newAdmin;
        res.status(201).json(safeAdmin);
    } catch (error) {
        console.error('Error adding admin:', error);
        res.status(500).json({ error: 'Failed to create admin account' });
    }
});

// Update Admin
app.put('/api/admins/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, imageUrl } = req.body;

        const admins = readData(ADMINS_FILE);
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

        writeData(ADMINS_FILE, admins);

        const { password: _, ...safeAdmin } = admins[adminIndex];
        res.json(safeAdmin);
    } catch (error) {
        console.error('Error updating admin:', error);
        res.status(500).json({ error: 'Failed to update admin' });
    }
});

// Delete Admin
app.delete('/api/admins/:id', (req, res) => {
    try {
        let admins = readData(ADMINS_FILE);
        const adminToDelete = admins.find(a => String(a.id) === String(req.params.id));

        if (!adminToDelete) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        if (adminToDelete.role === 'super') {
            return res.status(403).json({ error: 'Super Admin accounts cannot be deleted!' });
        }

        admins = admins.filter(a => String(a.id) !== String(req.params.id));
        writeData(ADMINS_FILE, admins);
        
        // Emit real-time update
        io.emit('admin-deleted', { id: req.params.id });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting admin:', error);
        res.status(500).json({ error: 'Failed to delete admin' });
    }
});

// For Vercel deployment
if (process.env.NODE_ENV === 'production') {
    // Export for Vercel serverless functions
    module.exports = app;
} else {
    // Local development
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}