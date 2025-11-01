// Wedding Vows Access Control Script - Bilingual Version with API

// API Configuration
const API_URL = 'https://gridtvsports.com/api';

// Current language (default: English)
let currentLanguage = localStorage.getItem('vowsLanguage') || 'en';

// Font size control
let currentFontSize = parseInt(localStorage.getItem('vowsFontSize')) || 100; // Default 100%
const MIN_FONT_SIZE = 80;
const MAX_FONT_SIZE = 150;
const FONT_SIZE_STEP = 10;

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
    if (!vowsData || !vowsData.wedding_vows) return;

    const lang = currentLanguage;

    // Update groom's section
    if (vowsData.wedding_vows.groom) {
        const groomName = lang === 'en' ? vowsData.wedding_vows.groom.person_name_en : vowsData.wedding_vows.groom.person_name_pt;
        const groomVows = lang === 'en' ? vowsData.wedding_vows.groom.vow_text_en : vowsData.wedding_vows.groom.vow_text_pt;

        if (groomName) {
            document.getElementById('groom-name-display').textContent = groomName + "'s Vows";
        }
        if (groomVows) {
            document.getElementById('groom-vows-display').innerHTML = groomVows;
        }
    }

    // Update bride's section
    if (vowsData.wedding_vows.bride) {
        const brideName = lang === 'en' ? vowsData.wedding_vows.bride.person_name_en : vowsData.wedding_vows.bride.person_name_pt;
        const brideVows = lang === 'en' ? vowsData.wedding_vows.bride.vow_text_en : vowsData.wedding_vows.bride.vow_text_pt;

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
    applyFontSize(); // Apply saved font size on load
});

// Font size control functions
function increaseFontSize() {
    console.log('Increase font size clicked, current:', currentFontSize);
    if (currentFontSize < MAX_FONT_SIZE) {
        currentFontSize += FONT_SIZE_STEP;
        applyFontSize();
        saveFontSize();
        console.log('New font size:', currentFontSize);
    } else {
        console.log('Max font size reached');
    }
}

function decreaseFontSize() {
    console.log('Decrease font size clicked, current:', currentFontSize);
    if (currentFontSize > MIN_FONT_SIZE) {
        currentFontSize -= FONT_SIZE_STEP;
        applyFontSize();
        saveFontSize();
        console.log('New font size:', currentFontSize);
    } else {
        console.log('Min font size reached');
    }
}

function applyFontSize() {
    const root = document.documentElement;
    
    console.log('Applying font size:', currentFontSize + '%');
    
    // Set CSS custom property on root element
    root.style.setProperty('--font-size-multiplier', currentFontSize / 100);
    
    console.log('Font size multiplier set to:', currentFontSize / 100);
}

function saveFontSize() {
    localStorage.setItem('vowsFontSize', currentFontSize.toString());
}
