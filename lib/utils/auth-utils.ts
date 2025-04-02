// lib/utils/auth-utils.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function validateAuth() {
  const { userId } = await auth();
  
  if (!userId) {
    return {
      isAuthorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      )
    };
  }
  
  return {
    isAuthorized: true,
    userId
  };
}