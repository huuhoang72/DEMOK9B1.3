import React from 'react';
import { ClassCategory, Hyperparameters } from '../types';
import { Layers, Sliders, Info, Zap, Shield, ArrowRight } from 'lucide-react';

interface ArchitectureStepProps {
  hyperparameters: Hyperparameters;
  setHyperparameters: React.Dispatch<React.SetStateAction<Hyperparameters>>;
  classes: ClassCategory[];
  onProceedToTrain: () => void;
}

export const ArchitectureStep: React.FC<ArchitectureStepProps> = ({
  hyperparameters,
  setHyperparameters,
  classes,
  onProceedToTrain,
}) => {
  const {
    conv1Filters,
    conv2Filters,
    denseUnits,
    dropoutRate,
    learningRate,
    batchSize,
    epochs,
    optimizer
  } = hyperparameters;

  // Approximate parameter calculation
  // Conv1: (3*3*1 + 1) * conv1Filters = 10 * conv1Filters
  const pConv1 = (3 * 3 * 1 + 1) * conv1Filters;
  // Conv2: (3*3*conv1Filters + 1) * conv2Filters
  const pConv2 = (3 * 3 * conv1Filters + 1) * conv2Filters;
  // Flatten size: 7 * 7 * conv2Filters
  const flattenUnits = 7 * 7 * conv2Filters;
  // Dense1: (flattenUnits + 1) * denseUnits
  const pDense1 = (flattenUnits + 1) * denseUnits;
  // Output: (denseUnits + 1) * numClasses
  const numClasses = Math.max(classes.length, 2);
  const pOutput = (denseUnits + 1) * numClasses;
  const totalParams = pConv1 + pConv2 + pDense1 + pOutput;

  // Preset arch profiles
  const applyPresetProfile = (profile: 'light' | 'standard' | 'deep') => {
    if (profile === 'light') {
      setHyperparameters(prev => ({
        ...prev,
        conv1Filters: 8,
        conv2Filters: 16,
        denseUnits: 32,
        dropoutRate: 0.1,
        epochs: 15,
        batchSize: 16
      }));
    } else if (profile === 'standard') {
      setHyperparameters(prev => ({
        ...prev,
        conv1Filters: 16,
        conv2Filters: 32,
        denseUnits: 64,
        dropoutRate: 0.25,
        epochs: 20,
        batchSize: 16
      }));
    } else {
      setHyperparameters(prev => ({
        ...prev,
        conv1Filters: 32,
        conv2Filters: 64,
        denseUnits: 128,
        dropoutRate: 0.4,
        epochs: 30,
        batchSize: 16
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
              <Layers className="w-3.5 h-3.5" />
              Bước 2: Cấu hình Kiến trúc Mạng CNN (Convolutional Neural Network)
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Khám phá Luồng Tính toán và Siêu Tham số
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Mạng CNN không nhìn từng pixel riêng lẻ như nơ-ron thông thường, mà sử dụng các bộ lọc (Kernels) trượt qua ảnh để tìm ra các góc cạnh, hoa văn và hình dạng cốt lõi.
            </p>
          </div>

          <button
            onClick={onProceedToTrain}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all self-start md:self-center"
          >
            Sẵn sàng: Bắt đầu Huấn luyện &rarr;
          </button>
        </div>
      </div>

      {/* Preset Profiles Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 mr-1">Cấu hình mẫu gợi ý:</span>
        <button
          onClick={() => applyPresetProfile('light')}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          CNN Tinh gọn (Siêu nhanh 1s)
        </button>
        <button
          onClick={() => applyPresetProfile('standard')}
          className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium border border-indigo-500/40 transition-colors flex items-center gap-1.5"
        >
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          CNN Tiêu chuẩn (Khuyên dùng)
        </button>
        <button
          onClick={() => applyPresetProfile('deep')}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
        >
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          CNN Nâng cao (Độ biểu diễn cao)
        </button>
      </div>

      {/* Interactive Visual CNN Architecture Diagram */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Sơ đồ Trực quan Luồng Mạng CNN
          </h3>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            Tổng trọng số (Parameters): ~{totalParams.toLocaleString()}
          </span>
        </div>

        {/* Pipeline horizontal scrollable cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Input */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="w-1.5 h-full bg-blue-500 absolute left-0 top-0" />
            <div>
              <div className="flex items-center justify-between text-xs text-blue-400 font-mono mb-1">
                <span>INPUT LAYER</span>
                <span>28×28×1</span>
              </div>
              <h4 className="text-sm font-bold text-white">Ảnh Đầu Vào Grayscale</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Ảnh 28×28 pixel với giá trị được chuẩn hóa về đoạn [0.0, 1.0].
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Shape: [28, 28, 1]</span>
              <span>784 pixel</span>
            </div>
          </div>

          {/* Card 2: Block 1 */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="w-1.5 h-full bg-indigo-500 absolute left-0 top-0" />
            <div>
              <div className="flex items-center justify-between text-xs text-indigo-400 font-mono mb-1">
                <span>BLOCK 1: Conv + Pool</span>
                <span>{conv1Filters} filters</span>
              </div>
              <h4 className="text-sm font-bold text-white">Conv2D (3×3) + MaxPool (2×2)</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {conv1Filters} bộ lọc quét tìm các đường viền cạnh và góc cơ bản. Sau đó Max Pooling nén ảnh từ 28×28 xuống 14×14.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Output: [14, 14, {conv1Filters}]</span>
              <span>~{pConv1.toLocaleString()} params</span>
            </div>
          </div>

          {/* Card 3: Block 2 */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="w-1.5 h-full bg-purple-500 absolute left-0 top-0" />
            <div>
              <div className="flex items-center justify-between text-xs text-purple-400 font-mono mb-1">
                <span>BLOCK 2: Conv + Pool</span>
                <span>{conv2Filters} filters</span>
              </div>
              <h4 className="text-sm font-bold text-white">Conv2D (3×3) + MaxPool (2×2)</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Trích xuất đặc trưng bậc cao (hoa văn, đường cong kín). Max Pooling nén tiếp từ 14×14 xuống 7×7.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Output: [7, 7, {conv2Filters}]</span>
              <span>~{pConv2.toLocaleString()} params</span>
            </div>
          </div>

          {/* Card 4: Dense & Output */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="w-1.5 h-full bg-emerald-500 absolute left-0 top-0" />
            <div>
              <div className="flex items-center justify-between text-xs text-emerald-400 font-mono mb-1">
                <span>CLASSIFIER HEAD</span>
                <span>Softmax</span>
              </div>
              <h4 className="text-sm font-bold text-white">Flatten &rarr; Dense &rarr; Output</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Duỗi phẳng {flattenUnits} đặc trưng thành {denseUnits} nơ-ron Dense, có Dropout ({Math.round(dropoutRate * 100)}%) chống học vẹt, đưa ra xác suất {numClasses} lớp.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Output: [{numClasses}] xác suất</span>
              <span>~{(pDense1 + pOutput).toLocaleString()} params</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hyperparameters Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Architecture Hyperparameters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Tham số Cấu trúc Lớp (Network Architecture)
          </h3>

          {/* Conv 1 Filters */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Số bộ lọc Lớp 1 (Conv1 Filters):</span>
              <span className="font-mono text-indigo-400 font-bold">{conv1Filters} bộ lọc</span>
            </div>
            <div className="flex gap-2">
              {[8, 16, 32].map((f) => (
                <button
                  key={f}
                  onClick={() => setHyperparameters(prev => ({ ...prev, conv1Filters: f }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    conv1Filters === f
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {f} filters
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Càng nhiều bộ lọc thì nhận diện được càng nhiều loại cạnh/vạch, nhưng tốn thêm RAM/GPU.
            </p>
          </div>

          {/* Conv 2 Filters */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Số bộ lọc Lớp 2 (Conv2 Filters):</span>
              <span className="font-mono text-indigo-400 font-bold">{conv2Filters} bộ lọc</span>
            </div>
            <div className="flex gap-2">
              {[16, 32, 64].map((f) => (
                <button
                  key={f}
                  onClick={() => setHyperparameters(prev => ({ ...prev, conv2Filters: f }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    conv2Filters === f
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {f} filters
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Kết hợp các cạnh từ lớp 1 để tạo thành các đặc trưng phức tạp hơn.
            </p>
          </div>

          {/* Dense Neurons */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Số nơ-ron Fully-Connected (Dense Units):</span>
              <span className="font-mono text-indigo-400 font-bold">{denseUnits} nơ-ron</span>
            </div>
            <div className="flex gap-2">
              {[32, 64, 128].map((u) => (
                <button
                  key={u}
                  onClick={() => setHyperparameters(prev => ({ ...prev, denseUnits: u }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    denseUnits === u
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {u} units
                </button>
              ))}
            </div>
          </div>

          {/* Dropout Rate */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Tỉ lệ Dropout (Chống Overfitting):</span>
              <span className="font-mono text-indigo-400 font-bold">{Math.round(dropoutRate * 100)}%</span>
            </div>
            <div className="flex gap-2">
              {[0, 0.2, 0.35, 0.5].map((d) => (
                <button
                  key={d}
                  onClick={() => setHyperparameters(prev => ({ ...prev, dropoutRate: d }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    dropoutRate === d
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {Math.round(d * 100)}%
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Dropout ngẫu nhiên tắt bớt nơ-ron khi train, giúp mô hình tổng quát hóa tốt hơn thay vì học vẹt.
            </p>
          </div>
        </div>

        {/* Right: Training Hyperparameters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Siêu tham số Huấn luyện (Training Hyperparameters)
          </h3>

          {/* Epochs */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Số vòng lặp (Epochs):</span>
              <span className="font-mono text-amber-400 font-bold">{epochs} epochs</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={epochs}
              onChange={(e) => setHyperparameters(prev => ({ ...prev, epochs: Number(e.target.value) }))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>5 vòng (Nhanh)</span>
              <span>20 (Tiêu chuẩn)</span>
              <span>50 (Học sâu)</span>
            </div>
          </div>

          {/* Batch Size */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Kích thước mẻ học (Batch Size):</span>
              <span className="font-mono text-amber-400 font-bold">{batchSize} mẫu/bước</span>
            </div>
            <div className="flex gap-2">
              {[8, 16, 32].map((b) => (
                <button
                  key={b}
                  onClick={() => setHyperparameters(prev => ({ ...prev, batchSize: b }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    batchSize === b
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Số lượng ảnh mô hình xử lý cùng một lúc trước khi cập nhật trọng số.
            </p>
          </div>

          {/* Learning Rate */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Tốc độ học (Learning Rate):</span>
              <span className="font-mono text-amber-400 font-bold">{learningRate}</span>
            </div>
            <div className="flex gap-2">
              {[0.0005, 0.001, 0.005, 0.01].map((lr) => (
                <button
                  key={lr}
                  onClick={() => setHyperparameters(prev => ({ ...prev, learningRate: lr }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    learningRate === lr
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {lr}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Bước nhảy cập nhật Gradient Descent. Quá lớn sẽ nhảy quá đà, quá nhỏ sẽ học rất chậm.
            </p>
          </div>

          {/* Optimizer */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Thuật toán Tối ưu (Optimizer):</span>
              <span className="font-mono text-amber-400 font-bold uppercase">{optimizer}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setHyperparameters(prev => ({ ...prev, optimizer: 'adam' }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  optimizer === 'adam'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Adam (Tự thích ứng &bull; Khuyên dùng)
              </button>
              <button
                onClick={() => setHyperparameters(prev => ({ ...prev, optimizer: 'sgd' }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  optimizer === 'sgd'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                SGD (Gradient chuẩn)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Student Concept Card */}
      <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-5 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-200 space-y-1">
          <p className="font-semibold text-white text-sm">
            Học sinh lưu ý gì khi chọn kiến trúc mạng?
          </p>
          <p className="leading-relaxed text-slate-300">
            Không phải mô hình càng nhiều tham số thì càng tốt! Mô hình quá phức tạp trên tập dữ liệu nhỏ có thể dẫn tới hiện tượng <strong>Overfitting (Học vẹt)</strong>: nhớ như in từng điểm ảnh của tập Train nhưng lại đoán sai bét khi gặp ảnh mới ở tập Validation.
          </p>
        </div>
      </div>
    </div>
  );
};
