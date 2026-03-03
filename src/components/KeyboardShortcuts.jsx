import React, { useState, useEffect } from 'react';
import { X, Command } from 'lucide-react';

/**
 * 键盘快捷键提示组件
 */
export const KeyboardShortcut = ({ keys, className = '' }) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-slate-600 text-xs mx-0.5">+</span>}
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-400 font-mono">
            {key === 'Cmd' ? (isMac ? '⌘' : 'Ctrl') : key}
          </kbd>
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * 键盘快捷键帮助面板
 */
export const KeyboardHelp = ({ isOpen, onClose, shortcuts = [] }) => {
  if (!isOpen) return null;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <Command size={18} className="text-indigo-400" />
            键盘快捷键
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {shortcut.icon && <shortcut.icon size={16} className="text-indigo-400" />}
                <span className="text-sm text-slate-300">{shortcut.description}</span>
              </div>
              <KeyboardShortcut keys={shortcut.keys} />
            </div>
          ))}
          <div className="pt-4 mt-4 border-t border-slate-800 text-xs text-slate-500 text-center">
            按 <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded">?</kbd> 或
            <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded ml-1">
              {isMac ? '⌘' : 'Ctrl'} + /
            </kbd>
            {' '}关闭此面板
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 默认快捷键配置
 */
export const DEFAULT_SHORTCUTS = [
  {
    keys: ['N'],
    description: '新建记录',
    icon: null,
    action: 'newRecord'
  },
  {
    keys: ['Cmd', 'K'],
    description: '快速搜索',
    icon: null,
    action: 'search'
  },
  {
    keys: ['G', 'D'],
    description: '前往仪表盘',
    icon: null,
    action: 'goDashboard'
  },
  {
    keys: ['G', 'I'],
    description: '前往收件箱',
    icon: null,
    action: 'goInbox'
  },
  {
    keys: ['G', 'P'],
    description: '前往计划看板',
    icon: null,
    action: 'goPlanner'
  },
  {
    keys: ['G', 'S'],
    description: '前往数据统计',
    icon: null,
    action: 'goStats'
  },
  {
    keys: ['Esc'],
    description: '关闭对话框/取消',
    icon: null,
    action: 'escape'
  }
];

export default KeyboardHelp;
