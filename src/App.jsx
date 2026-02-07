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
class AiService {
  constructor() {
    this.STORAGE_KEY = 'lifeos_ai_config';
  }

  getConfig() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : { provider: 'gemini', model: 'google/gemini-2.0-flash-001' };
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
        const jinaUrl = `https://r.jina.ai/${encodeURIComponent(originalUrl)}`;
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

    const endpoint = config.provider === 'deepseek'
      ? 'https://api.deepseek.com/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';

    const model = config.model || (config.provider === 'deepseek' ? 'deepseek-chat' : 'google/gemini-2.0-flash-001');

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

      if (!response.ok) throw new Error(`AI 请求失败: ${response.status}`);

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
const QuickAddModal = ({ isOpen, onClose, onAdd, directions }) => {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: TYPE.IDEA,
    direction: "个人成长",
    url: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: "",
        content: "",
        type: TYPE.IDEA,
        direction: "个人成长",
        url: ""
      });
      setIsOptimized(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAiOptimize = async () => {
    if (!formData.title.trim() && !formData.content.trim()) return;
    setIsAiLoading(true);
    try {
      const fullText = (formData.title + " " + formData.content + " " + formData.url).trim();
      const hasUrl = fullText.match(/(https?:\/\/[^\s]+)/g);

      let options = {};
      if (hasUrl || formData.url) {
        options = { extractUrl: true, optimizeContent: true };
      } else if (formData.type === TYPE.NOTE) {
        options = { keepOriginal: true };
      } else {
        options = { optimizeContent: true };
      }

      const aiResult = await aiService.optimize(
        formData.title || formData.content.substring(0, 50),
        formData.content + (formData.url ? '\n' + formData.url : ''),
        formData.type,
        options
      );
      setFormData(prev => ({
        ...prev,
        title: aiResult.title || prev.title,
        content: aiResult.content || prev.content,
        direction: aiResult.direction || prev.direction
      }));
      setIsOptimized(true);
    } catch (error) {
      console.error("AI optimization failed:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() && !formData.content.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd({ ...formData, isOptimized });
      onClose();
    } catch (error) {
      console.error("添加失败:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} title="快捷录入" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">标题</label>
          <input
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm"
            value={formData.title}
            onChange={e => { setFormData({...formData, title: e.target.value}); setIsOptimized(false); }}
            placeholder="简短描述..."
          />
        </div>
        <div className="relative">
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">内容</label>
          <textarea
            className="w-full p-3 pr-10 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm h-32 resize-none"
            value={formData.content}
            onChange={e => { setFormData({...formData, content: e.target.value}); setIsOptimized(false); }}
            placeholder="详细内容..."
          />
          <button
            type="button"
            onClick={handleAiOptimize}
            disabled={(!formData.title.trim() && !formData.content.trim()) || isAiLoading}
            className={`absolute right-2 bottom-2 p-1.5 rounded-lg transition-all ${isOptimized ? 'text-emerald-400' : 'text-slate-500 hover:text-indigo-400'} disabled:opacity-30`}
            title="AI 优化"
          >
            {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          </button>
        </div>
        {isOptimized && (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <Sparkles size={12} />
            <span>AI 已优化，可编辑后发送</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">类型</label>
            <select
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
            >
              <option value={TYPE.IDEA}>灵感</option>
              <option value={TYPE.TASK}>任务</option>
              <option value={TYPE.NOTE}>笔记</option>
              <option value={TYPE.JOURNAL}>日记</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">内容方向</label>
            <select
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm"
              value={formData.direction}
              onChange={e => setFormData({...formData, direction: e.target.value})}
            >
              {directions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">URL（可选）</label>
          <input
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm"
            value={formData.url}
            onChange={e => setFormData({...formData, url: e.target.value})}
            placeholder="https://..."
          />
        </div>
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors">取消</button>
          <button
            type="submit"
            disabled={isSubmitting || (!formData.title.trim() && !formData.content.trim())}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : null}
            {isSubmitting ? "添加中..." : "添加记录"}
          </button>
        </div>
      </form>
    </Dialog>
  );
};

const SettingsScreen = ({ onSave, onCancel, initialConfig, notify, onLogout }) => {
  const [formData, setFormData] = useState({
    githubToken: initialConfig?.githubToken || '',
    githubRepo: initialConfig?.githubRepo || '',
    githubBranch: initialConfig?.githubBranch || 'main',
    aiProvider: initialConfig?.aiProvider || 'gemini',
    aiModel: initialConfig?.aiModel || 'google/gemini-2.0-flash-001',
    aiKey: initialConfig?.aiKey || ''
  });

  // 首次配置时默认创建示例数据
  const [createSampleData, setCreateSampleData] = useState(!initialConfig);

  const handleSubmit = async (e) => {
    e.preventDefault();
    aiService.saveConfig({ provider: formData.aiProvider, model: formData.aiModel, apiKey: formData.aiKey });
    storageService.saveConfig({ token: formData.githubToken, repo: formData.githubRepo, branch: formData.githubBranch, basePath: '' });

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
              <select className="bg-slate-950 border border-slate-800 rounded p-2 text-xs outline-none focus:border-indigo-500" value={formData.aiProvider} onChange={e => setFormData({...formData, aiProvider: e.target.value})}>
                <option value="gemini">Gemini (OpenRouter)</option>
                <option value="deepseek">DeepSeek (Official)</option>
              </select>
              <input className="bg-slate-950 border border-slate-800 rounded p-2 text-xs outline-none focus:border-indigo-500" placeholder="模型名称" value={formData.aiModel} onChange={e => setFormData({...formData, aiModel: e.target.value})} />
            </div>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">API Key</label><input type="password" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" placeholder="sk-..." value={formData.aiKey} onChange={e => setFormData({...formData, aiKey: e.target.value})} /></div>
          </div>

          <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-xl space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2"><Database size={14}/> GitHub / Obsidian 配置</h3>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">GitHub Token</label><input required type="password" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" placeholder="ghp_..." value={formData.githubToken} onChange={e => setFormData({...formData, githubToken: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">仓库 (用户名/仓库名)</label><input required type="text" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" placeholder="user/repo" value={formData.githubRepo} onChange={e => setFormData({...formData, githubRepo: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">分支</label><input className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200 text-sm" value={formData.githubBranch} onChange={e => setFormData({...formData, githubBranch: e.target.value})} /></div>
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
                    basePath: ''
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

const MobileView = ({ onSettings, notify, directions, isPreview = false }) => {
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
    try {
      await storageService.addRecord({
        title: todayInput,
        type: TYPE.TASK,
        status: STATUS.DOING,
        priority: PRIORITY.NORMAL,
        dueDate: localDate,
        direction: "个人成长",
        source: "Life-OS"
      });
      setTodayInput("");
      notify("任务已添加", "success");
      loadRecords();
    } catch (error) {
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
          console.warn("AI title generation failed, using fallback", e);
          // AI失败，使用简单的标题生成
          finalTitle = generateTitle(finalContent || finalTitle);
          finalContent = finalContent || inputValue;
        }
      }

      // 最终检查：确保标题不为空
      if (!finalTitle || !finalTitle.trim()) {
        finalTitle = generateTitle(finalContent || inputValue);
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
      loadRecords();
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
        console.warn("AI optimization failed, using fallback", e);
        // AI失败，使用简单的标题生成
        finalTitle = generateTitle(finalContent || finalTitle);
        finalContent = finalContent || formData.content;
      }
    }

    // 最终检查：确保标题不为空
    if (!finalTitle || !finalTitle.trim()) {
      finalTitle = generateTitle(finalContent || formData.title);
    }

    await storageService.addRecord({
      title: finalTitle,
      content: finalContent,
      type: formData.type,
      direction: finalDirection,
      source: "Life-OS",
      url: formData.url || null
    });
    notify("已添加记录", "success");
    loadRecords();
  };

  const handleEditSave = async (id, fields) => {
    try {
      await storageService.updateRecord(id, fields);
      notify("修改已保存", "success");
      setEditingItem(null);
      loadRecords();
    } catch (error) {
      notify("保存失败: " + error.message, "error");
    }
  };

  const handleDone = async (id) => {
    try {
      await storageService.updateRecord(id, { "状态": STATUS.DONE });
      notify("任务完成", "success");
      loadRecords();
    } catch (error) {
      notify("操作失败: " + error.message, "error");
    }
  };

  const todayStr = getLocalDateString();
  const todayTasks = records.filter(r =>
    r.fields["类型"] === TYPE.TASK &&
    r.fields["截止日期"] &&
    new Date(r.fields["截止日期"]).toDateString() === new Date(todayStr).toDateString()
  );
  // 排序任务：未完成在前，已完成在后
  const sortedTodayTasks = [...todayTasks].sort((a, b) => {
    const aIsDone = a.fields["状态"] === STATUS.DONE;
    const bIsDone = b.fields["状态"] === STATUS.DONE;
    if (aIsDone && !bIsDone) return 1;  // a完成，b未完成 → a在后
    if (!aIsDone && bIsDone) return -1; // a未完成，b完成 → a在前
    return 0; // 状态相同，保持原顺序
  });
  const recentInputs = records.slice(0, 10);
  const knowledgeItems = records.filter(r => r.fields["类型"] === TYPE.NOTE);
  const journalItems = records.filter(r => r.fields["类型"] === TYPE.JOURNAL);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      <div className="px-6 pt-12 pb-4 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 border-b border-white/5">
        <Logo className="w-6 h-6" textSize="text-lg" />
        <button onClick={onSettings} className="p-2 text-slate-400 hover:text-white"><Settings size={20} /></button>
      </div>
      {editingItem && <EditRecordModal isOpen={true} record={editingItem} onClose={() => setEditingItem(null)} onSave={handleEditSave} directions={directions} />}
      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} onAdd={handleQuickAdd} directions={directions} />

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
                {sortedTodayTasks.map(item => (
                  <div key={item.id} onClick={() => setEditingItem(item)} className={`bg-slate-900 p-4 rounded-xl border flex items-center justify-between active:scale-[0.98] transition-transform ${item.fields["状态"] === STATUS.DONE ? 'border-slate-800 opacity-50' : 'border-slate-800'}`}>
                    <span className={`text-sm font-medium ${item.fields["状态"] === STATUS.DONE ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.fields["标题"]}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDone(item.id); }} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${item.fields["状态"] === STATUS.DONE ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 text-transparent hover:border-emerald-500'}`}><Check size={14}/></button>
                  </div>
                ))}
                {sortedTodayTasks.length === 0 && <div className="text-center text-slate-600 py-4 text-sm">今日暂无待办</div>}
              </div>
            </div>

            {/* 最近录入 */}
            <div className="mt-8">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-2 flex items-center gap-2"><Inbox size={12}/> 最近录入</h2>
              <div className="space-y-3">
                {recentInputs.map(item => (
                  <div key={item.id} onClick={() => setEditingItem(item)} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-start active:scale-[0.98] transition-transform">
                    <div>
                      <div className="text-slate-200 font-medium line-clamp-2 text-sm">{item.fields["标题"]}</div>
                      <div className="flex items-center gap-2 mt-2">
                        {getTypeIcon(item.fields["类型"])}
                        <span className="text-[10px] text-slate-500">{item.fields["记录日期"] ? new Date(item.fields["记录日期"]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '刚刚'}</span>
                      </div>
                    </div>
                    <div className="text-slate-600"><Edit3 size={16} /></div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'knowledge' && (
          <div className="mt-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-2 flex items-center gap-2"><BookOpen size={12}/> 知识库</h2>
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
              {knowledgeItems.length === 0 && <div className="text-center text-slate-600 py-8 text-sm">暂无笔记记录</div>}
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
                <button onClick={handleAiOptimize} disabled={!inputValue.trim() || isAiLoading} className={`absolute right-2 bottom-3 p-1.5 rounded-lg transition-all ${isOptimized ? 'text-emerald-400' : 'text-slate-500 hover:text-indigo-400'} disabled:opacity-30`} title="AI 优化">
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

const DesktopView = ({ onSettings, notify, directions, isPreview = false }) => {
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
    try {
      await storageService.addRecord({
        title: todayInput,
        type: TYPE.TASK,
        status: STATUS.DOING,
        priority: PRIORITY.NORMAL,
        dueDate: localDate,
        direction: "个人成长",
        source: "Life-OS"
      });
      setTodayInput("");
      notify("任务已添加", "success");
      loadRecords();
    } catch (error) {
      notify("添加失败: " + error.message, "error");
    }
  };

  const handleEditSave = async (id, fields) => {
    try {
      await storageService.updateRecord(id, fields);
      notify("修改已保存", "success");
      setEditingItem(null);
      loadRecords();
    } catch (error) {
      notify("保存失败: " + error.message, "error");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("确定要删除这条记录吗？")) return;
    try {
      await storageService.deleteRecord(id);
      notify("已删除", "success");
      loadRecords();
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
      loadRecords();
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
        console.warn("AI optimization failed, using fallback", e);
        // AI失败，使用简单的标题生成
        finalTitle = generateTitle(finalContent || finalTitle);
        finalContent = finalContent || formData.content;
      }
    }

    // 最终检查：确保标题不为空
    if (!finalTitle || !finalTitle.trim()) {
      finalTitle = generateTitle(finalContent || formData.title);
    }

    await storageService.addRecord({
      title: finalTitle,
      content: finalContent,
      type: formData.type,
      direction: finalDirection,
      source: "Life-OS",
      url: formData.url || null
    });
    notify("已添加记录", "success");
    loadRecords();
  };

  const inboxItems = records.filter(r => r.fields["状态"] === STATUS.INBOX);
  const todoItems = records.filter(r => r.fields["状态"] === STATUS.TODO);
  const doingItems = records.filter(r => r.fields["状态"] === STATUS.DOING);
  const doneItems = records.filter(r => r.fields["状态"] === STATUS.DONE);
  const knowledgeItems = records.filter(r => r.fields["类型"] === TYPE.NOTE);
  const journalItems = records.filter(r => r.fields["类型"] === TYPE.JOURNAL);

  const todayStr = getLocalDateString();
  const todayTasks = records.filter(r =>
    r.fields["类型"] === TYPE.TASK &&
    r.fields["截止日期"] &&
    new Date(r.fields["截止日期"]).toDateString() === new Date(todayStr).toDateString()
  );
  // 排序任务：未完成在前，已完成在后
  const sortedTodayTasks = [...todayTasks].sort((a, b) => {
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
        <div className="mb-8"><Logo className="w-7 h-7" textSize="text-xl" /></div>
        <nav className="space-y-2 flex-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: '仪表盘' },
            { id: 'inbox', icon: Inbox, label: '收件箱' },
            { id: 'knowledge', icon: BookOpen, label: '知识库' },
            { id: 'journal', icon: Book, label: '日记' },
            { id: 'planner', icon: Calendar, label: '计划看板' },
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
      <div className="flex-1 overflow-y-auto p-8">
        {editingItem && <EditRecordModal isOpen={true} record={editingItem} onClose={() => setEditingItem(null)} onSave={handleEditSave} directions={directions} />}
        <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} onAdd={handleQuickAddModal} directions={directions} />

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

            {/* 今日任务 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2"><Calendar className="text-indigo-400" size={20} /> 今日任务</h2>
                <div className="text-xs text-slate-500 flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span> {todayTasks.length} 个任务</div>
              </div>
              {isPreview ? (
                <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
                  <p className="text-slate-400 text-sm">预览模式下无法添加任务，请先配置 GitHub</p>
                </div>
              ) : (
                <form onSubmit={handleTodayAdd} className="mb-4 relative group">
                  <input
                    type="text"
                    value={todayInput}
                    onChange={(e) => setTodayInput(e.target.value)}
                    placeholder="快速添加今日任务 (回车保存)..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500 outline-none transition-all pl-10"
                  />
                  <Plus size={16} className="absolute left-3 top-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                </form>
              )}
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                {sortedTodayTasks.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(item.fields["类型"])}
                      <span className={`font-medium ${item.fields["状态"] === STATUS.DONE ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.fields["标题"]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingItem(item)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><Edit3 size={16} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {sortedTodayTasks.length === 0 && <div className="text-center text-slate-600 py-8">今日暂无待办任务</div>}
              </div>
            </div>

            {/* 收件箱预览 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Inbox className="text-blue-400" size={20} /> 收件箱预览</h2>
              <div className="space-y-3">
                {inboxItems.slice(0, 5).map(item => (
                  <div key={item.id} onClick={() => setEditingItem(item)} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700 cursor-pointer hover:border-indigo-500 transition-colors">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(item.fields["类型"])}
                      <div>
                        <div className="font-medium">{item.fields["标题"]}</div>
                        <div className="text-xs text-slate-500 mt-1">{item.fields["内容方向"]}</div>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-600" size={16} />
                  </div>
                ))}
                {inboxItems.length === 0 && <div className="text-center text-slate-600 py-8">收件箱为空</div>}
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
                    <button type="button" onClick={handleAiOptimize} disabled={!quickInput.trim() || isAiLoading} className={`absolute right-2 top-2.5 p-1 rounded-lg transition-all ${isOptimized ? 'text-emerald-400' : 'text-slate-500 hover:text-indigo-400'} disabled:opacity-30`} title="AI 优化">
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
          <div className="max-w-7xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold mb-8">计划看板</h1>
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
                      <div key={item.id} onClick={() => setEditingItem(item)} className="bg-slate-800 rounded-lg p-4 cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700">
                        <div className="font-medium text-sm mb-2">{item.fields["标题"]}</div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{item.fields["类型"]}</span>
                          <span>{item.fields["记录日期"] ? new Date(item.fields["记录日期"]).toLocaleDateString() : ''}</span>
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
            <h1 className="text-3xl font-bold mb-8">知识库</h1>
            <div className="space-y-3">
              {knowledgeItems.map(item => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex justify-between items-start hover:border-indigo-500 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getTypeIcon(item.fields["类型"])}
                      <h3 className="text-lg font-bold">{item.fields["标题"]}</h3>
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-2">{item.fields["内容"]?.substring(0, 200)}...</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      <span>{item.fields["内容方向"]}</span>
                      <span>{item.fields["记录日期"] ? new Date(item.fields["记录日期"]).toLocaleDateString() : ''}</span>
                    </div>
                    {item.fields["URL"] && <a href={item.fields["URL"]} target="_blank" rel="noopener" className="text-xs text-indigo-400 hover:underline flex items-center gap-1 mt-2"><ExternalLink size={12} />查看原文</a>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingItem(item)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><Edit3 size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
              {knowledgeItems.length === 0 && <div className="text-center text-slate-600 py-16">暂无笔记记录</div>}
            </div>
          </div>
        )}

        {activeTab === 'journal' && (
          <div className="max-w-5xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold mb-8">日记</h1>
            <div className="space-y-4">
              {journalItems.map(item => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-indigo-500 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(item.fields["类型"])}
                      <h3 className="text-xl font-bold">{item.fields["标题"]}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingItem(item)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><Edit3 size={18} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{item.fields["内容"]}</p>
                  <div className="mt-4 text-xs text-slate-500">
                    {item.fields["记录日期"] ? new Date(item.fields["记录日期"]).toLocaleString() : ''}
                  </div>
                </div>
              ))}
              {journalItems.length === 0 && <div className="text-center text-slate-600 py-16">暂无日记记录</div>}
            </div>
          </div>
        )}
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

  // 根据设备和屏幕状态返回对应视图
  if (screen === 'welcome') {
    if (isMobile) {
      return <MobileView onSettings={() => setScreen('settings')} notify={notify} directions={CONTENT_DIRECTIONS} isPreview={true} />;
    } else {
      return <DesktopView onSettings={() => setScreen('settings')} notify={notify} directions={CONTENT_DIRECTIONS} isPreview={true} />;
    }
  }

  return (
    <div className="bg-slate-950 min-h-screen">
      {isMobile ? (
        <MobileView onSettings={() => setScreen('settings')} notify={notify} directions={CONTENT_DIRECTIONS} isPreview={false} />
      ) : (
        <DesktopView onSettings={() => setScreen('settings')} notify={notify} directions={CONTENT_DIRECTIONS} isPreview={false} />
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
