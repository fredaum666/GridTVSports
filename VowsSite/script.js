// Wedding Vows Access Control Script - Bilingual Version with API

// API Configuration
const API_URL = 'https://gridtvsports.com/api';

// Current language (default: English)
let currentLanguage = localStorage.getItem('vowsLanguage') || 'en';

// Vows data cache
let vowsData = null;

// Load vows from API
async function loadVowsContent() {
    try {
        const response = await fetch(`${API_URL}/vows`);

        if (!response.ok) {
            console.log('No vows found in database');
            return;
        }

        vowsData = await response.json();

        // Display vows in current language
        displayVows();
    } catch (error) {
        console.error('Error loading vows:', error);
    }
}

// Display vows based on selected language
function displayVows() {
    if (!vowsData) return;

    const lang = currentLanguage;

    // Update groom's section
    if (vowsData.groom) {
        const groomName = lang === 'en' ? vowsData.groom.person_name_en : vowsData.groom.person_name_pt;
        const groomVows = lang === 'en' ? vowsData.groom.vow_text_en : vowsData.groom.vow_text_pt;

        if (groomName) {
            document.getElementById('groom-name-display').textContent = groomName + "'s Vows";
        }
        if (groomVows) {
            document.getElementById('groom-vows-display').innerHTML = groomVows;
        }
    }

    // Update bride's section
    if (vowsData.bride) {
        const brideName = lang === 'en' ? vowsData.bride.person_name_en : vowsData.bride.person_name_pt;
        const brideVows = lang === 'en' ? vowsData.bride.vow_text_en : vowsData.bride.vow_text_pt;

        if (brideName) {
            document.getElementById('bride-name-display').textContent = brideName + "'s Vows";
        }
        if (brideVows) {
            document.getElementById('bride-vows-display').innerHTML = brideVows;
        }
    }

    // Update language button states
    updateLanguageButtons();
}

// Switch language
function switchLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('vowsLanguage', lang);
    displayVows();
}

// Update language button states
function updateLanguageButtons() {
    const enBtn = document.querySelector('.lang-btn-en');
    const ptBtn = document.querySelector('.lang-btn-pt');

    if (currentLanguage === 'en') {
        enBtn.classList.add('active');
        ptBtn.classList.remove('active');
    } else {
        enBtn.classList.remove('active');
        ptBtn.classList.add('active');
    }
}

// Check if vows are unlocked via API
async function checkVowsAccess() {
    try {
        const response = await fetch(`${API_URL}/unlock-status`);
        const data = await response.json();

        const lockedView = document.getElementById('locked-view');
        const vowsView = document.getElementById('vows-view');

        if (data.is_unlocked) {
            // Show vows
            lockedView.classList.add('hidden');
            vowsView.classList.remove('hidden');
            // Load the latest vows content
            await loadVowsContent();
        } else {
            // Show locked message
            lockedView.classList.remove('hidden');
            vowsView.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error checking vows access:', error);
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
    checkVowsAccess();
    autoRefresh();
});
