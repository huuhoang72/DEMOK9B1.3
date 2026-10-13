import React from 'react';
import { ActiveTab } from '../types';
import { Database, Layers, PlayCircle, BarChart3, Wand2, BookOpen, Cpu, RefreshCw } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  backendName: string;
  isModelTrained: boolean;
  totalSamples: number;
  onOpenKnowledge: () => void;
  onResetAll: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  backendName,
  isModelTrained,
  totalSamples,
  onOpenKnowledge,
  onResetAll,
}) => {
  const tabs = [
    { id: 'dataset' as ActiveTab, label: '1. Dữ liệu', icon: Database, badge: `${totalSamples} ảnh` },
    { id: 'architecture' as ActiveTab, label: '2. Kiến trúc CNN', icon: Layers },
    { id: 'train' as ActiveTab, label: '3. Huấn luyện', icon: PlayCircle, highlight: totalSamples > 0 && !isModelTrained },
    { id: 'evaluate' as ActiveTab, label: '4. Đánh giá & Test', icon: BarChart3, disabled: !isModelTrained },
    { id: 'predict' as ActiveTab, label: '5. Thử nghiệm thực tế', icon: Wand2, disabled: !isModelTrained, pulse: isModelTrained },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-bold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5">
                    CNN Browser Lab
                    <span className="text-xs px-2 py-0.5 font-medium rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      TensorFlow.js
                    </span>
                  </h1>
                </div>
                <p className="text-xs text-slate-400">
                  Tự nạp ảnh &bull; Tự huấn luyện &bull; Thử nghiệm ngay trên máy của học sinh
                </p>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center space-x-2">
              <button
                onClick={onOpenKnowledge}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs flex items-center gap-1"
                title="Sổ tay kiến thức CNN"
              >
                <BookOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Status Badges & Quick Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3 self-end md:self-auto">
            {/* Backend status */}
            <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Backend:</span>
              <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px]">
                {backendName || 'WebGL'}
              </span>
            </div>

            {/* Model status */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium"
              style={{
                backgroundColor: isModelTrained ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderColor: isModelTrained ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.2)',
                color: isModelTrained ? '#34d399' : '#f87171'
              }}
            >
              <div className={`w-2 h-2 rounded-full ${isModelTrained ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span>{isModelTrained ? 'Mô hình sẵn sàng' : 'Chưa huấn luyện'}</span>
            </div>

            {/* Theory Guide Button */}
            <button
              onClick={onOpenKnowledge}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Sổ tay lý thuyết CNN</span>
              <span className="sm:hidden">Lý thuyết</span>
            </button>

            {/* Reset */}
            <button
              onClick={onResetAll}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
              title="Làm mới toàn bộ ứng dụng"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;

            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : isDisabled
                    ? 'text-slate-500 opacity-60 cursor-not-allowed hover:bg-transparent'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                } ${tab.highlight && !isActive ? 'ring-2 ring-indigo-500/50 animate-pulse' : ''}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isDisabled ? 'text-slate-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
                {tab.pulse && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
