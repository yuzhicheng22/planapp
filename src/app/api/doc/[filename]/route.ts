import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, getFileMtime } from "@/lib/files";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const content = readFile(filename);
    const mtime = getFileMtime(filename);
    return NextResponse.json({ content, mtime });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read file" },
      { status: 400 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const { content } = await request.json();
    writeFile(filename, content);
    return NextResponse.json({ success: true, mtime: getFileMtime(filename) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save file" },
      { status: 400 }
    );
  }
}