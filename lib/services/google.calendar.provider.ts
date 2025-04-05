import { google, calendar_v3 } from 'googleapis';
import { Credentials } from 'google-auth-library';
import moment from 'moment-timezone';
import dbConnect from '../mongodb';


const scopes = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar'
];

const clientId = process.env.GOOGLE_CLIENT_ID!;

const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);


export async function getCalendar(auth: Credentials): Promise<calendar_v3.Calendar> {
  try {
    await dbConnect();

    oauth2Client.setCredentials(auth);
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    return calendar;
  }
  catch (error) {
    console.log("Error in getCalendar" + error);
    throw new Error('Error getting calendar object');
  }
}

export async function getAllEventsForTwoWeeks(auth: Credentials, calendarId: string): Promise<any> {
  try {

    const calendar = await getCalendar(auth);

    console.log("Calendar object: ", calendar);
    // Calculate the start and end of the current week (Sunday to Saturday)
    const now = moment().startOf('week');  // Get the start of the current week (Sunday)
    const startOfWeek = now.toISOString(); // Start of the week (e.g., Sunday at 00:00)
    const endOfWeekInTwoWeeks = now.add(2, 'weeks').endOf('week').toISOString();

    // Fetch events from the calendar
    const res = await calendar.events.list({
      calendarId: calendarId, 
      timeMin: startOfWeek, // Events starting after this time
      timeMax: endOfWeekInTwoWeeks,   // Events ending before this time
      singleEvents: true,   // Ensure events that repeat are expanded
      orderBy: 'startTime', // Order by start time
    });
    console.log("events list: ", res);

    const events = res.data.items;
    
    return events;
  } catch (error) {
    console.error('Error retrieving events:', error);
    throw error;
  }
}

export default getCalendar
