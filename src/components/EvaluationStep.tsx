import React, { useState } from 'react';
import { ClassCategory, DatasetSample, ConfusionMatrixData, TestSampleResult } from '../types';
import { tfService } from '../services/tfService';
import { 
  BarChart3, 
  Play, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Filter, 
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

interface EvaluationStepProps {
  classes: ClassCategory[];
  samples: DatasetSample[];
  isModelTrained: boolean;
  onProceedToPredict: () => void;
}

export const EvaluationStep: React.FC<EvaluationStepProps> = ({
  classes,
  samples,
  isModelTrained,
  onProceedToPredict
}) => {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<{
    confusionMatrix: ConfusionMatrixData;
    detailedResults: TestSampleResult[];
  } | null>(null);

  const [activeFilter, setActiveFilter] = useState<'all' | 'correct' | 'wrong'>('all');
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  const testSamples = samples.filter(s => s.split === 'test');

  const handleRunEvaluation = async () => {
    if (!isModelTrained) {
      alert('Mô hình chưa được huấn luyện! Vui lòng huấn luyện trước ở Bước 3.');
      return;
    }
    if (testSamples.length === 0) {
      alert('Tập Test chưa có mẫu nào. Vui lòng quay lại Bước 1 và điều chỉnh tỷ lệ Test > 0%!');
      return;
    }

    setIsEvaluating(true);
    try {
      const res = await tfService.evaluateTestSet(testSamples, classes);
      setEvalResult(res);
      setSelectedCell(null);
    } catch (err: unknown) {
      console.error(err);
      alert(`Lỗi khi đánh giá: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Filtered detailed results
  const filteredDetails = (evalResult?.detailedResults || []).filter((item) => {
    if (selectedCell !== null) {
      const actualClass = classes[selectedCell.row]?.id;
      const predClass = classes[selectedCell.col]?.id;
      return item.classId === actualClass && item.predictedClassId === predClass;
    }

    if (activeFilter === 'correct') return item.isCorrect;
    if (activeFilter === 'wrong') return !item.isCorrect;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-2">
              <BarChart3 className="w-3.5 h-3.5" />
              Bước 4: Đánh giá & Kiểm thử Độc lập (Validation & Test)
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Đánh giá Khách quan trên Tập Dữ liệu Kiểm thử
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Tập Kiểm thử (Test set gồm {testSamples.length} ảnh) là những ảnh mô hình chưa từng được thấy trong lúc học. Kết quả tại đây phản ánh năng lực thực tế của AI!
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating || !isModelTrained || testSamples.length === 0}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-purple-600/30 flex items-center gap-2 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              {isEvaluating ? 'Đang kiểm tra...' : 'Chạy Đánh giá Tập Test'}
            </button>

            {evalResult && (
              <button
                onClick={onProceedToPredict}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md flex items-center gap-2 transition-all"
              >
                Tiếp tục: Thử nghiệm Vẽ &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {!evalResult ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3 border border-purple-500/20">
            <BarChart3 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">Chưa chạy đánh giá tập Test</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Bấm nút &quot;Chạy Đánh giá Tập Test&quot; ở trên để mô hình dự đoán toàn bộ {testSamples.length} ảnh trong tập kiểm thử và xuất ma trận nhầm lẫn!
          </p>
          <button
            onClick={handleRunEvaluation}
            disabled={!isModelTrained || testSamples.length === 0}
            className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-2 shadow-md"
          >
            Bắt đầu đánh giá ngay
          </button>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Accuracy */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Độ chính xác Test (Overall Accuracy)</span>
                <div className="text-3xl font-extrabold font-mono text-emerald-400">
                  {evalResult.confusionMatrix.accuracy}%
                </div>
                <span className="text-xs text-slate-500 mt-1 block">
                  {evalResult.confusionMatrix.correctSamples} / {evalResult.confusionMatrix.totalSamples} mẫu chuẩn xác
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Error count */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Số mẫu dự đoán sai</span>
                <div className="text-3xl font-extrabold font-mono text-rose-400">
                  {evalResult.confusionMatrix.totalSamples - evalResult.confusionMatrix.correctSamples}
                </div>
                <span className="text-xs text-slate-500 mt-1 block">
                  Tỉ lệ lỗi: {(100 - evalResult.confusionMatrix.accuracy).toFixed(1)}%
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <XCircle className="w-6 h-6" />
              </div>
            </div>

            {/* Test samples total */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Tổng quy mô tập Test</span>
                <div className="text-3xl font-extrabold font-mono text-purple-400">
                  {evalResult.confusionMatrix.totalSamples} <span className="text-sm text-slate-500 font-normal">ảnh</span>
                </div>
                <span className="text-xs text-slate-500 mt-1 block">
                  {classes.length} lớp phân loại
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Confusion Matrix & Class Metrics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Confusion Matrix (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    Ma trận Nhầm lẫn (Confusion Matrix)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click vào ô bất kỳ để xem danh sách ảnh tương ứng ở dưới
                  </p>
                </div>

                {selectedCell && (
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Bỏ chọn ô
                  </button>
                )}
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-slate-500 text-left font-mono">Thực tế \ Dự đoán</th>
                      {classes.map((c) => (
                        <th key={c.id} className="p-2 text-slate-300 font-semibold">
                          <div className="flex items-center justify-center gap-1">
                            <span>{c.icon}</span>
                            <span className="truncate max-w-[80px]">{c.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evalResult.confusionMatrix.matrix.map((row, rIdx) => {
                      const actualClass = classes[rIdx];
                      return (
                        <tr key={rIdx} className="border-t border-slate-800">
                          <td className="p-2.5 text-left font-medium text-white flex items-center gap-1.5">
                            <span>{actualClass?.icon}</span>
                            <span className="truncate max-w-[90px]">{actualClass?.name}</span>
                          </td>
                          {row.map((cellCount, cIdx) => {
                            const isDiagonal = rIdx === cIdx;
                            const isCellSelected = selectedCell?.row === rIdx && selectedCell?.col === cIdx;

                            // Heatmap color
                            let bgClass = 'bg-slate-950/60 text-slate-500 hover:bg-slate-800';
                            if (isDiagonal && cellCount > 0) {
                              bgClass = 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 hover:bg-emerald-500/30';
                            } else if (!isDiagonal && cellCount > 0) {
                              bgClass = 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 hover:bg-rose-500/30';
                            }

                            return (
                              <td
                                key={cIdx}
                                onClick={() => setSelectedCell({ row: rIdx, col: cIdx })}
                                className={`p-3 cursor-pointer rounded-lg transition-all ${bgClass} ${
                                  isCellSelected ? 'ring-2 ring-indigo-400 scale-105' : ''
                                }`}
                                title={`Thực tế: ${classes[rIdx]?.name} | Dự đoán: ${classes[cIdx]?.name} (${cellCount} mẫu)`}
                              >
                                <span className="font-mono text-sm">{cellCount}</span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 inline-block border border-emerald-500" />
                  Đường chéo chính: Dự đoán đúng hoàn toàn
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500/40 inline-block border border-rose-500" />
                  Ô ngoài đường chéo: Các ca bị nhầm lẫn
                </span>
              </div>
            </div>

            {/* Class Metrics Table (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Chỉ số Phân loại Từng Lớp (Metrics)
                </h3>

                <div className="space-y-3">
                  {evalResult.confusionMatrix.classMetrics.map((m, idx) => {
                    const cls = classes[idx];
                    return (
                      <div key={idx} className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                            <span>{cls?.icon}</span>
                            <span>{m.name}</span>
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {m.count} ảnh test
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-500 block">Precision</span>
                            <span className="font-mono font-bold text-cyan-400">{m.precision}%</span>
                          </div>
                          <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-500 block">Recall</span>
                            <span className="font-mono font-bold text-amber-400">{m.recall}%</span>
                          </div>
                          <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-500 block">F1-Score</span>
                            <span className="font-mono font-bold text-purple-400">{m.f1Score}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanatory note */}
              <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
                <p className="leading-relaxed">
                  <strong>Precision (Độ chuẩn xác)</strong>: Khi mô hình đoán một ảnh là Lớp X, có bao nhiêu % nó đoán đúng?
                  <br />
                  <strong>Recall (Độ bao phủ)</strong>: Trong tất cả ảnh Lớp X thật, mô hình tìm ra được bao nhiêu %?
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Image Test Gallery */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  Danh sách Chi tiết Ảnh Kiểm thử
                  <span className="text-xs text-slate-400 font-normal">
                    ({filteredDetails.length} ảnh)
                  </span>
                </h3>
                {selectedCell && (
                  <p className="text-xs text-indigo-400 mt-0.5">
                    Đang lọc theo ô: Thực tế là &quot;{classes[selectedCell.row]?.name}&quot; nhưng đoán là &quot;{classes[selectedCell.col]?.name}&quot;
                  </p>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-1.5 text-xs">
                <button
                  onClick={() => {
                    setSelectedCell(null);
                    setActiveFilter('all');
                  }}
                  className={`px-3 py-1 rounded-lg border transition-colors ${
                    activeFilter === 'all' && selectedCell === null
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Tất cả ({evalResult.detailedResults.length})
                </button>
                <button
                  onClick={() => {
                    setSelectedCell(null);
                    setActiveFilter('correct');
                  }}
                  className={`px-3 py-1 rounded-lg border transition-colors ${
                    activeFilter === 'correct' && selectedCell === null
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Đoán đúng ({evalResult.confusionMatrix.correctSamples})
                </button>
                <button
                  onClick={() => {
                    setSelectedCell(null);
                    setActiveFilter('wrong');
                  }}
                  className={`px-3 py-1 rounded-lg border transition-colors ${
                    activeFilter === 'wrong' && selectedCell === null
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Đoán sai ({evalResult.confusionMatrix.totalSamples - evalResult.confusionMatrix.correctSamples})
                </button>
              </div>
            </div>

            {/* Gallery Grid */}
            {filteredDetails.length === 0 ? (
              <div className="py-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                Không có mẫu nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-96 overflow-y-auto p-1">
                {filteredDetails.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-slate-950 rounded-xl border p-2 flex flex-col items-center justify-between transition-all ${
                      item.isCorrect
                        ? 'border-emerald-500/30 hover:border-emerald-500'
                        : 'border-rose-500/40 hover:border-rose-500'
                    }`}
                  >
                    <div className="w-14 h-14 bg-black rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center mb-2">
                      <img
                        src={item.dataUrl}
                        alt="test sample"
                        className="w-full h-full object-contain image-rendering-pixelated"
                      />
                    </div>

                    <div className="w-full text-center text-[10px]">
                      <div className="text-slate-400 truncate">
                        Gốc: <span className="text-white font-medium">{item.actualClassName}</span>
                      </div>
                      <div className="mt-0.5 truncate">
                        {item.isCorrect ? (
                          <span className="text-emerald-400 font-semibold flex items-center justify-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> {item.confidence}%
                          </span>
                        ) : (
                          <span className="text-rose-400 font-semibold flex items-center justify-center gap-0.5">
                            <XCircle className="w-3 h-3" /> {item.predictedClassName} ({item.confidence}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
