/**
 * 存储服务工厂
 * 统一管理所有存储后端
 */
import GitHubStorageService from './GitHubStorageService.js';

class StorageServiceFactory {
  static services = {
    'github': GitHubStorageService,
    // 'feishu': FeishuStorageService, // 待添加
  };

  /**
   * 创建服务实例
   */
  static createService(type) {
    const ServiceClass = this.services[type];
    if (!ServiceClass) {
      throw new Error(`不支持的存储类型: ${type}`);
    }
    return new ServiceClass();
  }

  /**
   * 获取所有可用服务
   */
  static getAvailableServices() {
    return Object.entries(this.services).map(([key, ServiceClass]) => {
      const instance = new ServiceClass();
      return {
        id: key,
        name: instance.getServiceName(),
        icon: instance.getServiceIcon(),
        requiresConfig: instance.requiresConfig()
      };
    });
  }

  /**
   * 根据配置自动选择服务
   */
  static getServiceFromConfig(config) {
    if (!config || !config.backendType) {
      // 默认返回GitHub服务
      return this.createService('github');
    }
    return this.createService(config.backendType);
  }
}

export default StorageServiceFactory;
