import fs from "fs";
import path from "path";

const DOC_DIR = path.join(process.cwd(), "doc");

export function ensureDocDir() {
  if (!fs.existsSync(DOC_DIR)) {
    fs.mkdirSync(DOC_DIR, { recursive: true });
  }
}

export function getFiles(): { name: string; modified: string }[] {
  ensureDocDir();
  const files = fs.readdirSync(DOC_DIR).filter(f => f.endsWith(".md"));
  return files
    .map(name => {
      const stat = fs.statSync(path.join(DOC_DIR, name));
      return {
        name,
        modified: stat.mtime.toISOString().split("T")[0],
      };
    })
    .sort((a, b) => b.name.localeCompare(a.name));
}

function validateFilename(filename: string): string {
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new Error("Invalid filename");
  }
  if (!filename.endsWith(".md")) {
    throw new Error("Only .md files allowed");
  }
  return filename;
}

export function readFile(filename: string): string {
  const validName = validateFilename(filename);
  const filePath = path.join(DOC_DIR, validName);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(DOC_DIR) + path.sep)) {
    throw new Error("Access denied");
  }
  if (!fs.existsSync(resolved)) {
    return "";
  }
  return fs.readFileSync(resolved, "utf-8");
}

export function writeFile(filename: string, content: string): void {
  ensureDocDir();
  const validName = validateFilename(filename);
  const filePath = path.join(DOC_DIR, validName);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(DOC_DIR) + path.sep)) {
    throw new Error("Access denied");
  }
  fs.writeFileSync(resolved, content, "utf-8");
}

export function getCurrentMonthFile(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}_${month}.md`;
}