"use client";

import { useState, useEffect, useRef, use, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

function debounce<T extends (...args: string[]) => void>(fn: T, ms: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}

export default function EditorPage({ params }: { params: Promise<{ filename: string }> }) {
  const { filename } = use(params);
  const [content, setContent] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [serverMtime, setServerMtime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "render">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 加载文件内容
  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError("");
    fetch(`/api/doc/${filename}`)
      .then(res => res.json())
      .then(data => {
        if (ignore) return;
        if (data.error) {
          setError(data.error);
        } else {
          const initial = data.content || "";
          setContent(initial);
          setInitialContent(initial);
          setServerMtime(data.mtime || 0);
        }
      });
    return () => { ignore = true; };
  }, [filename]);

  // 轮询检查外部文件变化 (每5秒)
  useEffect(() => {
    let ignore = false;
    const interval = setInterval(() => {
      if (ignore) return;
      fetch(`/api/doc/${filename}`)
        .then(res => res.json())
        .then(data => {
          if (ignore) return;
          if (!data.error && data.mtime && data.mtime > serverMtime) {
            setAutoSaveStatus("检测到外部修改");
          }
        });
    }, 5000);
    return () => { ignore = true; clearInterval(interval); };
  }, [filename, serverMtime]);

  // 刷新文件内容
  const reloadFile = useCallback(() => {
    fetch(`/api/doc/${filename}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setContent(data.content || "");
          setInitialContent(data.content || "");
          setServerMtime(data.mtime || 0);
          setAutoSaveStatus("");
        }
      });
  }, [filename]);

  // 手动保存文件
  const handleManualSave = useCallback(async () => {
    setSaving(true);
    setAutoSaveStatus("保存中...");
    const res = await fetch(`/api/doc/${filename}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) {
      setError(data.error);
      setAutoSaveStatus("保存失败");
    } else {
      setSaved(true);
      setServerMtime(data.mtime);
      setInitialContent(content);
      setAutoSaveStatus("已保存");
      setTimeout(() => {
        setSaved(false);
        setAutoSaveStatus("");
      }, 1500);
    }
  }, [filename, content]);

  // 快捷键监听 Ctrl+S / Cmd+S 和 Tab 切换视图
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleManualSave();
      }
      // Tab 切换视图模式
      if (e.key === "Tab") {
        e.preventDefault();
        setViewMode(prev => prev === "edit" ? "render" : "edit");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleManualSave]);

  // 自动保存 (防抖)
  const saveFile = useCallback(async (contentToSave: string) => {
    setSaving(true);
    setAutoSaveStatus("保存中...");
    const res = await fetch(`/api/doc/${filename}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: contentToSave }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) {
      setError(data.error);
      setAutoSaveStatus("保存失败");
    } else {
      setSaved(true);
      setServerMtime(data.mtime);
      setInitialContent(contentToSave);
      setAutoSaveStatus("已自动保存");
      setTimeout(() => {
        setSaved(false);
        setAutoSaveStatus("");
      }, 1500);
    }
  }, [filename]);

  // 防抖自动保存
  const [pendingContent, setPendingContent] = useState("");

  // 自动保存防抖
  useEffect(() => {
    if (!pendingContent || pendingContent === initialContent) return;
    const timer = setTimeout(() => {
      saveFile(pendingContent);
    }, 1000);
    return () => clearTimeout(timer);
  }, [pendingContent, initialContent, saveFile]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setAutoSaveStatus("正在输入...");
    setPendingContent(newContent);
  };

  const handleScroll = () => {
    if (textareaRef.current) {
      const lineNumbers = document.getElementById("line-numbers");
      if (lineNumbers) {
        lineNumbers.scrollTop = textareaRef.current.scrollTop;
      }
    }
  };

  const lineCount = content.split("\n").length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <header className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <div className="flex items-center gap-4">
          <Link href="/" style={{ color: "var(--text-muted)" }}>
            ← 返回
          </Link>
          <span className="font-mono text-sm" style={{ color: "var(--text-muted)" }}>{filename}</span>
          {autoSaveStatus && (
            <button
              onClick={reloadFile}
              className="text-xs px-2 py-0.5 rounded border"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              {autoSaveStatus === "检测到外部修改" ? "点击刷新" : autoSaveStatus}
            </button>
          )}
        </div>
        <button
          onClick={() => setViewMode(viewMode === "edit" ? "render" : "edit")}
          className="px-3 py-1 text-sm rounded border transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          {viewMode === "edit" ? "预览" : "编辑"}
        </button>
      </header>
      {error && (
        <div className="px-6 py-2 text-sm" style={{ background: "#7f1d1d", color: "#fecaca" }}>
          {error}
        </div>
      )}
      {viewMode === "edit" ? (
        <div className="flex-1 flex overflow-hidden">
          <div
            id="line-numbers"
            className="py-6 pl-4 pr-3 text-right font-mono text-sm select-none overflow-hidden"
            style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", width: "50px" }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="leading-6">{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onScroll={handleScroll}
            className="flex-1 p-6 font-mono text-sm resize-none focus:outline-none"
            style={{ background: "var(--bg)", color: "var(--text)" }}
            placeholder="开始记录..."
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <article className="max-w-3xl mx-auto prose prose-invert">
            <ReactMarkdown>{content}</ReactMarkdown>
          </article>
        </div>
      )}
    </div>
  );
}