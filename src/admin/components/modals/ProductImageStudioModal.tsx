import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Sliders,
  Check,
  X,
  RefreshCw,
  Sun,
  Eye,
  Zap,
  Image as ImageIcon
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
  productTitle = 'Retail Item',
  categoryName = 'Fashion'
}: ProductImageStudioModalProps) {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [fileSizeInfo, setFileSizeInfo] = useState<{ original: string; compressed: string } | null>(null);

  // Customization Controls
  const [brightness, setBrightness] = useState<number>(105);
  const [contrast, setContrast] = useState<number>(110);
  const [saturation, setSaturation] = useState<number>(115);
  const [selectedBgStyle, setSelectedBgStyle] = useState<'studio-marble' | 'luxury-podium' | 'clean-white' | 'velvet-dark'>('studio-marble');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calculate human readable file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Image Upload Selection
  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const originalSizeStr = formatSize(file.size);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setOriginalImage(dataUrl);
      // Auto run initial AI Studio enhancement
      runAiStudioProcessing(dataUrl, originalSizeStr, brightness, contrast, saturation, selectedBgStyle);
    };
    reader.readAsDataURL(file);
  };

  // AI Studio Image Engine & WebP Ultra Compressor
  const runAiStudioProcessing = (
    src: string,
    origSize: string,
    b: number,
    c: number,
    s: number,
    bgStyle: string
  ) => {
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

      // Maintain crisp 1200px ecommerce standard resolution
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

      // 1. Studio Lighting Background Generation based on style
      const gradient = ctx.createRadialGradient(
        width / 2,
        height * 0.45,
        width * 0.1,
        width / 2,
        height / 2,
        width * 0.8
      );

      if (bgStyle === 'studio-marble') {
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#f4f6f5');
        gradient.addColorStop(1, '#e2eae6');
      } else if (bgStyle === 'luxury-podium') {
        gradient.addColorStop(0, '#fffbf2');
        gradient.addColorStop(0.6, '#f3ece1');
        gradient.addColorStop(1, '#dcd3c5');
      } else if (bgStyle === 'velvet-dark') {
        gradient.addColorStop(0, '#1a2e26');
        gradient.addColorStop(0.7, '#0c1a15');
        gradient.addColorStop(1, '#050a08');
      } else {
        // Clean Studio White
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#fafafa');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Apply Custom Studio Filters (Lighting, Warmth, Contrast)
      ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

      // Draw Main Item onto Canvas
      ctx.drawImage(img, 0, 0, width, height);
      ctx.filter = 'none';

      // 3. High Quality + Low File Size (WebP 82% quality compression)
      const compressedWebpUrl = canvas.toDataURL('image/webp', 0.82);

      // Calculate compressed size from Base64
      const approxCompressedBytes = Math.round((compressedWebpUrl.length * 3) / 4);
      setFileSizeInfo({
        original: origSize,
        compressed: formatSize(approxCompressedBytes)
      });

      setProcessedImage(compressedWebpUrl);
      setIsProcessing(false);
    };
  };

  // Re-apply when sliders change
  const handleUpdateAdjustments = (newB: number, newC: number, newS: number, newBg: typeof selectedBgStyle) => {
    if (!originalImage || !fileSizeInfo) return;
    runAiStudioProcessing(originalImage, fileSizeInfo.original, newB, newC, newS, newBg);
  };

  const handleConfirmAndUpload = () => {
    if (!processedImage) return;
    onAcceptImage(processedImage);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md select-none font-sans animate-in fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#dce6e1] flex flex-col gap-4 text-xs">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-[#edf2ef] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#e4efe9] text-[#0b3b2c] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#c6933a]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0b3b2c] flex items-center gap-1.5">
                <span>AI Studio Image Enhancer</span>
                <span className="px-2 py-0.5 rounded-full bg-[#0b3b2c] text-white text-[9px] font-mono tracking-wider uppercase">
                  Ultra Compression
                </span>
              </h2>
              <p className="text-[10px] text-[#4d6960]">
                Smart studio lighting, background optimization, and web-ready compression.
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

        {/* Upload Trigger if no image selected */}
        {!originalImage ? (
          <div className="min-h-[320px] flex flex-col items-center justify-center border-2 border-dashed border-[#c5d6ce] rounded-3xl bg-[#f8faf9] p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectFile}
              className="hidden"
              id="studio-file-upload"
            />
            <div className="w-16 h-16 rounded-3xl bg-white shadow-xs border border-[#dce6e1] flex items-center justify-center mb-3">
              <Upload className="w-7 h-7 text-[#0b3b2c]" />
            </div>
            <h3 className="font-bold text-sm text-[#0b3b2c]">Upload Raw Product Image</h3>
            <p className="text-[11px] text-[#4d6960] max-w-sm mt-1 mb-4">
              Upload any phone click or camera shot. The AI Studio will balance the lighting, set background, and compress for faster web speed.
            </p>
            <label
              htmlFor="studio-file-upload"
              className="px-5 py-2.5 rounded-2xl bg-[#0b3b2c] text-white font-bold text-xs shadow-xs hover:bg-[#124b39] transition-all cursor-pointer flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4 text-[#e5c07b]" />
              <span>Choose Photo to Enhance</span>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Side-by-Side Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left: Original Photo */}
              <div className="rounded-2xl border border-[#dce6e1] bg-[#f8faf9] overflow-hidden flex flex-col">
                <div className="px-3.5 py-2 border-b border-[#edf2ef] bg-white flex justify-between items-center">
                  <span className="font-bold text-[11px] text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Original Raw Photo
                  </span>
                  {fileSizeInfo && (
                    <span className="font-mono text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">
                      Size: {fileSizeInfo.original}
                    </span>
                  )}
                </div>
                <div className="h-64 sm:h-80 p-3 flex items-center justify-center bg-neutral-50/50">
                  <img
                    src={originalImage}
                    alt="Original"
                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xs"
                  />
                </div>
              </div>

              {/* Right: AI Enhanced Studio Photo */}
              <div className="rounded-2xl border border-[#0b3b2c]/30 bg-[#f8faf9] overflow-hidden flex flex-col relative">
                <div className="px-3.5 py-2 border-b border-[#edf2ef] bg-[#e4efe9] flex justify-between items-center">
                  <span className="font-bold text-[11px] text-[#0b3b2c] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#c6933a]" /> AI Studio Enhanced
                  </span>
                  {fileSizeInfo && (
                    <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                      Size: {fileSizeInfo.compressed} (WebP)
                    </span>
                  )}
                </div>

                <div className="h-64 sm:h-80 p-3 flex items-center justify-center relative bg-white">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#0b3b2c]" />
                      <span className="text-xs font-bold text-[#0b3b2c]">Generating Lighting & Background...</span>
                    </div>
                  ) : processedImage ? (
                    <img
                      src={processedImage}
                      alt="AI Studio Enhanced"
                      className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                    />
                  ) : null}
                </div>
              </div>

            </div>

            {/* Customization & Fine-Tuning Controls */}
            <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#dce6e1] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0b3b2c] text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5" /> Fine-Tune Studio Lighting & Background
                </span>
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className="text-[11px] font-bold text-[#0b3b2c] underline cursor-pointer"
                >
                  Choose Different Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSelectFile}
                  className="hidden"
                />
              </div>

              {/* Background Theme Style Options */}
              <div>
                <span className="text-[10.5px] font-bold text-neutral-600 block mb-1.5">
                  Item Backdrop Environment:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'studio-marble', label: 'Studio Marble' },
                    { key: 'luxury-podium', label: 'Luxury Champagne Podium' },
                    { key: 'clean-white', label: 'Ecommerce Pure White' },
                    { key: 'velvet-dark', label: 'Royal Dark Velvet' }
                  ].map((style) => (
                    <button
                      key={style.key}
                      type="button"
                      onClick={() => {
                        const newBg = style.key as typeof selectedBgStyle;
                        setSelectedBgStyle(newBg);
                        handleUpdateAdjustments(brightness, contrast, saturation, newBg);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedBgStyle === style.key
                          ? 'bg-[#0b3b2c] text-white border-[#0b3b2c] shadow-xs'
                          : 'bg-white text-[#4d6960] border-[#dce6e1] hover:border-[#0b3b2c]'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders: Brightness, Contrast, Saturation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-white p-2.5 rounded-xl border border-[#dce6e1]">
                  <div className="flex justify-between text-[10.5px] font-bold text-neutral-600 mb-1">
                    <span>Studio Brightness</span>
                    <span className="font-mono text-[#0b3b2c]">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="140"
                    value={brightness}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBrightness(val);
                      handleUpdateAdjustments(val, contrast, saturation, selectedBgStyle);
                    }}
                    className="w-full accent-[#0b3b2c] cursor-pointer"
                  />
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-[#dce6e1]">
                  <div className="flex justify-between text-[10.5px] font-bold text-neutral-600 mb-1">
                    <span>Studio Contrast</span>
                    <span className="font-mono text-[#0b3b2c]">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="140"
                    value={contrast}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setContrast(val);
                      handleUpdateAdjustments(brightness, val, saturation, selectedBgStyle);
                    }}
                    className="w-full accent-[#0b3b2c] cursor-pointer"
                  />
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-[#dce6e1]">
                  <div className="flex justify-between text-[10.5px] font-bold text-neutral-600 mb-1">
                    <span>Colour Vibrancy</span>
                    <span className="font-mono text-[#0b3b2c]">{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="150"
                    value={saturation}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSaturation(val);
                      handleUpdateAdjustments(brightness, contrast, val, selectedBgStyle);
                    }}
                    className="w-full accent-[#0b3b2c] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions: Cancel vs Accept */}
            <div className="flex items-center justify-between pt-2 border-t border-[#edf2ef]">
              <span className="text-[10px] text-neutral-400">
                Processed with 1200px sharp canvas resolution & lightweight WebP compression.
              </span>
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
                  <span>Okay, Add Enhanced Image</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}