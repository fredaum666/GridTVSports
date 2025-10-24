# Sliding Game Cards Implementation Guide

## Overview

This guide explains how to implement sliding pages on game cards with different content based on game state.

## Requirements

### Upcoming Games
- **Page 1 only**: Team logos, team names, team standings
- **No Page 2**

### Live Games
- **Page 1**: Team logos, team names, team standings, live score, quarter, play-by-play
- **Page 2**: Team logos and scoring history by quarters/innings

### Final Games
- **Page 1**: Team logos, team names, team standings, final score
- **Page 2**: Team logos and scoring history by quarters/innings

## CSS (Already Added)

The CSS has been added to nfl.html starting at line ~1698. Key classes:
- `.card-slider-container` - Container with overflow hidden
- `.card-pages` - Flex container for pages
- `.card-page` - Individual page (100% width)
- `.page-indicators` - Page dots
- `.page-1-upcoming` - Upcoming game layout
- `.page-1-live` - Live game layout
- `.page-2-content` - Scoring history layout

## JavaScript Implementation

### Update renderGamesList() Function

Replace the `renderGamesList()` function (lines 2350-2510) with this implementation:

```javascript
function renderGamesList() {
  const container = document.getElementById('games-list');

  if (liveGames.length === 0) {
    container.innerHTML = `
      <div class="no-games-message">
        <div class="icon">🏈</div>
        <h3>No Live Games</h3>
        <p>There are no games in progress right now.<br>Check back during game time!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  liveGames.forEach((game, index) => {
    const comp = game.competitions[0];
    const home = comp.competitors.find(c => c.homeAway === 'home');
    const away = comp.competitors.find(c => c.homeAway === 'away');

    const homeScore = parseInt(home.score) || 0;
    const awayScore = parseInt(away.score) || 0;

    const statusType = comp.status.type.state;
    const isCompleted = comp.status.type.completed;
    const isLive = statusType === 'in';
    const isFinal = isCompleted || statusType === 'post';
    const isPregame = statusType === 'pre';

    // Get team standings
    const awayRecord = away.records?.[0]?.summary || '';
    const homeRecord = home.records?.[0]?.summary || '';

    // Get line scores (quarter by quarter)
    const awayLineScores = away.linescores || [];
    const homeLineScores = home.linescores || [];

    // Get current period and clock
    const quarter = comp.status.period || 1;
    const clock = comp.status.displayClock || '15:00';

    //Get last play for play-by-play
    const lastPlay = comp.situation?.lastPlay?.text || '';

    let statusText = '';
    if (isLive) {
      statusText = `${quarter === 1 ? '1st' : quarter === 2 ? '2nd' : quarter === 3 ? '3rd' : '4th'} - ${clock}`;
    } else if (isFinal) {
      statusText = 'Final';
    } else {
      const gameDate = new Date(game.date);
      const dateStr = gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      statusText = `${dateStr} • ${timeStr}`;
    }

    // Determine number of pages
    const numPages = isPregame ? 1 : 2;

    // Build the card HTML
    let cardHtml = `
      <div class="game-card" data-game-id="${game.id}">
        <div class="card-slider-container">
          <div class="card-pages" data-current-page="0">
    `;

    // PAGE 1
    if (isPregame) {
      // Upcoming Game - Page 1 Only
      cardHtml += `
        <div class="card-page">
          <div class="page-1-upcoming">
            <div style="text-align: center; color: #9ca3af; font-size: 13px; font-weight: 600; margin-bottom: 8px;">
              ${statusText}
            </div>
            <div class="team-display">
              <div class="team-block">
                <img src="${away.team.logo}" alt="${away.team.displayName}" class="team-logo-large">
                <div class="team-name-large">${away.team.shortDisplayName || away.team.displayName}</div>
                <div class="team-standing">${awayRecord}</div>
              </div>
              <div class="vs-divider">VS</div>
              <div class="team-block">
                <img src="${home.team.logo}" alt="${home.team.displayName}" class="team-logo-large">
                <div class="team-name-large">${home.team.shortDisplayName || home.team.displayName}</div>
                <div class="team-standing">${homeRecord}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (isLive || isFinal) {
      // Live or Final Game - Page 1
      cardHtml += `
        <div class="card-page">
          <div class="page-1-live">
            <div style="text-align: center; margin-bottom: 12px;">
              <div style="display: inline-block; background: ${isLive ? '#ef4444' : '#6b7280'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                ${isLive ? '<span style="display: inline-block; width: 6px; height: 6px; background: white; border-radius: 50%; margin-right: 6px; animation: blink 1.5s infinite;"></span>LIVE' : 'FINAL'}
              </div>
              <div style="color: #9ca3af; font-size: 12px; margin-top: 4px; font-weight: 600;">
                ${statusText}
              </div>
            </div>

            <div class="live-score-header">
              <div class="live-team-block ${awayScore > homeScore ? 'winning' : 'losing'}">
                <img src="${away.team.logo}" alt="${away.team.displayName}" class="live-team-logo">
                <div class="live-team-name">${away.team.abbreviation}</div>
                <div class="live-team-standing">${awayRecord}</div>
                <div class="live-team-score">${awayScore}</div>
              </div>

              <div style="font-size: 20px; color: #6b7280; font-weight: 700;">-</div>

              <div class="live-team-block ${homeScore > awayScore ? 'winning' : 'losing'}">
                <img src="${home.team.logo}" alt="${home.team.displayName}" class="live-team-logo">
                <div class="live-team-name">${home.team.abbreviation}</div>
                <div class="live-team-standing">${homeRecord}</div>
                <div class="live-team-score">${homeScore}</div>
              </div>
            </div>

            ${isLive && lastPlay ? `
              <div class="play-by-play-section">
                <div class="play-by-play-title">Last Play</div>
                <div class="play-by-play-item">
                  <div class="play-description">${lastPlay}</div>
                  <div class="play-meta">${statusText}</div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      // PAGE 2 - Scoring History
      cardHtml += `
        <div class="card-page">
          <div class="page-2-content">
            <div class="scoring-history-header">
              <img src="${away.team.logo}" alt="${away.team.displayName}" class="scoring-team-logo">
              <img src="${home.team.logo}" alt="${home.team.displayName}" class="scoring-team-logo">
            </div>

            <div class="scoring-history-title">Scoring by Quarter</div>

            <div class="quarters-grid">
              <div class="quarter-header-cell"></div>
              <div class="quarter-header-cell">1</div>
              <div class="quarter-header-cell">2</div>
              <div class="quarter-header-cell">3</div>
              <div class="quarter-header-cell">4</div>
              <div class="quarter-header-cell">T</div>

              <div class="team-label-cell">${away.team.abbreviation}</div>
              <div class="score-cell ${awayLineScores[0] ? '' : 'empty'}">${awayLineScores[0]?.value || 0}</div>
              <div class="score-cell ${awayLineScores[1] ? '' : 'empty'}">${awayLineScores[1]?.value || 0}</div>
              <div class="score-cell ${awayLineScores[2] ? '' : 'empty'}">${awayLineScores[2]?.value || 0}</div>
              <div class="score-cell ${awayLineScores[3] ? '' : 'empty'}">${awayLineScores[3]?.value || 0}</div>
              <div class="score-cell total">${awayScore}</div>

              <div class="team-label-cell">${home.team.abbreviation}</div>
              <div class="score-cell ${homeLineScores[0] ? '' : 'empty'}">${homeLineScores[0]?.value || 0}</div>
              <div class="score-cell ${homeLineScores[1] ? '' : 'empty'}">${homeLineScores[1]?.value || 0}</div>
              <div class="score-cell ${homeLineScores[2] ? '' : 'empty'}">${homeLineScores[2]?.value || 0}</div>
              <div class="score-cell ${homeLineScores[3] ? '' : 'empty'}">${homeLineScores[3]?.value || 0}</div>
              <div class="score-cell total">${homeScore}</div>
            </div>
          </div>
        </div>
      `;
    }

    // Close pages container
    cardHtml += `
          </div>

          ${numPages > 1 ? `
            <div class="page-indicators">
              <div class="page-dot active" data-page="0"></div>
              <div class="page-dot" data-page="1"></div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', cardHtml);
  });

  // Add swipe and click handlers
  initializeCardSliders();
}
```

### Add Swipe/Click Handler Function

Add this function after `renderGamesList()`:

```javascript
function initializeCardSliders() {
  const cards = document.querySelectorAll('.game-card');

  cards.forEach(card => {
    const pagesContainer = card.querySelector('.card-pages');
    const dots = card.querySelectorAll('.page-dot');

    if (!pagesContainer || dots.length === 0) return; // Skip cards with only 1 page

    let currentPage = 0;
    const maxPage = dots.length - 1;

    // Touch/swipe handling
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    const updatePage = (newPage) => {
      currentPage = Math.max(0, Math.min(newPage, maxPage));
      pagesContainer.style.transform = `translateX(-${currentPage * 100}%)`;
      pagesContainer.dataset.currentPage = currentPage;

      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentPage);
      });
    };

    // Mouse/Touch events
    pagesContainer.addEventListener('mousedown', (e) => {
      startX = e.clientX;
      isDragging = true;
      pagesContainer.style.transition = 'none';
    });

    pagesContainer.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isDragging = true;
      pagesContainer.style.transition = 'none';
    });

    pagesContainer.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      currentX = e.clientX;
      const diff = startX - currentX;
      const percentMoved = (diff / pagesContainer.offsetWidth) * 100;
      pagesContainer.style.transform = `translateX(calc(-${currentPage * 100}% + ${-percentMoved}%))`;
    });

    pagesContainer.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
      const diff = startX - currentX;
      const percentMoved = (diff / pagesContainer.offsetWidth) * 100;
      pagesContainer.style.transform = `translateX(calc(-${currentPage * 100}% + ${-percentMoved}%))`;
    });

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      pagesContainer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

      const diff = startX - currentX;
      const threshold = 50; // pixels

      if (Math.abs(diff) > threshold) {
        if (diff > 0 && currentPage < maxPage) {
          updatePage(currentPage + 1);
        } else if (diff < 0 && currentPage > 0) {
          updatePage(currentPage - 1);
        } else {
          updatePage(currentPage);
        }
      } else {
        updatePage(currentPage);
      }

      currentX = 0;
      startX = 0;
    };

    pagesContainer.addEventListener('mouseup', endDrag);
    pagesContainer.addEventListener('mouseleave', endDrag);
    pagesContainer.addEventListener('touchend', endDrag);

    // Dot click handling
    dots.forEach((dot, index) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        updatePage(index);
      });
    });
  });
}
```

## Sport-Specific Adaptations

### MLB (Innings instead of Quarters)

For MLB, change the scoring history labels:

```javascript
// In page 2 HTML, change:
<div class="scoring-history-title">Scoring by Inning</div>

// And the grid headers - show 9 innings:
<div class="quarters-grid">
  <div class="quarter-header-cell"></div>
  <div class="quarter-header-cell">1</div>
  <div class="quarter-header-cell">2</div>
  <div class="quarter-header-cell">3</div>
  <div class="quarter-header-cell">4</div>
  <div class="quarter-header-cell">5</div>
  <div class="quarter-header-cell">6</div>
  <div class="quarter-header-cell">7</div>
  <div class="quarter-header-cell">8</div>
  <div class="quarter-header-cell">9</div>
  <div class="quarter-header-cell">R</div> <!-- Runs instead of Total -->
```

Change grid-template-columns:
```css
.quarters-grid {
  grid-template-columns: auto repeat(10, 1fr); /* 9 innings + total */
}
```

### NBA (Same as NFL - 4 Quarters)

Use the same structure as NFL.

### NHL (3 Periods)

For NHL, change the scoring history:

```javascript
<div class="scoring-history-title">Scoring by Period</div>

// Grid headers - show 3 periods:
<div class="quarters-grid" style="grid-template-columns: auto repeat(4, 1fr);">
  <div class="quarter-header-cell"></div>
  <div class="quarter-header-cell">1</div>
  <div class="quarter-header-cell">2</div>
  <div class="quarter-header-cell">3</div>
  <div class="quarter-header-cell">T</div>
```

## Implementation Steps

1. ✅ CSS has been added (lines 1698-1958 in nfl.html)
2. Replace `renderGamesList()` function with new implementation
3. Add `initializeCardSliders()` function after `renderGamesList()`
4. Test with upcoming, live, and final games
5. Replicate for NBA, MLB, NHL with appropriate adaptations

## Testing Checklist

- [ ] Upcoming games show only 1 page with team logos, names, standings
- [ ] Live games show 2 pages with swipe functionality
- [ ] Page 1 (live) shows scores, quarter, last play
- [ ] Page 2 (live) shows scoring history by quarter
- [ ] Final games show 2 pages
- [ ] Page 1 (final) shows final score
- [ ] Page 2 (final) shows scoring history
- [ ] Dots indicate current page
- [ ] Clicking dots changes pages
- [ ] Swiping/dragging changes pages
- [ ] Mobile touch works correctly
- [ ] Desktop mouse works correctly

## Notes

- The implementation uses CSS transforms for smooth sliding
- Swipe threshold is 50px to prevent accidental swipes
- Upcoming games don't show page indicators (only 1 page)
- All animations use cubic-bezier easing for smooth transitions
- The scoring grid is responsive and adapts to different screen sizes
