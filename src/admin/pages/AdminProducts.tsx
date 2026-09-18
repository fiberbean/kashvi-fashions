import React, { useEffect, useState } from 'react';
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
  Scale
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
  images: string[];
  variants?: any;
  description?: string;
  active: boolean;
  created_at?: string;
}

interface AdminProductsProps {
  currentUser: AdminStaffUser | null;
}

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
      // 1. Fetch Products
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (prodData) setProducts(prodData);

      // 2. Fetch Masters
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

  // Filtered sub-categories based on selected parent category
  const availableSubCategories = useMemo(() => {
    if (!category) return [];
    const parentCat = categories.find((c) => c.name === category);
    if (!parentCat) return subCategories;
    return subCategories.filter((s) => s.category_id === parentCat.id || s.category_name === category);
  }, [category, categories, subCategories]);

  // Handle Multi-Color Toggle
  const toggleColor = (colName: string) => {
    setSelectedColors((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  };

  // Handle Multi-Size Toggle
  const toggleSize = (szName: string) => {
    setSelectedSizes((prev) =>
      prev.includes(szName) ? prev.filter((s) => s !== szName) : [...prev, szName]
    );
  };

  // Handle Image Add
  const handleAddImage = () => {
    if (!imageInput.trim()) return;
    setImagesList((prev) => [...prev, imageInput.trim()]);
    setImageInput('');
  };

  const handleRemoveImage = (index: number) => {
    setImagesList((prev) => prev.filter((_, i) => i !== index));
  };

  // Reset Form
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
  };

  // Save Product to Database
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category || sellingPrice === '') {
      alert('Please fill in Product Name, Category, and Selling Price.');
      return;
    }

    setSaving(true);
    try {
      const productId = `PROD_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

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

  // Toggle Active/Inactive Status
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

  // Delete Product
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

  // Filtered Products for Listing
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
      
      {/* 1. Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e2eae6] shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#e4efe9] text-[#0b3b2c] text-[9.5px] font-bold uppercase tracking-wider mb-1 border border-[#dce6e1]">
            <Sparkles className="w-2.5 h-2.5 text-[#c6933a]" /> Live Store Inventory
          </div>
          <h1 className="text-xl font-serif font-bold text-[#0b3b2c] leading-none">
            Product Catalog & Dynamic Variants Vault
          </h1>
          <p className="text-[11px] text-[#4d6960] mt-1">
            Dynamic attributes mapped automatically from your Masters module.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAllData}
            className="p-2 rounded-xl border border-[#dce6e1] text-[#0b3b2c] hover:bg-[#f0f4f2] transition-colors"
            title="Refresh Catalog"
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
              className="px-4 py-2 rounded-full bg-[#0b3b2c] hover:bg-[#06231a] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#0b3b2c]/20 cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 text-[#e5c07b]" />
              <span>Create Product</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-[#e2eae6] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Product Name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#dce6e1] text-xs font-medium text-[#0c2b22] bg-[#f8faf9] outline-none focus:border-[#0b3b2c] focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[11px] text-neutral-500 font-semibold">Category:</span>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#dce6e1] text-xs font-bold text-[#0b3b2c] bg-[#f8faf9] outline-none cursor-pointer"
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

      {/* 3. Products Grid / Table */}
      <div className="bg-white rounded-2xl border border-[#e2eae6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#fbfcfc] text-[#809c93] uppercase text-[9px] font-bold tracking-wider border-b border-[#edf2ef]">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category / Sub-Category</th>
                <th className="py-3 px-4">Variants Configured</th>
                <th className="py-3 px-4">Selling Price</th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4">Store Visibility</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ef]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400 font-medium">
                    Loading Product Vault...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400 font-medium">
                    No products found. Click "+ Create Product" to add your first item.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const firstImg = Array.isArray(p.images) && p.images[0] ? p.images[0] : null;
                  const isLowStock = Number(p.stock_quantity) <= Number(p.low_stock_threshold || 3);

                  return (
                    <tr key={p.id} className="hover:bg-[#f8faf9] transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {firstImg ? (
                            <img
                              src={firstImg}
                              alt={p.name}
                              className="w-10 h-12 object-cover object-top rounded-lg border border-[#e2eae6] shrink-0 bg-white"
                            />
                          ) : (
                            <div className="w-10 h-12 rounded-lg bg-[#f0f4f2] text-[#0b3b2c] flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-[#0c2b22] group-hover:text-[#ff4d6d] truncate leading-tight">
                              {p.name}
                            </h4>
                            <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                              {p.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-[#0b3b2c] text-xs block">{p.category}</span>
                        <span className="text-[10.5px] text-neutral-500">{p.sub_category || 'General'}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p.colour && (
                            <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
                              {p.colour}
                            </span>
                          )}
                          {p.size && (
                            <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                              {p.size}
                            </span>
                          )}
                          {p.fabric && (
                            <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {p.fabric}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-xs text-[#0b3b2c]">
                          ₹{Number(p.selling_price).toLocaleString('en-IN')}
                        </div>
                        {p.mrp && Number(p.mrp) > Number(p.selling_price) && (
                          <div className="text-[10px] text-neutral-400 line-through">
                            ₹{Number(p.mrp).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`font-bold text-xs ${
                              Number(p.stock_quantity) === 0
                                ? 'text-rose-600'
                                : isLowStock
                                ? 'text-amber-600'
                                : 'text-[#0b3b2c]'
                            }`}
                          >
                            {p.stock_quantity} {p.unit || 'pcs'}
                          </span>
                          {isLowStock && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                              Low
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p.id, p.active)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                            p.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                          }`}
                        >
                          {p.active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{p.active ? 'Active' : 'Hidden'}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
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
      {/* 4. MODAL: DYNAMIC PRODUCT CREATOR */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#dce6e1] my-8 overflow-hidden flex flex-col font-sans">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#edf2ef] flex items-center justify-between bg-[#fbfcfc]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0b3b2c] text-[#e5c07b] flex items-center justify-center font-bold text-xs">
                  KF
                </div>
                <h3 className="font-serif font-bold text-sm text-[#0b3b2c]">
                  Create New Product & Dynamic Variant Matrix
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Form */}
            <form onSubmit={handleCreateProduct} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
              
              {/* Product Basic Info */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#809c93] block">
                  1. Basic Information
                </span>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Product Title / Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Crimson Kanchipuram Pure Silk Saree"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none focus:border-[#0b3b2c] focus:bg-white"
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
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none"
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
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none disabled:opacity-50"
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

              {/* Dynamic Variants Matrix */}
              <div className="space-y-3 pt-2 border-t border-[#edf2ef]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#809c93] block">
                  2. Dynamic Variants (From Masters)
                </span>

                {/* Colours multi-select */}
                <div>
                  <label className="font-bold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#ff4d6d]" />
                    <span>Select Available Colours:</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {colours.map((c) => {
                      const isSelected = selectedColors.includes(c.name);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleColor(c.name)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-[#0b3b2c] text-white border-[#0b3b2c] shadow-2xs'
                              : 'bg-white text-neutral-700 border-[#dce6e1] hover:bg-[#f8faf9]'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-[#e5c07b]" />}
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sizes multi-select */}
                <div>
                  <label className="font-bold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-blue-500" />
                    <span>Select Available Sizes:</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {sizes.map((s) => {
                      const isSelected = selectedSizes.includes(s.name);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSize(s.name)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-[#0b3b2c] text-white border-[#0b3b2c] shadow-2xs'
                              : 'bg-white text-neutral-700 border-[#dce6e1] hover:bg-[#f8faf9]'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-[#e5c07b]" />}
                          <span>{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fabric & Unit dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1 flex items-center gap-1">
                      <Scissors className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Fabric Type</span>
                    </label>
                    <select
                      value={fabric}
                      onChange={(e) => setFabric(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none"
                    >
                      <option value="">-- Choose Fabric --</option>
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
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none"
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

              {/* Pricing, Weight & Stock */}
              <div className="space-y-3 pt-2 border-t border-[#edf2ef]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#809c93] block">
                  3. Pricing & Stock Inventory
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Selling Price (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 2499"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-bold text-[#0b3b2c] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">MRP Price (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 4999"
                      value={mrp}
                      onChange={(e) => setMrp(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-medium outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Cost Price (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1500"
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

              {/* Product Images Array */}
              <div className="space-y-2 pt-2 border-t border-[#edf2ef]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#809c93] block">
                  4. Product Images
                </span>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Enter Image URL (e.g. https://.../saree.jpg)"
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-3.5 py-2 rounded-xl bg-[#0b3b2c] text-white font-bold cursor-pointer"
                  >
                    + Add URL
                  </button>
                </div>

                {imagesList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {imagesList.map((img, idx) => (
                      <div key={idx} className="relative group w-14 h-16 rounded-lg overflow-hidden border border-[#dce6e1]">
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

              {/* Description */}
              <div className="pt-2 border-t border-[#edf2ef]">
                <label className="font-bold text-neutral-700 block mb-1">Product Description / Highlights</label>
                <textarea
                  rows={3}
                  placeholder="Describe the weave, borders, zari quality and care instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#edf2ef]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#dce6e1] text-neutral-600 hover:bg-[#f0f4f2] font-semibold cursor-pointer"
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