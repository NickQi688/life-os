# 性能优化集成指南

本指南说明如何将性能优化集成到现有的 LifeOS 应用中。

## 📋 快速集成步骤

### 步骤 1: 更新 App.jsx 顶部导入

在 `src/App.jsx` 文件顶部添加以下导入：

```jsx
// 添加这些导入
import { useDebouncedValue, useKeyboard } from './utils/hooks';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  OptimizedKanbanCard,
  OptimizedInboxCard,
  OptimizedTaskCard,
  OptimizedStatCard,
  OptimizedRecordItem,
} from './components/OptimizedComponents';
import OptimizedFeishuService from './services/optimizedFeishuService';
```

### 步骤 2: 替换飞书服务实例

找到这一行（约在第 305 行）：

```jsx
const feishuService = new FeishuService();
```

替换为：

```jsx
const feishuService = new FeishuService();
const optimizedFeishu = new OptimizedFeishuService(feishuService);
```

### 步骤 3: 添加搜索防抖（DesktopView 组件）

在 DesktopView 组件中，找到：

```jsx
const [searchText, setSearchText] = useState("");
```

在其后添加：

```jsx
const [searchText, setSearchText] = useState("");
const debouncedSearchText = useDebouncedValue(searchText, 300); // 300ms 防抖
```

### 步骤 4: 替换 KanbanCard 组件使用

找到看板渲染部分（约在第 1390 行），将：

```jsx
<KanbanCard key={item.id} item={item} onMove={handleUpdateStatus} onClick={() => setEditingItem(item)} />
```

替换为：

```jsx
<OptimizedKanbanCard key={item.id} item={item} onMove={handleUpdateStatus} onClick={() => setEditingItem(item)} />
```

### 步骤 5: 替换收件箱卡片

找到收件箱列表渲染部分（约在第 1363 行），将整个卡片 div 替换为：

```jsx
<OptimizedInboxCard
  key={item.id}
  item={item}
  onMoveToTodo={(id) => handleUpdateStatus(id, '待办')}
  onDelete={handleDelete}
  onClick={() => setEditingItem(item)}
/>
```

### 步骤 6: 替换今日任务卡片

找到今日任务列表渲染部分，将任务卡片替换为：

```jsx
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
```

### 步骤 7: 添加键盘快捷键

在 DesktopView 组件内部，useEffect 部分之后添加：

```jsx
// 键盘快捷键
useKeyboard({
  'n': () => setIsQuickCaptureOpen(true),
  'cmd+k': () => {
    const searchInput = document.querySelector('input[type="text"]');
    searchInput?.focus();
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
    // 显示快捷键帮助（可以添加一个状态来控制）
    alert('快捷键：\nN - 新建记录\nCmd+K - 搜索\nEsc - 关闭对话框\nG+D - 仪表盘\nG+I - 收件箱\nG+P - 计划\nG+S - 统计');
  },
});
```

### 步骤 8: 在 main.jsx 添加错误边界

更新 `src/main.jsx`：

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
```

### 步骤 9: 添加数据预加载

在 App 组件的 useEffect 中添加预加载：

```jsx
useEffect(() => {
  // 预加载数据到缓存
  const preloadData = async () => {
    try {
      await optimizedFeishu.preload();
    } catch (error) {
      console.error('Preload failed:', error);
    }
  };

  preloadData();

  // 定期清理缓存
  const cacheCleanupInterval = setInterval(() => {
    optimizedFeishu.clearExpiredCache();
  }, 60000); // 每分钟清理一次

  return () => clearInterval(cacheCleanupInterval);
}, []);
```

### 步骤 10: 添加加载状态到统计视图

在 StatsChart 组件使用时添加骨架屏：

```jsx
import { PageSkeleton } from './components/Skeleton';

// 在 DesktopView 的 stats 视图中
{activeTab === 'stats' && (
  <div className="max-w-6xl mx-auto">
    {records.length === 0 ? (
      <PageSkeleton />
    ) : (
      <StatsChart records={records} />
    )}
  </div>
)}
```

---

## 🔧 高级优化选项

### 选项 1: 添加性能监控

在需要监控性能的组件中添加：

```jsx
import { perfMonitor } from './utils/optimizations';

useEffect(() => {
  perfMonitor.startMount('ComponentName');
  return () => {
    perfMonitor.endMount('ComponentName');
  };
}, []);
```

### 选项 2: 使用优化后的飞书服务

将所有的 `feishuService` 调用替换为 `optimizedFeishu`：

```jsx
// 原来的代码
const data = await feishuService.fetchRecords();

// 优化后的代码
const data = await optimizedFeishu.fetchRecords({ useCache: true });
```

### 选项 3: 批量更新

对于需要同时更新多个记录的场景，使用批量更新：

```jsx
// 而不是逐个更新
for (const item of items) {
  await optimizedFeishu.updateRecord(item.id, { "状态": "已完成" });
}

// 使用批量更新
await optimizedFeishu.batchUpdate(
  items.map(item => ({
    id: item.id,
    fields: { "状态": "已完成" }
  }))
);
```

---

## 📊 验证优化效果

### 1. 检查组件渲染次数

在 React DevTools 中：
1. 打开 "Profiler" 标签
2. 点击录制
3. 与应用交互
4. 停止录制并查看哪些组件频繁渲染

### 2. 检查缓存效果

在浏览器控制台中：

```javascript
// 查看缓存统计
console.log(optimizedFeishu.getCacheStats());

// 清除缓存
optimizedFeishu.clearCache();
```

### 3. 性能测试

使用浏览器的 Performance 标签：
1. 打开 Performance 标签
2. 点击录制
3. 执行一些操作（如搜索、滚动列表）
4. 停止录制并查看性能指标

---

## 🐛 故障排除

### 问题：键盘快捷键不工作

**解决方案**：确保 `useKeyboard` hook 在组件内部调用，并且按键映射正确。

### 问题：缓存导致数据不同步

**解决方案**：在添加/更新/删除操作后调用 `optimizedFeishu.clearCache()`。

### 问题：防抖导致搜索感觉延迟

**解决方案**：调整防抖延迟时间，从 300ms 减少到 150ms：

```jsx
const debouncedSearchText = useDebouncedValue(searchText, 150);
```

---

## 📈 性能提升预期

应用这些优化后，你应该能看到：

- ✅ **搜索响应更快** - 防抖减少不必要的计算
- ✅ **列表滚动更流畅** - React.memo 减少重渲染
- ✅ **数据加载更快** - 缓存避免重复请求
- ✅ **更稳定的体验** - 错误边界防止崩溃
- ✅ **更快的操作** - 键盘快捷键提升效率

---

## 🎯 下一步

完成基础集成后，你还可以：

1. **添加虚拟滚动** - 对于超长列表（> 1000 项）
2. **实现 Service Worker** - 支持离线使用
3. **添加 Web Workers** - 处理复杂计算
4. **图片懒加载** - 优化图片加载

---

**需要帮助？** 查看 `OPTIMIZATION_GUIDE.md` 获取更多详细信息。
