import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Check,
  X,
  RefreshCw,
  Eye,
  Camera,
  Layers
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
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [fileSizeInfo, setFileSizeInfo] = useState<{ original: string; optimized: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    'AQ.Ab8RN6LJmB0l6bjbOQGsHzXSyTQX4zV5N1HaCUOhRCcQVTvBIQ';

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const originalSizeStr = formatSize(file.size);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setOriginalImage(dataUrl);
      setGeneratedImage(null);
      setFileSizeInfo({ original: originalSizeStr, optimized: '' });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateGeminiStudio = async () => {
    if (!originalImage) return;

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const mimeMatch = originalImage.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Data = originalImage.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

      const promptText = `
Produce an authentic, commercial luxury jewelry product photograph for an Indian high-end boutique. 
Take the jewelry item visible in this reference image (preserve its exact design, authentic yellow gold polish, ruby/emerald gemstones, and pearls exactly as they are without distortion).
Stage it gracefully resting on an Italian white round marble tray with a brushed metallic gold rim.
Surround the tray with rich dark emerald-green velvet fabric drapery with soft natural folds.
Include soft, slightly blurred white baby's breath flowers (Gypsophila) in the background.
In the top corner, include a subtle, out-of-focus antique brass diya/bowl.
The lighting must be warm, cinematic golden boutique sunlight with natural contact shadows and crisp reflections on the marble tray.
Ultra-photorealistic commercial e-commerce studio shot.
      `.trim();

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ['image', 'text'],
            },
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API Error: Status ${response.status}`);
      }

      const resJson = await response.json();
      const parts = resJson?.candidates?.[0]?.content?.parts || [];

      let receivedImgBase64: string | null = null;
      for (const p of parts) {
        if (p.inline_data?.data) {
          receivedImgBase64 = `data:${p.inline_data.mime_type || 'image/png'};base64,${p.inline_data.data}`;
          break;
        }
      }

      if (!receivedImgBase64) {
        throw new Error('Gemini did not return an image. Please verify your prompt or API access.');
      }

      compressToWebp(receivedImgBase64);
    } catch (err: any) {
      console.error('Gemini generation failed:', err);
      setErrorMsg(err.message || 'Generation failed. Check your API key or network.');
    } finally {
      setIsGenerating(false);
    }
  };

  const compressToWebp = (imgSrc: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = 1200;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const webp = canvas.toDataURL('image/webp', 0.86);
      const approxBytes = Math.round((webp.length * 3) / 4);

      setFileSizeInfo((prev) => ({
        original: prev?.original || 'Unknown',
        optimized: formatSize(approxBytes),
      }));
      setGeneratedImage(webp);
    };
  };

  const handleConfirmAndUpload = () => {
    if (!generatedImage) return;
    onAcceptImage(generatedImage);
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
                <h2 className="text-base font-bold text-[#0b3b2c]">Gemini AI Photoshoot Studio</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Google AI Studio Connected</span>
                </span>
              </div>
              <p className="text-[10px] text-[#4d6960]">
                Commercial photoshoot staging with marble plate, emerald velvet, and botanical depth.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-neutral-100 cursor-pointer">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold text-xs">
            {errorMsg}
          </div>
        )}

        {/* Upload Trigger */}
        {!originalImage ? (
          <div className="min-h-[320px] flex flex-col items-center justify-center border-2 border-dashed border-[#c5d6ce] rounded-3xl bg-[#f8faf9] p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectFile}
              className="hidden"
              id="gemini-file-input"
            />
            <div className="w-16 h-16 rounded-3xl bg-white shadow-xs border border-[#dce6e1] flex items-center justify-center mb-3">
              <Upload className="w-7 h-7 text-[#0b3b2c]" />
            </div>
            <h3 className="font-bold text-sm text-[#0b3b2c]">Select Raw Product Photo</h3>
            <p className="text-[11px] text-[#4d6960] max-w-sm mt-1 mb-4">
              Select any clear click taken on your phone. Gemini AI will generate a commercial studio photoshoot with marble, velvet, and warm lighting.
            </p>
            <label
              htmlFor="gemini-file-input"
              className="px-6 py-2.5 rounded-2xl bg-[#0b3b2c] text-white font-bold text-xs shadow-xs hover:bg-[#124b39] transition-all cursor-pointer flex items-center gap-2"
            >
              <Camera className="w-4 h-4 text-[#e5c07b]" />
              <span>Choose Photo</span>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Side-by-Side Comparison */}
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

              {/* Right: Gemini Output */}
              <div className="rounded-2xl border border-[#0b3b2c]/30 bg-[#f8faf9] overflow-hidden flex flex-col relative">
                <div className="px-3.5 py-2 border-b border-[#edf2ef] bg-[#e4efe9] flex justify-between items-center">
                  <span className="font-bold text-[11px] text-[#0b3b2c] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#c6933a]" /> 2. Gemini AI Commercial Staging
                  </span>
                  {fileSizeInfo?.optimized && (
                    <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-md font-bold">
                      Lightweight WebP: {fileSizeInfo.optimized}
                    </span>
                  )}
                </div>

                <div className="h-64 sm:h-80 p-4 flex items-center justify-center relative bg-white">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-center p-4">
                      <RefreshCw className="w-7 h-7 animate-spin text-[#0b3b2c]" />
                      <span className="text-xs font-bold text-[#0b3b2c]">Gemini AI is staging your photoshoot...</span>
                      <span className="text-[10px] text-[#4d6960]">Generating marble tray, green velvet & studio lighting...</span>
                    </div>
                  ) : generatedImage ? (
                    <img
                      src={generatedImage}
                      alt="Gemini AI Staged Product"
                      className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <p className="text-[11px] text-neutral-400 mb-3">Click below to generate the commercial studio scene</p>
                      <button
                        type="button"
                        onClick={handleGenerateGeminiStudio}
                        className="px-5 py-2.5 rounded-2xl bg-[#0b3b2c] text-white font-bold text-xs shadow-xs hover:bg-[#124b39] transition-all cursor-pointer flex items-center gap-2 mx-auto"
                      >
                        <Sparkles className="w-4 h-4 text-[#e5c07b]" />
                        <span>Generate with Gemini AI</span>
                      </button>
                    </div>
                  )}
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
                  disabled={!generatedImage || isGenerating}
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