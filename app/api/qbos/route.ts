// app/api/qbos/route.ts
// description: Get all QBOs

import { NextResponse } from 'next/server';
import { QBOService } from '@/lib/services/qbo.service';
import { validateAuth } from '@/lib/utils/auth-utils';
import { updateJobImpactValues } from '@/lib/services/job-impact.service';

const qboService = new QBOService();

export async function GET() {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    const qbos = await qboService.getAllQBOs(userId!);
   
    return NextResponse.json({
      success: true,
      count: qbos.length,
      data: qbos
    });
  } catch (error) {
    console.error('Error in GET /api/qbos:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    const qboData = await request.json();
    const qbo = await qboService.createQBO(qboData, userId!);
    await updateJobImpactValues(userId!);
    return NextResponse.json({
      success: true,
      data: qbo
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/qbos:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}