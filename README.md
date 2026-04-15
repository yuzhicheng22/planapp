# Plan

让普通人也能轻松维护"自己的 Carmack .plan"的极简列表式记录应用。

## 核心理念

- **极致低摩擦**：记录应像打开文本文件随便写几行一样简单，允许"脏"的记录、吐槽、半成品想法
- **纯文本优先**：支持 Markdown 渲染，常用符号 `+` 完成、`-` 待办、`*` 想法
- **单一文件感**：按月存储，持续流动，无需复杂管理
- **文件大于应用**：数据纯文本存储，方便迁移导出

## 标记语法

```markdown
## 2026_04_09 Thu.

### + 已完成的事项 #tag

### - 待办事项 #tag

### * 进行中的想法

内容正文...
```

## 技术栈

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- 存储：本地 Markdown 文件

## 快速开始

```bash
npm install
npm run dev
```

## 项目结构

```
src/
├── app/              # 页面路由
├── components/       # 组件
├── lib/             # 解析工具
└── doc/             # 记录文件目录
```

## 相关参考

- [mynd](https://myndnote.app/) - 消息流式记录
- [flomo](https://flomoapp.com/) - 卡片式笔记
- John Carmack [.plan](http://users.ecs.umass.edu/~cs683/mythoughts.html) 原始概念