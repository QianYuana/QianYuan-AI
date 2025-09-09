import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";
import { getCurrentTimeTool, runBuiltinTool } from "./tools/time.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const ALIYUN_API_KEY =
  process.env.ALIYUN_API_KEY || "sk-a328015e1c9a41608de7a7a3bba38289";
const ALIYUN_BASE_URL =
  process.env.ALIYUN_BASE_URL ||
  "https://dashscope.aliyuncs.com/compatible-mode/v1";
// 阿里云百炼 DeepSeek 官方示例模型：deepseek-v3.1（非思考）/ deepseek-r1（思考）
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "deepseek-v3.1";

const client = new OpenAI({
  apiKey: ALIYUN_API_KEY,
  baseURL: ALIYUN_BASE_URL,
});

function mapToAliyunModel(inputModel) {
  const model = (inputModel || "").trim();
  if (!model) return DEFAULT_MODEL;
  const mappedChat = process.env.MAP_DEEPSEEK_CHAT || "deepseek-v3.1";
  const mappedReason = process.env.MAP_DEEPSEEK_REASONER || "deepseek-r1";
  const lower = model.toLowerCase();
  if (lower.includes("deepseek-reasoner")) return mappedReason;
  if (lower.includes("deepseek-chat")) return mappedChat;
  return model; // 已是阿里云模型名则直通
}
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// 流式聊天（SSE转发）
app.post("/api/chat/stream", async (req, res) => {
  try {
    const {
      messages,
      model,
      temperature,
      max_tokens,
      tools,
      tool_choice = "auto",
      enable_thinking,
      reasoning,
      enable_source,
      client_timezone,
      ...rest
    } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages 必须是数组" });
    }

    const originalModel = (model || "").toString();
    const targetModel = mapToAliyunModel(originalModel);
    const finalMessages = Array.isArray(messages) ? [...messages] : [];
    // 统一语言与工具使用要求
    finalMessages.unshift({
      role: "user",
      content:
        "请用中文回答。若涉及日期/时间，必须调用 getCurrentTime 工具获取准确时间。",
    });

    const builtinTools = tools ?? [getCurrentTimeTool];

    const stream = await client.chat.completions.create({
      model: targetModel,
      messages: finalMessages,
      temperature,
      max_tokens,
      stream: true,
      tools: builtinTools,
      tool_choice,
      enable_thinking,
      reasoning,
      enable_source,
      ...rest,
    });

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    const metaEvent = {
      event: "meta",
      provider: "aliyun",
      model: targetModel,
      endpoint: ALIYUN_BASE_URL,
    };
    try {
      res.write(`data: ${JSON.stringify(metaEvent)}\n\n`);
    } catch {}

    const pendingToolCalls = new Map();
    for await (const chunk of stream) {
      try {
        const delta = chunk?.choices?.[0]?.delta;
        console.log("delta", delta);

        if (delta && Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc?.index ?? 0;
            const fn = tc?.function || {};
            const prev = pendingToolCalls.get(idx) || {
              name: "",
              arguments: "",
            };
            if (typeof fn.name === "string") prev.name += fn.name;
            if (typeof fn.arguments === "string")
              prev.arguments += fn.arguments;
            pendingToolCalls.set(idx, prev);
          }
        }
      } catch {}
      // 直透
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    // 执行收集到的工具调用，返回 tool_result 事件
    if (pendingToolCalls.size > 0) {
      console.log("待执行的工具调用:", pendingToolCalls);
      for (const [, call] of pendingToolCalls) {
        const name = call.name;
        let args = {};
        try {
          // 修复：确保正确解析参数，处理可能的格式问题
          const argsStr = call.arguments || "{}";
          // 如果参数是数组格式，转换为空对象
          if (argsStr.trim().startsWith("[")) {
            args = {};
          } else {
            args = JSON.parse(argsStr);
          }
        } catch (error) {
          console.error("参数解析错误:", error);
          args = {};
        }

        // 修复：处理 runBuiltinTool 可能的错误
        let result;
        try {
          result = await runBuiltinTool(name, args);
        } catch (error) {
          console.error("工具执行错误:", error);
          result = { output: null };
        }

        const output = result?.output ?? null;
        const toolEvent = {
          event: "tool_result",
          name,
          arguments: args,
          output,
        };
        try {
          res.write(`data: ${JSON.stringify(toolEvent)}
\n`);
        } catch (error) {
          console.error("发送工具结果失败:", error);
        }
        // 追加一段合成的回答片段，确保前端界面可见时间
        if (output) {
          const synthChunk = {
            choices: [{ delta: { content: `${output}` } }],
          };
          try {
            res.write(`data: ${JSON.stringify(synthChunk)}
\n`);
          } catch (error) {
            console.error("发送合成回答失败:", error);
          }
        }
      }
    }
    try {
      res.write("data: [DONE]\n\n");
    } catch {}
    res.end();
  } catch (err) {
    console.error("流式代理错误:", err);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "服务器错误", detail: String(err?.message || err) });
    } else {
      try {
        res.end();
      } catch {
        /* ignore */
      }
    }
  }
});

app.listen(PORT, () => {
  console.log(`AI-Server is running on http://localhost:${PORT}`);
});
