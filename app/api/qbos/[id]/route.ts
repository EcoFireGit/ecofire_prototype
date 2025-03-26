// app/api/qbos/[id]/route.ts
// description: Get, update, delete QBO by id

import { NextResponse } from 'next/server';
import { QBOService } from '@/lib/services/qbo.service';
import { auth } from '@clerk/nextjs/server';
import { updateJobImpactValues } from '@/lib/services/job-impact.service';

const qboService = new QBOService();

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
    const qbo = await qboService.getQBOById(params.id, userId);
 
    if (!qbo) {
      return NextResponse.json(
        {
          success: false,
          error: 'QBO not found'
        },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: qbo
    });
  } catch (error) {
    console.error(`Error in GET /api/qbos/${params.id}:`, error);
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
    const updatedQBO = await qboService.updateQBO(params.id, userId, updateData);
    if (!updatedQBO) {
      return NextResponse.json(
        {
          success: false,
          error: 'QBO not found'
        },
        { status: 404 }
      );
    }
    await updateJobImpactValues(userId);
    return NextResponse.json({
      success: true,
      data: updatedQBO
    });
  } catch (error) {
    console.error(`Error in PUT /api/qbos/${params.id}:`, error);
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
    const deleted = await qboService.deleteQBO(params.id, userId);
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'QBO not found'
        },
        { status: 404 }
      );
    }
    await updateJobImpactValues(userId);
    return NextResponse.json({
      success: true,
      message: 'QBO deleted successfully'
    });
  } catch (error) {
    console.error(`Error in DELETE /api/qbos/${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}