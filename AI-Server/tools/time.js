// 工具定义
export const getCurrentTimeTool = {
  type: "function",
  function: {
    name: "getCurrentTime",
    description: "当你想知道现在的时间时非常有用。可以指定时区，默认为Asia/Shanghai。",
    parameters: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: "IANA 时区，例如 Asia/Shanghai、UTC"
        }
      },
      additionalProperties: false
    }
  }
};

// 格式化时间函数
function formatWithWeek(now, tz) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(now);
  const pick = (type) => parts.find((p) => p.type === type)?.value || "";
  const yyyy = pick("year");
  const mm = pick("month");
  const dd = pick("day");
  const HH = pick("hour");
  const MM = pick("minute");
  const SS = pick("second");
  const wkRaw = pick("weekday");
  const weekday = /[一二三四五六日天]/.test(wkRaw)
    ? (wkRaw.includes("日") || wkRaw.includes("天") ? "星期日" : `星期${wkRaw.match(/[一二三四五六]/)?.[0]}`)
    : wkRaw;
  const dateTime = `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;
  return { dateTime, weekday };
}

// 获取当前时间函数
function getCurrentTime(args = {}) {
  let tz = args.timezone || "Asia/Shanghai";
  
  // 时区验证
  try {
    new Intl.DateTimeFormat('zh-CN', { timeZone: tz });
  } catch (error) {
    console.warn(`无效的时区: ${tz}, 使用默认时区 Asia/Shanghai`);
    tz = "Asia/Shanghai";
  }
  
  const now = new Date();
  const { dateTime, weekday } = formatWithWeek(now, tz);
  
  // 返回格式化后的当前时间
  return `当前时间：${dateTime}（${tz}，${weekday}）。`;
}

// 工具执行函数
export async function runBuiltinTool(name, args = {}) {
  if (name !== "getCurrentTime") return null;
  
  try {
    const output = getCurrentTime(args);
    return { output };
  } catch (error) {
    console.error('工具执行错误:', error);
    return { output: null };
  }
}

