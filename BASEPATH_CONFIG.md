# basePath 配置完成！

## 现在的设置界面

在 Life-OS 网站设置中，现在有 **4 个配置项**：

1. **GitHub Token** - 你的 GitHub Personal Access Token
2. **仓库** - 用户名/仓库名（如: a2222/my-note）
3. **分支** - 默认 main
4. **存储路径 (basePath)** ⭐ **新增！**

---

## 如何配置 basePath

### 方案 A：使用 lifeos 子目录（推荐）

```
存储路径 (basePath): lifeos
```

**文件保存位置：**
```
my-note/
└── lifeos/
    ├── 01-碎片想法/
    ├── 02-待办任务/
    ├── 03-知识库/
    └── 04-日记/
```

**优势：**
- Life-OS 快速捕获的内容独立管理
- 不干扰你的 TELOS、项目复盘等核心体系
- 定期整理有价值内容到其他目录

---

### 方案 B：直接使用根目录

```
存储路径 (basePath): （留空）
```

**文件保存位置：**
```
my-note/
├── 01-碎片想法/
├── 02-待办任务/
├── 03-知识库/
└── 04-日记/
```

**注意：** 这会直接在根目录创建文件夹，可能与现有内容混合

---

## 配置步骤

### 1. 如果网站已部署

1. 打开 Life-OS 网站
2. 进入设置
3. 填写 **存储路径 (basePath)**：
   - 推荐填写：`lifeos`
   - 或留空使用根目录
4. 点击"保存并连接"

### 2. 如果是本地开发

```bash
cd life-os-main

# 重新构建（如果需要）
npm run build

# 或直接启动开发服务器
npm run dev
```

---

## 验证配置

### 方法 1：检查 localStorage

在浏览器控制台输入：
```javascript
JSON.parse(localStorage.getItem('lifeos_github_config'))
```

**正确输出应包含：**
```json
{
  "token": "ghp_...",
  "repo": "a2222/my-note",
  "branch": "main",
  "basePath": "lifeos"    ← 应该有你设置的值
}
```

### 方法 2：在 GitHub 查看文件

配置并创建一条记录后，检查仓库：
```
a2222/my-note/
└── lifeos/          ← 如果 basePath="lifeos"
    └── 01-碎片想法/
        └── 新记录_2026-02-12.md
```

### 方法 3：在本地查看

```bash
cd ~/Documents/qukuaiqiji/my-note
ls -la lifeos/01-碎片想法/
```

---

## 代码修改总结

已修改 `src/App.jsx`：

1. ✅ 添加 `githubBasePath` 到 formData 状态
2. ✅ 在设置界面添加 basePath 输入框
3. ✅ 更新保存配置逻辑使用 `formData.githubBasePath`
4. ✅ 更新测试连接逻辑使用 `formData.githubBasePath`

---

## 推荐配置

```
GitHub Token:     ghp_xxxxxxxxxxxxxxxxxxxxxx
仓库名称:         a2222/my-note
分支:             main
存储路径 basePath:  lifeos           ← 填这个！
```

配置后：
- ✅ Life-OS 记录保存到 `my-note/lifeos/`
- ✅ 定期整理有价值内容到 `TELOS/` 或 `项目复盘/`
- ✅ 保持 lifeos 作为"快速收件箱"轻量状态
