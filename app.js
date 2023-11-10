const { google } = require("googleapis");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const dayjs = require("dayjs");
const cors = require("cors");

// Parse JSON bodies
app.use(bodyParser.json());

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors())

// Read the service account credentials file
const serviceAccount = require("./gisda-391813-4a1d7e8bd52e.json");

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

// Create a JWT client using the service account credentials
const authClient = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  SCOPES
);

// Create a new calendar instance
const calendar = google.calendar("v3");

// let calendarId = "erpteam.ait@gmail.com";
// let calendarId = "469ff5ea138c724b769551bc92082327c02065e1047a0c6320ea7e289435d182@group.calendar.google.com"
// let calendarId = "756c0e2e021c38218efbff6120cc107e8f873802192c3113a7a8debb1f9cf281@group.calendar.google.com"
let calendarId = "4su31qqnqdmg8q08gf9dliiec4@group.calendar.google.com"

// List the user's calendars
app.get("/calendars", async (req, res) => {
  try {
    const calendarList = await calendar.calendarList.get({
        calendarId: calendarId,
        auth: authClient,
    });

    console.log(calendarList);

    const calendars = calendarList.data.items;
    console.log(calendarList.data);
    res.json(calendars);
  } catch (error) {
    console.error("The API returned an error:", error);
    res.status(500).send("An error occurred.");
  }
});

// List the upcoming events
app.get("/events", async (req, res) => {

  try {
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });
    const events = response.data.items;
    console.log(response.data);
    res.json(events);
  } catch (error) {
    console.error("The API returned an error:", error.message);
    res.status(500).send("An error occurred.");
  }
});

// Create a new event
app.post("/events/create", async (req, res) => {
  console.log("Request body : ");
  console.log(req.body);
  // Retrieve data from req.body
  const { summary, description, startDateTime, endDateTime, calendarId } = req.body;

  // Convert startDateTime to the desired format
  const start = dayjs(startDateTime, 'YYYY-MM-DD HH:mm').format('YYYY-MM-DDTHH:mm:ssZ');

  // Convert endDateTime to the desired format
  const end = dayjs(endDateTime, 'YYYY-MM-DD HH:mm').format('YYYY-MM-DDTHH:mm:ssZ');

  try {
    const event = {
      summary: summary,
      description: description,
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

    console.log('Calendar ID : ' + calendarId)
    console.log('Event : ')
    console.log(event)

    const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: event,
        auth: authClient,
    });

    console.log(response);

    res.json(response.data);
  } catch (error) {
    console.error('The API returned an error:', error);
    res.status(500).send('An error occurred.');
  }
});

// Update an existing event
app.put("/events/:eventId", async (req, res) => {
  const { calendarId } = req.body;

  try {
    const eventId = req.params.eventId;
    const event = {
      summary: "Updated Event",
      start: {
        dateTime: "2023-06-24T14:00:00",
        timeZone: "America/New_York",
      },
      end: {
        dateTime: "2023-06-24T16:00:00",
        timeZone: "America/New_York",
      },
    };

    const response = await calendar.events.update({
      calendarId: calendarId,
      eventId: eventId,
      requestBody: event,
    });

    res.json(response.data);
  } catch (error) {
    console.error("The API returned an error:", error.message);
    res.status(500).send("An error occurred.");
  }
});

// Delete an event
app.delete("/events/:eventId", async (req, res) => {
  const { calendarId } = req.body;

  try {
    const eventId = req.params.eventId;

    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
    });

    res.send("Event deleted successfully.");
  } catch (error) {
    console.error("The API returned an error:", error.message);
    res.status(500).send("An error occurred.");
  }
});

// Start the server
app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
