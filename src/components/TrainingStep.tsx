import React, { useState, useRef, useEffect } from 'react';
import { ClassCategory, DatasetSample, Hyperparameters, EpochLog } from '../types';
import { tfService } from '../services/tfService';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Square, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  TrendingUp,
  Cpu,
  ArrowRight
} from 'lucide-react';

interface TrainingStepProps {
  classes: ClassCategory[];
  samples: DatasetSample[];
  hyperparameters: Hyperparameters;
  epochLogs: EpochLog[];
  setEpochLogs: React.Dispatch<React.SetStateAction<EpochLog[]>>;
  isTraining: boolean;
  setIsTraining: (training: boolean) => void;
  isModelTrained: boolean;
  setIsModelTrained: (trained: boolean) => void;
  onProceedToEvaluate: () => void;
  onProceedToPredict: () => void;
}

export const TrainingStep: React.FC<TrainingStepProps> = ({
  classes,
  samples,
  hyperparameters,
  epochLogs,
  setEpochLogs,
  isTraining,
  setIsTraining,
  isModelTrained,
  setIsModelTrained,
  onProceedToEvaluate,
  onProceedToPredict
}) => {
  const lossCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const accCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [statusAlert, setStatusAlert] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null);

  const trainSamplesCount = samples.filter(s => s.split === 'train').length;
  const valSamplesCount = samples.filter(s => s.split === 'val').length;

  const currentEpoch = epochLogs.length > 0 ? epochLogs[epochLogs.length - 1].epoch : 0;
  const latestLog = epochLogs.length > 0 ? epochLogs[epochLogs.length - 1] : null;

  // Real-time canvas drawing for Loss and Accuracy curves (High-contrast Light Mode)
  useEffect(() => {
    // Draw Loss Chart
    const lossCanvas = lossCanvasRef.current;
    if (lossCanvas) {
      const ctx = lossCanvas.getContext('2d');
      if (ctx) {
        drawCurveChart(
          ctx,
          lossCanvas.width,
          lossCanvas.height,
          epochLogs.map(l => l.loss),
          epochLogs.map(l => l.valLoss ?? 0),
          hyperparameters.epochs,
          '#0284c7', // Sky Blue Train Loss
          '#d97706', // Amber Val Loss
          false // lower is better
        );
      }
    }

    // Draw Acc Chart
    const accCanvas = accCanvasRef.current;
    if (accCanvas) {
      const ctx = accCanvas.getContext('2d');
      if (ctx) {
        drawCurveChart(
          ctx,
          accCanvas.width,
          accCanvas.height,
          epochLogs.map(l => l.acc),
          epochLogs.map(l => l.valAcc ?? 0),
          hyperparameters.epochs,
          '#059669', // Emerald Train Acc
          '#7c3aed', // Purple Val Acc
          true // higher is better (0-100)
        );
      }
    }
  }, [epochLogs, hyperparameters.epochs]);

  const drawCurveChart = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    trainData: number[],
    valData: number[],
    totalEpochs: number,
    trainColor: string,
    valColor: string,
    isPercentage: boolean
  ) => {
    // Clean white canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Padding
    const padX = 40;
    const padY = 24;
    const w = width - padX * 2;
    const h = height - padY * 2;

    // Background subtle grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padY + (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(padX + w, y);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      const valLabel = isPercentage
        ? `${Math.round(100 - i * 25)}%`
        : (2.0 - i * 0.5).toFixed(1);
      ctx.fillText(valLabel, padX - 6, y + 3);
    }

    // X axis ticks
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('1', padX, padY + h + 15);
    ctx.fillText(`${totalEpochs}`, padX + w, padY + h + 15);

    if (trainData.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Chưa có dữ liệu huấn luyện', width / 2, height / 2);
      return;
    }

    // Calculate scaling
    const maxVal = isPercentage ? 100 : Math.max(2.0, ...trainData, ...valData);
    const minVal = 0;

    const getX = (idx: number) => {
      if (totalEpochs <= 1) return padX;
      return padX + (idx / (totalEpochs - 1)) * w;
    };

    const getY = (v: number) => {
      const clamped = Math.max(minVal, Math.min(maxVal, v));
      const ratio = (clamped - minVal) / (maxVal - minVal || 1);
      return padY + h - ratio * h;
    };

    // Draw Train Curve
    if (trainData.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = trainColor;
      ctx.lineWidth = 2.5;
      trainData.forEach((val, idx) => {
        const x = getX(idx);
        const y = getY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw dots
      ctx.fillStyle = trainColor;
      trainData.forEach((val, idx) => {
        const x = getX(idx);
        const y = getY(val);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw Val Curve
    if (valData.length > 0 && valData.some(v => v > 0)) {
      ctx.beginPath();
      ctx.strokeStyle = valColor;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]); // Dashed line for validation
      valData.forEach((val, idx) => {
        const x = getX(idx);
        const y = getY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Dots
      ctx.fillStyle = valColor;
      valData.forEach((val, idx) => {
        const x = getX(idx);
        const y = getY(val);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  };

  // Start Training
  const handleStartTraining = async () => {
    setStatusAlert(null);

    if (classes.length < 2) {
      setStatusAlert({
        type: 'warning',
        message: 'Mạng nơ-ron CNN cần tối thiểu 2 lớp để phân loại. Vui lòng tạo ít nhất 2 lớp và nạp ảnh ở Bước 1!'
      });
      return;
    }

    if (trainSamplesCount === 0) {
      setStatusAlert({
        type: 'warning',
        message: 'Tập Train chưa có mẫu nào. Vui lòng quay lại Bước 1 để nạp ảnh từ Webcam hoặc file ZIP!'
      });
      return;
    }

    setIsTraining(true);
    setEpochLogs([]);

    try {
      const success = await tfService.train(
        samples,
        classes,
        hyperparameters,
        (log) => {
          setEpochLogs(prev => [...prev, log]);
        }
      );

      if (success) {
        setIsModelTrained(true);
        // Fireworks celebration!
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err: unknown) {
      console.error(err);
      setStatusAlert({
        type: 'error',
        message: `Lỗi khi huấn luyện: ${err instanceof Error ? err.message : String(err)}`
      });
    } finally {
      setIsTraining(false);
    }
  };

  const handleStopTraining = () => {
    tfService.stopTraining();
    setIsTraining(false);
  };

  // AI Diagnostic assessment
  const getDiagnosticInsight = () => {
    if (!latestLog) return null;
    const { acc, valAcc } = latestLog;

    if (valAcc !== undefined && acc > 95 && valAcc < 75) {
      return {
        type: 'warning',
        title: 'Cảnh báo: Hiện tượng Học vẹt (Overfitting)!',
        message: 'Mô hình đạt độ chính xác rất cao trên tập Train nhưng kém trên tập Validation. Khắc phục: tăng tỉ lệ Dropout lên 35-50%, bổ sung thêm nhiều biến thể ảnh bằng Data Augmentation!'
      };
    }

    if (acc < 60 && latestLog.epoch >= 15) {
      return {
        type: 'warning',
        title: 'Chưa đủ học (Underfitting)',
        message: 'Mô hình chưa học tốt các đặc trưng. Hãy thử tăng Learning Rate hoặc tăng số vòng lặp Epochs.'
      };
    }

    if (acc >= 90 && (valAcc === undefined || valAcc >= 85)) {
      return {
        type: 'success',
        title: 'Tuyệt vời: Mô hình hội tụ rất tốt!',
        message: `Độ chính xác đạt ${Math.round(valAcc ?? acc)}%. Mô hình đã sẵn sàng để kiểm thử trên tập Test và thử nghiệm thực tế!`
      };
    }

    return {
      type: 'info',
      title: 'Đang học ổn định',
      message: 'Mô hình đang liên tục điều chỉnh các ma trận trọng số (Convolutional Kernels) theo thuật toán Gradient Descent.'
    };
  };

  const diagnostic = getDiagnosticInsight();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              Bước 3: Huấn luyện Mạng Nơ-ron (Model Training)
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Huấn luyện Thời gian thực bằng GPU / WebGL
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Toàn bộ quá trình lan truyền tiến (Forward Pass), tính sai số (Loss) và lan truyền ngược (Backpropagation) diễn ra trực tiếp ngay trên trình duyệt của học sinh.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            {!isTraining ? (
              <button
                onClick={handleStartTraining}
                disabled={trainSamplesCount === 0}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                {isModelTrained ? 'Huấn luyện lại' : 'Bắt đầu Huấn luyện'}
              </button>
            ) : (
              <button
                onClick={handleStopTraining}
                className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-xs flex items-center gap-2 transition-all animate-pulse cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                Dừng huấn luyện
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline Warning/Error Banner */}
      {statusAlert && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-150 ${
            statusAlert.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : statusAlert.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{statusAlert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusAlert(null)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Real-time Status Card Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Epoch progress */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>Tiến trình Epoch</span>
            <span className="font-mono text-slate-500">{hyperparameters.epochs} max</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {currentEpoch} <span className="text-sm text-slate-500 font-normal">/ {hyperparameters.epochs}</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3 border border-slate-200">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${(currentEpoch / hyperparameters.epochs) * 100}%` }}
            />
          </div>
        </div>

        {/* Train Accuracy */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 mb-1">
            <span>Train Accuracy</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {latestLog ? `${latestLog.acc.toFixed(1)}%` : '--'}
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            Loss: {latestLog ? latestLog.loss.toFixed(4) : '--'}
          </div>
        </div>

        {/* Validation Accuracy */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-purple-700 mb-1">
            <span>Val Accuracy</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-700">
            {latestLog?.valAcc !== undefined ? `${latestLog.valAcc.toFixed(1)}%` : (valSamplesCount === 0 ? 'N/A' : '--')}
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            Val Loss: {latestLog?.valLoss !== undefined ? latestLog.valLoss.toFixed(4) : '--'}
          </div>
        </div>

        {/* Speed */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-700 mb-1">
            <span>Tốc độ / Vòng</span>
            <Cpu className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-700">
            {latestLog ? `${latestLog.durationMs}ms` : '--'}
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            {trainSamplesCount} mẫu train
          </div>
        </div>
      </div>

      {/* Live Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loss Curve */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-600" />
                Đồ thị Mất mát (Loss Curve)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Càng thấp càng tốt (Mục tiêu tiệm cận 0)
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-sky-700">
                <span className="w-2.5 h-2.5 bg-sky-600 rounded-full inline-block" />
                Train Loss
              </span>
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="w-2.5 h-2.5 border-2 border-amber-600 rounded-full inline-block" />
                Val Loss
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-2 overflow-hidden flex items-center justify-center">
            <canvas
              ref={lossCanvasRef}
              width={520}
              height={220}
              className="w-full h-52 bg-white rounded-lg shadow-2xs"
            />
          </div>
        </div>

        {/* Accuracy Curve */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Đồ thị Độ chính xác (Accuracy Curve)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Càng cao càng tốt (Mục tiêu tiệm cận 100%)
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full inline-block" />
                Train Acc
              </span>
              <span className="flex items-center gap-1.5 text-purple-700">
                <span className="w-2.5 h-2.5 border-2 border-purple-600 rounded-full inline-block" />
                Val Acc
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-2 overflow-hidden flex items-center justify-center">
            <canvas
              ref={accCanvasRef}
              width={520}
              height={220}
              className="w-full h-52 bg-white rounded-lg shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* AI Diagnostic Coach Box */}
      {diagnostic && (
        <div
          className={`rounded-2xl p-5 border flex items-start gap-3 transition-all ${
            diagnostic.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : diagnostic.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}
        >
          {diagnostic.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-sm">{diagnostic.title}</h4>
            <p className="leading-relaxed opacity-90">{diagnostic.message}</p>
          </div>
        </div>
      )}

      {/* Next Actions Bar when trained */}
      {isModelTrained && !isTraining && (
        <div className="bg-gradient-to-r from-emerald-50/80 via-white to-indigo-50/80 border-2 border-indigo-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300 shadow-2xs shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">Mô hình đã huấn luyện thành công! 🎉</h4>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Bước tiếp theo: Bước 4
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Theo đúng chu trình Machine Learning chuẩn, tiếp theo bạn chuyển sang <strong>Bước 4: Đánh giá & Test</strong> để kiểm tra độ chính xác trên tập dữ liệu kiểm thử độc lập (Confusion Matrix).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end shrink-0">
            <button
              onClick={onProceedToEvaluate}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Tiếp tục: Bước 4: Đánh giá & Test</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onProceedToPredict}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Bỏ qua bước đánh giá và thử nghiệm ngay"
            >
              Bỏ qua sang Bước 5
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
