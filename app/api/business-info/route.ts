
import { NextRequest, NextResponse } from 'next/server';
import { BusinessInfoService } from '@/lib/services/business-info.service';
import { validateAuth } from '@/lib/utils/auth-utils';

// GET - retrieve businessInfo for the current user
export async function GET() {
  try {
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;

    const businessInfoService = new BusinessInfoService();
    const businessInfo = await businessInfoService.getBusinessInfo(userId!);

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
    const authResult = await validateAuth();
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    const userId = authResult.userId;

    const data = await req.json();
    const businessInfoService = new BusinessInfoService();
    
    const updatedBusinessInfo = await businessInfoService.updateBusinessInfo(userId!, data);
    
    return NextResponse.json(updatedBusinessInfo);
  } catch (error) {
    console.error('Error in POST /api/business-info:', error);
    return NextResponse.json(
      { error: 'Failed to update businessInfo' },
      { status: 500 }
    );
  }
}
