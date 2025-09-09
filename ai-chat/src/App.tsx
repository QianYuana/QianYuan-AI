import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRequest } from "ahooks";
import { OpenAIOutlined } from "@ant-design/icons";
import "./App.css";
import MessageItem, { type ChatRole } from "./component/MessageItem";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  thinking?: string;
  meta?: any;
};

function App() {
  const [modeThink, setModeThink] = useState(true);
  const [modeSearch, setModeSearch] = useState(false);
  const [question, setQuestion] = useState("");
  const [stageChat, setStageChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!stageChat) return;
    typingRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, stageChat]);

  const placeholder = useMemo(
    () => (stageChat ? "输入你的问题，按 Enter 发送" : "给 AI 发送消息"),
    [stageChat]
  );

  const send = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (!stageChat) setStageChat(true);
    startStream(content);
  };

  // 使用 ahooks/useRequest 手动触发
  const { run: startStream } = useRequest(
    async (q: string) => {
      setIsTyping(true);
      const id = crypto.randomUUID();
      // 预先插入一个空的 assistant 消息
      setMessages((prev) => [
        ...prev,
        { id, role: "assistant", content: "", thinking: "", meta: undefined },
      ]);
      const controller = new AbortController();
      abortRef.current = controller;
      const resp = await fetch("http://localhost:3001/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "deepseek-reasoner",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: q },
          ],
          stream: true,
          enable_thinking: true,
          // 添加工具配置
          tools: [
            {
              type: "function",
              function: {
                name: "getCurrentTime",
                description: "获取当前时间",
                parameters: {
                  type: "object",
                  properties: {
                    timezone: {
                      type: "string",
                      description: "时区，例如 Asia/Shanghai",
                    },
                  },
                },
              },
            },
          ],
          tool_choice: "auto",
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const text = await resp.text();
        throw new Error(text || "请求失败");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let assistantText = "";
      let reasoningText = "";
      let finalMeta: any = undefined;
      let toolLogs: string[] = [];
      // console.log("resp", resp);
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // console.log("done", chunk);
        // SSE: 逐行解析以 data: 开头的行
        const lines = chunk.split(/\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            // 兼容阿里云 OpenAI 兼容模式：choices[0].delta.content
            // 同时兼容我们后端注入的 meta 事件
            if (json?.event === "meta") {
              finalMeta = {
                ...(finalMeta || {}),
                provider: json.provider,
                model: json.model,
                endpoint: json.endpoint,
              };
            } else {
              const delta = json?.choices?.[0]?.delta || {};
              // console.log("delta", delta);

              // 原样累积思考流
              if (typeof delta.reasoning_content === "string") {
                reasoningText += delta.reasoning_content;
                if (reasoningText.length > 1000) {
                  reasoningText = reasoningText.slice(-1000);
                }
              }
              // 原样累积答案流
              if (typeof delta.content === "string") {
                assistantText += delta.content;
              }
              // 后端自定义工具执行结果事件
              if (json?.event === "tool_result") {
                toolLogs.push(`${json.name} => ${json.output}`);
              }
              // 采集工具调用增量
              if (Array.isArray(delta.tool_calls)) {
                for (const t of delta.tool_calls) {
                  const fn = t?.function || {};
                  const name = fn?.name;
                  const args = fn?.arguments;
                  if (name || args) {
                    const line = `${name || "tool"}(${args || ""})`;
                    toolLogs.push(line);
                  }
                }
              }

              if (json?.id || json?.model || json?.usage) {
                finalMeta = {
                  ...(finalMeta || {}),
                  id: json.id,
                  model: json.model,
                  usage: json.usage,
                };
              }
            }

            // 同步到 UI
            setMessages((prev) => {
              const others = prev.filter((m) => m.id !== id);
              return [
                ...others,
                {
                  id,
                  role: "assistant",
                  content: assistantText,
                  thinking: reasoningText,
                  meta: { ...(finalMeta || {}), tools: toolLogs },
                },
              ];
            });
          } catch {
            // 非 JSON 行忽略
          }
        }
      }
      setIsTyping(false);
      abortRef.current = null;
    },
    { manual: true }
  );

  const stopStream = () => {
    try {
      abortRef.current?.abort();
    } finally {
      abortRef.current = null;
      setIsTyping(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // 落地页
  if (!stageChat) {
    return (
      <div className="app-shell">
        <div className="hero">
          <div className="brand-icon" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z"
                stroke="currentColor"
                strokeWidth="1.3"
              />
            </svg>
          </div>
          <div className="hero-title">今天有什么可以帮助你?</div>
          <div className="hero-input">
            <div className="hero-row">
              <input
                className="input-box"
                placeholder={placeholder}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setInput(question);
                    send(question);
                  }
                }}
              />
              <button
                className="send-btn"
                onClick={() => {
                  setInput(question);
                  send(question);
                }}
                aria-label="send"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 12l18-8-8 18-2-7-8-3Z"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
            </div>
            <div className="modes">
              <button
                className={`mode-chip ${modeThink ? "active" : ""}`}
                onClick={() => setModeThink((v) => !v)}
              >
                <OpenAIOutlined />
                深度思考
              </button>
              {/* <button
                className={`mode-chip ${modeSearch ? "active" : ""}`}
                onClick={() => setModeSearch((v) => !v)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="11"
                    cy="11"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M20 20l-3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                联网搜索
              </button> */}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 聊天视图
  return (
    <div className="chat">
      <div className="chat-main">
        <div className="chat-inner">
          {messages.map((m) => (
            <MessageItem
              key={m.id}
              role={m.role}
              content={m.content}
              thinking={m.thinking}
              meta={m.meta}
            />
          ))}
          {isTyping && (
            <div ref={typingRef} className="typing">
              AI 正在输入…
            </div>
          )}
        </div>
      </div>
      <div className="chat-input-bar">
        <div className="chat-input">
          <div className="hero-row">
            <input
              className="input-box"
              placeholder={placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <div className="suffix">
              {/* <button
                className="icon-btn"
                onClick={() => setModeThink((v) => !v)}
                title="深度思考"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3a7 7 0 0 0-7 7v2a6 6 0 0 0 6 6h1v3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
              <button
                className="icon-btn"
                onClick={() => setModeSearch((v) => !v)}
                title="联网搜索"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="11"
                    cy="11"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M20 20l-3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </button> */}
              {isTyping ? (
                <button
                  className="send-btn"
                  onClick={stopStream}
                  aria-label="stop"
                  title="停止生成"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="6"
                      y="6"
                      width="12"
                      height="12"
                      rx="1"
                      ry="1"
                      stroke="white"
                      strokeWidth="1.5"
                    />
                  </svg>
                </button>
              ) : (
                <button
                  className="send-btn"
                  onClick={() => send()}
                  aria-label="send"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 12l18-8-8 18-2-7-8-3Z"
                      stroke="white"
                      strokeWidth="1.5"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
