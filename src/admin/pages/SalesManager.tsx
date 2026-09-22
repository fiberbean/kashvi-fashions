import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  RefreshCw,
  Loader2,
  Trash2,
  X,
  Check,
  Eye,
  Calendar,
  Layers,
  Palette,
  CreditCard,
  Banknote,
  QrCode,
  Store,
  Globe,
  Receipt,
  Printer,
  ArrowRight,
  User,
  Phone,
  Tag,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InventoryItemRecord {
  id: string;
  product_id: string;
  variant_color: string;
  variant_size: string;
  stock_quantity: number;
}

interface ProductRecord {
  id: string;
  name: string;
  category?: string;
  sub_category?: string;
  offline_price?: number;
  online_price?: number;
  selling_price?: number;
  price?: number;
}

interface CartItem {
  cart_id: string;
  product_id: string;
  product_name: string;
  color: string;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  available_stock: number;
  hex_code?: string;
}

interface OrderRecord {
  id: string;
  customer_name: string;
  customer_phone?: string;
  order_type: 'offline' | 'online';
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_mode: string;
  created_at: string;
}

export default function SalesManager() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [productsList, setProductsList] = useState<ProductRecord[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItemRecord[]>([]);
  const [coloursList, setColoursList] = useState<{ name: string; hex_code?: string }[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // POS Billing Modal state
  const [isBillingModalOpen, setIsBillingModalOpen] = useState<boolean>(false);
  const [orderType, setOrderType] = useState<'offline' | 'online'>('offline');
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card'>('cash');
  const [discountAmount, setDiscountAmount] = useState<number | string>(0);
  const [invoiceNo, setInvoiceNo] = useState<string>('INV0001');

  // Product Selection in POS
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearchTerm, setProductSearchTerm] = useState<string>('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [itemRate, setItemRate] = useState<number>(0);
  const [sellQuantity, setSellQuantity] = useState<number>(1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cart
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Invoice Details View Modal
  const [viewingOrder, setViewingOrder] = useState<OrderRecord | null>(null);
  const [viewingItems, setViewingItems] = useState<any[]>([]);
  const [loadingViewItems, setLoadingViewItems] = useState<boolean>(false);

  const generateInvoiceNo = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('id')
        .like('id', 'INV%')
        .order('id', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const match = data[0].id.match(/\d+$/);
        const nextNum = match ? parseInt(match[0], 10) + 1 : 1;
        setInvoiceNo(`INV${String(nextNum).padStart(4, '0')}`);
      } else {
        setInvoiceNo('INV0001');
      }
    } catch {
      setInvoiceNo(`INV${Math.floor(1000 + Math.random() * 9000)}`);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderRes, prodRes, invRes, clrRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*'),
        supabase.from('inventory').select('*'),
        supabase.from('colours').select('name, hex_code')
      ]);

      if (orderRes.data) setOrders(orderRes.data);
      if (prodRes.data) {
        const sorted = [...prodRes.data].sort((a, b) =>
          String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' })
        );
        setProductsList(sorted);
      }
      if (invRes.data) setInventoryList(invRes.data);
      if (clrRes.data) setColoursList(clrRes.data);
    } catch (err) {
      console.error('Failed to load sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const openNewBillingDesk = () => {
    generateInvoiceNo();
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setOrderType('offline');
    setPaymentMode('cash');
    setDiscountAmount(0);
    setCartItems([]);
    setSelectedProductId('');
    setProductSearchTerm('');
    setSelectedColor('');
    setSelectedSize('');
    setItemRate(0);
    setSellQuantity(1);
    setIsBillingModalOpen(true);
  };

  const activeProduct = useMemo(() => {
    return productsList.find((p) => String(p.id) === String(selectedProductId));
  }, [productsList, selectedProductId]);

  useEffect(() => {
    if (!activeProduct) {
      setItemRate(0);
      return;
    }
    if (orderType === 'online') {
      const p = activeProduct.online_price || activeProduct.selling_price || activeProduct.price || 0;
      setItemRate(Number(p));
    } else {
      const p = activeProduct.offline_price || activeProduct.selling_price || activeProduct.price || 0;
      setItemRate(Number(p));
    }
  }, [activeProduct, orderType]);

  const productInventoryRows = useMemo(() => {
    if (!activeProduct) return [];
    return inventoryList.filter((inv) => String(inv.product_id) === String(activeProduct.id));
  }, [activeProduct, inventoryList]);

  const availableColorsForProduct = useMemo(() => {
    const map = new Map<string, { totalStock: number; hex?: string }>();
    productInventoryRows.forEach((r) => {
      const clr = r.variant_color || 'Standard';
      const prev = map.get(clr) || { totalStock: 0 };
      const matchedHex = coloursList.find((c) => c.name.toLowerCase().trim() === clr.toLowerCase().trim())?.hex_code;
      map.set(clr, {
        totalStock: prev.totalStock + (r.stock_quantity || 0),
        hex: matchedHex || '#6d4aff'
      });
    });
    return Array.from(map.entries()).map(([color, data]) => ({
      color,
      stock: data.totalStock,
      hex: data.hex
    }));
  }, [productInventoryRows, coloursList]);

  const availableSizesForSelection = useMemo(() => {
    if (!selectedColor) return [];
    return productInventoryRows
      .filter((r) => (r.variant_color || 'Standard') === selectedColor)
      .map((r) => ({
        size: r.variant_size || 'Free Size',
        stock: r.stock_quantity || 0
      }));
  }, [productInventoryRows, selectedColor]);

  const currentVariantStock = useMemo(() => {
    if (!selectedColor || !selectedSize) return 0;
    const match = productInventoryRows.find(
      (r) => (r.variant_color || 'Standard') === selectedColor && (r.variant_size || 'Free Size') === selectedSize
    );
    return match ? match.stock_quantity : 0;
  }, [productInventoryRows, selectedColor, selectedSize]);

  const handleSelectProduct = (prod: ProductRecord) => {
    setSelectedProductId(prod.id);
    setProductSearchTerm(`[${prod.id}] ${prod.name}`);
    setIsProductDropdownOpen(false);
    setSelectedColor('');
    setSelectedSize('');
    setSellQuantity(1);
  };

  const handleAddToCart = () => {
    if (!activeProduct) {
      alert('ముందు Product సెలెక్ట్ చేయండి.');
      return;
    }
    if (!selectedColor) {
      alert('Colour సెలెక్ట్ చేయండి.');
      return;
    }
    if (!selectedSize) {
      alert('Size సెలెక్ట్ చేయండి.');
      return;
    }
    if (sellQuantity <= 0) {
      alert('Quantity కనీసం 1 ఉండాలి.');
      return;
    }
    if (sellQuantity > currentVariantStock) {
      alert(`స్టాక్ సరిపోదు! అందుబాటులో ఉన్నది ${currentVariantStock} మాత్రమే.`);
      return;
    }

    const matchedHex = coloursList.find((c) => c.name.toLowerCase().trim() === selectedColor.toLowerCase().trim())?.hex_code;
    const cartId = `${activeProduct.id}_${selectedColor}_${selectedSize}`;

    const existingIndex = cartItems.findIndex((c) => c.cart_id === cartId);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      const newQty = updated[existingIndex].quantity + sellQuantity;
      if (newQty > currentVariantStock) {
        alert(`మొత్తం అందుబాటులో ఉన్న స్టాక్ (${currentVariantStock}) మించి బిల్ చేయలేరు.`);
        return;
      }
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].total_price = newQty * updated[existingIndex].unit_price;
      setCartItems(updated);
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          cart_id: cartId,
          product_id: activeProduct.id,
          product_name: activeProduct.name,
          color: selectedColor,
          size: selectedSize,
          quantity: sellQuantity,
          unit_price: itemRate,
          total_price: sellQuantity * itemRate,
          available_stock: currentVariantStock,
          hex_code: matchedHex || '#6d4aff'
        }
      ]);
    }

    setSelectedColor('');
    setSelectedSize('');
    setSellQuantity(1);
  };

  const handleRemoveFromCart = (cartId: string) => {
    setCartItems((prev) => prev.filter((c) => c.cart_id !== cartId));
  };

  const subTotalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total_price, 0);
  }, [cartItems]);

  const finalPayableAmount = useMemo(() => {
    const disc = Number(discountAmount) || 0;
    return Math.max(0, subTotalAmount - disc);
  }, [subTotalAmount, discountAmount]);

  const totalCartUnits = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const handleCompleteSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert('బిల్ చేయడానికి కార్ట్‌లో కనీసం ఒక ఐటమ్ అయినా ఉండాలి.');
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload = {
        id: invoiceNo.trim(),
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: customerPhone.trim() || null,
        order_type: orderType,
        total_amount: subTotalAmount,
        discount_amount: Number(discountAmount) || 0,
        final_amount: finalPayableAmount,
        payment_mode: paymentMode,
        payment_status: 'paid',
        created_at: new Date().toISOString()
      };

      const { error: orderErr } = await supabase.from('orders').insert([orderPayload]);
      if (orderErr) throw orderErr;

      const orderItemsPayload = cartItems.map((item, idx) => ({
        id: `oi_${invoiceNo}_${Date.now()}_${idx}`,
        order_id: invoiceNo.trim(),
        product_id: item.product_id,
        variant_color: item.color,
        variant_size: item.size,
        quantity: item.quantity,
        price: item.unit_price,
        total: item.total_price
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsPayload);
      if (itemsErr) throw itemsErr;

      for (const item of cartItems) {
        const { data: invRow } = await supabase
          .from('inventory')
          .select('id, stock_quantity')
          .eq('product_id', item.product_id)
          .eq('variant_color', item.color)
          .eq('variant_size', item.size)
          .maybeSingle();

        if (invRow) {
          const newStock = Math.max(0, (invRow.stock_quantity || 0) - item.quantity);
          await supabase
            .from('inventory')
            .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
            .eq('id', invRow.id);
        }
      }

      alert(`Sale completed successfully! Invoice ${invoiceNo} recorded.`);
      setIsBillingModalOpen(false);
      loadData();
    } catch (err: any) {
      alert('Failed to save sale: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenViewOrder = async (order: OrderRecord) => {
    setViewingOrder(order);
    setLoadingViewItems(true);
    try {
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      setViewingItems(data || []);
    } catch (err: any) {
      alert('Error fetching invoice items: ' + err.message);
    } finally {
      setLoadingViewItems(false);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter(
      (o) =>
        (o.id || '').toLowerCase().includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.customer_phone || '').toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  return (
    <div className="space-y-3 font-sans text-xs select-none">
      
      {/* 1. Header Bar */}
      <div className="px-3.5 py-2.5 rounded-2xl bg-[#101628]/95 border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00d9ff] to-[#6d4aff] text-white flex items-center justify-center shadow-md shadow-[#00d9ff]/20">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Sales & Billing Desk</span>
              <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 text-[10px] font-mono">
                {orders.length} Invoices
              </span>
            </h2>
            <span className="text-[10px] text-[#8b9bb4]">
              Offline & Online Store Pricing • Live Stock Deduction • Fast POS Billing
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-56 sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice, customer, mobile..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0a0e17] rounded-xl text-white text-xs outline-none border border-white/10 focus:border-[#00d9ff]"
            />
            <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#00d9ff] cursor-pointer"
            title="Refresh Invoices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* New Sale / POS Button */}
          <button
            type="button"
            onClick={() => {
              openNewBillingDesk();
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#6d4aff] hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#00d9ff]/30 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
            <span>New Sale / POS</span>
          </button>
        </div>
      </div>

      {/* 2. Invoices History Table */}
      <div className="rounded-2xl bg-[#101628]/95 border border-white/10 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#0a0e17]/80 text-[#8b9bb4] font-mono text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Invoice No</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Store Channel</th>
                <th className="py-2.5 px-3">Customer Details</th>
                <th className="py-2.5 px-3">Payment Mode</th>
                <th className="py-2.5 px-3 text-right">Net Amount</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#8b9bb4]">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-[#00d9ff] mb-1.5" />
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#8b9bb4] italic text-xs">
                    No sales invoices recorded yet. Click &quot;New Sale / POS&quot; to bill your first order.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-extrabold text-[#00ff9d] text-xs">
                      {ord.id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#8b9bb4] text-[11px]">
                      {new Date(ord.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-2.5 px-3">
                      {ord.order_type === 'online' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00d9ff]/15 text-[#00d9ff] text-[10px] font-mono font-bold">
                          <Globe className="w-3 h-3" /> Online Store
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffa500]/15 text-[#ffa500] text-[10px] font-mono font-bold">
                          <Store className="w-3 h-3" /> Walk-in
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-white block">{ord.customer_name}</span>
                      {ord.customer_phone && (
                        <span className="text-[10px] font-mono text-[#8b9bb4]">{ord.customer_phone}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 uppercase font-mono font-bold text-[#8b9bb4] text-[10px]">
                      {ord.payment_mode}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-white text-xs">
                      ₹{Number(ord.final_amount || ord.total_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenViewOrder(ord)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-[#00d9ff]/20 text-[#8b9bb4] hover:text-[#00d9ff] cursor-pointer"
                        title="View Invoice Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. POS BILLING DESK MODAL (HIGHEST Z-INDEX & FIXED CLEARANCE) */}
      {isBillingModalOpen && (
        <div className="fixed inset-0 z-[100005] pt-[76px] pb-6 px-2 sm:px-4 flex items-start justify-center bg-black/85 backdrop-blur-md overflow-y-auto select-none animate-in fade-in">
          <div className="bg-[#101628] border border-white/20 rounded-3xl w-full max-w-[98vw] xl:max-w-7xl overflow-hidden shadow-2xl relative flex flex-col my-auto max-h-[calc(100vh-100px)]">
            
            {/* Header */}
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-[#0a0e17] sticky top-0 z-30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00d9ff] to-[#6d4aff] text-white flex items-center justify-center shadow">
                  <Receipt className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>POS Billing Workspace</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/30 text-[9px] font-mono font-bold">
                      LIVE INVOICE: {invoiceNo}
                    </span>
                  </h3>
                </div>
              </div>

              {/* Online / Offline Price Mode Switcher */}
              <div className="flex items-center gap-2">
                <div className="inline-flex p-0.5 rounded-xl bg-[#101628] border border-white/15">
                  <button
                    type="button"
                    onClick={() => setOrderType('offline')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      orderType === 'offline'
                        ? 'bg-[#ffa500] text-neutral-950 shadow-md'
                        : 'text-[#8b9bb4] hover:text-white'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Walk-in (Offline SP)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('online')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      orderType === 'online'
                        ? 'bg-[#00d9ff] text-neutral-950 shadow-md'
                        : 'text-[#8b9bb4] hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Online Store (Online SP)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBillingModalOpen(false)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-[#ff6b6b]/30 text-[#8b9bb4] hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCompleteSale} className="p-3 sm:p-4 overflow-y-auto space-y-3 custom-scrollbar text-xs">
              
              {/* Customer Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-2.5 rounded-2xl bg-[#0a0e17] border border-white/10">
                <div className="relative">
                  <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                    Customer Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Walk-in Customer"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#101628] border border-white/15 text-white font-semibold outline-none text-xs focus:border-[#00d9ff]"
                    />
                    <User className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="relative">
                  <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                    Mobile Number (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="Customer phone..."
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#101628] border border-white/15 text-white font-mono text-xs outline-none focus:border-[#00d9ff]"
                    />
                    <Phone className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['cash', 'upi', 'card'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMode(m)}
                        className={`py-1.5 rounded-xl uppercase font-mono font-bold text-[10px] transition-all cursor-pointer border ${
                          paymentMode === m
                            ? 'bg-[#00ff9d] text-neutral-950 border-[#00ff9d] shadow'
                            : 'bg-[#101628] text-[#8b9bb4] border-white/10 hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Two Column POS Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                
                {/* === LEFT COLUMN: PRODUCT & AVAILABLE VARIANT SELECTION (Span 6) === */}
                <div className="lg:col-span-6 space-y-3 p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10">
                  <span className="text-xs font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> 1. Select Product & Live In-Stock Variants
                  </span>

                  {/* Searchable Product Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <div
                      onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                      className="w-full px-3 py-2 rounded-xl bg-[#101628] border border-white/20 text-white font-semibold text-xs flex items-center justify-between cursor-pointer focus-within:border-[#00d9ff]"
                    >
                      <span className={activeProduct ? 'text-white font-bold truncate' : 'text-[#8b9bb4]'}>
                        {activeProduct ? `[${activeProduct.id}] ${activeProduct.name}` : 'Search Product (KF...) or Name...'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-[#8b9bb4] shrink-0 ml-1" />
                    </div>

                    {isProductDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#101628] border border-white/20 rounded-2xl shadow-2xl p-2 max-h-60 overflow-hidden flex flex-col">
                        <div className="relative mb-1.5">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Type product code or title..."
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                            className="w-full pl-7 pr-2.5 py-1.5 rounded-xl bg-[#0a0e17] border border-white/10 text-white text-xs outline-none focus:border-[#00d9ff]"
                          />
                          <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2 top-1/2 -translate-y-1/2" />
                        </div>

                        <div className="overflow-y-auto space-y-0.5 custom-scrollbar">
                          {productsList.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => handleSelectProduct(p)}
                              className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer flex items-center justify-between"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-mono font-extrabold text-[#00ff9d] text-xs shrink-0">
                                  [{p.id}]
                                </span>
                                <span className="text-white font-semibold text-xs truncate">
                                  {p.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-[#00d9ff] shrink-0 ml-2">
                                ₹{orderType === 'online' ? (p.online_price || p.price || 0) : (p.offline_price || p.price || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Available Stocked Variants */}
                  {activeProduct ? (
                    <div className="space-y-3 pt-1 border-t border-white/5">
                      
                      {/* Colour Swatches */}
                      <div className="space-y-1.5">
                        <span className="text-[10.5px] font-mono font-bold text-[#8b9bb4] uppercase block">
                          Select Colour (In-Stock Only):
                        </span>
                        {availableColorsForProduct.length === 0 ? (
                          <div className="p-2.5 rounded-xl bg-[#101628] border border-dashed border-[#ff6b6b]/30 text-[#ff6b6b] text-[11px] font-bold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>No stock available for this product in inventory!</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {availableColorsForProduct.map((c) => {
                              const isSelected = selectedColor === c.color;
                              return (
                                <button
                                  key={c.color}
                                  type="button"
                                  onClick={() => {
                                    setSelectedColor(c.color);
                                    setSelectedSize('');
                                  }}
                                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer border ${
                                    isSelected
                                      ? 'border-2 border-[#FFB6C1] shadow-[0_0_12px_rgba(255,182,193,0.8)] ring-1 ring-[#FF69B4] scale-105 bg-[#101628] text-white'
                                      : 'border-white/10 bg-[#101628] text-[#8b9bb4] hover:text-white'
                                  }`}
                                >
                                  <span
                                    className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                                    style={{ backgroundColor: c.hex }}
                                  />
                                  <span>{c.color}</span>
                                  <span className="text-[9px] font-mono opacity-70">({c.stock})</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Sizes for chosen color */}
                      {selectedColor && (
                        <div className="space-y-1.5">
                          <span className="text-[10.5px] font-mono font-bold text-[#8b9bb4] uppercase block">
                            Select Size for &quot;{selectedColor}&quot;:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {availableSizesForSelection.map((s) => {
                              const isSelected = selectedSize === s.size;
                              const isNoStock = s.stock <= 0;
                              return (
                                <button
                                  key={s.size}
                                  disabled={isNoStock}
                                  type="button"
                                  onClick={() => setSelectedSize(s.size)}
                                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-extrabold transition-all cursor-pointer border ${
                                    isSelected
                                      ? 'bg-[#00ff9d] text-neutral-950 border-[#00ff9d] shadow-md scale-105'
                                      : isNoStock
                                      ? 'bg-white/5 text-white/30 border-white/5 cursor-not-allowed'
                                      : 'bg-[#101628] text-white border-white/15 hover:border-[#00d9ff]'
                                  }`}
                                >
                                  <span>{s.size}</span>
                                  <span className="text-[9px] ml-1 opacity-75">[{s.stock}]</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Selling Price & Quantity Inputs */}
                      {selectedColor && selectedSize && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-2.5 rounded-xl bg-[#101628] border border-white/10 items-end">
                          <div>
                            <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1">
                              Unit Rate (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={itemRate}
                              onChange={(e) => setItemRate(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0a0e17] border border-white/15 text-white font-mono font-bold text-xs outline-none"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase">Qty</label>
                              <span className="text-[9px] font-mono text-[#00ff9d]">Max: {currentVariantStock}</span>
                            </div>
                            <input
                              type="number"
                              min="1"
                              max={currentVariantStock}
                              value={sellQuantity}
                              onChange={(e) => setSellQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0a0e17] border border-white/15 text-[#00ff9d] font-mono font-extrabold text-xs outline-none text-center"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleAddToCart}
                            className="w-full py-2 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#00ff9d] text-neutral-950 font-extrabold text-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Add Item</span>
                          </button>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="p-4 text-center text-[#8b9bb4] italic text-xs">
                      Choose a product above to inspect and sell available variants.
                    </div>
                  )}

                </div>

                {/* === RIGHT COLUMN: LIVE CART & FINAL CHECKOUT (Span 6) === */}
                <div className="lg:col-span-6 space-y-2.5">
                  <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17] shadow-xl flex flex-col">
                    
                    {/* Header */}
                    <div className="px-4 py-2.5 bg-[#101628] border-b border-white/10 flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-[#00ff9d] uppercase flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5" /> Cart Items ({cartItems.length})
                      </span>
                      <span className="text-white font-bold">{totalCartUnits} Units</span>
                    </div>

                    {/* Cart Items List */}
                    <div className="max-h-56 min-h-[140px] overflow-y-auto custom-scrollbar p-1">
                      {cartItems.length === 0 ? (
                        <div className="p-8 text-center text-[#8b9bb4] italic text-xs">
                          Cart is currently empty. Add variants on Left to generate bill.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#101628]/80 text-[#8b9bb4] font-mono uppercase text-[8.5px] sticky top-0">
                            <tr>
                              <th className="py-1.5 px-2">Item Details</th>
                              <th className="py-1.5 px-2 text-center">Qty</th>
                              <th className="py-1.5 px-2 text-right">Rate</th>
                              <th className="py-1.5 px-2 text-right">Total</th>
                              <th className="py-1.5 px-1.5 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {cartItems.map((c) => (
                              <tr key={c.cart_id} className="hover:bg-white/[0.02]">
                                <td className="py-1.5 px-2">
                                  <span className="font-bold text-white block truncate max-w-[170px]">
                                    {c.product_name}
                                  </span>
                                  <span className="text-[10px] text-[#00d9ff] font-mono">
                                    {c.color} • {c.size}
                                  </span>
                                </td>
                                <td className="py-1.5 px-2 text-center font-bold text-[#00ff9d]">
                                  {c.quantity}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-[#8b9bb4]">
                                  ₹{c.unit_price}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono font-bold text-white">
                                  ₹{c.total_price.toLocaleString('en-IN')}
                                </td>
                                <td className="py-1.5 px-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromCart(c.cart_id)}
                                    className="p-1 text-[#ff6b6b] hover:text-white rounded hover:bg-white/5 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Bill Calculation Card */}
                    <div className="p-3 bg-[#101628] border-t border-white/10 space-y-2">
                      <div className="space-y-1 font-mono text-xs">
                        <div className="flex justify-between text-[#8b9bb4]">
                          <span>Subtotal ({totalCartUnits} units):</span>
                          <span>₹{subTotalAmount.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="flex justify-between items-center text-[#8b9bb4] pt-1">
                          <span>Discount (₹):</span>
                          <input
                            type="number"
                            min="0"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            className="w-20 px-2 py-0.5 rounded bg-[#0a0e17] border border-white/15 text-white font-mono text-right text-xs outline-none"
                          />
                        </div>

                        <div className="flex justify-between items-center text-xs font-bold pt-1.5 border-t border-white/5">
                          <span className="text-white">NET PAYABLE:</span>
                          <span className="text-lg font-extrabold text-[#00ff9d]">
                            ₹{finalPayableAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsBillingModalOpen(false)}
                          className="px-4 py-2 rounded-xl text-[#8b9bb4] hover:text-white text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || cartItems.length === 0}
                          className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#00ff9d] text-neutral-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>Complete Sale & Deduct Stock</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* 4. VIEW INVOICE DETAILS MODAL */}
      {viewingOrder && (
        <div className="fixed inset-0 z-[100000] p-3 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in select-none">
          <div className="bg-[#101628] border border-white/15 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div>
                <span className="font-mono text-xs font-extrabold text-[#00ff9d]">{viewingOrder.id}</span>
                <h4 className="text-sm font-bold text-white">{viewingOrder.customer_name}</h4>
                <span className="text-[10px] text-[#8b9bb4]">
                  {viewingOrder.order_type === 'online' ? 'Online Store Dispatch' : 'Walk-in Store Bill'} • Mode: {viewingOrder.payment_mode.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-[#8b9bb4] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto custom-scrollbar">
              {loadingViewItems ? (
                <div className="p-5 text-center text-[#8b9bb4]">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto text-[#00d9ff] mb-1.5" />
                  Loading invoice lines...
                </div>
              ) : viewingItems.length === 0 ? (
                <div className="p-3 text-center text-[#8b9bb4] italic text-xs">
                  No line items found.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0a0e17] text-[#8b9bb4] font-mono text-[9px] uppercase sticky top-0">
                    <tr>
                      <th className="py-1 px-2">Product</th>
                      <th className="py-1 px-2">Variant</th>
                      <th className="py-1 px-2 text-center">Qty</th>
                      <th className="py-1 px-2 text-right">Price</th>
                      <th className="py-1 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {viewingItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1.5 px-2 text-white font-semibold">{item.product_id}</td>
                        <td className="py-1.5 px-2 text-[#00d9ff]">{item.variant_color} / {item.variant_size}</td>
                        <td className="py-1.5 px-2 text-center font-bold text-[#00ff9d]">{item.quantity}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-[#8b9bb4]">₹{item.price}</td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-white">₹{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
              <span className="text-[#8b9bb4] font-mono">Invoice Net Total:</span>
              <span className="font-mono font-extrabold text-[#00ff9d] text-base">
                ₹{Number(viewingOrder.final_amount || viewingOrder.total_amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}