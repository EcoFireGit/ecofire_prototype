// app/api/organizations/[id]/members/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/utils/auth-utils';
import { UserOrganizationService } from '@/lib/services/userOrganization.service';

const userOrgService = new UserOrganizationService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await validateAuth();
  
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  
  const members = await userOrgService.getUsersInOrganization(params.id);
  
  return NextResponse.json({
    success: true,
    data: members
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await validateAuth();
  
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  
  // Get the actual user ID, not the view ID
  const userId = authResult.actualUserId;
  
  // Check if user is an admin of this organization
  const userRole = await userOrgService.getUserRole(userId!, params.id);
  
  if (userRole !== 'admin') {
    return NextResponse.json(
      { 
        success: false, 
        error: 'You do not have permission to add members to this organization' 
      },
      { status: 403 }
    );
  }
  
  const { memberId, role } = await request.json();
  
  const member = await userOrgService.addUserToOrganization(
    memberId, 
    params.id, 
    role
  );
  
  return NextResponse.json({
    success: true,
    data: member
  });
}