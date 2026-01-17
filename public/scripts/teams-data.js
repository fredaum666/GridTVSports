/**
 * Centralized Team Colors Database
 * Single source of truth for all league team colors
 *
 * Usage:
 *   import { getTeamColors, getScoreboardColors } from '/scripts/teams-data.js';
 *   const colors = getTeamColors('nfl', 'KC'); // { primary: '#E31837', secondary: '#FFB81C' }
 */

// NFL Team Colors (32 teams)
export const NFL_TEAM_COLORS = {
    'ARI': { primary: '#97233F', secondary: '#000000' },
    'ATL': { primary: '#A71930', secondary: '#000000' },
    'BAL': { primary: '#241773', secondary: '#000000' },
    'BUF': { primary: '#00338D', secondary: '#C60C30' },
    'CAR': { primary: '#0085CA', secondary: '#101820' },
    'CHI': { primary: '#C83803', secondary: '#0B162A' },
    'CIN': { primary: '#FB4F14', secondary: '#000000' },
    'CLE': { primary: '#311D00', secondary: '#FF3C00' },
    'DAL': { primary: '#003594', secondary: '#041E42' },
    'DEN': { primary: '#FB4F14', secondary: '#002244' },
    'DET': { primary: '#0076B6', secondary: '#B0B7BC' },
    'GB': { primary: '#203731', secondary: '#FFB612' },
    'HOU': { primary: '#03202F', secondary: '#A71930' },
    'IND': { primary: '#002C5F', secondary: '#A2AAAD' },
    'JAX': { primary: '#006778', secondary: '#9F792C' },
    'KC': { primary: '#E31837', secondary: '#FFB81C' },
    'LAC': { primary: '#0080C6', secondary: '#FFC20E' },
    'LAR': { primary: '#003594', secondary: '#FFA300' },
    'LV': { primary: '#000000', secondary: '#A5ACAF' },
    'MIA': { primary: '#008E97', secondary: '#FC4C02' },
    'MIN': { primary: '#4F2683', secondary: '#FFC62F' },
    'NE': { primary: '#002244', secondary: '#C60C30' },
    'NO': { primary: '#D3BC8D', secondary: '#101820' },
    'NYG': { primary: '#0B2265', secondary: '#A71930' },
    'NYJ': { primary: '#125740', secondary: '#000000' },
    'PHI': { primary: '#004C54', secondary: '#A5ACAF' },
    'PIT': { primary: '#FFB612', secondary: '#101820' },
    'SF': { primary: '#AA0000', secondary: '#B3995D' },
    'SEA': { primary: '#002244', secondary: '#69BE28' },
    'TB': { primary: '#D50A0A', secondary: '#FF7900' },
    'TEN': { primary: '#0C2340', secondary: '#4B92DB' },
    'WSH': { primary: '#5A1414', secondary: '#FFB612' }
};

// NCAA Football/Basketball Team Colors (100+ teams)
export const NCAA_TEAM_COLORS = {
    'ALA': { primary: '#9E1B32', secondary: '#828A8F' },
    'ARIZ': { primary: '#CC0033', secondary: '#003366' },
    'ASU': { primary: '#8C1D40', secondary: '#FFC627' },
    'ARK': { primary: '#9D2235', secondary: '#000000' },
    'AUB': { primary: '#0C2340', secondary: '#E87722' },
    'BAY': { primary: '#154734', secondary: '#FFB81C' },
    'BGSU': { primary: '#FE5000', secondary: '#4F2C1D' },
    'BSU': { primary: '#0033A0', secondary: '#D64309' },
    'BC': { primary: '#98002E', secondary: '#BC9B6A' },
    'CAL': { primary: '#003262', secondary: '#FDB515' },
    'CLEM': { primary: '#F56600', secondary: '#522D80' },
    'COLO': { primary: '#CFB87C', secondary: '#000000' },
    'CONN': { primary: '#000E2F', secondary: '#E4002B' },
    'DUKE': { primary: '#003087', secondary: '#FFFFFF' },
    'FLA': { primary: '#0021A5', secondary: '#FA4616' },
    'FSU': { primary: '#782F40', secondary: '#CEB888' },
    'UGA': { primary: '#BA0C2F', secondary: '#000000' },
    'GT': { primary: '#B3A369', secondary: '#003057' },
    'HAW': { primary: '#024731', secondary: '#000000' },
    'HOU': { primary: '#C8102E', secondary: '#FFFFFF' },
    'ILL': { primary: '#E84A27', secondary: '#13294B' },
    'IND': { primary: '#990000', secondary: '#EEEDEB' },
    'IOWA': { primary: '#FFCD00', secondary: '#000000' },
    'ISU': { primary: '#C8102E', secondary: '#F1BE48' },
    'KU': { primary: '#0051BA', secondary: '#E8000D' },
    'UK': { primary: '#0033A0', secondary: '#FFFFFF' },
    'LSU': { primary: '#461D7C', secondary: '#FDD023' },
    'LOU': { primary: '#AD0000', secondary: '#000000' },
    'MD': { primary: '#E03A3E', secondary: '#FFD520' },
    'MICH': { primary: '#00274C', secondary: '#FFCB05' },
    'MSU': { primary: '#18453B', secondary: '#FFFFFF' },
    'MINN': { primary: '#7A0019', secondary: '#FFCC33' },
    'MISS': { primary: '#CE1126', secondary: '#14213D' },
    'MSST': { primary: '#660000', secondary: '#FFFFFF' },
    'MIZ': { primary: '#F1B82D', secondary: '#000000' },
    'NEB': { primary: '#E41C38', secondary: '#F5F1E7' },
    'NEV': { primary: '#003366', secondary: '#807F84' },
    'UNM': { primary: '#BA0C2F', secondary: '#63666A' },
    'NC': { primary: '#7BAFD4', secondary: '#13294B' },
    'NCST': { primary: '#CC0000', secondary: '#000000' },
    'NW': { primary: '#4E2A84', secondary: '#000000' },
    'ND': { primary: '#0C2340', secondary: '#C99700' },
    'OHIO': { primary: '#00694E', secondary: '#FFFFFF' },
    'OSU': { primary: '#BB0000', secondary: '#666666' },
    'OKLA': { primary: '#841617', secondary: '#FDF9D8' },
    'OKST': { primary: '#FF7300', secondary: '#000000' },
    'ORE': { primary: '#154733', secondary: '#FEE123' },
    'ORST': { primary: '#DC4405', secondary: '#000000' },
    'PSU': { primary: '#041E42', secondary: '#FFFFFF' },
    'PITT': { primary: '#003594', secondary: '#FFB81C' },
    'PUR': { primary: '#CEB888', secondary: '#000000' },
    'RICE': { primary: '#002469', secondary: '#5E6A71' },
    'RUTG': { primary: '#CC0033', secondary: '#5F6A72' },
    'SC': { primary: '#73000A', secondary: '#000000' },
    'SDSU': { primary: '#A6192E', secondary: '#000000' },
    'SMU': { primary: '#0033A0', secondary: '#C8102E' },
    'STAN': { primary: '#8C1515', secondary: '#FFFFFF' },
    'SYR': { primary: '#F76900', secondary: '#000E54' },
    'TCU': { primary: '#4D1979', secondary: '#A3A9AC' },
    'TEM': { primary: '#9D2235', secondary: '#000000' },
    'TENN': { primary: '#FF8200', secondary: '#FFFFFF' },
    'TEX': { primary: '#BF5700', secondary: '#FFFFFF' },
    'TXAM': { primary: '#500000', secondary: '#FFFFFF' },
    'TTU': { primary: '#CC0000', secondary: '#000000' },
    'TLSA': { primary: '#002D62', secondary: '#C8A875' },
    'UCLA': { primary: '#2D68C4', secondary: '#F2A900' },
    'USC': { primary: '#990000', secondary: '#FFC72C' },
    'UTAH': { primary: '#CC0000', secondary: '#000000' },
    'UVA': { primary: '#232D4B', secondary: '#F84C1E' },
    'VT': { primary: '#630031', secondary: '#CF4420' },
    'WAKE': { primary: '#9E7E38', secondary: '#000000' },
    'UW': { primary: '#4B2E83', secondary: '#B7A57A' },
    'WSU': { primary: '#981E32', secondary: '#5E6A71' },
    'WVU': { primary: '#002855', secondary: '#EAAA00' },
    'WIS': { primary: '#C5050C', secondary: '#FFFFFF' },
    'WYO': { primary: '#492F24', secondary: '#FFC425' },
    'ARMY': { primary: '#000000', secondary: '#D3BC8D' },
    'NAVY': { primary: '#00205B', secondary: '#C5B783' },
    'AFAL': { primary: '#003087', secondary: '#8A8D8F' },
    'MIA': { primary: '#F47321', secondary: '#005030' },
    'MIAMI': { primary: '#F47321', secondary: '#005030' },
    'UCF': { primary: '#BA9B37', secondary: '#000000' },
    'USF': { primary: '#006747', secondary: '#CFC493' },
    'FAU': { primary: '#003366', secondary: '#CC0000' },
    'FIU': { primary: '#081E3F', secondary: '#B6862C' },
    'CIN': { primary: '#E00122', secondary: '#000000' },
    'MEM': { primary: '#003087', secondary: '#898D8D' },
    'TUL': { primary: '#002D62', secondary: '#418FDE' },
    'TULN': { primary: '#006747', secondary: '#87CEEB' },
    'ECU': { primary: '#592A8A', secondary: '#FFC72C' },
    'APP': { primary: '#FFCC00', secondary: '#000000' },
    'CHAR': { primary: '#046A38', secondary: '#B9975B' },
    'JMU': { primary: '#450084', secondary: '#CBB677' },
    'MRSH': { primary: '#00B140', secondary: '#000000' },
    'ODU': { primary: '#003057', secondary: '#7C878E' },
    'GASO': { primary: '#011E41', secondary: '#87714D' },
    'GAST': { primary: '#002649', secondary: '#C60C30' },
    'CCU': { primary: '#006F71', secondary: '#A27752' },
    'ARST': { primary: '#CC092F', secondary: '#000000' },
    'SJSU': { primary: '#0055A2', secondary: '#E5A823' },
    'FRES': { primary: '#DB0032', secondary: '#13284C' },
    'UNLV': { primary: '#CF0A2C', secondary: '#666666' },
    'CSU': { primary: '#1E4D2B', secondary: '#C8C372' },
    'AFA': { primary: '#003087', secondary: '#8A8D8F' },
    'NMSU': { primary: '#8B0000', secondary: '#000000' },
    'UTEP': { primary: '#FF8200', secondary: '#041E42' },
    'UTSA': { primary: '#0C2340', secondary: '#F15A22' },
    'UNT': { primary: '#00853E', secondary: '#000000' },
    'MTSU': { primary: '#0066CC', secondary: '#000000' },
    'WKU': { primary: '#B01E24', secondary: '#000000' },
    'LT': { primary: '#003087', secondary: '#C8102E' },
    'BUFF': { primary: '#005BBB', secondary: '#000000' },
    'KENT': { primary: '#002664', secondary: '#EAAB00' },
    'AKRN': { primary: '#041E42', secondary: '#A89968' }
};

// NBA Team Colors (30 teams)
export const NBA_TEAM_COLORS = {
    'ATL': { primary: '#E03A3E', secondary: '#C1D32F' },
    'BOS': { primary: '#007A33', secondary: '#BA9653' },
    'BKN': { primary: '#000000', secondary: '#FFFFFF' },
    'CHA': { primary: '#1D1160', secondary: '#00788C' },
    'CHI': { primary: '#CE1141', secondary: '#000000' },
    'CLE': { primary: '#6F263D', secondary: '#FFB81C' },
    'DAL': { primary: '#00538C', secondary: '#002B5E' },
    'DEN': { primary: '#0E2240', secondary: '#FEC524' },
    'DET': { primary: '#C8102E', secondary: '#1D42BA' },
    'GSW': { primary: '#1D428A', secondary: '#FFC72C' },
    'HOU': { primary: '#CE1141', secondary: '#000000' },
    'IND': { primary: '#002D62', secondary: '#FDBB30' },
    'LAC': { primary: '#C8102E', secondary: '#1D428A' },
    'LAL': { primary: '#552583', secondary: '#FDB927' },
    'MEM': { primary: '#5D76A9', secondary: '#12173F' },
    'MIA': { primary: '#98002E', secondary: '#F9A01B' },
    'MIL': { primary: '#00471B', secondary: '#EEE1C6' },
    'MIN': { primary: '#0C2340', secondary: '#236192' },
    'NOP': { primary: '#0C2340', secondary: '#C8102E' },
    'NYK': { primary: '#006BB6', secondary: '#F58426' },
    'OKC': { primary: '#007AC1', secondary: '#EF3B24' },
    'ORL': { primary: '#0077C0', secondary: '#C4CED4' },
    'PHI': { primary: '#006BB6', secondary: '#ED174C' },
    'PHX': { primary: '#1D1160', secondary: '#E56020' },
    'POR': { primary: '#E03A3E', secondary: '#000000' },
    'SAC': { primary: '#5A2D81', secondary: '#63727A' },
    'SAS': { primary: '#C4CED4', secondary: '#000000' },
    'TOR': { primary: '#CE1141', secondary: '#000000' },
    'UTA': { primary: '#002B5C', secondary: '#00471B' },
    'WAS': { primary: '#002B5C', secondary: '#E31837' }
};

// NHL Team Colors (32 teams)
export const NHL_TEAM_COLORS = {
    'ANA': { primary: '#F47A38', secondary: '#B9975B' },
    'ARI': { primary: '#8C2633', secondary: '#E2D6B5' },
    'BOS': { primary: '#FFB81C', secondary: '#000000' },
    'BUF': { primary: '#002654', secondary: '#FCB514' },
    'CGY': { primary: '#C8102E', secondary: '#F1BE48' },
    'CAR': { primary: '#CC0000', secondary: '#000000' },
    'CHI': { primary: '#CF0A2C', secondary: '#000000' },
    'COL': { primary: '#6F263D', secondary: '#236192' },
    'CBJ': { primary: '#002654', secondary: '#CE1141' },
    'DAL': { primary: '#006847', secondary: '#8F8F8C' },
    'DET': { primary: '#CE1126', secondary: '#FFFFFF' },
    'EDM': { primary: '#041E42', secondary: '#FF4C00' },
    'FLA': { primary: '#041E42', secondary: '#C8102E' },
    'LAK': { primary: '#111111', secondary: '#A2AAAD' },
    'MIN': { primary: '#154734', secondary: '#A6192E' },
    'MTL': { primary: '#AF1E2D', secondary: '#192168' },
    'NSH': { primary: '#FFB81C', secondary: '#041E42' },
    'NJD': { primary: '#CE1126', secondary: '#000000' },
    'NYI': { primary: '#00539B', secondary: '#F47D30' },
    'NYR': { primary: '#0038A8', secondary: '#CE1126' },
    'OTT': { primary: '#C52032', secondary: '#C2912C' },
    'PHI': { primary: '#F74902', secondary: '#000000' },
    'PIT': { primary: '#FCB514', secondary: '#000000' },
    'SJS': { primary: '#006D75', secondary: '#EA7200' },
    'SEA': { primary: '#001628', secondary: '#99D9D9' },
    'STL': { primary: '#002F87', secondary: '#FCB514' },
    'TBL': { primary: '#002868', secondary: '#FFFFFF' },
    'TOR': { primary: '#00205B', secondary: '#FFFFFF' },
    'UTA': { primary: '#71AFE5', secondary: '#010101' },
    'VAN': { primary: '#00205B', secondary: '#00843D' },
    'VGK': { primary: '#B4975A', secondary: '#333F42' },
    'WSH': { primary: '#C8102E', secondary: '#041E42' },
    'WPG': { primary: '#041E42', secondary: '#004C97' }
};

// MLB Team Colors (30 teams)
export const MLB_TEAM_COLORS = {
    'ARI': { primary: '#A71930', secondary: '#E3D4AD' },
    'ATL': { primary: '#CE1141', secondary: '#13274F' },
    'BAL': { primary: '#DF4601', secondary: '#000000' },
    'BOS': { primary: '#BD3039', secondary: '#0C2340' },
    'CHC': { primary: '#0E3386', secondary: '#CC3433' },
    'CWS': { primary: '#27251F', secondary: '#C4CED4' },
    'CIN': { primary: '#C6011F', secondary: '#000000' },
    'CLE': { primary: '#00385D', secondary: '#E50022' },
    'COL': { primary: '#33006F', secondary: '#C4CED4' },
    'DET': { primary: '#0C2340', secondary: '#FA4616' },
    'HOU': { primary: '#002D62', secondary: '#EB6E1F' },
    'KC': { primary: '#004687', secondary: '#BD9B60' },
    'LAA': { primary: '#BA0021', secondary: '#003263' },
    'LAD': { primary: '#005A9C', secondary: '#EF3E42' },
    'MIA': { primary: '#00A3E0', secondary: '#EF3340' },
    'MIL': { primary: '#12284B', secondary: '#B6922E' },
    'MIN': { primary: '#002B5C', secondary: '#D31145' },
    'NYM': { primary: '#002D72', secondary: '#FF5910' },
    'NYY': { primary: '#003087', secondary: '#E4002C' },
    'OAK': { primary: '#003831', secondary: '#EFB21E' },
    'PHI': { primary: '#E81828', secondary: '#002D72' },
    'PIT': { primary: '#27251F', secondary: '#FDB827' },
    'SD': { primary: '#2F241D', secondary: '#FFC425' },
    'SF': { primary: '#FD5A1E', secondary: '#27251F' },
    'SEA': { primary: '#0C2C56', secondary: '#005C5C' },
    'STL': { primary: '#C41E3A', secondary: '#0C2340' },
    'TB': { primary: '#092C5C', secondary: '#8FBCE6' },
    'TEX': { primary: '#003278', secondary: '#C0111F' },
    'TOR': { primary: '#134A8E', secondary: '#E8291C' },
    'WSH': { primary: '#AB0003', secondary: '#14225A' }
};

// Default colors for unknown teams
const DEFAULT_COLORS = { primary: '#4b5563', secondary: '#374151' };

/**
 * Get team colors by league and abbreviation
 * @param {string} league - League identifier (nfl, nba, nhl, mlb, ncaa, ncaab)
 * @param {string} abbr - Team abbreviation (e.g., 'KC', 'LAL')
 * @returns {{ primary: string, secondary: string }} Team colors object
 */
export function getTeamColors(league, abbr) {
    if (!abbr) return DEFAULT_COLORS;

    const upperAbbr = abbr.toUpperCase();

    switch (league?.toLowerCase()) {
        case 'nfl':
            return NFL_TEAM_COLORS[upperAbbr] || DEFAULT_COLORS;
        case 'ncaa':
        case 'ncaab':
            return NCAA_TEAM_COLORS[upperAbbr] || DEFAULT_COLORS;
        case 'nba':
            return NBA_TEAM_COLORS[upperAbbr] || DEFAULT_COLORS;
        case 'nhl':
            return NHL_TEAM_COLORS[upperAbbr] || DEFAULT_COLORS;
        case 'mlb':
            return MLB_TEAM_COLORS[upperAbbr] || DEFAULT_COLORS;
        default:
            return DEFAULT_COLORS;
    }
}

/**
 * Get all scoreboard colors for a matchup
 * @param {string} league - League identifier
 * @param {string} awayAbbr - Away team abbreviation
 * @param {string} homeAbbr - Home team abbreviation
 * @returns {{ awayPrimary: string, awaySecondary: string, homePrimary: string, homeSecondary: string }}
 */
export function getScoreboardColors(league, awayAbbr, homeAbbr) {
    const awayColors = getTeamColors(league, awayAbbr);
    const homeColors = getTeamColors(league, homeAbbr);

    return {
        awayPrimary: awayColors.primary,
        awaySecondary: awayColors.secondary,
        homePrimary: homeColors.primary,
        homeSecondary: homeColors.secondary
    };
}

/**
 * Check if colors are too similar (for contrast handling)
 * @param {string} color1 - First hex color
 * @param {string} color2 - Second hex color
 * @returns {boolean} True if colors are too similar
 */
export function areColorsSimilar(color1, color2) {
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb1 || !rgb2) return false;

    // Calculate color difference using simple Euclidean distance
    const diff = Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
    );

    // Threshold for "too similar" (adjust as needed)
    return diff < 50;
}

// Global export for non-module pages
if (typeof window !== 'undefined') {
    window.GridTVTeams = {
        NFL_TEAM_COLORS,
        NCAA_TEAM_COLORS,
        NBA_TEAM_COLORS,
        NHL_TEAM_COLORS,
        MLB_TEAM_COLORS,
        getTeamColors,
        getScoreboardColors,
        areColorsSimilar
    };
}
