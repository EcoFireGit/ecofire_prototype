import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Note from "@/lib/models/note.model";
import { validateAuth } from "@/lib/utils/auth-utils";

export async function GET(req: NextRequest) {
  await dbConnect();
  const authResult = await validateAuth();
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  // Notes are user-private and org-scoped
  const userId = authResult.actualUserId;
  const organizationId = authResult.isOrganization ? authResult.userId! : null;

  // Build query based on org context
  const query: any = { userId };
  if (organizationId) {
    query.organizationId = organizationId;
  } else {
    query.$or = [
      { organizationId: null },
      { organizationId: { $exists: false } }
    ];
  }
  const notes = await Note.find(query).sort({ updatedAt: -1 });
  return NextResponse.json({ success: true, data: notes });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const authResult = await validateAuth();
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  // Notes are user-private and org-scoped
  const userId = authResult.actualUserId;
  const organizationId = authResult.isOrganization ? authResult.userId! : null;
  let { title, content } = await req.json();
  if (title == null) title = "";
  if (content == null) content = "";
  if (!title && !content) {
    return NextResponse.json({ success: false, error: "Title or content is required" }, { status: 400 });
  }
  const noteData: any = { userId, title, content };
  if (organizationId) {
    noteData.organizationId = organizationId;
  }
  try {
    const note = await Note.create(noteData);
    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create note" }, { status: 500 });
  }
} 