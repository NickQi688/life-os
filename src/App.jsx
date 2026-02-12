import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send, Settings, CheckCircle, Inbox, Zap,
  LayoutDashboard, List, Smartphone, Monitor,
  Plus, Clock, Tag, X, LogOut, ChevronRight,
  Database, ArrowRight, CheckSquare, Calendar,
  Link as LinkIcon, Trash2, Play, Pause, RotateCcw, Maximize2,
  Lightbulb, AlignLeft, MoreHorizontal, CalendarClock,
  Shield, Activity, Layers, ArrowRightCircle, Key, Table,
  HelpCircle, AlertTriangle, Lock, RefreshCw, Eye, ChevronDown, ChevronUp,
  User, Mail, MessageCircle, Globe, Loader2, Info, AlertCircle, Check, FileText,
  Dices, Sliders, Book, PenTool, Hash, Layout, Search, Command, Flame, BookOpen,
  Edit3, MoreVertical, XCircle, ExternalLink, Sparkles, Wand2, Timer, Rocket, Download, BarChart3
} from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import GitHubStorageService from './services/GitHubStorageService.js';
import StatsChart from './components/StatsChart.jsx';

// --- CONSTANTS ---
const STATUS = { INBOX: "收件箱", TODO: "待办", DOING: "进行中", DONE: "已完成" };
const TYPE = { IDEA: "灵感", TASK: "任务", NOTE: "笔记", JOURNAL: "日记" };
const PRIORITY = { HIGH: "紧急", NORMAL: "普通", LOW: "不急" };
const CONTENT_DIRECTIONS = ["AI", "提效工具", "个人成长", "投资", "新媒体", "创业", "工作", "金句", "生活", "学习", "其他"];

// 激励名言库
const QUOTES = [
  { text: "生活不是等待暴风雨过去，而是学会在雨中跳舞。", author: "维维安·格林" },
  { text: "你唯一需要知道的就是如何相信自己，然后你就会明白如何生活。", author: "歌德" },
  { text: "成功不是最终目的，失败也不是致命的，重要的是继续前进的勇气。", author: "温斯顿·丘吉尔" },
  { text: "不要去追逐马，去种草。待到春暖花开时，会有一批骏马任你挑选。", author: "佚名" },
  { text: "种一棵树最好的时间是十年前，其次是现在。", author: "丹比萨·莫约" },
  { text: "我们成为什么样的人，取决于我们在困难时刻的选择。", author: "J.K.罗琳" },
  { text: "每天进步一点点，坚持带来大改变。", author: "佚名" },
  { text: "你的时间有限，不要浪费在别人的生活里。", author: "史蒂夫·乔布斯" },
  { text: "想要得到从未得到过的，就要去做从未做过的。", author: "佚名" },
  { text: "真正的强者不是因为没有人流泪，而是含着眼泪继续奔跑。", author: "佚名" },
  { text: "所有的伟大，都源于一个勇敢的开始。", author: "佚名" },
  { text: "与其担心未来，不如现在好好努力。", author: "佚名" },
  { text: "每一个不曾起舞的日子，都是对生命的辜负。", author: "尼采" },
  { text: "行动是治愈恐惧的良药，而犹豫、拖延将不断滋养恐惧。", author: "佚名" },
  { text: "今天的努力，是明天的实力。", author: "佚名" }
];

// 获取随机名言
const getRandomQuote = () => {
  const index = Math.floor(Math.random() * QUOTES.length);
  return QUOTES[index];
};

// 获取本地日期字符串 (YYYY-MM-DD)
const getLocalDateString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localDate = new Date(now.getTime() - offset);
  return localDate.toISOString().split('T')[0];
};

// 自动生成标题（从内容提取，最多15字）
const generateTitle = (content) => {
  if (!content || !content.trim()) return "无标题";
  const text = content.trim();
  const firstLine = text.split('\n')[0].trim();
  let title = firstLine.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ');
  if (title.length > 15) {
    title = title.substring(0, 15);
  }
  return title || "无标题";
};

/**
 * --- AI SERVICE ---
 */
const AI_PROVIDERS = {
  deepseek:  { label: 'DeepSeek V3',         endpoint: 'https://api.deepseek.com/chat/completions',                              model: 'deepseek-chat' },
  openai:    { label: 'OpenAI',              endpoint: 'https://api.openai.com/v1/chat/completions',                              model: 'gpt-4o-mini' },
  kimi:      { label: 'Kimi (Moonshot)',     endpoint: 'https://api.moonshot.cn/v1/chat/completions',                             model: 'moonshot-v1-8k' },
  doubao:    { label: '豆包 (火山引擎)',       endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',               model: 'ep-你的端点ID' },
  qwen:      { label: '通义千问',             endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',      model: 'qwen-turbo' },
  gemini:    { label: 'Gemini (OpenRouter)',  endpoint: 'https://openrouter.ai/api/v1/chat/completions',                          model: 'google/gemini-3-flash-preview', models: ['google/gemini-3-flash-preview', 'google/gemini-2.0-flash-thinking-exp:free', 'google/gemini-flash-1.5', 'google/gemini-2.5-pro-preview-03-25'] },
};

class AiService {
  constructor() {
    this.STORAGE_KEY = 'lifeos_ai_config';
  }

  getConfig() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : { provider: 'deepseek', model: 'deepseek-chat' };
  }

  saveConfig(config) { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config)); }

  async optimize(titleInput, contentInput, type, options = {}) {
    const config = this.getConfig();
    const apiKey = config.apiKey;
    if (!apiKey) throw new Error("请先在设置中配置 AI API Key");

    // 优化策略配置
    const {
      optimizeContent = true,      // 是否优化内容
      keepOriginal = false,        // 是否保留原文
      extractUrl = true            // 是否提取URL内容
    } = options;

    let finalContent = contentInput || "";
    let originalUrl = null;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const foundUrls = (titleInput + " " + (contentInput || "")).match(urlRegex);

    // --- Jina Reader 轻量抓取 (仅当 extractUrl 为 true 时) ---
    if (foundUrls && foundUrls.length > 0 && extractUrl) {
      originalUrl = foundUrls[0];
      try {
        // 使用 Vercel 代理避免 CORS 问题
        const jinaUrl = `/api/jina/${encodeURIComponent(originalUrl)}`;
        const jinaRes = await fetch(jinaUrl, {
          headers: {
            'Accept': 'text/markdown',
            'User-Agent': 'Life-OS/2.1'
          }
        });

        if (jinaRes.ok) {
          let fetchedMd = await jinaRes.text();

          // 平台识别和特殊处理
          let platform = "网页";
          if (originalUrl.includes('mp.weixin.qq.com')) platform = "微信公众号";
          else if (originalUrl.includes('xiaohongshu.com') || originalUrl.includes('xhslink.com')) platform = "小红书";
          else if (originalUrl.includes('zhihu.com')) platform = "知乎";
          else if (originalUrl.includes('x.com') || originalUrl.includes('twitter.com')) platform = "Twitter/X";
          else if (originalUrl.includes('bilibili.com')) platform = "B站";
          else if (originalUrl.includes('douyin.com')) platform = "抖音";

          // 内容长度根据平台调整
          let maxChars = 5000;
          if (platform === "微信公众号" || platform === "小红书") maxChars = 8000;
          else if (platform === "Twitter/X") maxChars = 3000;

          finalContent = `> [!info] 来源：${platform}
> ${originalUrl}

${fetchedMd.substring(0, maxChars)}${fetchedMd.length > maxChars ? '\n\n...(内容已截断，完整内容请查看原文)' : ''}

---
**原始输入**: ${contentInput || titleInput}`;
        }
      } catch (e) {
        console.warn("Jina fetch failed, falling back to basic AI optimization", e);
        if (originalUrl) {
          finalContent = `${finalContent}\n\n原文链接: ${originalUrl}`;
        }
      }
    }

    const fullText = `标题/摘要输入: ${titleInput || "无"}\n详细内容: ${finalContent}\n记录类型: ${type}`;

    // 根据优化策略生成不同的提示词
    let systemPrompt = "";

    if (keepOriginal) {
      // 保留原内容策略（金句、提示词、日记、笔记）
      systemPrompt = `你是一个个人知识管理助手。
你的任务是：
1. 提炼一个简洁的标题（不超过20字）。
2. **保持原内容不变**，不要修改用户的原文。
3. 识别内容方向（从：AI, 提效工具, 个人成长, 投资, 新媒体, 创业, 工作, 金句, 生活, 学习, 其他 中选择）。

必须返回纯 JSON 格式：
{
  "title": "...",
  "content": "（原内容，不要修改）",
  "direction": "..."
}`;
    } else if (type === TYPE.JOURNAL) {
      // 日记优化策略
      systemPrompt = `你是一个个人日记助手。
你的任务是：
1. 提炼一个简短的日记标题（格式：X月X日日记 + 核心情感或事件）。
2. 优化表达，让日记更流畅、更有感染力，但保持真实情感。
3. 识别内容方向（从：AI, 提效工具, 个人成长, 投资, 新媒体, 创业, 工作, 金句, 生活, 学习, 其他 中选择）。

必须返回纯 JSON 格式：
{
  "title": "...",
  "content": "（优化后的日记内容）",
  "direction": "..."
}`;
    } else if (!optimizeContent) {
      // 不优化内容策略
      systemPrompt = `你是一个个人知识管理助手。
你的任务是：
1. 提炼一个简洁的标题（不超过20字）。
2. 保持原内容不变。
3. 识别内容方向。

必须返回纯 JSON 格式：
{
  "title": "...",
  "content": "（原内容）",
  "direction": "..."
}`;
    } else {
      // 默认优化策略（链接、灵感等）
      systemPrompt = `你是一个个人知识管理助手。
你的任务是：
1. 提炼一个 20 字以内的概括性标题。
2. 如果是网页内容，请提取核心观点并按逻辑条理化。
3. 必须在返回的 content 末尾保留 "原文链接: [URL]" （如果输入中包含URL）。
4. 识别内容方向（从：AI, 提效工具, 个人成长, 投资, 新媒体, 创业, 工作, 金句, 生活, 学习, 其他 中选择）。

必须返回纯 JSON 格式：
{
  "title": "...",
  "content": "...",
  "direction": "..."
}`;
    }

    const providerConfig = AI_PROVIDERS[config.provider] || AI_PROVIDERS.deepseek;
    const endpoint = config.endpoint || providerConfig.endpoint;
    const model = config.model || providerConfig.model;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://life-os.local',
          'X-Title': 'Life-OS'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: fullText }
          ]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || errData?.message || JSON.stringify(errData);
        throw new Error(`AI 请求失败 (${response.status}): ${errMsg}`);
      }

      const data = await response.json();
      const contentStr = data.choices[0].message.content;
      const result = JSON.parse(contentStr.replace(/```json/g, '').replace(/```/g, '').trim());

      if (originalUrl && !result.content.includes('原文链接')) {
        result.content += `\n\n---\n原文链接: ${originalUrl}`;
      }

      return result;
    } catch (error) {
      console.error("AI Error:", error);
      throw error;
    }
  }
}
const aiService = new AiService();

const storageService = new GitHubStorageService();

/**
 * 预览数据（未配置时显示）
 */
const PREVIEW_DATA = [
  {
    id: 'preview-1',
    fields: {
      "标题": "欢迎使用 Life-OS 🎉",
      "内容": "这是你的第一条记录！Life-OS 是一个个人知识管理系统，与 Obsidian + GitHub 无缝集成。\n\n## 主要功能\n- **快速捕获**：随时随地记录想法、任务、笔记\n- **智能分类**：自动按类型和日期组织内容\n- **AI 优化**：支持 AI 自动优化内容（需配置）\n- **双向同步**：与 Obsidian 实时同步\n\n点击右上角设置按钮配置 GitHub，开始使用完整功能！",
      "状态": "收件箱",
      "类型": "笔记",
      "内容方向": "个人成长",
      "记录日期": Date.now(),
      "URL": "",
      "截止日期": "",
      "优先级": "普通"
    },
    created_time: new Date().toISOString()
  },
  {
    id: 'preview-2',
    fields: {
      "标题": "完成项目文档",
      "内容": "需要完成以下文档：\n- API 接口文档\n- 部署指南\n- 用户手册",
      "状态": "待办",
      "类型": "任务",
      "内容方向": "工作",
      "记录日期": Date.now() - 3600000,
      "URL": "",
      "截止日期": new Date().toISOString().split('T')[0],
      "优先级": "紧急"
    },
    created_time: new Date().toISOString()
  },
  {
    id: 'preview-3',
    fields: {
      "标题": "优化前端性能",
      "内容": "## 性能优化清单\n\n- [ ] 代码分割\n- [ ] 图片懒加载\n- [ ] 缓存策略\n- [ ] Bundle 分析",
      "状态": "进行中",
      "类型": "任务",
      "内容方向": "提效工具",
      "记录日期": Date.now() - 7200000,
      "URL": "",
      "截止日期": new Date().toISOString().split('T')[0],
      "优先级": "紧急"
    },
    created_time: new Date().toISOString()
  },
  {
    id: 'preview-4',
    fields: {
      "标题": "探索 AI 辅助编程",
      "内容": "尝试使用 Claude、GitHub Copilot 等 AI 工具提高编程效率。\n\n关注点：\n- 代码生成质量\n- 学习成本\n- 实际效率提升",
      "状态": "收件箱",
      "类型": "灵感",
      "内容方向": "AI",
      "记录日期": Date.now() - 10800000,
      "URL": "",
      "截止日期": "",
      "优先级": "普通"
    },
    created_time: new Date().toISOString()
  },
  {
    id: 'preview-5',
    fields: {
      "标题": "建立晨间习惯",
      "内容": "## 晨间例行事项\n1. 早起 6:30\n2. 冥想 10 分钟\n3. 运动 30 分钟\n4. 阅读 20 分钟\n5. 规划当日任务",
      "状态": "已完成",
      "类型": "灵感",
      "内容方向": "生活",
      "记录日期": Date.now() - 86400000,
      "URL": "",
      "截止日期": "",
      "优先级": "普通"
    },
    created_time: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'preview-6',
    fields: {
      "标题": "React Hooks 最佳实践",
      "内容": "## 常用 Hooks\n- useState：状态管理\n- useEffect：副作用处理\n- useContext：跨组件状态共享\n- useCallback：优化函数引用\n- useMemo：优化计算性能\n\n## 最佳实践\n1. Hooks 必须在函数组件顶层调用\n2. 避免在条件判断中使用 Hooks\n3. 使用 ESLint 插件检查规则",
      "状态": "收件箱",
      "类型": "笔记",
      "内容方向": "学习",
      "记录日期": Date.now() - 3600000,
      "URL": "",
      "截止日期": "",
      "优先级": "普通"
    },
    created_time: new Date().toISOString()
  },
  {
    id: 'preview-7',
    fields: {
      "标题": "明天截止：完成用户测试反馈整理",
      "内容": "需要：\n1. 收集本周用户反馈\n2. 分类整理问题\n3. 评估优先级\n4. 发送给团队",
      "状态": "待办",
      "类型": "任务",
      "内容方向": "工作",
      "记录日期": Date.now() - 5400000,
      "URL": "",
      "截止日期": new Date(Date.now() + 86400000).toISOString().split('T')[0],
      "优先级": "紧急"
    },
    created_time: new Date().toISOString()
  },
  {
    id: 'preview-8',
    fields: {
      "标题": "如何高效阅读技术文档",
      "内容": "要点：\n- 先读摘要和目录，了解结构\n- 抓住核心概念，不必理解所有细节\n- 边读边记笔记，用自己的语言总结\n- 动手实践代码示例\n- 遇到不懂的地方多提问",
      "状态": "收件箱",
      "类型": "灵感",
      "内容方向": "学习",
      "记录日期": Date.now() - 7200000,
      "URL": "https://example.com/reading-tips",
      "截止日期": "",
      "优先级": "普通"
    },
    created_time: new Date().toISOString()
  },
  {
    id: 'preview-9',
    fields: {
      "标题": "Obsidian 双向链接工作流",
      "内容": "使用 [[]] 语法创建双向链接，在不同笔记间建立知识联系。这样可以帮助发现潜在的内容关联，构建个人知识图谱。",
      "状态": "收件箱",
      "类型": "笔记",
      "内容方向": "提效工具",
      "记录日期": Date.now() - 10800000,
      "URL": "",
      "截止日期": "",
      "优先级": "普通"
    },
    created_time: new Date().toISOString()
  },
  {
    id: 'preview-10',
    fields: {
      "标题": "周一项目启动会",
      "内容": "与团队讨论新项目需求、技术选型、时间表。需要准备：\n- 需求文档\n- 初步架构图\n- 工作量评估",
      "状态": "进行中",
      "类型": "任务",
      "内容方向": "工作",
      "记录日期": Date.now() - 14400000,
      "URL": "",
      "截止日期": new Date(Date.now() - 86400000).toISOString().split('T')[0],
      "优先级": "紧急"
    },
    created_time: new Date().toISOString()
  },
  {
    id: 'preview-11',
    fields: {
      "标题": "2026-02-07 周五日记",
      "内容": "今天完成了很多任务，特别是把 Life-OS 的 AI 优化功能重新设计了一遍。从强制自动运行改成了用户主动点击 Sparkles 按钮来优化，这样用户有更多的控制权。还修复了一些 UI 的小问题，感觉整个系统更稳定了。\n\n晚上和朋友聊天，分享了最近的工作成果，得到了很多肯定，心情很好。",
      "状态": "收件箱",
      "类型": "日记",
      "内容方向": "生活",
      "记录日期": Date.now(),
      "URL": "",
      "截止日期": "",
      "优先级": "普通"
    },
    created_time: new Date().toISOString()
  },
  {
    id: 'preview-12',
    fields: {
      "标题": "2026-02-06 周四日记",
      "内容": "深度工作的一天。早上设定了明确的目标，列出了三个核心任务。通过番茄工作法，每个 25 分钟专注一段，中间休息。中午有个灵光一现的想法，赶紧记下来，下午有空再展开。\n\n晚上做了 30 分钟运动，感觉身体和心理都放松了。健康的身体是高效工作的基础。",
      "状态": "收件箱",
      "类型": "日记",
      "内容方向": "个人成长",
      "记录日期": Date.now() - 86400000,
      "URL": "",
      "截止日期": "",
      "优先级": "普通"
    },
    created_time: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'preview-13',
    fields: {
      "标题": "2026-02-05 周三日记",
      "内容": "参加了公司的技术分享会，一位资深工程师讲了微服务架构的演进历程。印象最深的是他说的一句话：'架构没有银弹，每个选择都是在权衡成本和收益'。回来后立刻把这个想法和代码实例都记在笔记里了。",
      "状态": "收件箱",
      "类型": "日记",
      "内容方向": "工作",
      "记录日期": Date.now() - 172800000,
      "URL": "",
      "截止日期": "",
      "优先级": "普通"
    },
    created_time: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'preview-14',
    fields: {
      "标题": "比尔·盖茨的 10 个习惯",
      "内容": "1. 每年读 50 本书\n2. 每周锻炼 3 次\n3. 定期思考\n4. 参加主题学习周\n5. 写年度信\n6. 回顾笔记\n7. 和聪明人交流\n8. 承认错误\n9. 拥抱新技术\n10. 关注全球问题",
      "状态": "收件箱",
      "类型": "笔记",
      "内容方向": "个人成长",
      "记录日期": Date.now() - 18000000,
      "URL": "https://example.com/gates-habits",
      "截止日期": "",
      "优先级": "普通"
    },
    created_time: new Date().toISOString()
  },
  {
    id: 'preview-15',
    fields: {
      "标题": "GitHub 提交最佳实践",
      "内容": "✅ 好的提交信息：\n- 简洁的主题行（不超过 50 字）\n- 空行分隔\n- 详细的说明（何时、为什么）\n- 关键字引用 issue #123\n\n❌ 避免：\n- 不描述的信息如 'fix bug'\n- 混合多个无关改动\n- 混乱的格式",
      "状态": "收件箱",
      "类型": "笔记",
      "内容方向": "提效工具",
      "记录日期": Date.now() - 21600000,
      "URL": "",
      "截止日期": "",
      "优先级": "普通"
    },
    created_time: new Date().toISOString()
  }
];

/**
 * --- UI COMPONENTS & HELPERS ---
 */
const Logo = ({ className = "w-8 h-8", textSize = "text-xl", onClick }) => (
  <div onClick={onClick} className={`flex items-center gap-2.5 ${onClick ? 'cursor-pointer' : ''}`}>
    <div className={`${className} bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30`}><Zap size={20} fill="currentColor" className="drop-shadow-sm" /></div>
    <span className={`font-bold ${textSize} tracking-tight text-slate-100`}>Life<span className="text-indigo-400">OS</span></span>
  </div>
);

const FeatureCard = ({ icon, color, title, desc }) => (
  <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-slate-700 transition-colors group">
    <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>{icon}</div>
    <h3 className="text-xl font-bold mb-3 text-slate-200">{title}</h3>
    <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
  </div>
);

const StepCard = ({ step, icon: Icon, title, desc }) => (
  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center relative z-10 group hover:border-slate-700 transition-colors">
    <div className="w-14 h-14 bg-slate-800 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border-4 border-slate-950 shadow-xl shadow-indigo-900/10 group-hover:scale-110 transition-transform duration-300">
      <Icon size={28} />
    </div>
    <div className="text-xs text-indigo-400 font-bold mb-2">Step {step}</div>
    <h3 className="text-lg font-bold mb-2 text-slate-200">{title}</h3>
    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
  </div>
);

const WelcomeScreen = ({ onStart, onTutorial }) => (
  <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
    {/* 导航 */}
    <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto border-b border-slate-800/50">
      <Logo />
      <button onClick={onStart} className="px-4 py-2 text-sm font-bold text-slate-300 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-all">开始配置</button>
    </nav>

    {/* Hero */}
    <div className="max-w-4xl mx-auto px-6 pt-20 pb-20 text-center animate-fade-in">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6 border border-indigo-500/20">
        <Zap size={12} /> Obsidian + GitHub 同步
      </div>
      <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight">
        掌控你的<br className="md:hidden" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">数字人生</span>
      </h1>
      <p className="text-xl md:text-2xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
        AI 驱动的极速录入 · 数据同步 Obsidian · 完全私有
      </p>
      <button onClick={onStart} className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 rounded-full hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-1">
        开启 LifeOS <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>

    {/* 功能亮点 */}
    <div className="bg-slate-900/50 py-24 border-y border-slate-800/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard icon={<Smartphone size={24} />} color="text-blue-400 bg-blue-400/10" title="极速捕获" desc="专为移动端设计的输入界面，随时随地记录灵感、任务、笔记和日记。支持快捷日期选择和类型切换。" />
          <FeatureCard icon={<Shield size={24} />} color="text-emerald-400 bg-emerald-400/10" title="数据完全私有" desc="数据直接存储在你自己的 GitHub 仓库，以 Markdown 格式保存，与 Obsidian 无缝同步，不经过任何第三方。" />
          <FeatureCard icon={<Sparkles size={24} />} color="text-purple-400 bg-purple-400/10" title="AI 智能优化" desc="支持 DeepSeek、OpenAI、Kimi 等多种模型。一键优化内容，自动提取链接摘要，智能识别分类方向。" />
        </div>
        <div className="grid md:grid-cols-3 gap-8 mt-8">
          <FeatureCard icon={<Calendar size={24} />} color="text-amber-400 bg-amber-400/10" title="任务管理" desc="今日待办、计划看板、截止日期管理，支持快捷完成。GTD 工作流让一切井井有条。" />
          <FeatureCard icon={<BookOpen size={24} />} color="text-cyan-400 bg-cyan-400/10" title="知识库" desc="笔记自动按方向分类，支持搜索和标签筛选。构建你的第二大脑，沉淀个人知识体系。" />
          <FeatureCard icon={<Book size={24} />} color="text-rose-400 bg-rose-400/10" title="日记时间线" desc="以时间线方式回顾每一天。记录生活感悟，AI 帮你润色表达，保留真实情感。" />
        </div>
      </div>
    </div>

    {/* 三步上手 */}
    <div className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">三步即刻开启</h2>
          <p className="text-slate-500">连接 GitHub 仓库，与 Obsidian 双向同步。</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-10 left-0 w-full h-0.5 bg-slate-800 -z-10"></div>
          <StepCard step={1} icon={Database} title="创建 GitHub 仓库" desc="在 GitHub 上新建一个私有仓库，用于存储你的 Life-OS 数据。" />
          <StepCard step={2} icon={Key} title="配置连接" desc="生成 GitHub Token（需要 repo 权限），填入仓库名和分支即可连接。" />
          <StepCard step={3} icon={Rocket} title="开始使用" desc="数据以 Markdown 格式自动同步，打开 Obsidian 就能看到你的所有记录。" />
        </div>
      </div>
    </div>

    {/* 详细教程 */}
    <div className="py-16 bg-slate-900/30 border-t border-slate-800/50">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6 border border-indigo-500/20">
          <HelpCircle size={12} /> 需要帮助？
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">GitHub & Obsidian 详细教程</h3>
        <p className="text-slate-400 mb-8 max-w-2xl mx-auto">不清楚如何获取 GitHub Token？不懂 Obsidian 怎样连接？查看详细的中英文教程，一步步帮你完成设置。</p>
        <button onClick={onTutorial} className="inline-flex items-center justify-center gap-2 px-6 py-3 font-bold text-white bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:border-indigo-500 hover:text-indigo-300 transition-all">
          <BookOpen size={18} />
          查看完整教程
        </button>
      </div>
    </div>

    {/* 技术栈展示 */}
    <div className="py-16 border-t border-slate-800/50">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <p className="text-xs text-slate-600 uppercase tracking-widest mb-6">技术栈</p>
        <div className="flex flex-wrap justify-center gap-4">
          {['React', 'Vite', 'Tailwind CSS', 'GitHub API', 'Obsidian', 'Markdown'].map(t => (
            <span key={t} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-full text-sm text-slate-400">{t}</span>
          ))}
        </div>
      </div>
    </div>

    {/* Footer */}
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-500 py-12 text-center text-sm">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-6 font-medium mb-8 text-slate-400">
          <div className="flex items-center gap-2"><User size={14} /><span>作者：小鲸</span></div>
          <div className="flex items-center gap-2"><Mail size={14} /><span>1584897236@qq.com</span></div>
          <div className="flex items-center gap-2"><MessageCircle size={14} /><span>微信：zhaoqi3210</span></div>
          <a href="https://www.xiaojingfy.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-indigo-400 transition-colors"><Globe size={14} /><span>www.xiaojingfy.com</span></a>
        </div>
        <p className="opacity-50 text-xs">© 2025 LifeOS. Built with Obsidian + GitHub.</p>
      </div>
    </footer>
  </div>
);

const Toast = ({ message, type, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  const bgColors = { success: 'bg-emerald-600/90 text-white', error: 'bg-red-500/90 text-white', info: 'bg-indigo-500/90 text-white' };
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md transition-all animate-fade-in-down border border-white/10 ${bgColors[type] || bgColors.info}`}>
      {type === 'success' ? <Check size={18}/> : type === 'error' ? <AlertCircle size={18}/> : <Info size={18}/>}<span className="text-sm font-medium">{message}</span>
    </div>
  );
};

const Dialog = ({ isOpen, title, children, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in text-slate-200 flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30 shrink-0">
          <h3 className="font-bold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};

// 编辑记录弹窗
const EditRecordModal = ({ isOpen, record, onClose, onSave, directions }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (record) {
      setFormData({
        "标题": record.fields["标题"] || "",
        "内容": record.fields["内容"] || "",
        "状态": record.fields["状态"] || STATUS.INBOX,
        "类型": record.fields["类型"] || TYPE.IDEA,
        "优先级": record.fields["优先级"] || PRIORITY.NORMAL,
        "内容方向": record.fields["内容方向"] || "个人成长",
        "URL": record.fields["URL"] || "",
        "截止日期": record.fields["截止日期"] || ""
      });
    }
  }, [record]);

  const setQuickDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setFormData({...formData, "截止日期": date.toISOString().split('T')[0]});
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(record.id, formData);
  };

  return (
    <Dialog isOpen={isOpen} title="编辑记录" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">标题</label>
          <input className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" value={formData["标题"]} onChange={e => setFormData({...formData, "标题": e.target.value})} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">内容</label>
          <textarea className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm h-32 resize-none" value={formData["内容"]} onChange={e => setFormData({...formData, "内容": e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">状态</label>
            <select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" value={formData["状态"]} onChange={e => setFormData({...formData, "状态": e.target.value})}>
              <option value={STATUS.INBOX}>收件箱</option>
              <option value={STATUS.TODO}>待办</option>
              <option value={STATUS.DOING}>进行中</option>
              <option value={STATUS.DONE}>已完成</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">类型</label>
            <select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" value={formData["类型"]} onChange={e => setFormData({...formData, "类型": e.target.value})}>
              <option value={TYPE.IDEA}>灵感</option>
              <option value={TYPE.TASK}>任务</option>
              <option value={TYPE.NOTE}>笔记</option>
              <option value={TYPE.JOURNAL}>日记</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">优先级</label>
            <select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" value={formData["优先级"]} onChange={e => setFormData({...formData, "优先级": e.target.value})}>
              <option value={PRIORITY.HIGH}>紧急</option>
              <option value={PRIORITY.NORMAL}>普通</option>
              <option value={PRIORITY.LOW}>不急</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">截止日期</label>
            <input type="date" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" value={formData["截止日期"] || ""} onChange={e => setFormData({...formData, "截止日期": e.target.value})} />
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => setQuickDate(0)} className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 transition-colors">今天</button>
              <button type="button" onClick={() => setQuickDate(1)} className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 transition-colors">明天</button>
              <button type="button" onClick={() => setQuickDate(7)} className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 transition-colors">下周</button>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">内容方向</label>
          <select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" value={formData["内容方向"]} onChange={e => setFormData({...formData, "内容方向": e.target.value})}>
            {directions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {formData["URL"] && (
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">URL</label>
            <input className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-400 text-sm" value={formData["URL"]} readOnly />
          </div>
        )}
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors">取消</button>
          <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors">保存</button>
        </div>
      </form>
    </Dialog>
  );
};

// 快捷录入弹窗
const QuickAddModal = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState(TYPE.IDEA);
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(""); setContent(""); setType(TYPE.IDEA); setDueDate(""); setIsOptimized(false); setErrorMsg("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAiOptimize = async () => {
    if (!title.trim() && !content.trim()) return;
    setIsAiLoading(true);
    try {
      const fullText = (title + " " + content).trim();
      const hasUrl = fullText.match(/(https?:\/\/[^\s]+)/g);
      let options = {};
      if (hasUrl) {
        options = { extractUrl: true, optimizeContent: true };
      } else if (type === TYPE.NOTE) {
        options = { keepOriginal: true };
      } else {
        options = { optimizeContent: true };
      }
      const aiResult = await aiService.optimize(title || content.substring(0, 50), content, type, options);
      setTitle(aiResult.title || title);
      setContent(aiResult.content || content);
      setIsOptimized(true);
    } catch (error) {
      setErrorMsg("AI 优化失败: " + error.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const setQuickDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setDueDate(date.toISOString().split('T')[0]);
  };

  const handleSubmit = async () => {
    if (!title.trim() && !content.trim()) return;
    setIsSubmitting(true);
    try {
      await onAdd({ title, content, type, direction: "个人成长", url: "", isOptimized, dueDate: type === TYPE.TASK ? dueDate : "" });
      onClose();
    } catch (error) {
      setErrorMsg("添加失败: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        <div className="p-5 space-y-3">
          <input ref={inputRef} value={title} onChange={e => { setTitle(e.target.value); setIsOptimized(false); }} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }} placeholder="标题 (Cmd+Enter 发送)" className="w-full bg-transparent text-lg text-slate-200 placeholder-slate-600 outline-none" />
          <textarea value={content} onChange={e => { setContent(e.target.value); setIsOptimized(false); }} placeholder="详细内容（链接可直接粘贴在这里）..." className="w-full bg-slate-800/50 rounded-xl p-3 text-sm text-slate-300 placeholder-slate-600 outline-none resize-none h-24" />
          {isOptimized && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Sparkles size={12} /><span>AI 已优化，可编辑后发送</span>
            </div>
          )}
          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle size={12} /><span>{errorMsg}</span>
            </div>
          )}
          {type === TYPE.TASK && (
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-500" />
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setQuickDate(0)} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors">今天</button>
                <button type="button" onClick={() => setQuickDate(1)} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors">明天</button>
                <button type="button" onClick={() => setQuickDate(7)} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors">一周</button>
                <input type="date" className="bg-slate-800 text-xs text-slate-400 rounded-lg px-2 py-1 outline-none" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-3 bg-slate-800/50 flex justify-between items-center border-t border-slate-700/50">
          <div className="flex items-center gap-1.5">
            {[
              { id: TYPE.IDEA, icon: Lightbulb, label: '灵感' },
              { id: TYPE.TASK, icon: CheckSquare, label: '任务' },
              { id: TYPE.NOTE, icon: FileText, label: '笔记' },
              { id: TYPE.JOURNAL, icon: Book, label: '日记' }
            ].map(t => (
              <button key={t.id} onClick={() => setType(t.id)} className={`p-2 rounded-lg transition-all ${type === t.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-700'}`} title={t.label}>
                <t.icon size={16} />
              </button>
            ))}
            <div className="w-px h-6 bg-slate-700 mx-1" />
            <button onClick={handleAiOptimize} disabled={isAiLoading || (!title.trim() && !content.trim())} className={`p-2 rounded-lg transition-all ${isOptimized ? 'text-emerald-400 bg-emerald-500/10' : 'text-indigo-400 hover:bg-indigo-500/10'} disabled:opacity-30`} title="AI 优化">
              {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            </button>
          </div>
          <button onClick={handleSubmit} disabled={(!title.trim() && !content.trim()) || isSubmitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-sm">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {isSubmitting ? "添加中" : "添加"}
          </button>
        </div>
      </div>
    </div>
  );
};

// GitHub & Obsidian 教程组件
const GitHubObsidianTutorial = () => {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [lang, setLang] = useState('zh');

  const faqsZh = [
    {
      id: 'what-is-github',
      title: '什么是 GitHub？为什么要用它保存数据？',
      content: (
        <div className="space-y-2 text-xs text-slate-400">
          <p>GitHub 是全球最大的代码托管平台。Life-OS 使用 GitHub 存储你的数据，而不是某个公司的服务器：</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><span className="text-emerald-400">✓ 数据完全归你所有</span> — 存在你自己的 GitHub 仓库中</li>
            <li><span className="text-emerald-400">✓ 永久保留</span> — GitHub 不会删除你的数据</li>
            <li><span className="text-emerald-400">✓ 版本控制</span> — 自动记录每次修改的历史</li>
            <li><span className="text-emerald-400">✓ 完全免费</span> — GitHub 私有仓库完全免费</li>
          </ul>
        </div>
      )
    },
    {
      id: 'get-github-token',
      title: '如何获取 GitHub Token？',
      content: (
        <div className="space-y-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">步骤：</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>登录 <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">GitHub.com</a></li>
            <li>点击右上角头像 → Settings（设置）</li>
            <li>左侧菜单 → Developer settings → Personal access tokens → Tokens (classic)</li>
            <li>点击 "Generate new token (classic)"</li>
            <li>填写说明（如 "Life-OS"），选择权限：勾选 <span className="bg-slate-700/50 px-1 rounded text-slate-200">repo</span></li>
            <li>点击 "Generate token"，复制并保存（只显示一次！）</li>
          </ol>
          <p className="text-emerald-400 mt-3">💡 提示：token 以 <span className="bg-slate-700/50 px-1 rounded text-slate-200">ghp_</span> 开头</p>
        </div>
      )
    },
    {
      id: 'create-repo',
      title: '如何创建 GitHub 仓库？',
      content: (
        <div className="space-y-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">步骤：</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>在 GitHub 首页点击 <span className="bg-slate-700/50 px-1 rounded text-slate-200">New</span> 按钮</li>
            <li>填写仓库名（如 <span className="text-slate-200">life-os</span>）</li>
            <li>选择 <span className="text-emerald-400">Private（私有）</span> 保护你的数据隐私</li>
            <li>勾选 "Add a README file"</li>
            <li>点击 "Create repository"</li>
          </ol>
          <p className="text-slate-300 font-semibold mt-3">填入设置中的"仓库"字段：<span className="text-slate-400">你的用户名/life-os</span></p>
        </div>
      )
    },
    {
      id: 'what-is-obsidian',
      title: '什么是 Obsidian？怎样连接到 Life-OS？',
      content: (
        <div className="space-y-2 text-xs text-slate-400">
          <p><span className="text-amber-400">Obsidian</span> 是一款强大的本地笔记应用，支持 Markdown 格式，适合知识管理。Life-OS 数据自动同步到 Obsidian：</p>
          <div className="bg-slate-800/50 p-2 rounded mt-2 space-y-2">
            <p className="font-semibold text-slate-300">连接步骤：</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>下载 <a href="https://obsidian.md" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Obsidian</a></li>
              <li>打开 Obsidian 并创建一个库（Vault）</li>
              <li>安装社区插件：搜索 <span className="bg-slate-700/50 px-1 rounded text-slate-200">Obsidian Git</span></li>
              <li>配置 Obsidian Git 连接你的 GitHub 仓库</li>
              <li>设置自动同步间隔（如每 10 分钟自动拉取和推送）</li>
            </ol>
          </div>
          <p className="text-emerald-400 mt-2">✓ 之后，在 Life-OS 中添加的数据会自动出现在 Obsidian 中</p>
        </div>
      )
    },
    {
      id: 'directory-structure',
      title: '文件夹结构是什么？',
      content: (
        <div className="space-y-2 text-xs text-slate-400">
          <p>Life-OS 会自动创建以下文件夹来组织你的数据：</p>
          <div className="bg-slate-800/50 p-3 rounded mt-2 font-mono text-slate-300 space-y-1">
            <p>📦 你的仓库</p>
            <p className="ml-4">├─ 📁 <span className="text-indigo-400">01-碎片想法</span>  （灵感、金句、有趣的想法）</p>
            <p className="ml-4">├─ 📁 <span className="text-yellow-400">02-待办任务</span>  （待办、进行中、已完成的任务）</p>
            <p className="ml-4">├─ 📁 <span className="text-emerald-400">03-知识库</span>    （笔记、学习内容、整理好的知识）</p>
            <p className="ml-4">└─ 📁 <span className="text-amber-400">04-日记</span>      （日记记录、每日反思）</p>
          </div>
          <p className="text-slate-300 font-semibold mt-3">每个 Markdown 文件都包含：</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
            <li>YAML 前置数据（标题、日期、类型等元数据）</li>
            <li>Markdown 内容（你输入的实际内容）</li>
          </ul>
        </div>
      )
    },
    {
      id: 'sync-mechanism',
      title: '数据是如何同步的？',
      content: (
        <div className="space-y-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">同步流程：</p>
          <div className="bg-slate-800/50 p-3 rounded mt-2 space-y-2">
            <p><span className="text-indigo-400">1️⃣ 在 Life-OS 中输入内容</span></p>
            <p className="ml-4 text-slate-400">↓</p>
            <p><span className="text-indigo-400">2️⃣ 点击"发送"或"添加"</span></p>
            <p className="ml-4 text-slate-400">↓</p>
            <p><span className="text-indigo-400">3️⃣ Life-OS 自动创建 Markdown 文件</span></p>
            <p className="ml-4 text-slate-400">↓</p>
            <p><span className="text-indigo-400">4️⃣ 文件上传到你的 GitHub 仓库</span></p>
            <p className="ml-4 text-slate-400">↓</p>
            <p><span className="text-indigo-400">5️⃣ Obsidian Git 自动拉取新文件</span></p>
            <p className="ml-4 text-slate-400">↓</p>
            <p><span className="text-indigo-400">✅ 在 Obsidian 中看到新内容</span></p>
          </div>
          <p className="text-emerald-400 mt-3">💡 你也可以在 Obsidian 中直接编辑，通过 Obsidian Git 推送回 GitHub</p>
        </div>
      )
    },
    {
      id: 'troubleshoot',
      title: '常见问题排查',
      content: (
        <div className="space-y-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">❓ Token 不对？</p>
          <p className="ml-4">检查是否正确复制了整个 token，确保没有多余空格或删除末尾的字符</p>
          <p className="font-semibold text-slate-300 mt-2">❓ 数据没有出现在 GitHub？</p>
          <p className="ml-4">检查仓库名是否正确，格式应为 <span className="bg-slate-700/50 px-1 rounded">用户名/仓库名</span>（区分大小写）</p>
          <p className="font-semibold text-slate-300 mt-2">❓ Obsidian 中没有看到新文件？</p>
          <p className="ml-4">手动运行 Obsidian Git 的"拉取"命令，或等待自动同步间隔触发</p>
          <p className="font-semibold text-slate-300 mt-2">❓ 如何重新配置？</p>
          <p className="ml-4">点击设置底部的"断开连接 & 清除配置"，重新填写信息即可</p>
        </div>
      )
    }
  ];

  const faqsEn = [
    {
      id: 'what-is-github',
      title: 'What is GitHub? Why store data there?',
      content: (
        <div className="space-y-2 text-xs text-slate-400">
          <p>GitHub is the world's largest code hosting platform. Life-OS uses GitHub to store your data in your own repository, not on a company's server:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><span className="text-emerald-400">✓ Your data is completely yours</span> — stored in your own GitHub repository</li>
            <li><span className="text-emerald-400">✓ Permanently preserved</span> — GitHub won't delete your data</li>
            <li><span className="text-emerald-400">✓ Version control</span> — automatically track changes over time</li>
            <li><span className="text-emerald-400">✓ Completely free</span> — GitHub private repositories are free</li>
          </ul>
        </div>
      )
    },
    {
      id: 'get-github-token',
      title: 'How to get a GitHub Token?',
      content: (
        <div className="space-y-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Steps:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Log in to <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">GitHub.com</a></li>
            <li>Click your avatar → Settings</li>
            <li>Left menu → Developer settings → Personal access tokens → Tokens (classic)</li>
            <li>Click "Generate new token (classic)"</li>
            <li>Add a note (e.g., "Life-OS"), check the <span className="bg-slate-700/50 px-1 rounded text-slate-200">repo</span> permission</li>
            <li>Click "Generate token", copy and save (shown only once!)</li>
          </ol>
          <p className="text-emerald-400 mt-3">💡 Tip: token starts with <span className="bg-slate-700/50 px-1 rounded text-slate-200">ghp_</span></p>
        </div>
      )
    },
    {
      id: 'create-repo',
      title: 'How to create a GitHub repository?',
      content: (
        <div className="space-y-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Steps:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Click <span className="bg-slate-700/50 px-1 rounded text-slate-200">New</span> on GitHub homepage</li>
            <li>Enter repository name (e.g., <span className="text-slate-200">life-os</span>)</li>
            <li>Choose <span className="text-emerald-400">Private</span> to protect your privacy</li>
            <li>Check "Add a README file"</li>
            <li>Click "Create repository"</li>
          </ol>
          <p className="text-slate-300 font-semibold mt-3">Enter in settings "Repository" field: <span className="text-slate-400">yourname/life-os</span></p>
        </div>
      )
    },
    {
      id: 'what-is-obsidian',
      title: 'What is Obsidian? How to connect to Life-OS?',
      content: (
        <div className="space-y-2 text-xs text-slate-400">
          <p><span className="text-amber-400">Obsidian</span> is a powerful local note-taking app supporting Markdown, perfect for knowledge management. Life-OS data syncs to Obsidian automatically:</p>
          <div className="bg-slate-800/50 p-2 rounded mt-2 space-y-2">
            <p className="font-semibold text-slate-300">Connection steps:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Download <a href="https://obsidian.md" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Obsidian</a></li>
              <li>Open Obsidian and create a new Vault</li>
              <li>Install the <span className="bg-slate-700/50 px-1 rounded text-slate-200">Obsidian Git</span> community plugin</li>
              <li>Configure Obsidian Git to connect your GitHub repository</li>
              <li>Set auto-sync interval (e.g., every 10 minutes)</li>
            </ol>
          </div>
          <p className="text-emerald-400 mt-2">✓ Now, data added in Life-OS automatically appears in Obsidian</p>
        </div>
      )
    },
    {
      id: 'directory-structure',
      title: 'What is the folder structure?',
      content: (
        <div className="space-y-2 text-xs text-slate-400">
          <p>Life-OS automatically creates these folders to organize your data:</p>
          <div className="bg-slate-800/50 p-3 rounded mt-2 font-mono text-slate-300 space-y-1">
            <p>📦 Your Repository</p>
            <p className="ml-4">├─ 📁 <span className="text-indigo-400">01-Ideas</span>        (Insights, quotes, interesting thoughts)</p>
            <p className="ml-4">├─ 📁 <span className="text-yellow-400">02-Tasks</span>        (Todo, in-progress, completed tasks)</p>
            <p className="ml-4">├─ 📁 <span className="text-emerald-400">03-Knowledge</span>   (Notes, learning content, organized knowledge)</p>
            <p className="ml-4">└─ 📁 <span className="text-amber-400">04-Journal</span>      (Journal entries, daily reflections)</p>
          </div>
          <p className="text-slate-300 font-semibold mt-3">Each Markdown file contains:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
            <li>YAML frontmatter (title, date, type and other metadata)</li>
            <li>Markdown content (your actual content)</li>
          </ul>
        </div>
      )
    },
    {
      id: 'sync-mechanism',
      title: 'How is data synchronized?',
      content: (
        <div className="space-y-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Sync flow:</p>
          <div className="bg-slate-800/50 p-3 rounded mt-2 space-y-2">
            <p><span className="text-indigo-400">1️⃣ Enter content in Life-OS</span></p>
            <p className="ml-4 text-slate-400">↓</p>
            <p><span className="text-indigo-400">2️⃣ Click "Send" or "Add"</span></p>
            <p className="ml-4 text-slate-400">↓</p>
            <p><span className="text-indigo-400">3️⃣ Life-OS automatically creates Markdown file</span></p>
            <p className="ml-4 text-slate-400">↓</p>
            <p><span className="text-indigo-400">4️⃣ File is pushed to your GitHub repository</span></p>
            <p className="ml-4 text-slate-400">↓</p>
            <p><span className="text-indigo-400">5️⃣ Obsidian Git auto-fetches the new file</span></p>
            <p className="ml-4 text-slate-400">↓</p>
            <p><span className="text-indigo-400">✅ See new content in Obsidian</span></p>
          </div>
          <p className="text-emerald-400 mt-3">💡 You can also edit in Obsidian and push back to GitHub via Obsidian Git</p>
        </div>
      )
    },
    {
      id: 'troubleshoot',
      title: 'Troubleshooting',
      content: (
        <div className="space-y-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">❓ Token not working?</p>
          <p className="ml-4">Make sure you copied the entire token correctly with no extra spaces or missing characters</p>
          <p className="font-semibold text-slate-300 mt-2">❓ Data not in GitHub?</p>
          <p className="ml-4">Check repository name is correct, format should be <span className="bg-slate-700/50 px-1 rounded">username/repo</span> (case-sensitive)</p>
          <p className="font-semibold text-slate-300 mt-2">❓ New files not in Obsidian?</p>
          <p className="ml-4">Manually run Obsidian Git "pull" command, or wait for auto-sync interval</p>
          <p className="font-semibold text-slate-300 mt-2">❓ How to reconfigure?</p>
          <p className="ml-4">Click "Disconnect & Clear Settings" at bottom of settings, then re-enter information</p>
        </div>
      )
    }
  ];

  const faqs = lang === 'zh' ? faqsZh : faqsEn;

  return (
    <div className="p-4 bg-slate-800/20 border border-slate-700/50 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <HelpCircle size={14} />
          {lang === 'zh' ? 'GitHub & Obsidian 教程' : 'GitHub & Obsidian Tutorial'}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setLang('zh')}
            className={`px-2 py-1 text-xs rounded transition-colors ${lang === 'zh' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            中文
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-2 py-1 text-xs rounded transition-colors ${lang === 'en' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            English
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {faqs.map(faq => (
          <button
            type="button"
            key={faq.id}
            onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
            className="w-full text-left p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors border border-slate-700/50 hover:border-slate-600 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 group-hover:text-slate-200">{faq.title}</span>
              <div className="transition-transform duration-200" style={{ transform: expandedFaq === faq.id ? 'rotateZ(180deg)' : 'rotateZ(0deg)' }}>
                <ChevronDown size={14} className="text-slate-500" />
              </div>
            </div>
            {expandedFaq === faq.id && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                {faq.content}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const SettingsScreen = ({ onSave, onCancel, initialConfig, notify, onLogout }) => {
  const savedGithub = storageService.getConfig() || {};
  const savedAi = aiService.getConfig() || {};
  const [formData, setFormData] = useState({
    githubToken: savedGithub.token || '',
    githubRepo: savedGithub.repo || '',
    githubBranch: savedGithub.branch || 'main',
    githubBasePath: savedGithub.basePath || '',
    aiProvider: savedAi.provider || 'deepseek',
    aiModel: savedAi.model || AI_PROVIDERS[savedAi.provider]?.model || 'deepseek-chat',
    aiKey: savedAi.apiKey || ''
  });

  // 首次配置时默认创建示例数据
  const [createSampleData, setCreateSampleData] = useState(!initialConfig);

  const handleSubmit = async (e) => {
    e.preventDefault();
    aiService.saveConfig({ provider: formData.aiProvider, model: formData.aiModel, apiKey: formData.aiKey });
    storageService.saveConfig({ token: formData.githubToken, repo: formData.githubRepo, branch: formData.githubBranch, basePath: formData.githubBasePath });

    // 检查是否需要初始化示例数据
    const hasInitialized = localStorage.getItem('lifeos_sample_data_initialized');
    if (createSampleData && !hasInitialized) {
      try {
        notify('正在创建示例数据...', 'info');
        await storageService.initSampleData();
        localStorage.setItem('lifeos_sample_data_initialized', 'true');
        notify('配置已保存，示例数据已创建！', 'success');
      } catch (error) {
        console.error('初始化示例数据失败:', error);
        notify('配置已保存（示例数据创建失败）', 'success');
      }
    } else {
      notify('配置已保存', 'success');
    }

    onSave(formData);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-slate-200">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-800 animate-scale-in">
        <div className="flex items-center gap-3 mb-6"><Logo /></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-6 shadow-inner">
            <h3 className="text-sm font-bold text-indigo-300 mb-2 flex items-center gap-2"><Sparkles size={14}/> AI 配置</h3>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select className="bg-slate-950 border border-slate-800 rounded p-2 text-xs outline-none focus:border-indigo-500" value={formData.aiProvider} onChange={e => {
                const provider = e.target.value;
                const p = AI_PROVIDERS[provider];
                setFormData({...formData, aiProvider: provider, aiModel: p?.model || ''});
              }}>
                {Object.entries(AI_PROVIDERS).map(([key, p]) => (
                  <option key={key} value={key}>{p.label}</option>
                ))}
              </select>
              {AI_PROVIDERS[formData.aiProvider]?.models ? (
                <select className="bg-slate-950 border border-slate-800 rounded p-2 text-xs outline-none focus:border-indigo-500" value={formData.aiModel} onChange={e => setFormData({...formData, aiModel: e.target.value})}>
                  {AI_PROVIDERS[formData.aiProvider].models.map((model, idx) => (
                    <option key={idx} value={model}>{model}</option>
                  ))}
                </select>
              ) : (
                <input className="bg-slate-950 border border-slate-800 rounded p-2 text-xs outline-none focus:border-indigo-500" placeholder={AI_PROVIDERS[formData.aiProvider]?.model || '模型名称'} value={formData.aiModel} onChange={e => setFormData({...formData, aiModel: e.target.value})} />
              )}
            </div>
            <div className="text-[10px] text-slate-600 mb-2">端点: {AI_PROVIDERS[formData.aiProvider]?.endpoint || '未知'}</div>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">API Key</label><input type="password" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" placeholder="sk-..." value={formData.aiKey} onChange={e => setFormData({...formData, aiKey: e.target.value})} /></div>
          </div>

          <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-xl space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2"><Database size={14}/> GitHub / Obsidian 配置</h3>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">GitHub Token</label><input required type="password" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" placeholder="ghp_..." value={formData.githubToken} onChange={e => setFormData({...formData, githubToken: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">仓库 (用户名/仓库名)</label><input required type="text" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" placeholder="user/repo" value={formData.githubRepo} onChange={e => setFormData({...formData, githubRepo: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">分支</label><input className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" value={formData.githubBranch} onChange={e => setFormData({...formData, githubBranch: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">存储路径 (basePath)</label><input className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" placeholder="留空=根目录, lifeos=lifeos子目录" value={formData.githubBasePath} onChange={e => setFormData({...formData, githubBasePath: e.target.value})} /><div className="text-[10px] text-slate-500 mt-1">文件保存位置，如: lifeos 或留空</div></div>
            <button
              type="button"
              onClick={async () => {
                if (!formData.githubToken || !formData.githubRepo) {
                  notify('请先填写Token和仓库', 'error');
                  return;
                }
                try {
                  notify('正在测试连接...', 'info');
                  const testService = new GitHubStorageService();
                  testService.saveConfig({
                    token: formData.githubToken,
                    repo: formData.githubRepo,
                    branch: formData.githubBranch || 'main',
                    basePath: formData.githubBasePath
                  });
                  const records = await testService.fetchRecords();
                  notify(`连接成功！找到 ${records.length} 条记录`, 'success');
                } catch (error) {
                  notify(`连接失败: ${error.message}`, 'error');
                }
              }}
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
            >
              🔍 测试GitHub连接
            </button>
          </div>

          <GitHubObsidianTutorial />

          {!initialConfig && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createSampleData}
                  onChange={(e) => setCreateSampleData(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-emerald-300">创建示例数据</div>
                  <div className="text-xs text-slate-400 mt-1">自动创建 10 条示例记录，帮助你快速了解 Life-OS 的功能</div>
                </div>
              </label>
            </div>
          )}

          <button type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]">保存并连接 Obsidian</button>
          <button type="button" onClick={onCancel} className="w-full text-slate-500 hover:text-slate-300 py-2 text-sm transition-colors">取消</button>
        </form>
        {initialConfig && <div className="mt-6 pt-6 border-t border-slate-800 text-center"><button onClick={onLogout} className="text-red-400 hover:text-red-300 text-sm flex items-center justify-center gap-2 font-medium"><LogOut size={16}/> 断开连接 & 清除配置</button></div>}
      </div>
    </div>
  );
};

// 获取类型图标
const getTypeIcon = (type) => {
  switch (type) {
    case TYPE.TASK: return <CheckSquare size={14} className="text-indigo-400" />;
    case TYPE.NOTE: return <FileText size={14} className="text-emerald-400" />;
    case TYPE.JOURNAL: return <Book size={14} className="text-amber-400" />;
    default: return <Lightbulb size={14} className="text-blue-400" />;
  }
};

const MobileView = ({ onSettings, onGoHome, notify, directions, isPreview = false }) => {
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [details, setDetails] = useState({ type: TYPE.IDEA, dueDate: "", note: "" });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const [aiDirection, setAiDirection] = useState("");
  const [records, setRecords] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [todayInput, setTodayInput] = useState("");

  const loadRecords = async () => {
    // 预览模式：使用本地预览数据
    if (isPreview) {
      setRecords(PREVIEW_DATA);
      return;
    }

    try {
      const data = await storageService.fetchRecords();
      setRecords(data);
    } catch (error) {
      console.error("Failed to load records:", error);
    }
  };

  useEffect(() => { loadRecords(); }, [isPreview]);

  const handleTodayAdd = async (e) => {
    e.preventDefault();
    if (!todayInput.trim()) return;
    const localDate = getLocalDateString();
    const tempId = `temp-${Date.now()}`;
    const newRecord = {
      id: tempId,
      fields: { "标题": todayInput, "内容": "", "状态": STATUS.DOING, "类型": TYPE.TASK, "内容方向": "个人成长", "记录日期": Date.now(), "URL": "", "截止日期": localDate, "优先级": PRIORITY.NORMAL },
      created_time: new Date().toISOString()
    };
    setRecords(prev => [newRecord, ...prev]);
    setTodayInput("");
    try {
      await storageService.addRecord({ title: todayInput, type: TYPE.TASK, status: STATUS.DOING, priority: PRIORITY.NORMAL, dueDate: localDate, direction: "个人成长", source: "Life-OS" });
      notify("任务已添加", "success");
      await loadRecords();
    } catch (error) {
      setRecords(prev => prev.filter(r => r.id !== tempId));
      notify("添加失败: " + error.message, "error");
    }
  };

  const handleAiOptimize = async () => {
    if (!inputValue.trim()) return;
    setIsAiLoading(true);
    try {
      const fullText = inputValue + (details.note ? '\n' + details.note : '');
      const hasUrl = fullText.match(/(https?:\/\/[^\s]+)/g);

      let options = {};
      if (hasUrl) {
        options = { extractUrl: true, optimizeContent: true };
      } else if (details.type === TYPE.NOTE) {
        options = { keepOriginal: true };
      } else {
        options = { optimizeContent: true };
      }

      const aiResult = await aiService.optimize(inputValue, details.note, details.type, options);
      setInputValue(aiResult.title || inputValue);
      setDetails(prev => ({ ...prev, note: aiResult.content || prev.note }));
      setAiDirection(aiResult.direction || "");
      setIsOptimized(true);
      notify("AI 优化完成，可预览编辑后发送", "success");
    } catch (error) {
      notify("AI 优化失败: " + error.message, "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    setIsSending(true);
    try {
      let finalTitle = inputValue;
      let finalContent = details.note || "";
      let finalDirection = aiDirection || "个人成长";
      let originalUrl = null;

      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urlMatch = (inputValue + " " + finalContent).match(urlRegex);
      if (urlMatch && urlMatch.length > 0) {
        originalUrl = urlMatch[0];
      }

      if (isOptimized) {
        // Already optimized via Sparkles, use as-is
      } else if (originalUrl) {
        // URL detected - auto extract & summarize
        try {
          const aiResult = await aiService.optimize(finalTitle, finalContent, details.type, { extractUrl: true, optimizeContent: true });
          finalTitle = aiResult.title;
          finalContent = aiResult.content;
          finalDirection = aiResult.direction;
        } catch(e) {
          console.warn("AI optimization failed", e);
          if (originalUrl && !finalContent.includes('原文链接')) {
            finalContent += `\n\n原文链接: ${originalUrl}`;
          }
        }
      } else {
        // No optimization - just generate title & direction
        try {
          const aiResult = await aiService.optimize(finalTitle, finalContent, details.type, { keepOriginal: true });
          finalTitle = aiResult.title;
          finalContent = aiResult.content;
          finalDirection = aiResult.direction;
        } catch(e) {
          console.warn("AI title generation failed", e);
        }
      }

      await storageService.addRecord({
        title: finalTitle,
        content: finalContent,
        type: details.type,
        direction: finalDirection,
        source: "Life-OS",
        url: originalUrl,
        dueDate: details.type === TYPE.TASK ? details.dueDate : null,
        priority: PRIORITY.NORMAL
      });
      notify("已推送到 Obsidian", "success");
      setInputValue("");
      setDetails({ type: TYPE.IDEA, dueDate: "", note: "" });
      setIsOptimized(false);
      setAiDirection("");
      await loadRecords();
    } catch (error) {
      notify("发送失败: " + error.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickAdd = async (formData) => {
    let finalTitle = formData.title || formData.content.substring(0, 50);
    let finalContent = formData.content;
    let finalDirection = formData.direction;

    if (!formData.isOptimized) {
      const fullText = (finalTitle + " " + finalContent + " " + (formData.url || "")).trim();
      const hasUrl = fullText.match(/(https?:\/\/[^\s]+)/g);
      try {
        if (hasUrl) {
          const aiResult = await aiService.optimize(finalTitle, finalContent, formData.type, { extractUrl: true, optimizeContent: true });
          finalTitle = aiResult.title;
          finalContent = aiResult.content;
          finalDirection = aiResult.direction;
        } else {
          const aiResult = await aiService.optimize(finalTitle, finalContent, formData.type, { keepOriginal: true });
          finalTitle = aiResult.title;
          finalContent = aiResult.content;
          finalDirection = aiResult.direction;
        }
      } catch(e) {
        console.warn("AI optimization failed", e);
      }
    }

    await storageService.addRecord({
      title: finalTitle,
      content: finalContent,
      type: formData.type,
      direction: finalDirection,
      source: "Life-OS",
      url: formData.url || null,
      dueDate: formData.dueDate || null
    });
    notify("已添加记录", "success");
    await loadRecords();
  };

  const handleEditSave = async (id, fields) => {
    try {
      await storageService.updateRecord(id, fields);
      notify("修改已保存", "success");
      setEditingItem(null);
      await loadRecords();
    } catch (error) {
      notify("保存失败: " + error.message, "error");
    }
  };

  const handleDone = async (id) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, fields: { ...r.fields, "状态": STATUS.DONE } } : r));
    try {
      await storageService.updateRecord(id, { "状态": STATUS.DONE });
      notify("任务完成", "success");
    } catch (error) {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, fields: { ...r.fields, "状态": STATUS.DOING } } : r));
      notify("操作失败: " + error.message, "error");
      await loadRecords(); // 只在失败时重新加载
    }
  };

  const todayStr = getLocalDateString();
  const allTodayTasks = records.filter(r =>
    r.fields["类型"] === TYPE.TASK &&
    r.fields["截止日期"] &&
    new Date(r.fields["截止日期"]).toDateString() === new Date(todayStr).toDateString()
  );
  // 排序任务：未完成在前，已完成在后
  const todayTasks = [...allTodayTasks].sort((a, b) => {
    const aIsDone = a.fields["状态"] === STATUS.DONE;
    const bIsDone = b.fields["状态"] === STATUS.DONE;
    if (aIsDone && !bIsDone) return 1;  // a完成，b未完成 → a在后
    if (!aIsDone && bIsDone) return -1; // a未完成，b完成 → a在前
    return 0; // 状态相同，保持原顺序
  });
  const inboxItems = records.filter(r => r.fields["状态"] === STATUS.INBOX && r.fields["类型"] !== TYPE.JOURNAL);
  const knowledgeItems = records.filter(r => r.fields["类型"] === TYPE.NOTE);
  const journalItems = [...records.filter(r => r.fields["类型"] === TYPE.JOURNAL)].sort((a, b) => (a.fields["记录日期"] || 0) - (b.fields["记录日期"] || 0));

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      <div className="px-6 pt-12 pb-4 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 border-b border-white/5">
        <Logo className="w-6 h-6" textSize="text-lg" onClick={onGoHome} />
        <button onClick={onSettings} className="p-2 text-slate-400 hover:text-white"><Settings size={20} /></button>
      </div>
      {editingItem && <EditRecordModal isOpen={true} record={editingItem} onClose={() => setEditingItem(null)} onSave={handleEditSave} directions={directions} />}
      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} onAdd={handleQuickAdd} />

      {/* 演示模式提示 */}
      {isPreview && (
        <div className="bg-amber-900/40 border-b border-amber-600/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <span className="text-sm text-amber-300">这是演示数据，请点击"设置"配置你的账户</span>
          </div>
          <button onClick={onSettings} className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors">
            开始配置
          </button>
        </div>
      )}

      {/* 标签页导航 */}
      <div className="flex border-b border-slate-800 px-4">
        {[
          { id: 'home', icon: LayoutDashboard, label: '首页' },
          { id: 'knowledge', icon: BookOpen, label: '知识库' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm transition-colors ${activeTab === tab.id ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500'}`}
          >
            <tab.icon size={16} />{tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-48 custom-scrollbar">
        {activeTab === 'home' && (
          <>
            {/* 今日待办 */}
            <div className="mt-6">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-2 flex items-center gap-2"><Calendar size={12}/> 今日待办</h2>
              {!isPreview && (
                <form onSubmit={handleTodayAdd} className="mb-3 relative">
                  <input type="text" placeholder="快速添加..." className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:border-indigo-500 outline-none" value={todayInput} onChange={e => setTodayInput(e.target.value)} />
                  <button type="submit" disabled={!todayInput.trim()} className="absolute right-3 top-2.5 text-slate-400 hover:text-indigo-400 disabled:opacity-0 transition-all"><Plus size={18}/></button>
                </form>
              )}
              <div className="space-y-2">
                {todayTasks.map(item => {
                  const isDone = item.fields["状态"] === STATUS.DONE;
                  return (
                    <div key={item.id} className={`bg-slate-900 p-4 rounded-xl border flex items-center justify-between active:scale-[0.98] transition-transform ${isDone ? 'border-slate-800 opacity-50' : 'border-slate-800'}`}>
                      <span onClick={() => setEditingItem(item)} className={`text-sm font-medium flex-1 ${isDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.fields["标题"]}</span>
                      <button onClick={(e) => { e.stopPropagation(); if (!isDone) handleDone(item.id); }} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 text-transparent hover:border-emerald-500'}`}><Check size={14}/></button>
                    </div>
                  );
                })}
                {todayTasks.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle size={40} className="mx-auto text-slate-700 mb-3" />
                    <p className="text-slate-500 text-sm mb-1">今日暂无待办</p>
                    <p className="text-slate-600 text-xs">在上方输入框添加新任务</p>
                  </div>
                )}
              </div>
            </div>

            {/* 收件箱 */}
            <div className="mt-8">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-2 flex items-center justify-between">
                <span className="flex items-center gap-2"><Inbox size={12}/> 收件箱</span>
                <span className="text-slate-600 font-normal">{inboxItems.length}</span>
              </h2>
              <div className="space-y-3">
                {inboxItems.slice(0, 10).map(item => (
                  <div key={item.id} onClick={() => setEditingItem(item)} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-start active:scale-[0.98] transition-transform">
                    <div className="flex-1">
                      <div className="text-slate-200 font-medium line-clamp-2 text-sm">{item.fields["标题"]}</div>
                      <div className="flex items-center gap-2 mt-2">
                        {getTypeIcon(item.fields["类型"])}
                        <span className="text-[10px] text-slate-500">{item.fields["记录日期"] ? new Date(item.fields["记录日期"]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '刚刚'}</span>
                      </div>
                    </div>
                    <div className="text-slate-600"><Edit3 size={16} /></div>
                  </div>
                ))}
                {inboxItems.length === 0 && (
                  <div className="text-center py-8">
                    <Inbox size={40} className="mx-auto text-slate-700 mb-3" />
                    <p className="text-slate-500 text-sm mb-1">收件箱为空</p>
                    <p className="text-slate-600 text-xs">点击右下角按钮添加内容</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'knowledge' && (
          <div className="mt-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-2 flex items-center justify-between">
              <span className="flex items-center gap-2"><BookOpen size={12}/> 知识库</span>
              <span className="text-slate-600 font-normal">{knowledgeItems.length}</span>
            </h2>
            <div className="space-y-3">
              {knowledgeItems.map(item => (
                <div key={item.id} onClick={() => setEditingItem(item)} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-start active:scale-[0.98] transition-transform">
                  <div className="flex-1">
                    <div className="text-slate-200 font-medium line-clamp-2 text-sm">{item.fields["标题"]}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.fields["内容方向"]}</div>
                    <div className="text-[10px] text-slate-600 mt-2">{item.fields["记录日期"] ? new Date(item.fields["记录日期"]).toLocaleDateString() : ''}</div>
                  </div>
                  <div className="text-slate-600"><Edit3 size={16} /></div>
                </div>
              ))}
              {knowledgeItems.length === 0 && (
                <div className="text-center py-8">
                  <BookOpen size={40} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-slate-500 text-sm mb-1">暂无笔记</p>
                  <p className="text-slate-600 text-xs">记录你的知识和想法</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'journal' && (
          <div className="mt-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-2 flex items-center gap-2"><Book size={12}/> 日记</h2>
            <div className="space-y-3">
              {journalItems.map(item => (
                <div key={item.id} onClick={() => setEditingItem(item)} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-start active:scale-[0.98] transition-transform">
                  <div className="flex-1">
                    <div className="text-slate-200 font-medium line-clamp-2 text-sm">{item.fields["标题"]}</div>
                    <div className="text-xs text-slate-400 mt-1 line-clamp-2">{item.fields["内容"]?.substring(0, 100)}...</div>
                    <div className="text-[10px] text-slate-600 mt-2">{item.fields["记录日期"] ? new Date(item.fields["记录日期"]).toLocaleDateString() : ''}</div>
                  </div>
                  <div className="text-slate-600"><Edit3 size={16} /></div>
                </div>
              ))}
              {journalItems.length === 0 && <div className="text-center text-slate-600 py-8 text-sm">暂无日记记录</div>}
            </div>
          </div>
        )}
      </div>

      {/* 预览模式提示 */}
      {isPreview && (
        <div className="fixed bottom-20 left-4 right-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-30 animate-fade-in-up">
          <Sparkles size={20} />
          <div className="flex-1">
            <div className="text-sm font-bold">预览模式</div>
            <div className="text-xs opacity-90">点击右上角设置配置 GitHub，开始使用完整功能</div>
          </div>
          <button onClick={onSettings} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            立即配置
          </button>
        </div>
      )}

      {/* 浮动快捷录入按钮 */}
      {!isPreview && (
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center z-30 hover:scale-110 active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      )}

      {/* 底部输入栏 */}
      {isPreview && (
        <div className="fixed bottom-0 left-0 w-full bg-slate-900/95 backdrop-blur-xl border-t border-white/10 pb-safe-area shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
          <div className="p-4 text-center">
            <p className="text-sm text-slate-400">预览模式下无法添加记录，请先配置 GitHub</p>
          </div>
        </div>
      )}

      {!isPreview && activeTab === 'home' && (
        <div className="fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-xl border-t border-white/10 pb-safe-area shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
          <div className="p-4">
            <div className="relative flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea value={inputValue} onChange={(e) => { setInputValue(e.target.value); setIsOptimized(false); }} placeholder="记录想法/标题..." className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 pr-10 text-base text-white focus:outline-none focus:bg-slate-800 focus:border-indigo-500/50 transition-all resize-none h-14 max-h-32 placeholder-slate-500" rows={1} />
                <button onClick={handleAiOptimize} disabled={!inputValue.trim() || isAiLoading} className={`absolute right-2 bottom-3 p-1.5 rounded-lg transition-all ${isOptimized ? 'text-emerald-400 bg-emerald-500/10' : 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'} disabled:opacity-30`} title="AI 优化">
                  {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                </button>
              </div>
              <button onClick={handleSend} disabled={!inputValue.trim() || isSending} className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${!inputValue.trim() ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 hover:scale-105 active:scale-95'}`}>{isSending ? <Loader2 className="animate-spin" /> : <Send size={24} />}</button>
            </div>
            <div className="flex gap-2 mt-3">
              {[TYPE.IDEA, TYPE.TASK, TYPE.NOTE, TYPE.JOURNAL].map(t => (
                <button key={t} onClick={() => setDetails({...details, type: t})} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${details.type === t ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{t}</button>
              ))}
            </div>
            {details.type === TYPE.TASK && (
              <div className="flex items-center gap-2 mt-3 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
                <Calendar size={16} className="text-slate-500" />
                <span className="text-xs text-slate-500">截止日期:</span>
                <input type="date" className="bg-transparent text-sm text-slate-300 focus:outline-none flex-1" value={details.dueDate} onChange={e => setDetails({...details, dueDate: e.target.value})} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return "深夜好，注意休息";
  if (hour < 9) return "早安，开启元气满满的一天";
  if (hour < 12) return "上午好，保持专注";
  if (hour < 14) return "午安，记得按时吃饭";
  if (hour < 18) return "下午好，继续加油";
  if (hour < 22) return "晚上好，享受闲暇时光";
  return "夜深了，早点休息";
};

const DesktopView = ({ onSettings, onGoHome, notify, directions, isPreview = false }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [quickInput, setQuickInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [randomQuote, setRandomQuote] = useState(getRandomQuote());
  const [todayInput, setTodayInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const [aiDirection, setAiDirection] = useState("");

  const loadRecords = async () => {
    // 预览模式：使用本地预览数据
    if (isPreview) {
      setRecords(PREVIEW_DATA);
      return;
    }

    try {
      const data = await storageService.fetchRecords();
      setRecords(data);
    } catch (error) {
      console.error("Failed to load records:", error);
    }
  };

  useEffect(() => { loadRecords(); }, [isPreview]);

  // 刷新随机名言
  const refreshQuote = () => {
    setRandomQuote(getRandomQuote());
  };

  const handleAiOptimize = async () => {
    if (!quickInput.trim()) return;
    setIsAiLoading(true);
    try {
      const hasUrl = quickInput.match(/(https?:\/\/[^\s]+)/g);
      let options = hasUrl
        ? { extractUrl: true, optimizeContent: true }
        : { optimizeContent: true };

      const aiResult = await aiService.optimize(quickInput, "", TYPE.IDEA, options);
      setQuickInput(aiResult.title || quickInput);
      setAiDirection(aiResult.direction || "");
      setIsOptimized(true);
      notify("AI 优化完成", "success");
    } catch (error) {
      notify("AI 优化失败: " + error.message, "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleTodayAdd = async (e) => {
    e.preventDefault();
    if (!todayInput.trim()) return;
    const localDate = getLocalDateString();
    const tempId = `temp-${Date.now()}`;
    const newRecord = {
      id: tempId,
      fields: { "标题": todayInput, "内容": "", "状态": STATUS.DOING, "类型": TYPE.TASK, "内容方向": "个人成长", "记录日期": Date.now(), "URL": "", "截止日期": localDate, "优先级": PRIORITY.NORMAL },
      created_time: new Date().toISOString()
    };
    setRecords(prev => [newRecord, ...prev]);
    setTodayInput("");
    try {
      await storageService.addRecord({ title: todayInput, type: TYPE.TASK, status: STATUS.DOING, priority: PRIORITY.NORMAL, dueDate: localDate, direction: "个人成长", source: "Life-OS" });
      notify("任务已添加", "success");
      await loadRecords();
    } catch (error) {
      setRecords(prev => prev.filter(r => r.id !== tempId));
      notify("添加失败: " + error.message, "error");
    }
  };

  const handleEditSave = async (id, fields) => {
    try {
      await storageService.updateRecord(id, fields);
      notify("修改已保存", "success");
      setEditingItem(null);
      await loadRecords();
    } catch (error) {
      notify("保存失败: " + error.message, "error");
    }
  };

  const handleDone = async (id) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, fields: { ...r.fields, "状态": STATUS.DONE } } : r));
    try {
      await storageService.updateRecord(id, { "状态": STATUS.DONE });
      notify("任务完成", "success");
    } catch (error) {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, fields: { ...r.fields, "状态": STATUS.DOING } } : r));
      notify("操作失败: " + error.message, "error");
      await loadRecords(); // 只在失败时重新加载
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("确定要删除这条记录吗？")) return;
    try {
      await storageService.deleteRecord(id);
      notify("已删除", "success");
      await loadRecords();
    } catch (error) {
      notify("删除失败: " + error.message, "error");
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    setIsAdding(true);
    try {
      let finalTitle = quickInput;
      let finalContent = "";
      let finalDirection = aiDirection || "个人成长";
      let originalUrl = null;

      const urlMatch = quickInput.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) originalUrl = urlMatch[0];

      if (isOptimized) {
        // Already optimized via Sparkles, use as-is
      } else if (originalUrl) {
        // URL detected - auto extract & summarize
        try {
          const aiResult = await aiService.optimize(finalTitle, finalContent, TYPE.IDEA, { extractUrl: true, optimizeContent: true });
          finalTitle = aiResult.title;
          finalContent = aiResult.content;
          finalDirection = aiResult.direction;
        } catch(e) {
          if (originalUrl && !finalContent.includes('原文链接')) {
            finalContent += `\n\n原文链接: ${originalUrl}`;
          }
        }
      } else {
        // No optimization - just generate title & direction
        try {
          const aiResult = await aiService.optimize(finalTitle, finalContent, TYPE.IDEA, { keepOriginal: true });
          finalTitle = aiResult.title;
          finalContent = aiResult.content;
          finalDirection = aiResult.direction;
        } catch(e) {
          console.warn("AI title generation failed", e);
        }
      }

      await storageService.addRecord({
        title: finalTitle,
        content: finalContent,
        type: TYPE.IDEA,
        direction: finalDirection,
        source: "Life-OS",
        url: originalUrl
      });
      setQuickInput("");
      setIsOptimized(false);
      setAiDirection("");
      await loadRecords();
    } catch (error) {
      notify("添加失败: " + error.message, "error");
    } finally {
      setIsAdding(false);
    }
  };

  // 快捷录入弹窗的添加处理
  const handleQuickAddModal = async (formData) => {
    let finalTitle = formData.title || formData.content.substring(0, 50);
    let finalContent = formData.content;
    let finalDirection = formData.direction;

    if (!formData.isOptimized) {
      const fullText = (finalTitle + " " + finalContent + " " + (formData.url || "")).trim();
      const hasUrl = fullText.match(/(https?:\/\/[^\s]+)/g);
      try {
        if (hasUrl) {
          const aiResult = await aiService.optimize(finalTitle, finalContent, formData.type, { extractUrl: true, optimizeContent: true });
          finalTitle = aiResult.title;
          finalContent = aiResult.content;
          finalDirection = aiResult.direction;
        } else {
          const aiResult = await aiService.optimize(finalTitle, finalContent, formData.type, { keepOriginal: true });
          finalTitle = aiResult.title;
          finalContent = aiResult.content;
          finalDirection = aiResult.direction;
        }
      } catch(e) {
        console.warn("AI optimization failed", e);
      }
    }

    await storageService.addRecord({
      title: finalTitle,
      content: finalContent,
      type: formData.type,
      direction: finalDirection,
      source: "Life-OS",
      url: formData.url || null,
      dueDate: formData.dueDate || null
    });
    notify("已添加记录", "success");
    await loadRecords();
  };

  const inboxItems = records.filter(r => r.fields["状态"] === STATUS.INBOX && r.fields["类型"] !== TYPE.JOURNAL);
  const todoItems = records.filter(r => r.fields["状态"] === STATUS.TODO);
  const doingItems = records.filter(r => r.fields["状态"] === STATUS.DOING);
  const doneItems = records.filter(r => r.fields["状态"] === STATUS.DONE);
  const knowledgeItems = records.filter(r => r.fields["类型"] === TYPE.NOTE);
  const journalItems = [...records.filter(r => r.fields["类型"] === TYPE.JOURNAL)].sort((a, b) => (a.fields["记录日期"] || 0) - (b.fields["记录日期"] || 0));

  const todayStr = getLocalDateString();
  const allTodayTasks = records.filter(r =>
    r.fields["类型"] === TYPE.TASK &&
    r.fields["截止日期"] &&
    new Date(r.fields["截止日期"]).toDateString() === new Date(todayStr).toDateString()
  );
  // 排序任务：未完成在前，已完成在后
  const todayTasks = [...allTodayTasks].sort((a, b) => {
    const aIsDone = a.fields["状态"] === STATUS.DONE;
    const bIsDone = b.fields["状态"] === STATUS.DONE;
    if (aIsDone && !bIsDone) return 1;  // a完成，b未完成 → a在后
    if (!aIsDone && bIsDone) return -1; // a未完成，b完成 → a在前
    return 0; // 状态相同，保持原顺序
  });

  const stats = {
    total: records.length,
    inbox: inboxItems.length,
    todo: todoItems.length,
    doing: doingItems.length,
    done: doneItems.length
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      {/* 侧边栏 */}
      <div className="w-64 bg-slate-900/50 border-r border-slate-800 p-6 flex flex-col">
        <div className="mb-8"><Logo className="w-7 h-7" textSize="text-xl" onClick={onGoHome} /></div>
        <nav className="space-y-2 flex-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: '仪表盘' },
            { id: 'inbox', icon: Inbox, label: '收件箱' },
            { id: 'planner', icon: Calendar, label: '计划看板' },
            { id: 'knowledge', icon: BookOpen, label: '知识库' },
            { id: 'journal', icon: Book, label: '日记' },
            { id: 'stats', icon: BarChart3, label: '数据统计' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <tab.icon size={18} />{tab.label}
            </button>
          ))}
        </nav>
        <button onClick={onSettings} className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors">
          <Settings size={18} />设置
        </button>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* 演示模式提示 */}
        {isPreview && (
          <div className="bg-amber-900/40 border-b border-amber-600/30 px-8 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-400" />
              <span className="text-sm text-amber-300">这是演示数据，请点击左侧"设置"配置你的账户开始使用</span>
            </div>
            <button onClick={onSettings} className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors">
              开始配置
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-8">
          {editingItem && <EditRecordModal isOpen={true} record={editingItem} onClose={() => setEditingItem(null)} onSave={handleEditSave} directions={directions} />}
          <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} onAdd={handleQuickAddModal} />

        {/* 预览模式提示 */}
        {isPreview && (
          <div className="max-w-5xl mx-auto mb-6">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-4">
              <Sparkles size={24} />
              <div className="flex-1">
                <div className="font-bold">预览模式</div>
                <div className="text-sm opacity-90">当前显示的是示例数据。点击左侧"设置"配置 GitHub，开始使用完整功能并保存你的数据。</div>
              </div>
              <button onClick={onSettings} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                <Settings size={16} />
                立即配置
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold mb-2">{getGreeting()}</h1>
              <p className="text-slate-500">{isPreview ? "预览模式 - 这是 Life-OS 的示例数据" : "这是你的个人知识管理中枢。"}</p>
            </div>

            {/* 随机名言 */}
            <div className="bg-gradient-to-r from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-lg">
                  <Sparkles className="text-indigo-400" size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-lg text-slate-200 italic mb-2">"{randomQuote.text}"</p>
                  <p className="text-sm text-slate-400">— {randomQuote.author}</p>
                </div>
                <button onClick={refreshQuote} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="刷新名言">
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="text-3xl font-bold text-slate-100">{stats.total}</div>
                <div className="text-sm text-slate-500 mt-1">全部记录</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="text-3xl font-bold text-emerald-400">{stats.done}</div>
                <div className="text-sm text-slate-500 mt-1">已完成</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="text-3xl font-bold text-indigo-400">{stats.doing}</div>
                <div className="text-sm text-slate-500 mt-1">进行中</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="text-3xl font-bold text-slate-100">{Math.round(stats.done / Math.max(stats.total, 1) * 100)}%</div>
                <div className="text-sm text-slate-500 mt-1">完成率</div>
              </div>
            </div>

            {/* 今日任务 + 收件箱 并列 */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2"><Calendar className="text-indigo-400" size={20} /> 今日任务</h2>
                  <div className="text-xs text-slate-500 flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span> {todayTasks.length} 待完成</div>
                </div>
                {!isPreview && (
                  <form onSubmit={handleTodayAdd} className="mb-4 relative group">
                    <input type="text" value={todayInput} onChange={(e) => setTodayInput(e.target.value)} placeholder="快速添加今日任务 (回车保存)..." className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500 outline-none transition-all pl-10" />
                    <Plus size={16} className="absolute left-3 top-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </form>
                )}
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {todayTasks.map(item => {
                    const isDone = item.fields["状态"] === STATUS.DONE;
                    const priority = item.fields["优先级"];
                    const priorityColor = priority === PRIORITY.HIGH ? 'bg-red-500' : priority === PRIORITY.LOW ? 'bg-slate-500' : 'bg-yellow-500';
                    return (
                      <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${isDone ? 'bg-slate-900 border-slate-800 opacity-50' : 'bg-slate-800/50 border-slate-700 hover:border-indigo-500/50'}`}>
                        <button onClick={(e) => { e.stopPropagation(); if (!isDone) handleDone(item.id); }} className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all ${isDone ? 'bg-emerald-500 text-white' : 'border-2 border-slate-500 hover:border-emerald-500'}`}>
                          {isDone && <Check size={12} />}
                        </button>
                        {priority === PRIORITY.HIGH && !isDone && <span className={`w-2 h-2 rounded-full ${priorityColor} shrink-0`} title="紧急"></span>}
                        <span onClick={() => setEditingItem(item)} className={`flex-1 text-sm ${isDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.fields["标题"]}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
                      </div>
                    );
                  })}
                  {todayTasks.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle size={40} className="mx-auto text-slate-700 mb-3" />
                      <p className="text-slate-500 text-sm mb-1">今日暂无任务</p>
                      <p className="text-slate-600 text-xs">在上方输入框添加新任务</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2"><Inbox className="text-blue-400" size={20} /> 收件箱</h2>
                  <span className="text-xs text-slate-500">{inboxItems.length}</span>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {inboxItems.slice(0, 8).map(item => (
                    <div key={item.id} onClick={() => setEditingItem(item)} className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors group">
                      {getTypeIcon(item.fields["类型"])}
                      <span className="text-sm text-slate-300 flex-1 truncate">{item.fields["标题"]}</span>
                      <ChevronRight className="text-slate-700 group-hover:text-slate-500 shrink-0" size={14} />
                    </div>
                  ))}
                  {inboxItems.length === 0 && (
                    <div className="text-center py-8">
                      <Inbox size={32} className="mx-auto text-slate-700 mb-2" />
                      <p className="text-slate-500 text-xs">收件箱为空</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inbox' && (
          <div className="max-w-5xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold mb-8">收件箱</h1>
            {isPreview ? (
              <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
                <p className="text-slate-400 text-sm">预览模式下无法添加记录，请先配置 GitHub</p>
              </div>
            ) : (
              <form onSubmit={handleQuickAdd} className="mb-6">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={quickInput}
                      onChange={(e) => { setQuickInput(e.target.value); setIsOptimized(false); }}
                      placeholder="快速添加...（支持URL自动抓取）"
                      className="w-full p-3 pr-10 bg-slate-900 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-slate-200"
                    />
                    <button type="button" onClick={handleAiOptimize} disabled={!quickInput.trim() || isAiLoading} className={`absolute right-2 top-2.5 p-1.5 rounded-lg transition-all ${isOptimized ? 'text-emerald-400 bg-emerald-500/10' : 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'} disabled:opacity-30`} title="AI 优化">
                      {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    </button>
                  </div>
                  <button type="submit" disabled={!quickInput.trim() || isAdding} className="px-6 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                    {isAdding ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                  </button>
                </div>
              </form>
            )}
            <div className="space-y-3">
              {inboxItems.map(item => (
                <div key={item.id} onClick={() => setEditingItem(item)} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex justify-between items-start hover:border-indigo-500 hover:bg-slate-800/30 transition-all cursor-pointer">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getTypeIcon(item.fields["类型"])}
                      <h3 className="text-lg font-bold">{item.fields["标题"]}</h3>
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-2">{item.fields["内容"]?.substring(0, 200)}...</p>
                    {item.fields["URL"] && <a href={item.fields["URL"]} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-xs text-indigo-400 hover:underline flex items-center gap-1 mt-2"><ExternalLink size={12} />查看原文</a>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><Edit3 size={18} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
              {inboxItems.length === 0 && <div className="text-center text-slate-600 py-16">收件箱为空</div>}
            </div>
          </div>
        )}

        {activeTab === 'planner' && (
          <div className="max-w-6xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold mb-8 text-center">计划看板</h1>
            <div className="grid grid-cols-4 gap-6">
              {[
                { id: 'todo', title: '待办', items: todoItems, color: 'border-slate-600' },
                { id: 'doing', title: '进行中', items: doingItems, color: 'border-indigo-500' },
                { id: 'done', title: '已完成', items: doneItems, color: 'border-emerald-500' }
              ].map(column => (
                <div key={column.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <h2 className="font-bold mb-4 flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${column.id === 'done' ? 'bg-emerald-500' : column.id === 'doing' ? 'bg-indigo-500' : 'bg-slate-500'}`} />{column.title} ({column.items.length})</h2>
                  <div className="space-y-3">
                    {column.items.map(item => (
                      <div key={item.id} className="bg-slate-800 rounded-lg p-4 hover:bg-slate-700 transition-colors border border-slate-700 group">
                        <div className="flex items-start justify-between">
                          <div onClick={() => setEditingItem(item)} className="flex-1 cursor-pointer">
                            <div className="font-medium text-sm mb-2">{item.fields["标题"]}</div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>{item.fields["类型"]}</span>
                              <span>{item.fields["记录日期"] ? new Date(item.fields["记录日期"]).toLocaleDateString() : ''}</span>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-all ml-2">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="max-w-5xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold mb-8">数据统计</h1>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
              <StatsChart records={records} />
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="max-w-5xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold mb-6">知识库</h1>
            {/* 搜索 */}
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" placeholder="搜索笔记..." className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-indigo-500 outline-none" value={searchText} onChange={e => setSearchText(e.target.value)} />
            </div>
            {/* 标签筛选 */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button onClick={() => setSearchText("")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!searchText ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>全部</button>
              {directions.filter(d => knowledgeItems.some(i => i.fields["内容方向"] === d)).map(d => (
                <button key={d} onClick={() => setSearchText(searchText === d ? "" : d)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${searchText === d ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{d}</button>
              ))}
            </div>
            {/* 卡片网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {knowledgeItems
                .filter(i => !searchText || (i.fields["标题"] || "").includes(searchText) || (i.fields["内容方向"] || "") === searchText || (i.fields["内容"] || "").includes(searchText))
                .map(item => (
                <div key={item.id} onClick={() => setEditingItem(item)} className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-emerald-500/30 transition-all flex flex-col cursor-pointer group">
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-medium">{item.fields["内容方向"] || "其他"}</span>
                  </div>
                  <h3 className="font-bold text-slate-200 mb-2 line-clamp-1">{item.fields["标题"]}</h3>
                  <p className="text-sm text-slate-500 line-clamp-3 flex-1">{item.fields["内容"]?.substring(0, 150)}</p>
                  <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-600">
                    <span>{item.fields["记录日期"] ? new Date(item.fields["记录日期"]).toLocaleDateString() : ''}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-slate-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {knowledgeItems.length === 0 && <div className="text-center text-slate-600 py-16">暂无笔记记录</div>}
          </div>
        )}

        {activeTab === 'journal' && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold mb-8">日记</h1>
            {journalItems.length > 0 ? (
              <div className="relative pl-8 border-l-2 border-slate-800 space-y-8">
                {journalItems.map(item => (
                  <div key={item.id} onClick={() => setEditingItem(item)} className="relative cursor-pointer group">
                    <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-slate-950 border-[3px] border-slate-700 group-hover:border-indigo-500 transition-colors" />
                    <div className="text-xs font-mono text-slate-500 mb-2">{item.fields["记录日期"] ? new Date(item.fields["记录日期"]).toLocaleDateString() : ''}</div>
                    <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 group-hover:border-slate-700 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-200">{item.fields["标题"]}</h3>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-1 text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {item.fields["内容"] && <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{item.fields["内容"]}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-600 py-16">暂无日记记录</div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* 浮动快捷录入按钮 */}
      {!isPreview && (
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center z-50 hover:scale-110 active:scale-95 transition-transform"
          title="快捷录入"
        >
          <Plus size={28} />
        </button>
      )}
    </div>
  );
};

export default function App() {
  const [config, setConfig] = useState(null);
  const [screen, setScreen] = useState('welcome');
  const [toast, setToast] = useState(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const saved = storageService.getConfig();
    if (saved) { setConfig(saved); setScreen('main'); }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const notify = (message, type = 'info') => setToast({ message, type });

  // 预览模式：未配置时
  const isPreview = !config;

  if (screen === 'settings') return <SettingsScreen onSave={(c) => { setConfig(c); setScreen('main'); notify("配置已保存", "success"); }} onCancel={() => setScreen(config ? 'main' : 'welcome')} initialConfig={config} notify={notify} onLogout={() => { storageService.saveConfig(null); setConfig(null); setScreen('welcome'); }} />;

  // 欢迎页（未配置时）
  if (screen === 'welcome') {
    return (
      <>
        <WelcomeScreen onStart={() => setScreen(config ? 'main' : 'preview')} onTutorial={() => setScreen('settings')} />
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen">
      {isMobile ? (
        <MobileView onSettings={() => setScreen('settings')} onGoHome={() => setScreen('welcome')} notify={notify} directions={CONTENT_DIRECTIONS} isPreview={screen === 'preview'} />
      ) : (
        <DesktopView onSettings={() => setScreen('settings')} onGoHome={() => setScreen('welcome')} notify={notify} directions={CONTENT_DIRECTIONS} isPreview={screen === 'preview'} />
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
