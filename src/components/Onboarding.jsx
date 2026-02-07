import React, { useState, useEffect, createContext, useContext } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Lightbulb, Zap, Shield, BarChart3 } from 'lucide-react';

/**
 * 新手引导上下文
 */
const OnboardingContext = createContext();

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

/**
 * 新手引导提供者
 */
export const OnboardingProvider = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(() => {
    return localStorage.getItem('lifeos_onboarding_completed') === 'true';
  });

  const startOnboarding = () => {
    setIsActive(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, onboardingSteps.length - 1));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const skipOnboarding = () => {
    setIsActive(false);
    setIsCompleted(true);
    localStorage.setItem('lifeos_onboarding_completed', 'true');
  };

  const completeOnboarding = () => {
    setIsActive(false);
    setIsCompleted(true);
    localStorage.setItem('lifeos_onboarding_completed', 'true');
  };

  const resetOnboarding = () => {
    localStorage.removeItem('lifeos_onboarding_completed');
    setIsCompleted(false);
    startOnboarding();
  };

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStep,
        isCompleted,
        startOnboarding,
        nextStep,
        prevStep,
        skipOnboarding,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
      {isActive && <OnboardingOverlay />}
    </OnboardingContext.Provider>
  );
};

/**
 * 引导步骤配置
 */
const onboardingSteps = [
  {
    id: 'welcome',
    title: '欢迎使用 LifeOS 🎉',
    description: '你的个人生活操作系统，让一切井井有条',
    content: (
      <div className="space-y-4">
        <p className="text-slate-300">
          LifeOS 是一个集<strong className="text-indigo-400">任务管理</strong>、
          <strong className="text-purple-400">知识库</strong>、
          <strong className="text-emerald-400">日记</strong>于一体的个人效率工具。
        </p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-slate-800 p-3 rounded-lg text-center">
            <Zap className="mx-auto mb-2 text-indigo-400" size={24} />
            <div className="text-xs text-slate-400">快速捕获</div>
          </div>
          <div className="bg-slate-800 p-3 rounded-lg text-center">
            <Shield className="mx-auto mb-2 text-emerald-400" size={24} />
            <div className="text-xs text-slate-400">数据安全</div>
          </div>
          <div className="bg-slate-800 p-3 rounded-lg text-center">
            <BarChart3 className="mx-auto mb-2 text-cyan-400" size={24} />
            <div className="text-xs text-slate-400">数据统计</div>
          </div>
        </div>
      </div>
    ),
    position: 'center',
    target: null,
  },
  {
    id: 'quick-capture',
    title: '快速捕获 💡',
    description: '随时随地记录你的想法和任务',
    content: (
      <div className="space-y-3">
        <p className="text-slate-300">
          点击右下角的 <strong className="text-indigo-400">+</strong> 按钮，快速创建新记录。
        </p>
        <div className="bg-slate-800 p-3 rounded-lg text-sm">
          <div className="text-yellow-400 mb-2">💡 小技巧：</div>
          <ul className="text-slate-400 space-y-1 text-xs">
            <li>• 支持 4 种类型：灵感、任务、笔记、日记</li>
            <li>• 可设置优先级：紧急、普通、不急</li>
            <li>• AI 会自动优化你的输入内容</li>
          </ul>
        </div>
        <p className="text-xs text-slate-500">快捷键：按 <kbd className="px-1 py-0.5 bg-slate-700 rounded">N</kbd> 快速新建</p>
      </div>
    ),
    position: 'bottom-right',
    target: 'quick-capture-button',
  },
  {
    id: 'inbox',
    title: '收件箱 📥',
    description: 'GTD 工作流的第一步',
    content: (
      <div className="space-y-3">
        <p className="text-slate-300">
          所有新创建的记录都会先进入收件箱。
        </p>
        <div className="bg-slate-800 p-3 rounded-lg text-sm">
          <div className="text-emerald-400 mb-2">✓ 处理流程：</div>
          <ul className="text-slate-400 space-y-1 text-xs">
            <li>1. 查看待处理的项目</li>
            <li>2. 将任务转为"待办"</li>
            <li>3. 设置优先级和方向</li>
            <li>4. 清空收件箱</li>
          </ul>
        </div>
      </div>
    ),
    position: 'left',
    target: 'nav-inbox',
  },
  {
    id: 'planner',
    title: '计划看板 📋',
    description: '管理你的任务进度',
    content: (
      <div className="space-y-3">
        <p className="text-slate-300">
          看板视图帮助你管理任务的整个生命周期。
        </p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-blue-500/20 text-blue-400 p-2 rounded text-center">待办</div>
          <div className="bg-purple-500/20 text-purple-400 p-2 rounded text-center">进行中</div>
          <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded text-center">已完成</div>
        </div>
        <p className="text-xs text-slate-500">拖拽任务卡片到不同列来更新状态</p>
      </div>
    ),
    position: 'left',
    target: 'nav-planner',
  },
  {
    id: 'knowledge',
    title: '知识库 📚',
    description: '构建你的第二大脑',
    content: (
      <div className="space-y-3">
        <p className="text-slate-300">
          存储和管理你的笔记、学习资料和灵感。
        </p>
        <div className="bg-slate-800 p-3 rounded-lg text-sm">
          <div className="text-purple-400 mb-2">📖 使用场景：</div>
          <ul className="text-slate-400 space-y-1 text-xs">
            <li>• 读书笔记</li>
            <li>• 学习资料</li>
            <li>• 项目文档</li>
            <li>• 灵感收集</li>
          </ul>
        </div>
      </div>
    ),
    position: 'left',
    target: 'nav-knowledge',
  },
  {
    id: 'stats',
    title: '数据统计 📊',
    description: '了解你的使用情况',
    content: (
      <div className="space-y-3">
        <p className="text-slate-300">
          可视化查看你的记录统计和任务完成情况。
        </p>
        <div className="bg-slate-800 p-3 rounded-lg text-sm">
          <div className="text-cyan-400 mb-2">📈 统计内容：</div>
          <ul className="text-slate-400 space-y-1 text-xs">
            <li>• 任务完成率</li>
            <li>• 记录类型分布</li>
            <li>• 7天趋势</li>
            <li>• 内容方向分布</li>
          </ul>
        </div>
      </div>
    ),
    position: 'left',
    target: 'nav-stats',
  },
  {
    id: 'keyboard',
    title: '键盘快捷键 ⌨️',
    description: '提升操作效率',
    content: (
      <div className="space-y-3">
        <p className="text-slate-300">
          使用快捷键让你事半功倍！
        </p>
        <div className="bg-slate-800 p-3 rounded-lg text-sm space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">新建记录</span>
            <kbd className="px-2 py-1 bg-slate-700 rounded">N</kbd>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">聚焦搜索</span>
            <kbd className="px-2 py-1 bg-slate-700 rounded">Cmd + K</kbd>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">关闭对话框</span>
            <kbd className="px-2 py-1 bg-slate-700 rounded">Esc</kbd>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">查看帮助</span>
            <kbd className="px-2 py-1 bg-slate-700 rounded">?</kbd>
          </div>
        </div>
      </div>
    ),
    position: 'center',
    target: null,
  },
  {
    id: 'complete',
    title: '开始使用 🚀',
    description: '你已经准备好了！',
    content: (
      <div className="space-y-4">
        <p className="text-slate-300">
          恭喜！你已经了解了 LifeOS 的核心功能。
        </p>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Check className="text-emerald-400 mt-0.5" size={20} />
            <div>
              <div className="text-emerald-400 font-medium mb-1">下一步建议：</div>
              <ul className="text-slate-400 text-sm space-y-1">
                <li>• 创建你的第一条记录</li>
                <li>• 整理收件箱</li>
                <li>• 制定今日任务计划</li>
                <li>• 查看数据统计</li>
              </ul>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 text-center">
          随时按 <kbd className="px-1 py-0.5 bg-slate-700 rounded">?</kbd> 查看帮助
        </p>
      </div>
    ),
    position: 'center',
    target: null,
  },
];

/**
 * 新手引导遮罩层组件
 */
const OnboardingOverlay = () => {
  const {
    currentStep,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
  } = useOnboarding();

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    // 高亮目标元素
    if (step.target) {
      const targetElement = document.querySelector(`[data-onboarding="${step.target}"]`);
      if (targetElement) {
        targetElement.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-950');
        return () => {
          targetElement.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-950');
        };
      }
    }
  }, [currentStep, step.target]);

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding();
    } else {
      nextStep();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <Lightbulb className="text-indigo-400" size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white">{step.title}</h3>
              <p className="text-xs text-slate-500">{step.description}</p>
            </div>
          </div>
          <button
            onClick={skipOnboarding}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            跳过
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {step.content}
        </div>

        {/* Progress */}
        <div className="px-6 pb-4">
          <div className="flex gap-2 mb-4">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-indigo-500'
                    : index < currentStep
                    ? 'bg-emerald-500'
                    : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-800 flex justify-between items-center">
          <div className="text-sm text-slate-500">
            {currentStep + 1} / {onboardingSteps.length}
          </div>
          <div className="flex gap-3">
            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                上一步
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
            >
              {isLastStep ? (
                <>
                  开始使用
                  <Check size={16} />
                </>
              ) : (
                <>
                  下一步
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 新手引导触发按钮
 */
export const OnboardingTrigger = () => {
  const { isCompleted, resetOnboarding } = useOnboarding();

  if (!isCompleted) {
    return null;
  }

  return (
    <button
      onClick={resetOnboarding}
      className="text-xs text-slate-600 hover:text-indigo-400 transition-colors flex items-center gap-1"
      title="重新查看新手引导"
    >
      <Lightbulb size={14} />
      重新引导
    </button>
  );
};

/**
 * 为元素添加引导标记的 HOC
 */
export const withOnboarding = (Component, targetId) => {
  return React.forwardRef((props, ref) => (
    <Component ref={ref} {...props} data-onboarding={targetId} />
  ));
};

export default OnboardingOverlay;
