import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Building2,
  Tag,
  RefreshCw,
  Loader2,
  AlertCircle,
  X,
  Layers,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ProductMasterModal from '../components/ProductMasterModal'; // Modal file component path

export interface ProductRecord {
  id: string;
  name: string;
  category?: string | null;
  sub_category?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  colour?: string | null;
  size?: string | null;
  unit?: string | null;
  brand?: string | null;
  model_no?: string | null;
  barcode?: string | null;
  selling_price?: number;
  cost_price?: number;
  gst?: number;
  weight?: number;
  weight_unit?: string;
  images?: any[] | null;
  active?: boolean;
  created_at?: string;
  variants?: {
    colors?: string[];
    sizes?: string[];
    fabrics?: string[];
  } | null;
  description?: string;
  fabric?: string | null;
}

export default function ProductMasterManager() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<'all' | 'fashions' | 'jewellery'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [viewingProduct, setViewingProduct] = useState<ProductRecord | null>(null);

  // Load Products from Supabase DB
  const loadProducts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setErrorMsg(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Delete Product Handler
  const handleDeleteProduct = async (product: ProductRecord) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete product [${product.id}] - "${product.name}"?`
    );
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', product.id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  // Distinct Categories list for filter
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  // Filter Logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const isJewel = (p.brand || '').toLowerCase().includes('jewel') || p.id.startsWith('KJ');
      if (brandFilter === 'fashions' && isJewel) return false;
      if (brandFilter === 'jewellery' && !isJewel) return false;

      if (categoryFilter !== 'all' && (p.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = p.id.toLowerCase().includes(q);
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        const matchSub = (p.sub_category || '').toLowerCase().includes(q);
        return matchId || matchName || matchCat || matchSub;
      }

      return true;
    });
  }, [products, brandFilter, categoryFilter, searchQuery]);

  return (
    <div className="space-y-4 font-sans text-xs select-none">
      
      {/* 1. TOP HEADER & METRICS */}
      <div className="p-4 rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
            <Package className="w-5 h-5 text-[#00d9ff]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Product Master Catalog</span>
              <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 text-[9.5px] font-mono">
                {products.length} Items Total
              </span>
            </h2>
            <span className="text-[10px] text-[#8b9bb4]">
              Manage Product Specifications, Universal Colors & Linked Sizes
            </span>
          </div>
        </div>

        {/* Action Buttons: Refresh & Add Product */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadProducts}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#00d9ff] cursor-pointer transition-colors"
            title="Refresh Products"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#6d4aff]/30 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#00ff9d]" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROL BAR */}
      <div className="p-3 rounded-2xl bg-[#0a0e17]/80 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Brand Domain Tabs */}
          <div className="inline-flex p-1 bg-[#101628] rounded-xl border border-white/10 font-bold">
            <button
              type="button"
              onClick={() => setBrandFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                brandFilter === 'all' ? 'bg-[#6d4aff] text-white' : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setBrandFilter('fashions')}
              className={`px-3 py-1 rounded-lg transition-all ${
                brandFilter === 'fashions' ? 'bg-[#6d4aff] text-white' : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              Fashion
            </button>
            <button
              type="button"
              onClick={() => setBrandFilter('jewellery')}
              className={`px-3 py-1 rounded-lg transition-all ${
                brandFilter === 'jewellery' ? 'bg-[#6d4aff] text-white' : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              Jewellery
            </button>
          </div>

          {/* Category Dropdown Filter */}
          <div className="flex items-center gap-1.5 bg-[#101628] border border-white/10 rounded-xl px-2.5 py-1">
            <Tag className="w-3 h-3 text-[#00d9ff]" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-white font-medium outline-none cursor-pointer [&>option]:bg-[#101628] [&>option]:text-white"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Search Input */}
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, title, category..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#101628] rounded-xl text-white text-[11px] outline-none border border-white/10 focus:border-[#00d9ff] placeholder:text-[#8b9bb4]/50"
          />
          <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 text-[#ff6b6b] font-bold">
          {errorMsg}
        </div>
      )}

      {/* 3. PRODUCTS DATA TABLE */}
      <div className="rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#0a0e17]/80 text-[#8b9bb4] font-mono text-[9.5px] uppercase tracking-wider">
                <th className="p-3.5">Product Code</th>
                <th className="p-3.5">Product Spec Title</th>
                <th className="p-3.5">Category & Sub-Category</th>
                <th className="p-3.5">Colors & Sizes</th>
                <th className="p-3.5">Unit</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8b9bb4]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff] mb-2" />
                    Loading product masters catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8b9bb4] italic">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const colors = prod.variants?.colors || (prod.colour ? [prod.colour] : []);
                  const sizes = prod.variants?.sizes || (prod.size ? [prod.size] : []);
                  const firstImg = prod.images && prod.images[0] ? prod.images[0].url : null;
                  const isJewel = (prod.brand || '').toLowerCase().includes('jewel') || prod.id.startsWith('KJ');

                  return (
                    <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Product Code & Image */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          {firstImg ? (
                            <img
                              src={firstImg}
                              alt={prod.name}
                              className="w-9 h-10 object-cover rounded-lg border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#8b9bb4] shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <span className="font-mono font-extrabold text-[#00ff9d] text-xs block">
                              {prod.id}
                            </span>
                            <span className="text-[9px] font-mono text-[#8b9bb4]">
                              {isJewel ? 'Jewellery' : 'Fashion'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Title & Description */}
                      <td className="p-3.5">
                        <span className="font-bold text-white text-xs block max-w-xs truncate">
                          {prod.name}
                        </span>
                        {prod.description && (
                          <span className="text-[9.5px] text-[#8b9bb4] truncate block max-w-xs mt-0.5">
                            {prod.description}
                          </span>
                        )}
                      </td>

                      {/* Category & Sub-Category */}
                      <td className="p-3.5">
                        <span className="font-semibold text-white block">
                          {prod.category || 'General'}
                        </span>
                        <span className="text-[9.5px] text-[#00d9ff] font-mono block mt-0.5">
                          {prod.sub_category || '—'}
                        </span>
                      </td>

                      {/* Colors & Sizes Variants */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {colors.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[9px] text-[#8b9bb4] font-mono">
                                {colors.length} Color{colors.length > 1 ? 's' : ''}:
                              </span>
                              <span className="text-[9.5px] text-white font-medium truncate max-w-[150px]">
                                {colors.slice(0, 2).join(', ')}
                                {colors.length > 2 ? ` +${colors.length - 2}` : ''}
                              </span>
                            </div>
                          )}
                          {sizes.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[9px] text-[#8b9bb4] font-mono">
                                {sizes.length} Size{sizes.length > 1 ? 's' : ''}:
                              </span>
                              <span className="text-[9px] font-mono text-[#00ff9d] bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                                {sizes.slice(0, 3).join(', ')}
                                {sizes.length > 3 ? ` +${sizes.length - 3}` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="p-3.5 font-mono text-[#8b9bb4]">
                        {prod.unit || 'Piece'}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingProduct(prod)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#00d9ff]/20 text-[#8b9bb4] hover:text-[#00d9ff] cursor-pointer transition-colors"
                            title="Quick View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(prod);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#00ff9d]/20 text-[#8b9bb4] hover:text-[#00ff9d] cursor-pointer transition-colors"
                            title="Edit Product Master"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#ff6b6b]/20 text-[#8b9bb4] hover:text-[#ff6b6b] cursor-pointer transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
      {/* 4. VIEW PRODUCT DETAILS POPUP MODAL                                       */}
      {/* ========================================================================= */}
      {viewingProduct && (
        <div
          onClick={() => setViewingProduct(null)}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#101628] border border-white/15 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative animate-in zoom-in-95"
          >
            <div className="flex justify-between items-start border-b border-white/10 pb-3">
              <div>
                <span className="font-mono text-sm font-extrabold text-[#00ff9d]">
                  {viewingProduct.id}
                </span>
                <h3 className="text-base font-extrabold text-white mt-0.5">{viewingProduct.name}</h3>
                <span className="text-[10px] text-[#8b9bb4]">
                  {viewingProduct.category} • {viewingProduct.sub_category || '—'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Images */}
            {viewingProduct.images && viewingProduct.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {viewingProduct.images.map((img: any, i: number) => (
                  <img
                    key={i}
                    src={img.url}
                    alt="preview"
                    className="w-20 h-24 object-cover rounded-xl border border-white/10 shrink-0"
                  />
                ))}
              </div>
            )}

            {/* Description */}
            {viewingProduct.description && (
              <p className="text-[11px] text-[#8b9bb4] leading-relaxed bg-[#0a0e17] p-3 rounded-2xl border border-white/5">
                {viewingProduct.description}
              </p>
            )}

            {/* Colors & Sizes Grid */}
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="bg-[#0a0e17] p-3 rounded-2xl border border-white/5">
                <span className="text-[#8b9bb4] block font-mono text-[9px] uppercase font-bold mb-1">
                  Colors
                </span>
                <span className="text-white font-medium">
                  {viewingProduct.variants?.colors?.join(', ') || viewingProduct.colour || '—'}
                </span>
              </div>
              <div className="bg-[#0a0e17] p-3 rounded-2xl border border-white/5">
                <span className="text-[#8b9bb4] block font-mono text-[9px] uppercase font-bold mb-1">
                  Sizes
                </span>
                <span className="text-[#00ff9d] font-mono font-bold">
                  {viewingProduct.variants?.sizes?.join(', ') || viewingProduct.size || '—'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(viewingProduct);
                  setViewingProduct(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-[#6d4aff] hover:bg-[#5b3adb] text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit This Product</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ADD / EDIT PRODUCT MODAL (POPUP)                                       */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <ProductMasterModal
          initialProduct={editingProduct}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
            loadProducts();
          }}
        />
      )}

    </div>
  );
}