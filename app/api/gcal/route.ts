// app/api/gcal/route
import { NextApiRequest, NextApiResponse } from 'next';
import GoogleCalendarService from '../../../lib/services/gcal.service';

const googleCalendarService = new GoogleCalendarService(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const authUrl = googleCalendarService.generateAuthUrl();
      res.status(200).json({ authUrl });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
