/**
 * Life-OS GitHub 配置诊断工具
 * 使用方法：
 * 1. 在浏览器中打开 Life-OS 网站
 * 2. 打开开发者工具（F12）→ Console 标签
 * 3. 将此文件内容复制粘贴到控制台并按回车
 */

(function() {
  console.log('🔍 Life-OS GitHub 配置诊断工具');
  console.log('========================================\n');

  // 1. 检查 localStorage 配置
  console.log('📋 步骤 1: 检查 localStorage 配置');
  console.log('----------------------------------------');

  const STORAGE_KEY = 'lifeos_github_config';
  const configStr = localStorage.getItem(STORAGE_KEY);

  if (!configStr) {
    console.error('❌ 未找到配置！');
    console.log('   请先在 Life-OS 网站上配置 GitHub Token 和仓库地址。');
    return;
  }

  console.log('✅ 找到配置:');
  let config;
  try {
    config = JSON.parse(configStr);
    console.log('   Token:', config.token ? `${config.token.substring(0, 10)}...` : '❌ 缺失');
    console.log('   仓库:', config.repo || '❌ 缺失');
    console.log('   分支:', config.branch || 'main (默认)');
    console.log('   路径:', config.basePath || '(根目录)');
  } catch (e) {
    console.error('❌ 配置解析失败:', e);
    return;
  }

  // 2. 验证配置完整性
  console.log('\n🔍 步骤 2: 验证配置完整性');
  console.log('----------------------------------------');

  if (!config.token) {
    console.error('❌ GitHub Token 未配置');
    console.log('   请在设置中填写 GitHub Token');
    return;
  }
  if (!config.repo) {
    console.error('❌ 仓库地址未配置');
    console.log('   请在设置中填写仓库地址（格式: 用户名/仓库名）');
    return;
  }

  console.log('✅ 配置完整');

  // 3. 测试 GitHub API 连接
  console.log('\n🌐 步骤 3: 测试 GitHub API 连接');
  console.log('----------------------------------------');

  const testConnection = async () => {
    try {
      const response = await fetch(`https://api.github.com/repos/${config.repo}`, {
        headers: {
          'Authorization': `token ${config.token}`,
        }
      });

      if (response.ok) {
        const repoInfo = await response.json();
        console.log('✅ GitHub API 连接成功！');
        console.log('   仓库名称:', repoInfo.full_name);
        console.log('   默认分支:', repoInfo.default_branch);
        console.log('   私有仓库:', repoInfo.private ? '是' : '否');
        return true;
      } else {
        const error = await response.json();
        console.error('❌ GitHub API 错误:', response.status);
        console.error('   消息:', error.message);
        return false;
      }
    } catch (e) {
      console.error('❌ 网络错误:', e.message);
      return false;
    }
  };

  // 4. 扫描仓库文件
  const scanRepository = async () => {
    console.log('\n📁 步骤 4: 扫描仓库文件');
    console.log('----------------------------------------');

    const branch = config.branch || 'main';
    const pathsToScan = [
      '', // 根目录
      '01-碎片想法',
      '02-待办任务',
      '03-知识库',
      '04-日记'
    ];

    let totalFiles = 0;
    let totalDirs = 0;

    for (const path of pathsToScan) {
      const fullPath = path ? `${config.basePath}/${path}`.replace(/^\/+/, '') : (config.basePath || '');

      try {
        const url = `https://api.github.com/repos/${config.repo}/contents/${fullPath}?ref=${branch}`;
        console.log(`   扫描: ${fullPath || '(根目录)'}`);

        const response = await fetch(url, {
          headers: {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const mdFiles = data.filter(item => item.type === 'file' && item.name.endsWith('.md'));
          const dirs = data.filter(item => item.type === 'dir');

          console.log(`   ✅ 找到 ${mdFiles.length} 个 Markdown 文件`);
          if (dirs.length > 0) {
            console.log(`   📂 子目录: ${dirs.map(d => d.name).join(', ')}`);
          }

          totalFiles += mdFiles.length;
          totalDirs += dirs.length;
        } else if (response.status === 404) {
          console.log(`   ⚠️ 路径不存在: ${fullPath || '(根目录)'}`);
        } else {
          console.warn(`   ⚠️ 扫描失败 (${response.status}): ${fullPath}`);
        }
      } catch (e) {
        console.error(`   ❌ 请求失败:`, e.message);
      }
    }

    console.log(`\n📊 统计: 共找到 ${totalFiles} 个 Markdown 文件`);

    if (totalFiles === 0) {
      console.log('\n💡 建议: 仓库中没有 Markdown 文件，可能的原因:');
      console.log('   1. 这是一个新仓库，还没有创建任何记录');
      console.log('   2. Life-OS 的文件存储在其他目录');
      console.log('   3. 文件扩展名不是 .md');
      console.log('\n   解决方案: 在 Life-OS 网站上创建一条新记录试试');
    }

    return totalFiles;
  };

  // 5. 生成诊断报告
  const generateReport = async () => {
    console.log('\n📋 步骤 5: 生成诊断报告');
    console.log('----------------------------------------');

    const connected = await testConnection();
    const fileCount = await scanRepository();

    console.log('\n🎯 诊断结果:');
    console.log('========================================');

    if (connected && fileCount > 0) {
      console.log('✅ 配置正常！');
      console.log(`   仓库中有 ${fileCount} 条记录`);
      console.log('\n   如果网站仍显示 0 条数据，请尝试:');
      console.log('   1. 刷新页面 (Ctrl+R 或 Cmd+R)');
      console.log('   2. 清除浏览器缓存后重试');
      console.log('   3. 检查浏览器控制台是否有其他错误');
    } else if (connected && fileCount === 0) {
      console.log('⚠️  配置正确，但仓库为空');
      console.log('   建议: 在 Life-OS 网站上创建一条新记录');
    } else if (!connected) {
      console.log('❌ GitHub 连接失败');
      console.log('   请检查:');
      console.log('   1. Token 是否正确');
      console.log('   2. Token 是否有 repo 权限');
      console.log('   3. 仓库名称是否正确 (格式: 用户名/仓库名)');
    }

    console.log('\n📞 需要帮助?');
    console.log('   将此诊断截图并发送给开发者');
  };

  // 执行诊断
  generateReport().catch(e => {
    console.error('诊断过程中出错:', e);
  });

  // 返回工具函数供手动使用
  return {
    config: config,
    clearConfig: () => {
      localStorage.removeItem(STORAGE_KEY);
      console.log('✅ 配置已清除，请刷新页面重新配置');
    },
    scanFiles: scanRepository
  };
})();
