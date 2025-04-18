import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { UserOrganizationService } from '@/lib/services/userOrganization.service';

// Cookie name for storing active org
const ACTIVE_ORG_COOKIE = 'ecofire_active_org';

// Create an instance of the service
const userOrgService = new UserOrganizationService();

// Auth cache configuration
interface CachedAuthData {
  data: AuthResult;
  expires: number;
}

interface AuthResult {
  isAuthorized: boolean;
  userId?: string;
  actualUserId?: string;
  isOrganization?: boolean;
  email?: string;
  response?: NextResponse;
}

// In-memory cache for auth results
const authCache = new Map<string, CachedAuthData>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Cache for the auth() results - keyed by session identifier
const userIdCache = new Map<string, {userId: string | null, expires: number}>();
const AUTH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache for basic auth

export async function validateAuth(): Promise<AuthResult> {
  try {
    // Try to get userId from the request headers/cookies for cache key
    const requestId = await getRequestIdentifier();
    let userId: string | null = null;
    
    // Check if we have the userId cached
    const cachedUserId = userIdCache.get(requestId);
    if (cachedUserId && cachedUserId.expires > Date.now()) {
      userId = cachedUserId.userId;
    } else {
      // Get fresh userId from Clerk
      const authResult = await auth();
      userId = authResult.userId;
      
      // Cache the userId result
      userIdCache.set(requestId, {
        userId,
        expires: Date.now() + AUTH_CACHE_TTL
      });
      
      // Clean up old cache entries periodically
      cleanupUserIdCache();
    }
  
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
    
    // Get active organization from cookie - we need to check this on every request
    // to ensure we have the latest organization selection
    const cookieStore = await cookies();
    const activeOrgCookie = cookieStore.get(ACTIVE_ORG_COOKIE);
    let activeOrgId = userId; // Default to personal view (userId)
    
    if (activeOrgCookie) {
      try {
        // The cookie value could be 'null' for personal view
        const parsed = JSON.parse(activeOrgCookie.value);
        activeOrgId = parsed === null ? null : parsed;
        
        if (activeOrgId) {
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
    
    // The viewId (which will be used as the cacheKey) depends on the active organization
    const viewId = activeOrgId || userId;
    const cacheKey = `${userId}:${viewId}`;  // Include both userId and viewId in the cache key
    
    // Check if we have a cached auth result for this specific user+view combination
    const cachedValue = authCache.get(cacheKey);
    if (cachedValue && cachedValue.expires > Date.now()) {
      // Return cached auth data if still valid
      return cachedValue.data;
    }
    
    // Cache miss or expired, proceed with normal flow to get user info
    const user = await currentUser();
    const primaryEmail = user?.emailAddresses.find(email => email.id === user.primaryEmailAddressId);
    const email = primaryEmail?.emailAddress || '';
    
    // Prepare the result
    const result: AuthResult = {
      isAuthorized: true,
      userId: viewId,  // This is the key - we set userId to viewId which changes with org
      actualUserId: userId,
      isOrganization: !!activeOrgId,
      email
    };
    
    // Cache the result with the combined key
    authCache.set(cacheKey, {
      data: result,
      expires: Date.now() + CACHE_TTL
    });
    
    return result;
  } catch (error) {
    // Handle rate limiting errors
    if (String(error).toString().includes('Too Many Requests')) {
      console.warn('Rate limited by Clerk API. Consider implementing backoff or increasing cache TTL.');
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

// Helper function to get a unique identifier for the current request
// This uses the headers/cookies to create a stable identifier
async function getRequestIdentifier(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    // Use the session cookie or a combination of cookies as the identifier
    const clerkSession = allCookies.find(c => c.name.includes('__clerk_session'));
    return clerkSession?.value || 'default-session';
  } catch (error) {
    console.warn('Error creating request identifier:', error);
    return 'fallback-identifier';
  }
}

// Cleanup function to prevent memory leaks
function cleanupUserIdCache(): void {
  const now = Date.now();
  // Only run cleanup occasionally (1% chance per request)
  if (Math.random() > 0.01) return;
  
  userIdCache.forEach((value, key) => {
    if (value.expires < now) {
      userIdCache.delete(key);
    }
  });
}

// Optional: Function to clear all auth caches
export function clearAllAuthCache(): void {
  authCache.clear();
  userIdCache.clear();
}