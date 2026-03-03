/**
 * 优化的飞书服务 - 带缓存、重试和性能优化
 */

class OptimizedFeishuService {
  constructor(baseService) {
    this.base = baseService;
    this.cache = new Map();
    this.cacheConfig = {
      maxSize: 100,
      ttl: 5 * 60 * 1000, // 5分钟
    };
    this.pendingRequests = new Map();
  }

  /**
   * 生成缓存键
   */
  getCacheKey(prefix, params) {
    return `${prefix}:${JSON.stringify(params)}`;
  }

  /**
   * 检查缓存是否有效
   */
  isCacheValid(entry) {
    if (!entry) return false;
    return Date.now() - entry.timestamp < this.cacheConfig.ttl;
  }

  /**
   * 获取缓存
   */
  getCache(key) {
    const entry = this.cache.get(key);
    if (this.isCacheValid(entry)) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * 设置缓存
   */
  setCache(key, data) {
    // 如果缓存太大，清理最旧的条目
    if (this.cache.size >= this.cacheConfig.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 清除过期缓存
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheConfig.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 重试函数
   */
  async retry(fn, maxRetries = 3, delayMs = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  /**
   * 带缓存的请求
   */
  async cachedRequest(key, requestFn) {
    // 尝试从缓存获取
    const cached = this.getCache(key);
    if (cached) {
      return cached;
    }

    // 检查是否有正在进行的请求
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // 发起新请求
    const promise = this.retry(requestFn)
      .then(data => {
        this.setCache(key, data);
        return data;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * 优化的获取记录
   */
  async fetchRecords(options = {}) {
    const { useCache = true, forceRefresh = false } = options;
    const cacheKey = this.getCacheKey('records', {});

    if (useCache && !forceRefresh) {
      const cached = this.getCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const data = await this.retry(() => this.base.fetchRecords());
    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * 优化的添加记录
   */
  async addRecord(data) {
    const result = await this.retry(() => this.base.addRecord(data));

    // 清除相关缓存
    this.clearCache();

    return result;
  }

  /**
   * 优化的更新记录
   */
  async updateRecord(recordId, fields) {
    const result = await this.retry(() => this.base.updateRecord(recordId, fields));

    // 清除相关缓存
    this.clearCache();

    return result;
  }

  /**
   * 优化的删除记录
   */
  async deleteRecord(recordId) {
    const result = await this.retry(() => this.base.deleteRecord(recordId));

    // 清除相关缓存
    this.clearCache();

    return result;
  }

  /**
   * 批量操作
   */
  async batchUpdate(updates) {
    const results = await Promise.allSettled(
      updates.map(update => this.updateRecord(update.id, update.fields))
    );

    this.clearCache();

    return results;
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cacheConfig.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * 预加载数据
   */
  async preload() {
    try {
      await this.fetchRecords();
      return true;
    } catch (error) {
      console.error('Preload failed:', error);
      return false;
    }
  }
}

export default OptimizedFeishuService;
