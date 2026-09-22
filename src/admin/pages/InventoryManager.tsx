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
  Palette
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

export default function InventoryManager() {
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'low' | 'out'>('all');

  // History Drawer / Modal state
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Load Inventory Data (Robust combination of products + inventory entries)
  const loadInventory = async () => {
    setLoading(true);
    try {
      const [prodRes, invRes, colorRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('inventory').select('*'),
        supabase.from('colours').select('name, hex_code')
      ]);

      const products = prodRes.data || [];
      const inventoryRecords = invRes.data || [];
      const colours = colorRes.data || [];

      const colorHexMap = new Map<string, string>();
      colours.forEach((c) => {
        if (c.name) colorHexMap.set(c.name.toLowerCase().trim(), c.hex_code || '#6d4aff');
      });

      const processedItems: InventoryItem[] = [];

      if (inventoryRecords.length > 0) {
        // Build items directly from inventory records linked to product info
        inventoryRecords.forEach((inv) => {
          const prod = products.find((p) => String(p.id) === String(inv.product_id));
          const colorName = inv.variant_color || inv.color || 'Standard';
          processedItems.push({
            id: inv.id || `${inv.product_id}_${colorName}_${inv.variant_size || 'Free'}`,
            product_id: inv.product_id,
            product_code: prod?.id || inv.product_id,
            product_name: prod?.name || 'Unknown Product',
            category: prod?.category || 'Fashion',
            sub_category: prod?.sub_category || 'General',
            color: colorName,
            size: inv.variant_size || inv.size || 'Free Size',
            selling_price: Number(prod?.selling_price || prod?.price || 0),
            cost_price: Number(prod?.cost_price || 0),
            available_stock: Number(inv.stock_quantity ?? inv.quantity ?? 0),
            hex_code: colorHexMap.get(colorName.toLowerCase().trim()) || '#6d4aff'
          });
        });
      } else {
        // Fallback: If inventory table has not been populated yet, display products with 0 stock
        products.forEach((prod) => {
          let sizes: string[] = ['Free Size'];
          if (prod.size) {
            sizes = typeof prod.size === 'string' ? prod.size.split(',').map((s: string) => s.trim()) : prod.size;
          }
          let colors: string[] = ['Standard'];
          if (prod.colour) {
            colors = typeof prod.colour === 'string' ? prod.colour.split(',').map((c: string) => c.trim()) : prod.colour;
          }

          colors.forEach((c) => {
            sizes.forEach((s) => {
              processedItems.push({
                id: `${prod.id}_${c}_${s}`,
                product_id: prod.id,
                product_code: prod.id,
                product_name: prod.name,
                category: prod.category || 'Fashion',
                sub_category: prod.sub_category || 'General',
                color: c,
                size: s,
                selling_price: Number(prod.selling_price || prod.price || 0),
                cost_price: Number(prod.cost_price || 0),
                available_stock: 0,
                hex_code: colorHexMap.get(c.toLowerCase().trim()) || '#6d4aff'
              });
            });
          });
        }
      );
      }

      setInventoryList(processedItems);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Fetch full inward & outward history when a product is clicked
  const handleOpenProductHistory = async (item: InventoryItem) => {
    setSelectedItemForHistory(item);
    setLoadingHistory(true);
    setPurchaseHistory([]);
    setSalesHistory([]);

    try {
      // 1. Fetch Purchase Inward History
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
          supplier_name: pi.purchases?.supplier_name || 'Direct Inward',
          supplier_bill_no: pi.purchases?.supplier_bill_no || '—',
          purchase_date: pi.purchases?.purchase_date || '—',
          quantity: Number(pi.quantity || 0),
          unit_cost: Number(pi.unit_cost || 0),
          total_cost: Number(pi.total_cost || (pi.quantity * pi.unit_cost) || 0)
        }));
        setPurchaseHistory(mappedPurchases);
      }

      // 2. Fetch Sales Dispatch History
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
          customer_name: si.orders?.customer_name || 'Walk-in Customer',
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

  // Counters for Low Stock and Out of Stock
  const lowStockCount = useMemo(() => {
    return inventoryList.filter((it) => it.available_stock > 0 && it.available_stock <= 3).length;
  }, [inventoryList]);

  const outOfStockCount = useMemo(() => {
    return inventoryList.filter((it) => it.available_stock <= 0).length;
  }, [inventoryList]);

  // Dynamic filter for category & search
  const filteredInventory = useMemo(() => {
    return inventoryList.filter((item) => {
      // Category filter
      if (categoryFilter !== 'all' && item.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      // Stock Level Filter
      if (stockLevelFilter === 'low' && !(item.available_stock > 0 && item.available_stock <= 3)) {
        return false;
      }
      if (stockLevelFilter === 'out' && item.available_stock > 0) {
        return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = item.product_code.toLowerCase().includes(q);
        const matchName = item.product_name.toLowerCase().includes(q);
        const matchSubCat = item.sub_category.toLowerCase().includes(q);
        const matchColor = item.color.toLowerCase().includes(q);
        const matchSize = item.size.toLowerCase().includes(q);
        return matchCode || matchName || matchSubCat || matchColor || matchSize;
      }

      return true;
    });
  }, [inventoryList, categoryFilter, stockLevelFilter, searchQuery]);

  return (
    <div className="space-y-3 font-sans text-xs select-none">
      
      {/* 1. FILTER & SEARCH CONTROL BAR */}
      <div className="px-3.5 py-2.5 rounded-2xl bg-[#101628]/95 border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Left: Category Tabs */}
        <div className="flex items-center gap-1.5">
          <div className="inline-flex p-0.5 rounded-xl bg-[#0a0e17] border border-white/10">
            {['all', 'fashion', 'jewellery'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs capitalize transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#6d4aff] text-white shadow-md'
                    : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="inline-flex p-0.5 rounded-xl bg-[#0a0e17] border border-white/10">
            <button
              type="button"
              onClick={() => setStockLevelFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                stockLevelFilter === 'all'
                  ? 'bg-white/15 text-white font-bold'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              All Levels
            </button>
          </div>
        </div>

        {/* Right: Low & Out badges placed right BEFORE Search Bar */}
        <div className="flex items-center gap-2">
          
          {/* Low Stock Indicator Filter Button */}
          <button
            type="button"
            onClick={() => setStockLevelFilter(stockLevelFilter === 'low' ? 'all' : 'low')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
              stockLevelFilter === 'low'
                ? 'bg-[#ffa500] text-neutral-950 border-[#ffa500] shadow-md scale-105'
                : 'bg-[#ffa500]/10 text-[#ffa500] border-[#ffa500]/30 hover:bg-[#ffa500]/20'
            }`}
          >
            <span>Low:</span>
            <span className="font-extrabold">{lowStockCount}</span>
          </button>

          {/* Out of Stock Indicator Filter Button */}
          <button
            type="button"
            onClick={() => setStockLevelFilter(stockLevelFilter === 'out' ? 'all' : 'out')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
              stockLevelFilter === 'out'
                ? 'bg-[#ff6b6b] text-white border-[#ff6b6b] shadow-md scale-105'
                : 'bg-[#ff6b6b]/10 text-[#ff6b6b] border-[#ff6b6b]/30 hover:bg-[#ff6b6b]/20'
            }`}
          >
            <span>Out:</span>
            <span className="font-extrabold">{outOfStockCount}</span>
          </button>

          {/* Search Bar */}
          <div className="relative w-56 sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, title, color, size..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0a0e17] rounded-xl text-white text-[11px] outline-none border border-white/10 focus:border-[#00d9ff]"
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
                <th className="py-2.5 px-3">Product Code & Name</th>
                <th className="py-2.5 px-3">Category / Sub-Category</th>
                <th className="py-2.5 px-3">Colour</th>
                <th className="py-2.5 px-3 text-center">Size</th>
                <th className="py-2.5 px-3 text-right">Selling Price</th>
                <th className="py-2.5 px-3 text-center">Available Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8b9bb4]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff] mb-2" />
                    Loading real-time inventory...
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8b9bb4] italic text-xs">
                    No inventory records match your criteria. Click &quot;Purchase&quot; to inward stock.
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
                      title="Click to view complete inward & sales history"
                    >
                      {/* Product Code & Name */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-[#00ff9d] text-xs shrink-0 group-hover:underline">
                            [{item.product_code}]
                          </span>
                          <span className="font-semibold text-white text-xs block truncate max-w-[200px]">
                            {item.product_name}
                          </span>
                        </div>
                      </td>

                      {/* Category & Sub-Category */}
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-white text-xs block capitalize">
                          {item.category}
                        </span>
                        <span className="text-[10px] font-mono text-[#8b9bb4] block">
                          {item.sub_category}
                        </span>
                      </td>

                      {/* Colour with swatch */}
                      <td className="py-2.5 px-3">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#0a0e17] border border-white/10">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0 shadow"
                            style={{ backgroundColor: item.hex_code }}
                          />
                          <span className="font-semibold text-white text-xs">
                            {item.color}
                          </span>
                        </div>
                      </td>

                      {/* Size */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-[#00d9ff]">
                        {item.size}
                      </td>

                      {/* Selling Price */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        ₹{item.selling_price.toLocaleString('en-IN')}
                      </td>

                      {/* Available Stock with status badge */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[55px] px-2.5 py-0.5 rounded-full font-mono text-xs font-black border ${
                            isOut
                              ? 'bg-[#ff6b6b]/15 text-[#ff6b6b] border-[#ff6b6b]/30'
                              : isLow
                              ? 'bg-[#ffa500]/15 text-[#ffa500] border-[#ffa500]/30'
                              : 'bg-[#00ff9d]/15 text-[#00ff9d] border-[#00ff9d]/30'
                          }`}
                        >
                          {item.available_stock} Units
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

      {/* 3. PRODUCT LIFECYCLE HISTORY MODAL / DRAWER (WHERE BOUGHT & WHO SOLD TO) */}
      {selectedItemForHistory && (
        <div className="fixed inset-0 z-[100000] pt-[76px] pb-6 px-3 sm:px-6 flex items-start justify-center bg-black/85 backdrop-blur-md overflow-y-auto select-none animate-in fade-in">
          <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-3xl w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[calc(100vh-100px)] flex flex-col my-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00d9ff] to-[#6d4aff] text-white flex items-center justify-center shadow">
                  <History className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>[{selectedItemForHistory.product_code}] {selectedItemForHistory.product_name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/30 text-[10px] font-mono">
                      {selectedItemForHistory.color} • {selectedItemForHistory.size}
                    </span>
                  </h4>
                  <span className="text-[10.5px] text-[#8b9bb4]">
                    Complete Product Audit Trail: Inward Purchases & Customer Outward Dispatches
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItemForHistory(null)}
                className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-[#8b9bb4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-[#0a0e17] border border-white/10 text-center font-mono">
              <div>
                <span className="text-[9px] text-[#8b9bb4] uppercase block">Selling Price</span>
                <span className="font-extrabold text-white text-xs">₹{selectedItemForHistory.selling_price}</span>
              </div>
              <div>
                <span className="text-[9px] text-[#8b9bb4] uppercase block">Current Stock</span>
                <span className="font-extrabold text-[#00ff9d] text-xs">{selectedItemForHistory.available_stock} Units</span>
              </div>
              <div>
                <span className="text-[9px] text-[#8b9bb4] uppercase block">Sub-Category</span>
                <span className="font-extrabold text-[#00d9ff] text-xs">{selectedItemForHistory.sub_category}</span>
              </div>
            </div>

            {/* Content: Inward vs Outward */}
            <div className="flex-1 overflow-y-auto space-y-3.5 custom-scrollbar p-1">
              
              {loadingHistory ? (
                <div className="p-8 text-center text-[#8b9bb4]">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff] mb-1.5" />
                  Fetching lifecycle logs...
                </div>
              ) : (
                <>
                  {/* Section 1: Inward History (Ekkada Konnam) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-[#00d9ff] uppercase flex items-center gap-1.5">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-[#00d9ff]" />
                        Purchase Inward Log (ఎక్కడ కొన్నాం / సప్లయర్ బిల్స్)
                      </span>
                      <span className="text-[#8b9bb4]">{purchaseHistory.length} Inward Records</span>
                    </div>

                    <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17]">
                      {purchaseHistory.length === 0 ? (
                        <div className="p-4 text-center text-[#8b9bb4] italic text-xs">
                          No direct purchase inward records tracked for this specific variant.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#101628] text-[#8b9bb4] font-mono text-[9px] uppercase border-b border-white/10">
                            <tr>
                              <th className="py-1.5 px-2.5">Purchase Bill</th>
                              <th className="py-1.5 px-2.5">Supplier Name</th>
                              <th className="py-1.5 px-2 text-center">Date</th>
                              <th className="py-1.5 px-2 text-center">Qty</th>
                              <th className="py-1.5 px-2 text-right">Cost (₹)</th>
                              <th className="py-1.5 px-2.5 text-right">Total (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono">
                            {purchaseHistory.map((ph, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.02]">
                                <td className="py-2 px-2.5 font-bold text-[#00ff9d]">
                                  {ph.purchase_id}
                                  <span className="block text-[9px] text-[#8b9bb4]">Bill: {ph.supplier_bill_no}</span>
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

                  {/* Section 2: Outward Sales History (Yevariki Ammanu) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-[#ffa500] uppercase flex items-center gap-1.5">
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#ffa500]" />
                        Sales Dispatch Log (ఎవరికి అమ్మాం / కస్టమర్ ఆర్డర్స్)
                      </span>
                      <span className="text-[#8b9bb4]">{salesHistory.length} Sales Records</span>
                    </div>

                    <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17]">
                      {salesHistory.length === 0 ? (
                        <div className="p-4 text-center text-[#8b9bb4] italic text-xs">
                          No outward customer sales recorded for this specific variant yet.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#101628] text-[#8b9bb4] font-mono text-[9px] uppercase border-b border-white/10">
                            <tr>
                              <th className="py-1.5 px-2.5">Order No</th>
                              <th className="py-1.5 px-2.5">Customer Name</th>
                              <th className="py-1.5 px-2 text-center">Date</th>
                              <th className="py-1.5 px-2 text-center">Qty Sold</th>
                              <th className="py-1.5 px-2 text-right">Price (₹)</th>
                              <th className="py-1.5 px-2.5 text-right">Total (₹)</th>
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

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedItemForHistory(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
              >
                Close History
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}