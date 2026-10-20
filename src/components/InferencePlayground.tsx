import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ClassCategory, PredictionResult } from '../types';
import { tfService, IMAGE_SIZE } from '../services/tfService';
import { 
  Wand2, 
  PenTool, 
  Camera, 
  Upload, 
  RefreshCw, 
  Download, 
  Eye, 
  Sparkles, 
  Layers, 
  Play, 
  Pause,
  CameraOff,
  Zap
} from 'lucide-react';

interface InferencePlaygroundProps {
  classes: ClassCategory[];
  isModelTrained: boolean;
}

export const InferencePlayground: React.FC<InferencePlaygroundProps> = ({
  classes,
  isModelTrained,
}) => {
  const [sandboxMode, setSandboxMode] = useState<'draw' | 'webcam' | 'upload'>('draw');
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [featureMaps, setFeatureMaps] = useState<number[][][]>([]);
  const [isLiveInferencing, setIsLiveInferencing] = useState(true);
  const [inferenceFps, setInferenceFps] = useState(0);

  // Drawing pad
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(16);

  // Webcam
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastInferTimeRef = useRef<number>(0);

  // Uploaded image
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  // Clear draw pad
  const clearDrawPad = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPredictions([]);
    setFeatureMaps([]);
  }, []);

  useEffect(() => {
    if (sandboxMode === 'draw') {
      clearDrawPad();
    } else {
      stopWebcam();
    }
  }, [sandboxMode, clearDrawPad]);

  // Drawing event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();

    if (isLiveInferencing) {
      predictFromDrawCanvas();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    setIsDrawing(false);
    predictFromDrawCanvas();
  };

  // Run prediction from Draw canvas
  const predictFromDrawCanvas = async () => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !isModelTrained) return;

    try {
      const inputTensor = tfService.canvasToTensor(canvas);
      const results = await tfService.predictTensor(inputTensor, classes);
      setPredictions(results);

      // Extract feature maps from layer 1
      const maps = await tfService.extractFeatureMaps(inputTensor);
      setFeatureMaps(maps);

      inputTensor.dispose();
    } catch (err) {
      console.warn('Inference error:', err);
    }
  };

  // Start webcam
  const startWebcam = async () => {
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 400 }, height: { ideal: 400 }, facingMode: 'user' },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsWebcamActive(true);
      }
    } catch (err) {
      console.error(err);
      setWebcamError('Không thể mở camera. Vui lòng cho phép quyền truy cập webcam trong trình duyệt.');
      setIsWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
    setInferenceFps(0);
  };

  // Webcam live prediction loop
  useEffect(() => {
    if (sandboxMode !== 'webcam' || !isWebcamActive || !isModelTrained) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    let isRunning = true;
    let frameCount = 0;
    let lastFpsTime = performance.now();

    const loop = async () => {
      const video = videoRef.current;
      if (!isRunning) return;

      if (video && video.readyState >= 2) {
        const now = performance.now();
        // throttle to ~20 FPS for silky performance without UI choking
        if (now - lastInferTimeRef.current >= 45) {
          lastInferTimeRef.current = now;
          try {
            const inputTensor = tfService.videoToTensor(video);
            const results = await tfService.predictTensor(inputTensor, classes);
            setPredictions(results);

            // Periodically extract feature maps
            if (frameCount % 6 === 0) {
              const maps = await tfService.extractFeatureMaps(inputTensor);
              setFeatureMaps(maps);
            }

            inputTensor.dispose();
            frameCount++;

            if (now - lastFpsTime >= 1000) {
              setInferenceFps(frameCount);
              frameCount = 0;
              lastFpsTime = now;
            }
          } catch (e) {
            console.warn(e);
          }
        }
      }

      if (isRunning) {
        animFrameIdRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [sandboxMode, isWebcamActive, isModelTrained, classes]);

  // Handle uploaded test image
  const handleUploadTestImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (re) => {
      const url = re.target?.result as string;
      setUploadedImageUrl(url);

      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = IMAGE_SIZE;
        canvas.height = IMAGE_SIZE;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, IMAGE_SIZE, IMAGE_SIZE);

        const inputTensor = tfService.canvasToTensor(canvas);
        const results = await tfService.predictTensor(inputTensor, classes);
        setPredictions(results);

        const maps = await tfService.extractFeatureMaps(inputTensor);
        setFeatureMaps(maps);

        inputTensor.dispose();
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  // Render feature map to mini canvas
  const renderFeatureMapCanvas = (map: number[][]) => {
    const canvas = document.createElement('canvas');
    canvas.width = 28;
    canvas.height = 28;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const imgData = ctx.createImageData(28, 28);
    const d = imgData.data;

    let maxVal = 0.001;
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        if (map[y] && map[y][x] > maxVal) {
          maxVal = map[y][x];
        }
      }
    }

    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        const val = map[y] ? map[y][x] || 0 : 0;
        const normalized = Math.min(255, Math.floor((val / maxVal) * 255));
        const idx = (y * 28 + x) * 4;
        // Cyan color map for feature maps
        d[idx] = Math.floor(normalized * 0.2);     // R
        d[idx + 1] = Math.floor(normalized * 0.9); // G
        d[idx + 2] = normalized;                   // B
        d[idx + 3] = 255;                          // A
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
  };

  const topPrediction = predictions.length > 0 ? predictions[0] : null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              <Wand2 className="w-3.5 h-3.5" />
              Bước 5: Thử nghiệm Dự đoán Trực tiếp (Live Inference Sandbox)
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Trải nghiệm Mô hình AI do Bạn Tự Huấn luyện
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Vẽ hình tùy thích hoặc soi vật thể trước Webcam để xem mô hình CNN phân loại ngay lập tức trong vài mili-giây!
            </p>
          </div>

          <button
            onClick={() => tfService.exportModel()}
            disabled={!isModelTrained}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-indigo-300 border border-indigo-500/30 font-medium text-xs shadow-md flex items-center gap-2 transition-all self-start md:self-center"
            title="Tải mô hình model.json và weights về máy tính"
          >
            <Download className="w-4 h-4" />
            Tải Mô hình về Máy (.json)
          </button>
        </div>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Input Arena (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            {/* Mode Switcher */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  onClick={() => setSandboxMode('draw')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    sandboxMode === 'draw'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Bảng vẽ Trực tiếp
                </button>

                <button
                  onClick={() => {
                    setSandboxMode('webcam');
                    startWebcam();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    sandboxMode === 'webcam'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Webcam Thời gian thực
                </button>

                <button
                  onClick={() => setSandboxMode('upload')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    sandboxMode === 'upload'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Tải ảnh thử
                </button>
              </div>

              {sandboxMode === 'draw' && (
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-slate-400 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isLiveInferencing}
                      onChange={(e) => setIsLiveInferencing(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span>Đoán liên tục khi vẽ</span>
                  </label>
                </div>
              )}
            </div>

            {/* Mode 1: Live Draw Pad */}
            {sandboxMode === 'draw' && (
              <div className="flex flex-col items-center">
                <div className="relative border-2 border-indigo-500/50 rounded-2xl overflow-hidden shadow-2xl cursor-crosshair">
                  <canvas
                    ref={drawCanvasRef}
                    width={224}
                    height={224}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="touch-none bg-black"
                  />
                </div>

                {/* Toolbar */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                    <span>Nét vẽ:</span>
                    <input
                      type="range"
                      min={10}
                      max={26}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-20 accent-indigo-500"
                    />
                    <span className="font-mono text-slate-300">{brushSize}px</span>
                  </div>

                  <button
                    onClick={clearDrawPad}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Xóa bảng vẽ
                  </button>

                  <button
                    onClick={predictFromDrawCanvas}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Dự đoán ngay
                  </button>
                </div>
              </div>
            )}

            {/* Mode 2: Live Webcam */}
            {sandboxMode === 'webcam' && (
              <div className="flex flex-col items-center">
                {webcamError && (
                  <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 max-w-sm text-center">
                    {webcamError}
                  </div>
                )}
                <div className="relative w-64 h-64 rounded-2xl overflow-hidden bg-black border-2 border-indigo-500/50 shadow-2xl flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Aim target */}
                  <div className="absolute inset-8 border-2 border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] text-emerald-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur font-mono">
                      Vùng nhận diện
                    </span>
                  </div>

                  {/* FPS badge */}
                  {isWebcamActive && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 border border-slate-700 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {inferenceFps} FPS
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  {isWebcamActive ? (
                    <button
                      onClick={stopWebcam}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium flex items-center gap-1.5 shadow"
                    >
                      <CameraOff className="w-4 h-4" />
                      Tắt Webcam
                    </button>
                  ) : (
                    <button
                      onClick={startWebcam}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow"
                    >
                      <Camera className="w-4 h-4" />
                      Bật Webcam
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Mode 3: Upload Test File */}
            {sandboxMode === 'upload' && (
              <div className="flex flex-col items-center">
                {uploadedImageUrl ? (
                  <div className="relative w-48 h-48 rounded-xl overflow-hidden border border-slate-700 bg-black mb-4">
                    <img
                      src={uploadedImageUrl}
                      alt="uploaded test"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full border-2 border-dashed border-slate-700 rounded-xl p-8 text-center mb-4">
                    <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-300">Tải ảnh bất kỳ lên để thử dự đoán</p>
                  </div>
                )}

                <label className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow">
                  <span>Chọn ảnh khác</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadTestImage}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Predictions & Probabilities (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Kết quả Dự đoán (Softmax Probabilities)
            </h3>

            {/* Top Prediction Banner */}
            {topPrediction && topPrediction.confidence > 0 ? (
              <div
                className="rounded-xl p-4 border mb-5 flex items-center justify-between transition-all"
                style={{
                  backgroundColor: `${topPrediction.color}15`,
                  borderColor: `${topPrediction.color}50`
                }}
              >
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                    Dự đoán cao nhất (Top 1)
                  </span>
                  <h4 className="text-xl font-extrabold text-white mt-0.5">
                    {topPrediction.className}
                  </h4>
                </div>
                <div
                  className="text-2xl font-mono font-black"
                  style={{ color: topPrediction.color }}
                >
                  {topPrediction.confidence}%
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-500 text-center mb-5">
                Hãy vẽ một hình hoặc đưa vật thể trước camera để AI bắt đầu dự đoán!
              </div>
            )}

            {/* Probability Bars */}
            <div className="space-y-3">
              {classes.map((cls) => {
                const res = predictions.find(p => p.classId === cls.id);
                const conf = res ? res.confidence : 0;
                const isWinner = topPrediction?.classId === cls.id && conf > 0;

                return (
                  <div key={cls.id} className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <span>{cls.icon}</span>
                        <span>{cls.name}</span>
                        {isWinner && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-normal">
                            Thắng thế
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-slate-300">
                        {conf}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{
                          width: `${conf}%`,
                          backgroundColor: cls.color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick learning tip */}
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Lớp đầu ra Softmax biến đổi các nơ-ron thành phân phối xác suất có tổng bằng 100%.
          </div>
        </div>
      </div>

      {/* Feature Maps Visualization ("Mắt nhìn của AI") */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              Mắt nhìn của AI (Convolutional Feature Maps)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Khám phá các bộ lọc của lớp Conv2D đầu tiên trích xuất đường biên, góc nhọn và vân ảnh thế nào từ nét vẽ của bạn:
            </p>
          </div>
          <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20 font-mono">
            Conv Layer 1 ({featureMaps.length} bộ lọc)
          </span>
        </div>

        {featureMaps.length === 0 ? (
          <div className="py-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs">
            Vẽ nét vẽ hoặc bật Webcam để xem trực tiếp các Feature Maps của mạng CNN!
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-16 gap-2 pt-2">
            {featureMaps.map((fMap, idx) => {
              const mapDataUrl = renderFeatureMapCanvas(fMap);
              return (
                <div
                  key={idx}
                  className="bg-black rounded-lg border border-slate-800 p-1 flex flex-col items-center hover:border-cyan-400 transition-colors"
                >
                  <img
                    src={mapDataUrl}
                    alt={`Filter ${idx + 1}`}
                    className="w-12 h-12 image-rendering-pixelated object-contain"
                  />
                  <span className="text-[9px] font-mono text-cyan-400 mt-1">
                    F{idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
