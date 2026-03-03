import React from 'react';

/**
 * 基础骨架屏组件
 */
export const Skeleton = ({ className = '', variant = 'default', ...props }) => {
  const baseClasses = 'animate-pulse bg-slate-800 rounded';
  const variantClasses = {
    default: 'h-4 w-full',
    text: 'h-4 w-3/4',
    title: 'h-6 w-1/2',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.default} ${className}`}
      {...props}
    />
  );
};

/**
 * 卡片骨架屏
 */
export const CardSkeleton = () => (
  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
    <div className="flex items-start gap-4">
      <Skeleton variant="circular" className="w-10 h-10" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  </div>
);

/**
 * 列表骨架屏
 */
export const ListSkeleton = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

/**
 * 仪表盘统计骨架屏
 */
export const StatsCardSkeleton = () => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
    <div className="flex items-start justify-between mb-4">
      <Skeleton variant="circular" className="w-12 h-12" />
      <Skeleton className="h-4 w-16" />
    </div>
    <Skeleton className="h-8 w-20 mb-1" />
    <Skeleton className="h-3 w-32" />
  </div>
);

/**
 * 统计图表骨架屏
 */
export const ChartSkeleton = ({ height = 200 }) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
    <Skeleton className="h-5 w-32 mb-6" />
    <div
      className="animate-pulse bg-slate-800 rounded"
      style={{ height: `${height}px` }}
    />
  </div>
);

/**
 * 页面加载骨架屏
 */
export const PageSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 bg-slate-800 rounded w-48 mb-8" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>
    <ChartSkeleton height={180} />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ChartSkeleton height={200} />
      <ChartSkeleton height={200} />
    </div>
  </div>
);

/**
 * 输入框骨架屏
 */
export const InputSkeleton = ({ className = '' }) => (
  <Skeleton className={`h-12 w-full ${className}`} />
);

export default Skeleton;
