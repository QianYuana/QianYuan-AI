# QianYuan-AI

QianYuan-AI 是一个包含前端聊天界面和后端API服务的AI应用项目。

## 项目结构
- **ai-chat**: React + TypeScript + Vite 前端聊天界面
- **AI-Server**: Express 后端服务，用于代理DeepSeek API

## 功能说明
### ai-chat
- 提供直观的聊天界面
- 支持消息显示和输入
- 使用Ant Design组件库构建UI
- 支持Markdown格式消息展示

### AI-Server
- 基于Express框架的后端服务
- 提供与DeepSeek API的代理连接
- 支持流式聊天响应
- 包含健康检查接口
- 集成时间工具等功能

## 运行方法
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