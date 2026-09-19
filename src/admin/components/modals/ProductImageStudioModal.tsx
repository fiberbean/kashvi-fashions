import React, { useState, useRef } from 'react';
import {
  Upload,
  Check,
  X,
  RefreshCw,
  Eye,
  Camera,
  HardDrive
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
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
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
      
      // Auto run compression as soon as file is selected
      compressAndOptimize(dataUrl, originalSizeStr);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Zero-cost, Zero-AI Local Compression Engine:
   * 1. Maintains crisp 1200px resolution (HD quality for product view)
   * 2. Preserves 100% original color and sharpness (No artificial staging)
   * 3. Converts to high-efficiency WebP format to minimize database usage (<150KB typical)
   */
  const compressAndOptimize = (src: string, origSizeStr: string) => {
    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      // Preserve HD quality (1200px square standard)
      const maxSize = 1200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw exact product with ZERO color or sharpness alteration
      ctx.drawImage(img, 0, 0, width, height);

      // Lightweight WebP format with sharp 88% quality (balanced for clarity & size)
      const webpOutput = canvas.toDataURL('image/webp', 0.88);
      const approxCompressedBytes = Math.round((webpOutput.length * 3) / 4);

      setFileSizeInfo({
        original: origSizeStr,
        optimized: formatSize(approxCompressedBytes)
      });

      setOptimizedImage(webpOutput);
      setIsProcessing(false);
    };
  };

  const handleConfirm = () => {
    if (!optimizedImage) return;
    onAcceptImage(optimizedImage);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md select-none font-sans animate-in fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#dce6e1] flex flex-col gap-4 text-xs">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#edf2ef] pb-3 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#e4efe9] text-[#0b3b2c] flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-[#0b3b2c]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0b3b2c] flex items-center gap-1.5">
                <span>HD Product Image Optimizer</span>
                <span className="px-2 py-0.5 rounded-full bg-[#0b3b2c] text-white text-[9px] font-mono tracking-wider uppercase">
                  WebP Compression
                </span>
              </h2>
              <p className="text-[10px] text-[#4d6960]">
                Preserves original photo details and colors while minimizing file size for fast store loading. No AI.
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

        {/* 1. Initial State: Upload Raw Picture */}
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
            <h3 className="font-bold text-sm text-[#0b3b2c]">Upload Raw Product Photo</h3>
            <p className="text-[11px] text-[#4d6960] max-w-sm mt-1 mb-4">
              Select your high-clarity phone or camera shot. It will be compressed locally into HD WebP without losing any real product details.
            </p>
            <label
              htmlFor="raw-clean-upload"
              className="px-6 py-2.5 rounded-2xl bg-[#0b3b2c] text-white font-bold text-xs shadow-xs hover:bg-[#124b39] transition-all cursor-pointer flex items-center gap-2"
            >
              <Camera className="w-4 h-4 text-[#e5c07b]" />
              <span>Choose Photo to Optimize</span>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* 2. Side-by-Side Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left: Original Customer Click */}
              <div className="rounded-2xl border border-[#dce6e1] bg-[#f8faf9] overflow-hidden flex flex-col">
                <div className="px-3.5 py-2 border-b border-[#edf2ef] bg-white flex justify-between items-center">
                  <span className="font-bold text-[11px] text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> 1. Original (Before Compression)
                  </span>
                  {fileSizeInfo && (
                    <span className="font-mono text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">
                      Size: {fileSizeInfo.original}
                    </span>
                  )}
                </div>
                <div className="h-64 sm:h-80 p-4 flex items-center justify-center bg-neutral-50/50">
                  <img
                    src={originalImage}
                    alt="Original raw"
                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xs"
                  />
                </div>
              </div>

              {/* Right: Optimized HD Output */}
              <div className="rounded-2xl border border-[#0b3b2c]/30 bg-[#f8faf9] overflow-hidden flex flex-col relative">
                <div className="px-3.5 py-2 border-b border-[#edf2ef] bg-[#e4efe9] flex justify-between items-center">
                  <span className="font-bold text-[11px] text-[#0b3b2c] uppercase tracking-wider flex items-center gap-1.5">
                    < हार्डड्राइव className="w-3.5 h-3.5 text-[#e5c07b]" /> 2. HD WebP Optimized (Database Ready)
                  </span>
                  {fileSizeInfo?.optimized && (
                    <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-md font-bold">
                      Lightweight WebP: {fileSizeInfo.optimized}
                    </span>
                  )}
                </div>

                <div className="h-64 sm:h-80 p-4 flex items-center justify-center relative bg-white">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-center p-4">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#0b3b2c]" />
                      <span className="text-xs font-bold text-[#0b3b2c]">Optimizing pixels & compressing...</span>
                    </div>
                  ) : optimizedImage ? (
                    <img
                      src={optimizedImage}
                      alt="Optimized HD Product"
                      className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                    />
                  ) : null}
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#edf2ef]">
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
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
                  disabled={!optimizedImage || isProcessing}
                  onClick={handleConfirm}
                  className="px-6 py-2 rounded-xl bg-[#0b3b2c] text-white font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#124b39] transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 text-[#e5c07b]" />
                  <span>Okay, Add Optimized Image</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}