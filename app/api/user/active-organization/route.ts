// app/api/user/active-organization/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { UserOrganizationService } from '@/lib/services/userOrganization.service';

const ACTIVE_ORG_COOKIE = 'ecofire_active_org';
const userOrgService = new UserOrganizationService();

export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const cookieStore = await cookies();
  const activeOrgCookie = cookieStore.get(ACTIVE_ORG_COOKIE);
  let organizationId = null;
  
  if (activeOrgCookie) {
    try {
      organizationId = JSON.parse(activeOrgCookie.value);
    } catch (e) {
      console.error('Invalid active org cookie:', e);
    }
  }
  
  return NextResponse.json({
    success: true,
    organizationId
  });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const { organizationId } = await request.json();
  const cookieStore = await cookies();
  
  // If setting to null (personal view)
  if (organizationId === null) {
    cookieStore.set(ACTIVE_ORG_COOKIE, JSON.stringify(null), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    return NextResponse.json({ success: true });
  }
  
  // Verify user has access to this organization
  const hasAccess = await userOrgService.isUserInOrganization(
    userId, 
    organizationId
  );
  
  if (!hasAccess) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized access to organization' },
      { status: 403 }
    );
  }
  
  // Set the active organization in a cookie
  cookieStore.set(ACTIVE_ORG_COOKIE, JSON.stringify(organizationId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  
  return NextResponse.json({ success: true });
}