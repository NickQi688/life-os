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
  User, Mail, MessageCircle, Globe
} from 'lucide-react';

/**
 * --- BRANDING COMPONENT ---
 * LifeOS Logo
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
 * 负责处理 API 通信和本地配置存储
 * [UPDATED] 已修改为真实 API 调用模式
 */
class FeishuService {
  constructor() {
    this.STORAGE_KEY = 'lifeos_feishu_config';
    // 这里的 /api/feishu 对应 vercel.json 中的 rewrite 规则
    // 本地开发时，需要在 vite.config.js 中配置 proxy，或者直接部署到 Vercel 测试
    this.API_BASE = '/api/feishu'; 
  }

  // 从 LocalStorage 获取配置
  getConfig() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  // 保存配置
  saveConfig(config) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  }

  // 清除配置
  clearConfig() {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // 通用请求方法 (Handle Fetch & Errors)
  async request(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(`${this.API_BASE}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Network Error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      // 飞书 API 错误码处理 (0 代表成功)
      if (result.code !== 0) {
        throw new Error(`Feishu API Error [${result.code}]: ${result.msg}`);
      }

      return result.data;
    } catch (error) {
      console.error("API Request Failed:", error);
      throw error;
    }
  }

  // 1. 获取 Tenant Access Token (企业自建应用凭证)
  async getTenantAccessToken(appId, appSecret) {
    // 对应飞书接口: POST /open-apis/auth/v3/tenant_access_token/internal
    const data = await this.request('/auth/v3/tenant_access_token/internal', 'POST', {
      "app_id": appId,
      "app_secret": appSecret
    });
    return data.tenant_access_token;
  }

  // 2. 获取记录 (Fetch Records)
  async fetchRecords() {
    const config = this.getConfig();
    if (!config) throw new Error("配置缺失");

    // 第一步：拿 Token
    const token = await this.getTenantAccessToken(config.appId, config.appSecret);

    // 第二步：查表
    // 对应飞书接口: GET /open-apis/bitable/v1/apps/:app_token/tables/:table_id/records
    const data = await this.request(
      `/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records?page_size=100`, // 这里只取前100条
      'GET',
      null,
      token
    );

    return data.items || []; // 飞书返回的数据结构 items 包含记录数组
  }

  // 3. 写入记录 (Add Record)
  async addRecord(data) {
    const config = this.getConfig();
    if (!config) throw new Error("配置缺失");

    const token = await this.getTenantAccessToken(config.appId, config.appSecret);

    // 构造符合飞书要求的 fields 对象
    const fields = {
      "Title": data.title,
      "Content": data.content || "",
      "Source": data.source || "PC",
      "Status": data.status || "Inbox",
      "Category": data.category || "Inbox",
      "Type": data.type || "Idea",
      "Created Time": Date.now() // 注意：飞书日期字段通常接受毫秒时间戳
    };

    if (data.dueDate) {
      // 飞书日期字段接受毫秒时间戳，这里假设 data.dueDate 是 YYYY-MM-DD 字符串
      fields["Due Date"] = new Date(data.dueDate).getTime();
    }
    
    // 如果有 Tags (多选)，飞书要求是字符串数组
    if (data.tags && data.tags.length > 0) {
        fields["Tags"] = data.tags;
    }

    // 对应飞书接口: POST /open-apis/bitable/v1/apps/:app_token/tables/:table_id/records
    return await this.request(
      `/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records`,
      'POST',
      { fields },
      token
    );
  }

  // 4. 更新记录 (Update Record)
  async updateRecord(recordId, fieldsToUpdate) {
    const config = this.getConfig();
    if (!config) throw new Error("配置缺失");

    const token = await this.getTenantAccessToken(config.appId, config.appSecret);

    // 对应飞书接口: PUT /open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/:record_id
    return await this.request(
      `/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records/${recordId}`,
      'PUT',
      { fields: fieldsToUpdate },
      token
    );
  }

  // 5. [模拟] 一键初始化表格 
  // (真实创建表格比较复杂，涉及到字段定义，这里为了稳定性暂时保留模拟，建议用户手动建表)
  async createTable(appToken) {
    console.log("🚀 自动建表功能在纯前端模式下受限，请在飞书手动创建表格。");
    // 这里依然返回模拟 ID，防止流程卡死，但会提示用户
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "请在飞书查看 Table ID"; 
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-6 border border-indigo-100">
          v1.0 Public Beta
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-tight">
          掌控你的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">数字人生</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          一个基于飞书多维表格构建的个人操作系统。<br/>
          <span className="text-slate-800 font-medium">极速录入想法，深度管理任务，数据完全私有。</span>
        </p>
        <button onClick={onStart} className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-slate-900 font-lg rounded-full hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600">
          开始构建你的 LifeOS <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
        <p className="mt-4 text-xs text-slate-400">无需注册账号，准备好飞书表格即可开始</p>
      </div>

      <div className="bg-slate-50 py-24 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard icon={<Smartphone size={24} />} color="bg-blue-100 text-blue-600" title="移动端极速捕获" desc="专为手机设计的输入界面。无论是在走路还是排队，1秒钟记录灵感，稍后再在电脑端深度整理。" />
            <FeatureCard icon={<Shield size={24} />} color="bg-emerald-100 text-emerald-600" title="数据隐私优先" desc="BYOK (Bring Your Own Key) 架构。我们不存储你的数据，所有内容直接存入你自己的飞书表格。" />
            <FeatureCard icon={<Activity size={24} />} color="bg-purple-100 text-purple-600" title="GTD 工作流" desc="内置 Inbox 收集、任务分类、专注模式。帮助你从混乱的想法中理清头绪，进入心流状态。" />
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="py-24">
        <div className="max-w-6xl mx-auto px-6">
           <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-800 mb-4">只需三步，即刻开启</h2>
              <p className="text-slate-500">连接飞书，无需复杂的服务器配置。</p>
           </div>
           
           <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -z-10 -translate-y-1/2"></div>
              <StepCard num="1" title="准备飞书表格" desc="在飞书新建表格，确保包含 Title, Status, Content 等基础字段。" >
                 <div className="w-20 h-16 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden mx-auto mb-4"><div className="h-4 bg-emerald-500/10 border-b border-emerald-100 flex items-center px-2 gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div><div className="h-1 w-8 bg-emerald-100 rounded-full"></div></div><div className="flex-1 grid grid-cols-3 gap-px bg-slate-100 p-px"><div className="bg-white"></div><div className="bg-white"></div><div className="bg-white"></div><div className="bg-white"></div><div className="bg-white"></div><div className="bg-white"></div></div></div>
              </StepCard>
              <StepCard num="2" title="获取 API 密钥" desc="复制浏览器地址栏的 Base ID。密钥仅保存在你的本地浏览器中。" >
                 <div className="w-20 h-16 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-center mx-auto mb-4 text-indigo-500 relative"><div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-400 rounded-full animate-ping"></div><Key size={24} /></div>
              </StepCard>
              <StepCard num="3" title="开始使用" desc="无需注册，立即进入 LifeOS。任何设备连接同一表格，数据实时同步。" >
                 <div className="w-20 h-16 bg-slate-900 rounded-lg shadow-lg flex items-center justify-center mx-auto mb-4 text-white"><Zap size={24} fill="currentColor" /></div>
              </StepCard>
           </div>
        </div>
      </div>

      <footer className="bg-white border-t border-slate-100 text-slate-400 py-12 text-center text-sm">
        <Logo className="w-6 h-6 mx-auto mb-6" textSize="text-lg" />
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 text-slate-500 font-medium mb-8">
            <div className="flex items-center gap-2"><User size={14} /><span>作者：小鲸</span></div>
            <div className="flex items-center gap-2"><Mail size={14} /><span>1584897236@qq.com</span></div>
            <div className="flex items-center gap-2"><MessageCircle size={14} /><span>微信：zhaoqi3210</span></div>
            <a href="https://www.xiaojingfy.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-indigo-600 transition-colors"><Globe size={14} /><span>www.xiaojingfy.com</span></a>
          </div>
          <div className="h-px bg-slate-100 w-full mb-8"></div>
          <div className="flex justify-center gap-4 text-xs opacity-70 mb-4"><span>Privacy First</span><span>•</span><span>Local Data</span><span>•</span><span>Open Source</span></div>
          <p className="opacity-50 text-xs">© 2025 LifeOS. Designed for productivity.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, color, title, desc }) => (
  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-50 hover:-translate-y-1 transition-all duration-300">
    <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-6`}>{icon}</div>
    <h3 className="text-xl font-bold mb-3 text-slate-800">{title}</h3>
    <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
  </div>
);

const StepCard = ({ num, title, desc, children }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center relative z-10 hover:border-indigo-200 transition-colors">
    <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm mx-auto -mt-10 mb-6 border-4 border-white shadow-sm">{num}</div>
    {children}
    <h3 className="text-lg font-bold mb-2 text-slate-800">{title}</h3>
    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
  </div>
);

/**
 * --- COMPONENT: FOCUS MODE OVERLAY ---
 */
const FocusModeOverlay = ({ task, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => { setTimeLeft(timeLeft => timeLeft - 1); }, 1000);
    } else if (timeLeft === 0) { setIsActive(false); alert("专注时间结束！休息一下吧。"); }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);
  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => { setIsActive(false); setTimeLeft(25 * 60); };
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  return (
    <div className="fixed inset-0 bg-slate-900/95 z-50 flex flex-col items-center justify-center text-white animate-fade-in">
      <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors"><X size={32} /></button>
      <div className="mb-8 text-center max-w-2xl px-4">
        <div className="text-indigo-400 text-sm font-bold uppercase tracking-widest mb-4">Current Focus</div>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">{task || "无特定任务"}</h1>
      </div>
      <div className="text-9xl font-mono font-bold tracking-tighter mb-12 tabular-nums">{formatTime(timeLeft)}</div>
      <div className="flex gap-6">
        <button onClick={toggleTimer} className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105">{isActive ? <><Pause fill="currentColor" /> 暂停</> : <><Play fill="currentColor" /> 开始专注</>}</button>
        <button onClick={resetTimer} className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"><RotateCcw size={24} /></button>
      </div>
    </div>
  );
};

/**
 * --- HELPER COMPONENT: Field Guide ---
 */
const FieldGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mt-2 mb-6 border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-3 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
        <div className="flex items-center gap-2"><Table size={16} className="text-indigo-500" /><span>查看必需的字段结构 (如果是手动建表)</span></div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && (
        <div className="p-4 bg-white border-t border-slate-200 text-xs text-slate-500 animate-fade-in">
           <p className="mb-3 text-slate-400">请确保你的飞书数据表中包含以下列名（区分大小写）：</p>
           <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 rounded border border-slate-100"><span className="font-bold text-slate-700">Title</span> (多行文本)</div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100"><span className="font-bold text-slate-700">Content</span> (多行文本)</div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100"><span className="font-bold text-slate-700">Status</span> (单选) <br/><span className="scale-90 opacity-70 block mt-1">Inbox, Todo, Doing, Done</span></div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100"><span className="font-bold text-slate-700">Source</span> (单选) <br/><span className="scale-90 opacity-70 block mt-1">Mobile, PC</span></div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100"><span className="font-bold text-slate-700">Category</span> (单选)</div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100"><span className="font-bold text-slate-700">Tags</span> (多选)</div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100"><span className="font-bold text-slate-700">Type</span> (单选) <br/><span className="scale-90 opacity-70 block mt-1">Idea, Task</span></div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100"><span className="font-bold text-slate-700">Due Date</span> (日期)</div>
           </div>
        </div>
      )}
    </div>
  );
};

/**
 * --- HELPER COMPONENT: Security Note ---
 */
const SecurityNote = () => (
  <div className="mt-8 bg-slate-50 p-5 rounded-2xl border border-slate-100">
    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><Shield size={16} className="text-emerald-500" /> 安全与使用贴士</h3>
    <div className="space-y-3 text-xs text-slate-500">
      <div className="flex gap-3"><Lock size={14} className="text-slate-400 shrink-0 mt-0.5" /><p><span className="font-semibold text-slate-600">数据存在哪？</span><br/>所有密钥仅存储在您的<span className="text-indigo-600 font-medium">本地浏览器 (LocalStorage)</span>，不会上传到任何第三方服务器。你的数据直连飞书。</p></div>
      <div className="flex gap-3"><RefreshCw size={14} className="text-slate-400 shrink-0 mt-0.5" /><p><span className="font-semibold text-slate-600">更换设备怎么办？</span><br/>因为是本地存储，更换手机或电脑后，需要<span className="text-indigo-600 font-medium">重新输入</span>一遍 App ID 和 Secret 才能连接上你的表格。建议将密钥保存在密码管理软件中。</p></div>
      <div className="flex gap-3"><AlertTriangle size={14} className="text-slate-400 shrink-0 mt-0.5" /><p><span className="font-semibold text-slate-600">权限问题</span><br/>请确保在飞书开发者后台，为你的应用开启了<span className="text-indigo-600 font-medium">“多维表格”</span>相关权限，并发布了版本。</p></div>
    </div>
  </div>
);

/**
 * --- COMPONENT: SETTINGS SCREEN ---
 */
const SettingsScreen = ({ onSave, onCancel, initialConfig }) => {
  const [formData, setFormData] = useState({ appId: initialConfig?.appId || '', appSecret: initialConfig?.appSecret || '', appToken: initialConfig?.appToken || '', tableId: initialConfig?.tableId || '', });
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
  const handleAutoCreateTable = async () => {
    if (!formData.appToken) { alert("请先填写 App Token (Base ID)"); return; }
    setIsCreatingTable(true);
    try { const newTableId = await feishuService.createTable(formData.appToken); setFormData(prev => ({ ...prev, tableId: newTableId })); alert("注意：由于是纯前端环境，自动建表功能受限，请参考下方的字段说明手动建表。"); } catch (error) { alert("创建失败"); } finally { setIsCreatingTable(false); }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 animate-fade-in overflow-y-auto">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 my-8">
        <div className="flex items-center gap-3 mb-6"><Logo /></div>
        <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl text-sm mb-6 flex items-start gap-3"><div className="mt-0.5"><Database size={16} /></div><div><p className="font-bold mb-1">连接飞书</p><p className="opacity-80">LifeOS 充当您飞书表格的“增强版界面”。请输入飞书开放平台提供的凭证。</p></div></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="group relative"><label className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase mb-1">App ID <HelpCircle size={12} className="text-slate-300 cursor-help" /><span className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs p-2 rounded w-48 z-10">飞书开发者后台获取 (cli_...)</span></label><input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="cli_..." value={formData.appId} onChange={e => setFormData({...formData, appId: e.target.value})} /></div>
            <div className="group relative"><label className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase mb-1">App Secret <HelpCircle size={12} className="text-slate-300 cursor-help" /><span className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs p-2 rounded w-48 z-10">注意保密，不要泄露给他人</span></label><input required type="password" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="******" value={formData.appSecret} onChange={e => setFormData({...formData, appSecret: e.target.value})} /></div>
          </div>
          <div className="group relative"><label className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase mb-1">App Token (Base ID) <HelpCircle size={12} className="text-slate-300 cursor-help" /><span className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs p-2 rounded w-64 z-10">浏览器地址栏中 /base/ 之后的那串字符 (bascn...)</span></label><input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="bascn..." value={formData.appToken} onChange={e => setFormData({...formData, appToken: e.target.value})} /></div>
          <div className="pt-2 border-t border-slate-100 mt-4">
             <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Table ID (数据表 ID)</label>
             <div className="flex gap-2"><input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="tbl..." value={formData.tableId} onChange={e => setFormData({...formData, tableId: e.target.value})} /><button type="button" onClick={handleAutoCreateTable} disabled={isCreatingTable || !formData.appToken} className={`whitespace-nowrap px-4 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${!formData.appToken ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>{isCreatingTable ? <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <>✨ 一键新建表</>}</button></div>
             <p className="text-xs text-slate-400 mt-2">推荐手动建表并填入 ID，自动功能在 Serverless 下受限。</p>
          </div>
          <FieldGuide />
          <button type="submit" className="w-full mt-6 bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-200">保存并连接</button>
          {initialConfig ? (<button type="button" onClick={onCancel} className="w-full bg-transparent text-slate-500 font-medium py-2 px-4 hover:text-slate-700 transition-colors">取消</button>) : (<button type="button" onClick={onCancel} className="w-full bg-transparent text-slate-400 text-sm mt-2 hover:text-slate-600">返回首页</button>)}
        </form>
        <SecurityNote />
      </div>
    </div>
  );
};

/**
 * --- COMPONENT: MOBILE VIEW ---
 */
const MobileView = ({ onLogout }) => {
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
    } catch (error) { alert("发送失败: " + error.message); } finally { setIsSending(false); }
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
              <textarea value={details.note} onChange={(e) => setDetails({...details, note: e.target.value})} placeholder="添加备注、后续计划或上下文..." className="w-full bg-slate-50 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-20" />
            </div>
          )}
          <div className="relative flex items-end gap-2"><button onClick={() => setShowDetails(!showDetails)} className={`mb-1 p-2 rounded-xl transition-colors ${showDetails ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 hover:text-indigo-600'}`}><MoreHorizontal size={24} /></button><textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={details.type === 'Task' ? "要做什么？" : "有什么想法？"} className="flex-1 bg-slate-50 rounded-2xl p-4 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none h-14 max-h-32" rows={1} style={{ minHeight: '3.5rem' }} /><button onClick={handleSend} disabled={!inputValue.trim() || isSending} className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${!inputValue.trim() ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95'}`}>{isSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={24} />}</button></div>
        </div>
      </div>
    </div>
  );
};

/**
 * --- COMPONENT: PC VIEW (DASHBOARD) ---
 */
const DesktopView = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inboxItems, setInboxItems] = useState([]);
  const [taskItems, setTaskItems] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [focusTask, setFocusTask] = useState("点击编辑今日聚焦");
  const [isEditingFocus, setIsEditingFocus] = useState(false);
  const [showFocusOverlay, setShowFocusOverlay] = useState(false);
  const [quickLinks, setQuickLinks] = useState([]);
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
      setInboxItems(data.filter(item => item.fields.Status === 'Inbox'));
      setTaskItems(data.filter(item => ['Todo', 'Doing'].includes(item.fields.Status)));
    } catch (e) { 
      console.error(e); 
      // 这里的 catch 不做 alert，防止初始化加载失败打断体验，可以只 log
    } finally { setIsLoading(false); }
  };

  const handleInboxAdd = async (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    setIsQuickAdding(true);
    try {
      await feishuService.addRecord({ title: quickInput, content: desktopDetails.note, source: "PC", category: desktopDetails.category, type: desktopDetails.type, dueDate: desktopDetails.type === 'Task' ? desktopDetails.dueDate : null, status: "Inbox" });
      setInboxItems(prev => [{ id: "temp_" + Date.now(), fields: { Title: quickInput, Status: "Inbox", Category: desktopDetails.category, Type: desktopDetails.type, "Created Time": Date.now() } }, ...prev]);
      setQuickInput(""); setDesktopDetails({ category: "Inbox", type: "Idea", dueDate: "", note: "" }); setInputExpanded(false);
    } catch (err) { alert("添加失败: " + err.message); } finally { setIsQuickAdding(false); }
  };

  const handleTaskAdd = async (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;
    const tempId = "temp_task_" + Date.now();
    setTaskItems(prev => [...prev, { id: tempId, fields: { Title: taskInput, Status: "Todo", Category: "Task", "Created Time": Date.now() } }]);
    setTaskInput("");
    try { await feishuService.addRecord({ title: taskInput, content: "", source: "PC", category: "Task", type: "Task", status: "Todo" }); } catch (err) { alert("添加任务失败: " + err.message); }
  };

  const handleMoveToTask = async (id, status) => {
    const item = inboxItems.find(i => i.id === id); if (!item) return;
    setInboxItems(prev => prev.filter(i => i.id !== id)); setTaskItems(prev => [{...item, fields: {...item.fields, Status: status}}, ...prev]);
    await feishuService.updateRecord(id, { Status: status });
  };

  const handleTaskComplete = async (id) => {
    setTaskItems(prev => prev.filter(i => i.id !== id));
    await feishuService.updateRecord(id, { Status: "Done" });
  };

  const handleAddLink = () => { const title = prompt("名称:"); if(!title) return; const url = prompt("URL:"); if(!url) return; const newLinks = [...quickLinks, { title, url }]; setQuickLinks(newLinks); localStorage.setItem('lifeos_quick_links', JSON.stringify(newLinks)); };
  const handleRemoveLink = (idx) => { if(confirm("删除?")) { const nl = quickLinks.filter((_, i) => i !== idx); setQuickLinks(nl); localStorage.setItem('lifeos_quick_links', JSON.stringify(nl)); } };
  const saveFocusTask = (val) => { setFocusTask(val); localStorage.setItem('lifeos_focus_task', val); setIsEditingFocus(false); };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {showFocusOverlay && <FocusModeOverlay task={focusTask} onClose={() => setShowFocusOverlay(false)} />}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col"><div className="p-6 flex items-center gap-3"><Logo className="w-6 h-6" textSize="text-lg" /></div><nav className="flex-1 px-4 py-4 space-y-1"><NavItem icon={<LayoutDashboard size={20} />} label="仪表盘" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} /><NavItem icon={<Inbox size={20} />} label="收件箱" count={inboxItems.length} active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} /></nav><div className="p-4 border-t border-slate-100"><button onClick={onLogout} className="flex items-center gap-3 text-slate-500 hover:text-slate-800 transition-colors px-4 py-2 w-full"><LogOut size={18} /><span className="text-sm font-medium">退出连接</span></button></div></aside>
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10"><h2 className="text-xl font-bold text-slate-800">{activeTab === 'dashboard' ? '早安，探索者' : '收件箱清理'}</h2><div className="flex items-center gap-4"><span className="text-sm text-slate-500">{new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric'})}</span><div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">ME</div></div></header>
        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' ? (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-3 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-64 flex flex-col justify-between hover:shadow-md transition-shadow group relative"><div><h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">今日聚焦</h3>{isEditingFocus ? <textarea autoFocus className="w-full h-24 text-2xl font-bold text-slate-800 leading-tight resize-none focus:outline-none bg-slate-50 rounded p-2" value={focusTask} onChange={e => setFocusTask(e.target.value)} onBlur={() => saveFocusTask(focusTask)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); saveFocusTask(focusTask); }}} /> : <div onClick={() => setIsEditingFocus(true)} className="text-2xl font-bold text-slate-800 leading-tight cursor-text hover:bg-slate-50 rounded -ml-2 p-2 transition-colors">{focusTask}</div>}</div><button onClick={() => setShowFocusOverlay(true)} className="flex items-center gap-2 text-indigo-600 text-sm font-medium cursor-pointer hover:underline">开始专注 <Maximize2 size={16} /></button></div>
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white"><div className="flex items-center justify-between mb-4 opacity-80"><div className="flex items-center gap-2"><Clock size={18} /><span className="text-sm font-medium">快捷入口</span></div><button onClick={handleAddLink} className="hover:bg-white/20 p-1 rounded transition-colors"><Plus size={16} /></button></div><div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">{quickLinks.length === 0 && <div className="text-xs opacity-50 italic">暂无链接，点击右上角添加</div>}{quickLinks.map((link, idx) => (<div key={idx} className="group flex items-center gap-2"><a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 block py-2 px-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm truncate">{link.title}</a><button onClick={() => handleRemoveLink(idx)} className="text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button></div>))}</div></div>
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
                  <div className="flex-1 p-4 overflow-y-auto max-h-[600px]"><div className="space-y-3">{inboxItems.map(item => (<div key={item.id} className="group p-4 bg-slate-50 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all"><div className="flex justify-between items-start"><div><div className="font-medium text-slate-800 mb-1">{item.fields.Title}</div><div className="flex gap-2 mt-1"><span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">{item.fields.Category}</span>{item.fields.Type === 'Task' && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-1"><CheckSquare size={10} /> 任务</span>}</div></div></div><div className="flex items-center justify-between mt-2"><div className="text-xs text-slate-400 flex items-center gap-2">{new Date(item.fields["Created Time"]).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})}{item.fields["Due Date"] && <span className="text-orange-400 flex items-center gap-1"><Calendar size={10} /> {new Date(item.fields["Due Date"]).toLocaleDateString()}</span>}</div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleMoveToTask(item.id, 'Todo')} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors">转任务</button></div></div></div>))}{inboxItems.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Inbox 清空了，太棒了！</div>}</div></div>
                </div>
              </div>
              <div className="col-span-12 md:col-span-4">
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center"><h3 className="font-bold text-lg flex items-center gap-2"><CheckSquare size={20} className="text-emerald-500" /> 我的任务</h3><span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">{taskItems.length}</span></div>
                    <div className="flex-1 p-4 overflow-y-auto max-h-[500px]"><div className="space-y-2">{taskItems.map(item => (<div key={item.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg group transition-colors"><button onClick={() => handleTaskComplete(item.id)} className="w-5 h-5 rounded border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 flex items-center justify-center transition-all text-transparent hover:text-emerald-500"><CheckCircle size={14} /></button><div className="flex-1"><div className={`text-sm font-medium ${item.fields.Status === 'Doing' ? 'text-indigo-600' : 'text-slate-700'}`}>{item.fields.Title}</div>{item.fields["Due Date"] && <div className="text-[10px] text-orange-500 flex items-center gap-1 mt-0.5"><CalendarClock size={10} /> {new Date(item.fields["Due Date"]).toLocaleDateString()} 截止</div>}</div></div>))}{taskItems.length === 0 && <div className="text-center py-8 text-slate-300 text-sm">没有待办任务，休息一下？</div>}</div></div>
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
  // Initialize state synchronously to avoid "flash of unconfigured content" causing errors
  const [config, setConfig] = useState(() => feishuService.getConfig());
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => !feishuService.getConfig());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); window.addEventListener('resize', checkMobile); return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSaveConfig = (newConfig) => { feishuService.saveConfig(newConfig); setConfig(newConfig); setIsConfiguring(false); setShowWelcome(false); };
  const handleLogout = () => { if (confirm("确定要断开与飞书的连接并清除本地密钥吗？")) { feishuService.clearConfig(); setConfig(null); setShowWelcome(true); setIsConfiguring(false); } };
  const handleOpenSettings = () => setIsConfiguring(true);

  if (showWelcome && !isConfiguring) return <WelcomeScreen onStart={() => { setShowWelcome(false); setIsConfiguring(true); }} />;
  if (isConfiguring) return <SettingsScreen onSave={handleSaveConfig} onCancel={() => { if (config) { setIsConfiguring(false); } else { setIsConfiguring(false); setShowWelcome(true); } }} initialConfig={config} />;
  return isMobile ? <MobileView onLogout={handleOpenSettings} /> : <DesktopView onLogout={handleLogout} />;
}