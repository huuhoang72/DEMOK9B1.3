export interface DatasetSample {
  id: string;
  classId: string;
  dataUrl: string; // 28x28 grayscale image data URL
  split: 'train' | 'val' | 'test';
  createdAt: number;
}

export interface ClassCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Hyperparameters {
  epochs: number;
  batchSize: number;
  learningRate: number;
  optimizer: 'adam' | 'sgd';
  conv1Filters: number;
  conv2Filters: number;
  denseUnits: number;
  dropoutRate: number;
}

export interface EpochLog {
  epoch: number;
  loss: number;
  acc: number;
  valLoss?: number;
  valAcc?: number;
  durationMs: number;
}

export interface PredictionResult {
  classId: string;
  className: string;
  confidence: number;
  color: string;
}

export interface TestSampleResult {
  id: string;
  classId: string;
  actualClassName: string;
  predictedClassId: string;
  predictedClassName: string;
  confidence: number;
  isCorrect: boolean;
  dataUrl: string;
}

export interface ConfusionMatrixData {
  labels: string[];
  matrix: number[][]; // [actualIndex][predictedIndex]
  accuracy: number;
  totalSamples: number;
  correctSamples: number;
  classMetrics: {
    name: string;
    precision: number;
    recall: number;
    f1Score: number;
    count: number;
  }[];
}

export type ActiveTab = 'dataset' | 'architecture' | 'train' | 'evaluate' | 'predict';
