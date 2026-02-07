import React from 'react';
import { TrendingUp, PieChart, BarChart3, Clock, Activity, Target } from 'lucide-react';

/**
 * 环形进度图组件
 */
const ProgressRing = ({ value, size = 120, strokeWidth = 12, color = '#6366f1' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold">{value}%</span>
      </div>
    </div>
  );
};

/**
 * 统计卡片组件
 */
const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-all group">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} />
      </div>
      <TrendingUp size={16} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
    </div>
    <div className="text-3xl font-bold text-slate-200 mb-1">{value}</div>
    <div className="text-sm text-slate-500">{label}</div>
    {subtext && <div className="text-xs text-slate-600 mt-2">{subtext}</div>}
  </div>
);

/**
 * 柱状图组件
 */
const BarChart = ({ data, height = 200 }) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = Math.max(20, Math.min(40, 300 / data.length));
  const gap = Math.max(8, 20 - barWidth);

  const colors = [
    'bg-indigo-500',
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-pink-500',
    'bg-cyan-500'
  ];

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="flex items-end gap-2"
        style={{ height: `${height}px`, minWidth: `${data.length * (barWidth + gap)}px` }}
      >
        {data.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * (height - 30) : 0;
          const color = colors[index % colors.length];

          return (
            <div
              key={index}
              className="flex flex-col items-center gap-2 flex-shrink-0"
              style={{ width: `${barWidth}px` }}
            >
              <div className="relative w-full flex items-end justify-center" style={{ height: `${height - 30}px` }}>
                <div
                  className={`${color} rounded-t-lg transition-all duration-300 hover:opacity-80`}
                  style={{ height: `${barHeight}px`, minHeight: item.value > 0 ? '4px' : '0' }}
                />
                {item.value > 0 && (
                  <span className="absolute -top-6 text-xs font-medium text-slate-400">
                    {item.value}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 text-center truncate w-full">
                {item.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 折线图组件
 */
const LineChart = ({ data, height = 200 }) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - (item.value / maxValue) * 100;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={areaPoints}
          fill="url(#lineGradient)"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((item, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = 100 - (item.value / maxValue) * 100;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill="#6366f1"
              className="hover:r-4 transition-all"
            />
          );
        })}
      </svg>
      <div className="flex justify-between mt-2 text-[10px] text-slate-500">
        {data.map((item, index) => (
          <span key={index} className="flex-1 text-center">
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * 饼图组件（简单版）
 */
const SimplePieChart = ({ data, size = 200 }) => {
  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = [
    '#6366f1', '#10b981', '#3b82f6', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444'
  ];

  let currentAngle = 0;

  const paths = data.map((item, index) => {
    if (item.value === 0) return null;

    const percentage = item.value / total;
    const angle = percentage * 360;

    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;

    const x1 = 50 + 50 * Math.cos(startRad);
    const y1 = 50 + 50 * Math.sin(startRad);
    const x2 = 50 + 50 * Math.cos(endRad);
    const y2 = 50 + 50 * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    currentAngle += angle;

    return {
      path: `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
      color: colors[index % colors.length],
      value: item.value,
      name: item.name,
      percentage: Math.round(percentage * 100)
    };
  }).filter(Boolean);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 100 100" style={{ width: size, height: size }} className="transform">
        {paths.map((item, index) => (
          <path
            key={index}
            d={item.path}
            fill={item.color}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <title>{item.name}: {item.value} ({item.percentage}%)</title>
          </path>
        ))}
      </svg>
      <div className="grid grid-cols-2 gap-2 w-full">
        {paths.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-400">{item.name}: {item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 主统计组件
 */
const StatsChart = ({ records }) => {
  if (!records || records.length === 0) {
    return (
      <div className="text-center py-20 text-slate-600">
        <Activity size={48} className="mx-auto mb-4 opacity-50" />
        <p>暂无数据，开始记录吧！</p>
      </div>
    );
  }

  const overall = {
    total: records.length,
    inbox: records.filter(r => r.fields["状态"] === "收件箱").length,
    todo: records.filter(r => r.fields["状态"] === "待办").length,
    doing: records.filter(r => r.fields["状态"] === "进行中").length,
    done: records.filter(r => r.fields["状态"] === "已完成").length,
    completionRate: 0
  };

  const tasks = records.filter(r => r.fields["类型"] === "任务");
  const completedTasks = tasks.filter(r => r.fields["状态"] === "已完成");
  overall.completionRate = tasks.length > 0
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  const types = [
    { name: "灵感", value: records.filter(r => r.fields["类型"] === "灵感").length },
    { name: "任务", value: records.filter(r => r.fields["类型"] === "任务").length },
    { name: "笔记", value: records.filter(r => r.fields["类型"] === "笔记").length },
    { name: "日记", value: records.filter(r => r.fields["类型"] === "日记").length }
  ];

  const directions = {};
  records.forEach(r => {
    const dir = r.fields["内容方向"] || "未分类";
    directions[dir] = (directions[dir] || 0) + 1;
  });
  const directionData = Object.entries(directions)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // 最近7天的数据
  const last7Days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dayRecords = records.filter(r => {
      const recordDate = new Date(r.fields["记录日期"]);
      return recordDate >= date && recordDate < nextDate;
    });

    last7Days.push({
      name: date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      value: dayRecords.length
    });
  }

  // 按小时统计
  const hourlyData = [];
  for (let i = 0; i < 24; i++) {
    const hourRecords = records.filter(r => {
      const hour = new Date(r.fields["记录日期"]).getHours();
      return hour === i;
    });
    hourlyData.push({
      name: `${i}:00`,
      value: hourRecords.length
    });
  }

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="总记录"
          value={overall.total}
          color="bg-indigo-500/20 text-indigo-400"
        />
        <StatCard
          icon={Target}
          label="任务总数"
          value={tasks.length}
          subtext={`完成 ${completedTasks.length}`}
          color="bg-purple-500/20 text-purple-400"
        />
        <StatCard
          icon={TrendingUp}
          label="待处理"
          value={overall.inbox + overall.todo + overall.doing}
          color="bg-amber-500/20 text-amber-400"
        />
        <StatCard
          icon={PieChart}
          label="已完成"
          value={overall.done}
          color="bg-emerald-500/20 text-emerald-400"
        />
      </div>

      {/* 完成率环形图 */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
          <Target size={20} className="text-indigo-400" />
          任务完成率
        </h3>
        <div className="flex justify-center">
          <ProgressRing value={overall.completionRate} size={160} strokeWidth={16} />
        </div>
      </div>

      {/* 类型分布饼图 */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
          <PieChart size={20} className="text-purple-400" />
          记录类型分布
        </h3>
        <SimplePieChart data={types} size={200} />
      </div>

      {/* 最近7天趋势 */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-400" />
          最近7天记录趋势
        </h3>
        <LineChart data={last7Days} height={180} />
      </div>

      {/* 内容方向分布 */}
      {directionData.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-400" />
            内容方向分布
          </h3>
          <BarChart data={directionData} height={200} />
        </div>
      )}

      {/* 活跃时间分布 */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
          <Clock size={20} className="text-amber-400" />
          24小时活跃分布
        </h3>
        <BarChart data={hourlyData} height={180} />
      </div>
    </div>
  );
};

export default StatsChart;
