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

  // Store creation time and duration for preservation across re-renders
  modal.dataset.createdAt = Date.now().toString();
  modal.dataset.duration = duration.toString();

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
    }, 1500); // Match fade-out transition duration
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
  if (playType === 'fumble') {
    // For fumbles: teamName = fumbling team, recoveryInfo = recovery team name, recoveryLogo = recovery team logo
    if (teamName) {
      recoveryHTML = `<div class="play-animation-subtext" style="margin-top: clamp(5px, 1vh, 10px);">Fumble by ${teamName}</div>`;
    }
    if (recoveryLogo) {
      recoveryHTML += `
        <div class="play-animation-subtext" style="margin-top: clamp(5px, 1vh, 10px);">Recovered by</div>
        <img src="${recoveryLogo}" alt="Team" style="width: clamp(40px, 8vmin, 80px); height: clamp(40px, 8vmin, 80px); object-fit: contain; margin-top: clamp(5px, 1vh, 10px);">
      `;
    } else if (recoveryInfo) {
      recoveryHTML += `<div class="play-animation-subtext" style="margin-top: clamp(5px, 1vh, 10px);">${recoveryInfo}</div>`;
    }
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
    // For fumbles, don't show teamName separately since it's in recoveryHTML as "Fumble by X"
    const showTeamName = teamName && playType !== 'fumble';
    animationDiv.innerHTML = `
      <div class="play-animation-icon">${icon}</div>
      <div class="play-animation-text">${playText}</div>
      ${showTeamName ? `<div class="play-animation-subtext">${teamName}</div>` : ''}
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
    currentPossession = null,
    fieldPosition = '',  // Field position at start of play, e.g., "KC 35"
    awayAbbr: providedAwayAbbr = '',
    homeAbbr: providedHomeAbbr = ''
  } = options;

  // Debug: Log when this function is called
  console.log('🔍 analyzeAndAnimatePlay called:', {
    gameId: card?.dataset?.gameId,
    awayScoreChange,
    homeScoreChange,
    lastPlayPreview: lastPlay.substring(0, 80) + '...'
  });

  const lowerLastPlay = lastPlay.toLowerCase();

  // Detect if play was negated by penalty
  // "No Play" explicitly means the play was called back
  // "enforced between downs" means the play stood and penalty applied after (NOT negated)
  // Only consider negated if "No Play" appears OR penalty on offense during scoring play
  const hasNoPlay = lowerLastPlay.includes('no play');
  const enforcedBetweenDowns = lowerLastPlay.includes('enforced between downs');
  const isNegated = hasNoPlay && !enforcedBetweenDowns;

  // Helper to get team info
  const awayAbbr = providedAwayAbbr || awayTeam?.team?.abbreviation || '';
  const homeAbbr = providedHomeAbbr || homeTeam?.team?.abbreviation || '';
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
    let fumbleTeam = '';
    let fumbleLogo = '';
    let recoveryTeam = '';
    let recoveryLogo = '';

    // The fumbling team is the team with possession at the start of the play
    // Use prevPossession as the primary indicator
    if (prevPossession) {
      if (prevPossession === 'away') {
        fumbleTeam = awayName;
        fumbleLogo = awayLogo;
      } else if (prevPossession === 'home') {
        fumbleTeam = homeName;
        fumbleLogo = homeLogo;
      }
    }

    // Parse "RECOVERED by TEAM-PlayerName" format to find recovery team
    // Example: "RECOVERED by NE-E.Ponder" or "RECOVERED by JAX-D.Lloyd" or "RECOVERED by PIT-T.Watt"
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

    // Check for self-recovery patterns: "and recovers" or ", recovers"
    const selfRecovery = lowerLastPlay.includes('and recovers') || lowerLastPlay.includes(', recovers');
    if (selfRecovery && fumbleTeam && !recoveryTeam) {
      // Same team recovered their own fumble
      recoveryTeam = fumbleTeam;
      recoveryLogo = fumbleLogo;
    }

    // Determine if it's a turnover (different teams)
    const isTurnoverFumble = fumbleTeam && recoveryTeam && fumbleTeam !== recoveryTeam;

    // Debug log for fumble detection
    console.log('🏈 Fumble detected:', {
      fumbleTeam,
      recoveryTeam,
      isTurnoverFumble,
      selfRecovery,
      prevPossession,
      awayAbbr,
      homeAbbr,
      playPreview: lastPlay.substring(0, 100)
    });

    events.push({
      type: 'fumble',
      text: 'FUMBLE!',
      teamName: fumbleTeam,      // Who fumbled
      logo: fumbleLogo,          // Fumbling team's logo
      recoveryTeam: recoveryTeam, // Who recovered
      recoveryLogo: recoveryLogo, // Recovery team's logo
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

  // 11. PUNT detection - DISABLED: Now using field visualizer animation instead
  // if (lowerLastPlay.includes('punt') && !lowerLastPlay.includes('fake') &&
  //   !events.some(e => e.type === 'touchdown')) {
  //   if (!lowerLastPlay.includes('touchdown')) {
  //     events.push({
  //       type: 'punt',
  //       text: 'PUNT!',
  //       teamName: '',
  //       isNegated: isNegated
  //     });
  //   }
  // }

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

  // Build options for SVG field animation
  const svgAnimationOptions = {
    awayAbbr,
    homeAbbr,
    fieldPosition,
    possession: currentPossession
  };

  for (const event of events) {
    if (event.type === 'penalty') {
      showPlayAnimation(card, event.type, event.text, event.teamName, event.recoveryInfo, event.logo || '', false);
    } else if (event.type === 'fumble') {
      // For fumbles, pass recovery team info as recoveryInfo and recoveryLogo
      const recoveryInfo = event.recoveryTeam ? `Recovery: ${event.recoveryTeam}` : '';
      showPlayAnimation(card, event.type, event.text, event.teamName, recoveryInfo, event.recoveryLogo || '', isNegated);
    } else {
      showPlayAnimation(card, event.type, event.text, event.teamName, event.recoveryInfo || '', event.logo || '', isNegated && event.type !== 'penalty');
    }

    // Trigger SVG field animation for non-penalty events
    if (event.type !== 'penalty' && !isNegated) {
      animatePlayOnSVGField(card, event, lastPlay, svgAnimationOptions);
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

  // Debug logging for 4th down plays
  if (was4thDown) {
    console.log('🔍 4th down play analysis:', {
      prevDown,
      currentDown,
      prevPossession,
      currentPossession,
      possessionChanged,
      isPuntOrKick,
      isTurnover,
      isScoreOrPenalty,
      isTurnoverOnDowns,
      lastPlayPreview: lastPlay.substring(0, 80)
    });
  }

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

  // Detect first down when staying on 1st down but field position changed
  // This catches 1st down -> new 1st down scenarios (same team keeps moving)
  // Example: "1st & 10 at SF 31" -> "1st & 10 at SF 41" (team gained 10 yards, new 1st down)
  // We detect this by checking if the down/distance text changed while staying on 1st & 10
  const sameDownNewFirstDown = currentDown === 1 && prevDown === 1 &&
    downDistanceText !== prevDownDistance && prevDownDistance !== '' &&
    downDistanceText.includes('1st & 10') && prevDownDistance.includes('1st & 10') &&
    !possessionChanged;

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

// ============================================
// SVG FIELD ANIMATION INTEGRATION
// ============================================

/**
 * Parse yard positions from play text
 * Extracts starting position, ending position, and yards gained
 * @param {string} playText - Full play text from API
 * @param {string} fieldPosition - Current field position (e.g., "KC 35")
 * @param {Object} teams - { awayAbbr, homeAbbr }
 * @returns {Object|null} { fromYard, toYard, yardsGained, playAction }
 */
function parseYardPositionsFromPlay(playText, fieldPosition, teams) {
  if (!playText) return null;

  const { awayAbbr, homeAbbr } = teams;
  const lowerText = playText.toLowerCase();

  // Parse starting position from field position
  let fromYard = 50; // Default to midfield
  if (fieldPosition) {
    const fieldMatch = fieldPosition.match(/([A-Z]{2,4})\s+(\d+)/i);
    if (fieldMatch) {
      const teamAbbr = fieldMatch[1].toUpperCase();
      const yardLine = parseInt(fieldMatch[2]);
      if (teamAbbr === awayAbbr?.toUpperCase()) {
        fromYard = yardLine;
      } else if (teamAbbr === homeAbbr?.toUpperCase()) {
        fromYard = 100 - yardLine;
      }
    }
  }

  let toYard = fromYard;
  let yardsGained = 0;
  let playAction = null;

  // Pattern: "for X yards" or "for X yard"
  const yardsMatch = playText.match(/for\s+(-?\d+)\s+yards?/i);
  // Pattern: "X yard pass" or "X yard run"
  const yardPlayMatch = playText.match(/(\d+)\s+yard\s+(pass|run|rush)/i);
  // Pattern: "to [TEAM] [YARD]" for ending position
  const toPositionMatch = playText.match(/to\s+([A-Z]{2,4})\s+(\d+)/i);
  // Pattern: "at [TEAM] [YARD]" for ending position (sacks, etc.)
  const atPositionMatch = playText.match(/at\s+([A-Z]{2,4})\s+(\d+)/i);

  // Determine play action type
  if (lowerText.includes('pass') || lowerText.includes('complete') || lowerText.includes('incomplete')) {
    playAction = lowerText.includes('incomplete') ? 'incomplete_pass' : 'pass';
  } else if (lowerText.includes('run') || lowerText.includes('rush') || lowerText.includes('scramble')) {
    playAction = 'rush';
  } else if (lowerText.includes('sack')) {
    playAction = 'sack';
  } else if (lowerText.includes('kneel') || lowerText.includes('knee')) {
    playAction = 'kneel';
  }

  // Calculate ending position from "to [TEAM] [YARD]" pattern
  if (toPositionMatch && !lowerText.includes('punt') && !lowerText.includes('kick')) {
    const toTeam = toPositionMatch[1].toUpperCase();
    const toYardLine = parseInt(toPositionMatch[2]);
    if (toTeam === awayAbbr?.toUpperCase()) {
      toYard = toYardLine;
    } else if (toTeam === homeAbbr?.toUpperCase()) {
      toYard = 100 - toYardLine;
    }
    yardsGained = Math.abs(toYard - fromYard);
  }
  // Fallback to "at [TEAM] [YARD]" pattern
  else if (atPositionMatch && playAction === 'sack') {
    const atTeam = atPositionMatch[1].toUpperCase();
    const atYardLine = parseInt(atPositionMatch[2]);
    if (atTeam === awayAbbr?.toUpperCase()) {
      toYard = atYardLine;
    } else if (atTeam === homeAbbr?.toUpperCase()) {
      toYard = 100 - atYardLine;
    }
    yardsGained = toYard - fromYard; // Will be negative for sacks
  }
  // Fallback to yards gained pattern
  else if (yardsMatch) {
    yardsGained = parseInt(yardsMatch[1]);
    // Estimate toYard (may not be accurate for all plays)
    toYard = fromYard + yardsGained;
  } else if (yardPlayMatch) {
    yardsGained = parseInt(yardPlayMatch[1]);
    toYard = fromYard + yardsGained;
  }

  // Clamp to field bounds
  toYard = Math.max(0, Math.min(100, toYard));

  // Handle touchdown - ball goes to end zone
  if (lowerText.includes('touchdown') || lowerText.includes('for a td')) {
    // Determine which end zone based on direction of travel
    if (toYard > fromYard) {
      toYard = 100; // Heading toward home end zone
    } else if (toYard < fromYard) {
      toYard = 0; // Heading toward away end zone
    } else {
      // If no clear direction, use the closer end zone
      toYard = fromYard > 50 ? 100 : 0;
    }
  }

  return {
    fromYard,
    toYard,
    yardsGained,
    playAction
  };
}

/**
 * Trigger SVG field animation for a detected play
 * @param {HTMLElement} card - The game card element
 * @param {Object} event - Detected play event from analyzeAndAnimatePlay
 * @param {string} playText - Original play text from API
 * @param {Object} options - { awayAbbr, homeAbbr, fieldPosition, possession }
 */
async function animatePlayOnSVGField(card, event, playText, options = {}) {
  const gameId = card.dataset.gameId;
  const visualizer = window.fieldVisualizers?.get(gameId);

  if (!visualizer) {
    console.log('⚠️ SVG animation skipped - no field visualizer for game:', gameId);
    return;
  }

  const { awayAbbr = '', homeAbbr = '', fieldPosition = '', possession = '' } = options;

  // Parse yard positions from play text
  const positions = parseYardPositionsFromPlay(playText, fieldPosition, { awayAbbr, homeAbbr });
  if (!positions) {
    console.log('⚠️ SVG animation skipped - could not parse positions from:', playText.substring(0, 50));
    return;
  }

  const { fromYard, toYard, yardsGained, playAction } = positions;

  console.log('🎬 SVG field animation:', {
    eventType: event.type,
    playAction,
    fromYard,
    toYard,
    yardsGained
  });

  try {
    switch (event.type) {
      case 'touchdown':
        // Animate the scoring play
        const tdPlayType = playAction === 'pass' || playAction === 'incomplete_pass' ? 'pass' : 'rush';
        await visualizer.animateTouchdown(tdPlayType, fromYard, toYard, 1500);
        break;

      case 'interception':
        // Animate pass that gets intercepted
        const returnYards = event.text.includes('PICK SIX') ? -1 : 15; // Pick-six or 15-yard return
        await visualizer.animateInterception(fromYard, toYard, returnYards, 1200);
        break;

      case 'fumble':
        // Animate rush that leads to fumble
        const recoveryYard = toYard + (event.recoveryTeam === event.teamName ? 1 : -5);
        const offenseRecovery = event.recoveryTeam === event.teamName;
        await visualizer.animateFumble(fromYard, toYard, recoveryYard, offenseRecovery, 800);
        break;

      case 'field-goal':
        // Animate field goal kick - away kicks toward right (100), home kicks toward left (0)
        const fgDirection = possession === 'away' ? 'right' : 'left';
        await visualizer.animateFieldGoal(fromYard, fgDirection, 2500);
        break;

      case 'missed-kick':
        // Animate missed field goal - away kicks toward right (100), home kicks toward left (0)
        const missDirection = possession === 'away' ? 'right' : 'left';
        const missType = event.text.includes('WIDE') ? 'wide_right' : 'short';
        await visualizer.animateMissedFieldGoal(fromYard, missDirection, missType, 2500);
        break;

      case 'sack':
        // Animate sack (backwards movement)
        const yardsLost = Math.abs(yardsGained) || 7;
        await visualizer.animateSack(fromYard, yardsLost, 800);
        break;

      case 'safety':
        // Animate play that ends in safety (tackled in own end zone)
        await visualizer.animateRush(fromYard, fromYard > 50 ? 100 : 0, 1000);
        break;

      case 'two-point':
        // Animate two-point conversion attempt
        const twoPointType = playAction === 'pass' ? 'pass' : 'rush';
        if (twoPointType === 'pass') {
          await visualizer.animatePass(fromYard, toYard, 15, 1000);
        } else {
          await visualizer.animateRush(fromYard, toYard, 800);
        }
        break;

      case 'first-down':
        // Animate the play that resulted in first down
        if (playAction === 'pass' || playAction === 'incomplete_pass') {
          await visualizer.animatePass(fromYard, toYard, 20, 1000);
        } else {
          await visualizer.animateRush(fromYard, toYard, 800);
        }
        break;

      default:
        // Generic animation based on play action
        if (playAction === 'pass') {
          await visualizer.animatePass(fromYard, toYard, 20, 1000);
        } else if (playAction === 'incomplete_pass') {
          await visualizer.animateIncompletePass(fromYard, toYard, 1000);
        } else if (playAction === 'rush' || playAction === 'scramble') {
          await visualizer.animateRush(fromYard, toYard, 800);
        } else if (playAction === 'sack') {
          await visualizer.animateSack(fromYard, Math.abs(yardsGained) || 7, 800);
        }
        break;
    }

    // Update ball position after animation
    visualizer.setBallPosition(toYard);

  } catch (err) {
    console.error('🏈 SVG field animation error:', err);
  }
}

// ============================================
// SPECIAL TEAMS ANIMATIONS (Kickoff/Punt)
// ============================================

/**
 * Convert team yard line to field percentage (0-100)
 * @param {string} teamAbbr - Team abbreviation for the yard line
 * @param {number} yardLine - Yard line number (0-50)
 * @param {string} awayAbbr - Away team abbreviation
 * @param {string} homeAbbr - Home team abbreviation
 * @returns {number} Field percentage (0 = away endzone, 100 = home endzone)
 */
function yardLineToFieldPercent(teamAbbr, yardLine, awayAbbr, homeAbbr) {
  const upperTeam = (teamAbbr || '').toUpperCase();
  const upperAway = (awayAbbr || '').toUpperCase();
  const upperHome = (homeAbbr || '').toUpperCase();

  // Debug logging for field position calculation
  console.log('🏈 yardLineToFieldPercent:', { teamAbbr: upperTeam, yardLine, awayAbbr: upperAway, homeAbbr: upperHome });

  // If we don't have team abbreviations, we can't calculate properly
  if (!upperAway || !upperHome) {
    console.warn('⚠️ Missing team abbreviations for field position calculation');
    // Fallback: assume yard line is direct position if < 50, else 100 - yardLine
    return yardLine <= 50 ? yardLine : 100 - yardLine;
  }

  // Away team's side (0-50): yard line = percentage (e.g., CHI 2 = 2%)
  // Home team's side (50-100): 100 - yard line (e.g., GB 35 = 65%)
  if (upperTeam === upperAway) {
    const result = yardLine;
    console.log(`  → ${upperTeam} is AWAY team, position: ${result}`);
    return result;
  } else if (upperTeam === upperHome) {
    const result = 100 - yardLine;
    console.log(`  → ${upperTeam} is HOME team, position: ${result}`);
    return result;
  }

  // Team not found - try case-insensitive partial match
  console.warn(`⚠️ Team ${upperTeam} not matched to away (${upperAway}) or home (${upperHome})`);
  return 50; // Fallback to midfield
}

/**
 * Parse kickoff/punt play text to extract distances and positions
 * @param {string} playText - Full play text from API
 * @param {string} prevFieldPosition - Previous field position (for punts, e.g., "KC 35")
 * @param {Object} teams - { awayAbbr, homeAbbr }
 * @returns {Object|null} Parsed data or null if not a special teams play
 */
function parseSpecialTeamsPlay(playText, prevFieldPosition, teams) {
  if (!playText) return null;

  const lowerText = playText.toLowerCase();
  const { awayAbbr, homeAbbr } = teams;

  // Skip blocked kicks/punts - they're handled differently
  if (lowerText.includes('blocked')) return null;

  // Detect play type
  const isKickoff = lowerText.includes('kicks') && (lowerText.includes('yards from') || lowerText.includes('yard from'));
  const isPunt = lowerText.includes('punts') && (lowerText.includes('yards to') || lowerText.includes('yard to'));

  if (!isKickoff && !isPunt) return null;

  // Edge case detection
  const isTouchback = /touchback/i.test(playText);
  const isFairCatch = /fair\s*catch/i.test(playText);
  const isOutOfBounds = /out\s*of\s*bounds|out-of-bounds|\bob\b/i.test(playText);

  let kickOrigin = null;
  let landingSpot = null;
  let returnEnd = null;

  if (isKickoff) {
    // Kickoff pattern 1: "C.Boswell kicks 63 yards from PIT 35 to HST 2"
    // Note: yard line can be negative (e.g., "to PIT -1" means into the end zone)
    const kickoffMatch = playText.match(/kicks?\s+(\d+)\s+yards?\s+from\s+([A-Z]{2,4})\s+(-?\d+)\s+to\s+([A-Z]{2,4})\s+(-?\d+)/i);

    // Kickoff pattern 2: "K.Fairbairn kicks 65 yards from HST 35 to end zone, Touchback"
    // When kick goes to "end zone", we need to extract origin and infer landing
    const kickoffEndZoneMatch = !kickoffMatch && playText.match(/kicks?\s+(\d+)\s+yards?\s+from\s+([A-Z]{2,4})\s+(-?\d+)\s+to\s+(?:the\s+)?end\s*zone/i);

    if (kickoffMatch) {
      const originYardLine = parseInt(kickoffMatch[3]);
      const landingYardLine = parseInt(kickoffMatch[5]);

      kickOrigin = {
        team: kickoffMatch[2],
        yardLine: originYardLine,
        fieldPercent: yardLineToFieldPercent(kickoffMatch[2], Math.max(0, originYardLine), awayAbbr, homeAbbr)
      };
      landingSpot = {
        team: kickoffMatch[4],
        yardLine: landingYardLine,
        // Negative yard line means in/past the end zone - clamp to 0
        fieldPercent: yardLineToFieldPercent(kickoffMatch[4], Math.max(0, landingYardLine), awayAbbr, homeAbbr)
      };
    } else if (kickoffEndZoneMatch) {
      // Kick to end zone - origin is parsed, landing is the opposite end zone (0 yard line)
      const originYardLine = parseInt(kickoffEndZoneMatch[3]);
      const originTeam = kickoffEndZoneMatch[2];

      // Figure out which team's end zone it went to (opposite of kicking team)
      const landingTeam = originTeam.toUpperCase() === awayAbbr.toUpperCase() ? homeAbbr : awayAbbr;

      kickOrigin = {
        team: originTeam,
        yardLine: originYardLine,
        fieldPercent: yardLineToFieldPercent(originTeam, originYardLine, awayAbbr, homeAbbr)
      };
      landingSpot = {
        team: landingTeam,
        yardLine: 0, // End zone
        fieldPercent: yardLineToFieldPercent(landingTeam, 0, awayAbbr, homeAbbr)
      };
    }
  } else if (isPunt) {
    // Punt pattern: "C.Waitman punts 44 yards to HST 7"
    // Note: yard line can be negative (e.g., "to PIT -1" means into the end zone)
    const puntMatch = playText.match(/punts?\s+(\d+)\s+yards?\s+to\s+([A-Z]{2,4})\s+(-?\d+)/i);
    if (puntMatch) {
      const puntLandingYardLine = parseInt(puntMatch[3]);
      landingSpot = {
        team: puntMatch[2],
        yardLine: puntLandingYardLine,
        // Negative yard line means in/past the end zone - clamp to 0
        fieldPercent: yardLineToFieldPercent(puntMatch[2], Math.max(0, puntLandingYardLine), awayAbbr, homeAbbr)
      };

      // For punts, kick origin comes from previous play's field position
      if (prevFieldPosition) {
        const prevMatch = prevFieldPosition.match(/([A-Z]{2,4})\s+(\d+)/i);
        if (prevMatch) {
          kickOrigin = {
            team: prevMatch[1],
            yardLine: parseInt(prevMatch[2]),
            fieldPercent: yardLineToFieldPercent(prevMatch[1], parseInt(prevMatch[2]), awayAbbr, homeAbbr)
          };
        }
      }
    }
  }

  // If we couldn't parse the basic play, return null
  if (!landingSpot) return null;

  // Parse return: "J.Noel to HST 20 for 18 yards" or "ran ob at HST 8 for 1 yard"
  if (!isTouchback && !isFairCatch) {
    // Look for return pattern after the landing spot
    // Note: yard line can be negative in edge cases
    const returnMatch = playText.match(/\.\s*([A-Z]\.[A-Za-z'-]+)\s+(?:to|ran\s+ob\s+at)\s+([A-Z]{2,4})\s+(-?\d+)\s+for\s+(\d+)\s+yards?/i);
    if (returnMatch) {
      const returnYardLine = parseInt(returnMatch[3]);
      returnEnd = {
        team: returnMatch[2],
        yardLine: returnYardLine,
        fieldPercent: yardLineToFieldPercent(returnMatch[2], Math.max(0, returnYardLine), awayAbbr, homeAbbr),
        yards: parseInt(returnMatch[4])
      };
    }
  }

  // Handle touchback - try to extract actual touchback position from text
  // Format: "Touchback to the PIT 35" or "Touchback, PIT 30"
  if (isTouchback && landingSpot) {
    // Try to parse actual touchback destination from play text
    const touchbackMatch = playText.match(/touchback[,\s]+(?:to\s+(?:the\s+)?)?([A-Z]{2,4})\s+(\d+)/i);
    if (touchbackMatch) {
      returnEnd = {
        team: touchbackMatch[1],
        yardLine: parseInt(touchbackMatch[2]),
        fieldPercent: yardLineToFieldPercent(touchbackMatch[1], parseInt(touchbackMatch[2]), awayAbbr, homeAbbr)
      };
    } else {
      // Default: NFL kickoff touchback = 30, punt touchback = 20
      const touchbackYardLine = isKickoff ? 30 : 20;
      returnEnd = {
        team: landingSpot.team,
        yardLine: touchbackYardLine,
        fieldPercent: yardLineToFieldPercent(landingSpot.team, touchbackYardLine, awayAbbr, homeAbbr)
      };
    }
  }

  return {
    playType: isKickoff ? 'kickoff' : 'punt',
    kickOrigin,
    landingSpot,
    returnEnd,
    isTouchback,
    isFairCatch,
    isOutOfBounds
  };
}

/**
 * Animate kickoff or punt on field visualizer
 * @param {HTMLElement} card - Game card element
 * @param {Object} parsedPlay - Output from parseSpecialTeamsPlay()
 * @param {Object} options - { awayTeam, homeTeam, awayAbbr, homeAbbr }
 */
async function animateSpecialTeamsPlay(card, parsedPlay, options) {
  // Get the game ID from the card to look up the SVGFieldVisualizer
  const gameId = card.dataset.gameId;
  const visualizer = window.fieldVisualizers?.get(gameId);

  if (!visualizer) {
    console.log('⚠️ Special teams animation skipped - no field visualizer for game:', gameId);
    return;
  }

  const { playType, kickOrigin, landingSpot, returnEnd, isTouchback, isFairCatch } = parsedPlay;

  // Debug: Log the parsed positions and team mappings
  console.log('🏈 Special teams animation debug:', {
    kickOrigin: kickOrigin ? { team: kickOrigin.team, yardLine: kickOrigin.yardLine, fieldPercent: kickOrigin.fieldPercent } : null,
    landingSpot: landingSpot ? { team: landingSpot.team, yardLine: landingSpot.yardLine, fieldPercent: landingSpot.fieldPercent } : null,
    returnEnd: returnEnd ? { team: returnEnd.team, yardLine: returnEnd.yardLine, fieldPercent: returnEnd.fieldPercent } : null,
    options: { awayAbbr: options.awayAbbr, homeAbbr: options.homeAbbr }
  });

  // Calculate positions and durations
  const fromYard = kickOrigin ? kickOrigin.fieldPercent : (landingSpot?.fieldPercent || 35);
  const toYard = landingSpot?.fieldPercent || 75;
  const returnYards = returnEnd && landingSpot
    ? Math.abs(returnEnd.fieldPercent - landingSpot.fieldPercent)
    : 0;

  // Debug: Show the animation parameters
  console.log('🏈 Animation params:', { fromYard, toYard, returnYards, direction: fromYard > toYard ? 'LEFT (toward 0)' : 'RIGHT (toward 100)' });

  // Calculate animation durations based on distance
  const kickDistance = Math.abs(toYard - fromYard);
  const kickDuration = Math.max(1200, Math.min(2500, kickDistance * 25)); // 1.2s - 2.5s

  // Determine label text
  let labelText = playType === 'kickoff' ? 'KICKOFF' : 'PUNT';
  if (isTouchback) labelText = 'TOUCHBACK';
  if (isFairCatch) labelText = 'FAIR CATCH';

  console.log(`🏈 Special teams SVG animation: ${labelText}`, {
    fromYard,
    toYard,
    returnYards,
    kickDuration
  });

  try {
    // Set ball at starting position
    visualizer.setBallPosition(fromYard);

    // Small delay before animation starts
    await new Promise(r => setTimeout(r, 200));

    // Use the appropriate SVG animation method
    if (playType === 'kickoff') {
      // Kickoff with return animation
      const result = await visualizer.animateKickoff(fromYard, toYard, returnYards, kickDuration);
      visualizer.setBallPosition(result);
      console.log(`🏈 Kickoff animation complete: landed at ${toYard}, final position ${result}`);
    } else if (playType === 'punt') {
      // Punt with optional return
      const returnAmount = isTouchback || isFairCatch ? 0 : returnYards;
      const result = await visualizer.animatePunt(fromYard, toYard, returnAmount, kickDuration);
      visualizer.setBallPosition(result);
      console.log(`🏈 Punt animation complete: landed at ${toYard}, final position ${result}`);
    } else {
      // Generic kick animation
      await visualizer.animateKick(fromYard, toYard, kickDuration);
      visualizer.setBallPosition(toYard);
    }

    console.log('🏈 Special teams SVG animation complete');
  } catch (err) {
    console.error('🏈 Special teams animation error:', err);
  }
}

// ============================================
// INTELLIGENT NFL PLAY PARSER & ANIMATOR
// Unified system for parsing ESPN play data and triggering correct SVG animations
// ============================================

/**
 * Comprehensive regex patterns for NFL play parsing
 */
const NFL_PLAY_PATTERNS = {
  // === YARD POSITION EXTRACTION ===
  endingPosition: /\bto\s+([A-Z]{2,4})\s+(-?\d+)\b/i,
  currentPosition: /\bat\s+([A-Z]{2,4})\s+(-?\d+)\b/i,
  startingPosition: /\bfrom\s+([A-Z]{2,4})\s+(-?\d+)\b/i,
  yardsGained: /\bfor\s+(-?\d+)\s+yards?\b/i,
  yardPlay: /\b(\d+)-yards?\s+(pass|run|rush|gain)/i,
  yardsLost: /\bloss\s+of\s+(\d+)\s+yards?\b/i,
  noGain: /\bno\s+gain\b/i,

  // === PLAY TYPE DETECTION ===
  pass: /\b(pass(?:es)?|complete[sd]?|incomplete|thrown)\b/i,
  incompletion: /\b(incomplete|pass incomplete|incompletion)\b/i,
  rush: /\b(rush(?:es|ed)?|run[s]?|scramble[sd]?|up\s+the\s+middle|left\s+end|right\s+end|left\s+guard|right\s+guard|left\s+tackle|right\s+tackle)\b/i,
  sack: /\bsack(?:ed)?\s/i,

  // === TURNOVERS ===
  interception: /\bintercept(?:ed|ion)?\b/i,
  fumble: /\bfumble[sd]?\b/i,
  fumbleRecovery: /recovered?\s+by\s+([A-Z]{2,4})/i,
  fumbleLost: /\bfumble[sd]?\b.*\blost\b/i,

  // === SCORING ===
  touchdown: /\b(touchdown|for\s+a\s+TD)\b/i,
  fieldGoal: /\bfield\s+goal\b/i,
  fgGood: /\b(is\s+good|good|made)\b/i,
  fgMissed: /\b(missed|no\s+good|wide\s+(left|right)|short|blocked)\b/i,
  extraPoint: /\b(extra\s+point|PAT|XP)\b/i,
  twoPoint: /\b(two-?point|2-?pt|2\s+point)\b/i,
  safety: /\bsafety\b/i,

  // === SPECIAL TEAMS ===
  kickoff: /\bkicks?\s+(\d+)\s+yards?\s+from\s+([A-Z]{2,4})\s+(-?\d+)/i,
  kickoffSimple: /\bkick(?:s|ed)?\s*off\b/i,
  punt: /\bpunts?\s+(\d+)\s+yards?\s+to\s+([A-Z]{2,4})\s+(-?\d+)/i,
  puntSimple: /\bpunts?\b/i,
  return: /\breturn(?:ed|s)?\s+(?:for\s+)?(\d+)\s+yards?/i,
  touchback: /\btouchback\b/i,
  fairCatch: /\bfair\s*catch\b/i,
  outOfBounds: /\bout[\s-]?of[\s-]?bounds\b/i,

  // === PENALTIES ===
  penalty: /\bpenalty\b/i,
  penaltyOn: /\bpenalty\s+on\s+([A-Z]{2,4})/i,
  declined: /\bdeclined\b/i,
  offsetting: /\boffsetting\b/i,
  noPlay: /\bno\s+play\b/i,

  // === OTHER ===
  kneel: /\b(kneel[sd]?|knee|takes?\s+a\s+knee)\b/i,
  spike: /\bspike[sd]?\b/i,
  timeout: /\btimeout\b/i,
  endOfQuarter: /\bend\s+(of\s+)?(quarter|half|game)\b/i
};

/**
 * Normalize play text for duplicate detection
 * @param {string} text - Play text
 * @returns {string} Normalized text
 */
function normalizePlayText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two plays are duplicates (fuzzy matching)
 * @param {string} current - Current play text
 * @param {string} previous - Previous play text
 * @returns {boolean} True if duplicate
 */
function isDuplicatePlay(current, previous) {
  if (!current || !previous) return false;
  if (current === previous) return true;

  const normCurrent = normalizePlayText(current);
  const normPrevious = normalizePlayText(previous);

  if (normCurrent === normPrevious) return true;

  // Check if one contains the other (ESPN sometimes truncates)
  if (normCurrent.length > 20 && normPrevious.length > 20) {
    if (normCurrent.includes(normPrevious.substring(0, 30)) ||
        normPrevious.includes(normCurrent.substring(0, 30))) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate yard positions for animation
 * ESPN's yardLine is the ENDING position - we calculate starting from there
 *
 * @param {string} playText - Full play description
 * @param {Object} situation - ESPN situation object { yardLine, possessionText, possession }
 * @param {Object} teams - { awayAbbr, homeAbbr }
 * @param {string} possession - 'away' or 'home'
 * @returns {Object} { fromYard, toYard, yardsGained, direction }
 */
function calculatePlayYardPositions(playText, situation, teams, possession) {
  const { awayAbbr = '', homeAbbr = '' } = teams;
  const lowerText = (playText || '').toLowerCase();

  // Default to midfield
  let toYard = 50;
  let fromYard = 50;
  let yardsGained = 0;
  let usedTextParsing = false;

  // Step 1: FIRST try to parse ending position from play text "to TEAM YARD"
  // This is most reliable as it includes team context
  const endMatch = playText.match(NFL_PLAY_PATTERNS.endingPosition);
  if (endMatch && awayAbbr && homeAbbr) {
    const endTeam = endMatch[1].toUpperCase();
    const endYardLine = Math.max(0, parseInt(endMatch[2]));
    toYard = convertTeamYardToFieldPosition(endTeam, endYardLine, awayAbbr, homeAbbr);
    usedTextParsing = true;
  }

  // Step 2: Fallback to situation.yardLine if text parsing didn't work
  if (!usedTextParsing && situation?.yardLine !== undefined && situation.yardLine !== null) {
    // Check if yardLine is already in 0-100 field position format (from replay data)
    // If isFieldPosition flag is set, use directly without conversion
    if (situation.isFieldPosition) {
      toYard = situation.yardLine;
    } else {
      // ESPN raw format: 0-100 where 0 = own goal line, 100 = opponent's goal
      // Convert based on which team has possession
      if (possession === 'away') {
        // Away team: 0 = their goal (0%), 100 = opponent goal (100%)
        toYard = situation.yardLine;
      } else if (possession === 'home') {
        // Home team: 0 = their goal (100% on our field), 100 = opponent goal (0%)
        toYard = 100 - situation.yardLine;
      } else {
        toYard = situation.yardLine;
      }
    }
  }

  // Step 3: Parse starting position from "from TEAM YARD" (for kickoffs)
  const fromMatch = playText.match(NFL_PLAY_PATTERNS.startingPosition);
  if (fromMatch) {
    const fromTeam = fromMatch[1].toUpperCase();
    const fromYardLine = Math.max(0, parseInt(fromMatch[2]));
    fromYard = convertTeamYardToFieldPosition(fromTeam, fromYardLine, awayAbbr, homeAbbr);
    yardsGained = Math.abs(toYard - fromYard);
  } else {
    // Step 4: Calculate starting position from yards gained
    const yardsMatch = playText.match(NFL_PLAY_PATTERNS.yardsGained);
    if (yardsMatch) {
      yardsGained = parseInt(yardsMatch[1]);
    } else {
      const lossMatch = playText.match(NFL_PLAY_PATTERNS.yardsLost);
      if (lossMatch) {
        yardsGained = -parseInt(lossMatch[1]);
      } else if (NFL_PLAY_PATTERNS.noGain.test(lowerText)) {
        yardsGained = 0;
      }
    }

    // Calculate fromYard based on drive direction
    const driveDirection = getDriveDirection(possession);
    fromYard = toYard - (yardsGained * driveDirection);
  }

  // Step 5: Handle special cases
  // Touchdown - ensure toYard is at end zone
  if (NFL_PLAY_PATTERNS.touchdown.test(lowerText)) {
    const driveDirection = getDriveDirection(possession);
    toYard = driveDirection > 0 ? 100 : 0;
  }

  // Sack - swap from/to if needed (sack goes backward)
  if (NFL_PLAY_PATTERNS.sack.test(lowerText) && yardsGained <= 0) {
    const temp = fromYard;
    fromYard = toYard - yardsGained * getDriveDirection(possession);
    toYard = temp;
    // Actually let's keep the original logic but ensure yardsGained is negative
    const driveDirection = getDriveDirection(possession);
    fromYard = toYard + Math.abs(yardsGained) * driveDirection;
  }

  // Clamp to valid field positions
  fromYard = Math.max(0, Math.min(100, Math.round(fromYard)));
  toYard = Math.max(0, Math.min(100, Math.round(toYard)));

  return {
    fromYard,
    toYard,
    yardsGained,
    direction: fromYard < toYard ? 1 : -1,
    possession // Include possession for direction-dependent plays (field goals, etc.)
  };
}

/**
 * Convert "TEAM YARD" format to 0-100 field position
 * @param {string} teamAbbr - Team abbreviation from play text
 * @param {number} yardLine - Yard line number (0-50)
 * @param {string} awayAbbr - Away team abbreviation
 * @param {string} homeAbbr - Home team abbreviation
 * @returns {number} Field position 0-100
 */
function convertTeamYardToFieldPosition(teamAbbr, yardLine, awayAbbr, homeAbbr) {
  const normalizedTeam = (teamAbbr || '').toUpperCase();
  const normalizedAway = (awayAbbr || '').toUpperCase();
  const normalizedHome = (homeAbbr || '').toUpperCase();

  // Clamp yard line to valid range
  const clampedYard = Math.max(0, Math.min(50, yardLine));

  if (normalizedTeam === normalizedAway) {
    // Away team's side: their 20 = 20 on field (near 0)
    return clampedYard;
  } else if (normalizedTeam === normalizedHome) {
    // Home team's side: their 20 = 80 on field (near 100)
    return 100 - clampedYard;
  }

  // Unknown team - return midfield
  return 50;
}

/**
 * Get drive direction based on possession
 * @param {string} possession - 'away' or 'home'
 * @returns {number} 1 = toward 100, -1 = toward 0
 */
function getDriveDirection(possession) {
  // Away team drives toward 100 (home end zone)
  // Home team drives toward 0 (away end zone)
  return possession === 'away' ? 1 : -1;
}

/**
 * Classify NFL play type with priority ordering
 * @param {string} playText - Full play description
 * @param {Object} scoreChanges - { away, home }
 * @param {Object} prevState - Previous game state
 * @param {Object} currentState - Current game state
 * @returns {Object} { primaryType, subtype, events, isNegated }
 */
function classifyNFLPlayType(playText, scoreChanges = {}, prevState = {}, currentState = {}) {
  const lowerText = (playText || '').toLowerCase();
  const events = [];

  // Check if play was negated by penalty
  const isNegated = NFL_PLAY_PATTERNS.noPlay.test(lowerText) &&
                    !lowerText.includes('enforced between downs');

  // === PRIORITY 1: TURNOVERS ===
  if (NFL_PLAY_PATTERNS.interception.test(lowerText)) {
    const isPick6 = NFL_PLAY_PATTERNS.touchdown.test(lowerText);
    events.push({
      type: 'interception',
      subtype: isPick6 ? 'pick_six' : 'interception',
      priority: 1
    });
    if (isPick6) {
      events.push({ type: 'touchdown', subtype: 'pick_six', priority: 2 });
    }
  }

  if (NFL_PLAY_PATTERNS.fumble.test(lowerText)) {
    const recoveryMatch = playText.match(NFL_PLAY_PATTERNS.fumbleRecovery);
    const isLost = NFL_PLAY_PATTERNS.fumbleLost.test(lowerText) ||
                   (recoveryMatch && recoveryMatch[1] !== currentState.possessionTeam);
    const isScoopScore = NFL_PLAY_PATTERNS.touchdown.test(lowerText) && isLost;

    events.push({
      type: 'fumble',
      subtype: isScoopScore ? 'scoop_and_score' : (isLost ? 'fumble_lost' : 'fumble_recovered'),
      priority: 1,
      recoveryTeam: recoveryMatch ? recoveryMatch[1] : null
    });

    if (isScoopScore) {
      events.push({ type: 'touchdown', subtype: 'scoop_and_score', priority: 2 });
    }
  }

  // === PRIORITY 2: TOUCHDOWNS ===
  if (NFL_PLAY_PATTERNS.touchdown.test(lowerText) && !events.some(e => e.type === 'touchdown')) {
    const isPassTD = NFL_PLAY_PATTERNS.pass.test(lowerText);
    const isRushTD = NFL_PLAY_PATTERNS.rush.test(lowerText);
    events.push({
      type: 'touchdown',
      subtype: isPassTD ? 'pass_td' : (isRushTD ? 'rush_td' : 'touchdown'),
      priority: 2,
      playType: isPassTD ? 'pass' : 'rush'
    });
  }

  // === PRIORITY 3: FIELD GOALS / PATs ===
  if (NFL_PLAY_PATTERNS.fieldGoal.test(lowerText)) {
    const isGood = NFL_PLAY_PATTERNS.fgGood.test(lowerText) &&
                   !NFL_PLAY_PATTERNS.fgMissed.test(lowerText);
    events.push({
      type: isGood ? 'field_goal' : 'missed_field_goal',
      subtype: isGood ? 'good' : 'missed',
      priority: 3
    });
  }

  if (NFL_PLAY_PATTERNS.extraPoint.test(lowerText)) {
    const isGood = NFL_PLAY_PATTERNS.fgGood.test(lowerText) &&
                   !NFL_PLAY_PATTERNS.fgMissed.test(lowerText);
    events.push({
      type: isGood ? 'extra_point' : 'missed_extra_point',
      subtype: isGood ? 'good' : 'missed',
      priority: 3
    });
  }

  if (NFL_PLAY_PATTERNS.twoPoint.test(lowerText)) {
    const isGood = lowerText.includes('good') || lowerText.includes('success') ||
                   lowerText.includes('conversion');
    events.push({
      type: isGood ? 'two_point' : 'failed_two_point',
      subtype: isGood ? 'good' : 'failed',
      priority: 3
    });
  }

  // === PRIORITY 4: SAFETY ===
  if (NFL_PLAY_PATTERNS.safety.test(lowerText) && !lowerText.includes('free kick')) {
    events.push({ type: 'safety', subtype: 'safety', priority: 4 });
  }

  // === PRIORITY 5: SACKS ===
  if (NFL_PLAY_PATTERNS.sack.test(lowerText)) {
    events.push({ type: 'sack', subtype: 'sack', priority: 5 });
  }

  // === PRIORITY 6: PENALTIES ===
  if (NFL_PLAY_PATTERNS.penalty.test(lowerText) &&
      !NFL_PLAY_PATTERNS.declined.test(lowerText) &&
      !NFL_PLAY_PATTERNS.offsetting.test(lowerText)) {
    events.push({ type: 'penalty', subtype: 'penalty', priority: 6 });
  }

  // === PRIORITY 7: SPECIAL TEAMS ===
  if (NFL_PLAY_PATTERNS.kickoff.test(lowerText) || NFL_PLAY_PATTERNS.kickoffSimple.test(lowerText)) {
    const isTouchback = NFL_PLAY_PATTERNS.touchback.test(lowerText);
    events.push({
      type: 'kickoff',
      subtype: isTouchback ? 'touchback' : 'kickoff',
      priority: 7,
      isTouchback
    });
  }

  if (NFL_PLAY_PATTERNS.puntSimple.test(lowerText) && !events.some(e => e.type === 'kickoff')) {
    const isTouchback = NFL_PLAY_PATTERNS.touchback.test(lowerText);
    const isFairCatch = NFL_PLAY_PATTERNS.fairCatch.test(lowerText);
    events.push({
      type: 'punt',
      subtype: isTouchback ? 'touchback' : (isFairCatch ? 'fair_catch' : 'punt'),
      priority: 7,
      isTouchback,
      isFairCatch
    });
  }

  // === PRIORITY 8: REGULAR PLAYS ===
  if (events.length === 0) {
    if (NFL_PLAY_PATTERNS.incompletion.test(lowerText)) {
      events.push({ type: 'incomplete_pass', subtype: 'incomplete', priority: 8 });
    } else if (NFL_PLAY_PATTERNS.pass.test(lowerText)) {
      events.push({ type: 'pass', subtype: 'complete', priority: 8 });
    } else if (NFL_PLAY_PATTERNS.rush.test(lowerText)) {
      events.push({ type: 'rush', subtype: 'rush', priority: 8 });
    } else if (NFL_PLAY_PATTERNS.kneel.test(lowerText)) {
      events.push({ type: 'kneel', subtype: 'kneel', priority: 8 });
    } else if (NFL_PLAY_PATTERNS.spike.test(lowerText)) {
      events.push({ type: 'spike', subtype: 'spike', priority: 8 });
    }
  }

  // Sort by priority
  events.sort((a, b) => a.priority - b.priority);

  return {
    primaryType: events[0]?.type || 'unknown',
    subtype: events[0]?.subtype || 'unknown',
    events,
    isNegated,
    hasMultipleEvents: events.length > 1
  };
}

/**
 * Execute SVG field animation based on classified play
 * @param {Object} visualizer - SVGFieldVisualizer instance
 * @param {Object} classification - From classifyNFLPlayType()
 * @param {Object} positions - From calculatePlayYardPositions()
 * @returns {Promise<Object>} { animated, type, error }
 */
async function executePlayAnimation(visualizer, classification, positions) {
  if (!visualizer || visualizer.state?.animating) {
    return { animated: false, reason: 'no_visualizer_or_busy' };
  }

  const { primaryType, subtype, isNegated, events } = classification;
  const { fromYard, toYard, yardsGained, possession } = positions;

  if (isNegated) {
    return { animated: false, reason: 'play_negated' };
  }

  try {
    switch (primaryType) {
      case 'interception': {
        const isPick6 = subtype === 'pick_six';
        const returnYards = isPick6 ? -1 : Math.max(0, Math.abs(toYard - fromYard));
        await visualizer.animateInterception(fromYard, toYard, returnYards, 1200);
        visualizer.setBallPosition(toYard);
        return { animated: true, type: 'interception' };
      }

      case 'fumble': {
        const event = events[0];
        const offenseRecovery = event?.subtype === 'fumble_recovered';
        const recoveryYard = offenseRecovery ? toYard : toYard;
        await visualizer.animateFumble(fromYard, toYard, recoveryYard, offenseRecovery, 800);
        visualizer.setBallPosition(toYard);
        return { animated: true, type: 'fumble' };
      }

      case 'touchdown': {
        const playType = events[0]?.playType || (subtype.includes('pass') ? 'pass' : 'rush');
        await visualizer.animateTouchdown(playType, fromYard, toYard, 1500);
        visualizer.setBallPosition(toYard);
        return { animated: true, type: 'touchdown' };
      }

      case 'field_goal': {
        // Away team kicks toward 100 (right), home team kicks toward 0 (left)
        const fgDirection = possession === 'away' ? 'right' : 'left';
        await visualizer.animateFieldGoal(fromYard, fgDirection, 2500);
        return { animated: true, type: 'field_goal' };
      }

      case 'missed_field_goal': {
        // Away team kicks toward 100 (right), home team kicks toward 0 (left)
        const missedFgDirection = possession === 'away' ? 'right' : 'left';
        await visualizer.animateMissedFieldGoal(fromYard, missedFgDirection, 'wide_right', 2500);
        return { animated: true, type: 'missed_field_goal' };
      }

      case 'extra_point':
      case 'missed_extra_point': {
        // Extra points: away team kicks toward right (100), home kicks toward left (0)
        const xpDirection = possession === 'away' ? 'right' : 'left';
        const good = primaryType === 'extra_point';
        await visualizer.animateExtraPoint(xpDirection, good, 1500);
        return { animated: true, type: primaryType };
      }

      case 'sack': {
        const yardsLost = Math.abs(yardsGained) || 7;
        await visualizer.animateSack(fromYard, yardsLost, 800);
        visualizer.setBallPosition(toYard);
        return { animated: true, type: 'sack' };
      }

      case 'kickoff': {
        const returnMatch = classification.events[0];
        const returnYards = returnMatch?.isTouchback ? 0 : Math.abs(yardsGained) * 0.3;
        await visualizer.animateKickoff(fromYard, toYard, returnYards, 2500);
        visualizer.setBallPosition(toYard);
        return { animated: true, type: 'kickoff' };
      }

      case 'punt': {
        const puntEvent = classification.events[0];
        const returnYards = (puntEvent?.isTouchback || puntEvent?.isFairCatch) ? 0 : 10;
        await visualizer.animatePunt(fromYard, toYard, returnYards, 2000);
        visualizer.setBallPosition(toYard);
        return { animated: true, type: 'punt' };
      }

      case 'incomplete_pass': {
        await visualizer.animateIncompletePass(fromYard, toYard, 1200);
        visualizer.setBallPosition(fromYard); // Ball returns to LOS
        return { animated: true, type: 'incomplete_pass' };
      }

      case 'pass': {
        const arcHeight = Math.min(30, Math.max(15, Math.abs(yardsGained) * 0.8));
        await visualizer.animatePass(fromYard, toYard, arcHeight, 1000);
        visualizer.setBallPosition(toYard);
        return { animated: true, type: 'pass' };
      }

      case 'rush': {
        await visualizer.animateRush(fromYard, toYard, 800);
        visualizer.setBallPosition(toYard);
        return { animated: true, type: 'rush' };
      }

      case 'penalty': {
        const isGain = toYard > fromYard;
        await visualizer.animatePenalty(fromYard, toYard, 800, { isGain });
        visualizer.setBallPosition(toYard);
        return { animated: true, type: 'penalty' };
      }

      case 'kneel': {
        await visualizer.animateRush(fromYard, Math.max(0, fromYard - 1), 500);
        visualizer.setBallPosition(toYard);
        return { animated: true, type: 'kneel' };
      }

      case 'spike': {
        await visualizer.animateIncompletePass(fromYard, fromYard + 5, 500);
        visualizer.setBallPosition(fromYard);
        return { animated: true, type: 'spike' };
      }

      default:
        return { animated: false, reason: 'unknown_play_type', type: primaryType };
    }
  } catch (err) {
    console.error('Animation execution error:', err);
    return { animated: false, error: err.message, type: primaryType };
  }
}

/**
 * Main entry point: Parse ESPN play data and animate on SVG field
 *
 * @param {Object} playData - { text, type } from ESPN situation.lastPlay
 * @param {Object} gameContext - Current game state
 * @param {Object} prevState - Previous play state for comparison
 * @param {Object} visualizer - SVGFieldVisualizer instance
 * @returns {Promise<Object>} Result with animation status and parsed data
 */
async function parseAndAnimateNFLPlay(playData, gameContext, prevState, visualizer) {
  const result = {
    success: false,
    animated: false,
    playType: 'unknown',
    positions: null,
    classification: null,
    errors: [],
    warnings: []
  };

  try {
    // Validate inputs - accept both string and object with text property
    const playText = typeof playData === 'string' ? playData : (playData?.text || '');
    if (!playText) {
      result.warnings.push('No play text provided');
      return result;
    }

    // Check for duplicates
    if (isDuplicatePlay(playText, prevState?.lastPlay)) {
      result.warnings.push('Duplicate play detected');
      return result;
    }

    // Skip administrative events
    const lowerText = playText.toLowerCase();
    if (NFL_PLAY_PATTERNS.timeout.test(lowerText) && !lowerText.includes('return')) {
      result.warnings.push('Administrative event skipped');
      return result;
    }
    if (NFL_PLAY_PATTERNS.endOfQuarter.test(lowerText)) {
      result.warnings.push('End of period skipped');
      return result;
    }

    // Calculate yard positions
    const situation = gameContext.situation || {};
    const teams = {
      awayAbbr: gameContext.awayAbbr || '',
      homeAbbr: gameContext.homeAbbr || ''
    };
    const possession = gameContext.possession || prevState?.possession || 'home';

    result.positions = calculatePlayYardPositions(playText, situation, teams, possession);

    // Classify play type
    const scoreChanges = {
      away: (gameContext.awayScore || 0) - (prevState?.awayScore || 0),
      home: (gameContext.homeScore || 0) - (prevState?.homeScore || 0)
    };

    result.classification = classifyNFLPlayType(playText, scoreChanges, prevState, gameContext);
    result.playType = result.classification.primaryType;

    // Execute animation if visualizer available
    if (visualizer) {
      const animResult = await executePlayAnimation(visualizer, result.classification, result.positions);
      result.animated = animResult.animated;
      if (animResult.error) {
        result.errors.push(animResult.error);
      }
    } else {
      result.warnings.push('No visualizer provided');
    }

    result.success = true;

  } catch (err) {
    result.errors.push(err.message);
    console.error('parseAndAnimateNFLPlay error:', err);
  }

  return result;
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
    detectMLBPlayEvents,
    parseSpecialTeamsPlay,
    animateSpecialTeamsPlay,
    yardLineToFieldPercent,
    parseYardPositionsFromPlay,
    animatePlayOnSVGField,
    // New unified parser exports
    NFL_PLAY_PATTERNS,
    parseAndAnimateNFLPlay,
    calculatePlayYardPositions,
    classifyNFLPlayType,
    executePlayAnimation,
    isDuplicatePlay,
    convertTeamYardToFieldPosition,
    getDriveDirection
  };
}
