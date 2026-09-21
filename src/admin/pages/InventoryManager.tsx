import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Plus,
  Minus,
  Package,
  Building2,
  Tag,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InventoryItem {
  id: string;
  product_id: string;
  variant_color: string;
  variant_size: string;
  stock_quantity: number;
  low_stock_threshold: number;
  updated_at: string;
  product?: {
    name: string;
    category?: string | null;
    sub_category?: string | null;
    brand?: string | null;
    selling_price?: number;
    images?: any[] | null;
  };
}

export default function InventoryManager() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [brandFilter, setBrandFilter] = useState<'all' | 'fashions' | 'jewellery'>('all');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      // 1. Fetch inventory records
      const { data: invData, error: invErr } = await supabase
        .from('inventory')
        .select('*')
        .order('product_id', { ascending: true });

      if (invErr) throw invErr;

      // 2. Fetch all products to hydrate details
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('id, name, category, sub_category, brand, selling_price, images, variants, colour, size');

      if (prodErr) throw prodErr;

      const prodMap = new Map((prodData || []).map((p) => [p.id, p]));

      // 3. Auto-seed inventory for any product variant not yet in inventory table
      const existingKeySet = new Set(
        (invData || []).map((i) => `${i.product_id}_${i.variant_color}_${i.variant_size}`)
      );

      const missingInserts: any[] = [];

      (prodData || []).forEach((prod) => {
        const colors = prod.variants?.colors?.length ? prod.variants.colors : [prod.colour || 'Standard'];
        const sizes = prod.variants?.sizes?.length ? prod.variants.sizes : [prod.size || 'Free Size'];

        colors.forEach((c: string) => {
          sizes.forEach((s: string) => {
            const key = `${prod.id}_${c}_${s}`;
            if (!existingKeySet.has(key)) {
              missingInserts.push({
                id: `inv_${prod.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                product_id: prod.id,
                variant_color: c,
                variant_size: s,
                stock_quantity: 0,
                low_stock_threshold: 3
              });
              existingKeySet.add(key);
            }
          });
        });
      });

      if (missingInserts.length > 0) {
        await supabase.from('inventory').insert(missingInserts);
        // Refresh with inserted items
        const { data: reloaded } = await supabase
          .from('inventory')
          .select('*')
          .order('product_id', { ascending: true });

        const mapped = (reloaded || []).map((item) => ({
          ...item,
          product: prodMap.get(item.product_id)
        }));
        setItems(mapped);
      } else {
        const mapped = (invData || []).map((item) => ({
          ...item,
          product: prodMap.get(item.product_id)
        }));
        setItems(mapped);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAdjustStock = async (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, (item.stock_quantity || 0) + delta);
    setUpdatingId(item.id);
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ stock_quantity: newQty, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, stock_quantity: newQty } : i))
      );
    } catch (err: any) {
      alert('Failed to update stock: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const prod = item.product;
      const isJewel = (prod?.brand || '').toLowerCase().includes('jewel') || item.product_id.startsWith('KJ');

      if (brandFilter === 'fashions' && isJewel) return false;
      if (brandFilter === 'jewellery' && !isJewel) return false;

      if (stockFilter === 'low' && (item.stock_quantity > item.low_stock_threshold || item.stock_quantity === 0)) return false;
      if (stockFilter === 'out' && item.stock_quantity > 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mId = item.product_id.toLowerCase().includes(q);
        const mName = (prod?.name || '').toLowerCase().includes(q);
        const mColor = item.variant_color.toLowerCase().includes(q);
        const mSize = item.variant_size.toLowerCase().includes(q);
        return mId || mName || mColor || mSize;
      }

      return true;
    });
  }, [items, brandFilter, stockFilter, searchQuery]);

  const totalStockCount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.stock_quantity || 0), 0);
  }, [items]);

  const lowStockCount = useMemo(() => {
    return items.filter((i) => i.stock_quantity > 0 && i.stock_quantity <= i.low_stock_threshold).length;
  }, [items]);

  const outOfStockCount = useMemo(() => {
    return items.filter((i) => i.stock_quantity === 0).length;
  }, [items]);

  return (
    <div className="space-y-4 font-sans text-xs select-none">
      
      {/* 1. Header & Summary Metrics */}
      <div className="p-4 rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
            <Boxes className="w-5 h-5 text-[#00d9ff]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Inventory & Stock Deck</span>
              <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 text-[9.5px] font-mono">
                {totalStockCount} Units In Stock
              </span>
            </h2>
            <span className="text-[10px] text-[#8b9bb4]">
              Realtime Variant Stock Levels, Instant Adjustments & Inward Tracking
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-[#ffa500]/10 border border-[#ffa500]/30 text-[#ffa500] font-mono font-bold text-[10px] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low: {lowStockCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 text-[#ff6b6b] font-mono font-bold text-[10px] flex items-center gap-1.5">
            <span>Out: {outOfStockCount}</span>
          </div>
          <button
            type="button"
            onClick={fetchInventory}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#00d9ff] cursor-pointer transition-colors"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="p-3 rounded-2xl bg-[#0a0e17]/80 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Brand Domain Filter */}
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

          {/* Stock Condition Filter */}
          <div className="inline-flex p-1 bg-[#101628] rounded-xl border border-white/10 font-semibold">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                stockFilter === 'all' ? 'bg-white/15 text-white' : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              All Levels
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                stockFilter === 'low' ? 'bg-[#ffa500]/30 text-[#ffa500] font-bold' : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              Low Stock
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('out')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                stockFilter === 'out' ? 'bg-[#ff6b6b]/30 text-[#ff6b6b] font-bold' : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, title, color, size..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#101628] rounded-xl text-white text-[11px] outline-none border border-white/10 focus:border-[#00d9ff] placeholder:text-[#8b9bb4]/50"
          />
          <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* 3. Realtime Stock Table */}
      <div className="rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#0a0e17]/80 text-[#8b9bb4] font-mono text-[9.5px] uppercase tracking-wider">
                <th className="p-3.5">Product</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Variant (Color / Size)</th>
                <th className="p-3.5">Selling Price</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Current Stock</th>
                <th className="p-3.5 text-right">Instant Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#8b9bb4]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff] mb-2" />
                    Loading inventory records...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#8b9bb4] italic">
                    No inventory records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const prod = item.product;
                  const firstImg = prod?.images && prod.images[0] ? prod.images[0].url : null;
                  const isLow = item.stock_quantity > 0 && item.stock_quantity <= item.low_stock_threshold;
                  const isOut = item.stock_quantity === 0;

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      
                      {/* Product details */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          {firstImg ? (
                            <img
                              src={firstImg}
                              alt=""
                              className="w-9 h-10 object-cover rounded-lg border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#8b9bb4] shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <span className="font-mono font-extrabold text-[#00ff9d] text-xs block">
                              {item.product_id}
                            </span>
                            <span className="font-bold text-white text-xs block max-w-xs truncate">
                              {prod?.name || 'Product'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5">
                        <span className="font-semibold text-white block">{prod?.category || 'General'}</span>
                        <span className="text-[9.5px] text-[#00d9ff] font-mono block mt-0.5">
                          {prod?.sub_category || '—'}
                        </span>
                      </td>

                      {/* Variant Combo */}
                      <td className="p-3.5">
                        <div className="inline-flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white font-medium">
                            {item.variant_color}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-[#00d9ff]/10 border border-[#00d9ff]/30 text-[#00d9ff] font-mono font-bold">
                            {item.variant_size}
                          </span>
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td className="p-3.5 font-mono font-bold text-white">
                        ₹{Number(prod?.selling_price || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        {isOut ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#ff6b6b]/15 text-[#ff6b6b] border border-[#ff6b6b]/30 font-mono font-bold text-[9px] uppercase">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#ffa500]/15 text-[#ffa500] border border-[#ffa500]/30 font-mono font-bold text-[9px] uppercase">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#00ff9d]/15 text-[#00ff9d] border border-[#00ff9d]/30 font-mono font-bold text-[9px] uppercase">
                            Healthy
                          </span>
                        )}
                      </td>

                      {/* Stock Quantity */}
                      <td className="p-3.5 text-center">
                        <span className={`font-mono text-base font-extrabold ${
                          isOut ? 'text-[#ff6b6b]' : isLow ? 'text-[#ffa500]' : 'text-[#00ff9d]'
                        }`}>
                          {updatingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mx-auto text-[#00d9ff]" />
                          ) : (
                            item.stock_quantity
                          )}
                        </span>
                      </td>

                      {/* Quick Adjust Actions */}
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={item.stock_quantity <= 0 || updatingId === item.id}
                            onClick={() => handleAdjustStock(item, -1)}
                            className="w-7 h-7 rounded-xl bg-white/5 hover:bg-[#ff6b6b]/20 text-[#8b9bb4] hover:text-[#ff6b6b] flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 active:scale-95"
                            title="Decrease 1 Unit"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => handleAdjustStock(item, 1)}
                            className="w-7 h-7 rounded-xl bg-white/5 hover:bg-[#00ff9d]/20 text-[#8b9bb4] hover:text-[#00ff9d] flex items-center justify-center transition-all cursor-pointer active:scale-95"
                            title="Increase 1 Unit"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => handleAdjustStock(item, 5)}
                            className="px-2 h-7 rounded-xl bg-white/5 hover:bg-[#00d9ff]/20 text-[#00d9ff] font-mono text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95"
                            title="Add Pack (+5)"
                          >
                            +5
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

    </div>
  );
}