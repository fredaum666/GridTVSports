# NFL.html Modal Removal - Manual Fix Required

## Problem
The NFL.html file has become corrupted with remnant modal code scattered throughout. There are duplicate functions and orphaned code blocks.

## Solution
You need to manually remove ALL modal-related code. Here's what to delete:

### Functions to DELETE Completely (lines ~2371-3390):
1. `async function loadWinProbability(gameId, awayTeam, homeTeam)` - DELETE
2. `async function loadGameStats(gameId, awayTeam, homeTeam)` - DELETE
3. `async function loadBoxScore(gameId, awayTeam, homeTeam)` - DELETE (there are 2 copies!)
4. `async function loadPredictions(gameId, awayTeam, homeTeam)` - DELETE
5. `function startModalRefresh(gameId, awayTeam, homeTeam)` - DELETE
6. `function stopModalRefresh()` - DELETE
7. `async function updateModalHeader(gameId)` - DELETE
8. `function closeGameDetail()` - DELETE
9. `function switchTab(tabName)` - DELETE

### Variables to DELETE:
```javascript
let selectedGame = null;
let currentActiveTab = 'boxscore';
let modalRefreshInterval = null;
```

### Event Listeners to DELETE:
```javascript
document.getElementById('game-detail-modal').addEventListener('click', (e) => {
  if (e.target.id === 'game-detail-modal') {
    closeGameDetail();
  }
});
```

Also remove the modalRefreshInterval from cleanup:
```javascript
// Change this:
window.addEventListener('beforeunload', () => {
  if (refreshInterval) clearInterval(refreshInterval);
  if (modalRefreshInterval) clearInterval(modalRefreshInterval); // DELETE THIS LINE
});

// To this:
window.addEventListener('beforeunload', () => {
  if (refreshInterval) clearInterval(refreshInterval);
});
```

### Orphaned Code Blocks
Search for any code between `</script>` and `<!-- Game Selection Modal -->` and delete it.
There should be NOTHING between these two except whitespace.

## Correct Structure Should Be:
```javascript
    // ... other code ...
    
    function manualRefresh() {
      console.log('🔄 Manual refresh triggered');
      fetchLiveGames();
      
      // Visual feedback
      const btn = event.target.closest('.refresh-btn');
      const originalBg = btn.style.background;
      btn.style.background = '#059669';
      btn.style.transform = 'rotate(360deg)';
      btn.style.transition = 'transform 0.5s ease';
      
      setTimeout(() => {
        btn.style.background = originalBg;
        btn.style.transform = 'rotate(0deg)';
      }, 500);
    }

    // Initialize
    fetchLiveGames();

    // Auto-refresh every 15 seconds for live updates
    refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing games...');
      fetchLiveGames();
    }, 15000);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (refreshInterval) clearInterval(refreshInterval);
    });
  </script>

  <!-- Game Selection Modal -->
  <div id="game-selection-modal" class="modal">
    <div class="modal-content">
      <h2>📺 Sports Bar Mode - Select Grid Layout</h2>
      ...
```

## Alternative: Use Git to Restore
If you have git, you can:
1. `git stash` - save current changes
2. Check out a clean version of nfl.html from before modal removal
3. Reapply just the needed changes (Final Games section, renderFinalGames function, etc.)

## Quick Fix Script
Or copy a working NBA/MLB/NHL file structure and adapt it for NFL.

