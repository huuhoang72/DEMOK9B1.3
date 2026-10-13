/**
 * TensorFlow.js Engine Service for CNN Browser Lab
 * Manages model construction, training with validation callbacks,
 * feature map extraction, and browser-accelerated inference.
 */
import * as tf from '@tensorflow/tfjs';
import { ClassCategory, DatasetSample, Hyperparameters, EpochLog, PredictionResult, ConfusionMatrixData, TestSampleResult } from '../types';

export const IMAGE_SIZE = 28;

class TFService {
  private model: tf.LayersModel | null = null;
  private isTraining = false;
  private shouldStopTraining = false;
  private activeClasses: ClassCategory[] = [];

  async init(): Promise<string> {
    await tf.ready();
    return tf.getBackend();
  }

  getBackend(): string {
    return tf.getBackend();
  }

  getMemoryInfo() {
    return tf.memory();
  }

  isModelReady(): boolean {
    return this.model !== null;
  }

  stopTraining() {
    this.shouldStopTraining = true;
  }

  /**
   * Builds and compiles a CNN architecture based on student hyperparameters
   */
  buildCNNModel(classes: ClassCategory[], hyper: Hyperparameters): tf.LayersModel {
    this.activeClasses = [...classes];
    const numClasses = Math.max(classes.length, 2);

    // Dispose old model if exists
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }

    const model = tf.sequential();

    // Block 1: Conv2D -> ReLU -> MaxPooling2D
    model.add(tf.layers.conv2d({
      inputShape: [IMAGE_SIZE, IMAGE_SIZE, 1],
      filters: hyper.conv1Filters,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
      name: 'conv2d_1'
    }));

    model.add(tf.layers.maxPooling2d({
      poolSize: [2, 2],
      strides: [2, 2],
      name: 'maxpool_1'
    }));

    // Block 2: Conv2D -> ReLU -> MaxPooling2D
    model.add(tf.layers.conv2d({
      filters: hyper.conv2Filters,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
      name: 'conv2d_2'
    }));

    model.add(tf.layers.maxPooling2d({
      poolSize: [2, 2],
      strides: [2, 2],
      name: 'maxpool_2'
    }));

    // Classification Head: Flatten -> Dense -> Dropout -> Dense Softmax
    model.add(tf.layers.flatten({ name: 'flatten' }));

    model.add(tf.layers.dense({
      units: hyper.denseUnits,
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
      name: 'dense_1'
    }));

    if (hyper.dropoutRate > 0) {
      model.add(tf.layers.dropout({
        rate: hyper.dropoutRate,
        name: 'dropout'
      }));
    }

    model.add(tf.layers.dense({
      units: numClasses,
      activation: 'softmax',
      kernelInitializer: 'varianceScaling',
      name: 'output_softmax'
    }));

    const optimizer = hyper.optimizer === 'adam'
      ? tf.train.adam(hyper.learningRate)
      : tf.train.sgd(hyper.learningRate);

    model.compile({
      optimizer,
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    this.model = model;
    return model;
  }

  /**
   * Converts an image dataURL into a 28x28x1 float tensor normalized to [0, 1]
   */
  async dataUrlToTensor(dataUrl: string): Promise<tf.Tensor3D> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        tf.tidy(() => {
          // Read 1-channel grayscale from image
          const tensor = tf.browser.fromPixels(img, 1);
          // Resize if not 28x28
          const resized = tf.image.resizeBilinear(tensor, [IMAGE_SIZE, IMAGE_SIZE]);
          // Invert colors if needed (or normalize directly). White foreground on black background: [0, 1]
          const normalized = resized.toFloat().div(255.0);
          resolve(tf.keep(normalized as tf.Tensor3D));
        });
      };
      img.onerror = (e) => reject(e);
      img.src = dataUrl;
    });
  }

  /**
   * Preprocesses canvas directly into a 4D tensor [1, 28, 28, 1]
   */
  canvasToTensor(canvas: HTMLCanvasElement): tf.Tensor4D {
    return tf.tidy(() => {
      const tensor = tf.browser.fromPixels(canvas, 1);
      const resized = tf.image.resizeBilinear(tensor, [IMAGE_SIZE, IMAGE_SIZE]);
      const normalized = resized.toFloat().div(255.0);
      return normalized.expandDims(0) as tf.Tensor4D;
    });
  }

  /**
   * Preprocesses video element directly into a 4D tensor [1, 28, 28, 1]
   */
  videoToTensor(video: HTMLVideoElement): tf.Tensor4D {
    return tf.tidy(() => {
      const tensor = tf.browser.fromPixels(video, 1);
      // Center crop square then resize
      const [h, w] = [tensor.shape[0], tensor.shape[1]];
      const minDim = Math.min(h, w);
      const startH = Math.floor((h - minDim) / 2);
      const startW = Math.floor((w - minDim) / 2);
      const cropped = tensor.slice([startH, startW, 0], [minDim, minDim, 1]);
      const resized = tf.image.resizeBilinear(cropped, [IMAGE_SIZE, IMAGE_SIZE]);
      const normalized = resized.toFloat().div(255.0);
      return normalized.expandDims(0) as tf.Tensor4D;
    });
  }

  /**
   * Trains the model using student dataset, providing epoch callbacks
   */
  async train(
    samples: DatasetSample[],
    classes: ClassCategory[],
    hyper: Hyperparameters,
    onEpochEndCallback: (log: EpochLog) => void
  ): Promise<boolean> {
    if (this.isTraining) return false;
    this.isTraining = true;
    this.shouldStopTraining = false;
    this.activeClasses = [...classes];

    const trainSamples = samples.filter(s => s.split === 'train');
    const valSamples = samples.filter(s => s.split === 'val');

    if (trainSamples.length === 0) {
      this.isTraining = false;
      throw new Error('Chưa có mẫu nào trong tập Huấn luyện (Train set)!');
    }

    const classIdToIndex = new Map<string, number>();
    classes.forEach((c, idx) => classIdToIndex.set(c.id, idx));

    // Build or rebuild CNN model
    this.buildCNNModel(classes, hyper);
    const model = this.model!;
    const numClasses = classes.length;

    // Load train tensors
    const trainTensors: tf.Tensor3D[] = [];
    const trainLabelsArr: number[] = [];
    for (const sample of trainSamples) {
      const t = await this.dataUrlToTensor(sample.dataUrl);
      trainTensors.push(t);
      const classIdx = classIdToIndex.get(sample.classId) ?? 0;
      trainLabelsArr.push(classIdx);
    }

    const trainXs = tf.stack(trainTensors) as tf.Tensor4D;
    trainTensors.forEach(t => t.dispose());
    const trainYs = tf.oneHot(tf.tensor1d(trainLabelsArr, 'int32'), numClasses) as tf.Tensor2D;

    // Load val tensors if available
    let valXs: tf.Tensor4D | null = null;
    let valYs: tf.Tensor2D | null = null;
    if (valSamples.length > 0) {
      const valTensors: tf.Tensor3D[] = [];
      const valLabelsArr: number[] = [];
      for (const sample of valSamples) {
        const t = await this.dataUrlToTensor(sample.dataUrl);
        valTensors.push(t);
        const classIdx = classIdToIndex.get(sample.classId) ?? 0;
        valLabelsArr.push(classIdx);
      }
      valXs = tf.stack(valTensors) as tf.Tensor4D;
      valTensors.forEach(t => t.dispose());
      valYs = tf.oneHot(tf.tensor1d(valLabelsArr, 'int32'), numClasses) as tf.Tensor2D;
    }

    let epochStartTime = performance.now();

    try {
      await model.fit(trainXs, trainYs, {
        epochs: hyper.epochs,
        batchSize: Math.min(hyper.batchSize, trainSamples.length),
        shuffle: true,
        validationData: valXs && valYs ? [valXs, valYs] : undefined,
        callbacks: {
          onEpochBegin: () => {
            epochStartTime = performance.now();
          },
          onEpochEnd: async (epoch, logs) => {
            if (this.shouldStopTraining) {
              model.stopTraining = true;
            }
            const durationMs = Math.round(performance.now() - epochStartTime);
            onEpochEndCallback({
              epoch: epoch + 1,
              loss: logs?.loss ?? 0,
              acc: (logs?.acc ?? logs?.accuracy ?? 0) * 100,
              valLoss: logs?.val_loss !== undefined ? logs.val_loss : undefined,
              valAcc: logs?.val_acc !== undefined ? logs.val_acc * 100 : (logs?.val_accuracy !== undefined ? logs.val_accuracy * 100 : undefined),
              durationMs
            });
            await tf.nextFrame();
          }
        }
      });
      return true;
    } finally {
      trainXs.dispose();
      trainYs.dispose();
      if (valXs) valXs.dispose();
      if (valYs) valYs.dispose();
      this.isTraining = false;
      this.shouldStopTraining = false;
    }
  }

  /**
   * Evaluates test samples and computes confusion matrix and classification metrics
   */
  async evaluateTestSet(testSamples: DatasetSample[], classes: ClassCategory[]): Promise<{
    confusionMatrix: ConfusionMatrixData;
    detailedResults: TestSampleResult[];
  }> {
    if (!this.model) {
      throw new Error('Mô hình chưa được huấn luyện!');
    }
    if (testSamples.length === 0) {
      throw new Error('Tập Test chưa có mẫu nào để kiểm thử!');
    }

    const classIdToIndex = new Map<string, number>();
    const classIdToCategory = new Map<string, ClassCategory>();
    classes.forEach((c, idx) => {
      classIdToIndex.set(c.id, idx);
      classIdToCategory.set(c.id, c);
    });

    const labels = classes.map(c => c.name);
    const numClasses = classes.length;
    const matrix: number[][] = Array.from({ length: numClasses }, () => Array(numClasses).fill(0));
    const detailedResults: TestSampleResult[] = [];

    let correctCount = 0;

    for (const sample of testSamples) {
      const tensor = await this.dataUrlToTensor(sample.dataUrl);
      const input = tensor.expandDims(0) as tf.Tensor4D;
      const prediction = this.model.predict(input) as tf.Tensor;
      const probs = await prediction.data();

      // argmax
      let maxProb = -1;
      let predIdx = 0;
      for (let i = 0; i < probs.length; i++) {
        if (probs[i] > maxProb) {
          maxProb = probs[i];
          predIdx = i;
        }
      }

      const actualIdx = classIdToIndex.get(sample.classId) ?? 0;
      matrix[actualIdx][predIdx] += 1;

      const isCorrect = actualIdx === predIdx;
      if (isCorrect) correctCount++;

      detailedResults.push({
        id: sample.id,
        classId: sample.classId,
        actualClassName: classIdToCategory.get(sample.classId)?.name || 'Chưa rõ',
        predictedClassId: classes[predIdx]?.id || '',
        predictedClassName: classes[predIdx]?.name || 'Chưa rõ',
        confidence: Math.round(maxProb * 100),
        isCorrect,
        dataUrl: sample.dataUrl
      });

      tensor.dispose();
      input.dispose();
      prediction.dispose();
    }

    // Compute precision, recall, f1 for each class
    const classMetrics = classes.map((c, i) => {
      let tp = matrix[i][i];
      let rowTotal = 0; // actual i count
      let colTotal = 0; // predicted i count
      for (let j = 0; j < numClasses; j++) {
        rowTotal += matrix[i][j];
        colTotal += matrix[j][i];
      }

      const precision = colTotal > 0 ? (tp / colTotal) * 100 : 0;
      const recall = rowTotal > 0 ? (tp / rowTotal) * 100 : 0;
      const f1Score = (precision + recall > 0) ? (2 * precision * recall) / (precision + recall) : 0;

      return {
        name: c.name,
        precision: Math.round(precision),
        recall: Math.round(recall),
        f1Score: Math.round(f1Score),
        count: rowTotal
      };
    });

    const accuracy = testSamples.length > 0 ? Math.round((correctCount / testSamples.length) * 100) : 0;

    return {
      confusionMatrix: {
        labels,
        matrix,
        accuracy,
        totalSamples: testSamples.length,
        correctSamples: correctCount,
        classMetrics
      },
      detailedResults
    };
  }

  /**
   * Runs single-image prediction and returns confidence for all classes
   */
  async predictTensor(inputTensor: tf.Tensor4D, classes: ClassCategory[]): Promise<PredictionResult[]> {
    if (!this.model) return [];

    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const probs = await prediction.data();
    prediction.dispose();

    const results: PredictionResult[] = classes.map((cls, idx) => ({
      classId: cls.id,
      className: cls.name,
      confidence: Math.round((probs[idx] || 0) * 100),
      color: cls.color
    }));

    results.sort((a, b) => b.confidence - a.confidence);
    return results;
  }

  /**
   * Extracts visual feature maps from the first Conv2D layer so students can observe
   * what edge/pattern detectors the CNN has learned!
   */
  async extractFeatureMaps(inputTensor: tf.Tensor4D): Promise<number[][][]> {
    if (!this.model) return [];

    try {
      // Find the first Conv2D layer
      const conv1 = this.model.getLayer('conv2d_1');
      if (!conv1) return [];

      const activationModel = tf.model({
        inputs: this.model.inputs,
        outputs: conv1.output as tf.SymbolicTensor
      });

      const activations = activationModel.predict(inputTensor) as tf.Tensor; // Shape: [1, 28, 28, filters]
      const [_, height, width, numFilters] = activations.shape;

      // Extract each filter's 28x28 activation map
      const maps: number[][][] = [];
      const data = await activations.data(); // Float32Array

      // Pick up to 8 or 16 filters for visualization
      const displayFilters = Math.min(numFilters, 16);

      for (let f = 0; f < displayFilters; f++) {
        const filterMap: number[][] = [];
        for (let y = 0; y < height; y++) {
          const row: number[] = [];
          for (let x = 0; x < width; x++) {
            const index = (y * width + x) * numFilters + f;
            row.push(data[index] || 0);
          }
          filterMap.push(row);
        }
        maps.push(filterMap);
      }

      activations.dispose();
      activationModel.dispose();
      return maps;
    } catch (err) {
      console.warn('Feature map extraction failed:', err);
      return [];
    }
  }

  /**
   * Export model to browser downloads
   */
  async exportModel(modelName = 'cnn-browser-lab-model') {
    if (!this.model) return;
    await this.model.save(`downloads://${modelName}`);
  }

  /**
   * Dispose model to free WebGL GPU memory
   */
  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

export const tfService = new TFService();
