import clerk from '@clerk/clerk-sdk-node';
import { NextResponse, NextRequest } from 'next/server';

// Set your redirect URL where users will be redirected after accepting the invitation
// const invite_redirect_url = `${process.env.NEXT_PUBLIC_SERVER_URL}/sign-up`;
const invite_redirect_url = `http://localhost:3000/sign-up`;

export async function POST(request: Request) {
  const data = await request.json();

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
