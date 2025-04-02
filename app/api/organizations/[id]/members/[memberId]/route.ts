// app/api/organizations/[id]/members/[memberId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/utils/auth-utils';
import { UserOrganizationService } from '@/lib/services/userOrganization.service';
import UserOrganization from '@/lib/models/userOrganization.model';

const userOrgService = new UserOrganizationService();

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; memberId: string }> }
  ) {
    const authResult = await validateAuth();
    const { id, memberId } = await params
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    // Get the actual user ID, not the view ID
    const userId = authResult.actualUserId;
    
    // Check if user is an admin of this organization
    const userRole = await userOrgService.getUserRole(userId!, id);
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You do not have permission to remove members from this organization' 
        },
        { status: 403 }
      );
    }
    
    // Delete by UserOrganization document ID
    const removed = await UserOrganization.findByIdAndDelete(memberId);
    
    if (!removed) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    });
  }
  
  export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; memberId: string }> }
  ) {
    const authResult = await validateAuth();
    const { id, memberId } = await params;
    
    if (!authResult.isAuthorized) {
      return authResult.response;
    }
    
    // Get the actual user ID, not the view ID
    const userId = authResult.actualUserId;
    
    // Check if user is an admin of this organization
    const userRole = await userOrgService.getUserRole(userId!, id);
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to update member roles in this organization'
        },
        { status: 403 }
      );
    }
    
    const { role } = await request.json();
    
    if (role !== 'admin' && role !== 'member') {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }
    
    // Also update the service method to accept just the document ID
    const updated = await userOrgService.updateUserRole(memberId, role);
    
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updated
    });
  }