import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ClassCategory, PredictionResult } from '../types';
import * as tf from '@tensorflow/tfjs';
import { tfService, IMAGE_SIZE } from '../services/tfService';
import { imageBlobToGrayscaleDataUrl } from '../utils/zipLoader';
import { 
  Wand2, 
  PenTool, 
  Camera, 
  Upload, 
  RefreshCw, 
  Download, 
  Eye, 
  Sparkles, 
  CameraOff, 
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';

interface InferencePlaygroundProps {
  classes: ClassCategory[];
  isModelTrained: boolean;
}

export const InferencePlayground: React.FC<InferencePlaygroundProps> = ({
  classes,
  isModelTrained,
}) => {
  const [sandboxMode, setSandboxMode] = useState<'draw' | 'webcam' | 'upload'>('upload');
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [featureMaps, setFeatureMaps] = useState<number[][][]>([]);
  const [isLiveInferencing, setIsLiveInferencing] = useState(true);
  const [inferenceFps, setInferenceFps] = useState(0);
  const [isPredicting, setIsPredicting] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);
  const [predictionSource, setPredictionSource] = useState<string>('');

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
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    setLastUpdatedTime(null);
  }, []);

  // Stop Webcam
  const stopWebcam = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
  }, []);

  // Clear predictions when switching tabs
  const handleSwitchMode = (mode: 'draw' | 'webcam' | 'upload') => {
    if (mode === sandboxMode) return;
    if (sandboxMode === 'webcam') {
      stopWebcam();
    }
    setSandboxMode(mode);
    setPredictions([]);
    setFeatureMaps([]);
    setLastUpdatedTime(null);

    if (mode === 'draw') {
      setTimeout(() => clearDrawPad(), 50);
    } else if (mode === 'webcam') {
      setTimeout(() => startWebcam(), 100);
    } else if (mode === 'upload' && processedImageUrl) {
      // If an image was previously processed, re-run prediction
      predictFromProcessedUrl(processedImageUrl, uploadedFileName || 'Ảnh đã tải');
    }
  };

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

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

    if (isLiveInferencing && isModelTrained) {
      predictFromDrawCanvas();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
    if (isModelTrained) {
      predictFromDrawCanvas();
    }
  };

  // Inference from Drawing Pad
  const predictFromDrawCanvas = async () => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !isModelTrained || classes.length < 2) return;

    setIsPredicting(true);
    setPredictionSource('Bảng vẽ');

    // Rescale to 28x28
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = IMAGE_SIZE;
    tempCanvas.height = IMAGE_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      setIsPredicting(false);
      return;
    }

    tempCtx.drawImage(canvas, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
    const inputTensor = tfService.canvasToTensor(tempCanvas);

    try {
      const results = await tfService.predictTensor(inputTensor, classes);
      setPredictions(results);

      const maps = await tfService.extractFeatureMaps(inputTensor);
      setFeatureMaps(maps);
      setLastUpdatedTime(new Date().toLocaleTimeString('vi-VN'));
    } catch (err) {
      console.warn('Inference error:', err);
    } finally {
      inputTensor.dispose();
      setIsPredicting(false);
    }
  };

  // Start Webcam
  const startWebcam = async () => {
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, facingMode: 'user' },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsWebcamActive(true);
          runLiveWebcamLoop();
        };
      }
    } catch (err: unknown) {
      console.error('Webcam access error:', err);
      setWebcamError('Không thể mở Webcam. Vui lòng cấp quyền truy cập Camera trên trình duyệt của bạn!');
    }
  };

  // Live webcam prediction loop with throttling
  const runLiveWebcamLoop = () => {
    const loop = async () => {
      const now = performance.now();
      if (videoRef.current && isModelTrained && classes.length >= 2) {
        if (now - lastInferTimeRef.current > 120) { // ~8 FPS
          const fps = Math.round(1000 / (now - lastInferTimeRef.current || 120));
          setInferenceFps(fps);
          lastInferTimeRef.current = now;

          const video = videoRef.current;
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = IMAGE_SIZE;
            canvas.height = IMAGE_SIZE;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const size = Math.min(video.videoWidth, video.videoHeight);
              const sx = (video.videoWidth - size) / 2;
              const sy = (video.videoHeight - size) / 2;

              ctx.drawImage(video, sx, sy, size, size, 0, 0, IMAGE_SIZE, IMAGE_SIZE);

              // Convert to grayscale
              const imgData = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
              const d = imgData.data;
              for (let j = 0; j < d.length; j += 4) {
                const gray = Math.round(0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]);
                d[j] = gray;
                d[j + 1] = gray;
                d[j + 2] = gray;
              }
              ctx.putImageData(imgData, 0, 0);

              const inputTensor = tfService.canvasToTensor(canvas);
              try {
                const results = await tfService.predictTensor(inputTensor, classes);
                setPredictions(results);
                setPredictionSource('Webcam trực tiếp');
                setLastUpdatedTime(new Date().toLocaleTimeString('vi-VN'));

                const maps = await tfService.extractFeatureMaps(inputTensor);
                setFeatureMaps(maps);
              } catch (e) {
                console.warn(e);
              } finally {
                inputTensor.dispose();
              }
            }
          }
        }
      }
      animFrameIdRef.current = requestAnimationFrame(loop);
    };
    animFrameIdRef.current = requestAnimationFrame(loop);
  };

  // Predict from a normalized 28x28 grayscale data URL (Exact match with training pipeline)
  const predictFromProcessedUrl = async (dataUrl: string, sourceLabel: string) => {
    if (!isModelTrained || classes.length < 2) return;
    setIsPredicting(true);
    setPredictionSource(sourceLabel);

    try {
      // Use tfService.dataUrlToTensor: exact match with training pipeline
      const tensor3D = await tfService.dataUrlToTensor(dataUrl);
      const input4D = tensor3D.expandDims(0) as tf.Tensor4D;

      const results = await tfService.predictTensor(input4D, classes);
      setPredictions(results);

      const maps = await tfService.extractFeatureMaps(input4D);
      setFeatureMaps(maps);

      setLastUpdatedTime(new Date().toLocaleTimeString('vi-VN'));

      tensor3D.dispose();
      input4D.dispose();
    } catch (err) {
      console.error('Inference error on uploaded image:', err);
    } finally {
      setIsPredicting(false);
    }
  };

  // Handle uploaded single image test
  const handleUploadTestImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset predictions right away to avoid showing stale result
    setPredictions([]);
    setFeatureMaps([]);
    setIsPredicting(true);
    setUploadedFileName(file.name);

    try {
      // High-res preview for user
      const previewUrl = URL.createObjectURL(file);
      setUploadedImageUrl(previewUrl);

      // Preprocess image to exact 28x28 grayscale format matching training
      const gray28x28Url = await imageBlobToGrayscaleDataUrl(file);
      setProcessedImageUrl(gray28x28Url);

      // Immediately run prediction
      await predictFromProcessedUrl(gray28x28Url, file.name);
    } catch (err) {
      console.error('Error processing test image:', err);
      setIsPredicting(false);
    } finally {
      // Reset input value so re-uploading the same file works
      e.target.value = '';
    }
  };

  // Manual Trigger: Predict current uploaded image
  const handleManualPredictUpload = () => {
    if (processedImageUrl) {
      predictFromProcessedUrl(processedImageUrl, uploadedFileName || 'Ảnh đã tải');
    }
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
        d[idx] = Math.floor(normalized * 0.15);     // R
        d[idx + 1] = Math.floor(normalized * 0.85); // G
        d[idx + 2] = normalized;                    // B
        d[idx + 3] = 255;                           // A
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
  };

  const topPrediction = predictions.length > 0 ? predictions[0] : null;

  return (
    <div className="space-y-6">
      {/* Header Banner - Clean White */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              <Wand2 className="w-3.5 h-3.5 text-emerald-600" />
              Bước 5: Thử nghiệm Dự đoán Trực tiếp (Live Inference Sandbox)
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Trải nghiệm Mô hình AI do Bạn Tự Huấn luyện
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Tải ảnh bất kỳ, vẽ hình tùy thích hoặc soi vật thể trước Webcam để xem mô hình CNN phân loại ngay lập tức trong vài mili-giây!
            </p>
          </div>

          <button
            onClick={() => tfService.exportModel()}
            disabled={!isModelTrained}
            className="px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-2 transition-all self-start md:self-center cursor-pointer shadow-xs"
            title="Tải trọng số mô hình về máy"
          >
            <Download className="w-4 h-4 text-slate-600" />
            Tải Mô hình về Máy (.json)
          </button>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Input Arena (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Mode Selector Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-5">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSwitchMode('upload')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    sandboxMode === 'upload'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Tải ảnh thử
                </button>

                <button
                  onClick={() => handleSwitchMode('draw')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    sandboxMode === 'draw'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Bảng vẽ Trực tiếp
                </button>

                <button
                  onClick={() => handleSwitchMode('webcam')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    sandboxMode === 'webcam'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Webcam Thời gian thực
                </button>
              </div>

              {sandboxMode === 'draw' && (
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-slate-600 font-medium flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isLiveInferencing}
                      onChange={(e) => setIsLiveInferencing(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                    />
                    <span>Đoán liên tục khi vẽ</span>
                  </label>
                </div>
              )}
            </div>

            {/* Mode 1: Upload Test File */}
            {sandboxMode === 'upload' && (
              <div className="flex flex-col items-center">
                {uploadedImageUrl ? (
                  <div className="w-full flex flex-col items-center">
                    {/* Image Cards Row */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                      {/* Original High-Res Uploaded Image */}
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-indigo-600" />
                          Ảnh thực tế tải lên
                        </span>
                        <div className="relative w-52 h-52 rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-900 shadow-md flex items-center justify-center">
                          <img
                            src={uploadedImageUrl}
                            alt="uploaded test"
                            className="w-full h-full object-contain"
                          />
                          {isPredicting && (
                            <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs font-semibold gap-1.5">
                              <Loader2 className="w-6 h-6 animate-spin text-white" />
                              <span>Đang dự đoán...</span>
                            </div>
                          )}
                        </div>
                        {uploadedFileName && (
                          <span className="text-[11px] text-slate-500 font-mono mt-1 max-w-[200px] truncate" title={uploadedFileName}>
                            {uploadedFileName}
                          </span>
                        )}
                      </div>

                      {/* Processed 28x28 Grayscale for CNN */}
                      {processedImageUrl && (
                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                            <Eye className="w-3 h-3 text-cyan-600" />
                            CNN nhìn thấy (28x28)
                          </span>
                          <div className="w-52 h-52 rounded-2xl border-2 border-slate-300 bg-black flex items-center justify-center shadow-md p-3">
                            <img
                              src={processedImageUrl}
                              alt="processed 28x28"
                              className="w-36 h-36 image-rendering-pixelated object-contain rounded border border-slate-700"
                            />
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono mt-1">
                            Chuẩn hóa [0, 1] x 1 kênh
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: Dự đoán ngay + Chọn ảnh khác */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                      <button
                        type="button"
                        onClick={handleManualPredictUpload}
                        disabled={isPredicting || !isModelTrained}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {isPredicting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Đang phân tích...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 text-amber-300 fill-current" />
                            <span>⚡ Dự đoán ảnh này ngay</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        <span>Chọn ảnh khác</span>
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUploadTestImage}
                        className="hidden"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl p-10 text-center mb-2 bg-indigo-50/30 hover:bg-indigo-50/50 cursor-pointer transition-all flex flex-col items-center justify-center"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 shadow-2xs">
                      <Upload className="w-7 h-7" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">
                      Nhấn vào đây để tải ảnh thử nghiệm
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-4">
                      Hệ thống sẽ lập tức đưa ảnh qua mạng CNN và hiển thị phân phối xác suất Softmax cho tất cả các lớp.
                    </p>
                    <span className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs">
                      Chọn file ảnh từ máy tính
                    </span>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadTestImage}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Live Draw Pad */}
            {sandboxMode === 'draw' && (
              <div className="flex flex-col items-center">
                <div className="relative border-2 border-indigo-200 rounded-2xl overflow-hidden shadow-md cursor-crosshair">
                  <canvas
                    ref={drawCanvasRef}
                    width={224}
                    height={224}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="touch-none bg-slate-950"
                  />
                </div>

                {/* Toolbar */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 font-semibold">
                    <span>Nét vẽ:</span>
                    <input
                      type="range"
                      min={10}
                      max={26}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-20 accent-indigo-600 cursor-pointer"
                    />
                    <span className="font-mono text-indigo-700">{brushSize}px</span>
                  </div>

                  <button
                    onClick={clearDrawPad}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Xóa bảng vẽ
                  </button>

                  <button
                    onClick={predictFromDrawCanvas}
                    disabled={isPredicting || !isModelTrained}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    {isPredicting ? 'Đang dự đoán...' : '⚡ Dự đoán ngay'}
                  </button>
                </div>
              </div>
            )}

            {/* Mode 3: Live Webcam */}
            {sandboxMode === 'webcam' && (
              <div className="flex flex-col items-center">
                {webcamError && (
                  <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 max-w-sm text-center font-medium">
                    {webcamError}
                  </div>
                )}
                <div className="relative w-64 h-64 rounded-2xl overflow-hidden bg-black border-2 border-indigo-200 shadow-md flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Aim target */}
                  <div className="absolute inset-8 border-2 border-dashed border-emerald-400 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] text-white bg-black/70 px-2 py-0.5 rounded backdrop-blur-xs font-mono font-semibold">
                      Vùng nhận diện
                    </span>
                  </div>

                  {/* FPS badge */}
                  {isWebcamActive && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 border border-slate-700 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {inferenceFps} FPS (Liên tục)
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  {isWebcamActive ? (
                    <button
                      onClick={stopWebcam}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <CameraOff className="w-4 h-4" />
                      Tắt Webcam
                    </button>
                  ) : (
                    <button
                      onClick={startWebcam}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Bật Webcam Nhận diện Liên tục
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Predictions & Probabilities (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Kết quả Dự đoán (Softmax Probabilities)
              </h3>

              {isPredicting ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                  Đang tính toán...
                </span>
              ) : lastUpdatedTime ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Cập nhật: {lastUpdatedTime}
                </span>
              ) : null}
            </div>

            {/* Source info tag */}
            {predictionSource && (
              <div className="mb-3 text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                <span>Nguồn đang phân tích:</span>
                <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[220px]">
                  {predictionSource}
                </span>
              </div>
            )}

            {/* Top Prediction Banner */}
            {topPrediction && topPrediction.confidence > 0 ? (
              <div
                className="rounded-2xl p-4 border-2 mb-5 flex items-center justify-between transition-all shadow-xs"
                style={{
                  backgroundColor: `${topPrediction.color}12`,
                  borderColor: topPrediction.color
                }}
              >
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-600 block font-bold">
                    Dự đoán cao nhất (Top 1)
                  </span>
                  <h4 className="text-2xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                    {topPrediction.className}
                  </h4>
                </div>
                <div
                  className="text-3xl font-mono font-black"
                  style={{ color: topPrediction.color }}
                >
                  {topPrediction.confidence}%
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center mb-5 font-medium flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-6 h-6 text-slate-400" />
                <span>
                  {sandboxMode === 'upload' 
                    ? 'Hãy chọn một ảnh hoặc nhấn "⚡ Dự đoán ảnh này ngay" ở bên trái để xem kết quả!'
                    : sandboxMode === 'draw'
                    ? 'Hãy vẽ một nét bất kỳ hoặc nhấn "Dự đoán ngay"!'
                    : 'Hãy bật Webcam để bắt đầu nhận diện liên tục!'}
                </span>
              </div>
            )}

            {/* Probability Bars */}
            <div className="space-y-3">
              {classes.map((cls) => {
                const res = predictions.find(p => p.classId === cls.id);
                const conf = res ? res.confidence : 0;
                const isWinner = topPrediction?.classId === cls.id && conf > 0;

                return (
                  <div 
                    key={cls.id} 
                    className={`p-3 rounded-xl border transition-all ${
                      isWinner ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{cls.icon}</span>
                        <span>{cls.name}</span>
                        {isWinner && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-300">
                            Thắng thế
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {conf}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
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
          <div className="mt-5 pt-3 border-t border-slate-200 text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>Softmax biến đổi logits thành xác suất tổng bằng 100%.</span>
            {lastUpdatedTime && (
              <span className="text-[10px] text-slate-400">Thời gian thực</span>
            )}
          </div>
        </div>
      </div>

      {/* Feature Maps Visualization ("Mắt nhìn của AI") */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-600" />
              Mắt nhìn của AI (Convolutional Feature Maps)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Khám phá các bộ lọc của lớp Conv2D đầu tiên trích xuất đường biên, góc nhọn và hoa văn thế nào từ ảnh:
            </p>
          </div>
          <span className="text-xs text-cyan-800 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200 font-mono font-semibold">
            Conv Layer 1 ({featureMaps.length} bộ lọc)
          </span>
        </div>

        {featureMaps.length === 0 ? (
          <div className="py-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl text-xs bg-slate-50">
            Tải ảnh, vẽ hình hoặc bật Webcam để quan sát trực tiếp các Feature Maps của mạng CNN!
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-16 gap-2 pt-2">
            {featureMaps.map((fMap, idx) => {
              const mapDataUrl = renderFeatureMapCanvas(fMap);
              return (
                <div
                  key={idx}
                  className="bg-slate-950 rounded-lg border border-slate-300 p-1 flex flex-col items-center hover:border-cyan-500 transition-colors shadow-2xs"
                >
                  <img
                    src={mapDataUrl}
                    alt={`Filter ${idx + 1}`}
                    className="w-12 h-12 image-rendering-pixelated object-contain"
                  />
                  <span className="text-[9px] font-mono text-cyan-400 mt-1 font-semibold">
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
