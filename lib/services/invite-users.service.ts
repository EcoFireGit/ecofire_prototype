
import dbConnect from "../mongodb";
import InviteUser from "../models/invite-users.model";

export class InviteUsersService {
  async createInviteUser(userId :string, email: string, orgId: string) {
    await dbConnect();
    
    const invitation = await InviteUser.findOne({ email: email, organizationId: orgId });
    if (invitation) {
        console.log('Invite already exists');
        return null;
    }
    
    return await InviteUser.create({
      email,
      organizationId: orgId,
      hasAccepted: false,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  async acceptInvite(email: string) {
    await dbConnect();
    const invitation = await InviteUser.findOne({ email: email, hasAccepted: false });
    if (invitation) {
      invitation.hasAccepted = true;
      return await invitation.save();
    }
    return null;
  }
}
