import React, { useEffect, useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Tag,
  Palette,
  Ruler,
  Scissors,
  IndianRupee,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  Eye,
  AlertTriangle,
  X,
  Sparkles,
  RefreshCw,
  Scale,
  Check,
  ChevronDown,
  Boxes,
  HelpCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  CategoryRecord,
  SubCategoryRecord,
  ColourRecord,
  SizeRecord,
  FabricRecord,
  UnitRecord,
  AdminStaffUser
} from '../types';

interface ProductRecord {
  id: string;
  name: string;
  category: string;
  sub_category?: string;
  colour?: string;
  size?: string;
  fabric?: string;
  unit?: string;
  brand?: string;
  model_no?: string;
  barcode?: string;
  selling_price: number;
  cost_price?: number;
  mrp?: number;
  gst?: number;
  weight?: number;
  weight_unit?: string;
  stock_quantity: number;
  low_stock_threshold?: number;
  images: any;
  variants?: any;
  description?: string;
  active: boolean;
  created_at?: string;
}

interface AdminProductsProps {
  currentUser: AdminStaffUser | null;
}

// Visual Color Swatch mapping for clean UI display
const COLOR_HEX_MAP: Record<string, string> = {
  'black': '#171717',
  'white': '#ffffff',
  'red': '#dc2626',
  'baby pink': '#fbcfe8',
  'pink': '#ec4899',
  'rani pink': '#db2777',
  'maroon': '#831843',
  'beige': '#f5f5dc',
  'dark green': '#14532d',
  'green': '#16a34a',
  'grey': '#737373',
  'mustard yellow': '#eab308',
  'musturd yellow': '#eab308',
  'yellow': '#facc15',
  'navy blue': '#1e3a8a',
  'peach': '#ffedd5',
  'sky blue': '#38bdf8',
  'blue': '#2563eb',
  'turquoise': '#06b6d4',
  'violet': '#7c3aed',
  'purple': '#9333ea',
  'orange': '#ea580c',
  'gold': '#d97706',
  'silver': '#94a3b8'
};

const getColorHex = (colorName: string): string => {
  const clean = colorName.trim().toLowerCase();
  return COLOR_HEX_MAP[clean] || '#0b3b2c';
};

export default function AdminProducts({ currentUser }: AdminProductsProps) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Masters Data for Dynamic Dropdowns
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryRecord[]>([]);
  const [colours, setColours] = useState<ColourRecord[]>([]);
  const [sizes, setSizes] = useState<SizeRecord[]>([]);
  const [fabrics, setFabrics] = useState<FabricRecord[]>([]);
  const [units, setUnits] = useState<UnitRecord[]>([]);

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sizeFilterTab, setSizeFilterTab] = useState<'all' | 'bangles' | 'apparel' | 'cups'>('all');

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [fabric, setFabric] = useState('');
  const [unit, setUnit] = useState('Piece');
  const [brand, setBrand] = useState('Kashvi');
  const [mrp, setMrp] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [gst, setGst] = useState<number | ''>(0);
  const [weight, setWeight] = useState<number | ''>(500);
  const [weightUnit, setWeightUnit] = useState('grams');
  const [stockQuantity, setStockQuantity] = useState<number | ''>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number | ''>(3);
  const [description, setDescription] = useState('');

  // Multi-variant Selection
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  // Image URLs
  const [imageInput, setImageInput] = useState('');
  const [imagesList, setImagesList] = useState<string[]>([]);

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const canDelete = currentUser?.role === 'admin';

  // Load Products and Masters Data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const { data: prodData, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (prodData) {
        setProducts(prodData);
      }

      const [catsRes, subCatsRes, colsRes, sizesRes, fabsRes, unitsRes] = await Promise.all([
        supabase.from('categories').select('*').eq('active', true).order('name'),
        supabase.from('sub_categories').select('*').eq('active', true).order('name'),
        supabase.from('colours').select('*').eq('active', true).order('name'),
        supabase.from('sizes').select('*').eq('active', true).order('name'),
        supabase.from('fabrics').select('*').order('name'),
        supabase.from('units').select('*').eq('active', true).order('name')
      ]);

      if (catsRes.data) setCategories(catsRes.data);
      if (subCatsRes.data) setSubCategories(subCatsRes.data);
      if (colsRes.data) setColours(colsRes.data);
      if (sizesRes.data) setSizes(sizesRes.data);
      if (fabsRes.data) setFabrics(fabsRes.data);
      if (unitsRes.data) setUnits(unitsRes.data);
    } catch (err) {
      console.error('Error fetching catalog data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const availableSubCategories = useMemo(() => {
    if (!category) return [];
    const parentCat = categories.find((c) => c.name === category);
    if (!parentCat) return subCategories;
    return subCategories.filter((s) => s.category_id === parentCat.id || s.category_name === category);
  }, [category, categories, subCategories]);

  // Organize sizes by smart sub-types (Bangles: 2.2, 2.4 / Apparel: S, M, L / Lingerie: 32B)
  const categorizedSizes = useMemo(() => {
    const bangles: SizeRecord[] = [];
    const apparel: SizeRecord[] = [];
    const cups: SizeRecord[] = [];
    const others: SizeRecord[] = [];

    sizes.forEach((s) => {
      const n = s.name.trim();
      if (/^\d+(\.\d+)?$/.test(n) || n.includes('.')) {
        bangles.push(s);
      } else if (['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size'].includes(n.toUpperCase())) {
        apparel.push(s);
      } else if (/\d+[A-Za-z]/.test(n)) {
        cups.push(s);
      } else {
        others.push(s);
      }
    });

    return { bangles, apparel, cups, others };
  }, [sizes]);

  const displayedSizes = useMemo(() => {
    if (sizeFilterTab === 'bangles') return categorizedSizes.bangles;
    if (sizeFilterTab === 'apparel') return categorizedSizes.apparel;
    if (sizeFilterTab === 'cups') return categorizedSizes.cups;
    return sizes;
  }, [sizeFilterTab, categorizedSizes, sizes]);

  const toggleColor = (colName: string) => {
    setSelectedColors((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  };

  const toggleSize = (szName: string) => {
    setSelectedSizes((prev) =>
      prev.includes(szName) ? prev.filter((s) => s !== szName) : [...prev, szName]
    );
  };

  const handleAddImage = () => {
    if (!imageInput.trim()) return;
    setImagesList((prev) => [...prev, imageInput.trim()]);
    setImageInput('');
  };

  const handleRemoveImage = (index: number) => {
    setImagesList((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setName('');
    setCategory('');
    setSubCategory('');
    setFabric('');
    setUnit('Piece');
    setBrand('Kashvi');
    setMrp('');
    setSellingPrice('');
    setCostPrice('');
    setGst(0);
    setWeight(500);
    setWeightUnit('grams');
    setStockQuantity(10);
    setLowStockThreshold(3);
    setDescription('');
    setSelectedColors([]);
    setSelectedSizes([]);
    setImagesList([]);
    setImageInput('');
    setSizeFilterTab('all');
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category || sellingPrice === '') {
      alert('Please fill in Product Name, Category, and Selling Price.');
      return;
    }

    setSaving(true);
    try {
      const productId = `KF${Math.floor(1000 + Math.random() * 9000)}`;

      const newProductPayload = {
        id: productId,
        name: name.trim(),
        category,
        sub_category: subCategory || null,
        colour: selectedColors.join(', ') || null,
        size: selectedSizes.join(', ') || null,
        fabric: fabric || null,
        unit: unit || 'Piece',
        brand: brand || 'Kashvi',
        mrp: Number(mrp) || Number(sellingPrice),
        selling_price: Number(sellingPrice),
        cost_price: Number(costPrice) || 0,
        gst: Number(gst) || 0,
        weight: Number(weight) || 0,
        weight_unit: weightUnit,
        stock_quantity: Number(stockQuantity) || 0,
        low_stock_threshold: Number(lowStockThreshold) || 3,
        images: imagesList.length > 0 ? imagesList : ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80'],
        variants: {
          colors: selectedColors,
          sizes: selectedSizes,
          fabric: fabric || null
        },
        description: description.trim(),
        active: true,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('products')
        .insert([newProductPayload])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setProducts((prev) => [data, ...prev]);
        resetForm();
        setIsModalOpen(false);
      }
    } catch (err: any) {
      console.error('Error creating product:', err);
      alert('Failed to create product: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (productId: string, currentActive: boolean) => {
    if (!canEdit) return;
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: !currentActive })
        .eq('id', productId);

      if (!error) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, active: !currentActive } : p))
        );
      }
    } catch (e) {
      console.error('Failed to toggle status:', e);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!canDelete) {
      alert('Only Admin can delete products.');
      return;
    }
    if (!confirm('Permanently delete this product from database?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (!error) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      }
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  // Safe Image Extractor for Postgres text/jsonb array
  const extractFirstImage = (imgData: any): string | null => {
    if (!imgData) return null;
    if (Array.isArray(imgData) && imgData.length > 0) return imgData[0];
    if (typeof imgData === 'string') {
      try {
        const parsed = JSON.parse(imgData);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
        if (imgData.startsWith('http')) return imgData;
      } catch {
        if (imgData.startsWith('http')) return imgData;
      }
    }
    return null;
  };

  // Safe Variants Extractor for Table Display
  const getVariantsDisplay = (p: ProductRecord) => {
    const list: { type: 'color' | 'size' | 'fabric'; value: string }[] = [];

    // Check direct columns
    if (p.colour) {
      p.colour.split(',').forEach((c) => {
        if (c.trim()) list.push({ type: 'color', value: c.trim() });
      });
    }
    if (p.size) {
      p.size.split(',').forEach((s) => {
        if (s.trim()) list.push({ type: 'size', value: s.trim() });
      });
    }
    if (p.fabric) {
      list.push({ type: 'fabric', value: p.fabric.trim() });
    }

    // Check JSON variants if empty
    if (list.length === 0 && p.variants && typeof p.variants === 'object') {
      if (Array.isArray(p.variants.colors)) {
        p.variants.colors.forEach((c: string) => list.push({ type: 'color', value: c }));
      }
      if (Array.isArray(p.variants.sizes)) {
        p.variants.sizes.forEach((s: string) => list.push({ type: 'size', value: s }));
      }
      if (p.variants.fabric) {
        list.push({ type: 'fabric', value: p.variants.fabric });
      }
    }

    return list;
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200 select-none font-sans pb-12">
      
      {/* 1. Header with Status & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4.5 rounded-2xl border border-[#e2eae6] shadow-[0_2px_12px_rgba(11,59,44,0.02)]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#e4efe9] text-[#0b3b2c] text-[9.5px] font-bold uppercase tracking-wider mb-1 border border-[#dce6e1]">
            <Sparkles className="w-2.5 h-2.5 text-[#c6933a]" /> Kashvi Product Vault
          </div>
          <h1 className="text-xl font-serif font-bold text-[#0b3b2c] leading-none">
            Product Catalog & Dynamic Variants Matrix
          </h1>
          <p className="text-[11px] text-[#4d6960] mt-1 font-medium">
            Manage colours, sizes, fabrics, pricing and live customer inventory.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadAllData}
            className="p-2 rounded-xl border border-[#dce6e1] text-[#0b3b2c] hover:bg-[#f0f4f2] transition-colors cursor-pointer"
            title="Refresh Catalog Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="px-4.5 py-2.5 rounded-full bg-[#0b3b2c] hover:bg-[#06231a] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-[#0b3b2c]/20 cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 text-[#e5c07b]" />
              <span>+ Create Product</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter & Quick Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#e2eae6] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-[#809c93] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Product Name, Code (e.g. KF0019) or Category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-3.5 py-2 rounded-xl border border-[#dce6e1] text-xs font-medium text-[#0c2b22] bg-[#f8faf9] outline-none focus:border-[#0b3b2c] focus:bg-white transition-all placeholder:text-neutral-400"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <span className="text-[11px] text-[#4d6960] font-bold">Category:</span>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl border border-[#dce6e1] text-xs font-bold text-[#0b3b2c] bg-[#f8faf9] outline-none cursor-pointer focus:border-[#0b3b2c]"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Product Catalog Table with Enhanced Variants Display */}
      <div className="bg-white rounded-2xl border border-[#e2eae6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#fbfcfc] text-[#809c93] uppercase text-[9px] font-bold tracking-wider border-b border-[#edf2ef]">
              <tr>
                <th className="py-3.5 px-4 w-[340px]">Product Description</th>
                <th className="py-3.5 px-4">Category / Group</th>
                <th className="py-3.5 px-4">Configured Variants</th>
                <th className="py-3.5 px-4">Selling Price</th>
                <th className="py-3.5 px-4">Stock Vault</th>
                <th className="py-3.5 px-4">Visibility</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ef]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-neutral-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0b3b2c]" />
                    <span>Loading Product Matrix...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-neutral-400 font-medium">
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <span>No products found matching criteria.</span>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const firstImg = extractFirstImage(p.images);
                  const isLowStock = Number(p.stock_quantity) <= Number(p.low_stock_threshold || 3);
                  const variants = getVariantsDisplay(p);

                  return (
                    <tr key={p.id} className="hover:bg-[#f8faf9] transition-colors group">
                      
                      {/* Product details & thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {firstImg ? (
                            <img
                              src={firstImg}
                              alt={p.name}
                              onError={(e) => {
                                // Fallback on broken image link
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style');
                              }}
                              className="w-11 h-13 object-cover object-top rounded-xl border border-[#dce6e1] shrink-0 bg-neutral-50 shadow-2xs"
                            />
                          ) : null}

                          <div
                            style={{ display: firstImg ? 'none' : 'flex' }}
                            className="w-11 h-13 rounded-xl bg-gradient-to-br from-[#0b3b2c]/10 to-[#e5c07b]/20 text-[#0b3b2c] flex items-center justify-center shrink-0 border border-[#dce6e1]"
                          >
                            <Package className="w-5 h-5 text-[#0b3b2c]/70" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs text-[#0c2b22] group-hover:text-[#ff4d6d] line-clamp-1 leading-snug">
                              {p.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono font-bold text-[#809c93]">
                                {p.id}
                              </span>
                              {p.brand && (
                                <span className="text-[9.5px] font-semibold text-neutral-400">
                                  • {p.brand}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Subcategory */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0b3b2c] text-xs">{p.category || 'Jewellery'}</div>
                        <div className="text-[10px] text-neutral-400 font-medium mt-0.5">
                          {p.sub_category || 'General Collection'}
                        </div>
                      </td>

                      {/* Variants Display with Smart Badges */}
                      <td className="py-3.5 px-4">
                        {variants.length === 0 ? (
                          <span className="text-[11px] text-neutral-400 italic">Standard Single SKU</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                            {variants.map((v, i) => {
                              if (v.type === 'color') {
                                const hex = getColorHex(v.value);
                                return (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#dce6e1] text-[10px] font-bold text-[#0c2b22] shadow-2xs"
                                  >
                                    <span
                                      className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                                      style={{ backgroundColor: hex }}
                                    />
                                    <span className="capitalize">{v.value}</span>
                                  </span>
                                );
                              }

                              if (v.type === 'size') {
                                return (
                                  <span
                                    key={i}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#f0f4f2] text-[#0b3b2c] text-[10px] font-mono font-extrabold border border-[#dce6e1]"
                                  >
                                    {v.value}
                                  </span>
                                );
                              }

                              return (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-100"
                                >
                                  {v.value}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Selling Price & MRP */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-xs text-[#0b3b2c]">
                          ₹{Number(p.selling_price).toLocaleString('en-IN')}
                        </div>
                        {p.mrp && Number(p.mrp) > Number(p.selling_price) && (
                          <div className="text-[10px] text-neutral-400 line-through">
                            ₹{Number(p.mrp).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>

                      {/* Stock Quantity Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold text-xs ${
                              Number(p.stock_quantity) === 0
                                ? 'text-rose-600 font-extrabold'
                                : isLowStock
                                ? 'text-amber-600 font-bold'
                                : 'text-[#0b3b2c]'
                            }`}
                          >
                            {p.stock_quantity} {p.unit || 'Piece'}
                          </span>
                          {isLowStock && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 uppercase tracking-tight">
                              Low
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Store Visibility Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p.id, p.active)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                            p.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                          }`}
                        >
                          {p.active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{p.active ? 'Active' : 'Hidden'}</span>
                        </button>
                      </td>

                      {/* Action Menu */}
                      <td className="py-3.5 px-4 text-right">
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: DYNAMIC PRODUCT CREATOR WITH CATEGORIZED VARIANTS */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#dce6e1] my-6 overflow-hidden flex flex-col font-sans">
            
            {/* Header */}
            <div className="px-5 sm:px-6 py-3.5 border-b border-[#edf2ef] flex items-center justify-between bg-[#fbfcfc]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0b3b2c] text-[#e5c07b] flex items-center justify-center font-serif font-black text-xs">
                  KF
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#0b3b2c]">
                    Create New Product & Dynamic Variant Matrix
                  </h3>
                  <span className="text-[10px] text-neutral-400 block -mt-0.5">
                    Link with inventory and dynamic masters
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleCreateProduct} className="p-5 sm:p-6 space-y-4.5 text-xs overflow-y-auto max-h-[78vh]">
              
              {/* 1. Basic Information */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#809c93]">
                    1. Basic Product Information
                  </span>
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Product Title / Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Temple Design Gold-Plated Bangles with Ruby"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none focus:border-[#0b3b2c] focus:bg-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Category *</label>
                    <select
                      required
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setSubCategory('');
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-bold text-[#0c2b22] outline-none cursor-pointer"
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Sub-Category</label>
                    <select
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-bold text-[#0c2b22] outline-none cursor-pointer disabled:opacity-50"
                      disabled={!category}
                    >
                      <option value="">-- Select Sub-Category --</option>
                      {availableSubCategories.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Dynamic Variants (Colours & Smart Categorized Sizes) */}
              <div className="space-y-3.5 pt-3 border-t border-[#edf2ef]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#809c93]">
                    2. Dynamic Variants Matrix
                  </span>
                  <span className="text-[10.5px] text-[#0b3b2c] font-bold">
                    {selectedColors.length} Colors • {selectedSizes.length} Sizes Selected
                  </span>
                </div>

                {/* Colours Palettes with Visual Swatch */}
                <div className="bg-[#f8faf9] p-3.5 rounded-2xl border border-[#edf2ef] space-y-2">
                  <label className="font-bold text-neutral-700 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-[#ff4d6d]" />
                      <span>Colours Palette ({colours.length})</span>
                    </span>
                    {selectedColors.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedColors([])}
                        className="text-[10px] text-rose-600 hover:underline cursor-pointer font-bold"
                      >
                        Clear Selected
                      </button>
                    )}
                  </label>

                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto">
                    {colours.map((c) => {
                      const isSelected = selectedColors.includes(c.name);
                      const hex = getColorHex(c.name);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleColor(c.name)}
                          className={`px-2.5 py-1.2 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-[#0b3b2c] text-white border-[#0b3b2c] shadow-xs scale-102'
                              : 'bg-white text-neutral-700 border-[#dce6e1] hover:bg-neutral-100'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: hex }}
                          />
                          <span className="capitalize">{c.name}</span>
                          {isSelected && <Check className="w-3 h-3 text-[#e5c07b]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Smart Categorized Sizes (Bangles vs Apparel vs Cups) */}
                <div className="bg-[#f8faf9] p-3.5 rounded-2xl border border-[#edf2ef] space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="font-bold text-neutral-700 text-xs flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-blue-600" />
                      <span>Sizes Group</span>
                    </label>

                    {/* Sub-Filter Tabs for Sizes */}
                    <div className="flex items-center gap-1 p-0.5 bg-white rounded-lg border border-[#dce6e1]">
                      <button
                        type="button"
                        onClick={() => setSizeFilterTab('all')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sizeFilterTab === 'all' ? 'bg-[#0b3b2c] text-white' : 'text-neutral-500'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSizeFilterTab('bangles')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sizeFilterTab === 'bangles' ? 'bg-[#0b3b2c] text-white' : 'text-neutral-500'
                        }`}
                      >
                        Bangles ({categorizedSizes.bangles.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSizeFilterTab('apparel')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sizeFilterTab === 'apparel' ? 'bg-[#0b3b2c] text-white' : 'text-neutral-500'
                        }`}
                      >
                        Clothing ({categorizedSizes.apparel.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSizeFilterTab('cups')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sizeFilterTab === 'cups' ? 'bg-[#0b3b2c] text-white' : 'text-neutral-500'
                        }`}
                      >
                        Lingerie
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto">
                    {displayedSizes.map((s) => {
                      const isSelected = selectedSizes.includes(s.name);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSize(s.name)}
                          className={`min-w-[42px] px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                            isSelected
                              ? 'bg-[#0b3b2c] text-white border-[#0b3b2c] shadow-xs'
                              : 'bg-white text-neutral-700 border-[#dce6e1] hover:bg-neutral-100'
                          }`}
                        >
                          <span>{s.name}</span>
                          {isSelected && <Check className="w-2.5 h-2.5 text-[#e5c07b]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fabric & Unit of Measurement */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1 flex items-center gap-1">
                      <Scissors className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Fabric Specification</span>
                    </label>
                    <select
                      value={fabric}
                      onChange={(e) => setFabric(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none cursor-pointer"
                    >
                      <option value="">-- Choose Fabric (Optional) --</option>
                      {fabrics.map((f) => (
                        <option key={f.id} value={f.name}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-amber-500" />
                      <span>Unit of Measurement</span>
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none cursor-pointer"
                    >
                      {units.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} {u.short_name ? `(${u.short_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Pricing & Stock Inventory */}
              <div className="space-y-3 pt-3 border-t border-[#edf2ef]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#809c93] block">
                  3. Pricing & Stock Inventory
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Selling Price (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 600"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-bold text-[#0b3b2c] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">MRP Price (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 899"
                      value={mrp}
                      onChange={(e) => setMrp(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-medium outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Cost Price (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 350"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Stock Quantity *</label>
                    <input
                      type="number"
                      required
                      placeholder="10"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Low Stock Alert</label>
                    <input
                      type="number"
                      placeholder="3"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Weight</label>
                    <input
                      type="number"
                      placeholder="500"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Weight Unit</label>
                    <select
                      value={weightUnit}
                      onChange={(e) => setWeightUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                    >
                      <option value="grams">Grams</option>
                      <option value="kg">Kilograms (KG)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Product Images Array */}
              <div className="space-y-2 pt-3 border-t border-[#edf2ef]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#809c93] block">
                  4. Product Images
                </span>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Paste direct Image URL (e.g. https://.../bangles.jpg)"
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-4 py-2 rounded-xl bg-[#0b3b2c] text-white font-bold cursor-pointer"
                  >
                    + Add URL
                  </button>
                </div>

                {imagesList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {imagesList.map((img, idx) => (
                      <div key={idx} className="relative group w-14 h-16 rounded-xl overflow-hidden border border-[#dce6e1]">
                        <img src={img} alt="Product" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Description */}
              <div className="pt-2 border-t border-[#edf2ef]">
                <label className="font-bold text-neutral-700 block mb-1">Product Description / Highlights</label>
                <textarea
                  rows={2}
                  placeholder="Details regarding stones, base metal, polish and maintenance..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#edf2ef]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4.5 py-2 rounded-full border border-[#dce6e1] text-neutral-600 hover:bg-[#f0f4f2] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-full bg-[#0b3b2c] hover:bg-[#06231a] text-white font-bold shadow-md shadow-[#0b3b2c]/20 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Publishing to Vault...' : 'Save & Publish Product'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}