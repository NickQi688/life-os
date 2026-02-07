/**
 * 存储服务抽象基类
 * 统一接口，支持多种后端（飞书、GitHub等）
 */
class StorageService {
  constructor() {
    if (this.constructor === StorageService) {
      throw new Error("StorageService是抽象类，不能直接实例化");
    }
  }

  // ========== 元数据 ==========
  getServiceName() { throw new Error("必须实现getServiceName()"); }
  getServiceIcon() { throw new Error("必须实现getServiceIcon()"); }
  getServiceId() { throw new Error("必须实现getServiceId()"); }
  requiresConfig() { return true; }

  // ========== 配置管理 ==========
  getConfig() { throw new Error("必须实现getConfig()"); }
  saveConfig(config) { throw new Error("必须实现saveConfig()"); }
  validateConfig(config) { throw new Error("必须实现validateConfig()"); }

  // ========== CRUD操作 ==========
  async fetchRecords(options = {}) { throw new Error("必须实现fetchRecords()"); }
  async addRecord(data) { throw new Error("必须实现addRecord()"); }
  async updateRecord(recordId, fields) { throw new Error("必须实现updateRecord()"); }
  async deleteRecord(recordId) { throw new Error("必须实现deleteRecord()"); }

  // ========== 高级功能（可选，有默认实现） ==========
  async batchUpdate(updates) {
    return Promise.all(updates.map(u => this.updateRecord(u.id, u.fields)));
  }

  async searchRecords(query) {
    const allRecords = await this.fetchRecords();
    return allRecords.filter(r =>
      JSON.stringify(r).toLowerCase().includes(query.toLowerCase())
    );
  }

  async getStats() {
    const records = await this.fetchRecords();
    return {
      total: records.length,
      inbox: records.filter(r => r.fields["状态"] === "收件箱").length,
      todo: records.filter(r => r.fields["状态"] === "待办").length,
      doing: records.filter(r => r.fields["状态"] === "进行中").length,
      done: records.filter(r => r.fields["状态"] === "已完成").length,
    };
  }
}

export default StorageService;
