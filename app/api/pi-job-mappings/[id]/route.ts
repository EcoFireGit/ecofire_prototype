// route: /api/pis/:id
// description: Get PI by id
import { NextResponse } from 'next/server';
import { MappingService } from '@/lib/services/pi-job-mapping.service';
import { auth } from '@clerk/nextjs/server';
import { updateJobImpactValues } from '@/lib/services/job-impact.service';

const mappingService = new MappingService();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const JP = await mappingService.getMappingById(params.id, userId);
  
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
    console.error(`Error in GET /api/MappingJP/${params.id}:`, error);
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
  { params }: { params: { id: string } }
) {
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

    const updateData = await request.json();
    const updatedMapping = await mappingService.updateMappingJP(params.id, userId, updateData);

    if (!updatedMapping) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mapping not found'
        },
        { status: 404 }
      );
    }
    await updateJobImpactValues(userId);
    return NextResponse.json({
      success: true,
      data: updatedMapping
    });
  } catch (error) {
    console.error(`Error in PUT /api/MappingJP/${params.id}:`, error);
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
  { params }: { params: { id: string } }
) {
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

    const deleted = await mappingService.deleteMappingJP(params.id, userId);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mapping not found'
        },
        { status: 404 }
      );
    }
    await updateJobImpactValues(userId);
    return NextResponse.json({
      success: true,
      message: 'Mapping deleted successfully'
    });
  } catch (error) {
    console.error(`Error in DELETE /api/MappingJP/${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}
