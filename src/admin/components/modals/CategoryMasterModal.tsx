import React, { useState, useEffect } from 'react';
import {
  Tag,
  X,
  Upload,
  Save,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { compressImageToWebP } from '../../utils/imageOptimizer';

interface CategoryMasterModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CategoryMasterModal({ onClose, onSuccess }: CategoryMasterModalProps) {
  const [categoryCode, setCategoryCode] = useState<string>('');
  const [codeLoading, setCodeLoading] = useState<boolean>(true);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // Image Compression & File State
  const [optimizedBlob, setOptimizedBlob] = useState<Blob | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{ original: string; optimized: string } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-generate Next Category Code in CAT0001 series
  useEffect(() => {
    const generateCategoryCode = async () => {
      setCodeLoading(true);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id')
          .like('id', 'CAT%')
          .order('id', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const match = data[0].id.match(/\d+$/);
          const nextNum = match ? parseInt(match[0], 10) + 1 : 1;
          setCategoryCode(`CAT${String(nextNum).padStart(4, '0')}`);
        } else {
          setCategoryCode('CAT0001');
        }
      } catch (err) {
        console.error('Error generating category code:', err);
        setCategoryCode('CAT0001');
      } finally {
        setCodeLoading(false);
      }
    };

    generateCategoryCode();
  }, []);

  // Auto WebP Compression on file selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setErrorMsg(null);
    try {
      const result = await compressImageToWebP(file, 1400, 0.88);
      setOptimizedBlob(result.blob);
      setImagePreview(result.dataUrl);
      setCompressionStats({
        original: result.originalSizeFormatted,
        optimized: result.sizeFormatted
      });
    } catch (err: any) {
      console.error('Image compression failed:', err);
      setErrorMsg('Failed to process image format.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveImage = () => {
    setOptimizedBlob(null);
    setImagePreview(null);
    setImageUrl('');
    setCompressionStats(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      let finalImageUrl = imageUrl.trim();

      // Upload the compressed WebP file to Supabase Storage
      if (optimizedBlob) {
        const fileName = `${categoryCode.toLowerCase()}_${Date.now()}.webp`;
        const filePath = `categories/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('store_assets')
          .upload(filePath, optimizedBlob, {
            contentType: 'image/webp',
            upsert: true
          });

        if (!uploadError) {
          const { data } = supabase.storage.from('store_assets').getPublicUrl(filePath);
          finalImageUrl = data.publicUrl;
        } else {
          finalImageUrl = imagePreview || '';
        }
      }

      // Generate Clean URL Slug
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const newCategory = {
        id: categoryCode,
        name: name.trim(),
        slug: slug,
        image_url: finalImageUrl || null,
        display_order: Number(displayOrder) || 0,
        active: true,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('categories').insert([newCategory]);
      if (error) throw error;

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving category:', err);
      setErrorMsg(err.message || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 bg-[#0a0e17]/85 backdrop-blur-xl select-none font-sans animate-in fade-in">
      <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(109,74,255,0.2)] border border-white/10 space-y-4 text-xs relative">
        
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6d4aff] via-[#00d9ff] to-[#00ff9d] rounded-t-3xl" />

        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3 sticky top-0 bg-[#101628]/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
              <Tag className="w-4 h-4 text-[#00d9ff]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Category Creator</span>
                <span className="px-2 py-0.5 rounded-full bg-[#6d4aff]/20 text-[#00d9ff] border border-[#6d4aff]/40 text-[9px] font-mono uppercase">
                  Catalog
                </span>
              </h2>
              <span className="text-[10px] text-[#8b9bb4]">
                Create main product category with auto-WebP compression
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Auto-Generated Code Badge */}
            <div className="bg-[#0a0e17]/80 px-3 py-1 rounded-xl border border-white/10 text-right shadow-inner">
              <span className="text-[7.5px] font-mono font-bold uppercase tracking-wider text-[#8b9bb4] block">CODE</span>
              <span className="font-mono text-[11px] font-extrabold text-[#00ff9d]">
                {codeLoading ? <Loader2 className="w-3 h-3 animate-spin text-[#00d9ff]" /> : categoryCode}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl border bg-[#ff6b6b]/10 border-[#ff6b6b]/30 text-[#ff6b6b] font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Category Code (Read Only Display) */}
          <div>
            <label className="text-[10.5px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1.5">
              Category Code (Auto-Generated)
            </label>
            <input
              type="text"
              readOnly
              value={codeLoading ? 'Loading code...' : categoryCode}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-white/10 bg-[#0a0e17]/50 font-mono font-bold text-[#00ff9d] outline-none cursor-not-allowed"
            />
          </div>

          {/* Category Name */}
          <div>
            <label className="text-[10.5px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1.5">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarees / Kurtis / Lingerie / Western Wear"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-white/10 bg-[#0a0e17]/80 font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors placeholder:text-slate-600"
            />
          </div>

          {/* Category Image Upload with Auto-WebP Compression */}
          <div className="p-3.5 bg-[#0a0e17]/60 rounded-2xl border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-mono font-bold text-[#00d9ff] flex items-center gap-1.5 uppercase tracking-wider">
                <ImageIcon className="w-3.5 h-3.5" /> Category Banner / Thumbnail
              </span>
              {compressionStats && (
                <span className="text-[9px] font-mono text-[#00ff9d] bg-[#00ff9d]/10 border border-[#00ff9d]/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> WebP: {compressionStats.optimized}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3.5">
              {/* Preview Box */}
              <div className="w-20 h-20 rounded-2xl border border-white/15 bg-[#151c33] flex items-center justify-center overflow-hidden shrink-0 relative group shadow-inner">
                {isCompressing ? (
                  <Loader2 className="w-6 h-6 text-[#00d9ff] animate-spin" />
                ) : imagePreview || imageUrl ? (
                  <>
                    <img
                      src={imagePreview || imageUrl}
                      alt="Category Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[#ff6b6b] transition-opacity cursor-pointer"
                      title="Remove Image"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="w-6 h-6 text-[#8b9bb4]/40" />
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-1.5">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-[11px] font-bold cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5 text-[#00ff9d]" />
                  <span>Choose Photo (Auto-WebP)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>

                <div className="text-[9px] text-[#8b9bb4] font-mono">OR DIRECT URL:</div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    if (e.target.value) setImagePreview(e.target.value);
                  }}
                  placeholder="https://..."
                  className="w-full px-2.5 py-1.5 rounded-xl border border-white/10 bg-[#101628] text-[10.5px] font-mono text-white outline-none focus:border-[#00d9ff] placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Display Order Sequence */}
          <div>
            <label className="text-[10.5px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1.5">
              Display Sequence Order
            </label>
            <input
              type="number"
              min="0"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-2xl border border-white/10 bg-[#0a0e17] font-mono font-bold text-[#00ff9d] outline-none focus:border-[#00d9ff]"
            />
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl font-bold text-[#8b9bb4] hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isCompressing || codeLoading}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white font-bold flex items-center gap-2 shadow-lg shadow-[#6d4aff]/30 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00d9ff]" />
              ) : (
                <Save className="w-3.5 h-3.5 text-[#00ff9d]" />
              )}
              <span>Save Category Master</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}