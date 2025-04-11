import { authenticate } from '@google-cloud/local-auth';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import path from 'path';
import GCalAuth from '../models/gcal-auth.model';
import { calendar_v3} from 'googleapis';
import getCalendar from './google.calendar.provider';
//import { Schema$CalendarListEntry } from 'googleapis';

import dbConnect from '../mongodb';


const scopes = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar'
];

const clientId = process.env.GOOGLE_CLIENT_ID!;

const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

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

export async function processAuthCode(userId: string, code: string) {
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
    const gcalAuthExists = await GCalAuth.findOne({ userId: userId });
    if(gcalAuthExists){
      gcalAuthExists.auth = client;
      gcalAuthExists.save();
    }else {
      const gcalAuth = new GCalAuth({
        userId: userId,
        auth: client
      });
      const savedAuth = await gcalAuth.save();
    }

 }catch(error){
      console.log("Error in saveCredentials" + error);
      throw new Error('Error saving credentials');
  }

}

export async function saveAuthorizedCalendars(userId: string, calendars: any) {
  try {
    await dbConnect();

    //load refresh token from
    const gcalAuth = await GCalAuth.findOne({ userId: userId });
    if (!gcalAuth) {
      throw new Error('No credentials found');
    }
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
    const gcalAuth = await GCalAuth.findOne({ userId: userId });
    if (!gcalAuth) {
      throw new Error('No credentials found');
    }

    const auth = gcalAuth.auth;
    oauth2Client.setCredentials(auth);

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    oauth2Client.setCredentials(credentials);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const res = await calendar.calendarList.list();
    return res.data.items || [];
  }
  catch (error) {
    console.log("Error in getCalendarsFromGoogle" + error);
    throw new Error('Error getting user calendars');
  }
}
 
export async function createPrioriCalendar(userId: string): Promise<calendar_v3.Schema$Calendar> {
  try {
    await dbConnect();

    //load refresh token from
    const gcalAuth = await GCalAuth.findOne({ userId: userId });
    if (!gcalAuth) {
      throw new Error('No credentials found');
    }
    //set credentials
    const auth = gcalAuth.auth;
    oauth2Client.setCredentials(auth);
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    //does prioriwise calendar exist in google?
    if(gcalAuth.prioriCalendar && gcalAuth.prioriCalendar.id ) {
      const prioriwiseCalendar = await doesCalendarExist(oauth2Client, gcalAuth.prioriwiseCalendar.id);
      if(prioriwiseCalendar){
        return prioriwiseCalendar;
      }
    }

    //create calendar on google
    const calendarData = {
      summary: 'Prioriwise',
      description: 'Prioriwise Calendar to manage your business jobs',
      etag: 'Prioriwise',
      timeZone: 'America/Los_Angeles',
    };

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const res = await calendar.calendars.insert({
        requestBody: calendarData
    });
    gcalAuth.prioriwiseCalendar = res.data;

    //save to db
    const savedAuth = gcalAuth.save();
    return savedAuth.prioriwiseCalendar;
  }
  catch (error) {
    console.log("Error in createPrioriCalendar" , error);
    throw new Error('Error creating calendar');
  }
}




async function doesCalendarExist(oauth2Client: OAuth2Client, calendarId: string) {
  try {
      const priorCalExists = await google.calendar({ version: 'v3', auth: oauth2Client }).calendars.get({
        calendarId: calendarId
      });
      if(priorCalExists && priorCalExists.data){
        return priorCalExists.data;
      }
    }  
    catch (error) {
      if(error.code !== 404){
        console.log("Error in doesCalendarExist: ", error);
      }
      return null;
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
