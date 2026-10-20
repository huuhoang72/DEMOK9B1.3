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
    { id: 'architecture' as ActiveTab, label: '2. Cấu hình training', icon: Layers },
    { id: 'train' as ActiveTab, label: '3. Huấn luyện', icon: PlayCircle, highlight: totalSamples > 0 && !isModelTrained },
    { id: 'evaluate' as ActiveTab, label: '4. Đánh giá & Test', icon: BarChart3, disabled: !isModelTrained, pulse: isModelTrained },
    { id: 'predict' as ActiveTab, label: '5. Thử nghiệm thực tế', icon: Wand2, disabled: !isModelTrained },
  ];

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-600/20 text-white">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-bold text-lg sm:text-xl tracking-tight text-slate-900 flex items-center gap-1.5">
                    CNN Browser Lab
                    <span className="text-xs px-2 py-0.5 font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      TensorFlow.js
                    </span>
                  </h1>
                </div>
                <p className="text-xs text-slate-500">
                  Tự nạp ảnh &bull; Tự huấn luyện &bull; Thử nghiệm ngay trên máy của học sinh
                </p>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center space-x-2">
              <button
                onClick={onOpenKnowledge}
                className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs flex items-center gap-1"
                title="Sổ tay kiến thức CNN"
              >
                <BookOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Status Badges & Quick Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3 self-end md:self-auto">
            {/* Backend status */}
            <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium text-slate-600">Backend:</span>
              <span className="font-bold text-emerald-700 uppercase tracking-wider text-[11px]">
                {backendName || 'WebGL'}
              </span>
            </div>

            {/* Model status */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold"
              style={{
                backgroundColor: isModelTrained ? '#ecfdf5' : '#fff1f2',
                borderColor: isModelTrained ? '#a7f3d0' : '#fecdd3',
                color: isModelTrained ? '#047857' : '#be123c'
              }}
            >
              <div className={`w-2 h-2 rounded-full ${isModelTrained ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>{isModelTrained ? 'Mô hình sẵn sàng' : 'Chưa huấn luyện'}</span>
            </div>

            {/* Theory Guide Button */}
            <button
              onClick={onOpenKnowledge}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Sổ tay lý thuyết CNN</span>
              <span className="sm:hidden">Lý thuyết</span>
            </button>

            {/* Reset */}
            <button
              onClick={onResetAll}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
              title="Làm mới toàn bộ ứng dụng"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;

            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDisabled
                    ? 'text-slate-400 opacity-60 cursor-not-allowed hover:bg-transparent'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                } ${tab.highlight && !isActive ? 'ring-2 ring-indigo-400 animate-pulse' : ''}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isDisabled ? 'text-slate-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {tab.badge}
                  </span>
                )}
                {tab.pulse && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
