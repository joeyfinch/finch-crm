document.addEventListener('DOMContentLoaded', () => {
    // 1. Create container if it doesn't exist
    let container = document.querySelector('.floating-bg-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'floating-bg-container';
        document.body.appendChild(container);
    }

    // 2. Optimized WebP Artworks list
    const artworks = [
        { file: "dirty_angels.webp" },
        { file: "birdview.webp" },
        { file: "mono.webp" },
        { file: "jezus_my_buddy.webp" },
        { file: "the_itch.webp" },
        { file: "the_offering.webp" },
        { file: "inshallah.webp" },
        { file: "alien_invasion_haarlem.webp" },
        { file: "virtual_insanity.webp" }
    ];

    const maxOpacity = 0.40; // Ambient opacity
    const numCards = 8;      // Roster density
    const baseSpeed = 0.00095; // Base flight speed
    const cards = [];

    // Helper to get an artwork index that is not currently visible on any card
    function getUniqueArtIndex(excludeIndices) {
        const available = [];
        for (let i = 0; i < artworks.length; i++) {
            if (!excludeIndices.includes(i)) {
                available.push(i);
            }
        }
        if (available.length === 0) return Math.floor(Math.random() * artworks.length);
        return available[Math.floor(Math.random() * available.length)];
    }

    // Helper to randomize the attributes of a card for a fresh fly-past
    function randomizeCardAttributes(card) {
        // Randomize speed +/- 20%
        card.speed = baseSpeed * (0.8 + Math.random() * 0.4);
        
        // Randomize max scale (size) from 2.6 to 4.4
        card.maxScale = 3.5 * (0.75 + Math.random() * 0.5);

        // Increase 2D rotation sweep range (50 to 90 degrees) for visible rotation
        const dir = Math.random() > 0.5 ? 1 : -1;
        card.rzStart = Math.random() * 60 - 30; // Start: -30 to +30 deg
        card.rzEnd = card.rzStart + dir * (50 + Math.random() * 40); // Sweep: 50 to 90 deg
    }

    // 3. Create the concurrent floating cards
    const initialActiveIndices = [];
    for (let i = 0; i < numCards; i++) {
        const cardEl = document.createElement('div');
        cardEl.className = 'floating-artwork-card';
        cardEl.style.opacity = '0';
        container.appendChild(cardEl);

        // Distribute initial progress to space them out in depth
        const initialProgress = i / numCards; 
        
        // Pick an initial unique artwork
        const artIndex = getUniqueArtIndex(initialActiveIndices);
        initialActiveIndices.push(artIndex);

        const cardObj = {
            el: cardEl,
            progress: initialProgress,
            angle: Math.random() * Math.PI * 2, // Flight angle
            artIndex: artIndex
        };
        
        // Apply initial randomized speed, scale, and rotations
        randomizeCardAttributes(cardObj);
        cards.push(cardObj);
        
        updateCardContent(cards[i]);
    }

    function updateCardContent(card) {
        const art = artworks[card.artIndex];
        card.el.innerHTML = `
            <img src="/static/assets/images/floating/${art.file}" class="floating-artwork-img" />
        `;
    }

    // 4. Smooth perspective spaceship starfield zoom loop
    function animate() {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        cards.forEach(card => {
            card.progress += card.speed;

            // Reset loop: once it passes camera bounds
            if (card.progress >= 1.0) {
                card.progress = 0.0;
                card.angle = Math.random() * Math.PI * 2;
                
                // Select next unique artwork not currently visible on the screen
                const currentActiveIndices = cards
                    .filter(c => c !== card)
                    .map(c => c.artIndex);
                card.artIndex = getUniqueArtIndex(currentActiveIndices);
                
                // Generate a fresh set of randomized attributes
                randomizeCardAttributes(card);
                
                updateCardContent(card);
            }

            const p = card.progress;

            // Exponential scaling: start extremely tiny (0.005) and expand to card.maxScale
            const scale = 0.005 + card.maxScale * Math.pow(p, 3.5);

            // Radial drift from center
            const maxDistance = Math.max(window.innerWidth, window.innerHeight) * 1.25;
            const distance = maxDistance * Math.pow(p, 2.2);

            const x = centerX + Math.cos(card.angle) * distance - (320 * scale / 2);
            const y = centerY + Math.sin(card.angle) * distance - (240 * scale / 2);

            // Interpolate 2D rotation
            const rz = card.rzStart + (card.rzEnd - card.rzStart) * p;

            // Opacity curve:
            // - Gradually fade in to peak (0.40) around 35% of progress
            // - Start dissolving early (at 55% progress) as it scales up and passes the camera
            let opacity = 0;
            const fadeInLimit = 0.35;
            const fadeOutLimit = 0.55;

            if (p < fadeInLimit) {
                opacity = (p / fadeInLimit) * maxOpacity;
            } else if (p > fadeOutLimit) {
                opacity = ((1.0 - p) / (1.0 - fadeOutLimit)) * maxOpacity;
            } else {
                opacity = maxOpacity;
            }

            // Apply transformations with 2D translate, scale, and rotate (no 3D perspective distortion)
            card.el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rz}deg)`;
            card.el.style.opacity = opacity;
        });

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
});
