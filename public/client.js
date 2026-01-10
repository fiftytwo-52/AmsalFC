/**
 * AMSAL FC - Enhanced Client-Side JavaScript
 * Handles all frontend interactions, real-time updates, image uploads, and UI management
 */

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Show toast notification
 */
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Choose icon based on type
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `
        <i class="fas ${icon} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Show custom confirmation modal
 */
function showConfirm(title, message, onConfirm, proceedText = 'Yes, Delete') {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const cancelBtn = document.getElementById('confirm-cancel');
    const proceedBtn = document.getElementById('confirm-proceed');

    if (!modal) return;

    titleEl.textContent = title || 'Are you sure?';
    messageEl.textContent = message || 'This action is permanent and cannot be undone.';
    proceedBtn.textContent = proceedText;

    modal.classList.add('active');

    const handleCancel = () => {
        modal.classList.remove('active');
        cleanup();
    };

    const handleProceed = () => {
        modal.classList.remove('active');
        onConfirm();
        cleanup();
    };

    const cleanup = () => {
        cancelBtn.removeEventListener('click', handleCancel);
        proceedBtn.removeEventListener('click', handleProceed);
    };

    cancelBtn.addEventListener('click', handleCancel);
    proceedBtn.addEventListener('click', handleProceed);
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();

    // Get date parts for comparison (ignoring time)
    const dateYear = date.getFullYear();
    const dateMonth = date.getMonth();
    const dateDay = date.getDate();

    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const nowDay = now.getDate();

    // Calculate day difference
    const dateObj = new Date(dateYear, dateMonth, dateDay);
    const nowObj = new Date(nowYear, nowMonth, nowDay);
    const diffTime = nowObj - dateObj;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays === -1) return 'Tomorrow'; // Future dates
    if (diffDays < 7 && diffDays > 0) return `${diffDays} days ago`;
    if (diffDays > -7 && diffDays < 0) return `In ${Math.abs(diffDays)} days`; // Future dates

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Upload image file
 */
async function uploadImage(file, type = 'player') {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const res = await fetch(`/api/upload/${type}`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error('Upload failed');

        const data = await res.json();
        return data.imageUrl;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

/**
 * Convert height from cm to feet'inches
 * @param {number|string} cm - Height in cm
 * @returns {string} Height in ft'in format
 */
function convertCmToFeetInches(cm) {
    if (!cm || cm === '') return '';

    const totalInches = Math.round(cm / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;

    if (inches === 0) {
        return `${feet}'0"`;
    }
    return `${feet}'${inches}"`;
}

/**
 * Update height display in real-time
 */
function updateHeightDisplay() {
    const heightInput = document.getElementById('m-height');
    const heightDisplay = document.getElementById('height-display');

    if (heightInput && heightDisplay) {
        const cm = heightInput.value;
        if (cm && cm >= 0 && cm <= 300) {
            heightDisplay.textContent = convertCmToFeetInches(cm);
        } else {
            heightDisplay.textContent = '';
        }
    }
}

/**
 * Categorize players by position
 */
function categorizePlayersByPosition(members) {
    const categories = {
        goalkeepers: [],
        defenders: [],
        midfielders: [],
        forwards: [],
        staff: []
    };

    members.forEach(member => {
        // Skip unpublished members for public view
        if (member.status === 'Unpublished') return;

        // Use memberType if available, otherwise infer from positions
        const memberType = member.memberType || (Array.isArray(member.positions) && member.positions.length > 0
            ? (['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'SW', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'AMF', 'ST', 'CF', 'LF', 'RF', 'LW', 'RW'].includes(member.positions[0].toUpperCase()) ? 'Player' : 'Staff')
            : (member.position && ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'SW', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'AMF', 'ST', 'CF', 'LF', 'RF', 'LW', 'RW'].includes(member.position.toUpperCase()) ? 'Player' : 'Staff'));

        // If staff, add to staff category
        if (memberType === 'Staff') {
            categories.staff.push(member);
            return;
        }

        // Handle both old single position format and new multiple positions format
        const positions = Array.isArray(member.positions) ? member.positions : (member.position ? [member.position] : []);
        const primaryPosition = positions.length > 0 ? positions[0].toUpperCase() : '';

        // Categorize players based on primary position
        if (primaryPosition === 'GK') {
            categories.goalkeepers.push(member);
        } else if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'SW'].includes(primaryPosition)) {
            categories.defenders.push(member);
        } else if (['CDM', 'CM', 'CAM', 'LM', 'RM', 'AMF', 'LW', 'RW'].includes(primaryPosition)) {
            categories.midfielders.push(member);
        } else if (['ST', 'CF', 'LF', 'RF'].includes(primaryPosition)) {
            categories.forwards.push(member);
        } else {
            // If position doesn't match any category, put in staff
            categories.staff.push(member);
        }
    });

    return categories;
}

// ============================================
// MAIN APPLICATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const newsGrid = document.getElementById('news-grid');
    const squadGrid = document.getElementById('squad-grid');
    const staffGrid = document.getElementById('staff-grid');
    const adminMemberList = document.getElementById('admin-member-list');
    const navbar = document.getElementById('navbar');

    // ============================================
    // NAVBAR SCROLL EFFECT
    // ============================================

    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // ============================================
    // CLOCK
    // ============================================

    function updateClock() {
        const clockTime = document.getElementById('clock-time');
        const clockDate = document.getElementById('clock-date');

        if (!clockTime) return;

        const now = new Date();

        // Time
        const timeString = now.toLocaleTimeString('en-US', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        clockTime.textContent = timeString;

        // Date (e.g., Saturday, 10 Jan 2026)
        if (clockDate) {
            const dateString = now.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            clockDate.textContent = dateString;
        }
    }

    // Update every second immediately
    setInterval(updateClock, 1000);
    updateClock();

    // ============================================
    // HERO SLIDER (DYNAMIC)
    // ============================================

    async function initHeroSlider() {
        const sliderContainer = document.getElementById('hero-slider');
        if (!sliderContainer) return;

        try {
            const res = await fetch('/api/slider');
            const slidesData = await res.json();
            const activeSlides = slidesData.filter(s => s.active);

            if (activeSlides.length === 0) {
                sliderContainer.innerHTML = '<div class="slide active" style="background-image: url(\'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200\')"></div>';
                return;
            }

            sliderContainer.innerHTML = activeSlides.map((slide, index) => `
                <div class="slide ${index === 0 ? 'active' : ''}" style="background-image: url('${slide.imageUrl}')"></div>
            `).join('');

            const htmlSlides = sliderContainer.querySelectorAll('.slide');
            if (htmlSlides.length > 1) {
                let currentSlide = 0;
                setInterval(() => {
                    htmlSlides[currentSlide].classList.remove('active');
                    currentSlide = (currentSlide + 1) % htmlSlides.length;
                    htmlSlides[currentSlide].classList.add('active');
                }, 5000);
            }
        } catch (error) {
            console.error('Error initializing slider:', error);
        }
    }
    initHeroSlider();

    // ============================================
    // MOBILE MENU TOGGLE
    // ============================================

    const mobileMenuBtn = document.getElementById('mobile-menu');
    const navLinks = document.getElementById('nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }

    // ============================================
    // THEME TOGGLE
    // ============================================
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;

    // Check local storage
    let userTheme = localStorage.getItem('theme');
    if (userTheme === 'dark') {
        html.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        html.setAttribute('data-theme', 'light');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = html.getAttribute('data-theme') === 'dark';
            html.setAttribute('data-theme', isDark ? 'light' : 'dark');
            localStorage.setItem('theme', isDark ? 'light' : 'dark');
            themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        });
    }

    // ============================================
    // SMOOTH SCROLLING
    // ============================================

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '#!') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offsetTop = target.offsetTop - 80; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ============================================
    // GROUND INFO LOADING
    // ============================================

    async function loadGroundInfo() {
        try {
            const res = await fetch('/api/club');
            const club = await res.json();

            // Update ground info elements
            const groundLocation = document.getElementById('ground-location');
            const groundSize = document.getElementById('ground-size');
            const groundType = document.getElementById('ground-type');
            const clubAddress = document.getElementById('club-address');

            // New ground fields
            const groundCapacity = document.getElementById('ground-capacity');
            const groundLight = document.getElementById('ground-light');

            if (groundLocation) groundLocation.textContent = club.groundLocation || 'Not set';
            if (groundSize) groundSize.textContent = club.groundSize || 'Not set';
            if (groundType) groundType.textContent = club.fieldType || 'Not set';
            if (clubAddress) clubAddress.textContent = club.address || 'Not set';

            if (groundCapacity) groundCapacity.textContent = club.stadiumCapacity ? `${club.stadiumCapacity} PAX` : 'Not set';
            if (groundLight) groundLight.textContent = club.nightlight || 'No';

            // Add ground image if available
            const groundSection = document.getElementById('ground');
            if (groundSection && club.groundImageUrl) {
                groundSection.style.backgroundImage = `linear-gradient(rgba(10, 25, 41, 0.8), rgba(10, 25, 41, 0.8)), url(${club.groundImageUrl})`;
                groundSection.style.backgroundSize = 'cover';
                groundSection.style.backgroundPosition = 'center';
                groundSection.style.backgroundAttachment = 'fixed';
            }

            // Update specific ground display image
            const groundDisplayImage = document.getElementById('ground-display-image');
            if (groundDisplayImage) {
                if (club.groundImageUrl) {
                    groundDisplayImage.src = club.groundImageUrl;
                    groundDisplayImage.style.display = 'block';
                } else {
                    groundDisplayImage.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error loading ground info:', error);
            // Set default values on error
            const fields = ['ground-location', 'ground-size', 'ground-type', 'club-address', 'ground-capacity', 'ground-light'];
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = 'Not available';
            });
        }
    }

    // ============================================
    // DATA FETCHING FUNCTIONS
    // ============================================

    /**
     * Fetch and display members with enhanced info and categorization
     */
    async function fetchMembers() {
        try {
            const res = await fetch('/api/members');
            const members = await res.json();

            // Update stats if on admin page
            const statMembers = document.getElementById('stat-members');
            if (statMembers) {
                statMembers.textContent = members.length;
            }

            // Render for Public Page with categorization and Font Awesome icons
            if (squadGrid) {
                if (members.length === 0) {
                    squadGrid.innerHTML = `
                        <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                            <p style="font-size: 1.2rem; color: var(--neutral-600);">No team members yet. Check back soon!</p>
                        </div>
                    `;
                } else {
                    const categorized = categorizePlayersByPosition(members);
                    // Helper function to render categories with limit
                    const renderCategory = (title, icon, members, categoryId) => {
                        // Responsive Limit: 4 for desktop (1 row of 4), 1 for mobile (1 row of 1)
                        // User requested "one row of cards... just one line"
                        const limit = window.innerWidth < 768 ? 1 : 4;

                        if (members.length === 0) return '';

                        // Error handler for images to force default avatar on failure
                        const imgError = "this.onerror=null; this.parentNode.innerHTML='<span class=\"default-avatar\"><i class=\"fas fa-user-circle\"></i></span>'";

                        let html = `
                            <div class="position-category">
                                <div class="category-header">
                                    <span class="category-icon">${icon}</span>
                                    <h3 class="category-title">${title}</h3>
                                    <span class="category-count">${members.length}</span>
                                </div>
                            </div>
                        `;

                        // Render all members, but hide the ones exceeding the limit
                        html += members.map((m, index) => {
                            const isHidden = index >= limit;
                            const hiddenClass = isHidden ? `hidden-card-${categoryId}` : '';
                            const style = isHidden ? 'display: none;' : '';

                            let cardHtml = renderPlayerCard(m);
                            if (isHidden) {
                                cardHtml = cardHtml.replace('class="squad-card', `style="display: none;" class="squad-card hidden-card-${categoryId}`);
                            }
                            return cardHtml;
                        }).join('');

                        // Add Button if needed
                        if (members.length > limit) {
                            html += `
                                <div style="grid-column: 1/-1; text-align: center; margin-top: 1rem; margin-bottom: 2rem; width: 100%;">
                                    <button onclick="toggleCategory('${categoryId}', ${members.length})" id="btn-${categoryId}" class="btn btn-secondary" style="font-size: 0.9rem; padding: 0.5rem 1.5rem; border-radius: 20px;">
                                        View All ${title} <i class="fas fa-chevron-down" style="margin-left: 5px;"></i>
                                    </button>
                                </div>
                            `;
                        }

                        return html;
                    };

                    // Global toggle function
                    window.toggleCategory = (id, total) => {
                        const hiddenCards = document.querySelectorAll(`.hidden-card-${id}`);
                        const btn = document.getElementById(`btn-${id}`);

                        if (hiddenCards.length === 0) return;
                        const isHidden = hiddenCards[0].style.display === 'none';

                        hiddenCards.forEach(card => {
                            card.style.display = isHidden ? '' : 'none'; // Empty string reverts to default CSS (block/flex)
                        });

                        if (isHidden) {
                            btn.innerHTML = `Show Less <i class="fas fa-chevron-up" style="margin-left: 5px;"></i>`;
                        } else {
                            btn.innerHTML = `View All <i class="fas fa-chevron-down" style="margin-left: 5px;"></i>`;
                        }
                    };

                    let html = '';
                    html += renderCategory('Goalkeepers', '🥅', categorized.goalkeepers, 'gk');
                    html += renderCategory('Defenders', '🛡️', categorized.defenders, 'def');
                    html += renderCategory('Midfielders', '⚽', categorized.midfielders, 'mid');
                    html += renderCategory('Forwards', '🎯', categorized.forwards, 'fwd');

                    // Staff Section
                    if (staffGrid) {
                        const staffLimit = window.innerWidth < 768 ? 2 : 8;
                        if (categorized.staff.length > 0) {
                            const imgError = "this.onerror=null; this.parentNode.innerHTML='<span class=\"default-avatar\"><i class=\"fas fa-user-circle\"></i></span>'";

                            let staffHtml = categorized.staff.map((m, index) => {
                                const positions = Array.isArray(m.positions) ? m.positions : (m.position ? [m.position] : []);
                                const positionDisplay = positions.length > 0 ? positions.join(' / ') : '';
                                const isHidden = index >= staffLimit;
                                const style = isHidden ? 'display: none;' : '';
                                const hiddenClass = isHidden ? 'hidden-card-staff' : '';

                                return `
                                     <div class="staff-card-compact ${hiddenClass}" style="${style}">
                                         <div class="staff-compact-image">
                                             ${m.imageUrl ? `<img src="${m.imageUrl}" alt="${m.name}" onerror="${imgError}">` : `<span class='default-avatar'><i class='fas fa-user-circle'></i></span>`}
                                         </div>
                                         <div class="staff-compact-info">
                                             <h4>${m.name}</h4>
                                             <p class="staff-compact-role">${positionDisplay}</p>
                                             ${m.notes ? `<p class="staff-compact-note">${m.notes}</p>` : ''}
                                         </div>
                                     </div>
                                 `;
                            }).join('');

                            if (categorized.staff.length > staffLimit) {
                                // Button for staff
                                staffHtml += `
                                    <div style="grid-column: 1/-1; text-align: center; margin-top: 1rem; width: 100%;">
                                        <button onclick="toggleCategory('staff')" id="btn-staff" class="btn btn-secondary" style="font-size: 0.9rem; padding: 0.5rem 1.5rem; border-radius: 20px;">
                                            View All Staff <i class="fas fa-chevron-down" style="margin-left: 5px;"></i>
                                        </button>
                                    </div>
                                  `;
                            }
                            staffGrid.innerHTML = staffHtml;
                        } else {
                            staffGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">No staff members listed.</p>';
                        }
                    }

                    squadGrid.innerHTML = html;
                }
            }

            // Render for Admin Page
            if (adminMemberList) {
                if (members.length === 0) {
                    adminMemberList.innerHTML = `
                        <div class="list-item">
                            <p style="color: var(--neutral-600); text-align: center; width: 100%;">No team members yet</p>
                        </div>
                    `;
                } else {
                    adminMemberList.innerHTML = members.map(m => {
                        // Handle both old single position format and new multiple positions format
                        const positions = Array.isArray(m.positions) ? m.positions : (m.position ? [m.position] : []);
                        const positionDisplay = positions.length > 0 ? positions.join(' / ') : '';

                        return `
                        <div class="list-item" id="member-item-${m.id}">
                            <div class="item-info">
                                ${m.imageUrl ? `<img src="${m.imageUrl}" alt="${m.name}" class="item-avatar">` : `<span class='default-avatar item-avatar'><i class='fas fa-user-circle'></i></span>`}
                                <div class="item-details">
                                    <h5>${m.name} ${m.jerseyNo ? `#${m.jerseyNo}` : ''}</h5>
                                    <p>${positionDisplay}${m.age ? ` • ${m.age} yrs` : ''}</p>
                                </div>
                            </div>
                            <div class="item-actions">
                                <button onclick="editMemberInForm('${m.id}')" class="btn-icon" title="Edit in Section">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteMember('${m.id}')" class="btn-icon btn-danger" title="Remove">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    }).join('');
                }
            }
        } catch (error) {
            console.error('Error fetching members:', error);
            showToast('Error', 'Failed to load team members', 'error');
        }
    }

    /**
     * Global edit handler that takes admin to the Squad Management Section
     */
    window.editMemberInForm = async (id) => {
        try {
            const res = await fetch('/api/members');
            const members = await res.json();
            const m = members.find(item => String(item.id) === String(id));
            if (!m) return;

            // Scroll to the Squad Management Section
            const section = document.querySelector('#admin-member-list').closest('.dashboard-card');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
                section.style.outline = '3px solid var(--primary-500)';
                section.style.transition = 'outline 0.3s ease';
                setTimeout(() => section.style.outline = 'none', 2000);
            }

            // Populate the ADD form but change its role to EDIT
            document.getElementById('m-name').value = m.name || '';

            // Set member type
            const memberTypeSelect = document.getElementById('m-member-type');
            if (memberTypeSelect) {
                // Use memberType if available, otherwise infer from positions
                const memberType = m.memberType || (Array.isArray(m.positions) && m.positions.length > 0
                    ? (['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'SW', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'AMF', 'ST', 'CF', 'LF', 'RF', 'LW', 'RW'].includes(m.positions[0].toUpperCase()) ? 'Player' : 'Staff')
                    : (m.position && ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'SW', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'AMF', 'ST', 'CF', 'LF', 'RF', 'LW', 'RW'].includes(m.position.toUpperCase()) ? 'Player' : 'Staff'));
                memberTypeSelect.value = memberType || 'Player';
            }

            // Handle both old single position format and new multiple positions format for editing
            const positions = Array.isArray(m.positions) ? m.positions : (m.position ? [m.position] : []);

            // Uncheck all position checkboxes first
            document.querySelectorAll('input[name="m-position"]').forEach(checkbox => {
                checkbox.checked = false;
            });

            // Check the appropriate position checkboxes
            positions.forEach(position => {
                const checkbox = document.querySelector(`input[name="m-position"][value="${position}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });

            document.getElementById('m-jersey').value = m.jerseyNo || '';
            document.getElementById('m-age').value = m.age || '';
            document.getElementById('m-address').value = m.address || '';
            document.getElementById('m-height').value = m.height || '';
            document.getElementById('m-foot').value = m.preferredFoot || '';
            document.getElementById('m-status').value = m.status || 'Active';
            document.getElementById('m-notes').value = m.notes || '';
            document.getElementById('m-image-url').value = m.imageUrl || '';

            // Trigger field visibility update (call the toggleFields function)
            toggleFields();

            // Update height display
            updateHeightDisplay();

            // Change button text and add hidden ID for update logic
            const submitBtn = document.querySelector('#add-member-form button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Member Details';
            submitBtn.classList.add('accent');

            // Reset remove image checkbox
            const removeImageGroup = document.getElementById('m-remove-image-group');
            const removeImageCheckbox = document.getElementById('m-remove-image');
            if (removeImageGroup && removeImageCheckbox) {
                removeImageGroup.style.display = 'block';
                removeImageCheckbox.checked = false;
            }

            // Add integrated Delete button to form if in edit mode
            let formActions = document.getElementById('form-edit-actions');
            if (!formActions) {
                formActions = document.createElement('div');
                formActions.id = 'form-edit-actions';
                formActions.style.display = 'flex';
                formActions.style.gap = '1rem';
                formActions.style.marginTop = '1rem';

                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'form-submit';
                delBtn.style.background = 'var(--error-600)';
                delBtn.style.margin = '0';
                delBtn.innerHTML = '<i class="fas fa-trash"></i> Wipe Member';
                delBtn.onclick = () => deleteMember(m.id);

                submitBtn.parentNode.insertBefore(formActions, submitBtn.nextSibling);
                formActions.appendChild(submitBtn); // Move submit inside
                formActions.appendChild(delBtn);
            }

            // Add hidden ID field if not exists
            let idField = document.getElementById('m-edit-id');
            if (!idField) {
                idField = document.createElement('input');
                idField.type = 'hidden';
                idField.id = 'm-edit-id';
                document.getElementById('add-member-form').appendChild(idField);
            }
            idField.value = m.id;

            showToast('Mode: Edit', `Now editing: ${m.name}`, 'info');

        } catch (e) {
            console.error('Error loading member into form:', e);
        }
    };

    /**
     * Open player detail modal with ID card style
     */
    window.openPlayerModal = async (playerId) => {
        try {
            const res = await fetch('/api/members');
            const members = await res.json();
            const player = members.find(m => String(m.id) === String(playerId));

            if (!player) {
                showToast('Error', 'Player not found', 'error');
                return;
            }

            // Use memberType if available, otherwise infer from positions
            const memberType = player.memberType || (Array.isArray(player.positions) && player.positions.length > 0
                ? (['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'SW', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'AMF', 'ST', 'CF', 'LF', 'RF', 'LW', 'RW'].includes(player.positions[0].toUpperCase()) ? 'Player' : 'Staff')
                : (player.position && ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'SW', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'AMF', 'ST', 'CF', 'LF', 'RF', 'LW', 'RW'].includes(player.position.toUpperCase()) ? 'Player' : 'Staff'));
            const isStaff = memberType === 'Staff';

            // Handle both old single position format and new multiple positions format
            const positions = Array.isArray(player.positions) ? player.positions : (player.position ? [player.position] : []);
            const positionDisplay = positions.length > 0 ? positions.join(' / ') : '';

            // Helper function to format preferred foot
            const formatFoot = (foot) => {
                if (!foot) return '';
                if (foot.toLowerCase() === 'right') return 'R';
                if (foot.toLowerCase() === 'left') return 'L';
                if (foot.toLowerCase() === 'both') return 'Both';
                return foot;
            };

            const playerModalBody = document.getElementById('player-modal-body');
            if (playerModalBody) {
                playerModalBody.innerHTML = `
                    <div class="player-profile-card">
                        <!-- Profile Header -->
                        <div class="profile-header">
                            <div class="profile-avatar">
                                ${player.imageUrl ? `<img src="${player.imageUrl}" alt="${player.name}">` : `<span class='default-avatar'><i class='fas fa-user-circle'></i></span>`}
                                ${!isStaff && player.jerseyNo ? `<div class="jersey-badge">#${player.jerseyNo}</div>` : ''}
                            </div>
                            <div class="profile-info">
                                <h1 class="player-name">${player.name}</h1>
                                <div class="position-tag">${positionDisplay}</div>
                                ${player.status && player.status !== 'Active' ? `<span class="status-indicator ${player.status.toLowerCase()}">${player.status}</span>` : ''}
                            </div>
                        </div>

                        <!-- Stats Section -->
                        ${!isStaff ? `
                            <div class="stats-section">
                                <h3>Player Stats</h3>
                                <div class="stats-grid">
                                    <div class="stat-item">
                                        <div class="stat-icon">
                                            <i class="fas fa-birthday-cake"></i>
                                        </div>
                                        <div class="stat-content">
                                            <span class="stat-value">${player.age || '-'}</span>
                                            <span class="stat-label">Age</span>
                                        </div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-icon">
                                            <i class="fas fa-ruler-vertical"></i>
                                        </div>
                                        <div class="stat-content">
                                            <span class="stat-value">${player.height ? convertCmToFeetInches(player.height) : '-'}</span>
                                            <span class="stat-label">Height</span>
                                        </div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-icon">
                                            <i class="fas fa-shoe-prints"></i>
                                        </div>
                                        <div class="stat-content">
                                            <span class="stat-value">
                                                ${player.preferredFoot && player.preferredFoot.toLowerCase() === 'right' ? 'Right' : ''}
                                                ${player.preferredFoot && player.preferredFoot.toLowerCase() === 'left' ? 'Left' : ''}
                                                ${player.preferredFoot && player.preferredFoot.toLowerCase() === 'both' ? 'Both' : ''}
                                                ${!player.preferredFoot ? '-' : ''}
                                            </span>
                                            <span class="stat-label">Foot</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Info Section -->
                        <div class="info-section">
                            <h3>Information</h3>
                            <div class="info-list">
                                <div class="info-item">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <div class="info-content">
                                        <span class="info-label">Address</span>
                                        <span class="info-value">${player.address || 'Not specified'}</span>
                                    </div>
                                </div>
                                <div class="info-item">
                                    <i class="fas fa-info-circle"></i>
                                    <div class="info-content">
                                        <span class="info-label">Status</span>
                                        <span class="info-value">${player.status || 'Active'}</span>
                                    </div>
                                </div>
                                <div class="info-item">
                                    <i class="fas fa-sticky-note"></i>
                                    <div class="info-content">
                                        <span class="info-label">Admin Notes</span>
                                        <span class="info-value">${player.notes || 'No notes available'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                document.getElementById('player-detail-modal')?.classList.add('active');
            }
        } catch (e) {
            console.error('Error opening player modal:', e);
            showToast('Error', 'Failed to load player details', 'error');
        }
    };

    /**
     * Render individual player card - compact design
     */
    function renderPlayerCard(m) {
        // Use memberType if available, otherwise infer from positions
        const memberType = m.memberType || (Array.isArray(m.positions) && m.positions.length > 0
            ? (['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'SW', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'AMF', 'ST', 'CF', 'LF', 'RF', 'LW', 'RW'].includes(m.positions[0].toUpperCase()) ? 'Player' : 'Staff')
            : (m.position && ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'SW', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'AMF', 'ST', 'CF', 'LF', 'RF', 'LW', 'RW'].includes(m.position.toUpperCase()) ? 'Player' : 'Staff'));
        const isStaff = memberType === 'Staff';

        // Handle both old single position format and new multiple positions format
        const positions = Array.isArray(m.positions) ? m.positions : (m.position ? [m.position] : []);
        const positionDisplay = positions.length > 0 ? positions.join(' / ') : '';

        const imgError = "this.onerror=null; this.parentNode.innerHTML='<span class=\"default-avatar\"><i class=\"fas fa-user-circle\"></i></span>'";

        return `
        <div class="squad-card ${isStaff ? 'staff-card' : ''}" onclick="window.openPlayerModal('${m.id}')">
            <div class="squad-image">
                ${m.imageUrl ? `<img src="${m.imageUrl}" alt="${m.name}" onerror="${imgError}">` : `<span class='default-avatar'><i class='fas fa-user-circle'></i></span>`}
                ${!isStaff && m.jerseyNo ? `<div class="squad-number">${m.jerseyNo}</div>` : ''}
                ${m.status && m.status !== 'Active' ? `<div class="squad-status ${m.status.toLowerCase()}">${m.status}</div>` : ''}
            </div>
            <div class="squad-info">
                <h4>${m.name}</h4>
                ${!isStaff ? `
                <div class="player-details-row">
                    ${positionDisplay ? `<span class="detail-chip position-chip" title="${positionDisplay}">${positionDisplay}</span>` : ''}
                    ${m.age ? `<span class="detail-chip age-chip"><i class="fas fa-birthday-cake"></i> ${m.age}</span>` : ''}
                    ${m.height ? `<span class="detail-chip height-chip"><i class="fas fa-ruler-vertical"></i> ${convertCmToFeetInches(m.height)}</span>` : ''}
                    ${m.preferredFoot ? `<span class="detail-chip foot-chip"><i class="fas fa-shoe-prints"></i> ${m.preferredFoot.toLowerCase() === 'right' ? 'R' : m.preferredFoot.toLowerCase() === 'left' ? 'L' : 'B'}</span>` : ''}
                </div>` : `
                <div class="player-details-row">
                    ${positionDisplay ? `<span class="detail-chip position-chip" title="${positionDisplay}">${positionDisplay}</span>` : ''}
                </div>`}
            </div>
        </div>
    `;
    }

    /**
     * Fetch and display news with publisher info
     */
    // ============================================
    // NEWS SIDE PANEL LOGIC
    // ============================================

    function openNewsPanel(newsItem) {
        const panel = document.getElementById('news-panel');
        const overlay = document.getElementById('news-panel-overlay');
        const content = document.getElementById('news-panel-content');

        if (!panel || !overlay || !content) return;

        // Populate Content
        const isNotice = newsItem.type === 'notice';
        const tagClass = isNotice ? 'tag-notice' : 'tag-news';
        const tagName = isNotice ? 'Official Notice' : 'Club News';

        content.innerHTML = `
            ${newsItem.imageUrl ? `<img src="${newsItem.imageUrl}" class="news-panel-image" alt="${newsItem.headline}">` : ''}
            <span class="news-panel-tag ${tagClass}">${tagName}</span>
            <h2 class="news-panel-title">${newsItem.headline}</h2>
            <div class="news-panel-meta">
                <span><i class="far fa-clock"></i> ${formatDate(newsItem.date)}</span>
                ${newsItem.publisher ? `<span><i class=\"fas fa-user\"></i> ${newsItem.publisher}</span>` : ''}
            </div>
            <div class="news-panel-body">${newsItem.description.replace(/\n/g, '<br>')}</div>
        `;

        // Show Panel
        panel.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    function closeNewsPanel() {
        const panel = document.getElementById('news-panel');
        const overlay = document.getElementById('news-panel-overlay');

        if (panel && overlay) {
            panel.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    const newsPanelClose = document.getElementById('news-panel-close');
    const newsPanelOverlay = document.getElementById('news-panel-overlay');

    if (newsPanelClose) newsPanelClose.addEventListener('click', closeNewsPanel);
    if (newsPanelOverlay) newsPanelOverlay.addEventListener('click', closeNewsPanel);


    // ============================================
    // NEWS & ADMIN LOGIC
    // ============================================

    /**
     * Fetch and display news with publisher info
     */
    async function fetchNews() {
        const adminNewsList = document.getElementById('admin-news-list');
        // Only return if NEITHER exist, to allow fetching for one or the other
        if (!newsGrid && !adminNewsList) return;

        try {
            const res = await fetch('/api/news');
            const news = await res.json();
            // Store global map for easier access by ID
            window.allNews = news;

            // Update stats if on admin page
            const statNews = document.getElementById('stat-news');
            if (statNews) {
                statNews.textContent = news.length;
            }

            if (newsGrid) renderNews(news);

            // Admin view for News
            if (adminNewsList) {
                if (news.length === 0) {
                    adminNewsList.innerHTML = '<p style="text-align:center; color:var(--neutral-500); padding: 1rem;">No news posted yet.</p>';
                } else {
                    adminNewsList.innerHTML = news.map(n => `
                        <div class="list-item">
                            <div class="item-info">
                                ${n.imageUrl ? `
                                <img src="${n.imageUrl}" class="item-avatar" style="border-radius: var(--radius-sm); width: 60px; height: 40px; object-fit: cover; margin-right: 1rem;">
                                ` : `
                                <div class="item-avatar" style="background: var(--neutral-100); width: 60px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; margin-right: 1rem;">
                                    <i class="fas fa-image" style="color: var(--neutral-400);"></i>
                                </div>
                                `}
                                <div class="item-details">
                                    <h5>${n.headline} <span style="font-size:0.7em; padding:2px 6px; border-radius:4px; background:${n.type === 'notice' ? 'var(--warning)' : 'var(--primary-100)'}; color:${n.type === 'notice' ? 'white' : 'var(--primary-800)'}">${n.type === 'notice' ? 'NOTICE' : 'NEWS'}</span></h5>
                                    <p>${formatDate(n.date)} • By ${n.publisher}</p>
                                </div>
                            </div>
                            <div class="item-actions">
                                <button onclick="editNewsInForm('${n.id}')" class="btn-icon" title="Edit News">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteNews('${n.id}')" class="btn-icon btn-danger" title="Remove News">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error fetching news:', error);
            showToast('Error', 'Failed to load news', 'error');
        }
    }

    /**
     * Delete News (Global)
     */
    window.deleteNews = async (id) => {
        showConfirm('Delete News?', 'Warning: This will permanently wipe this news from the system. Continue?', async () => {
            try {
                const res = await fetch(`/api/news/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    await fetchNews();
                    showToast('Deleted', 'News post has been wiped', 'success');
                } else {
                    const data = await res.json();
                    throw new Error(data.error || 'Failed to delete');
                }
            } catch (e) {
                showToast('Error', e.message, 'error');
            }
        });
    };

    /**
     * Edit News Logic - Populates the Post News form
     */
    window.editNewsInForm = async (id) => {
        try {
            const n = window.allNews.find(item => String(item.id) === String(id));
            if (!n) return;

            // Scroll to Form
            const formSection = document.getElementById('post-news-form').closest('.dashboard-card');
            if (formSection) {
                formSection.scrollIntoView({ behavior: 'smooth' });
                formSection.style.outline = '3px solid var(--primary-500)';
                setTimeout(() => formSection.style.outline = 'none', 2000);
            }

            // Populate Form
            document.getElementById('n-headline').value = n.headline || '';
            document.getElementById('n-desc').value = n.description || '';
            const typeSelect = document.getElementById('n-type');
            if (typeSelect) typeSelect.value = n.type || 'news';

            // Change Button to Update
            const submitBtn = document.querySelector('#post-news-form button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update News';
            submitBtn.classList.add('accent');

            // Add hidden ID field
            let idField = document.getElementById('n-edit-id');
            if (!idField) {
                idField = document.createElement('input');
                idField.type = 'hidden';
                idField.id = 'n-edit-id';
                document.getElementById('post-news-form').appendChild(idField);
            }
            idField.value = n.id;

            // Add Cancel Edit button if not present
            let cancelBtn = document.getElementById('n-cancel-edit');
            if (!cancelBtn) {
                cancelBtn = document.createElement('button');
                cancelBtn.id = 'n-cancel-edit';
                cancelBtn.type = 'button';
                cancelBtn.className = 'form-submit';
                cancelBtn.style.background = 'var(--neutral-500)';
                cancelBtn.style.marginLeft = '1rem';
                cancelBtn.innerHTML = 'Cancel Edit';
                submitBtn.parentNode.appendChild(cancelBtn);

                cancelBtn.onclick = () => {
                    document.getElementById('post-news-form').reset();
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Broadcast News';
                    submitBtn.classList.remove('accent');
                    if (idField) idField.value = '';
                    // Hide remove image checkbox
                    const removeImageGroup = document.getElementById('n-remove-image-group');
                    if (removeImageGroup) removeImageGroup.style.display = 'none';
                    cancelBtn.remove();
                };
            }

            // Show remove image checkbox if editing and news has an image
            const removeImageGroup = document.getElementById('n-remove-image-group');
            const removeImageCheckbox = document.getElementById('n-remove-image');
            if (removeImageGroup && n.imageUrl) {
                removeImageGroup.style.display = 'block';
                if (removeImageCheckbox) removeImageCheckbox.checked = false;
            } else if (removeImageGroup) {
                removeImageGroup.style.display = 'none';
            }

            showToast('Mode: Edit', `Editing news: ${n.headline.substring(0, 20)}...`, 'info');

        } catch (e) {
            console.error(e);
            showToast('Error', 'Could not load news for editing', 'error');
        }
    };

    // Post/Update News logic
    const postNewsForm = document.getElementById('post-news-form');
    if (postNewsForm) {
        postNewsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const headline = document.getElementById('n-headline').value.trim();
            const description = document.getElementById('n-desc').value.trim();

            // Automatically get admin name from sessionStorage
            const publisher = sessionStorage.getItem('amsal_admin_username') || 'Admin';

            const typeSelect = document.getElementById('n-type');
            const type = typeSelect ? typeSelect.value : 'news';
            const imageFile = document.getElementById('n-image-file').files[0];
            const editIdInput = document.getElementById('n-edit-id');
            const editId = editIdInput ? editIdInput.value : null;

            try {
                const action = editId ? 'Updating' : 'Broadcasting';
                showToast(action, `${action} news...`, 'info');

                let imageUrl = undefined; // Undefined means don't change in update

                // Handle remove image checkbox (only visible when editing)
                const removeImageCheckbox = document.getElementById('n-remove-image');
                if (editId && removeImageCheckbox && removeImageCheckbox.checked) {
                    imageUrl = ''; // Set to empty to remove
                } else if (imageFile) {
                    imageUrl = await uploadImage(imageFile, 'player');
                }

                const payload = { headline, description, publisher, type };
                if (imageUrl !== undefined) payload.imageUrl = imageUrl;

                let res;
                if (editId) {
                    // Update
                    res = await fetch(`/api/news/${editId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } else {
                    // Create
                    res = await fetch('/api/news', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }

                if (res.ok) {
                    showToast('Success', `News ${editId ? 'updated' : 'broadcasted'} successfully!`, 'success');
                    postNewsForm.reset();

                    // Reset UI if was editing
                    if (editId) {
                        const submitBtn = document.querySelector('#post-news-form button[type="submit"]');
                        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Broadcast News';
                        submitBtn.classList.remove('accent');
                        if (editIdInput) editIdInput.value = '';
                        const cancelBtn = document.getElementById('n-cancel-edit');
                        if (cancelBtn) cancelBtn.remove();
                    }

                    await fetchNews();
                } else {
                    throw new Error('Failed to save news');
                }
            } catch (error) {
                console.error('Error posting news:', error);
                showToast('Error', 'Failed to save news', 'error');
            }
        });
    }

    /**
     * Render news items with images and publisher
     */
    function renderNews(newsItems) {
        if (!newsGrid) return;

        // News logic with toggle
        const newsLimit = window.innerWidth < 768 ? 2 : 3; // 2 for mobile, 3 for desktop

        // Make functions available globally for onclick events if needed, 
        // though we attach listeners directly here or use global scoping
        window.handleNewsClick = (index) => {
            openNewsPanel(newsItems[index]);
        };

        // Toggle News Function
        window.toggleNews = (total) => {
            const hiddenNews = document.querySelectorAll('.hidden-news-card');
            const btn = document.getElementById('btn-news');

            if (hiddenNews.length === 0) return;
            const isHidden = hiddenNews[0].style.display === 'none';

            hiddenNews.forEach(card => {
                card.style.display = isHidden ? '' : 'none';
            });

            if (isHidden) {
                btn.innerHTML = `Show Less <i class="fas fa-chevron-up" style="margin-left: 5px;"></i>`;
            } else {
                btn.innerHTML = `View All News <i class="fas fa-chevron-down" style="margin-left: 5px;"></i>`;
            }
        };

        if (newsItems.length === 0) {
            newsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <p style="font-size: 1.2rem; color: var(--neutral-600);">No news available yet. Stay tuned!</p>
                </div>
            `;
        } else {
            let html = newsItems.map((n, index) => {
                const isNotice = n.type === 'notice';
                const tagText = isNotice ? 'NOTICE' : 'CLUB NEWS';
                // Inline styles for the tag to ensure verify
                const tagStyle = isNotice
                    ? 'background: linear-gradient(135deg, #fb8500 0%, #ff6b00 100%); color: white;'
                    : 'background: var(--primary-100); color: var(--primary-800);';

                // Use icon placeholder if no image
                const imageSection = n.imageUrl
                    ? `<img src="${n.imageUrl}" alt="${n.headline}">`
                    : `<div class="news-image-placeholder"><i class="fas fa-newspaper"></i></div>`;

                const isHidden = index >= newsLimit;
                const style = isHidden ? 'display: none;' : '';
                const hiddenClass = isHidden ? 'hidden-news-card' : '';

                return `
                <article class="news-card ${hiddenClass}" style="${style}">
                    <div class="news-image">
                        <span class="news-tag" style="${tagStyle}">${tagText}</span>
                        ${imageSection}
                    </div>
                    <div class="news-content">
                        <h3>${n.headline}</h3>
                        <p>${n.description.substring(0, 100)}...</p>
                        <div class="news-meta">
                            <div>
                                <time><i class="far fa-clock"></i> ${formatDate(n.date)}</time>
                            </div>
                            <span class="news-read-more" onclick="handleNewsClick(${index})">Read More →</span>
                        </div>
                    </div>
                </article>
            `}).join('');

            if (newsItems.length > newsLimit) {
                html += `
                    <div style="grid-column: 1/-1; text-align: center; margin-top: 1rem; width: 100%;">
                        <button onclick="toggleNews(${newsItems.length})" id="btn-news" class="btn btn-secondary" style="font-size: 0.9rem; padding: 0.5rem 1.5rem; border-radius: 20px;">
                            View All News <i class="fas fa-chevron-down" style="margin-left: 5px;"></i>
                        </button>
                    </div>
                 `;
            }

            newsGrid.innerHTML = html;
        }
    }

    // ============================================
    // ADMIN FUNCTIONALITY - ENHANCED
    // ============================================

    // Add Member Form with Image Upload & Update Support
    const addMemberForm = document.getElementById('add-member-form');
    if (addMemberForm) {
        // Toggle fields based on member type (Player vs Staff)
        const memberTypeSelect = document.getElementById('m-member-type');
        window.toggleFields = () => {
            const memberType = memberTypeSelect.value;
            const isStaff = memberType === 'Staff';

            // Hide/show player fields
            const fieldsToToggle = ['m-jersey', 'm-age', 'm-height', 'm-foot', 'm-address'].map(id => document.getElementById(id)?.closest('.form-group'));
            fieldsToToggle.forEach(fg => {
                if (fg) fg.style.display = isStaff ? 'none' : 'block';
            });

            // Hide/show position categories
            const playerPositionCategories = document.querySelectorAll('.player-position-category');
            const staffPositionCategory = document.querySelector('.staff-position-category');

            if (isStaff) {
                // Hide player positions, show staff positions
                playerPositionCategories.forEach(cat => {
                    cat.style.display = 'none';
                });
                if (staffPositionCategory) {
                    staffPositionCategory.style.display = 'block';
                }
            } else {
                // Show player positions, hide staff positions
                playerPositionCategories.forEach(cat => {
                    cat.style.display = 'block';
                });
                if (staffPositionCategory) {
                    staffPositionCategory.style.display = 'none';
                }
            }

            // Uncheck all checkboxes when switching types
            document.querySelectorAll('input[name="m-position"]').forEach(checkbox => {
                checkbox.checked = false;
            });
        };

        // Add event listener to member type dropdown
        if (memberTypeSelect) {
            memberTypeSelect.addEventListener('change', toggleFields);
            // Initial call to set correct visibility
            toggleFields();
        }

        // Add real-time height conversion
        const heightInput = document.getElementById('m-height');
        if (heightInput) {
            heightInput.addEventListener('input', updateHeightDisplay);
            // Initial update
            updateHeightDisplay();
        }

        addMemberForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const editId = document.getElementById('m-edit-id')?.value;
            const name = document.getElementById('m-name').value.trim();

            const memberType = document.getElementById('m-member-type').value;
            if (!memberType) {
                showToast('Error', 'Please select member type (Player or Staff)', 'error');
                return;
            }

            // Collect multiple positions from checkboxes
            const positionCheckboxes = document.querySelectorAll('input[name="m-position"]:checked');
            const positions = Array.from(positionCheckboxes).map(cb => cb.value);
            if (positions.length === 0) {
                showToast('Error', 'Please select at least one position', 'error');
                return;
            }

            const jerseyNo = document.getElementById('m-jersey').value;
            const age = document.getElementById('m-age').value;
            const height = document.getElementById('m-height').value;
            const preferredFoot = document.getElementById('m-foot').value;
            const address = document.getElementById('m-address').value.trim();
            const status = document.getElementById('m-status').value;
            const notes = document.getElementById('m-notes').value.trim();
            const imageFile = document.getElementById('m-image-file').files[0];
            let imageUrl = document.getElementById('m-image-url').value.trim();

            const removeImageCheckbox = document.getElementById('m-remove-image');
            if (removeImageCheckbox && removeImageCheckbox.checked) {
                imageUrl = ''; // Explicitly remove image
            }

            try {
                if (imageFile) {
                    showToast('Uploading', 'Uploading image...', 'info');
                    imageUrl = await uploadImage(imageFile, 'player');
                }

                const url = editId ? `/api/members/${editId}` : '/api/members';
                const method = editId ? 'PUT' : 'POST';

                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name, memberType, positions, jerseyNo, age, address, height, preferredFoot, imageUrl, status, notes
                    })
                });

                if (res.ok) {
                    addMemberForm.reset();
                    // Clean up edit mode
                    const editIdField = document.getElementById('m-edit-id');
                    if (editIdField) editIdField.value = '';

                    const formActions = document.getElementById('form-edit-actions');
                    if (formActions) {
                        const submitBtn = formActions.querySelector('button[type="submit"]');
                        formActions.parentNode.insertBefore(submitBtn, formActions);
                        formActions.remove();
                    }

                    const mainSubmitBtn = document.querySelector('#add-member-form button[type="submit"]');
                    mainSubmitBtn.innerHTML = 'Add Team Member';
                    mainSubmitBtn.classList.remove('accent');

                    // Hide remove image checkbox on reset
                    const removeImageGroup = document.getElementById('m-remove-image-group');
                    const removeImageCheckbox = document.getElementById('m-remove-image');
                    if (removeImageGroup && removeImageCheckbox) {
                        removeImageGroup.style.display = 'none';
                        removeImageCheckbox.checked = false;
                    }

                    showToast('Success', editId ? `${name} updated!` : `${name} added!`, 'success');
                    toggleFields();
                    await fetchMembers();
                } else {
                    throw new Error('Failed to save member');
                }
            } catch (error) {
                console.error('Error saving member:', error);
                showToast('Error', 'An error occurred while saving', 'error');
            }
        });
    }

    // Delete Member Function (Global) - Fortified
    window.deleteMember = async (id) => {
        showConfirm('Wipe Member?', 'Warning: This will permanently wipe this information. Continue?', async () => {
            try {
                const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    await fetchMembers();
                    showToast('Wiped', 'Information has been completely removed', 'success');

                    // If the deleted member was being edited, reset the form
                    const editIdField = document.getElementById('m-edit-id');
                    if (editIdField && editIdField.value === String(id)) {
                        addMemberForm.reset();
                        editIdField.value = '';
                        const formActions = document.getElementById('form-edit-actions');
                        if (formActions) {
                            const submitBtn = formActions.querySelector('button[type="submit"]');
                            formActions.parentNode.insertBefore(submitBtn, formActions);
                            formActions.remove();
                        }
                        const mainSubmitBtn = document.querySelector('#add-member-form button[type="submit"]');
                        mainSubmitBtn.innerHTML = 'Add Team Member';
                        mainSubmitBtn.classList.remove('accent');
                    }
                } else {
                    throw new Error('Delete failed');
                }
            } catch (e) {
                showToast('Error', 'Could not remove information', 'error');
            }
        });
    };

    // ============================================
    // CLUB SETTINGS (SUPER ADMIN ONLY)
    // ============================================

    const clubSettings = document.getElementById('club-settings');
    const clubSettingsForm = document.getElementById('club-settings-form');

    if (clubSettings && sessionStorage.getItem('amsal_admin_role') === 'super') {
        clubSettings.classList.remove('hidden');

        // Load club settings
        async function loadClubSettings() {
            try {
                const res = await fetch('/api/club');
                const club = await res.json();

                document.getElementById('c-name').value = club.name || '';
                document.getElementById('c-address').value = club.address || '';
                document.getElementById('c-ground-location').value = club.groundLocation || '';
                document.getElementById('c-ground-size').value = club.groundSize || '';
                document.getElementById('c-field-type').value = club.fieldType || 'Natural Grass';
                document.getElementById('c-stadium-capacity').value = club.stadiumCapacity || '';
                document.getElementById('c-nightlight').value = club.nightlight || 'No';
                document.getElementById('c-ground-image-url').value = club.groundImageUrl || '';
            } catch (error) {
                console.error('Error loading club settings:', error);
            }
        }

        loadClubSettings();

        // Save club settings with ground image
        if (clubSettingsForm) {
            clubSettingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const imageFile = document.getElementById('c-ground-image-file').files[0];
                let groundImageUrl = document.getElementById('c-ground-image-url').value.trim();

                try {
                    // Handle remove ground image checkbox
                    const removeGroundImageCheckbox = document.getElementById('c-remove-ground-image');
                    if (removeGroundImageCheckbox && removeGroundImageCheckbox.checked) {
                        groundImageUrl = ''; // Set to empty to remove
                    } else if (imageFile) {
                        // Upload ground image if file is selected
                        showToast('Uploading', 'Uploading ground image...', 'info');
                        groundImageUrl = await uploadImage(imageFile, 'player');
                    }

                    const clubData = {
                        name: document.getElementById('c-name').value.trim(),
                        address: document.getElementById('c-address').value.trim(),
                        groundLocation: document.getElementById('c-ground-location').value.trim(),
                        groundSize: document.getElementById('c-ground-size').value.trim(),
                        fieldType: document.getElementById('c-field-type').value,
                        stadiumCapacity: document.getElementById('c-stadium-capacity').value,
                        nightlight: document.getElementById('c-nightlight').value,
                        groundImageUrl: groundImageUrl
                    };

                    const res = await fetch('/api/club', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(clubData)
                    });

                    if (res.ok) {
                        showToast('Success', 'Club settings updated!', 'success');
                        await loadGroundInfo(); // Reload ground info on public page
                    } else {
                        throw new Error('Failed to update settings');
                    }
                } catch (error) {
                    console.error('Error updating club settings:', error);
                    showToast('Error', 'Failed to update club settings', 'error');
                }
            });
        }
    }

    // ============================================
    // SLIDER MANAGEMENT (SUPER ADMIN)
    // ============================================

    const sliderManagement = document.getElementById('slider-management');
    const sliderList = document.getElementById('slider-list');
    const addSliderForm = document.getElementById('add-slider-form');

    if (sliderManagement && sessionStorage.getItem('amsal_admin_role') === 'super') {
        sliderManagement.classList.remove('hidden');

        async function fetchSliderImages() {
            try {
                const res = await fetch('/api/slider');
                const slides = await res.json();

                if (slides.length === 0) {
                    sliderList.innerHTML = '<p style="color: var(--neutral-600); text-align: center;">No slider images</p>';
                } else {
                    sliderList.innerHTML = slides.map(s => `
                        <div class="list-item">
                            <div class="item-info">
                                <img src="${s.imageUrl}" class="item-avatar" style="border-radius: var(--radius-sm); width: 100px; height: 60px; object-fit: cover;">
                                <div class="item-details">
                                    <h5>Slide ${s.id}</h5>
                                    <p>${s.active ? '<span style="color: green;">Active</span>' : '<span style="color: red;">Inactive</span>'}</p>
                                </div>
                            </div>
                            <div class="item-actions">
                                <button onclick="toggleSlide('${s.id}')" class="btn-icon" title="${s.active ? 'Deactivate' : 'Activate'}">
                                    <i class="fas fa-${s.active ? 'eye-slash' : 'eye'}"></i>
                                </button>
                                <button onclick="deleteSlide('${s.id}')" class="btn-icon btn-danger" title="Remove">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('');
                }
            } catch (error) {
                console.error('Error fetching slider images:', error);
            }
        }

        fetchSliderImages();

        if (addSliderForm) {
            addSliderForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const file = document.getElementById('sl-image-file').files[0];
                if (!file) return;

                try {
                    showToast('Uploading', 'Uploading slide...', 'info');
                    const imageUrl = await uploadImage(file, 'slider');

                    const res = await fetch('/api/slider');
                    const slides = await res.json();

                    slides.push({
                        id: Date.now().toString(),
                        imageUrl,
                        active: true
                    });

                    await fetch('/api/slider', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(slides)
                    });

                    addSliderForm.reset();
                    await fetchSliderImages();
                    showToast('Success', 'New slide added!', 'success');
                } catch (error) {
                    showToast('Error', 'Failed to add slide', 'error');
                }
            });
        }

        window.toggleSlide = async (id) => {
            const res = await fetch('/api/slider');
            const slides = await res.json();
            const slide = slides.find(s => s.id === id);
            if (slide) {
                slide.active = !slide.active;
                await fetch('/api/slider', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(slides)
                });
                await fetchSliderImages();
            }
        };

        window.deleteSlide = async (id) => {
            if (!confirm('Remove this slide?')) return;
            const res = await fetch('/api/slider');
            const slides = await res.json();
            const filtered = slides.filter(s => s.id !== id);
            await fetch('/api/slider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filtered)
            });
            await fetchSliderImages();
        };
    }

    // ============================================
    // SUPER ADMIN FUNCTIONALITY
    // ============================================

    const adminManagement = document.getElementById('admin-management');
    const adminList = document.getElementById('admin-list');
    const addAdminForm = document.getElementById('add-admin-form');
    const adminUsername = document.getElementById('admin-username') || document.getElementById('super-admin-username');
    const adminRole = document.getElementById('admin-role') || document.getElementById('super-admin-role');
    const adminAvatar = document.getElementById('admin-avatar') || document.getElementById('super-admin-avatar');
    const adminAvatarPlaceholder = document.getElementById('admin-avatar-placeholder') || document.getElementById('super-admin-avatar-placeholder');

    // Display admin info
    if (adminUsername) {
        const username = sessionStorage.getItem('amsal_admin_username') || 'Admin';
        const role = sessionStorage.getItem('amsal_admin_role') || 'admin';
        const adminData = JSON.parse(sessionStorage.getItem('amsal_admin_data') || '{}');
        const imageUrl = adminData.imageUrl || sessionStorage.getItem('amsal_admin_image') || '';

        adminUsername.textContent = username;
        if (adminRole) {
            adminRole.textContent = role === 'super' ? 'Super Administrator' : 'Administrator';
        }

        if (imageUrl && adminAvatar && adminAvatarPlaceholder) {
            adminAvatar.src = imageUrl;
            adminAvatar.style.display = 'block';
            adminAvatarPlaceholder.style.display = 'none';
        }
    }

    // Show admin management for super admins (works on both admin.html and super-admin.html)
    const isSuperAdmin = sessionStorage.getItem('amsal_admin_role') === 'super';
    if ((adminManagement || adminList) && isSuperAdmin) {
        if (adminManagement) adminManagement.classList.remove('hidden');

        async function fetchAdmins() {
            if (!adminList) return;
            try {
                const res = await fetch('/api/admins');
                const admins = await res.json();

                if (admins.length === 0) {
                    adminList.innerHTML = `
                        <div class="list-item">
                            <p style="color: var(--neutral-600); text-align: center; width: 100%;">No admins found</p>
                        </div>
                    `;
                } else {
                    adminList.innerHTML = admins.map(a => `
                        <div class="list-item admin-list-item">
                            <div class="item-info admin-item-info">
                                ${a.imageUrl ? `
                                    <img src="${a.imageUrl}" alt="${a.username}" class="item-avatar admin-item-avatar">
                                ` : `
                                    <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.2rem;">
                                        ${a.username.charAt(0).toUpperCase()}
                                    </div>
                                `}
                                <div class="item-details admin-item-details">
                                    <h5>${a.username}</h5>
                                    <p>
                                        <span class="admin-badge ${a.role === 'super' ? 'super' : ''}">${a.role === 'super' ? 'Super Admin' : 'Admin'}</span>
                                    </p>
                                </div>
                            </div>
                            <div class="item-actions">
                                <button onclick="openEditAdmin('${a.id}')" class="btn-icon" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                ${a.role !== 'super' ? `
                                    <button onclick="deleteAdmin('${a.id}')" class="btn-icon btn-danger" title="Remove">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : `
                                    <span class="admin-badge super" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">Protected</span>
                                `}
                            </div>
                        </div>
                    `).join('');
                }
            } catch (error) {
                console.error('Error fetching admins:', error);
                showToast('Error', 'Failed to load admin list', 'error');
            }
        }

        fetchAdmins();

        // Add Admin Form with Image Upload
        if (addAdminForm) {
            // Handle image upload button
            const uploadAdminImageBtn = document.getElementById('upload-admin-image-btn');
            const adminImageInput = document.getElementById('a-image');
            const adminImageUrlInput = document.getElementById('a-image-url');

            if (uploadAdminImageBtn && adminImageInput) {
                uploadAdminImageBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const file = adminImageInput.files[0];
                    if (!file) {
                        showToast('Warning', 'Please select an image first', 'warning');
                        return;
                    }
                    try {
                        showToast('Uploading', 'Uploading image...', 'info');
                        const imageUrl = await uploadImage(file, 'admin');
                        if (adminImageUrlInput) adminImageUrlInput.value = imageUrl;
                        showToast('Success', 'Image uploaded successfully', 'success');
                    } catch (error) {
                        showToast('Error', 'Failed to upload image', 'error');
                    }
                });
            }

            addAdminForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const username = document.getElementById('a-username').value.trim();
                const password = document.getElementById('a-password').value;
                const imageUrl = adminImageUrlInput ? adminImageUrlInput.value : '';

                if (!username || !password) {
                    showToast('Error', 'Username and password are required', 'error');
                    return;
                }

                try {
                    const res = await fetch('/api/admins', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password, imageUrl })
                    });

                    const data = await res.json();

                    if (res.ok) {
                        addAdminForm.reset();
                        if (adminImageUrlInput) adminImageUrlInput.value = '';
                        await fetchAdmins();
                        showToast('Success', `Admin account created for ${username}`, 'success');
                    } else {
                        showToast('Error', data.error || 'Failed to create admin', 'error');
                    }
                } catch (error) {
                    console.error('Create admin error:', error);
                    showToast('Error', 'Failed to create admin account', 'error');
                }
            });
        }

        // Delete Admin Function (Global)
        window.deleteAdmin = async (id) => {
            // Fetch admins to check roles
            try {
                const res = await fetch('/api/admins');
                const admins = await res.json();
                const adminToDelete = admins.find(a => String(a.id) === String(id));

                if (adminToDelete && adminToDelete.role === 'super') {
                    showToast('Forbidden', 'Super Admin accounts can never be deleted!', 'error');
                    return;
                }

                showConfirm('Remove Admin?', `Are you sure you want to remove ${adminToDelete ? adminToDelete.username : 'this admin'}? This action cannot be undone.`, async () => {
                    try {
                        const res = await fetch(`/api/admins/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            await fetchAdmins();
                            showToast('Success', 'Admin account has been removed', 'success');
                            if (typeof closeEditModal === 'function') closeEditModal();
                        } else {
                            const data = await res.json();
                            showToast('Error', data.error || 'Failed to delete admin', 'error');
                        }
                    } catch (error) {
                        console.error("Delete error:", error);
                        showToast("Error", "Failed to delete admin", "error");
                    }
                }, 'Yes, Delete');
            } catch (error) {
                console.error("Error fetching admins:", error);
                showToast("Error", "Failed to load admin data", "error");
            }
        };
    }

    // ============================================
    // LOGOUT FUNCTIONALITY (Available on all admin pages)
    // ============================================

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showConfirm('Sign Out?', 'Are you sure you want to end your session?', () => {
                sessionStorage.clear();
                window.location.href = 'index.html';
            }, 'Logout');
        });
    }

    // ============================================
    // REFRESH DATA BUTTON
    // ============================================

    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            showToast('Refreshing', 'Loading latest data...', 'info');

            const promises = [];
            if (typeof fetchMembers === 'function') promises.push(fetchMembers());
            if (typeof fetchNews === 'function') promises.push(fetchNews());

            // Also refresh club settings if they are visible (Super Admin)
            if (sessionStorage.getItem('amsal_admin_role') === 'super') {
                promises.push(fetch('/api/club').then(res => res.json()).then(club => {
                    const setId = (id, val) => {
                        const el = document.getElementById(id);
                        if (el) el.value = val || '';
                    };
                    setId('c-name', club.name);
                    setId('c-address', club.address);
                    setId('c-ground-location', club.groundLocation);
                    setId('c-ground-size', club.groundSize);
                    setId('c-field-type', club.fieldType || 'Natural Grass');
                    setId('c-stadium-capacity', club.stadiumCapacity);
                    setId('c-nightlight', club.nightlight || 'No');
                    setId('c-ground-image-url', club.groundImageUrl);
                }).catch(e => console.error('Error refreshing club settings:', e)));
            }

            await Promise.all(promises);
            showToast('Updated', 'All data refreshed', 'success');
        });
    }

    // ============================================
    // REAL-TIME SOCKET.IO
    // ============================================

    if (typeof io !== 'undefined') {
        const socket = io();

        socket.on('new-news', (newsItem) => {
            console.log('📰 New news received:', newsItem);

            // Show toast notification
            showToast('Breaking News', newsItem.headline, 'info');

            // Update news grid if on index page
            if (newsGrid) {
                // Use icon placeholder if no image
                const imageSection = newsItem.imageUrl
                    ? `<img src="${newsItem.imageUrl}" alt="${newsItem.headline}">`
                    : `<div class="news-image-placeholder"><i class="fas fa-newspaper"></i></div>`;

                const newsCard = document.createElement('article');
                newsCard.className = 'news-card breaking fade-in';
                newsCard.innerHTML = `
                    <div class="news-image">
                        <span class="news-tag">Just Now</span>
                        ${imageSection}
                    </div>
                    <div class="news-content">
                        <h3>${newsItem.headline}</h3>
                        <p>${newsItem.description}</p>
                        <div class="news-meta">
                            <div>
                                <time><i class="far fa-clock"></i> Just now</time>
                                ${newsItem.publisher ? `<span style="color: var(--neutral-500); font-size: 0.85rem;"> • <i class="fas fa-user"></i> ${newsItem.publisher}</span>` : ''}
                            </div>
                            <span class="news-read-more">Read More →</span>
                        </div>
                    </div>
                `;

                newsGrid.insertBefore(newsCard, newsGrid.firstChild);
            }
        });

        socket.on('connect', () => {
            console.log('✅ Connected to server');
        });

        socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
        });

        // Listen for club settings updates
        socket.on('club-updated', (clubData) => {
            loadGroundInfo();
        });
    }

    // ============================================
    // SECRET ADMIN LOGIN
    // ============================================

    const secretLogo = document.getElementById('secret-logo');
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const modalClose = document.getElementById('modal-close');

    if (secretLogo && loginModal) {
        // ============================================
        // ADMIN LOGIN LOGIC (6 CLICKS)
        // ============================================

        const secretLogo = document.getElementById('secret-logo');
        const footerLoginLink = document.querySelector('.footer-admin-login');
        let clickCount = 0;
        let clickTimer = null;

        function openLogin() {
            const modal = document.getElementById('login-modal');
            if (modal) {
                if (typeof generateCaptcha === 'function') generateCaptcha();
                modal.classList.remove('hidden');
                modal.classList.add('active'); // Ensure active class is added
                modal.style.display = 'flex';
                document.getElementById('password-input')?.focus();
            }
        }

        if (secretLogo) {
            secretLogo.addEventListener('click', (e) => {
                e.preventDefault();
                clickCount++;

                // Visual Feedback
                secretLogo.style.transform = 'scale(0.9)';
                setTimeout(() => secretLogo.style.transform = 'scale(1)', 100);

                if (clickTimer) clearTimeout(clickTimer);

                if (clickCount >= 6) {
                    openLogin();
                    clickCount = 0;
                } else {
                    clickTimer = setTimeout(() => {
                        clickCount = 0;
                    }, 800);
                }
            });
        }

        if (footerLoginLink) {
            footerLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                openLogin();
            });
        }

        // Close Modal Logic
        const modalClose = document.getElementById('modal-close'); // X button
        const loginModal = document.getElementById('login-modal'); // Modal Overlay
        const closeLoginBtn = document.getElementById('close-login'); // Button inside form?

        if (modalClose && loginModal) {
            modalClose.addEventListener('click', () => {
                loginModal.classList.remove('active');
                loginModal.classList.add('hidden');
            });
        }

        // Close on outside click
        if (loginModal) {
            loginModal.addEventListener('click', (e) => {
                if (e.target === loginModal) {
                    loginModal.classList.remove('active');
                    loginModal.classList.add('hidden');
                }
            });
        }

        // ============================================
        // THEME TOGGLE
        // ============================================
        const themeToggle = document.getElementById('theme-toggle');
        const body = document.body;

        // Check local storage
        if (localStorage.getItem('theme') === 'dark') {
            body.classList.add('dark-mode');
            if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }

        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                body.classList.toggle('dark-mode');
                const isDark = body.classList.contains('dark-mode');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
                themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            });
        }

        // Login form submission
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const username = document.getElementById('admin-user').value.trim();
                const password = document.getElementById('admin-pass').value;

                try {
                    const res = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });

                    const data = await res.json();

                    if (data.success) {
                        sessionStorage.setItem('amsal_admin', 'true');
                        sessionStorage.setItem('amsal_admin_role', data.role);
                        sessionStorage.setItem('amsal_admin_username', data.username);
                        sessionStorage.setItem('amsal_admin_image', data.imageUrl || '');
                        window.location.href = 'admin.html';
                    } else {
                        if (loginError) {
                            loginError.classList.remove('hidden');
                            setTimeout(() => loginError.classList.add('hidden'), 3000);
                        }
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    if (loginError) {
                        loginError.textContent = 'Connection error. Please try again.';
                        loginError.classList.remove('hidden');
                        setTimeout(() => loginError.classList.add('hidden'), 3000);
                    }
                }
            });
        }
    }

    // --- EDIT MODAL LOGIC ---
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editFieldsContainer = document.getElementById('edit-fields-container');

    window.closeEditModal = () => {
        if (editModal) editModal.classList.remove('active');
    };

    window.openEditMember = async (id) => {
        console.log('Fetching member for edit, ID:', id);
        try {
            const res = await fetch('/api/members');
            const members = await res.json();
            const m = members.find(item => String(item.id) === String(id));

            if (!m) {
                console.error('Member not found for editing, sought string ID:', String(id));
                return;
            }

            document.getElementById('edit-modal-title').textContent = 'Edit Member';
            document.getElementById('edit-id').value = m.id;
            document.getElementById('edit-type').value = 'member';

            editFieldsContainer.innerHTML = `
                <div class="form-group">
                    <label class="form-label">Full Name *</label>
                    <input type="text" id="e-name" class="form-input" value="${m.name}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Position *</label>
                    <select id="e-position" class="form-select" required>
                        <optgroup label="Goalkeepers">
                            <option value="GK" ${m.position === 'GK' ? 'selected' : ''}>GK - Goalkeeper</option>
                        </optgroup>
                        <optgroup label="Defenders">
                            <option value="CB" ${m.position === 'CB' ? 'selected' : ''}>CB - Center Back</option>
                            <option value="LB" ${m.position === 'LB' ? 'selected' : ''}>LB - Left Back</option>
                            <option value="RB" ${m.position === 'RB' ? 'selected' : ''}>RB - Right Back</option>
                            <option value="LWB" ${m.position === 'LWB' ? 'selected' : ''}>LWB - Left Wing Back</option>
                            <option value="RWB" ${m.position === 'RWB' ? 'selected' : ''}>RWB - Right Wing Back</option>
                            <option value="SW" ${m.position === 'SW' ? 'selected' : ''}>SW - Sweeper</option>
                        </optgroup>
                        <optgroup label="Midfielders">
                            <option value="CDM" ${m.position === 'CDM' ? 'selected' : ''}>CDM - Defensive Midfielder</option>
                            <option value="CM" ${m.position === 'CM' ? 'selected' : ''}>CM - Central Midfielder</option>
                            <option value="CAM" ${m.position === 'CAM' ? 'selected' : ''}>CAM - Attacking Midfielder</option>
                            <option value="LM" ${m.position === 'LM' ? 'selected' : ''}>LM - Left Midfielder</option>
                            <option value="RM" ${m.position === 'RM' ? 'selected' : ''}>RM - Right Midfielder</option>
                            <option value="LW" ${m.position === 'LW' ? 'selected' : ''}>LW - Left Winger</option>
                            <option value="RW" ${m.position === 'RW' ? 'selected' : ''}>RW - Right Winger</option>
                        </optgroup>
                        <optgroup label="Forwards">
                            <option value="ST" ${m.position === 'ST' ? 'selected' : ''}>ST - Striker</option>
                            <option value="CF" ${m.position === 'CF' ? 'selected' : ''}>CF - Center Forward</option>
                            <option value="LF" ${m.position === 'LF' ? 'selected' : ''}>LF - Left Forward</option>
                            <option value="RF" ${m.position === 'RF' ? 'selected' : ''}>RF - Right Forward</option>
                        </optgroup>
                        <optgroup label="Staff">
                            <option value="Coach" ${m.position === 'Coach' ? 'selected' : ''}>Coach</option>
                            <option value="Manager" ${m.position === 'Manager' ? 'selected' : ''}>Manager</option>
                            <option value="Assistant Coach" ${m.position === 'Assistant Coach' ? 'selected' : ''}>Assistant Coach</option>
                            <option value="Team Doctor" ${m.position === 'Team Doctor' ? 'selected' : ''}>Team Doctor</option>
                            <option value="Advisor" ${m.position === 'Advisor' ? 'selected' : ''}>Advisor</option>
                            <option value="Social Media Manager" ${m.position === 'Social Media Manager' ? 'selected' : ''}>Social Media Manager</option>
                            <option value="Sponsor" ${m.position === 'Sponsor' ? 'selected' : ''}>Sponsor</option>
                            <option value="Physiotherapist" ${m.position === 'Physiotherapist' ? 'selected' : ''}>Physiotherapist</option>
                            <option value="Kit Manager" ${m.position === 'Kit Manager' ? 'selected' : ''}>Kit Manager</option>
                            <option value="Video Analyst" ${m.position === 'Video Analyst' ? 'selected' : ''}>Video Analyst</option>
                        </optgroup>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Jersey Number</label>
                    <input type="number" id="e-jersey" class="form-input" value="${m.jerseyNo || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Age</label>
                    <input type="number" id="e-age" class="form-input" value="${m.age || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Height (cm)</label>
                    <input type="number" id="e-height" class="form-input" value="${m.height || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Preferred Foot</label>
                    <select id="e-foot" class="form-select">
                        <option value="">Select foot</option>
                        <option value="Right" ${m.preferredFoot === 'Right' ? 'selected' : ''}>Right</option>
                        <option value="Left" ${m.preferredFoot === 'Left' ? 'selected' : ''}>Left</option>
                        <option value="Both" ${m.preferredFoot === 'Both' ? 'selected' : ''}>Both</option>
                    </select>
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label class="form-label">Address</label>
                    <input type="text" id="e-address" class="form-input" value="${m.address || ''}">
                </div>
            `;

            // Reset the remove image checkbox
            const removeImageCheckbox = document.getElementById('edit-remove-image');
            if (removeImageCheckbox) removeImageCheckbox.checked = false;

            editModal.classList.add('active');
        } catch (e) {
            console.error('Error loading member data:', e);
            showToast('Error', 'Failed to load member details', 'error');
        }
    };

    window.openEditAdmin = async (id) => {
        try {
            const res = await fetch('/api/admins');
            const admins = await res.json();
            const a = admins.find(item => String(item.id) === String(id));

            if (!a) return;

            document.getElementById('edit-modal-title').textContent = 'Edit Admin';
            document.getElementById('edit-id').value = a.id;
            document.getElementById('edit-type').value = 'admin';

            editFieldsContainer.innerHTML = `
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <input type="text" id="e-username" class="form-input" value="${a.username}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">New Password (leave blank to keep)</label>
                    <input type="password" id="e-password" class="form-input" placeholder="********">
                </div>
            `;

            // Reset the remove image checkbox
            const removeImageCheckbox = document.getElementById('edit-remove-image');
            if (removeImageCheckbox) removeImageCheckbox.checked = false;

            editModal.classList.add('active');
        } catch (e) {
            console.error('Error loading admin:', e);
            showToast('Error', 'Failed to load admin data', 'error');
        }
    };

    window.editSelf = () => {
        const username = sessionStorage.getItem('amsal_admin_username');
        fetch('/api/admins').then(r => r.json()).then(admins => {
            const self = admins.find(a => a.username === username);
            if (self) openEditAdmin(self.id);
        });
    };

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            const type = document.getElementById('edit-type').value;
            const imageInput = document.getElementById('edit-image-file');
            const imageFile = imageInput ? imageInput.files[0] : null;

            let updateData = {};
            let endpoint = '';

            try {
                showToast('Saving', 'Updating information...', 'info');

                if (type === 'member') {
                    endpoint = `/api/members/${id}`;
                    updateData = {
                        name: document.getElementById('e-name').value,
                        position: document.getElementById('e-position').value,
                        jerseyNo: document.getElementById('e-jersey').value,
                        age: document.getElementById('e-age').value,
                        address: document.getElementById('e-address').value,
                        height: document.getElementById('e-height').value,
                        preferredFoot: document.getElementById('e-foot').value
                    };
                } else {
                    endpoint = `/api/admins/${id}`;
                    updateData = {
                        username: document.getElementById('e-username').value
                    };
                    const pwd = document.getElementById('e-password').value;
                    if (pwd) updateData.password = pwd;
                }

                // Handle remove image checkbox
                const removeImageCheckbox = document.getElementById('edit-remove-image');
                if (removeImageCheckbox && removeImageCheckbox.checked) {
                    updateData.imageUrl = ''; // Set to empty to remove
                } else if (imageFile) {
                    const imageUrl = await uploadImage(imageFile, type);
                    updateData.imageUrl = imageUrl;
                }

                const res = await fetch(endpoint, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });

                if (res.ok) {
                    closeEditModal();
                    if (type === 'member') await fetchMembers();
                    else await fetchAdmins();
                    showToast('Success', 'Changes saved successfully', 'success');

                    // If we edited ourselves, update session storage
                    if (type === 'admin' && updateData.username === sessionStorage.getItem('amsal_admin_username')) {
                        sessionStorage.setItem('amsal_admin_username', updateData.username);
                        if (updateData.imageUrl) sessionStorage.setItem('amsal_admin_image', updateData.imageUrl);
                    }
                } else {
                    throw new Error('Failed to update');
                }
            } catch (error) {
                console.error('Edit error:', error);
                showToast('Error', error.message, 'error');
            }
        });
    }

    // Initialize Data
    fetchMembers();
    fetchNews();
    loadGroundInfo();

    // QR Code Modal for Donate Button
    const donateBtn = document.getElementById('donate-btn');
    const qrModal = document.getElementById('qr-modal');
    const qrModalClose = document.getElementById('qr-modal-close');

    if (donateBtn && qrModal) {
        donateBtn.addEventListener('click', () => {
            qrModal.classList.add('active');
        });
    }

    if (qrModalClose) {
        qrModalClose.addEventListener('click', () => {
            qrModal.classList.remove('active');
        });
    }

    // Close QR modal when clicking outside
    if (qrModal) {
        qrModal.addEventListener('click', (e) => {
            if (e.target === qrModal) {
                qrModal.classList.remove('active');
            }
        });
    }

    // Player Detail Modal Logic
    const playerDetailModal = document.getElementById('player-detail-modal');
    const playerModalClose = document.getElementById('player-modal-close');

    if (playerDetailModal && playerModalClose) {
        playerModalClose.addEventListener('click', () => {
            playerDetailModal.classList.remove('active');
        });

        // Close player modal when clicking outside
        playerDetailModal.addEventListener('click', (e) => {
            if (e.target === playerDetailModal) {
                playerDetailModal.classList.remove('active');
            }
        });
    }
}); // End DOMContentLoaded
