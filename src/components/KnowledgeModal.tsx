import React from 'react';
import { X, BookOpen, Layers, Zap, Shield, TrendingUp, HelpCircle } from 'lucide-react';

interface KnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeModal: React.FC<KnowledgeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full my-8 p-6 sm:p-8 shadow-2xl relative text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Sổ tay Lý thuyết CNN cho Học sinh
            </h2>
            <p className="text-xs text-slate-500">
              Khái niệm cốt lõi về Mạng Nơ-ron Tích chập (Convolutional Neural Network)
            </p>
          </div>
        </div>

        {/* Handbook Content */}
        <div className="space-y-4 text-xs sm:text-sm leading-relaxed max-h-[70vh] overflow-y-auto pr-2">
          
          {/* Section 1 */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              1. Tại sao cần Mạng CNN để nhìn hình ảnh?
            </h3>
            <p className="text-slate-700">
              Mạng nơ-ron truyền thống (MLP) duỗi phẳng toàn bộ pixel thành 1 hàng dọc, làm mất đi mối quan hệ không gian lân cận (ảnh bên trái, bên phải, phía trên, phía dưới). 
              <strong className="text-slate-900"> Mạng CNN (Convolutional Neural Network)</strong> giữ nguyên cấu trúc 2 chiều của bức ảnh, dùng các &quot;kính lúp nhỏ&quot; trượt khắp ảnh để tìm ra đặc trưng cục bộ.
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-cyan-600" />
              2. Bộ lọc (Kernel / Filter) và Phép Tích chập làm gì?
            </h3>
            <p className="text-slate-700">
              Bộ lọc thường là một ma trận số nhỏ (ví dụ 3×3). Khi trượt qua từng ô 3×3 trên ảnh, nó thực hiện phép nhân từng phần tử rồi cộng lại:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
              <li>Lớp tích chập đầu tiên tìm ra: các đường viền ngang, viền dọc, góc chéo, độ tương phản sáng tối.</li>
              <li>Lớp tích chập thứ hai kết hợp các đường nét trên để tìm ra: hình tròn, tam giác, đường cong kín, hoa văn.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-amber-600" />
              3. Max Pooling (Gộp cực đại) để làm gì?
            </h3>
            <p className="text-slate-700">
              Lớp <strong className="text-slate-900">MaxPooling2D (2×2)</strong> chia ảnh thành các ô vuông 2×2 và chỉ giữ lại số lớn nhất trong ô đó. Điều này giúp:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
              <li>Giảm kích thước ảnh đi một nửa (từ 28×28 còn 14×14, rồi còn 7×7), giảm đáng kể tính toán cho GPU/CPU.</li>
              <li>Giúp mô hình nhận diện được vật thể dù vật thể đó có bị xê dịch nhẹ vị trí trên khung hình (Translation Invariance).</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-rose-600" />
              4. Hiện tượng Học vẹt (Overfitting) là gì?
            </h3>
            <p className="text-slate-700">
              <strong className="text-slate-900">Overfitting</strong> xảy ra khi mô hình &quot;học thuộc lòng&quot; từng chi tiết vụn vặt và cả vết nhiễu của tập Train. Khi đó:
            </p>
            <div className="mt-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-mono text-xs font-semibold">
              Train Accuracy: 99% (Cực cao) &bull; Validation Accuracy: 60% (Kém)
            </div>
            <p className="mt-2 text-slate-700">
              <strong className="text-slate-900">Cách phòng tránh:</strong>
            </p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600">
              <li><strong className="text-slate-800">Tăng Data Augmentation:</strong> Xoay nhẹ, dịch chuyển ảnh gốc để AI học bản chất hình học.</li>
              <li><strong className="text-slate-800">Dropout:</strong> Ngẫu nhiên tắt 25-40% nơ-ron khi huấn luyện để các nơ-ron không ỷ lại vào nhau.</li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              5. Ý nghĩa của 3 tập: Train, Validation và Test
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                <span className="font-bold block text-sm mb-1 text-emerald-800">Train (70%)</span>
                Dữ liệu để mạng CNN học bài, điều chỉnh trọng số thông qua giải thuật Gradient Descent.
              </div>
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                <span className="font-bold block text-sm mb-1 text-amber-800">Validation (15%)</span>
                Bài thi thử giữa kỳ sau mỗi Epoch để kiểm tra xem mô hình có bị học vẹt hay không.
              </div>
              <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-purple-900">
                <span className="font-bold block text-sm mb-1 text-purple-800">Test (15%)</span>
                Kỳ thi tốt nghiệp độc lập, tuyệt đối không được dùng trong khi huấn luyện.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Đã hiểu & Quay lại phòng thí nghiệm
          </button>
        </div>
      </div>
    </div>
  );
};
