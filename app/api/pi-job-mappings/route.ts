// app/api/PIs/route.ts
// description: Get all PIs

import { NextResponse } from 'next/server';
import { MappingService } from '@/lib/services/pi-job-mapping.service';
import { auth } from '@clerk/nextjs/server';

const JPMappingService = new MappingService();

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }
    const getMapping = await JPMappingService.getAllMappingJP(userId);
   
    return NextResponse.json({
      success: true,
      count: getMapping.length,
      data: getMapping
    });
  } catch (error) {
    console.error('Error in GET /api/pi-job-mappings:', error);
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }
    const MappingData = await request.json();
    const JP = await JPMappingService.CreateMapping(MappingData, userId);
    return NextResponse.json({
      success: true,
      data: JP
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/pi-job-mappings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}