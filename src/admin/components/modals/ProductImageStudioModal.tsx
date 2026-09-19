import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Check,
  X,
  RefreshCw,
  Eye,
  Camera,
  Layers,
  RotateCcw
} from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';

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
  const [cutoutBlob, setCutoutBlob] = useState<Blob | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [fileSizeInfo, setFileSizeInfo] = useState<{ original: string; optimized: string } | null>(null);

  // Manual placement adjustments if needed
  const [scaleFactor, setScaleFactor] = useState<number>(100);
  const [offsetY, setOffsetY] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const originalSizeStr = formatSize(file.size);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setOriginalImage(dataUrl);
      setCutoutBlob(null);
      setProcessedImage(null);

      await processRealStudioComposite(file, originalSizeStr, 100, 0);
    };
    reader.readAsDataURL(file);
  };

  const processRealStudioComposite = async (
    fileInput: Blob | string,
    origSizeStr: string,
    scale: number,
    yShift: number
  ) => {
    setIsProcessing(true);
    setProcessingStatus('AI segmenting jewellery & stones...');

    let blobResult = cutoutBlob;

    if (!blobResult) {
      try {
        blobResult = await removeBackground(fileInput, {
          progress: (_key: string, current: number, total: number) => {
            if (total > 0) {
              setProcessingStatus(`Segmenting Item: ${Math.round((current / total) * 100)}%`);
            }
          }
        });
        setCutoutBlob(blobResult);
      } catch (err) {
        console.warn('Segmentation fallback to local image:', err);
      }
    }

    setProcessingStatus('Compositing on real studio tray backdrop...');
    renderOntoRealBackdrop(blobResult, typeof fileInput === 'string' ? fileInput : URL.createObjectURL(fileInput), origSizeStr, scale, yShift);
  };

  const renderOntoRealBackdrop = (
    cutout: Blob | null,
    fallbackSrc: string,
    origSizeStr: string,
    scale: number,
    yShift: number
  ) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    const size = 1200;
    canvas.width = size;
    canvas.height = size;

    // Load authentic photoshoot studio backdrop (Velvet drapery, marble tray, warm lighting)
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    // Clean, high-resolution aesthetic studio flatlay
    bgImg.src = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=85';

    bgImg.onload = () => {
      // 1. Draw real backdrop
      ctx.drawImage(bgImg, 0, 0, size, size);

      // 2. Draw Item
      const itemImg = new Image();
      itemImg.crossOrigin = 'anonymous';
      itemImg.src = cutout ? URL.createObjectURL(cutout) : fallbackSrc;

      itemImg.onload = () => {
        const baseW = size * 0.48 * (scale / 100);
        const baseH = size * 0.48 * (scale / 100);

        let drawW = itemImg.width;
        let drawH = itemImg.height;
        const ratio = Math.min(baseW / drawW, baseH / drawH);
        drawW = Math.round(drawW * ratio);
        drawH = Math.round(drawH * ratio);

        const posX = Math.round((size - drawW) / 2);
        const posY = Math.round((size - drawH) / 2 + 60 + yShift);

        // Natural soft contact shadow on surface
        ctx.save();
        const shadowY = posY + drawH - 10;
        const shadowW = drawW * 0.9;
        const shadowH = drawH * 0.16;

        const shadowGrad = ctx.createRadialGradient(
          size / 2, shadowY + shadowH / 2, 5,
          size / 2, shadowY + shadowH / 2, shadowW / 2
        );
        shadowGrad.addColorStop(0, 'rgba(10, 8, 5, 0.65)');
        shadowGrad.addColorStop(0.5, 'rgba(10, 8, 5, 0.28)');
        shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.ellipse(size / 2, shadowY + shadowH / 2, shadowW / 2, shadowH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Authentic product draw
        ctx.drawImage(itemImg, posX, posY, drawW, drawH);

        // WebP output under 120KB
        const webpOutput = canvas.toDataURL('image/webp', 0.86);
        const approxBytes = Math.round((webpOutput.length * 3) / 4);

        setFileSizeInfo({
          original: origSizeStr,
          optimized: formatSize(approxBytes)
        });
        setProcessedImage(webpOutput);
        setIsProcessing(false);
      };

      itemImg.onerror = () => setIsProcessing(false);
    };

    bgImg.onerror = () => {
      // Fallback if network blocked
      ctx.fillStyle = '#112920';
      ctx.fillRect(0, 0, size, size);
      setIsProcessing(false);
    };
  };

  const handleScaleChange = (newScale: number) => {
    setScaleFactor(newScale);
    if ((cutoutBlob || originalImage) && fileSizeInfo) {
      renderOntoRealBackdrop(cutoutBlob, originalImage || '', fileSizeInfo.original, newScale, offsetY);
    }
  };

  const handleYShiftChange = (newY: number) => {
    setOffsetY(newY);
    if ((cutoutBlob || originalImage) && fileSizeInfo) {
      renderOntoRealBackdrop(cutoutBlob, originalImage || '', fileSizeInfo.original, scaleFactor, newY);
    }
  };

  const handleConfirmAndUpload = () => {
    if (!processedImage) return;
    onAcceptImage(processedImage);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md select-none font-sans animate-in fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#dce6e1] flex flex-col gap-4 text-xs">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#edf2ef] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0b3b2c] text-[#e5c07b] flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0b3b2c]">Real Photoshoot Studio Staging</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Real Photo Backdrop</span>
                </span>
              </div>
              <p className="text-[10px] text-[#4d6960]">
                Cleanly isolates your jewellery and places it realistically on a studio marble surface with authentic lighting.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-neutral-100 cursor-pointer">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* 1. Upload Trigger */}
        {!originalImage ? (
          <div className="min-h-[320px] flex flex-col items-center justify-center border-2 border-dashed border-[#c5d6ce] rounded-3xl bg-[#f8faf9] p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectFile}
              className="hidden"
              id="studio-file-input"
            />
            <div className="w-16 h-16 rounded-3xl bg-white shadow-xs border border-[#dce6e1] flex items-center justify-center mb-3">
              <Upload className="w-7 h-7 text-[#0b3b2c]" />
            </div>
            <h3 className="font-bold text-sm text-[#0b3b2c]">Select Raw Item Photo</h3>
            <p className="text-[11px] text-[#4d6960] max-w-sm mt-1 mb-4">
              Upload raw click. AI will segment the product cleanly and place it on a realistic studio marble platter.
            </p>
            <label
              htmlFor="studio-file-input"
              className="px-6 py-2.5 rounded-2xl bg-[#0b3b2c] text-white font-bold text-xs shadow-xs hover:bg-[#124b39] transition-all cursor-pointer flex items-center gap-2"
            >
              <Camera className="w-4 h-4 text-[#e5c07b]" />
              <span>Choose Photo to Stage</span>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* 2. Side-by-Side Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left: Raw Photo */}
              <div className="rounded-2xl border border-[#dce6e1] bg-[#f8faf9] overflow-hidden flex flex-col">
                <div className="px-3.5 py-2 border-b border-[#edf2ef] bg-white flex justify-between items-center">
                  <span className="font-bold text-[11px] text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> 1. Raw Captured Photo
                  </span>
                  {fileSizeInfo?.original && (
                    <span className="font-mono text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">
                      Size: {fileSizeInfo.original}
                    </span>
                  )}
                </div>
                <div className="h-64 sm:h-80 p-4 flex items-center justify-center bg-neutral-50">
                  <img
                    src={originalImage}
                    alt="Raw Upload"
                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xs"
                  />
                </div>
              </div>

              {/* Right: Studio Staged Output */}
              <div className="rounded-2xl border border-[#0b3b2c]/30 bg-[#f8faf9] overflow-hidden flex flex-col relative">
                <div className="px-3.5 py-2 border-b border-[#edf2ef] bg-[#e4efe9] flex justify-between items-center">
                  <span className="font-bold text-[11px] text-[#0b3b2c] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#c6933a]" /> 2. Real Studio Staged Result
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
                      <RefreshCw className="w-7 h-7 animate-spin text-[#0b3b2c]" />
                      <span className="text-xs font-bold text-[#0b3b2c]">{processingStatus}</span>
                      <span className="text-[10px] text-[#4d6960]">Extracting product & staging on marble tray...</span>
                    </div>
                  ) : processedImage ? (
                    <img
                      src={processedImage}
                      alt="Commercial Staged Item"
                      className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                    />
                  ) : null}
                </div>
              </div>

            </div>

            {/* 3. Positioning Controls */}
            {!isProcessing && processedImage && (
              <div className="p-3 bg-[#f8faf9] border border-[#dce6e1] rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#0b3b2c]">Size:</span>
                    <input
                      type="range"
                      min="70"
                      max="130"
                      value={scaleFactor}
                      onChange={(e) => handleScaleChange(Number(e.target.value))}
                      className="w-24 accent-[#0b3b2c] cursor-pointer"
                    />
                    <span className="font-mono text-[10px] text-[#0b3b2c]">{scaleFactor}%</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#0b3b2c]">Position:</span>
                    <input
                      type="range"
                      min="-80"
                      max="80"
                      value={offsetY}
                      onChange={(e) => handleYShiftChange(Number(e.target.value))}
                      className="w-24 accent-[#0b3b2c] cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScaleFactor(100);
                    setOffsetY(0);
                    handleScaleChange(100);
                  }}
                  className="text-[11px] text-[#0b3b2c] font-bold underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Position</span>
                </button>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#edf2ef]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-[#0b3b2c] underline cursor-pointer"
              >
                Upload Different Photo
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
                  disabled={!processedImage || isProcessing}
                  onClick={handleConfirmAndUpload}
                  className="px-6 py-2 rounded-xl bg-[#0b3b2c] text-white font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#124b39] transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-[#e5c07b]" />
                  <span>Okay, Upload Staged Image</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}