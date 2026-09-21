import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  RefreshCw,
  Loader2,
  Trash2,
  X,
  PackageCheck,
  Check,
  Building2,
  Calendar,
  IndianRupee,
  Layers,
  Palette,
  Ruler,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ProductMasterModal from '../components/modals/ProductMasterModal';

interface SupplierRecord {
  id: string;
  name: string;
  shop_name?: string | null;
  city?: string | null;
  phone?: string | null;
}

interface PurchaseRecord {
  id: string;
  invoice_no: string;
  supplier_id?: string | null;
  supplier_name: string;
  supplier_bill_no: string;
  supplier_bill_date: string;
  purchase_date: string;
  total_amount: number;
  notes?: string | null;
  created_at: string;
}

interface StagedMatrixItem {
  product_id: string;
  product_name: string;
  color: string;
  size: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export default function PurchaseManager() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [allSizes, setAllSizes] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Purchase Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [purchaseCodeLoading, setPurchaseCodeLoading] = useState<boolean>(false);

  // Quick Add Product Master Modal State
  const [isProductMasterOpen, setIsProductMasterOpen] = useState<boolean>(false);

  // Purchase Master Form State
  const [purchaseNo, setPurchaseNo] = useState<string>('PUR0001');
  const [purchaseDate, setPurchaseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierBillNo, setSupplierBillNo] = useState<string>('');
  const [supplierBillDate, setSupplierBillDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  // Line Item Matrix Staging State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [unitCost, setUnitCost] = useState<number | string>(0);
  const [matrixQtyMap, setMatrixQtyMap] = useState<{ [color_size_key: string]: number }>({});
  const [stagedItems, setStagedItems] = useState<StagedMatrixItem[]>([]);

  // Generate Automatic PUR0001
  const generatePurchaseNo = async () => {
    setPurchaseCodeLoading(true);
    try {
      const { data } = await supabase
        .from('purchases')
        .select('id')
        .like('id', 'PUR%')
        .order('id', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const match = data[0].id.match(/\d+$/);
        const nextNum = match ? parseInt(match[0], 10) + 1 : 1;
        setPurchaseNo(`PUR${String(nextNum).padStart(4, '0')}`);
      } else {
        setPurchaseNo('PUR0001');
      }
    } catch {
      setPurchaseNo('PUR0001');
    } finally {
      setPurchaseCodeLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [purchRes, suppRes, prodRes, sizeRes, subCatRes] = await Promise.all([
        supabase.from('purchases').select('*').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('id, name, shop_name, city, phone').order('name', { ascending: true }),
        supabase.from('products').select('*').order('name', { ascending: true }),
        supabase.from('sizes').select('*').order('display_order', { ascending: true }),
        supabase.from('sub_categories').select('*')
      ]);

      if (purchRes.data) setPurchases(purchRes.data);
      if (suppRes.data) setSuppliers(suppRes.data);
      if (prodRes.data) setProductsList(prodRes.data);
      if (sizeRes.data) setAllSizes(sizeRes.data);
      if (subCatRes.data) setSubCategories(subCatRes.data);
    } catch (err) {
      console.error('Failed to load purchase prerequisites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewPurchaseModal = () => {
    generatePurchaseNo();
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setSupplierBillDate(new Date().toISOString().split('T')[0]);
    setSelectedSupplierId('');
    setSupplierBillNo('');
    setNotes('');
    setStagedItems([]);
    setSelectedProductId('');
    setMatrixQtyMap({});
    setUnitCost(0);
    setIsModalOpen(true);
  };

  const activeProduct = useMemo(() => {
    return productsList.find((p) => p.id === selectedProductId);
  }, [productsList, selectedProductId]);

  const productColors: string[] = useMemo(() => {
    if (!activeProduct) return [];
    if (activeProduct.variants?.colors && activeProduct.variants.colors.length > 0) {
      return activeProduct.variants.colors;
    }
    return activeProduct.colour ? [activeProduct.colour] : ['Standard'];
  }, [activeProduct]);

  const productSizes: string[] = useMemo(() => {
    if (!activeProduct) return [];

    if (activeProduct.variants?.sizes && activeProduct.variants.sizes.length > 0) {
      return activeProduct.variants.sizes;
    }

    const subCatId = activeProduct.sub_category_id;
    const subCatObj = subCategories.find(
      (sc) => sc.id === subCatId || sc.name === activeProduct.sub_category
    );

    if (subCatObj) {
      const directMatches = allSizes.filter(
        (sz) => sz.sub_category_id && String(sz.sub_category_id) === String(subCatObj.id)
      );
      if (directMatches.length > 0) return directMatches.map((s) => s.name);

      if (subCatObj.size_group) {
        const groupMatches = allSizes.filter(
          (sz) => (sz.size_group || '').toLowerCase().trim() === subCatObj.size_group.toLowerCase().trim()
        );
        if (groupMatches.length > 0) return groupMatches.map((s) => s.name);
      }
    }

    return activeProduct.size ? [activeProduct.size] : ['Free Size'];
  }, [activeProduct, subCategories, allSizes]);

  useEffect(() => {
    if (activeProduct) {
      setUnitCost(activeProduct.cost_price || 0);
      setMatrixQtyMap({});
    }
  }, [activeProduct]);

  const handleMatrixQtyChange = (color: string, size: string, value: string) => {
    const count = parseInt(value, 10);
    const key = `${color}:::${size}`;
    setMatrixQtyMap((prev) => ({
      ...prev,
      [key]: isNaN(count) || count < 0 ? 0 : count
    }));
  };

  const handleAddMatrixToStaged = () => {
    if (!activeProduct) return;
    const cost = Number(unitCost) || 0;
    if (cost <= 0) {
      alert('Please enter a valid unit rate (cost price).');
      return;
    }

    const newAdditions: StagedMatrixItem[] = [];

    productColors.forEach((clr) => {
      productSizes.forEach((sz) => {
        const key = `${clr}:::${sz}`;
        const count = matrixQtyMap[key] || 0;
        if (count > 0) {
          newAdditions.push({
            product_id: activeProduct.id,
            product_name: activeProduct.name,
            color: clr,
            size: sz,
            quantity: count,
            unit_cost: cost,
            total_cost: count * cost
          });
        }
      });
    });

    if (newAdditions.length === 0) {
      alert('Please enter quantity for at least one color & size variant.');
      return;
    }

    setStagedItems((prev) => [...prev, ...newAdditions]);
    setSelectedProductId('');
    setMatrixQtyMap({});
    setUnitCost(0);
  };

  const handleRemoveStagedItem = (index: number) => {
    setStagedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const grandTotalBillAmount = useMemo(() => {
    return stagedItems.reduce((sum, it) => sum + it.total_cost, 0);
  }, [stagedItems]);

  const totalInwardQuantity = useMemo(() => {
    return stagedItems.reduce((sum, it) => sum + it.quantity, 0);
  }, [stagedItems]);

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('Please select a Supplier.');
      return;
    }
    if (!supplierBillNo.trim()) {
      alert('Please enter Supplier Bill No.');
      return;
    }
    if (stagedItems.length === 0) {
      alert('Please add at least one line item using the Variant Matrix.');
      return;
    }

    setSubmitting(true);
    const supplierObj = suppliers.find((s) => s.id === selectedSupplierId);

    try {
      const { error: purErr } = await supabase.from('purchases').insert([
        {
          id: purchaseNo.trim(),
          invoice_no: purchaseNo.trim(),
          supplier_id: supplierObj?.id || null,
          supplier_name: supplierObj?.name || 'Unknown Supplier',
          supplier_bill_no: supplierBillNo.trim(),
          supplier_bill_date: supplierBillDate,
          purchase_date: purchaseDate,
          total_amount: grandTotalBillAmount,
          tax_amount: 0,
          paid_amount: 0,
          balance_amount: grandTotalBillAmount,
          payment_status: 'pending',
          notes: notes.trim() || null
        }
      ]);
      if (purErr) throw purErr;

      const linePayloads = stagedItems.map((it, idx) => ({
        id: `pi_${purchaseNo.trim()}_${Date.now()}_${idx}`,
        purchase_id: purchaseNo.trim(),
        product_id: it.product_id,
        variant_color: it.color,
        variant_size: it.size,
        quantity: it.quantity,
        unit_cost: it.unit_cost,
        selling_price: 0,
        total_cost: it.total_cost
      }));

      const { error: lineErr } = await supabase.from('purchase_items').insert(linePayloads);
      if (lineErr) throw lineErr;

      for (const it of stagedItems) {
        const { data: existInv } = await supabase
          .from('inventory')
          .select('id, stock_quantity')
          .eq('product_id', it.product_id)
          .eq('variant_color', it.color)
          .eq('variant_size', it.size)
          .maybeSingle();

        if (existInv) {
          await supabase
            .from('inventory')
            .update({
              stock_quantity: existInv.stock_quantity + it.quantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', existInv.id);
        } else {
          await supabase.from('inventory').insert([
            {
              id: `inv_${it.product_id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              product_id: it.product_id,
              variant_color: it.color,
              variant_size: it.size,
              stock_quantity: it.quantity,
              low_stock_threshold: 3
            }
          ]);
        }

        if (it.unit_cost > 0) {
          await supabase
            .from('products')
            .update({ cost_price: it.unit_cost })
            .eq('id', it.product_id);
        }
      }

      alert(`Purchase ${purchaseNo} saved successfully! ${totalInwardQuantity} items added to Inventory.`);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to save purchase:', err);
      alert('Error saving purchase: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPurchases = useMemo(() => {
    if (!searchQuery.trim()) return purchases;
    const q = searchQuery.toLowerCase();
    return purchases.filter(
      (p) =>
        (p.id || '').toLowerCase().includes(q) ||
        (p.supplier_name || '').toLowerCase().includes(q) ||
        (p.supplier_bill_no || '').toLowerCase().includes(q)
    );
  }, [purchases, searchQuery]);

  return (
    <div className="space-y-4 font-sans text-xs select-none">
      
      {/* Header Bar */}
      <div className="p-4 rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ffa500] to-[#ff6b6b] text-white flex items-center justify-center shadow-lg shadow-[#ffa500]/20">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Purchase Inward Hub</span>
              <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 text-[9.5px] font-mono">
                {purchases.length} Invoices
              </span>
            </h2>
            <span className="text-[10px] text-[#8b9bb4]">
              Variant Color & Size Matrix Inward, Auto Purchase Code & Supplier Bills
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#00d9ff] cursor-pointer transition-colors"
            title="Refresh Inward Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={openNewPurchaseModal}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#ffa500] to-[#ff6b6b] hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#ffa500]/30 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>New Purchase Entry</span>
          </button>
        </div>
      </div>

      {/* Search & Controls */}
      <div className="p-3 rounded-2xl bg-[#0a0e17]/80 border border-white/10 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search purchase code, supplier, bill no..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#101628] rounded-xl text-white text-[11px] outline-none border border-white/10 focus:border-[#ffa500] placeholder:text-[#8b9bb4]/50"
          />
          <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Invoices History Table */}
      <div className="rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#0a0e17]/80 text-[#8b9bb4] font-mono text-[9.5px] uppercase tracking-wider">
                <th className="p-3.5">Purchase No</th>
                <th className="p-3.5">Entry Date</th>
                <th className="p-3.5">Supplier Name</th>
                <th className="p-3.5">Supplier Bill No & Date</th>
                <th className="p-3.5 text-right">Total Bill (₹)</th>
                <th className="p-3.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8b9bb4]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#ffa500] mb-2" />
                    Loading purchases...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8b9bb4] italic">
                    No purchase inward entries recorded yet. Click &quot;New Purchase Entry&quot; to begin.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 font-mono font-extrabold text-[#00ff9d] text-xs">
                      {p.id}
                    </td>
                    <td className="p-3.5 font-mono text-[#8b9bb4]">{p.purchase_date}</td>
                    <td className="p-3.5 font-bold text-white">{p.supplier_name}</td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-[#00d9ff] block">{p.supplier_bill_no || '—'}</span>
                      <span className="text-[9px] font-mono text-[#8b9bb4]">{p.supplier_bill_date || ''}</span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-white text-xs">
                      ₹{Number(p.total_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 text-[10px] text-[#8b9bb4] max-w-xs truncate">
                      {p.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW PURCHASE MODAL: Fixed z-index & Navbar overlap issue */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in select-none">
          <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-4xl w-full overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_40px_rgba(255,165,0,0.2)] relative animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:px-6 border-b border-white/10 flex items-center justify-between bg-[#0a0e17] sticky top-0 z-30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#ffa500] to-[#ff6b6b] text-white flex items-center justify-center shadow-lg shadow-[#ffa500]/30">
                  <PackageCheck className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>New Purchase Inward Entry</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#ffa500]/20 text-[#ffa500] border border-[#ffa500]/40 text-[9px] font-mono">
                      STOCK INWARD ONLY
                    </span>
                  </h3>
                  <span className="text-[10px] text-[#8b9bb4]">
                    Payment voucher will be recorded separately
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-[#101628] px-3.5 py-1.5 rounded-2xl border border-white/15 text-right shadow-inner min-w-[110px]">
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-[#8b9bb4] block">
                    PURCHASE NO
                  </span>
                  <span className="font-mono text-sm font-extrabold text-[#00ff9d] tracking-wide block">
                    {purchaseCodeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00d9ff] ml-auto" /> : purchaseNo}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-[#ff6b6b]/30 text-[#8b9bb4] hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSavePurchase} className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
              
              {/* Header Details */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 bg-[#0a0e17]/80 rounded-2xl border border-white/10">
                <div>
                  <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                    Supplier Name (Dropdown) *
                  </label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#101628] border border-white/10 text-white font-semibold outline-none focus:border-[#ffa500] text-xs cursor-pointer [&>option]:bg-[#101628]"
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.id}] {s.shop_name || s.name} {s.city ? `(${s.city})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                    Supplier Bill No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INW-8821"
                    value={supplierBillNo}
                    onChange={(e) => setSupplierBillNo(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#101628] border border-white/10 text-white font-semibold outline-none focus:border-[#ffa500] text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                    Supplier Bill Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={supplierBillDate}
                    onChange={(e) => setSupplierBillDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#101628] border border-white/10 text-white font-semibold outline-none focus:border-[#ffa500] text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                    Purchase Entry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#101628] border border-white/10 text-[#00ff9d] font-mono font-bold outline-none text-xs"
                  />
                </div>
              </div>

              {/* Product Selection & Variant Matrix */}
              <div className="p-4 bg-[#0a0e17] rounded-2xl border border-white/10 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                  <span className="text-[11px] font-mono font-bold text-[#00d9ff] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Product Selection & Matrix Inward
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsProductMasterOpen(true)}
                    className="px-3 py-1 rounded-xl bg-[#6d4aff]/20 border border-[#6d4aff]/40 text-[#00d9ff] hover:text-white hover:bg-[#6d4aff]/30 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3 text-[#00ff9d]" />
                    <span>+ Add New Product Master</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                      Select Product from Catalog *
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#101628] border border-white/10 text-white font-semibold outline-none focus:border-[#00d9ff] text-xs cursor-pointer [&>option]:bg-[#101628]"
                    >
                      <option value="">Choose Product...</option>
                      {productsList.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.id}] {p.name} • {p.category} ({p.sub_category || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                      Unit Rate / Cost Price (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#101628] border border-white/10 text-[#00ff9d] font-bold outline-none focus:border-[#00ff9d] text-xs"
                    />
                  </div>
                </div>

                {activeProduct ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8b9bb4]">
                      <span>
                        Sub-Category: <strong className="text-white">{activeProduct.sub_category || 'General'}</strong> (Sizes linked directly to this group)
                      </span>
                      <span className="text-[#00d9ff]">Enter quantities in matrix cells below</span>
                    </div>

                    <div className="border border-white/10 rounded-2xl overflow-x-auto bg-[#101628]">
                      <table className="w-full text-center border-collapse">
                        <thead>
                          <tr className="bg-[#0a0e17] text-[#8b9bb4] font-mono text-[9px] uppercase border-b border-white/10">
                            <th className="p-2.5 text-left min-w-[120px]">Colour \ Size</th>
                            {productSizes.map((sz) => (
                              <th key={sz} className="p-2.5 text-center text-[#00d9ff] min-w-[65px]">
                                {sz}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {productColors.map((clr) => (
                            <tr key={clr} className="hover:bg-white/[0.02]">
                              <td className="p-2.5 text-left font-bold text-white text-xs whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#6d4aff]" />
                                  <span>{clr}</span>
                                </span>
                              </td>
                              {productSizes.map((sz) => {
                                const key = `${clr}:::${sz}`;
                                const val = matrixQtyMap[key] || '';
                                return (
                                  <td key={sz} className="p-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={val}
                                      onChange={(e) => handleMatrixQtyChange(clr, sz, e.target.value)}
                                      className="w-14 px-1.5 py-1 text-center font-mono font-bold bg-[#0a0e17] text-[#00ff9d] border border-white/10 rounded-lg outline-none focus:border-[#00ff9d] text-xs"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddMatrixToStaged}
                        className="px-4 py-2 bg-[#00d9ff] hover:bg-[#00b8d9] text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add Matrix Quantities to Inward</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#101628] border border-dashed border-white/10 text-center text-[#8b9bb4] italic text-[11px]">
                    Select a product above to generate its linked Color and Size Group matrix.
                  </div>
                )}
              </div>

              {/* Staged Items List */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17] space-y-0">
                <div className="p-2.5 bg-[#101628] border-b border-white/10 flex items-center justify-between text-[10.5px] font-mono">
                  <span className="font-bold text-white uppercase">Inward Items Summary ({stagedItems.length} lines)</span>
                  <span className="text-[#00ff9d] font-bold">Total Inward Qty: {totalInwardQuantity} Units</span>
                </div>

                <div className="max-h-44 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#0a0e17] text-[#8b9bb4] font-mono uppercase text-[8.5px] sticky top-0">
                      <tr>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5">Color</th>
                        <th className="p-2.5">Size</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Unit Rate (₹)</th>
                        <th className="p-2.5 text-right">Total (₹)</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {stagedItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-[#8b9bb4] italic">
                            No items staged yet. Select product & fill quantities from matrix.
                          </td>
                        </tr>
                      ) : (
                        stagedItems.map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-bold text-white">
                              [{it.product_id}] {it.product_name}
                            </td>
                            <td className="p-2.5 text-white">{it.color}</td>
                            <td className="p-2.5 text-[#00d9ff] font-mono font-bold">{it.size}</td>
                            <td className="p-2.5 text-center font-bold text-[#00ff9d]">{it.quantity}</td>
                            <td className="p-2.5 text-right font-mono text-white">₹{it.unit_cost}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-white">
                              ₹{it.total_cost.toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveStagedItem(idx)}
                                className="p-1 rounded-lg text-[#ff6b6b] hover:bg-white/5 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Bar */}
              <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[240px]">
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Inward remarks, transport details, vehicle no..."
                    className="w-full px-3 py-2 rounded-xl bg-[#101628] border border-white/10 text-white text-xs outline-none"
                  />
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-[#8b9bb4] font-mono uppercase block">
                    TOTAL INWARD BILL AMOUNT
                  </span>
                  <span className="text-xl font-mono font-extrabold text-[#00ff9d]">
                    ₹{grandTotalBillAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#8b9bb4] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ffa500] to-[#ff6b6b] text-white font-bold flex items-center gap-1.5 shadow-lg shadow-[#ffa500]/30 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Purchase & Increment Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD PRODUCT MASTER MODAL */}
      {isProductMasterOpen && (
        <ProductMasterModal
          onClose={() => {
            setIsProductMasterOpen(false);
            supabase
              .from('products')
              .select('*')
              .order('name', { ascending: true })
              .then(({ data }) => {
                if (data) setProductsList(data);
              });
          }}
        />
      )}

    </div>
  );
}