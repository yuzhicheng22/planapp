"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useTheme } from "@/lib/theme-context";
import { ConfirmModal, InputModal } from "@/components/modal";

interface FileItem {
  name: string;
  modified: string;
  isDir: boolean;
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [docPath, setDocPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "render">("edit");
  const [sidebarVisible] = useState(true);
  const [fileMenuOpen, setFileMenuOpen] = useState<string | null>(null);
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [modalType, setModalType] = useState<"create" | "rename" | "delete" | null>(null);
  const [modalFile, setModalFile] = useState<string | null>(null);
  const [modalValue, setModalValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 加载目录路径
  useEffect(() => {
    const savedPath = localStorage.getItem("docPath");
    if (savedPath) {
      setDocPath(savedPath);
    }
  }, []);

  // 加载文件列表
  const loadFiles = useCallback(() => {
    if (!docPath) return;
    const url = `/api/files?path=${encodeURIComponent(docPath)}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const pinnedFiles = JSON.parse(localStorage.getItem("pinnedFiles") || "[]");
        const sorted = [...data.files].sort((a, b) => {
          const aPinned = pinnedFiles.includes(a.name);
          const bPinned = pinnedFiles.includes(b.name);
          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return b.name.localeCompare(a.name);
        });
        setFiles(sorted);
        setFiles(sorted);
      })
      .catch(() => setFiles([]));
  }, [docPath]);

  useEffect(() => {
    if (docPath) {
      loadFiles();
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [docPath, loadFiles]);

  // 加载选中文件内容
  useEffect(() => {
    if (!selectedFile || !docPath) return;
    setError("");
    const url = `/api/doc/${selectedFile}?path=${encodeURIComponent(docPath)}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          const initial = data.content || "";
          setContent(initial);
          setInitialContent(initial);
        }
      });
  }, [selectedFile, docPath]);

  // 自动保存
  const saveFile = useCallback(async (contentToSave: string) => {
    if (!selectedFile || !docPath) return;
    setAutoSaveStatus("保存中...");
    const url = `/api/doc/${selectedFile}?path=${encodeURIComponent(docPath)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: contentToSave }),
    });
    const data = await res.json();
    if (data.error) {
      setAutoSaveStatus("保存失败");
    } else {
      setInitialContent(contentToSave);
      setAutoSaveStatus("已自动保存");
      setTimeout(() => setAutoSaveStatus(""), 1500);
    }
  }, [selectedFile, docPath]);

  const [pendingContent, setPendingContent] = useState("");

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

  // 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleManualSave();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        setViewMode(prev => prev === "edit" ? "render" : "edit");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [content, selectedFile, docPath]);

  const handleManualSave = async () => {
    if (!selectedFile || !docPath) return;
    setAutoSaveStatus("保存中...");
    const url = `/api/doc/${selectedFile}?path=${encodeURIComponent(docPath)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (data.error) {
      setAutoSaveStatus("保存失败");
    } else {
      setInitialContent(content);
      setAutoSaveStatus("已保存");
      setTimeout(() => setAutoSaveStatus(""), 1500);
    }
  };

  // 选择目录
  const handleSelectDirectory = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.webkitdirectory = true;
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        // @ts-expect-error - Electron环境
        const filePath = files[0].path || files[0].webkitRelativePath;
        if (filePath) {
          const parts = filePath.split(/[/\\]/);
          parts.pop();
          const dirPath = parts.join("/");
          if (dirPath) {
            setDocPath(dirPath);
            localStorage.setItem("docPath", dirPath);
          }
        } else {
          const path = prompt("无法自动获取目录路径，请输入文档目录的完整路径：");
          if (path) {
            setDocPath(path);
            localStorage.setItem("docPath", path);
          }
        }
      }
    };
    input.click();
  };

  // 创建文件
  const handleCreateFile = () => {
    setModalType("create");
    setModalValue("");
  };

  const confirmCreateFile = async (value: string) => {
    if (!docPath || !value) return;
    const fileName = value.endsWith(".md") ? value : `${value}.md`;
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: fileName, docPath }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      loadFiles();
      setSelectedFile(fileName);
    }
    setModalType(null);
  };

  // 重命名文件
  const handleRenameFile = (oldName: string) => {
    setModalFile(oldName);
    setModalType("rename");
    setModalValue(oldName.replace(".md", ""));
  };

  const confirmRenameFile = async () => {
    if (!docPath || !modalFile || !modalValue) return;
    const finalName = modalValue.endsWith(".md") ? modalValue : `${modalValue}.md`;
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "move", name: modalFile, newName: finalName, docPath }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      if (selectedFile === modalFile) {
        setSelectedFile(finalName);
      }
      loadFiles();
    }
    setModalType(null);
    setFileMenuOpen(null);
  };

  // 删除文件
  const handleDeleteFile = (name: string) => {
    setModalFile(name);
    setModalType("delete");
  };

  const confirmDeleteFile = async () => {
    if (!docPath || !modalFile) return;
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", name: modalFile, docPath }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      if (selectedFile === modalFile) {
        setSelectedFile(null);
        setContent("");
      }
      loadFiles();
    }
    setModalType(null);
    setFileMenuOpen(null);
  };

  // 置顶文件
  const handlePinFile = async (name: string) => {
    // 获取当前的置顶列表
    const pinnedFiles = JSON.parse(localStorage.getItem("pinnedFiles") || "[]");
    if (pinnedFiles.includes(name)) {
      // 取消置顶
      const newPinned = pinnedFiles.filter((f: string) => f !== name);
      localStorage.setItem("pinnedFiles", JSON.stringify(newPinned));
    } else {
      // 添加置顶
      pinnedFiles.push(name);
      localStorage.setItem("pinnedFiles", JSON.stringify(pinnedFiles));
    }
    loadFiles();
    setFileMenuOpen(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>
        加载中...
      </div>
    );
  }

  if (!docPath) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold mb-2" style={{ color: "var(--text)" }}>Plan</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>选择你的文档目录开始使用</p>
        </div>
        <button
          onClick={handleSelectDirectory}
          className="px-6 py-3 rounded border transition-colors hover:border-zinc-400"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          选择目录
        </button>
      </div>
    );
  }

  const lineCount = content.split("\n").length;

  return (
    <div className="flex h-screen" style={{ background: "var(--bg)" }}>
      {/* 侧边栏 */}
      <aside
        className={`flex flex-col border-r relative ${sidebarVisible ? "w-64" : "w-0"} overflow-hidden transition-all`}
        style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
      >
        {/* 侧边栏头部 */}
        <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate" style={{ color: "var(--text)" }} title={docPath}>
              {docPath.split(/[/\\]/).pop()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="text-sm px-2 py-1 rounded hover:bg-zinc-700/50"
              style={{ color: "var(--text-muted)" }}
            >
              {theme === "dark" ? "☀" : "🌙"}
            </button>
            <div className="relative">
              <button
                onClick={() => setSidebarMenuOpen(!sidebarMenuOpen)}
                className="text-sm px-2 py-1 rounded hover:bg-zinc-700/50"
                style={{ color: "var(--text-muted)" }}
              >
                ⋮
              </button>
              {sidebarMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSidebarMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-36 py-1 rounded border shadow-lg z-20" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                    <button
                      onClick={() => { handleSelectDirectory(); setSidebarMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700/50"
                      style={{ color: "var(--text)" }}
                    >
                      切换目录
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 文件列表 */}
        <div className="flex-1 overflow-auto p-2">
          <button
            onClick={handleCreateFile}
            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-zinc-700/50"
            style={{ color: "var(--text-muted)" }}
          >
            + 新建文件
          </button>
          <ul className="mt-2 space-y-1">
            {files.map(file => (
              <li key={file.name} className="group relative">
                <div className="flex items-center">
                  <button
                    onClick={() => setSelectedFile(file.name)}
                    className={`flex-1 text-left px-3 py-2 rounded text-sm truncate ${
                      selectedFile === file.name ? "bg-zinc-700/50" : "hover:bg-zinc-700/30"
                    }`}
                    style={{ color: selectedFile === file.name ? "var(--text)" : "var(--text-muted)" }}
                  >
                    {file.isDir ? "📁 " : "📄 "}{file.name}
                  </button>
                  {!file.isDir && (
                    <div className="relative">
                      <button
                        onClick={() => setFileMenuOpen(fileMenuOpen === file.name ? null : file.name)}
                        className="opacity-0 group-hover:opacity-100 px-2 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        ⋮
                      </button>
                      {fileMenuOpen === file.name && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setFileMenuOpen(null)} />
                          <div className="absolute right-0 top-full mt-1 w-28 py-1 rounded border shadow-lg z-20" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                            <button
                              onClick={() => handleRenameFile(file.name)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700/50"
                              style={{ color: "var(--text)" }}
                            >
                              重命名
                            </button>
                            <button
                              onClick={() => handlePinFile(file.name)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700/50"
                              style={{ color: "var(--text)" }}
                            >
                              置顶
                            </button>
                            <button
                              onClick={() => handleDeleteFile(file.name)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700/50"
                              style={{ color: "#f87171" }}
                            >
                              删除
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 工具栏 */}
        <header className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm" style={{ color: "var(--text-muted)" }}>
              {selectedFile || "未选择文件"}
            </span>
            {autoSaveStatus && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {autoSaveStatus}
              </span>
            )}
          </div>
          <button
            onClick={() => setViewMode(viewMode === "edit" ? "render" : "edit")}
            className="px-3 py-1 text-sm rounded border"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            {viewMode === "edit" ? "预览" : "编辑"}
          </button>
        </header>

        {/* 编辑器/预览区 */}
        <div className="flex-1 min-h-0 overflow-auto">
          {error && (
            <div className="px-4 py-2 text-sm" style={{ background: "#7f1d1d", color: "#fecaca" }}>
              {error}
            </div>
          )}
          {selectedFile ? (
            viewMode === "edit" ? (
              <div className="h-full">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleChange}
                  className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none"
                  style={{
                    background: "var(--bg-input)",
                    color: "var(--text)",
                    overflow: "hidden",
                    minHeight: `${(lineCount + 30) * 24}px`,
                  }}
                  placeholder="开始记录..."
                />
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-4">
                <article className="max-w-3xl mx-auto prose prose-invert">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </article>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full" style={{ color: "var(--text-muted)" }}>
              选择一个文件开始记录
            </div>
          )}
        </div>
      </main>

      {/* 弹窗 */}
      <InputModal
        isOpen={modalType === "create"}
        onClose={() => setModalType(null)}
        onConfirm={confirmCreateFile}
        title="新建文件"
        label="文件名"
        placeholder="输入文件名（无需 .md 后缀）"
        confirmText="创建"
      />
      <InputModal
        isOpen={modalType === "rename"}
        onClose={() => setModalType(null)}
        onConfirm={confirmRenameFile}
        title="重命名"
        label="新文件名"
        placeholder="输入新文件名"
        defaultValue={modalValue}
        confirmText="确定"
      />
      <ConfirmModal
        isOpen={modalType === "delete"}
        onClose={() => setModalType(null)}
        onConfirm={confirmDeleteFile}
        title="删除文件"
        message={`确定要删除 "${modalFile}" 吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        danger
      />
    </div>
  );
}