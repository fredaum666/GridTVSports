// CSS Variable mappings for grid configuration
// Extracted from fullscreen-cards.css - actual values used in the app

// Base CSS Variables from :root
export const BASE_CSS_VARS = {
  // Team Logos
  logo: {
    min: '48px',
    preferred: '10vmin',
    max: '120px'
  },
  // Team Names
  teamName: {
    min: '1rem',
    preferred: '3vmin',
    max: '2.5rem'
  },
  // Scores
  score: {
    min: '2.5rem',
    preferred: '10vmin',
    max: '7rem'
  },
  // Records
  record: {
    min: '0.7rem',
    preferred: '1.8vmin',
    max: '1.3rem'
  },
  // VS Divider
  vs: {
    min: '1rem',
    preferred: '3vmin',
    max: '2rem'
  },
  // Status Text
  status: {
    min: '1.8rem',
    preferred: '2.3vmin',
    max: '2.5rem'
  },
  // Down/Distance
  downDistance: {
    min: '0.8rem',
    preferred: '2vmin',
    max: '1.5rem'
  },
  // Field Height
  fieldHeight: {
    min: '30px',
    preferred: '6vh',
    max: '50px'
  },
  // Grid 1 Field Height (larger)
  fieldHeightGrid1: {
    min: '55px',
    preferred: '12vh',
    max: '95px'
  }
};

// Grid-specific element sizes extracted from fullscreen-cards.css (lines 1362-1812)
export const GRID_CONFIGS = {
  // Desktop/TV configurations
  desktop: {
    1: {
      sportLogo: { width: '100px', height: '100px' },
      teamLogo: { width: '120px', height: '120px' },
      teamName: { fontSize: '3rem' },
      score: { fontSize: '6rem', minWidth: '120px' },
      record: { fontSize: '1.3rem' },
      status: { fontSize: '2rem' },
      downDistance: { fontSize: '1.5rem' },
      fieldHeight: 'clamp(55px, 12vh, 95px)',
      yardLabel: { fontSize: '14px' },
      ballIndicator: { fontSize: '24px' }
    },
    2: {
      sportLogo: { width: '70px', height: '70px' },
      teamLogo: { width: '90px', height: '90px' },
      teamName: { fontSize: '2.2rem' },
      score: { fontSize: '5rem' },
      record: { fontSize: '1.1rem' },
      yardLabel: { fontSize: '13px' },
      ballIndicator: { fontSize: '22px' }
    },
    3: {
      sportLogo: { width: '60px', height: '60px' },
      teamLogo: { width: '70px', height: '70px' },
      teamName: { fontSize: '1.8rem' },
      score: { fontSize: '4rem' },
      record: { fontSize: '1rem' },
      status: { fontSize: '1.2rem' },
      yardLabel: { fontSize: '12px' },
      ballIndicator: { fontSize: '20px' }
    },
    4: {
      sportLogo: { width: '80px', height: '80px' },
      teamLogo: { width: '60px', height: '60px' },
      teamName: { fontSize: '1.5rem' },
      score: { fontSize: '3rem', minWidth: '60px' },
      record: { fontSize: '0.85rem' },
      status: { fontSize: '1.9rem' },
      downDistance: { fontSize: '0.95rem' },
      fieldHeight: '30px',
      yardLabel: { fontSize: '11px' },
      ballIndicator: { fontSize: '18px' }
    },
    5: {
      sportLogo: { width: '65px', height: '65px' },
      teamLogo: { width: '55px', height: '55px' },
      teamName: { fontSize: '1.4rem' },
      score: { fontSize: '2.8rem', minWidth: '55px' },
      record: { fontSize: '0.8rem' },
      status: { fontSize: '1.8rem' },
      downDistance: { fontSize: '0.9rem' },
      fieldHeight: '28px',
      yardLabel: { fontSize: '9px' },
      ballIndicator: { fontSize: '16px' }
    },
    6: {
      sportLogo: { width: '40px', height: '40px', top: '10px', left: '10px' },
      teamLogo: { width: '45px', height: '45px' },
      teamName: { fontSize: '1.2rem' },
      score: { fontSize: '2.2rem', minWidth: '45px' },
      record: { fontSize: '0.75rem' },
      status: { fontSize: '0.9rem' },
      downDistance: { fontSize: '0.8rem' },
      fieldHeight: '25px',
      vsDivider: { fontSize: '0.9rem' },
      yardLabel: { fontSize: '8px' },
      ballIndicator: { fontSize: '14px' }
    },
    7: {
      sportLogo: { width: '35px', height: '35px', top: '10px', left: '10px' },
      teamLogo: { width: '40px', height: '40px' },
      teamName: { fontSize: '1.1rem' },
      score: { fontSize: '2rem', minWidth: '40px' },
      record: { fontSize: '0.7rem' },
      status: { fontSize: '0.85rem' },
      downDistance: { fontSize: '0.75rem' },
      fieldHeight: '22px',
      vsDivider: { fontSize: '0.8rem' },
      yardLabel: { fontSize: '7px' },
      ballIndicator: { fontSize: '13px' },
      // Featured card (first card) gets larger
      featured: {
        sportLogo: { width: '55px', height: '55px' },
        teamLogo: { width: '65px', height: '65px' },
        teamName: { fontSize: '1.6rem' },
        score: { fontSize: '3.5rem', minWidth: '65px' },
        record: { fontSize: '0.9rem' },
        status: { fontSize: '1.1rem' },
        fieldHeight: '35px',
        yardLabel: { fontSize: '10px' },
        ballIndicator: { fontSize: '18px' }
      }
    },
    8: {
      sportLogo: { width: '30px', height: '30px', top: '8px', left: '8px' },
      teamLogo: { width: '35px', height: '35px' },
      teamName: { fontSize: '0.95rem' },
      score: { fontSize: '1.8rem', minWidth: '35px' },
      record: { fontSize: '0.65rem' },
      status: { fontSize: '0.75rem' },
      downDistance: { fontSize: '0.7rem' },
      fieldHeight: '20px',
      vsDivider: { fontSize: '0.7rem' },
      cardPadding: '10px',
      cardBorderRadius: '8px',
      cardBorderWidth: '2px',
      yardLabel: { fontSize: '7px' },
      ballIndicator: { fontSize: '12px' }
    }
  },
  // Mobile portrait configurations (extracted from media query)
  mobile: {
    1: {
      sportLogo: { width: '22vw', height: '22vw', maxWidth: '110px', maxHeight: '110px' },
      teamLogo: { width: '20vw', height: '20vw', maxWidth: '100px', maxHeight: '100px' },
      teamName: { fontSize: 'clamp(2rem, 10vw, 4rem)' },
      score: { fontSize: 'clamp(4rem, 18vw, 7rem)' },
      record: { fontSize: 'clamp(1rem, 4vw, 1.6rem)' },
      status: { fontSize: 'clamp(1.5rem, 6vw, 2.5rem)' },
      downDistance: { fontSize: 'clamp(1.3rem, 5vw, 2rem)' },
      fieldHeight: 'clamp(45px, 9vh, 75px)',
      yardLabel: { fontSize: '11px' },
      ballIndicator: { fontSize: '20px' }
    },
    2: {
      sportLogo: { width: '14vw', height: '14vw', maxWidth: '70px', maxHeight: '70px' },
      teamLogo: { width: '16vw', height: '16vw', maxWidth: '80px', maxHeight: '80px' },
      teamName: { fontSize: 'clamp(1.5rem, 6vw, 2.5rem)' },
      score: { fontSize: 'clamp(3rem, 14vw, 5.5rem)' },
      record: { fontSize: 'clamp(0.85rem, 3vw, 1.2rem)' },
      status: { fontSize: 'clamp(1.2rem, 5vw, 1.9rem)' },
      downDistance: { fontSize: 'clamp(1.2rem, 5vw, 1.8rem)' },
      fieldHeight: '32px',
      yardLabel: { fontSize: '10px' },
      ballIndicator: { fontSize: '18px' }
    },
    4: {
      sportLogo: { width: '10vw', height: '10vw', maxWidth: '45px', maxHeight: '45px' },
      teamLogo: { width: '11vw', height: '11vw', maxWidth: '55px', maxHeight: '55px' },
      teamName: { fontSize: 'clamp(1rem, 5vw, 1.6rem)' },
      score: { fontSize: 'clamp(2rem, 10vw, 3.5rem)' },
      record: { fontSize: 'clamp(0.65rem, 2.5vw, 1rem)' },
      status: { fontSize: 'clamp(0.9rem, 4vw, 1.3rem)' },
      downDistance: { fontSize: 'clamp(0.85rem, 3.5vw, 1.2rem)' },
      fieldHeight: '24px',
      vsDivider: { fontSize: 'clamp(0.8rem, 3vw, 1.1rem)' },
      yardLabel: { fontSize: '8px' },
      ballIndicator: { fontSize: '14px' }
    },
    6: {
      sportLogo: { width: '8vw', height: '8vw', maxWidth: '36px', maxHeight: '36px' },
      teamLogo: { width: '9vw', height: '9vw', maxWidth: '42px', maxHeight: '42px' },
      teamName: { fontSize: 'clamp(0.85rem, 4vw, 1.3rem)' },
      score: { fontSize: 'clamp(1.6rem, 8vw, 2.8rem)' },
      record: { fontSize: 'clamp(0.55rem, 2vw, 0.9rem)' },
      status: { fontSize: 'clamp(0.8rem, 3.5vw, 1.1rem)' },
      downDistance: { fontSize: 'clamp(0.7rem, 3vw, 1rem)' },
      fieldHeight: '20px',
      vsDivider: { fontSize: 'clamp(0.7rem, 2.5vw, 0.95rem)' },
      yardLabel: { fontSize: '6px' },
      ballIndicator: { fontSize: '12px' }
    },
    8: {
      sportLogo: { width: '7vw', height: '7vw', maxWidth: '30px', maxHeight: '30px' },
      teamLogo: { width: '7vw', height: '7vw', maxWidth: '32px', maxHeight: '32px' },
      teamName: { fontSize: 'clamp(0.7rem, 3.5vw, 1.1rem)' },
      score: { fontSize: 'clamp(1.3rem, 6.5vw, 2.2rem)' },
      record: { fontSize: 'clamp(0.5rem, 1.8vw, 0.75rem)' },
      status: { fontSize: 'clamp(0.65rem, 2.8vw, 0.95rem)' },
      downDistance: { fontSize: 'clamp(0.6rem, 2.5vw, 0.85rem)' },
      fieldHeight: '16px',
      vsDivider: { fontSize: 'clamp(0.55rem, 2vw, 0.8rem)' },
      yardLabel: { fontSize: '5px' },
      ballIndicator: { fontSize: '10px' }
    }
  },
  // Tablet portrait
  tablet: {
    1: {
      fieldWidth: '90%'
    },
    2: {
      fieldWidth: '92%'
    },
    4: {
      fieldWidth: '88%'
    }
  }
};

// TV Scoreboard component sizes (from tv-sports-bar.html)
export const SCOREBOARD_CONFIGS = {
  default: {
    scoreboard: {
      width: '90%',
      height: 'clamp(50px, 8vmin, 70px)'
    },
    scoreBox: {
      width: 'clamp(65px, 10vmin, 90px)'
    },
    teamLogo: {
      width: 'clamp(50px, 8vmin, 90px)',
      height: 'clamp(50px, 8vmin, 90px)'
    },
    logoSpacer: {
      width: 'clamp(50px, 8vmin, 70px)'
    },
    centerSpacer: {
      width: 'clamp(60px, 10vmin, 100px)'
    },
    score: {
      fontSize: 'clamp(1.5rem, 4vmin, 2.5rem)'
    },
    teamName: {
      fontSize: 'clamp(0.8rem, 2vmin, 1.1rem)'
    },
    teamRecord: {
      fontSize: 'clamp(0.6rem, 1.5vmin, 0.85rem)'
    },
    timeBox: {
      padding: '3px 10px',
      minWidth: '60px'
    },
    timeLabel: {
      fontSize: 'clamp(0.5rem, 1.2vmin, 0.7rem)'
    },
    time: {
      fontSize: 'clamp(0.65rem, 1.8vmin, 0.9rem)'
    },
    timeoutBar: {
      width: 'clamp(6px, 1vmin, 10px)',
      height: 'clamp(6px, 1vmin, 10px)'
    },
    possession: {
      fontSize: 'clamp(14px, 2.0vmin, 24px)'
    },
    situation: {
      fontSize: 'clamp(0.65rem, 1.8vmin, 0.85rem)'
    }
  },
  grid1: {
    scoreboard: {
      height: 'clamp(70px, 10vmin, 100px)'
    },
    scoreBox: {
      width: 'clamp(70px, 10vmin, 100px)'
    },
    teamLogo: {
      width: 'clamp(80px, 12vmin, 140px)',
      height: 'clamp(80px, 12vmin, 140px)'
    },
    logoSpacer: {
      width: 'clamp(70px, 10vmin, 100px)'
    },
    centerSpacer: {
      width: 'clamp(80px, 12vmin, 120px)'
    },
    timeoutBar: {
      width: 'clamp(8px, 1.2vmin, 12px)',
      height: 'clamp(8px, 1.2vmin, 12px)'
    },
    possession: {
      fontSize: 'clamp(20px, 3.5vmin, 32px)'
    }
  },
  grid2: {
    teamLogo: {
      width: 'clamp(60px, 10vmin, 100px)',
      height: 'clamp(60px, 10vmin, 100px)'
    },
    logoSpacer: {
      width: 'clamp(50px, 8vmin, 70px)'
    },
    centerSpacer: {
      width: 'clamp(70px, 10vmin, 100px)'
    },
    timeoutBar: {
      width: 'clamp(7px, 1.1vmin, 10px)',
      height: 'clamp(7px, 1.1vmin, 10px)'
    },
    possession: {
      fontSize: 'clamp(18px, 3vmin, 28px)'
    }
  },
  grid5: {
    possession: {
      fontSize: 'clamp(12px, 2vmin, 18px)'
    }
  },
  grid6: {
    possession: {
      fontSize: 'clamp(12px, 2vmin, 18px)'
    }
  },
  grid7: {
    possession: {
      fontSize: 'clamp(10px, 1.5vmin, 14px)'
    }
  },
  grid8: {
    possession: {
      fontSize: 'clamp(10px, 1.5vmin, 14px)'
    }
  }
};

// Field width by grid layout
export const FIELD_WIDTH_CONFIGS = {
  desktop: {
    1: '85%',
    2: '95%',
    3: '90%',
    4: '90%',
    5: '88%',
    6: '88%',
    7: '85%',
    8: '85%'
  },
  tablet_portrait: {
    1: '90%',
    2: '92%',
    3: '90%',
    4: '88%',
    5: '88%',
    6: '85%',
    7: '85%',
    8: '82%'
  },
  phone_portrait: {
    1: '95%',
    2: '92%',
    3: '90%',
    4: '88%'
  }
};

// Element configurations for the inspector panel
export const ELEMENT_CONFIGS = {
  teamLogo: {
    label: 'Team Logo',
    cssVar: 'fs-logo',
    properties: ['width', 'height'],
    defaults: {
      width: { min: 48, preferred: 10, max: 120, unit: 'vmin' },
      height: { min: 48, preferred: 10, max: 120, unit: 'vmin' }
    }
  },
  scoreText: {
    label: 'Score Text',
    cssVar: 'fs-score',
    properties: ['fontSize'],
    defaults: {
      fontSize: { min: 2.5, preferred: 10, max: 7, unit: 'rem' }
    }
  },
  teamName: {
    label: 'Team Name',
    cssVar: 'fs-team-name',
    properties: ['fontSize'],
    defaults: {
      fontSize: { min: 1, preferred: 3, max: 2.5, unit: 'rem' }
    }
  },
  gameStatus: {
    label: 'Game Status',
    cssVar: 'fs-status',
    properties: ['fontSize'],
    defaults: {
      fontSize: { min: 1.8, preferred: 2.3, max: 2.5, unit: 'rem' }
    }
  },
  fieldVisualizer: {
    label: 'Field Visualizer',
    cssVar: 'fs-field',
    properties: ['height', 'width'],
    defaults: {
      height: { min: 30, preferred: 6, max: 50, unit: 'vh' },
      width: { min: 70, preferred: 90, max: 100, unit: '%' }
    }
  },
  timeoutIndicator: {
    label: 'Timeout Indicator',
    cssVar: 'fs-timeout',
    properties: ['width', 'height'],
    defaults: {
      width: { min: 16, preferred: 3, max: 28, unit: 'vw' },
      height: { min: 5, preferred: 1, max: 8, unit: 'vh' }
    }
  },
  vsDivider: {
    label: 'VS Divider',
    cssVar: 'fs-vs',
    properties: ['fontSize'],
    defaults: {
      fontSize: { min: 1, preferred: 3, max: 2, unit: 'rem' }
    }
  },
  downDistance: {
    label: 'Down & Distance',
    cssVar: 'fs-down-distance',
    properties: ['fontSize'],
    defaults: {
      fontSize: { min: 0.8, preferred: 2, max: 1.5, unit: 'rem' }
    }
  },
  possession: {
    label: 'Possession Indicator',
    cssVar: 'fs-possession',
    properties: ['fontSize'],
    defaults: {
      fontSize: { min: 18, preferred: 4, max: 32, unit: 'vmin' }
    }
  },
  record: {
    label: 'Team Record',
    cssVar: 'fs-record',
    properties: ['fontSize'],
    defaults: {
      fontSize: { min: 0.7, preferred: 1.8, max: 1.3, unit: 'rem' }
    }
  }
};

// Get config for specific grid count
export const getGridConfig = (device, gridCount) => {
  const configs = GRID_CONFIGS[device] || GRID_CONFIGS.desktop;
  return configs[gridCount] || configs[4]; // Default to grid 4
};

// Get scoreboard config for specific grid
export const getScoreboardConfig = (gridCount) => {
  const baseConfig = { ...SCOREBOARD_CONFIGS.default };
  const gridConfig = SCOREBOARD_CONFIGS[`grid${gridCount}`];

  if (gridConfig) {
    Object.keys(gridConfig).forEach(key => {
      baseConfig[key] = { ...baseConfig[key], ...gridConfig[key] };
    });
  }

  return baseConfig;
};

// Generate CSS variable name
export const getCSSVarName = (element, property, device, gridCount) => {
  return `--${ELEMENT_CONFIGS[element].cssVar}-${property}-${device}-grid-${gridCount}`;
};

// Generate clamp() value from config
export const generateClampValue = (config) => {
  const { min, preferred, max, unit } = config;
  const preferredUnit = unit === 'px' ? 'vmin' : unit;
  return `clamp(${min}${unit}, ${preferred}${preferredUnit}, ${max}${unit})`;
};

// Parse clamp() value to config object
export const parseClampValue = (clampStr) => {
  const match = clampStr.match(/clamp\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (!match) return null;

  const parseValue = (str) => {
    const numMatch = str.trim().match(/^([\d.]+)(.+)$/);
    if (!numMatch) return { value: 0, unit: 'px' };
    return { value: parseFloat(numMatch[1]), unit: numMatch[2] };
  };

  const minParsed = parseValue(match[1]);
  const prefParsed = parseValue(match[2]);
  const maxParsed = parseValue(match[3]);

  return {
    min: minParsed.value,
    preferred: prefParsed.value,
    max: maxParsed.value,
    unit: minParsed.unit
  };
};

// ESPN CDN logo URL helper
const espnLogo = (league, teamAbbr) => `https://a.espncdn.com/i/teamlogos/${league}/500/${teamAbbr.toLowerCase()}.png`;

// Mock game data for preview - using ESPN API logo URLs
export const MOCK_GAMES = [
  {
    id: 1,
    sport: 'NFL',
    league: 'nfl',
    home: { abbr: 'KC', name: 'Chiefs', score: 24, logo: espnLogo('nfl', 'kc'), record: '12-4', timeouts: 3, primaryColor: '#E31837', secondaryColor: '#FFB612' },
    away: { abbr: 'BUF', name: 'Bills', score: 21, logo: espnLogo('nfl', 'buf'), record: '11-5', timeouts: 2, primaryColor: '#00338D', secondaryColor: '#C60C30' },
    status: 'Q3 8:42',
    quarter: '3RD',
    clock: '8:42',
    possession: 'home',
    downDistance: '2nd & 7',
    fieldPosition: 'KC 35',
    isLive: true
  },
  {
    id: 2,
    sport: 'NFL',
    league: 'nfl',
    home: { abbr: 'PHI', name: 'Eagles', score: 17, logo: espnLogo('nfl', 'phi'), record: '13-3', timeouts: 3, primaryColor: '#004C54', secondaryColor: '#A5ACAF' },
    away: { abbr: 'DAL', name: 'Cowboys', score: 14, logo: espnLogo('nfl', 'dal'), record: '10-6', timeouts: 1, primaryColor: '#003594', secondaryColor: '#869397' },
    status: 'Q2 2:15',
    quarter: '2ND',
    clock: '2:15',
    possession: 'away',
    downDistance: '1st & 10',
    fieldPosition: 'DAL 20',
    isLive: true
  },
  {
    id: 3,
    sport: 'NFL',
    league: 'nfl',
    home: { abbr: 'SF', name: '49ers', score: 31, logo: espnLogo('nfl', 'sf'), record: '14-2', timeouts: 2, primaryColor: '#AA0000', secondaryColor: '#B3995D' },
    away: { abbr: 'SEA', name: 'Seahawks', score: 17, logo: espnLogo('nfl', 'sea'), record: '9-7', timeouts: 3, primaryColor: '#002244', secondaryColor: '#69BE28' },
    status: 'Q4 11:30',
    quarter: '4TH',
    clock: '11:30',
    possession: 'home',
    downDistance: '3rd & 3',
    fieldPosition: 'SEA 45',
    isLive: true
  },
  {
    id: 4,
    sport: 'NFL',
    league: 'nfl',
    home: { abbr: 'MIA', name: 'Dolphins', score: 28, logo: espnLogo('nfl', 'mia'), record: '11-5', timeouts: 2, primaryColor: '#008E97', secondaryColor: '#FC4C02' },
    away: { abbr: 'NYJ', name: 'Jets', score: 21, logo: espnLogo('nfl', 'nyj'), record: '7-9', timeouts: 0, primaryColor: '#125740', secondaryColor: '#000000' },
    status: 'Q3 5:20',
    quarter: '3RD',
    clock: '5:20',
    possession: 'away',
    downDistance: '4th & 1',
    fieldPosition: 'MIA 30',
    isLive: true
  },
  {
    id: 5,
    sport: 'NFL',
    league: 'nfl',
    home: { abbr: 'BAL', name: 'Ravens', score: 35, logo: espnLogo('nfl', 'bal'), record: '13-3', timeouts: 3, primaryColor: '#241773', secondaryColor: '#000000' },
    away: { abbr: 'CIN', name: 'Bengals', score: 28, logo: espnLogo('nfl', 'cin'), record: '10-6', timeouts: 2, primaryColor: '#FB4F14', secondaryColor: '#000000' },
    status: 'Q4 0:45',
    quarter: '4TH',
    clock: '0:45',
    possession: 'home',
    downDistance: '1st & Goal',
    fieldPosition: 'CIN 5',
    isLive: true,
    isRedzone: true
  },
  {
    id: 6,
    sport: 'NFL',
    league: 'nfl',
    home: { abbr: 'DET', name: 'Lions', score: 24, logo: espnLogo('nfl', 'det'), record: '12-4', timeouts: 1, primaryColor: '#0076B6', secondaryColor: '#B0B7BC' },
    away: { abbr: 'GB', name: 'Packers', score: 24, logo: espnLogo('nfl', 'gb'), record: '9-7', timeouts: 2, primaryColor: '#203731', secondaryColor: '#FFB612' },
    status: 'Q4 3:10',
    quarter: '4TH',
    clock: '3:10',
    possession: 'away',
    downDistance: '2nd & 8',
    fieldPosition: 'DET 40',
    isLive: true
  },
  {
    id: 7,
    sport: 'NFL',
    league: 'nfl',
    home: { abbr: 'LAR', name: 'Rams', score: 14, logo: espnLogo('nfl', 'lar'), record: '8-8', timeouts: 3, primaryColor: '#003594', secondaryColor: '#FFD100' },
    away: { abbr: 'ARI', name: 'Cardinals', score: 10, logo: espnLogo('nfl', 'ari'), record: '4-12', timeouts: 3, primaryColor: '#97233F', secondaryColor: '#000000' },
    status: 'Q2 12:00',
    quarter: '2ND',
    clock: '12:00',
    possession: 'home',
    downDistance: '1st & 10',
    fieldPosition: 'ARI 25',
    isLive: true
  },
  {
    id: 8,
    sport: 'NFL',
    league: 'nfl',
    home: { abbr: 'CLE', name: 'Browns', score: 21, logo: espnLogo('nfl', 'cle'), record: '11-5', timeouts: 2, primaryColor: '#311D00', secondaryColor: '#FF3C00' },
    away: { abbr: 'PIT', name: 'Steelers', score: 17, logo: espnLogo('nfl', 'pit'), record: '10-6', timeouts: 1, primaryColor: '#FFB612', secondaryColor: '#101820' },
    status: 'Q3 9:55',
    quarter: '3RD',
    clock: '9:55',
    possession: 'away',
    downDistance: '3rd & 12',
    fieldPosition: 'CLE 48',
    isLive: true
  }
];
