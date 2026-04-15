"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

interface FileInfo {
  name: string;
  modified: string;
}

export default function Home() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [currentFile, setCurrentFile] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/files")
      .then(res => res.json())
      .then(data => {
        setFiles(data.files);
        setCurrentFile(data.currentFile);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ color: "var(--text-muted)" }}>
        加载中...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative" style={{ background: "var(--bg)" }}>
      <ThemeToggle />
      <main className="w-full max-w-lg px-6">
        <h1 className="text-2xl font-semibold mb-8" style={{ color: "var(--text)" }}>Plan</h1>

        <section className="mb-8">
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-muted)" }}>当前文件</h2>
          {currentFile ? (
            <Link
              href={`/editor/${currentFile}`}
              className="block px-4 py-3 rounded border hover:border-zinc-400 transition-colors"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
            >
              <span className="font-mono text-sm" style={{ color: "var(--text)" }}>{currentFile}</span>
              <span className="ml-3" style={{ color: "var(--text-muted)" }}>编辑 →</span>
            </Link>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>暂无文件</p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-muted)" }}>所有文件</h2>
          {files.length > 0 ? (
            <ul className="space-y-2">
              {files.map(file => (
                <li key={file.name}>
                  <Link
                    href={`/editor/${file.name}`}
                    className="flex items-center justify-between px-4 py-2 rounded border hover:border-zinc-400 transition-colors"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
                  >
                    <span className="font-mono text-sm" style={{ color: "var(--text)" }}>{file.name}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{file.modified}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>暂无记录文件</p>
          )}
        </section>
      </main>
    </div>
  );
}