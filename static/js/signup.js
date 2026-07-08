document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('collector-signup-form');
    const formState = document.getElementById('signup-form-state');
    const successState = document.getElementById('signup-success-state');
    const resetBtn = document.getElementById('btn-reset-form');
    const signupError = document.getElementById('signup-error');

    const fields = {
        name: document.getElementById('name'),
        email: document.getElementById('email'),
        phone: document.getElementById('phone'),
        artwork_interest: document.getElementById('artwork_interest'),
        story: document.getElementById('story'),
        schedule_followup: document.getElementById('schedule_followup')
    };

    const errors = {
        name: document.getElementById('error-name'),
        email: document.getElementById('error-email'),
        phone: document.getElementById('error-phone')
    };

    // ==========================================================================
    // Fetch and Populate Exhibition Artworks Dynamically
    // ==========================================================================
    async function loadActiveArtworks() {
        try {
            const response = await fetch('/api/artworks');
            if (response.ok) {
                const artworks = await response.json();
                
                // Clear dropdown except placeholder
                fields.artwork_interest.innerHTML = '<option value="" selected>Select artwork or interest level</option>';
                
                // Append active artworks
                artworks.forEach(art => {
                    if (art.status === 'Active') {
                        fields.artwork_interest.innerHTML += `<option value="${art.id}">${escapeHTML(art.title)}</option>`;
                    }
                });
                
                // Append fallback general options
                fields.artwork_interest.innerHTML += '<option value="Studio Visit Request">Request a Studio Visit</option>';
                fields.artwork_interest.innerHTML += '<option value="General Collection Interest">General Collection Interest</option>';
                
                // Restore draft value for artwork interest if it exists
                restoreDraftState();
            }
        } catch (err) {
            console.error('Failed to dynamically load artworks:', err);
        }
    }

    // ==========================================================================
    // Local Storage Autosave Draft System
    // ==========================================================================
    function saveDraftState() {
        const draftData = {
            name: fields.name.value.trim(),
            email: fields.email.value.trim(),
            phone: fields.phone.value.trim(),
            artwork_interest: fields.artwork_interest.value,
            story: fields.story.value.trim(),
            schedule_followup: fields.schedule_followup.checked
        };
        localStorage.setItem('signup_draft', JSON.stringify(draftData));
    }

    function restoreDraftState() {
        const draft = localStorage.getItem('signup_draft');
        if (!draft) return;
        try {
            const draftData = JSON.parse(draft);
            fields.name.value = draftData.name || '';
            fields.email.value = draftData.email || '';
            fields.phone.value = draftData.phone || '';
            
            // Set option if it exists in the dynamically loaded dropdown
            if (draftData.artwork_interest) {
                fields.artwork_interest.value = draftData.artwork_interest;
            }
            
            fields.story.value = draftData.story || '';
            fields.schedule_followup.checked = draftData.schedule_followup || false;
        } catch (err) {
            console.error('Failed to parse recovered signup draft:', err);
        }
    }

    // Bind inputs to trigger autosave drafts
    [fields.name, fields.email, fields.phone, fields.artwork_interest, fields.story, fields.schedule_followup].forEach(input => {
        if (input) {
            input.addEventListener('input', saveDraftState);
            input.addEventListener('change', saveDraftState);
        }
    });

    // Helper to validate email format
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // ==========================================================================
    // Form Submit Handler
    // ==========================================================================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset errors
        errors.name.style.display = 'none';
        errors.email.style.display = 'none';
        errors.phone.style.display = 'none';
        if (signupError) signupError.style.display = 'none';

        let hasError = false;

        // Validation
        const nameVal = fields.name.value.trim();
        if (!nameVal) {
            errors.name.style.display = 'block';
            hasError = true;
        }

        const emailVal = fields.email.value.trim();
        const phoneVal = fields.phone.value.trim();

        if (!phoneVal) {
            errors.phone.style.display = 'block';
            hasError = true;
        }

        if (emailVal && !isValidEmail(emailVal)) {
            errors.email.style.display = 'block';
            hasError = true;
        }

        if (hasError) {
            return;
        }

        // Determine follow-up status
        const followUpStatus = fields.schedule_followup.checked ? 'pending' : 'none';
        let followUpDate = null;
        if (fields.schedule_followup.checked) {
            const threeDaysLater = new Date();
            threeDaysLater.setDate(threeDaysLater.getDate() + 3);
            followUpDate = threeDaysLater.toISOString().split('T')[0];
        }

        // Parse artwork ID if numeric, otherwise send as general interest string
        const artInterestVal = fields.artwork_interest.value;
        const isNumeric = !isNaN(artInterestVal) && artInterestVal !== '';
        
        const payload = {
            name: nameVal,
            email: emailVal,
            phone: fields.phone.value.trim() || null,
            artwork_id: isNumeric ? parseInt(artInterestVal) : null,
            artwork_interest: isNumeric ? null : (artInterestVal || 'General Interest'),
            story: fields.story.value.trim() || null,
            follow_up_status: followUpStatus,
            follow_up_date: followUpDate,
            source: 'QR Visitor',
            notes: fields.schedule_followup.checked ? 'Requested follow-up from visitor signup page.' : null
        };

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Recording...';

        try {
            const response = await fetch('/api/collectors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Success - Clear local draft
                localStorage.removeItem('signup_draft');
                
                // Transition states
                formState.style.display = 'none';
                successState.style.display = 'block';
                form.reset();
            } else {
                const errData = await response.json();
                if (signupError) {
                    signupError.textContent = errData.error || 'Failed to submit. Please check the fields.';
                    signupError.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Submission failed:', error);
            if (signupError) {
                signupError.textContent = 'Connection failed. Please check your network and try again.';
                signupError.style.display = 'block';
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });

    // Reset handler to allow another submission
    resetBtn.addEventListener('click', () => {
        successState.style.display = 'none';
        formState.style.display = 'block';
        fields.name.focus();
    });

    // Utility escape html
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
    // Title swapping animation ("Remember the Moment" / "Moments to be Remembered")
    // ==========================================================================
    const titleEl = document.getElementById('signup-title-text');
    if (titleEl) {
        const titles = ["Remember the<br>Moment", "Moments to be<br>Remembered"];
        let titleIdx = 0;
        setInterval(() => {
            titleEl.classList.add('fade-out');
            setTimeout(() => {
                titleIdx = (titleIdx + 1) % titles.length;
                titleEl.innerHTML = titles[titleIdx];
                titleEl.classList.remove('fade-out');
            }, 1200); // Wait for 1.2s fade-out transition to complete (1200ms)
        }, 10000); // Swap every 10 seconds
    }

    // ==========================================================================
    // Initializer call
    // ==========================================================================
    loadActiveArtworks();
});
