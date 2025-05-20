import { InviteUsersService } from '@/lib/services/invite-users.service';
import clerk from '@clerk/clerk-sdk-node';
import { NextResponse, NextRequest } from 'next/server';
import { validateAuth } from "@/lib/utils/auth-utils";

export async function POST(request: Request) {
    const data = await request.json();

    // Get user ID from auth
    const authResult = await validateAuth();
      
    if (!authResult.isAuthorized) {
        return authResult.response;
    }
    
    const userId = authResult.userId;  
    // Validate email
    if (!data.email ) {
        return NextResponse.json(
              {
                success: false,
                error: 'Email is required'
              },
              { status: 400 }
            );
    }
    const { email } = data;

    try {

        //create invitation in DB

          const inviteUserService = new InviteUsersService();
          const inviteUser = await inviteUserService.createInviteUser(userId!, email, data.orgId);
        const invite_redirect_url = 'http://localhost:3000/sign-up';
        // Create an invitation for the user
        const invitation = await clerk.invitations.createInvitation({
            emailAddress: email,   // User's email address
            redirectUrl: `${invite_redirect_url}?orgId=${data.orgId}`,  // Custom redirect URL after accepting the invitation
        });

        console.log('Invitation sent successfully!', invitation);

        return NextResponse.json(
              {
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
