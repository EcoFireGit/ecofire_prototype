import { authenticate } from '@google-cloud/local-auth';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { google, calendar_v3 } from 'googleapis';
import path from 'path';
import GCalAuth from '../models/gcal-auth.model';

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

export default getCalendar
