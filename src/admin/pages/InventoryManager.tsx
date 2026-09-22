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

interface InventoryItem {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  category: string;
  sub_category: string;
  color: string;
  size: string;
  selling_price: number;
  cost_price: number;
  landed_price?: number;
  store_price?: number;
  online_price?: number;
  available_stock: number;
  hex_code?: string;
}

interface PurchaseHistoryItem {
  purchase_id: string;
  supplier_name: string;
  supplier_bill_no: string;
  purchase_date: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface SalesHistoryItem {
  order_id: string;
  customer_name: string;
  sale_date: string;
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

export default function InventoryManager() {
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>[];
  const [rawProducts, setRawProducts] = useState<any[]>[];
  const [allSizesList, setAllSizesList] = useState<any[]>[];
  const [coloursList, setColoursList] = useState<any[]>[];
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedSubCatFilter, setSelectedSubCatFilter] = useState<string>('all');
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'low' | 'out'>('all');

  // History & Detailed Matrix Modal state
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const [prodRes, colorRes, invRes, sizeRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('colours').select('name, hex_code'),
        supabase.from('inventory').select('*'),
        supabase.from('sizes').select('*').order('display_order', { ascending: true })
      ]);

      const products = prodRes.data || [];
      setRawProducts(products);
      if (sizeRes.data) setAllSizesList(sizeRes.data);

      let colorHexMap = new Map<string, string>();
      (colorRes.data || []).forEach((c: any) => {
        if (c.name) colorHexMap.set(c.name.toLowerCase().trim(), c.hex_code || '#6d4aff');
      });
      setColoursList(colorRes.data || []);

      const inventoryRecords = invDataCall(invRes.data);
      const processedItems: InventoryItem[] = [];

      if (inventoryRecords.length > 0) {
        inventoryRecords.forEach((inv: any) => {
          const prod = products.find((p) => String(p.id) === String(inv.product_id));
          const colorName = inv.variant_color || inv.color || 'STANDARD';
          const sizeName = inv.variant_size || inv.size || 'FREE SIZE';
          
          const baseCost = Number(prod?.cost_price || prod?.price || 0);
          const landed = baseCost > 0 ? Math.round(baseCost * 1.10) : 0;
          const store = prod?.offline_price || prod?.selling_price || (landed > 0 ? Math.ceil(((landed * 2) * 1.10) / 5) * 5 : 0);
          const online = prod?.online_price || (landed > 0 ? Math.ceil(((landed * 2) * 1.20) / 10) * 10 : 0);

          processedItems.push({
            id: String(inv.id || `${inv.product_id}_${colorName}_${sizeName}`),
            product_id: String(inv.product_id),
            product_code: String(prod?.code || prod?.id || inv.product_id),
            product_name: String(prod?.name || 'UNKNOWN PRODUCT'),
            category: String(prod?.category || 'FASHION'),
            sub_category: String(prod?.sub_category || 'GENERAL'),
            color: colorName.toUpperCase(),
            size: sizeName.toUpperCase(),
            selling_price: Number(store),
            cost_price: baseCost,
            landed_price: landed,
            store_price: store,
            online_price: online,
            available_stock: Number(inv.stock_quantity ?? inv.quantity ?? 0),
            hex_code: colorHexMap.get(colorName.toLowerCase().trim()) || '#6d4aff'
          });
        });
      }

      products.forEach((prod) => {
        let sizes: string[] = ['FREE SIZE'];
        if (prod.size) {
          sizes = typeof prod.size === 'string' ? prod.size.split(',').map((s: string) => s.trim().toUpperCase()) : prod.size;
        }
        let colors: string[] = ['STANDARD'];
        if (prod.colour) {
          colors = typeof prod.colour === 'string' ? prod.colour.split(',').map((c: string) => c.trim().toUpperCase()) : prod.colour;
        }

        colors.forEach((c) => {
          sizes.forEach((s) => {
            const alreadyExists = processedItems.some(
              (it) => String(it.product_id) === String(prod.id) && it.color === c && it.size === s
            );
            if (!alreadyExists) {
              const baseCost = Number(prod.cost_price || prod.price || 0);
              const landed = baseCost > 0 ? Math.round(baseCost * 1.10) : 0;
              const store = prod.offline_price || prod.selling_price || (landed > 0 ? Math.ceil(((landed * 2) * 1.10) / 5) * 5 : 0);
              const online = prod.online_price || (landed > 0 ? Math.ceil(((landed * 2) * 1.20) / 10) * 10 : 0);

              processedItems.push({
                id: `${prod.id}_${c}_${s}`,
                product_id: String(prod.id),
                product_code: String(prod.code || prod.id),
                product_name: String(prod.name || 'UNKNOWN PRODUCT'),
                category: String(prod.category || 'FASHION'),
                sub_category: String(prod.sub_category || 'GENERAL'),
                color: c,
                size: s,
                selling_price: Number(store),
                cost_price: baseCost,
                landed_price: landed,
                store_price: store,
                online_price: online,
                available_stock: 0,
                hex_code: colorHexMap.get(c.toLowerCase().trim()) || '#6d4aff'
              });
            }
          });
        });
      });

      processedItems.sort((a, b) => {
        const codeA = String(a.product_code || '');
        const codeB = String(b.product_code || '');
        const cmp = codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        if (cmp !== 0) return cmp;
        return a.color.localeCompare(b.color);
      });

      setInventoryList(processedItems);
    } catch (err: any) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  function invDataCall(data: any) {
    return data || [];
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const handleOpenProductHistory = async (item: InventoryItem) => {
    setSelectedItemForHistory(item);
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
          purchases (
            id,
            supplier_name,
            supplier_bill_no,
            purchase_date
          )
        `)
        .eq('product_id', item.product_id)
        .eq('variant_color', item.color)
        .eq('variant_size', item.size);

      if (purItems && purItems.length > 0) {
        const mappedPurchases: PurchaseHistoryItem[] = purItems.map((pi: any) => ({
          purchase_id: pi.purchases?.id || '—',
          supplier_name: pi.purchases?.supplier_name || 'DIRECT INWARD',
          supplier_bill_no: pi.purchases?.supplier_bill_no || '—',
          purchase_date: pi.purchases?.purchase_date || '—',
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
          orders (
            id,
            customer_name,
            created_at
          )
        `)
        .eq('product_id', item.product_id)
        .eq('variant_color', item.color)
        .eq('variant_size', item.size);

      if (saleItems && saleItems.length > 0) {
        const mappedSales: SalesHistoryItem[] = saleItems.map((si: any) => ({
          order_id: si.orders?.id || '—',
          customer_name: si.orders?.customer_name || 'WALK-IN CUSTOMER',
          sale_date: si.orders?.created_at ? new Date(si.orders.created_at).toLocaleDateString('en-IN') : '—',
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

  // DETAILED STOCK MATRIX FOR A CHOSEN PRODUCT ACROSS ALL SHADES & SIZES
  const productMatrixSummary = useMemo(() => {
    if (!selectedItemForHistory) return null;
    const prodId = selectedItemForHistory.product_id;
    const prodItems = inventoryList.filter((it) => String(it.product_id) === String(prodId));

    const shadeMap = new Map<string, Map<string, number>>();
    const allSizesSet = new Set<string>();

    prodItems.forEach((it) => {
      const c = it.color.toUpperCase();
      const s = it.size.toUpperCase();
      allSizesSet.add(s);

      if (!shadeMap.has(c)) {
        shadeMap.set(c, new Map<string, number>());
      }
      shadeMap.get(c)!.set(s, it.available_stock);
    });

    const sizes = Array.from(allSizesSet);
    const shades = Array.from(shadeMap.entries()).map(([color, sizeStockMap]) => ({
      color,
      hex: coloursList.find((c) => c.name?.toUpperCase() === color)?.hex_code || '#6d4aff',
      stocks: sizes.map((sz) => sizeStockMap.get(sz) || 0),
      totalShadeStock: Array.from(sizeStockMap.values()).reduce((a, b) => a + b, 0)
    }));

    return { sizes, shades };
  }, [selectedItemForHistory, inventoryList, coloursList]);

  const lowStockCount = useMemo(() => {
    return inventoryList.filter((it) => it.available_stock > 0 && it.available_stock <= 3).length;
  }, [inventoryList]);

  const outOfStockCount = useMemo(() => {
    return inventoryList.filter((it) => it.available_stock <= 0).length;
  }, [inventoryList]);

  const distinctCategories = useMemo(() => {
    const set = new Set<string>();
    inventoryList.forEach((it) => {
      if (it.category) set.add(it.category.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [inventoryList]);

  const distinctSubCategories = useMemo(() => {
    const set = new Set<string>();
    inventoryList.forEach((it) => {
      if (selectedCategoryFilter === 'all' || it.category.toLowerCase() === selectedCategoryFilter.toLowerCase()) {
        if (it.sub_category) set.add(it.sub_category.trim().toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [inventoryList, selectedCategoryFilter]);

  const filteredInventory = useMemo(() => {
    const list = inventoryList.filter((item) => {
      if (selectedCategoryFilter !== 'all' && item.category.toLowerCase() !== selectedCategoryFilter.toLowerCase()) {
        return false;
      }
      if (selectedSubCatFilter !== 'all' && item.sub_category.toLowerCase() !== selectedSubCatFilter.toLowerCase()) {
        return false;
      }
      if (stockLevelFilter === 'low' && !(item.available_stock > 0 && item.available_stock <= 3)) {
        return false;
      }
      if (stockLevelFilter === 'out' && item.available_stock > 0) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toUpperCase().trim();
        return (
          item.product_code.includes(q) ||
          item.product_name.includes(q) ||
          item.sub_category.includes(q) ||
          item.color.includes(q) ||
          item.size.includes(q)
        );
      }
      return true;
    });

    return list.sort((a, b) => {
      const codeA = String(a.product_code || '');
      const codeB = String(b.product_code || '');
      const cmp = codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;
      return a.color.localeCompare(b.color);
    });
  }, [inventoryList, selectedCategoryFilter, selectedSubCatFilter, stockLevelFilter, searchQuery]);

  return (
    <div className="space-y-3 font-sans text-xs select-none uppercase">
      
      {/* 1. FILTER & SEARCH CONTROL BAR */}
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
              <span className="text-[11px] text-[#8b9bb4] font-semibold">SUB-CAT:</span>
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

      {/* 2. INVENTORY TABLE (DETAILED PRICING & HIGHLIGHTED PRODUCT NAMES) */}
      <div className="rounded-2xl bg-[#101628]/95 border border-white/10 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#0a0e17]/80 text-[#8b9bb4] font-mono text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">PRODUCT CODE & NAME</th>
                <th className="py-2.5 px-3">CATEGORY & SUB-CATEGORY</th>
                <th className="py-2.5 px-3">COLOUR</th>
                <th className="py-2.5 px-3 text-center">SIZE</th>
                <th className="py-2.5 px-3 text-right">COST PRICE</th>
                <th className="py-2.5 px-3 text-right">LANDED PRICE</th>
                <th className="py-2.5 px-3 text-right">STORE PRICE</th>
                <th className="py-2.5 px-3 text-right">ONLINE PRICE</th>
                <th className="py-2.5 px-3 text-center">AVAILABLE STOCK</th>
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
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#8b9bb4] italic text-xs uppercase">
                    NO INVENTORY RECORDS MATCH YOUR CRITERIA.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const isOut = item.available_stock <= 0;
                  const isLow = item.available_stock > 0 && item.available_stock <= 3;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenProductHistory(item)}
                      className="hover:bg-white/[0.04] transition-all cursor-pointer group"
                      title="CLICK TO VIEW DETAILED MATRIX & VARIANT STOCK"
                    >
                      {/* PRODUCT CODE & HIGHLIGHTED NAME */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-[#00ff9d] text-[11px] block">
                          [{item.product_code}]
                        </span>
                        <span className="font-extrabold text-white text-xs block truncate mt-0.5 tracking-wide">
                          {item.product_name}
                        </span>
                      </td>

                      {/* CATEGORY & SUB-CATEGORY */}
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-white text-xs block">
                          {item.category}
                        </span>
                        <span className="text-[10px] font-mono text-[#8b9bb4] block mt-0.5">
                          {item.sub_category}
                        </span>
                      </td>

                      {/* COLOUR */}
                      <td className="py-2.5 px-3">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#0a0e17] border border-white/10 max-w-full">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0 shadow"
                            style={{ backgroundColor: item.hex_code }}
                          />
                          <span className="font-bold text-white text-[11px] truncate uppercase">
                            {item.color}
                          </span>
                        </div>
                      </td>

                      {/* SIZE */}
                      <td className="py-2.5 px-3 text-center font-mono font-black text-[#00d9ff] text-xs">
                        {item.size}
                      </td>

                      {/* COST PRICE */}
                      <td className="py-2.5 px-3 text-right font-mono text-[#8b9bb4]">
                        ₹{item.cost_price ? item.cost_price.toLocaleString('en-IN') : '—'}
                      </td>

                      {/* LANDED PRICE */}
                      <td className="py-2.5 px-3 text-right font-mono text-[#ffa500]">
                        ₹{item.landed_price ? item.landed_price.toLocaleString('en-IN') : '—'}
                      </td>

                      {/* STORE PRICE */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        ₹{item.store_price ? item.store_price.toLocaleString('en-IN') : item.selling_price.toLocaleString('en-IN')}
                      </td>

                      {/* ONLINE PRICE */}
                      <td className="py-2.5 px-3 text-right font-mono text-[#00d9ff]">
                        ₹{item.online_price ? item.online_price.toLocaleString('en-IN') : '—'}
                      </td>

                      {/* AVAILABLE STOCK */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[55px] px-2.5 py-0.5 rounded-full font-mono text-[10.5px] font-black border ${
                            isOut
                              ? 'bg-[#ff6b6b]/15 text-[#ff6b6b] border-[#ff6b6b]/30'
                              : isLow
                              ? 'bg-[#ffa500]/15 text-[#ffa500] border-[#ffa500]/30'
                              : 'bg-[#00ff9d]/15 text-[#00ff9d] border-[#00ff9d]/30'
                          }`}
                        >
                          {item.available_stock} UNITS
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

      {/* 3. DETAILED PRODUCT MATRIX & AUDIT TRAIL MODAL */}
      {selectedItemForHistory && (
        <div className="fixed inset-0 z-[100000] pt-[76px] pb-6 px-3 sm:px-6 flex items-start justify-center bg-black/85 backdrop-blur-md overflow-y-auto select-none animate-in fade-in">
          <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-4xl w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[calc(100vh-100px)] flex flex-col my-auto">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00d9ff] to-[#6d4aff] text-white flex items-center justify-center shadow">
                  <Grid className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase">
                    <span>[{selectedItemForHistory.product_code}] {selectedItemForHistory.product_name}</span>
                  </h4>
                  <span className="text-[10px] font-mono text-[#00d9ff]">
                    DETAILED VARIANT STOCK MATRIX (SHADES VS SIZES) • AUDIT TRAIL
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItemForHistory(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#8b9bb4] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Matrix View Grid */}
            {productMatrixSummary && productMatrixSummary.shades.length > 0 && (
              <div className="space-y-1.5 shrink-0">
                <span className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase block">
                  LIVE STOCK MATRIX (SHADES & SIZES BREAKDOWN):
                </span>
                
                <div className="border border-white/10 rounded-2xl overflow-x-auto bg-[#0a0e17] max-h-56">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-[#101628] text-[#8b9bb4] font-mono text-[9px] uppercase border-b border-white/10 sticky top-0">
                        <th className="py-2 px-3 text-left">COLOUR \ SIZE</th>
                        {productMatrixSummary.sizes.map((sz) => (
                          <th key={sz} className="py-2 px-2 text-[#00d9ff] font-bold">{sz}</th>
                        ))}
                        <th className="py-2 px-3 text-right text-[#00ff9d]">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-xs">
                      {productMatrixSummary.shades.map((sh) => (
                        <tr key={sh.color} className="hover:bg-white/[0.02]">
                          <td className="py-2 px-3 text-left font-bold text-white uppercase flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full border border-white/30 shrink-0 shadow"
                              style={{ backgroundColor: sh.hex }}
                            />
                            <span>{sh.color}</span>
                          </td>
                          {sh.stocks.map((st, i) => (
                            <td key={i} className={`py-2 px-2 font-bold ${st > 0 ? 'text-[#00ff9d]' : 'text-[#8b9bb4]/40'}`}>
                              {st}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-right font-black text-[#00ff9d]">
                            {sh.totalShadeStock}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3.5 custom-scrollbar p-1">
              {loadingHistory ? (
                <div className="p-8 text-center text-[#8b9bb4]">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff] mb-1.5" />
                  FETCHING LIFECYCLE LOGS...
                </div>
              ) : (
                <>
                  {/* Purchase Inward Log */}
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
                          NO DIRECT PURCHASE INWARD RECORDS TRACKED FOR THIS VARIANT.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs uppercase">
                          <thead className="bg-[#101628] text-[#8b9bb4] font-mono text-[9px] uppercase border-b border-white/10">
                            <tr>
                              <th className="py-1.5 px-2.5">PURCHASE BILL</th>
                              <th className="py-1.5 px-2.5">SUPPLIER NAME</th>
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

                  {/* Sales Dispatch Log */}
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
                          NO OUTWARD CUSTOMER SALES RECORDED FOR THIS VARIANT YET.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs uppercase">
                          <thead className="bg-[#101628] text-[#8b9bb4] font-mono text-[9px] uppercase border-b border-white/10">
                            <tr>
                              <th className="py-1.5 px-2.5">ORDER NO</th>
                              <th className="py-1.5 px-2.5">CUSTOMER NAME</th>
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
                onClick={() => setSelectedItemForHistory(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer uppercase"
              >
                CLOSE MATRIX & HISTORY
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}