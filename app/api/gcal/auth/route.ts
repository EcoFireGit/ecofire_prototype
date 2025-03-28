import {generateAuthUrl} from '@/lib/services/gcal.service';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const authUrl =  await generateAuthUrl();
    return NextResponse.json({ success: true, authUrl: authUrl});
  } catch (error) {
    return NextResponse.json(
      { error: 'Authorization failed' },
      { status: 500 }
    );
  }
}
