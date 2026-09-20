import React, { useEffect, useState } from 'react';
import {
  Package,
  Building2,
  Tag,
  Sparkles,
  Save,
  Loader2,
  X,
  HardDrive,
  Layers,
  Palette,
  Ruler,
  Scissors,
  Check
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { CategoryRecord, SubCategoryRecord, ColourRecord, SizeRecord, FabricRecord, UnitRecord } from '../../types';
import ImageOptimizerModal, { TaggedColor } from './ImageOptimizerModal';

interface ProductMasterModalProps {
  onClose: () => void;
}

interface TaggedImage {
  id: string;
  url: string;
  color_tag: string;
}

export default function ProductMasterModal({ onClose }: ProductMasterModalProps) {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryRecord[]>([]);
  const [colours, setColours] = useState<ColourRecord[]>([]);
  const [sizes, setSizes] = useState<SizeRecord[]>([]);
  const [fabrics, setFabrics] = useState<FabricRecord[]>([]);
  const [units, setUnits] = useState<UnitRecord[]>([]);

  const [brand, setBrand] = useState<'fashions' | 'jewellery'>('fashions');
  const [productCode, setProductCode] = useState<string>('');
  const [codeLoading, setCodeLoading] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [openingStock, setOpeningStock] = useState<number>(0);
  const [images, setImages] = useState<TaggedImage[]>([]);

  // Optimizer Modal State
  const [showStudioModal, setShowStudioModal] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [catRes, subCatRes, colRes, sizeRes, fabRes, unitRes] = await Promise.all([
          supabase.from('categories').select('*').order('name'),
          supabase.from('sub_categories').select('*').order('name'),
          supabase.from('colours').select('*').order('name'),
          supabase.from('sizes').select('*').order('name'),
          supabase.from('fabrics').select('*').order('name'),
          supabase.from('units').select('*').order('name')
        ]);

        if (catRes.data) setCategories(catRes.data);
        if (subCatRes.data) setSubCategories(subCatRes.data);
        if (colRes.data) setColours(colRes.data);
        if (sizeRes.data) setSizes(sizeRes.data);
        if (fabRes.data) setFabrics(fabRes.data);
        if (unitRes.data) {
          setUnits(unitRes.data);
          if (unitRes.data.length > 0) setSelectedUnit(unitRes.data[0].id);
        }
      } catch (err) {
        console.error('Error loading masters:', err);
      }
    };
    fetchMasters();
  }, []);

  useEffect(() => {
    const generateProductCode = async () => {
      setCodeLoading(true);
      const prefix = brand === 'fashions' ? 'KF' : 'KJ';
      try {
        const { data } = await supabase
          .from('products')
          .select('product_code')
          .like('product_code', `${prefix}%`)
          .order('product_code', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const match = data[0].product_code.match(/\d+$/);
          const nextNum = match ? parseInt(match[0], 10) + 1 : 1;
          setProductCode(`${prefix}${String(nextNum).padStart(4, '0')}`);
        } else {
          setProductCode(`${prefix}0001`);
        }
      } catch {
        setProductCode(`${prefix}0001`);
      } finally {
        setCodeLoading(false);
      }
    };
    generateProductCode();
  }, [brand]);

  const toggleSelection = (item: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleAcceptOptimizedImage = (processedDataUrl: string, detectedColors: TaggedColor[]) => {
    // If tagged colors were detected, auto-add unique ones to selectedColors list
    if (detectedColors && detectedColors.length > 0) {
      const newColorNames = detectedColors.map((c) => c.name).filter(Boolean);
      setSelectedColors((prev) => Array.from(new Set([...prev, ...newColorNames])));
    }

    const defaultTag = detectedColors?.[0]?.name || (selectedColors.length > 0 ? selectedColors[0] : (colours[0]?.name || 'General'));
    setImages((prev) => [
      ...prev,
      { id: `${Date.now()}`, url: processedDataUrl, color_tag: defaultTag }
    ]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const catObj = categories.find((c) => String(c.id) === String(selectedCategory));
      const subCatObj = subCategories.find((sc) => String(sc.id) === String(selectedSubCategory));

      const payload = {
        id: `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        product_code: productCode,
        name: name.trim(),
        description: description.trim(),
        department: brand,
        category_id: selectedCategory || null,
        category_name: catObj?.name || null,
        sub_category_id: selectedSubCategory || null,
        sub_category_name: subCatObj?.name || null,
        unit_id: selectedUnit || null,
        stock_quantity: Number(openingStock) || 0,
        variants: { colors: selectedColors, sizes: selectedSizes, fabrics: selectedFabrics },
        images: images,
        barcode: productCode,
        active: true,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('products').insert([payload]);
      if (error) throw error;

      alert(`Product ${productCode} saved successfully!`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCatObj = categories.find((c) => String(c.id) === String(selectedCategory));
  const filteredSubCats = subCategories.filter((sc) => String(sc.category_id) === String(selectedCategory));
  const filteredSizes = sizes.filter((sz) => !selectedCategory || !sz.category_id || String(sz.category_id) === String(selectedCategory));

  return (
    <>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 bg-[#0a0e17]/85 backdrop-blur-xl select-none font-sans animate-in fade-in">
        {/* Floating Glassmorphic Modal Window */}
        <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(109,74,255,0.2)] border border-white/10 space-y-4 text-xs relative">
          
          {/* Top Neon Ambient Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6d4aff] via-[#00d9ff] to-[#ff6b6b] rounded-t-3xl" />

          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/10 pb-3.5 sticky top-0 bg-[#101628]/90 backdrop-blur-md z-20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
                <Package className="w-4.5 h-4.5 text-[#00d9ff]" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>Product Master Creator</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#6d4aff]/20 text-[#00d9ff] border border-[#6d4aff]/40 text-[9px] font-mono tracking-wider uppercase">
                    Catalog Node
                  </span>
                </h2>
                <span className="text-[10px] text-[#8b9bb4]">Provision new SKU with variants & WebP assets</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-[#0a0e17]/80 px-4 py-1.5 rounded-2xl border border-white/10 text-right shadow-inner">
                <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-[#8b9bb4] block">SKU CODE</span>
                <span className="font-mono text-xs font-extrabold text-[#00ff9d]">
                  {codeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00d9ff]" /> : productCode}
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
            
            {/* Brand Segmented Control */}
            <div>
              <label className="text-[10.5px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1.5">
                Brand Domain *
              </label>
              <div className="inline-flex p-1 bg-[#0a0e17]/80 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setBrand('fashions')}
                  className={`px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    brand === 'fashions'
                      ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-md shadow-[#6d4aff]/40'
                      : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Fashion Apparel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBrand('jewellery')}
                  className={`px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    brand === 'jewellery'
                      ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-md shadow-[#6d4aff]/40'
                      : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5 text-[#00d9ff]" />
                  <span>Jewellery Vault</span>
                </button>
              </div>
            </div>

            {/* Name & Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10.5px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1.5">
                  Product Spec Title *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pure Banarasi Silk Saree"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-white/10 bg-[#0a0e17]/80 font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-[10.5px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1.5">
                  Product Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Weaving specs, material blend..."
                  className="w-full px-3.5 py-2 rounded-2xl border border-white/10 bg-[#0a0e17]/80 font-medium text-white outline-none focus:border-[#00d9ff] transition-colors placeholder:text-slate-600 resize-none"
                />
              </div>
            </div>

            {/* Category / SubCat / Unit / Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1.5">
                  Category *
                </label>
                <select
                  required
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubCategory('');
                    setSelectedSizes([]);
                  }}
                  className="w-full px-3 py-2.5 rounded-2xl border border-white/10 bg-[#0a0e17] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1.5">
                  Sub-Category
                </label>
                <select
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  disabled={!selectedCategory}
                  className="w-full px-3 py-2.5 rounded-2xl border border-white/10 bg-[#0a0e17] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors disabled:opacity-40"
                >
                  <option value="">Select Sub-Category</option>
                  {filteredSubCats.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1.5">
                  Unit *
                </label>
                <select
                  required
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-white/10 bg-[#0a0e17] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors"
                >
                  <option value="">Select Unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1.5">
                  Opening Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={openingStock}
                  onChange={(e) => setOpeningStock(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-2xl border border-white/10 bg-[#0a0e17] font-mono font-bold text-[#00ff9d] outline-none focus:border-[#00d9ff] transition-colors"
                />
              </div>
            </div>

            {/* Variants Selector Matrix */}
            <div className="p-4 bg-[#0a0e17]/60 rounded-3xl border border-white/10 space-y-3">
              <span className="text-[11px] font-mono font-bold text-[#00d9ff] block uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Configure Variant Matrix
              </span>
              
              {/* Colours */}
              <div>
                <span className="text-[10px] font-mono font-bold text-[#8b9bb4] block mb-1.5 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-[#ff6b6b]" /> Colours:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {colours.map((c) => {
                    const active = selectedColors.includes(c.name);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleSelection(c.name, selectedColors, setSelectedColors)}
                        className={`px-3 py-1 rounded-xl text-[10.5px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          active
                            ? 'bg-[#6d4aff] text-white border-[#6d4aff] shadow-md shadow-[#6d4aff]/40'
                            : 'bg-[#151c33] text-[#8b9bb4] border-white/10 hover:text-white'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 text-[#00ff9d]" />}
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sizes */}
              <div>
                <span className="text-[10px] font-mono font-bold text-[#8b9bb4] block mb-1.5 flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-[#00d9ff]" /> Sizes:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {filteredSizes.map((s) => {
                    const active = selectedSizes.includes(s.name);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSelection(s.name, selectedSizes, setSelectedSizes)}
                        className={`px-3 py-1 rounded-xl text-[10.5px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          active
                            ? 'bg-[#00d9ff] text-neutral-950 font-bold border-[#00d9ff] shadow-md shadow-[#00d9ff]/30'
                            : 'bg-[#151c33] text-[#8b9bb4] border-white/10 hover:text-white'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 text-neutral-950" />}
                        <span>{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fabrics */}
              <div>
                <span className="text-[10px] font-mono font-bold text-[#8b9bb4] block mb-1.5 flex items-center gap-1">
                  <Scissors className="w-3 h-3 text-[#00ff9d]" /> Fabrics:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {fabrics.map((f) => {
                    const active = selectedFabrics.includes(f.name);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleSelection(f.name, selectedFabrics, setSelectedFabrics)}
                        className={`px-3 py-1 rounded-xl text-[10.5px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          active
                            ? 'bg-[#00ff9d] text-neutral-950 font-bold border-[#00ff9d] shadow-md shadow-[#00ff9d]/30'
                            : 'bg-[#151c33] text-[#8b9bb4] border-white/10 hover:text-white'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 text-neutral-950" />}
                        <span>{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* HD Optimizer & Asset Uploader */}
            <div className="p-4 bg-[#0a0e17]/60 rounded-3xl border border-white/10 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono font-bold text-white block uppercase tracking-wider flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-[#00d9ff]" /> Product Assets & HD WebP Optimizer
                  </span>
                  <p className="text-[10px] text-[#8b9bb4] mt-0.5">
                    Lossless WebP compression (&lt;150KB) with automatic interactive gemstone & polish color tagging.
                  </p>
                </div>
              </div>

              {/* Trigger Optimizer Modal */}
              <button
                type="button"
                onClick={() => setShowStudioModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white font-bold text-xs shadow-lg shadow-[#6d4aff]/30 transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-[#00d9ff]" />
                <span>Optimize & Tag Product Photo</span>
              </button>

              {/* Gallery Grid of Optimized Images */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {images.map((img) => (
                    <div key={img.id} className="rounded-2xl border border-white/10 bg-[#151c33] overflow-hidden shadow-lg">
                      <div className="relative h-28 bg-[#0a0e17]">
                        <img src={img.url} alt="Variant" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((im) => im.id !== img.id))}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white hover:bg-[#ff6b6b] transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-2 bg-[#151c33] border-t border-white/10">
                        <select
                          value={img.color_tag}
                          onChange={(e) => {
                            const val = e.target.value;
                            setImages(images.map((im) => im.id === img.id ? { ...im, color_tag: val } : im));
                          }}
                          className="w-full px-2 py-1 rounded-xl border border-white/10 bg-[#0a0e17] text-[10.5px] font-semibold text-white outline-none focus:border-[#00d9ff]"
                        >
                          {selectedColors.length > 0 ? (
                            selectedColors.map((c) => <option key={c} value={c}>{c}</option>)
                          ) : (
                            colours.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)
                          )}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                disabled={submitting}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white font-bold flex items-center gap-2 shadow-lg shadow-[#6d4aff]/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00d9ff]" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-[#00ff9d]" />
                )}
                <span>Save Product Master</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Futuristic Image Optimizer Modal Popup */}
      {showStudioModal && (
        <ImageOptimizerModal
          onClose={() => setShowStudioModal(false)}
          onAcceptImage={handleAcceptOptimizedImage}
          productTitle={name}
          categoryName={selectedCatObj?.name}
        />
      )}
    </>
  );
}