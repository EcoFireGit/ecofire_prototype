
import { NextRequest, NextResponse } from 'next/server';
import { BusinessInfoService } from '@/lib/services/business-info.service';
import { auth } from '@clerk/nextjs/server';

// GET - retrieve businessInfo for the current user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businessInfoService = new BusinessInfoService();
    const businessInfo = await businessInfoService.getBusinessInfo(userId);

    return NextResponse.json(businessInfo || {});
  } catch (error) {
    console.error('Error in GET /api/business-info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businessInfo' },
      { status: 500 }
    );
  }
}

// POST - update businessInfo for the current user
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const businessInfoService = new BusinessInfoService();
    
    const updatedBusinessInfo = await businessInfoService.updateBusinessInfo(userId, data);
    
    return NextResponse.json(updatedBusinessInfo);
  } catch (error) {
    console.error('Error in POST /api/business-info:', error);
    return NextResponse.json(
      { error: 'Failed to update businessInfo' },
      { status: 500 }
    );
  }
}
