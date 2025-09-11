import { InviteUsersService } from '@/lib/services/invite-users.service';
import clerk from '@clerk/clerk-sdk-node';
import { NextResponse, NextRequest } from 'next/server';
import { validateAuth } from "@/lib/utils/auth-utils";

export class ClerkProviderService {

    async  inviteUser(userId: string, email: string, orgId: string, role: string) {
        
        try {
            // Create an invitation for the user
            const invitation = await clerk.invitations.createInvitation({
                emailAddress: email,   // User's email address
                publicMetadata: { orgId: orgId, role: role},
                notify: true
            });

            console.log('Invitation sent successfully!', invitation);

        } catch (error) {
            console.error('Error inviting user:', error);
            throw error;
        }

    }
    async  resetPublicMetadata(userId: string) {
        
        try {

            const user = await clerk.users.updateUserMetadata(userId, {
                publicMetadata: {
                    orgId: null,
                    role: null
                },
            });
            return ;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }

    }
}