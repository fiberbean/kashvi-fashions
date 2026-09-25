import React, { useState, useRef } from 'react';
import {
  Upload,
  Check,
  X,
  RefreshCw,
  Camera,
  HardDrive,
  Pipette,
  Tag,
  Trash2,
  Sparkles
} from 'lucide-react';
import { optimizeAndUploadToR2 } from '../../utils/imageOptimizer';

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
  const [optimizedImageUrl, setOptimizedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [fileSizeInfo, setFileSizeInfo] = useState<{ original: string; optimized: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Color Tagging State
  const [colorTags, setColorTags] = useState<TaggedColor[]>([]);
  const [activePickerMode, setActivePickerMode] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  /**
   * Handle Photo Select:
   * Strict < 100 KB WebP auto-compression and direct Cloudflare R2 Upload
   */
  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setColorTags([]);

    try {
      // Products strict limit (< 100 KB) tho R2 ki direct upload
      const result = await optimizeAndUploadToR2(file, 'products');

      setOptimizedImageUrl(result.url);
      setFileSizeInfo({
        original: result.originalSize,
        optimized: result.compressedSize
      });
    } catch (err: any) {
      console.error('R2 Optimization failed:', err);
      setErrorMessage(err.message || 'Image upload & optimization failed.');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // Interactive Click to Tag Color on Image
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!activePickerMode || !optimizedImageUrl || !imageElementRef.current) return;

    const rect = imageElementRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

    // Sample pixel using canvas
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
    if (!optimizedImageUrl) return;
    onAcceptImage(optimizedImageUrl, colorTags);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-[#0a0e17]/85 backdrop-blur-xl select-none font-sans animate-in fade-in">
      <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 max-w-5xl w-full max-h-[94vh] overflow-y-auto shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_30px_rgba(109,74,255,0.2)] border border-white/10 flex flex-col gap-4 text-xs relative">
        
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6d4aff] via-[#00d9ff] to-[#ff6b6b] rounded-t-3xl" />

        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3 sticky top-0 bg-[#101628]/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
              <HardDrive className="w-4 h-4 text-[#00d9ff]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2 tracking-tight">
                <span>HD Product Image Optimizer</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#00ff9d]/15 text-[#00ff9d] border border-[#00ff9d]/30 text-[9px] font-mono tracking-wider uppercase font-bold">
                  &lt; 100 KB Strict R2
                </span>
              </h2>
              <p className="text-[10px] text-[#8b9bb4]">
                Strict WebP compression to Cloudflare R2 with point-and-click color spectrum detection.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#ff6b6b]/15 border border-[#ff6b6b]/30 text-[#ff6b6b] rounded-2xl font-bold">
            {errorMessage}
          </div>
        )}

        {/* 1. Upload Box State */}
        {!optimizedImageUrl && !isProcessing ? (
          <div className="min-h-[320px] flex flex-col items-center justify-center border-2 border-dashed border-[#6d4aff]/30 rounded-3xl bg-[#0a0e17]/50 p-8 text-center relative group">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectFile}
              className="hidden"
              id="raw-optimize-upload"
            />
            <div className="w-16 h-16 rounded-3xl bg-[#151c33] shadow-xl border border-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-7 h-7 text-[#6d4aff]" />
            </div>
            <h3 className="font-extrabold text-sm text-white tracking-tight">
              Upload Product Photo
            </h3>
            <p className="text-[11px] text-[#8b9bb4] max-w-sm mt-1 mb-5 leading-relaxed">
              Select product image. It will strictly compress to lightweight WebP (&lt;100KB) and save in Cloudflare R2.
            </p>
            <label
              htmlFor="raw-optimize-upload"
              className="px-7 py-3 rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white font-bold text-xs shadow-lg shadow-[#6d4aff]/35 transition-all cursor-pointer flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Camera className="w-4 h-4 text-[#00d9ff]" />
              <span>Choose Photo to Optimize (&lt;100KB)</span>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0a0e17]/60 rounded-2xl border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-[11px] text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Pipette className="w-4 h-4 text-[#00d9ff]" /> Interactive Color Tagging
                </span>
                <button
                  type="button"
                  onClick={() => setActivePickerMode(!activePickerMode)}
                  className={`px-3 py-1 rounded-xl text-[10.5px] font-bold border transition-all cursor-pointer ${
                    activePickerMode
                      ? 'bg-[#6d4aff] text-white border-[#6d4aff] shadow-md shadow-[#6d4aff]/30'
                      : 'bg-[#151c33] text-[#8b9bb4] border-white/10'
                  }`}
                >
                  {activePickerMode ? '✓ Point-and-Click ON' : 'Paused (Click to enable)'}
                </button>
              </div>

              {fileSizeInfo && (
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[10px] text-[#8b9bb4] line-through">
                    Raw: {fileSizeInfo.original}
                  </span>
                  <span className="text-[10.5px] text-[#00ff9d] bg-[#00ff9d]/10 border border-[#00ff9d]/30 px-2.5 py-0.5 rounded-lg font-bold shadow-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#00d9ff]" /> R2 WebP: {fileSizeInfo.optimized}
                  </span>
                </div>
              )}
            </div>

            {/* Main Interactive Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              <div
                ref={imageContainerRef}
                className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#0a0e17]/50 min-h-[380px] max-h-[520px] flex items-center justify-center p-4 relative overflow-hidden backdrop-blur-md"
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <RefreshCw className="w-7 h-7 animate-spin text-[#00d9ff]" />
                    <span className="text-xs font-bold text-white">Compressing &lt; 100KB & uploading to R2...</span>
                  </div>
                ) : optimizedImageUrl ? (
                  <div className="relative inline-block max-h-full max-w-full">
                    <img
                      ref={imageElementRef}
                      crossOrigin="anonymous"
                      src={optimizedImageUrl}
                      alt="Optimized product for tagging"
                      onClick={handleImageClick}
                      className={`max-h-[460px] max-w-full object-contain rounded-2xl shadow-2xl select-none ${
                        activePickerMode ? 'cursor-crosshair' : 'cursor-default'
                      }`}
                    />

                    {/* Color Pin Markers */}
                    {colorTags.map((tag, idx) => (
                      <div
                        key={tag.id}
                        style={{ left: `${tag.xPercent}%`, top: `${tag.yPercent}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none group"
                      >
                        <div
                          style={{ backgroundColor: tag.hex }}
                          className="w-5 h-5 rounded-full border-2 border-white shadow-lg ring-2 ring-[#6d4aff]/60 flex items-center justify-center animate-bounce"
                        >
                          <span className="text-[8px] font-extrabold text-white drop-shadow-sm">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#0a0e17]/95 text-white text-[9px] px-2 py-0.5 rounded-md whitespace-nowrap border border-white/20 shadow-md">
                          {tag.name} ({tag.hex})
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Tagged Colors List */}
              <div className="rounded-2xl border border-white/10 bg-[#101628]/70 p-4 flex flex-col justify-between backdrop-blur-md">
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
                    <span className="font-extrabold text-[11px] text-white flex items-center gap-1.5 uppercase tracking-wider">
                      <Tag className="w-3.5 h-3.5 text-[#6d4aff]" /> Tagged Colors ({colorTags.length})
                    </span>
                    {colorTags.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setColorTags([])}
                        className="text-[10px] text-[#ff6b6b] font-bold hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-[#8b9bb4] mb-3">
                    {activePickerMode
                      ? '👉 Click anywhere on the image to tag a real shade.'
                      : 'Click "Point-and-Click ON" above to add tags.'}
                  </p>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {colorTags.length === 0 ? (
                      <div className="text-center py-8 text-[#8b9bb4]/70 text-[11px]">
                        No colors tagged yet.<br />Click on the product image to pick colors.
                      </div>
                    ) : (
                      colorTags.map((tag) => (
                        <div
                          key={tag.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#151c33] border border-white/10 shadow-xs gap-2"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="w-4 h-4 rounded-full border border-black/30 shrink-0 shadow-xs ring-1 ring-white" style={{ backgroundColor: tag.hex }} />
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                value={tag.name}
                                onChange={(e) => handleUpdateTagName(tag.id, e.target.value)}
                                placeholder="Color label"
                                className="font-bold text-white text-[11px] w-full bg-transparent outline-none border-b border-transparent focus:border-[#6d4aff]"
                              />
                              <span className="font-mono text-[9px] text-[#8b9bb4] block">
                                {tag.hex}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag.id)}
                            className="p-1 text-[#8b9bb4] hover:text-[#ff6b6b] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 mt-3">
                  <span className="text-[9.5px] text-[#8b9bb4] block text-center">
                    Direct Cloudflare R2 WebP link saves with color tags.
                  </span>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-[#6d4aff] hover:text-[#00d9ff] underline cursor-pointer"
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
                  className="px-4 py-2 rounded-xl text-[#8b9bb4] hover:text-white hover:bg-white/5 font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!optimizedImageUrl || isProcessing}
                  onClick={handleConfirm}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white font-bold flex items-center gap-1.5 shadow-lg shadow-[#6d4aff]/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-[#00ff9d]" />
                  <span>Accept R2 Image & Colors</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}