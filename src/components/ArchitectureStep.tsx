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
      {/* Header Banner - Clean White Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              Bước 2: Cấu hình Training & Kiến trúc Mạng CNN
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Cấu hình Training & Siêu Tham số Mô hình
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Mạng CNN không nhìn từng pixel riêng lẻ như nơ-ron thông thường, mà sử dụng các bộ lọc (Kernels) trượt qua ảnh để tìm ra các góc cạnh, hoa văn và hình dạng cốt lõi.
            </p>
          </div>

          <button
            onClick={onProceedToTrain}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs flex items-center gap-2 transition-all self-start md:self-center cursor-pointer"
          >
            <span>Sẵn sàng: Bắt đầu Huấn luyện</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Profiles Selector */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <span className="text-xs font-semibold text-slate-600 mr-1">Cấu hình mẫu gợi ý:</span>
        <button
          onClick={() => applyPresetProfile('light')}
          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          CNN Tinh gọn (Siêu nhanh 1s)
        </button>
        <button
          onClick={() => applyPresetProfile('standard')}
          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5 text-indigo-600" />
          CNN Tiêu chuẩn (Khuyên dùng)
        </button>
        <button
          onClick={() => applyPresetProfile('deep')}
          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-purple-600" />
          CNN Nâng cao (Độ biểu diễn cao)
        </button>
      </div>

      {/* Interactive Visual CNN Architecture Diagram */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Sơ đồ Trực quan Luồng Mạng CNN
          </h3>
          <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Tổng trọng số (Parameters): ~{totalParams.toLocaleString()}
          </span>
        </div>

        {/* Pipeline horizontal cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Input */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="w-1.5 h-full bg-blue-500 absolute left-0 top-0" />
            <div>
              <div className="flex items-center justify-between text-xs text-blue-700 font-mono font-bold mb-1">
                <span>INPUT LAYER</span>
                <span>28×28×1</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Ảnh Đầu Vào Grayscale</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Ảnh 28×28 pixel với giá trị được chuẩn hóa về đoạn [0.0, 1.0].
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600 font-mono">
              <span>Shape: [28, 28, 1]</span>
              <span>784 pixel</span>
            </div>
          </div>

          {/* Card 2: Block 1 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="w-1.5 h-full bg-indigo-500 absolute left-0 top-0" />
            <div>
              <div className="flex items-center justify-between text-xs text-indigo-700 font-mono font-bold mb-1">
                <span>BLOCK 1: Conv + Pool</span>
                <span>{conv1Filters} filters</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Conv2D (3×3) + MaxPool (2×2)</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {conv1Filters} bộ lọc quét tìm các đường viền cạnh và góc cơ bản. Sau đó Max Pooling nén ảnh từ 28×28 xuống 14×14.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600 font-mono">
              <span>Output: [14, 14, {conv1Filters}]</span>
              <span>~{pConv1.toLocaleString()} params</span>
            </div>
          </div>

          {/* Card 3: Block 2 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="w-1.5 h-full bg-purple-500 absolute left-0 top-0" />
            <div>
              <div className="flex items-center justify-between text-xs text-purple-700 font-mono font-bold mb-1">
                <span>BLOCK 2: Conv + Pool</span>
                <span>{conv2Filters} filters</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Conv2D (3×3) + MaxPool (2×2)</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Trích xuất đặc trưng bậc cao (hoa văn, đường cong kín). Max Pooling nén tiếp từ 14×14 xuống 7×7.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600 font-mono">
              <span>Output: [7, 7, {conv2Filters}]</span>
              <span>~{pConv2.toLocaleString()} params</span>
            </div>
          </div>

          {/* Card 4: Dense & Output */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="w-1.5 h-full bg-emerald-500 absolute left-0 top-0" />
            <div>
              <div className="flex items-center justify-between text-xs text-emerald-700 font-mono font-bold mb-1">
                <span>CLASSIFIER HEAD</span>
                <span>Softmax</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Flatten &rarr; Dense &rarr; Output</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Duỗi phẳng {flattenUnits} đặc trưng thành {denseUnits} nơ-ron Dense, có Dropout ({Math.round(dropoutRate * 100)}%) chống học vẹt, đưa ra xác suất {numClasses} lớp.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600 font-mono">
              <span>Output: [{numClasses}] xác suất</span>
              <span>~{(pDense1 + pOutput).toLocaleString()} params</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hyperparameters Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Architecture Hyperparameters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Tham số Cấu trúc Lớp (Network Architecture)
          </h3>

          {/* Conv 1 Filters */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-700 font-semibold">Số bộ lọc Lớp 1 (Conv1 Filters):</span>
              <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{conv1Filters} bộ lọc</span>
            </div>
            <div className="flex gap-2">
              {[8, 16, 32].map((f) => (
                <button
                  key={f}
                  onClick={() => setHyperparameters(prev => ({ ...prev, conv1Filters: f }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    conv1Filters === f
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {f} filters
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Càng nhiều bộ lọc thì nhận diện được càng nhiều loại cạnh/vạch, nhưng tốn thêm RAM/GPU.
            </p>
          </div>

          {/* Conv 2 Filters */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-700 font-semibold">Số bộ lọc Lớp 2 (Conv2 Filters):</span>
              <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{conv2Filters} bộ lọc</span>
            </div>
            <div className="flex gap-2">
              {[16, 32, 64].map((f) => (
                <button
                  key={f}
                  onClick={() => setHyperparameters(prev => ({ ...prev, conv2Filters: f }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    conv2Filters === f
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {f} filters
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Kết hợp các cạnh từ lớp 1 để tạo thành các đặc trưng hoa văn phức tạp hơn.
            </p>
          </div>

          {/* Dense Neurons */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-700 font-semibold">Số nơ-ron Fully-Connected (Dense Units):</span>
              <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{denseUnits} nơ-ron</span>
            </div>
            <div className="flex gap-2">
              {[32, 64, 128].map((u) => (
                <button
                  key={u}
                  onClick={() => setHyperparameters(prev => ({ ...prev, denseUnits: u }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    denseUnits === u
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {u} units
                </button>
              ))}
            </div>
          </div>

          {/* Dropout Rate */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-700 font-semibold">Tỉ lệ Dropout (Chống Overfitting):</span>
              <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{Math.round(dropoutRate * 100)}%</span>
            </div>
            <div className="flex gap-2">
              {[0, 0.2, 0.35, 0.5].map((d) => (
                <button
                  key={d}
                  onClick={() => setHyperparameters(prev => ({ ...prev, dropoutRate: d }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    dropoutRate === d
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {Math.round(d * 100)}%
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Dropout ngẫu nhiên tắt bớt nơ-ron khi train, giúp mô hình tổng quát hóa tốt hơn thay vì học vẹt.
            </p>
          </div>
        </div>

        {/* Right: Training Hyperparameters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Siêu tham số Huấn luyện (Training Hyperparameters)
          </h3>

          {/* Epochs */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-700 font-semibold">Số vòng lặp (Epochs):</span>
              <span className="font-mono text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{epochs} epochs</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={epochs}
              onChange={(e) => setHyperparameters(prev => ({ ...prev, epochs: Number(e.target.value) }))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1.5">
              <span>5 vòng (Nhanh)</span>
              <span>20 (Tiêu chuẩn)</span>
              <span>50 (Học sâu)</span>
            </div>
          </div>

          {/* Batch Size */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-700 font-semibold">Kích thước mẻ học (Batch Size):</span>
              <span className="font-mono text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{batchSize} mẫu/bước</span>
            </div>
            <div className="flex gap-2">
              {[8, 16, 32].map((b) => (
                <button
                  key={b}
                  onClick={() => setHyperparameters(prev => ({ ...prev, batchSize: b }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    batchSize === b
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Số lượng ảnh mô hình xử lý cùng một lúc trước khi cập nhật trọng số.
            </p>
          </div>

          {/* Learning Rate */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-700 font-semibold">Tốc độ học (Learning Rate):</span>
              <span className="font-mono text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{learningRate}</span>
            </div>
            <div className="flex gap-2">
              {[0.0005, 0.001, 0.005, 0.01].map((lr) => (
                <button
                  key={lr}
                  onClick={() => setHyperparameters(prev => ({ ...prev, learningRate: lr }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    learningRate === lr
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {lr}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Bước nhảy cập nhật Gradient Descent. Quá lớn sẽ nhảy quá đà, quá nhỏ sẽ học rất chậm.
            </p>
          </div>

          {/* Optimizer */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-700 font-semibold">Thuật toán Tối ưu (Optimizer):</span>
              <span className="font-mono text-amber-700 font-bold uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{optimizer}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setHyperparameters(prev => ({ ...prev, optimizer: 'adam' }))}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  optimizer === 'adam'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Adam (Tự thích ứng &bull; Khuyên dùng)
              </button>
              <button
                onClick={() => setHyperparameters(prev => ({ ...prev, optimizer: 'sgd' }))}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  optimizer === 'sgd'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                SGD (Gradient chuẩn)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Student Concept Card */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 space-y-1">
          <p className="font-bold text-indigo-900 text-sm">
            Học sinh lưu ý gì khi chọn kiến trúc mạng?
          </p>
          <p className="leading-relaxed text-indigo-800">
            Không phải mô hình càng nhiều tham số thì càng tốt! Mô hình quá phức tạp trên tập dữ liệu nhỏ có thể dẫn tới hiện tượng <strong>Overfitting (Học vẹt)</strong>: nhớ như in từng điểm ảnh của tập Train nhưng lại đoán sai bét khi gặp ảnh mới ở tập Validation.
          </p>
        </div>
      </div>
    </div>
  );
};
