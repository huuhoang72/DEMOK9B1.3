import React, { useState } from 'react';
import { ClassCategory, DatasetSample, ConfusionMatrixData, TestSampleResult } from '../types';
import { tfService } from '../services/tfService';
import { 
  BarChart3, 
  Play, 
  CheckCircle2, 
  XCircle, 
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

  const [evalNotice, setEvalNotice] = useState<{ type: 'error' | 'warning' | 'info'; text: string } | null>(null);

  const testSamples = samples.filter(s => s.split === 'test');

  const handleRunEvaluation = async () => {
    setEvalNotice(null);

    if (!isModelTrained) {
      setEvalNotice({
        type: 'warning',
        text: 'Mô hình chưa được huấn luyện! Vui lòng huấn luyện trước ở Bước 3.'
      });
      return;
    }
    if (testSamples.length === 0) {
      setEvalNotice({
        type: 'warning',
        text: 'Tập Test chưa có mẫu nào. Vui lòng quay lại Bước 1 và điều chỉnh tỷ lệ Test > 0%!'
      });
      return;
    }

    setIsEvaluating(true);
    try {
      const res = await tfService.evaluateTestSet(testSamples, classes);
      setEvalResult(res);
      setSelectedCell(null);
    } catch (err: unknown) {
      console.error(err);
      setEvalNotice({
        type: 'error',
        text: `Lỗi khi đánh giá: ${err instanceof Error ? err.message : String(err)}`
      });
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
      {/* Header Banner - Clean White */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
              Bước 4: Đánh giá & Kiểm thử Độc lập (Validation & Test)
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Đánh giá Khách quan trên Tập Dữ liệu Kiểm thử
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Tập Kiểm thử (Test set gồm {testSamples.length} ảnh) là những ảnh mô hình chưa từng được thấy trong lúc học. Kết quả tại đây phản ánh năng lực thực tế của AI!
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating || !isModelTrained || testSamples.length === 0}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              {isEvaluating ? 'Đang kiểm tra...' : 'Chạy Đánh giá Tập Test'}
            </button>

            {evalResult && (
              <button
                onClick={onProceedToPredict}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                Tiếp tục: Thử nghiệm Vẽ &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {evalNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-150 font-medium ${
            evalNotice.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <span>{evalNotice.text}</span>
          <button
            type="button"
            onClick={() => setEvalNotice(null)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {!evalResult ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 border border-purple-200">
            <BarChart3 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Chưa chạy đánh giá tập Test</h3>
          <p className="text-xs text-slate-600 mt-1 max-w-md leading-relaxed">
            Bấm nút &quot;Chạy Đánh giá Tập Test&quot; ở trên để mô hình dự đoán toàn bộ {testSamples.length} ảnh trong tập kiểm thử và xuất ma trận nhầm lẫn!
          </p>
          <button
            onClick={handleRunEvaluation}
            disabled={!isModelTrained || testSamples.length === 0}
            className="mt-4 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
          >
            Bắt đầu đánh giá ngay
          </button>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Accuracy */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-1">Độ chính xác Test (Overall Accuracy)</span>
                <div className="text-3xl font-extrabold font-mono text-emerald-600">
                  {evalResult.confusionMatrix.accuracy}%
                </div>
                <span className="text-xs text-slate-500 mt-1 block">
                  {evalResult.confusionMatrix.correctSamples} / {evalResult.confusionMatrix.totalSamples} mẫu chuẩn xác
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Error count */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-1">Số mẫu dự đoán sai</span>
                <div className="text-3xl font-extrabold font-mono text-rose-600">
                  {evalResult.confusionMatrix.totalSamples - evalResult.confusionMatrix.correctSamples}
                </div>
                <span className="text-xs text-slate-500 mt-1 block font-mono">
                  Tỉ lệ lỗi: {(100 - evalResult.confusionMatrix.accuracy).toFixed(1)}%
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <XCircle className="w-6 h-6" />
              </div>
            </div>

            {/* Test samples total */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-1">Tổng quy mô tập Test</span>
                <div className="text-3xl font-extrabold font-mono text-purple-700">
                  {evalResult.confusionMatrix.totalSamples} <span className="text-sm text-slate-500 font-normal">ảnh</span>
                </div>
                <span className="text-xs text-slate-500 mt-1 block">
                  {classes.length} lớp phân loại
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Confusion Matrix & Class Metrics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Confusion Matrix (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    Ma trận Nhầm lẫn (Confusion Matrix)
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Click vào ô bất kỳ để xem danh sách ảnh tương ứng ở dưới
                  </p>
                </div>

                {selectedCell && (
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
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
                      <th className="p-2.5 text-slate-500 text-left font-mono font-medium">Thực tế \ Dự đoán</th>
                      {classes.map((c) => (
                        <th key={c.id} className="p-2.5 text-slate-800 font-bold">
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
                        <tr key={rIdx} className="border-t border-slate-200">
                          <td className="p-2.5 text-left font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{actualClass?.icon}</span>
                            <span className="truncate max-w-[90px]">{actualClass?.name}</span>
                          </td>
                          {row.map((cellCount, cIdx) => {
                            const isDiagonal = rIdx === cIdx;
                            const isCellSelected = selectedCell?.row === rIdx && selectedCell?.col === cIdx;

                            // Heatmap color
                            let bgClass = 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200';
                            if (isDiagonal && cellCount > 0) {
                              bgClass = 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 hover:bg-emerald-200';
                            } else if (!isDiagonal && cellCount > 0) {
                              bgClass = 'bg-rose-100 text-rose-800 font-bold border border-rose-300 hover:bg-rose-200';
                            }

                            return (
                              <td
                                key={cIdx}
                                onClick={() => setSelectedCell({ row: rIdx, col: cIdx })}
                                className={`p-3 cursor-pointer rounded-lg transition-all ${bgClass} ${
                                  isCellSelected ? 'ring-2 ring-indigo-500 scale-105' : ''
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

              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded bg-emerald-100 inline-block border border-emerald-400" />
                  Đường chéo: Đoán đúng hoàn toàn
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded bg-rose-100 inline-block border border-rose-400" />
                  Ngoài chéo: Ca bị nhầm lẫn
                </span>
              </div>
            </div>

            {/* Class Metrics Table (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Chỉ số Phân loại Từng Lớp (Metrics)
                </h3>

                <div className="space-y-3">
                  {evalResult.confusionMatrix.classMetrics.map((m, idx) => {
                    const cls = classes[idx];
                    return (
                      <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{cls?.icon}</span>
                            <span>{m.name}</span>
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {m.count} ảnh test
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-[10px] text-slate-500 font-medium block">Precision</span>
                            <span className="font-mono font-bold text-sky-700">{m.precision}%</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-[10px] text-slate-500 font-medium block">Recall</span>
                            <span className="font-mono font-bold text-amber-700">{m.recall}%</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-[10px] text-slate-500 font-medium block">F1-Score</span>
                            <span className="font-mono font-bold text-purple-700">{m.f1Score}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanatory note */}
              <div className="mt-4 p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-950 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-purple-600" />
                <p className="leading-relaxed">
                  <strong>Precision (Độ chuẩn xác)</strong>: Khi mô hình đoán một ảnh là Lớp X, có bao nhiêu % nó đoán đúng?
                  <br />
                  <strong>Recall (Độ bao phủ)</strong>: Trong tất cả ảnh Lớp X thật, mô hình tìm ra được bao nhiêu %?
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Image Test Gallery */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Danh sách Chi tiết Ảnh Kiểm thử
                  <span className="text-xs text-slate-500 font-normal">
                    ({filteredDetails.length} ảnh)
                  </span>
                </h3>
                {selectedCell && (
                  <p className="text-xs text-indigo-700 font-semibold mt-0.5">
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
                  className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer font-semibold ${
                    activeFilter === 'all' && selectedCell === null
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Tất cả ({evalResult.detailedResults.length})
                </button>
                <button
                  onClick={() => {
                    setSelectedCell(null);
                    setActiveFilter('correct');
                  }}
                  className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer font-semibold ${
                    activeFilter === 'correct' && selectedCell === null
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Đoán đúng ({evalResult.confusionMatrix.correctSamples})
                </button>
                <button
                  onClick={() => {
                    setSelectedCell(null);
                    setActiveFilter('wrong');
                  }}
                  className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer font-semibold ${
                    activeFilter === 'wrong' && selectedCell === null
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Đoán sai ({evalResult.confusionMatrix.totalSamples - evalResult.confusionMatrix.correctSamples})
                </button>
              </div>
            </div>

            {/* Gallery Grid */}
            {filteredDetails.length === 0 ? (
              <div className="py-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                Không có mẫu nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-96 overflow-y-auto p-1">
                {filteredDetails.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-slate-50 rounded-xl border p-2 flex flex-col items-center justify-between transition-all ${
                      item.isCorrect
                        ? 'border-emerald-300 hover:border-emerald-500 bg-emerald-50/30'
                        : 'border-rose-300 hover:border-rose-500 bg-rose-50/30'
                    }`}
                  >
                    <div className="w-14 h-14 bg-white rounded-lg overflow-hidden border border-slate-300 flex items-center justify-center mb-2 shadow-2xs">
                      <img
                        src={item.dataUrl}
                        alt="test sample"
                        className="w-full h-full object-contain image-rendering-pixelated"
                      />
                    </div>

                    <div className="w-full text-center text-[10px]">
                      <div className="text-slate-600 truncate">
                        Gốc: <span className="text-slate-900 font-bold">{item.actualClassName}</span>
                      </div>
                      <div className="mt-0.5 truncate">
                        {item.isCorrect ? (
                          <span className="text-emerald-700 font-bold flex items-center justify-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> {item.confidence}%
                          </span>
                        ) : (
                          <span className="text-rose-700 font-bold flex items-center justify-center gap-0.5">
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
