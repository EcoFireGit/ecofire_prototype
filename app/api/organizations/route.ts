// app/api/organizations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/utils/auth-utils';
import { OrganizationService } from '@/lib/services/organization.service';
import { UserOrganizationService } from '@/lib/services/userOrganization.service';

const orgService = new OrganizationService();
const userOrgService = new UserOrganizationService();

export async function GET() {
  const authResult = await validateAuth();
  
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  
  // Get the actual user ID, not the view ID
  const userId = authResult.actualUserId;
  
  const orgs = await orgService.getOrganizationsForUser(userId!);
  
  return NextResponse.json({
    success: true,
    data: orgs
  });
}

export async function POST(request: NextRequest) {
  const authResult = await validateAuth();
  
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  
  // Get the actual user ID, not the view ID
  const userId = authResult.actualUserId;
  
  const data = await request.json();
  
  // Create the organization
  const org = await orgService.createOrganization({
    ...data,
    createdBy: userId
  });
  
  // Add the creator as an admin
  await userOrgService.addUserToOrganization(
    userId!, 
    org._id.toString(), 
    'admin'
  );
  
  return NextResponse.json({
    success: true,
    data: org
  });
}