/**
 * APP.JS 优化补丁
 *
 * 这个文件展示了需要在 App.jsx 中进行的关键修改
 * 复制相应的部分到你的 App.jsx 中
 */

// ============== 1. 顶部导入（约第 16 行）=============

// 在现有的 import 语句后添加：

import { useDebouncedValue, useKeyboard } from './utils/hooks';
import {
  OptimizedKanbanCard,
  OptimizedInboxCard,
  OptimizedTaskCard,
} from './components/OptimizedComponents.jsx';
import OptimizedFeishuService from './services/optimizedFeishuService.js';


// ============== 2. 服务实例化（约第 305 行）=============

// 在现有的 feishuService 实例后添加：

const feishuService = new FeishuService();
const optimizedFeishu = new OptimizedFeishuService(feishuService); // 添加这行


// ============== 3. MobileView 组件优化 ==============

const MobileView = ({ onSettings, notify, directions }) => {
  // ... 现有的状态声明 ...

  // 在状态声明后添加键盘快捷键（约第 698 行之后）：
  useKeyboard({
    'n': () => {
      // 打开快速输入
      document.querySelector('textarea')?.focus();
    },
    'escape': () => {
      setEditingItem(null);
      setShowDetails(false);
    },
  });

  // ... 其余代码保持不变 ...

  // 在今日任务列表渲染部分（约第 895 行），将现有的任务卡片替换为：

  {todayTasks.map(item => (
    <div
      key={item.id}
      onClick={() => setEditingItem(item)}
      className={`bg-slate-900 p-4 rounded-xl border flex items-center justify-between transition-all ${
        item.fields["状态"] === STATUS.DONE
          ? 'border-slate-800 opacity-50'
          : 'border-slate-800'
      }`}
    >
      <span className={`text-sm font-medium ${
        item.fields["状态"] === STATUS.DONE ? 'text-slate-500 line-through' : 'text-slate-200'
      }`}>
        {item.fields["标题"]}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDone(item.id);
        }}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          item.fields["状态"] === STATUS.DONE
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-slate-600 text-transparent hover:border-emerald-500'
        }`}
      >
        <Check size={14}/>
      </button>
    </div>
  ))}


// ============== 4. DesktopView 组件优化 ==============

const DesktopView = ({ onLogout, onSettings, notify, isDemoMode, onGoHome, directions }) => {
  // ... 现有的状态声明 ...

  // 在 searchText 声明后添加（约第 976 行）：

  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebouncedValue(searchText, 300); // 添加这行 - 防抖搜索

  // 添加键盘快捷键（在 useEffect 之后，约第 1010 行）：

  useKeyboard({
    'n': () => setIsQuickCaptureOpen(true),
    'cmd+k': () => {
      const searchInput = document.querySelector('input[type="text"]');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    },
    'escape': () => {
      setShowFocusOverlay(false);
      setEditingItem(null);
      setIsQuickCaptureOpen(false);
    },
    'g,d': () => setActiveTab('dashboard'),
    'g,i': () => setActiveTab('inbox'),
    'g,p': () => setActiveTab('planner'),
    'g,s': () => setActiveTab('stats'),
    '?': () => {
      const shortcuts = `
快捷键列表：

🎯 快速操作
  N         - 新建记录
  Cmd/Ctrl+K - 聚焦搜索框
  Esc       - 关闭对话框

📍 导航
  G + D     - 前往仪表盘
  G + I     - 前往收件箱
  G + P     - 前往计划看板
  G + S     - 前往数据统计

💡 提示：按 G 然后快速按第二个字母
      `;
      alert(shortcuts);
    },
  });

  // ... 其余代码保持不变 ...


  // ============== 5. 替换 KanbanCard 组件（约第 1390 行）=============

  // 找到这段代码：
  // {(status === '待办' ? todoItems : status === '进行中' ? doingItems : doneItems).map(item => <KanbanCard key={item.id} item={item} onMove={handleUpdateStatus} onClick={() => setEditingItem(item)} />)}

  // 替换为：
  {(status === '待办' ? todoItems : status === '进行中' ? doingItems : doneItems).map(item =>
    <OptimizedKanbanCard key={item.id} item={item} onMove={handleUpdateStatus} onClick={() => setEditingItem(item)} />
  )}


  // ============== 6. 替换收件箱卡片（约第 1363 行）=============

  // 找到整个收件箱卡片的 JSX，替换为：

  {inboxItems.map(item => (
    <OptimizedInboxCard
      key={item.id}
      item={item}
      onMoveToTodo={(id) => handleUpdateStatus(id, '待办')}
      onDelete={handleDelete}
      onClick={() => setEditingItem(item)}
    />
  ))}
  {inboxItems.length === 0 && <div className="text-center py-20 text-slate-600">Inbox 空空如也</div>}


  // ============== 7. 替换今日任务卡片（约第 1275 行）=============

  // 找到今日任务列表的渲染代码，替换为：

  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
    {[...todayTasks, ...completedToday].map(item =>
      <OptimizedTaskCard
        key={item.id}
        item={item}
        onUpdateStatus={handleUpdateStatus}
        onClick={() => setEditingItem(item)}
        onFocus={(title) => {
          setFocusTask(title);
          setShowFocusOverlay(true);
        }}
      />
    )}
    {todayTasks.length + completedToday.length === 0 &&
      <div className="text-slate-600 text-sm text-center py-8">今日无待办任务</div>
    }
  </div>


  // ============== 8. 添加数据预加载（在 App 主组件中）=============

  export default function App() {
    const [config, setConfig] = useState(() => feishuService.getConfig());
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [showWelcome, setShowWelcome] = useState(() => !feishuService.getConfig());
    const [isMobile, setIsMobile] = useState(false);
    const [notification, setNotification] = useState(null);

    const directions = CONTENT_DIRECTIONS;

    useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // 添加这个 useEffect 用于数据预加载和缓存管理
    useEffect(() => {
      const preloadData = async () => {
        try {
          await optimizedFeishu.preload();
          console.log('[Performance] Data preloaded successfully');
        } catch (error) {
          console.error('[Performance] Preload failed:', error);
        }
      };

      preloadData();

      // 定期清理过期缓存
      const cleanupInterval = setInterval(() => {
        optimizedFeishu.clearExpiredCache();
      }, 60000); // 每分钟清理一次

      return () => clearInterval(cleanupInterval);
    }, []);

    // ... 其余代码保持不变 ...
  }


// ============== 9. 为知识库搜索添加防抖（约第 1401 行）=============

// 找到：
// <input type="text" placeholder="搜索笔记..." className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 text-sm text-white focus:border-indigo-500 outline-none" value={searchText} onChange={e => setSearchText(e.target.value)} />

// 替换为：
// 注意：现在使用 debouncedSearchText 来过滤
const filteredKnowledgeItems = useMemo(() => {
  if (!debouncedSearchText) return knowledgeItems;
  return knowledgeItems.filter(i =>
    (i.fields["标题"] || "").toLowerCase().includes(debouncedSearchText.toLowerCase())
  );
}, [knowledgeItems, debouncedSearchText]);

// 然后 input 保持使用 searchText（为了即时响应）
// 但过滤使用 debouncedSearchText


// ============== 完成优化！=============

/**
 * 优化清单：
 * ✅ 添加了优化的组件导入
 * ✅ 创建了优化的飞书服务实例
 * ✅ 为搜索添加了防抖
 * ✅ 添加了键盘快捷键支持
 * ✅ 替换了关键组件为优化版本
 * ✅ 添加了数据预加载
 * ✅ 添加了缓存管理
 */
