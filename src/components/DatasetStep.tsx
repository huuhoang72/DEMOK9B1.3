import React, { useState, useRef, useEffect } from 'react';
import { ClassCategory, DatasetSample } from '../types';
import { extractDatasetFromZip, imageBlobToGrayscaleDataUrl } from '../utils/zipLoader';
import { resplitDataset } from '../utils/presetGenerator';
import { 
  Camera, 
  Upload, 
  FolderArchive, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Sliders, 
  Check, 
  AlertCircle,
  Eye,
  CameraOff,
  Tag,
  CheckSquare,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface DatasetStepProps {
  classes: ClassCategory[];
  setClasses: React.Dispatch<React.SetStateAction<ClassCategory[]>>;
  samples: DatasetSample[];
  setSamples: React.Dispatch<React.SetStateAction<DatasetSample[]>>;
  trainRatio: number;
  setTrainRatio: (ratio: number) => void;
  valRatio: number;
  setValRatio: (ratio: number) => void;
  onProceedToArchitecture: () => void;
}

export const DatasetStep: React.FC<DatasetStepProps> = ({
  classes,
  setClasses,
  samples,
  setSamples,
  trainRatio,
  setTrainRatio,
  valRatio,
  setValRatio,
  onProceedToArchitecture
}) => {
  // Input mode: 'zip' | 'webcam' | 'upload'
  const [inputMode, setInputMode] = useState<'zip' | 'webcam' | 'upload'>('zip');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterSplit, setFilterSplit] = useState<string>('all');

  // Zip upload state
  const [isExtractingZip, setIsExtractingZip] = useState(false);
  const [zipMessage, setZipMessage] = useState<string | null>(null);

  // Webcam state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isBurstRecording, setIsBurstRecording] = useState(false);
  const burstIntervalRef = useRef<number | null>(null);

  // Class modal / editing
  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState('#3B82F6');
  const [newClassIcon, setNewClassIcon] = useState('🏷️');
  const [showAddClassModal, setShowAddClassModal] = useState(false);

  // Multi-select for relabeling
  const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(new Set());
  const [batchTargetClassId, setBatchTargetClassId] = useState<string>('');

  // Keep selectedClassId valid
  useEffect(() => {
    if (classes.length > 0 && !classes.some(c => c.id === selectedClassId)) {
      setSelectedClassId(classes[0].id);
    }
    if (classes.length > 0 && !batchTargetClassId) {
      setBatchTargetClassId(classes[0].id);
    }
  }, [classes, selectedClassId, batchTargetClassId]);

  // Webcam controls
  const startWebcam = async () => {
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsWebcamActive(true);
      }
    } catch (err) {
      console.error(err);
      setWebcamError('Không thể mở camera. Vui lòng cho phép quyền webcam trên trình duyệt.');
      setIsWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (burstIntervalRef.current) {
      clearInterval(burstIntervalRef.current);
      burstIntervalRef.current = null;
    }
    setIsBurstRecording(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
  };

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  // Capture frame from webcam
  const captureWebcamSample = (count = 1) => {
    const video = videoRef.current;
    if (!video || !isWebcamActive) return;

    if (!selectedClassId) {
      alert('Vui lòng tạo hoặc chọn một Lớp để gán nhãn cho ảnh chụp!');
      return;
    }

    const minDim = Math.min(video.videoWidth || 300, video.videoHeight || 300);
    const startX = Math.max(0, ((video.videoWidth || 300) - minDim) / 2);
    const startY = Math.max(0, ((video.videoHeight || 300) - minDim) / 2);

    const newItems: DatasetSample[] = [];

    for (let i = 0; i < count; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 28;
      canvas.height = 28;
      const ctx = canvas.getContext('2d')!;

      // Center crop square and resize to 28x28
      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 28, 28);

      // Convert to grayscale
      const imgData = ctx.getImageData(0, 0, 28, 28);
      const d = imgData.data;
      for (let j = 0; j < d.length; j += 4) {
        const gray = Math.round(0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]);
        d[j] = gray;
        d[j + 1] = gray;
        d[j + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);

      newItems.push({
        id: `webcam_${Date.now()}_${i}`,
        classId: selectedClassId,
        dataUrl: canvas.toDataURL('image/png'),
        split: 'train',
        createdAt: Date.now() + i
      });
    }

    setSamples(prev => {
      const combined = [...prev, ...newItems];
      return resplitDataset(combined, classes, trainRatio, valRatio);
    });
  };

  // Toggle burst recording (continuous capture every 250ms)
  const toggleBurstRecording = () => {
    if (isBurstRecording) {
      if (burstIntervalRef.current) {
        clearInterval(burstIntervalRef.current);
        burstIntervalRef.current = null;
      }
      setIsBurstRecording(false);
    } else {
      if (!selectedClassId) {
        alert('Vui lòng chọn lớp để gán nhãn trước khi chụp liên tục!');
        return;
      }
      setIsBurstRecording(true);
      burstIntervalRef.current = window.setInterval(() => {
        captureWebcamSample(1);
      }, 250);
    }
  };

  // Handle ZIP file upload with automatic class discovery
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingZip(true);
    setZipMessage(null);

    try {
      const currentSelectedName = classes.find(c => c.id === selectedClassId)?.name || 'Lớp mới';
      const result = await extractDatasetFromZip(
        file,
        classes,
        currentSelectedName,
        { train: trainRatio / 100, val: valRatio / 100 }
      );

      setClasses(result.classes);
      setSamples(prev => {
        const combined = [...prev, ...result.samples];
        return resplitDataset(combined, result.classes, trainRatio, valRatio);
      });

      setZipMessage(
        `🎉 Đã tải thành công ${result.summary.totalImages} ảnh! Tự động nhận diện ${result.summary.classesFound.length} lớp: ${result.summary.classesFound.join(', ')}.`
      );
    } catch (err: unknown) {
      console.error(err);
      alert(`Lỗi giải nén ZIP: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExtractingZip(false);
      e.target.value = '';
    }
  };

  // Handle folder upload with webkitdirectory
  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsExtractingZip(true);
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const newSamples: DatasetSample[] = [];
    const updatedClasses = [...classes];
    const labelToClassId = new Map<string, string>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lowerName = file.name.toLowerCase();
      if (!validExtensions.some(ext => lowerName.endsWith(ext))) continue;

      // Extract folder name as class
      // webkitRelativePath example: "my_data/dog/image_1.jpg"
      const pathParts = file.webkitRelativePath.split('/').filter(Boolean);
      let labelName = 'Chưa gán nhãn';
      if (pathParts.length >= 2) {
        labelName = pathParts[pathParts.length - 2];
      } else if (selectedClassId) {
        labelName = classes.find(c => c.id === selectedClassId)?.name || 'Lớp mới';
      }

      // Check or create class
      if (!labelToClassId.has(labelName)) {
        let matched = updatedClasses.find(c => c.name.toLowerCase() === labelName.toLowerCase());
        if (!matched) {
          matched = {
            id: `class_${Date.now()}_${updatedClasses.length}`,
            name: labelName,
            color: ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'][updatedClasses.length % 5],
            icon: '🏷️'
          };
          updatedClasses.push(matched);
        }
        labelToClassId.set(labelName, matched.id);
      }

      try {
        const dataUrl = await imageBlobToGrayscaleDataUrl(file);
        newSamples.push({
          id: `file_${Date.now()}_${i}`,
          classId: labelToClassId.get(labelName)!,
          dataUrl,
          split: 'train',
          createdAt: Date.now() + i
        });
      } catch (err) {
        console.warn('Error reading file:', err);
      }
    }

    setClasses(updatedClasses);
    setSamples(prev => {
      const combined = [...prev, ...newSamples];
      return resplitDataset(combined, updatedClasses, trainRatio, valRatio);
    });

    setIsExtractingZip(false);
    setZipMessage(`🎉 Đã nạp ${newSamples.length} ảnh từ thư mục và tự động tạo ${labelToClassId.size} lớp!`);
    e.target.value = '';
  };

  // Upload individual image files
  const handleIndividualFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!selectedClassId) {
      alert('Vui lòng chọn hoặc tạo một Lớp trước để gán nhãn cho các ảnh này!');
      return;
    }

    setIsExtractingZip(true);
    const newItems: DatasetSample[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const dataUrl = await imageBlobToGrayscaleDataUrl(files[i]);
        newItems.push({
          id: `upload_${Date.now()}_${i}`,
          classId: selectedClassId,
          dataUrl,
          split: 'train',
          createdAt: Date.now() + i
        });
      } catch (err) {
        console.warn('Error reading file:', err);
      }
    }

    setSamples(prev => {
      const combined = [...prev, ...newItems];
      return resplitDataset(combined, classes, trainRatio, valRatio);
    });

    setIsExtractingZip(false);
    e.target.value = '';
  };

  // Add new custom class
  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    const id = `class_${Date.now()}`;
    const newCategory: ClassCategory = {
      id,
      name: newClassName.trim(),
      color: newClassColor,
      icon: newClassIcon || '🏷️'
    };
    setClasses(prev => [...prev, newCategory]);
    setSelectedClassId(id);
    setNewClassName('');
    setShowAddClassModal(false);
  };

  // Delete a class
  const handleDeleteClass = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa lớp này cùng toàn bộ ảnh gắn với nó?')) {
      setClasses(prev => prev.filter(c => c.id !== id));
      setSamples(prev => prev.filter(s => s.classId !== id));
    }
  };

  // Delete sample
  const handleDeleteSample = (id: string) => {
    setSamples(prev => prev.filter(s => s.id !== id));
    setSelectedSampleIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Relabel selected samples
  const handleRelabelSelected = () => {
    if (selectedSampleIds.size === 0 || !batchTargetClassId) return;
    setSamples(prev =>
      prev.map(s => {
        if (selectedSampleIds.has(s.id)) {
          return { ...s, classId: batchTargetClassId };
        }
        return s;
      })
    );
    setSelectedSampleIds(new Set());
  };

  // Re-split dataset
  const handleReSplit = () => {
    setSamples(prev => resplitDataset(prev, classes, trainRatio, valRatio));
  };

  // Select all visible samples
  const toggleSelectAllVisible = () => {
    if (selectedSampleIds.size === filteredSamples.length) {
      setSelectedSampleIds(new Set());
    } else {
      setSelectedSampleIds(new Set(filteredSamples.map(s => s.id)));
    }
  };

  // Filtered samples
  const filteredSamples = samples.filter(sample => {
    const matchClass = filterClass === 'all' || sample.classId === filterClass;
    const matchSplit = filterSplit === 'all' || sample.split === filterSplit;
    return matchClass && matchSplit;
  });

  const testRatio = Math.max(0, 100 - trainRatio - valRatio);
  const trainCount = samples.filter(s => s.split === 'train').length;
  const valCount = samples.filter(s => s.split === 'val').length;
  const testCount = samples.filter(s => s.split === 'test').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
              <Tag className="w-3.5 h-3.5" />
              Bước 1: Nạp Dữ liệu & Học sinh Tự Gán Nhãn
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Tự Động Nạp Ảnh & Tạo Lớp Nhận Diện
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Bạn có thể <strong>tải file ZIP chứa các thư mục lớp</strong> (hệ thống sẽ tự động quét thư mục và tạo nhãn), <strong>chụp trực tiếp từ Webcam</strong> hoặc tải ảnh và tự gán nhãn cho từng lớp.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            {samples.length > 0 && classes.length >= 2 && (
              <button
                onClick={onProceedToArchitecture}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all"
              >
                Tiếp tục: Cấu hình CNN &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Class Management Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Danh sách các Lớp do Học sinh Tạo
              <span className="text-xs font-normal text-slate-400">({classes.length} lớp)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Mỗi lớp là một nhóm ảnh để mô hình CNN học cách phân biệt (Cần tối thiểu 2 lớp để huấn luyện)
            </p>
          </div>

          <button
            onClick={() => setShowAddClassModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            + Tạo lớp mới
          </button>
        </div>

        {classes.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <Tag className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-white">Chưa có lớp nào</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Hãy bấm <strong>&quot;Tạo lớp mới&quot;</strong> hoặc <strong>tải file ZIP</strong> chứa các thư mục con (ví dụ: `cho/`, `meo/`) để hệ thống tự động tạo lớp cho bạn!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {classes.map((cls) => {
              const classSamples = samples.filter(s => s.classId === cls.id);
              const trainN = classSamples.filter(s => s.split === 'train').length;
              const valN = classSamples.filter(s => s.split === 'val').length;
              const testN = classSamples.filter(s => s.split === 'test').length;
              const isSelected = selectedClassId === cls.id;

              return (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`cursor-pointer rounded-xl p-3.5 border transition-all duration-150 relative ${
                    isSelected
                      ? 'bg-slate-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                        style={{ backgroundColor: `${cls.color}25`, border: `1px solid ${cls.color}40` }}
                      >
                        {cls.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                          {cls.name}
                          {isSelected && (
                            <span className="text-[10px] text-indigo-400 font-normal px-1.5 py-0.2 bg-indigo-500/10 rounded">
                              Đang gán
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono">
                          {classSamples.length} ảnh
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(cls.id);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="Xóa lớp này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Split counts */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-emerald-400 font-mono">Train: {trainN}</span>
                    <span className="text-amber-400 font-mono">Val: {valN}</span>
                    <span className="text-purple-400 font-mono">Test: {testN}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Upload / Capture Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Input Modes (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
          {/* Method Selector Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-4">
            <button
              onClick={() => {
                stopWebcam();
                setInputMode('zip');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                inputMode === 'zip'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FolderArchive className="w-4 h-4" />
              Tải File ZIP (Tự tạo lớp)
            </button>

            <button
              onClick={() => {
                setInputMode('webcam');
                startWebcam();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                inputMode === 'webcam'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              Chụp Webcam Thực tế
            </button>

            <button
              onClick={() => {
                stopWebcam();
                setInputMode('upload');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                inputMode === 'upload'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Upload className="w-4 h-4" />
              Tải Thư mục / Ảnh lẻ
            </button>
          </div>

          {/* Mode 1: ZIP Upload */}
          {inputMode === 'zip' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-950/40 transition-colors">
                <FolderArchive className="w-12 h-12 text-indigo-400 mb-3" />
                <h4 className="text-base font-bold text-white">Tải lên File .ZIP Bộ Dữ Liệu</h4>
                <p className="text-xs text-slate-400 mt-1.5 max-w-md leading-relaxed">
                  Tạo file ZIP chứa các thư mục con tương ứng với từng nhãn (ví dụ: <code className="text-indigo-300">cho/</code>, <code className="text-indigo-300">meo/</code>, <code className="text-indigo-300">xe_hoi/</code>). 
                  Hệ thống sẽ <strong>tự động quét và tạo các lớp</strong> tương ứng!
                </p>

                {isExtractingZip ? (
                  <div className="mt-4 flex items-center gap-2 text-indigo-400 text-xs font-mono">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang giải nén và tiền xử lý ảnh 28×28...
                  </div>
                ) : (
                  <label className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2">
                    <FolderArchive className="w-4 h-4" />
                    <span>Chọn File .ZIP từ máy tính</span>
                    <input
                      type="file"
                      accept=".zip,application/zip"
                      onChange={handleZipUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {zipMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{zipMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Real Webcam Capture */}
          {inputMode === 'webcam' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 font-medium">Gán nhãn cho lớp:</span>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium text-xs focus:ring-1 focus:ring-indigo-500"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>

                {isWebcamActive ? (
                  <button
                    onClick={stopWebcam}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 self-start sm:self-auto"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    Tắt Camera
                  </button>
                ) : (
                  <button
                    onClick={startWebcam}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 self-start sm:self-auto"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Bật lại Camera
                  </button>
                )}
              </div>

              {webcamError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{webcamError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-5 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <div className="relative w-56 h-56 rounded-2xl overflow-hidden bg-black border border-slate-700 shadow-lg flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Aim boundary */}
                  <div className="absolute inset-5 border-2 border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] text-emerald-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur font-mono">
                      Khung 1:1
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 w-full sm:w-auto">
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Giơ vật thể thật hoặc cử chỉ trước camera. Bấm chụp để lưu và tự động gán nhãn cho lớp đã chọn:
                  </p>

                  <button
                    onClick={() => captureWebcamSample(1)}
                    disabled={!isWebcamActive || !selectedClassId}
                    className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <Camera className="w-4 h-4" />
                    Chụp 1 ảnh
                  </button>

                  <button
                    onClick={() => captureWebcamSample(5)}
                    disabled={!isWebcamActive || !selectedClassId}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-indigo-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Chụp nhanh 5 ảnh
                  </button>

                  <button
                    onClick={toggleBurstRecording}
                    disabled={!isWebcamActive || !selectedClassId}
                    className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border ${
                      isBurstRecording
                        ? 'bg-red-600 text-white border-red-500 animate-pulse'
                        : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${isBurstRecording ? 'animate-spin' : ''}`} />
                    {isBurstRecording ? 'Đang chụp liên tục... (Bấm để dừng)' : 'Bật chụp liên tục (1 ảnh/250ms)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode 3: Folder or Loose Files Upload */}
          {inputMode === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-xs mb-2">
                <span className="text-slate-400 font-medium">Gán nhãn cho lớp:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-medium text-xs"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Folder Upload */}
                <div className="border border-slate-700 hover:border-indigo-500 rounded-2xl p-5 text-center bg-slate-950/60 flex flex-col items-center justify-between">
                  <div>
                    <FolderArchive className="w-8 h-8 text-amber-400 mb-2" />
                    <h5 className="text-sm font-bold text-white">Tải cả Thư mục</h5>
                    <p className="text-xs text-slate-400 mt-1">
                      Tải thư mục chứa các thư mục con theo tên lớp
                    </p>
                  </div>
                  <label className="mt-4 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer shadow">
                    <span>Chọn Thư mục</span>
                    <input
                      type="file"
                      // @ts-expect-error webkitdirectory attribute is supported by browsers
                      webkitdirectory="true"
                      directory="true"
                      onChange={handleFolderUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Loose Files Upload */}
                <div className="border border-slate-700 hover:border-indigo-500 rounded-2xl p-5 text-center bg-slate-950/60 flex flex-col items-center justify-between">
                  <div>
                    <Upload className="w-8 h-8 text-cyan-400 mb-2" />
                    <h5 className="text-sm font-bold text-white">Tải nhiều Ảnh lẻ</h5>
                    <p className="text-xs text-slate-400 mt-1">
                      Gán các ảnh chọn được vào lớp đang chọn
                    </p>
                  </div>
                  <label className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer shadow">
                    <span>Chọn các File ảnh</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleIndividualFilesUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Train / Validation / Test Splitting (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Phân chia Tập Dữ liệu
              </h3>
              <button
                onClick={handleReSplit}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                title="Xáo trộn và chia lại"
              >
                <RefreshCw className="w-3 h-3" />
                Chia lại
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Dữ liệu của học sinh được tự động chia thành 3 phần: Huấn luyện, Đánh giá và Kiểm thử độc lập:
            </p>

            {/* Split Sliders */}
            <div className="space-y-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
              {/* Train */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Tập Huấn luyện (Train):
                  </span>
                  <span className="font-mono text-emerald-300 font-bold">{trainRatio}% ({trainCount} ảnh)</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={85}
                  value={trainRatio}
                  onChange={(e) => {
                    const newTrain = Number(e.target.value);
                    setTrainRatio(newTrain);
                    if (newTrain + valRatio > 95) {
                      setValRatio(95 - newTrain);
                    }
                  }}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Validation */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    Tập Đánh giá (Validation):
                  </span>
                  <span className="font-mono text-amber-300 font-bold">{valRatio}% ({valCount} ảnh)</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={30}
                  value={valRatio}
                  onChange={(e) => {
                    const newVal = Number(e.target.value);
                    if (trainRatio + newVal <= 95) {
                      setValRatio(newVal);
                    }
                  }}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Test */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-purple-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                    Tập Kiểm thử (Test):
                  </span>
                  <span className="font-mono text-purple-300 font-bold">{testRatio}% ({testCount} ảnh)</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full transition-all"
                    style={{ width: `${testRatio}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick info note */}
          <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
            <strong>Gợi ý:</strong> Mỗi lớp nên có tối thiểu 10 - 20 ảnh với các góc chụp và độ sáng khác nhau để mạng CNN học tốt nhất!
          </div>
        </div>
      </div>

      {/* Dataset Gallery & Manual Relabeling Tool */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400" />
              Thư viện Mẫu & Công cụ Tự Gán Nhãn
              <span className="text-xs font-normal text-slate-400">
                ({filteredSamples.length} / {samples.length} mẫu hiển thị)
              </span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Filter by class */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-400">Lớp:</span>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              >
                <option value="all">Tất cả các lớp</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Filter by split */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-400">Tập:</span>
              <select
                value={filterSplit}
                onChange={(e) => setFilterSplit(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              >
                <option value="all">Tất cả các tập</option>
                <option value="train">Chỉ Train ({trainCount})</option>
                <option value="val">Chỉ Val ({valCount})</option>
                <option value="test">Chỉ Test ({testCount})</option>
              </select>
            </div>

            {samples.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Bạn có chắc muốn xóa toàn bộ ảnh trong bộ dữ liệu?')) {
                    setSamples([]);
                  }
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-700 text-xs transition-colors"
              >
                Xóa hết
              </button>
            )}
          </div>
        </div>

        {/* Batch Relabel Toolbar */}
        {selectedSampleIds.size > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-950/70 border border-indigo-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <span className="text-white font-medium">Đang chọn {selectedSampleIds.size} ảnh</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-300">Đổi thành nhãn:</span>
              <select
                value={batchTargetClassId}
                onChange={(e) => setBatchTargetClassId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-white text-xs"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              <button
                onClick={handleRelabelSelected}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
              >
                Gán lại nhãn
              </button>
              <button
                onClick={() => setSelectedSampleIds(new Set())}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
              >
                Hủy chọn
              </button>
            </div>
          </div>
        )}

        {/* Gallery Grid */}
        {filteredSamples.length === 0 ? (
          <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
            <p className="text-sm">Chưa có ảnh nào trong bộ dữ liệu.</p>
            <p className="text-xs text-slate-600 mt-1">
              Hãy tải lên file ZIP hoặc mở Webcam để bắt đầu chụp ảnh và gán nhãn!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2.5 max-h-96 overflow-y-auto p-1">
            {filteredSamples.map((sample) => {
              const cls = classes.find(c => c.id === sample.classId);
              const isChecked = selectedSampleIds.has(sample.id);
              const splitBadge = sample.split === 'train'
                ? { label: 'TR', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' }
                : sample.split === 'val'
                ? { label: 'VAL', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' }
                : { label: 'TST', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };

              return (
                <div
                  key={sample.id}
                  onClick={() => {
                    setSelectedSampleIds(prev => {
                      const next = new Set(prev);
                      if (next.has(sample.id)) next.delete(sample.id);
                      else next.add(sample.id);
                      return next;
                    });
                  }}
                  className={`group relative bg-black rounded-lg border overflow-hidden aspect-square flex items-center justify-center p-1 transition-all cursor-pointer ${
                    isChecked
                      ? 'border-indigo-400 ring-2 ring-indigo-400 scale-105'
                      : 'border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <img
                    src={sample.dataUrl}
                    alt={cls?.name || 'sample'}
                    className="w-full h-full object-contain image-rendering-pixelated"
                  />

                  {/* Split badge */}
                  <span
                    className={`absolute top-1 left-1 text-[8px] font-mono font-bold px-1 rounded border ${splitBadge.color}`}
                  >
                    {splitBadge.label}
                  </span>

                  {/* Class indicator dot */}
                  <span
                    className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cls?.color || '#fff' }}
                    title={`Lớp: ${cls?.name}`}
                  />

                  {/* Delete button on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSample(sample.id);
                    }}
                    className="absolute inset-0 bg-red-950/80 text-red-300 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    title="Xóa mẫu này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Custom Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-3">Tạo Lớp / Nhãn mới</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Tên lớp:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bút bi, Cốc nước, Mèo, Chó..."
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Biểu tượng (Icon / Emoji):</label>
                <input
                  type="text"
                  value={newClassIcon}
                  onChange={(e) => setNewClassIcon(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Màu nhận diện:</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={newClassColor}
                    onChange={(e) => setNewClassColor(e.target.value)}
                    className="w-10 h-8 rounded border-none cursor-pointer bg-transparent"
                  />
                  <span className="font-mono text-slate-400">{newClassColor}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowAddClassModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleAddClass}
                disabled={!newClassName.trim()}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium"
              >
                Tạo lớp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
