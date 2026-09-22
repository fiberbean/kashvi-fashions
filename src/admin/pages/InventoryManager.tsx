import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Loader2,
  Package,
  Layers,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  User,
  Store,
  Receipt,
  X,
  History,
  TrendingUp,
  Tag,
  Palette,
  Filter,
  ChevronDown,
  Check,
  Grid
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InventoryProductRow {
  product_id: string;
  product_code: string;
  product_name: string;
  category: string;
  sub_category: string;
  cost_price: number;
  landed_price: number;
  store_price: number;
  online_price: number;
  total_stock: number;
  variants: {
    color: string;
    size: string;
    stock: number;
    hex: string;
  }[];
}

interface PurchaseHistoryItem {
  purchase_id: string;
  supplier_name: string;
  supplier_bill_no: string;
  purchase_date: string;
  variant_color: string;
  variant_size: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface SalesHistoryItem {
  order_id: string;
  customer_name: string;
  sale_date: string;
  variant_color: string;
  variant_size: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

function getContrastTextColor(hexColor: string | null | undefined): string {
  if (!hexColor) return '#FFFFFF';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#0B0F19' : '#FFFFFF';
}

function getDynamicColorHex(colorName: string): string {
  const c = (colorName || '').toLowerCase().trim();
  if (c.includes('red') || c.includes('rani') || c.includes('rose') || c.includes('crimson') || c.includes('maroon')) return '#E30B5C';
  if (c.includes('green') || c.includes('pista') || c.includes('mint') || c.includes('olive')) return '#00843D';
  if (c.includes('blue') || c.includes('navy') || c.includes('teal') || c.includes('aqua') || c.includes('sky')) return '#0052CC';
  if (c.includes('yellow') || c.includes('gold') || c.includes('mustard')) return '#FFB800';
  if (c.includes('purple') || c.includes('violet') || c.includes('lavender') || c.includes('lilac')) return '#7E57C2';
  if (c.includes('orange') || c.includes('peach') || c.includes('rust')) return '#FF7043';
  if (c.includes('black') || c.includes('charcoal')) return '#212121';
  if (c.includes('white') || c.includes('cream') || c.includes('ivory') || c.includes('offwhite')) return '#F5F5F5';
  if (c.includes('pink')) return '#FF69B4';
  if (c.includes('brown') || c.includes('khaki') || c.includes('beige')) return '#8D6E63';
  if (c.includes('grey') || c.includes('gray')) return '#757575';
  return '#6d4aff';
}

export default function InventoryManager() {
  const [productRows, setProductRows] = useState<InventoryProductRow[]>([]);
  const [coloursList, setColoursList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedSubCatFilter, setSelectedSubCatFilter] = useState<string>('all');
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'low' | 'out'>('all');

  const [selectedProductForHistory, setSelectedProductForHistory] = useState<InventoryProductRow | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const [prodRes, colorRes, invRes, purchRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('colours').select('name, hex_code'),
        supabase.from('inventory').select('*'),
        supabase.from('purchase_items').select('*')
      ]);

      const products = prodRes.data || [];
      const inventoryRecords = invRes.data || [];
      const purchaseRecords = purchRes.data || [];

      let colorHexMap = new Map<string, string>();
      (colorRes.data || []).forEach((c: any) => {
        if (c.name && c.hex_code) {
          colorHexMap.set(c.name.toLowerCase().trim(), c.hex_code.trim());
        }
      });
      setColoursList(colorRes.data || []);

      const latestCostMap = new Map<string, number>();
      purchaseRecords.forEach((pi: any) => {
        if (pi.product_id && pi.unit_cost) {
          latestCostMap.set(String(pi.product_id).toUpperCase().trim(), Number(pi.unit_cost));
        }
      });

      const groupedMap = new Map<string, InventoryProductRow>();

      products.forEach((prod) => {
        const pId = String(prod.id).toUpperCase().trim();
        const code = String(prod.code || prod.id);
        const name = String(prod.name || 'UNKNOWN PRODUCT');
        const cat = String(prod.category || 'FASHION');
        const subCat = String(prod.sub_category || 'GENERAL');

        const baseCost = Number(prod.cost_price || prod.price || latestCostMap.get(pId) || 0);
        const landed = baseCost > 0 ? Math.round(baseCost * 1.10) : 0;
        const store = prod.offline_price || prod.store_price || prod.selling_price || (landed > 0 ? Math.ceil(((landed * 2) * 1.10) / 5) * 5 : 0);
        const online = prod.online_price || (landed > 0 ? Math.ceil(((landed * 2) * 1.20) / 10) * 10 : 0);

        groupedMap.set(pId, {
          product_id: pId,
          product_code: code,
          product_name: name,
          category: cat,
          sub_category: subCat,
          cost_price: baseCost,
          landed_price: landed,
          store_price: store,
          online_price: online,
          total_stock: 0,
          variants: []
        });
      });

      const variantStockMap = new Map<string, number>();
      inventoryRecords.forEach((inv: any) => {
        const pId = String(inv.product_id).toUpperCase().trim();
        const color = String(inv.variant_color || inv.color || 'STANDARD').toUpperCase().trim();
        const size = String(inv.variant_size || inv.size || 'FREE SIZE').toUpperCase().trim();
        const stock = Number(inv.stock_quantity ?? inv.quantity ?? 0);
        const key = `${pId}___${color}___${size}`;
        variantStockMap.set(key, (variantStockMap.get(key) || 0) + stock);
      });

      purchaseRecords.forEach((pi: any) => {
        const pId = String(pi.product_id).toUpperCase().trim();
        const color = String(pi.variant_color || pi.color || 'STANDARD').toUpperCase().trim();
        const size = String(pi.variant_size || pi.size || 'FREE SIZE').toUpperCase().trim();
        const qty = Number(pi.quantity || 0);
        const key = `${pId}___${color}___${size}`;

        if (!variantStockMap.has(key)) {
          variantStockMap.set(key, qty);
        }
      });

      variantStockMap.forEach((stock, key) => {
        const [pId, color, size] = key.split('___');
        if (groupedMap.has(pId)) {
          const row = groupedMap.get(pId)!;
          const hex = colorHexMap.get(color.toLowerCase().trim()) || getDynamicColorHex(color);
          row.variants.push({ color, size, stock, hex });
          row.total_stock += stock;
        }
      });

      groupedMap.forEach((row, pId) => {
        if (row.variants.length === 0) {
          const prod = products.find((p) => String(p.id).toUpperCase().trim() === pId);
          let sizes = ['FREE SIZE'];
          if (prod?.size) {
            sizes = typeof prod.size === 'string' ? prod.size.split(',').map((s: string) => s.trim().toUpperCase()) : prod.size;
          }
          let colors = ['STANDARD'];
          if (prod?.colour) {
            colors = typeof prod.colour === 'string' ? prod.colour.split(',').map((c: string) => c.trim().toUpperCase()) : prod.colour;
          }

          colors.forEach((c) => {
            sizes.forEach((s) => {
              const hex = colorHexMap.get(c.toLowerCase().trim()) || getDynamicColorHex(c);
              row.variants.push({ color: c, size: s, stock: 0, hex });
            });
          });
        }
      });

      const rowsArray = Array.from(groupedMap.values());
      rowsArray.sort((a, b) => a.product_code.localeCompare(b.product_code, undefined, { numeric: true, sensitivity: 'base' }));

      setProductRows(rowsArray);
    } catch (err: any) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleOpenProductHistory = async (row: InventoryProductRow) => {
    setSelectedProductForHistory(row);
    setLoadingHistory(true);
    setPurchaseHistory([]);
    setSalesHistory([]);

    try {
      const { data: purItems } = await supabase
        .from('purchase_items')
        .select(`
          quantity,
          unit_cost,
          total_cost,
          variant_color,
          variant_size,
          purchases (
            id,
            supplier_name,
            supplier_bill_no,
            purchase_date
          )
        `)
        .eq('product_id', row.product_id);

      if (purItems && purItems.length > 0) {
        const mappedPurchases: PurchaseHistoryItem[] = purItems.map((pi: any) => ({
          purchase_id: pi.purchases?.id || '—',
          supplier_name: pi.purchases?.supplier_name || 'DIRECT INWARD',
          supplier_bill_no: pi.purchases?.supplier_bill_no || '—',
          purchase_date: pi.purchases?.purchase_date || '—',
          variant_color: String(pi.variant_color || 'STANDARD').toUpperCase(),
          variant_size: String(pi.variant_size || 'FREE SIZE').toUpperCase(),
          quantity: Number(pi.quantity || 0),
          unit_cost: Number(pi.unit_cost || 0),
          total_cost: Number(pi.total_cost || (pi.quantity * pi.unit_cost) || 0)
        }));
        setPurchaseHistory(mappedPurchases);
      }

      const { data: saleItems } = await supabase
        .from('order_items')
        .select(`
          quantity,
          price,
          total,
          variant_color,
          variant_size,
          orders (
            id,
            customer_name,
            created_at
          )
        `)
        .eq('product_id', row.product_id);

      if (saleItems && saleItems.length > 0) {
        const mappedSales: SalesHistoryItem[] = saleItems.map((si: any) => ({
          order_id: si.orders?.id || '—',
          customer_name: si.orders?.customer_name || 'WALK-IN CUSTOMER',
          sale_date: si.orders?.created_at ? new Date(si.orders.created_at).toLocaleDateString('en-IN') : '—',
          variant_color: String(si.variant_color || 'STANDARD').toUpperCase(),
          variant_size: String(si.variant_size || 'FREE SIZE').toUpperCase(),
          quantity: Number(si.quantity || 0),
          unit_price: Number(si.price || 0),
          total_amount: Number(si.total || (si.quantity * si.price) || 0)
        }));
        setSalesHistory(mappedSales);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const lowStockCount = useMemo(() => {
    return productRows.filter((r) => r.total_stock > 0 && r.total_stock <= 3).length;
  }, [productRows]);

  const outOfStockCount = useMemo(() => {
    return productRows.filter((r) => r.total_stock <= 0).length;
  }, [productRows]);

  const distinctCategories = useMemo(() => {
    const set = new Set<string>();
    productRows.forEach((r) => {
      if (r.category) set.add(r.category.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [productRows]);

  const distinctSubCategories = useMemo(() => {
    const set = new Set<string>();
    productRows.forEach((r) => {
      if (selectedCategoryFilter === 'all' || r.category.toLowerCase() === selectedCategoryFilter.toLowerCase()) {
        if (r.sub_category) set.add(r.sub_category.trim().toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [productRows, selectedCategoryFilter]);

  const filteredProductRows = useMemo(() => {
    return productRows.filter((row) => {
      if (selectedCategoryFilter !== 'all' && row.category.toLowerCase() !== selectedCategoryFilter.toLowerCase()) {
        return false;
      }
      if (selectedSubCatFilter !== 'all' && row.sub_category.toLowerCase() !== selectedSubCatFilter.toLowerCase()) {
        return false;
      }
      if (stockLevelFilter === 'low' && !(row.total_stock > 0 && row.total_stock <= 3)) {
        return false;
      }
      if (stockLevelFilter === 'out' && row.total_stock > 0) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toUpperCase().trim();
        const matchCode = row.product_code.includes(q);
        const matchName = row.product_name.includes(q);
        const matchSub = row.sub_category.includes(q);
        const matchVar = row.variants.some((v) => v.color.includes(q) || v.size.includes(q));
        return matchCode || matchName || matchSub || matchVar;
      }
      return true;
    });
  }, [productRows, selectedCategoryFilter, selectedSubCatFilter, stockLevelFilter, searchQuery]);

  return (
    <div className="space-y-3 font-sans text-xs select-none uppercase">
      
      {/* 1. FILTER & SEARCH BAR */}
      <div className="px-3.5 py-2.5 rounded-2xl bg-[#101628]/95 border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a0e17] border border-white/10 text-white">
            <Filter className="w-3.5 h-3.5 text-[#00d9ff]" />
            <span className="text-[11px] font-bold text-[#8b9bb4] uppercase tracking-wider">FILTER:</span>
            
            <select
              value={selectedCategoryFilter}
              onChange={(e) => {
                setSelectedCategoryFilter(e.target.value);
                setSelectedSubCatFilter('all');
              }}
              className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer pr-1 uppercase"
            >
              <option value="all" className="bg-[#101628] text-white">ALL CATEGORIES</option>
              {distinctCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-[#101628] text-white">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {distinctSubCategories.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0a0e17] border border-white/10 text-white">
              <span className="text-[11px] font-mono text-[#8b9bb4]">SUB-CAT:</span>
              <select
                value={selectedSubCatFilter}
                onChange={(e) => setSelectedSubCatFilter(e.target.value)}
                className="bg-transparent text-[#00d9ff] font-bold text-xs outline-none cursor-pointer uppercase"
              >
                <option value="all" className="bg-[#101628] text-white">ALL SUB-CATEGORIES</option>
                {distinctSubCategories.map((sub) => (
                  <option key={sub} value={sub} className="bg-[#101628] text-white">
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(selectedCategoryFilter !== 'all' || selectedSubCatFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryFilter('all');
                setSelectedSubCatFilter('all');
              }}
              className="p-1 rounded-lg hover:bg-white/10 text-[#ff6b6b] text-[11px] font-bold cursor-pointer uppercase"
              title="Reset Filters"
            >
              CLEAR
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStockLevelFilter(stockLevelFilter === 'low' ? 'all' : 'low')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
              stockLevelFilter === 'low'
                ? 'bg-[#ffa500] text-neutral-950 border-[#ffa500] shadow-md scale-105'
                : 'bg-[#ffa500]/10 text-[#ffa500] border-[#ffa500]/30 hover:bg-[#ffa500]/20'
            }`}
          >
            <span>LOW:</span>
            <span className="font-extrabold">{lowStockCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStockLevelFilter(stockLevelFilter === 'out' ? 'all' : 'out')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
              stockLevelFilter === 'out'
                ? 'bg-[#ff6b6b] text-white border-[#ff6b6b] shadow-md scale-105'
                : 'bg-[#ff6b6b]/10 text-[#ff6b6b] border-[#ff6b6b]/30 hover:bg-[#ff6b6b]/20'
            }`}
          >
            <span>OUT:</span>
            <span className="font-extrabold">{outOfStockCount}</span>
          </button>

          <div className="relative w-56 sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              placeholder="SEARCH CODE, TITLE, COLOR, SIZE..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0a0e17] rounded-xl text-white text-xs outline-none border border-white/10 focus:border-[#00d9ff] uppercase font-mono"
            />
            <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="button"
            onClick={loadInventory}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#00d9ff] cursor-pointer"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. INVENTORY TABLE */}
      <div className="rounded-2xl bg-[#101628]/95 border border-white/10 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#0a0e17]/80 text-[#8b9bb4] font-mono text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">PRODUCT CODE & NAME</th>
                <th className="py-2.5 px-3">CATEGORY & SUB-CATEGORY</th>
                <th className="py-2.5 px-3">COLOURS & STOCK CUBES</th>
                <th className="py-2.5 px-3">SIZES AVAILABLE</th>
                <th className="py-2.5 px-3 text-right">COST PRICE</th>
                <th className="py-2.5 px-3 text-right">LANDED PRICE</th>
                <th className="py-2.5 px-3 text-right">STORE PRICE</th>
                <th className="py-2.5 px-3 text-right">ONLINE PRICE</th>
                <th className="py-2.5 px-3 text-center">TOTAL STOCK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#8b9bb4]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff] mb-2" />
                    LOADING REAL-TIME INVENTORY...
                  </td>
                </tr>
              ) : filteredProductRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#8b9bb4] italic text-xs uppercase">
                    NO PRODUCTS MATCH YOUR CRITERIA.
                  </td>
                </tr>
              ) : (
                filteredProductRows.map((row) => {
                  const isOut = row.total_stock <= 0;
                  const isLow = row.total_stock > 0 && row.total_stock <= 3;

                  const uniqueColors = Array.from(new Set(row.variants.map((v) => v.color))).map((colorName) => {
                    const found = row.variants.find((v) => v.color === colorName);
                    const shadeStock = row.variants.filter((v) => v.color === colorName).reduce((sum, v) => sum + v.stock, 0);
                    const dynamicHex = found?.hex && found.hex !== '#6d4aff' ? found.hex : getDynamicColorHex(colorName);
                    return { color: colorName, hex: dynamicHex, stock: shadeStock };
                  });

                  const uniqueSizes = Array.from(new Set(row.variants.map((v) => v.size)));

                  return (
                    <tr
                      key={row.product_id}
                      onClick={() => handleOpenProductHistory(row)}
                      className="hover:bg-white/[0.04] transition-all cursor-pointer group"
                      title="CLICK TO VIEW AUDIT TRAIL"
                    >
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-[#00ff9d] text-[11px] block">
                          [{row.product_code}]
                        </span>
                        <span className="font-extrabold text-white text-xs block truncate mt-0.5 tracking-wide">
                          {row.product_name}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-white text-xs block">
                          {row.category}
                        </span>
                        <span className="text-[10px] font-mono text-[#8b9bb4] block mt-0.5">
                          {row.sub_category}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-2 max-w-[260px]">
                          {uniqueColors.map((uc) => {
                            const cubeBg = uc.hex;
                            const textColor = getContrastTextColor(cubeBg);

                            return (
                              <div
                                key={uc.color}
                                className="w-9 h-9 rounded-xl border-2 border-white/30 shadow-md flex items-center justify-center font-mono font-black text-xs shrink-0 transition-transform hover:scale-110"
                                style={{ backgroundColor: cubeBg, color: textColor }}
                                title={`${uc.color} — Stock: ${uc.stock}`}
                              >
                                {uc.stock}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {uniqueSizes.map((sz) => {
                            const szStock = row.variants.filter((v) => v.size === sz).reduce((sum, v) => sum + v.stock, 0);
                            return (
                              <span
                                key={sz}
                                className={`px-2 py-0.5 rounded font-mono text-[10.5px] font-black border uppercase ${
                                  szStock > 0
                                    ? 'bg-[#00d9ff]/10 text-[#00d9ff] border-[#00d9ff]/30'
                                    : 'bg-white/5 text-[#8b9bb4] border-white/10'
                                }`}
                              >
                                {sz}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-[#8b9bb4]">
                        {row.cost_price ? `₹${row.cost_price.toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-[#ffa500]">
                        {row.landed_price ? `₹${row.landed_price.toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {row.store_price ? `₹${row.store_price.toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-[#00d9ff]">
                        {row.online_price ? `₹${row.online_price.toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[55px] px-2.5 py-0.5 rounded-full font-mono text-[10.5px] font-black border ${
                            isOut
                              ? 'bg-[#ff6b6b]/15 text-[#ff6b6b] border-[#ff6b6b]/30'
                              : isLow
                              ? 'bg-[#ffa500]/15 text-[#ffa500] border-[#ffa500]/30'
                              : 'bg-[#00ff9d]/15 text-[#00ff9d] border-[#00ff9d]/30'
                          }`}
                        >
                          {row.total_stock} UNITS
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. AUDIT TRAIL MODAL */}
      {selectedProductForHistory && (
        <div className="fixed inset-0 z-[100000] pt-[76px] pb-6 px-3 sm:px-6 flex items-start justify-center bg-black/85 backdrop-blur-md overflow-y-auto select-none animate-in fade-in">
          <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-4xl w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[calc(100vh-100px)] flex flex-col my-auto">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00d9ff] to-[#6d4aff] text-white flex items-center justify-center shadow">
                  <History className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase">
                    <span>[{selectedProductForHistory.product_code}] {selectedProductForHistory.product_name}</span>
                  </h4>
                  <span className="text-[10px] font-mono text-[#00d9ff]">
                    PURCHASE INWARD & SALES DISPATCH AUDIT TRAIL
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProductForHistory(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#8b9bb4] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 custom-scrollbar p-1">
              {loadingHistory ? (
                <div className="p-8 text-center text-[#8b9bb4]">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff] mb-1.5" />
                  FETCHING LIFECYCLE LOGS...
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono uppercase">
                      <span className="font-bold text-[#00d9ff] flex items-center gap-1.5">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-[#00d9ff]" />
                        PURCHASE INWARD LOG ({purchaseHistory.length})
                      </span>
                    </div>

                    <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17]">
                      {purchaseHistory.length === 0 ? (
                        <div className="p-4 text-center text-[#8b9bb4] italic text-xs uppercase">
                          NO DIRECT PURCHASE INWARD RECORDS TRACKED FOR THIS PRODUCT.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs uppercase">
                          <thead className="bg-[#101628] text-[#8b9bb4] font-mono text-[9px] uppercase border-b border-white/10">
                            <tr>
                              <th className="py-1.5 px-2.5">PURCHASE BILL</th>
                              <th className="py-1.5 px-2.5">SUPPLIER NAME</th>
                              <th className="py-1.5 px-2 text-center">VARIANT</th>
                              <th className="py-1.5 px-2 text-center">DATE</th>
                              <th className="py-1.5 px-2 text-center">QTY</th>
                              <th className="py-1.5 px-2 text-right">COST (₹)</th>
                              <th className="py-1.5 px-2.5 text-right">TOTAL (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono">
                            {purchaseHistory.map((ph, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.02]">
                                <td className="py-2 px-2.5 font-bold text-[#00ff9d]">
                                  {ph.purchase_id}
                                  <span className="block text-[9px] text-[#8b9bb4]">BILL: {ph.supplier_bill_no}</span>
                                </td>
                                <td className="py-2 px-2.5 font-sans font-semibold text-white">{ph.supplier_name}</td>
                                <td className="py-2 px-2 text-center text-[#00d9ff] text-[10.5px]">
                                  {ph.variant_color} / {ph.variant_size}
                                </td>
                                <td className="py-2 px-2 text-center text-[#8b9bb4] text-[11px]">{ph.purchase_date}</td>
                                <td className="py-2 px-2 text-center font-bold text-[#00ff9d]">+{ph.quantity}</td>
                                <td className="py-2 px-2 text-right text-[#8b9bb4]">₹{ph.unit_cost}</td>
                                <td className="py-2 px-2.5 text-right font-bold text-white">₹{ph.total_cost.toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono uppercase">
                      <span className="font-bold text-[#ffa500] flex items-center gap-1.5">
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#ffa500]" />
                        SALES DISPATCH LOG ({salesHistory.length})
                      </span>
                    </div>

                    <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17]">
                      {salesHistory.length === 0 ? (
                        <div className="p-4 text-center text-[#8b9bb4] italic text-xs uppercase">
                          NO OUTWARD CUSTOMER SALES RECORDED FOR THIS PRODUCT YET.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs uppercase">
                          <thead className="bg-[#101628] text-[#8b9bb4] font-mono text-[9px] uppercase border-b border-white/10">
                            <tr>
                              <th className="py-1.5 px-2.5">ORDER NO</th>
                              <th className="py-1.5 px-2.5">CUSTOMERNAME</th>
                              <th className="py-1.5 px-2 text-center">VARIANT</th>
                              <th className="py-1.5 px-2 text-center">DATE</th>
                              <th className="py-1.5 px-2 text-center">QTY SOLD</th>
                              <th className="py-1.5 px-2 text-right">PRICE (₹)</th>
                              <th className="py-1.5 px-2.5 text-right">TOTAL (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono">
                            {salesHistory.map((sh, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.02]">
                                <td className="py-2 px-2.5 font-bold text-[#ffa500]">{sh.order_id}</td>
                                <td className="py-2 px-2.5 font-sans font-semibold text-white">{sh.customer_name}</td>
                                <td className="py-2 px-2 text-center text-[#00d9ff] text-[10.5px]">
                                  {sh.variant_color} / {sh.variant_size}
                                </td>
                                <td className="py-2 px-2 text-center text-[#8b9bb4] text-[11px]">{sh.sale_date}</td>
                                <td className="py-2 px-2 text-center font-bold text-[#ff6b6b]">-{sh.quantity}</td>
                                <td className="py-2 px-2 text-right text-[#8b9bb4]">₹{sh.unit_price}</td>
                                <td className="py-2 px-2.5 text-right font-bold text-white">₹{sh.total_amount.toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedProductForHistory(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer uppercase"
              >
                CLOSE HISTORY
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}