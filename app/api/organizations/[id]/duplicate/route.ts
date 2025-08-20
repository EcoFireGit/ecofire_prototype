// app/api/organizations/[id]/duplicate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/utils/auth-utils";
import { OrganizationService } from "@/lib/services/organization.service";

const orgService = new OrganizationService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await validateAuth();

  if (!authResult.isAuthorized) {
    return authResult.response;
  }

  // Get the actual user ID, not the view ID
  const userId = authResult.actualUserId;
  const { id } = await params;

  try {
    const duplicatedOrg = await orgService.duplicateOrganization(id, userId!);

    return NextResponse.json({
      success: true,
      data: duplicatedOrg,
      message: "Organization duplicated successfully",
    });
  } catch (error) {
    console.error("Error duplicating organization:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to duplicate organization",
      },
      { status: 400 },
    );
  }
}
