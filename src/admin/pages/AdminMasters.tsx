import React, { useEffect, useState, useRef } from 'react';
import {
  Package,
  Layers,
  Palette,
  Ruler,
  Scissors,
  X,
  Building2,
  Tag,
  Upload,
  Check,
  Save,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  CategoryRecord,
  SubCategoryRecord,
  ColourRecord,
  FabricRecord,
  UnitRecord,
  AdminStaffUser
} from '../types';

interface AdminMastersProps {
  currentUser: AdminStaffUser | null;
  selectedSection?: 'product' | 'category' | 'subcategory' | 'colours' | 'sizes' | 'fabrics' | null;
  onClearSection?: () => void;
}

interface TaggedImage {
  id: string;
  url: string;
  color_tag: string;
}

export default function AdminMasters({ currentUser, selectedSection, onClearSection }: AdminMastersProps) {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryRecord[]>([]);
  const [colours, setColours] = useState<ColourRecord[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [fabrics, setFabrics] = useState<FabricRecord[]>([]);
  const [units, setUnits] = useState<UnitRecord[]>([]);

  const [activeModal, setActiveModal] = useState<string | null>(selectedSection || null);

  useEffect(() => {
    setActiveModal(selectedSection || null);
  }, [selectedSection]);

  const handleCloseModal = () => {
    setActiveModal(null);
    if (onClearSection) {
      onClearSection();
    }
  };

  // Form States
  const [catName, setCatName] = useState('');
  const [catDept, setCatDept] = useState('fashions');

  const [subCatName, setSubCatName] = useState('');
  const [subCatParentId, setSubCatParentId] = useState('');

  const [variantNameInput, setVariantNameInput] = useState('');
  const [sizeCategoryId, setSizeCategoryId] = useState('');

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
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [submittingProduct, setSubmittingProduct] = useState<boolean>(false);
  const [productError, setProductError] = useState<string | null>(null);

  const loadMastersData = async () => {
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
        if (unitRes.data.length > 0 && !selectedUnit) {
          setSelectedUnit(unitRes.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch masters state:', err);
    }
  };

  useEffect(() => {
    loadMastersData();
  }, []);

  useEffect(() => {
    if (activeModal !== 'product') return;

    const generateProductCode = async () => {
      setCodeLoading(true);
      const prefix = brand === 'fashions' ? 'KF' : 'KJ';
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
  }, [brand, activeModal]);

  const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const id = makeId('cat');
    const slug = catName.trim().toLowerCase().replace(/\s+/g, '-');

    const { data, error } = await supabase
      .from('categories')
      .insert([{
        id,
        name: catName.trim(),
        slug,
        department: catDept,
        active: true
      }])
      .select()
      .single();

    if (!error && data) {
      setCategories((prev) => [...prev, data]);
      setCatName('');
      handleCloseModal();
    }
  };

  const handleSaveSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCatName.trim() || !subCatParentId) return;

    const parent = categories.find((c) => String(c.id) === String(subCatParentId));
    const id = makeId('subcat');

    const { data, error } = await supabase
      .from('sub_categories')
      .insert([{
        id,
        name: subCatName.trim(),
        category_id: subCatParentId,
        category_name: parent?.name || '',
        active: true
      }])
      .select()
      .single();

    if (!error && data) {
      setSubCategories((prev) => [...prev, data]);
      setSubCatName('');
      handleCloseModal();
    }
  };

  const handleSaveVariant = async (table: 'colours' | 'sizes' | 'fabrics') => {
    if (!variantNameInput.trim()) return;
    const nameVal = variantNameInput.trim();
    const prefix = table === 'colours' ? 'col' : table === 'sizes' ? 'sz' : 'fab';
    const id = makeId(prefix);

    const payload: any = { id, name: nameVal };
    if (table !== 'fabrics') payload.active = true;

    if (table === 'sizes' && sizeCategoryId) {
      payload.category_id = sizeCategoryId;
      const catObj = categories.find((c) => String(c.id) === String(sizeCategoryId));
      if (catObj) payload.category_name = catObj.name;
    }

    const { data, error } = await supabase.from(table).insert([payload]).select().single();
    if (!error && data) {
      if (table === 'colours') setColours((prev) => [...prev, data]);
      if (table === 'sizes') setSizes((prev) => [...prev, data]);
      if (table === 'fabrics') setFabrics((prev) => [...prev, data]);
      setVariantNameInput('');
      setSizeCategoryId('');
      handleCloseModal();
    }
  };

  const toggleSelection = (item: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        let finalUrl = '';
        if (!uploadError) {
          const { data: publicData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
          finalUrl = publicData.publicUrl;
        } else {
          finalUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }

        const defaultTag = selectedColors.length > 0 ? selectedColors[0] : (colours[0]?.name || 'General');
        const newImg: TaggedImage = {
          id: `${Date.now()}_${i}`,
          url: finalUrl,
          color_tag: defaultTag
        };

        setImages((prev) => [...prev, newImg]);
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to upload image.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateImageColorTag = (imgId: string, newTag: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === imgId ? { ...img, color_tag: newTag } : img))
    );
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProduct(true);
    setProductError(null);

    try {
      const selectedCatObj = categories.find((c) => String(c.id) === String(selectedCategory));
      const selectedSubCatObj = subCategories.find((sc) => String(sc.id) === String(selectedSubCategory));

      const productPayload = {
        id: `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        product_code: productCode,
        name: name.trim(),
        description: description.trim(),
        department: brand,
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
      if (error) throw error;

      setName('');
      setDescription('');
      setSelectedCategory('');
      setSelectedSubCategory('');
      setSelectedColors([]);
      setSelectedSizes([]);
      setSelectedFabrics([]);
      setOpeningStock(0);
      setImages([]);
      handleCloseModal();
      alert(`Product ${productCode} saved successfully!`);
    } catch (err: any) {
      setProductError(err.message || 'Failed to save product record.');
    } finally {
      setSubmittingProduct(false);
    }
  };

  const selectedCatObject = categories.find((c) => String(c.id) === String(selectedCategory));
  const filteredSubCategories = subCategories.filter((sub) => {
    if (!selectedCategory) return false;
    const matchById = String(sub.category_id).trim() === String(selectedCategory).trim();
    const matchByName = selectedCatObject && sub.category_name
      ? sub.category_name.trim().toLowerCase() === selectedCatObject.name.trim().toLowerCase()
      : false;
    return matchById || matchByName;
  });

  const filteredSizes = sizes.filter((sz) => {
    if (!selectedCategory) return true;
    if (!sz.category_id && !sz.category_name) return true;
    const matchById = String(sz.category_id).trim() === String(selectedCategory).trim();
    const matchByName = selectedCatObject && sz.category_name
      ? sz.category_name.trim().toLowerCase() === selectedCatObject.name.trim().toLowerCase()
      : false;
    return matchById || matchByName;
  });

  if (!activeModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs select-none font-sans animate-in fade-in">
      {activeModal === 'product' && (
        <div className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#dce6e1] space-y-4 text-xs">
          <div className="flex justify-between items-center border-b border-[#edf2ef] pb-3 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#0b3b2c]" />
              <div>
                <h2 className="text-base font-bold text-[#0b3b2c]">Product Master Creator</h2>
                <span className="text-[10px] text-[#4d6960]">Create retail catalog item with code and live masters</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-[#f0f4f2] px-4 py-1.5 rounded-xl border border-[#dce6e1] text-right">
                <span className="text-[8px] font-bold uppercase tracking-wider text-[#4d6960] block">PRODUCT CODE</span>
                <span className="font-mono text-sm font-bold text-[#0b3b2c]">
                  {codeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : productCode}
                </span>
              </div>
              <button onClick={handleCloseModal} className="p-1 rounded-full hover:bg-neutral-100 cursor-pointer">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
          </div>

          {productError && (
            <div className="p-3 rounded-xl border bg-rose-50 border-rose-200 text-rose-800 text-xs font-bold">
              {productError}
            </div>
          )}

          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#0b3b2c] block mb-1.5">Brand *</label>
              <div className="inline-flex p-1 bg-[#f0f4f2] rounded-2xl border border-[#dce6e1] w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setBrand('fashions')}
                  className={`flex-1 sm:flex-initial px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    brand === 'fashions'
                      ? 'bg-[#0b3b2c] text-white shadow-xs'
                      : 'text-[#4d6960] hover:text-[#0b3b2c]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Fashion</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBrand('jewellery')}
                  className={`flex-1 sm:flex-initial px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    brand === 'jewellery'
                      ? 'bg-[#0b3b2c] text-white shadow-xs'
                      : 'text-[#4d6960] hover:text-[#0b3b2c]'
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
                  placeholder="Weaving specs, fabric blend, stone quality..."
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
                  {filteredSubCategories.map((sc) => (
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
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
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
              <span className="text-xs font-bold text-[#0b3b2c] block uppercase tracking-wider">
                Select Variants
              </span>

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
                        {active && <Check className="w-2.5 h-2.5 text-[#e5c07b]" />}
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-neutral-600 block mb-1">Sizes:</span>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {filteredSizes.length > 0 ? (
                    filteredSizes.map((s) => {
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
                          {active && <Check className="w-2.5 h-2.5 text-[#e5c07b]" />}
                          <span>{s.name}</span>
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-[10px] text-neutral-400 italic">No sizes mapped.</span>
                  )}
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
                        {active && <Check className="w-2.5 h-2.5 text-[#e5c07b]" />}
                        <span>{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#dce6e1] space-y-3">
              <div>
                <span className="text-xs font-bold text-[#0b3b2c] block uppercase tracking-wider">
                  Product Images & Colour Tagging
                </span>
                <p className="text-[10px] text-[#4d6960] mt-0.5">
                  Upload product photos directly. Once uploaded, tag each photo to its variant colour below.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="product-file-input"
                />
                <label
                  htmlFor="product-file-input"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#dce6e1] hover:border-[#0b3b2c] text-[#0b3b2c] font-bold text-xs shadow-2xs transition-all cursor-pointer"
                >
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0b3b2c]" />
                  ) : (
                    <Upload className="w-4 h-4 text-[#e5c07b]" />
                  )}
                  <span>{uploadingImage ? 'Uploading Photos...' : 'Choose Product Images'}</span>
                </label>
                <span className="text-[11px] text-neutral-400">Supports JPG, PNG, WEBP</span>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                  {images.map((img) => (
                    <div key={img.id} className="rounded-2xl border border-[#dce6e1] bg-white overflow-hidden shadow-xs flex flex-col justify-between">
                      <div className="relative group h-28 bg-[#f0f4f2]">
                        <img src={img.url} alt="Variant" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.id)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="p-2 border-t border-[#edf2ef] bg-[#fbfcfc] space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#4d6960] block">Tag To Colour:</span>
                        <select
                          value={img.color_tag}
                          onChange={(e) => handleUpdateImageColorTag(img.id, e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-[#dce6e1] bg-white text-[11px] font-bold text-[#0b3b2c] outline-none"
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
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl text-neutral-500 hover:bg-neutral-100 cursor-pointer font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingProduct}
                className="px-6 py-2 rounded-xl bg-[#0b3b2c] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submittingProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-[#e5c07b]" />}
                <span>Save Product Master</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {activeModal === 'category' && (
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#dce6e1] space-y-3 text-xs">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-bold text-[#0b3b2c]">Add Main Category</h3>
            <button onClick={handleCloseModal}><X className="w-4 h-4 text-neutral-400" /></button>
          </div>
          <form onSubmit={handleSaveCategory} className="space-y-3">
            <div>
              <label className="font-bold text-neutral-600 block mb-1">Category Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Sarees"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-neutral-600 block mb-1">Brand</label>
              <select
                value={catDept}
                onChange={(e) => setCatDept(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
              >
                <option value="fashions">Fashion</option>
                <option value="jewellery">Jewellery</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={handleCloseModal} className="px-3 py-1.5 rounded-full text-neutral-500">Cancel</button>
              <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0b3b2c] text-white font-bold">Save Category</button>
            </div>
          </form>
        </div>
      )}

      {activeModal === 'subcategory' && (
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#dce6e1] space-y-3 text-xs">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-bold text-[#0b3b2c]">Add Sub-Category</h3>
            <button onClick={handleCloseModal}><X className="w-4 h-4 text-neutral-400" /></button>
          </div>
          <form onSubmit={handleSaveSubCategory} className="space-y-3">
            <div>
              <label className="font-bold text-neutral-600 block mb-1">Select Parent Category *</label>
              <select
                required
                value={subCatParentId}
                onChange={(e) => setSubCatParentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none font-semibold"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-neutral-600 block mb-1">Sub-Category Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Kanchipuram Silk"
                value={subCatName}
                onChange={(e) => setSubCatName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none font-semibold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={handleCloseModal} className="px-3 py-1.5 rounded-full text-neutral-500">Cancel</button>
              <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0b3b2c] text-white font-bold">Save Sub-Category</button>
            </div>
          </form>
        </div>
      )}

      {(activeModal === 'colours' || activeModal === 'sizes' || activeModal === 'fabrics') && (
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#dce6e1] space-y-3 text-xs">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-bold text-[#0b3b2c] uppercase">Add New {activeModal.slice(0, -1)}</h3>
            <button onClick={handleCloseModal}><X className="w-4 h-4 text-neutral-400" /></button>
          </div>
          <div className="space-y-3">
            {activeModal === 'sizes' && (
              <div>
                <label className="font-bold text-neutral-600 block mb-1">Map To Category</label>
                <select
                  value={sizeCategoryId}
                  onChange={(e) => setSizeCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none font-semibold"
                >
                  <option value="">-- Universal (All Categories) --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="font-bold text-neutral-600 block mb-1 uppercase">{activeModal.slice(0, -1)} Name *</label>
              <input
                type="text"
                required
                placeholder={
                  activeModal === 'colours'
                    ? 'e.g. Rani Pink'
                    : activeModal === 'sizes'
                    ? 'e.g. 30B, 2.4, XL'
                    : 'e.g. Pure Georgette'
                }
                value={variantNameInput}
                onChange={(e) => setVariantNameInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none font-semibold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={handleCloseModal} className="px-3 py-1.5 rounded-full text-neutral-500">Cancel</button>
              <button
                type="button"
                onClick={() => handleSaveVariant(activeModal as 'colours' | 'sizes' | 'fabrics')}
                className="px-4 py-1.5 rounded-full bg-[#0b3b2c] text-white font-bold cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}