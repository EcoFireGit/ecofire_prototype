import { NextResponse } from 'next/server';
import { BusinessFunctionService } from '@/lib/services/business-function.service';
import { validateAuth } from '@/lib/utils/auth-utils';

const businessFunctionService = new BusinessFunctionService();

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    // Use the Stack Overflow solution to correctly await the ID
    const { id } = await params;
    
    const deleted = await businessFunctionService.deleteBusinessFunction(
      id,
      userId!
    );
   
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Business function not found'
        },
        { status: 404 }
      );
    }
   
    return NextResponse.json({
      success: true,
      message: 'Business function deleted successfully'
    });
  } catch (error: any) {
    console.error('Error in DELETE business function:', error);
   
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
   
    // Use the Stack Overflow solution to correctly await the ID
    const { id } = await params;
    
    const { name } = await request.json();
   
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Name is required'
        },
        { status: 400 }
      );
    }
   
    const updatedFunction = await businessFunctionService.updateBusinessFunction(
      id,
      name,
      userId!
    );
   
    if (!updatedFunction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Business function not found'
        },
        { status: 404 }
      );
    }
   
    return NextResponse.json({
      success: true,
      data: updatedFunction
    });
  } catch (error) {
    console.error('Error in PATCH business function:', error);
   
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}