// Static version of client.js for Netlify deployment
// Uses embedded data instead of API calls

// Static data embedded in the client
const staticData = {
    members: [
        {
            id: "1",
            name: "John Doe",
            position: "Coach",
            status: "Active",
            imageUrl: "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?q=80&w=800"
        },
        {
            id: "2", 
            name: "Jane Smith",
            position: "Manager",
            status: "Active",
            imageUrl: "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?q=80&w=800"
        }
    ],
    news: [
        {
            id: "1",
            headline: "Welcome to AMSAL FC",
            description: "Exciting news about our football club launch.",
            publisher: "Admin",
            date: new Date().toISOString(),
            type: "news"
        }
    ],
    club: {
        name: "AMSAL FC",
        address: "Amsal, Nepal",
        groundLocation: "Amsal Sports Complex",
        stadiumCapacity: "5000"
    }
};

// Mock fetch functions for static data
async function fetchMembers() {
    return new Promise(resolve => {
        setTimeout(() => resolve(staticData.members), 100);
    });
}

async function fetchNews() {
    return new Promise(resolve => {
        setTimeout(() => resolve(staticData.news), 100);
    });
}

async function fetchClub() {
    return new Promise(resolve => {
        setTimeout(() => resolve(staticData.club), 100);
    });
}

// Simplified versions of the original functions
async function loadMembers() {
    try {
        const members = await fetchMembers();
        renderMembers(members);
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

async function loadNews() {
    try {
        const news = await fetchNews();
        renderNews(news);
    } catch (error) {
        console.error('Error loading news:', error);
    }
}

async function loadClubInfo() {
    try {
        const club = await fetchClub();
        updateClubDisplay(club);
    } catch (error) {
        console.error('Error loading club info:', error);
    }
}

function renderMembers(members) {
    const squadGrid = document.getElementById('squad-grid');
    const staffGrid = document.getElementById('staff-grid');
    
    if (squadGrid && staffGrid) {
        const categorized = categorizePlayersByPosition(members);
        
        // Render staff
        staffGrid.innerHTML = categorized.staff.map(m => `
            <div class="staff-card-simple">
                <img src="${m.imageUrl}" alt="${m.name}" class="staff-avatar-sm" onerror="this.src='https://images.unsplash.com/photo-1553778263-73a83bab9b0c?q=80&w=800'">
                <div class="staff-info-detailed">
                    <h4>${m.name}</h4>
                    <p class="staff-position">${m.position}</p>
                    ${m.status && m.status !== 'Active' ? `<span class="staff-status ${m.status.toLowerCase()}">${m.status}</span>` : ''}
                </div>
            </div>
        `).join('');
    }
}

function renderNews(news) {
    const newsGrid = document.getElementById('news-grid');
    if (newsGrid) {
        newsGrid.innerHTML = news.map(n => `
            <article class="news-card">
                <div class="news-image">
                    <span class="news-tag">${n.type === 'notice' ? 'NOTICE' : 'CLUB NEWS'}</span>
                    <img src="${n.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800'}" 
                         alt="${n.headline}" 
                         onerror="this.src='https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800'">
                </div>
                <div class="news-content">
                    <h3>${n.headline}</h3>
                    <p>${n.description.substring(0, 100)}...</p>
                    <div class="news-meta">
                        <div>
                            <time>Just now</time>
                        </div>
                        <span class="news-read-more">Read More →</span>
                    </div>
                </div>
            </article>
        `).join('');
    }
}

function updateClubDisplay(club) {
    // Update ground info elements
    const elements = {
        'ground-location': club.groundLocation,
        'ground-size': 'Standard Size',
        'ground-type': 'Natural Grass',
        'club-address': club.address,
        'ground-capacity': `${club.stadiumCapacity} PAX`,
        'ground-light': 'Available'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || 'Not set';
    });
}

function categorizePlayersByPosition(members) {
    const categories = {
        goalkeepers: [],
        defenders: [],
        midfielders: [],
        forwards: [],
        staff: []
    };

    members.forEach(member => {
        const pos = (member.position || '').toUpperCase();
        
        if (pos === 'GK') {
            categories.goalkeepers.push(member);
        } else if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'SW'].includes(pos)) {
            categories.defenders.push(member);
        } else if (['CDM', 'CM', 'CAM', 'LM', 'RM', 'AMF'].includes(pos)) {
            categories.midfielders.push(member);
        } else if (['ST', 'CF', 'LF', 'RF', 'LW', 'RW'].includes(pos)) {
            categories.forwards.push(member);
        } else {
            categories.staff.push(member);
        }
    });

    return categories;
}

// Initialize the static version
document.addEventListener('DOMContentLoaded', () => {
    console.log('AMSAL FC Static Version Loaded');
    
    // Load static data
    loadMembers();
    loadNews();
    loadClubInfo();
    
    // Initialize other features that don't require API
    initHeroSlider();
    initMobileMenu();
    initThemeToggle();
    initSmoothScrolling();
});
