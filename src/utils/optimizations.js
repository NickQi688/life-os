/**
 * LifeOS 性能优化配置和工具
 *
 * 优化建议和实现方案
 */

export const OPTIMIZATION_CONFIG = {
  // 防抖延迟配置
  debounce: {
    search: 300,        // 搜索输入防抖
    autoSave: 1000,     // 自动保存防抖
    resize: 200,        // 窗口调整防抖
  },

  // 节流配置
  throttle: {
    scroll: 100,        // 滚动节流
    mouseMove: 50,      // 鼠标移动节流
  },

  // 缓存配置
  cache: {
    maxSize: 1000,      // 最大缓存条目
    ttl: 5 * 60 * 1000, // 缓存过期时间（5分钟）
  },

  // 虚拟滚动配置
  virtualScroll: {
    itemHeight: 80,     // 默认项高度
    overscan: 5,        // 预渲染项数
  },

  // 代码分割配置
  codeSplitting: {
    enable: true,       // 启用代码分割
    chunkSize: 50000,   // 块大小阈值
  },

  // 性能监控
  profiling: {
    enable: process.env.NODE_ENV === 'development',
    logThreshold: 100,  // 性能日志阈值（ms）
  },
};

/**
 * 组件优化清单
 */
export const COMPONENT_OPTIMIZATION_CHECKLIST = {
  // 1. 使用 React.memo 包装纯展示组件
  memo: [
    'NavItem',
    'KanbanCard',
    'FeatureCard',
    'StepCard',
    'StatCard',
  ],

  // 2. 使用 useMemo 缓存计算结果
  useMemo: [
    '过滤后的记录列表',
    '统计数据计算',
    '排序后的列表',
  ],

  // 3. 使用 useCallback 缓存回调函数
  useCallback: [
    '事件处理函数',
    '传递给子组件的回调',
    '定时器回调',
  ],

  // 4. 懒加载组件
  lazyLoad: [
    'StatsChart',
    'EditRecordModal',
    'QuickCaptureModal',
    'FocusModeOverlay',
  ],

  // 5. 虚拟滚动长列表
  virtualScroll: [
    '收件箱列表（> 50 项）',
    '知识库列表（> 50 项）',
    '日记列表（> 50 项）',
  ],
};

/**
 * 性能优化建议文档
 */
export const PERFORMANCE_TIPS = [
  {
    category: '渲染优化',
    tips: [
      '使用 React.memo 避免不必要的组件重渲染',
      '使用 useMemo 缓存昂贵的计算结果',
      '使用 useCallback 缓存回调函数',
      '避免在渲染函数中创建新对象/数组',
      '使用 key 属性优化列表渲染',
    ],
  },
  {
    category: '状态管理',
    tips: [
      '使用 useState 的函数式更新',
      '批量更新状态减少渲染次数',
      '将状态下移到需要的最小组件',
      '使用 useReducer 管理复杂状态',
      '避免通过 props 传递深层状态',
    ],
  },
  {
    category: '网络请求',
    tips: [
      '使用防抖减少请求频率',
      '实现请求缓存',
      '使用乐观更新提升体验',
      '取消未完成的请求',
      '实现重试机制',
    ],
  },
  {
    category: '代码质量',
    tips: [
      '使用代码分割减少初始加载时间',
      '懒加载非关键组件',
      '优化图片大小和格式',
      '使用 Web Workers 处理复杂计算',
      '定期清理无用的代码和依赖',
    ],
  },
];

/**
 * 获取优化建议
 */
export const getOptimizationTips = () => {
  return PERFORMANCE_TIPS;
};

/**
 * 性能监控工具
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }

  startMeasure(label) {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-start`);
    }
  }

  endMeasure(label) {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);

      const measure = performance.getEntriesByName(label)[0];
      this.metrics.set(label, measure.duration);

      if (measure.duration > OPTIMIZATION_CONFIG.profiling.logThreshold) {
        console.warn(`[Performance] ${label} took ${measure.duration.toFixed(2)}ms`);
      }

      return measure.duration;
    }
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  clearMetrics() {
    this.metrics.clear();
  }
}

export const perfMonitor = new PerformanceMonitor();

/**
 * React 性能优化装饰器（HOC）
 */
export const withPerformanceMonitor = (WrappedComponent, componentName) => {
  return class extends React.Component {
    componentDidMount() {
      perfMonitor.startMount(componentName);
    }

    componentDidUpdate() {
      perfMonitor.startMount(`${componentName}-update`);
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }
  };
};

/**
 * 懒加载组件包装器
 */
export const withLazyLoad = (importFunc, fallback = null) => {
  return React.lazy(() => importFunc());
};

/**
 * 优化的列表组件 HOC
 */
export const withVirtualScroll = (WrappedComponent) => {
  return class extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        visibleRange: { start: 0, end: 20 },
        scrollTop: 0,
      };
      this.containerRef = React.createRef();
    }

    componentDidMount() {
      this.updateVisibleRange();
      window.addEventListener('resize', this.handleScroll);
    }

    componentWillUnmount() {
      window.removeEventListener('resize', this.handleScroll);
    }

    handleScroll = () => {
      if (this.containerRef.current) {
        const scrollTop = this.containerRef.current.scrollTop;
        this.setState({ scrollTop }, this.updateVisibleRange);
      }
    };

    updateVisibleRange = () => {
      if (!this.containerRef.current) return;

      const { scrollTop } = this.state;
      const containerHeight = this.containerRef.current.clientHeight;
      const itemHeight = 80; // 默认项高度

      const startNode = Math.floor(scrollTop / itemHeight);
      const visibleNodeCount = Math.ceil(containerHeight / itemHeight);

      this.setState({
        visibleRange: {
          start: Math.max(0, startNode - 5),
          end: startNode + visibleNodeCount + 5,
        },
      });
    };

    render() {
      const { items } = this.props;
      const { visibleRange } = this.state;
      const visibleItems = items.slice(visibleRange.start, visibleRange.end);

      return (
        <div
          ref={this.containerRef}
          onScroll={this.handleScroll}
          style={{ height: '100%', overflow: 'auto' }}
        >
          <div style={{ height: `${items.length * 80}px`, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: `${visibleRange.start * 80}px`,
                width: '100%',
              }}
            >
              <WrappedComponent {...this.props} items={visibleItems} />
            </div>
          </div>
        </div>
      );
    }
  };
};
