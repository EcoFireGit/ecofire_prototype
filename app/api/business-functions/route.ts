import { NextResponse } from 'next/server';
import { BusinessFunctionService } from '@/lib/services/business-function.service';
import { JobCountService } from '@/lib/services/job-count.service';
import { validateAuth } from '@/lib/utils/auth-utils';
import { validateString } from "@/lib/utils/validation-utils";
import ValidationError from '../../errors/validation-error';

const businessFunctionService = new BusinessFunctionService();
const jobCountService = new JobCountService();

export async function GET() {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    
    // Get all business functions
    const functions = await businessFunctionService.getAllBusinessFunctions(userId!);
    
    // Get job counts for all business functions
    const jobCounts = await jobCountService.getJobCountsByBusinessFunction(userId!);
    
    // Merge the job counts with the business functions
    const functionsWithCounts = functions.map(func => ({
      ...func,
      jobCount: jobCounts[func._id] || 0
    }));
   
    return NextResponse.json({
      success: true,
      count: functionsWithCounts.length,
      data: functionsWithCounts
    });
  } catch (error) {
    console.error('Error in GET /api/business-functions:', error);
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
    const { name } = await request.json();
    await validateData(name);
    const businessFunction = await businessFunctionService.createBusinessFunction(
      name,
      userId!
    );
    return NextResponse.json({
      success: true,
      data: businessFunction
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/business-functions:', error);
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

async function validateData(name: string) {
  await validateString(name);
  const exists = await businessFunctionService.checkNameExists(name);
  if(exists) {
    throw new ValidationError('Business function name already exists', 400);
  }
}

