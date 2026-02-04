// app/api/clerk/webhook/route.ts
import { clerkClient } from '@clerk/nextjs/server';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { InviteUsersService } from '@/lib/services/invite-users.service';

export async function POST(req: Request) {
  const event: WebhookEvent = await req.json();
    console.log('Received event from clerk:', event);

  if (event.type === 'user.created') {

    const userId = event.data.id;
    const email = event.data.email_addresses[0]?.email_address;

    // Use a service or DB lookup to find metadata associated with this email
    const inviteUserService = new InviteUsersService();
    const inviteUser = await inviteUserService.acceptInvite(email!);
    console.log('Accepted invitation for email:', email);
  }

  return NextResponse.json({ received: true });
}
