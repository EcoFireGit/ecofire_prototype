import { InviteUsersService } from '@/lib/services/invite-users.service';
import { ClerkProviderService } from '@/lib/services/clerk-provider.service';
import { NextResponse, NextRequest } from 'next/server';
import { validateAuth } from "@/lib/utils/auth-utils";
import { UserOrganizationService } from '@/lib/services/userOrganization.service';

const userOrgService = new UserOrganizationService();

export async function POST(request: Request,
  { params }: { params: Promise<{ id: string }> }) {
    

  const { id } = await params

    // Get user ID from auth
    const authResult = await validateAuth();
      
    if (!authResult.isAuthorized) {
        return authResult.response;
    }
    const userId = authResult.actualUserId;  

    const userRole = await userOrgService.getUserRole(userId!, id);
    if (userRole !== 'admin') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You do not have permissions to invite users to this organization' 
        },
        { status: 403 }
      );
    }

    const { email, role } = await request.json();

    // Validate email
    if (!email ) {
        return NextResponse.json(
              {
                success: false,
                error: 'Email is required'
              },
              { status: 400 }
            );
    }

    try {

        //create invitation in DB

          const inviteUserService = new InviteUsersService();
          const inviteUser = await inviteUserService.createInviteUser(userId!, email, id);

          // Create an invitation for the user
          const clerkProviderService = new ClerkProviderService();
          const invitation = await clerkProviderService.inviteUser(userId!, email, id, role);
          return   NextResponse.json(
                {
                  success: true,
                  message: 'Invitation sent successfully!',
                },
                { status: 200 }
              );
          
      } catch (error) {
        console.error('Error inviting user:', error);
        return   NextResponse.json(
              {
                message: 'Error inviting user',
              },
              { status: 500 }
            );
    }

}
