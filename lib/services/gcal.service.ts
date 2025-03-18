// /lib.services.gcal.service

import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

const clientId = process.env.GOOGLE_CLIENT_ID!;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

class GoogleCalendarService {
  private oauth2Client: OAuth2Client;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  // Generate the URL for the consent screen
  generateAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }
}

export default GoogleCalendarService;
