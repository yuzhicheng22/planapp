import { NextResponse } from "next/server";
import { getFiles, getCurrentMonthFile } from "@/lib/files";

export async function GET() {
  const files = getFiles();
  const currentFile = getCurrentMonthFile();
  return NextResponse.json({ files, currentFile });
}