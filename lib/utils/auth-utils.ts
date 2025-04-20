import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { UserOrganizationService } from '@/lib/services/userOrganization.service';

// Cookie name for storing active org
const ACTIVE_ORG_COOKIE = 'ecofire_active_org';

// Create an instance of the service
const userOrgService = new UserOrganizationService();

interface AuthResult {
  isAuthorized: boolean;
  userId?: string;
  actualUserId?: string;
  isOrganization?: boolean;
  email?: string;
  response?: NextResponse;
}

export async function validateAuth(): Promise<AuthResult> {
  try {
    // Get fresh userId from Clerk on every request
    const authResult = await auth();
    const userId = authResult.userId;
  
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
    
    // Get active organization from cookie on every request
    const cookieStore = await cookies();
    const activeOrgCookie = cookieStore.get(ACTIVE_ORG_COOKIE);
    let activeOrgId = userId; // Default to personal view (userId)
    
    if (activeOrgCookie) {
      try {
        // The cookie value could be 'null' for personal view
        const parsed = JSON.parse(activeOrgCookie.value);
        activeOrgId = parsed === null ? userId : parsed;
        
        if (activeOrgId !== userId) {
          // If we have an active org, we need to validate it's still valid
          const hasAccess = await userOrgService.isUserInOrganization(
            userId,
            activeOrgId
          );
          
          if (!hasAccess) {
            activeOrgId = userId;
            cookieStore.set(
              ACTIVE_ORG_COOKIE,
              JSON.stringify(null),
              { path: '/' }
            );
          }
        }
      } catch (e) {
        console.error('Invalid active org cookie:', e);
        activeOrgId = userId; // Reset to personal view
        cookieStore.set(ACTIVE_ORG_COOKIE, JSON.stringify(null), { path: '/' });
      }
    }
    
    // The viewId now depends on the active organization 
    const viewId = activeOrgId !== userId ? activeOrgId : userId;
    
    // Get user info on every request
    const user = await currentUser();
    const primaryEmail = user?.emailAddresses.find(email => email.id === user.primaryEmailAddressId);
    const email = primaryEmail?.emailAddress || '';
    
    // Return the result without caching
    return {
      isAuthorized: true,
      userId: viewId,  // This sets userId to viewId which changes with org
      actualUserId: userId,
      isOrganization: activeOrgId !== userId,
      email
    };
  } catch (error) {
    // Handle rate limiting errors
    if (String(error).toString().includes('Too Many Requests')) {
      console.warn('Rate limited by Clerk API.');
    }
    
    console.error('Auth validation error:', error);
    
    return {
      isAuthorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Authentication service unavailable'
        },
        { status: 503 }
      )
    };
  }
}