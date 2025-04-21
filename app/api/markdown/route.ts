
import { NextResponse } from "next/server";
import { markdownToHtml } from "@/lib/utils/markdown";

export async function POST(request: Request) {
  try {
    const { markdown } = await request.json();
    
    if (!markdown) {
      return NextResponse.json(
        { error: "Markdown content is required" },
        { status: 400 }
      );
    }

    const html = await markdownToHtml(markdown);
    
    return NextResponse.json({ html });
  } catch (error) {
    console.error("Error processing markdown:", error);
    return NextResponse.json(
      { error: "Failed to process markdown" },
      { status: 500 }
    );
  }
}
