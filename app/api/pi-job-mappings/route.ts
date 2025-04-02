// app/api/PIs/route.ts
// description: Get all PIs

import { NextResponse } from 'next/server';
import { MappingService } from '@/lib/services/pi-job-mapping.service';
import { validateAuth } from '@/lib/utils/auth-utils';
import { updateJobImpactValues } from '@/lib/services/job-impact.service';

const JPMappingService = new MappingService();

export async function GET() {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    const getMapping = await JPMappingService.getAllMappingJP(userId!);
   
    return NextResponse.json({
      success: true,
      count: getMapping.length,
      data: getMapping
    });
  } catch (error) {
    console.error('Error in GET /api/MappingJP:', error);
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
    const MappingData = await request.json();
    const JP = await JPMappingService.CreateMapping(MappingData, userId!);
    await updateJobImpactValues(userId!);
    return NextResponse.json({
      success: true,
      data: JP
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/MappingJP:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}