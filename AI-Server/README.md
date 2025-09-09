# AI-Server

AI-Server 是一个基于Express的后端服务，用于代理DeepSeek API并提供聊天功能。

## 功能特点
- 提供与DeepSeek API的代理连接
- 支持流式聊天响应 (SSE)
- 包含健康检查接口
- 集成时间工具等内置功能
- 支持CORS跨域请求
- 使用dotenv管理环境变量

## 技术栈
- Express.js
- Node.js
- OpenAI SDK (适配DeepSeek API)
- cors
- dotenv
- node-fetch

## 环境变量配置
创建 .env 文件并配置以下变量：