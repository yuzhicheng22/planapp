"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

export default function EditorPage({ params }: { params: Promise<{ filename: string }> }) {
  const { filename } = use(params);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    fetch(`/api/doc/${filename}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setContent(data.content || "");
        }
      });
  }, [filename]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/doc/${filename}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) {
      setError(data.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <header className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <div className="flex items-center gap-4">
          <Link href="/" style={{ color: "var(--text-muted)" }}>
            ← 返回
          </Link>
          <span className="font-mono text-sm" style={{ color: "var(--text-muted)" }}>{filename}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-sm rounded transition-colors"
          style={{ background: "var(--accent)", color: "#fff", opacity: saving ? 0.5 : 1 }}
        >
          {saving ? "保存中..." : saved ? "已保存" : "保存"}
        </button>
      </header>
      {error && (
        <div className="px-6 py-2 text-sm" style={{ background: "#7f1d1d", color: "#fecaca" }}>
          {error}
        </div>
      )}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        className="flex-1 w-full p-6 font-mono text-sm resize-none focus:outline-none"
        style={{ background: "var(--bg)", color: "var(--text)" }}
        placeholder="开始记录..."
      />
    </div>
  );
}