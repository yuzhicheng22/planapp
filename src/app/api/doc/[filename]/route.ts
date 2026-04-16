import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, getFileMtime } from "@/lib/files";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const docPath = request.nextUrl.searchParams.get("path") || undefined;
    const content = readFile(filename, docPath);
    const mtime = getFileMtime(filename, docPath);
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
    const docPath = request.nextUrl.searchParams.get("path") || undefined;
    const { content } = await request.json();
    writeFile(filename, content, docPath);
    return NextResponse.json({ success: true, mtime: getFileMtime(filename, docPath) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save file" },
      { status: 400 }
    );
  }
}