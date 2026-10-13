import { DatasetSample, ClassCategory } from '../types';

/**
 * Re-splits samples according to train / val / test ratios
 */
export function resplitDataset(
  samples: DatasetSample[],
  classes: ClassCategory[],
  trainPercent = 70,
  valPercent = 15
): DatasetSample[] {
  const result: DatasetSample[] = [];
  const trainRatio = trainPercent / 100;
  const valRatio = valPercent / 100;

  classes.forEach(cls => {
    const classSamples = samples.filter(s => s.classId === cls.id);
    // Shuffle deterministic
    const shuffled = [...classSamples].sort(() => Math.random() - 0.5);
    const n = shuffled.length;
    const trainN = Math.floor(n * trainRatio);
    const valN = Math.floor(n * valRatio);

    shuffled.forEach((sample, idx) => {
      let split: 'train' | 'val' | 'test' = 'test';
      if (idx < trainN) {
        split = 'train';
      } else if (idx < trainN + valN) {
        split = 'val';
      }
      result.push({ ...sample, split });
    });
  });

  return result;
}

/**
 * Augments a base canvas or data URL into multiple transformed samples (rotate, shift, scale)
 */
export async function augmentImage(
  dataUrl: string,
  count = 4
): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const results: string[] = [];
      for (let i = 0; i < count; i++) {
        const c = document.createElement('canvas');
        c.width = 28;
        c.height = 28;
        const ctx = c.getContext('2d')!;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 28, 28);

        // Random jitter
        const dx = (Math.random() - 0.5) * 4;
        const dy = (Math.random() - 0.5) * 4;
        const angle = (Math.random() - 0.5) * 0.35; // radians
        const scale = 0.85 + Math.random() * 0.3;

        ctx.save();
        ctx.translate(14 + dx, 14 + dy);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -14, -14, 28, 28);
        ctx.restore();

        results.push(c.toDataURL('image/png'));
      }
      resolve(results);
    };
    img.src = dataUrl;
  });
}
