const express = require('express');
const { google } = require('googleapis');
const { verifyToken } = require('./middleware');
require('dotenv').config();

const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Step A: user visits this to connect their Google Calendar
router.get('/oauth/connect', verifyToken, (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: String(req.user.id) // pass user id through so we know who's connecting
  });
  res.json({ authUrl: url }); // frontend opens this URL in a browser tab
});

// Step B: Google redirects here after the user approves access
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const { tokens } = await oauth2Client.getToken(code);

    // In a real app: save tokens.refresh_token to the users table for this user_id (state)
    // For now, we log it so you can see it working — Phase 6 will wire this into the DB properly
    console.log(`User ${state} connected Google Calendar. Tokens:`, tokens);

    res.send('Google Calendar connected! You can close this tab.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to connect Google Calendar');
  }
});

module.exports = router;