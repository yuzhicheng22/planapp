"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useTheme } from "@/lib/theme-context";
import { ConfirmModal, InputModal } from "@/components/modal";

interface FileTreeItem {
  name: string;
  path: string;
  isDir: boolean;
  modified: string;
  children?: FileTreeItem[];
}

interface SearchResult {
  name: string;
  path: string;
  matches: string[];
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [docPath, setDocPath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "render">("edit");
  const [fileMenuOpen, setFileMenuOpen] = useState<string | null>(null);
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [modalType, setModalType] = useState<string | null>(null);
  const [modalFile, setModalFile] = useState<string | null>(null);
  const [modalValue, setModalValue] = useState("");
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 加载目录路径
  useEffect(() => {
    const savedPath = localStorage.getItem("docPath");
    if (savedPath) {
      setDocPath(savedPath);
    }
  }, []);

  // 加载文件树
  const loadFileTree = useCallback(() => {
    if (!docPath) return;
    const url = `/api/files?action=tree&path=${encodeURIComponent(docPath)}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setFileTree(data.tree || []);
      })
      .catch(() => setFileTree([]));
  }, [docPath]);

  useEffect(() => {
    if (docPath) {
      loadFileTree();
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [docPath, loadFileTree]);

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
    const timer = setTimeout(() => saveFile(pendingContent), 1000);
    return () => clearTimeout(timer);
  }, [pendingContent, initialContent, saveFile]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setAutoSaveStatus("正在输入...");
    setPendingContent(e.target.value);
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
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
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

  // 切换目录展开
  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // 选择文件
  const handleSelectFile = (path: string) => {
    // 确保父目录展开
    const parts = path.split("/");
    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join("/");
      setExpandedDirs(prev => {
        const next = new Set(prev);
        next.add(parentPath);
        return next;
      });
    }
    setSelectedFile(path);
  };

  // 创建文件
  const handleCreateFile = (parentPath: string = "") => {
    setModalFile(parentPath);
    setModalType("create");
    setModalValue("");
  };

  const confirmCreateFile = async (value: string) => {
    if (!docPath || !value) return;
    const fileName = modalFile ? `${modalFile}/${value}.md` : `${value}.md`;
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: fileName, docPath }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      loadFileTree();
      setSelectedFile(fileName);
    }
    setModalType(null);
  };

  // 创建文件夹
  const handleCreateDir = (parentPath: string = "") => {
    setModalFile(parentPath);
    setModalType("createDir");
    setModalValue("");
  };

  const confirmCreateDir = async (value: string) => {
    if (!docPath || !value) return;
    const dirName = modalFile ? `${modalFile}/${value}` : value;
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createDir", name: dirName, docPath }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      loadFileTree();
      // 自动展开新目录
      setExpandedDirs(prev => new Set(prev).add(dirName));
    }
    setModalType(null);
  };

  // 重命名
  const handleRename = (path: string) => {
    setModalFile(path);
    setModalType("rename");
    setModalValue(path.split("/").pop()!.replace(".md", ""));
  };

  const confirmRename = async () => {
    if (!docPath || !modalFile || !modalValue) return;
    const parts = modalFile.split("/");
    parts[parts.length - 1] = modalValue.endsWith(".md") ? modalValue : `${modalValue}.md`;
    const newPath = parts.join("/");
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "move", name: modalFile, newName: newPath, docPath }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      if (selectedFile === modalFile) {
        setSelectedFile(newPath);
      }
      loadFileTree();
    }
    setModalType(null);
    setFileMenuOpen(null);
  };

  // 删除
  const handleDelete = (path: string, isDir: boolean) => {
    setModalFile(path);
    setModalType(isDir ? "deleteDir" : "delete");
  };

  const confirmDelete = async () => {
    if (!docPath || !modalFile) return;
    const action = modalType === "deleteDir" ? "deleteDir" : "delete";
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, name: modalFile, docPath }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      if (selectedFile === modalFile) {
        setSelectedFile(null);
        setContent("");
      }
      loadFileTree();
    }
    setModalType(null);
    setFileMenuOpen(null);
  };

  // 置顶
  const handlePin = (name: string) => {
    const pinnedFiles = JSON.parse(localStorage.getItem("pinnedFiles") || "[]");
    if (pinnedFiles.includes(name)) {
      const newPinned = pinnedFiles.filter((f: string) => f !== name);
      localStorage.setItem("pinnedFiles", JSON.stringify(newPinned));
    } else {
      pinnedFiles.push(name);
      localStorage.setItem("pinnedFiles", JSON.stringify(pinnedFiles));
    }
    loadFileTree();
    setFileMenuOpen(null);
  };

  // 搜索
  const handleSearch = useCallback(() => {
    if (!docPath || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const url = `/api/files?action=search&q=${encodeURIComponent(searchQuery)}&path=${encodeURIComponent(docPath)}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setSearchResults(data.results || []);
      })
      .catch(() => setSearchResults([]));
  }, [docPath, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(), 300);
    return () => clearTimeout(timer);
  }, [handleSearch]);

  // 渲染文件树
  const renderTree = (items: FileTreeItem[], depth: number = 0) => {
    return items.map(item => {
      const isExpanded = expandedDirs.has(item.path);
      const itemName = item.path.split("/").pop() || "";

      if (item.isDir) {
        return (
          <div key={item.path}>
            <div className="flex items-center group">
              <button
                onClick={() => toggleDir(item.path)}
                className="flex-1 flex items-center px-2 py-1.5 rounded text-sm hover:bg-zinc-700/30"
                style={{ paddingLeft: `${depth * 16 + 8}px`, color: "var(--text)" }}
              >
                <span className="w-4 mr-1">{isExpanded ? "📂" : "📁"}</span>
                <span className="truncate">{item.name}</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setFileMenuOpen(fileMenuOpen === item.path ? null : item.path)}
                  className="opacity-0 group-hover:opacity-100 px-1.5 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  ⋮
                </button>
                {fileMenuOpen === item.path && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setFileMenuOpen(null)} />
                    <div className="absolute right-0 top-full mt-1 w-28 py-1 rounded border shadow-lg z-20" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                      <button
                        onClick={() => { handleCreateFile(item.path); setFileMenuOpen(null); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700/50"
                        style={{ color: "var(--text)" }}
                      >
                        新建文件
                      </button>
                      <button
                        onClick={() => { handleCreateDir(item.path); setFileMenuOpen(null); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700/50"
                        style={{ color: "var(--text)" }}
                      >
                        新建文件夹
                      </button>
                      <button
                        onClick={() => { handleRename(item.path); setFileMenuOpen(null); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700/50"
                        style={{ color: "var(--text)" }}
                      >
                        重命名
                      </button>
                      <button
                        onClick={() => { handleDelete(item.path, true); setFileMenuOpen(null); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700/50"
                        style={{ color: "#f87171" }}
                      >
                        删除
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            {isExpanded && item.children && renderTree(item.children, depth + 1)}
          </div>
        );
      }

      const fileName = item.name;
      const isSelected = selectedFile === item.path;
      const isPinned = JSON.parse(localStorage.getItem("pinnedFiles") || "[]").includes(fileName);

      return (
        <div key={item.path} className="flex items-center group">
          <button
            onClick={() => handleSelectFile(item.path)}
            className={`flex-1 flex items-center px-2 py-1.5 rounded text-sm truncate ${
              isSelected ? "bg-zinc-700/50" : "hover:bg-zinc-700/30"
            }`}
            style={{
              paddingLeft: `${depth * 16 + 8}px`,
              color: isSelected ? "var(--text)" : "var(--text-muted)",
            }}
          >
            {isPinned && <span className="mr-1">📌</span>}
            <span>📄 {item.name}</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setFileMenuOpen(fileMenuOpen === item.path ? null : item.path)}
              className="opacity-0 group-hover:opacity-100 px-1.5 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              ⋮
            </button>
            {fileMenuOpen === item.path && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFileMenuOpen(null)} />
                <div className="absolute right-0 top-full mt-1 w-28 py-1 rounded border shadow-lg z-20" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                  <button
                    onClick={() => { handlePin(fileName); setFileMenuOpen(null); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700/50"
                    style={{ color: "var(--text)" }}
                  >
                    {isPinned ? "取消置顶" : "置顶"}
                  </button>
                  <button
                    onClick={() => { handleRename(item.path); setFileMenuOpen(null); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700/50"
                    style={{ color: "var(--text)" }}
                  >
                    重命名
                  </button>
                  <button
                    onClick={() => { handleDelete(item.path, false); setFileMenuOpen(null); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700/50"
                    style={{ color: "#f87171" }}
                  >
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      );
    });
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
      {/* 搜索弹窗 */}
      {searchOpen && (
        <div className="fixed inset-0 flex items-start justify-center pt-20 z-50" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-2xl mx-4 rounded-lg border shadow-xl overflow-hidden" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }} onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索文件名和内容... (Ctrl+F)"
                className="w-full px-3 py-2 rounded border focus:outline-none"
                style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--text)" }}
                autoFocus
              />
            </div>
            <div className="max-h-96 overflow-auto">
              {searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => { handleSelectFile(result.path); setSearchOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded hover:bg-zinc-700/30"
                      style={{ color: "var(--text)" }}
                    >
                      <div className="font-medium">{result.name}</div>
                      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {result.matches.slice(0, 3).map((m, i) => (
                          <div key={i} className="truncate">{m}</div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="p-4 text-center" style={{ color: "var(--text-muted)" }}>无搜索结果</div>
              ) : (
                <div className="p-4 text-center" style={{ color: "var(--text-muted)" }}>输入关键词搜索</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 侧边栏 */}
      <aside
        className="flex flex-col border-r w-64"
        style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
      >
        {/* 侧边栏头部 */}
        <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate" style={{ color: "var(--text)" }} title={docPath!}>
              {docPath!.split(/[/\\]/).pop()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="text-sm px-2 py-1 rounded hover:bg-zinc-700/50"
              style={{ color: "var(--text-muted)" }}
            >
              🔍
            </button>
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

        {/* 文件树 */}
        <div className="flex-1 overflow-auto p-2">
          <button
            onClick={() => handleCreateFile()}
            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-zinc-700/50"
            style={{ color: "var(--text-muted)" }}
          >
            + 新建文件
          </button>
          <div className="mt-2">
            {renderTree(fileTree)}
          </div>
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
        placeholder="输入文件名"
        confirmText="创建"
      />
      <InputModal
        isOpen={modalType === "createDir"}
        onClose={() => setModalType(null)}
        onConfirm={confirmCreateDir}
        title="新建文件夹"
        label="文件夹名"
        placeholder="输入文件夹名"
        confirmText="创建"
      />
      <InputModal
        isOpen={modalType === "rename"}
        onClose={() => setModalType(null)}
        onConfirm={confirmRename}
        title="重命名"
        label="新名称"
        placeholder="输入新名称"
        defaultValue={modalValue}
        confirmText="确定"
      />
      <ConfirmModal
        isOpen={modalType === "delete" || modalType === "deleteDir"}
        onClose={() => setModalType(null)}
        onConfirm={confirmDelete}
        title={modalType === "deleteDir" ? "删除文件夹" : "删除文件"}
        message={`确定要删除 "${modalFile}" 吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        danger
      />
    </div>
  );
}