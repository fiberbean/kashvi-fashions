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
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  MapPin,
  IndianRupee
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SupplierRecord {
  id: string;
  name: string;
  phone?: string | null;
  city?: string | null;
  gstin?: string | null;
  balance_due: number;
}

interface PurchaseRecord {
  id: string;
  invoice_no: string;
  supplier_id?: string | null;
  supplier_name: string;
  purchase_date: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: string;
  notes?: string | null;
  created_at: string;
}

interface InwardItemInput {
  product_id: string;
  product_name: string;
  variant_color: string;
  variant_size: string;
  quantity: number;
  unit_cost: number;
  selling_price: number;
}

interface LedgerEntry {
  id: string;
  supplier_id: string;
  purchase_id?: string | null;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description?: string | null;
  created_at: string;
}

export default function PurchaseManager() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Purchase Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Supplier Ledger Modal State
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState<SupplierRecord | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState<boolean>(false);

  // Quick Add Supplier Modal State inside form
  const [isAddingSupplier, setIsAddingSupplier] = useState<boolean>(false);
  const [newSuppName, setNewSuppName] = useState<string>('');
  const [newSuppPhone, setNewSuppPhone] = useState<string>('');
  const [newSuppCity, setNewSuppCity] = useState<string>('');

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState<number | string>(0);
  const [notes, setNotes] = useState<string>('');

  // Line items
  const [items, setItems] = useState<InwardItemInput[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [qty, setQty] = useState<number>(1);
  const [cost, setCost] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [purchRes, suppRes, prodRes] = await Promise.all([
        supabase.from('purchases').select('*').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*').order('name', { ascending: true }),
        supabase.from('products').select('id, name, variants, colour, size, cost_price, selling_price')
      ]);

      if (purchRes.data) setPurchases(purchRes.data);
      if (suppRes.data) setSuppliers(suppRes.data);
      if (prodRes.data) setProductsList(prodRes.data);
    } catch (err) {
      console.error('Failed to load purchase & supplier data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Product Selection Handlers
  const activeProduct = useMemo(() => {
    return productsList.find((p) => p.id === selectedProductId);
  }, [productsList, selectedProductId]);

  const availableColors = useMemo(() => {
    if (!activeProduct) return [];
    if (activeProduct.variants?.colors?.length) return activeProduct.variants.colors;
    return activeProduct.colour ? [activeProduct.colour] : ['Standard'];
  }, [activeProduct]);

  const availableSizes = useMemo(() => {
    if (!activeProduct) return [];
    if (activeProduct.variants?.sizes?.length) return activeProduct.variants.sizes;
    return activeProduct.size ? [activeProduct.size] : ['Free Size'];
  }, [activeProduct]);

  useEffect(() => {
    if (activeProduct) {
      setSelectedColor(availableColors[0] || 'Standard');
      setSelectedSize(availableSizes[0] || 'Free Size');
      setCost(activeProduct.cost_price || 0);
      setSellingPrice(activeProduct.selling_price || 0);
    }
  }, [activeProduct, availableColors, availableSizes]);

  const handleAddLineItem = () => {
    if (!activeProduct) return;
    if (qty <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    const newItem: InwardItemInput = {
      product_id: activeProduct.id,
      product_name: activeProduct.name,
      variant_color: selectedColor,
      variant_size: selectedSize,
      quantity: Number(qty),
      unit_cost: Number(cost),
      selling_price: Number(sellingPrice)
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedProductId('');
    setQty(1);
    setCost(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalInvoiceCost = useMemo(() => {
    return items.reduce((sum, it) => sum + it.quantity * it.unit_cost, 0);
  }, [items]);

  const calculatedBalanceDue = useMemo(() => {
    const paid = Number(paidAmount) || 0;
    return Math.max(0, totalInvoiceCost - paid);
  }, [totalInvoiceCost, paidAmount]);

  // Quick Create Supplier
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuppName.trim()) return;

    const suppId = `supp_${Date.now()}`;
    const newSupp = {
      id: suppId,
      name: newSuppName.trim(),
      phone: newSuppPhone.trim() || null,
      city: newSuppCity.trim() || null,
      balance_due: 0
    };

    try {
      const { error } = await supabase.from('suppliers').insert([newSupp]);
      if (error) throw error;

      setSuppliers((prev) => [...prev, newSupp]);
      setSelectedSupplierId(suppId);
      setIsAddingSupplier(false);
      setNewSuppName('');
      setNewSuppPhone('');
      setNewSuppCity('');
    } catch (err: any) {
      alert('Failed to add supplier: ' + err.message);
    }
  };

  // View Supplier Ledger History
  const handleOpenLedger = async (supp: SupplierRecord) => {
    setSelectedSupplierForLedger(supp);
    setLoadingLedger(true);
    try {
      const { data, error } = await supabase
        .from('supplier_ledger')
        .select('*')
        .eq('supplier_id', supp.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLedgerEntries(data || []);
    } catch (err: any) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  // Save Purchase and Post to Supplier Ledger
  const handleSavePurchaseInward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('Please select or create a supplier.');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one line item to this purchase inward.');
      return;
    }

    const supplierObj = suppliers.find((s) => s.id === selectedSupplierId);
    if (!supplierObj) return;

    setSubmitting(true);
    const purchaseId = `pur_${Date.now()}`;
    const paid = Number(paidAmount) || 0;
    const balance = calculatedBalanceDue;
    const paymentStatus = balance === 0 ? 'paid' : paid > 0 ? 'partial' : 'pending';

    try {
      // 1. Insert Master Purchase Record
      const { error: purErr } = await supabase.from('purchases').insert([
        {
          id: purchaseId,
          invoice_no: invoiceNo.trim() || `INV-${Date.now().toString().slice(-6)}`,
          supplier_id: supplierObj.id,
          supplier_name: supplierObj.name,
          purchase_date: purchaseDate,
          total_amount: totalInvoiceCost,
          paid_amount: paid,
          balance_amount: balance,
          payment_status: paymentStatus,
          notes: notes.trim() || null
        }
      ]);
      if (purErr) throw purErr;

      // 2. Insert Purchase Line Items
      const lineItemPayloads = items.map((it, idx) => ({
        id: `pi_${Date.now()}_${idx}`,
        purchase_id: purchaseId,
        product_id: it.product_id,
        variant_color: it.variant_color,
        variant_size: it.variant_size,
        quantity: it.quantity,
        unit_cost: it.unit_cost,
        selling_price: it.selling_price,
        total_cost: it.quantity * it.unit_cost
      }));
      const { error: linesErr } = await supabase.from('purchase_items').insert(lineItemPayloads);
      if (linesErr) throw linesErr;

      // 3. Atomically Update Inventory Stock
      for (const it of items) {
        const { data: existInv } = await supabase
          .from('inventory')
          .select('id, stock_quantity')
          .eq('product_id', it.product_id)
          .eq('variant_color', it.variant_color)
          .eq('variant_size', it.variant_size)
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
              id: `inv_${it.product_id}_${Date.now()}`,
              product_id: it.product_id,
              variant_color: it.variant_color,
              variant_size: it.variant_size,
              stock_quantity: it.quantity,
              low_stock_threshold: 3
            }
          ]);
        }

        if (it.unit_cost > 0) {
          await supabase.from('products').update({ cost_price: it.unit_cost }).eq('id', it.product_id);
        }
      }

      // 4. Update Supplier Balance & Post to Supplier Ledger
      const newSupplierBalance = (supplierObj.balance_due || 0) + balance;
      await supabase
        .from('suppliers')
        .update({ balance_due: newSupplierBalance })
        .eq('id', supplierObj.id);

      // Ledger Entry: Bill Inward
      await supabase.from('supplier_ledger').insert([
        {
          id: `led_${Date.now()}_bill`,
          supplier_id: supplierObj.id,
          purchase_id: purchaseId,
          transaction_type: 'BILL',
          amount: totalInvoiceCost,
          balance_after: (supplierObj.balance_due || 0) + totalInvoiceCost,
          description: `Purchase Inward Bill #${invoiceNo || purchaseId}`
        }
      ]);

      // Ledger Entry: Paid Amount (if paid > 0)
      if (paid > 0) {
        await supabase.from('supplier_ledger').insert([
          {
            id: `led_${Date.now()}_pay`,
            supplier_id: supplierObj.id,
            purchase_id: purchaseId,
            transaction_type: 'PAYMENT',
            amount: paid,
            balance_after: newSupplierBalance,
            description: `Payment applied for Invoice #${invoiceNo || purchaseId}`
          }
        ]);
      }

      alert('Purchase bill inwarded and posted to Supplier Ledger successfully!');
      setIsModalOpen(false);
      setItems([]);
      setInvoiceNo('');
      setSelectedSupplierId('');
      setPaidAmount(0);
      setNotes('');
      loadData();
    } catch (err: any) {
      console.error('Failed to save purchase:', err);
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPurchases = useMemo(() => {
    if (!searchQuery.trim()) return purchases;
    const q = searchQuery.toLowerCase();
    return purchases.filter(
      (p) =>
        p.invoice_no.toLowerCase().includes(q) ||
        p.supplier_name.toLowerCase().includes(q)
    );
  }, [purchases, searchQuery]);

  return (
    <div className="space-y-4 font-sans text-xs select-none">
      {/* 1. Header Bar */}
      <div className="p-4 rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ffa500] to-[#ff6b6b] text-white flex items-center justify-center shadow-lg shadow-[#ffa500]/20">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Purchase Hub & Supplier Ledger</span>
              <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 text-[9.5px] font-mono">
                {purchases.length} Invoices
              </span>
            </h2>
            <span className="text-[10px] text-[#8b9bb4]">
              Vendor Invoices, Stock Inward & Supplier Ledger Balances
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#00d9ff] cursor-pointer transition-colors"
            title="Refresh Purchases"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#ffa500] to-[#ff6b6b] hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#ffa500]/30 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>New Purchase Inward</span>
          </button>
        </div>
      </div>

      {/* 2. Registered Suppliers Ledger Quick Bar */}
      <div className="p-3.5 rounded-2xl bg-[#0a0e17]/80 border border-white/10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-mono font-bold text-[#00d9ff] flex items-center gap-1.5 uppercase">
            <Building2 className="w-3.5 h-3.5" /> Registered Suppliers & Active Ledger Balances ({suppliers.length})
          </span>
          <span className="text-[9px] text-[#8b9bb4]">Click any supplier to view complete statement</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {suppliers.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleOpenLedger(s)}
              className="px-3 py-2 rounded-xl bg-[#101628] border border-white/10 hover:border-[#00d9ff]/50 text-left shrink-0 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-white group-hover:text-[#00d9ff] text-[11px] truncate max-w-[130px]">
                  {s.name}
                </span>
                <BookOpen className="w-3 h-3 text-[#8b9bb4] group-hover:text-[#00d9ff]" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-mono text-[#8b9bb4]">{s.city || 'Vendor'}</span>
                <span
                  className={`text-[9.5px] font-mono font-bold ${
                    s.balance_due > 0 ? 'text-[#ff6b6b]' : 'text-[#00ff9d]'
                  }`}
                >
                  Due: ₹{Number(s.balance_due || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Search Controls */}
      <div className="p-3 rounded-2xl bg-[#0a0e17]/80 border border-white/10 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice number or supplier name..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#101628] rounded-xl text-white text-[11px] outline-none border border-white/10 focus:border-[#ffa500] placeholder:text-[#8b9bb4]/50"
          />
          <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* 4. Invoices Table */}
      <div className="rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#0a0e17]/80 text-[#8b9bb4] font-mono text-[9.5px] uppercase tracking-wider">
                <th className="p-3.5">Invoice No</th>
                <th className="p-3.5">Supplier Name</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Total Amount</th>
                <th className="p-3.5">Paid Amount</th>
                <th className="p-3.5">Balance Due</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#8b9bb4]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#ffa500] mb-2" />
                    Loading purchase history...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#8b9bb4] italic">
                    No purchase inward invoices recorded yet. Click &quot;New Purchase Inward&quot; to add stock.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => {
                  const supp = suppliers.find((s) => s.id === p.supplier_id);
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5">
                        <span className="font-mono font-extrabold text-[#00ff9d] text-xs">
                          {p.invoice_no}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-white text-xs block">{p.supplier_name}</span>
                        {supp?.city && <span className="text-[9px] text-[#8b9bb4]">{supp.city}</span>}
                      </td>
                      <td className="p-3.5 font-mono text-[#8b9bb4]">{p.purchase_date}</td>
                      <td className="p-3.5 font-mono font-extrabold text-white text-xs">
                        ₹{Number(p.total_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-[#00ff9d] text-xs">
                        ₹{Number(p.paid_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 font-mono font-extrabold text-[#ff6b6b] text-xs">
                        ₹{Number(p.balance_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-bold text-[9px] uppercase border ${
                            p.payment_status === 'paid'
                              ? 'bg-[#00ff9d]/15 text-[#00ff9d] border-[#00ff9d]/30'
                              : p.payment_status === 'partial'
                              ? 'bg-[#00d9ff]/15 text-[#00d9ff] border-[#00d9ff]/30'
                              : 'bg-[#ffa500]/15 text-[#ffa500] border-[#ffa500]/30'
                          }`}
                        >
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {supp && (
                          <button
                            type="button"
                            onClick={() => handleOpenLedger(supp)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#00d9ff]/20 text-[#8b9bb4] hover:text-[#00d9ff] cursor-pointer"
                            title="Open Supplier Statement"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
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

      {/* 5. NEW PURCHASE INWARD MODAL WITH SUPPLIER LEDGER CONTROLS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in">
          <div className="bg-[#101628]/98 border border-white/15 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl relative animate-in zoom-in-95 flex flex-col max-h-[92vh]">
            <div className="p-4 sm:px-6 border-b border-white/10 flex items-center justify-between bg-[#0a0e17]/80">
              <div className="flex items-center gap-2.5">
                <PackageCheck className="w-5 h-5 text-[#ffa500]" />
                <h3 className="text-base font-extrabold text-white">Stock Inward & Supplier Bill</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePurchaseInward} className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
              
              {/* Supplier Selection & Quick Add */}
              <div className="p-3.5 rounded-2xl bg-[#0a0e17]/80 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-mono text-[#8b9bb4] uppercase block font-bold">
                    Select Supplier (Ledger Linked) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingSupplier(!isAddingSupplier)}
                    className="text-[10px] text-[#00d9ff] hover:underline font-bold cursor-pointer"
                  >
                    {isAddingSupplier ? 'Cancel' : '+ Add New Supplier'}
                  </button>
                </div>

                {isAddingSupplier ? (
                  <div className="p-3 bg-[#101628] rounded-xl border border-[#00d9ff]/30 grid grid-cols-1 sm:grid-cols-4 gap-2 animate-in fade-in">
                    <input
                      type="text"
                      placeholder="Supplier Name *"
                      value={newSuppName}
                      onChange={(e) => setNewSuppName(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0a0e17] text-white border border-white/10 outline-none text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      value={newSuppPhone}
                      onChange={(e) => setNewSuppPhone(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0a0e17] text-white border border-white/10 outline-none text-xs"
                    />
                    <input
                      type="text"
                      placeholder="City / Hub"
                      value={newSuppCity}
                      onChange={(e) => setNewSuppCity(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0a0e17] text-white border border-white/10 outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleCreateSupplier}
                      className="bg-[#00d9ff] text-neutral-950 font-bold rounded-lg px-3 py-1.5 text-xs hover:bg-[#00b8d9]"
                    >
                      Save Supplier
                    </button>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#101628] border border-white/10 text-white font-semibold outline-none cursor-pointer [&>option]:bg-[#101628]"
                  >
                    <option value="">Choose Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.city ? `(${s.city})` : ''} — Current Due: ₹{s.balance_due || 0}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Bill Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                    Invoice / Bill No *
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="e.g. BILL-9921"
                    className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-white/10 text-white font-semibold outline-none focus:border-[#ffa500]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-white/10 text-white font-semibold outline-none focus:border-[#ffa500]"
                  />
                </div>
              </div>

              {/* Line Item Staging Box */}
              <div className="p-3.5 rounded-2xl bg-[#0a0e17]/70 border border-white/10 space-y-3">
                <span className="text-[11px] font-mono font-bold text-[#00d9ff] block uppercase tracking-wider">
                  Add Line Item (Variant Specific)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-4">
                    <label className="text-[9px] font-mono text-[#8b9bb4] uppercase block mb-1">Select Product</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#101628] border border-white/10 text-white outline-none cursor-pointer"
                    >
                      <option value="">Choose Product...</option>
                      {productsList.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.id}] {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-mono text-[#8b9bb4] uppercase block mb-1">Color</label>
                    <select
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      disabled={!selectedProductId}
                      className="w-full px-2 py-1.5 rounded-xl bg-[#101628] border border-white/10 text-white outline-none"
                    >
                      {availableColors.map((c: string) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-mono text-[#8b9bb4] uppercase block mb-1">Size</label>
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      disabled={!selectedProductId}
                      className="w-full px-2 py-1.5 rounded-xl bg-[#101628] border border-white/10 text-white outline-none"
                    >
                      {availableSizes.map((s: string) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-[9px] font-mono text-[#8b9bb4] uppercase block mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-xl bg-[#101628] border border-white/10 text-white font-bold outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-mono text-[#8b9bb4] uppercase block mb-1">Cost (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={cost}
                      onChange={(e) => setCost(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-xl bg-[#101628] border border-white/10 text-white font-bold outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1 flex items-end">
                    <button
                      type="button"
                      disabled={!selectedProductId}
                      onClick={handleAddLineItem}
                      className="w-full py-2 bg-[#00d9ff] hover:bg-[#00b8d9] text-neutral-950 rounded-xl font-bold flex items-center justify-center cursor-pointer transition-all disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17]">
                <table className="w-full text-left text-[10.5px]">
                  <thead className="bg-[#101628] text-[#8b9bb4] font-mono uppercase text-[8.5px]">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5">Variant</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Cost (₹)</th>
                      <th className="p-2.5 text-right">Total (₹)</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-[#8b9bb4] italic">
                          No line items added yet.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-bold text-white">
                            [{it.product_id}] {it.product_name}
                          </td>
                          <td className="p-2.5 text-[#00d9ff]">
                            {it.variant_color} / {it.variant_size}
                          </td>
                          <td className="p-2.5 text-center font-bold text-[#00ff9d]">{it.quantity}</td>
                          <td className="p-2.5 text-right font-mono text-white">₹{it.unit_cost}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-white">
                            ₹{it.quantity * it.unit_cost}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
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

              {/* Supplier Ledger Payment Section */}
              <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-[#8b9bb4] font-mono block mb-1">TOTAL BILL AMOUNT</span>
                  <span className="text-base font-mono font-extrabold text-white">
                    ₹{totalInvoiceCost.toLocaleString('en-IN')}
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                    Amount Paid Now (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={totalInvoiceCost}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#101628] border border-white/10 text-[#00ff9d] font-bold outline-none focus:border-[#00ff9d]"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-[#ff6b6b] font-mono block mb-1">LEDGER BALANCE DUE</span>
                  <span className="text-base font-mono font-extrabold text-[#ff6b6b]">
                    ₹{calculatedBalanceDue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Bill notes, transport details, remarks..."
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0a0e17] border border-white/10 text-white text-[11px] outline-none"
                />
              </div>

              {/* Bottom Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
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
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#ffa500] to-[#ff6b6b] text-white font-bold flex items-center gap-1.5 shadow-lg shadow-[#ffa500]/30 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save & Inward to Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. SUPPLIER LEDGER STATEMENT MODAL */}
      {selectedSupplierForLedger && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in">
          <div className="bg-[#101628]/98 border border-white/15 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative animate-in zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="p-4 sm:px-6 border-b border-white/10 flex items-center justify-between bg-[#0a0e17]/80">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#00d9ff]" />
                  <h3 className="text-base font-extrabold text-white">{selectedSupplierForLedger.name}</h3>
                </div>
                <span className="text-[10px] text-[#8b9bb4]">
                  {selectedSupplierForLedger.city || 'Vendor'} • Phone: {selectedSupplierForLedger.phone || 'N/A'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[8.5px] font-mono text-[#8b9bb4] block uppercase">Current Due</span>
                  <span className="text-sm font-mono font-extrabold text-[#ff6b6b]">
                    ₹{Number(selectedSupplierForLedger.balance_due || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSupplierForLedger(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 custom-scrollbar">
              <span className="text-[10px] font-mono text-[#8b9bb4] uppercase block font-bold">
                Transaction Statement & History
              </span>

              {loadingLedger ? (
                <div className="p-8 text-center text-[#8b9bb4]">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff] mb-2" />
                  Loading ledger entries...
                </div>
              ) : ledgerEntries.length === 0 ? (
                <div className="p-8 text-center text-[#8b9bb4] italic bg-[#0a0e17] rounded-2xl border border-white/5">
                  No previous ledger transactions recorded for this supplier.
                </div>
              ) : (
                <div className="space-y-2">
                  {ledgerEntries.map((entry) => {
                    const isBill = entry.transaction_type === 'BILL';
                    return (
                      <div
                        key={entry.id}
                        className="p-3 rounded-2xl bg-[#0a0e17] border border-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                              isBill ? 'bg-[#ffa500]/15 text-[#ffa500]' : 'bg-[#00ff9d]/15 text-[#00ff9d]'
                            }`}
                          >
                            {isBill ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-bold text-white text-xs block">
                              {entry.description || (isBill ? 'Bill Inward' : 'Payment Out')}
                            </span>
                            <span className="text-[9.5px] font-mono text-[#8b9bb4]">
                              {new Date(entry.created_at).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono text-xs font-bold block ${
                              isBill ? 'text-[#ffa500]' : 'text-[#00ff9d]'
                            }`}
                          >
                            {isBill ? '+' : '-'}₹{Number(entry.amount).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] font-mono text-[#8b9bb4]">
                            Balance: ₹{Number(entry.balance_after).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}