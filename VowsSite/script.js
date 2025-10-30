// Wedding Vows Access Control Script

// Load and display vows from localStorage
function loadVowsContent() {
    const saved = localStorage.getItem('weddingVows');

    if (saved) {
        try {
            const vowsData = JSON.parse(saved);

            // Update groom's section
            if (vowsData.groomName) {
                document.getElementById('groom-name-display').textContent = vowsData.groomName + "'s Vows";
            }
            if (vowsData.groomVows) {
                // Directly use the HTML from the rich text editor
                document.getElementById('groom-vows-display').innerHTML = vowsData.groomVows;
            }

            // Update bride's section
            if (vowsData.brideName) {
                document.getElementById('bride-name-display').textContent = vowsData.brideName + "'s Vows";
            }
            if (vowsData.brideVows) {
                // Directly use the HTML from the rich text editor
                document.getElementById('bride-vows-display').innerHTML = vowsData.brideVows;
            }
        } catch (e) {
            console.error('Error loading vows:', e);
        }
    }
}

// Check if vows are unlocked
function checkVowsAccess() {
    const isUnlocked = localStorage.getItem('vowsUnlocked') === 'true';
    const lockedView = document.getElementById('locked-view');
    const vowsView = document.getElementById('vows-view');

    if (isUnlocked) {
        // Show vows
        lockedView.classList.add('hidden');
        vowsView.classList.remove('hidden');
        // Load the latest vows content
        loadVowsContent();
    } else {
        // Show locked message
        lockedView.classList.remove('hidden');
        vowsView.classList.add('hidden');
    }
}

// Auto-refresh every 5 seconds to check if status changed
function autoRefresh() {
    setInterval(() => {
        checkVowsAccess();
    }, 5000); // Check every 5 seconds
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadVowsContent(); // Load vows content first
    checkVowsAccess();
    autoRefresh();
});

// Listen for storage changes (if admin unlocks in another tab or updates vows)
window.addEventListener('storage', function(e) {
    if (e.key === 'vowsUnlocked') {
        checkVowsAccess();
    } else if (e.key === 'weddingVows') {
        loadVowsContent();
    }
});
