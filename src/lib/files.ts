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

export interface FileTreeItem {
  name: string;
  path: string;
  isDir: boolean;
  modified: string;
  children?: FileTreeItem[];
}

export function getFileTree(docPath?: string): FileTreeItem[] {
  const dir = getDocDir(docPath);
  if (!fs.existsSync(dir)) {
    return [];
  }

  function walk(dirPath: string, basePath: string = ""): FileTreeItem[] {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    return items
      .filter(item => item.isDirectory() || item.name.endsWith(".md"))
      .map(item => {
        const fullPath = path.join(dirPath, item.name);
        const relPath = path.join(basePath, item.name);
        const stat = fs.statSync(fullPath);
        const result: FileTreeItem = {
          name: item.name,
          path: relPath,
          isDir: item.isDirectory(),
          modified: stat.mtime.toISOString().split("T")[0],
        };
        if (item.isDirectory()) {
          result.children = walk(fullPath, relPath);
        }
        return result;
      })
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  return walk(dir);
}

export function searchFiles(query: string, docPath?: string): { name: string; path: string; content: string; matches: string[] }[] {
  const dir = getDocDir(docPath);
  if (!fs.existsSync(dir) || !query.trim()) {
    return [];
  }

  const results: { name: string; path: string; content: string; matches: string[] }[] = [];
  const searchLower = query.toLowerCase();

  function searchInDir(dirPath: string, basePath: string = "") {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        searchInDir(path.join(dirPath, item.name), path.join(basePath, item.name));
      } else if (item.name.endsWith(".md")) {
        const fullPath = path.join(dirPath, item.name);
        const relPath = path.join(basePath, item.name);
        const fileContent = fs.readFileSync(fullPath, "utf-8");
        const contentLower = fileContent.toLowerCase();

        // 搜索文件名
        const nameMatch = item.name.toLowerCase().includes(searchLower);
        // 搜索内容行
        const lines = fileContent.split("\n");
        const matchedLines: string[] = [];
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(searchLower)) {
            matchedLines.push(`${idx + 1}: ${line.substring(0, 100)}`);
          }
        });

        if (nameMatch || matchedLines.length > 0) {
          results.push({
            name: item.name,
            path: relPath,
            content: fileContent.substring(0, 200),
            matches: matchedLines.slice(0, 5),
          });
        }
      }
    }
  }

  searchInDir(dir);
  return results;
}