import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Tag, 
  Layers, 
  Palette, 
  Upload, 
  Trash2, 
  Check, 
  AlertCircle,
  Sparkles,
  Save,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { 
  CategoryRecord, 
  SubCategoryRecord, 
  ColourRecord, 
  SizeRecord, 
  FabricRecord, 
  UnitRecord 
} from '../types';

interface TaggedImage {
  id: string;
  url: string;
  color_tag: string;
}

export default function ProductMaster() {
  // Department & Auto Product Code
  const [department, setDepartment] = useState<'fashions' | 'jewellery'>('fashions');
  const [productCode, setProductCode] = useState<string>('');
  const [codeLoading, setCodeLoading] = useState<boolean>(false);

  // Basic Info (2-Column Layout)
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Dropdown Categories Live Data
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');

  // Variants Multi-Selection Live Data from Masters
  const [colours, setColours] = useState<ColourRecord[]>([]);
  const [sizes, setSizes] = useState<SizeRecord[]>([]);
  const [fabrics, setFabrics] = useState<FabricRecord[]>([]);
  const [units, setUnits] = useState<UnitRecord[]>([]);

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');

  // Opening Stock
  const [openingStock, setOpeningStock] = useState<number>(0);

  // Images with Colour Tagging
  const [images, setImages] = useState<TaggedImage[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [selectedColorForUpload, setSelectedColorForUpload] = useState<string>('');

  // Submission & Loading States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch Masters Data on Load
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [catRes, subCatRes, colRes, sizeRes, fabRes, unitRes] = await Promise.all([
          supabase.from('categories').select('*').eq('active', true).order('name'),
          supabase.from('sub_categories').select('*').eq('active', true).order('name'),
          supabase.from('colours').select('*').eq('active', true).order('name'),
          supabase.from('sizes').select('*').eq('active', true).order('name'),
          supabase.from('fabrics').select('*').order('name'),
          supabase.from('units').select('*').eq('active', true).order('name')
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
        console.error('Error fetching masters data for Product Master:', err);
      }
    };

    fetchMasters();
  }, []);

  // 2. Automated Product Code Generator (KFXXXX vs KJXXXX)
  useEffect(() => {
    const generateProductCode = async () => {
      setCodeLoading(true);
      const prefix = department === 'fashions' ? 'KF' : 'KJ';
      try {
        const { data, error } = await supabase
          .from('products')
          .select('product_code')
          .like('product_code', `${prefix}%`)
          .order('product_code', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const lastCode = data[0].product_code;
          const match = lastCode.match(/\d+$/);
          if (match) {
            const nextNum = parseInt(match[0], 10) + 1;
            setProductCode(`${prefix}${String(nextNum).padStart(4, '0')}`);
          } else {
            setProductCode(`${prefix}0001`);
          }
        } else {
          setProductCode(`${prefix}0001`);
        }
      } catch (err) {
        setProductCode(`${prefix}0001`);
      } finally {
        setCodeLoading(false);
      }
    };

    generateProductCode();
  }, [department]);

  // Filter Sub-Categories dynamically based on Category Selection
  const filteredSubCategories = subCategories.filter(
    (sub) => sub.category_id === selectedCategory
  );

  // Toggle multi-select variant values
  const toggleSelection = (item: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Add Tagged Image
  const handleAddImage = () => {
    if (!imageUrlInput.trim()) return;
    const tag = selectedColorForUpload || (selectedColors[0] || 'Default');
    const newImage: TaggedImage = {
      id: `${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      url: imageUrlInput.trim(),
      color_tag: tag
    };
    setImages([...images, newImage]);
    setImageUrlInput('');
  };

  // Remove Tagged Image
  const handleRemoveImage = (id: string) => {
    setImages(images.filter((img) => img.id !== id));
  };

  // Save Complete Record to public.products
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    try {
      const selectedCatObj = categories.find((c) => c.id === selectedCategory);
      const selectedSubCatObj = subCategories.find((sc) => sc.id === selectedSubCategory);

      const productPayload = {
        id: `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        product_code: productCode,
        name: name.trim(),
        description: description.trim(),
        department: department,
        category_id: selectedCategory || null,
        category_name: selectedCatObj?.name || null,
        sub_category_id: selectedSubCategory || null,
        sub_category_name: selectedSubCatObj?.name || null,
        unit_id: selectedUnit || null,
        stock_quantity: Number(openingStock) || 0,
        variants: {
          colors: selectedColors,
          sizes: selectedSizes,
          fabrics: selectedFabrics
        },
        images: images,
        barcode: productCode,
        active: true,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('products').insert([productPayload]);

      if (error) {
        throw error;
      }

      setStatusMessage({
        type: 'success',
        text: `Product ${productCode} - ${name} saved successfully!`
      });

      // Reset form fields
      setName('');
      setDescription('');
      setSelectedCategory('');
      setSelectedSubCategory('');
      setSelectedColors([]);
      setSelectedSizes([]);
      setSelectedFabrics([]);
      setOpeningStock(0);
      setImages([]);

      // Auto trigger new code generation
      setDepartment((prev) => (prev === 'fashions' ? 'fashions' : 'jewellery'));
    } catch (err: any) {
      console.error('Error saving product:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to save product to public.products'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 select-none font-sans pb-12">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e2eae6] shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#e4efe9] text-[#0b3b2c] text-[9.5px] font-bold uppercase tracking-wider mb-1 border border-[#dce6e1]">
            <Sparkles className="w-2.5 h-2.5 text-[#c6933a]" /> Product Catalog Engine
          </div>
          <h1 className="text-xl font-serif font-bold text-[#0b3b2c] leading-none">
            Product Master
          </h1>
          <p className="text-[11px] text-[#4d6960] mt-1">
            Linked to Masters: categories, sub_categories, colours, sizes, fabrics, units & public.products.
          </p>
        </div>

        {/* Auto Product Code Display */}
        <div className="flex items-center gap-2 bg-[#f0f4f2] px-4 py-2 rounded-xl border border-[#dce6e1] self-start sm:self-center">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#4d6960] block">Auto Product Code</span>
            <span className="font-mono text-base font-bold text-[#0b3b2c] flex items-center gap-1.5">
              {codeLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#0b3b2c]" /> : productCode}
            </span>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {statusMessage && (
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <AlertCircle className="w-4 h-4" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Form Body */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Department Switcher & Units */}
        <div className="bg-white rounded-2xl border border-[#e2eae6] p-4 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-[#0b3b2c] block mb-2">Select Department *</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDepartment('fashions')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                  department === 'fashions'
                    ? 'bg-[#0b3b2c] text-white border-[#0b3b2c] shadow-xs'
                    : 'bg-[#f8faf9] text-[#4d6960] border-[#dce6e1] hover:bg-[#edf2ef]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Kashvi Fashions (KF)</span>
              </button>

              <button
                type="button"
                onClick={() => setDepartment('jewellery')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                  department === 'jewellery'
                    ? 'bg-[#0b3b2c] text-white border-[#0b3b2c] shadow-xs'
                    : 'bg-[#f8faf9] text-[#4d6960] border-[#dce6e1] hover:bg-[#edf2ef]'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Kashvi Jewellery (KJ)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#0b3b2c] block mb-2">Base Unit (From Units Master)</label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-bold text-[#0c2b22] outline-none"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.short_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2-Column Side-by-Side: Name & Description */}
        <div className="bg-white rounded-2xl border border-[#e2eae6] p-4 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pure Kanjeevaram Silk Saree / Temple Choker Set"
              className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs text-[#0c2b22] font-semibold outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Product Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter product details, weaving specifications, stone quality..."
              className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs text-[#0c2b22] outline-none resize-none"
            />
          </div>
        </div>

        {/* Categories, Sub-Categories & Opening Stock */}
        <div className="bg-white rounded-2xl border border-[#e2eae6] p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Category (Live Masters) *</label>
            <select
              required
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubCategory('');
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs text-[#0c2b22] font-semibold outline-none"
            >
              <option value="">-- Select Category --</option>
              {categories
                .filter((c) => !c.department || c.department.toLowerCase() === department.toLowerCase())
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Sub-Category (Dynamic)</label>
            <select
              value={selectedSubCategory}
              onChange={(e) => setSelectedSubCategory(e.target.value)}
              disabled={!selectedCategory}
              className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs text-[#0c2b22] font-semibold outline-none disabled:opacity-50"
            >
              <option value="">-- Select Sub-Category --</option>
              {filteredSubCategories.map((sc) => (
                <option key={sc.id} value={sc.id}>{sc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Opening Stock Quantity</label>
            <input
              type="number"
              min="0"
              value={openingStock}
              onChange={(e) => setOpeningStock(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-bold text-[#0c2b22] outline-none"
            />
          </div>
        </div>

        {/* Variants Multi-Selection Section */}
        <div className="bg-white rounded-2xl border border-[#e2eae6] p-4 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#edf2ef] pb-2">
            <Layers className="w-4 h-4 text-[#0b3b2c]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0b3b2c]">
              Select Variants (From Master Vaults)
            </h3>
          </div>

          {/* Colours Multi-Selection */}
          <div>
            <span className="text-[11px] font-bold text-neutral-600 block mb-2">Available Colours:</span>
            <div className="flex flex-wrap gap-1.5">
              {colours.map((c) => {
                const active = selectedColors.includes(c.name);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleSelection(c.name, selectedColors, setSelectedColors)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                      active 
                        ? 'bg-[#0b3b2c] text-white border-[#0b3b2c]' 
                        : 'bg-[#f8faf9] text-neutral-600 border-[#dce6e1] hover:border-[#0b3b2c]'
                    }`}
                  >
                    {active && <Check className="w-3 h-3 text-[#e5c07b]" />}
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sizes Multi-Selection */}
          <div>
            <span className="text-[11px] font-bold text-neutral-600 block mb-2">Available Sizes:</span>
            <div className="flex flex-wrap gap-1.5">
              {sizes.map((s) => {
                const active = selectedSizes.includes(s.name);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSelection(s.name, selectedSizes, setSelectedSizes)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                      active 
                        ? 'bg-[#0b3b2c] text-white border-[#0b3b2c]' 
                        : 'bg-[#f8faf9] text-neutral-600 border-[#dce6e1] hover:border-[#0b3b2c]'
                    }`}
                  >
                    {active && <Check className="w-3 h-3 text-[#e5c07b]" />}
                    <span>{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fabrics Multi-Selection */}
          <div>
            <span className="text-[11px] font-bold text-neutral-600 block mb-2">Available Fabrics:</span>
            <div className="flex flex-wrap gap-1.5">
              {fabrics.map((f) => {
                const active = selectedFabrics.includes(f.name);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleSelection(f.name, selectedFabrics, setSelectedFabrics)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                      active 
                        ? 'bg-[#0b3b2c] text-white border-[#0b3b2c]' 
                        : 'bg-[#f8faf9] text-neutral-600 border-[#dce6e1] hover:border-[#0b3b2c]'
                    }`}
                  >
                    {active && <Check className="w-3 h-3 text-[#e5c07b]" />}
                    <span>{f.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Media Upload & Colour Tagging */}
        <div className="bg-white rounded-2xl border border-[#e2eae6] p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-[#edf2ef] pb-2">
            <Palette className="w-4 h-4 text-[#0b3b2c]" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0b3b2c]">
                Product Images & Colour Tagging
              </h3>
              <p className="text-[10.5px] text-[#4d6960]">
                Map uploaded images to a variant colour so the customer panel switches image dynamically.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Paste Image URL (e.g. Supabase Storage / CDN URL)..."
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs outline-none"
            />
            <select
              value={selectedColorForUpload}
              onChange={(e) => setSelectedColorForUpload(e.target.value)}
              className="sm:w-48 px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold outline-none"
            >
              <option value="">Tag To Colour</option>
              {selectedColors.length > 0 ? (
                selectedColors.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))
              ) : (
                colours.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={handleAddImage}
              className="px-4 py-2 rounded-xl bg-[#0b3b2c] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#e5c07b]" />
              <span>Add Image</span>
            </button>
          </div>

          {/* Tagged Images Gallery */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
              {images.map((img) => (
                <div key={img.id} className="relative rounded-xl border border-[#dce6e1] bg-[#f8faf9] overflow-hidden group">
                  <img
                    src={img.url}
                    alt={img.color_tag}
                    className="w-full h-24 object-cover"
                    onError={(e) => {
                      (e.target as any).src = 'https://placehold.co/150x150?text=No+Image';
                    }}
                  />
                  <div className="p-1.5 flex items-center justify-between bg-white border-t border-[#edf2ef]">
                    <span className="text-[10px] font-bold text-[#0b3b2c] truncate">{img.color_tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      className="text-rose-500 hover:text-rose-700 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-[#0b3b2c] hover:bg-[#082a20] text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Save className="w-4 h-4 text-[#e5c07b]" />
            )}
            <span>Save Product Master</span>
          </button>
        </div>
      </form>
    </div>
  );
}