import { NextRequest, NextResponse } from "next/server";
import { PIQBOMappingService } from "@/lib/services/pi-qbo-mapping.service";
import { auth } from '@clerk/nextjs/server';
import { updateJobImpactValues } from '@/lib/services/job-impact.service';

const mappingService = new PIQBOMappingService();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
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
    
    const mapping = await mappingService.getMappingById(params.id, userId);
    
    if (!mapping) {
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
      data: mapping
    });
  } catch (error) {
    console.error(`Error in GET /api/pi-qbo-mappings/${params.id}:`, error);
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
    // Get authenticated user
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
    const updatedMapping = await mappingService.updateMapping(params.id, userId, updateData);
    
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
    console.error(`Error in PUT /api/pi-qbo-mappings/${params.id}:`, error);
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
    // Get authenticated user
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
    
    const deleted = await mappingService.deleteMapping(params.id, userId);
    
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
    console.error(`Error in DELETE /api/pi-qbo-mappings/${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}