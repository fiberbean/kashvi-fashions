import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Shirt,
  Gem,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
  UploadCloud,
  Layers,
  Tag,
  AlertCircle,
  Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ProductItem {
  id: string;
  name: string;
  department: 'fashions' | 'jewellery';
  category_name?: string;
  category_id?: string;
  subcategory_name?: string;
  price: number;
  original_price?: number;
  stock?: number;
  images?: string[];
  image_url?: string;
  description?: string;
  fabric?: string;
  available_colors?: string[];
  available_sizes?: string[];
  created_at?: string;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string; category_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDept, setSelectedDept] = useState<'all' | 'fashions' | 'jewellery'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Drawer / Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<'fashions' | 'jewellery'>('fashions');
  const [categoryName, setCategoryName] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [originalPrice, setOriginalPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>(10);
  const [description, setDescription] = useState('');
  const [fabric, setFabric] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [colorsInput, setColorsInput] = useState('');
  const [sizesInput, setSizesInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDependencies = async () => {
    try {
      const [catRes, subRes] = await Promise.all([
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('sub_categories').select('id, name, category_name').order('name')
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (subRes.data) setSubcategories(subRes.data);
    } catch (err) {
      console.error('Failed to load dependencies:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
    fetchProducts();
  }, []);

  const openNewDrawer = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setDepartment('fashions');
    setCategoryName(categories[0]?.name || '');
    setSubcategoryName('');
    setPrice('');
    setOriginalPrice('');
    setStock(10);
    setDescription('');
    setFabric('');
    setImageUrl('');
    setColorsInput('');
    setSizesInput('S, M, L, XL');
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (item: ProductItem) => {
    setIsEditing(true);
    setEditingId(item.id);
    setName(item.name || '');
    setDepartment(item.department || 'fashions');
    setCategoryName(item.category_name || '');
    setSubcategoryName(item.subcategory_name || '');
    setPrice(item.price || '');
    setOriginalPrice(item.original_price || '');
    setStock(item.stock ?? 10);
    setDescription(item.description || '');
    setFabric(item.fabric || '');
    setImageUrl(item.image_url || (item.images && item.images[0]) || '');
    setColorsInput((item.available_colors || []).join(', '));
    setSizesInput((item.available_sizes || []).join(', '));
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setIsEditing(false);
    setEditingId(null);
    setSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `prod_${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        const fallback = await supabase.storage
          .from('public-assets')
          .upload(filePath, file, { upsert: true });
        if (fallback.error) throw fallback.error;
      }

      const { data } = supabase.storage.from('products').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      alert('Image upload failed: ' + (err.message || 'Check storage permissions.'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price === '') return;

    setSaving(true);
    try {
      const colorsArray = colorsInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const sizesArray = sizesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: any = {
        name: name.trim(),
        department,
        category_name: categoryName,
        subcategory_name: subcategoryName || null,
        price: Number(price),
        original_price: originalPrice !== '' ? Number(originalPrice) : Number(price),
        stock: stock !== '' ? Number(stock) : 10,
        description: description.trim(),
        fabric: fabric.trim() || null,
        image_url: imageUrl || null,
        images: imageUrl ? [imageUrl] : [],
        available_colors: colorsArray,
        available_sizes: sizesArray,
        updated_at: new Date().toISOString()
      };

      if (isEditing && editingId) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const newId = `PROD_${Date.now().toString(36).toUpperCase()}`;
        const { error } = await supabase
          .from('products')
          .insert([{ id: newId, ...payload }]);
        if (error) throw error;
      }

      closeDrawer();
      await fetchProducts();
    } catch (err: any) {
      console.error('Failed to save product:', err);
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ProductItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}" from inventory?`)) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', item.id);
      if (error) throw error;
      await fetchProducts();
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert('Delete failed: ' + err.message);
    }
  };

  const filteredProducts = products.filter((prod) => {
    const matchesDept = selectedDept === 'all' || prod.department === selectedDept;
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch =
      prod.name.toLowerCase().includes(query) ||
      (prod.category_name || '').toLowerCase().includes(query) ||
      (prod.subcategory_name || '').toLowerCase().includes(query) ||
      prod.id.toLowerCase().includes(query);
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0b3b2c]">
            Product Catalog & Vault
          </h1>
          <p className="text-xs sm:text-sm text-[#4d6960] mt-1">
            Manage live stock, couture pricing, variations and gallery images.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewDrawer}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0b3b2c] hover:bg-[#06231a] text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-[#0b3b2c]/20 transition-all active:scale-95 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Product</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-[#dce6e1] shadow-xs">
        
        {/* Department Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#f0f4f2] rounded-full border border-[#dce6e1] self-start">
          <button
            type="button"
            onClick={() => setSelectedDept('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedDept === 'all'
                ? 'bg-[#0b3b2c] text-white shadow-xs'
                : 'text-[#4d6960] hover:text-[#0b3b2c]'
            }`}
          >
            All Vault
          </button>
          <button
            type="button"
            onClick={() => setSelectedDept('fashions')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedDept === 'fashions'
                ? 'bg-[#ff4d6d] text-white shadow-xs'
                : 'text-[#4d6960] hover:text-[#ff4d6d]'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>Fashions</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedDept('jewellery')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedDept === 'jewellery'
                ? 'bg-[#0b3b2c] text-[#e5c07b] shadow-xs'
                : 'text-[#4d6960] hover:text-[#0b3b2c]'
            }`}
          >
            <Gem className="w-3.5 h-3.5" />
            <span>Jewellery</span>
          </button>
        </div>

        {/* Search Field */}
        <div className="flex items-center gap-2 bg-[#f8faf9] border border-[#dce6e1] rounded-full px-3.5 py-2 w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#809c93]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, SKU, category..."
            className="w-full text-xs text-[#0c2b22] bg-transparent outline-none placeholder:text-[#809c93]"
          />
        </div>

      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#0b3b2c] animate-spin" />
          <p className="text-xs font-semibold text-[#4d6960]">Loading catalog items...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 bg-white rounded-3xl border border-[#dce6e1] text-center p-8 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#f0f4f2] text-[#4d6960] flex items-center justify-center mx-auto">
            <Shirt className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h4 className="text-base font-bold text-[#0c2b22]">No products found</h4>
          <p className="text-xs text-[#809c93] max-w-xs mx-auto">
            No items match your filter criteria. Try changing filters or add a new listing.
          </p>
          <button
            type="button"
            onClick={openNewDrawer}
            className="mt-2 px-6 py-2.5 rounded-full bg-[#0b3b2c] text-white text-xs font-bold cursor-pointer hover:bg-[#06231a]"
          >
            + Add Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((prod) => {
            const isJewellery = prod.department === 'jewellery';
            const displayImg = prod.image_url || (prod.images && prod.images[0]);

            return (
              <div
                key={prod.id}
                className="bg-white rounded-3xl border border-[#dce6e1] overflow-hidden shadow-[6px_6px_18px_rgba(11,59,44,0.04)] hover:shadow-xl transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Arch Image Preview Container */}
                  <div className="relative aspect-4/5 w-full bg-[#f0f4f2] overflow-hidden border-b border-[#edf2ef]">
                    {displayImg ? (
                      <img
                        src={displayImg}
                        alt={prod.name}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
                        <ImageIcon className="w-8 h-8 mb-1 text-[#809c93]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">No Image</span>
                      </div>
                    )}

                    {/* Department Tag */}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span
                        className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs ${
                          isJewellery
                            ? 'bg-[#0b3b2c] text-[#e5c07b] border border-[#e5c07b]/40'
                            : 'bg-[#ff4d6d] text-white'
                        }`}
                      >
                        {prod.department}
                      </span>
                      {prod.category_name && (
                        <span className="text-[9px] font-bold text-neutral-800 bg-white/90 backdrop-blur-xs px-2 py-1 rounded-full shadow-2xs">
                          {prod.category_name}
                        </span>
                      )}
                    </div>

                    {/* Stock Badge */}
                    <div className="absolute bottom-3 right-3">
                      <span className="text-[10px] font-bold bg-white/95 text-[#0c2b22] px-2.5 py-0.5 rounded-md shadow-xs">
                        Stock: {prod.stock ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4.5 space-y-1.5">
                    <h3 className="text-sm font-bold text-[#0c2b22] line-clamp-1 leading-snug">
                      {prod.name}
                    </h3>

                    {prod.subcategory_name && (
                      <span className="text-[10px] font-semibold text-[#809c93] block">
                        Sub: {prod.subcategory_name}
                      </span>
                    )}

                    {/* Pricing */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-base font-serif font-black text-[#0b3b2c]">
                        ₹{prod.price.toLocaleString('en-IN')}
                      </span>
                      {prod.original_price && prod.original_price > prod.price && (
                        <span className="text-xs text-neutral-400 line-through">
                          ₹{prod.original_price.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    {/* Sizes / Colors Pills */}
                    <div className="flex flex-wrap gap-1 pt-1.5">
                      {prod.available_sizes && prod.available_sizes.slice(0, 4).map((s) => (
                        <span key={s} className="text-[9px] font-bold bg-[#f0f4f2] text-[#4d6960] px-1.5 py-0.5 rounded-md">
                          {s}
                        </span>
                      ))}
                      {prod.available_sizes && prod.available_sizes.length > 4 && (
                        <span className="text-[9px] text-[#809c93] font-bold">
                          +{prod.available_sizes.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4.5 pt-2 border-t border-[#edf2ef] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-neutral-400">
                    ID: {prod.id.slice(0, 10)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/product/${prod.id}`}
                      target="_blank"
                      className="p-1.5 rounded-xl hover:bg-[#f0f4f2] text-neutral-500 hover:text-[#0b3b2c] transition-colors"
                      title="View on Storefront"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => openEditDrawer(prod)}
                      className="p-1.5 rounded-xl hover:bg-[#f0f4f2] text-[#4d6960] hover:text-[#0b3b2c] transition-colors cursor-pointer"
                      title="Edit Product"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(prod)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Edit & Add Slide-in Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          <div
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-[#dce6e1]">
              
              {/* Header */}
              <div className="p-5 border-b border-[#edf2ef] flex items-center justify-between bg-[#f8faf9]">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#0b3b2c]">
                    {isEditing ? 'Edit Product Item' : 'New Vault Product'}
                  </h3>
                  <span className="text-xs text-[#809c93]">
                    Publish live to Kashvi Storefront
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                
                {/* Department Selection */}
                <div>
                  <label className="font-bold text-[#0c2b22] block mb-1.5 uppercase tracking-wider">
                    Department *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDepartment('fashions')}
                      className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        department === 'fashions'
                          ? 'bg-[#ff4d6d] text-white border-[#ff4d6d] shadow-xs'
                          : 'bg-white border-[#dce6e1] text-neutral-600'
                      }`}
                    >
                      <Shirt className="w-4 h-4" />
                      <span>Fashions</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepartment('jewellery')}
                      className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        department === 'jewellery'
                          ? 'bg-[#0b3b2c] text-[#e5c07b] border-[#0b3b2c] shadow-xs'
                          : 'bg-white border-[#dce6e1] text-neutral-600'
                      }`}
                    >
                      <Gem className="w-4 h-4" />
                      <span>Jewellery</span>
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="font-bold text-[#0c2b22] block mb-1.5 uppercase tracking-wider">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Royal Kanchipuram Pure Zari Silk Saree"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#dce6e1] bg-white font-semibold text-[#0c2b22] outline-none focus:border-[#0b3b2c]"
                  />
                </div>

                {/* Category & Subcategory */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#0c2b22] block mb-1.5 uppercase tracking-wider">
                      Category
                    </label>
                    <select
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-white text-[#0c2b22] font-semibold outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#0c2b22] block mb-1.5 uppercase tracking-wider">
                      Sub-Category
                    </label>
                    <select
                      value={subcategoryName}
                      onChange={(e) => setSubcategoryName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-white text-[#0c2b22] font-semibold outline-none"
                    >
                      <option value="">None / General</option>
                      {subcategories.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.category_name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pricing & Stock */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#0c2b22] block mb-1.5 uppercase tracking-wider">
                      Selling Price *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={price}
                      onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="₹ 4500"
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] font-bold text-[#0b3b2c] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#0c2b22] block mb-1.5 uppercase tracking-wider">
                      MRP / Strike
                    </label>
                    <input
                      type="number"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="₹ 6000"
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] text-neutral-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#0c2b22] block mb-1.5 uppercase tracking-wider">
                      Stock Qty
                    </label>
                    <input
                      type="number"
                      value={stock}
                      onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="10"
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] text-neutral-800 outline-none"
                    />
                  </div>
                </div>

                {/* Image Section */}
                <div className="pt-2 border-t border-[#edf2ef] space-y-2">
                  <label className="font-bold text-[#0c2b22] block uppercase tracking-wider">
                    Product Hero Image
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-20 rounded-xl overflow-hidden bg-[#f0f4f2] border-2 border-dashed border-[#dce6e1] shrink-0 flex items-center justify-center p-0.5">
                      {imageUrl ? (
                        <img src={imageUrl} alt="Thumb" className="w-full h-full object-cover object-top rounded-lg" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 px-3 rounded-xl border border-[#dce6e1] bg-[#f8faf9] hover:bg-[#edf2ef] font-bold text-[#0b3b2c] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                        <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                      </button>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Or direct Image URL (https://...)"
                        className="w-full px-3 py-1.5 rounded-xl border border-[#dce6e1] text-[11px] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Variations: Colors & Sizes */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#edf2ef]">
                  <div>
                    <label className="font-bold text-[#0c2b22] block mb-1 uppercase tracking-wider">
                      Colors (comma separated)
                    </label>
                    <input
                      type="text"
                      value={colorsInput}
                      onChange={(e) => setColorsInput(e.target.value)}
                      placeholder="Pink, Magenta, Gold"
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#0c2b22] block mb-1 uppercase tracking-wider">
                      Sizes (comma separated)
                    </label>
                    <input
                      type="text"
                      value={sizesInput}
                      onChange={(e) => setSizesInput(e.target.value)}
                      placeholder="S, M, L, XL or 2.4, 2.6"
                      className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] outline-none"
                    />
                  </div>
                </div>

                {/* Fabric & Description */}
                <div>
                  <label className="font-bold text-[#0c2b22] block mb-1 uppercase tracking-wider">
                    Fabric / Material
                  </label>
                  <input
                    type="text"
                    value={fabric}
                    onChange={(e) => setFabric(e.target.value)}
                    placeholder="e.g. Pure Kanchipuram Silk, 22K Gold Antique Plating"
                    className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0c2b22] block mb-1 uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Artisan crafting details, styling notes..."
                    className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] outline-none resize-none"
                  />
                </div>

                {/* Buttons */}
                <div className="pt-4 border-t border-[#edf2ef] flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="flex-1 py-3 rounded-xl border border-[#dce6e1] text-neutral-600 font-bold uppercase tracking-wider hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="flex-1 py-3 rounded-xl bg-[#0b3b2c] hover:bg-[#06231a] text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#0b3b2c]/20 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{isEditing ? 'Save Changes' : 'Publish Product'}</span>
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}