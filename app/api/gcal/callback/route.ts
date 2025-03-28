// pages/api/auth/callback/google.js

import processAuthCode from '@/lib/services/gcal.service';
import { google } from 'googleapis';
import { NextResponse, NextRequest } from 'next/server';
import { decodeJwt } from 'jose';
import { use } from 'react';


export async function GET(req: NextRequest) {
    
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

      //get userid
      const accessToken = req.cookies.get("__session")?.value;  // Assuming the access token is stored in this cookie      
      const userId = decodeJwt(accessToken).sub?.toString();
      // const userId = "123";      
      await processAuthCode(userId, code);

      // You can store tokens in your database, session, etc. Here we'll send it back to the client
      return NextResponse.json(userId);
    } catch (error) {
      if (error.code === 'ERR_JWT_INVALID') {
        return NextResponse.json(
          { error: 'invalid jwt token' },
          { status: 401 }
          );
      }else{
        console.error('Error in GET /api/auth/callback/google:', error);
        return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
        );
      }
    }
  }

