import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from '@/lib/utils/auth-utils';
import { validateString } from "@/lib/utils/validation-utils";
import ownerService from "@/lib/services/owner.service";
import ValidationError from '../../errors/validation-error';

export async function GET() {
  try {
    const authResult = await validateAuth();
   
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
   
    const userId = authResult.userId;
    const actualUserId = authResult.actualUserId;
    const email = authResult.email;
   
    // Ensure default owner for both personal and organization views
    if (email) {
      // For personal view, use the actual user ID
      if (!authResult.isOrganization) {
        await ownerService.ensureDefaultOwner(actualUserId!, email);
      } 
      // For organization view, use the organization ID (viewId)
      else {
        await ownerService.ensureDefaultOwner(userId!, email);
      }
    }
   
    const owners = await ownerService.getAllOwners(userId!);
    return NextResponse.json(owners);
  } catch (error) {
    console.error("Failed to get owners:", error);
    return NextResponse.json(
      { error: "Failed to get owners" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateAuth();
   
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
   
    const userId = authResult.userId;
    const body = await request.json();
    const { name } = body;
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    await validateData(name);
    const owner = await ownerService.createOwner(name, userId!);
    return NextResponse.json(owner);
  } catch (error) {
    console.error("Failed to create owner:", error);
    if(error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: error.statusCode }
      );
    }    
    return NextResponse.json(
      { error: "Failed to create owner" },
      { status: 500 }
    );
  }
}

async function validateData(name: string) {
  await validateString(name);
  const exists = await ownerService.checkNameExists(name);
  if(exists) {
    throw new ValidationError('Owner name already exists', 400);
  }
}