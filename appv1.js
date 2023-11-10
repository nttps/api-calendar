const { google } = require('googleapis');
const express = require('express');
const fs = require('fs');
const app = express();
const bodyParser = require('body-parser');
const dayjs = require('dayjs');

// Parse JSON bodies
app.use(bodyParser.json());

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Read the credentials file
// const credentials = require('./credentials.json');

const credentials = {
  "installed": {
    "client_id": "206513727138-3j33jubpte3b2g2nvqiuf1bd7233mg0i.apps.googleusercontent.com",
    "project_id": "gisda-391813",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "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",
    "redirect_uris": ["http://localhost:3000/oauth2callback"]
  }
};

const { client_secret, client_id, redirect_uris } = credentials.installed;

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Configure the Google OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

let calendarId = 'primary';

// Middleware to check authentication and redirect if needed
const checkAuth = (req, res, next) => {
  if (!oAuth2Client.credentials) {
    return res.redirect('/'); // Redirect to authentication URL if not authenticated
  }
  next();
};

// Generate an authentication URL
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES
});

// Redirect user to the authentication URL
app.get('/', (req, res) => {
  res.redirect(authUrl);
});

// Handle the OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;

  // Exchange authorization code for access token
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  // Create a new calendar instance
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  // List the user's calendars
  app.get('/calendars', checkAuth, async (req, res) => {
    try {
      const response = await calendar.calendarList.list();
      const calendars = response.data.items;
      res.json(calendars);
    } catch (error) {
      console.error('The API returned an error:', error.message);
      res.status(500).send('An error occurred.');
    }
  });

  // List the upcoming events
  app.get('/events', checkAuth, async (req, res) => {
    try {
      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
      });
      const events = response.data.items;
      res.json(events);
    } catch (error) {
      console.error('The API returned an error:', error.message);
      res.status(500).send('An error occurred.');
    }
  });

  const eventData = {
        summary: 'Test Event',
        description: 'This is a test event',
        startDateTime: '2023-07-24T10:00:00',
        endDateTime: '2023-07-24T12:00:00'
    };

  // Create a new event
  app.post('/events/create', checkAuth, async (req, res) => {
    console.log(req.body);
    // Retrieve data from req.body
    const { summary, description, startDateTime, endDateTime } = req.body;

    // Convert startDateTime to the desired format
    const start = dayjs(startDateTime, 'YYYY-MM-DD HH:mm').format();

    // Convert endDateTime to the desired format
    const end = dayjs(endDateTime, 'YYYY-MM-DD HH:mm').format();

    try {
        const event = {
        summary: req.body.summary,
        description: req.body.description,
        start: {
            dateTime: start, //2023-07-28T01:00:00-07:00
            timeZone: 'Asia/Bangkok'
        },
        end: {
            dateTime: end, //2023-07-28T02:00:00-07:00
          timeZone: 'Asia/Bangkok'
        },
        reminders: {
            useDefault: false,
            overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 30 },
            ],
        },
    };

      const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: event
      });

      res.json(response.data);
    } catch (error) {
      console.error('The API returned an error:', error.message);
      res.status(500).send('An error occurred.');
    }
  });

  // Update an existing event
  app.put('/events/:eventId', checkAuth, async (req, res) => {
    try {
      const eventId = req.params.eventId;
      const event = {
        summary: 'Updated Event',
        start: {
          dateTime: '2023-06-24T14:00:00',
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: '2023-06-24T16:00:00',
          timeZone: 'America/New_York'
        }
      };

      const response = await calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        requestBody: event
      });

      res.json(response.data);
    } catch (error) {
      console.error('The API returned an error:', error.message);
      res.status(500).send('An error occurred.');
    }
  });

  // Delete an event
  app.delete('/events/:eventId', checkAuth, async (req, res) => {
    try {
      const eventId = req.params.eventId;

      await calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId
      });

      res.send('Event deleted successfully.');
    } catch (error) {
      console.error('The API returned an error:', error.message);
      res.status(500).send('An error occurred.');
    }
  });

  res.send('Authorization successful! Server is running on port 3000.');
});

// Start the server
app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
