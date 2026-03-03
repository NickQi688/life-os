/**
 * 性能优化工具函数
 */

/**
 * 批量更新函数 - 避免多次 setState
 */
export const batchUpdates = (updates, setState) => {
  setState(prevState => {
    const newState = { ...prevState };
    updates.forEach(update => {
      if (typeof update === 'function') {
        Object.assign(newState, update(newState));
      } else {
        Object.assign(newState, update);
      }
    });
    return newState;
  });
};

/**
 * 优化的日期格式化
 */
const dateCache = new Map();
export const formatDate = (date, format = 'default') => {
  const cacheKey = `${date}-${format}`;

  if (dateCache.has(cacheKey)) {
    return dateCache.get(cacheKey);
  }

  let result;
  const d = new Date(date);

  switch (format) {
    case 'short':
      result = d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      break;
    case 'long':
      result = d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
      break;
    case 'time':
      result = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      break;
    case 'datetime':
      result = d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      break;
    default:
      result = d.toLocaleDateString('zh-CN');
  }

  dateCache.set(cacheKey, result);
  return result;
};

/**
 * 清理缓存（定期调用以避免内存泄漏）
 */
export const clearDateCache = () => {
  if (dateCache.size > 1000) {
    dateCache.clear();
  }
};

/**
 * 虚拟滚动计算
 */
export const calculateVisibleRange = ({
  containerHeight,
  itemHeight,
  scrollTop,
  overscan = 3
}) => {
  const startNode = Math.floor(scrollTop / itemHeight);
  const visibleNodeCount = Math.ceil(containerHeight / itemHeight);

  return {
    start: Math.max(0, startNode - overscan),
    end: startNode + visibleNodeCount + overscan
  };
};

/**
 * 优化的搜索函数（支持模糊搜索）
 */
export const fuzzySearch = (items, searchTerm, searchFields = []) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return items;
  }

  const term = searchTerm.toLowerCase().trim();

  return items.filter(item => {
    if (searchFields.length === 0) {
      // 搜索所有字段
      return Object.values(item).some(value =>
        String(value).toLowerCase().includes(term)
      );
    } else {
      // 搜索指定字段
      return searchFields.some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(term);
      });
    }
  });
};

/**
 * 防抖函数
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * 节流函数
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * 深度比较对象
 */
export const deepEqual = (obj1, obj2) => {
  if (obj1 === obj2) return true;

  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== typeof obj2) return false;

  if (typeof obj1 !== 'object') return obj1 === obj2;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
};

/**
 * 优化的分组函数
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

/**
 * 排序函数
 */
export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * 唯一值数组
 */
export const unique = (array) => {
  return Array.from(new Set(array));
};

/**
 * 数组分块
 */
export const chunk = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * 延迟函数
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 重试函数
 */
export const retry = async (fn, maxRetries = 3, delayMs = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(delayMs * (i + 1));
    }
  }
};

/**
 * 性能监控
 */
export const measurePerformance = (name, fn) => {
  if (typeof performance === 'undefined') {
    return fn();
  }

  const start = performance.now();
  const result = fn();
  const end = performance.now();

  console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  return result;
};

/**
 * 懒加载图片
 */
export const lazyLoadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = reject;
    img.src = src;
  });
};
