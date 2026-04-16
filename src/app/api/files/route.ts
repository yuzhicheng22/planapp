import { NextRequest, NextResponse } from "next/server";
import { getFiles, getFileTree, searchFiles, getCurrentMonthFile, createFile, deleteFile, moveFile, createDirectory, deleteDirectory } from "@/lib/files";

export async function GET(request: NextRequest) {
  const docPath = request.nextUrl.searchParams.get("path") || undefined;
  const action = request.nextUrl.searchParams.get("action");
  const query = request.nextUrl.searchParams.get("q") || "";

  if (action === "tree") {
    const tree = getFileTree(docPath);
    return NextResponse.json({ tree });
  }

  if (action === "search" && query) {
    const results = searchFiles(query, docPath);
    return NextResponse.json({ results });
  }

  const files = getFiles(docPath);
  const currentFile = getCurrentMonthFile();
  return NextResponse.json({ files, currentFile });
}

export async function POST(request: NextRequest) {
  try {
    const { action, name, newName, docPath } = await request.json();
    const path = docPath || undefined;

    switch (action) {
      case "create":
        createFile(name, path);
        return NextResponse.json({ success: true });
      case "createDir":
        createDirectory(name, path);
        return NextResponse.json({ success: true });
      case "delete":
        deleteFile(name, path);
        return NextResponse.json({ success: true });
      case "deleteDir":
        deleteDirectory(name, path);
        return NextResponse.json({ success: true });
      case "move":
        moveFile(name, newName, path);
        return NextResponse.json({ success: true });
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operation failed" },
      { status: 400 }
    );
  }
}