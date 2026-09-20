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
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { compressImageToWebP } from '../../utils/imageOptimizer';
import { Category } from '../../types';

interface CategoryMasterModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CategoryMasterModal({ onClose, onSuccess }: CategoryMasterModalProps) {
  // Existing Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);

  // Form State
  const [categoryCode, setCategoryCode] = useState<string>('');
  const [codeLoading, setCodeLoading] = useState<boolean>(true);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Image Compression & File State
  const [optimizedBlob, setOptimizedBlob] = useState<Blob | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{ original: string; optimized: string } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch Existing Categories from Supabase
  const loadCategories = async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoadingList(false);
    }
  };

  // 2. Auto-generate Next Category Code in CAT0001 series
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
      console.error('Error generating code:', err);
      setCategoryCode('CAT0001');
    } finally {
      setCodeLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    generateCategoryCode();
  }, []);

  // Reset form to create mode
  const resetForm = () => {
    setEditingId(null);
    setName('');
    setImageUrl('');
    setImagePreview(null);
    setOptimizedBlob(null);
    setCompressionStats(null);
    setDisplayOrder(categories.length > 0 ? categories.length + 1 : 1);
    setIsActive(true);
    generateCategoryCode();
  };

  // Populate form for Editing existing category
  const handleEditClick = (cat: Category) => {
    setEditingId(cat.id);
    setCategoryCode(cat.id);
    setName(cat.name);
    setImageUrl(cat.image_url || '');
    setImagePreview(cat.image_url || null);
    setOptimizedBlob(null);
    setCompressionStats(null);
    setDisplayOrder((cat as any).display_order || 0);
    setIsActive(cat.active ?? true);
  };

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

  // Delete Category
  const handleDeleteCategory = async (id: string, catName: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${catName}"?`)) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;

      alert(`Category "${catName}" removed successfully.`);
      if (editingId === id) resetForm();
      loadCategories();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      let finalImageUrl = imageUrl.trim();

      // Upload the compressed WebP file if updated
      if (optimizedBlob) {
        const activeCode = editingId || categoryCode;
        const fileName = `${activeCode.toLowerCase()}_${Date.now()}.webp`;
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

      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      if (editingId) {
        // UPDATE EXISTING CATEGORY
        const { error } = await supabase
          .from('categories')
          .update({
            name: name.trim(),
            slug: slug,
            image_url: finalImageUrl || null,
            display_order: Number(displayOrder) || 0,
            active: isActive
          })
          .eq('id', editingId);

        if (error) throw error;
        alert(`Category "${name}" updated successfully!`);
      } else {
        // INSERT NEW CATEGORY
        const newCategory = {
          id: categoryCode,
          name: name.trim(),
          slug: slug,
          image_url: finalImageUrl || null,
          display_order: Number(displayOrder) || 0,
          active: isActive,
          created_at: new Date().toISOString()
        };

        const { error } = await supabase.from('categories').insert([newCategory]);
        if (error) throw error;
        alert(`Category "${name}" (${categoryCode}) created!`);
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
      <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(109,74,255,0.2)] border border-white/10 flex flex-col text-xs relative">
        
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
                  Master Records: {categories.length}
                </span>
              </h2>
              <span className="text-[10px] text-[#8b9bb4]">
                Manage existing catalog records & register new nodes
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

        {/* Main Dual Pane Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 flex-1 overflow-y-auto pr-1">
          
          {/* LEFT PANE: EXISTING CATEGORIES LIST (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Existing Categories ({categories.length})
              </span>
              <button
                type="button"
                onClick={resetForm}
                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-[#00ff9d] flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" /> New Form
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[56vh] pr-1.5 custom-scrollbar">
              {loadingList ? (
                <div className="flex items-center justify-center p-12 text-[#8b9bb4]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00d9ff] mr-2" /> Loading categories...
                </div>
              ) : categories.length === 0 ? (
                <div className="p-8 text-center text-[#8b9bb4] border border-dashed border-white/10 rounded-2xl">
                  No categories created yet. Fill the form to create your first category.
                </div>
              ) : (
                categories.map((cat) => {
                  const isSelected = editingId === cat.id;
                  return (
                    <div
                      key={cat.id}
                      className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#6d4aff]/20 border-[#6d4aff] shadow-lg shadow-[#6d4aff]/20'
                          : 'bg-[#0a0e17]/80 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Thumbnail & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-[#151c33] border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                          {cat.image_url ? (
                            <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-[#8b9bb4]/40" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/5 text-[#00d9ff] border border-white/10">
                              {cat.id}
                            </span>
                            <span className="font-bold text-white text-[12px] truncate">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[9.5px] font-mono text-[#8b9bb4]">
                            <span>Order: {(cat as any).display_order ?? 0}</span>
                            <span>•</span>
                            <span className={cat.active ? 'text-[#00ff9d]' : 'text-[#ff6b6b]'}>
                              {cat.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditClick(cat)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-[#00d9ff]/20 text-[#8b9bb4] hover:text-[#00d9ff] transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-[#ff6b6b]/20 text-[#8b9bb4] hover:text-[#ff6b6b] transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANE: FORM TO CREATE / EDIT (5 COLS) */}
          <div className="lg:col-span-5 bg-[#0a0e17]/60 p-4 rounded-3xl border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-mono font-bold text-[#00d9ff] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                {editingId ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {editingId ? `Editing ${editingId}` : 'Create New Category'}
              </span>
              {editingId && (
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
              {/* Category Code */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                  Category ID
                </label>
                <input
                  type="text"
                  readOnly
                  value={codeLoading ? 'Generating...' : categoryCode}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#101628] font-mono font-bold text-[#00ff9d] text-[11px] outline-none cursor-not-allowed"
                />
              </div>

              {/* Category Name */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarees / Kurtis / Western Wear"
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#101628] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors placeholder:text-slate-600"
                />
              </div>

              {/* Image Upload & WebP Compression */}
              <div className="p-3 bg-[#101628] rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Category Photo
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
                      <span>Upload & Auto-Compress</span>
                      <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
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
                disabled={submitting || isCompressing || codeLoading}
                className="w-full py-2.5 mt-2 rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#6d4aff]/30 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#00d9ff]" />
                ) : (
                  <Save className="w-4 h-4 text-[#00ff9d]" />
                )}
                <span>{editingId ? 'Update Category' : 'Save Category'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}