// lib/services/organization.service.ts
import Organization, {
  Organization as OrganizationType,
} from "@/lib/models/organization.model";
import UserOrganization from "@/lib/models/userOrganization.model";
import Job from "@/lib/models/job.model";
import Task from "@/lib/models/task.model";
import BusinessFunction from "@/lib/models/business-function.model";
import Owner from "@/lib/models/owner.model";
import QBO from "@/lib/models/qbo.model";
import PI from "@/lib/models/pi.model";
import PIJobMapping from "@/lib/models/pi-job-mapping.model";
import PIQBOMapping from "@/lib/models/pi-qbo-mapping.model";
import BusinessInfo from "@/lib/models/business-info.model";
import Note from "@/lib/models/note.model";
import TaskTag from "@/lib/models/task-tag.model";
import Chat from "@/lib/models/chat.model";
import dbConnect from "../mongodb";

export class OrganizationService {
  async getOrganizationById(id: string) {
    await dbConnect();
    return await Organization.findOne({ _id: id, isDeleted: { $ne: true } });
  }

  async getOrganizationsForUser(userId: string) {
    await dbConnect();
    const userOrgs = await UserOrganization.find({ userId });
    const orgIds = userOrgs.map((userOrg) => userOrg.organizationId);

    if (orgIds.length === 0) {
      return [];
    }

    return await Organization.find({
      _id: { $in: orgIds },
      isDeleted: { $ne: true },
    }).lean(); // Using lean() to get plain JavaScript objects
  }

  async createOrganization(data: Partial<OrganizationType>) {
    await dbConnect();
    const organization = new Organization(data);
    return await organization.save();
  }

  async updateOrganization(
    id: string,
    userId: string,
    data: Partial<OrganizationType>,
  ) {
    await dbConnect();
    const userOrg = await UserOrganization.findOne({
      userId,
      organizationId: id,
      role: "admin",
    });

    if (!userOrg) return null;

    return await Organization.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true },
    );
  }

  async deleteOrganization(id: string, userId: string) {
    await dbConnect();
    const userOrg = await UserOrganization.findOne({
      userId,
      organizationId: id,
      role: "admin",
    });

    if (!userOrg) return false;

    const result = await Organization.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true },
    );

    return !!result;
  }

  async duplicateOrganization(originalOrgId: string, userId: string) {
    await dbConnect();
    
    // Check if user has admin access to the original organization
    const userOrg = await UserOrganization.findOne({
      userId,
      organizationId: originalOrgId,
      role: "admin",
    });

    if (!userOrg) {
      throw new Error("You don't have permission to duplicate this organization");
    }

    // Get the original organization
    const originalOrg = await Organization.findById(originalOrgId);
    if (!originalOrg) {
      throw new Error("Original organization not found");
    }

    // Create new organization with smart naming (like file systems)
    let newOrgName = `${originalOrg.name} copy`;
    let counter = 1;
    
    // Check if the name already exists and increment counter if needed
    while (await Organization.findOne({ name: newOrgName, isDeleted: { $ne: true } })) {
      newOrgName = `${originalOrg.name} copy (${counter})`;
      counter++;
    }
    
    const newOrg = new Organization({
      name: newOrgName,
      description: originalOrg.description,
      createdBy: userId,
    });
    const savedNewOrg = await newOrg.save();

    // Add user as admin to the new organization
    await UserOrganization.create({
      userId,
      organizationId: savedNewOrg._id.toString(),
      role: "admin",
    });

    // Get all users in the original organization to add them to the new one
    const originalOrgUsers = await UserOrganization.find({
      organizationId: originalOrgId,
    });

    // Add all users from original org to new org (except the current user who's already added)
    for (const userOrg of originalOrgUsers) {
      if (userOrg.userId !== userId) {
        await UserOrganization.create({
          userId: userOrg.userId,
          organizationId: savedNewOrg._id.toString(),
          role: userOrg.role,
        });
      }
    }

    // Duplicate business info
    const businessInfo = await BusinessInfo.findOne({ userId: originalOrgId });
    if (businessInfo) {
      await BusinessInfo.create({
        name: businessInfo.name,
        industry: businessInfo.industry,
        missionStatement: businessInfo.missionStatement,
        monthsInBusiness: businessInfo.monthsInBusiness,
        annualRevenue: businessInfo.annualRevenue,
        growthStage: businessInfo.growthStage,
        userId: savedNewOrg._id.toString(),
      });
    }

    // Duplicate business functions first
    const businessFunctions = await BusinessFunction.find({ userId: originalOrgId });
    const businessFunctionMap = new Map();
    
    for (const bf of businessFunctions) {
      const newBf = new BusinessFunction({
        name: bf.name,
        userId: savedNewOrg._id.toString(),
        isDefault: bf.isDefault,
        isHidden: bf.isHidden,
      });
      const savedBf = await newBf.save();
      businessFunctionMap.set(bf._id.toString(), savedBf._id.toString());
    }

    // Duplicate owners
    const owners = await Owner.find({ userId: originalOrgId });
    const ownerMap = new Map();
    
    for (const owner of owners) {
      const newOwner = new Owner({
        name: owner.name,
        userId: savedNewOrg._id.toString(),
      });
      const savedOwner = await newOwner.save();
      ownerMap.set(owner._id.toString(), savedOwner._id.toString());
    }

    // Duplicate PIs
    const pis = await PI.find({ userId: originalOrgId });
    const piMap = new Map();
    
    for (const pi of pis) {
      const newPi = new PI({
        name: pi.name,
        unit: pi.unit,
        beginningValue: pi.beginningValue,
        targetValue: pi.targetValue,
        deadline: pi.deadline,
        notes: pi.notes,
        userId: savedNewOrg._id.toString(),
      });
      const savedPi = await newPi.save();
      piMap.set(pi._id.toString(), savedPi._id.toString());
    }

    // Duplicate QBOs
    const qbos = await QBO.find({ userId: originalOrgId });
    const qboMap = new Map();
    
    for (const qbo of qbos) {
      const newQbo = new QBO({
        name: qbo.name,
        unit: qbo.unit,
        beginningValue: qbo.beginningValue,
        currentValue: qbo.currentValue,
        targetValue: qbo.targetValue,
        deadline: qbo.deadline,
        points: qbo.points,
        notes: qbo.notes,
        userId: savedNewOrg._id.toString(),
      });
      const savedQbo = await newQbo.save();
      qboMap.set(qbo._id.toString(), savedQbo._id.toString());
    }

    // Duplicate jobs with preserved completion status
    const originalJobs = await Job.find({ userId: originalOrgId, isDeleted: { $ne: true } });
    const jobMap = new Map();
    
    for (const job of originalJobs) {
      const newBusinessFunctionId = businessFunctionMap.get(job.businessFunctionId) || job.businessFunctionId;
      
      const newJob = new Job({
        title: job.title,
        notes: job.notes,
        businessFunctionId: newBusinessFunctionId,
        userId: savedNewOrg._id.toString(),
        dueDate: job.dueDate,
        createdDate: job.createdDate,
        isDone: job.isDone, // Preserve completion status
        impact: job.impact,
        isDeleted: false,
        jobNumber: job.jobNumber,
        isRecurring: job.isRecurring,
        recurrenceInterval: job.recurrenceInterval,
      });
      const savedJob = await newJob.save();
      jobMap.set(job._id.toString(), savedJob._id.toString());
    }

    // Duplicate tasks with preserved completion status and My Day assignments
    const originalTasks = await Task.find({ userId: originalOrgId, isDeleted: { $ne: true } });
    
    for (const task of originalTasks) {
      const newJobId = jobMap.get(task.jobId);
      if (!newJobId) continue; // Skip if job wasn't duplicated
      
      const newOwner = task.owner ? ownerMap.get(task.owner) : undefined;
      
      const newTask = new Task({
        title: task.title,
        owner: newOwner,
        date: task.date,
        requiredHours: task.requiredHours,
        focusLevel: task.focusLevel,
        joyLevel: task.joyLevel,
        notes: task.notes,
        tags: task.tags,
        jobId: newJobId,
        userId: savedNewOrg._id.toString(),
        completed: task.completed, // Preserve completion status
        isDeleted: false,
        createdDate: task.createdDate,
        endDate: task.endDate,
        timeElapsed: task.timeElapsed,
        isRecurring: task.isRecurring,
        recurrenceInterval: task.recurrenceInterval,
        myDay: task.myDay, // Preserve My Day status
        myDayDate: task.myDayDate, // Preserve My Day date
      });
      
      await newTask.save();
    }

    // Duplicate PI-Job mappings
    const piJobMappings = await PIJobMapping.find({ userId: originalOrgId });
    for (const mapping of piJobMappings) {
      const newJobId = jobMap.get(mapping.jobId);
      const newPiId = piMap.get(mapping.piId);
      
      if (newJobId && newPiId) {
        await PIJobMapping.create({
          jobId: newJobId,
          piId: newPiId,
          jobName: mapping.jobName,
          piName: mapping.piName,
          piImpactValue: mapping.piImpactValue,
          piTarget: mapping.piTarget,
          notes: mapping.notes,
          userId: savedNewOrg._id.toString(),
        });
      }
    }

    // Duplicate PI-QBO mappings
    const piQboMappings = await PIQBOMapping.find({ userId: originalOrgId });
    for (const mapping of piQboMappings) {
      const newPiId = piMap.get(mapping.piId);
      const newQboId = qboMap.get(mapping.qboId);
      
      if (newPiId && newQboId) {
        await PIQBOMapping.create({
          piId: newPiId,
          qboId: newQboId,
          piName: mapping.piName,
          qboName: mapping.qboName,
          piTarget: mapping.piTarget,
          qboTarget: mapping.qboTarget,
          qboImpact: mapping.qboImpact,
          notes: mapping.notes,
          userId: savedNewOrg._id.toString(),
        });
      }
    }

    // Duplicate notes
    const notes = await Note.find({ userId: originalOrgId });
    for (const note of notes) {
      await Note.create({
        title: note.title,
        content: note.content,
        userId: savedNewOrg._id.toString(),
      });
    }

    // Duplicate task tags
    const taskTags = await TaskTag.find({ userId: originalOrgId });
    for (const tag of taskTags) {
      await TaskTag.create({
        name: tag.name,
        userId: savedNewOrg._id.toString(),
      });
    }

    // Duplicate chat history
    const chats = await Chat.find({ userId: originalOrgId });
    for (const chat of chats) {
      await Chat.create({
        userId: savedNewOrg._id.toString(),
        chatId: chat.chatId,
        messages: chat.messages,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return savedNewOrg;
  }
}
