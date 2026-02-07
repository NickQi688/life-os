/**
 * GitHub + Obsidian 存储服务
 * 将数据存储为GitHub仓库中的Markdown文件，同步到Obsidian
 */
class GitHubStorageService {
  constructor() {
    this.STORAGE_KEY = 'lifeos_github_config';
  }

  getServiceName() { return "GitHub + Obsidian"; }
  getServiceIcon() { return "🐙"; }
  getServiceId() { return "github"; }
  requiresConfig() { return true; }

  getConfig() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) { return null; }
  }

  saveConfig(config) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  }

  validateConfig(config) {
    return config?.token && config?.repo;
  }

  /**
   * 初始化示例数据
   * 首次配置时创建一些示例记录
   */
  async initSampleData() {
    const today = new Date().toISOString().split('T')[0];
    const sampleData = [
      {
        title: "欢迎使用 Life-OS 🎉",
        content: "这是你的第一条记录！Life-OS 是一个个人知识管理系统，与 Obsidian + GitHub 无缝集成。\n\n## 主要功能\n- **快速捕获**：随时随地记录想法、任务、笔记\n- **智能分类**：自动按类型和日期组织内容\n- **AI 优化**：支持 AI 自动优化内容（需配置）\n- **双向同步**：与 Obsidian 实时同步\n\n## 快速开始\n1. 点击右下角的设置按钮配置 GitHub\n2. 尝试添加一条新记录\n3. 在 Obsidian 中查看同步的 Markdown 文件",
        type: "笔记",
        direction: "个人成长",
        status: "收件箱",
        dueDate: "",
        priority: "普通",
        url: ""
      },
      {
        title: "学习 React Hooks",
        content: "## useState\n用于在函数组件中添加状态。\n\n## useEffect\n用于处理副作用，如数据获取、订阅等。\n\n## useContext\n用于跨组件共享状态。",
        type: "笔记",
        direction: "学习",
        status: "收件箱",
        dueDate: "",
        priority: "普通",
        url: ""
      },
      {
        title: "完成项目文档",
        content: "需要完成以下文档：\n- API 接口文档\n- 部署指南\n- 用户手册",
        type: "任务",
        direction: "工作",
        status: "待办",
        dueDate: today,
        priority: "紧急",
        url: ""
      },
      {
        title: "整理读书笔记",
        content: "把最近读的《原子习惯》和《深度工作》的笔记整理到知识库中。",
        type: "任务",
        direction: "个人成长",
        status: "待办",
        dueDate: today,
        priority: "普通",
        url: ""
      },
      {
        title: "探索 AI 辅助编程",
        content: "尝试使用 Claude、GitHub Copilot 等 AI 工具提高编程效率。\n\n关注点：\n- 代码生成质量\n- 学习成本\n- 实际效率提升",
        type: "灵感",
        direction: "AI",
        status: "收件箱",
        dueDate: "",
        priority: "普通",
        url: ""
      },
      {
        title: "优化前端性能",
        content: "## 性能优化清单\n\n- [ ] 代码分割\n- [ ] 图片懒加载\n- [ ] 缓存策略\n- [ ] Bundle 分析",
        type: "任务",
        direction: "提效工具",
        status: "进行中",
        dueDate: today,
        priority: "紧急",
        url: ""
      },
      {
        title: "建立晨间习惯",
        content: "## 晨间例行事项\n1. 早起 6:30\n2. 冥想 10 分钟\n3. 运动 30 分钟\n4. 阅读 20 分钟\n5. 规划当日任务",
        type: "灵感",
        direction: "生活",
        status: "已完成",
        dueDate: "",
        priority: "普通",
        url: ""
      },
      {
        title: "研究 Vite 构建工具",
        content: "Vite 是新一代前端构建工具，相比 Webpack 有更快的开发体验。\n\n## 优势\n- 极速的热更新\n- 开箱即用的 TypeScript 支持\n- 优化的生产构建",
        type: "笔记",
        direction: "提效工具",
        status: "收件箱",
        dueDate: "",
        priority: "普通",
        url: ""
      },
      {
        title: "学习 TypeScript 高级类型",
        content: "## 学习计划\n- 泛型\n- 条件类型\n- 映射类型\n- 类型推断\n\n目标：能够在项目中编写类型安全的代码。",
        type: "任务",
        direction: "学习",
        status: "待办",
        dueDate: today,
        priority: "普通",
        url: ""
      },
      {
        title: "建立知识体系框架",
        content: "## 第二大脑方法论\n\n### PARA 方法\n- **P**rojects - 正在进行的任务\n- **A**reas - 需要持续关注的领域\n- **R**esources - 未来的参考资料\n- **A**rchives - 已完成或不再活跃的内容\n\n### CODE 方法\n- **C**apture - 捕获\n- **O**rganize - 组织\n- **D**istill - 提炼\n- **E**xpress - 表达",
        type: "笔记",
        direction: "个人成长",
        status: "收件箱",
        dueDate: "",
        priority: "普通",
        url: ""
      }
    ];

    // 批量创建示例数据
    for (const data of sampleData) {
      try {
        await this.addRecord({
          ...data,
          source: "Life-OS 示例数据"
        });
        // 添加延迟避免 GitHub API 速率限制
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`创建示例数据失败: ${data.title}`, error);
      }
    }
  }

  /**
   * 获取所有记录（从GitHub读取）
   * 支持新的目录结构：01-碎片想法, 02-待办任务, 03-知识库, 04-日记
   * 同时支持根目录扫描（兼容旧数据）
   */
  async fetchRecords(options = {}) {
    const config = this.getConfig();
    if (!config || !config.token || !config.repo) {
      console.warn("GitHub未配置，返回空数据");
      return [];
    }

    const { token, repo, branch = 'main', basePath = '' } = config;

    // 定义要扫描的目录（新目录结构 + 根目录）
    const dirsToScan = [
      '', // 根目录（兼容旧数据）
      '01-碎片想法',
      '02-待办任务/今日',
      '02-待办任务/本周',
      '02-待办任务/本月',
      '02-待办任务/长期',
      '03-知识库',
      // 日记目录按年月动态生成，这里扫描当前年月
      `04-日记/${new Date().toISOString().substring(0, 4)}/${new Date().toISOString().substring(5, 7)}`
    ];

    // 记录已找到的文件（去重）
    const foundFiles = new Set();

    try {
      let allRecords = [];

      // 并行扫描所有目录
      for (const dir of dirsToScan) {
        const fullPath = `${basePath}/${dir}`.replace(/\/+/g, '/').replace(/^\//, '');

        try {
          const dirResponse = await fetch(
            `https://api.github.com/repos/${repo}/contents/${fullPath}?ref=${branch}`,
            {
              headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          );

          if (!dirResponse.ok) {
            if (dirResponse.status === 404) {
              // 目录不存在，跳过
              continue;
            }
            console.warn(`获取目录失败: ${fullPath} (${dirResponse.status})`);
            continue;
          }

          const files = await dirResponse.json();

          // 只处理 .md 文件
          const mdFiles = files.filter(file =>
            file.type === 'file' && file.name.endsWith('.md')
          );

          // 读取该目录下的所有文件
          const dirRecords = await Promise.all(
            mdFiles.map(async file => {
              try {
                // 去重：如果文件已经在其他目录找到过，跳过
                if (foundFiles.has(file.name)) {
                  return null;
                }
                foundFiles.add(file.name);

                const contentRes = await fetch(file.download_url);
                if (!contentRes.ok) return null;

                const content = await contentRes.text();
                const parsed = this.parseMarkdown(content, file.name);

                return {
                  id: file.name.replace('.md', ''),
                  fields: {
                    "标题": parsed.title || file.name,
                    "内容": parsed.content || '',
                    "状态": this.unmapStatus(parsed.status) || '收件箱',
                    "类型": parsed.type || '灵感',
                    "内容方向": parsed.direction || '未分类',
                    "记录日期": parsed.date ? new Date(parsed.date).getTime() : Date.now(),
                    "URL": parsed.url || '',
                    "截止日期": parsed.dueDate || '',
                    "优先级": parsed.priority || '普通'
                  },
                  created_time: parsed.date || new Date().toISOString()
                };
              } catch (e) {
                console.error("读取文件失败:", file.name, e);
                return null;
              }
            })
          );

          allRecords = allRecords.concat(dirRecords.filter(r => r !== null));

        } catch (error) {
          console.error(`扫描目录失败: ${fullPath}`, error);
          // 继续扫描其他目录
        }
      }

      // 按日期排序（最新的在前）
      return allRecords.sort((a, b) =>
        (b.fields["记录日期"] || 0) - (a.fields["记录日期"] || 0)
      );

    } catch (error) {
      console.error("fetchRecords error:", error);
      throw error;
    }
  }

  /**
   * 清理文件名（移除非法字符）
   */
  sanitizeFilename(title) {
    if (!title) return '无标题';
    return title
      .replace(/[<>:"/\\|?*]/g, '')        // Windows非法字符
      .replace(/\s+/g, '_')                // 空格转下划线
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9_\-]/g, '') // 只保留中文、英文、数字、下划线、连字符
      .substring(0, 50);                   // 限制长度
  }

  /**
   * 根据类型获取存储路径
   */
  getPathByType(data, dateStr) {
    const typeMap = {
      '灵感': '01-碎片想法',
      '任务': '02-待办任务',
      '笔记': '03-知识库',
      '日记': `04-日记/${dateStr.substring(0, 4)}/${dateStr.substring(5, 7)}`
    };

    const basePath = typeMap[data.type] || '01-碎片想法';

    // 任务特殊处理：根据截止日期分类
    if (data.type === '任务' && data.dueDate) {
      const dueDate = new Date(data.dueDate);
      const today = new Date();
      const diffDays = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return `${basePath}/今日`;
      if (diffDays <= 7) return `${basePath}/本周`;
      if (diffDays <= 30) return `${basePath}/本月`;
      return `${basePath}/长期`;
    }

    return basePath;
  }

  /**
   * 自动提取标签
   */
  extractTags(data) {
    const tags = [];

    // 1. 基于内容方向的标签
    const directionTags = {
      'AI': '#AI',
      '创业': '#创业',
      '投资': '#投资',
      '个人成长': '#成长',
      '工具': '#工具',
      '提效工具': '#工具',
      '新媒体': '#新媒体',
      '工作': '#工作',
      '金句': '#金句',
      '生活': '#生活',
      '学习': '#学习'
    };
    if (data.direction && directionTags[data.direction]) {
      tags.push(directionTags[data.direction]);
    }

    // 2. 基于URL平台的标签
    if (data.url) {
      if (data.url.includes('x.com') || data.url.includes('twitter')) {
        tags.push('#Twitter');
      } else if (data.url.includes('mp.weixin.qq.com')) {
        tags.push('#微信');
      } else if (data.url.includes('xiaohongshu.com')) {
        tags.push('#小红书');
      } else if (data.url.includes('zhihu.com')) {
        tags.push('#知乎');
      } else if (data.url.includes('bilibili.com')) {
        tags.push('#B站');
      }
    }

    // 3. 基于类型的标签
    const typeTags = {
      '灵感': '#灵感',
      '任务': '#任务',
      '笔记': '#笔记',
      '日记': '#日记'
    };
    if (data.type && typeTags[data.type]) {
      tags.push(typeTags[data.type]);
    }

    return [...new Set(tags)]; // 去重
  }

  /**
   * 添加新记录
   */
  async addRecord(data) {
    const config = this.getConfig();
    if (!config || !config.token || !config.repo) {
      throw new Error("请先配置 GitHub Token 和 仓库地址");
    }

    const { token, repo, branch = 'main', basePath = '' } = config;

    // 1. 准备日期
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // 2. 清理文件名（标题_日期.md）
    const sanitizedTitle = this.sanitizeFilename(data.title || '无标题');
    const fileName = `${sanitizedTitle}_${dateStr}.md`;

    // 3. 根据类型确定目录
    const typePath = this.getPathByType(data, dateStr);

    // 4. 生成完整路径（过滤掉空的部分，避免开头的 /）
    const parts = [basePath, typePath, fileName].filter(Boolean);
    const fullPath = parts.join('/');

    // 5. 自动提取标签
    const tags = this.extractTags(data);

    // 6. 构造 Markdown 内容（增强版）
    const markdownContent = `---
title: "${data.title || '无标题'}"
date: ${dateStr}
type: "${data.type || '灵感'}"
source: "${data.source || 'Life-OS'}"
status: "${this.mapStatus(data.status) || 'inbox'}"
${data.direction ? `direction: "${data.direction}"` : ''}
${data.url ? `url: "${data.url}"` : ''}
${data.dueDate ? `dueDate: "${data.dueDate}"` : ''}
${data.priority ? `priority: "${data.priority}"` : ''}
${tags.length > 0 ? `tags: [${tags.map(t => `"${t}"`).join(', ')}]` : ''}
---

${data.content || ''}

---
*Generated by Life-OS at ${now.toLocaleString()}*
${data.url ? `\n原文链接: ${data.url}\n` : ''}
${tags.length > 0 ? `\n标签: ${tags.join(' ')}\n` : ''}
`;

    // 3. 检查内容大小
    const contentSize = new Blob([markdownContent]).size;
    if (contentSize > 1024 * 1024) {
      throw new Error(`内容过大 (${(contentSize / 1024).toFixed(0)}KB)，GitHub API 限制为 1MB`);
    }

    const contentBase64 = btoa(unescape(encodeURIComponent(markdownContent)));

    // 9. 调用 GitHub API（带重试机制）
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`https://api.github.com/repos/${repo}/contents/${fullPath}`, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Add new ${data.type || '灵感'} via Life-OS: ${data.title}`,
            content: contentBase64,
            branch: branch
          })
        });

        if (!response.ok) {
          const error = await response.json();

          // 详细的错误分类
          if (response.status === 401) {
            throw new Error("GitHub Token 无效或已过期，请重新配置");
          } else if (response.status === 403) {
            if (error.message && error.message.includes('rate limit')) {
              throw new Error("GitHub API 请求超限，请稍后再试");
            } else {
              throw new Error("GitHub Token 权限不足，需要 repo 权限");
            }
          } else if (response.status === 404) {
            throw new Error(`仓库或路径不存在: ${repo}/${fullPath}`);
          } else if (response.status === 422) {
            throw new Error(`验证失败: ${error.message}`);
          } else {
            throw new Error(`GitHub API Error (${response.status}): ${error.message || '未知错误'}`);
          }
        }

        return await response.json();

      } catch (error) {
        lastError = error;

        // 如果不是网络错误，直接抛出（不重试）
        if (!error.message.includes('fetch') && !error.message.includes('network')) {
          throw error;
        }

        // 最后一次尝试失败，抛出错误
        if (attempt === maxRetries) {
          throw new Error(`网络请求失败，已重试 ${maxRetries} 次: ${error.message}`);
        }

        // 等待后重试（指数退避）
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }

    throw lastError;
  }

  /**
   * 更新记录（支持跨目录移动）
   * 例如：从"灵感"改为"任务"时，文件会移动到02-待办任务目录
   */
  async updateRecord(recordId, fields) {
    const config = this.getConfig();
    if (!config || !config.token || !config.repo) {
      throw new Error("请先配置 GitHub Token 和 仓库地址");
    }

    const { token, repo, branch = 'main', basePath = '' } = config;

    // 1. 查找原文件路径
    const oldPath = await this.findFilePath(recordId);
    if (!oldPath) {
      throw new Error(`找不到文件: ${recordId}`);
    }

    // 2. 获取原文件内容和SHA
    const oldFileResponse = await fetch(
      `https://api.github.com/repos/${repo}/contents/${oldPath}?ref=${branch}`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!oldFileResponse.ok) {
      throw new Error(`无法读取原文件: ${recordId}`);
    }

    const oldFileData = await oldFileResponse.json();
    const oldSha = oldFileData.sha;

    // 3. 解析原文件获取日期（保持原有日期）
    const oldContent = decodeURIComponent(escape(atob(oldFileData.content.replace(/\n/g, ''))));
    const parsed = this.parseMarkdown(oldContent, recordId);
    const dateStr = parsed.date || new Date().toISOString().split('T')[0];

    // 4. 根据新类型确定新路径
    const newType = fields["类型"] || parsed.type || '灵感';
    const typePath = this.getPathByType({ type: newType, dueDate: fields["截止日期"] }, dateStr);
    const sanitizedTitle = this.sanitizeFilename(fields["标题"] || parsed.title || '无标题');
    const newFileName = `${sanitizedTitle}_${dateStr}.md`;
    const newPath = `${basePath}/${typePath}/${newFileName}`.replace(/\/+/g, '/').replace(/^\//, '');

    // 5. 构造新的Markdown内容
    const tags = this.extractTags({
      direction: fields["内容方向"] || parsed.direction,
      url: fields["URL"] || parsed.url,
      type: newType
    });

    const markdownContent = `---
title: "${fields["标题"] || parsed.title || '无标题'}"
date: ${dateStr}
type: "${newType}"
source: "${parsed.source || 'Life-OS'}"
status: "${this.mapStatus(fields["状态"]) || parsed.status || 'inbox'}"
${fields["内容方向"] || parsed.direction ? `direction: "${fields["内容方向"] || parsed.direction}"` : ''}
${fields["URL"] || parsed.url ? `url: "${fields["URL"] || parsed.url}"` : ''}
${fields["截止日期"] ? `dueDate: "${fields["截止日期"]}"` : parsed.dueDate ? `dueDate: "${parsed.dueDate}"` : ''}
${fields["优先级"] ? `priority: "${fields["优先级"]}"` : parsed.priority ? `priority: "${parsed.priority}"` : ''}
${tags.length > 0 ? `tags: [${tags.map(t => `"${t}"`).join(', ')}]` : ''}
---

${fields["内容"] !== undefined ? fields["内容"] : parsed.content || ''}

---
*Updated by Life-OS at ${new Date().toLocaleString()}*
${fields["URL"] || parsed.url ? `\n原文链接: ${fields["URL"] || parsed.url}\n` : ''}
${tags.length > 0 ? `\n标签: ${tags.join(' ')}\n` : ''}
`;

    const contentBase64 = btoa(unescape(encodeURIComponent(markdownContent)));

    // 6. 如果路径变了，需要先删除旧文件，再创建新文件
    if (oldPath !== newPath) {
      // 删除旧文件
      await fetch(`https://api.github.com/repos/${repo}/contents/${oldPath}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Move record via Life-OS: ${fields["标题"] || parsed.title}`,
          sha: oldSha,
          branch: branch
        })
      });

      // 创建新文件（不需要SHA）
      const createResponse = await fetch(`https://api.github.com/repos/${repo}/contents/${newPath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update record via Life-OS: ${fields["标题"] || parsed.title}`,
          content: contentBase64,
          branch: branch
        })
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(`创建新文件失败: ${error.message}`);
      }

      return await createResponse.json();
    } else {
      // 7. 路径没变，直接更新文件（需要SHA）
      const updateResponse = await fetch(`https://api.github.com/repos/${repo}/contents/${newPath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update record via Life-OS: ${fields["标题"] || parsed.title}`,
          content: contentBase64,
          branch: branch,
          sha: oldSha
        })
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(`更新失败: ${error.message}`);
      }

      return await updateResponse.json();
    }
  }

  /**
   * 删除记录（在所有目录中查找文件）
   */
  async deleteRecord(recordId) {
    const config = this.getConfig();
    if (!config || !config.token || !config.repo) {
      throw new Error("请先配置 GitHub Token 和 仓库地址");
    }

    const { token, repo, branch = 'main' } = config;

    // 1. 查找文件路径
    const filePath = await this.findFilePath(recordId);
    if (!filePath) {
      throw new Error(`找不到文件: ${recordId}`);
    }

    // 2. 获取文件SHA
    const checkResponse = await fetch(
      `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!checkResponse.ok) {
      throw new Error("文件不存在或无权访问");
    }

    const existingFile = await checkResponse.json();
    const sha = existingFile.sha;

    // 3. 删除文件
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Delete record via Life-OS: ${recordId}`,
        sha: sha,
        branch: branch
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`删除失败: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * 解析Markdown文件（含YAML frontmatter）
   */
  parseMarkdown(markdown, fileName) {
    // 解析YAML frontmatter
    const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
      // 没有frontmatter，直接返回内容
      return { title: fileName, content: markdown };
    }

    const frontmatter = {};
    match[1].split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim()
          .replace(/^["']|["']$/g, ''); // 去除引号
        frontmatter[key] = value;
      }
    });

    return {
      title: frontmatter.title,
      content: match[2].trim(),
      status: frontmatter.status,
      type: frontmatter.type,
      direction: frontmatter.direction,
      date: frontmatter.date,
      url: frontmatter.url,
      dueDate: frontmatter.dueDate,
      priority: frontmatter.priority
    };
  }

  /**
   * 状态映射（中文 -> 英文）
   */
  mapStatus(status) {
    const statusMap = {
      '收件箱': 'inbox',
      '待办': 'todo',
      '进行中': 'doing',
      '已完成': 'done',
      'inbox': 'inbox',
      'todo': 'todo',
      'doing': 'doing',
      'done': 'done'
    };
    return statusMap[status] || status;
  }

  /**
   * 状态反向映射（英文 -> 中文）
   */
  unmapStatus(status) {
    const statusMap = {
      'inbox': '收件箱',
      'todo': '待办',
      'doing': '进行中',
      'done': '已完成',
      '收件箱': '收件箱',
      '待办': '待办',
      '进行中': '进行中',
      '已完成': '已完成'
    };
    return statusMap[status] || status;
  }

  /**
   * 查找文件的完整路径
   * 在所有可能的目录中搜索文件（包括根目录）
   */
  async findFilePath(recordId) {
    const config = this.getConfig();
    const { token, repo, branch = 'main', basePath = '' } = config;

    // 可能的目录（包括根目录）
    const dirsToSearch = [
      '', // 根目录（兼容旧数据）
      '01-碎片想法',
      '02-待办任务/今日',
      '02-待办任务/本周',
      '02-待办任务/本月',
      '02-待办任务/长期',
      '03-知识库',
      `04-日记/${new Date().toISOString().substring(0, 4)}/${new Date().toISOString().substring(5, 7)}`
    ];

    for (const dir of dirsToSearch) {
      const fullPath = dir
        ? `${basePath}/${dir}/${recordId}.md`.replace(/\/+/g, '/').replace(/^\//, '')
        : `${basePath}/${recordId}.md`.replace(/\/+/g, '/').replace(/^\//, '');

      try {
        const response = await fetch(
          `https://api.github.com/repos/${repo}/contents/${fullPath}?ref=${branch}`,
          {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (response.ok) {
          return fullPath; // 找到了！
        }
      } catch (error) {
        // 继续搜索下一个目录
        continue;
      }
    }

    return null; // 未找到
  }
}

export default GitHubStorageService;
