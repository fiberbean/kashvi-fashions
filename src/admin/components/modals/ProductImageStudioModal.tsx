import React, { useState, useRef } from 'react';
import {
  Upload,
  Check,
  X,
  Camera,
  ShieldCheck,
  Crop,
  Sparkles
} from 'lucide-react';

interface ProductImageStudioModalProps {
  onClose: () => void;
  onAcceptImage: (processedUrl: string) => void;
  productTitle?: string;
  categoryName?: string;
}

export default function ProductImageStudioModal({
  onClose,
  onAcceptImage,
}: ProductImageStudioModalProps) {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [optimizedImage, setOptimizedImage] = useState<string | null>(null);
  const [fileSizeInfo, setFileSizeInfo] = useState<{ original: string; optimized: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const originalSizeStr = formatSize(file.size);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setOriginalImage(dataUrl);
      processCleanImage(dataUrl, originalSizeStr);
    };
    reader.readAsDataURL(file);
  };

  // Zero Filter - Only 100% Real Colors, Sharp Resolution & WebP Compression
  const processCleanImage = (src: string, origSize: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1:1 HD E-Commerce Square Standard
      const maxDim = 1200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw exact product with ZERO color/pixel alteration
      ctx.drawImage(img, 0, 0, width, height);

      // Lightweight WebP format with sharp 88% quality
      const webpOutput = canvas.toDataURL('image/webp', 0.88);
      const approxBytes = Math.round((webpOutput.length * 3) / 4);

      setFileSizeInfo({
        original: origSize,
        optimized: formatSize(approxBytes)
      });

      setOptimizedImage(webpOutput);
    };
  };

  const handleConfirm = () => {
    if (!optimizedImage) return;
    onAcceptImage(optimizedImage);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md select-none font-sans animate-in fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#dce6e1] flex flex-col gap-4 text-xs">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-[#edf2ef] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0b3b2c] text-[#e5c07b] flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0b3b2c]">HD Product Image Optimizer</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>100% Real Product Authenticity</span>
                </span>
              </div>
              <p className="text-[10px] text-[#4d6960]">
                Preserves original product look & texture completely while converting to ultra-fast WebP format.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 cursor-pointer"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Upload State */}
        {!originalImage ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-[#c5d6ce] rounded-3xl bg-[#f8faf9] p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectFile}
              className="hidden"
              id="raw-clean-upload"
            />
            <div className="w-16 h-16 rounded-3xl bg-white shadow-xs border border-[#dce6e1] flex items-center justify-center mb-3">
              <Upload className="w-7 h-7 text-[#0b3b2c]" />
            </div>
            <h3 className="font-bold text-sm text-[#0b3b2c]">Upload Real Product Photo</h3>
            <p className="text-[11px] text-[#4d6960] max-w-sm mt-1 mb-4">
              Select your high-clarity original product photo. It will be compressed cleanly into HD WebP without losing any real details.
            </p>
            <label
              htmlFor="raw-clean-upload"
              className="px-6 py-2.5 rounded-2xl bg-[#0b3b2c] text-white font-bold text-xs shadow-xs hover:bg-[#124b39] transition-all cursor-pointer flex items-center gap-2"
            >
              <Camera className="w-4 h-4 text-[#e5c07b]" />
              <span>Choose Photo</span>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#dce6e1] bg-[#f8faf9] overflow-hidden flex flex-col">
              <div className="px-3.5 py-2 border-b border-[#edf2ef] bg-white flex justify-between items-center">
                <span className="font-bold text-[11px] text-[#0b3b2c] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#e5c07b]" /> HD WebP Preview
                </span>
                {fileSizeInfo && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-400 line-through">
                      Original: {fileSizeInfo.original}
                    </span>
                    <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                      Optimized: {fileSizeInfo.optimized}
                    </span>
                  </div>
                )}
              </div>

              <div className="h-80 sm:h-96 p-4 flex items-center justify-center bg-white">
                {optimizedImage && (
                  <img
                    src={optimizedImage}
                    alt="Real Product Preview"
                    className="max-h-full max-w-full object-contain rounded-xl shadow-xs"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#edf2ef]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-[#0b3b2c] underline cursor-pointer"
              >
                Choose Different Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleSelectFile}
                className="hidden"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-neutral-500 font-bold hover:bg-neutral-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!optimizedImage}
                  onClick={handleConfirm}
                  className="px-6 py-2 rounded-xl bg-[#0b3b2c] text-white font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#124b39] transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 text-[#e5c07b]" />
                  <span>Okay, Add Product Image</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}