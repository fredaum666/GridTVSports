/**
 * NFL Teams Data
 * Complete list of all 32 NFL teams with metadata for team auto-detection
 */

const NFL_TEAMS = {
  // AFC East
  'BUF': {
    abbr: 'BUF',
    name: 'Bills',
    fullName: 'Buffalo Bills',
    city: 'Buffalo',
    color: '#00338D',
    altColor: '#C60C30',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png'
  },
  'MIA': {
    abbr: 'MIA',
    name: 'Dolphins',
    fullName: 'Miami Dolphins',
    city: 'Miami',
    color: '#008E97',
    altColor: '#FC4C02',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png'
  },
  'NE': {
    abbr: 'NE',
    name: 'Patriots',
    fullName: 'New England Patriots',
    city: 'New England',
    color: '#002244',
    altColor: '#C60C30',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png'
  },
  'NYJ': {
    abbr: 'NYJ',
    name: 'Jets',
    fullName: 'New York Jets',
    city: 'New York',
    color: '#125740',
    altColor: '#000000',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png'
  },

  // AFC North
  'BAL': {
    abbr: 'BAL',
    name: 'Ravens',
    fullName: 'Baltimore Ravens',
    city: 'Baltimore',
    color: '#241773',
    altColor: '#000000',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png'
  },
  'CIN': {
    abbr: 'CIN',
    name: 'Bengals',
    fullName: 'Cincinnati Bengals',
    city: 'Cincinnati',
    color: '#FB4F14',
    altColor: '#000000',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png'
  },
  'CLE': {
    abbr: 'CLE',
    name: 'Browns',
    fullName: 'Cleveland Browns',
    city: 'Cleveland',
    color: '#311D00',
    altColor: '#FF3C00',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png'
  },
  'PIT': {
    abbr: 'PIT',
    name: 'Steelers',
    fullName: 'Pittsburgh Steelers',
    city: 'Pittsburgh',
    color: '#FFB612',
    altColor: '#101820',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png'
  },

  // AFC South
  'HOU': {
    abbr: 'HOU',
    name: 'Texans',
    fullName: 'Houston Texans',
    city: 'Houston',
    color: '#03202F',
    altColor: '#A71930',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png'
  },
  'IND': {
    abbr: 'IND',
    name: 'Colts',
    fullName: 'Indianapolis Colts',
    city: 'Indianapolis',
    color: '#002C5F',
    altColor: '#A2AAAD',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png'
  },
  'JAX': {
    abbr: 'JAX',
    name: 'Jaguars',
    fullName: 'Jacksonville Jaguars',
    city: 'Jacksonville',
    color: '#006778',
    altColor: '#D7A22A',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png'
  },
  'TEN': {
    abbr: 'TEN',
    name: 'Titans',
    fullName: 'Tennessee Titans',
    city: 'Tennessee',
    color: '#0C2340',
    altColor: '#4B92DB',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png'
  },

  // AFC West
  'DEN': {
    abbr: 'DEN',
    name: 'Broncos',
    fullName: 'Denver Broncos',
    city: 'Denver',
    color: '#FB4F14',
    altColor: '#002244',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png'
  },
  'KC': {
    abbr: 'KC',
    name: 'Chiefs',
    fullName: 'Kansas City Chiefs',
    city: 'Kansas City',
    color: '#E31837',
    altColor: '#FFB81C',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png'
  },
  'LV': {
    abbr: 'LV',
    name: 'Raiders',
    fullName: 'Las Vegas Raiders',
    city: 'Las Vegas',
    color: '#000000',
    altColor: '#A5ACAF',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png'
  },
  'LAC': {
    abbr: 'LAC',
    name: 'Chargers',
    fullName: 'Los Angeles Chargers',
    city: 'Los Angeles',
    color: '#0080C6',
    altColor: '#FFC20E',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png'
  },

  // NFC East
  'DAL': {
    abbr: 'DAL',
    name: 'Cowboys',
    fullName: 'Dallas Cowboys',
    city: 'Dallas',
    color: '#003594',
    altColor: '#869397',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png'
  },
  'NYG': {
    abbr: 'NYG',
    name: 'Giants',
    fullName: 'New York Giants',
    city: 'New York',
    color: '#0B2265',
    altColor: '#A71930',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png'
  },
  'PHI': {
    abbr: 'PHI',
    name: 'Eagles',
    fullName: 'Philadelphia Eagles',
    city: 'Philadelphia',
    color: '#004C54',
    altColor: '#A5ACAF',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png'
  },
  'WSH': {
    abbr: 'WSH',
    name: 'Commanders',
    fullName: 'Washington Commanders',
    city: 'Washington',
    color: '#5A1414',
    altColor: '#FFB612',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png'
  },

  // NFC North
  'CHI': {
    abbr: 'CHI',
    name: 'Bears',
    fullName: 'Chicago Bears',
    city: 'Chicago',
    color: '#0B162A',
    altColor: '#C83803',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png'
  },
  'DET': {
    abbr: 'DET',
    name: 'Lions',
    fullName: 'Detroit Lions',
    city: 'Detroit',
    color: '#0076B6',
    altColor: '#B0B7BC',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png'
  },
  'GB': {
    abbr: 'GB',
    name: 'Packers',
    fullName: 'Green Bay Packers',
    city: 'Green Bay',
    color: '#203731',
    altColor: '#FFB612',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png'
  },
  'MIN': {
    abbr: 'MIN',
    name: 'Vikings',
    fullName: 'Minnesota Vikings',
    city: 'Minnesota',
    color: '#4F2683',
    altColor: '#FFC62F',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png'
  },

  // NFC South
  'ATL': {
    abbr: 'ATL',
    name: 'Falcons',
    fullName: 'Atlanta Falcons',
    city: 'Atlanta',
    color: '#A71930',
    altColor: '#000000',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png'
  },
  'CAR': {
    abbr: 'CAR',
    name: 'Panthers',
    fullName: 'Carolina Panthers',
    city: 'Carolina',
    color: '#0085CA',
    altColor: '#101820',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png'
  },
  'NO': {
    abbr: 'NO',
    name: 'Saints',
    fullName: 'New Orleans Saints',
    city: 'New Orleans',
    color: '#D3BC8D',
    altColor: '#101820',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png'
  },
  'TB': {
    abbr: 'TB',
    name: 'Buccaneers',
    fullName: 'Tampa Bay Buccaneers',
    city: 'Tampa Bay',
    color: '#D50A0A',
    altColor: '#FF7900',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png'
  },

  // NFC West
  'ARI': {
    abbr: 'ARI',
    name: 'Cardinals',
    fullName: 'Arizona Cardinals',
    city: 'Arizona',
    color: '#97233F',
    altColor: '#000000',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png'
  },
  'LA': {
    abbr: 'LA',
    name: 'Rams',
    fullName: 'Los Angeles Rams',
    city: 'Los Angeles',
    color: '#003594',
    altColor: '#FFA300',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png'
  },
  'LAR': {
    abbr: 'LAR',
    name: 'Rams',
    fullName: 'Los Angeles Rams',
    city: 'Los Angeles',
    color: '#003594',
    altColor: '#FFA300',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png'
  },
  'SF': {
    abbr: 'SF',
    name: '49ers',
    fullName: 'San Francisco 49ers',
    city: 'San Francisco',
    color: '#AA0000',
    altColor: '#B3995D',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png'
  },
  'SEA': {
    abbr: 'SEA',
    name: 'Seahawks',
    fullName: 'Seattle Seahawks',
    city: 'Seattle',
    color: '#002244',
    altColor: '#69BE28',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png'
  }
};

/**
 * Detect teams from play-by-play text
 * @param {Array} plays - Array of play objects with text property
 * @returns {Object} - { away: teamData, home: teamData } or null if not detected
 */
function detectTeamsFromPlays(plays) {
  if (!plays || plays.length === 0) return null;

  const teamMentions = new Map();

  plays.forEach(play => {
    if (!play.text) return;

    // Match patterns like "GB 35", "at CHI 22", "from KC 10", "to NE 45"
    // Also match patterns like "KC35" (no space)
    const patterns = [
      /\b([A-Z]{2,3})\s+(\d{1,2})\b/g,  // "GB 35"
      /\bto\s+([A-Z]{2,3})\s*(\d{1,2})/gi,  // "to GB 35"
      /\bat\s+([A-Z]{2,3})\s*(\d{1,2})/gi,  // "at CHI 22"
      /\bfrom\s+([A-Z]{2,3})\s*(\d{1,2})/gi  // "from KC 10"
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(play.text)) !== null) {
        const abbr = match[1].toUpperCase();
        if (NFL_TEAMS[abbr]) {
          teamMentions.set(abbr, (teamMentions.get(abbr) || 0) + 1);
        }
      }
    });
  });

  // Get top 2 most mentioned teams
  const sortedTeams = [...teamMentions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  if (sortedTeams.length < 2) return null;

  // First play usually mentions home team's field first in kickoff
  // Try to determine away vs home from first play text
  const firstPlay = plays[0];
  let awayAbbr = sortedTeams[0][0];
  let homeAbbr = sortedTeams[1][0];

  // If first play is kickoff, the "from TEAM XX" is usually the kicking team (home kicks off to start)
  if (firstPlay && firstPlay.text) {
    const kickoffMatch = firstPlay.text.match(/kicks.*from\s+([A-Z]{2,3})/i);
    if (kickoffMatch) {
      const kickingTeam = kickoffMatch[1].toUpperCase();
      if (kickingTeam === awayAbbr) {
        // Swap - kicking team is usually home team at start
        [awayAbbr, homeAbbr] = [homeAbbr, awayAbbr];
      }
    }
  }

  return {
    away: NFL_TEAMS[awayAbbr],
    home: NFL_TEAMS[homeAbbr]
  };
}

/**
 * Get team by abbreviation
 * @param {string} abbr - Team abbreviation (e.g., "GB", "CHI")
 * @returns {Object|null} - Team data or null if not found
 */
function getTeamByAbbr(abbr) {
  if (!abbr) return null;
  return NFL_TEAMS[abbr.toUpperCase()] || null;
}

/**
 * Get all team abbreviations
 * @returns {Array} - Array of team abbreviations
 */
function getAllTeamAbbrs() {
  return Object.keys(NFL_TEAMS).filter(abbr => abbr !== 'LAR'); // Exclude duplicate
}

// Export for use
if (typeof window !== 'undefined') {
  window.NFL_TEAMS = NFL_TEAMS;
  window.detectTeamsFromPlays = detectTeamsFromPlays;
  window.getTeamByAbbr = getTeamByAbbr;
  window.getAllTeamAbbrs = getAllTeamAbbrs;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NFL_TEAMS, detectTeamsFromPlays, getTeamByAbbr, getAllTeamAbbrs };
}
