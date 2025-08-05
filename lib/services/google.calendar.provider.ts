import { google, calendar_v3 } from "googleapis";
import { Credentials } from "google-auth-library";
import moment from "moment-timezone";
import dbConnect from "../mongodb";

const scopes = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar",
];

const clientId = process.env.GOOGLE_CLIENT_ID;

const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

const baseUrl = `${process.env.SERVER_URL}`;
const redirectUri = `${baseUrl}/api/gcal/callback`;

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri,
);

export async function getCalendar(
  auth: Credentials,
): Promise<calendar_v3.Calendar | null> {
  try {
    await dbConnect();

    oauth2Client.setCredentials(auth);
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    return calendar;
  } catch (error) {
    console.log("Error in getCalendar" + error);
    return null;
  }
}

export async function getAllEventsForTimeInEnvironmentSetting(
  auth: Credentials,
  calendarId: string,
): Promise<any> {
  try {
    const calendar = await getCalendar(auth);
    if (!calendar) {
      console.log("Failed to get calendar instance");
      return [];
    }
    const timeToGetEvents = process.env.REPRIORITIZE_EVENT_TIME_IN_HOURS;
    console.log("timeToGetEvents: ", timeToGetEvents);
    const startTime = moment().toISOString(); //
    const endOfTimeInHours = moment()
      .add(timeToGetEvents, "hours")
      .toISOString();
    console.log("startTime: ", startTime);
    console.log("endOfTimeInHours: ", endOfTimeInHours);
    // Fetch events from the calendar
    const res = await calendar.events.list({
      calendarId: calendarId,
      timeMin: startTime, // Events starting after this time
      timeMax: endOfTimeInHours, // Events ending before this time
      singleEvents: true, // Ensure events that repeat are expanded
      orderBy: "startTime", // Order by start time
    });

    const events = res.data.items;

    return events;
  } catch (error) {
    console.error("Error retrieving events:", error);
    throw error;
  }
}

export default getCalendar;
