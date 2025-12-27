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
  Edit3, MoreVertical, XCircle, ExternalLink, Sparkles, Wand2, Timer, Rocket
} from 'lucide-react';

// --- CONFIGURATION ---
const TUTORIAL_URL = "https://ai.feishu.cn/docx/SaxxdrgJkoACzUx2LOBcLknqnQf"; 
const TEMPLATE_URL = "https://ai.feishu.cn/base/CJQBbksPWaMfzlsatFPcFKWAnLd?from=from_copylink";

// --- CONSTANTS ---
const STATUS = { INBOX: "收件箱", TODO: "待办", DOING: "进行中", DONE: "已完成" };
const TYPE = { IDEA: "灵感", TASK: "任务", NOTE: "笔记", JOURNAL: "日记" };
const PRIORITY = { HIGH: "紧急", NORMAL: "普通", LOW: "不急" };

// 全局统一的内容方向配置
const CONTENT_DIRECTIONS = ["AI", "提效工具", "个人成长", "投资", "新媒体", "创业", "工作", "金句", "生活", "学习", "其他"];

/**
 * --- UTILS ---
 */
const extractTags = (text) => {
  if (!text) return [];
  const regex = /#(\S+)/g;
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches;
};

// 问候语逻辑
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

// 图标辅助函数
const getTypeIcon = (type) => {
  switch (type) {
    case TYPE.TASK: return <CheckSquare size={14} className="text-indigo-400" />;
    case TYPE.NOTE: return <FileText size={14} className="text-emerald-400" />;
    case TYPE.JOURNAL: return <Book size={14} className="text-amber-400" />;
    default: return <Lightbulb size={14} className="text-blue-400" />;
  }
};

// 获取本地日期字符串 (YYYY-MM-DD)
const getLocalDateString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localDate = new Date(now.getTime() - offset);
  return localDate.toISOString().split('T')[0];
};

/**
 * --- UTILS: MOCK DATA ---
 */
const MOCK_DATA = [
  { id: '101', fields: { "标题": "👋 欢迎使用 LifeOS！", "内容": "点击卡片编辑详情。", "状态": STATUS.INBOX, "类型": TYPE.IDEA, "优先级": PRIORITY.NORMAL, "内容方向": "个人成长", "来源": "PC", "记录日期": Date.now() } },
  { id: '102', fields: { "标题": "🔥 今日紧急任务", "状态": STATUS.TODO, "类型": TYPE.TASK, "优先级": PRIORITY.HIGH, "内容方向": "提效工具", "来源": "PC", "截止日期": Date.now(), "标签": ["工作"], "记录日期": Date.now() - 100000 } },
  { id: '103', fields: { "标题": "正在进行的任务", "状态": STATUS.DOING, "类型": TYPE.TASK, "优先级": PRIORITY.NORMAL, "内容方向": "提效工具", "来源": "PC", "截止日期": Date.now(), "记录日期": Date.now() - 200000 } },
  { id: '104', fields: { "标题": "已完成的任务", "状态": STATUS.DONE, "类型": TYPE.TASK, "优先级": PRIORITY.NORMAL, "内容方向": "个人成长", "来源": "Mobile", "截止日期": Date.now(), "记录日期": Date.now() - 300000 } },
  { id: '105', fields: { "标题": "关于效率工具的思考 #PKM", "内容": "工具只是手段...", "状态": STATUS.DONE, "类型": TYPE.NOTE, "标签": ["PKM"], "内容方向": "个人成长", "来源": "PC", "记录日期": Date.now() - 400000 } },
];

/**
 * --- DEEPSEEK SERVICE (AI Logic) ---
 */
class DeepSeekService {
  constructor() {
    this.API_BASE = '/api/deepseek'; 
    this.STORAGE_KEY = 'lifeos_deepseek_key';
  }

  getKey() { return localStorage.getItem(this.STORAGE_KEY); }
  saveKey(key) { localStorage.setItem(this.STORAGE_KEY, key); }
  
  async optimize(content, type) {
    const apiKey = this.getKey();
    if (!apiKey) throw new Error("请先在设置中配置 DeepSeek API Key");

    let systemPrompt = "你是一个高效的个人知识管理助手。用户会输入一段原始文本。";
    if (type === TYPE.TASK) systemPrompt += "用户输入了一个任务。请帮我完善它，使其具体可执行。如果内容模糊，请拆解为子步骤。";
    else if (type === TYPE.IDEA) systemPrompt += "用户输入了一个灵感。请帮我拓展思路，给出 1-2 个相关的延伸思考或应用场景。";
    else if (type === TYPE.JOURNAL) systemPrompt += "用户输入了一段日记。请帮我润色文字，使其更具表达力，并尝试提取某种情绪或洞察。";
    else systemPrompt += "请帮我优化这段内容，使其更清晰简洁。";

    systemPrompt += `
请务必以纯 JSON 格式返回，不要包含 Markdown 代码块标记（如 \`\`\`json）。返回对象需包含两个字段：
1. 'title': 根据内容生成的简短标题(20字以内)
2. 'content': 优化后的完整内容(保留原意基础上的优化)`;

    try {
      const response = await fetch(`${this.API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: content }
          ],
          temperature: 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`AI 请求失败: ${response.status}`);
      }

      const data = await response.json();
      const contentStr = data.choices[0].message.content;
      const jsonStr = contentStr.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr); 
    } catch (error) {
      console.error("DeepSeek Error:", error);
      throw error;
    }
  }
}
const aiService = new DeepSeekService();

/**
 * --- FEISHU SERVICE (Core Logic) ---
 */
class FeishuService {
  constructor() {
    this.STORAGE_KEY = 'lifeos_feishu_config';
    this.API_BASE = '/api/feishu'; 
    this.isPreview = typeof window !== 'undefined' && window.location.protocol === 'blob:';
    
    this.REQUIRED_FIELDS = [
      "标题", "内容", "状态", "类型", "优先级", 
      "内容方向", "来源", "标签", "下一步", 
      "截止日期", "记录日期"
    ];
  }

  getConfig() { 
    const data = localStorage.getItem(this.STORAGE_KEY); 
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      if (parsed && parsed.appId && parsed.appSecret && parsed.appToken && parsed.tableId) {
        return parsed;
      }
      return null;
    } catch (e) { return null; }
  }

  saveConfig(config) { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config)); }
  clearConfig() { localStorage.removeItem(this.STORAGE_KEY); }

  async request(endpoint, method = 'GET', body = null, token = null) {
    if (this.isPreview) {
      await new Promise(resolve => setTimeout(resolve, 300)); 
      if (endpoint.includes('tenant_access_token')) return { tenant_access_token: 'mock_token' };
      if (endpoint.includes('/records') && method === 'GET') return { items: MOCK_DATA };
      // [NEW] Mocking fields request for preview
      if (endpoint.includes('/fields')) return { items: [{ field_name: "内容方向", property: { options: CONTENT_DIRECTIONS.map(name => ({ name })) } }] };
      return { code: 0, msg: "success", data: {} };
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const response = await fetch(`${this.API_BASE}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : null });
      if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}`;
        try {
            const errData = await response.json();
            errorMsg = `API Error: ${errData.msg || errData.message || JSON.stringify(errData)}`;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      const result = await response.json();
      if (result.code === 1254045) {
        throw new Error(`字段名不匹配！请检查飞书表格列名是否包含：\n${this.REQUIRED_FIELDS.join('、')}`);
      }
      if (result.code !== 0) throw new Error(`Feishu API Error [${result.code}]: ${result.msg}`);
      return result.data || result;
    } catch (error) { console.error("API Request Failed:", error); throw error; }
  }

  async getTenantAccessToken(appId, appSecret) {
    const data = await this.request('/auth/v3/tenant_access_token/internal', 'POST', { "app_id": appId, "app_secret": appSecret });
    return data ? data.tenant_access_token : null;
  }

  // [NEW] Fetch field options from Feishu
  async fetchFieldOptions(fieldName) {
    try {
      const { config, token } = await this.checkConfigOrThrow();
      const data = await this.request(`/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/fields?page_size=100`, 'GET', null, token);
      
      if (!data || !data.items) return [];
      
      const field = data.items.find(f => f.field_name === fieldName);
      if (field && field.property && field.property.options) {
        return field.property.options.map(opt => opt.name);
      }
      return [];
    } catch (e) {
      console.warn(`Failed to fetch options for ${fieldName}`, e);
      return [];
    }
  }

  async fetchRecords() {
    const config = this.getConfig();
    if (!config) return MOCK_DATA;
    try {
      const token = await this.getTenantAccessToken(config.appId, config.appSecret);
      if (!token) return MOCK_DATA;
      const sortParam = encodeURIComponent('["记录日期 DESC"]');
      const data = await this.request(`/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records?page_size=500&sort=${sortParam}`, 'GET', null, token);
      return data ? data.items : [];
    } catch (e) { 
      console.warn("Fetch records failed, using mock data:", e);
      return MOCK_DATA; 
    }
  }

  async checkConfigOrThrow() {
    const config = this.getConfig();
    if (!config) throw new Error("DEMO_MODE_ACTIVE");
    const token = await this.getTenantAccessToken(config.appId, config.appSecret);
    if (!token) throw new Error("AUTH_FAILED");
    return { config, token };
  }

  async addRecord(data) {
    const { config, token } = await this.checkConfigOrThrow();
    
    let finalTitle = data.title;
    if (!finalTitle && data.content) {
       const firstLine = data.content.split('\n')[0];
       finalTitle = firstLine.length > 20 ? firstLine.substring(0, 20) + "..." : firstLine;
    } else if (finalTitle && finalTitle.length > 20) {
        finalTitle = finalTitle.substring(0, 20) + "...";
    }

    const autoTags = extractTags((finalTitle || "") + " " + (data.content || ""));

    const fields = {
      "标题": finalTitle || "无标题记录", 
      "内容": data.content || "", 
      "来源": data.source || "PC", 
      "状态": data.status || STATUS.INBOX, 
      "类型": data.type || TYPE.IDEA,  
      "优先级": data.priority || PRIORITY.NORMAL,
      "内容方向": data.direction || "个人成长", 
      "记录日期": Date.now() 
    };
    if (data.nextActions && data.nextActions.length > 0) fields["下一步"] = data.nextActions;
    if (data.dueDate) fields["截止日期"] = new Date(data.dueDate).getTime();
    if (autoTags.length > 0) fields["标签"] = autoTags;
    else if (data.tags && data.tags.length > 0) fields["标签"] = data.tags;
    
    const res = await this.request(`/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records`, 'POST', { fields }, token);
    return res.record;
  }

  async updateRecord(recordId, fields) {
    const { config, token } = await this.checkConfigOrThrow();
    return await this.request(`/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records/${recordId}`, 'PUT', { fields }, token);
  }

  async deleteRecord(recordId) {
    const { config, token } = await this.checkConfigOrThrow();
    return await this.request(`/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records/${recordId}`, 'DELETE', null, token);
  }

  async createTable(appId, appSecret, appToken) { return "manual_mode"; }
}

const feishuService = new FeishuService();

/**
 * --- UI COMPONENTS & HELPERS ---
 */
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

const FeatureCard = ({ icon, color, title, desc }) => (
  <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-slate-700 transition-colors">
    <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-6`}>{icon}</div>
    <h3 className="text-xl font-bold mb-3 text-slate-200">{title}</h3>
    <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
  </div>
);

// [UPDATED] StepCard with Icons
const StepCard = ({ icon: Icon, title, desc }) => (
  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center relative z-10 group hover:border-slate-700 transition-colors">
    <div className="w-14 h-14 bg-slate-800 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border-4 border-slate-950 shadow-xl shadow-indigo-900/10 group-hover:scale-110 transition-transform duration-300">
      <Icon size={28} />
    </div>
    <h3 className="text-lg font-bold mb-2 text-slate-200">{title}</h3>
    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
  </div>
);

const FieldGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mt-4 border border-slate-800 rounded-xl bg-slate-950/50 overflow-hidden">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-3 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"><div className="flex items-center gap-2"><Table size={16} className="text-indigo-400" /><span>查看必需的字段结构 (如果是手动建表)</span></div>{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
      {isOpen && (
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 animate-fade-in">
           <p className="mb-3 text-slate-400">请确保飞书表格包含以下列名 (区分大小写)：</p>
           <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">标题 (文本)</div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">内容 (文本)</div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">状态 (单选: 收件箱/待办/进行中/已完成)</div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">类型 (单选: 灵感/任务/笔记/日记)</div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">优先级 (单选: 紧急/普通/不急)</div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">下一步 (多选: 学习/整理/分享...)</div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">内容方向 (单选)</div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">来源 (单选: Mobile/PC)</div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">标签 (多选/文本)</div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">截止日期 (日期)</div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">记录日期 (日期)</div>
           </div>
        </div>
      )}
    </div>
  );
};

const FocusModeOverlay = ({ task, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) { interval = setInterval(() => { setTimeLeft(timeLeft => timeLeft - 1); }, 1000); } 
    else if (timeLeft === 0) { setIsActive(false); alert("专注时间结束！"); }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);
  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => { setIsActive(false); setTimeLeft(25 * 60); };
  const formatTime = (seconds) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; };
  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-sm text-white animate-fade-in">
      <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors"><X size={32} /></button>
      <div className="mb-8 text-center max-w-2xl px-4"><div className="text-indigo-400 text-sm font-bold uppercase tracking-widest mb-4">Current Focus</div><h1 className="text-4xl md:text-5xl font-bold leading-tight">{task || "无特定任务"}</h1></div>
      <div className="text-9xl font-mono font-bold tracking-tighter mb-12 tabular-nums">{formatTime(timeLeft)}</div>
      <div className="flex gap-6">
        <button onClick={toggleTimer} className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105">{isActive ? <><Pause fill="currentColor" /> 暂停</> : <><Play fill="currentColor" /> 开始专注</>}</button>
        <button onClick={resetTimer} className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"><RotateCcw size={24} /></button>
      </div>
    </div>
  );
};

const EditRecordModal = ({ isOpen, record, onClose, onSave, directions }) => {
  const [formData, setFormData] = useState({});
  const actionsList = ["学习", "整理", "收藏使用", "分享", "待办"];

  useEffect(() => {
    if (record) {
      const tags = record.fields["标签"] || [];
      const tagsStr = Array.isArray(tags) ? tags.join(", ") : (tags || "");
      let dateStr = "";
      if (record.fields["截止日期"]) { dateStr = new Date(record.fields["截止日期"]).toISOString().split('T')[0]; }

      setFormData({
        "标题": record.fields["标题"] || "",
        "内容": record.fields["内容"] || "",
        "状态": record.fields["状态"] || STATUS.INBOX,
        "类型": record.fields["类型"] || TYPE.IDEA, 
        "优先级": record.fields["优先级"] || PRIORITY.NORMAL,
        "标签": tagsStr,
        "内容方向": record.fields["内容方向"] || "个人成长",
        "下一步": record.fields["下一步"] || [],
        "截止日期": dateStr
      });
    }
  }, [record]);

  const handleSave = () => {
    const fieldsToSave = { ...formData };
    if (fieldsToSave["截止日期"]) fieldsToSave["截止日期"] = new Date(fieldsToSave["截止日期"]).getTime();
    else fieldsToSave["截止日期"] = null;
    if (fieldsToSave["标签"]) fieldsToSave["标签"] = fieldsToSave["标签"].split(/[,，]/).map(t => t.trim()).filter(Boolean);
    else fieldsToSave["标签"] = null;
    onSave(record.id, fieldsToSave);
  };
  
  const toggleAction = (action) => {
    const current = formData["下一步"] || [];
    const updated = current.includes(action) ? current.filter(a => a !== action) : [...current, action];
    setFormData({ ...formData, "下一步": updated });
  };

  if (!isOpen || !record) return null;

  return (
    <Dialog isOpen={isOpen} title="编辑详情" onClose={onClose}>
      <div className="space-y-4">
        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">标题</label><input className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" value={formData["标题"]} onChange={e => setFormData({...formData, "标题": e.target.value})} /></div>
        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">内容 / 备注</label><textarea className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 focus:border-indigo-500 outline-none resize-none h-24" value={formData["内容"]} onChange={e => setFormData({...formData, "内容": e.target.value})} /></div>
        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">标签 (自动提取 #)</label><div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2"><Hash size={16} className="text-slate-500" /><input className="w-full bg-transparent text-slate-300 outline-none" placeholder="AI, 效率" value={formData["标签"]} onChange={e => setFormData({...formData, "标签": e.target.value})} /></div></div>
        <div className="grid grid-cols-2 gap-4">
           <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">状态</label><select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 outline-none" value={formData["状态"]} onChange={e => setFormData({...formData, "状态": e.target.value})}>{[STATUS.INBOX, STATUS.TODO, STATUS.DOING, STATUS.DONE].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
           <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">优先级</label><select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 outline-none" value={formData["优先级"]} onChange={e => setFormData({...formData, "优先级": e.target.value})}>{[PRIORITY.HIGH, PRIORITY.NORMAL, PRIORITY.LOW].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">类型</label><select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 outline-none" value={formData["类型"]} onChange={e => setFormData({...formData, "类型": e.target.value})}>{[TYPE.IDEA, TYPE.TASK, TYPE.NOTE, TYPE.JOURNAL].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
           <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">截止日期</label><input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 outline-none" value={formData["截止日期"] || ""} onChange={e => setFormData({...formData, "截止日期": e.target.value})} /></div>
        </div>
        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">内容方向</label><div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{directions.map(d => <button key={d} onClick={() => setFormData({...formData, "内容方向": d})} className={`px-2 py-1 rounded border text-xs whitespace-nowrap ${formData["内容方向"] === d ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>{d}</button>)}</div></div>
        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">下一步动作</label><div className="flex flex-wrap gap-2">{actionsList.map(a => (<button key={a} onClick={() => toggleAction(a)} className={`px-2 py-1 rounded border text-xs flex items-center gap-1 ${formData["下一步"]?.includes(a) ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{formData["下一步"]?.includes(a) && <Check size={10}/>} {a}</button>))}</div></div>
        <button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors mt-4">保存修改</button>
      </div>
    </Dialog>
  );
};

const QuickCaptureModal = ({ isOpen, onClose, onSave }) => {
  const [text, setText] = useState("");
  const [type, setType] = useState(TYPE.IDEA);
  const [isSending, setIsSending] = useState(false);
  const [note, setNote] = useState(""); 
  const [isAiLoading, setIsAiLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (isOpen && inputRef.current) setTimeout(() => inputRef.current.focus(), 100); }, [isOpen]);

  const handleAiOptimize = async () => {
    if (!text.trim()) return;
    setIsAiLoading(true);
    try {
      const result = await aiService.optimize(text, type);
      setText(result.title); // 更新标题
      setNote(result.content); // 更新备注
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsSending(true);
    await onSave({ title: text, content: note, type, status: type === TYPE.TASK ? STATUS.INBOX : STATUS.DONE, source: "QuickCapture" });
    setIsSending(false); setText(""); setNote(""); onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        <div className="p-4 space-y-3">
          <input 
             ref={inputRef}
             value={text} 
             onChange={e => setText(e.target.value)} 
             onKeyDown={e => { if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }} 
             placeholder="有什么想法？(Cmd+Enter 发送)" 
             className="w-full bg-transparent text-lg text-slate-200 placeholder-slate-600 outline-none" 
          />
          <textarea 
             value={note}
             onChange={e => setNote(e.target.value)}
             placeholder="添加备注..."
             className="w-full bg-slate-800/50 rounded-lg p-2 text-sm text-slate-300 placeholder-slate-600 outline-none resize-none h-20"
          />
        </div>
        <div className="px-4 py-3 bg-slate-800/50 flex justify-between items-center border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            {[ { id: TYPE.IDEA, icon: Lightbulb }, { id: TYPE.TASK, icon: CheckSquare }, { id: TYPE.NOTE, icon: FileText }, { id: TYPE.JOURNAL, icon: Book } ].map(t => (
              <button key={t.id} onClick={() => setType(t.id)} className={`p-2 rounded-lg transition-all ${type === t.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-700'}`}> <t.icon size={16} /> </button>
            ))}
            <button 
                onClick={handleAiOptimize}
                disabled={isAiLoading || !text.trim()}
                className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-all ml-2"
                title="AI 优化"
            >
                {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            </button>
          </div>
          <button onClick={handleSubmit} disabled={!text.trim() || isSending} className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50">{isSending ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}</button>
        </div>
      </div>
    </div>
  );
};

const Logo = ({ className = "w-8 h-8", textSize = "text-xl", onClick }) => (
  <div onClick={onClick} className={`flex items-center gap-2.5 ${onClick ? 'cursor-pointer' : ''}`}>
    <div className={`${className} bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30`}><Zap size={20} fill="currentColor" className="drop-shadow-sm" /></div>
    <span className={`font-bold ${textSize} tracking-tight text-slate-100`}>Life<span className="text-indigo-400">OS</span></span>
  </div>
);

const NavItem = ({ icon: Icon, label, active, count, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all mb-1 group ${active ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
    <div className="flex items-center gap-3"><Icon size={18} className={active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"} /><span className="text-sm">{label}</span></div>
    {count !== undefined && count > 0 && <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{count}</span>}
  </button>
);

const KanbanCard = ({ item, onMove, onClick }) => (
  <div onClick={onClick} className="bg-slate-900 border border-slate-800 p-3 rounded-xl mb-3 cursor-grab active:cursor-grabbing transition-all hover:border-slate-600 hover:shadow-lg group relative">
    <div className="flex justify-between items-start mb-2">
      <div className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600">{item.fields["内容方向"] || "未分类"}</div>
      {item.fields["优先级"] === PRIORITY.HIGH && <Flame size={14} className="text-red-500" />}
    </div>
    <h4 className="text-sm text-slate-200 font-medium leading-relaxed mb-2">{item.fields["标题"]}</h4>
    <div className="flex justify-between items-center pt-2 border-t border-slate-700/30">
      <span className="text-[10px] text-slate-500">{new Date(item.fields["记录日期"]).toLocaleDateString()}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.fields["状态"] !== STATUS.DONE && (<button onClick={(e) => { e.stopPropagation(); onMove(item.id, STATUS.DONE); }} className="p-1 hover:bg-emerald-500/20 hover:text-emerald-400 rounded text-slate-500" title="完成"><CheckSquare size={14} /></button>)}
      </div>
    </div>
  </div>
);

/**
 * --- MAIN SCREENS ---
 */

const WelcomeScreen = ({ onStart }) => (
  <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
    <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto border-b border-slate-800/50"><Logo /><button onClick={onStart} className="px-4 py-2 text-sm font-bold text-slate-300 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-all">开启体验 / 登录</button></nav>
    <div className="max-w-4xl mx-auto px-6 pt-20 pb-20 text-center animate-fade-in-up"><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6 border border-indigo-500/20">v3.3 AI Enhanced</div><h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight">掌控你的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">数字人生</span></h1><p className="text-xl md:text-2xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">AI 驱动的极速录入 · 深度管理任务 · 数据完全私有</p><button onClick={onStart} className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 rounded-full hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-1">开启 LifeOS <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" /></button></div>
    <div className="bg-slate-900/50 py-24 border-y border-slate-800/50"><div className="max-w-7xl mx-auto px-6"><div className="grid md:grid-cols-3 gap-8"><FeatureCard icon={<Smartphone size={24} />} color="text-blue-400 bg-blue-400/10" title="极速捕获" desc="专为手机设计的输入界面，随时随地记录灵感。" /><FeatureCard icon={<Shield size={24} />} color="text-emerald-400 bg-emerald-400/10" title="数据隐私" desc="BYOK 架构。数据直连飞书，密钥本地存储，不经过第三方服务器。" /><FeatureCard icon={<Activity size={24} />} color="text-purple-400 bg-purple-400/10" title="GTD 工作流" desc="内置收件箱、下一步行动、优先级管理，让一切井井有条。" /></div></div></div>
    <div className="py-24"><div className="max-w-6xl mx-auto px-6"><div className="text-center mb-16"><h2 className="text-3xl font-bold text-white mb-4">只需三步，即刻开启</h2><p className="text-slate-500">连接飞书，无需复杂的服务器配置。</p></div><div className="grid md:grid-cols-3 gap-8 relative"><div className="hidden md:block absolute top-10 left-0 w-full h-0.5 bg-slate-800 -z-10"></div><StepCard icon={Table} title="复制标准模版" desc="点击右下角按钮，将标准表格模版复制到你的飞书。" /><StepCard icon={Key} title="获取 API 密钥" desc="复制浏览器地址栏的 Base ID 和 Table ID。" /><StepCard icon={Rocket} title="开始使用" desc="填入配置，立即连接你的私人数据库。" /></div></div></div>
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-500 py-12 text-center text-sm"><div className="max-w-2xl mx-auto px-4"><div className="flex flex-wrap justify-center gap-6 font-medium mb-8 text-slate-400"><div className="flex items-center gap-2"><User size={14} /><span>作者：小鲸</span></div><div className="flex items-center gap-2"><Mail size={14} /><span>1584897236@qq.com</span></div><div className="flex items-center gap-2"><MessageCircle size={14} /><span>微信：zhaoqi3210</span></div><a href="https://www.xiaojingfy.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-indigo-400 transition-colors"><Globe size={14} /><span>www.xiaojingfy.com</span></a></div><p className="opacity-50 text-xs">© 2025 LifeOS. Designed for productivity.</p></div></footer>
  </div>
);

const SettingsScreen = ({ onSave, onCancel, initialConfig, notify, onLogout }) => {
  const [formData, setFormData] = useState({ appId: initialConfig?.appId || '', appSecret: initialConfig?.appSecret || '', appToken: initialConfig?.appToken || '', tableId: initialConfig?.tableId || '', deepseekKey: initialConfig?.deepseekKey || '' });
  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
  const TEMPLATE_URL = "https://ai.feishu.cn/base/CJQBbksPWaMfzlsatFPcFKWAnLd?from=from_copylink";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-slate-200">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-800">
        <div className="flex items-center gap-3 mb-6"><Logo /></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-6">
            <h3 className="text-sm font-bold text-indigo-300 mb-2 flex items-center gap-2"><Sparkles size={14}/> AI 配置 (推荐)</h3>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">DeepSeek API Key</label><input type="password" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200" placeholder="sk-..." value={formData.deepseekKey} onChange={e => setFormData({...formData, deepseekKey: e.target.value})} /></div>
            <p className="text-[10px] text-slate-500 mt-2">不填则不启用 AI 功能。Key 仅保存在本地。</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">App ID</label><div className="flex gap-2"><input required type="text" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200" placeholder="cli_..." value={formData.appId} onChange={e => setFormData({...formData, appId: e.target.value})} /><a href={TUTORIAL_URL} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400" title="配置教程"><Book size={18}/></a></div></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">App Secret</label><input required type="password" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200" placeholder="******" value={formData.appSecret} onChange={e => setFormData({...formData, appSecret: e.target.value})} /></div>
          </div>
          <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Base ID (App Token)</label><input required type="text" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200" placeholder="bascn..." value={formData.appToken} onChange={e => setFormData({...formData, appToken: e.target.value})} /></div>
          <div className="pt-2 border-t border-slate-800 mt-4">
             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Table ID (数据表 ID)</label>
             <div className="flex gap-2">
               <input required type="text" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200" placeholder="tbl..." value={formData.tableId} onChange={e => setFormData({...formData, tableId: e.target.value})} />
               <a href={TEMPLATE_URL} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/50"><Table size={16} /> 获取模版</a>
             </div>
          </div>
          <FieldGuide />
          <button type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-colors">保存配置</button>
          <button type="button" onClick={onCancel} className="w-full text-slate-500 hover:text-slate-300 py-2 text-sm">取消</button>
        </form>
        {initialConfig && <div className="mt-6 pt-6 border-t border-slate-800 text-center"><button onClick={onLogout} className="text-red-400 hover:text-red-300 text-sm flex items-center justify-center gap-2"><LogOut size={16}/> 断开连接 & 清除本地密钥</button></div>}
      </div>
    </div>
  );
};

const MobileView = ({ onSettings, notify, directions }) => {
  // 1. Single Source of Truth
  const [records, setRecords] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // [UPDATED] Removed category, only type and dueDate
  const [details, setDetails] = useState({ type: TYPE.IDEA, dueDate: "", note: "" });

  // [NEW] AI Loading State
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await feishuService.fetchRecords();
      // 默认按记录日期倒序，方便 RecentInputs 使用
      const sortedData = data.sort((a, b) => (b.fields["记录日期"] || 0) - (a.fields["记录日期"] || 0));
      setRecords(sortedData);
    } catch (e) { console.error(e); }
  };

  // 派生状态：今日任务 (包含已完成，未完成优先，高优先级优先)
  const todayTasks = useMemo(() => {
    const todayStr = getLocalDateString(); // Use local date
    return records.filter(r => r.fields["类型"] === TYPE.TASK && r.fields["截止日期"] && new Date(r.fields["截止日期"]).toDateString() === new Date(todayStr).toDateString())
      .sort((a, b) => {
          // 1. 未完成在通过
          const isDoneA = a.fields["状态"] === STATUS.DONE ? 1 : 0;
          const isDoneB = b.fields["状态"] === STATUS.DONE ? 1 : 0;
          if (isDoneA !== isDoneB) return isDoneA - isDoneB;
          
          // 2. 优先级排序
          const priorityOrder = { [PRIORITY.HIGH]: 0, [PRIORITY.NORMAL]: 1, [PRIORITY.LOW]: 2 };
          const pA = priorityOrder[a.fields["优先级"]] ?? 1;
          const pB = priorityOrder[b.fields["优先级"]] ?? 1;
          return pA - pB;
      });
  }, [records]);

  // 派生状态：最近录入 (前10条)
  const recentInputs = useMemo(() => records.slice(0, 10), [records]);

  // 通用本地更新 (乐观更新核心)
  const updateLocalRecord = (id, newFields) => {
     setRecords(prev => prev.map(r => r.id === id ? { ...r, fields: { ...r.fields, ...newFields } } : r));
  };
  
  const addLocalRecord = (newRecord) => {
     setRecords(prev => [newRecord, ...prev]);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    setIsSending(true);
    
    const now = Date.now();
    // 构造乐观数据，确保字段完整以便 filter 正确工作
    const newFields = { 
        "标题": inputValue, 
        "内容": details.note,
        "状态": STATUS.INBOX, 
        "类型": details.type, 
        "记录日期": now,
        "截止日期": details.dueDate ? new Date(details.dueDate).getTime() : null,
        "优先级": PRIORITY.NORMAL,
        "来源": "Mobile",
        "内容方向": "个人成长" // Mobile default
    };
    const newRec = { id: "temp_" + now, fields: newFields };
    
    // 立即更新 UI
    addLocalRecord(newRec);

    // 重置输入框
    setInputValue(""); 
    setDetails({ type: TYPE.IDEA, dueDate: "", note: "" }); 
    setShowDetails(false);

    try {
      await feishuService.addRecord({ 
          title: inputValue, 
          content: details.note, 
          source: "Mobile", 
          type: details.type, 
          dueDate: details.dueDate, 
          status: STATUS.INBOX,
          direction: "个人成长"
      });
      notify("已记录", "success");
      loadData(); // 后台静默同步真实 ID
    } catch (error) { 
        notify("发送失败", "error"); 
    } finally { setIsSending(false); }
  };

  const handleEditSave = async (id, fields) => {
    updateLocalRecord(id, fields); // 乐观更新
    setEditingItem(null);
    notify("修改已保存", "success");
    await feishuService.updateRecord(id, fields);
    loadData();
  };

  const handleDone = async (id) => {
    updateLocalRecord(id, { "状态": STATUS.DONE }); // 乐观更新
    notify("任务完成", "success");
    await feishuService.updateRecord(id, { "状态": STATUS.DONE });
    loadData();
  };

  // [NEW] Mobile AI Optimize
  const handleAiOptimize = async () => {
    if (!inputValue.trim()) { notify("请先输入内容", "info"); return; }
    setIsAiLoading(true);
    try {
      const result = await aiService.optimize(inputValue, details.type);
      setInputValue(result.title);
      setDetails(prev => ({ ...prev, note: result.content }));
      notify("AI 优化完成", "success");
    } catch (err) {
      notify("AI 请求失败: " + err.message, "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  // 手机端今日任务快捷添加
  const [todayInput, setTodayInput] = useState("");
  const handleTodayAdd = async (e) => {
    e.preventDefault();
    if (!todayInput.trim()) return;
    
    const now = Date.now();
    const localDate = getLocalDateString();
    
    const newFields = { 
        "标题": todayInput, 
        "状态": STATUS.DOING, 
        "类型": TYPE.TASK, 
        "优先级": PRIORITY.NORMAL, 
        "截止日期": new Date(localDate).getTime(), 
        "记录日期": now,
        "来源": "Mobile",
        "内容方向": "个人成长"
    };
    const newRec = { id: "t_" + now, fields: newFields };
    
    addLocalRecord(newRec); // 乐观更新
    setTodayInput("");
    
    await feishuService.addRecord({
        title: todayInput, status: STATUS.DOING, type: TYPE.TASK, priority: PRIORITY.NORMAL, dueDate: localDate, source: "Mobile", tags: [], direction: "个人成长"
    });
    notify("任务已添加", "success");
    loadData(); // 确保 ID 同步
  }

  // Helper for Type Icon
  const getTypeIcon = (type) => {
    switch (type) {
        case TYPE.TASK: return <CheckSquare size={14} className="text-indigo-400" />;
        case TYPE.NOTE: return <FileText size={14} className="text-emerald-400" />;
        case TYPE.JOURNAL: return <Book size={14} className="text-amber-400" />;
        default: return <Lightbulb size={14} className="text-blue-400" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      <div className="px-6 pt-12 pb-4 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 border-b border-white/5"><Logo className="w-6 h-6" textSize="text-lg" /><button onClick={onSettings} className="p-2 text-slate-400 hover:text-white"><Settings size={20} /></button></div>
      {editingItem && <EditRecordModal isOpen={true} record={editingItem} onClose={() => setEditingItem(null)} onSave={handleEditSave} directions={directions} />}
      
      <div className="flex-1 overflow-y-auto px-4 pb-48 custom-scrollbar">
        {/* Mobile Today Tasks */}
        <div className="mt-6">
           <div className="flex justify-between items-center mb-3 ml-2">
             <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Calendar size={12}/> 今日待办</h2>
           </div>
           <form onSubmit={handleTodayAdd} className="mb-3 relative">
              <input type="text" placeholder="快速添加..." className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:border-indigo-500 outline-none" value={todayInput} onChange={e => setTodayInput(e.target.value)} />
              <button type="submit" disabled={!todayInput.trim()} className="absolute right-3 top-2.5 text-slate-400 hover:text-indigo-400 disabled:opacity-0 transition-all"><Plus size={18}/></button>
           </form>
           <div className="space-y-2">
             {todayTasks.map(item => (
               <div key={item.id} onClick={() => setEditingItem(item)} className={`bg-slate-900 p-4 rounded-xl border flex items-center justify-between active:scale-[0.98] transition-transform ${item.fields["状态"] === STATUS.DONE ? 'border-slate-800 opacity-50' : 'border-slate-800'}`}>
                 <span className={`text-sm font-medium ${item.fields["状态"] === STATUS.DONE ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.fields["标题"]}</span>
                 <button onClick={(e) => { e.stopPropagation(); handleDone(item.id); }} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${item.fields["状态"] === STATUS.DONE ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 text-transparent hover:border-emerald-500'}`}><Check size={14}/></button>
               </div>
             ))}
             {todayTasks.length === 0 && <div className="text-center text-slate-600 py-4 text-sm">今日暂无待办</div>}
           </div>
        </div>

        {/* Mobile Recent Inputs */}
        <div className="mt-8">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-2 flex items-center gap-2"><Inbox size={12}/> 最近录入</h2>
          <div className="space-y-3">
            {recentInputs.map(item => (
              <div key={item.id} onClick={() => setEditingItem(item)} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-start active:scale-[0.98] transition-transform">
                <div>
                  <div className="text-slate-200 font-medium line-clamp-2 text-sm">{item.fields["标题"]}</div>
                  <div className="flex items-center gap-2 mt-2">
                    {/* 显示类型图标 */}
                    {getTypeIcon(item.fields["类型"])}
                    <span className="text-[10px] text-slate-500">{item.fields["记录日期"] ? new Date(item.fields["记录日期"]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '刚刚'}</span>
                  </div>
                </div>
                <div className="text-slate-600"><Edit3 size={16} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Bar */}
      <div className={`fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-xl border-t border-white/10 pb-safe-area shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${showDetails ? 'rounded-t-3xl' : ''} z-20`}>
        <div className="p-4">
          {showDetails && (
            <div className="mb-4 space-y-4 animate-fade-in">
              <div className="flex gap-2 mb-2">
                 {[TYPE.IDEA, TYPE.TASK, TYPE.NOTE, TYPE.JOURNAL].map(t => (
                    <button key={t} onClick={() => setDetails({...details, type: t})} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${details.type === t ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{t}</button>
                 ))}
              </div>
              {details.type === TYPE.TASK && (<input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-indigo-500 mb-2" onChange={e => setDetails({...details, dueDate: e.target.value})} />)}
              <textarea className="w-full bg-slate-50 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-20 text-slate-800" placeholder="添加备注..." value={details.note} onChange={e => setDetails({...details, note: e.target.value})} />
            </div>
          )}
          <div className="relative flex items-end gap-2">
            <button onClick={() => setShowDetails(!showDetails)} className={`mb-1 p-2 rounded-xl transition-colors ${showDetails ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-800 text-slate-400 hover:text-white'}`}><MoreHorizontal size={24} /></button>
            <div className="flex-1 relative">
                <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="记录想法..." className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 pr-10 text-base text-white focus:outline-none focus:bg-slate-800 focus:border-indigo-500/50 transition-all resize-none h-14 max-h-32 placeholder-slate-500" rows={1} style={{ minHeight: '3.5rem' }} />
                {/* Mobile AI Button */}
                <button 
                   onClick={handleAiOptimize}
                   disabled={isAiLoading || !inputValue.trim()}
                   className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400 disabled:opacity-30 transition-all"
                >
                   {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                </button>
            </div>
            <button onClick={handleSend} disabled={!inputValue.trim() || isSending} className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${!inputValue.trim() ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 hover:scale-105 active:scale-95'}`}>{isSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={24} />}</button></div>
        </div>
      </div>
    </div>
  );
};

const DesktopView = ({ onLogout, onSettings, notify, isDemoMode, onGoHome, directions }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [inboxItems, setInboxItems] = useState([]);
  const [todoItems, setTodoItems] = useState([]);
  const [doingItems, setDoingItems] = useState([]);
  const [doneItems, setDoneItems] = useState([]);
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [journalItems, setJournalItems] = useState([]);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [editingItem, setEditingItem] = useState(null);

  // Inputs
  const [quickInput, setQuickInput] = useState("");
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(false);
  // [UPDATED] Desktop Inbox Input: Added TYPE field to state
  const [desktopDetails, setDesktopDetails] = useState({ type: TYPE.IDEA, priority: "普通", direction: "个人成长", infoSource: "其他", nextActions: [], dueDate: "", note: "" });
  const inputRef = useRef(null);
  
  // [FIX] Add missing state for Focus Mode
  const [showFocusOverlay, setShowFocusOverlay] = useState(false);
  const [focusTask, setFocusTask] = useState("");
  
  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Dashboard Stats
  const stats = { inbox: inboxItems.length, todo: todoItems.length, doing: doingItems.length, done: doneItems.length };
  
  // Today's Tasks Logic
  const todayStr = getLocalDateString(); // Use local date
  const todayTasks = records.filter(r => r.fields["类型"] === '任务' && r.fields["状态"] !== '已完成' && r.fields["截止日期"] && new Date(r.fields["截止日期"]).toDateString() === new Date(todayStr).toDateString());
  const completedToday = records.filter(r => r.fields["状态"] === '已完成' && r.fields["截止日期"] && new Date(r.fields["截止日期"]).toDateString() === new Date(todayStr).toDateString());

  const sources = ["推特", "微信群", "公众号", "即刻", "小红书", "Youtube", "其他"];
  const actions = ["学习", "整理", "收藏使用", "分享", "待办"];

  useEffect(() => { loadData(); aiService.saveKey(feishuService.getConfig()?.deepseekKey || ""); }, []);
  useEffect(() => {
    const handleClickOutside = (event) => { if (inputRef.current && !inputRef.current.contains(event.target)) { if (!quickInput.trim()) { setInputExpanded(false); } } };
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [quickInput]);

  // [NEW] 问候语逻辑
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
  
  // [NEW] 随机名言
  const [quote, setQuote] = useState("");
  useEffect(() => {
    const QUOTES = [
      "种一棵树最好的时间是十年前，其次是现在。", "不仅要低头拉车，还要抬头看路。", "流水不争先，争的是滔滔不绝。",
      "每一个不曾起舞的日子，都是对生命的辜负。", "凡是过往，皆为序章。", "知行合一，止于至善。",
      "保持饥饿，保持愚蠢。", "星光不问赶路人，时光不负有心人。", "悲观者往往正确，乐观者往往成功。",
      "日拱一卒，功不唐捐。", "与其感慨路难行，不如马上出发。", "生活原本沉闷，但跑起来就有风。"
    ];
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  const loadData = async () => {
    try {
      const data = await feishuService.fetchRecords();
      setRecords(data);
      setInboxItems(data.filter(r => r.fields["状态"] === STATUS.INBOX));
      setTodoItems(data.filter(r => r.fields["状态"] === STATUS.TODO));
      setDoingItems(data.filter(r => r.fields["状态"] === STATUS.DOING));
      setDoneItems(data.filter(r => r.fields["状态"] === STATUS.DONE));
      setKnowledgeItems(data.filter(r => r.fields["类型"] === TYPE.NOTE || r.fields["分类"] === '阅读'));
      
      // Recent Activity Logic
      const sortedActivities = data
        .filter(r => r.fields["类型"] !== '任务')
        .sort((a, b) => new Date(b.fields["记录日期"]) - new Date(a.fields["记录日期"]));
      
      setJournalItems(data.filter(r => r.fields["类型"] === TYPE.JOURNAL || r.fields["内容方向"] === '日记'));
    } catch (e) { console.error(e); }
  };

  const handleAction = async (actionFn) => {
    try { await actionFn(); loadData(); } catch (e) {
      if (e.message === "DEMO_MODE_ACTIVE" || e.message === "AUTH_FAILED") { notify("演示模式无法保存，请先配置", "info"); onSettings(); } else { notify("操作失败: " + e.message, "error"); }
    }
  };

  const handleInboxAdd = async (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    setIsQuickAdding(true);
    await handleAction(async () => {
        await feishuService.addRecord({ title: quickInput, content: desktopDetails.note, source: "PC", type: desktopDetails.type, priority: desktopDetails.priority, direction: desktopDetails.direction, infoSource: desktopDetails.infoSource, nextActions: desktopDetails.nextActions, dueDate: desktopDetails.type === '任务' ? desktopDetails.dueDate : null, status: STATUS.INBOX, tags: [] });
        setQuickInput(""); setDesktopDetails({ type: TYPE.IDEA, priority: "普通", direction: "个人成长", infoSource: "其他", nextActions: [], dueDate: "", note: "" }); setInputExpanded(false);
        notify("已记录", "success");
    });
    setIsQuickAdding(false);
  };
  
  // AI Button Handler
  const handleAiOptimize = async (e) => {
    e.preventDefault(); // Prevent form submission
    if (!quickInput.trim()) { notify("请先输入内容", "info"); return; }
    
    setIsAiLoading(true);
    try {
      const result = await aiService.optimize(quickInput, desktopDetails.type);
      setQuickInput(result.title); // [UPDATED] Auto fill title
      setDesktopDetails(prev => ({ ...prev, note: result.content })); // [UPDATED] Auto fill note
      notify("AI 优化完成！请查看备注", "success");
    } catch (err) {
      notify("AI 请求失败: " + err.message, "error");
    } finally {
      setIsAiLoading(false);
    }
  };
  
  const handleQuickSave = async (data) => {
    await handleAction(async () => { await feishuService.addRecord(data); notify("已保存", "success"); });
  };

  const handleUpdateStatus = (id, status) => handleAction(async () => {
    await feishuService.updateRecord(id, { "状态": status });
    notify("状态已更新", "success");
  });

  const handleEditSave = (id, fields) => handleAction(async () => {
    await feishuService.updateRecord(id, fields);
    setEditingItem(null);
    notify("修改已保存", "success");
  });

  const handleDelete = (id) => { if(confirm("确定删除吗？")) { handleAction(async () => { await feishuService.deleteRecord(id); notify("已删除", "success"); }); } };
  const toggleAction = (action) => { setDesktopDetails(prev => ({ ...prev, nextActions: prev.nextActions.includes(action) ? prev.nextActions.filter(a => a !== action) : [...prev.nextActions, action] })); };

  // Recent Activity Helper
  const recentActivities = [...records]
      .filter(r => r.fields["类型"] !== '任务')
      .sort((a, b) => new Date(b.fields["记录日期"]) - new Date(a.fields["记录日期"]))
      .slice(0, 5);

  // [NEW] Desktop Today's Task Quick Add
  const [todayInput, setTodayInput] = useState("");
  const handleTodayAdd = async (e) => {
    e.preventDefault();
    if (!todayInput.trim()) return;
    
    // 乐观更新
    const now = Date.now();
    const localDate = getLocalDateString();
    
    // Optimistic Update
    const newRec = { 
        id: "t_"+Date.now(), 
        fields: { 
            "标题": todayInput, 
            "状态": STATUS.DOING, 
            "类型": TYPE.TASK, 
            "优先级": PRIORITY.NORMAL, 
            "截止日期": new Date(localDate).getTime(), 
            "记录日期": now 
        } 
    };
    setRecords([newRec, ...records]); 
    setTodayInput("");

    await handleAction(async () => {
       await feishuService.addRecord({
           title: newRec.fields["标题"], status: STATUS.DOING, type: TYPE.TASK, priority: PRIORITY.NORMAL, dueDate: localDate, source: "PC", tags: []
       });
       notify("任务已添加至今日", "success");
    });
  }
  
  // [NEW] Open Base Button Handler
  const handleOpenBase = () => {
      const config = feishuService.getConfig();
      if (config && config.appToken && config.tableId) {
          window.open(`https://base.feishu.cn/base/${config.appToken}?table=${config.tableId}`, '_blank');
      } else {
          notify("配置信息不完整，无法打开数据表", "error");
      }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      <QuickCaptureModal isOpen={isQuickCaptureOpen} onClose={() => setIsQuickCaptureOpen(false)} onSave={handleQuickSave} />
      {editingItem && <EditRecordModal isOpen={true} record={editingItem} onClose={() => setEditingItem(null)} onSave={handleEditSave} directions={directions} />}
      {showFocusOverlay && <FocusModeOverlay task={focusTask} onClose={() => setShowFocusOverlay(false)} />}
      
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20">
        <div className="p-6 flex items-center gap-3"><Logo onClick={onGoHome} className="w-6 h-6 cursor-pointer" /></div>
        <div className="flex-1 px-4 py-2 space-y-6 overflow-y-auto custom-scrollbar">
          <NavItem icon={LayoutDashboard} label="仪表盘" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <div><div className="px-3 mb-2 text-[10px] font-bold uppercase text-slate-600 tracking-wider">Capture</div><NavItem icon={Inbox} label="收件箱" count={inboxItems.length} active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} /></div>
          <div><div className="px-3 mb-2 text-[10px] font-bold uppercase text-slate-600 tracking-wider">Organize</div><NavItem icon={Layout} label="计划看板" active={activeTab === 'planner'} onClick={() => setActiveTab('planner')} /><NavItem icon={BookOpen} label="知识库" active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')} /><NavItem icon={PenTool} label="日记" active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} /></div>
        </div>
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
            <button onClick={onSettings} className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"><Settings size={16}/> 设置</button>
            {isDemoMode && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">演示中</span>}
        </div>
      </aside>

      <main className="flex-1 relative flex flex-col min-w-0 bg-slate-950">
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-sm z-10">
          <h2 className="text-lg font-bold text-white capitalize flex items-center gap-2">
            {activeTab === 'dashboard' && <><LayoutDashboard size={20} className="text-indigo-400"/> 仪表盘</>}
            {activeTab === 'inbox' && <><Inbox size={20} className="text-blue-400"/> 收件箱处理</>}
            {activeTab === 'planner' && <><Layout size={20} className="text-purple-400"/> 个人计划</>}
            {activeTab === 'knowledge' && <><BookOpen size={20} className="text-emerald-400"/> 知识库</>}
            {activeTab === 'journal' && <><PenTool size={20} className="text-amber-400"/> 每日记录</>}
          </h2>
          <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="hidden md:inline-flex items-center gap-1 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-slate-400 font-mono">{new Date().toLocaleDateString()}</span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">ME</div>
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-8 custom-scrollbar">
          
          {/* VIEW: DASHBOARD */}
          {activeTab === 'dashboard' && (
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
                <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-3xl text-white shadow-2xl shadow-indigo-900/20 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                   <div className="relative z-10">
                      <h2 className="text-3xl font-bold mb-2">{getGreeting()}</h2>
                      <p className="text-indigo-100 mb-8 opacity-80 font-medium">“{quote}”</p>
                      <div className="flex gap-3">
                          <button onClick={() => setIsQuickCaptureOpen(true)} className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg flex items-center gap-2"><Plus size={18}/> 记点什么</button>
                          <button onClick={handleOpenBase} className="bg-indigo-500/20 border border-indigo-400/30 text-indigo-100 px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-500/30 transition-colors flex items-center gap-2"><ExternalLink size={18}/> 打开数据表</button>
                      </div>
                   </div>
                </div>

                <div className="md:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between hover:border-blue-500/30 transition-colors cursor-pointer" onClick={() => setActiveTab('inbox')}>
                   <div className="flex justify-between items-start"><div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400"><Inbox size={24}/></div><ArrowRight size={20} className="text-slate-600"/></div>
                   <div><div className="text-4xl font-bold text-white mb-1">{stats.inbox}</div><div className="text-slate-500 text-sm">收件箱待处理</div></div>
                </div>

                <div className="md:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between hover:border-purple-500/30 transition-colors cursor-pointer" onClick={() => setActiveTab('planner')}>
                   <div className="flex justify-between items-start"><div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400"><CheckSquare size={24}/></div><ArrowRight size={20} className="text-slate-600"/></div>
                   <div><div className="text-4xl font-bold text-white mb-1">{stats.todo + stats.doing}</div><div className="text-slate-500 text-sm">剩余任务</div></div>
                </div>

                {/* TODAY'S TASKS (Updated) */}
                <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                   <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider"><Calendar size={14}/> 今日任务</div>
                     <div className="text-xs text-slate-500 flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span> {todayTasks.length} 个任务</div>
                   </div>
                   
                   {/* [NEW] Desktop Today's Task Input */}
                   <form onSubmit={handleTodayAdd} className="mb-4 relative group">
                      <input 
                        type="text" 
                        placeholder="快速添加今日任务 (回车保存)..." 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500 outline-none transition-all pl-10"
                        value={todayInput}
                        onChange={e => setTodayInput(e.target.value)}
                      />
                      <Plus size={16} className="absolute left-3 top-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                      <button type="submit" disabled={!todayInput.trim()} className="absolute right-2 top-1.5 p-1 text-slate-400 hover:text-indigo-400 disabled:opacity-0 transition-all"><ArrowRight size={16}/></button>
                   </form>

                   <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {[...todayTasks, ...completedToday].map(item => {
                        const isDone = item.fields["状态"] === STATUS.DONE;
                        return (
                          <div key={item.id} onClick={() => setEditingItem(item)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isDone ? 'bg-slate-900 border-slate-800 opacity-60' : 'bg-slate-800 border-slate-700 hover:border-indigo-500/50'} cursor-pointer group`}>
                             <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(item.id, isDone ? '待办' : '已完成'); }} className={`w-5 h-5 rounded flex items-center justify-center transition-all ${isDone ? 'bg-emerald-500 text-white' : 'border-2 border-slate-500 hover:border-emerald-500'}`}>
                                {isDone && <Check size={12} />}
                             </button>
                             <div className="flex-1">
                                <span className={`text-sm ${isDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.fields["标题"]}</span>
                                <div className="flex gap-2 mt-1">
                                  <span className={`text-[10px] px-1.5 rounded border ${isDone ? 'border-slate-800 text-slate-600' : 'border-slate-600 text-slate-400'}`}>{item.fields["状态"]}</span>
                                  {item.fields["优先级"] === PRIORITY.HIGH && !isDone && <span className="text-[10px] text-red-400 flex items-center gap-0.5"><Flame size={10}/> 紧急</span>}
                                </div>
                             </div>
                             {/* Focus Button */}
                             {!isDone && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setFocusTask(item.fields["标题"]); setShowFocusOverlay(true); }}
                                 className="opacity-0 group-hover:opacity-100 p-1.5 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-all"
                                 title="开始专注"
                               >
                                 <Timer size={16} />
                               </button>
                             )}
                          </div>
                        );
                      })}
                      {todayTasks.length + completedToday.length === 0 && <div className="text-slate-600 text-sm text-center py-8">今日无待办任务</div>}
                   </div>
                </div>

                <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                   <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider mb-4"><Clock size={14}/> 最近动态 (非任务)</div>
                   <div className="space-y-3">
                      {recentActivities.map(item => (
                         <div key={item.id} onClick={() => setEditingItem(item)} className="flex items-center justify-between p-3 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer group">
                            <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-lg ${item.fields["类型"] === '日记' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                  {item.fields["类型"] === '日记' ? <PenTool size={14}/> : <BookOpen size={14}/>}
                               </div>
                               <span className="text-slate-300 text-sm truncate max-w-[200px]">{item.fields["标题"]}</span>
                            </div>
                            <span className="text-xs text-slate-600">{new Date(item.fields["记录日期"]).toLocaleDateString()}</span>
                         </div>
                      ))}
                      {recentActivities.length === 0 && <div className="text-slate-600 text-sm text-center py-4">暂无新记录</div>}
                   </div>
                </div>
             </div>
          )}

          {/* VIEW: INBOX */}
          {activeTab === 'inbox' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 border-b border-slate-800" ref={inputRef}>
                <form onSubmit={handleInboxAdd} className={`relative transition-all duration-300 ${inputExpanded ? 'pb-2' : ''}`}>
                    <div className="relative">
                       <input type="text" value={quickInput} onFocus={() => setInputExpanded(true)} onChange={(e) => setQuickInput(e.target.value)} placeholder="快速捕获想法..." className={`w-full pl-4 pr-24 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder-slate-600 ${inputExpanded ? 'bg-slate-900' : ''}`} />
                       {inputExpanded && (
                         <button 
                           type="button" 
                           onClick={handleAiOptimize}
                           disabled={isAiLoading || !quickInput}
                           className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-lg transition-all"
                           title="AI 优化"
                         >
                           {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                         </button>
                       )}
                    </div>
                    {inputExpanded && (
                      <div className="mt-3 space-y-3 animate-fade-in">
                        <textarea className="w-full text-sm bg-slate-800/50 border border-slate-700 p-3 rounded-lg resize-none h-20 text-slate-300 placeholder-slate-600" placeholder="添加备注 (支持 AI 优化生成)..." value={desktopDetails.note} onChange={e => setDesktopDetails({...desktopDetails, note: e.target.value})} />
                        {/* [NEW] Desktop Inbox Type Selector */}
                        <div className="flex gap-2 items-center flex-wrap">
                          <select className="bg-slate-800 border border-slate-700 text-xs text-slate-300 px-2 py-1.5 rounded-lg" value={desktopDetails.type} onChange={e => setDesktopDetails({...desktopDetails, type: e.target.value})}>
                             {[TYPE.IDEA, TYPE.TASK, TYPE.NOTE, TYPE.JOURNAL].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <select className="bg-slate-800 border border-slate-700 text-xs text-slate-300 px-2 py-1.5 rounded-lg" value={desktopDetails.direction} onChange={e => setDesktopDetails({...desktopDetails, direction: e.target.value})}>{CONTENT_DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}</select>
                        </div>
                        <div className="flex flex-wrap gap-2">{actions.map(action => (<button key={action} type="button" onClick={() => toggleAction(action)} className={`px-2 py-1 rounded border text-[10px] flex items-center gap-1 transition-colors ${desktopDetails.nextActions.includes(action) ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}`}>{desktopDetails.nextActions.includes(action) && <Check size={8} />} {action}</button>))}</div>
                        <div className="flex justify-between items-center pt-2"><button type="submit" disabled={!quickInput.trim() || isQuickAdding} className="bg-indigo-600 text-white px-6 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors">{isQuickAdding ? '保存中...' : '保存'}</button></div>
                      </div>
                    )}
                    {!inputExpanded && (<button type="submit" disabled={!quickInput.trim() || isQuickAdding} className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"><ArrowRight size={16} /></button>)}
                </form>
              </div>

              {inboxItems.map(item => (
                <div key={item.id} onClick={() => setEditingItem(item)} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-start gap-4 hover:border-indigo-500/30 transition-all group cursor-pointer">
                  <div className="mt-1 p-2 bg-slate-800 rounded-lg text-slate-400">{item.fields["类型"] === '任务' ? <CheckSquare size={18} /> : <Lightbulb size={18} />}</div>
                  <div className="flex-1">
                      <h3 className="text-slate-200 font-medium mb-1">{item.fields["标题"]}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{item.fields["内容"]}</p>
                      <div className="flex gap-2">
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700">{item.fields["内容方向"]}</span>
                      </div>
                      <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(item.id, '待办'); }} className="text-xs bg-slate-800 hover:bg-blue-500/20 hover:text-blue-300 px-3 py-1 rounded border border-slate-700 transition-colors">转为待办</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-xs bg-slate-800 hover:bg-red-500/20 hover:text-red-300 px-3 py-1 rounded border border-slate-700 transition-colors flex items-center gap-1"><Trash2 size={12}/> 删除</button>
                      </div>
                  </div>
                </div>
              ))}
              {inboxItems.length === 0 && <div className="text-center py-20 text-slate-600">Inbox 空空如也</div>}
            </div>
          )}

          {/* ... (其他视图保持不变) ... */}
          {activeTab === 'planner' && (
            <div className="flex gap-6 h-full overflow-x-auto pb-4">
              {['待办', '进行中', '已完成'].map(status => (
                <div key={status} className="flex-1 min-w-[300px] bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center"><span className="font-bold text-slate-400">{status}</span></div>
                  <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
                    {(status === '待办' ? todoItems : status === '进行中' ? doingItems : doneItems).map(item => <KanbanCard key={item.id} item={item} onMove={handleUpdateStatus} onClick={() => setEditingItem(item)} />)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'knowledge' && (
             <div className="space-y-4">
                <div className="relative">
                   <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                   <input type="text" placeholder="搜索笔记..." className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 text-sm text-white focus:border-indigo-500 outline-none" value={searchText} onChange={e => setSearchText(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {knowledgeItems.filter(i => i.fields["标题"].includes(searchText)).map(item => (
                    <div key={item.id} onClick={() => setEditingItem(item)} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-emerald-500/30 transition-all h-48 flex flex-col group cursor-pointer">
                      <div className="flex items-center gap-2 mb-3 text-emerald-400 text-xs font-bold uppercase tracking-wider"><BookOpen size={14} /> {item.fields["内容方向"] || "Note"}</div>
                      <h3 className="text-lg font-bold text-slate-200 mb-2 line-clamp-1">{item.fields["标题"]}</h3>
                      <p className="text-sm text-slate-500 line-clamp-3 flex-1">{item.fields["内容"]}</p>
                      <div className="pt-4 mt-2 border-t border-slate-800 flex gap-2">{item.fields["标签"]?.map(tag => (<span key={tag} className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">#{tag}</span>))}</div>
                    </div>
                  ))}
                </div>
             </div>
          )}

          {activeTab === 'journal' && (
            <div className="max-w-2xl mx-auto relative pl-8 border-l border-slate-800 space-y-12 py-8">
              {journalItems.map(item => (
                <div key={item.id} onClick={() => setEditingItem(item)} className="relative cursor-pointer group">
                  <div className="absolute -left-[39px] top-0 w-5 h-5 rounded-full bg-slate-900 border-4 border-slate-800 text-slate-500 group-hover:border-indigo-500 transition-colors"></div>
                  <div className="text-xs font-mono text-slate-500 mb-2">{new Date(item.fields["记录日期"]).toLocaleDateString()}</div>
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 group-hover:border-slate-700 transition-all"><p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{item.fields["标题"]}</p>{item.fields["内容"] && <div className="mt-4 pt-4 border-t border-slate-800/50 text-sm text-slate-500">{item.fields["内容"]}</div>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => setIsQuickCaptureOpen(true)} className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-50 group"><Plus size={28} /></button>
      </main>
    </div>
  );
};

export default function App() {
  const [config, setConfig] = useState(() => feishuService.getConfig());
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => !feishuService.getConfig());
  const [isMobile, setIsMobile] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Directions state now uses the constant directly
  const directions = CONTENT_DIRECTIONS;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); window.addEventListener('resize', checkMobile); return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const notify = (msg, type = "info") => setNotification({ message: msg, type });
  const handleSaveConfig = (newConfig) => { feishuService.saveConfig(newConfig); setConfig(newConfig); setIsConfiguring(false); setShowWelcome(false); };
  const handleLogout = () => { if (confirm("确定要断开连接吗？")) { feishuService.clearConfig(); setConfig(null); setShowWelcome(true); setIsConfiguring(false); } };
  const handleCancelConfig = () => { setIsConfiguring(false); setShowWelcome(false); };
  const isDemoMode = !config;

  return (
    <>
      {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {showWelcome && !isConfiguring ? (
        <WelcomeScreen onStart={() => { setShowWelcome(false); setIsConfiguring(false); }} />
      ) : isConfiguring ? (
        <SettingsScreen onSave={handleSaveConfig} notify={notify} onCancel={handleCancelConfig} initialConfig={config} onLogout={handleLogout} />
      ) : isMobile ? (
        <MobileView onSettings={() => setIsConfiguring(true)} notify={notify} directions={directions} />
      ) : (
        <DesktopView onLogout={handleLogout} onSettings={() => setIsConfiguring(true)} notify={notify} isDemoMode={isDemoMode} onGoHome={() => setShowWelcome(true)} directions={directions} />
      )}
    </>
  );
}
