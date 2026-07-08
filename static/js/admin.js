document.addEventListener('DOMContentLoaded', () => {
    // State cache
    let collectors = [];
    let artworks = [];
    let events = [];
    let staffList = [];
    
    let selectedCollectorId = null;
    let currentFilterStatus = 'all';
    
    // Flag to bypass duplicate warning
    let bypassDuplicateWarning = false;

    // ==========================================================================
    // DOM Element References
    // ==========================================================================
    const collectorsContainer = document.getElementById('collectors-container');
    const searchInput = document.getElementById('search-input');
    const filterTags = document.querySelectorAll('.filter-tag');
    
    // Layout Sections
    const listSection = document.getElementById('list-section');
    const btnBackToList = document.getElementById('btn-back-to-list');
    
    // Relational Filters
    const filterArtwork = document.getElementById('filter-artwork');
    const filterEvent = document.getElementById('filter-event');
    const filterStaff = document.getElementById('filter-staff');
    
    // Stats (Dashboard and Collectors)
    const dashStatTotal = document.getElementById('dash-stat-total');
    const dashStatPending = document.getElementById('dash-stat-pending');
    const dashStatInterests = document.getElementById('dash-stat-interests');
    
    // Detail Panel Elements
    const detailPanel = document.getElementById('detail-panel');
    const detailPlaceholder = document.getElementById('detail-panel-placeholder');
    const detailName = document.getElementById('detail-name');
    const detailDateLabel = document.getElementById('detail-date-label');
    const detailEmail = document.getElementById('detail-email');
    const detailPhone = document.getElementById('detail-phone');
    const detailSource = document.getElementById('detail-source');
    const detailStorySection = document.getElementById('detail-story-section');
    const detailStory = document.getElementById('detail-story');
    
    // Detail Edit Fields
    const editInterestLevel = document.getElementById('edit-interest-level');
    const editStatus = document.getElementById('edit-status');
    const editArtwork = document.getElementById('edit-artwork');
    const editEvent = document.getElementById('edit-event');
    const editStaff = document.getElementById('edit-staff');
    const editFollowupStatus = document.getElementById('edit-followup-status');
    const editFollowupDate = document.getElementById('edit-followup-date');
    const editNextAction = document.getElementById('edit-next-action');
    const editNotes = document.getElementById('edit-notes');
    
    // Action Buttons
    const btnSaveDetails = document.getElementById('btn-save-details');
    const btnDeleteCollector = document.getElementById('btn-delete-collector');
    const btnLogout = document.getElementById('btn-logout');
    
    // Modals
    const modalAdd = document.getElementById('modal-add');
    const modalQr = document.getElementById('modal-qr');
    const btnShowQr = document.getElementById('btn-show-qr');
    const btnAddCollector = document.getElementById('btn-add-collector');
    const closeBtns = document.querySelectorAll('.modal-close-btn, .btn-close-modal');
    
    // Add Form Elements
    const addForm = document.getElementById('admin-add-form');
    const addNameInput = document.getElementById('add-name');
    const addEmailInput = document.getElementById('add-email');
    const addPhoneInput = document.getElementById('add-phone');
    const addArtworkSelect = document.getElementById('add-artwork');
    const addStoryInput = document.getElementById('add-story');
    const addNotesInput = document.getElementById('add-notes');
    const addErrorName = document.getElementById('add-error-name');
    const addErrorEmail = document.getElementById('add-error-email');
    
    // Add Form Relational Fields (Desktop / Mobile sync)
    const addInterestSelect = document.getElementById('add-interest-level');
    const addInterestSelectMobile = document.getElementById('add-interest-level-mobile');
    const addStatusSelect = document.getElementById('add-status');
    const addStatusSelectMobile = document.getElementById('add-status-mobile');
    const addEventSelect = document.getElementById('add-event');
    const addEventSelectMobile = document.getElementById('add-event-mobile');
    const addStaffSelect = document.getElementById('add-staff');
    const addStaffSelectMobile = document.getElementById('add-staff-mobile');
    const addFollowupDateInput = document.getElementById('add-followup-date');
    const addFollowupDateInputMobile = document.getElementById('add-followup-date-mobile');
    const addNextActionInput = document.getElementById('add-next-action');
    const addNextActionInputMobile = document.getElementById('add-next-action-mobile');
    
    // Duplicate warning modal elements
    const duplicateWarningOverlay = document.getElementById('modal-add-duplicate-warning');
    const duplicateWarningText = document.getElementById('duplicate-warning-text');
    const btnDuplicateOverride = document.getElementById('btn-duplicate-override');
    const btnDuplicateCancel = document.getElementById('btn-duplicate-cancel');

    // ==========================================================================
    // Quiet Toast Notifications Helper
    // ==========================================================================
    function showToast(message) {
        let toast = document.getElementById('toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-notification';
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // ==========================================================================
    // Tab Navigation Logic
    // ==========================================================================
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-content-pane');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetPaneId = link.dataset.tab;
            
            tabLinks.forEach(l => l.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            link.classList.add('active');
            document.getElementById(targetPaneId).classList.add('active');
            
            // Trigger specific pane loads
            if (targetPaneId === 'pane-dashboard') {
                syncDashboardView();
            } else if (targetPaneId === 'pane-collectors') {
                loadCollectors();
            } else if (targetPaneId === 'pane-artwork') {
                loadArtworksTab();
            } else if (targetPaneId === 'pane-events') {
                loadEventsTab();
            } else if (targetPaneId === 'pane-staff') {
                loadStaffTab();
            }
        });
    });

    // ==========================================================================
    // Fetch Relational Options (Artworks, Events, Staff)
    // ==========================================================================
    async function loadArtworkLibrary() {
        try {
            const res = await fetch('/api/artworks');
            if (res.ok) {
                artworks = await res.json();
                populateArtworkDropdowns();
            }
        } catch (err) {
            console.error('Failed to load artworks library:', err);
        }
    }

    async function loadEventsLibrary() {
        try {
            const res = await fetch('/api/events');
            if (res.ok) {
                events = await res.json();
                populateEventDropdowns();
            }
        } catch (err) {
            console.error('Failed to load events library:', err);
        }
    }

    async function loadStaffLibrary() {
        try {
            const res = await fetch('/api/staff');
            if (res.ok) {
                staffList = await res.json();
                populateStaffDropdowns();
            }
        } catch (err) {
            console.error('Failed to load staff library:', err);
        }
    }

    // Populate drop down menus dynamically
    function populateArtworkDropdowns() {
        // Collectors Edit Dropdown
        editArtwork.innerHTML = '<option value="">Select Artwork</option>';
        // Collectors Filter Dropdown
        filterArtwork.innerHTML = '<option value="">Filter by Artwork</option>';
        // Register Collector Dropdown
        addArtworkSelect.innerHTML = '<option value="" selected>Select Artwork</option>';

        artworks.forEach(art => {
            const opt = `<option value="${art.id}">${escapeHTML(art.title)}</option>`;
            editArtwork.innerHTML += opt;
            filterArtwork.innerHTML += opt;
            addArtworkSelect.innerHTML += opt;
        });
    }

    function populateEventDropdowns() {
        editEvent.innerHTML = '<option value="">Select Event</option>';
        filterEvent.innerHTML = '<option value="">Filter by Event</option>';
        addEventSelect.innerHTML = '<option value="" selected>Select Event</option>';
        addEventSelectMobile.innerHTML = '<option value="" selected>Select Event</option>';

        events.forEach(ev => {
            const opt = `<option value="${ev.id}">${escapeHTML(ev.name)}</option>`;
            editEvent.innerHTML += opt;
            filterEvent.innerHTML += opt;
            addEventSelect.innerHTML += opt;
            addEventSelectMobile.innerHTML += opt;
        });
    }

    function populateStaffDropdowns() {
        editStaff.innerHTML = '<option value="">Select Staff</option>';
        filterStaff.innerHTML = '<option value="">Filter by Staff</option>';
        addStaffSelect.innerHTML = '<option value="" selected>Select Team Member</option>';
        addStaffSelectMobile.innerHTML = '<option value="" selected>Select Team Member</option>';

        staffList.forEach(st => {
            if (st.active) {
                const opt = `<option value="${st.id}">${escapeHTML(st.name)}</option>`;
                editStaff.innerHTML += opt;
                filterStaff.innerHTML += opt;
                addStaffSelect.innerHTML += opt;
                addStaffSelectMobile.innerHTML += opt;
            }
        });
    }

    // Relational filter change triggers
    [filterArtwork, filterEvent, filterStaff].forEach(select => {
        select.addEventListener('change', () => {
            renderCollectorsList();
        });
    });

    // ==========================================================================
    // Fetch and Sync Collectors
    // ==========================================================================
    async function loadCollectors() {
        try {
            const response = await fetch('/api/collectors');
            if (response.status === 401) {
                window.location.reload();
                return;
            }
            if (response.ok) {
                collectors = await response.json();
                renderCollectorsList();
                updateStats();
                
                // Keep selected collector active on refresh
                if (selectedCollectorId) {
                    const updatedCollector = collectors.find(c => c.id === selectedCollectorId);
                    if (updatedCollector) {
                        showDetailPanel(updatedCollector);
                    } else {
                        hideDetailPanel();
                    }
                }
            } else {
                showToast('Failed to load database.');
            }
        } catch (err) {
            console.error('Error fetching collectors:', err);
            showToast('Connection failed.');
        }
    }

    function renderCollectorsList() {
        const query = searchInput.value.toLowerCase().trim();
        const artVal = filterArtwork.value;
        const evVal = filterEvent.value;
        const stVal = filterStaff.value;
        
        const filtered = collectors.filter(c => {
            // Status Tag Filter
            if (currentFilterStatus !== 'all') {
                if (c.status !== currentFilterStatus) {
                    return false;
                }
            }
            
            // Relational Filters
            if (artVal && String(c.artwork_id) !== String(artVal)) return false;
            if (evVal && String(c.event_id) !== String(evVal)) return false;
            if (stVal && String(c.staff_id) !== String(stVal)) return false;
            
            // Search Query
            if (query) {
                const name = (c.name || '').toLowerCase();
                const email = (c.email || '').toLowerCase();
                const phone = (c.phone || '').toLowerCase();
                const artTitle = (c.artwork_title || '').toLowerCase();
                const evName = (c.event_name || '').toLowerCase();
                const stName = (c.staff_name || '').toLowerCase();
                const story = (c.story || '').toLowerCase();
                const notes = (c.notes || '').toLowerCase();
                const nextAction = (c.next_action || '').toLowerCase();
                
                return name.includes(query) || email.includes(query) || phone.includes(query) || 
                       artTitle.includes(query) || evName.includes(query) || stName.includes(query) ||
                       story.includes(query) || notes.includes(query) || nextAction.includes(query);
            }
            return true;
        });

        collectorsContainer.innerHTML = '';

        if (filtered.length === 0) {
            collectorsContainer.innerHTML = `<div class="empty-state">No collectors found matching the criteria.</div>`;
            return;
        }

        filtered.forEach(c => {
            const row = document.createElement('div');
            row.className = `collector-row ${selectedCollectorId === c.id ? 'active' : ''}`;
            row.dataset.id = c.id;
            
            let formattedDate = '—';
            if (c.created_at) {
                const date = new Date(c.created_at.replace(/-/g, '/'));
                formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }

            let badgeClass = 'badge-pending';
            let statusLabel = c.status || 'New';
            if (c.status === 'Active') {
                badgeClass = 'badge-done';
            } else if (c.status === 'Contacted') {
                badgeClass = 'badge-pending';
            } else if (c.status === 'Inactive') {
                badgeClass = 'badge-cancelled';
            }

            row.innerHTML = `
                <div class="col-identity">
                    <span class="col-name">${escapeHTML(c.name)}</span>
                    <span class="col-email">${escapeHTML(c.email)}</span>
                </div>
                <div class="col-interest hide-mobile">${escapeHTML(c.artwork_title || c.artwork_interest || 'General')}</div>
                <div class="col-date hide-mobile">${formattedDate}</div>
                <div class="col-status">
                    <span class="badge ${badgeClass}">${statusLabel}</span>
                </div>
            `;

            row.addEventListener('click', () => {
                document.querySelectorAll('.collector-row').forEach(r => r.classList.remove('active'));
                row.classList.add('active');
                selectedCollectorId = c.id;
                showDetailPanel(c);
            });

            collectorsContainer.appendChild(row);
        });
    }

    function updateStats() {
        const total = collectors.length;
        const pendingCount = collectors.filter(c => c.follow_up_status === 'pending').length;
        
        // Count interest in specific artworks (not general)
        const interestCount = collectors.filter(c => c.artwork_id !== null).length;
        
        // Populate dashboard stats
        dashStatTotal.textContent = total;
        dashStatPending.textContent = pendingCount;
        dashStatInterests.textContent = interestCount;
    }

    function showDetailPanel(c) {
        detailPlaceholder.style.display = 'none';
        detailPanel.style.display = 'block';

        if (window.innerWidth < 768) {
            listSection.classList.add('mobile-hidden');
            detailPanel.classList.remove('mobile-hidden');
        }

        detailName.textContent = c.name;
        
        let formattedDate = '—';
        if (c.created_at) {
            const date = new Date(c.created_at.replace(/-/g, '/'));
            formattedDate = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        detailDateLabel.textContent = `Met on ${formattedDate}`;

        detailEmail.textContent = c.email;
        detailEmail.href = `mailto:${c.email}`;
        
        detailPhone.textContent = c.phone || 'No phone recorded';
        detailSource.textContent = c.source || 'Staff Input';

        if (c.story) {
            detailStorySection.style.display = 'block';
            detailStory.textContent = `“${c.story}”`;
        } else {
            detailStorySection.style.display = 'none';
        }

        // Set edits bindings
        editInterestLevel.value = c.interest_level || 'Curious';
        editStatus.value = c.status || 'New';
        editArtwork.value = c.artwork_id || '';
        editEvent.value = c.event_id || '';
        editStaff.value = c.staff_id || '';
        editFollowupStatus.value = c.follow_up_status || 'none';
        editFollowupDate.value = c.follow_up_date || '';
        editNextAction.value = c.next_action || '';
        editNotes.value = c.notes || '';
    }

    function hideDetailPanel() {
        detailPanel.style.display = 'none';
        detailPlaceholder.style.display = 'flex';
        selectedCollectorId = null;
        document.querySelectorAll('.collector-row').forEach(r => r.classList.remove('active'));

        if (window.innerWidth < 768) {
            listSection.classList.remove('mobile-hidden');
            detailPanel.classList.add('mobile-hidden');
        }
    }

    if (btnBackToList) {
        btnBackToList.addEventListener('click', hideDetailPanel);
    }

    // Resize listeners
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            listSection.classList.remove('mobile-hidden');
            if (selectedCollectorId) {
                detailPanel.style.display = 'block';
                detailPlaceholder.style.display = 'none';
            } else {
                detailPanel.style.display = 'none';
                detailPlaceholder.style.display = 'flex';
            }
        } else {
            if (selectedCollectorId) {
                listSection.classList.add('mobile-hidden');
                detailPanel.style.display = 'block';
                detailPlaceholder.style.display = 'none';
            } else {
                listSection.classList.remove('mobile-hidden');
                detailPanel.style.display = 'none';
                detailPlaceholder.style.display = 'none';
            }
        }
    });

    // ==========================================================================
    // Save/Update Details
    // ==========================================================================
    btnSaveDetails.addEventListener('click', async () => {
        if (!selectedCollectorId) return;

        const payload = {
            interest_level: editInterestLevel.value,
            status: editStatus.value,
            artwork_id: editArtwork.value ? parseInt(editArtwork.value) : null,
            event_id: editEvent.value ? parseInt(editEvent.value) : null,
            staff_id: editStaff.value ? parseInt(editStaff.value) : null,
            follow_up_status: editFollowupStatus.value,
            follow_up_date: editFollowupDate.value || null,
            next_action: editNextAction.value.trim() || null,
            notes: editNotes.value.trim() || null
        };

        const originalBtnText = btnSaveDetails.textContent;
        btnSaveDetails.disabled = true;
        btnSaveDetails.textContent = 'Saving...';

        try {
            const response = await fetch(`/api/collectors/${selectedCollectorId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showToast('Changes saved.');
                await loadCollectors();
            } else {
                const errData = await response.json();
                showToast(errData.error || 'Save failed.');
            }
        } catch (err) {
            console.error('Failed to update details:', err);
            showToast('Connection failed.');
        } finally {
            btnSaveDetails.disabled = false;
            btnSaveDetails.textContent = originalBtnText;
        }
    });

    // ==========================================================================
    // Delete Collector
    // ==========================================================================
    btnDeleteCollector.addEventListener('click', async () => {
        if (!selectedCollectorId) return;

        const activeCollector = collectors.find(c => c.id === selectedCollectorId);
        const confirmMsg = `Are you sure you want to permanently delete ${activeCollector.name}? This action cannot be undone.`;
        
        if (!confirm(confirmMsg)) return;

        btnDeleteCollector.disabled = true;

        try {
            const response = await fetch(`/api/collectors/${selectedCollectorId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('Collector deleted.');
                hideDetailPanel();
                await loadCollectors();
            } else {
                showToast('Delete failed.');
            }
        } catch (err) {
            console.error('Delete error:', err);
            showToast('Delete failed.');
        } finally {
            btnDeleteCollector.disabled = false;
        }
    });

    // Search and Status Filters
    searchInput.addEventListener('input', renderCollectorsList);

    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            currentFilterStatus = tag.dataset.status;
            renderCollectorsList();
        });
    });

    // ==========================================================================
    // Dashboard Sync View
    // ==========================================================================
    async function syncDashboardView() {
        try {
            // Load fresh records
            const response = await fetch('/api/collectors');
            if (response.ok) {
                collectors = await response.json();
                updateStats();
                
                // 1. Render Followups
                const followupsDiv = document.getElementById('dashboard-followups');
                const pendingFollowups = collectors
                    .filter(c => c.follow_up_status === 'pending' && c.follow_up_date)
                    .sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date))
                    .slice(0, 5);
                    
                followupsDiv.innerHTML = '';
                if (pendingFollowups.length === 0) {
                    followupsDiv.innerHTML = '<div class="empty-state">No upcoming follow-ups.</div>';
                } else {
                    pendingFollowups.forEach(f => {
                        const date = new Date(f.follow_up_date.replace(/-/g, '/')).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        followupsDiv.innerHTML += `
                            <div class="activity-item" style="cursor:pointer;" onclick="document.querySelector('[data-tab=pane-collectors]').click(); setTimeout(() => { document.querySelector('[data-id=\\'${f.id}\\']').click(); }, 150);">
                                <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                                    <strong>${escapeHTML(f.name)}</strong>
                                    <span style="color:var(--accent-gold); font-size:0.75rem;">${date}</span>
                                </div>
                                <div style="color:var(--text-secondary); font-size:0.8rem;">
                                    Next: ${escapeHTML(f.next_action || 'Follow up')}
                                </div>
                            </div>
                        `;
                    });
                }
                
                // 2. Render Recent Activity
                const recentDiv = document.getElementById('dashboard-recent');
                const recentCollectors = collectors.slice(0, 5);
                recentDiv.innerHTML = '';
                if (recentCollectors.length === 0) {
                    recentDiv.innerHTML = '<div class="empty-state">No recent collectors.</div>';
                } else {
                    recentCollectors.forEach(rc => {
                        let createdText = 'Recently';
                        if (rc.created_at) {
                            const date = new Date(rc.created_at.replace(/-/g, '/'));
                            createdText = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        }
                        recentDiv.innerHTML += `
                            <div class="activity-item" style="cursor:pointer;" onclick="document.querySelector('[data-tab=pane-collectors]').click(); setTimeout(() => { document.querySelector('[data-id=\\'${rc.id}\\']').click(); }, 150);">
                                <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                                    <strong>${escapeHTML(rc.name)}</strong>
                                    <span style="color:var(--text-muted); font-size:0.75rem;">${createdText}</span>
                                </div>
                                <div style="color:var(--text-secondary); font-size:0.8rem;">
                                    Interest in: ${escapeHTML(rc.artwork_title || rc.artwork_interest || 'General')}
                                </div>
                            </div>
                        `;
                    });
                }
            }
        } catch (err) {
            console.error('Failed to sync dashboard view:', err);
        }
    }

    // ==========================================================================
    // Artwork Library Tab
    // ==========================================================================
    const artworkAddForm = document.getElementById('artwork-add-form');
    const artworkListContainer = document.getElementById('artwork-list-container');
    
    async function loadArtworksTab() {
        await loadArtworkLibrary();
        renderArtworkLibraryList();
    }
    
    function renderArtworkLibraryList() {
        artworkListContainer.innerHTML = '';
        if (artworks.length === 0) {
            artworkListContainer.innerHTML = '<div class="empty-state">No artworks registered.</div>';
            return;
        }
        artworks.forEach(art => {
            const item = document.createElement('div');
            item.className = 'entity-grid-item';
            
            const priceLabel = art.price ? `€${art.price.toLocaleString()}` : 'Price on request';
            const catLabel = art.category ? ` • ${art.category}` : '';
            
            item.innerHTML = `
                <div>
                    <strong>${escapeHTML(art.title)}</strong>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        ${priceLabel}${catLabel}
                    </div>
                </div>
                <div style="display:flex; gap:1rem; align-items:center;">
                    <div class="select-wrapper" style="min-width:120px;">
                        <select class="art-status-select" data-id="${art.id}" style="padding: 0.3rem 0.5rem; font-size: 0.7rem;">
                            <option value="Available" ${art.availability === 'Available' ? 'selected' : ''}>Available</option>
                            <option value="Adopted" ${art.availability === 'Adopted' ? 'selected' : ''}>Adopted</option>
                            <option value="Sold" ${art.availability === 'Sold' ? 'selected' : ''}>Sold</option>
                            <option value="Reserved" ${art.availability === 'Reserved' ? 'selected' : ''}>Reserved</option>
                        </select>
                    </div>
                </div>
            `;
            
            // Bind status change directly
            item.querySelector('.art-status-select').addEventListener('change', async (e) => {
                const availability = e.target.value;
                try {
                    const res = await fetch(`/api/artworks/${art.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ availability })
                    });
                    if (res.ok) {
                        showToast('Artwork availability updated.');
                        loadArtworkLibrary(); // reload cache
                    }
                } catch (err) {
                    console.error('Failed to update artwork status:', err);
                }
            });
            
            artworkListContainer.appendChild(item);
        });
    }
    
    artworkAddForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('art-title');
        const catInput = document.getElementById('art-category');
        const priceInput = document.getElementById('art-price');
        const availSelect = document.getElementById('art-availability');
        
        const title = titleInput.value.trim();
        if (!title) return;
        
        const payload = {
            title,
            category: catInput.value.trim() || null,
            price: priceInput.value ? parseFloat(priceInput.value) : null,
            availability: availSelect.value
        };
        
        const submitBtn = artworkAddForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        
        try {
            const res = await fetch('/api/artworks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showToast('Artwork added.');
                artworkAddForm.reset();
                await loadArtworksTab();
            }
        } catch (err) {
            console.error(err);
        } finally {
            submitBtn.disabled = false;
        }
    });

    // ==========================================================================
    // Events Tab
    // ==========================================================================
    const eventAddForm = document.getElementById('event-add-form');
    const eventsListContainer = document.getElementById('events-list-container');
    
    async function loadEventsTab() {
        await loadEventsLibrary();
        renderEventsTabList();
    }
    
    function renderEventsTabList() {
        eventsListContainer.innerHTML = '';
        if (events.length === 0) {
            eventsListContainer.innerHTML = '<div class="empty-state">No events registered.</div>';
            return;
        }
        events.forEach(ev => {
            const item = document.createElement('div');
            item.className = 'entity-grid-item';
            item.innerHTML = `
                <strong>${escapeHTML(ev.name)}</strong>
                <span style="font-size:0.75rem; color:var(--text-muted);">Event ID: ${ev.id}</span>
            `;
            eventsListContainer.appendChild(item);
        });
    }
    
    eventAddForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('event-name');
        const name = nameInput.value.trim();
        if (!name) return;
        
        const submitBtn = eventAddForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        
        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                showToast('Event created.');
                nameInput.value = '';
                await loadEventsTab();
            }
        } catch (err) {
            console.error(err);
        } finally {
            submitBtn.disabled = false;
        }
    });

    // ==========================================================================
    // Staff Tab
    // ==========================================================================
    const staffAddForm = document.getElementById('staff-add-form');
    const staffListContainer = document.getElementById('staff-list-container');
    
    async function loadStaffTab() {
        await loadStaffLibrary();
        renderStaffTabList();
    }
    
    function renderStaffTabList() {
        staffListContainer.innerHTML = '';
        if (staffList.length === 0) {
            staffListContainer.innerHTML = '<div class="empty-state">No team members registered.</div>';
            return;
        }
        staffList.forEach(st => {
            const item = document.createElement('div');
            item.className = 'entity-grid-item';
            
            const emailText = st.email ? ` • ${escapeHTML(st.email)}` : '';
            
            item.innerHTML = `
                <div>
                    <strong>${escapeHTML(st.name)}</strong>
                    <span style="font-size:0.75rem; color:var(--text-secondary);">${emailText}</span>
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <label style="font-size:0.7rem; color:var(--text-secondary); cursor:pointer;">
                        <input type="checkbox" class="staff-toggle-active" data-id="${st.id}" ${st.active ? 'checked' : ''} style="margin-right:0.25rem;">
                        Active
                    </label>
                </div>
            `;
            
            // Toggle staff active state
            item.querySelector('.staff-toggle-active').addEventListener('change', async (e) => {
                const active = e.target.checked ? 1 : 0;
                try {
                    const res = await fetch(`/api/staff/${st.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ active })
                    });
                    if (res.ok) {
                        showToast('Staff status updated.');
                        loadStaffLibrary(); // reload cache
                    }
                } catch (err) {
                    console.error('Failed to update staff status:', err);
                }
            });
            
            staffListContainer.appendChild(item);
        });
    }
    
    staffAddForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('staff-name');
        const emailInput = document.getElementById('staff-email');
        const name = nameInput.value.trim();
        if (!name) return;
        
        const submitBtn = staffAddForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        
        try {
            const res = await fetch('/api/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email: emailInput.value.trim() || null })
            });
            if (res.ok) {
                showToast('Team member added.');
                staffAddForm.reset();
                await loadStaffTab();
            }
        } catch (err) {
            console.error(err);
        } finally {
            submitBtn.disabled = false;
        }
    });

    // ==========================================================================
    // Logout Handler
    // ==========================================================================
    btnLogout.addEventListener('click', async () => {
        try {
            const response = await fetch('/admin/logout', { method: 'POST' });
            if (response.ok) {
                window.location.reload();
            }
        } catch (err) {
            console.error('Logout error:', err);
        }
    });

    // ==========================================================================
    // Modals Control
    // ==========================================================================
    function openModal(modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        document.body.style.overflow = '';
        
        // Reset Add form validations & warning overlays
        addErrorName.style.display = 'none';
        addErrorEmail.style.display = 'none';
        duplicateWarningOverlay.style.display = 'none';
        bypassDuplicateWarning = false;
    }

    btnShowQr.addEventListener('click', () => {
        const signupUrl = window.location.origin + '/';
        const displayUrl = document.getElementById('qr-display-url');
        displayUrl.textContent = signupUrl;
        displayUrl.href = signupUrl;

        try {
            const qr = qrcode(0, 'M');
            qr.addData(signupUrl);
            qr.make();
            document.getElementById('qr-canvas-placeholder').innerHTML = qr.createSvgTag(6, 12);
        } catch (err) {
            console.error('Failed to generate QR code SVG:', err);
            document.getElementById('qr-canvas-placeholder').innerHTML = `<p style="color: var(--error-color);">Failed to render QR Code</p>`;
        }

        openModal(modalQr);
    });

    btnAddCollector.addEventListener('click', () => {
        addForm.reset();
        
        // Apply default followup date: 3 days out
        const threeDaysLater = new Date();
        threeDaysLater.setDate(threeDaysLater.getDate() + 3);
        const defaultDate = threeDaysLater.toISOString().split('T')[0];
        addFollowupDateInput.value = defaultDate;
        addFollowupDateInputMobile.value = defaultDate;
        
        // Restore autosave drafts if present
        const draft = localStorage.getItem('admin_collector_draft');
        if (draft) {
            try {
                const draftData = JSON.parse(draft);
                addNameInput.value = draftData.name || '';
                addEmailInput.value = draftData.email || '';
                addPhoneInput.value = draftData.phone || '';
                addArtworkSelect.value = draftData.artwork_id || '';
                
                // Desktop fields
                addInterestSelect.value = draftData.interest_level || 'Interested';
                addStatusSelect.value = draftData.status || 'Active';
                addEventSelect.value = draftData.event_id || '';
                addStaffSelect.value = draftData.staff_id || '';
                addFollowupDateInput.value = draftData.follow_up_date || defaultDate;
                addNextActionInput.value = draftData.next_action || '';
                
                // Mobile fields
                addInterestSelectMobile.value = draftData.interest_level || 'Interested';
                addStatusSelectMobile.value = draftData.status || 'Active';
                addEventSelectMobile.value = draftData.event_id || '';
                addStaffSelectMobile.value = draftData.staff_id || '';
                addFollowupDateInputMobile.value = draftData.follow_up_date || defaultDate;
                addNextActionInputMobile.value = draftData.next_action || '';
                
                addStoryInput.value = draftData.story || '';
                addNotesInput.value = draftData.notes || '';
            } catch (err) {
                console.error('Failed to restore admin collector draft:', err);
            }
        }
        
        openModal(modalAdd);
        setTimeout(() => addNameInput.focus(), 150);
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // ==========================================================================
    // Autosave draft handler for Add Collector Form
    // ==========================================================================
    function saveAdminFormDraft() {
        const isMobileVisible = window.getComputedStyle(addInterestSelectMobile).display !== 'none';
        
        const draftData = {
            name: addNameInput.value.trim(),
            email: addEmailInput.value.trim(),
            phone: addPhoneInput.value.trim(),
            artwork_id: addArtworkSelect.value,
            interest_level: isMobileVisible ? addInterestSelectMobile.value : addInterestSelect.value,
            status: isMobileVisible ? addStatusSelectMobile.value : addStatusSelect.value,
            event_id: isMobileVisible ? addEventSelectMobile.value : addEventSelect.value,
            staff_id: isMobileVisible ? addStaffSelectMobile.value : addStaffSelect.value,
            follow_up_date: isMobileVisible ? addFollowupDateInputMobile.value : addFollowupDateInput.value,
            next_action: isMobileVisible ? addNextActionInputMobile.value : addNextActionInput.value,
            story: addStoryInput.value.trim(),
            notes: addNotesInput.value.trim()
        };
        
        localStorage.setItem('admin_collector_draft', JSON.stringify(draftData));
    }

    // Bind inputs to save drafts
    const allDraftInputs = [
        addNameInput, addEmailInput, addPhoneInput, addArtworkSelect,
        addInterestSelect, addInterestSelectMobile, addStatusSelect, addStatusSelectMobile,
        addEventSelect, addEventSelectMobile, addStaffSelect, addStaffSelectMobile,
        addFollowupDateInput, addFollowupDateInputMobile, addNextActionInput, addNextActionInputMobile,
        addStoryInput, addNotesInput
    ];
    allDraftInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', saveAdminFormDraft);
            input.addEventListener('change', saveAdminFormDraft);
        }
    });

    // ==========================================================================
    // Register Collector Form Submission (with duplicate checks loop)
    // ==========================================================================
    async function submitCollectorForm() {
        addErrorName.style.display = 'none';
        addErrorEmail.style.display = 'none';

        let hasError = false;

        const name = addNameInput.value.trim();
        if (!name) {
            addErrorName.style.display = 'block';
            hasError = true;
        }

        const email = addEmailInput.value.trim();
        const phone = addPhoneInput.value.trim();
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!phone) {
            showToast('Please enter a phone number.');
            hasError = true;
        } else if (email && !emailRe.test(email)) {
            addErrorEmail.style.display = 'block';
            hasError = true;
        }

        if (hasError) return;

        const submitBtn = addForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';

        // Responsive layout fallback
        const isMobileVisible = window.getComputedStyle(addInterestSelectMobile).display !== 'none';

        const payload = {
            name,
            email,
            phone: addPhoneInput.value.trim() || null,
            artwork_id: addArtworkSelect.value ? parseInt(addArtworkSelect.value) : null,
            interest_level: isMobileVisible ? addInterestSelectMobile.value : addInterestSelect.value,
            status: isMobileVisible ? addStatusSelectMobile.value : addStatusSelect.value,
            event_id: isMobileVisible ? (addEventSelectMobile.value ? parseInt(addEventSelectMobile.value) : null) : (addEventSelect.value ? parseInt(addEventSelect.value) : null),
            staff_id: isMobileVisible ? (addStaffSelectMobile.value ? parseInt(addStaffSelectMobile.value) : null) : (addStaffSelect.value ? parseInt(addStaffSelect.value) : null),
            follow_up_date: isMobileVisible ? (addFollowupDateInputMobile.value || null) : (addFollowupDateInput.value || null),
            next_action: isMobileVisible ? (addNextActionInputMobile.value.trim() || null) : (addNextActionInput.value.trim() || null),
            story: addStoryInput.value.trim() || null,
            notes: addNotesInput.value.trim() || null,
            follow_up_status: 'pending',
            source: 'Staff Input',
            force: bypassDuplicateWarning
        };

        try {
            const response = await fetch('/api/collectors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                
                // Success - Clear local draft
                localStorage.removeItem('admin_collector_draft');
                
                closeModal();
                selectedCollectorId = result.id; 
                showToast('Collector saved.');
                
                // If on directory view, reload
                if (document.getElementById('pane-collectors').classList.contains('active')) {
                    await loadCollectors();
                } else {
                    // Navigate to collectors tab and select
                    document.querySelector('[data-tab=pane-collectors]').click();
                }
            } else if (response.status === 409) {
                const errData = await response.json();
                if (errData.warning === 'duplicate') {
                    // Trigger warning dialog
                    duplicateWarningText.textContent = `A duplicate record was detected: ${errData.collector.name} (${errData.collector.email}) is already registered.`;
                    duplicateWarningOverlay.style.display = 'block';
                    
                    // Reset override button action
                    btnDuplicateOverride.onclick = async () => {
                        bypassDuplicateWarning = true;
                        duplicateWarningOverlay.style.display = 'none';
                        await submitCollectorForm();
                    };
                } else {
                    showToast(errData.message || 'Validation conflict.');
                }
            } else {
                const errData = await response.json();
                showToast(errData.error || 'Failed to save.');
            }
        } catch (err) {
            console.error('Submit error:', err);
            showToast('Connection failed.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitCollectorForm();
    });

    btnDuplicateCancel.addEventListener('click', () => {
        duplicateWarningOverlay.style.display = 'none';
        const submitBtn = addForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
    });

    // ==========================================================================
    // Utility functions
    // ==========================================================================
    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ==========================================================================
    // Initializer calls
    // ==========================================================================
    // Load cached entities collections
    loadArtworkLibrary();
    loadEventsLibrary();
    loadStaffLibrary();
    
    // Check initial active view
    const initialActiveTab = document.querySelector('.tab-link.active');
    if (initialActiveTab && initialActiveTab.dataset.tab === 'pane-dashboard') {
        syncDashboardView();
    } else {
        loadCollectors();
    }
});
