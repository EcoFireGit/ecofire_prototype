// route: /api/pis/:id
// description: Get PI by id
import { NextResponse } from 'next/server';
import { MappingService } from '@/lib/services/pi-job-mapping.service';
import { validateAuth } from '@/lib/utils/auth-utils';
import { updateJobImpactValues } from '@/lib/services/job-impact.service';
const mappingService = new MappingService();

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
    
    const { id } = await params;
    const JP = await mappingService.getMappingById(id, userId!);
 
    if (!JP) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mapping not found'
        },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: JP
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
    
    const { id } = await params;
    const updateData = await request.json();
    const updatedMapping = await mappingService.updateMappingJP(id, userId!, updateData);
    
    if (!updatedMapping) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mapping not found'
        },
        { status: 404 }
      );
    }
    await updateJobImpactValues(userId!);
    return NextResponse.json({
      success: true,
      data: updatedMapping
    });
  } catch (error) {
    console.error('Error in PUT /api/MappingJP:', error);
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
    
    const { id } = await params;
    const deleted = await mappingService.deleteMappingJP(id, userId!);
    
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mapping not found'
        },
        { status: 404 }
      );
    }
    await updateJobImpactValues(userId!);
    return NextResponse.json({
      success: true,
      message: 'Mapping deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/MappingJP:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}