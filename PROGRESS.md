# Plan App 开发进度文档

## 项目概述

基于 John Carmack .plan 理念的极简列表式记录 Web App，强调"文件大于应用"理念。

## 技术栈

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- react-markdown + @tailwindcss/typography

## 已完成功能

### 核心功能
1. **文件读写 API** - `src/app/api/` 下有两个路由
   - `/api/files` - 获取文件列表
   - `/api/doc/[filename]` - 读写单个 .md 文件
2. **纯文本编辑器** - 隐藏滚动条，内容高度自适应 + 30 行缓冲
3. **Markdown 渲染** - 预览模式
4. **自动保存** - 输入防抖 1 秒后自动保存
5. **外部文件检测** - 每 5 秒轮询检测外部修改
6. **快捷键** - Ctrl+S 保存，Tab 切换编辑/预览模式
7. **主题切换** - 支持亮色/暗色模式，支持本地存储持久化，跟随系统偏好
8. **编辑器优化** - 优化颜色搭配降低眼睛疲劳，输入框独立背景色

### 安全性
- 路径遍历防护
- 错误处理

## 页面结构

```
src/
├── app/
│   ├── page.tsx                    # 首页：文件列表
│   ├── editor/[filename]/page.tsx    # 编辑器页面
│   ├── globals.css                 # 全局样式（含主题变量）
│   ├── layout.tsx                   # 根布局（含 ThemeProvider）
│   └── api/
│       ├── files/route.ts          # 文件列表 API
│       └── doc/[filename]/route.ts # 文件读写 API
├── lib/
│   ├── files.ts                   # 文件操作工具函数
│   └── theme-context.tsx          # 主题状态管理
└── components/
    └── theme-toggle.tsx           # 主题切换按钮
```

## 存储位置

文件存储在 `doc/` 目录，按月命名（如 `2026_04.md`）。

## 当前问题/待优化

1. 外部文件检测轮询间隔可配置化
2. 缺少文件删除功能
3. 缺少标签筛选功能

## 下一步开发建议

1. 添加标签筛选功能
2. 优化编辑器性能
3. 添加设置页面（轮询间隔等）

## 运行命令

```bash
npm run dev    # 开发服务器
npm run build  # 生产构建
```