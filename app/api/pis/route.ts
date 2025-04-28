// app/api/PIs/route.ts
// description: Get all PIs

import { NextResponse } from 'next/server';
import { PIService } from '@/lib/services/pi.service';
import { validateAuth } from '@/lib/utils/auth-utils';
import { updateJobImpactValues } from '@/lib/services/job-impact.service';
import { validateString } from "@/lib/utils/validation-utils";
import ValidationError from '../../errors/validation-error';
import { use } from 'react';


const piService = new PIService();

export async function GET() {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    const PIs = await piService.getAllPIs(userId!);
   
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
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.isOrganization ? authResult.userId : authResult.actualUserId;

    const piData = await request.json();
    await validateData(piData.name, userId!);    
    const PI = await piService.createPI(piData, userId!);
    await updateJobImpactValues(userId!);
    return NextResponse.json({
      success: true,
      data: PI
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/pis:', error);
    if(error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: error.statusCode }
      );
    }    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}

async function validateData(name: string, userId: string) {
  await validateString(name);
  const exists = await piService.checkNameExists(name, userId);
  if(exists) {
    throw new ValidationError('PI name already exists', 400);
  }
}