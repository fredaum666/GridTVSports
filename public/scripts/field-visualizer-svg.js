/**
 * SVG Field Visualizer
 * Creates an ESPN-style football field using SVG with perspective via geometry
 * Supports ball position updates and path-based animations
 */

// Team abbreviation to full name mapping for logo files
const TEAM_NAME_MAP = {
  'ARI': 'Arizona Cardinals',
  'ATL': 'Atlanta Falcons',
  'BAL': 'Baltimore Ravens',
  'BUF': 'Buffalo Bills',
  'CAR': 'Carolina Panthers',
  'CHI': 'Chicago Bears',
  'CIN': 'Cincinnati Bengals',
  'CLE': 'Cleveland Browns',
  'DAL': 'Dallas Cowboys',
  'DEN': 'Denver Broncos',
  'DET': 'Detroit Lions',
  'GB': 'Green Bay Packers',
  'HOU': 'Houston Texans',
  'IND': 'Indianapolis Colts',
  'JAX': 'Jacksonville Jaguars',
  'KC': 'Kansas City Chiefs',
  'LAC': 'Los Angeles Chargers',
  'LAR': 'Los Angeles Rams',
  'LA': 'Los Angeles Rams',
  'LV': 'Las Vegas Raiders',
  'MIA': 'Miami Dolphins',
  'MIN': 'Minnesota Vikings',
  'NE': 'New England Patriots',
  'NO': 'New Orleans Saints',
  'NYG': 'New York Giants',
  'NYJ': 'New York Jets',
  'PHI': 'Philadelphia Eagles',
  'PIT': 'Pittsburgh Steelers',
  'SF': 'San Francisco 49ers',
  'SEA': 'Seattle Seahawks',
  'TB': 'Tampa Bay Buccaneers',
  'TEN': 'Tennessee Titans',
  'WAS': 'Washington Commanders',
  // Alternative abbreviations
  'HST': 'Houston Texans',
  'JAC': 'Jacksonville Jaguars',
  'LVR': 'Las Vegas Raiders',
  'OAK': 'Las Vegas Raiders',
  'SD': 'Los Angeles Chargers',
  'STL': 'Los Angeles Rams',
  'WSH': 'Washington Commanders'
};

class SVGFieldVisualizer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      compressed: false,
      showGoalPosts: true,
      showYardNumbers: true,
      showOneYardLines: true,
      showEndZoneLogos: true,
      awayColor: '#1f2937',
      homeColor: '#1f2937',
      awayAbbr: 'AWAY',
      homeAbbr: 'HOME',
      ...options
    };

    this.state = {
      ballPosition: 50,
      firstDownPosition: 60,
      showFirstDown: true,
      possessionColor: null,
      animating: false
    };

    this.svg = null;
    this.init();
  }

  init() {
    this.svg = this.createSVG();
    this.container.innerHTML = '';
    this.container.appendChild(this.svg);
    this.updatePositions();
  }

  createSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'field-svg');
    svg.setAttribute('viewBox', this.options.compressed ? '0 -30 600 145' : '0 -40 600 130');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    svg.innerHTML = `
      ${this.getStyles()}
      ${this.getDefs()}
      ${this.getFieldSide()}
      ${this.getFieldTop()}
      ${this.getEndZoneLogos()}
      ${this.options.showGoalPosts ? this.getGoalPosts() : ''}
      ${this.getEndZoneText()}
      ${this.options.compressed ? this.getCompactYardMarkers() : ''}
      ${this.getScrimmageMarker()}
      ${this.getFirstDownMarker()}
      ${this.getAnimationLayer()}
    `;

    return svg;
  }

  getStyles() {
    return `
      <style>
        .field-svg { width: 100%; height: auto; display: block; }

        /* Field colors */
        .tenYardFill { fill: #147d3b; }
        .tenYardFill--dark { fill: #0f5c2c; }
        .endzone-left { fill: var(--away-color, ${this.options.awayColor}); }
        .endzone-right { fill: var(--home-color, ${this.options.homeColor}); }

        /* Lines */
        .tenYardLine { stroke: rgba(255,255,255,0.7); stroke-width: 1; }
        .tenYardLine--50 { stroke-width: 2; }
        .oneYardLine { stroke: rgba(255,255,255,0.3); stroke-width: 0.5; }
        .side-overlay { fill: rgba(0,0,0,0.1); }

        /* Ball and markers */
        .BallDefs__Ball { fill: #8B4513; }
        .BallDefs__Laces { fill: white; }

        /* Scrimmage line */
        .scrimmage-line { stroke: #3b82f6; stroke-width: 3; }
        .scrimmage-line-edge { stroke: #1d4ed8; stroke-width: 3; }
        .scrimmage-marker { transition: transform 0.6s ease-out; }

        /* First down line */
        .first-down-line { stroke: #fcd34d; stroke-width: 2.5; }
        .first-down-line-edge { stroke: #f59e0b; stroke-width: 2.5; }
        .first-down-marker { transition: transform 0.6s ease-out; }
        .first-down-marker.hidden { display: none; }
        .first-down-image { pointer-events: none; }
        .scrimmage-image { pointer-events: none; }

        /* End zone logos */
        .endzone-logo {
          pointer-events: none;
        }

        /* Yard numbers */
        .yard-number {
          fill: rgba(255,255,255,0.85);
          font-family: 'Courier New', Courier, monospace;
          font-weight: bold;
          font-size: 16px;
          text-anchor: middle;
        }

        /* Compact yard markers (below field for grids 3-8) */
        .compact-yard-tick {
          stroke: rgba(255,255,255,0.7);
          stroke-width: 1.5;
        }
        .compact-yard-number {
          fill: rgba(255,255,255,0.85);
          font-family: Arial, sans-serif;
          font-weight: bold;
          font-size: 16px;
          text-anchor: middle;
        }

        /* Ball path animations */
        .BallPath { stroke: #fbbf24; stroke-width: 2; fill: none; }
        .BallPath--pass { stroke-dasharray: 4 2; }
        .BallPath__mask { stroke: white; stroke-width: 4; fill: none; }

        @keyframes moveBallPass {
          0% { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }

        @keyframes moveBallRush {
          0% { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }

        @keyframes moveBallKick {
          0% { offset-distance: 0%; transform: rotate(0deg); }
          100% { offset-distance: 100%; transform: rotate(-720deg); }
        }

        /* Ball positioning for path animations - center on path and rotate around center */
        .ball-animated {
          offset-anchor: center;
          transform-origin: center;
          transform-box: fill-box;
        }

        @keyframes spiralLaces {
          /* Simulate ball rotating around its long axis - laces appear to oscillate */
          0% { transform: scaleX(1); opacity: 1; }
          25% { transform: scaleX(0.3); opacity: 0.7; }
          50% { transform: scaleX(1); opacity: 1; }
          75% { transform: scaleX(0.3); opacity: 0.7; }
          100% { transform: scaleX(1); opacity: 1; }
        }

        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }

        .BallDefs__Laces--spiraling {
          animation: spiralLaces 0.12s linear infinite;
          transform-origin: center;
        }
      </style>
    `;
  }

  getDefs() {
    return `
      <defs>
        <clipPath id="field-clip-side">
          <polygon points="600 90 0 90 0 86 600 86"/>
        </clipPath>
        <clipPath id="field-clip-top">
          <polygon points="575 86 25 86 52.5 26 547.5 26"/>
        </clipPath>

        <!-- Ball filter for shadow -->
        <filter id="ballfilter" width="200%" height="200%" x="-50%" y="-50%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.5"/>
        </filter>

        <!-- Ball symbol (static) -->
        <symbol id="ball-static" viewBox="-5 -3 10 6" overflow="visible">
          <g filter="url(#ballfilter)">
            <path class="BallDefs__Ball" d="m 0 2.8 c 3.4 0 4.7 -2.9 4.7 -2.9 s -1.3 -2.9 -4.7 -2.9 c -3.4 0 -4.7 2.9 -4.7 2.9 s 1.3 2.9 4.7 2.9 z"/>
          </g>
          <path class="BallDefs__Laces" d="M-1.3,-1.5 L1.3,-1.5 M-1,-0.5 L1,-0.5 M-1,0.5 L1,0.5" stroke="white" stroke-width="0.4" stroke-linecap="round" fill="none"/>
        </symbol>

        <!-- Ball symbol (spiral - for passes) -->
        <symbol id="ball-spiral" viewBox="-5 -3 10 6" overflow="visible">
          <g filter="url(#ballfilter)">
            <path class="BallDefs__Ball" d="m 0 2.8 c 3.4 0 4.7 -2.9 4.7 -2.9 s -1.3 -2.9 -4.7 -2.9 c -3.4 0 -4.7 2.9 -4.7 2.9 s 1.3 2.9 4.7 2.9 z"/>
          </g>
          <g class="BallDefs__Laces--spiraling">
            <path d="M-1.3,-1.5 L1.3,-1.5 M-1,-0.5 L1,-0.5 M-1,0.5 L1,0.5" stroke="white" stroke-width="0.4" stroke-linecap="round" fill="none"/>
          </g>
        </symbol>
      </defs>
    `;
  }

  getFieldSide() {
    // 3D edge at bottom (y=86 to y=90)
    const awayColor = this.options.awayColor;
    const homeColor = this.options.homeColor;

    return `
      <g data-name="Field Side">
        <!-- End zones edge -->
        <rect class="endzone-left" x="0" y="86" width="50" height="4"/>
        <rect class="endzone-right" x="550" y="86" width="50" height="4"/>

        <!-- Playing field edge (alternating) -->
        <rect class="tenYardFill" x="50" y="86" width="50" height="4"/>
        <rect class="tenYardFill tenYardFill--dark" x="100" y="86" width="50" height="4"/>
        <rect class="tenYardFill" x="150" y="86" width="50" height="4"/>
        <rect class="tenYardFill tenYardFill--dark" x="200" y="86" width="50" height="4"/>
        <rect class="tenYardFill" x="250" y="86" width="50" height="4"/>
        <rect class="tenYardFill" x="300" y="86" width="50" height="4"/>
        <rect class="tenYardFill tenYardFill--dark" x="350" y="86" width="50" height="4"/>
        <rect class="tenYardFill" x="400" y="86" width="50" height="4"/>
        <rect class="tenYardFill tenYardFill--dark" x="450" y="86" width="50" height="4"/>
        <rect class="tenYardFill" x="500" y="86" width="50" height="4"/>

        <!-- Edge yard lines -->
        <g clip-path="url(#field-clip-side)">
          <line class="tenYardLine" x1="50" y1="86" x2="50" y2="90"/>
          <line class="tenYardLine" x1="100" y1="86" x2="100" y2="90"/>
          <line class="tenYardLine" x1="150" y1="86" x2="150" y2="90"/>
          <line class="tenYardLine" x1="200" y1="86" x2="200" y2="90"/>
          <line class="tenYardLine" x1="250" y1="86" x2="250" y2="90"/>
          <line class="tenYardLine tenYardLine--50" x1="300" y1="86" x2="300" y2="90"/>
          <line class="tenYardLine" x1="350" y1="86" x2="350" y2="90"/>
          <line class="tenYardLine" x1="400" y1="86" x2="400" y2="90"/>
          <line class="tenYardLine" x1="450" y1="86" x2="450" y2="90"/>
          <line class="tenYardLine" x1="500" y1="86" x2="500" y2="90"/>
          <line class="tenYardLine" x1="550" y1="86" x2="550" y2="90"/>
        </g>

        <polygon class="side-overlay" points="600 90 0 90 0 86 600 86"/>
      </g>
    `;
  }

  getFieldTop() {
    // Field surface with perspective (trapezoid polygons)
    // Top edge (y=26): narrower, Bottom edge (y=86): full width
    const oneYardLines = this.options.showOneYardLines && !this.options.compressed ? this.getOneYardLines() : '';
    const yardNumbers = this.options.showYardNumbers && !this.options.compressed ? this.getYardNumbers() : '';

    return `
      <g data-name="Field Top">
        <!-- End zones (trapezoid) -->
        <polygon class="endzone-left" points="50 86 0 86 30 26 75 26"/>
        <polygon class="endzone-right" points="600 86 550 86 525 26 570 26"/>

        <!-- Playing field sections (10 x trapezoids) -->
        <polygon class="tenYardFill" points="100 86 50 86 75 26 120 26"/>
        <polygon class="tenYardFill tenYardFill--dark" points="150 86 100 86 120 26 165 26"/>
        <polygon class="tenYardFill" points="200 86 150 86 165 26 210 26"/>
        <polygon class="tenYardFill tenYardFill--dark" points="250 86 200 86 210 26 255 26"/>
        <polygon class="tenYardFill" points="300 86 250 86 255 26 300 26"/>
        <polygon class="tenYardFill" points="350 86 300 86 300 26 345 26"/>
        <polygon class="tenYardFill tenYardFill--dark" points="400 86 350 86 345 26 390 26"/>
        <polygon class="tenYardFill" points="450 86 400 86 390 26 435 26"/>
        <polygon class="tenYardFill tenYardFill--dark" points="500 86 450 86 435 26 480 26"/>
        <polygon class="tenYardFill" points="550 86 500 86 480 26 525 26"/>

        ${oneYardLines}

        <!-- Ten yard lines (with perspective) -->
        <g clip-path="url(#field-clip-top)">
          <line class="tenYardLine" x1="75" y1="26" x2="50" y2="86"/>
          <line class="tenYardLine" x1="120" y1="26" x2="100" y2="86"/>
          <line class="tenYardLine" x1="165" y1="26" x2="150" y2="86"/>
          <line class="tenYardLine" x1="210" y1="26" x2="200" y2="86"/>
          <line class="tenYardLine" x1="255" y1="26" x2="250" y2="86"/>
          <line class="tenYardLine tenYardLine--50" x1="300" y1="26" x2="300" y2="86"/>
          <line class="tenYardLine" x1="345" y1="26" x2="350" y2="86"/>
          <line class="tenYardLine" x1="390" y1="26" x2="400" y2="86"/>
          <line class="tenYardLine" x1="435" y1="26" x2="450" y2="86"/>
          <line class="tenYardLine" x1="480" y1="26" x2="500" y2="86"/>
          <line class="tenYardLine" x1="525" y1="26" x2="550" y2="86"/>
        </g>

        ${yardNumbers}
      </g>
    `;
  }

  getOneYardLines() {
    // Generate 1-yard lines with perspective
    const lines = [];
    for (let yard = 1; yard <= 99; yard++) {
      if (yard % 10 === 0) continue; // Skip 10-yard lines

      const { topX, bottomX } = this.yardToCoords(yard);
      lines.push(`<line class="oneYardLine" x1="${topX}" y1="26" x2="${bottomX}" y2="86"/>`);
    }

    return `<g clip-path="url(#field-clip-top)">${lines.join('')}</g>`;
  }

  getYardNumbers() {
    // Yard numbers at specific positions
    const numbers = [10, 20, 30, 40, 50, 40, 30, 20, 10];
    const positions = [10, 20, 30, 40, 50, 60, 70, 80, 90]; // Yard positions

    const topRow = [];
    const bottomRow = [];

    positions.forEach((yardPos, i) => {
      const { topX } = this.yardToCoords(yardPos);
      const bottomCoords = this.yardToCoords(yardPos);

      // Top row (rotated 180)
      topRow.push(`<text class="yard-number" x="${topX}" y="38" transform="rotate(180 ${topX} 38)">${numbers[i]}</text>`);

      // Bottom row
      bottomRow.push(`<text class="yard-number" x="${bottomCoords.bottomX}" y="78">${numbers[i]}</text>`);
    });

    return `
      <g data-name="Yard Numbers">
        <g class="numbers-top">${topRow.join('')}</g>
        <g class="numbers-bottom">${bottomRow.join('')}</g>
      </g>
    `;
  }

  getCompactYardMarkers() {
    // Yard markers below the field for compact/grid 3-8 view
    // Only 10-yard increments
    const positions = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const labels = ['10', '20', '30', '40', '50', '40', '30', '20', '10'];

    const markers = positions.map((yardPos, i) => {
      const { bottomX } = this.yardToCoords(yardPos);
      // Small tick mark below field and number
      return `
        <line class="compact-yard-tick" x1="${bottomX}" y1="88" x2="${bottomX}" y2="92"/>
        <text class="compact-yard-number" x="${bottomX}" y="100">${labels[i]}</text>
      `;
    });

    // Add end zone markers (goal lines)
    const leftEndX = this.yardToCoords(0).bottomX;
    const rightEndX = this.yardToCoords(100).bottomX;

    return `
      <g data-name="Compact Yard Markers" class="compact-yard-markers">
        <line class="compact-yard-tick" x1="${leftEndX}" y1="88" x2="${leftEndX}" y2="92"/>
        ${markers.join('')}
        <line class="compact-yard-tick" x1="${rightEndX}" y1="88" x2="${rightEndX}" y2="92"/>
      </g>
    `;
  }

  getGoalPosts() {
    return `
      <!-- Left Goal Post -->
      <g data-name="Left Goal Post">
        <path fill="#6c6e6f" d="M6,48.75s0-.75,2-.75,2,.75,2,.75v8.5s0,.75-2,.75-2-.75-2-.75v-8.5Z"/>
        <path fill="#e2ce23" d="M13,43c-2.21,0-4,1.79-4,4v2s0,.4-1,.4-1-.4-1-.4v-2c0-3.31,2.69-6,6-6h1v2h-1Z"/>
        <path fill="#e2ce23" d="M18,10.4v26.6c0,.18-.05.36-.14.51l-6,10c-.23.39-.69.57-1.12.45-.43-.12-.73-.51-.73-.96v-30.6s0-.4,1-.4,1,.4,1,.4v26.99l4-6.67V10.4s0-.4,1-.4,1,.4,1,.4Z"/>
        <rect fill="#e2ce23" x="11" y="42" width="2" height="2"/>
        <path fill="#e2ce23" d="M 9.7 16.6 s 0 -0.42 0.83 -0.42 s 0.83 0.42 0.83 0.42 v 27 l -1.82 0"/>
      </g>

      <!-- Right Goal Post -->
      <g data-name="Right Goal Post">
        <path fill="#6c6e6f" d="M594,57.25s0,.75-2,.75-2-.75-2-.75v-8.5s0-.75,2-.75,2,.75,2,.75v8.5Z"/>
        <path fill="#e2ce23" d="M586,43v-2h1c3.31,0,6,2.69,6,6v2s0,.4-1,.4-1-.4-1-.4v-2c0-2.21-1.79-4-4-4h-1Z"/>
        <path fill="#e2ce23" d="M583,10c1,0,1,.4,1,.4v26.32s4,6.67,4,6.67v-26.99s0-.4,1-.4,1,.4,1,.4v30.6c0,.45-.3.84-.73.96-.43.12-.89-.06-1.12-.45l-6-10c-.09-.16-.14-.33-.14-.51V10.4s0-.4,1-.4Z"/>
        <rect fill="#e2ce23" x="587" y="42" width="2" height="2"/>
        <path fill="#e2ce23" d="M 588.5 16.6 s 0 -0.42 0.83 -0.42 s 0.83 0.42 0.83 0.42 v 27 l -1.82 0"/>
      </g>
    `;
  }

  getEndZoneText() {
    // Team name text removed - using logos instead
    return '';
  }

  getEndZoneLogos() {
    // If showEndZoneLogos is false, don't display logos (just show team colors)
    if (!this.options.showEndZoneLogos) {
      return '';
    }

    const awayAbbr = this.options.awayAbbr || 'AWAY';
    const homeAbbr = this.options.homeAbbr || 'HOME';

    // Get full team names for logo files
    const awayTeamName = TEAM_NAME_MAP[awayAbbr.toUpperCase()];
    const homeTeamName = TEAM_NAME_MAP[homeAbbr.toUpperCase()];

    // If no team name found, don't show logos
    if (!awayTeamName && !homeTeamName) {
      return '';
    }

    // End zone dimensions for perspective field:
    // Left end zone polygon: points="50 86 0 86 30 26 75 26"
    // Right end zone polygon: points="600 86 550 86 525 26 570 26"
    // The field has perspective: top edge (y=26) is narrower, bottom edge (y=86) is wider
    // End zone is ~50 units wide (x), ~60 units tall (y from 26 to 86)

    // Logo dimensions to fill 85% of end zone
    // After rotation: logoWidth becomes height, logoHeight becomes width
    // End zone is ~50 units wide (x), ~60 units tall (y from 26 to 86)
    const logoWidth = 48;  // Will become vertical height after rotation (fits within field bounds)
    const logoHeight = 40; // Will become horizontal width after rotation (fits within ~50 unit end zone width)

    // Calculate perspective matrix components
    // The field slopes inward toward the top, creating a 3D effect
    // We use a matrix transform to simulate the logo laying flat on the field
    // Matrix: [a c e; b d f] = [scaleX skewX translateX; skewY scaleY translateY]

    let svg = '<g data-name="Endzone Logos" class="endzone-logos">';

    // Away team logo (left end zone)
    // Logo faces left (text reads up), with perspective making top edge narrower
    if (awayTeamName) {
      const awayLogoPath = `/assets/${encodeURIComponent(awayTeamName)}.png`;
      // Center of left end zone
      const cx = 38;
      const cy = 56;

      // Use a group with nested transforms for proper transform-origin handling
      // 1. Rotate -90 degrees to face left
      // 2. Scale Y to create perspective (top smaller than bottom)
      // 3. Skew to match field angle
      svg += `
        <g class="endzone-logo-wrapper-left" transform="translate(${cx}, ${cy})">
          <g transform="rotate(-90)">
            <g transform="matrix(1, 0.42, 0, 0.85, 0, 0)">
              <image
                class="endzone-logo endzone-logo-left"
                href="${awayLogoPath}"
                x="${-logoWidth / 2}"
                y="${-logoHeight / 2}"
                width="${logoWidth}"
                height="${logoHeight}"
                preserveAspectRatio="none"
                opacity="0.7"
              />
            </g>
          </g>
        </g>
      `;
    }

    // Home team logo (right end zone)
    // Logo faces right (text reads down), with perspective making top edge narrower
    if (homeTeamName) {
      const homeLogoPath = `/assets/${encodeURIComponent(homeTeamName)}.png`;
      // Center of right end zone
      const cx = 562;
      const cy = 56;

      svg += `
        <g class="endzone-logo-wrapper-right" transform="translate(${cx}, ${cy})">
          <g transform="rotate(90)">
            <g transform="matrix(1, -0.42, 0, 0.85, 0, 0)">
              <image
                class="endzone-logo endzone-logo-right"
                href="${homeLogoPath}"
                x="${-logoWidth / 2}"
                y="${-logoHeight / 2}"
                width="${logoWidth}"
                height="${logoHeight}"
                preserveAspectRatio="none"
                opacity="0.7"
              />
            </g>
          </g>
        </g>
      `;
    }

    svg += '</g>';
    return svg;
  }

  getFirstDownMarker() {
    return `
      <g data-name="First Down" class="first-down-marker">
        <line class="first-down-line" x1="300" y1="26" x2="300" y2="86"/>
        <line class="first-down-line-edge" x1="300" y1="86" x2="300" y2="90"/>
        <image class="first-down-image" href="/assets/1stDown2.png" x="272" y="-23" width="56" height="49" preserveAspectRatio="xMidYMid meet"/>
      </g>
    `;
  }

  getScrimmageMarker() {
    return `
      <g data-name="Scrimmage" class="scrimmage-marker">
        <line class="scrimmage-line" x1="300" y1="26" x2="300" y2="86"/>
        <line class="scrimmage-line-edge" x1="300" y1="86" x2="300" y2="90"/>
        <image class="scrimmage-image" href="/assets/1stDown1.png" x="272" y="-23" width="56" height="49" preserveAspectRatio="xMidYMid meet"/>
        <use href="#ball-static" class="ball-indicator" x="295" y="53" width="10" height="6"/>
      </g>
    `;
  }

  getAnimationLayer() {
    return `<g data-name="Animations" class="animation-layer"></g>`;
  }

  // ==========================================
  // COORDINATE CONVERSION
  // ==========================================

  /**
   * Convert yard position (0-100) to SVG X coordinates
   * Accounts for perspective transformation
   * @param {number} yard - 0-100 (0=away goal line, 100=home goal line)
   * @returns {{ topX: number, bottomX: number }}
   */
  yardToCoords(yard) {
    // Playing field: x=50 to x=550 at bottom (y=86)
    // Playing field: x=75 to x=525 at top (y=26)
    const bottomLeft = 50, bottomRight = 550;
    const topLeft = 75, topRight = 525;

    const ratio = yard / 100;

    return {
      topX: topLeft + (topRight - topLeft) * ratio,
      bottomX: bottomLeft + (bottomRight - bottomLeft) * ratio
    };
  }

  /**
   * Get X coordinate for a yard position at a specific Y
   * @param {number} yard - 0-100 (yard position)
   * @param {number} y - Y coordinate (26=top, 86=bottom)
   * @returns {number} X coordinate
   */
  yardToX(yard, y = 56) {
    const { topX, bottomX } = this.yardToCoords(yard);
    const yRatio = (y - 26) / 60; // 0 at top, 1 at bottom
    return topX + (bottomX - topX) * yRatio;
  }

  // ==========================================
  // PUBLIC API - POSITION UPDATES
  // ==========================================

  /**
   * Set ball (scrimmage line) position
   * @param {number} position - 0-100 (yard position)
   * @param {string} color - Optional team color for line
   */
  setBallPosition(position, color = null) {
    this.state.ballPosition = Math.max(0, Math.min(100, position));
    this.state.possessionColor = color;
    this.updatePositions();
  }

  /**
   * Set first down position
   * @param {number} position - 0-100 (yard position)
   * @param {boolean} visible - Whether to show the line
   */
  setFirstDownPosition(position, visible = true) {
    this.state.firstDownPosition = Math.max(0, Math.min(100, position));
    this.state.showFirstDown = visible;
    this.updatePositions();
  }

  /**
   * Set team colors for end zones
   */
  setTeamColors(awayColor, homeColor) {
    this.options.awayColor = awayColor;
    this.options.homeColor = homeColor;

    // Update SVG
    this.svg.querySelectorAll('.endzone-left').forEach(el => {
      el.style.fill = awayColor;
    });
    this.svg.querySelectorAll('.endzone-right').forEach(el => {
      el.style.fill = homeColor;
    });
  }

  /**
   * Set end zone team abbreviations and update logos
   */
  setTeamAbbreviations(awayAbbr, homeAbbr) {
    this.options.awayAbbr = awayAbbr;
    this.options.homeAbbr = homeAbbr;

    // Update logos
    this.updateEndZoneLogos();
  }

  /**
   * Update end zone logos based on current team abbreviations
   */
  updateEndZoneLogos() {
    const awayTeamName = TEAM_NAME_MAP[this.options.awayAbbr?.toUpperCase()];
    const homeTeamName = TEAM_NAME_MAP[this.options.homeAbbr?.toUpperCase()];

    const leftLogo = this.svg.querySelector('.endzone-logo-left');
    const rightLogo = this.svg.querySelector('.endzone-logo-right');

    // Update or remove away logo
    if (leftLogo) {
      if (awayTeamName) {
        leftLogo.setAttribute('href', `/assets/${encodeURIComponent(awayTeamName)}.png`);
      } else {
        leftLogo.setAttribute('href', '');
      }
    }

    // Update or remove home logo
    if (rightLogo) {
      if (homeTeamName) {
        rightLogo.setAttribute('href', `/assets/${encodeURIComponent(homeTeamName)}.png`);
      } else {
        rightLogo.setAttribute('href', '');
      }
    }
  }

  /**
   * Update all marker positions
   */
  updatePositions() {
    this.updateScrimmageMarker();
    this.updateFirstDownMarker();
  }

  updateScrimmageMarker() {
    const marker = this.svg.querySelector('.scrimmage-marker');
    if (!marker) return;

    const { topX, bottomX } = this.yardToCoords(this.state.ballPosition);

    const line = marker.querySelector('.scrimmage-line');
    const lineEdge = marker.querySelector('.scrimmage-line-edge');
    const ball = marker.querySelector('.ball-indicator');
    const image = marker.querySelector('.scrimmage-image');

    if (line) {
      line.setAttribute('x1', topX);
      line.setAttribute('x2', bottomX);
    }
    if (lineEdge) {
      lineEdge.setAttribute('x1', bottomX);
      lineEdge.setAttribute('x2', bottomX);
    }
    if (ball) {
      const midX = this.yardToX(this.state.ballPosition, 56);
      ball.setAttribute('x', midX - 5);
    }
    if (image) {
      image.setAttribute('x', topX - 28);
    }

    // Apply team color if set
    if (this.state.possessionColor) {
      if (line) line.style.stroke = this.state.possessionColor;
      if (lineEdge) lineEdge.style.stroke = this.state.possessionColor;
    } else {
      if (line) line.style.stroke = '';
      if (lineEdge) lineEdge.style.stroke = '';
    }
  }

  updateFirstDownMarker() {
    const marker = this.svg.querySelector('.first-down-marker');
    if (!marker) return;

    if (!this.state.showFirstDown) {
      marker.classList.add('hidden');
      return;
    }
    marker.classList.remove('hidden');

    const { topX, bottomX } = this.yardToCoords(this.state.firstDownPosition);

    const line = marker.querySelector('.first-down-line');
    const lineEdge = marker.querySelector('.first-down-line-edge');
    const image = marker.querySelector('.first-down-image');

    if (line) {
      line.setAttribute('x1', topX);
      line.setAttribute('x2', bottomX);
    }
    if (lineEdge) {
      lineEdge.setAttribute('x1', bottomX);
      lineEdge.setAttribute('x2', bottomX);
    }
    if (image) {
      image.setAttribute('x', topX - 28);
    }
  }

  // ==========================================
  // PUBLIC API - ANIMATIONS
  // ==========================================

  /**
   * Animate rush play (linear ball movement)
   * @param {number} fromYard - Starting position (0-100)
   * @param {number} toYard - Ending position (0-100)
   * @param {number} duration - Animation duration in ms
   * @returns {Promise}
   */
  animateRush(fromYard, toYard, duration = 1000) {
    return this.animateBall('rush', fromYard, toYard, duration);
  }

  /**
   * Animate pass play (arc path with spiral)
   * @param {number} fromYard - Starting position (0-100)
   * @param {number} toYard - Ending position (0-100)
   * @param {number} arcHeight - Height of arc in SVG units
   * @param {number} duration - Animation duration in ms
   * @returns {Promise}
   */
  animatePass(fromYard, toYard, arcHeight = 25, duration = 1200) {
    return this.animateBall('pass', fromYard, toYard, duration, { arcHeight });
  }

  /**
   * Animate kickoff/punt (high arc with tumble)
   * @param {number} fromYard - Starting position (0-100)
   * @param {number} toYard - Ending position (0-100)
   * @param {number} duration - Animation duration in ms
   * @returns {Promise}
   */
  animateKick(fromYard, toYard, duration = 2500) {
    return this.animateBall('kick', fromYard, toYard, duration, { arcHeight: 50, tumble: true });
  }

  /**
   * Animate field goal (arc through the goal posts)
   * @param {number} fromYard - Starting position (0-100)
   * @param {string} direction - 'left' or 'right' (which goal post to target)
   * @param {number} duration - Animation duration in ms
   * @returns {Promise}
   */
  animateFieldGoal(fromYard, direction = 'right', duration = 2500) {
    if (this.state.animating) {
      return Promise.resolve();
    }

    this.state.animating = true;
    const animLayer = this.svg.querySelector('.animation-layer');
    if (!animLayer) {
      this.state.animating = false;
      return Promise.resolve();
    }

    // Starting position
    const startY = 56;
    const fromX = this.yardToX(fromYard, startY);

    // Goal post positions (from getGoalPosts method)
    // Right goal post: crossbar around x=588, top around y=10
    // Left goal post: crossbar around x=8, top around y=10
    let endX, endY;
    if (direction === 'right') {
      endX = 588; // Center between the goal posts
      endY = 20;  // At crossbar height level
    } else {
      endX = 8;
      endY = 20;
    }

    // Create high arc path like ESPN
    // Control points go high above the field (negative Y)
    const midX = (fromX + endX) / 2;
    const peakY = -30; // High arc peak (above the field)

    // Cubic bezier for smooth arc through goal posts
    const pathD = `M ${fromX} ${startY} C ${fromX + (midX - fromX) * 0.5} ${peakY}, ${endX - (endX - midX) * 0.5} ${peakY}, ${endX} ${endY}`;

    // Create unique ID
    const id = Date.now();

    // Create path element (for the yellow trail)
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id', `anim-path-${id}`);
    path.setAttribute('d', pathD);
    path.setAttribute('class', 'BallPath');
    path.style.strokeDasharray = path.getTotalLength ? path.getTotalLength() : 300;
    path.style.strokeDashoffset = path.getTotalLength ? path.getTotalLength() : 300;
    path.style.animation = `drawLine ${duration}ms ease-out forwards`;

    // Create animated ball with tumble
    const ball = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    ball.setAttribute('href', '#ball-static');
    ball.setAttribute('width', '10');
    ball.setAttribute('height', '6');
    ball.setAttribute('class', 'ball-animated');
    ball.style.offsetPath = `path('${pathD}')`;
    ball.style.animation = `moveBallKick ${duration}ms ease-out forwards`;

    // Add to animation layer
    animLayer.appendChild(path);
    animLayer.appendChild(ball);

    return new Promise(resolve => {
      setTimeout(() => {
        // Clean up
        path.remove();
        ball.remove();

        // Field goals don't update ball position (it goes off-field)
        this.state.animating = false;
        resolve();
      }, duration);
    });
  }

  /**
   * Internal animation method
   */
  animateBall(type, fromYard, toYard, duration, options = {}) {
    if (this.state.animating) {
      return Promise.resolve();
    }

    this.state.animating = true;
    const animLayer = this.svg.querySelector('.animation-layer');
    if (!animLayer) {
      this.state.animating = false;
      return Promise.resolve();
    }

    // Calculate SVG coordinates
    const y = 56; // Center of field
    const fromX = this.yardToX(fromYard, y);
    const toX = this.yardToX(toYard, y);

    // Create path based on type
    let pathD;
    if (type === 'rush') {
      pathD = `M ${fromX} ${y} L ${toX} ${y}`;
    } else {
      const arcHeight = options.arcHeight || 25;
      const midX = (fromX + toX) / 2;
      const midY = y - arcHeight;
      pathD = `M ${fromX} ${y} Q ${midX} ${midY} ${toX} ${y}`;
    }

    // Create unique IDs
    const id = Date.now();

    // Create path element
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id', `anim-path-${id}`);
    path.setAttribute('d', pathD);
    path.setAttribute('class', `BallPath ${type === 'pass' ? 'BallPath--pass' : ''}`);
    path.style.strokeDasharray = path.getTotalLength ? path.getTotalLength() : 200;
    path.style.strokeDashoffset = path.getTotalLength ? path.getTotalLength() : 200;
    path.style.animation = `drawLine ${duration}ms ease-out forwards`;

    // Create animated ball
    const ball = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    ball.setAttribute('href', type === 'pass' ? '#ball-spiral' : '#ball-static');
    ball.setAttribute('width', '10');
    ball.setAttribute('height', '6');
    ball.setAttribute('class', 'ball-animated');
    ball.style.offsetPath = `path('${pathD}')`;

    // Set animation
    if (type === 'kick' && options.tumble) {
      ball.style.animation = `moveBallKick ${duration}ms ease-out forwards`;
    } else if (type === 'pass') {
      ball.style.animation = `moveBallPass ${duration}ms ease-out forwards`;
      ball.style.offsetRotate = 'reverse';
    } else {
      ball.style.animation = `moveBallRush ${duration}ms ease-out forwards`;
      ball.style.offsetRotate = '0deg';
    }

    // Add to animation layer
    animLayer.appendChild(path);
    animLayer.appendChild(ball);

    return new Promise(resolve => {
      setTimeout(() => {
        // Clean up
        path.remove();
        ball.remove();

        // Update final position
        this.setBallPosition(toYard);
        this.state.animating = false;
        resolve();
      }, duration);
    });
  }

  /**
   * Animate incomplete pass (arc that fades/falls)
   * @param {number} fromYard - Starting position (0-100)
   * @param {number} toYard - Target position (0-100)
   * @param {number} duration - Animation duration in ms
   * @returns {Promise}
   */
  animateIncompletePass(fromYard, toYard, duration = 1200) {
    if (this.state.animating) {
      return Promise.resolve();
    }

    this.state.animating = true;
    const animLayer = this.svg.querySelector('.animation-layer');
    if (!animLayer) {
      this.state.animating = false;
      return Promise.resolve();
    }

    const y = 56;
    const fromX = this.yardToX(fromYard, y);
    const toX = this.yardToX(toYard, y);
    const arcHeight = 25;
    const midX = (fromX + toX) / 2;
    const midY = y - arcHeight;

    const pathD = `M ${fromX} ${y} Q ${midX} ${midY} ${toX} ${y + 10}`;
    const id = Date.now();

    // Create dashed path (incomplete indicator)
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id', `anim-path-${id}`);
    path.setAttribute('d', pathD);
    path.setAttribute('class', 'BallPath BallPath--pass');
    path.style.stroke = '#ef4444'; // Red for incomplete
    path.style.strokeDasharray = '4 4';
    path.style.strokeDashoffset = path.getTotalLength ? path.getTotalLength() : 200;
    path.style.animation = `drawLine ${duration}ms ease-out forwards`;

    const ball = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    ball.setAttribute('href', '#ball-spiral');
    ball.setAttribute('width', '10');
    ball.setAttribute('height', '6');
    ball.setAttribute('class', 'ball-animated');
    ball.style.offsetPath = `path('${pathD}')`;
    ball.style.animation = `moveBallPass ${duration}ms ease-out forwards`;
    ball.style.offsetRotate = 'reverse';

    // X mark at incomplete location
    const xMark = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xMark.setAttribute('x', toX);
    xMark.setAttribute('y', y + 10);
    xMark.setAttribute('text-anchor', 'middle');
    xMark.setAttribute('fill', '#ef4444');
    xMark.setAttribute('font-size', '12');
    xMark.setAttribute('font-weight', 'bold');
    xMark.textContent = '✗';
    xMark.style.opacity = '0';
    xMark.style.transition = 'opacity 0.3s';

    animLayer.appendChild(path);
    animLayer.appendChild(ball);
    animLayer.appendChild(xMark);

    setTimeout(() => { xMark.style.opacity = '1'; }, duration * 0.8);

    return new Promise(resolve => {
      setTimeout(() => {
        path.remove();
        ball.remove();
        xMark.remove();
        this.state.animating = false;
        resolve();
      }, duration + 500);
    });
  }

  /**
   * Animate sack (backwards rush)
   * @param {number} fromYard - Starting position (0-100)
   * @param {number} yardsLost - Yards lost (positive number)
   * @param {number} duration - Animation duration in ms
   * @returns {Promise}
   */
  animateSack(fromYard, yardsLost = 7, duration = 800) {
    const toYard = Math.max(0, fromYard - yardsLost);
    return this.animateBall('rush', fromYard, toYard, duration);
  }

  /**
   * Animate penalty (shows line indicating yards lost or gained)
   * @param {number} fromYard - Starting position (0-100)
   * @param {number} toYard - Ending position after penalty (0-100)
   * @param {number} duration - Animation duration in ms
   * @param {Object} options - Optional settings
   * @param {boolean} options.isGain - Override: true = blue (gain), false = red (loss)
   * @returns {Promise}
   */
  animatePenalty(fromYard, toYard, duration = 800, options = {}) {
    if (this.state.animating) {
      return Promise.resolve();
    }

    this.state.animating = true;
    const animLayer = this.svg.querySelector('.animation-layer');
    if (!animLayer) {
      this.state.animating = false;
      return Promise.resolve();
    }

    // Determine if yards lost (red) or gained (blue)
    // Can be overridden with options.isGain for drives going toward 0
    const yardsChange = toYard - fromYard;
    const isLoss = options.isGain !== undefined ? !options.isGain : yardsChange < 0;
    const lineColor = isLoss ? '#ef4444' : '#fcd34d';  // Red for loss, yellow for gain

    // Calculate SVG coordinates
    const fromX = this.yardToX(fromYard);
    const toX = this.yardToX(toYard);
    const lineY = 56;  // Middle of field

    return new Promise(resolve => {
      // Create penalty line group
      const penaltyGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      penaltyGroup.setAttribute('class', 'penalty-animation');

      // Create the animated line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', fromX);
      line.setAttribute('y1', lineY);
      line.setAttribute('x2', fromX);  // Start at same point, will animate to toX
      line.setAttribute('y2', lineY);
      line.setAttribute('stroke', lineColor);
      line.setAttribute('stroke-width', '4');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('opacity', '0.9');

      // Create arrow head at the end
      const arrowSize = 8;
      const arrowDirection = toX > fromX ? 1 : -1;
      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      arrow.setAttribute('fill', lineColor);
      arrow.setAttribute('opacity', '0');  // Will fade in

      // Create yards text label
      const yardsText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      yardsText.setAttribute('x', (fromX + toX) / 2);
      yardsText.setAttribute('y', lineY - 10);
      yardsText.setAttribute('text-anchor', 'middle');
      yardsText.setAttribute('fill', lineColor);
      yardsText.setAttribute('font-size', '12');
      yardsText.setAttribute('font-weight', 'bold');
      yardsText.setAttribute('opacity', '0');
      yardsText.textContent = `${isLoss ? '-' : '+'}${Math.abs(yardsChange)} YDS`;

      penaltyGroup.appendChild(line);
      penaltyGroup.appendChild(arrow);
      penaltyGroup.appendChild(yardsText);
      animLayer.appendChild(penaltyGroup);

      // Animate the line drawing
      const startTime = performance.now();
      const animateLine = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / (duration * 0.7), 1);  // Line takes 70% of duration

        // Animate line extending
        const currentX = fromX + (toX - fromX) * progress;
        line.setAttribute('x2', currentX);

        // Update arrow position
        const arrowX = currentX;
        const arrowPoints = arrowDirection > 0
          ? `${arrowX},${lineY} ${arrowX - arrowSize},${lineY - arrowSize / 2} ${arrowX - arrowSize},${lineY + arrowSize / 2}`
          : `${arrowX},${lineY} ${arrowX + arrowSize},${lineY - arrowSize / 2} ${arrowX + arrowSize},${lineY + arrowSize / 2}`;
        arrow.setAttribute('points', arrowPoints);

        if (progress >= 0.3) {
          arrow.setAttribute('opacity', Math.min((progress - 0.3) / 0.3, 0.9));
        }

        if (progress >= 0.5) {
          yardsText.setAttribute('opacity', Math.min((progress - 0.5) / 0.3, 1));
        }

        if (progress < 1) {
          requestAnimationFrame(animateLine);
        } else {
          // Hold briefly then fade out
          setTimeout(() => {
            penaltyGroup.style.transition = 'opacity 0.3s';
            penaltyGroup.style.opacity = '0';
            setTimeout(() => {
              penaltyGroup.remove();
              this.state.animating = false;
              resolve();
            }, 300);
          }, duration * 0.3);
        }
      };

      requestAnimationFrame(animateLine);
    });
  }

  /**
   * Animate punt
   * @param {number} fromYard - Starting position (0-100)
   * @param {number} toYard - Landing position (0-100)
   * @param {number} returnYards - Yards returned (0 for no return)
   * @param {number} duration - Animation duration in ms
   * @returns {Promise}
   */
  async animatePunt(fromYard, toYard, returnYards = 0, duration = 2000) {
    // First animate the punt
    await this.animateBall('kick', fromYard, toYard, duration, { arcHeight: 60, tumble: true });

    // Then animate the return if any
    if (returnYards > 0) {
      await new Promise(r => setTimeout(r, 200));
      // Return goes BACK toward the punting team (opposite direction of punt)
      // If punt went toward 0 (low), return goes toward 100 (high)
      // If punt went toward 100 (high), return goes toward 0 (low)
      const puntDirection = toYard > fromYard ? 1 : -1;  // 1 = punt went right, -1 = punt went left
      const returnEnd = Math.max(0, Math.min(100, toYard - (puntDirection * returnYards)));
      await this.animateBall('rush', toYard, returnEnd, returnYards * 50 + 500);
      return returnEnd;
    }
    return toYard;
  }

  /**
   * Animate kickoff
   * @param {number} fromYard - Starting position (usually 35)
   * @param {number} toYard - Landing position
   * @param {number} returnYards - Yards returned
   * @param {number} duration - Animation duration in ms
   * @returns {Promise}
   */
  async animateKickoff(fromYard, toYard, returnYards = 0, duration = 2500) {
    await this.animateBall('kick', fromYard, toYard, duration, { arcHeight: 55, tumble: true });

    if (returnYards > 0) {
      await new Promise(r => setTimeout(r, 200));
      // Return goes BACK toward the kicking team (opposite direction of kick)
      // If kick went toward 0 (low), return goes toward 100 (high)
      // If kick went toward 100 (high), return goes toward 0 (low)
      const kickDirection = toYard > fromYard ? 1 : -1;  // 1 = kick went right, -1 = kick went left
      const returnEnd = Math.max(0, Math.min(100, toYard - (kickDirection * returnYards)));
      await this.animateBall('rush', toYard, returnEnd, returnYards * 40 + 500);
      return returnEnd;
    }
    return toYard;
  }

  /**
   * Animate missed field goal (goes wide)
   * @param {number} fromYard - Starting position (0-100)
   * @param {string} direction - 'left' or 'right' (which goal)
   * @param {string} missDirection - 'wide_left', 'wide_right', or 'short'
   * @param {number} duration - Animation duration in ms
   * @returns {Promise}
   */
  animateMissedFieldGoal(fromYard, direction = 'right', missDirection = 'wide_right', duration = 2500) {
    if (this.state.animating) {
      return Promise.resolve();
    }

    this.state.animating = true;
    const animLayer = this.svg.querySelector('.animation-layer');
    if (!animLayer) {
      this.state.animating = false;
      return Promise.resolve();
    }

    const startY = 56;
    const fromX = this.yardToX(fromYard, startY);

    let endX, endY;
    if (direction === 'right') {
      if (missDirection === 'wide_right') {
        endX = 598; endY = 25;
      } else if (missDirection === 'wide_left') {
        endX = 578; endY = 25;
      } else {
        endX = 540; endY = 50; // Short
      }
    } else {
      if (missDirection === 'wide_left') {
        endX = 2; endY = 25;
      } else if (missDirection === 'wide_right') {
        endX = 18; endY = 25;
      } else {
        endX = 60; endY = 50;
      }
    }

    const midX = (fromX + endX) / 2;
    const peakY = missDirection === 'short' ? 10 : -25;
    const pathD = `M ${fromX} ${startY} C ${fromX + (midX - fromX) * 0.5} ${peakY}, ${endX - (endX - midX) * 0.5} ${peakY}, ${endX} ${endY}`;

    const id = Date.now();

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id', `anim-path-${id}`);
    path.setAttribute('d', pathD);
    path.setAttribute('class', 'BallPath');
    path.style.stroke = '#ef4444';
    path.style.strokeDasharray = path.getTotalLength ? path.getTotalLength() : 300;
    path.style.strokeDashoffset = path.getTotalLength ? path.getTotalLength() : 300;
    path.style.animation = `drawLine ${duration}ms ease-out forwards`;

    const ball = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    ball.setAttribute('href', '#ball-static');
    ball.setAttribute('width', '10');
    ball.setAttribute('height', '6');
    ball.setAttribute('class', 'ball-animated');
    ball.style.offsetPath = `path('${pathD}')`;
    ball.style.animation = `moveBallKick ${duration}ms ease-out forwards`;

    // "NO GOOD" text
    const noGoodText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    noGoodText.setAttribute('x', direction === 'right' ? 575 : 25);
    noGoodText.setAttribute('y', 0);
    noGoodText.setAttribute('text-anchor', 'middle');
    noGoodText.setAttribute('fill', '#ef4444');
    noGoodText.setAttribute('font-size', '8');
    noGoodText.setAttribute('font-weight', 'bold');
    noGoodText.textContent = 'NO GOOD';
    noGoodText.style.opacity = '0';
    noGoodText.style.transition = 'opacity 0.3s';

    animLayer.appendChild(path);
    animLayer.appendChild(ball);
    animLayer.appendChild(noGoodText);

    setTimeout(() => { noGoodText.style.opacity = '1'; }, duration * 0.9);

    return new Promise(resolve => {
      setTimeout(() => {
        path.remove();
        ball.remove();
        noGoodText.remove();
        this.state.animating = false;
        resolve();
      }, duration + 800);
    });
  }

  /**
   * Animate extra point attempt
   * @param {string} direction - 'left' or 'right'
   * @param {boolean} good - Whether it's good or not
   * @param {number} duration - Animation duration in ms
   * @returns {Promise}
   */
  animateExtraPoint(direction = 'right', good = true, duration = 1500) {
    // Extra point is kicked from the 15 yard line (85 or 15 depending on direction)
    const fromYard = direction === 'right' ? 85 : 15;

    if (good) {
      return this.animateFieldGoal(fromYard, direction, duration);
    } else {
      return this.animateMissedFieldGoal(fromYard, direction, 'wide_right', duration);
    }
  }

  /**
   * Animate interception
   * @param {number} fromYard - Pass starting position
   * @param {number} interceptYard - Where interception occurs
   * @param {number} returnYards - Yards returned (0 for no return, -1 for pick-six)
   * @param {number} duration - Animation duration in ms
   * @returns {Promise}
   */
  async animateInterception(fromYard, interceptYard, returnYards = 0, duration = 1200) {
    if (this.state.animating) {
      return Promise.resolve();
    }

    this.state.animating = true;
    const animLayer = this.svg.querySelector('.animation-layer');
    if (!animLayer) {
      this.state.animating = false;
      return Promise.resolve();
    }

    const y = 56;
    const fromX = this.yardToX(fromYard, y);
    const toX = this.yardToX(interceptYard, y);
    const arcHeight = 30;
    const midX = (fromX + toX) / 2;
    const midY = y - arcHeight;

    const pathD = `M ${fromX} ${y} Q ${midX} ${midY} ${toX} ${y}`;
    const id = Date.now();

    // Red path for interception
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id', `anim-path-${id}`);
    path.setAttribute('d', pathD);
    path.setAttribute('class', 'BallPath BallPath--pass');
    path.style.stroke = '#ef4444';
    path.style.strokeDasharray = path.getTotalLength ? path.getTotalLength() : 200;
    path.style.strokeDashoffset = path.getTotalLength ? path.getTotalLength() : 200;
    path.style.animation = `drawLine ${duration}ms ease-out forwards`;

    const ball = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    ball.setAttribute('href', '#ball-spiral');
    ball.setAttribute('width', '10');
    ball.setAttribute('height', '6');
    ball.setAttribute('class', 'ball-animated');
    ball.style.offsetPath = `path('${pathD}')`;
    ball.style.animation = `moveBallPass ${duration}ms ease-out forwards`;
    ball.style.offsetRotate = 'reverse';

    // INT indicator
    const intText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    intText.setAttribute('x', toX);
    intText.setAttribute('y', y - 15);
    intText.setAttribute('text-anchor', 'middle');
    intText.setAttribute('fill', '#ef4444');
    intText.setAttribute('font-size', '8');
    intText.setAttribute('font-weight', 'bold');
    intText.textContent = 'INT';
    intText.style.opacity = '0';
    intText.style.transition = 'opacity 0.3s';

    animLayer.appendChild(path);
    animLayer.appendChild(ball);
    animLayer.appendChild(intText);

    setTimeout(() => { intText.style.opacity = '1'; }, duration * 0.8);

    await new Promise(resolve => {
      setTimeout(() => {
        path.remove();
        ball.remove();
        this.state.animating = false;
        resolve();
      }, duration);
    });

    // Handle return
    if (returnYards !== 0) {
      await new Promise(r => setTimeout(r, 300));
      intText.remove();

      let returnEnd;
      if (returnYards === -1) {
        // Pick six - return to end zone
        returnEnd = fromYard > 50 ? 0 : 100;
      } else {
        // Return goes opposite direction (towards original passer's end zone)
        returnEnd = fromYard > interceptYard
          ? Math.max(0, interceptYard - returnYards)
          : Math.min(100, interceptYard + returnYards);
      }

      await this.animateBall('rush', interceptYard, returnEnd, Math.abs(returnEnd - interceptYard) * 40 + 500);
      this.setBallPosition(returnEnd);
      return returnEnd;
    } else {
      setTimeout(() => intText.remove(), 500);
      this.setBallPosition(interceptYard);
      return interceptYard;
    }
  }

  /**
   * Animate fumble
   * @param {number} fromYard - Rush starting position
   * @param {number} fumbleYard - Where fumble occurs
   * @param {number} recoveryYard - Where ball is recovered
   * @param {boolean} offenseRecovery - Whether offense recovers
   * @param {number} duration - Animation duration in ms
   * @returns {Promise}
   */
  async animateFumble(fromYard, fumbleYard, recoveryYard = null, offenseRecovery = true, duration = 800) {
    if (this.state.animating) {
      return Promise.resolve();
    }

    // First animate the rush to fumble point
    await this.animateBall('rush', fromYard, fumbleYard, duration);

    this.state.animating = true;
    const animLayer = this.svg.querySelector('.animation-layer');
    if (!animLayer) {
      this.state.animating = false;
      return fumbleYard;
    }

    const y = 56;
    const fumbleX = this.yardToX(fumbleYard, y);

    // Bouncing ball effect
    const recoverY = recoveryYard !== null ? recoveryYard : fumbleYard + (offenseRecovery ? 1 : -2);
    const recoverX = this.yardToX(recoverY, y);

    const bouncePath = `M ${fumbleX} ${y} Q ${fumbleX} ${y - 15} ${(fumbleX + recoverX) / 2} ${y - 10} T ${recoverX} ${y}`;

    const ball = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    ball.setAttribute('href', '#ball-static');
    ball.setAttribute('width', '10');
    ball.setAttribute('height', '6');
    ball.setAttribute('class', 'ball-animated');
    ball.style.offsetPath = `path('${bouncePath}')`;
    ball.style.animation = `moveBallKick 600ms ease-out forwards`;

    // FUMBLE text
    const fumbleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    fumbleText.setAttribute('x', fumbleX);
    fumbleText.setAttribute('y', y - 20);
    fumbleText.setAttribute('text-anchor', 'middle');
    fumbleText.setAttribute('fill', '#f59e0b');
    fumbleText.setAttribute('font-size', '7');
    fumbleText.setAttribute('font-weight', 'bold');
    fumbleText.textContent = 'FUMBLE';

    animLayer.appendChild(ball);
    animLayer.appendChild(fumbleText);

    await new Promise(resolve => {
      setTimeout(() => {
        ball.remove();
        fumbleText.remove();
        this.state.animating = false;
        this.setBallPosition(recoverY);
        resolve();
      }, 800);
    });

    return recoverY;
  }

  /**
   * Animate touchdown (with celebration effect)
   * @param {string} playType - 'pass' or 'rush'
   * @param {number} fromYard - Starting position
   * @param {number} toYard - End zone (0 or 100)
   * @param {number} duration - Animation duration in ms
   * @returns {Promise}
   */
  async animateTouchdown(playType, fromYard, toYard, duration = 1500) {
    // Animate the play
    if (playType === 'pass') {
      await this.animatePass(fromYard, toYard, 30, duration);
    } else {
      await this.animateRush(fromYard, toYard, duration);
    }

    // Add TD celebration
    const animLayer = this.svg.querySelector('.animation-layer');
    if (animLayer) {
      const tdText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const x = toYard === 100 ? 575 : 25;
      tdText.setAttribute('x', x);
      tdText.setAttribute('y', 56);
      tdText.setAttribute('text-anchor', 'middle');
      tdText.setAttribute('fill', '#22c55e');
      tdText.setAttribute('font-size', '12');
      tdText.setAttribute('font-weight', 'bold');
      tdText.textContent = 'TD!';
      tdText.style.animation = 'pulse 0.5s ease-in-out 3';

      animLayer.appendChild(tdText);
      setTimeout(() => tdText.remove(), 1500);
    }

    return toYard;
  }

  /**
   * Clear all animations
   */
  clearAnimations() {
    const animLayer = this.svg.querySelector('.animation-layer');
    if (animLayer) {
      animLayer.innerHTML = '';
    }
    this.state.animating = false;
  }

  /**
   * Toggle compressed mode (for smaller grids)
   */
  setCompressed(compressed) {
    this.options.compressed = compressed;
    this.svg.setAttribute('viewBox', compressed ? '0 -30 600 145' : '0 -40 600 130');
  }

  /**
   * Destroy the visualizer
   */
  destroy() {
    this.clearAnimations();
    this.container.innerHTML = '';
    this.svg = null;
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Calculate ball position from field position string
 * @param {string} fieldPosition - e.g., "KC 35" or "SF 20"
 * @param {string} awayAbbr - Away team abbreviation
 * @param {string} homeAbbr - Home team abbreviation
 * @returns {number} Position 0-100 (0=away goal line, 100=home goal line)
 */
function calculateBallPositionSVG(fieldPosition, awayAbbr, homeAbbr) {
  if (!fieldPosition) return 50;

  const parts = fieldPosition.trim().split(' ');
  if (parts.length < 2) return 50;

  const teamAbbr = parts[0].toUpperCase();
  const yardLine = parseInt(parts[1]);

  if (isNaN(yardLine)) return 50;

  // Away team's side: yard line = position
  // Home team's side: 100 - yard line
  if (teamAbbr === awayAbbr?.toUpperCase()) {
    return yardLine;
  } else if (teamAbbr === homeAbbr?.toUpperCase()) {
    return 100 - yardLine;
  }

  return 50;
}

/**
 * Calculate first down position
 * @param {number} ballPosition - Current ball position (0-100)
 * @param {number} yardsToGo - Yards needed for first down
 * @param {string} possession - 'away' or 'home'
 * @returns {number|null} First down line position (0-100) or null for goal
 */
function calculateFirstDownPositionSVG(ballPosition, yardsToGo, possession) {
  if (yardsToGo <= 0) return null;

  if (possession === 'away' || possession === 'left') {
    return Math.min(100, ballPosition + yardsToGo);
  } else {
    return Math.max(0, ballPosition - yardsToGo);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SVGFieldVisualizer, calculateBallPositionSVG, calculateFirstDownPositionSVG };
}
