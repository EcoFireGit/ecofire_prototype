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
  const userId = authResult.userId;
  const notes = await Note.find({ userId }).sort({ updatedAt: -1 });
  return NextResponse.json({ success: true, data: notes });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const authResult = await validateAuth();
  if (!authResult.isAuthorized) {
    return authResult.response;
  }
  const userId = authResult.userId;
  let { title, content } = await req.json();
  if (title == null) title = "";
  if (content == null) content = "";
  if (!title && !content) {
    return NextResponse.json({ success: false, error: "Title or content is required" }, { status: 400 });
  }
  const note = await Note.create({ userId, title, content });
  return NextResponse.json({ success: true, data: note });
} 