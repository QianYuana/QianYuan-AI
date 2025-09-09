# ai-chat

ai-chat 是一个基于React + TypeScript + Vite的前端聊天界面，用于与AI后端服务进行交互。

## 功能特点
- 提供直观的聊天界面
- 支持消息显示和输入
- 使用Ant Design组件库构建现代化UI
- 支持Markdown格式消息展示
- 响应式设计，适配不同设备

## 技术栈
- React
- TypeScript
- Vite
- Ant Design
- React Markdown
- ahooks

## 运行方法
```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码 lint 检查
npm run lint
```
开发模式默认运行在 http://localhost:5173

## 项目结构
- `src/App.tsx`: 应用入口组件
- `src/main.tsx`: 渲染入口
- `src/component/`: 自定义组件
- `src/App.css`: 应用样式
- `vite.config.ts`: Vite配置文件

## 扩展配置
如需扩展ESLint配置，可参考以下示例：

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
  },
]);
```
