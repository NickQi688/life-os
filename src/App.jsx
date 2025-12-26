import React, { useState, useEffect, useRef } from 'react';
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
  Edit3, MoreVertical, XCircle, ExternalLink
} from 'lucide-react';

// --- CONFIGURATION ---
const TUTORIAL_URL = "https://ai.feishu.cn/docx/SaxxdrgJkoACzUx2LOBcLknqnQf"; 

/**
 * --- UTILS: MOCK DATA ---
 */
const MOCK_DATA = [
  { id: '101', fields: { "标题": "👋 欢迎使用 LifeOS！(点击我编辑)", "内容": "这是一个演示条目。", "状态": "收件箱", "分类": "收件箱", "类型": "灵感", "优先级": "普通", "记录日期": Date.now() } },
  { id: '102', fields: { "标题": "🔥 完成今日紧急任务", "状态": "待办", "分类": "工作", "类型": "任务", "优先级": "紧急", "截止日期": Date.now(), "记录日期": Date.now() - 100000 } },
  { id: '103', fields: { "标题": "研究 Next.js 14", "状态": "进行中", "分类": "工作", "类型": "任务", "优先级": "普通", "记录日期": Date.now() - 200000 } },
  { id: '104', fields: { "标题": "已完成的任务示例", "状态": "已完成", "分类": "生活", "类型": "任务", "优先级": "普通", "截止日期": Date.now(), "记录日期": Date.now() - 300000 } },
];

/**
 * --- FEISHU SERVICE (Core Logic) ---
 */
class FeishuService {
  constructor() {
    this.STORAGE_KEY = 'lifeos_feishu_config';
    this.API_BASE = '/api/feishu'; 
    this.isPreview = typeof window !== 'undefined' && window.location.protocol === 'blob:';
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
        } catch (e) {
            const text = await response.text();
            if (text) errorMsg = `API Error: ${text}`;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      if (result.code !== 0) throw new Error(`Feishu API Error [${result.code}]: ${result.msg}`);
      return result.data || result;
    } catch (error) { 
        console.error("API Request Failed:", error); 
        throw error; 
    }
  }

  async getTenantAccessToken(appId, appSecret) {
    const data = await this.request('/auth/v3/tenant_access_token/internal', 'POST', { "app_id": appId, "app_secret": appSecret });
    return data ? data.tenant_access_token : null;
  }

  async fetchRecords() {
    const config = this.getConfig();
    if (!config) return MOCK_DATA;
    try {
      const token = await this.getTenantAccessToken(config.appId, config.appSecret);
      if (!token) return MOCK_DATA;
      const data = await this.request(`/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records?page_size=500&sort=["记录日期 DESC"]`, 'GET', null, token);
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
    const rawInput = data.title || "";
    const firstLine = rawInput.split('\n')[0];
    const smartTitle = firstLine.length > 40 ? firstLine.substring(0, 40) + "..." : firstLine;
    const fullContent = rawInput + (data.content ? `\n\n【备注】\n${data.content}` : "");

    // [UPDATED] 使用全中文选项
    const fields = {
      "标题": smartTitle || "无标题记录", 
      "内容": fullContent, 
      "来源": data.source || "PC", 
      "状态": data.status || "收件箱", 
      "类型": data.type || "灵感",  
      "优先级": data.priority || "普通",
      "分类": data.category || "收件箱", 
      "内容方向": data.direction || "灵感",
      "信息来源": data.infoSource || "其他", 
      "记录日期": Date.now() 
    };
    if (data.nextActions && data.nextActions.length > 0) fields["下一步"] = data.nextActions;
    if (data.dueDate) fields["截止日期"] = new Date(data.dueDate).getTime();
    if (data.tags && data.tags.length > 0) fields["标签"] = data.tags;
    
    return await this.request(`/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records`, 'POST', { fields }, token);
  }

  async updateRecord(recordId, fields) {
    const { config, token } = await this.checkConfigOrThrow();
    return await this.request(`/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records/${recordId}`, 'PUT', { fields }, token);
  }

  async deleteRecord(recordId) {
    const { config, token } = await this.checkConfigOrThrow();
    return await this.request(`/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records/${recordId}`, 'DELETE', null, token);
  }

  async createTable(appId, appSecret, appToken) {
    const token = await this.getTenantAccessToken(appId, appSecret);
    const tableName = `LifeOS_${Date.now()}`;
    const tableRes = await this.request(`/bitable/v1/apps/${appToken}/tables`, 'POST', { table: { name: tableName } }, token);

    if (!tableRes || !tableRes.table_id) throw new Error("创建表格失败，未返回 Table ID。");

    const tableId = tableRes.table_id;
    const fieldsRes = await this.request(`/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, 'GET', null, token);
    const primaryFieldId = fieldsRes.items[0].field_id;
    await this.request(`/bitable/v1/apps/${appToken}/tables/${tableId}/fields/${primaryFieldId}`, 'PUT', { field_name: "标题" }, token);

    // [UPDATED] 这里的选项必须和上面 addRecord 以及用户手动建表保持一致
    const fieldsToCreate = [
      { field_name: "内容", type: 1 },
      { field_name: "状态", type: 3, property: { options: [{ name: "收件箱" }, { name: "待办" }, { name: "进行中" }, { name: "已完成" }] } },
      { field_name: "来源", type: 3, property: { options: [{ name: "Mobile" }, { name: "PC" }] } },
      { field_name: "分类", type: 3, property: { options: [{ name: "收件箱" }, { name: "工作" }, { name: "生活" }, { name: "灵感" }, { name: "阅读" }] } },
      { field_name: "标签", type: 4 },
      { field_name: "类型", type: 3, property: { options: [{ name: "灵感" }, { name: "任务" }, { name: "笔记" }, { name: "日记" }] } },
      { field_name: "优先级", type: 3, property: { options: [{ name: "紧急" }, { name: "普通" }, { name: "不急" }] } },
      { field_name: "下一步", type: 4, property: { options: [{ name: "学习" }, { name: "整理" }, { name: "收藏使用" }, { name: "分享" }, { name: "待办" }] } },
      { field_name: "内容方向", type: 3, property: { options: [{ name: "灵感" }, { name: "AI" }, { name: "提效工具" }, { name: "个人成长" }, { name: "自媒体" }, { name: "日记" }] } },
      { field_name: "信息来源", type: 3, property: { options: [{ name: "推特" }, { name: "微信群" }, { name: "公众号" }, { name: "即刻" }, { name: "小红书" }, { name: "Youtube" }, { name: "其他" }] } },
      { field_name: "截止日期", type: 5 },
      { field_name: "记录日期", type: 5 } 
    ];

    for (const field of fieldsToCreate) {
      await this.request(`/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, 'POST', field, token);
    }
    return tableId;
  }
}

const feishuService = new FeishuService();

/**
 * --- UI COMPONENTS ---
 */
const Toast = ({ message, type, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  const bgColors = { success: 'bg-emerald-600/90 text-white', error: 'bg-red-500/90 text-white', info: 'bg-indigo-500/90 text-white' };
  const icons = { success: <CheckCircle size={18} />, error: <AlertCircle size={18} />, info: <Info size={18} /> };
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md transition-all animate-fade-in-down border border-white/10 ${bgColors[type] || bgColors.info}`}>
      {icons[type]}<span className="text-sm font-medium">{message}</span>
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
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- SHARED EDIT MODAL ---
const EditRecordModal = ({ isOpen, record, onClose, onSave }) => {
  const [formData, setFormData] = useState({});
  const directions = ["灵感", "AI", "提效工具", "个人成长", "自媒体", "日记"];
  const actionsList = ["学习", "整理", "收藏使用", "分享", "待办"];

  useEffect(() => {
    if (record) {
      setFormData({
        "标题": record.fields["标题"] || "",
        "内容": record.fields["内容"] || "",
        "状态": record.fields["状态"] || "收件箱",
        "类型": record.fields["类型"] || "灵感", 
        "优先级": record.fields["优先级"] || "普通",
        "分类": record.fields["分类"] || "收件箱",
        "内容方向": record.fields["内容方向"] || "灵感",
        "信息来源": record.fields["信息来源"] || "其他",
        "下一步": record.fields["下一步"] || [],
        "截止日期": record.fields["截止日期"] ? new Date(record.fields["截止日期"]).toISOString().split('T')[0] : ""
      });
    }
  }, [record]);

  const handleSave = () => {
    const fieldsToSave = { ...formData };
    if (fieldsToSave["截止日期"]) {
       fieldsToSave["截止日期"] = new Date(fieldsToSave["截止日期"]).getTime();
    } else {
       fieldsToSave["截止日期"] = null;
    }
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
        <div>
           <label className="text-xs font-bold text-slate-500 uppercase block mb-1">标题</label>
           <input className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" value={formData["标题"] || ""} onChange={e => setFormData({...formData, "标题": e.target.value})} />
        </div>
        <div>
           <label className="text-xs font-bold text-slate-500 uppercase block mb-1">内容 / 备注</label>
           <textarea className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 focus:border-indigo-500 outline-none resize-none h-24" value={formData["内容"] || ""} onChange={e => setFormData({...formData, "内容": e.target.value})} />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">状态</label>
              <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 outline-none" value={formData["状态"] || "收件箱"} onChange={e => setFormData({...formData, "状态": e.target.value})}>
                 {['收件箱', '待办', '进行中', '已完成'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
           </div>
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">优先级</label>
              <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 outline-none" value={formData["优先级"] || "普通"} onChange={e => setFormData({...formData, "优先级": e.target.value})}>
                 {['紧急', '普通', '不急'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">类型</label>
              <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 outline-none" value={formData["类型"] || "灵感"} onChange={e => setFormData({...formData, "类型": e.target.value})}>
                 {['灵感', '任务', '笔记', '日记'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
           </div>
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">截止日期</label>
              <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 outline-none" value={formData["截止日期"] || ""} onChange={e => setFormData({...formData, "截止日期": e.target.value})} />
           </div>
        </div>

        <div>
           <label className="text-xs font-bold text-slate-500 uppercase block mb-1">内容方向</label>
           <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{directions.map(d => <button key={d} onClick={() => setFormData({...formData, "内容方向": d})} className={`px-2 py-1 rounded border text-xs whitespace-nowrap ${formData["内容方向"] === d ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>{d}</button>)}</div>
        </div>

        <div>
           <label className="text-xs font-bold text-slate-500 uppercase block mb-1">下一步动作</label>
           <div className="flex flex-wrap gap-2">
             {actionsList.map(a => (
               <button key={a} onClick={() => toggleAction(a)} className={`px-2 py-1 rounded border text-xs flex items-center gap-1 ${formData["下一步"]?.includes(a) ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                 {formData["下一步"]?.includes(a) && <Check size={10}/>} {a}
               </button>
             ))}
           </div>
        </div>

        <button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors mt-4">保存修改</button>
      </div>
    </Dialog>
  );
};

const QuickCaptureModal = ({ isOpen, onClose, onSave }) => {
  const [text, setText] = useState("");
  const [type, setType] = useState("灵感");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (isOpen && inputRef.current) setTimeout(() => inputRef.current.focus(), 100); }, [isOpen]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsSending(true);
    await onSave({ title: text, type, status: type === '任务' ? '收件箱' : '已完成', source: "QuickCapture" });
    setIsSending(false); setText(""); onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        <div className="p-1">
          <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }} placeholder="有什么想法？(Cmd/Ctrl + Enter 发送)" className="w-full h-32 bg-transparent text-lg text-slate-200 p-4 placeholder-slate-600 outline-none resize-none" />
        </div>
        <div className="px-4 py-3 bg-slate-800/50 flex justify-between items-center border-t border-slate-700/50">
          <div className="flex gap-2">
            {[ { id: '灵感', icon: Lightbulb, label: '灵感' }, { id: '任务', icon: CheckSquare, label: '任务' }, { id: '笔记', icon: FileText, label: '笔记' }, { id: '日记', icon: Book, label: '日记' }, ].map(t => (
              <button key={t.id} onClick={() => setType(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${type === t.id ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}> <t.icon size={14} /> {t.label} </button>
            ))}
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
      <div className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600">{item.fields["分类"] || "未分类"}</div>
      {item.fields["优先级"] === '紧急' && <Flame size={14} className="text-red-500" />}
    </div>
    <h4 className="text-sm text-slate-200 font-medium leading-relaxed mb-2">{item.fields["标题"]}</h4>
    <div className="flex justify-between items-center pt-2 border-t border-slate-700/30">
      <span className="text-[10px] text-slate-500">{new Date(item.fields["记录日期"]).toLocaleDateString()}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.fields["状态"] !== '已完成' && (<button onClick={(e) => { e.stopPropagation(); onMove(item.id, '已完成'); }} className="p-1 hover:bg-emerald-500/20 hover:text-emerald-400 rounded text-slate-500" title="完成"><CheckSquare size={14} /></button>)}
      </div>
    </div>
  </div>
);

/**
 * --- VIEWS (Screens) ---
 */

const WelcomeScreen = ({ onStart }) => (
  <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
    <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto border-b border-slate-800/50"><Logo /><button onClick={onStart} className="px-4 py-2 text-sm font-bold text-slate-300 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-all">开启体验 / 登录</button></nav>
    <div className="max-w-4xl mx-auto px-6 pt-20 pb-20 text-center animate-fade-in-up"><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6 border border-indigo-500/20">v2.0 Dark Edition</div><h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight">掌控你的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">数字人生</span></h1><p className="text-xl md:text-2xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">极速录入想法 · 深度管理任务 · 数据完全私有</p><button onClick={onStart} className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 rounded-full hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-1">开启 LifeOS <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" /></button></div>
    <div className="bg-slate-900/50 py-24 border-y border-slate-800/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard icon={<Smartphone size={24} />} color="text-blue-400 bg-blue-400/10" title="极速捕获" desc="专为手机设计的输入界面，随时随地记录灵感。" />
          <FeatureCard icon={<Shield size={24} />} color="text-emerald-400 bg-emerald-400/10" title="数据隐私" desc="BYOK 架构。数据直连飞书，不经过第三方存储。" />
          <FeatureCard icon={<Activity size={24} />} color="text-purple-400 bg-purple-400/10" title="GTD 工作流" desc="内置收件箱、下一步行动、优先级管理。" />
        </div>
      </div>
    </div>
    <div className="py-24">
        <div className="max-w-6xl mx-auto px-6">
           <div className="text-center mb-16"><h2 className="text-3xl font-bold text-white mb-4">只需三步，即刻开启</h2><p className="text-slate-500">连接飞书，无需复杂的服务器配置。</p></div>
           <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-slate-800 -z-10"></div>
              <StepCard num="1" title="准备飞书表格" desc="在飞书新建多维表格，按照说明配置好字段。" />
              <StepCard num="2" title="获取 API 密钥" desc="复制浏览器地址栏的 Base ID 和 Table ID。" />
              <StepCard num="3" title="开始使用" desc="填入配置，立即连接你的私人数据库。" />
           </div>
        </div>
    </div>
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-500 py-12 text-center text-sm">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-6 font-medium mb-8 text-slate-400">
          <div className="flex items-center gap-2"><User size={14} /><span>作者：小鲸</span></div>
          <div className="flex items-center gap-2"><Mail size={14} /><span>1584897236@qq.com</span></div>
          <div className="flex items-center gap-2"><MessageCircle size={14} /><span>微信：zhaoqi3210</span></div>
          <a href="https://www.xiaojingfy.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-indigo-400 transition-colors"><Globe size={14} /><span>www.xiaojingfy.com</span></a>
        </div>
        <p className="opacity-50 text-xs">© 2025 LifeOS. Designed for productivity.</p>
      </div>
    </footer>
  </div>
);

const FeatureCard = ({ icon, color, title, desc }) => (<div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-slate-700 transition-colors"><div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-6`}>{icon}</div><h3 className="text-xl font-bold mb-3 text-slate-200">{title}</h3><p className="text-slate-500 leading-relaxed text-sm">{desc}</p></div>);
const StepCard = ({ num, title, desc }) => (<div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center relative z-10"><div className="w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-6 border-4 border-slate-950 shadow-lg">{num}</div><h3 className="text-lg font-bold mb-2 text-slate-200">{title}</h3><p className="text-sm text-slate-500 leading-relaxed">{desc}</p></div>);

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
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">信息来源 (单选)</div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">设备来源 (单选: Mobile/PC)</div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">截止日期 (日期)</div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">记录日期 (日期)</div>
           </div>
        </div>
      )}
    </div>
  );
};

const SettingsScreen = ({ onSave, onCancel, initialConfig, notify, onLogout }) => {
  const [formData, setFormData] = useState({ appId: initialConfig?.appId || '', appSecret: initialConfig?.appSecret || '', appToken: initialConfig?.appToken || '', tableId: initialConfig?.tableId || '', });
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
  
  const handleAutoCreateTable = async () => {
    if (!formData.appId || !formData.appSecret || !formData.appToken) { notify("请先填写 App ID, App Secret 和 Base ID", "error"); return; }
    setIsCreatingTable(true);
    try {
      const newTableId = await feishuService.createTable(formData.appId, formData.appSecret, formData.appToken);
      setFormData(prev => ({ ...prev, tableId: newTableId }));
      notify("表格初始化成功！字段已自动配置", "success");
    } catch (error) { console.error(error); notify("创建失败: " + error.message, "error"); } finally { setIsCreatingTable(false); }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-slate-200">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-800">
        <div className="flex items-center gap-3 mb-6"><Logo /></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">App ID</label><div className="flex gap-2"><input required type="text" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200" placeholder="cli_..." value={formData.appId} onChange={e => setFormData({...formData, appId: e.target.value})} /><a href={TUTORIAL_URL} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400" title="配置教程"><Book size={18}/></a></div></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">App Secret</label><input required type="password" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200" placeholder="******" value={formData.appSecret} onChange={e => setFormData({...formData, appSecret: e.target.value})} /></div>
          </div>
          <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Base ID (App Token)</label><input required type="text" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200" placeholder="bascn..." value={formData.appToken} onChange={e => setFormData({...formData, appToken: e.target.value})} /></div>
          <div className="pt-2 border-t border-slate-800 mt-4">
             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Table ID (数据表 ID)</label>
             <div className="flex gap-2">
               <input required type="text" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-200" placeholder="tbl..." value={formData.tableId} onChange={e => setFormData({...formData, tableId: e.target.value})} />
               <button type="button" onClick={handleAutoCreateTable} disabled={isCreatingTable || !formData.appToken} className={`whitespace-nowrap px-4 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${!formData.appToken ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}>
                  {isCreatingTable ? <><Loader2 className="animate-spin" size={16} /> 创建中</> : <>✨ 一键新建表</>}
               </button>
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

const MobileView = ({ onSettings, notify }) => {
  const [records, setRecords] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [recentInputs, setRecentInputs] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState({ category: "收件箱", type: "灵感", dueDate: "", note: "" });
  const categories = ["收件箱 📥", "工作 💼", "生活 🏠", "灵感 💡", "阅读 📖"];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await feishuService.fetchRecords();
      setRecords(data);
      const todayStr = new Date().toDateString();
      setTodayTasks(data.filter(r => r.fields["类型"] === '任务' && r.fields["状态"] !== '已完成' && r.fields["截止日期"] && new Date(r.fields["截止日期"]).toDateString() === todayStr));
      setRecentInputs(data.slice(0, 8)); // 取最近8条
    } catch (e) { console.error(e); }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    setIsSending(true);
    try {
      await feishuService.addRecord({ title: inputValue, content: details.note, source: "Mobile", category: details.category.split(" ")[0], type: details.type, dueDate: details.dueDate, status: "收件箱" });
      setInputValue(""); setDetails({ category: "收件箱", type: "灵感", dueDate: "", note: "" }); setShowDetails(false);
      notify("已记录", "success");
      loadData();
    } catch (error) { notify("发送失败", "error"); } finally { setIsSending(false); }
  };

  const handleEditSave = async (id, fields) => {
    await feishuService.updateRecord(id, fields);
    setEditingItem(null);
    notify("修改已保存", "success");
    loadData();
  };

  const handleDone = async (id) => {
    await feishuService.updateRecord(id, { "状态": "已完成" });
    notify("任务完成", "success");
    loadData();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      <div className="px-6 pt-12 pb-4 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 border-b border-white/5"><Logo className="w-6 h-6" textSize="text-lg" /><button onClick={onSettings} className="p-2 text-slate-400 hover:text-white"><Settings size={20} /></button></div>
      {editingItem && <EditRecordModal isOpen={true} record={editingItem} onClose={() => setEditingItem(null)} onSave={handleEditSave} />}
      
      <div className="flex-1 overflow-y-auto px-4 pb-48 custom-scrollbar">
        {todayTasks.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-2 flex items-center gap-2"><Calendar size={12}/> 今日待办</h2>
            <div className="space-y-2">{todayTasks.map(item => (<div key={item.id} onClick={() => setEditingItem(item)} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between active:scale-[0.98] transition-transform"><span className="text-slate-200 text-sm font-medium">{item.fields["标题"]}</span><button onClick={(e) => { e.stopPropagation(); handleDone(item.id); }} className="w-6 h-6 rounded-full border-2 border-slate-600 flex items-center justify-center text-transparent hover:bg-emerald-500 hover:border-emerald-500 hover:text-white"><Check size={14}/></button></div>))}</div>
          </div>
        )}
        <div className="mt-8">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-2 flex items-center gap-2"><Clock size={12}/> 最近动态 / 收件箱</h2>
          <div className="space-y-3">
            {recentInputs.map(item => (
              <div key={item.id} onClick={() => setEditingItem(item)} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-start active:scale-[0.98] transition-transform">
                <div>
                  <div className="text-slate-200 font-medium line-clamp-2 text-sm">{item.fields["标题"]}</div>
                  <div className="flex items-center gap-2 mt-2"><span className="text-[10px] text-slate-500">{new Date(item.fields["记录日期"]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                </div>
                <div className="text-slate-600"><Edit3 size={16} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className={`fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-xl border-t border-white/10 pb-safe-area shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${showDetails ? 'rounded-t-3xl' : ''} z-20`}>
        <div className="p-4">
          {showDetails && (
            <div className="mb-4 space-y-4 animate-fade-in">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{categories.map(cat => (<button key={cat} onClick={() => setDetails({...details, category: cat})} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all ${details.category === cat ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{cat}</button>))}</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-1 rounded-lg flex text-xs font-medium text-slate-500 relative"><div className={`absolute top-1 bottom-1 w-1/2 bg-white rounded shadow-sm transition-all duration-300 ${details.type === '任务' ? 'left-1/2' : 'left-0'}`} /><button onClick={() => setDetails({...details, type: '灵感'})} className={`flex-1 flex items-center justify-center gap-1 z-10 transition-colors ${details.type === '灵感' ? 'text-indigo-600' : ''}`}><Lightbulb size={14} /> 想法</button><button onClick={() => setDetails({...details, type: '任务'})} className={`flex-1 flex items-center justify-center gap-1 z-10 transition-colors ${details.type === '任务' ? 'text-indigo-600' : ''}`}><CheckSquare size={14} /> 任务</button></div>
                {details.type === '任务' && (<input type="date" value={details.dueDate} onChange={(e) => setDetails({...details, dueDate: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-600 focus:outline-none focus:border-indigo-500" />)}
              </div>
              <textarea value={details.note} onChange={(e) => setDetails({...details, note: e.target.value})} placeholder="添加额外备注 (可选)..." className="w-full bg-slate-50 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-20" />
            </div>
          )}
          <div className="relative flex items-end gap-2"><button onClick={() => setShowDetails(!showDetails)} className={`mb-1 p-2 rounded-xl transition-colors ${showDetails ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400 hover:text-white'}`}><MoreHorizontal size={24} /></button><textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={details.type === '任务' ? "要做什么？" : "记录你的想法..."} className="flex-1 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-base text-white focus:outline-none focus:bg-slate-800 focus:border-indigo-500/50 transition-all resize-none h-14 max-h-32 placeholder-slate-500" rows={1} style={{ minHeight: '3.5rem' }} /><button onClick={handleSend} disabled={!inputValue.trim() || isSending} className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${!inputValue.trim() ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 hover:scale-105 active:scale-95'}`}>{isSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={24} />}</button></div>
        </div>
      </div>
    </div>
  );
};

const DesktopView = ({ onLogout, onSettings, notify, isDemoMode, onGoHome }) => {
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
  const [desktopDetails, setDesktopDetails] = useState({ type: "灵感", priority: "普通", direction: "灵感", infoSource: "其他", nextActions: [], dueDate: "", note: "" });
  const inputRef = useRef(null);

  // Dashboard Stats
  const stats = { inbox: inboxItems.length, todo: todoItems.length, doing: doingItems.length, done: doneItems.length };
  
  // Today's Tasks Logic
  const todayStr = new Date().toDateString();
  const todayTasks = records.filter(r => r.fields["类型"] === '任务' && r.fields["状态"] !== '已完成' && r.fields["截止日期"] && new Date(r.fields["截止日期"]).toDateString() === todayStr);
  const completedToday = records.filter(r => r.fields["状态"] === '已完成' && r.fields["截止日期"] && new Date(r.fields["截止日期"]).toDateString() === todayStr);

  const directions = ["灵感", "AI", "提效工具", "个人成长", "自媒体", "日记"];
  const sources = ["推特", "微信群", "公众号", "即刻", "小红书", "Youtube", "其他"];
  const actions = ["学习", "整理", "收藏使用", "分享", "待办"];

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const handleClickOutside = (event) => { if (inputRef.current && !inputRef.current.contains(event.target)) { if (!quickInput.trim()) { setInputExpanded(false); } } };
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [quickInput]);

  const loadData = async () => {
    try {
      const data = await feishuService.fetchRecords();
      setRecords(data);
      setInboxItems(data.filter(r => r.fields["状态"] === '收件箱'));
      setTodoItems(data.filter(r => r.fields["状态"] === '待办'));
      setDoingItems(data.filter(r => r.fields["状态"] === '进行中'));
      setDoneItems(data.filter(r => r.fields["状态"] === '已完成'));
      setKnowledgeItems(data.filter(r => r.fields["类型"] === '笔记' || r.fields["分类"] === '阅读'));
      setJournalItems(data.filter(r => r.fields["类型"] === '日记' || r.fields["内容方向"] === '日记'));
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
        await feishuService.addRecord({ title: quickInput, content: desktopDetails.note, source: "PC", type: desktopDetails.type, priority: desktopDetails.priority, direction: desktopDetails.direction, infoSource: desktopDetails.infoSource, nextActions: desktopDetails.nextActions, dueDate: desktopDetails.type === '任务' ? desktopDetails.dueDate : null, status: "收件箱", tags: [] });
        setQuickInput(""); setDesktopDetails({ type: "灵感", priority: "普通", direction: "灵感", infoSource: "其他", nextActions: [], dueDate: "", note: "" }); setInputExpanded(false);
        notify("已记录", "success");
    });
    setIsQuickAdding(false);
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

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      <QuickCaptureModal isOpen={isQuickCaptureOpen} onClose={() => setIsQuickCaptureOpen(false)} onSave={handleQuickSave} />
      {editingItem && <EditRecordModal isOpen={true} record={editingItem} onClose={() => setEditingItem(null)} onSave={handleEditSave} />}
      
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
              <span className="hidden md:inline-flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-400"><Command size={10} /> K 快速记录</span>
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
                      <h2 className="text-3xl font-bold mb-2">早安，探索者</h2>
                      <p className="text-indigo-100 mb-8 opacity-80">今天是你记录生活的第 {Math.ceil((Date.now() - 1704067200000)/86400000)} 天</p>
                      <button onClick={() => setIsQuickCaptureOpen(true)} className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg flex items-center gap-2"><Plus size={18}/> 记点什么</button>
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
                   <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider mb-4"><Calendar size={14}/> 今日任务</div>
                   <div className="space-y-2">
                      {[...todayTasks, ...completedToday].map(item => {
                        const isDone = item.fields["状态"] === '已完成';
                        return (
                          <div key={item.id} onClick={() => setEditingItem(item)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isDone ? 'bg-slate-900 border-slate-800 opacity-50' : 'bg-slate-800 border-slate-700 hover:border-indigo-500/50'} cursor-pointer group`}>
                             <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(item.id, isDone ? '待办' : '已完成'); }} className={`w-5 h-5 rounded flex items-center justify-center transition-all ${isDone ? 'bg-emerald-500 text-white' : 'border-2 border-slate-500 hover:border-emerald-500'}`}>
                                {isDone && <Check size={12} />}
                             </button>
                             <span className={`text-sm ${isDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.fields["标题"]}</span>
                          </div>
                        );
                      })}
                      {todayTasks.length + completedToday.length === 0 && <div className="text-slate-600 text-sm text-center py-8">今日无待办任务</div>}
                   </div>
                </div>

                <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                   <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider mb-4"><Clock size={14}/> 最近动态</div>
                   <div className="space-y-3">
                      {[...journalItems, ...knowledgeItems].slice(0, 3).map(item => (
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
                   </div>
                </div>
             </div>
          )}

          {/* VIEW: INBOX */}
          {activeTab === 'inbox' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 border-b border-slate-800" ref={inputRef}>
                <form onSubmit={handleInboxAdd} className={`relative transition-all duration-300 ${inputExpanded ? 'pb-2' : ''}`}>
                    <input type="text" value={quickInput} onFocus={() => setInputExpanded(true)} onChange={(e) => setQuickInput(e.target.value)} placeholder="快速捕获想法..." className={`w-full pl-4 pr-12 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder-slate-600 ${inputExpanded ? 'bg-slate-900' : ''}`} />
                    {inputExpanded && (<div className="mt-3 space-y-3 animate-fade-in"><textarea className="w-full text-sm bg-slate-800/50 border border-slate-700 p-3 rounded-lg resize-none h-20 text-slate-300 placeholder-slate-600" placeholder="添加备注..." value={desktopDetails.note} onChange={e => setDesktopDetails({...desktopDetails, note: e.target.value})} /><div className="flex gap-2 items-center flex-wrap"><select className="bg-slate-800 border border-slate-700 text-xs text-slate-300 px-2 py-1.5 rounded-lg" value={desktopDetails.direction} onChange={e => setDesktopDetails({...desktopDetails, direction: e.target.value})}>{directions.map(d => <option key={d} value={d}>{d}</option>)}</select><select className="bg-slate-800 border border-slate-700 text-xs text-slate-300 px-2 py-1.5 rounded-lg" value={desktopDetails.infoSource} onChange={e => setDesktopDetails({...desktopDetails, infoSource: e.target.value})}>{sources.map(s => <option key={s} value={s}>{s}</option>)}</select></div><div className="flex flex-wrap gap-2">{actions.map(action => (<button key={action} type="button" onClick={() => toggleAction(action)} className={`px-2 py-1 rounded border text-[10px] flex items-center gap-1 transition-colors ${desktopDetails.nextActions.includes(action) ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}`}>{desktopDetails.nextActions.includes(action) && <Check size={8} />} {action}</button>))}</div><div className="flex justify-between items-center pt-2"><button type="submit" disabled={!quickInput.trim() || isQuickAdding} className="bg-indigo-600 text-white px-6 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors">{isQuickAdding ? '保存中...' : '保存'}</button></div></div>)}
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
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700">{item.fields["信息来源"]}</span>
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

          {/* VIEW: PLANNER */}
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

          {/* VIEW: KNOWLEDGE */}
          {activeTab === 'knowledge' && (
             <div className="space-y-4">
                <div className="relative">
                   <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                   <input type="text" placeholder="搜索笔记..." className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 text-sm text-white focus:border-indigo-500 outline-none" value={searchText} onChange={e => setSearchText(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {knowledgeItems.filter(i => i.fields["标题"].includes(searchText)).map(item => (
                    <div key={item.id} onClick={() => setEditingItem(item)} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-emerald-500/30 transition-all h-48 flex flex-col group cursor-pointer">
                      <div className="flex items-center gap-2 mb-3 text-emerald-400 text-xs font-bold uppercase tracking-wider"><BookOpen size={14} /> {item.fields["分类"] || "Note"}</div>
                      <h3 className="text-lg font-bold text-slate-200 mb-2 line-clamp-1">{item.fields["标题"]}</h3>
                      <p className="text-sm text-slate-500 line-clamp-3 flex-1">{item.fields["内容"]}</p>
                      <div className="pt-4 mt-2 border-t border-slate-800 flex gap-2">{item.fields["标签"]?.map(tag => (<span key={tag} className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">#{tag}</span>))}</div>
                    </div>
                  ))}
                </div>
             </div>
          )}

          {/* VIEW: JOURNAL */}
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
        <MobileView onSettings={() => setIsConfiguring(true)} notify={notify} />
      ) : (
        <DesktopView onLogout={handleLogout} onSettings={() => setIsConfiguring(true)} notify={notify} isDemoMode={isDemoMode} onGoHome={() => setShowWelcome(true)} />
      )}
    </>
  );
}
