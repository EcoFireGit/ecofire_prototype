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
  console.log('GET Notes - userId:', userId, 'organizationId:', organizationId, 'isOrganization:', authResult.isOrganization);
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
  console.log('GET Notes - query:', JSON.stringify(query));
  const notes = await Note.find(query).sort({ updatedAt: -1 });
  console.log('GET Notes - found:', notes.length);
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
  console.log('POST Notes - userId:', userId, 'organizationId:', organizationId, 'isOrganization:', authResult.isOrganization);
  let { title, content } = await req.json();
  console.log('POST Notes - title:', title, 'content length:', content?.length);
  if (title == null) title = "";
  if (content == null) content = "";
  if (!title && !content) {
    console.log('POST Notes - validation failed: no title or content');
    return NextResponse.json({ success: false, error: "Title or content is required" }, { status: 400 });
  }
  const noteData: any = { userId, title, content };
  if (organizationId) {
    noteData.organizationId = organizationId;
  }
  console.log('POST Notes - creating note with data:', JSON.stringify(noteData));
  try {
    const note = await Note.create(noteData);
    console.log('POST Notes - created successfully:', note._id);
    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    console.error('POST Notes - error creating note:', error);
    return NextResponse.json({ success: false, error: "Failed to create note" }, { status: 500 });
  }
} 