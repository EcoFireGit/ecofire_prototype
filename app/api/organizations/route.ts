// app/api/organizations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/utils/auth-utils";
import { OrganizationService } from "@/lib/services/organization.service";
import { UserOrganizationService } from "@/lib/services/userOrganization.service";

export async function GET() {
  const authResult = await validateAuth();

  if (!authResult.isAuthorized) {
    return authResult.response;
  }

  // Get the actual user ID, not the view ID
  const userId = authResult.actualUserId;

  const organizationService = new OrganizationService();
  const userOrgService = new UserOrganizationService();
  let organizations = await organizationService.getOrganizationsForUser(
    userId!,
  );

  // For each organization, check the user's role
  const orgsWithRoles = await Promise.all(
    organizations.map(async (org) => {
      const userRole = await userOrgService.getUserRole(
        userId!,
        org._id as string,
      );
      return {
        ...org, // Organization is already a plain object thanks to lean()
        userRole,
      };
    }),
  );

  return NextResponse.json({
    success: true,
    data: orgsWithRoles,
  });
}

export async function POST(request: NextRequest) {
  const authResult = await validateAuth();

  if (!authResult.isAuthorized) {
    return authResult.response;
  }

  // Get the actual user ID, not the view ID
  const userId = authResult.actualUserId;
  const orgService = new OrganizationService();
  const userOrgService = new UserOrganizationService();
  const data = await request.json();

  // Create the organization
  const org = await orgService.createOrganization({
    ...data,
    createdBy: userId,
  });

  // Add the creator as an admin
  await userOrgService.addUserToOrganization(
    userId!,
    org._id.toString(),
    "admin",
    authResult.email!
  );

  return NextResponse.json({
    success: true,
    data: org,
  });
}
