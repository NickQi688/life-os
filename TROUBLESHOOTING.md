# Life-OS GitHub 同步问题诊断与解决

## 问题描述
你已经在 Life-OS 网站上配置了 GitHub，但网站显示 "0 条数据"。

---

## 诊断步骤

### 方法 1: 使用浏览器控制台诊断（推荐）

1. **打开 Life-OS 网站**
2. **打开浏览器开发者工具**
   - Windows/Linux: 按 `F12` 或 `Ctrl + Shift + J`
   - Mac: 按 `Cmd + Option + J`
3. **切换到 Console（控制台）标签**
4. **运行诊断脚本**
   ```bash
   # 在控制台中粘贴以下代码并回车
   fetch('life-os-main/debug-config.js')
     .then(r => r.text())
     .then(eval)
   ```
   或者直接复制 `life-os-main/debug-config.js` 文件的内容到控制台

---

### 方法 2: 手动检查配置

#### 步骤 1: 检查 localStorage

在浏览器控制台输入：

```javascript
JSON.parse(localStorage.getItem('lifeos_github_config'))
```

**预期输出示例：**
```json
{
  "token": "ghp_xxxxxxxxxxxxxxxxxxxx",
  "repo": "username/my-note",
  "branch": "main",
  "basePath": ""
}
```

**如果输出 `null`：**
- 说明配置未保存，请重新在网站上配置

**如果 `token` 或 `repo` 为空：**
- 说明配置不完整，请补全

---

#### 步骤 2: 测试 GitHub Token 权限

在浏览器控制台输入：

```javascript
const config = JSON.parse(localStorage.getItem('lifeos_github_config'));
fetch('https://api.github.com/user/repos', {
  headers: { 'Authorization': `token ${config.token}` }
}).then(r => {
  if (r.ok) {
    console.log('✅ Token 有效');
  } else {
    console.log('❌ Token 无效或权限不足');
  }
});
```

**如果显示 "Token 无效"：**
1. 前往 https://github.com/settings/tokens
2. 生成新的 Personal Access Token
3. 确保勾选 `repo` 权限
4. 在 Life-OS 设置中更新 Token

---

#### 步骤 3: 检查仓库是否可访问

在浏览器控制台输入：

```javascript
const config = JSON.parse(localStorage.getItem('lifeos_github_config'));
fetch(`https://api.github.com/repos/${config.repo}`, {
  headers: { 'Authorization': `token ${config.token}` }
}).then(r => r.json()).then(repo => {
  console.log('仓库名:', repo.full_name);
  console.log('默认分支:', repo.default_branch);
  console.log('是否私有:', repo.private);
});
```

**如果显示 404 错误：**
- 检查仓库名称格式是否为 `用户名/仓库名`
- 确认仓库确实存在

---

#### 步骤 4: 检查仓库中的 Markdown 文件

在浏览器控制台输入：

```javascript
const config = JSON.parse(localStorage.getItem('lifeos_github_config'));
const branch = config.branch || 'main';

// 扫描根目录
fetch(`https://api.github.com/repos/${config.repo}/contents/?ref=${branch}`, {
  headers: { 'Authorization': `token ${config.token}` }
}).then(r => r.json()).then(files => {
  const mdFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.md'));
  const dirs = files.filter(f => f.type === 'dir');
  console.log('根目录 Markdown 文件:', mdFiles.length);
  console.log('子目录:', dirs.map(d => d.name));

  // 扫描 01-碎片想法 目录
  return fetch(`https://api.github.com/repos/${config.repo}/contents/01-碎片想法?ref=${branch}`, {
    headers: { 'Authorization': `token ${config.token}` }
  });
}).then(r => r.json()).then(data => {
  if (Array.isArray(data)) {
    const mdFiles = data.filter(f => f.type === 'file' && f.name.endsWith('.md'));
    console.log('01-碎片想法 目录文件数:', mdFiles.length);
  } else {
    console.log('01-碎片想法 目录不存在');
  }
});
```

**如果所有目录都显示 0 文件：**
- 这是一个新仓库，需要在 Life-OS 网站上创建记录

**如果目录不存在：**
- 首次使用时正常，创建记录后会自动创建目录

---

## 常见问题解决

### Q1: 配置保存后刷新页面，配置丢失

**原因:** 浏览器隐私模式或 Cookie 设置阻止了 localStorage

**解决方案:**
1. 退出浏览器的隐私/无痕模式
2. 检查浏览器设置，确保允许网站使用 localStorage
3. 检查浏览器扩展（如广告屏蔽器）是否阻止了 localStorage

---

### Q2: Token 和仓库都正确，但仍然显示 0 数据

**原因:** 仓库是空的或文件路径不匹配

**解决方案:**

**方案 A - 在 Life-OS 中创建第一条记录：**
1. 打开 Life-OS 网站
2. 点击右下角 `+` 按钮
3. 输入标题和内容
4. 点击发送
5. 刷新页面查看

**方案 B - 手动在 GitHub 中创建文件：**
1. 访问你的 GitHub 仓库
2. 创建新文件 `test.md`
3. 内容填写任何内容
4. 刷新 Life-OS 页面

---

### Q3: GitHub Token 权限不足

**症状:** 控制台显示 `403 Forbidden` 或 `resource not accessible`

**解决方案:**
1. 访问 https://github.com/settings/tokens
2. 检查 Token 权限是否勾选了 `repo`（完整仓库访问权限）
3. 如果没有，重新生成一个勾选了 `repo` 的 Token

---

### Q4: 仓库名称格式错误

**正确格式:** `username/repository-name`
**错误格式:**
- ❌ `https://github.com/username/repository-name`
- ❌ `github.com/username/repository-name`
- ❌ `repository-name`

---

## 快速验证流程

1. **在浏览器控制台运行:**
   ```javascript
   console.log(JSON.parse(localStorage.getItem('lifeos_github_config')))
   ```

2. **检查输出:**
   - ✅ 有 token 和 repo → 继续下一步
   - ❌ null 或缺少字段 → 重新配置

3. **测试 API 连接:**
   ```javascript
   const c = JSON.parse(localStorage.getItem('lifeos_github_config'));
   fetch(`https://api.github.com/repos/${c.repo}`, {headers: { 'Authorization': `token ${c.token}` }})
     .then(r => r.ok ? console.log('✅ 连接成功') : console.log('❌ 连接失败'))
   ```

4. **在 Life-OS 中创建测试记录:**
   - 点击 `+` 按钮
   - 输入 "测试记录"
   - 发送
   - 刷新页面

---

## 与 Obsidian 同步配置

### 确保 Obsidian 仓库目录结构

Life-OS 期望以下目录结构（可在 GitHub 设置中自定义路径）：

```
你的仓库/
├── 01-碎片想法/          # 灵感类型
├── 02-待办任务/
│   ├── 今日/            # 截止日期为今天
│   ├── 本周/            # 截止日期在本周
│   ├── 本月/            # 截止日期在本月
│   └── 长期/            # 无截止日期或长期任务
├── 03-知识库/            # 笔记类型
└── 04-日记/              # 日记类型
    ├── 2026/
    │   └── 02/           # 按年月组织
    └── ...
```

### Obsidian 同步设置

1. **安装 Git 插件** (Obsidian):
   - 在 Obsidian 中安装 "Obsidian Git" 插件
   - 或使用命令行 `git pull` 定期同步

2. **配置自动同步:**
   - 设置自动同步间隔（如每 5 分钟）
   - 或设置保存时自动提交

---

## 需要更多帮助？

如果以上步骤都无法解决问题，请提供以下信息：

1. 浏览器控制台的错误信息
2. `localStorage.getItem('lifeos_github_config')` 的输出
3. 网络请求的详细信息（Network 标签）

---

**最后更新:** 2026-02-12
