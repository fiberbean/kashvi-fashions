import React, { useEffect, useState } from 'react';
import {
  Package,
  Building2,
  Tag,
  Sparkles,
  Save,
  Loader2,
  X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { CategoryRecord, SubCategoryRecord, ColourRecord, SizeRecord, FabricRecord, UnitRecord } from '../../types';
import ImageOptimizerModal from './ImageOptimizerModal';

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

  // Studio Popup State
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

  // Called when user clicks "Okay, Add Enhanced Image" in Studio Modal
  const handleAcceptAiImage = (processedDataUrl: string) => {
    const defaultTag = selectedColors.length > 0 ? selectedColors[0] : (colours[0]?.name || 'General');
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
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs select-none font-sans animate-in fade-in">
        <div className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#dce6e1] space-y-4 text-xs">
          
          <div className="flex justify-between items-center border-b border-[#edf2ef] pb-3 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#0b3b2c]" />
              <div>
                <h2 className="text-base font-bold text-[#0b3b2c]">Product Master Creator</h2>
                <span className="text-[10px] text-[#4d6960]">Create new catalog product</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-[#f0f4f2] px-4 py-1.5 rounded-xl border border-[#dce6e1] text-right">
                <span className="text-[8px] font-bold uppercase tracking-wider text-[#4d6960] block">PRODUCT CODE</span>
                <span className="font-mono text-sm font-bold text-[#0b3b2c]">
                  {codeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : productCode}
                </span>
              </div>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-100 cursor-pointer">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl border bg-rose-50 border-rose-200 text-rose-800 font-bold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#0b3b2c] block mb-1.5">Brand *</label>
              <div className="inline-flex p-1 bg-[#f0f4f2] rounded-2xl border border-[#dce6e1]">
                <button
                  type="button"
                  onClick={() => setBrand('fashions')}
                  className={`px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    brand === 'fashions' ? 'bg-[#0b3b2c] text-white shadow-xs' : 'text-[#4d6960]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Fashion</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBrand('jewellery')}
                  className={`px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    brand === 'jewellery' ? 'bg-[#0b3b2c] text-white shadow-xs' : 'text-[#4d6960]'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Jewellery</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pure Banarasi Silk Saree"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-semibold outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Product Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Weaving specs, material blend..."
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Category *</label>
                <select
                  required
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubCategory('');
                    setSelectedSizes([]);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-semibold outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Sub-Category</label>
                <select
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  disabled={!selectedCategory}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-semibold outline-none disabled:opacity-50"
                >
                  <option value="">Select Sub-Category</option>
                  {filteredSubCats.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Unit *</label>
                <select
                  required
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-semibold outline-none"
                >
                  <option value="">Select Unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Opening Stock</label>
                <input
                  type="number"
                  min="0"
                  value={openingStock}
                  onChange={(e) => setOpeningStock(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-bold outline-none"
                />
              </div>
            </div>

            <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#dce6e1] space-y-2.5">
              <span className="text-xs font-bold text-[#0b3b2c] block uppercase tracking-wider">Select Variants</span>
              
              <div>
                <span className="text-[10px] font-bold text-neutral-600 block mb-1">Colours:</span>
                <div className="flex flex-wrap gap-1">
                  {colours.map((c) => {
                    const active = selectedColors.includes(c.name);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleSelection(c.name, selectedColors, setSelectedColors)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border cursor-pointer ${
                          active ? 'bg-[#0b3b2c] text-white border-[#0b3b2c]' : 'bg-white text-neutral-600 border-[#dce6e1]'
                        }`}
                      >
                        {active && <span className="text-[#e5c07b]">✓</span>}
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-neutral-600 block mb-1">Sizes:</span>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {filteredSizes.map((s) => {
                    const active = selectedSizes.includes(s.name);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSelection(s.name, selectedSizes, setSelectedSizes)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border cursor-pointer ${
                          active ? 'bg-[#0b3b2c] text-white border-[#0b3b2c]' : 'bg-white text-neutral-600 border-[#dce6e1]'
                        }`}
                      >
                        {active && <span className="text-[#e5c07b]">✓</span>}
                        <span>{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-neutral-600 block mb-1">Fabrics:</span>
                <div className="flex flex-wrap gap-1">
                  {fabrics.map((f) => {
                    const active = selectedFabrics.includes(f.name);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleSelection(f.name, selectedFabrics, setSelectedFabrics)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border cursor-pointer ${
                          active ? 'bg-[#0b3b2c] text-white border-[#0b3b2c]' : 'bg-white text-neutral-600 border-[#dce6e1]'
                        }`}
                      >
                        {active && <span className="text-[#e5c07b]">✓</span>}
                        <span>{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI STUDIO ENHANCED IMAGE UPLOAD SECTION */}
            <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#dce6e1] space-y-3">
              <div>
                <span className="text-xs font-bold text-[#0b3b2c] block uppercase tracking-wider">
                  Product Images & AI Studio Enhancements
                </span>
                <p className="text-[10px] text-[#4d6960] mt-0.5">
                  Enhance photos with studio lighting, backdrop replacement and high-clarity lightweight compression.
                </p>
              </div>

              {/* Trigger Button that opens the Studio Popup */}
              <button
                type="button"
                onClick={() => setShowStudioModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b3b2c] text-white font-bold text-xs shadow-xs hover:bg-[#124b39] transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#e5c07b]" />
                <span>Upload & Enhance via AI Studio</span>
              </button>

              {/* Uploaded Gallery Grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {images.map((img) => (
                    <div key={img.id} className="rounded-2xl border border-[#dce6e1] bg-white overflow-hidden shadow-2xs">
                      <div className="relative h-28 bg-[#fbfcfc]">
                        <img src={img.url} alt="Variant" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((im) => im.id !== img.id))}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-2 bg-[#fbfcfc] border-t">
                        <select
                          value={img.color_tag}
                          onChange={(e) => {
                            const val = e.target.value;
                            setImages(images.map((im) => im.id === img.id ? { ...im, color_tag: val } : im));
                          }}
                          className="w-full px-2 py-1 rounded border text-[11px] font-bold outline-none"
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

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl font-bold text-neutral-500 cursor-pointer">Cancel</button>
              <button type="submit" disabled={submitting} className="px-6 py-2 rounded-xl bg-[#0b3b2c] text-white font-bold flex items-center gap-1.5 cursor-pointer">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-[#e5c07b]" />}
                <span>Save Product Master</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* AI Studio Image Modal Popup */}
{showStudioModal && (
  <ImageOptimizerModal
    onClose={() => setShowStudioModal(false)}
    onAcceptImage={handleAcceptAiImage}
    productTitle={name}
    categoryName={selectedCatObj?.name}
  />
)}
    </>
  );
}