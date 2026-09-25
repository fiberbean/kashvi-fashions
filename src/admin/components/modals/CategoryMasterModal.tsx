import React, { useState, useEffect } from 'react';
import {
  Tag,
  X,
  Upload,
  Save,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  Edit2,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { optimizeAndUploadToR2 } from '../../utils/imageOptimizer';
import { Category } from '../../types';

interface CategoryMasterModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CategoryMasterModal({ onClose, onSuccess }: CategoryMasterModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [categoryCode, setCategoryCode] = useState<string>('');
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [editingMode, setEditingMode] = useState<boolean>(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{ original: string; optimized: string } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoadingList(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*');

      if (error) throw error;

      if (data) {
        const sorted = [...data].sort((a, b) => {
          const ordA = Number(a.display_order) || 0;
          const ordB = Number(b.display_order) || 0;
          if (ordA !== ordB) return ordA - ordB;
          return (a.id || '').localeCompare(b.id || '');
        });
        setCategories(sorted);
      }
    } catch (err: any) {
      console.error('Error loading categories:', err);
      setFetchError(err.message || 'Failed to fetch categories.');
    } finally {
      setLoadingList(false);
    }
  };

  const generateCategoryCode = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('id')
        .like('id', 'CAT%');

      if (data && data.length > 0) {
        let maxNum = 0;
        data.forEach((item) => {
          const match = item.id.match(/^CAT(\d+)$/i);
          if (match) {
            const val = parseInt(match[1], 10);
            if (val > maxNum) maxNum = val;
          }
        });
        setCategoryCode(`CAT${String(maxNum + 1).padStart(4, '0')}`);
      } else {
        setCategoryCode('CAT0001');
      }
    } catch {
      setCategoryCode('CAT0001');
    }
  };

  useEffect(() => {
    loadCategories();
    generateCategoryCode();
  }, []);

  const resetForm = () => {
    setEditingMode(false);
    setOriginalId(null);
    setName('');
    setImageUrl('');
    setImagePreview(null);
    setCompressionStats(null);
    setDisplayOrder(categories.length > 0 ? categories.length + 1 : 1);
    setIsActive(true);
    generateCategoryCode();
  };

  const handleSelectCard = (cat: Category) => {
    setEditingMode(true);
    setOriginalId(cat.id);
    setCategoryCode(cat.id);
    setName(cat.name);
    setImageUrl(cat.image_url || '');
    setImagePreview(cat.image_url || null);
    setCompressionStats(null);
    setDisplayOrder((cat as any).display_order ?? 0);
    setIsActive(cat.active ?? true);
  };

  /**
   * Category Image Select - Strictly < 50 KB WebP & Cloudflare R2 Upload
   */
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setErrorMsg(null);
    try {
      // Produces: CAT0001_01.webp
      const result = await optimizeAndUploadToR2(
        file,
        'categories',
        categoryCode.trim() || 'CAT0001',
        1
      );
      setImageUrl(result.url);
      setImagePreview(result.url);
      setCompressionStats({
        original: result.originalSize,
        optimized: result.compressedSize
      });
    } catch (err: any) {
      console.error('Category R2 upload failed:', err);
      setErrorMsg(err.message || 'Failed to process and upload category image to R2.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageUrl('');
    setCompressionStats(null);
  };

  const handleDeleteCategory = async (e: React.MouseEvent, id: string, catName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete category "${catName}" (${id})?`)) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;

      if (originalId === id) resetForm();
      loadCategories();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const targetId = categoryCode.trim();
    if (!targetId) {
      setErrorMsg('Category ID cannot be empty.');
      setSubmitting(false);
      return;
    }

    try {
      const finalImageUrl = imageUrl.trim();

      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      if (editingMode && originalId) {
        if (targetId !== originalId) {
          const { data: exists } = await supabase.from('categories').select('id').eq('id', targetId).maybeSingle();
          if (exists) {
            throw new Error(`Category ID "${targetId}" already exists. Pick another ID.`);
          }

          const { error: insertErr } = await supabase.from('categories').insert([{
            id: targetId,
            name: name.trim(),
            slug: slug,
            image_url: finalImageUrl || null,
            display_order: Number(displayOrder) || 0,
            active: isActive,
            created_at: new Date().toISOString()
          }]);
          if (insertErr) throw insertErr;

          await supabase.from('sub_categories').update({ category_id: targetId }).eq('category_id', originalId);
          await supabase.from('categories').delete().eq('id', originalId);
        } else {
          const { error: updateErr } = await supabase
            .from('categories')
            .update({
              name: name.trim(),
              slug: slug,
              image_url: finalImageUrl || null,
              display_order: Number(displayOrder) || 0,
              active: isActive
            })
            .eq('id', originalId);

          if (updateErr) throw updateErr;
        }
      } else {
        const { error: insertErr } = await supabase.from('categories').insert([{
          id: targetId,
          name: name.trim(),
          slug: slug,
          image_url: finalImageUrl || null,
          display_order: Number(displayOrder) || 0,
          active: isActive,
          created_at: new Date().toISOString()
        }]);

        if (insertErr) throw insertErr;
      }

      resetForm();
      loadCategories();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error saving category:', err);
      setErrorMsg(err.message || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-[#0a0e17]/85 backdrop-blur-xl select-none font-sans animate-in fade-in">
      <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 max-w-6xl w-full max-h-[92vh] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(109,74,255,0.2)] border border-white/10 flex flex-col text-xs relative">
        
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6d4aff] via-[#00d9ff] to-[#00ff9d] rounded-t-3xl" />

        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
              <Tag className="w-4 h-4 text-[#00d9ff]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Category Command Center</span>
                <span className="px-2 py-0.5 rounded-full bg-[#6d4aff]/20 text-[#00d9ff] border border-[#6d4aff]/40 text-[9px] font-mono uppercase">
                  Total: {categories.length}
                </span>
              </h2>
              <span className="text-[10px] text-[#8b9bb4]">
                Card view sorted by display order with strict &lt; 50 KB R2 Pipeline
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadCategories}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-[#00d9ff] transition-all cursor-pointer"
              title="Refresh List"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dual Pane Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 flex-1 overflow-y-auto pr-1">
          
          {/* LEFT PANE: CARDS (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Catalog Cards ({categories.length})
              </span>
              <button
                type="button"
                onClick={resetForm}
                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-[#00ff9d] flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Reset
              </button>
            </div>

            {fetchError && (
              <div className="p-3 bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 rounded-2xl text-[#ff6b6b] text-[10px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>DB Error: {fetchError}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto max-h-[58vh] pr-1.5 custom-scrollbar">
              {loadingList ? (
                <div className="flex items-center justify-center p-12 text-[#8b9bb4]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00d9ff] mr-2" /> Loading categories...
                </div>
              ) : categories.length === 0 ? (
                <div className="p-8 text-center text-[#8b9bb4] border border-dashed border-white/10 rounded-2xl">
                  No categories found in database.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((cat) => {
                    const isSelected = editingMode && originalId === cat.id;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => handleSelectCard(cat)}
                        className={`group rounded-2xl border transition-all cursor-pointer overflow-hidden flex flex-col relative ${
                          isSelected
                            ? 'bg-[#6d4aff]/25 border-[#6d4aff] shadow-lg shadow-[#6d4aff]/30 scale-[1.02]'
                            : 'bg-[#0a0e17]/80 border-white/10 hover:border-[#00d9ff]/50 hover:bg-[#151c33]/70'
                        }`}
                      >
                        <div className="absolute top-2 left-2 z-10 bg-black/75 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold text-[#00ff9d] border border-white/10 backdrop-blur-md">
                          #{cat.display_order ?? 0}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteCategory(e, cat.id, cat.name)}
                          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/70 hover:bg-[#ff6b6b] text-[#8b9bb4] hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100 backdrop-blur-md"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>

                        <div className="w-full h-24 sm:h-28 bg-[#151c33] relative overflow-hidden flex items-center justify-center">
                          {cat.image_url ? (
                            <img
                              src={cat.image_url}
                              alt={cat.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-[#8b9bb4]/30" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-transparent to-transparent opacity-80" />
                        </div>

                        <div className="p-2.5 flex flex-col items-center text-center space-y-1 bg-[#101628]/60 flex-1 justify-between">
                          <h3 className="font-bold text-white text-[12px] truncate w-full" title={cat.name}>
                            {cat.name}
                          </h3>

                          <div className="font-mono text-[9.5px] font-extrabold px-2 py-0.5 rounded-md bg-[#00d9ff]/10 text-[#00d9ff] border border-[#00d9ff]/30 tracking-wider">
                            {cat.id}
                          </div>

                          <div className="text-[9px] font-mono pt-1 text-[#8b9bb4]">
                            <span className={cat.active ? 'text-[#00ff9d]' : 'text-[#ff6b6b]'}>
                              ● {cat.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANE: FORM (5 COLS) */}
          <div className="lg:col-span-5 bg-[#0a0e17]/60 p-4 rounded-3xl border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-mono font-bold text-[#00d9ff] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                {editingMode ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {editingMode ? `Edit Node (${originalId})` : 'Create New Category'}
              </span>
              {editingMode && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[9.5px] font-mono text-[#8b9bb4] hover:text-white underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl border bg-[#ff6b6b]/10 border-[#ff6b6b]/30 text-[#ff6b6b] font-bold text-[10px]">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>Category ID (Custom Editable) *</span>
                  <span className="text-[8.5px] text-[#00ff9d]">YOU CAN EDIT THIS</span>
                </label>
                <input
                  type="text"
                  required
                  value={categoryCode}
                  onChange={(e) => setCategoryCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CAT0001"
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#101628] font-mono font-bold text-[#00ff9d] text-[11px] outline-none focus:border-[#00d9ff] transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarees / Bras / Panties"
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#101628] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors placeholder:text-slate-600"
                />
              </div>

              {/* Strict < 50 KB WebP Category Photo */}
              <div className="p-3 bg-[#101628] rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Category Photo (R2 &lt; 50KB)
                  </span>
                  {compressionStats && (
                    <span className="text-[8.5px] font-mono text-[#00ff9d] bg-[#00ff9d]/10 border border-[#00ff9d]/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                      <Sparkles className="w-2 h-2" /> WebP: {compressionStats.optimized}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl border border-white/15 bg-[#151c33] flex items-center justify-center overflow-hidden shrink-0 relative group">
                    {isCompressing ? (
                      <Loader2 className="w-5 h-5 text-[#00d9ff] animate-spin" />
                    ) : imagePreview || imageUrl ? (
                      <>
                        <img src={imagePreview || imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[#ff6b6b] transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-5 h-5 text-[#8b9bb4]/40" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-[10px] font-bold cursor-pointer transition-all">
                      <Upload className="w-3 h-3 text-[#00ff9d]" />
                      <span>{isCompressing ? 'Optimizing (<50KB)...' : 'Upload & Auto-Compress'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageSelect} 
                        disabled={isCompressing} 
                        className="hidden" 
                      />
                    </label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        if (e.target.value) setImagePreview(e.target.value);
                      }}
                      placeholder="Or enter Image URL"
                      className="w-full px-2.5 py-1 rounded-lg border border-white/10 bg-[#0a0e17] text-[10px] font-mono text-white outline-none focus:border-[#00d9ff] placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                    Order Index
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#101628] font-mono font-bold text-[#00ff9d] outline-none focus:border-[#00d9ff]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-full py-2 px-3 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#00ff9d]/15 border-[#00ff9d]/40 text-[#00ff9d]'
                        : 'bg-[#ff6b6b]/15 border-[#ff6b6b]/40 text-[#ff6b6b]'
                    }`}
                  >
                    {isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{isActive ? 'Active' : 'Disabled'}</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || isCompressing}
                className="w-full py-2.5 mt-2 rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#6d4aff]/30 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#00d9ff]" />
                ) : (
                  <Save className="w-4 h-4 text-[#00ff9d]" />
                )}
                <span>{editingMode ? 'Update Category' : 'Save Category'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}