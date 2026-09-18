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
  X,
  Sparkles,
  RefreshCw,
  Scale,
  Check,
  Zap,
  Boxes,
  Eye
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

interface VariantRowItem {
  id: string;
  colour: string;
  size: string;
  selling_price: number;
  mrp: number;
  stock: number;
}

interface AdminProductsProps {
  currentUser: AdminStaffUser | null;
}

export default function AdminProducts({ currentUser }: AdminProductsProps) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Masters
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryRecord[]>([]);
  const [colours, setColours] = useState<ColourRecord[]>([]);
  const [sizes, setSizes] = useState<SizeRecord[]>([]);
  const [fabrics, setFabrics] = useState<FabricRecord[]>([]);
  const [units, setUnits] = useState<UnitRecord[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [brand, setBrand] = useState('Kashvi Fashions');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [mrp, setMrp] = useState<number | ''>('');
  const [unit, setUnit] = useState('Piece');
  const [fabric, setFabric] = useState('');
  const [stockQuantity, setStockQuantity] = useState<number | ''>(10);
  const [description, setDescription] = useState('');

  // Multi-Select Selections
  const [selectedColours, setSelectedColours] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);

  // Generated Variant Matrix Rows
  const [variantRows, setVariantRows] = useState<VariantRowItem[]>([]);

  // Image Upload/URL States
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imagesList, setImagesList] = useState<string[]>([]);

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const canDelete = currentUser?.role === 'admin';

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (prodData) setProducts(prodData);

      const [catsRes, subCatsRes, colsRes, sizesRes, fabsRes, unitsRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('sub_categories').select('*').order('name'),
        supabase.from('colours').select('*').order('name'),
        supabase.from('sizes').select('*').order('name'),
        supabase.from('fabrics').select('*').order('name'),
        supabase.from('units').select('*').order('name')
      ]);

      if (catsRes.data) setCategories(catsRes.data);
      if (subCatsRes.data) setSubCategories(subCatsRes.data);
      if (colsRes.data) setColours(colsRes.data);
      if (sizesRes.data) setSizes(sizesRes.data);
      if (fabsRes.data) setFabrics(fabsRes.data);
      if (unitsRes.data) setUnits(unitsRes.data);
    } catch (err) {
      console.error('Error loading products master:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableSubCategories = useMemo(() => {
    if (!category) return subCategories;
    const parent = categories.find((c) => c.name === category);
    if (!parent) return subCategories;
    return subCategories.filter((s) => s.category_id === parent.id || s.category_name === category);
  }, [category, categories, subCategories]);

  // Multi-select toggles
  const toggleSelection = (item: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  // Generate Variants Function (Reference Screenshot Logic)
  const handleGenerateVariants = () => {
    if (selectedColours.length === 0 && selectedSizes.length === 0) {
      alert('Select at least one Colour or Size above to generate variant rows.');
      return;
    }

    const defaultSP = Number(sellingPrice) || 0;
    const defaultMrp = Number(mrp) || defaultSP;
    const defaultStock = 5;

    const cols = selectedColours.length > 0 ? selectedColours : ['Standard'];
    const szs = selectedSizes.length > 0 ? selectedSizes : ['Free Size'];

    const newRows: VariantRowItem[] = [];

    cols.forEach((c) => {
      szs.forEach((s) => {
        newRows.push({
          id: `${c}_${s}`,
          colour: c,
          size: s,
          selling_price: defaultSP,
          mrp: defaultMrp,
          stock: defaultStock
        });
      });
    });

    setVariantRows(newRows);
  };

  const handleUpdateVariantRow = (id: string, field: keyof VariantRowItem, val: any) => {
    setVariantRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: val } : row))
    );
  };

  const resetForm = () => {
    setIsEditMode(false);
    setProductCode(`KF${Math.floor(1000 + Math.random() * 9000)}`);
    setProductName('');
    setCategory('');
    setSubCategory('');
    setBrand('Kashvi Fashions');
    setSellingPrice('');
    setMrp('');
    setUnit('Piece');
    setFabric('');
    setStockQuantity(10);
    setDescription('');
    setSelectedColours([]);
    setSelectedSizes([]);
    setSelectedFabrics([]);
    setVariantRows([]);
    setImagesList([]);
    setImageUrlInput('');
  };

  // Open Edit Product Modal with Pre-filled Data
  const handleOpenEditProduct = (prod: ProductRecord) => {
    setIsEditMode(true);
    setProductCode(prod.id);
    setProductName(prod.name || '');
    setCategory(prod.category || '');
    setSubCategory(prod.sub_category || '');
    setBrand(prod.brand || 'Kashvi Fashions');
    setSellingPrice(prod.selling_price || '');
    setMrp(prod.mrp || '');
    setUnit(prod.unit || 'Piece');
    setFabric(prod.fabric || '');
    setStockQuantity(prod.stock_quantity ?? 10);
    setDescription(prod.description || '');

    // Parse colours & sizes
    const colArr = prod.colour ? prod.colour.split(',').map((c) => c.trim()) : [];
    const szArr = prod.size ? prod.size.split(',').map((s) => s.trim()) : [];
    const fabArr = prod.fabric ? prod.fabric.split(',').map((f) => f.trim()) : [];

    setSelectedColours(colArr);
    setSelectedSizes(szArr);
    setSelectedFabrics(fabArr);

    // Parse images
    if (Array.isArray(prod.images)) {
      setImagesList(prod.images);
    } else if (typeof prod.images === 'string') {
      try {
        const parsed = JSON.parse(prod.images);
        setImagesList(Array.isArray(parsed) ? parsed : [prod.images]);
      } catch {
        setImagesList(prod.images ? [prod.images] : []);
      }
    } else {
      setImagesList([]);
    }

    // Parse saved variants matrix breakdown
    if (prod.variants && Array.isArray(prod.variants.matrix)) {
      setVariantRows(prod.variants.matrix);
    } else {
      setVariantRows([]);
    }

    setIsModalOpen(true);
  };

  // Save or Update Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !category || sellingPrice === '') {
      alert('Product Name, Category mariyu Selling Price compulsory ga fill cheyandi.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: productCode.trim(),
        name: productName.trim(),
        category,
        sub_category: subCategory || null,
        colour: selectedColours.join(', ') || null,
        size: selectedSizes.join(', ') || null,
        fabric: selectedFabrics.join(', ') || fabric || null,
        unit: unit || 'Piece',
        brand: brand || 'Kashvi Fashions',
        selling_price: Number(sellingPrice),
        mrp: Number(mrp) || Number(sellingPrice),
        stock_quantity: Number(stockQuantity) || 0,
        images: imagesList,
        description: description.trim(),
        variants: {
          colours: selectedColours,
          sizes: selectedSizes,
          fabrics: selectedFabrics,
          matrix: variantRows
        },
        active: true
      };

      if (isEditMode) {
        const { error } = await supabase.from('products').update(payload).eq('id', productCode);
        if (error) throw error;
        setProducts((prev) => prev.map((p) => (p.id === productCode ? { ...p, ...payload } : p)));
      } else {
        const { data, error } = await supabase.from('products').insert([payload]).select().single();
        if (error) throw error;
        if (data) setProducts((prev) => [data, ...prev]);
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Save failed:', err);
      alert('Product save cheyatamlo error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canDelete) return;
    if (!confirm(`Permanently delete ${id}?`)) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat = selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200 select-none font-sans pb-12">
      
      {/* 1. Header Bar: Replaced Title with "Product Master" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4.5 rounded-2xl border border-[#e2eae6] shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#e4efe9] text-[#0b3b2c] text-[9.5px] font-bold uppercase tracking-wider mb-1 border border-[#dce6e1]">
            <Sparkles className="w-2.5 h-2.5 text-[#c6933a]" /> Kashvi Master Catalog
          </div>
          <h1 className="text-xl font-serif font-bold text-[#0b3b2c] leading-none">
            Product Master
          </h1>
          <p className="text-[11px] text-[#4d6960] mt-1 font-medium">
            Manage product descriptions, variants, pricing and real-time inventory matrix.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl border border-[#dce6e1] text-[#0b3b2c] hover:bg-[#f0f4f2] transition-colors cursor-pointer"
            title="Reload Data"
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

      {/* 2. Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#e2eae6] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-[#809c93] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Product Name, Code (e.g. KF0004)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-[#dce6e1] text-xs font-medium text-[#0c2b22] bg-[#f8faf9] outline-none focus:border-[#0b3b2c] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <span className="text-[11px] text-[#4d6960] font-bold">Category:</span>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-[#dce6e1] text-xs font-bold text-[#0b3b2c] bg-[#f8faf9] outline-none cursor-pointer"
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

      {/* 3. Product Master Table - Clickable Row for Edit */}
      <div className="bg-white rounded-2xl border border-[#e2eae6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#fbfcfc] text-[#809c93] uppercase text-[9px] font-bold tracking-wider border-b border-[#edf2ef]">
              <tr>
                <th className="py-3.5 px-4">Product Description</th>
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
                  <td colSpan={7} className="py-12 text-center text-neutral-400 font-medium">
                    Loading Product Master...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400 font-medium">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const firstImg = Array.isArray(p.images) ? p.images[0] : null;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleOpenEditProduct(p)}
                      className="hover:bg-[#f4f7f5] transition-colors cursor-pointer group"
                      title="Click to Edit Product"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {firstImg ? (
                            <img
                              src={firstImg}
                              alt={p.name}
                              className="w-11 h-13 object-cover object-top rounded-xl border border-[#dce6e1] bg-white shrink-0 shadow-2xs"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-11 h-13 rounded-xl bg-[#f0f4f2] text-[#0b3b2c] flex items-center justify-center shrink-0 border border-[#dce6e1]">
                              <Package className="w-5 h-5 text-[#0b3b2c]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-[#0c2b22] group-hover:text-[#ff4d6d] line-clamp-1">
                              {p.name}
                            </h4>
                            <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                              {p.id} {p.brand ? `• ${p.brand}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-[#0b3b2c] text-xs block">{p.category}</span>
                        <span className="text-[10px] text-neutral-500">{p.sub_category || 'General'}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p.colour && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                              {p.colour}
                            </span>
                          )}
                          {p.size && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-mono font-bold border border-blue-200">
                              {p.size}
                            </span>
                          )}
                          {!p.colour && !p.size && (
                            <span className="text-neutral-400 italic text-[10px]">Standard Single SKU</span>
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
                        <span className="font-bold text-xs text-[#0b3b2c]">
                          {p.stock_quantity} {p.unit || 'Piece'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{p.active ? 'Active' : 'Hidden'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditProduct(p);
                            }}
                            className="p-1.5 rounded-md hover:bg-neutral-200 text-neutral-500 hover:text-[#0b3b2c]"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteProduct(p.id, e)}
                              className="p-1.5 rounded-md hover:bg-rose-100 text-neutral-400 hover:text-rose-600"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
      {/* 4. MODAL: PRODUCT MASTER REFERENCE STYLE FORM */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#dce6e1] my-4 overflow-hidden flex flex-col font-sans max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#edf2ef] flex items-center justify-between bg-[#fbfcfc]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0b3b2c] text-[#e5c07b] flex items-center justify-center font-serif font-black text-xs">
                  KF
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#0b3b2c]">
                    {isEditMode ? 'Edit Product Master' : 'Add New Product'}
                  </h3>
                  <span className="text-[10px] text-neutral-400 block -mt-0.5">
                    Internal Store OS • Dynamic Variants & Inventory Configuration
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

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              
              {/* Row 1: Product Code & Product Name */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4">
                  <label className="font-bold text-neutral-700 block mb-1">PRODUCT CODE</label>
                  <input
                    type="text"
                    required
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                    disabled={isEditMode}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-mono font-bold text-[#0b3b2c] outline-none disabled:opacity-60"
                  />
                </div>

                <div className="md:col-span-8">
                  <label className="font-bold text-neutral-700 block mb-1">PRODUCT NAME *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pure Banarasi Kanjeevaram Saree / Temple Bangles"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none focus:border-[#0b3b2c] focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Category, Sub-Category, Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">CATEGORY *</label>
                  <select
                    required
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setSubCategory('');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-bold text-[#0c2b22] outline-none cursor-pointer"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">SUB-CATEGORY</label>
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-bold text-[#0c2b22] outline-none cursor-pointer"
                  >
                    <option value="">Select Sub-Category</option>
                    {availableSubCategories.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">BRAND</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Selling Price, MRP, Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">SELLING PRICE (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="2499"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-bold text-[#0b3b2c] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    placeholder="4999"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">UNIT</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-bold text-[#0c2b22] outline-none cursor-pointer"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} {u.short_name ? `(${u.short_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Multi-Select Masters: Colours, Sizes, Fabrics */}
              <div className="space-y-3 pt-2 border-t border-[#edf2ef]">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#0b3b2c] block">
                  Select Attributes For Variant Generation
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* COLOUR (MULTI-SELECT) */}
                  <div className="p-3 bg-[#f8faf9] rounded-2xl border border-[#edf2ef] space-y-2">
                    <span className="font-bold text-neutral-700 block text-[11px]">
                      COLOUR (MULTI-SELECT)
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {colours.map((c) => {
                        const isSel = selectedColours.includes(c.name);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleSelection(c.name, selectedColours, setSelectedColours)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                              isSel
                                ? 'bg-[#0b3b2c] text-white border-[#0b3b2c] shadow-2xs'
                                : 'bg-white text-neutral-700 border-[#dce6e1] hover:bg-neutral-100'
                            }`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SIZE (MULTI-SELECT) */}
                  <div className="p-3 bg-[#f8faf9] rounded-2xl border border-[#edf2ef] space-y-2">
                    <span className="font-bold text-neutral-700 block text-[11px]">
                      SIZE (MULTI-SELECT)
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {sizes.map((s) => {
                        const isSel = selectedSizes.includes(s.name);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleSelection(s.name, selectedSizes, setSelectedSizes)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all border cursor-pointer ${
                              isSel
                                ? 'bg-[#0b3b2c] text-white border-[#0b3b2c] shadow-2xs'
                                : 'bg-white text-neutral-700 border-[#dce6e1] hover:bg-neutral-100'
                            }`}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* FABRIC / MATERIAL (MULTI-SELECT) */}
                  <div className="p-3 bg-[#f8faf9] rounded-2xl border border-[#edf2ef] space-y-2">
                    <span className="font-bold text-neutral-700 block text-[11px]">
                      FABRIC / MATERIAL (MULTI-SELECT)
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {fabrics.length === 0 ? (
                        <span className="text-neutral-400 italic text-[10px]">None in Masters.</span>
                      ) : (
                        fabrics.map((f) => {
                          const isSel = selectedFabrics.includes(f.name);
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => toggleSelection(f.name, selectedFabrics, setSelectedFabrics)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                                isSel
                                  ? 'bg-[#0b3b2c] text-white border-[#0b3b2c]'
                                  : 'bg-white text-neutral-700 border-[#dce6e1] hover:bg-neutral-100'
                              }`}
                            >
                              {f.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Row 5: Variant Matrix Breakdown (Price & Stock per Variant) */}
              <div className="p-4 bg-white rounded-2xl border border-[#dce6e1] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#0b3b2c]">
                    <Zap className="w-3.5 h-3.5 text-[#ff4d6d]" />
                    <span>Variant Matrix Breakdown (Price & Stock per Variant)</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateVariants}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#ff4d6d] to-[#e03a5a] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Generate Variants</span>
                  </button>
                </div>

                {variantRows.length === 0 ? (
                  <div className="py-6 text-center text-neutral-400 bg-[#f8faf9] rounded-xl border border-dashed border-[#dce6e1]">
                    Select Colour & Size above, then click <strong>"⚡ Generate Variants"</strong> to create rows.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f8faf9] text-neutral-500 uppercase text-[9px] font-bold tracking-wider">
                        <tr>
                          <th className="py-2 px-3">Variant Combination</th>
                          <th className="py-2 px-3">Colour</th>
                          <th className="py-2 px-3">Size</th>
                          <th className="py-2 px-3 w-32">Selling Price (₹)</th>
                          <th className="py-2 px-3 w-32">MRP (₹)</th>
                          <th className="py-2 px-3 w-28">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#edf2ef]">
                        {variantRows.map((row) => (
                          <tr key={row.id} className="hover:bg-[#fcfaf4]">
                            <td className="py-2 px-3 font-bold text-[#0c2b22]">{row.id}</td>
                            <td className="py-2 px-3 font-semibold text-neutral-700">{row.colour}</td>
                            <td className="py-2 px-3 font-mono font-bold text-[#0b3b2c]">{row.size}</td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={row.selling_price}
                                onChange={(e) =>
                                  handleUpdateVariantRow(row.id, 'selling_price', Number(e.target.value))
                                }
                                className="w-full px-2 py-1 rounded-lg border border-[#dce6e1] bg-white font-bold text-[#0b3b2c] outline-none"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={row.mrp}
                                onChange={(e) =>
                                  handleUpdateVariantRow(row.id, 'mrp', Number(e.target.value))
                                }
                                className="w-full px-2 py-1 rounded-lg border border-[#dce6e1] bg-white outline-none"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={row.stock}
                                onChange={(e) =>
                                  handleUpdateVariantRow(row.id, 'stock', Number(e.target.value))
                                }
                                className="w-full px-2 py-1 rounded-lg border border-[#dce6e1] bg-white font-bold outline-none"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Row 6: Product Images (Upload & Assign) */}
              <div className="space-y-2 pt-2 border-t border-[#edf2ef]">
                <span className="font-bold text-neutral-700 block text-[11px] uppercase">
                  Product Dress Images (Upload & Assign)
                </span>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Direct HTTPS image URL (e.g. https://.../image.jpg)"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!imageUrlInput.trim()) return;
                      setImagesList((prev) => [...prev, imageUrlInput.trim()]);
                      setImageUrlInput('');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0b3b2c] text-white font-bold cursor-pointer"
                  >
                    + Add Image
                  </button>
                </div>

                {imagesList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {imagesList.map((img, idx) => (
                      <div key={idx} className="relative group w-14 h-16 rounded-xl overflow-hidden border border-[#dce6e1]">
                        <img src={img} alt="Product" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImagesList((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 7: Description */}
              <div className="pt-2 border-t border-[#edf2ef]">
                <label className="font-bold text-neutral-700 block mb-1">DESCRIPTION & PRODUCT DETAILS</label>
                <textarea
                  rows={3}
                  placeholder="Fabric care, weave type, wash instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs outline-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[#edf2ef]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-full border border-[#dce6e1] text-neutral-600 hover:bg-[#f0f4f2] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-7 py-2 rounded-full bg-[#0b3b2c] hover:bg-[#06231a] text-white font-bold shadow-md shadow-[#0b3b2c]/20 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : isEditMode ? 'Update Product' : 'Save Product'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}