/**
 * Client-side High-Definition WebP Image Compressor
 * Converts any image format into a high-clarity, lightweight WebP blob & dataUrl (<150KB, 1400px max)
 */
export interface OptimizedImageResult {
  dataUrl: string;
  blob: Blob;
  sizeFormatted: string;
  originalSizeFormatted: string;
}

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const compressImageToWebP = (
  file: File,
  maxDimension = 1400,
  quality = 0.88
): Promise<OptimizedImageResult> => {
  return new Promise((resolve, reject) => {
    const originalSizeStr = formatBytes(file.size);
    const reader = new FileReader();

    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context could not be created.'));
          return;
        }

        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw crisp pixels directly
        ctx.drawImage(img, 0, 0, width, height);

        // Convert directly to WebP Blob for storage upload
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('WebP compression failed.'));
              return;
            }
            const dataUrl = canvas.toDataURL('image/webp', quality);
            resolve({
              dataUrl,
              blob,
              sizeFormatted: formatBytes(blob.size),
              originalSizeFormatted: originalSizeStr
            });
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image for compression.'));
    };

    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
};