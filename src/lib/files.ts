import fs from "fs";
import path from "path";

const DEFAULT_DOC_DIR = "doc";

function getDocDir(customPath?: string): string {
  if (customPath) {
    return path.resolve(customPath);
  }
  return path.join(process.cwd(), DEFAULT_DOC_DIR);
}

export function ensureDocDir(docPath?: string): void {
  const dir = getDocDir(docPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function validateFilename(filename: string): string {
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new Error("Invalid filename");
  }
  if (!filename.endsWith(".md")) {
    throw new Error("Only .md files allowed");
  }
  return filename;
}

export function getFiles(docPath?: string): { name: string; modified: string; isDir: boolean }[] {
  const dir = getDocDir(docPath);
  if (!fs.existsSync(dir)) {
    return [];
  }
  const items = fs.readdirSync(dir, { withFileTypes: true });
  return items
    .filter(item => item.isDirectory() || item.name.endsWith(".md"))
    .map(item => {
      const fullPath = path.join(dir, item.name);
      const stat = fs.statSync(fullPath);
      return {
        name: item.name,
        modified: stat.mtime.toISOString().split("T")[0],
        isDir: item.isDirectory(),
      };
    })
    .sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return b.name.localeCompare(a.name);
    });
}

export function readFile(filename: string, docPath?: string): string {
  const validName = validateFilename(filename);
  const dir = getDocDir(docPath);
  const filePath = path.join(dir, validName);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(dir) + path.sep)) {
    throw new Error("Access denied");
  }
  if (!fs.existsSync(resolved)) {
    return "";
  }
  return fs.readFileSync(resolved, "utf-8");
}

export function writeFile(filename: string, content: string, docPath?: string): void {
  const dir = getDocDir(docPath);
  ensureDocDir(docPath);
  const validName = validateFilename(filename);
  const filePath = path.join(dir, validName);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(dir) + path.sep)) {
    throw new Error("Access denied");
  }
  fs.writeFileSync(resolved, content, "utf-8");
}

export function getFileMtime(filename: string, docPath?: string): number {
  const validName = validateFilename(filename);
  const dir = getDocDir(docPath);
  const filePath = path.join(dir, validName);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(dir) + path.sep)) {
    throw new Error("Access denied");
  }
  if (!fs.existsSync(resolved)) {
    return 0;
  }
  return fs.statSync(resolved).mtimeMs;
}

export function getCurrentMonthFile(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}_${month}.md`;
}

export function createFile(filename: string, docPath?: string): void {
  const dir = getDocDir(docPath);
  ensureDocDir(docPath);
  const validName = validateFilename(filename);
  const filePath = path.join(dir, validName);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(dir) + path.sep)) {
    throw new Error("Access denied");
  }
  if (fs.existsSync(resolved)) {
    throw new Error("File already exists");
  }
  fs.writeFileSync(resolved, "", "utf-8");
}

export function deleteFile(filename: string, docPath?: string): void {
  const dir = getDocDir(docPath);
  const validName = validateFilename(filename);
  const filePath = path.join(dir, validName);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(dir) + path.sep)) {
    throw new Error("Access denied");
  }
  if (!fs.existsSync(resolved)) {
    throw new Error("File not found");
  }
  fs.unlinkSync(resolved);
}

export function moveFile(oldName: string, newName: string, docPath?: string): void {
  const dir = getDocDir(docPath);
  const validOldName = validateFilename(oldName);
  const validNewName = validateFilename(newName);
  const oldPath = path.join(dir, validOldName);
  const newPath = path.join(dir, validNewName);
  const resolvedOld = path.resolve(oldPath);
  const resolvedNew = path.resolve(newPath);
  if (!resolvedOld.startsWith(path.resolve(dir) + path.sep) || !resolvedNew.startsWith(path.resolve(dir) + path.sep)) {
    throw new Error("Access denied");
  }
  if (!fs.existsSync(resolvedOld)) {
    throw new Error("File not found");
  }
  if (fs.existsSync(resolvedNew)) {
    throw new Error("Target file already exists");
  }
  fs.renameSync(resolvedOld, resolvedNew);
}

export function createDirectory(dirName: string, docPath?: string): void {
  const dir = getDocDir(docPath);
  const validName = validateFilename(dirName);
  const dirPath = path.join(dir, validName);
  const resolved = path.resolve(dirPath);
  if (!resolved.startsWith(path.resolve(dir) + path.sep)) {
    throw new Error("Access denied");
  }
  if (fs.existsSync(resolved)) {
    throw new Error("Directory already exists");
  }
  fs.mkdirSync(resolved);
}

export function deleteDirectory(dirName: string, docPath?: string): void {
  const dir = getDocDir(docPath);
  const validName = validateFilename(dirName);
  const dirPath = path.join(dir, validName);
  const resolved = path.resolve(dirPath);
  if (!resolved.startsWith(path.resolve(dir) + path.sep)) {
    throw new Error("Access denied");
  }
  if (!fs.existsSync(resolved)) {
    throw new Error("Directory not found");
  }
  fs.rmSync(resolved, { recursive: true });
}

export function directoryExists(docPath?: string): boolean {
  const dir = getDocDir(docPath);
  return fs.existsSync(dir);
}