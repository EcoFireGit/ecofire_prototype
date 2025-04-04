// lib/utils/auth-utils.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { UserOrganizationService } from '@/lib/services/userOrganization.service';

// Cookie name for storing active org
const ACTIVE_ORG_COOKIE = 'ecofire_active_org';

// Create an instance of the service
const userOrgService = new UserOrganizationService();

export async function validateAuth() {
  const { userId } = await auth();
 
  if (!userId) {
    return {
      isAuthorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      )
    };
  }

  // Get active organization from cookie (fast, no DB call)
  const cookieStore = await cookies();
  const activeOrgCookie = cookieStore.get(ACTIVE_ORG_COOKIE);
  let activeOrgId = null;
  
  if (activeOrgCookie) {
    try {
      // The cookie value could be 'null' for personal view
      const parsed = JSON.parse(activeOrgCookie.value);
      activeOrgId = parsed === null ? null : parsed;
      
      // If we have an active org, do a quick verification (optional)
      // This adds a DB call but ensures security if the cookie was tampered with
      if (activeOrgId) {
        const hasAccess = await userOrgService.isUserInOrganization(
          userId, 
          activeOrgId
        );
        
        if (!hasAccess) {
          // Reset to personal view if user doesn't have access
          activeOrgId = null;
          cookieStore.set(
            ACTIVE_ORG_COOKIE, 
            JSON.stringify(null), 
            { path: '/' }
          );
        }
      }
    } catch (e) {
      // Invalid cookie, ignore and reset to null
      console.error('Invalid active org cookie:', e);
      activeOrgId = null;
      cookieStore.set(ACTIVE_ORG_COOKIE, JSON.stringify(null), { path: '/' });
    }
  }
  
  // If there's an active org, use that as the viewId
  const viewId = activeOrgId || userId;
 
  return {
    isAuthorized: true,
    userId: viewId,
    actualUserId: userId,
    isOrganization: !!activeOrgId
  };
}