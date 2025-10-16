import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/utils/auth-utils";
import { clerkClient } from '@clerk/nextjs/server';
import { UserOrganizationService } from '@/lib/services/userOrganization.service';

export async function GET() {
  try {
    const authResult = await validateAuth();
    if (!authResult.isAuthorized) {
      return authResult.response;
    }

    const userId = authResult.userId!;
    const userOrgService = new UserOrganizationService();

    // If we're in personal view (not organization), only return the current user
    if (!authResult.isOrganization) {
      const response = await (await clerkClient()).users.getUser(authResult.actualUserId!);
      
      const users = [{
        id: response.id,
        email: response.emailAddresses[0]?.emailAddress || '',
        firstName: response.firstName || '',
        lastName: response.lastName || '',
        fullName: `${response.firstName || ''} ${response.lastName || ''}`.trim() || response.emailAddresses[0]?.emailAddress || response.id
      }];

      return NextResponse.json(users);
    }

    // For organization view, get all users in the organization
    const orgUsers = await userOrgService.getUsersInOrganization(userId);
    const userIds = orgUsers.map(userOrg => userOrg.userId);

    // Fetch user details from Clerk for each user in the organization
    const users = [];
    for (const clerkUserId of userIds) {
      try {
        const user = await (await clerkClient()).users.getUser(clerkUserId);
        users.push({
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || user.id
        });
      } catch (userError) {
        console.warn(`Failed to fetch user ${clerkUserId}:`, userError);
        // Skip users that can't be fetched (they might have been deleted from Clerk)
      }
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to get users:", error);
    return NextResponse.json(
      { error: "Failed to get users" },
      { status: 500 }
    );
  }
}