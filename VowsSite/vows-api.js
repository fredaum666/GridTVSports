// VowsSite API Server - Separate from GridTVSports API
const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  getAllVows,
  saveVows,
  getUnlockStatus,
  setUnlockStatus,
  verifyAdminPassword,
  initializeVowsDatabase,
} = require('./vows-db');

const app = express();
const PORT = process.env.VOWS_API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from VowsSite directory

// Initialize database on startup
initializeVowsDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});

// ===== API ENDPOINTS =====

// GET /api/vows - Get all vows (both languages)
app.get('/api/vows', async (req, res) => {
  try {
    const vows = await getAllVows();

    // Format response for easier frontend consumption
    const response = {
      groom: vows.find(v => v.person_type === 'groom') || null,
      bride: vows.find(v => v.person_type === 'bride') || null,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching vows:', error);
    res.status(500).json({ error: 'Failed to fetch vows' });
  }
});

// POST /api/vows - Save vows (no authentication required)
app.post('/api/vows', async (req, res) => {
  try {
    const {
      groomNameEn,
      groomNamePt,
      groomVowsEn,
      groomVowsPt,
      brideNameEn,
      brideNamePt,
      brideVowsEn,
      brideVowsPt,
    } = req.body;

    // Validate required fields
    if (!groomNameEn || !groomNamePt || !groomVowsEn || !groomVowsPt ||
        !brideNameEn || !brideNamePt || !brideVowsEn || !brideVowsPt) {
      return res.status(400).json({ error: 'All fields are required for both languages' });
    }

    // Save vows
    const result = await saveVows(
      groomNameEn, groomNamePt, groomVowsEn, groomVowsPt,
      brideNameEn, brideNamePt, brideVowsEn, brideVowsPt
    );

    res.json({ success: true, message: 'Vows saved successfully' });
  } catch (error) {
    console.error('Error saving vows:', error);
    res.status(500).json({ error: 'Failed to save vows' });
  }
});

// GET /api/unlock-status - Get unlock status
app.get('/api/unlock-status', async (req, res) => {
  try {
    const status = await getUnlockStatus();
    res.json(status);
  } catch (error) {
    console.error('Error fetching unlock status:', error);
    res.status(500).json({ error: 'Failed to fetch unlock status' });
  }
});

// POST /api/unlock - Unlock vows (requires admin authentication)
app.post('/api/unlock', async (req, res) => {
  try {
    const { password } = req.body;

    // Verify admin password
    const isValid = await verifyAdminPassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // Unlock vows
    const result = await setUnlockStatus(true);
    res.json({ success: true, is_unlocked: true });
  } catch (error) {
    console.error('Error unlocking vows:', error);
    res.status(500).json({ error: 'Failed to unlock vows' });
  }
});

// POST /api/lock - Lock vows (no authentication required)
app.post('/api/lock', async (req, res) => {
  try {
    // Lock vows
    const result = await setUnlockStatus(false);
    res.json({ success: true, is_unlocked: false });
  } catch (error) {
    console.error('Error locking vows:', error);
    res.status(500).json({ error: 'Failed to lock vows' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'VowsSite API is running' });
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🌐 VowsSite API server running on http://localhost:${PORT}`);
  console.log(`📝 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`👀 Vows display: http://localhost:${PORT}/`);
});

module.exports = app;
