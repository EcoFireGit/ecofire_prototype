// route: /api/pis/:id
// description: Get PI by id
import { NextResponse } from 'next/server';
import { PIService } from '@/lib/services/pi.service';
import { validateAuth } from '@/lib/utils/auth-utils';
import { updateJobImpactValues } from '@/lib/services/job-impact.service';
const piService = new PIService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    
    const id = (await params).id;
    const pi = await piService.getPIById(id, userId!);
 
    if (!pi) {
      return NextResponse.json(
        {
          success: false,
          error: 'PI not found'
        },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: pi
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;
    
    const id = (await params).id;
    const updateData = await request.json();
    const updatedPI = await piService.updatePI(id, userId!, updateData);
    
    if (!updatedPI) {
      return NextResponse.json(
        {
          success: false,
          error: 'PI not found'
        },
        { status: 404 }
      );
    }
    await updateJobImpactValues(userId!);
    return NextResponse.json({
      success: true,
      data: updatedPI
    });
  } catch (error) {
    console.error('Error in PUT /api/pis:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}

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
    
    const id = (await params).id;
    const deleted = await piService.deletePI(id, userId!);
    
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'PI not found'
        },
        { status: 404 }
      );
    }
    await updateJobImpactValues(userId!);
    return NextResponse.json({
      success: true,
      message: 'PI deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/pis:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}