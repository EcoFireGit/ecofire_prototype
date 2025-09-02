import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Note from "@/lib/models/note.model";
import { validateAuth } from "@/lib/utils/auth-utils";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const authResult = await validateAuth();
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  // Notes are user-private and org-scoped
  const userId = authResult.actualUserId;
  const organizationId = authResult.isOrganization ? authResult.userId! : null;
  const { id } = await params;
  // Build query based on org context
  const query: any = { _id: id, userId };
  if (organizationId) {
    query.organizationId = organizationId;
  } else {
    query.$or = [
      { organizationId: null },
      { organizationId: { $exists: false } }
    ];
  }
  const note = await Note.findOne(query);
  if (!note) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: note });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const authResult = await validateAuth();
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  // Notes are user-private and org-scoped
  const userId = authResult.actualUserId;
  const organizationId = authResult.isOrganization ? authResult.userId! : null;
  const { id } = await params;
  const { title, content } = await req.json();

  // Build query based on org context
  const query: any = { _id: id, userId };
  if (organizationId) {
    query.organizationId = organizationId;
  } else {
    query.$or = [
      { organizationId: null },
      { organizationId: { $exists: false } }
    ];
  }

  const existingNote = await Note.findOne(query);
  if (!existingNote) {
    return NextResponse.json({ success: false, error: "Note not found or not authorized" }, { status: 404 });
  }

  if (existingNote.title === title && existingNote.content === content) {
    return NextResponse.json({ success: true, data: existingNote });
  }

  const note = await Note.findOneAndUpdate(
    query,
    { title, content },
    { new: true }
  );
  if (!note) {
    return NextResponse.json({ success: false, error: "Note not found or not authorized" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: note });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const authResult = await validateAuth();
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  // Notes are user-private and org-scoped
  const userId = authResult.actualUserId;
  const organizationId = authResult.isOrganization ? authResult.userId! : null;
  const { id } = await params;
  // Build query based on org context
  const query: any = { _id: id, userId };
  if (organizationId) {
    query.organizationId = organizationId;
  } else {
    query.$or = [
      { organizationId: null },
      { organizationId: { $exists: false } }
    ];
  }
  const note = await Note.findOneAndDelete(query);
  if (!note) {
    return NextResponse.json({ success: false, error: "Note not found or not authorized" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
} 