import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Package,
  Building2,
  Tag,
  Save,
  Loader2,
  X,
  HardDrive,
  Layers,
  Palette,
  Ruler,
  Scissors,
  Check,
  Upload,
  AlertCircle,
  Search,
  ChevronDown,
  CheckSquare,
  Square
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { CategoryRecord, SubCategoryRecord, ColourRecord, SizeRecord, FabricRecord, UnitRecord } from '../../types';
import { compressImageToWebP } from '../../utils/imageOptimizer';

interface ProductMasterModalProps {
  onClose: () => void;
}

interface TaggedImage {
  id: string;
  url: string;
  color_tag: string;
  size_bytes?: string;
}

// Helper to determine brightness of hex color for text contrast
function isColorLight(hexInput?: string | null): boolean {
  if (!hexInput) return false;
  let hex = hexInput.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map((char) => char + char).join('');
  }
  if (hex.length !== 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
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
  const [images, setImages] = useState<TaggedImage[]>([]);

  // Sub-Category Searchable Dropdown state
  const [isSubCatDropdownOpen, setIsSubCatDropdownOpen] = useState<boolean>(false);
  const [subCatSearch, setSubCatSearch] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fast WebP Compression Upload state
  const [isCompressingQuickUpload, setIsCompressingQuickUpload] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSubCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load all Masters from Supabase DB
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [catRes, subCatRes, colRes, sizeRes, fabRes, unitRes] = await Promise.all([
          supabase.from('categories').select('*').eq('active', true).order('name'),
          supabase.from('sub_categories').select('*').eq('active', true).order('name'),
          supabase.from('colours').select('*').eq('active', true).order('name'),
          supabase.from('sizes').select('*').eq('active', true).order('display_order', { ascending: true }),
          supabase.from('fabrics').select('*').eq('active', true).order('name'),
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

  // Generate Next Product Code automatically
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

  // Filter Categories by selected Brand - applicable for Fashions
  const filteredCategories = useMemo(() => {
    if (brand === 'jewellery') return [];
    return categories.filter((c) => {
      const dept = (c.department || '').toLowerCase().trim();
      return !dept || dept === 'fashions' || dept === 'fashion' || dept === 'apparel';
    });
  }, [categories, brand]);

  // Filter Sub-Categories for Fashion and Jewellery
  const filteredSubCats = useMemo(() => {
    if (brand === 'jewellery') {
      const jewelleryCategoryIds = new Set(
        categories
          .filter((c) => {
            const dept = (c.department || '').toLowerCase().trim();
            const cName = (c.name || '').toLowerCase().trim();
            return dept.includes('jewel') || cName.includes('jewel');
          })
          .map((c) => String(c.id))
      );

      let list = subCategories.filter((sc) => {
        const scDept = ((sc as any).department || '').toLowerCase().trim();
        if (scDept.includes('jewel')) return true;
        if (sc.category_id && jewelleryCategoryIds.has(String(sc.category_id))) return true;
        return false;
      });

      if (list.length === 0) {
        list = subCategories.filter((sc) => {
          const parent = categories.find((c) => String(c.id) === String(sc.category_id));
          const parentName = (parent?.name || '').toLowerCase();
          const scName = (sc.name || '').toLowerCase();
          return (
            parentName.includes('jewel') ||
            parentName.includes('bangle') ||
            scName.includes('bangle') ||
            scName.includes('necklace') ||
            scName.includes('earring') ||
            scName.includes('chain') ||
            scName.includes('ring')
          );
        });
      }

      if (list.length === 0 && subCategories.length > 0) {
        list = subCategories.filter((sc) => {
          const parent = categories.find((c) => String(c.id) === String(sc.category_id));
          const parentDept = (parent?.department || '').toLowerCase();
          return parentDept !== 'fashions' && parentDept !== 'apparel';
        });
      }

      return [...list].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
      );
    }

    if (!selectedCategory) return [];
    const list = subCategories.filter((sc) => String(sc.category_id) === String(selectedCategory));
    return [...list].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
  }, [subCategories, selectedCategory, brand, categories]);

  // Live Filter for Sub-Category Dropdown Search
  const searchedSubCats = useMemo(() => {
    if (!subCatSearch.trim()) return filteredSubCats;
    return filteredSubCats.filter((sc) =>
      sc.name.toLowerCase().includes(subCatSearch.toLowerCase())
    );
  }, [filteredSubCats, subCatSearch]);

  const activeSubCategoryObj = useMemo(() => {
    return subCategories.find((sc) => String(sc.id) === String(selectedSubCategory));
  }, [subCategories, selectedSubCategory]);

  const availableSizes = useMemo(() => {
    if (!selectedSubCategory) return [];

    const directMatches = sizes.filter(
      (sz) => sz.sub_category_id && String(sz.sub_category_id) === String(selectedSubCategory)
    );
    if (directMatches.length > 0) return directMatches;

    if (activeSubCategoryObj?.size_group) {
      const targetGroup = activeSubCategoryObj.size_group.toLowerCase().trim();
      const groupMatches = sizes.filter(
        (sz) => (sz.size_group || '').toLowerCase().trim() === targetGroup
      );
      if (groupMatches.length > 0) return groupMatches;
    }

    return [];
  }, [sizes, selectedSubCategory, activeSubCategoryObj]);

  const toggleSelection = (item: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleToggleAllSizes = () => {
    if (selectedSizes.length === availableSizes.length && availableSizes.length > 0) {
      setSelectedSizes([]);
    } else {
      setSelectedSizes(availableSizes.map((s) => s.name));
    }
  };

  const handleQuickImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressingQuickUpload(true);
    try {
      const defaultTag = selectedColors[0] || colours[0]?.name || 'Universal';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await compressImageToWebP(file, 1400, 0.88);

        const fileName = `prod_${Date.now()}_${i}.webp`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('store_assets')
          .upload(filePath, result.blob, {
            contentType: 'image/webp',
            upsert: true
          });

        let finalUrl = result.dataUrl;
        if (!uploadError) {
          const { data } = supabase.storage.from('store_assets').getPublicUrl(filePath);
          finalUrl = data.publicUrl;
        }

        setImages((prev) => [
          ...prev,
          {
            id: `${Date.now()}_${i}`,
            url: finalUrl,
            color_tag: defaultTag,
            size_bytes: result.sizeFormatted
          }
        ]);
      }
    } catch (err: any) {
      console.error('Quick upload compression failed:', err);
      setErrorMsg('Image compression failed.');
    } finally {
      setIsCompressingQuickUpload(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const subCatObj = subCategories.find((sc) => String(sc.id) === String(selectedSubCategory));
      
      let catId = selectedCategory || null;
      let catName = null;

      if (brand === 'jewellery') {
        catId = subCatObj?.category_id ? String(subCatObj.category_id) : null;
        const parentCat = categories.find((c) => String(c.id) === String(catId));
        catName = parentCat?.name || 'Jewellery';
      } else {
        const catObj = categories.find((c) => String(c.id) === String(selectedCategory));
        catName = catObj?.name || null;
      }

      const payload = {
        id: `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        product_code: productCode,
        name: name.trim(),
        description: description.trim(),
        department: brand,
        category_id: catId,
        category_name: catName,
        sub_category_id: selectedSubCategory || null,
        sub_category_name: subCatObj?.name || null,
        unit_id: selectedUnit || null,
        stock_quantity: 0,
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

      const { error } = await supabase.from('products').insert([payload]);
      if (error) throw error;

      alert(`Product ${productCode} saved successfully! Stock will be managed via Purchase Inward.`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 bg-[#0a0e17]/85 backdrop-blur-xl select-none font-sans animate-in fade-in">
      <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(109,74,255,0.2)] border border-white/10 space-y-4 text-xs relative">
        
        {/* Top Neon Ambient Line */}
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
                <span className="px-2 py-0.5 rounded-full bg-[#6d4aff]/20 text-[#00d9ff] border border-[#6d4aff]/40 text-[9px] font-mono uppercase">
                  Catalog Setup
                </span>
              </h2>
              <span className="text-[10px] text-[#8b9bb4]">
                Universal colors with strictly linked Sub-Category size groups
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#0a0e17]/90 px-4 py-1.5 rounded-2xl border border-white/15 text-right shadow-inner min-w-[125px]">
              <span className="text-[8.5px] font-mono font-bold uppercase tracking-wider text-[#8b9bb4] block">PRODUCT CODE</span>
              <span className="font-mono text-base font-extrabold text-[#00ff9d] tracking-wide leading-tight block">
                {codeLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#00d9ff] ml-auto" /> : productCode}
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
          
          {/* Brand Domain Selector */}
          <div>
            <label className="text-[10.5px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1.5">
              Brand Domain *
            </label>
            <div className="inline-flex p-1 bg-[#0a0e17]/80 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setBrand('fashions');
                  setSelectedCategory('');
                  setSelectedSubCategory('');
                  setSelectedSizes([]);
                  setSubCatSearch('');
                }}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  brand === 'fashions'
                    ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-md shadow-[#6d4aff]/40'
                    : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Fashion</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBrand('jewellery');
                  setSelectedCategory('');
                  setSelectedSubCategory('');
                  setSelectedSizes([]);
                  setSubCatSearch('');
                }}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  brand === 'jewellery'
                    ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-md shadow-[#6d4aff]/40'
                    : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-[#00d9ff]" />
                <span>Jewellery</span>
              </button>
            </div>
          </div>

          {/* Title & Description */}
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
                placeholder="e.g. Daily Comfort Cotton Bra / Antique Kundan Necklace Set"
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
                placeholder="Fabric composition, care instructions, fit notes..."
                className="w-full px-3.5 py-2 rounded-2xl border border-white/10 bg-[#0a0e17]/80 font-medium text-white outline-none focus:border-[#00d9ff] transition-colors placeholder:text-slate-600 resize-none"
              />
            </div>
          </div>

          {/* Category / Sub-Category / Unit */}
          <div className={`grid grid-cols-1 ${brand === 'fashions' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
            
            {/* Category: Only for Fashion */}
            {brand === 'fashions' && (
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
                    setSubCatSearch('');
                  }}
                  className="w-full px-3 py-2.5 rounded-2xl border border-white/10 bg-[#0a0e17] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors cursor-pointer [&>option]:bg-[#101628] [&>option]:text-white"
                >
                  <option value="">Select Category</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sub-Category Searchable Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                <span>{brand === 'jewellery' ? 'Jewellery Sub-Category *' : 'Sub-Category *'}</span>
                <span className="text-[8.5px] text-[#00d9ff] font-bold">A-Z SEARCH ({filteredSubCats.length})</span>
              </label>
              
              <div
                onClick={() => {
                  if (brand === 'jewellery' || selectedCategory) {
                    setIsSubCatDropdownOpen(!isSubCatDropdownOpen);
                  }
                }}
                className={`w-full px-3 py-2.5 rounded-2xl border border-white/10 bg-[#0a0e17] font-semibold text-white flex items-center justify-between cursor-pointer transition-colors ${
                  brand === 'fashions' && !selectedCategory ? 'opacity-40 cursor-not-allowed' : 'hover:border-[#00d9ff]/50'
                }`}
              >
                <span className="truncate">
                  {activeSubCategoryObj
                    ? activeSubCategoryObj.name
                    : (brand === 'jewellery' ? 'Select Jewellery Item' : (selectedCategory ? 'Select Sub-Category' : 'Select Category 1st'))}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#8b9bb4] transition-transform ${isSubCatDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isSubCatDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#101628] border border-white/15 rounded-2xl p-2 shadow-2xl space-y-1.5 animate-in fade-in">
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      value={subCatSearch}
                      onChange={(e) => setSubCatSearch(e.target.value)}
                      placeholder={brand === 'jewellery' ? 'Search jewellery sub-category...' : 'Search sub-category...'}
                      className="w-full pl-7 pr-2.5 py-1.5 bg-[#0a0e17] rounded-xl text-white text-[10.5px] outline-none border border-white/10 focus:border-[#00d9ff] placeholder:text-[#8b9bb4]/50"
                    />
                    <Search className="w-3 h-3 text-[#8b9bb4] absolute left-2 top-1/2 -translate-y-1/2" />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                    {searchedSubCats.length === 0 ? (
                      <div className="p-2 text-center text-[#8b9bb4] text-[9.5px] italic">
                        No matching items found.
                      </div>
                    ) : (
                      searchedSubCats.map((sc) => (
                        <div
                          key={sc.id}
                          onClick={() => {
                            setSelectedSubCategory(sc.id);
                            setSelectedSizes([]);
                            setIsSubCatDropdownOpen(false);
                            setSubCatSearch('');
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-[10.5px] font-medium cursor-pointer transition-colors flex items-center justify-between ${
                            selectedSubCategory === sc.id
                              ? 'bg-[#6d4aff]/30 text-[#00d9ff] font-bold'
                              : 'text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="truncate">{sc.name}</span>
                          {selectedSubCategory === sc.id && <Check className="w-3 h-3 text-[#00d9ff]" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Unit */}
            <div>
              <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1.5">
                Unit *
              </label>
              <select
                required
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border border-white/10 bg-[#0a0e17] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors cursor-pointer [&>option]:bg-[#101628] [&>option]:text-white"
              >
                <option value="">Select Unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Variants Matrix */}
          <div className="p-4 bg-[#0a0e17]/60 rounded-3xl border border-white/10 space-y-4">
            <span className="text-[11px] font-mono font-bold text-[#00d9ff] block uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Product Variants Matrix
            </span>
            
            {/* UNIVERSAL COLOURS WITH DYNAMIC COLOR PREVIEW ON SELECTION */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-[#8b9bb4] flex items-center gap-1">
                  <Palette className="w-3 h-3 text-[#ff6b6b]" /> Colours (Universal Selection):
                </span>
                <span className="text-[9px] font-mono text-[#8b9bb4]">
                  {selectedColors.length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                {colours.map((c) => {
                  const active = selectedColors.includes(c.name);
                  const rawHex = (c as any).hex || (c as any).code || (c as any).color_code || '';
                  const validHex = rawHex.startsWith('#') ? rawHex : (rawHex ? `#${rawHex}` : '');
                  const isLight = isColorLight(validHex);

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSelection(c.name, selectedColors, setSelectedColors)}
                      style={
                        active && validHex
                          ? {
                              backgroundColor: validHex,
                              borderColor: validHex,
                              color: isLight ? '#0a0e17' : '#ffffff',
                              boxShadow: `0 4px 14px ${validHex}55`
                            }
                          : {}
                      }
                      className={`px-3 py-1.5 rounded-xl text-[10.5px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                        active
                          ? validHex
                            ? '' // Handled by inline style
                            : 'bg-[#6d4aff] text-white border-[#6d4aff] shadow-md shadow-[#6d4aff]/40'
                          : 'bg-[#151c33] text-[#8b9bb4] border-white/10 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {/* Color Preview Swatch */}
                      {validHex && (
                        <span
                          className={`w-2.5 h-2.5 rounded-full border shrink-0 transition-transform ${
                            active
                              ? isLight ? 'border-black/30 scale-110' : 'border-white/40 scale-110'
                              : 'border-white/20'
                          }`}
                          style={{ backgroundColor: validHex }}
                        />
                      )}
                      
                      {active && (
                        <Check className={`w-3 h-3 ${validHex && isLight ? 'text-black' : 'text-[#00ff9d]'}`} />
                      )}
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STRICTLY LINKED SUB-CATEGORY SIZES */}
            <div className="p-3.5 bg-[#101628] rounded-2xl border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-mono font-bold text-[#00d9ff] flex items-center gap-1 uppercase tracking-wider">
                    <Ruler className="w-3.5 h-3.5" /> Available Sizes:
                  </span>
                  {activeSubCategoryObj && (
                    <span className="text-[9px] font-mono text-[#00ff9d] bg-[#00ff9d]/10 px-2 py-0.5 rounded-md border border-[#00ff9d]/30 font-bold">
                      Group: {activeSubCategoryObj.size_group || 'General'}
                    </span>
                  )}
                </div>

                {availableSizes.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleAllSizes}
                    className="text-[9.5px] font-mono text-[#00d9ff] hover:text-[#00ff9d] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {selectedSizes.length === availableSizes.length ? (
                      <>
                        <CheckSquare className="w-3 h-3 text-[#00ff9d]" />
                        <span>Deselect All</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3 h-3" />
                        <span>Select All ({availableSizes.length})</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[42px] items-center">
                {!selectedSubCategory ? (
                  <span className="text-[10.5px] text-[#8b9bb4] italic py-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-[#ffa500]" />
                    {brand === 'jewellery'
                      ? 'Select Jewellery Sub-Category above to load its linked size group.'
                      : 'Select Category and Sub-Category above to load its linked size group.'}
                  </span>
                ) : availableSizes.length === 0 ? (
                  <span className="text-[10.5px] text-[#ffa500] italic py-1">
                    No sizes registered under this Sub-Category ({activeSubCategoryObj?.name}) size group.
                  </span>
                ) : (
                  availableSizes.map((s) => {
                    const active = selectedSizes.includes(s.name);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSelection(s.name, selectedSizes, setSelectedSizes)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                          active
                            ? 'bg-[#00d9ff] text-neutral-950 border-[#00d9ff] shadow-md shadow-[#00d9ff]/30'
                            : 'bg-[#151c33] text-[#8b9bb4] border-white/10 hover:text-white'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 text-neutral-950" />}
                        <span>{s.name}</span>
                      </button>
                    );
                  })
                )}
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

          {/* Product Assets & HD WebP Compression */}
          <div className="p-4 bg-[#0a0e17]/60 rounded-3xl border border-white/10 space-y-3.5">
            <div>
              <span className="text-[11px] font-mono font-bold text-white block uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-[#00d9ff]" /> Product Assets & HD WebP Compression
              </span>
              <p className="text-[10px] text-[#8b9bb4] mt-0.5">
                Images are automatically compressed to lossless WebP (&lt;150KB) and stored in Supabase.
              </p>
            </div>

            {/* Upload Action */}
            <div className="flex items-center gap-2.5">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs cursor-pointer transition-all">
                {isCompressingQuickUpload ? (
                  <Loader2 className="w-4 h-4 text-[#00d9ff] animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-[#00ff9d]" />
                )}
                <span>Fast Upload (Auto-WebP)</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleQuickImageUpload}
                  disabled={isCompressingQuickUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Gallery Grid */}
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
                      {img.size_bytes && (
                        <span className="absolute bottom-1.5 left-1.5 text-[8.5px] font-mono bg-black/75 text-[#00ff9d] px-1.5 py-0.5 rounded-md border border-white/10">
                          {img.size_bytes}
                        </span>
                      )}
                    </div>
                    <div className="p-2 bg-[#151c33] border-t border-white/10">
                      <select
                        value={img.color_tag}
                        onChange={(e) => {
                          const val = e.target.value;
                          setImages(images.map((im) => im.id === img.id ? { ...im, color_tag: val } : im));
                        }}
                        className="w-full px-2 py-1 rounded-xl border border-white/10 bg-[#0a0e17] text-[10.5px] font-semibold text-white outline-none focus:border-[#00d9ff] [&>option]:bg-[#101628] [&>option]:text-white"
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
              disabled={submitting || isCompressingQuickUpload}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white font-bold flex items-center gap-2 shadow-lg shadow-[#6d4aff]/30 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
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
  );
}