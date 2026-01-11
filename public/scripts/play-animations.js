/**
 * Play Animations Module
 * Centralized animation system for NFL/NCAA football play events
 * Used by: Desktop-tv-sports-bar.html, Phone-sports-bar.html, tv-sports-bar.html, nfl.html
 */

// Animation queue system - stores pending animations per card
const animationQueues = new Map();

// Track when fullscreen was entered to skip initial animations
let fullscreenEnteredAt = null;

/**
 * Set the fullscreen entry time (call this when entering fullscreen mode)
 * @param {number} timestamp - The timestamp when fullscreen was entered
 */
function setFullscreenEnteredAt(timestamp) {
  fullscreenEnteredAt = timestamp;
}

/**
 * Get the fullscreen entry time
 * @returns {number|null} The timestamp when fullscreen was entered
 */
function getFullscreenEnteredAt() {
  return fullscreenEnteredAt;
}

/**
 * Show play text modal after turnover animations (fumble/interception)
 * Highlights uppercase words in the play text
 * @param {HTMLElement} card - The game card element
 * @param {string} playText - The full play text from API
 * @param {number} duration - How long to show the modal in ms (default 15000)
 */
function showPlayTextModal(card, playText, duration = 15000) {
  // Remove any existing play text modal
  const existingModal = card.querySelector('.play-text-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create the modal
  const modal = document.createElement('div');
  modal.className = 'play-text-modal';

  // Highlight uppercase words (like player names, team abbreviations)
  // Match sequences of 2+ uppercase letters (with optional periods/hyphens)
  const highlightedText = playText.replace(
    /\b([A-Z][A-Z.'-]+[A-Z]?)\b/g,
    '<span class="play-text-highlight">$1</span>'
  );

  modal.innerHTML = `
    <div class="play-text-modal-content">
      <div class="play-text-modal-body">${highlightedText}</div>
    </div>
  `;

  card.style.position = 'relative';
  card.appendChild(modal);

  // Fade in
  requestAnimationFrame(() => {
    modal.classList.add('visible');
  });

  // Fade out and remove after duration
  setTimeout(() => {
    modal.classList.add('fade-out');
    setTimeout(() => {
      modal.remove();
    }, 500); // Match fade-out transition duration
  }, duration);
}

/**
 * Detect play type based on score change and trigger animation
 * @param {HTMLElement} card - The game card element
 * @param {number} scoreChange - The change in score
 * @param {string} teamName - The team name
 * @param {string} lastPlayText - The last play text from API
 */
function detectAndAnimatePlay(card, scoreChange, teamName, lastPlayText = '') {
  let playType, playText;

  if (scoreChange === 6) {
    playType = 'touchdown';
    playText = 'TOUCHDOWN!';
  } else if (scoreChange === 7 || scoreChange === 8) {
    playType = 'touchdown';
    playText = 'TOUCHDOWN!';
  } else if (scoreChange === 3) {
    playType = 'field-goal';
    playText = 'FIELD GOAL!';
  } else if (scoreChange === 2) {
    // Check if it's a 2-point conversion or a safety
    const lowerPlay = lastPlayText.toLowerCase();
    if (lowerPlay.includes('two-point') || lowerPlay.includes('2-pt') ||
      lowerPlay.includes('two point') || lowerPlay.includes('conversion')) {
      playType = 'two-point';
      playText = '2-POINT CONVERSION!';
    } else {
      playType = 'safety';
      playText = 'SAFETY!';
    }
  } else if (scoreChange === 1) {
    playType = 'field-goal';
    playText = 'EXTRA POINT!';
  } else {
    return; // Unknown score change
  }

  showPlayAnimation(card, playType, playText, teamName);
}

/**
 * Queue an animation to play after current one finishes
 * @param {HTMLElement} card - The game card element
 * @param {string} playType - The type of play animation
 * @param {string} playText - The text to display
 * @param {string} teamName - The team name
 * @param {string} recoveryInfo - Additional recovery information
 * @param {string} recoveryLogo - URL to recovery team logo
 * @param {boolean} isNegated - Whether the play was negated
 */
function queueAnimation(card, playType, playText, teamName = '', recoveryInfo = '', recoveryLogo = '', isNegated = false) {
  const cardId = card.dataset.gameId || card.id || 'default';

  if (!animationQueues.has(cardId)) {
    animationQueues.set(cardId, []);
  }

  const queue = animationQueues.get(cardId);

  // Debug: Log queue status
  console.log('📥 queueAnimation:', {
    cardId,
    playType,
    playText,
    queueLengthBefore: queue.length,
    existingInQueue: queue.map(q => q.playText).join(', ')
  });

  queue.push({ playType, playText, teamName, recoveryInfo, recoveryLogo, isNegated });

  // If this is the only animation in queue, start it
  if (queue.length === 1) {
    processNextAnimation(card, cardId);
  }
}

/**
 * Process the next animation in the queue
 * @param {HTMLElement} card - The game card element
 * @param {string} cardId - The card identifier
 */
function processNextAnimation(card, cardId) {
  const queue = animationQueues.get(cardId);
  if (!queue || queue.length === 0) return;

  const anim = queue[0];
  showPlayAnimationDirect(card, anim.playType, anim.playText, anim.teamName, anim.recoveryInfo, anim.recoveryLogo, anim.isNegated, () => {
    // Animation finished, remove from queue and process next
    queue.shift();
    if (queue.length > 0) {
      processNextAnimation(card, cardId);
    }
  });
}

/**
 * Show play animation overlay (wrapper for queue system)
 * @param {HTMLElement} card - The game card element
 * @param {string} playType - The type of play animation
 * @param {string} playText - The text to display
 * @param {string} teamName - The team name
 * @param {string} recoveryInfo - Additional recovery information
 * @param {string} recoveryLogo - URL to recovery team logo
 * @param {boolean} isNegated - Whether the play was negated
 */
function showPlayAnimation(card, playType, playText, teamName = '', recoveryInfo = '', recoveryLogo = '', isNegated = false) {
  // Skip animations during the first update cycle after entering fullscreen mode
  if (fullscreenEnteredAt && (Date.now() - fullscreenEnteredAt) < 3000) {
    return;
  }
  queueAnimation(card, playType, playText, teamName, recoveryInfo, recoveryLogo, isNegated);
}

/**
 * Direct animation display (called by queue processor)
 * @param {HTMLElement} card - The game card element
 * @param {string} playType - The type of play animation
 * @param {string} playText - The text to display
 * @param {string} teamName - The team name
 * @param {string} recoveryInfo - Additional recovery information
 * @param {string} recoveryLogo - URL to recovery team logo
 * @param {boolean} isNegated - Whether the play was negated
 * @param {Function} onComplete - Callback when animation completes
 */
function showPlayAnimationDirect(card, playType, playText, teamName = '', recoveryInfo = '', recoveryLogo = '', isNegated = false, onComplete = null) {
  // Skip animations during the first update cycle after entering fullscreen mode
  if (fullscreenEnteredAt && (Date.now() - fullscreenEnteredAt) < 3000) {
    if (onComplete) onComplete();
    return;
  }

  // Remove any existing animation
  const existingAnimation = card.querySelector('.play-animation');
  if (existingAnimation) {
    existingAnimation.remove();
  }

  // Create animation overlay
  const animationDiv = document.createElement('div');
  animationDiv.className = `play-animation ${playType}`;

  // Choose icon based on play type
  let icon;
  switch (playType) {
    case 'touchdown':
      icon = '🏈';
      break;
    case 'field-goal':
      icon = '🥅';
      break;
    case 'first-down':
      icon = '🏈';
      break;
    case 'interception':
      icon = '🚫';
      break;
    case 'fumble':
      icon = '💨';
      break;
    case 'turnover-on-downs':
      icon = '🔄';
      break;
    default:
      icon = '⚡';
  }

  // Build recovery HTML with logo for fumbles
  let recoveryHTML = '';
  if (playType === 'fumble' && recoveryLogo) {
    recoveryHTML = `
      <div class="play-animation-subtext" style="margin-top: clamp(5px, 1vh, 10px);">Recovered by</div>
      <img src="${recoveryLogo}" alt="Team" style="width: clamp(40px, 8vmin, 80px); height: clamp(40px, 8vmin, 80px); object-fit: contain; margin-top: clamp(5px, 1vh, 10px);">
    `;
  } else if (recoveryInfo && playType !== 'penalty') {
    recoveryHTML = `<div class="play-animation-subtext" style="margin-top: clamp(5px, 1vh, 10px);">${recoveryInfo}</div>`;
  }

  // Special HTML for touchdown with team logo
  if (playType === 'touchdown' && teamName) {
    const teamLogoPath = `/assets/${encodeURIComponent(teamName)}.png`;
    animationDiv.innerHTML = `
      <div class="touchdown-container">
        <img src="${teamLogoPath}" alt="${teamName}" class="touchdown-team-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div class="touchdown-fallback-icon" style="display:none;">🏈</div>
      </div>
      <div class="play-animation-text">${playText}</div>
    `;
  } else if (playType === 'two-point') {
    // Special HTML for two-point conversion with team logo
    const teamLogoPath = `/assets/${encodeURIComponent(teamName)}.png`;
    animationDiv.innerHTML = `
      <div class="two-point-container">
        <img src="${teamLogoPath}" alt="${teamName}" class="two-point-team-logo" onerror="this.style.display='none';">
      </div>
      <div class="play-animation-text">${playText}</div>
    `;
  } else if (playType === 'field-goal') {
    // Special HTML for field goal with YFrame and spinning ball
    animationDiv.innerHTML = `
      <div class="field-goal-container">
        <img src="/assets/YFrame.png" alt="Goal Post" class="yframe-image" onerror="this.style.display='none';">
        <div class="spinning-football">🏈</div>
      </div>
      <div class="play-animation-text">${playText}</div>
      ${teamName ? `<div class="play-animation-subtext">${teamName}</div>` : ''}
    `;
  } else if (playType === 'first-down') {
    // Special HTML for 1st down animation:
    // - 1stDown2.png behind (revealed at end)
    // - Static 1stDown1.png in center
    // - Moving 1stDown1.png slides in and overlaps, then both 1stDown1 fade out
    animationDiv.innerHTML = `
      <div class="first-down-container">
        <img src="/assets/1stDown2.png" alt="Arrow" class="first-down-arrow background" onerror="this.style.display='none';">
        <img src="/assets/1stDown1.png" alt="Arrow" class="first-down-arrow static" onerror="this.style.display='none';">
        <img src="/assets/1stDown1.png" alt="Arrow" class="first-down-arrow moving" onerror="this.style.display='none';">
      </div>
    `;
  } else if (playType === 'turnover-on-downs') {
    // Special HTML for turnover on downs - yellow/amber themed
    animationDiv.innerHTML = `
      <div class="turnover-on-downs-container">
        <div class="turnover-on-downs-icon">🔄</div>
      </div>
      <div class="play-animation-text">${playText}</div>
    `;
  } else if (playType === 'missed-kick') {
    // Special HTML for missed field goal/XP with YFrame and ball missing
    animationDiv.innerHTML = `
      <div class="missed-kick-container">
        <img src="/assets/YFrame.png" alt="Goal Post" class="yframe-image-missed" onerror="this.style.display='none';">
        <div class="missed-football">🏈</div>
      </div>
      <div class="play-animation-text">${playText}</div>
      ${teamName ? `<div class="play-animation-subtext">${teamName}</div>` : ''}
    `;
  } else if (playType === 'punt') {
    // Special HTML for punt with ball flying across screen
    animationDiv.innerHTML = `
      <div class="punt-container">
        <div class="punt-ball">🏈</div>
      </div>
      <div class="play-animation-text">${playText}</div>
      ${teamName ? `<div class="play-animation-subtext">${teamName}</div>` : ''}
    `;
  } else if (playType === 'sack') {
    // Special HTML for sack with impact effect and stars
    animationDiv.innerHTML = `
      <div class="sack-container">
        <div class="sack-icon">💥</div>
        <span class="sack-stars star-1">⭐</span>
        <span class="sack-stars star-2">⭐</span>
        <span class="sack-stars star-3">💫</span>
        <span class="sack-stars star-4">💫</span>
      </div>
      <div class="play-animation-text">${playText}</div>
    `;
  } else if (playType === 'timeout') {
    // Special HTML for timeout with team logo
    // recoveryInfo contains the team logo URL
    const timeoutLogoUrl = recoveryInfo || '';
    animationDiv.innerHTML = `
      <div class="timeout-container">
        ${timeoutLogoUrl ? `<img src="${timeoutLogoUrl}" alt="Team" class="timeout-team-logo">` : ''}
        <div class="play-animation-text">${playText}</div>
        ${teamName ? `<div class="timeout-team-name">${teamName}</div>` : ''}
      </div>
    `;
  } else if (playType === 'penalty') {
    // Special HTML for penalty with two-phase animation
    // Phase 1: Referee throwing (5 seconds)
    // Phase 2: Penalty info with team logo (fades in after phase 1)
    // recoveryInfo contains: penaltyName|offenseDefense|playerName|teamLogo
    const penaltyParts = recoveryInfo ? recoveryInfo.split('|') : ['', '', '', ''];
    const penaltyName = penaltyParts[0] || 'PENALTY';
    const offenseDefense = penaltyParts[1] || '';
    const playerName = penaltyParts[2] || '';
    const teamLogoUrl = penaltyParts[3] || '';

    animationDiv.innerHTML = `
      <!-- Phase 1: Referee throwing flag -->
      <div class="penalty-phase-1">
        <img src="/assets/NFLrefereethrowingBlur.png" alt="Referee" class="referee-throwing" onerror="this.style.display='none';">
        <div class="penalty-phase-1-text">FLAG!</div>
      </div>
      <!-- Phase 2: Penalty details (appears after 5 seconds) -->
      <div class="penalty-phase-2">
        <div class="penalty-info-box">
          ${teamLogoUrl ? `<img src="${teamLogoUrl}" alt="Team" class="penalty-team-logo">` : ''}
          <div class="penalty-type">${penaltyName}</div>
          ${offenseDefense ? `<div class="penalty-on">${offenseDefense}</div>` : ''}
          ${playerName ? `<div class="penalty-player">${playerName}</div>` : ''}
        </div>
      </div>
    `;
  } else {
    animationDiv.innerHTML = `
      <div class="play-animation-icon">${icon}</div>
      <div class="play-animation-text">${playText}</div>
      ${teamName ? `<div class="play-animation-subtext">${teamName}</div>` : ''}
      ${recoveryHTML}
    `;
  }

  // Add negated indicator if play was called back
  if (isNegated) {
    animationDiv.classList.add('negated');
    const negatedBanner = document.createElement('div');
    negatedBanner.className = 'negated-banner';
    negatedBanner.textContent = 'NO PLAY - PENALTY';
    animationDiv.appendChild(negatedBanner);
  }

  card.style.position = 'relative';
  card.appendChild(animationDiv);

  // Remove after animation completes
  // Touchdown gets 7 seconds, Penalty gets 11 seconds (5s phase 1 + 6s phase 2), Timeout gets 5 seconds, others get 8 seconds
  let animationDuration = 8000;
  if (playType === 'touchdown') {
    animationDuration = 7000;
  } else if (playType === 'penalty') {
    animationDuration = 11000;
  } else if (playType === 'timeout') {
    animationDuration = 5000;
  }
  setTimeout(() => {
    animationDiv.remove();
    if (onComplete) onComplete();
  }, animationDuration);
}

/**
 * Analyze play text and trigger appropriate animations
 * @param {HTMLElement} card - The game card element
 * @param {string} lastPlay - The last play text from API
 * @param {Object} options - Options containing team info, scores, etc.
 */
function analyzeAndAnimatePlay(card, lastPlay, options = {}) {
  const {
    awayTeam = {},
    homeTeam = {},
    awayScoreChange = 0,
    homeScoreChange = 0,
    prevDown = 0,
    currentDown = 0,
    downDistanceText = '',
    prevDownDistance = '',
    prevPossession = null,
    currentPossession = null
  } = options;

  // Debug: Log when this function is called
  console.log('🔍 analyzeAndAnimatePlay called:', {
    gameId: card?.dataset?.gameId,
    awayScoreChange,
    homeScoreChange,
    lastPlayPreview: lastPlay.substring(0, 80) + '...'
  });

  const lowerLastPlay = lastPlay.toLowerCase();

  // Detect if play was negated by penalty ("No Play" at the end)
  const isNegated = lowerLastPlay.includes('no play') ||
    (lowerLastPlay.includes('penalty') && lowerLastPlay.includes('enforced'));

  // Helper to get team info
  const awayAbbr = awayTeam?.team?.abbreviation || '';
  const homeAbbr = homeTeam?.team?.abbreviation || '';
  const awayName = awayTeam?.team?.displayName || 'Away';
  const homeName = homeTeam?.team?.displayName || 'Home';
  const awayLogo = awayTeam?.team?.logo || '';
  const homeLogo = homeTeam?.team?.logo || '';

  // Detect events in order of priority/occurrence
  const events = [];

  // 1. INTERCEPTION detection (Pick-6, regular INT)
  if (lowerLastPlay.includes('intercept')) {
    let interceptingTeam = '';
    let interceptingTeamLogo = '';

    const interceptMatch = lastPlay.match(/intercept(?:ed|ion)?\s+by\s+([A-Z]{2,4})-/i);
    if (interceptMatch) {
      const intTeamAbbr = interceptMatch[1].toUpperCase();
      if (intTeamAbbr === awayAbbr.toUpperCase()) {
        interceptingTeam = awayName;
        interceptingTeamLogo = awayLogo;
      } else if (intTeamAbbr === homeAbbr.toUpperCase()) {
        interceptingTeam = homeName;
        interceptingTeamLogo = homeLogo;
      }
    }

    events.push({
      type: 'interception',
      text: 'INTERCEPTION!',
      teamName: interceptingTeam,
      logo: interceptingTeamLogo,
      isNegated: isNegated
    });

    // Check if the interception was returned for a touchdown (Pick-6)
    if (lowerLastPlay.includes('touchdown') || lowerLastPlay.includes('for a td')) {
      events.push({
        type: 'touchdown',
        text: 'PICK SIX!',
        teamName: interceptingTeam,
        isNegated: isNegated
      });
    }
  }

  // 2. FUMBLE detection (Scoop and Score)
  else if (lowerLastPlay.includes('fumble')) {
    let recoveryTeam = '';
    let recoveryLogo = '';

    // Parse "RECOVERED by TEAM-PlayerName" format
    // Example: "RECOVERED by NE-E.Ponder" or "RECOVERED by JAX-D.Lloyd"
    if (lowerLastPlay.includes('recovered by')) {
      const recoveredIndex = lowerLastPlay.indexOf('recovered by');
      const afterRecovered = lastPlay.substring(recoveredIndex + 13); // Skip "recovered by "

      // The team abbreviation comes right after "RECOVERED by " and before the hyphen
      // Format: "RECOVERED by XXX-PlayerName" where XXX is the team abbreviation
      const hyphenIndex = afterRecovered.indexOf('-');
      if (hyphenIndex > 0) {
        const recoveredByTeam = afterRecovered.substring(0, hyphenIndex).trim().toUpperCase();

        if (recoveredByTeam === awayAbbr.toUpperCase()) {
          recoveryTeam = awayName;
          recoveryLogo = awayLogo;
        } else if (recoveredByTeam === homeAbbr.toUpperCase()) {
          recoveryTeam = homeName;
          recoveryLogo = homeLogo;
        }
      } else {
        // Fallback: check if team abbr appears in the text after "recovered by"
        if (afterRecovered.toUpperCase().startsWith(awayAbbr.toUpperCase())) {
          recoveryTeam = awayName;
          recoveryLogo = awayLogo;
        } else if (afterRecovered.toUpperCase().startsWith(homeAbbr.toUpperCase())) {
          recoveryTeam = homeName;
          recoveryLogo = homeLogo;
        }
      }
    }

    events.push({
      type: 'fumble',
      text: 'FUMBLE!',
      teamName: recoveryTeam,
      logo: recoveryLogo,
      isNegated: isNegated
    });

    // Check if fumble was returned for touchdown (Scoop and Score)
    if (lowerLastPlay.includes('touchdown') || lowerLastPlay.includes('for a td')) {
      events.push({
        type: 'touchdown',
        text: 'SCOOP & SCORE!',
        teamName: recoveryTeam,
        isNegated: isNegated
      });
    }
  }

  // 3. TOUCHDOWN detection (if not already caught by turnover)
  // Skip if this is clearly an extra point/PAT play (play text may reference "after the touchdown")
  const isExtraPointPlay = lowerLastPlay.includes('extra point') ||
    lowerLastPlay.includes('pat ') ||
    lowerLastPlay.includes(' xp ') ||
    lowerLastPlay.includes('two-point') ||
    lowerLastPlay.includes('2-pt');

  if ((lowerLastPlay.includes('touchdown') || lowerLastPlay.includes('for a td')) &&
    !events.some(e => e.type === 'touchdown') &&
    !isExtraPointPlay) {
    let scoringTeam = '';
    if (awayScoreChange >= 6) {
      scoringTeam = awayName;
    } else if (homeScoreChange >= 6) {
      scoringTeam = homeName;
    }

    let tdText = 'TOUCHDOWN!';
    if (lowerLastPlay.includes('punt') && lowerLastPlay.includes('return')) {
      tdText = 'PUNT RETURN TD!';
    } else if (lowerLastPlay.includes('kick') && lowerLastPlay.includes('return')) {
      tdText = 'KICK RETURN TD!';
    } else if (lowerLastPlay.includes('blocked') && (lowerLastPlay.includes('return') || lowerLastPlay.includes('recovered'))) {
      tdText = 'BLOCKED KICK TD!';
    } else if (lowerLastPlay.includes('fumble') && (lowerLastPlay.includes('return') || lowerLastPlay.includes('recovered'))) {
      tdText = 'FUMBLE RECOVERY TD!';
    }

    events.push({
      type: 'touchdown',
      text: tdText,
      teamName: scoringTeam,
      isNegated: isNegated
    });
  }

  // 4. SAFETY detection
  if (lowerLastPlay.includes('safety') && !lowerLastPlay.includes('free kick')) {
    let safetyTeam = '';
    if (awayScoreChange === 2) safetyTeam = awayName;
    else if (homeScoreChange === 2) safetyTeam = homeName;

    events.push({
      type: 'safety',
      text: 'SAFETY!',
      teamName: safetyTeam,
      isNegated: isNegated
    });
  }

  // 5. FIELD GOAL detection (successful) - with mutually exclusive logic
  const isFGAttempt = lowerLastPlay.includes('field goal') || lowerLastPlay.includes(' fg ');
  const isFGGood = lowerLastPlay.includes('good') && !lowerLastPlay.includes('no good');
  const isFGMissed = lowerLastPlay.includes('missed') || lowerLastPlay.includes('no good') ||
    lowerLastPlay.includes('wide left') || lowerLastPlay.includes('wide right') ||
    lowerLastPlay.includes('short') || lowerLastPlay.includes('blocked');

  if (isFGAttempt && isFGGood && !isFGMissed) {
    let fgTeam = '';
    if (awayScoreChange === 3) fgTeam = awayName;
    else if (homeScoreChange === 3) fgTeam = homeName;

    events.push({
      type: 'field-goal',
      text: 'FIELD GOAL!',
      teamName: fgTeam,
      isNegated: isNegated
    });
  }

  // 6. MISSED FIELD GOAL detection
  if (isFGAttempt && isFGMissed && !lowerLastPlay.includes('touchdown')) {
    events.push({
      type: 'missed-kick',
      text: lowerLastPlay.includes('blocked') ? 'BLOCKED FIELD GOAL!' : 'MISSED FIELD GOAL!',
      teamName: '',
      isNegated: isNegated
    });
  }

  // 7. EXTRA POINT detection (successful)
  const isXPAttempt = lowerLastPlay.includes('extra point') || lowerLastPlay.includes('pat ') || lowerLastPlay.includes(' xp ');
  const isXPGood = lowerLastPlay.includes('good') && !lowerLastPlay.includes('no good');
  const isXPMissed = lowerLastPlay.includes('missed') || lowerLastPlay.includes('no good') ||
    lowerLastPlay.includes('failed') || lowerLastPlay.includes('blocked');

  if (isXPAttempt && isXPGood && !isXPMissed) {
    events.push({
      type: 'field-goal',
      text: 'EXTRA POINT!',
      teamName: '',
      isNegated: isNegated
    });
  }

  // 8. MISSED EXTRA POINT detection
  if (isXPAttempt && isXPMissed) {
    events.push({
      type: 'missed-kick',
      text: 'MISSED EXTRA POINT!',
      teamName: '',
      isNegated: isNegated
    });
  }

  // 9. TWO-POINT CONVERSION detection
  if ((lowerLastPlay.includes('two-point') || lowerLastPlay.includes('2-pt') ||
    lowerLastPlay.includes('two point') || lowerLastPlay.includes('2 point')) &&
    lowerLastPlay.includes('conversion')) {
    let twoPointTeam = '';
    if (awayScoreChange === 2) twoPointTeam = awayName;
    else if (homeScoreChange === 2) twoPointTeam = homeName;

    if (lowerLastPlay.includes('good') || lowerLastPlay.includes('success')) {
      events.push({
        type: 'two-point',
        text: '2-POINT CONVERSION!',
        teamName: twoPointTeam,
        isNegated: isNegated
      });
    }
  }

  // 10. SACK detection
  if (lowerLastPlay.includes('sack') || lowerLastPlay.includes('sacked')) {
    let sackerName = '';
    let sackMatch = lastPlay.match(/sacked\s+by\s+([A-Z][a-z]*\.?\s*[A-Z][A-Za-z'-]+)/i);
    if (sackMatch) {
      sackerName = sackMatch[1].trim();
    } else {
      sackMatch = lastPlay.match(/([A-Z][a-z]*\.?\s*[A-Z][A-Za-z'-]+)\s+sack/i);
      if (sackMatch) sackerName = sackMatch[1].trim();
    }

    events.push({
      type: 'sack',
      text: 'SACK!',
      teamName: sackerName,
      isNegated: isNegated
    });
  }

  // 11. PUNT detection
  if (lowerLastPlay.includes('punt') && !lowerLastPlay.includes('fake') &&
    !events.some(e => e.type === 'touchdown')) {
    if (!lowerLastPlay.includes('touchdown')) {
      events.push({
        type: 'punt',
        text: 'PUNT!',
        teamName: '',
        isNegated: isNegated
      });
    }
  }

  // 12. PENALTY detection (always show last so action is seen first)
  if ((lowerLastPlay.includes('penalty') || lowerLastPlay.includes('flag')) &&
    !lowerLastPlay.includes('no flags') && !lowerLastPlay.includes('declined')) {

    let penaltyName = 'PENALTY';
    let offenseDefense = '';
    let playerName = '';
    let teamLogo = '';

    // Common penalty patterns
    const penaltyPatterns = [
      'holding', 'false start', 'offsides', 'pass interference',
      'roughing the passer', 'roughing the kicker', 'facemask',
      'unnecessary roughness', 'unsportsmanlike conduct', 'delay of game',
      'illegal formation', 'illegal motion', 'illegal shift', 'encroachment',
      'neutral zone infraction', 'intentional grounding', 'illegal contact',
      'defensive holding', 'offensive holding', 'personal foul',
      'illegal use of hands', 'illegal block', 'clipping', 'chop block',
      'horse collar', 'taunting', 'illegal substitution', 'too many men',
      'illegal touching', 'ineligible receiver', 'illegal forward pass'
    ];

    for (const penalty of penaltyPatterns) {
      if (lowerLastPlay.includes(penalty)) {
        penaltyName = penalty.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        break;
      }
    }

    // Determine offense or defense
    if (lowerLastPlay.includes('offense') || lowerLastPlay.includes('offensive')) {
      offenseDefense = 'OFFENSE';
    } else if (lowerLastPlay.includes('defense') || lowerLastPlay.includes('defensive')) {
      offenseDefense = 'DEFENSE';
    } else {
      const offensivePenalties = ['false start', 'illegal motion', 'illegal shift',
        'offensive holding', 'illegal formation', 'delay of game',
        'intentional grounding', 'ineligible receiver'];
      const defensivePenalties = ['offsides', 'encroachment', 'neutral zone infraction',
        'defensive holding', 'pass interference', 'roughing', 'illegal use of hands'];

      if (offensivePenalties.some(p => lowerLastPlay.includes(p))) {
        offenseDefense = 'OFFENSE';
      } else if (defensivePenalties.some(p => lowerLastPlay.includes(p))) {
        offenseDefense = 'DEFENSE';
      }
    }

    // Extract player name
    const playerMatch = lastPlay.match(/PENALTY\s+on\s+[A-Z]{2,4}-([A-Z]\.[A-Za-z'-]+)/i);
    if (playerMatch) {
      playerName = playerMatch[1];
    }

    // Get team logo from "PENALTY on [TEAM]-" pattern
    const penaltyOnMatch = lastPlay.match(/PENALTY\s+on\s+([A-Z]{2,4})-/i);
    if (penaltyOnMatch) {
      const penaltyTeamAbbr = penaltyOnMatch[1].toUpperCase();
      if (penaltyTeamAbbr === awayAbbr.toUpperCase()) {
        teamLogo = awayLogo;
      } else if (penaltyTeamAbbr === homeAbbr.toUpperCase()) {
        teamLogo = homeLogo;
      }
    }

    const penaltyInfo = `${penaltyName}|${offenseDefense}|${playerName}|${teamLogo}`;
    events.push({
      type: 'penalty',
      text: 'FLAG!',
      teamName: '',
      recoveryInfo: penaltyInfo,
      isNegated: false // Penalty itself is not negated
    });
  }

  // Queue all detected events for animation
  // Track if we have a fumble or interception to show play text modal after
  let hasTurnoverAnimation = false;

  for (const event of events) {
    if (event.type === 'penalty') {
      showPlayAnimation(card, event.type, event.text, event.teamName, event.recoveryInfo, event.logo || '', false);
    } else {
      showPlayAnimation(card, event.type, event.text, event.teamName, event.recoveryInfo || '', event.logo || '', isNegated && event.type !== 'penalty');
    }

    // Check for turnover events
    if (event.type === 'fumble' || event.type === 'interception') {
      hasTurnoverAnimation = true;
    }
  }

  // Log detected events for debugging
  if (events.length > 0) {
    console.log('🎬 Play events detected:', events.map(e => e.type + (e.isNegated ? ' (NEGATED)' : '')).join(', '));
  }

  // Show play text modal after fumble/interception animation completes (8 seconds)
  if (hasTurnoverAnimation && lastPlay) {
    setTimeout(() => {
      showPlayTextModal(card, lastPlay, 15000);
    }, 8000); // Wait for main animation to finish
  }

  // Score-based detection fallback (for when play text doesn't match)
  const hasScoringEvent = events.some(e =>
    e.type === 'touchdown' || e.type === 'field-goal' || e.type === 'safety' || e.type === 'two-point'
  );

  if (!hasScoringEvent) {
    if (awayScoreChange > 0) {
      detectAndAnimatePlay(card, awayScoreChange, awayName, lastPlay);
    } else if (homeScoreChange > 0) {
      detectAndAnimatePlay(card, homeScoreChange, homeName, lastPlay);
    }
  }

  // Exclusion conditions - don't trigger on turnovers, punts, or scores
  const isTurnover = lowerLastPlay.includes('interception') ||
    lowerLastPlay.includes('intercepted') ||
    lowerLastPlay.includes('fumble') ||
    lowerLastPlay.includes('recovered by');

  const isPuntOrKick = lowerLastPlay.includes('punt') ||
    lowerLastPlay.includes('kickoff') ||
    lowerLastPlay.includes('kicks');

  const isScoreOrPenalty = lowerLastPlay.includes('touchdown') ||
    lowerLastPlay.includes('penalty') ||
    awayScoreChange > 0 || homeScoreChange > 0;

  // Check for TURNOVER ON DOWNS
  // Conditions: 4th down play + possession changed + no score + no other turnover + no punt/kick
  const was4thDown = prevDown === 4;
  const possessionChanged = prevPossession !== null && currentPossession !== null &&
    prevPossession !== currentPossession;

  // Turnover on downs is specifically: 4th down + possession change + NOT a punt/kick/fumble/int
  const isTurnoverOnDowns = was4thDown && possessionChanged && !isTurnover && !isPuntOrKick && !isScoreOrPenalty;

  if (isTurnoverOnDowns) {
    const turnoverKey = `turnover-${downDistanceText}-${lastPlay.substring(0, 50)}`;
    if (card.dataset.lastTurnoverOnDowns !== turnoverKey) {
      showPlayAnimation(card, 'turnover-on-downs', 'TURNOVER ON DOWNS!');
      card.dataset.lastTurnoverOnDowns = turnoverKey;
      console.log('🔄 Turnover on downs detected:', { prevDown, currentDown, prevPossession, currentPossession });
    }
  }

  // Check for 1st down animation
  // Detect first down from play text (most reliable method)
  const playTextHasFirstDown = lowerLastPlay.includes('1st down') ||
    lowerLastPlay.includes('first down') ||
    lowerLastPlay.includes('1st and') ||
    lowerLastPlay.includes('for a 1st');

  // Detect first down from down transition (2nd/3rd/4th -> 1st)
  // Only trigger if possession did NOT change (same team earned the first down)
  // Excludes: punts, kickoffs, turnovers, turnover on downs
  const downTransitionFirstDown = currentDown === 1 && prevDown >= 2 && prevDown <= 4 &&
    !possessionChanged;

  // Detect first down when staying on 1st down but yard line changed significantly
  // This catches 1st down -> new 1st down scenarios (same team keeps moving)
  const sameDownNewFirstDown = currentDown === 1 && prevDown === 1 &&
    downDistanceText !== prevDownDistance && prevDownDistance !== '' &&
    playTextHasFirstDown && !possessionChanged;

  // First down only when same team earns it (no possession change)
  const isNewFirstDown = (downTransitionFirstDown || sameDownNewFirstDown ||
    (playTextHasFirstDown && currentDown === 1 && card.dataset.lastPlayText !== lastPlay && !possessionChanged));

  if (isNewFirstDown && !isTurnover && !isPuntOrKick && !isScoreOrPenalty) {
    // Use lastPlay as part of the key to prevent duplicate triggers
    const firstDownKey = `${downDistanceText}-${lastPlay.substring(0, 50)}`;
    if (card.dataset.lastFirstDown !== firstDownKey) {
      showPlayAnimation(card, 'first-down', '1ST DOWN!');
      card.dataset.lastFirstDown = firstDownKey;
    }
  }

  // Store last play text for comparison
  card.dataset.lastPlayText = lastPlay;

  return events;
}

/**
 * Show NHL-specific animation
 * @param {HTMLElement} card - The game card element
 * @param {string} playType - 'goal', 'hattrick', 'save', 'powerplay', 'nhl-penalty', 'shootout'
 * @param {string} playText - The text to display
 * @param {string} teamName - The team name
 */
function showNHLAnimation(card, playType, playText, teamName = '') {
  // Skip animations during first 6 seconds after page load
  if (fullscreenEnteredAt && (Date.now() - fullscreenEnteredAt) < 3000) {
    return;
  }

  // Remove any existing animation
  const existingAnimation = card.querySelector('.play-animation');
  if (existingAnimation) {
    existingAnimation.remove();
  }

  // Create animation overlay
  const animationDiv = document.createElement('div');
  animationDiv.className = `play-animation ${playType}`;

  // Choose icon based on play type
  let icon;
  switch (playType) {
    case 'goal':
      icon = '🚨';
      break;
    case 'save':
      icon = '🧤';
      break;
    case 'powerplay':
      icon = '⚡';
      break;
    case 'hattrick':
      icon = '🎩';
      break;
    case 'nhl-penalty':
      icon = '⚠️';
      break;
    case 'shootout':
      icon = '🥅';
      break;
    default:
      icon = '🏒';
  }

  animationDiv.innerHTML = `
    <div class="play-animation-icon">${icon}</div>
    <div class="play-animation-text">${playText}</div>
    ${teamName ? `<div class="play-animation-subtext">${teamName}</div>` : ''}
  `;

  card.style.position = 'relative';
  card.appendChild(animationDiv);

  // Remove after animation completes (5 seconds for NHL - shorter than football)
  setTimeout(() => {
    if (animationDiv.parentNode) {
      animationDiv.remove();
    }
  }, 5000);
}

/**
 * Detect NHL play events and trigger animations
 * @param {HTMLElement} card - The game card element
 * @param {Object} game - Game data object with away/home scores
 * @param {Object} comp - Competition data with competitors
 * @param {Object} prevData - Previous game state (awayScore, homeScore)
 */
function detectNHLPlayEvents(card, game, comp, prevData) {
  const awayScoreChange = game.away.score - (prevData.awayScore || 0);
  const homeScoreChange = game.home.score - (prevData.homeScore || 0);

  const awayTeam = comp.competitors?.find(c => c.homeAway === 'away');
  const homeTeam = comp.competitors?.find(c => c.homeAway === 'home');
  const awayName = awayTeam?.team?.displayName || 'Away';
  const homeName = homeTeam?.team?.displayName || 'Home';

  // Detect goals
  if (awayScoreChange > 0 || homeScoreChange > 0) {
    const scoringTeam = awayScoreChange > 0 ? awayName : homeName;
    const scoreChange = awayScoreChange > 0 ? awayScoreChange : homeScoreChange;

    let playType, playText;
    if (scoreChange >= 3) {
      playType = 'hattrick';
      playText = 'HAT TRICK!';
    } else {
      playType = 'goal';
      playText = 'GOAL!';
    }

    showNHLAnimation(card, playType, playText, scoringTeam);
    console.log('🏒 NHL event:', playType, scoringTeam);
  }
}

/**
 * Show MLB-specific animation
 * @param {HTMLElement} card - The game card element
 * @param {string} playType - 'home-run', 'strikeout', 'double-play', 'stolen-base', 'walk', 'hit', 'grand-slam'
 * @param {string} playText - The text to display
 * @param {string} teamName - The team name
 */
function showMLBAnimation(card, playType, playText, teamName = '') {
  // Skip animations during first 3 seconds after page load
  if (fullscreenEnteredAt && (Date.now() - fullscreenEnteredAt) < 3000) {
    return;
  }

  // Remove any existing animation
  const existingAnimation = card.querySelector('.play-animation');
  if (existingAnimation) {
    existingAnimation.remove();
  }

  // Create animation overlay
  const animationDiv = document.createElement('div');
  animationDiv.className = `play-animation ${playType}`;

  // Choose icon based on play type
  let icon;
  switch (playType) {
    case 'home-run':
    case 'grand-slam':
      icon = '💥';
      break;
    case 'strikeout':
      icon = '🔥';
      break;
    case 'double-play':
      icon = '⚡';
      break;
    case 'stolen-base':
      icon = '🏃';
      break;
    case 'walk':
      icon = '🚶';
      break;
    case 'hit':
      icon = '💪';
      break;
    default:
      icon = '⚾';
  }

  // Special HTML for home run with baseball flying
  if (playType === 'home-run' || playType === 'grand-slam') {
    animationDiv.innerHTML = `
      <div class="home-run-container">
        <div class="home-run-ball">⚾</div>
        <div class="home-run-explosion">💥</div>
      </div>
      <div class="play-animation-text">${playText}</div>
      ${teamName ? `<div class="play-animation-subtext">${teamName}</div>` : ''}
    `;
  } else if (playType === 'strikeout') {
    animationDiv.innerHTML = `
      <div class="strikeout-container">
        <div class="strikeout-k">K</div>
      </div>
      <div class="play-animation-text">${playText}</div>
      ${teamName ? `<div class="play-animation-subtext">${teamName}</div>` : ''}
    `;
  } else {
    animationDiv.innerHTML = `
      <div class="play-animation-icon">${icon}</div>
      <div class="play-animation-text">${playText}</div>
      ${teamName ? `<div class="play-animation-subtext">${teamName}</div>` : ''}
    `;
  }

  card.style.position = 'relative';
  card.appendChild(animationDiv);

  // Remove after animation completes (5 seconds for MLB)
  setTimeout(() => {
    if (animationDiv.parentNode) {
      animationDiv.remove();
    }
  }, 5000);
}

/**
 * Detect MLB play events and trigger animations
 * @param {HTMLElement} card - The game card element
 * @param {Object} game - Game data object with away/home scores
 * @param {Object} comp - Competition data with competitors
 * @param {Object} prevData - Previous game state (awayScore, homeScore, outs)
 */
function detectMLBPlayEvents(card, game, comp, prevData) {
  const awayScoreChange = game.away.score - (prevData.awayScore || 0);
  const homeScoreChange = game.home.score - (prevData.homeScore || 0);

  const awayTeam = comp.competitors?.find(c => c.homeAway === 'away');
  const homeTeam = comp.competitors?.find(c => c.homeAway === 'home');
  const awayName = awayTeam?.team?.displayName || 'Away';
  const homeName = homeTeam?.team?.displayName || 'Home';

  // Detect runs scored
  if (awayScoreChange > 0 || homeScoreChange > 0) {
    const scoringTeam = awayScoreChange > 0 ? awayName : homeName;
    const runsScored = awayScoreChange > 0 ? awayScoreChange : homeScoreChange;

    let playType, playText;
    if (runsScored >= 4) {
      playType = 'grand-slam';
      playText = 'GRAND SLAM!';
    } else if (runsScored >= 1) {
      // Could be a home run or just runs scored
      playType = 'home-run';
      playText = runsScored === 1 ? 'RUN SCORED!' : `${runsScored} RUNS!`;
    }

    showMLBAnimation(card, playType, playText, scoringTeam);
    console.log('⚾ MLB event:', playType, scoringTeam);
  }

  // Detect strikeout (outs increased and situation suggests strikeout)
  const currentOuts = game.outs || 0;
  const prevOuts = prevData.outs || 0;
  if (currentOuts > prevOuts) {
    // Could trigger strikeout animation here if we had play-by-play text
    // For now, we just track the out change
  }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setFullscreenEnteredAt,
    getFullscreenEnteredAt,
    detectAndAnimatePlay,
    showPlayAnimation,
    showPlayAnimationDirect,
    showPlayTextModal,
    analyzeAndAnimatePlay,
    queueAnimation,
    processNextAnimation,
    showNHLAnimation,
    detectNHLPlayEvents,
    showMLBAnimation,
    detectMLBPlayEvents
  };
}
