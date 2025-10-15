# 🔧 MLB & NHL Sports Bar Mode - Implementation Script

## Overview
This document contains the exact code changes needed to update MLB and NHL pages to match the NFL/NBA dropdown-based Sports Bar Mode design.

---

## Part 1: CSS Additions

Add these CSS rules to **BOTH** `public/mlb.html` and `public/nhl.html` after the `.grid-preview` styles:

```css
/* Game Selector Dropdown (Modal) */
.grid-slot {
  background: #1e293b;
  border-radius: 8px;
  padding: 16px;
  border: 2px solid #334155;
}

.slot-label {
  font-weight: 700;
  font-size: 14px;
  color: #17a2b8;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.game-selector {
  width: 100%;
  padding: 10px;
  background: #334155;
  color: #fff;
  border: 2px solid #475569;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.game-selector:hover {
  border-color: #17a2b8;
  background: #3d4d63;
}

.game-selector:focus {
  outline: none;
  border-color: #17a2b8;
  box-shadow: 0 0 0 3px rgba(23, 162, 184, 0.2);
}

.game-selector option {
  background: #1a1f2e;
  color: #fff;
  padding: 10px;
}

/* Full Screen Game Selector */
.fs-game-selector-container {
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  display: none;
  z-index: 1100;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.fs-game-selector {
  width: 100%;
  padding: 8px 12px;
  background: rgba(26, 31, 46, 0.95);
  color: #fff;
  border: 2px solid #17a2b8;
  border-radius: 6px;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.fs-game-selector:focus {
  outline: none;
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.3);
}

.fs-game-selector option {
  background: #1a1f2e;
  color: #fff;
  padding: 10px;
  font-size: 1rem;
}

/* Show selector on empty slots */
.fullscreen-game-card.empty-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 41, 59, 0.5);
  border: 2px dashed #475569;
  position: relative;
}

.fullscreen-game-card.empty-slot .fs-game-selector-container {
  display: block;
  position: relative;
  bottom: auto;
  left: auto;
  right: auto;
  width: 80%;
  max-width: 400px;
}

/* Make fullscreen game cards relative for positioning */
.fullscreen-game-card {
  position: relative;
}

/* Button hover state for modal */
.activate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #64748b;
}
```

---

## Part 2: JavaScript Variables

Add these variables at the START of the `<script>` section (right after `<script>`):

```javascript
// Sports Bar Mode State
let gridGames = {}; // Maps slot index to game ID
let currentLayout = 2;
```

---

## Part 3: Replace Modal Functions

### FIND AND REPLACE in `openSportsBarModal()`:

**OLD (MLB/NHL current code)**:
```javascript
function openSportsBarModal() {
  if (liveGames.length === 0) {
    alert('No games available for Sports Bar Mode');
    return;
  }
  document.getElementById('sportsBarModal').classList.add('show');
  updateGridPreview();
}
```

**NEW**:
```javascript
function openSportsBarModal() {
  if (liveGames.length === 0) {
    alert('No games available for Sports Bar Mode');
    return;
  }
  
  // Clear previous selections
  gridGames = {};
  
  document.getElementById('sportsBarModal').classList.add('show');
  renderGridPreview();
}
```

---

### REPLACE `updateGridPreview()` with `renderGridPreview()`:

**DELETE the entire `updateGridPreview()` function** and **REPLACE with**:

```javascript
function renderGridPreview() {
  const preview = document.getElementById('gridPreview');
  const layout = parseInt(document.querySelector('input[name="layout"]:checked').value);
  currentLayout = layout;
  
  preview.innerHTML = '';
  preview.className = `grid-preview grid-${layout}`;

  // Create dropdown selectors for each grid position
  for (let i = 0; i < layout; i++) {
    const slot = document.createElement('div');
    slot.className = 'grid-slot';
    slot.innerHTML = `
      <div class="slot-label">Position ${i + 1}</div>
      <select class="game-selector" data-slot="${i}">
        <option value="">-- Select Game --</option>
      </select>
    `;
    preview.appendChild(slot);
  }

  // Populate all dropdowns
  updateAllGameSelectors();
  
  // Update button state
  checkAllSlotsSelected();
}

// Update all dropdowns with available games
function updateAllGameSelectors() {
  const selectors = document.querySelectorAll('.game-selector, .fs-game-selector');
  const usedGameIds = Object.values(gridGames);

  selectors.forEach(selector => {
    const currentSlot = selector.dataset.slot;
    const currentValue = selector.value || gridGames[currentSlot];
    
    // Clear and rebuild options
    selector.innerHTML = '<option value="">-- Select Game --</option>';
    
    liveGames.forEach((game, index) => {
      const gameId = game.id;
      const comp = game.competitions[0];
      const home = comp.competitors.find(c => c.homeAway === 'home');
      const away = comp.competitors.find(c => c.homeAway === 'away');
      
      // Only show games not already selected (unless it's this slot's current game)
      if (!usedGameIds.includes(gameId) || gridGames[currentSlot] === gameId) {
        const option = document.createElement('option');
        option.value = gameId;
        
        const isLive = comp.status.type.state === 'in' || comp.status.period > 0;
        const status = isLive ? '🔴 LIVE' : '📅';
        option.textContent = `${status} ${away.team.displayName} @ ${home.team.displayName}`;
        
        if (currentValue === gameId || gridGames[currentSlot] === gameId) {
          option.selected = true;
        }
        
        selector.appendChild(option);
      }
    });
  });
}

// Handle game selection in modal
function handleGameSelection(event) {
  const selector = event.target;
  const slot = selector.dataset.slot;
  const gameId = selector.value;
  
  if (gameId) {
    gridGames[slot] = gameId;
  } else {
    delete gridGames[slot];
  }
  
  updateAllGameSelectors();
  checkAllSlotsSelected();
}

// Check if can activate Sports Bar Mode
function checkAllSlotsSelected() {
  const selectedCount = Object.keys(gridGames).length;
  const btn = document.getElementById('activateBtn');
  
  btn.disabled = selectedCount === 0;
  btn.textContent = selectedCount > 0 
    ? `Activate Sports Bar Mode (${selectedCount} game${selectedCount > 1 ? 's' : ''})` 
    : 'Select at least one game';
}
```

---

###DELETE these functions (no longer needed):

- `updatePreviewSelection()`
- `updateActivateButton()`

---

### REPLACE `activateSportsBarMode()`:

**OLD**:
```javascript
function activateSportsBarMode() {
  const selectedGames = Array.from(document.querySelectorAll('.game-checkbox:checked'))
    .map(cb => parseInt(cb.value));
  
  if (selectedGames.length === 0) {
    alert('Please select at least one game');
    return;
  }

  const layout = document.querySelector('input[name="layout"]:checked').value;
  closeSportsBarModal();
  enterFullscreen(selectedGames, layout);
}
```

**NEW**:
```javascript
function activateSportsBarMode() {
  if (Object.keys(gridGames).length === 0) {
    alert('Please select at least one game');
    return;
  }

  closeSportsBarModal();
  enterFullscreen();
}
```

---

### COMPLETELY REPLACE `enterFullscreen()`:

**DELETE the entire current `enterFullscreen()` function** and **REPLACE with**:

```javascript
function enterFullscreen() {
  const overlay = document.getElementById('fullscreenOverlay');
  const grid = document.getElementById('fullscreenGrid');
  
  grid.className = `fullscreen-grid grid-${currentLayout}`;
  grid.innerHTML = '';

  // Create grid slots
  for (let i = 0; i < currentLayout; i++) {
    const gameId = gridGames[i];
    const div = document.createElement('div');
    
    if (gameId) {
      // Find the game
      const game = liveGames.find(g => g.id === gameId);
      if (game) {
        div.className = 'fullscreen-game-card';
        div.innerHTML = renderFullscreenGameCard(game, i);
      } else {
        // Game not found, show empty slot
        div.className = 'fullscreen-game-card empty-slot';
        div.innerHTML = `
          <div class="fs-game-selector-container">
            <select class="fs-game-selector" data-slot="${i}">
              <option value="">-- Select Game --</option>
            </select>
          </div>
        `;
      }
    } else {
      // Empty slot
      div.className = 'fullscreen-game-card empty-slot';
      div.innerHTML = `
        <div class="fs-game-selector-container">
          <select class="fs-game-selector" data-slot="${i}">
            <option value="">-- Select Game --</option>
          </select>
        </div>
      `;
    }
    
    grid.appendChild(div);
  }

  // Update all dropdowns and add event listeners
  updateAllGameSelectors();
  attachFullscreenSelectorListeners();
  
  overlay.classList.add('active');
}

// Render individual game card HTML
function renderFullscreenGameCard(game, slotIndex) {
  const comp = game.competitions[0];
  const home = comp.competitors.find(c => c.homeAway === 'home');
  const away = comp.competitors.find(c => c.homeAway === 'away');
  
  const status = comp.status.type;
  const isLive = status.state === 'in' || comp.status.period > 0;
  
  // Get sport-specific details (THIS VARIES BY SPORT - SEE BELOW)
  const periodText = comp.status.type.shortDetail || comp.status.type.detail;
  
  const homeWinning = parseInt(home.score) > parseInt(away.score);
  const awayWinning = parseInt(away.score) > parseInt(home.score);

  return `
    <div style="text-align: center; margin-bottom: 16px;">
      <span class="fullscreen-badge ${isLive ? 'live' : 'scheduled'}">
        ${isLive ? periodText : 'Scheduled'}
      </span>
    </div>

    <div class="fullscreen-teams">
      <div class="fullscreen-team ${awayWinning && isLive ? 'winner' : ''}">
        <div class="fullscreen-team-info">
          <img src="${getTeamLogo(away.team.displayName)}" alt="${away.team.displayName}" class="fullscreen-team-logo">
          <div class="fullscreen-team-name">${away.team.displayName}</div>
        </div>
        <div class="fullscreen-team-score">${away.score || '0'}</div>
      </div>

      <div class="fullscreen-team ${homeWinning && isLive ? 'winner' : ''}">
        <div class="fullscreen-team-info">
          <img src="${getTeamLogo(home.team.displayName)}" alt="${home.team.displayName}" class="fullscreen-team-logo">
          <div class="fullscreen-team-name">${home.team.displayName}</div>
        </div>
        <div class="fullscreen-team-score">${home.score || '0'}</div>
      </div>
    </div>

    ${isLive ? `
      <div class="fullscreen-period">
        <div class="fullscreen-period-text">${periodText}</div>
      </div>
    ` : ''}
    
    <!-- Dropdown selector at bottom -->
    <div class="fs-game-selector-container" style="display: block;">
      <select class="fs-game-selector" data-slot="${slotIndex}">
        <option value="">-- Change Game --</option>
      </select>
    </div>
  `;
}

// Attach event listeners to fullscreen dropdowns
function attachFullscreenSelectorListeners() {
  document.querySelectorAll('.fs-game-selector').forEach(selector => {
    selector.addEventListener('change', handleFullscreenGameChange);
  });
}

// Handle game change in fullscreen mode
function handleFullscreenGameChange(event) {
  const selector = event.target;
  const slot = selector.dataset.slot;
  const gameId = selector.value;
  
  if (gameId) {
    gridGames[slot] = gameId;
  } else {
    delete gridGames[slot];
  }
  
  // Re-render fullscreen with new selections
  enterFullscreen();
}
```

---

### UPDATE `exitFullscreen()`:

**ADD** this line at the beginning of `exitFullscreen()`:

```javascript
function exitFullscreen() {
  // Clear grid selections when exiting
  gridGames = {};
  
  const overlay = document.getElementById('fullscreenOverlay');
  overlay.classList.remove('active');
  
  // Exit browser fullscreen if active
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
}
```

---

## Part 4: Add Event Listeners

**ADD** these event listeners at the END of the script (before `fetchLiveGames()` calls):

```javascript
// Add event listeners for layout changes
document.querySelectorAll('input[name="layout"]').forEach(radio => {
  radio.addEventListener('change', renderGridPreview);
});

// Add event listeners for modal game selectors
document.addEventListener('change', (e) => {
  if (e.target.classList.contains('game-selector')) {
    handleGameSelection(e);
  }
});
```

---

## Part 5: Update HTML Modal Structure

**FIND** the modal content in `<div id="sportsBarModal">` and **REPLACE** it with:

```html
<div id="sportsBarModal" class="modal">
  <div class="modal-content">
    <h2>🏟️ Sports Bar Mode - Select Games</h2>
    
    <div class="layout-options">
      <label>
        <input type="radio" name="layout" value="2" checked>
        <span>2 Games</span>
      </label>
      <label>
        <input type="radio" name="layout" value="4">
        <span>4 Games</span>
      </label>
      <label>
        <input type="radio" name="layout" value="6">
        <span>6 Games</span>
      </label>
    </div>

    <p style="text-align: center; color: #94a3b8; margin: 16px 0; font-size: 14px;">
      Select your grid layout, then choose which game for each position
    </p>

    <div id="gridPreview" class="grid-preview grid-2">
      <!-- Dropdowns will be populated here -->
    </div>

    <button class="activate-btn" onclick="activateSportsBarMode()" id="activateBtn">
      Select at least one game
    </button>

    <button class="close-btn" onclick="closeSportsBarModal()">
      Cancel
    </button>
  </div>
</div>
```

---

## Summary of Changes

### Files to Update:
1. `public/mlb.html`
2. `public/nhl.html`

### Changes Required:
1. ✅ Add CSS for `.game-selector` and `.fs-game-selector`
2. ✅ Add `gridGames = {}` and `currentLayout` variables
3. ✅ Replace checkbox-based modal with dropdown-based modal
4. ✅ Update `openSportsBarModal()` to clear selections
5. ✅ Replace `updateGridPreview()` with `renderGridPreview()`
6. ✅ Add `updateAllGameSelectors()` function
7. ✅ Add `handleGameSelection()` function
8. ✅ Add `checkAllSlotsSelected()` function
9. ✅ Update `activateSportsBarMode()` to use `gridGames`
10. ✅ Completely rewrite `enterFullscreen()` with dropdown slots
11. ✅ Add `renderFullscreenGameCard()` function
12. ✅ Add `attachFullscreenSelectorListeners()` function
13. ✅ Add `handleFullscreenGameChange()` function
14. ✅ Update `exitFullscreen()` to clear `gridGames`
15. ✅ Add event listeners for layout and selector changes
16. ✅ Update modal HTML structure

---

## Testing Checklist

After applying changes:

- [ ] Modal opens with dropdown selectors (not checkboxes)
- [ ] Can select different games for each position
- [ ] Can't select same game twice
- [ ] Button updates with count: "Activate (X games)"
- [ ] Fullscreen shows selected games
- [ ] Each game has dropdown at bottom
- [ ] Can change games in fullscreen
- [ ] Empty slots show dropdown
- [ ] Dropdowns update when games selected/removed
- [ ] Exit clears selections

---

**Ready to implement?** Would you like me to proceed with creating the complete updated files?
