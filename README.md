# QianYuan-AI

QianYuan-AI 是一个包含前端聊天界面和后端 API 服务的 AI 应用项目。

## 项目结构

- **ai-chat**: React + TypeScript + Vite 前端聊天界面
- **AI-Server**: Express 后端服务，用于代理 DeepSeek API

## 功能说明

### ai-chat

- 提供直观的聊天界面
- 支持消息显示和输入
- 使用 Ant Design 组件库构建 UI
- 支持 Markdown 格式消息展示

### AI-Server

- 基于 Express 框架的后端服务
- 提供与 DeepSeek API 的代理连接
- 支持流式聊天响应
- 包含健康检查接口
- 集成时间工具等功能

## 运行方法

Node.js 版本要求：20.19 或以上

### 运行后端服务 (AI-Server)

```bash
cd AI-Server
npm install
npm run start  # 或 npm run dev
```

默认运行在 http://localhost:3001

### 运行前端应用 (ai-chat)

```bash
cd ai-chat
npm install
npm run dev
```

默认运行在 http://localhost:5173
