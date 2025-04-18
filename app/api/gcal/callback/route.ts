// pages/api/auth/callback/google.js
import  processAuthCode  from '@/lib/services/gcal.service';
import { NextResponse, NextRequest } from 'next/server';
import { validateAuth } from '@/lib/utils/auth-utils';


export async function GET(req: NextRequest) {
    
  const authResult = await validateAuth();
    
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  
  const userId = authResult.userId;

  const url = req.nextUrl;
  const code = url.searchParams.get('code');

    // Check if the code exists (it should in a successful callback)
    if (!code) {
        return NextResponse.json(
            { error: 'missing authorization code' },
            { status: 400 }
          );        
    }

    try {

    await processAuthCode(userId!, code);
      // const serverUrl = process.env.SERVER_URL;
      // return NextResponse.redirect(new URL(serverUrl + '/api/gcal/calendars', req.url));
      return NextResponse.json('Calendar connected');
    } catch (error) {
        
        console.error('Error in GET /api/gcal/auth/callback:', error);
        return NextResponse.json(
        { error: 'Failed to process authcode' },
        { status: 500 }
        );
      }
    }
  

