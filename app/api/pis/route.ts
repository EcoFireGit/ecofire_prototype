// app/api/PIs/route.ts
// description: Get all PIs

import { NextResponse } from 'next/server';
import { PIService } from '@/lib/services/pi.service';
import { auth } from '@clerk/nextjs/server';
import { updateJobImpactValues } from '@/lib/services/job-impact.service';

const PIsService = new PIService();

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
    const PIs = await PIsService.getAllPIs(userId);
   
    return NextResponse.json({
      success: true,
      count: PIs.length,
      data: PIs
    });
  } catch (error) {
    console.error('Error in GET /api/pis:', error);
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
    const PIData = await request.json();
    const PI = await PIsService.createPI(PIData, userId);
    await updateJobImpactValues(userId);
    return NextResponse.json({
      success: true,
      data: PI
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/pis:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}