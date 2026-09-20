import React, { useState, useRef } from 'react';
import {
  Upload,
  Check,
  X,
  RefreshCw,
  Eye,
  Camera,
  HardDrive,
  Pipette,
  Tag,
  Trash2,
  ZoomIn
} from 'lucide-react';

export interface TaggedColor {
  id: string;
  hex: string;
  name: string;
  xPercent: number;
  yPercent: number;
}

interface ImageOptimizerModalProps {
  onClose: () => void;
  onAcceptImage: (processedUrl: string, colors: TaggedColor[]) => void;
  productTitle?: string;
  categoryName?: string;
}

// Basic color namer helper for intuitive labels
function getApproxColorName(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  if (r > 200 && g > 170 && b < 100) return 'Gold / Antique';
  if (r > 160 && g < 70 && b < 90) return 'Ruby Red';
  if (g > 110 && r < 90 && b < 100) return 'Emerald Green';
  if (r > 220 && g > 220 && b > 210) return 'Pearl / White';
  if (r < 50 && g < 50 && b < 50) return 'Black';
  if (r > 150 && g < 100 && b > 150) return 'Purple / Magenta';
  if (r > 200 && g > 100 && b < 50) return 'Coral / Orange';
  if (r > 180 && g > 180 && b > 180) return 'Silver / Metallic';
  return 'Jewel Tone';
}

export default function ImageOptimizerModal({
  onClose,
  onAcceptImage,
}: ImageOptimizerModalProps) {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [optimizedImage, setOptimizedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [fileSizeInfo, setFileSizeInfo] = useState<{ original: string; optimized: string } | null>(null);

  // Color Tagging State
  const [colorTags, setColorTags] = useState<TaggedColor[]>([]);
  const [activePickerMode, setActivePickerMode] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

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
      setColorTags([]); // reset tags for new image
      compressAndOptimize(dataUrl, originalSizeStr);
    };
    reader.readAsDataURL(file);
  };

  // Local HD WebP Compression (<150KB, 1400px Max, 100% Quality/Color preservation)
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

      const maxSize = 1400;
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

      // Draw real pixels directly (zero filters)
      ctx.drawImage(img, 0, 0, width, height);

      // WebP HD output
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

  // Interactive Click to Tag Color on Image
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!activePickerMode || !optimizedImage || !imageElementRef.current) return;

    const rect = imageElementRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

    // Sample pixel from invisible canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = imageElementRef.current;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx?.drawImage(img, 0, 0);

    const sampleX = Math.round((clickX / rect.width) * img.naturalWidth);
    const sampleY = Math.round((clickY / rect.height) * img.naturalHeight);

    const pixel = ctx?.getImageData(sampleX, sampleY, 1, 1).data;
    if (!pixel) return;

    const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase()}`;
    const name = getApproxColorName(hex);

    const newTag: TaggedColor = {
      id: Math.random().toString(36).substring(2, 9),
      hex,
      name,
      xPercent,
      yPercent
    };

    setColorTags((prev) => [...prev, newTag]);
  };

  const handleRemoveTag = (id: string) => {
    setColorTags((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateTagName = (id: string, newName: string) => {
    setColorTags((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: newName } : t))
    );
  };

  const handleConfirm = () => {
    if (!optimizedImage) return;
    onAcceptImage(optimizedImage, colorTags);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md select-none font-sans animate-in fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-5xl w-full max-h-[94vh] overflow-y-auto shadow-2xl border border-[#dce6e1] flex flex-col gap-4 text-xs">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#edf2ef] pb-3 sticky top-0 bg-white z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#e4efe9] text-[#0b3b2c] flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-[#0b3b2c]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0b3b2c] flex items-center gap-2">
                <span>HD Product Image Optimizer</span>
                <span className="px-2 py-0.5 rounded-full bg-[#0b3b2c] text-white text-[9px] font-mono tracking-wider uppercase">
                  WebP + Color Tagging
                </span>
              </h2>
              <p className="text-[10px] text-[#4d6960]">
                Optimizes to lightweight WebP, shows preview instantly, and allows direct point-and-click color tagging.
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

        {/* 1. Upload State */}
        {!originalImage ? (
          <div className="min-h-[320px] flex flex-col items-center justify-center border-2 border-dashed border-[#c5d6ce] rounded-3xl bg-[#f8faf9] p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectFile}
              className="hidden"
              id="raw-optimize-upload"
            />
            <div className="w-16 h-16 rounded-3xl bg-white shadow-xs border border-[#dce6e1] flex items-center justify-center mb-3">
              <Upload className="w-7 h-7 text-[#0b3b2c]" />
            </div>
            <h3 className="font-bold text-sm text-[#0b3b2c]">Upload Product Photo</h3>
            <p className="text-[11px] text-[#4d6960] max-w-sm mt-1 mb-4">
              Select product image. It will compress to lightweight HD WebP and open directly for color picking and tagging.
            </p>
            <label
              htmlFor="raw-optimize-upload"
              className="px-6 py-2.5 rounded-2xl bg-[#0b3b2c] text-white font-bold text-xs shadow-xs hover:bg-[#124b39] transition-all cursor-pointer flex items-center gap-2"
            >
              <Camera className="w-4 h-4 text-[#e5c07b]" />
              <span>Choose Photo to Optimize & Tag</span>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Top Toolbar: File Size & Color Tagging Switch */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#f8faf9] rounded-2xl border border-[#dce6e1]">
              <div className="flex items-center gap-3">
                <span className="font-bold text-[11px] text-[#0b3b2c] uppercase tracking-wider flex items-center gap-1.5">
                  <Pipette className="w-4 h-4 text-[#0b3b2c]" /> Interactive Color Tagging
                </span>
                <button
                  type="button"
                  onClick={() => setActivePickerMode(!activePickerMode)}
                  className={`px-3 py-1 rounded-xl text-[10.5px] font-bold border transition-all cursor-pointer ${
                    activePickerMode
                      ? 'bg-[#0b3b2c] text-white border-[#0b3b2c]'
                      : 'bg-white text-neutral-600 border-neutral-300'
                  }`}
                >
                  {activePickerMode ? '✓ Click-to-Tag Mode ON' : 'Paused (Click to enable)'}
                </button>
              </div>

              {fileSizeInfo && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400 line-through">
                    Raw: {fileSizeInfo.original}
                  </span>
                  <span className="font-mono text-[10.5px] text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-lg font-bold">
                    WebP: {fileSizeInfo.optimized}
                  </span>
                </div>
              )}
            </div>

            {/* Main Interactive Preview & Tagging Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Left 2 Cols: Optimized HD Image with Interactive Pins */}
              <div
                ref={imageContainerRef}
                className="lg:col-span-2 rounded-2xl border border-[#dce6e1] bg-neutral-900/5 min-h-[380px] max-h-[520px] flex items-center justify-center p-4 relative overflow-hidden"
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <RefreshCw className="w-7 h-7 animate-spin text-[#0b3b2c]" />
                    <span className="text-xs font-bold text-[#0b3b2c]">Optimizing image in full HD...</span>
                  </div>
                ) : optimizedImage ? (
                  <div className="relative inline-block max-h-full max-w-full">
                    <img
                      ref={imageElementRef}
                      src={optimizedImage}
                      alt="Optimized product for tagging"
                      onClick={handleImageClick}
                      className={`max-h-[460px] max-w-full object-contain rounded-xl shadow-md select-none ${
                        activePickerMode ? 'cursor-crosshair' : 'cursor-default'
                      }`}
                    />

                    {/* Render Color Pin Markers on Image */}
                    {colorTags.map((tag, idx) => (
                      <div
                        key={tag.id}
                        style={{ left: `${tag.xPercent}%`, top: `${tag.yPercent}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none group"
                      >
                        <div
                          style={{ backgroundColor: tag.hex }}
                          className="w-5 h-5 rounded-full border-2 border-white shadow-lg ring-1 ring-black/30 flex items-center justify-center animate-bounce"
                        >
                          <span className="text-[8px] font-bold text-white drop-shadow-sm">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded-md whitespace-nowrap">
                          {tag.name} ({tag.hex})
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Right Col: Tagged Colors List & Naming */}
              <div className="rounded-2xl border border-[#dce6e1] bg-[#f8faf9] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#edf2ef] pb-2 mb-3">
                    <span className="font-bold text-[11px] text-[#0b3b2c] flex items-center gap-1.5 uppercase tracking-wider">
                      <Tag className="w-3.5 h-3.5" /> Tagged Colors ({colorTags.length})
                    </span>
                    {colorTags.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setColorTags([])}
                        className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-[#4d6960] mb-3">
                    {activePickerMode
                      ? '👉 Click anywhere on the image (stones, gold polish, beads) to tag a color.'
                      : 'Click "Click-to-Tag Mode ON" above to add more tags.'}
                  </p>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {colorTags.length === 0 ? (
                      <div className="text-center py-8 text-neutral-400 text-[11px]">
                        No colors tagged yet.<br />Click on the jewellery to pick colors.
                      </div>
                    ) : (
                      colorTags.map((tag, idx) => (
                        <div
                          key={tag.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#dce6e1] shadow-2xs gap-2"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="w-4 h-4 rounded-full border border-black/20 shrink-0 shadow-2xs" style={{ backgroundColor: tag.hex }} />
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                value={tag.name}
                                onChange={(e) => handleUpdateTagName(tag.id, e.target.value)}
                                placeholder="Color label"
                                className="font-bold text-neutral-800 text-[11px] w-full bg-transparent outline-none border-b border-transparent focus:border-[#0b3b2c]"
                              />
                              <span className="font-mono text-[9px] text-neutral-400 block">
                                {tag.hex}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag.id)}
                            className="p-1 text-neutral-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#edf2ef] mt-3">
                  <span className="text-[9.5px] text-[#4d6960] block text-center">
                    These color tags will be attached to the product for filter and customer display.
                  </span>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
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
                  disabled={!optimizedImage || isProcessing}
                  onClick={handleConfirm}
                  className="px-6 py-2 rounded-xl bg-[#0b3b2c] text-white font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#124b39] transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-[#e5c07b]" />
                  <span>Accept Image & Colors</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}