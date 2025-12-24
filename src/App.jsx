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
  User, Mail, MessageCircle, Globe, Loader2, Info, AlertCircle, Check, FileText
} from 'lucide-react';

/**
 * --- UI COMPONENTS (Toast & Modal) ---
 */
const Toast = ({ message, type, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  const bgColors = { success: 'bg-slate-900 text-white', error: 'bg-red-500 text-white', info: 'bg-blue-500 text-white' };
  const icons = { success: <CheckCircle size={18} />, error: <AlertCircle size={18} />, info: <Info size={18} /> };
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl transition-all animate-fade-in-down ${bgColors[type] || bgColors.info}`}>
      {icons[type]}<span className="text-sm font-medium">{message}</span>
    </div>
  );
};

const Dialog = ({ isOpen, title, children, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

/**
 * --- BRANDING COMPONENT ---
 */
const Logo = ({ className = "w-8 h-8", textSize = "text-xl" }) => (
  <div className="flex items-center gap-2.5">
    <div className={`${className} bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200`}>
      <Zap size={20} fill="currentColor" className="drop-shadow-sm" />
    </div>
    <span className={`font-bold ${textSize} tracking-tight text-slate-800`}>
      Life<span className="text-indigo-600">OS</span>
    </span>
  </div>
);

/**
 * --- FEISHU SERVICE (Core Logic) ---
 */
class FeishuService {
  constructor() {
    this.STORAGE_KEY = 'lifeos_feishu_config';
    this.API_BASE = '/api/feishu'; 
  }

  getConfig() { const data = localStorage.getItem(this.STORAGE_KEY); return data ? JSON.parse(data) : null; }
  saveConfig(config) { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config)); }
  clearConfig() { localStorage.removeItem(this.STORAGE_KEY); }

  async request(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const response = await fetch(`${this.API_BASE}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : null });
      if (!response.ok) { const txt = await response.text(); throw new Error(`Network Error: ${response.status} ${txt}`); }
      const result = await response.json();
      if (result.code !== 0) throw new Error(`Feishu API Error [${result.code}]: ${result.msg}`);
      return result.data;
    } catch (error) { console.error("API Request Failed:", error); throw error; }
  }

  async getTenantAccessToken(appId, appSecret) {
    const data = await this.request('/auth/v3/tenant_access_token/internal', 'POST', { "app_id": appId, "app_secret": appSecret });
    return data.tenant_access_token;
  }

  async fetchRecords() {
    const config = this.getConfig(); if (!config) throw new Error("配置缺失");
    const token = await this.getTenantAccessToken(config.appId, config.appSecret);
    const data = await this.request(`/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records?page_size=100`, 'GET', null, token);
    return data.items || [];
  }

  async addRecord(data) {
    const config = this.getConfig(); if (!config) throw new Error("配置缺失");
    const token = await this.getTenantAccessToken(config.appId, config.appSecret);
    
    // [UPDATED] 智能标题生成逻辑
    // 用户输入的 data.title 实际上是完整内容
    // 我们取第一行作为“标题”，如果太长则截断
    const rawInput = data.title || "";
    const firstLine = rawInput.split('\n')[0];
    const smartTitle = firstLine.length > 40 ? firstLine.substring(0, 40) + "..." : firstLine;
    
    // 合并内容：如果有备注，拼接到原始内容后面
    const fullContent = rawInput + (data.content ? `\n\n【备注】\n${data.content}` : "");

    const fields = {
      "标题": smartTitle || "无标题记录", // 飞书主键
      "内容": fullContent, // 完整记录
      "来源": data.source || "PC",
      "状态": data.status || "Inbox", 
      "分类": data.category || "Inbox", 
      "类型": data.type || "Idea",
      "创建时间": Date.now() 
    };
    if (data.dueDate) fields["截止日期"] = new Date(data.dueDate).getTime();
    if (data.tags && data.tags.length > 0) fields["标签"] = data.tags;
    
    return await this.request(`/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records`, 'POST', { fields }, token);
  }

  async updateRecord(recordId, updates) {
    const config = this.getConfig(); if (!config) throw new Error("配置缺失");
    const token = await this.getTenantAccessToken(config.appId, config.appSecret);
    const fields = {};
    if (updates.Status) fields["状态"] = updates.Status;
    return await this.request(`/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records/${recordId}`, 'PUT', { fields }, token);
  }

  async createTable(appId, appSecret, appToken) {
    console.log("🚀 开始自动创建飞书表格...");
    const token = await this.getTenantAccessToken(appId, appSecret);
    const tableRes = await this.request(`/bitable/v1/apps/${appToken}/tables`, 'POST', { table: { name: "LifeOS数据表" } }, token);
    const tableId = tableRes.table_id;
    const fieldsRes = await this.request(`/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, 'GET', null, token);
    const primaryFieldId = fieldsRes.items[0].field_id;
    await this.request(`/bitable/v1/apps/${appToken}/tables/${tableId}/fields/${primaryFieldId}`, 'PUT', { field_name: "标题" }, token);
    const fieldsToCreate = [
      { field_name: "内容", type: 1 },
      { field_name: "状态", type: 3, property: { options: [{ name: "Inbox" }, { name: "Todo" }, { name: "Doing" }, { name: "Done" }] } },
      { field_name: "来源", type: 3, property: { options: [{ name: "Mobile" }, { name: "PC" }] } },
      { field_name: "分类", type: 3, property: { options: [{ name: "Inbox" }, { name: "Work" }, { name: "Life" }, { name: "Idea" }, { name: "Reading" }] } },
      { field_name: "标签", type: 4 },
      { field_name: "类型", type: 3, property: { options: [{ name: "Idea" }, { name: "Task" }] } },
      { field_name: "截止日期", type: 5 },
      { field_name: "创建时间", type: 2 } 
    ];
    for (const field of fieldsToCreate) { await this.request(`/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, 'POST', field, token); }
    return tableId;
  }
}

const feishuService = new FeishuService();

/**
 * --- COMPONENT: WELCOME SCREEN ---
 */
const WelcomeScreen = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-700">
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <Logo />
        <button onClick={onStart} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 hover:text-indigo-600 transition-all">登录 / 设置</button>
      </nav>
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-20 text-center animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-6 border border-indigo-100">v1.0 Public Beta</div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-tight">掌控你的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">数字人生</span></h1>
        <p className="text-xl md:text-2xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">一个基于飞书多维表格构建的个人操作系统。<br/><span className="text-slate-800 font-medium">极速录入想法，深度管理任务，数据完全私有。</span></p>
        <button onClick={onStart} className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-slate-900 font-lg rounded-full hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600">开始构建你的 LifeOS <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" /></button>
      </div>
      <div className="bg-slate-50 py-24 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard icon={<Smartphone size={24} />} color="bg-blue-100 text-blue-600" title="移动端极速捕获" desc="专为手机设计的输入界面。" />
            <FeatureCard icon={<Shield size={24} />} color="bg-emerald-100 text-emerald-600" title="数据隐私优先" desc="BYOK 架构。我们不存储你的数据，所有内容直接存入飞书。" />
            <FeatureCard icon={<Activity size={24} />} color="bg-purple-100 text-purple-600" title="GTD 工作流" desc="内置 Inbox 收集、任务分类、专注模式。" />
          </div>
        </div>
      </div>
      <footer className="bg-white border-t border-slate-100 text-slate-400 py-12 text-center text-sm">
        <Logo className="w-6 h-6 mx-auto mb-6" textSize="text-lg" />
        <div className="max-w-2xl mx-auto px-4"><div className="flex flex-wrap justify-center gap-6 text-slate-500 font-medium mb-8"><div className="flex items-center gap-2"><User size={14} /><span>作者：小鲸</span></div><div className="flex items-center gap-2"><Mail size={14} /><span>1584897236@qq.com</span></div><div className="flex items-center gap-2"><MessageCircle size={14} /><span>微信：zhaoqi3210</span></div><a href="https://www.xiaojingfy.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-indigo-600 transition-colors"><Globe size={14} /><span>www.xiaojingfy.com</span></a></div><div className="h-px bg-slate-100 w-full mb-8"></div><div className="flex justify-center gap-4 text-xs opacity-70 mb-4"><span>Privacy First</span><span>•</span><span>Local Data</span><span>•</span><span>Open Source</span></div><p className="opacity-50 text-xs">© 2025 LifeOS. Designed for productivity.</p></div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, color, title, desc }) => (<div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-50 hover:-translate-y-1 transition-all duration-300"><div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-6`}>{icon}</div><h3 className="text-xl font-bold mb-3 text-slate-800">{title}</h3><p className="text-slate-500 leading-relaxed text-sm">{desc}</p></div>);

/**
 * --- COMPONENT: SETTINGS SCREEN ---
 */
const SettingsScreen = ({ onSave, onCancel, initialConfig, notify }) => {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 animate-fade-in overflow-y-auto">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 my-8">
        <div className="flex items-center gap-3 mb-6"><Logo /></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4"><div className="group relative"><label className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase mb-1">App ID</label><input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="cli_..." value={formData.appId} onChange={e => setFormData({...formData, appId: e.target.value})} /></div><div className="group relative"><label className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase mb-1">App Secret</label><input required type="password" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="******" value={formData.appSecret} onChange={e => setFormData({...formData, appSecret: e.target.value})} /></div></div>
          <div className="group relative"><label className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase mb-1">App Token (Base ID)</label><input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="bascn..." value={formData.appToken} onChange={e => setFormData({...formData, appToken: e.target.value})} /></div>
          <div className="pt-2 border-t border-slate-100 mt-4">
             <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Table ID (数据表 ID)</label>
             <div className="flex gap-2"><input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="tbl..." value={formData.tableId} onChange={e => setFormData({...formData, tableId: e.target.value})} /><button type="button" onClick={handleAutoCreateTable} disabled={isCreatingTable || !formData.appToken} className={`whitespace-nowrap px-4 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${!formData.appToken ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>{isCreatingTable ? <><Loader2 className="animate-spin" size={16} /> 创建中</> : <>✨ 一键新建表</>}</button></div>
          </div>
          <FieldGuide />
          <button type="submit" className="w-full mt-6 bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-200">保存并连接</button>
          {initialConfig ? (<button type="button" onClick={onCancel} className="w-full bg-transparent text-slate-500 font-medium py-2 px-4 hover:text-slate-700 transition-colors">取消</button>) : (<button type="button" onClick={onCancel} className="w-full bg-transparent text-slate-400 text-sm mt-2 hover:text-slate-600">返回首页</button>)}
        </form>
      </div>
    </div>
  );
};

const FieldGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mt-2 mb-6 border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-3 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"><div className="flex items-center gap-2"><Table size={16} className="text-indigo-500" /><span>查看字段映射逻辑</span></div>{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
      {isOpen && (
        <div className="p-4 bg-white border-t border-slate-200 text-xs text-slate-500 animate-fade-in">
           <p className="mb-3 text-slate-400">系统会自动将您的输入内容智能映射到飞书字段：</p>
           <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100"><span className="text-slate-500">输入框全部内容</span> <ArrowRight size={12} className="text-slate-300"/> <span className="font-bold text-slate-800">飞书「内容」列</span></div>
              <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100"><span className="text-slate-500">第一行文字 (自动截取)</span> <ArrowRight size={12} className="text-slate-300"/> <span className="font-bold text-slate-800">飞书「标题」列</span></div>
           </div>
        </div>
      )}
    </div>
  );
};

/**
 * --- COMPONENT: MOBILE VIEW ---
 */
const MobileView = ({ onLogout, notify }) => {
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [recentInputs, setRecentInputs] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState({ category: "Inbox", type: "Idea", dueDate: "", note: "" });
  const categories = ["Inbox 📥", "Work 💼", "Life 🏠", "Idea 💡", "Reading 📖"];

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    setIsSending(true);
    try {
      await feishuService.addRecord({ title: inputValue, content: details.note, source: "Mobile", category: details.category.split(" ")[0], type: details.type, dueDate: details.type === 'Task' ? details.dueDate : null, tags: [], status: "Inbox" });
      const newRecord = { id: Date.now(), text: inputValue, tag: details.category, time: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}) };
      setRecentInputs(prev => [newRecord, ...prev].slice(0, 3));
      setInputValue(""); setDetails({ category: "Inbox", type: "Idea", dueDate: "", note: "" }); setShowDetails(false);
      notify("已记录", "success");
    } catch (error) { notify("发送失败: " + error.message, "error"); } finally { setIsSending(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="px-6 pt-12 pb-4 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10"><Logo className="w-6 h-6" textSize="text-lg" /><button onClick={onLogout} className="p-2 text-slate-400 hover:text-slate-600"><Settings size={20} /></button></div>
      <div className="flex-1 overflow-y-auto px-4 pb-48">
        <div className="mt-8"><h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-2">最近录入</h2><div className="space-y-3">{recentInputs.length === 0 && <div className="text-center py-10 text-slate-300 text-sm">还没有记录，开始输入吧...</div>}{recentInputs.map(item => (<div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-start animate-fade-in-up"><div><div className="text-slate-800 font-medium line-clamp-2">{item.text}</div><div className="flex items-center gap-2 mt-2">{item.tag && <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-bold">{item.tag}</span>}<span className="text-[10px] text-slate-400">{item.time}</span></div></div><div className="text-emerald-500"><CheckCircle size={16} /></div></div>))}</div></div>
      </div>
      <div className={`fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 pb-safe-area shadow-[0_-4px_20px_rgba(0,0,0,0.05)] transition-all duration-300 ${showDetails ? 'rounded-t-3xl' : ''}`}>
        <div className="p-4">
          {showDetails && (
            <div className="mb-4 space-y-4 animate-fade-in">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{categories.map(cat => (<button key={cat} onClick={() => setDetails({...details, category: cat})} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all ${details.category === cat ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-500'}`}>{cat}</button>))}</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-1 rounded-lg flex text-xs font-medium text-slate-500 relative"><div className={`absolute top-1 bottom-1 w-1/2 bg-white rounded shadow-sm transition-all duration-300 ${details.type === 'Task' ? 'left-1/2' : 'left-0'}`} /><button onClick={() => setDetails({...details, type: 'Idea'})} className={`flex-1 flex items-center justify-center gap-1 z-10 transition-colors ${details.type === 'Idea' ? 'text-indigo-600' : ''}`}><Lightbulb size={14} /> 想法</button><button onClick={() => setDetails({...details, type: 'Task'})} className={`flex-1 flex items-center justify-center gap-1 z-10 transition-colors ${details.type === 'Task' ? 'text-indigo-600' : ''}`}><CheckSquare size={14} /> 任务</button></div>
                {details.type === 'Task' && (<input type="date" value={details.dueDate} onChange={(e) => setDetails({...details, dueDate: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-600 focus:outline-none focus:border-indigo-500" />)}
              </div>
              <textarea value={details.note} onChange={(e) => setDetails({...details, note: e.target.value})} placeholder="添加额外备注 (可选)..." className="w-full bg-slate-50 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-20" />
            </div>
          )}
          <div className="relative flex items-end gap-2"><button onClick={() => setShowDetails(!showDetails)} className={`mb-1 p-2 rounded-xl transition-colors ${showDetails ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 hover:text-indigo-600'}`}><MoreHorizontal size={24} /></button><textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={details.type === 'Task' ? "要做什么？" : "记录你的想法..."} className="flex-1 bg-slate-50 rounded-2xl p-4 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none h-14 max-h-32" rows={1} style={{ minHeight: '3.5rem' }} /><button onClick={handleSend} disabled={!inputValue.trim() || isSending} className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${!inputValue.trim() ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95'}`}>{isSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={24} />}</button></div>
        </div>
      </div>
    </div>
  );
};

/**
 * --- COMPONENT: PC VIEW (DASHBOARD) ---
 */
const DesktopView = ({ onLogout, notify }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inboxItems, setInboxItems] = useState([]);
  const [taskItems, setTaskItems] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [focusTask, setFocusTask] = useState("点击编辑今日聚焦");
  const [isEditingFocus, setIsEditingFocus] = useState(false);
  const [showFocusOverlay, setShowFocusOverlay] = useState(false);
  const [quickLinks, setQuickLinks] = useState([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [quickInput, setQuickInput] = useState("");
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(false);
  const [desktopDetails, setDesktopDetails] = useState({ category: "Inbox", type: "Idea", dueDate: "", note: "" });
  const inputRef = useRef(null);
  const [taskInput, setTaskInput] = useState("");

  useEffect(() => {
    loadData();
    const savedLinks = localStorage.getItem('lifeos_quick_links');
    if (savedLinks) setQuickLinks(JSON.parse(savedLinks));
    const savedFocus = localStorage.getItem('lifeos_focus_task');
    if (savedFocus) setFocusTask(savedFocus);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => { if (inputRef.current && !inputRef.current.contains(event.target)) { if (!quickInput.trim()) { setInputExpanded(false); } } };
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [quickInput]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await feishuService.fetchRecords();
      setInboxItems(data.filter(item => item.fields["状态"] === 'Inbox'));
      setTaskItems(data.filter(item => ['Todo', 'Doing'].includes(item.fields["状态"])));
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleInboxAdd = async (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    setIsQuickAdding(true);
    try {
      await feishuService.addRecord({ title: quickInput, content: desktopDetails.note, source: "PC", category: desktopDetails.category, type: desktopDetails.type, dueDate: desktopDetails.type === 'Task' ? desktopDetails.dueDate : null, status: "Inbox" });
      setInboxItems(prev => [{ id: "temp_" + Date.now(), fields: { "标题": quickInput.split('\n')[0], "状态": "Inbox", "分类": desktopDetails.category, "类型": desktopDetails.type, "创建时间": Date.now() } }, ...prev]);
      setQuickInput(""); setDesktopDetails({ category: "Inbox", type: "Idea", dueDate: "", note: "" }); setInputExpanded(false);
      notify("已记录", "success");
    } catch (err) { notify("添加失败: " + err.message, "error"); } finally { setIsQuickAdding(false); }
  };

  const handleTaskAdd = async (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;
    const tempId = "temp_task_" + Date.now();
    setTaskItems(prev => [...prev, { id: tempId, fields: { "标题": taskInput, "状态": "Todo", "分类": "Task", "创建时间": Date.now() } }]);
    setTaskInput("");
    try { await feishuService.addRecord({ title: taskInput, content: "", source: "PC", category: "Task", type: "Task", status: "Todo" }); notify("任务已创建", "success"); } 
    catch (err) { notify("添加任务失败: " + err.message, "error"); }
  };

  const handleMoveToTask = async (id, status) => {
    const item = inboxItems.find(i => i.id === id); if (!item) return;
    setInboxItems(prev => prev.filter(i => i.id !== id)); setTaskItems(prev => [{...item, fields: {...item.fields, "状态": status}}, ...prev]);
    await feishuService.updateRecord(id, { Status: status });
    notify("已移动到任务列表", "info");
  };

  const handleTaskComplete = async (id) => {
    setTaskItems(prev => prev.filter(i => i.id !== id));
    await feishuService.updateRecord(id, { Status: "Done" });
    notify("任务完成，干得好！", "success");
  };

  const handleSaveLink = () => {
    if (!newLink.title || !newLink.url) { notify("请填写完整信息", "error"); return; }
    const updated = [...quickLinks, newLink];
    setQuickLinks(updated);
    localStorage.setItem('lifeos_quick_links', JSON.stringify(updated));
    setShowLinkModal(false);
    setNewLink({ title: '', url: '' });
    notify("快捷入口已添加", "success");
  };

  const handleRemoveLink = (idx) => { if(confirm("删除?")) { const nl = quickLinks.filter((_, i) => i !== idx); setQuickLinks(nl); localStorage.setItem('lifeos_quick_links', JSON.stringify(nl)); } };
  const saveFocusTask = (val) => { setFocusTask(val); localStorage.setItem('lifeos_focus_task', val); setIsEditingFocus(false); };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {showFocusOverlay && <FocusModeOverlay task={focusTask} onClose={() => setShowFocusOverlay(false)} />}
      <Dialog isOpen={showLinkModal} title="添加快捷入口" onClose={() => setShowLinkModal(false)}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">名称</label><input type="text" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="例如: Github" value={newLink.title} onChange={e => setNewLink({...newLink, title: e.target.value})} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">URL 链接</label><input type="text" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="https://..." value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})} /></div>
          <button onClick={handleSaveLink} className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors">保存</button>
        </div>
      </Dialog>
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col"><div className="p-6 flex items-center gap-3"><Logo className="w-6 h-6" textSize="text-lg" /></div><nav className="flex-1 px-4 py-4 space-y-1"><NavItem icon={<LayoutDashboard size={20} />} label="仪表盘" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} /><NavItem icon={<Inbox size={20} />} label="收件箱" count={inboxItems.length} active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} /></nav><div className="p-4 border-t border-slate-100"><button onClick={onLogout} className="flex items-center gap-3 text-slate-500 hover:text-slate-800 transition-colors px-4 py-2 w-full"><LogOut size={18} /><span className="text-sm font-medium">退出连接</span></button></div></aside>
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10"><h2 className="text-xl font-bold text-slate-800">{activeTab === 'dashboard' ? '早安，探索者' : '收件箱清理'}</h2><div className="flex items-center gap-4"><span className="text-sm text-slate-500">{new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric'})}</span><div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">ME</div></div></header>
        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' ? (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-3 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-64 flex flex-col justify-between hover:shadow-md transition-shadow group relative"><div><h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">今日聚焦</h3>{isEditingFocus ? <textarea autoFocus className="w-full h-24 text-2xl font-bold text-slate-800 leading-tight resize-none focus:outline-none bg-slate-50 rounded p-2" value={focusTask} onChange={e => setFocusTask(e.target.value)} onBlur={() => saveFocusTask(focusTask)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); saveFocusTask(focusTask); }}} /> : <div onClick={() => setIsEditingFocus(true)} className="text-2xl font-bold text-slate-800 leading-tight cursor-text hover:bg-slate-50 rounded -ml-2 p-2 transition-colors">{focusTask}</div>}</div><button onClick={() => setShowFocusOverlay(true)} className="flex items-center gap-2 text-indigo-600 text-sm font-medium cursor-pointer hover:underline">开始专注 <Maximize2 size={16} /></button></div>
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white"><div className="flex items-center justify-between mb-4 opacity-80"><div className="flex items-center gap-2"><Clock size={18} /><span className="text-sm font-medium">快捷入口</span></div><button onClick={() => setShowLinkModal(true)} className="hover:bg-white/20 p-1 rounded transition-colors"><Plus size={16} /></button></div><div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">{quickLinks.length === 0 && <div className="text-xs opacity-50 italic">暂无链接，点击右上角添加</div>}{quickLinks.map((link, idx) => (<div key={idx} className="group flex items-center gap-2"><a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 block py-2 px-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm truncate">{link.title}</a><button onClick={() => handleRemoveLink(idx)} className="text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button></div>))}</div></div>
              </div>
              <div className="col-span-12 md:col-span-5">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
                  <div className="p-6 border-b border-slate-50" ref={inputRef}><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg flex items-center gap-2"><Inbox size={20} className="text-slate-400" /> Inbox</h3><button onClick={loadData} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded"><Zap size={16} /></button></div>
                    <form onSubmit={handleInboxAdd} className={`relative transition-all duration-300 ${inputExpanded ? 'bg-white shadow-lg ring-1 ring-slate-100 p-1 -m-1 rounded-xl z-10' : ''}`}>
                      <input type="text" value={quickInput} onFocus={() => setInputExpanded(true)} onChange={(e) => setQuickInput(e.target.value)} placeholder="快速收集想法..." className={`w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all ${inputExpanded ? 'bg-white border-transparent' : ''}`} />
                      {inputExpanded && (<div className="px-1 pb-1 pt-2 animate-fade-in"><textarea className="w-full text-sm bg-slate-50 p-2 rounded-lg mb-2 focus:outline-none resize-none h-16" placeholder="添加备注/计划..." value={desktopDetails.note} onChange={e => setDesktopDetails({...desktopDetails, note: e.target.value})} /><div className="flex flex-wrap items-center gap-2 justify-between"><div className="flex items-center gap-2"><select value={desktopDetails.category} onChange={e => setDesktopDetails({...desktopDetails, category: e.target.value})} className="text-xs bg-slate-100 border-none rounded-lg py-1.5 pl-2 pr-6 focus:ring-0 cursor-pointer hover:bg-slate-200 transition-colors"><option value="Inbox">📥 Inbox</option><option value="Work">💼 Work</option><option value="Life">🏠 Life</option><option value="Idea">💡 Idea</option></select><div className="bg-slate-100 rounded-lg p-1 flex text-xs"><button type="button" onClick={() => setDesktopDetails({...desktopDetails, type: 'Idea'})} className={`px-2 py-0.5 rounded ${desktopDetails.type === 'Idea' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>想法</button><button type="button" onClick={() => setDesktopDetails({...desktopDetails, type: 'Task'})} className={`px-2 py-0.5 rounded ${desktopDetails.type === 'Task' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>任务</button></div>{desktopDetails.type === 'Task' && (<div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1 text-xs"><CalendarClock size={12} className="text-slate-400" /><input type="date" className="bg-transparent border-none p-0 focus:ring-0 text-slate-600" value={desktopDetails.dueDate} onChange={e => setDesktopDetails({...desktopDetails, dueDate: e.target.value})} /></div>)}</div><button type="submit" disabled={!quickInput.trim() || isQuickAdding} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">{isQuickAdding ? '保存中...' : '保存'}</button></div></div>)}
                      {!inputExpanded && (<button type="submit" disabled={!quickInput.trim() || isQuickAdding} className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 transition-colors"><ArrowRight size={16} /></button>)}
                    </form>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto max-h-[600px]"><div className="space-y-3">{inboxItems.map(item => (<div key={item.id} className="group p-4 bg-slate-50 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all"><div className="flex justify-between items-start"><div><div className="font-medium text-slate-800 mb-1">{item.fields["标题"]}</div><div className="flex gap-2 mt-1"><span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">{item.fields["分类"]}</span>{item.fields["类型"] === 'Task' && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-1"><CheckSquare size={10} /> 任务</span>}</div></div></div><div className="flex items-center justify-between mt-2"><div className="text-xs text-slate-400 flex items-center gap-2">{new Date(item.fields["创建时间"]).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})}{item.fields["截止日期"] && <span className="text-orange-400 flex items-center gap-1"><Calendar size={10} /> {new Date(item.fields["截止日期"]).toLocaleDateString()}</span>}</div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleMoveToTask(item.id, 'Todo')} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors">转任务</button></div></div></div>))}{inboxItems.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Inbox 清空了，太棒了！</div>}</div></div>
                </div>
              </div>
              <div className="col-span-12 md:col-span-4">
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center"><h3 className="font-bold text-lg flex items-center gap-2"><CheckSquare size={20} className="text-emerald-500" /> 我的任务</h3><span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">{taskItems.length}</span></div>
                    <div className="flex-1 p-4 overflow-y-auto max-h-[500px]"><div className="space-y-2">{taskItems.map(item => (<div key={item.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg group transition-colors"><button onClick={() => handleTaskComplete(item.id)} className="w-5 h-5 rounded border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 flex items-center justify-center transition-all text-transparent hover:text-emerald-500"><CheckCircle size={14} /></button><div className="flex-1"><div className={`text-sm font-medium ${item.fields["状态"] === 'Doing' ? 'text-indigo-600' : 'text-slate-700'}`}>{item.fields["标题"]}</div>{item.fields["截止日期"] && <div className="text-[10px] text-orange-500 flex items-center gap-1 mt-0.5"><CalendarClock size={10} /> {new Date(item.fields["截止日期"]).toLocaleDateString()} 截止</div>}</div></div>))}{taskItems.length === 0 && <div className="text-center py-8 text-slate-300 text-sm">没有待办任务，休息一下？</div>}</div></div>
                    <div className="p-4 border-t border-slate-50 bg-slate-50/50"><form onSubmit={handleTaskAdd} className="flex gap-2"><input type="text" value={taskInput} onChange={e => setTaskInput(e.target.value)} placeholder="+ 新建任务" className="flex-1 bg-transparent border-none text-sm focus:ring-0 placeholder-slate-400" /><button type="submit" disabled={!taskInput.trim()} className="text-slate-400 hover:text-indigo-600 disabled:opacity-50"><Plus size={18} /></button></form></div>
                 </div>
              </div>
            </div>
          ) : (<div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 min-h-[500px] flex items-center justify-center text-slate-400">列表视图开发中...</div>)}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, count, onClick }) => (<button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mb-1 ${active ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}><div className="flex items-center gap-3">{icon}<span>{label}</span></div>{count > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-200 text-slate-600'}`}>{count}</span>}</button>);

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
  const handleLogout = () => { if (confirm("确定要断开与飞书的连接并清除本地密钥吗？")) { feishuService.clearConfig(); setConfig(null); setShowWelcome(true); setIsConfiguring(false); } };
  const handleOpenSettings = () => setIsConfiguring(true);

  return (
    <>
      {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {showWelcome && !isConfiguring ? (<WelcomeScreen onStart={() => { setShowWelcome(false); setIsConfiguring(true); }} />) : isConfiguring ? (<SettingsScreen onSave={handleSaveConfig} notify={notify} onCancel={() => { if (config) { setIsConfiguring(false); } else { setIsConfiguring(false); setShowWelcome(true); } }} initialConfig={config} />) : isMobile ? (<MobileView onLogout={handleOpenSettings} notify={notify} />) : (<DesktopView onLogout={handleOpenSettings} notify={notify} />)}
    </>
  );
}
