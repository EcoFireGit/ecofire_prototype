// route: /api/PIS/:id
// description: Get PI by id
import { NextResponse } from 'next/server';
import { PIService } from '@/lib/services/pi.service';
import { auth } from '@clerk/nextjs/server';

const piService = new PIService();

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
    const pi = await piService.getPIById(params.id, userId);
  
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
    console.error(`Error in GET /api/pis/${params.id}:`, error);
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
    const updatedPI = await piService.updatePI(params.id, userId, updateData);

    if (!updatedPI) {
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
      data: updatedPI
    });
  } catch (error) {
    console.error(`Error in PUT /api/pis/${params.id}:`, error);
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

    const deleted = await piService.deletePI(params.id, userId);

    if (!deleted) {
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
      message: 'PI deleted successfully'
    });
  } catch (error) {
    console.error(`Error in DELETE /api/pis/${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}
