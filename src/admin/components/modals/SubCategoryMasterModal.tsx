import React, { useState, useEffect } from 'react';
import {
  Layers,
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
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Plus,
  Filter,
  Lock
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { optimizeAndUploadToR2 } from '../../utils/imageOptimizer';
import { Category, SubCategoryRecord } from '../../types';

interface SubCategoryMasterModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SubCategoryMasterModal({ onClose, onSuccess }: SubCategoryMasterModalProps) {
  // Master lists
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryRecord[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter existing cards by category
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Form State
  const [subCategoryCode, setSubCategoryCode] = useState<string>('');
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [editingMode, setEditingMode] = useState<boolean>(false);

  // Cloudflare R2 Image Upload State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{ original: string; optimized: string } | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch Categories and Sub-Categories
  const loadData = async () => {
    setLoadingList(true);
    setFetchError(null);
    try {
      const [catRes, subRes] = await Promise.all([
        supabase.from('categories').select('*').order('display_order', { ascending: true }),
        supabase.from('sub_categories').select('*')
      ]);

      if (catRes.error) throw catRes.error;
      if (subRes.error) throw subRes.error;

      const loadedCats = catRes.data || [];
      setCategories(loadedCats);
      if (loadedCats.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(loadedCats[0].id);
      }

      if (subRes.data) {
        const sorted = [...subRes.data].sort((a, b) => {
          const ordA = Number(a.display_order) || 0;
          const ordB = Number(b.display_order) || 0;
          if (ordA !== ordB) return ordA - ordB;
          return (a.id || '').localeCompare(b.id || '');
        });
        setSubCategories(sorted);
      }
    } catch (err: any) {
      console.error('Error loading sub-category masters:', err);
      setFetchError(err.message || 'Failed to fetch records.');
    } finally {
      setLoadingList(false);
    }
  };

  // 2. Generate Next Code in SUBCAT0001 series
  const generateSubCategoryCode = async () => {
    try {
      const { data } = await supabase
        .from('sub_categories')
        .select('id')
        .like('id', 'SUBCAT%');

      if (data && data.length > 0) {
        let maxNum = 0;
        data.forEach((item) => {
          const match = item.id.match(/^SUBCAT(\d+)$/i);
          if (match) {
            const val = parseInt(match[1], 10);
            if (val > maxNum) maxNum = val;
          }
        });
        setSubCategoryCode(`SUBCAT${String(maxNum + 1).padStart(4, '0')}`);
      } else {
        setSubCategoryCode('SUBCAT0001');
      }
    } catch {
      setSubCategoryCode('SUBCAT0001');
    }
  };

  useEffect(() => {
    loadData();
    generateSubCategoryCode();
  }, []);

  // Reset form to Create Mode
  const resetForm = () => {
    setEditingMode(false);
    setOriginalId(null);
    setName('');
    setImageUrl('');
    setImagePreview(null);
    setCompressionStats(null);
    setDisplayOrder(subCategories.length > 0 ? subCategories.length + 1 : 1);
    setIsActive(true);
    if (categories.length > 0) setSelectedCategoryId(categories[0].id);
    generateSubCategoryCode();
  };

  // Populate form for Editing
  const handleSelectCard = (sub: SubCategoryRecord) => {
    setEditingMode(true);
    setOriginalId(sub.id);
    setSubCategoryCode(sub.id);
    setSelectedCategoryId(sub.category_id || '');
    setName(sub.name);
    setImageUrl(sub.image_url || '');
    setImagePreview(sub.image_url || null);
    setCompressionStats(null);
    setDisplayOrder(Number(sub.display_order) || 0);
    setIsActive(sub.active ?? true);
  };

  /**
   * Sub-Category Image Select - Strictly < 50 KB WebP & Cloudflare R2 Pipeline
   */
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setErrorMsg(null);
    try {
      // Produces: SUBCAT0001_01.webp
      const result = await optimizeAndUploadToR2(
        file,
        'subcategories',
        subCategoryCode.trim() || 'SUBCAT0001',
        1
      );
      setImageUrl(result.url);
      setImagePreview(result.url);
      setCompressionStats({
        original: result.originalSize,
        optimized: result.compressedSize
      });
    } catch (err: any) {
      console.error('Sub-Category R2 upload failed:', err);
      setErrorMsg(err.message || 'Failed to process and upload sub-category image to R2.');
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

  // Delete Sub-Category
  const handleDeleteSubCategory = async (e: React.MouseEvent, id: string, subName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete sub-category "${subName}" (${id})?`)) return;

    try {
      const { error } = await supabase.from('sub_categories').delete().eq('id', id);
      if (error) throw error;

      if (originalId === id) resetForm();
      loadData();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const isSubCatSeries = (idString: string | null) => {
    if (!idString) return false;
    return /^SUBCAT\d+$/i.test(idString.trim());
  };

  const isIdEditable = editingMode && originalId ? !isSubCatSeries(originalId) : false;

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) {
      setErrorMsg('Please select a parent Category.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const targetId = subCategoryCode.trim();
    if (!targetId) {
      setErrorMsg('Sub-Category ID cannot be empty.');
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

      const parentCategoryObj = categories.find((c) => String(c.id) === String(selectedCategoryId));
      const categoryNameValue = parentCategoryObj?.name || null;

      if (editingMode && originalId) {
        if (targetId !== originalId) {
          const { data: exists } = await supabase.from('sub_categories').select('id').eq('id', targetId).maybeSingle();
          if (exists) {
            throw new Error(`Sub-Category ID "${targetId}" already exists.`);
          }

          const { error: insertErr } = await supabase.from('sub_categories').insert([{
            id: targetId,
            category_id: selectedCategoryId,
            category_name: categoryNameValue,
            name: name.trim(),
            slug: slug,
            image_url: finalImageUrl || null,
            display_order: Number(displayOrder) || 0,
            active: isActive,
            created_at: new Date().toISOString()
          }]);
          if (insertErr) throw insertErr;

          await supabase.from('sizes').update({ sub_category_id: targetId }).eq('sub_category_id', originalId);
          await supabase.from('products').update({ sub_category_id: targetId }).eq('sub_category_id', originalId);

          await supabase.from('sub_categories').delete().eq('id', originalId);
        } else {
          const { error: updateErr } = await supabase
            .from('sub_categories')
            .update({
              category_id: selectedCategoryId,
              category_name: categoryNameValue,
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
        const { error: insertErr } = await supabase.from('sub_categories').insert([{
          id: targetId,
          category_id: selectedCategoryId,
          category_name: categoryNameValue,
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
      loadData();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error saving sub-category:', err);
      setErrorMsg(err.message || 'Failed to save sub-category.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSubCategories = subCategories.filter((sc) => {
    if (filterCategory === 'ALL') return true;
    return String(sc.category_id) === String(filterCategory);
  });

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-[#0a0e17]/85 backdrop-blur-xl select-none font-sans animate-in fade-in">
      <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 max-w-6xl w-full max-h-[92vh] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(109,74,255,0.2)] border border-white/10 flex flex-col text-xs relative">
        
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6d4aff] via-[#00d9ff] to-[#00ff9d] rounded-t-3xl" />

        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
              <Layers className="w-4 h-4 text-[#00d9ff]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Sub-Category Command Center</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/40 text-[9px] font-mono uppercase">
                  Total: {subCategories.length}
                </span>
              </h2>
              <span className="text-[10px] text-[#8b9bb4]">
                Strict &lt; 50 KB WebP R2 pipeline tho linked Sub-Catalog Cards
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
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
          
          {/* LEFT PANE: EXISTING SUB-CATEGORIES (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                  Catalog Cards ({filteredSubCategories.length})
                </span>

                {/* Filter Dropdown */}
                <div className="flex items-center gap-1 bg-[#0a0e17] px-2 py-1 rounded-xl border border-white/10">
                  <Filter className="w-3 h-3 text-[#00d9ff]" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-transparent text-[9.5px] font-mono text-white outline-none cursor-pointer"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-[#00ff9d] flex items-center gap-1.5 transition-all cursor-pointer"
                title="Reset Form to New Sub-Category"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {fetchError && (
              <div className="p-3 bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 rounded-2xl text-[#ff6b6b] text-[10px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>DB Error: {fetchError}</span>
              </div>
            )}

            {/* CARDS GRID */}
            <div className="flex-1 overflow-y-auto max-h-[58vh] pr-1.5 custom-scrollbar">
              {loadingList ? (
                <div className="flex items-center justify-center p-12 text-[#8b9bb4]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00d9ff] mr-2" /> Loading sub-categories...
                </div>
              ) : filteredSubCategories.length === 0 ? (
                <div className="p-8 text-center text-[#8b9bb4] border border-dashed border-white/10 rounded-2xl">
                  No sub-categories found. Select or create one on the right.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredSubCategories.map((sub) => {
                    const isSelected = editingMode && originalId === sub.id;
                    const parentCat = categories.find((c) => String(c.id) === String(sub.category_id));
                    const isLockedSeries = isSubCatSeries(sub.id);

                    return (
                      <div
                        key={sub.id}
                        onClick={() => handleSelectCard(sub)}
                        className={`group rounded-2xl border transition-all cursor-pointer overflow-hidden flex flex-col relative ${
                          isSelected
                            ? 'bg-[#6d4aff]/25 border-[#6d4aff] shadow-lg shadow-[#6d4aff]/30 scale-[1.02]'
                            : 'bg-[#0a0e17]/80 border-white/10 hover:border-[#00d9ff]/50 hover:bg-[#151c33]/70'
                        }`}
                      >
                        <div className="absolute top-2 left-2 z-10 bg-black/75 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold text-[#00ff9d] border border-white/10 backdrop-blur-md">
                          #{sub.display_order ?? 0}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSubCategory(e, sub.id, sub.name)}
                          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/70 hover:bg-[#ff6b6b] text-[#8b9bb4] hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100 backdrop-blur-md"
                          title="Delete Sub-Category"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>

                        <div className="w-full h-24 sm:h-28 bg-[#151c33] relative overflow-hidden flex items-center justify-center">
                          {sub.image_url ? (
                            <img
                              src={sub.image_url}
                              alt={sub.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-[#8b9bb4]/30" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-transparent to-transparent opacity-80" />
                        </div>

                        <div className="p-2.5 flex flex-col items-center text-center space-y-1 bg-[#101628]/60 flex-1 justify-between">
                          <div className="w-full">
                            <h3 className="font-bold text-white text-[12px] truncate w-full" title={sub.name}>
                              {sub.name}
                            </h3>
                            <span className="text-[8.5px] font-mono text-[#8b9bb4] block truncate">
                              📁 {parentCat?.name || sub.category_name || sub.category_id}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded border tracking-wider flex items-center gap-1 ${
                              isLockedSeries
                                ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/30'
                                : 'bg-[#ffa500]/15 text-[#ffa500] border-[#ffa500]/40'
                            }`}>
                              {isLockedSeries && <Lock className="w-2.5 h-2.5" />}
                              {sub.id}
                            </span>
                          </div>

                          <div className="text-[8.5px] font-mono pt-0.5 text-[#8b9bb4]">
                            <span className={sub.active ? 'text-[#00ff9d]' : 'text-[#ff6b6b]'}>
                              ● {sub.active ? 'Active' : 'Inactive'}
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

          {/* RIGHT PANE: FORM TO CREATE / EDIT (5 COLS) */}
          <div className="lg:col-span-5 bg-[#0a0e17]/60 p-4 rounded-3xl border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-mono font-bold text-[#00d9ff] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                {editingMode ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {editingMode ? `Edit Node (${originalId})` : 'Create Sub-Category'}
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
              {/* Parent Category Selector */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                  Parent Category *
                </label>
                <select
                  required
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#101628] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors cursor-pointer"
                >
                  {categories.length === 0 ? (
                    <option value="">No categories available</option>
                  ) : (
                    categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Sub-Category ID Field */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>Sub-Category ID *</span>
                  {isIdEditable ? (
                    <span className="text-[8.5px] text-[#ffa500] font-mono font-bold">
                      ASSIGN SUBCAT SERIES NOW
                    </span>
                  ) : (
                    <span className="text-[8.5px] text-[#8b9bb4] font-mono flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-[#00ff9d]" /> LOCKED & AUTO-GENERATED
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    readOnly={!isIdEditable}
                    value={subCategoryCode}
                    onChange={(e) => {
                      if (isIdEditable) {
                        setSubCategoryCode(e.target.value.toUpperCase());
                      }
                    }}
                    placeholder="e.g. SUBCAT0001"
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-[11px] outline-none transition-colors ${
                      isIdEditable
                        ? 'border-[#ffa500]/50 bg-[#101628] text-[#ffa500] focus:border-[#ffa500]'
                        : 'border-white/10 bg-[#0a0e17]/60 text-[#00ff9d] cursor-not-allowed'
                    }`}
                  />
                  {!isIdEditable && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b9bb4]">
                      <Lock className="w-3.5 h-3.5 text-[#8b9bb4]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-Category Name */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                  Sub-Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Silk Sarees / Bangles / Non-Padded Bras"
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#101628] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors placeholder:text-slate-600"
                />
              </div>

              {/* Strict < 50 KB WebP Image Upload via Cloudflare R2 */}
              <div className="p-3 bg-[#101628] rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Sub-Category Photo (R2 &lt; 50KB)
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

              {/* Display Order & Active Status */}
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

              {/* Submit Button */}
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
                <span>{editingMode ? 'Update Sub-Category' : 'Save Sub-Category'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}