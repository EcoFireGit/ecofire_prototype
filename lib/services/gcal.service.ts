import { authenticate } from '@google-cloud/local-auth';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import path from 'path';
import GCalAuth from '../models/gcal-auth.model';
import { calendar_v3} from 'googleapis';
import getCalendar from './google.calendar.provider';
import dbConnect from '../mongodb';
import 'dotenv/config';

const scopes = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar'
];

const clientId = process.env.GOOGLE_CLIENT_ID;

const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : `${process.env.SERVER_URL}`;
console.log("baseUrl: ", baseUrl);
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret,  `${baseUrl}/api/gcal/callback`);  

// async function loadSavedCredentials(): Promise<OAuth2Client | null> {
//   try {
//     const content = await fs.readFile(TOKEN_PATH, 'utf8');
//     const credentials = JSON.parse(content);
//     const client = google.auth.fromJSON(credentials);
//     if (client instanceof OAuth2Client) {
//       return client;
//     }
//     return null;
//   } catch (error) {
//     return null;
//   }
// }


// export async function saveCredentials(client: any) {
//   const content = await fs.readFile(CREDENTIALS_PATH, 'utf8');
//   const keys = JSON.parse(content);
//   const key = keys.installed || keys.web;
//   const payload = JSON.stringify({
//     type: 'authorized_user',
//     client_id: key.client_id,
//     client_secret: key.client_secret,
//     refresh_token: client.credentials.refresh_token,
//   });
//   await fs.writeFile(TOKEN_PATH, payload);
// }


export async function generateAuthUrl() : Promise<string> {
    try {

        const authUrl = oauth2Client.generateAuthUrl({ 
          access_type: 'offline',
          scope: scopes
        });

        return JSON.parse(JSON.stringify(authUrl));
    }catch(error){
        console.log("Error in generateUrl" + error);
        throw new Error('Error generating url');
    }
}

export async function getRefreshToken(userId: string) {
  try {
    await dbConnect();
    const gcalAuth = await GCalAuth.findOne({ userId: userId });
    if (!gcalAuth) {
      return '';
    }
    return gcalAuth.auth.refresh_token || '';
  }catch(error){
    console.log("Error in getRefreshToken: " + error);
    throw error
  }
}

async function processAuthCode(userId: string, code: string) {
  try {
    //get tokens from code
    const { tokens } = await oauth2Client.getToken(code);

    //save only if refresh token is received from Google. It is a MUST to make future requests
    if(tokens.refresh_token !== undefined ){
      await saveCredentials(userId, tokens);
      return;
    }    
    //does refresh token exist in db?
    const refreshTokenExists = getRefreshToken(userId);
    if(tokens.refresh_token === undefined && !refreshTokenExists){ 
      //is tehre a refresh token saved in the db?
      throw new Error('No refresh token found. Please ensure there is a refresh token saved in the db');
    }
    return
  }catch(error){
      console.log("Error in processAuthCode: " + error);
      throw new Error('Error getting tokens from auth code');
  }
}

async function saveCredentials(userId: string, client: Record<string, any> ) {
  try {
    await dbConnect();
    let gcalAuth = await GCalAuth.findOne({ userId: userId });
    if(gcalAuth){
      gcalAuth.auth = client;
    }else {
      gcalAuth = new GCalAuth({
        userId: userId,
        auth: client
      });
    }
    
    await gcalAuth.save();

 }catch(error){
      console.log("Error in saveCredentials" + error);
      throw new Error('Error saving credentials');
  }

}

export async function saveAuthorizedCalendars(userId: string, calendars: any) {
  try {
    await dbConnect();

    //load refresh token from
    const gcalAuth = await getCalendarAuthForUser(userId);

    gcalAuth.calendars = calendars;
    const savedAuth = gcalAuth.save();
    return JSON.parse(JSON.stringify(savedAuth));

  }
  catch (error) {
    console.log("Error in saveAuthorizedUserCalendars" + error);
    throw new Error('Error saving user calendars');
  }

}
export async function getCalendarsFromGoogle(userId: string): Promise<calendar_v3.Schema$CalendarListEntry[]> {
  try {
    await dbConnect();

    //load refresh token from
    const gcalAuth = await getCalendarAuthForUser(userId);

    const calendar = await getCalendar(gcalAuth.auth);
    const res = await calendar.calendarList.list();
    return res.data.items || [];
  }
  catch (error) {
    console.log("Error in getCalendarsFromGoogle" + error);
    throw new Error('Error getting user calendars');
  }
}
 
export async function createPrioriCalendar(userId: string): Promise<{ calendar: calendar_v3.Schema$Calendar, alreadyExists: boolean }> {
  try {
    await dbConnect();

    //does calendar exist in db?
    const gcalAuth = await getCalendarAuthForUser(userId);
            
    const calendar = await getCalendar(gcalAuth.auth);

    if(gcalAuth.prioriwiseCalendar && gcalAuth.prioriwiseCalendar.id ) { //exists in db
      //does prioriwise calendar exist in google? 
      try {
        const priorCalExists = await calendar.calendars.get({
          calendarId: gcalAuth.prioriwiseCalendar.id
        });

        if(priorCalExists && priorCalExists.data){
          return { 
            calendar: priorCalExists.data, 
            alreadyExists: true 
          };
        }
      }catch(error){
        console.log("calendar does not exist");
      }
    }

      //does not exist either in db or on google. so create calendar on google
      const calendarData = {
        summary: 'Prioriwise',
        description: 'Prioriwise Calendar to manage your business jobs',
        etag: 'Prioriwise',
        timeZone: 'America/Los_Angeles',
      };

      // const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const res = await calendar.calendars.insert({
          requestBody: calendarData
      });
      gcalAuth.prioriwiseCalendar = res.data;

      //save to db
      const savedAuth = gcalAuth.save();
      return { 
        calendar: savedAuth.prioriwiseCalendar,
        alreadyExists: false
      };
  } catch (error) {
    console.log("Error in createPrioriCalendar" , error);
    throw new Error('Error creating calendar');
  }
}

export async function getPrioriCalendarId(userId: string): Promise<string> {
  try {
    await dbConnect();

    const gcalAuth = await getCalendarAuthForUser(userId);

    // Only return the calendar ID if it exists in the DB
    if (gcalAuth.prioriwiseCalendar?.id) {
      return gcalAuth.prioriwiseCalendar.id;
    }

    throw new Error('Prioriwise calendar ID not found in database');
  } catch (error) {
    console.error('Error in getPrioriCalendarId:', error);
    throw new Error('Could not retrieve calendar ID from database');
  }
}

async function getCalendarAuthForUser(userId: string) {
  const gcalAuth = await GCalAuth.findOne({ userId: userId });
  if (!gcalAuth) {
    throw new Error('No credentials found');
  }
  return gcalAuth;   const prioriwiseCalendarExists = await GCalAuth.findOne({ userId: userId, prioriwiseCalendar: { $ne: null } });
}


export default processAuthCode
