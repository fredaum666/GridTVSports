const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const cors = require('cors');
const path = require('path');
const { pool } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Auto-initialize vows database tables on startup
async function initializeVowsDatabase() {
  if (!pool) {
    console.warn('⚠️  Skipping vows database initialization - DATABASE_URL not configured');
    return;
  }
  
  try {
    // Create vows table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vows (
        id SERIAL PRIMARY KEY,
        person_type VARCHAR(20) NOT NULL CHECK (person_type IN ('groom', 'bride')),
        person_name_en VARCHAR(100),
        person_name_pt VARCHAR(100),
        vow_text_en TEXT NOT NULL,
        vow_text_pt TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        last_updated TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vows_person_type ON vows(person_type)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vows_active ON vows(is_active)');
    
    // Create unlock_status table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS unlock_status (
        id SERIAL PRIMARY KEY,
        is_unlocked BOOLEAN DEFAULT false,
        unlocked_at TIMESTAMP,
        locked_at TIMESTAMP,
        last_updated TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Insert default unlock status if not exists
    const checkStatus = await pool.query('SELECT COUNT(*) FROM unlock_status WHERE id = 1');
    if (checkStatus.rows[0].count === '0') {
      await pool.query(`
        INSERT INTO unlock_status (id, is_unlocked)
        VALUES (1, false)
      `);
    }
    
    // Create admin_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT,
        last_updated TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Insert default admin password if not exists
    await pool.query(`
      INSERT INTO admin_settings (setting_key, setting_value)
      VALUES ('admin_password', '2025')
      ON CONFLICT (setting_key) DO NOTHING
    `);
    
    console.log('✅ Vows database tables initialized');
  } catch (error) {
    console.error('⚠️  Error initializing vows database:', error.message);
  }
}

// Initialize vows database
initializeVowsDatabase();

app.use(cors());
app.use(express.json({ charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8' }));

// Set UTF-8 for all responses
app.use((_req, res, next) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Serve VowsSite files under /vows route with UTF-8 encoding
app.use('/vows', express.static(path.join(__dirname, 'VowsSite'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

// ============================================
// SMART CACHING SYSTEM (In-Memory)
// ============================================

const sportsCache = {
  nfl: { data: new Map(), activeWeeks: new Set() },
  ncaa: { data: new Map(), activeWeeks: new Set() },
  nba: { data: new Map(), activeDates: new Set() },
  mlb: { data: new Map(), activeDates: new Set() },
  nhl: { data: new Map(), activeDates: new Set() },
  CACHE_DURATION: 15000, // 15 seconds for live games
  COMPLETED_CACHE_DURATION: 3600000 // 1 hour for completed
};

// ============================================
// FINAL GAMES STORAGE (In-Memory)
// ============================================

const finalGamesStore = {
  nfl: new Map(),
  ncaa: new Map(),
  nba: new Map(),
  mlb: new Map(),
  nhl: new Map()
};

// ============================================
// ESPN API HELPERS
// ============================================

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

async function fetchESPN(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'GridTVSports/2.0' }
    });
    return response.data;
  } catch (error) {
    console.error(`ESPN API Error: ${error.message}`);
    throw error;
  }
}

// ============================================
// NFL HELPERS
// ============================================

function getCurrentNFLWeek() {
  // 2025 NFL Season started September 4, 2025 (Thursday Night Football)
  const seasonStart = new Date('2025-09-04');
  const now = new Date();
  const diffDays = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  
  console.log(`📅 NFL Week Calculation: Days since season start = ${diffDays}, Calculated week = ${week}`);
  
  // Return week 1-18
  return Math.max(1, Math.min(week, 18));
}

function areAllGamesComplete(scoreboard) {
  if (!scoreboard || !scoreboard.events) return false;
  return scoreboard.events.every(e => e.status?.type?.state === 'post');
}

// Cleanup function to remove invalid dates from active tracking
function cleanupActiveDates() {
  const today = getTodayDate();
  const yesterday = getYesterdayDate();
  const tomorrow = getTomorrowDate();
  const validDates = new Set([yesterday, today, tomorrow]);
  
  // Remove any dates that aren't yesterday, today, or tomorrow
  for (const date of sportsCache.nba.activeDates) {
    if (!validDates.has(date)) {
      console.log(`🧹 Removing stale NBA date: ${date}`);
      sportsCache.nba.activeDates.delete(date);
    }
  }
  
  for (const date of sportsCache.mlb.activeDates) {
    if (!validDates.has(date)) {
      console.log(`🧹 Removing stale MLB date: ${date}`);
      sportsCache.mlb.activeDates.delete(date);
    }
  }
  
  for (const date of sportsCache.nhl.activeDates) {
    if (!validDates.has(date)) {
      console.log(`🧹 Removing stale NHL date: ${date}`);
      sportsCache.nhl.activeDates.delete(date);
    }
  }
}

// ============================================
// DATE HELPERS (NBA, MLB, NHL)
// ============================================

function getTodayDate() {
  // Use local time zone instead of UTC to get correct date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  console.log(`📅 Current Date: ${dateStr} (${now.toLocaleDateString()})`);
  return dateStr; // YYYYMMDD
}

function getYesterdayDate() {
  const now = new Date();
  now.setDate(now.getDate() - 1); // Subtract one day
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`; // YYYYMMDD
}

function getTomorrowDate() {
  const now = new Date();
  now.setDate(now.getDate() + 1); // Add one day
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`; // YYYYMMDD
}

// ============================================
// API ROUTES - NFL
// ============================================

app.get('/api/nfl/scoreboard', async (req, res) => {
  try {
    const week = req.query.week || getCurrentNFLWeek();
    const cacheKey = `week-${week}`;
    const cached = sportsCache.nfl.data.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
      return res.json(cached.data);
    }

    const url = `${ESPN_BASE}/football/nfl/scoreboard?week=${week}`;
    const data = await fetchESPN(url);
    const isComplete = areAllGamesComplete(data);
    
    // Count game statuses for better logging
    const statusCount = data.events?.reduce((acc, e) => {
      const state = e.status?.type?.state || 'unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {}) || {};
    
    console.log(`[NFL] Week ${week} - Games: ${data.events?.length || 0}, Statuses:`, statusCount, `Complete: ${isComplete}`);

    sportsCache.nfl.data.set(cacheKey, { data, timestamp: now, isComplete });
    
    if (!isComplete) {
      sportsCache.nfl.activeWeeks.add(week);
    } else {
      sportsCache.nfl.activeWeeks.delete(week);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nfl/summary/:gameId', async (req, res) => {
  try {
    const url = `${ESPN_BASE}/football/nfl/summary?event=${req.params.gameId}`;
    const data = await fetchESPN(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nfl/current-week', (req, res) => {
  res.json({ week: getCurrentNFLWeek() });
});

// ============================================
// API ROUTES - NCAA COLLEGE FOOTBALL
// ============================================

app.get('/api/ncaa/scoreboard', async (req, res) => {
  try {
    const week = req.query.week || getCurrentNFLWeek(); // Using same week logic as NFL
    const cacheKey = `week-${week}`;
    const cached = sportsCache.ncaa.data.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
      return res.json(cached.data);
    }

    const url = `${ESPN_BASE}/football/college-football/scoreboard?week=${week}&groups=80`; // Division I FBS
    const data = await fetchESPN(url);
    const isComplete = areAllGamesComplete(data);
    
    const statusCount = data.events?.reduce((acc, e) => {
      const state = e.status?.type?.state || 'unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {}) || {};
    
    console.log(`[NCAA] Week ${week} - Games: ${data.events?.length || 0}, Statuses:`, statusCount, `Complete: ${isComplete}`);

    sportsCache.ncaa.data.set(cacheKey, { data, timestamp: now, isComplete });
    
    if (!isComplete) {
      sportsCache.ncaa.activeWeeks.add(week);
    } else {
      sportsCache.ncaa.activeWeeks.delete(week);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ncaa/summary/:gameId', async (req, res) => {
  try {
    const url = `${ESPN_BASE}/football/college-football/summary?event=${req.params.gameId}`;
    const data = await fetchESPN(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ncaa/current-week', (req, res) => {
  res.json({ week: getCurrentNFLWeek() }); // Using same week logic as NFL
});

// ============================================
// API ROUTES - NBA
// ============================================

app.get('/api/nba/scoreboard', async (req, res) => {
  try {
    const requestedDate = req.query.date;
    
    if (requestedDate) {
      // If specific date requested, use it
      const cacheKey = `date-${requestedDate}`;
      const cached = sportsCache.nba.data.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
        return res.json(cached.data);
      }

      const url = `${ESPN_BASE}/basketball/nba/scoreboard?dates=${requestedDate}`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);

      const statusCount = data.events?.reduce((acc, e) => {
        const state = e.status?.type?.state || 'unknown';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      }, {}) || {};

      console.log(`[NBA] Date ${requestedDate} - Games: ${data.events?.length || 0}, Statuses:`, statusCount, `Complete: ${isComplete}`);

      sportsCache.nba.data.set(cacheKey, { data, timestamp: now, isComplete });
      
      if (!isComplete) {
        sportsCache.nba.activeDates.add(requestedDate);
      } else {
        sportsCache.nba.activeDates.delete(requestedDate);
      }

      return res.json(data);
    }

    // No specific date - fetch yesterday, today, AND tomorrow to catch live and upcoming games
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    const tomorrow = getTomorrowDate();
    
    const [todayUrl, yesterdayUrl, tomorrowUrl] = [
      `${ESPN_BASE}/basketball/nba/scoreboard?dates=${today}`,
      `${ESPN_BASE}/basketball/nba/scoreboard?dates=${yesterday}`,
      `${ESPN_BASE}/basketball/nba/scoreboard?dates=${tomorrow}`
    ];

    const [todayData, yesterdayData, tomorrowData] = await Promise.all([
      fetchESPN(todayUrl),
      fetchESPN(yesterdayUrl),
      fetchESPN(tomorrowUrl)
    ]);

    // Merge games from all three days, prioritizing live games
    const allGames = [
      ...(yesterdayData.events || []),
      ...(todayData.events || []),
      ...(tomorrowData.events || [])
    ];

    // Create combined response
    const combinedData = {
      ...todayData,
      events: allGames
    };

    const statusCount = allGames.reduce((acc, e) => {
      const state = e.status?.type?.state || 'unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});

    console.log(`[NBA] Combined (${yesterday} + ${today} + ${tomorrow}) - Games: ${allGames.length}, Statuses:`, statusCount);

    // Cache all three dates
    const now = Date.now();
    const todayComplete = areAllGamesComplete(todayData);
    const yesterdayComplete = areAllGamesComplete(yesterdayData);
    const tomorrowComplete = areAllGamesComplete(tomorrowData);

    sportsCache.nba.data.set(`date-${today}`, { data: todayData, timestamp: now, isComplete: todayComplete });
    sportsCache.nba.data.set(`date-${yesterday}`, { data: yesterdayData, timestamp: now, isComplete: yesterdayComplete });
    sportsCache.nba.data.set(`date-${tomorrow}`, { data: tomorrowData, timestamp: now, isComplete: tomorrowComplete });

    if (!todayComplete) sportsCache.nba.activeDates.add(today);
    else sportsCache.nba.activeDates.delete(today);
    
    if (!yesterdayComplete) sportsCache.nba.activeDates.add(yesterday);
    else sportsCache.nba.activeDates.delete(yesterday);

    if (!tomorrowComplete) sportsCache.nba.activeDates.add(tomorrow);
    else sportsCache.nba.activeDates.delete(tomorrow);

    res.json(combinedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nba/summary/:gameId', async (req, res) => {
  try {
    const url = `${ESPN_BASE}/basketball/nba/summary?event=${req.params.gameId}`;
    const data = await fetchESPN(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - MLB
// ============================================

app.get('/api/mlb/scoreboard', async (req, res) => {
  try {
    const requestedDate = req.query.date;
    
    if (requestedDate) {
      // If specific date requested, use it
      const cacheKey = `date-${requestedDate}`;
      const cached = sportsCache.mlb.data.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
        return res.json(cached.data);
      }

      const url = `${ESPN_BASE}/baseball/mlb/scoreboard?dates=${requestedDate}`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);

      const statusCount = data.events?.reduce((acc, e) => {
        const state = e.status?.type?.state || 'unknown';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      }, {}) || {};

      console.log(`[MLB] Date ${requestedDate} - Games: ${data.events?.length || 0}, Statuses:`, statusCount, `Complete: ${isComplete}`);

      sportsCache.mlb.data.set(cacheKey, { data, timestamp: now, isComplete });
      
      if (!isComplete) {
        sportsCache.mlb.activeDates.add(requestedDate);
      } else {
        sportsCache.mlb.activeDates.delete(requestedDate);
      }

      return res.json(data);
    }

    // No specific date - fetch today AND yesterday to catch live games
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    
    const [todayUrl, yesterdayUrl] = [
      `${ESPN_BASE}/baseball/mlb/scoreboard?dates=${today}`,
      `${ESPN_BASE}/baseball/mlb/scoreboard?dates=${yesterday}`
    ];

    const [todayData, yesterdayData] = await Promise.all([
      fetchESPN(todayUrl),
      fetchESPN(yesterdayUrl)
    ]);

    // Merge games from both days
    const allGames = [
      ...(yesterdayData.events || []),
      ...(todayData.events || [])
    ];

    const combinedData = {
      ...todayData,
      events: allGames
    };

    const statusCount = allGames.reduce((acc, e) => {
      const state = e.status?.type?.state || 'unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});

    console.log(`[MLB] Combined (${yesterday} + ${today}) - Games: ${allGames.length}, Statuses:`, statusCount);

    // Cache both dates
    const now = Date.now();
    const todayComplete = areAllGamesComplete(todayData);
    const yesterdayComplete = areAllGamesComplete(yesterdayData);

    sportsCache.mlb.data.set(`date-${today}`, { data: todayData, timestamp: now, isComplete: todayComplete });
    sportsCache.mlb.data.set(`date-${yesterday}`, { data: yesterdayData, timestamp: now, isComplete: yesterdayComplete });

    if (!todayComplete) sportsCache.mlb.activeDates.add(today);
    else sportsCache.mlb.activeDates.delete(today);
    
    if (!yesterdayComplete) sportsCache.mlb.activeDates.add(yesterday);
    else sportsCache.mlb.activeDates.delete(yesterday);

    res.json(combinedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mlb/summary/:gameId', async (req, res) => {
  try {
    const url = `${ESPN_BASE}/baseball/mlb/summary?event=${req.params.gameId}`;
    const data = await fetchESPN(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - NHL
// ============================================

app.get('/api/nhl/scoreboard', async (req, res) => {
  try {
    const requestedDate = req.query.date;
    
    if (requestedDate) {
      // If specific date requested, use it
      const cacheKey = `date-${requestedDate}`;
      const cached = sportsCache.nhl.data.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
        return res.json(cached.data);
      }

      const url = `${ESPN_BASE}/hockey/nhl/scoreboard?dates=${requestedDate}`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);

      const statusCount = data.events?.reduce((acc, e) => {
        const state = e.status?.type?.state || 'unknown';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      }, {}) || {};

      console.log(`[NHL] Date ${requestedDate} - Games: ${data.events?.length || 0}, Statuses:`, statusCount, `Complete: ${isComplete}`);

      sportsCache.nhl.data.set(cacheKey, { data, timestamp: now, isComplete });
      
      if (!isComplete) {
        sportsCache.nhl.activeDates.add(requestedDate);
      } else {
        sportsCache.nhl.activeDates.delete(requestedDate);
      }

      return res.json(data);
    }

    // No specific date - fetch today AND yesterday to catch live games
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    
    const [todayUrl, yesterdayUrl] = [
      `${ESPN_BASE}/hockey/nhl/scoreboard?dates=${today}`,
      `${ESPN_BASE}/hockey/nhl/scoreboard?dates=${yesterday}`
    ];

    const [todayData, yesterdayData] = await Promise.all([
      fetchESPN(todayUrl),
      fetchESPN(yesterdayUrl)
    ]);

    // Merge games from both days
    const allGames = [
      ...(yesterdayData.events || []),
      ...(todayData.events || [])
    ];

    const combinedData = {
      ...todayData,
      events: allGames
    };

    const statusCount = allGames.reduce((acc, e) => {
      const state = e.status?.type?.state || 'unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});

    console.log(`[NHL] Combined (${yesterday} + ${today}) - Games: ${allGames.length}, Statuses:`, statusCount);

    // Cache both dates
    const now = Date.now();
    const todayComplete = areAllGamesComplete(todayData);
    const yesterdayComplete = areAllGamesComplete(yesterdayData);

    sportsCache.nhl.data.set(`date-${today}`, { data: todayData, timestamp: now, isComplete: todayComplete });
    sportsCache.nhl.data.set(`date-${yesterday}`, { data: yesterdayData, timestamp: now, isComplete: yesterdayComplete });

    if (!todayComplete) sportsCache.nhl.activeDates.add(today);
    else sportsCache.nhl.activeDates.delete(today);
    
    if (!yesterdayComplete) sportsCache.nhl.activeDates.add(yesterday);
    else sportsCache.nhl.activeDates.delete(yesterday);

    res.json(combinedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nhl/summary/:gameId', async (req, res) => {
  try {
    const url = `${ESPN_BASE}/hockey/nhl/summary?event=${req.params.gameId}`;
    const data = await fetchESPN(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BACKGROUND JOBS - AUTO CACHE UPDATES
// ============================================

// Update NFL cache every 15 seconds for active weeks
cron.schedule('*/15 * * * * *', async () => {
  for (const week of sportsCache.nfl.activeWeeks) {
    try {
      const url = `${ESPN_BASE}/football/nfl/scoreboard?week=${week}`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);
      
      sportsCache.nfl.data.set(`week-${week}`, { 
        data, 
        timestamp: Date.now(), 
        isComplete 
      });
      
      if (isComplete) {
        sportsCache.nfl.activeWeeks.delete(week);
        console.log(`[NFL] Week ${week} marked complete - removed from active tracking`);
      }
      
      // Count live and upcoming games
      const liveGames = data.events?.filter(e => e.status?.type?.state === 'in').length || 0;
      const upcomingGames = data.events?.filter(e => e.status?.type?.state === 'pre').length || 0;
      
      console.log(`[NFL] Week ${week} - Live: ${liveGames}, Upcoming: ${upcomingGames}, Complete: ${isComplete}`);
    } catch (error) {
      console.error(`[NFL] Failed to update week ${week}:`, error.message);
    }
  }
});

// Update NBA cache every 15 seconds for active dates
cron.schedule('*/15 * * * * *', async () => {
  for (const date of sportsCache.nba.activeDates) {
    try {
      const url = `${ESPN_BASE}/basketball/nba/scoreboard?dates=${date}`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);
      
      sportsCache.nba.data.set(`date-${date}`, { 
        data, 
        timestamp: Date.now(), 
        isComplete 
      });
      
      if (isComplete) {
        sportsCache.nba.activeDates.delete(date);
      }
      
      // Enhanced logging
      const liveGames = data.events?.filter(e => e.status?.type?.state === 'in').length || 0;
      const upcomingGames = data.events?.filter(e => e.status?.type?.state === 'pre').length || 0;
      
      console.log(`[NBA] Date ${date} - Live: ${liveGames}, Upcoming: ${upcomingGames}, Complete: ${isComplete}`);
    } catch (error) {
      console.error(`[NBA] Failed to update ${date}:`, error.message);
    }
  }
});

// Update MLB cache every 15 seconds for active dates
cron.schedule('*/15 * * * * *', async () => {
  for (const date of sportsCache.mlb.activeDates) {
    try {
      const url = `${ESPN_BASE}/baseball/mlb/scoreboard?dates=${date}`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);
      
      sportsCache.mlb.data.set(`date-${date}`, { 
        data, 
        timestamp: Date.now(), 
        isComplete 
      });
      
      if (isComplete) {
        sportsCache.mlb.activeDates.delete(date);
      }
      
      // Enhanced logging
      const liveGames = data.events?.filter(e => e.status?.type?.state === 'in').length || 0;
      const upcomingGames = data.events?.filter(e => e.status?.type?.state === 'pre').length || 0;
      
      console.log(`[MLB] Date ${date} - Live: ${liveGames}, Upcoming: ${upcomingGames}, Complete: ${isComplete}`);
    } catch (error) {
      console.error(`[MLB] Failed to update ${date}:`, error.message);
    }
  }
});

// Update NHL cache every 15 seconds for active dates
cron.schedule('*/15 * * * * *', async () => {
  for (const date of sportsCache.nhl.activeDates) {
    try {
      const url = `${ESPN_BASE}/hockey/nhl/scoreboard?dates=${date}`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);
      
      sportsCache.nhl.data.set(`date-${date}`, { 
        data, 
        timestamp: Date.now(), 
        isComplete 
      });
      
      if (isComplete) {
        sportsCache.nhl.activeDates.delete(date);
      }
      
      // Enhanced logging
      const liveGames = data.events?.filter(e => e.status?.type?.state === 'in').length || 0;
      const upcomingGames = data.events?.filter(e => e.status?.type?.state === 'pre').length || 0;
      
      console.log(`[NHL] Date ${date} - Live: ${liveGames}, Upcoming: ${upcomingGames}, Complete: ${isComplete}`);
    } catch (error) {
      console.error(`[NHL] Failed to update ${date}:`, error.message);
    }
  }
});

// ============================================
// FINAL GAMES API ENDPOINTS
// ============================================

// Save a final game to storage
app.post('/api/final-games/save', (req, res) => {
  try {
    const { sport, gameId, gameData, week } = req.body;
    
    if (!sport || !gameId || !gameData) {
      return res.status(400).json({ error: 'Missing required fields: sport, gameId, gameData' });
    }
    
    if (!finalGamesStore[sport]) {
      return res.status(400).json({ error: 'Invalid sport. Must be: nfl, nba, mlb, or nhl' });
    }
    
    finalGamesStore[sport].set(gameId, {
      ...gameData,
      savedAt: Date.now(),
      week: week || null
    });
    
    console.log(`💾 Saved final game: ${sport.toUpperCase()} - ${gameId}`);
    res.json({ success: true, gameId });
  } catch (error) {
    console.error('Error saving final game:', error);
    res.status(500).json({ error: 'Failed to save final game' });
  }
});

// Get all final games for a sport
app.get('/api/final-games/:sport', (req, res) => {
  try {
    const { sport } = req.params;
    
    if (!finalGamesStore[sport]) {
      return res.status(400).json({ error: 'Invalid sport' });
    }
    
    const games = Array.from(finalGamesStore[sport].values());
    res.json({ games, count: games.length });
  } catch (error) {
    console.error('Error fetching final games:', error);
    res.status(500).json({ error: 'Failed to fetch final games' });
  }
});

// Clear final games (optionally by week)
app.delete('/api/final-games/clear/:sport', (req, res) => {
  try {
    const { sport } = req.params;
    const { week } = req.query;
    
    if (!finalGamesStore[sport]) {
      return res.status(400).json({ error: 'Invalid sport' });
    }
    
    if (week) {
      // Clear only games from previous weeks
      let cleared = 0;
      for (const [gameId, gameData] of finalGamesStore[sport]) {
        if (gameData.week && gameData.week < parseInt(week)) {
          finalGamesStore[sport].delete(gameId);
          cleared++;
        }
      }
      console.log(`🗑️ Cleared ${cleared} old final games for ${sport.toUpperCase()} (before week ${week})`);
    } else {
      // Clear all
      const count = finalGamesStore[sport].size;
      finalGamesStore[sport].clear();
      console.log(`🗑️ Cleared all ${count} final games for ${sport.toUpperCase()}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing final games:', error);
    res.status(500).json({ error: 'Failed to clear final games' });
  }
});

// ============================================
// VOWS API ENDPOINTS
// ============================================

// Get unlock status from database
app.get('/api/unlock-status', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured', message: 'DATABASE_URL environment variable is not set' });
  }
  
  try {
    const result = await pool.query('SELECT is_unlocked FROM unlock_status WHERE id = 1');
    const isUnlocked = result.rows[0]?.is_unlocked || false;
    res.json({ is_unlocked: isUnlocked });
  } catch (error) {
    console.error('Error getting unlock status:', error);
    res.status(500).json({ error: 'Database error', message: error.message, hint: 'Make sure database tables are initialized' });
  }
});

// Unlock vows (admin only)
app.post('/api/unlock', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, message: 'Database not configured' });
  }
  
  try {
    const { password } = req.body;
    const ADMIN_PASSWORD = '2025';
    
    if (password === ADMIN_PASSWORD) {
      await pool.query(
        'UPDATE unlock_status SET is_unlocked = true, unlocked_at = NOW(), last_updated = NOW() WHERE id = 1'
      );
      res.json({ success: true, message: 'Vows unlocked successfully!' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid password' });
    }
  } catch (error) {
    console.error('Error unlocking vows:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Lock vows (no password required)
app.post('/api/lock', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, message: 'Database not configured' });
  }
  
  try {
    await pool.query(
      'UPDATE unlock_status SET is_unlocked = false, locked_at = NOW(), last_updated = NOW() WHERE id = 1'
    );
    res.json({ success: true, message: 'Vows locked successfully!' });
  } catch (error) {
    console.error('Error locking vows:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Get all vows from database
app.get('/api/vows', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured', wedding_vows: null, public_vows: [] });
  }

  try {
    // Set encoding to UTF-8 for PostgreSQL connection
    await pool.query("SET CLIENT_ENCODING TO 'UTF8'");

    const result = await pool.query(
      'SELECT * FROM vows WHERE is_active = true ORDER BY person_type'
    );

    const wedding_vows = {
      groom: null,
      bride: null
    };

    result.rows.forEach(row => {
      if (row.person_type === 'groom') {
        wedding_vows.groom = {
          person_name_en: row.person_name_en,
          person_name_pt: row.person_name_pt,
          vow_text_en: row.vow_text_en,
          vow_text_pt: row.vow_text_pt
        };
      } else if (row.person_type === 'bride') {
        wedding_vows.bride = {
          person_name_en: row.person_name_en,
          person_name_pt: row.person_name_pt,
          vow_text_en: row.vow_text_en,
          vow_text_pt: row.vow_text_pt
        };
      }
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({
      wedding_vows: (wedding_vows.groom || wedding_vows.bride) ? wedding_vows : null,
      public_vows: []
    });
  } catch (error) {
    console.error('Error getting vows:', error);
    res.status(500).json({ error: 'Database error', message: error.message, hint: 'Make sure vows table exists' });
  }
});

// Add new vow
app.post('/api/vows', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not configured' });
  }
  
  try {
    const { name, vow, password, groomNameEn, groomNamePt, groomVowsEn, groomVowsPt, 
            brideNameEn, brideNamePt, brideVowsEn, brideVowsPt } = req.body;
    
    // Check if this is an admin save (with all wedding vows data)
    if (password && groomNameEn && brideNameEn) {
      const ADMIN_PASSWORD = '2025';
      
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }
      
      // Validate all required fields
      if (!groomNameEn || !groomNamePt || !groomVowsEn || !groomVowsPt ||
          !brideNameEn || !brideNamePt || !brideVowsEn || !brideVowsPt) {
        return res.status(400).json({ success: false, error: 'All fields are required for both languages' });
      }
      
      // Save groom vows to database (delete old and insert new)
      await pool.query('DELETE FROM vows WHERE person_type = $1', ['groom']);
      await pool.query(`
        INSERT INTO vows (person_type, person_name_en, person_name_pt, vow_text_en, vow_text_pt, is_active, last_updated)
        VALUES ('groom', $1, $2, $3, $4, true, NOW())
      `, [groomNameEn, groomNamePt, groomVowsEn, groomVowsPt]);
      
      // Save bride vows to database (delete old and insert new)
      await pool.query('DELETE FROM vows WHERE person_type = $1', ['bride']);
      await pool.query(`
        INSERT INTO vows (person_type, person_name_en, person_name_pt, vow_text_en, vow_text_pt, is_active, last_updated)
        VALUES ('bride', $1, $2, $3, $4, true, NOW())
      `, [brideNameEn, brideNamePt, brideVowsEn, brideVowsPt]);
      
      return res.json({ success: true, message: 'Wedding vows saved successfully!' });
    }
    
    // Otherwise, it's a simple public vow submission
    if (!name || !vow) {
      return res.status(400).json({ success: false, message: 'Name and vow are required' });
    }
    
    const newVow = {
      id: Date.now(),
      name: name.trim(),
      vow: vow.trim(),
      timestamp: new Date().toISOString()
    };
    
    vowsData.vows.push(newVow);
    res.json({ success: true, message: 'Vow saved successfully!', vow: newVow });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving vow' });
  }
});

// Delete vow (admin only)
app.delete('/api/vows/:id', (req, res) => {
  try {
    const vowId = parseInt(req.params.id);
    const initialLength = vowsData.vows.length;
    
    vowsData.vows = vowsData.vows.filter(vow => vow.id !== vowId);
    
    if (vowsData.vows.length < initialLength) {
      res.json({ success: true, message: 'Vow deleted successfully!' });
    } else {
      res.status(404).json({ success: false, message: 'Vow not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting vow' });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`✅ GridTV Sports Multi-Sport Server running on port ${PORT}`);
  console.log(`🏈 NFL API: http://localhost:${PORT}/api/nfl/scoreboard`);
  console.log(`� NCAA API: http://localhost:${PORT}/api/ncaa/scoreboard`);
  console.log(`�🏀 NBA API: http://localhost:${PORT}/api/nba/scoreboard`);
  console.log(`⚾ MLB API: http://localhost:${PORT}/api/mlb/scoreboard`);
  console.log(`🏒 NHL API: http://localhost:${PORT}/api/nhl/scoreboard`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  
  // Clean up any stale dates from cache
  cleanupActiveDates();
});
