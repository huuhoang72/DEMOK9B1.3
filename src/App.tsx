/**
 * CNN Browser Lab - Huấn luyện AI trong Trình duyệt
 * Giao diện Nền Sáng Hiện Đại (Clean Light Mode) dành cho Học sinh
 */
import React, { useState, useEffect } from 'react';
import { ActiveTab, ClassCategory, DatasetSample, Hyperparameters, EpochLog } from './types';
import { tfService } from './services/tfService';
import { Navbar } from './components/Navbar';
import { DatasetStep } from './components/DatasetStep';
import { ArchitectureStep } from './components/ArchitectureStep';
import { TrainingStep } from './components/TrainingStep';
import { EvaluationStep } from './components/EvaluationStep';
import { InferencePlayground } from './components/InferencePlayground';
import { KnowledgeModal } from './components/KnowledgeModal';
import { RotateCcw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dataset');
  const [backendName, setBackendName] = useState<string>('WebGL');
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);

  // Default Hyperparameters
  const [hyperparameters, setHyperparameters] = useState<Hyperparameters>({
    epochs: 20,
    batchSize: 16,
    learningRate: 0.001,
    optimizer: 'adam',
    conv1Filters: 16,
    conv2Filters: 32,
    denseUnits: 64,
    dropoutRate: 0.25
  });

  // Split ratios
  const [trainRatio, setTrainRatio] = useState<number>(70);
  const [valRatio, setValRatio] = useState<number>(15);

  // Clean slate: Student creates their own classes or uploads a ZIP with class folders
  const [classes, setClasses] = useState<ClassCategory[]>([
    { id: 'class_1', name: 'Lớp 1', color: '#3B82F6', icon: '📦' },
    { id: 'class_2', name: 'Lớp 2', color: '#10B981', icon: '🎯' }
  ]);
  const [samples, setSamples] = useState<DatasetSample[]>([]);

  // Training state
  const [epochLogs, setEpochLogs] = useState<EpochLog[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [isModelTrained, setIsModelTrained] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);

  // Initialize TF.js backend
  useEffect(() => {
    tfService.init().then(backend => {
      setBackendName(backend || 'WebGL');
    }).catch(err => {
      console.warn('TF backend init fallback:', err);
    });
  }, []);

  // Confirm Full Reset
  const confirmResetAll = () => {
    tfService.dispose();
    setClasses([
      { id: 'class_1', name: 'Lớp 1', color: '#3B82F6', icon: '📦' },
      { id: 'class_2', name: 'Lớp 2', color: '#10B981', icon: '🎯' }
    ]);
    setSamples([]);
    setEpochLogs([]);
    setIsModelTrained(false);
    setIsTraining(false);
    setActiveTab('dataset');
    setShowResetModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendName={backendName}
        isModelTrained={isModelTrained}
        totalSamples={samples.length}
        onOpenKnowledge={() => setIsKnowledgeOpen(true)}
        onResetAll={() => setShowResetModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dataset' && (
          <DatasetStep
            classes={classes}
            setClasses={setClasses}
            samples={samples}
            setSamples={setSamples}
            trainRatio={trainRatio}
            setTrainRatio={setTrainRatio}
            valRatio={valRatio}
            setValRatio={setValRatio}
            onProceedToArchitecture={() => setActiveTab('architecture')}
          />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureStep
            hyperparameters={hyperparameters}
            setHyperparameters={setHyperparameters}
            classes={classes}
            onProceedToTrain={() => setActiveTab('train')}
          />
        )}

        {activeTab === 'train' && (
          <TrainingStep
            classes={classes}
            samples={samples}
            hyperparameters={hyperparameters}
            epochLogs={epochLogs}
            setEpochLogs={setEpochLogs}
            isTraining={isTraining}
            setIsTraining={setIsTraining}
            isModelTrained={isModelTrained}
            setIsModelTrained={setIsModelTrained}
            onProceedToEvaluate={() => setActiveTab('evaluate')}
            onProceedToPredict={() => setActiveTab('predict')}
          />
        )}

        {activeTab === 'evaluate' && (
          <EvaluationStep
            classes={classes}
            samples={samples}
            isModelTrained={isModelTrained}
            onProceedToPredict={() => setActiveTab('predict')}
          />
        )}

        {activeTab === 'predict' && (
          <InferencePlayground
            classes={classes}
            isModelTrained={isModelTrained}
          />
        )}
      </main>

      {/* Theory Guide Modal */}
      <KnowledgeModal
        isOpen={isKnowledgeOpen}
        onClose={() => setIsKnowledgeOpen(false)}
      />

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-2">
              Đặt lại Toàn bộ Phòng Thí nghiệm?
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Thao tác này sẽ giải phóng mô hình CNN trong bộ nhớ, xóa các dữ liệu đã nạp và đưa về trạng thái phòng lab ban đầu.
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmResetAll}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Xác nhận Đặt lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lab Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Phòng thí nghiệm Học máy Trực quan &bull; Tự Nạp Ảnh & Tự Gán Nhãn &bull; TensorFlow.js WebGL
          </p>
          <p className="font-mono text-slate-600">
            CNN Browser Training Lab
          </p>
        </div>
      </footer>
    </div>
  );
}
