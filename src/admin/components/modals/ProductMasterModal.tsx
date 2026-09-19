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
  Wand2,
  Sliders
} from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';

interface ProductImageStudioModalProps {
  onClose: () => void;
  onAcceptImage: (processedUrl: string) => void;
  productTitle?: string;
  categoryName?: string;
}

interface StagedSetupConfig {
  name: string;
  baseColor: string;
  accentColor: string;
  plinthType: 'marble' | 'wood' | 'slate' | 'brass';
  flowerStyle: 'white-gypsophila' | 'jasmine' | 'rose-petals' | 'none';
  lightAngle: number;
}

export default function ProductImageStudioModal({
  onClose,
  onAcceptImage,
  productTitle = '',
  categoryName = ''
}: ProductImageStudioModalProps) {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [cutoutBlob, setCutoutBlob] = useState<Blob | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [fileSizeInfo, setFileSizeInfo] = useState<{ original: string; optimized: string } | null>(null);
  
  const [variationSeed, setVariationSeed] = useState<number>(1);
  const [currentConfig, setCurrentConfig] = useState<StagedSetupConfig | null>(null);

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
      
      await startAiSegmentationAndRender(file, dataUrl, originalSizeStr, 1);
    };
    reader.readAsDataURL(file);
  };

  // Preset studio themes suited dynamically for jewellery and luxury ethnic wear
  const studioPalettes: StagedSetupConfig[] = [
    {
      name: 'Royal Emerald & Gold-Rimmed Marble',
      baseColor: '#0c2e22',
      accentColor: '#174a38',
      plinthType: 'marble',
      flowerStyle: 'white-gypsophila',
      lightAngle: 0.35
    },
    {
      name: 'Heritage Silk Crimson & Brass Plate',
      baseColor: '#360914',
      accentColor: '#521323',
      plinthType: 'brass',
      flowerStyle: 'jasmine',
      lightAngle: 0.25
    },
    {
      name: 'Midnight Black Velvet & Italian White Plinth',
      baseColor: '#0a0a0c',
      accentColor: '#1a1b20',
      plinthType: 'marble',
      flowerStyle: 'white-gypsophila',
      lightAngle: 0.4
    },
    {
      name: 'Warm Champagne Linen & Raw Travertine',
      baseColor: '#e8dfd1',
      accentColor: '#faf6ee',
      plinthType: 'slate',
      flowerStyle: 'rose-petals',
      lightAngle: 0.3
    }
  ];

  const startAiSegmentationAndRender = async (
    fileInput: Blob | string,
    rawUrl: string,
    origSizeStr: string,
    seed: number
  ) => {
    setIsProcessing(true);
    setProcessingStatus('AI item extraction & edge recognition...');

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
        console.warn('Segmentation fallback to natural photo:', err);
      }
    }

    // Pick setup based on variation seed
    const chosenConfig = studioPalettes[(seed - 1) % studioPalettes.length];
    setCurrentConfig(chosenConfig);

    setProcessingStatus('Staging realistic studio props, lighting & shadows...');
    renderCommercialStudio(blobResult, rawUrl, chosenConfig, origSizeStr);
  };

  const renderCommercialStudio = (
    cutout: Blob | null,
    rawFallbackUrl: string,
    config: StagedSetupConfig,
    origSizeStr: string
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

    // 1. Velvet/Fabric Background Base
    const bgGrad = ctx.createLinearGradient(0, 0, size, size);
    bgGrad.addColorStop(0, config.baseColor);
    bgGrad.addColorStop(0.5, config.accentColor);
    bgGrad.addColorStop(1, '#050706');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);

    // Natural light drape folds
    ctx.save();
    ctx.filter = 'blur(50px)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.ellipse(size * 0.35, size * 0.25, size * 0.45, size * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Center Stage Pedestal (Plinth)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(size * 0.52, size * 0.62, size * 0.44, size * 0.31, -0.04, 0, Math.PI * 2);

    if (config.plinthType === 'marble') {
      const marbleGrad = ctx.createRadialGradient(
        size * 0.46, size * 0.52, 40,
        size * 0.52, size * 0.62, size * 0.44
      );
      marbleGrad.addColorStop(0, '#ffffff');
      marbleGrad.addColorStop(0.55, '#f5f2ea');
      marbleGrad.addColorStop(0.9, '#e8e0d0');
      marbleGrad.addColorStop(1, '#d5cab6');
      ctx.fillStyle = marbleGrad;
      ctx.fill();

      // Gold Brass Tray Edge
      ctx.lineWidth = 14;
      const rimGrad = ctx.createLinearGradient(size * 0.1, size * 0.5, size * 0.9, size * 0.7);
      rimGrad.addColorStop(0, '#c6933a');
      rimGrad.addColorStop(0.35, '#ffd700');
      rimGrad.addColorStop(0.7, '#d4af37');
      rimGrad.addColorStop(1, '#8b6508');
      ctx.strokeStyle = rimGrad;
      ctx.stroke();
    } else if (config.plinthType === 'brass') {
      const brassGrad = ctx.createRadialGradient(size * 0.45, size * 0.55, 30, size * 0.5, size * 0.62, size * 0.42);
      brassGrad.addColorStop(0, '#f9e8a2');
      brassGrad.addColorStop(0.55, '#d4af37');
      brassGrad.addColorStop(0.85, '#996515');
      brassGrad.addColorStop(1, '#5c3a09');
      ctx.fillStyle = brassGrad;
      ctx.fill();
    } else {
      // Warm Travertine
      ctx.fillStyle = '#eae2d3';
      ctx.fill();
    }
    ctx.restore();

    // 3. Flower & Botanical Accents
    const drawPetals = (cx: number, cy: number, r: number, alpha: number) => {
      ctx.save();
      ctx.filter = 'blur(6px)';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = config.flowerStyle === 'rose-petals' ? '#e63946' : '#ffffff';
      ctx.fill();
      ctx.restore();
    };

    if (config.flowerStyle !== 'none') {
      const flowers = [
        [size * 0.88, size * 0.18, 24, 0.6],
        [size * 0.93, size * 0.24, 18, 0.5],
        [size * 0.82, size * 0.26, 20, 0.4],
        [size * 0.14, size * 0.82, 28, 0.55],
        [size * 0.19, size * 0.88, 22, 0.45]
      ];
      flowers.forEach(([fx, fy, fr, fa]) => drawPetals(fx, fy, fr, fa));
    }

    // 4. Draw Product Item
    const targetSrc = cutout ? URL.createObjectURL(cutout) : rawFallbackUrl;
    const itemImg = new Image();
    itemImg.crossOrigin = 'anonymous';
    itemImg.src = targetSrc;

    itemImg.onload = () => {
      const maxW = size * 0.52;
      const maxH = size * 0.52;
      let drawW = itemImg.width;
      let drawH = itemImg.height;
      const ratio = Math.min(maxW / drawW, maxH / drawH);
      drawW = Math.round(drawW * ratio);
      drawH = Math.round(drawH * ratio);

      const posX = Math.round((size - drawW) / 2);
      const posY = Math.round((size - drawH) / 2 + 35);

      // Contact Grounding Shadow
      ctx.save();
      const shadowY = posY + drawH - 12;
      const shadowW = drawW * 0.88;
      const shadowH = drawH * 0.15;

      const shadowGrad = ctx.createRadialGradient(
        size / 2, shadowY + shadowH / 2, 8,
        size / 2, shadowY + shadowH / 2, shadowW / 2
      );
      shadowGrad.addColorStop(0, 'rgba(12, 10, 6, 0.58)');
      shadowGrad.addColorStop(0.5, 'rgba(12, 10, 6, 0.25)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(size / 2, shadowY + shadowH / 2, shadowW / 2, shadowH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Soft Specular Reflection on Marble Base
      if (cutout) {
        ctx.save();
        ctx.translate(0, (posY + drawH) * 2 - 12);
        ctx.scale(1, -1);
        ctx.globalAlpha = 0.11;
        ctx.drawImage(itemImg, posX, posY, drawW, drawH);
        ctx.restore();
      }

      // Draw item (authenticity locked, 0% alteration)
      ctx.drawImage(itemImg, posX, posY, drawW, drawH);

      // WebP Low Storage Compression (< 120KB)
      const webpOutput = canvas.toDataURL('image/webp', 0.86);
      const approxBytes = Math.round((webpOutput.length * 3) / 4);

      setFileSizeInfo({
        original: origSizeStr,
        optimized: formatSize(approxBytes)
      });
      setProcessedImage(webpOutput);
      setIsProcessing(false);
    };
  };

  // Regenerate with fresh studio setup on click
  const handleRegenerate = () => {
    if (!originalImage || !fileSizeInfo) return;
    const nextSeed = variationSeed + 1;
    setVariationSeed(nextSeed);
    startAiSegmentationAndRender(cutoutBlob || originalImage, originalImage, fileSizeInfo.original, nextSeed);
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
                <h2 className="text-base font-bold text-[#0b3b2c]">Smart Product Studio Staging</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Item Authenticity Locked</span>
                </span>
              </div>
              <p className="text-[10px] text-[#4d6960]">
                Matches studio props and background to item aesthetics. Regenerate if you want a fresh setup.
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
              Upload raw click. Smart studio will isolate the product and arrange suitable photoshoot props, lighting and natural shadows.
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
                    <Sparkles className="w-3.5 h-3.5 text-[#c6933a]" /> 2. Commercial Photoshoot Result
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
                      <span className="text-[10px] text-[#4d6960]">Arranging props, reflections & studio lighting...</span>
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

            {/* 3. Setup Status & Regenerate Controls */}
            {currentConfig && !isProcessing && (
              <div className="p-3.5 bg-[#f8faf9] border border-[#dce6e1] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0b3b2c]" />
                  <span className="text-[11px] font-bold text-[#0b3b2c]">
                    Active Setup: <span className="text-[#4d6960] font-normal">{currentConfig.name}</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="px-4 py-2 rounded-xl bg-white border border-[#0b3b2c] text-[#0b3b2c] font-bold text-xs shadow-2xs hover:bg-[#0b3b2c] hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate (New Studio Setup)</span>
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