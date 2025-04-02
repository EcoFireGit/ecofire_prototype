// app/api/organizations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/utils/auth-utils';
import { OrganizationService } from '@/lib/services/organization.service';

const orgService = new OrganizationService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await validateAuth();
  
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  
  const org = await orgService.getOrganizationById(params.id);
  
  if (!org) {
    return NextResponse.json(
      { success: false, error: 'Organization not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: org
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await validateAuth();
  
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  
  // Get the actual user ID, not the view ID
  const userId = authResult.actualUserId;
  
  const data = await request.json();
  const updatedOrg = await orgService.updateOrganization(
    params.id, 
    userId!, 
    data
  );
  
  if (!updatedOrg) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Organization not found or you do not have permission to edit it' 
      },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: updatedOrg
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await validateAuth();
  
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  
  // Get the actual user ID, not the view ID
  const userId = authResult.actualUserId;
  
  const deleted = await orgService.deleteOrganization(params.id, userId!);
  
  if (!deleted) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Organization not found or you do not have permission to delete it' 
      },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    message: 'Organization deleted successfully'
  });
}