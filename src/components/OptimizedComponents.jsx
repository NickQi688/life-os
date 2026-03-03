import React, { memo, useCallback } from 'react';
import { CheckSquare, Flame, Check } from 'lucide-react';

/**
 * 优化的看板卡片组件 - 使用 React.memo 避免不必要的重渲染
 */
export const OptimizedKanbanCard = memo(({ item, onMove, onClick }) => {
  // 使用 useCallback 缓存事件处理函数
  const handleMove = useCallback((e) => {
    e.stopPropagation();
    onMove(item.id, '已完成');
  }, [item.id, onMove]);

  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  const isDone = item.fields["状态"] === '已完成';
  const isHighPriority = item.fields["优先级"] === '紧急';

  return (
    <div
      onClick={handleClick}
      className="bg-slate-900 border border-slate-800 p-3 rounded-xl mb-3 cursor-grab active:cursor-grabbing transition-all hover:border-slate-600 hover:shadow-lg group relative"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600">
          {item.fields["内容方向"] || "未分类"}
        </div>
        {isHighPriority && <Flame size={14} className="text-red-500" />}
      </div>
      <h4 className="text-sm text-slate-200 font-medium leading-relaxed mb-2">
        {item.fields["标题"]}
      </h4>
      <div className="flex justify-between items-center pt-2 border-t border-slate-700/30">
        <span className="text-[10px] text-slate-500">
          {new Date(item.fields["记录日期"]).toLocaleDateString()}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isDone && (
            <button
              onClick={handleMove}
              className="p-1 hover:bg-emerald-500/20 hover:text-emerald-400 rounded text-slate-500"
              title="完成"
            >
              <CheckSquare size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

OptimizedKanbanCard.displayName = 'OptimizedKanbanCard';

/**
 * 优化的收件箱卡片组件
 */
export const OptimizedInboxCard = memo(({ item, onMoveToTodo, onDelete, onClick }) => {
  const handleMoveToTodo = useCallback((e) => {
    e.stopPropagation();
    onMoveToTodo(item.id);
  }, [item.id, onMoveToTodo]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete(item.id);
  }, [item.id, onDelete]);

  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  return (
    <div
      onClick={handleClick}
      className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-start gap-4 hover:border-indigo-500/30 transition-all group cursor-pointer"
    >
      <div className="mt-1 p-2 bg-slate-800 rounded-lg text-slate-400">
        {item.fields["类型"] === '任务' ? <CheckSquare size={18} /> : <span>💡</span>}
      </div>
      <div className="flex-1">
        <h3 className="text-slate-200 font-medium mb-1">{item.fields["标题"]}</h3>
        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{item.fields["内容"]}</p>
        <div className="flex gap-2">
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700">
            {item.fields["内容方向"]}
          </span>
        </div>
        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleMoveToTodo}
            className="text-xs bg-slate-800 hover:bg-blue-500/20 hover:text-blue-300 px-3 py-1 rounded border border-slate-700 transition-colors"
          >
            转为待办
          </button>
          <button
            onClick={handleDelete}
            className="text-xs bg-slate-800 hover:bg-red-500/20 hover:text-red-300 px-3 py-1 rounded border border-slate-700 transition-colors flex items-center gap-1"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
});

OptimizedInboxCard.displayName = 'OptimizedInboxCard';

/**
 * 优化的任务卡片组件 - 用于今日任务列表
 */
export const OptimizedTaskCard = memo(({ item, onUpdateStatus, onClick, onFocus }) => {
  const handleStatusToggle = useCallback((e) => {
    e.stopPropagation();
    const newStatus = item.fields["状态"] === '已完成' ? '待办' : '已完成';
    onUpdateStatus(item.id, newStatus);
  }, [item.id, item.fields["状态"], onUpdateStatus]);

  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  const handleFocus = useCallback((e) => {
    e.stopPropagation();
    onFocus(item.fields["标题"]);
  }, [item.fields["标题"], onFocus]);

  const isDone = item.fields["状态"] === '已完成';
  const isHighPriority = item.fields["优先级"] === '紧急' && !isDone;

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        isDone
          ? 'bg-slate-900 border-slate-800 opacity-50'
          : 'bg-slate-800 border-slate-700 hover:border-indigo-500/50'
      } cursor-pointer group`}
    >
      <button
        onClick={handleStatusToggle}
        className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
          isDone
            ? 'bg-emerald-500 text-white'
            : 'border-2 border-slate-500 hover:border-emerald-500'
        }`}
      >
        {isDone && <Check size={12} />}
      </button>
      <div className="flex-1">
        <span className={`text-sm ${isDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
          {item.fields["标题"]}
        </span>
        <div className="flex gap-2 mt-1">
          <span className={`text-[10px] px-1.5 rounded border ${
            isDone
              ? 'border-slate-800 text-slate-600'
              : 'border-slate-600 text-slate-400'
          }`}>
            {item.fields["状态"]}
          </span>
          {isHighPriority && (
            <span className="text-[10px] text-red-400 flex items-center gap-0.5">
              <Flame size={10}/> 紧急
            </span>
          )}
        </div>
      </div>
      {!isDone && (
        <button
          onClick={handleFocus}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-all"
          title="开始专注"
        >
          ⏱️
        </button>
      )}
    </div>
  );
});

OptimizedTaskCard.displayName = 'OptimizedTaskCard';

/**
 * 优化的统计卡片组件
 */
export const OptimizedStatCard = memo(({ icon: Icon, label, value, color, subtext }) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-all group">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} />
      </div>
      <span className="text-slate-500 group-hover:text-indigo-400 transition-colors">📈</span>
    </div>
    <div className="text-3xl font-bold text-slate-200 mb-1">{value}</div>
    <div className="text-sm text-slate-500">{label}</div>
    {subtext && <div className="text-xs text-slate-600 mt-2">{subtext}</div>}
  </div>
));

OptimizedStatCard.displayName = 'OptimizedStatCard';

/**
 * 优化的记录项组件 - 用于最近录入列表
 */
export const OptimizedRecordItem = memo(({ item, onClick, getTypeIcon }) => {
  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  return (
    <div
      onClick={handleClick}
      className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-start active:scale-[0.98] transition-transform cursor-pointer"
    >
      <div>
        <div className="text-slate-200 font-medium line-clamp-2 text-sm">
          {item.fields["标题"]}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {getTypeIcon(item.fields["类型"])}
          <span className="text-[10px] text-slate-500">
            {item.fields["记录日期"]
              ? new Date(item.fields["记录日期"]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '刚刚'}
          </span>
        </div>
      </div>
      <div className="text-slate-600">✏️</div>
    </div>
  );
});

OptimizedRecordItem.displayName = 'OptimizedRecordItem';
