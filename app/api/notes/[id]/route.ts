import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Note from "@/lib/models/note.model";
import { validateAuth } from "@/lib/utils/auth-utils";

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  await dbConnect();
  const authResult = await validateAuth();
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  const userId = authResult.userId;
  const note = await Note.findOne({ _id: context.params.id, userId });
  if (!note) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: note });
}

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  await dbConnect();
  const authResult = await validateAuth();
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  const userId = authResult.userId;
  const { title, content } = await req.json();

  const existingNote = await Note.findOne({ _id: context.params.id, userId });
  if (!existingNote) {
    return NextResponse.json({ success: false, error: "Note not found or not authorized" }, { status: 404 });
  }

  if (existingNote.title === title && existingNote.content === content) {
    return NextResponse.json({ success: true, data: existingNote });
  }

  const note = await Note.findOneAndUpdate(
    { _id: context.params.id, userId },
    { title, content },
    { new: true }
  );
  if (!note) {
    return NextResponse.json({ success: false, error: "Note not found or not authorized" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: note });
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  await dbConnect();
  const authResult = await validateAuth();
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  const userId = authResult.userId;
  const note = await Note.findOneAndDelete({ _id: context.params.id, userId });
  if (!note) {
    return NextResponse.json({ success: false, error: "Note not found or not authorized" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
} 