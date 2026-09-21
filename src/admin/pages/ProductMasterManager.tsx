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
  Palette,
  Ruler,
  Scissors,
  Check,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ProductMasterModal from '../components/modals/ProductMasterModal';

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

const COLOR_MAP: { [key: string]: string } = {
  'baby pink': '#F4C2C2',
  'beige': '#F5F5DC',
  'black': '#1A1A1A',
  'crimson red': '#DC143C',
  'dark green': '#006400',
  'grey': '#808080',
  'gray': '#808080',
  'maroon': '#800000',
  'mustard yellow': '#E1AD01',
  'musturd yellow': '#E1AD01',
  'navy blue': '#000080',
  'peach': '#FFDAB9',
  'pink': '#FFC0CB',
  'rani pink': '#E30B5C',
  'sky blue': '#87CEEB',
  'turquoise': '#40E0D0',
  'violet': '#8A2BE2',
  'white': '#FFFFFF',
  'yellow': '#FFD700',
  'red': '#FF0000',
  'green': '#008000',
  'blue': '#0000FF',
  'orange': '#FFA500',
  'purple': '#800080',
  'brown': '#A52A2A',
  'rusty red': '#B7410E',
  'tan brown': '#D2B48C',
  'gold': '#D4AF37',
  'silver': '#C0C0C0'
};

function getChipColor(name: string): string {
  const clean = (name || '').toLowerCase().trim();
  if (COLOR_MAP[clean]) return COLOR_MAP[clean];
  for (const [k, v] of Object.entries(COLOR_MAP)) {
    if (clean.includes(k)) return v;
  }
  return '#6d4aff';
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
  const [activePreviewImageIndex, setActivePreviewImageIndex] = useState<number>(0);

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
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                brandFilter === 'all' ? 'bg-[#6d4aff] text-white' : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setBrandFilter('fashions')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                brandFilter === 'fashions' ? 'bg-[#6d4aff] text-white' : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              Fashion
            </button>
            <button
              type="button"
              onClick={() => setBrandFilter('jewellery')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {colors.slice(0, 3).map((clr, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] text-white"
                                >
                                  <span
                                    className="w-2 h-2 rounded-full border border-white/20 shrink-0"
                                    style={{ backgroundColor: getChipColor(clr) }}
                                  />
                                  <span>{clr}</span>
                                </span>
                              ))}
                              {colors.length > 3 && (
                                <span className="text-[8.5px] font-mono text-[#8b9bb4]">
                                  +{colors.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          {sizes.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {sizes.slice(0, 4).map((sz, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] font-mono text-[#00ff9d] bg-white/5 px-1.5 py-0.5 rounded border border-white/10"
                                >
                                  {sz}
                                </span>
                              ))}
                              {sizes.length > 4 && (
                                <span className="text-[8.5px] font-mono text-[#8b9bb4]">
                                  +{sizes.length - 4}
                                </span>
                              )}
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
                            onClick={() => {
                              setActivePreviewImageIndex(0);
                              setViewingProduct(prod);
                            }}
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
      {/* 4. UPGRADED & STYLISH PRODUCT SHOWCASE VIEW MODAL                         */}
      {/* ========================================================================= */}
      {viewingProduct && (
        <div
          onClick={() => setViewingProduct(null)}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-[#0a0e17]/85 backdrop-blur-xl animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#101628]/95 border border-white/15 rounded-3xl max-w-3xl w-full overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_30px_rgba(109,74,255,0.25)] relative animate-in zoom-in-95 flex flex-col max-h-[92vh]"
          >
            {/* Top Glowing Ambient Line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-[#6d4aff] via-[#00d9ff] to-[#00ff9d]" />

            {/* Modal Header */}
            <div className="p-4 sm:px-6 sm:py-4 border-b border-white/10 flex items-center justify-between bg-[#0a0e17]/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
                  <Sparkles className="w-4.5 h-4.5 text-[#00d9ff]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#00ff9d] bg-[#00ff9d]/10 px-2 py-0.5 rounded-md border border-[#00ff9d]/30">
                      {viewingProduct.id}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-[#8b9bb4] tracking-wider">
                      {viewingProduct.brand || 'Kashvi Studio'}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white mt-0.5 tracking-tight truncate max-w-md">
                    {viewingProduct.name}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Two-Column Responsive Layout */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                
                {/* Left: Gallery Showcase (5 Cols) */}
                <div className="md:col-span-5 space-y-3">
                  {viewingProduct.images && viewingProduct.images.length > 0 ? (
                    <>
                      <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden border border-white/15 bg-[#0a0e17] shadow-inner group">
                        <img
                          src={viewingProduct.images[activePreviewImageIndex]?.url || viewingProduct.images[0]?.url}
                          alt={viewingProduct.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {viewingProduct.images[activePreviewImageIndex]?.color_tag && (
                          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 text-[9.5px] font-bold text-white shadow-lg flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full border border-white/40"
                              style={{
                                backgroundColor: getChipColor(
                                  viewingProduct.images[activePreviewImageIndex]?.color_tag
                                )
                              }}
                            />
                            <span>{viewingProduct.images[activePreviewImageIndex]?.color_tag}</span>
                          </div>
                        )}
                      </div>

                      {/* Thumbnail List */}
                      {viewingProduct.images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                          {viewingProduct.images.map((img: any, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActivePreviewImageIndex(idx)}
                              className={`relative w-14 h-16 rounded-xl overflow-hidden border shrink-0 transition-all cursor-pointer ${
                                activePreviewImageIndex === idx
                                  ? 'border-[#00d9ff] ring-2 ring-[#00d9ff]/40 scale-95'
                                  : 'border-white/10 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <img src={img.url} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="aspect-[3/4] w-full rounded-2xl border border-white/10 bg-[#0a0e17]/80 flex flex-col items-center justify-center text-[#8b9bb4] gap-2">
                      <Package className="w-8 h-8 opacity-40 text-[#00d9ff]" />
                      <span className="text-[10.5px]">No preview image uploaded</span>
                    </div>
                  )}
                </div>

                {/* Right: Detailed Specification Panels (7 Cols) */}
                <div className="md:col-span-7 space-y-4">
                  
                  {/* Category & Taxonomy Badges */}
                  <div className="p-3.5 rounded-2xl bg-[#0a0e17]/70 border border-white/10 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[#8b9bb4] block mb-0.5">
                        Category
                      </span>
                      <span className="text-xs font-extrabold text-white">
                        {viewingProduct.category || 'General'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[#8b9bb4] block mb-0.5">
                        Sub-Category
                      </span>
                      <span className="text-xs font-extrabold text-[#00d9ff]">
                        {viewingProduct.sub_category || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[#8b9bb4] block mb-0.5">
                        Measurement Unit
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {viewingProduct.unit || 'Piece'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[#8b9bb4] block mb-0.5">
                        Brand Line
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {viewingProduct.brand || 'Kashvi Fashions'}
                      </span>
                    </div>
                  </div>

                  {/* Description Box */}
                  {viewingProduct.description && (
                    <div className="p-3.5 rounded-2xl bg-[#0a0e17]/70 border border-white/10 space-y-1">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[#8b9bb4] block font-bold">
                        Description & Notes
                      </span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {viewingProduct.description}
                      </p>
                    </div>
                  )}

                  {/* Colors Section */}
                  <div className="p-3.5 rounded-2xl bg-[#0a0e17]/70 border border-white/10 space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider">
                      <Palette className="w-3.5 h-3.5 text-[#ff6b6b]" />
                      <span>Registered Colors</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {((viewingProduct.variants?.colors && viewingProduct.variants.colors.length > 0)
                        ? viewingProduct.variants.colors
                        : (viewingProduct.colour ? [viewingProduct.colour] : [])
                      ).map((clr: string, i: number) => {
                        const hex = getChipColor(clr);
                        return (
                          <div
                            key={i}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#151c33] border border-white/15 text-xs font-bold text-white shadow-sm"
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                              style={{ backgroundColor: hex }}
                            />
                            <span>{clr}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sizes Section */}
                  <div className="p-3.5 rounded-2xl bg-[#0a0e17]/70 border border-white/10 space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider">
                      <Ruler className="w-3.5 h-3.5 text-[#00d9ff]" />
                      <span>Available Sizes</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {((viewingProduct.variants?.sizes && viewingProduct.variants.sizes.length > 0)
                        ? viewingProduct.variants.sizes
                        : (viewingProduct.size ? [viewingProduct.size] : [])
                      ).map((sz: string, i: number) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 rounded-xl bg-[#00d9ff]/10 border border-[#00d9ff]/30 text-[#00ff9d] font-mono text-xs font-bold"
                        >
                          {sz}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Fabrics (if available) */}
                  {((viewingProduct.variants?.fabrics && viewingProduct.variants.fabrics.length > 0) || viewingProduct.fabric) && (
                    <div className="p-3.5 rounded-2xl bg-[#0a0e17]/70 border border-white/10 space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider">
                        <Scissors className="w-3.5 h-3.5 text-[#00ff9d]" />
                        <span>Fabric Composition</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(viewingProduct.variants?.fabrics || [viewingProduct.fabric]).map((fab: any, i: number) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] font-semibold"
                          >
                            {fab}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Modal Bottom Footer Actions */}
            <div className="p-4 sm:px-6 border-t border-white/10 flex items-center justify-between bg-[#0a0e17]/80">
              <span className="text-[10px] font-mono text-[#8b9bb4]">
                Stock & Pricing are linked via Purchase Inward
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setViewingProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8b9bb4] hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(viewingProduct);
                    setViewingProduct(null);
                    setIsModalOpen(true);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#6d4aff] to-[#00d9ff] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#6d4aff]/30 hover:opacity-95 transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Product Master</span>
                </button>
              </div>
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