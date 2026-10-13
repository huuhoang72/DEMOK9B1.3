import JSZip from 'jszip';
import { ClassCategory, DatasetSample } from '../types';

export const IMAGE_SIZE = 28;

// Distinct palette for auto-generated classes
const COLOR_PALETTE = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
];

const EMOJI_PALETTE = ['🏷️', '📦', '🔍', '🎯', '✨', '💎', '🎨', '🚀', '⭐', '🎈'];

export interface ZipExtractionResult {
  classes: ClassCategory[];
  samples: DatasetSample[];
  summary: {
    totalImages: number;
    classesFound: string[];
  };
}

/**
 * Resizes an image Blob/File to 28x28 grayscale canvas dataURL
 */
export async function imageBlobToGrayscaleDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = IMAGE_SIZE;
      canvas.height = IMAGE_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Cannot create canvas 2D context'));
        return;
      }

      // Center crop square
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, IMAGE_SIZE, IMAGE_SIZE);

      // Convert to grayscale
      const imgData = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        d[i] = gray;
        d[i + 1] = gray;
        d[i + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };

    img.src = url;
  });
}

/**
 * Parses a ZIP file containing image datasets.
 * Automatically identifies class labels from subdirectories (e.g. dataset/cats/img1.jpg, dataset/dogs/img2.jpg)
 * Or handles flat zip files with specified fallback label.
 */
export async function extractDatasetFromZip(
  file: File,
  existingClasses: ClassCategory[],
  fallbackClassName = 'Lớp mới',
  splitRatio = { train: 0.7, val: 0.15 }
): Promise<ZipExtractionResult> {
  const zip = await JSZip.loadAsync(file);

  const imageFiles: { path: string; fileObj: JSZip.JSZipObject; label: string }[] = [];
  const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.bmp'];

  // Scan files in zip
  zip.forEach((relativePath, fileObj) => {
    if (fileObj.dir) return;

    // Ignore macos hidden files like __MACOSX/ or .DS_Store
    if (relativePath.includes('__MACOSX') || relativePath.includes('.DS_Store')) return;

    const lowerPath = relativePath.toLowerCase();
    const isImage = validExtensions.some(ext => lowerPath.endsWith(ext));
    if (!isImage) return;

    // Detect class label from folder structure
    // Example: "animals/cat/001.jpg" -> "cat"
    // Example: "cat/001.jpg" -> "cat"
    // Example: "001.jpg" -> fallbackClassName
    const parts = relativePath.split(/[/\\]+/).filter(Boolean);
    let label = fallbackClassName;
    if (parts.length >= 2) {
      // The parent folder of the image file
      label = parts[parts.length - 2].trim();
    }

    imageFiles.push({ path: relativePath, fileObj, label });
  });

  if (imageFiles.length === 0) {
    throw new Error('Không tìm thấy file ảnh hợp lệ (.png, .jpg, .jpeg, .webp) bên trong file ZIP!');
  }

  // Determine all unique class names
  const uniqueLabels = Array.from(new Set(imageFiles.map(f => f.label)));
  
  // Build or map to existing classes
  const updatedClasses: ClassCategory[] = [...existingClasses];
  const labelToClassId = new Map<string, string>();

  uniqueLabels.forEach((labelName, idx) => {
    const existing = updatedClasses.find(c => c.name.toLowerCase() === labelName.toLowerCase());
    if (existing) {
      labelToClassId.set(labelName, existing.id);
    } else {
      const newId = `class_${Date.now()}_${idx}`;
      const color = COLOR_PALETTE[updatedClasses.length % COLOR_PALETTE.length];
      const icon = EMOJI_PALETTE[updatedClasses.length % EMOJI_PALETTE.length];
      const newCategory: ClassCategory = {
        id: newId,
        name: labelName,
        color,
        icon
      };
      updatedClasses.push(newCategory);
      labelToClassId.set(labelName, newId);
    }
  });

  // Extract each image and resize to 28x28
  const extractedSamples: DatasetSample[] = [];

  // Group by label to apply train/val/test split
  const filesByLabel = new Map<string, typeof imageFiles>();
  imageFiles.forEach(f => {
    if (!filesByLabel.has(f.label)) filesByLabel.set(f.label, []);
    filesByLabel.get(f.label)!.push(f);
  });

  for (const [label, files] of filesByLabel.entries()) {
    const classId = labelToClassId.get(label)!;
    const trainCount = Math.floor(files.length * splitRatio.train);
    const valCount = Math.floor(files.length * splitRatio.val);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      let split: 'train' | 'val' | 'test' = 'test';
      if (i < trainCount) split = 'train';
      else if (i < trainCount + valCount) split = 'val';

      try {
        const blob = await f.fileObj.async('blob');
        const dataUrl = await imageBlobToGrayscaleDataUrl(blob);

        extractedSamples.push({
          id: `zip_${Date.now()}_${extractedSamples.length}`,
          classId,
          dataUrl,
          split,
          createdAt: Date.now() + i
        });
      } catch (err) {
        console.warn(`Failed to process image ${f.path}:`, err);
      }
    }
  }

  return {
    classes: updatedClasses,
    samples: extractedSamples,
    summary: {
      totalImages: extractedSamples.length,
      classesFound: uniqueLabels
    }
  };
}
