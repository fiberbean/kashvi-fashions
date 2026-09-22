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
  Banknote,
  QrCode,
  Store,
  Receipt,
  Printer,
  ArrowRight,
  User,
  Phone,
  Tag,
  AlertTriangle,
  ChevronDown,
  UserPlus,
  Users,
  Share2,
  BookOpen,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  city?: string | null;
  address?: string | null;
  created_at?: string;
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

interface InventoryItemRecord {
  id: string;
  product_id: string;
  variant_color: string;
  variant_size: string;
  stock_quantity: number;
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
  customer_id?: string | null;
  customer_name: string;
  customer_phone?: string;
  order_type: 'offline';
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_mode: 'cash' | 'upi';
  utr_number?: string | null;
  payment_status: 'paid' | 'utr_pending';
  created_at: string;
}

export default function SalesManager() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [productsList, setProductsList] = useState<ProductRecord[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItemRecord[]>([]);
  const [coloursList, setColoursList] = useState<{ name: string; hex_code?: string }[]>([]);
  const [customersList, setCustomersList] = useState<CustomerRecord[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Initial Customer Prompt & Registration Modals
  const [isCustomerPromptOpen, setIsCustomerPromptOpen] = useState<boolean>(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState<boolean>(false);
  const [isExistingCustomerPickerOpen, setIsExistingCustomerPickerOpen] = useState<boolean>(false);
  const [isCustomerLedgerOpen, setIsCustomerLedgerOpen] = useState<boolean>(false);

  // New Customer Form State (Dedicated customers Table)
  const [newCustId, setNewCustId] = useState<string>('CUST0001');
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustCity, setNewCustCity] = useState<string>('');
  const [registeringCust, setRegisteringCust] = useState<boolean>(false);

  // Existing Customer Search
  const [custSearchTerm, setCustSearchTerm] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

  // 2. Sales Form State
  const [isBillingModalOpen, setIsBillingModalOpen] = useState<boolean>(false);
  const [invoiceNo, setInvoiceNo] = useState<string>('KFINV0001');
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number | string>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 3. Variant Picker Modal State
  const [isVariantModalOpen, setIsVariantModalOpen] = useState<boolean>(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<ProductRecord | null>(null);
  const [modalColor, setModalColor] = useState<string>('');
  const [modalSize, setModalSize] = useState<string>('');
  const [modalRate, setModalRate] = useState<number>(0);
  const [modalQty, setModalQty] = useState<number>(1);

  // Cart
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // 4. Colorful Invoice & WhatsApp Share Preview Modal
  const [completedInvoice, setCompletedInvoice] = useState<OrderRecord | null>(null);
  const [completedItems, setCompletedItems] = useState<CartItem[]>([]);
  const [viewingOrder, setViewingOrder] = useState<OrderRecord | null>(null);
  const [viewingOrderItems, setViewingOrderItems] = useState<any[]>([]);
  const [loadingViewItems, setLoadingViewItems] = useState<boolean>(false);

  // Generate Customer ID strictly in customers Table (CUST0001 Format)
  const generateCustomerId = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .like('id', 'CUST%')
        .order('id', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const match = data[0].id.match(/\d+$/);
        const nextNum = match ? parseInt(match[0], 10) + 1 : 1;
        setNewCustId(`CUST${String(nextNum).padStart(4, '0')}`);
      } else {
        setNewCustId('CUST0001');
      }
    } catch {
      setNewCustId('CUST0001');
    }
  };

  // Generate Bill Number in orders Table (KFINV0001 Format)
  const generateBillNumber = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('id')
        .like('id', 'KFINV%')
        .order('id', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const match = data[0].id.match(/\d+$/);
        const nextNum = match ? parseInt(match[0], 10) + 1 : 1;
        setInvoiceNo(`KFINV${String(nextNum).padStart(4, '0')}`);
      } else {
        setInvoiceNo('KFINV0001');
      }
    } catch {
      setInvoiceNo(`KFINV${Math.floor(1000 + Math.random() * 9000)}`);
    }
  };

  // Load all required modules including separate customers table
  const loadData = async () => {
    setLoading(true);
    try {
      const [orderRes, prodRes, invRes, clrRes, custRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*'),
        supabase.from('inventory').select('*'),
        supabase.from('colours').select('name, hex_code'),
        supabase.from('customers').select('*').order('name', { ascending: true })
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
      if (custRes.data) setCustomersList(custRes.data);
    } catch (err) {
      console.error('Failed to load sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Step 1: Open Prompt
  const handleStartNewBill = () => {
    setIsCustomerPromptOpen(true);
  };

  // Step 2A: Trigger New Customer Registration
  const handleChooseNewCustomer = () => {
    setIsCustomerPromptOpen(false);
    generateCustomerId();
    setNewCustName('');
    setNewCustPhone('');
    setNewCustCity('');
    setIsNewCustomerModalOpen(true);
  };

  // Step 2B: Trigger Existing Customer Picker
  const handleChooseExistingCustomer = () => {
    setIsCustomerPromptOpen(false);
    setCustSearchTerm('');
    setIsExistingCustomerPickerOpen(true);
  };

  // Register Customer directly into separate 'customers' table
  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert('Customer Name mariyu Mobile Number tappanisari.');
      return;
    }

    setRegisteringCust(true);
    try {
      const newRecord: CustomerRecord = {
        id: newCustId.trim(),
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        city: newCustCity.trim() || null
      };

      const { error } = await supabase
        .from('customers')
        .insert([newRecord]);

      if (error) {
        if (error.message.includes('unique') || error.code === '23505') {
          alert('Ee mobile number tho customer already register ayyi unnaru. Existing customer select cheskondi.');
          return;
        }
        throw error;
      }

      setCustomersList((prev) => [newRecord, ...prev]);
      setSelectedCustomer(newRecord);
      setIsNewCustomerModalOpen(false);

      // Open Billing Desk with new registered customer
      openSalesBillingDesk(newRecord);
    } catch (err: any) {
      alert('Error registering customer: ' + err.message);
    } finally {
      setRegisteringCust(false);
    }
  };

  // Select Existing Customer from 'customers' table
  const handleSelectExistingCustomer = (cust: CustomerRecord) => {
    setSelectedCustomer(cust);
    setIsExistingCustomerPickerOpen(false);
    openSalesBillingDesk(cust);
  };

  // Step 3: Open Sales Billing Desk
  const openSalesBillingDesk = (cust: CustomerRecord) => {
    setSelectedCustomer(cust);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    generateBillNumber();
    setPaymentMode('cash');
    setUtrNumber('');
    setDiscountAmount(0);
    setCartItems([]);
    setIsBillingModalOpen(true);
  };

  // Open Product Variant Selection Modal
  const handleOpenVariantPicker = (prod: ProductRecord) => {
    setSelectedProductForModal(prod);
    const storePrice = prod.offline_price || prod.selling_price || prod.price || 0;

    setModalRate(Number(storePrice));
    setModalColor('');
    setModalSize('');
    setModalQty(1);
    setIsVariantModalOpen(true);
  };

  const modalProductInventory = useMemo(() => {
    if (!selectedProductForModal) return [];
    return inventoryList.filter((inv) => String(inv.product_id) === String(selectedProductForModal.id));
  }, [selectedProductForModal, inventoryList]);

  const modalAvailableColors = useMemo(() => {
    const map = new Map<string, { stock: number; hex?: string }>();
    modalProductInventory.forEach((r) => {
      const clr = r.variant_color || 'Standard';
      const prev = map.get(clr) || { stock: 0 };
      const matched = coloursList.find((c) => c.name.toLowerCase().trim() === clr.toLowerCase().trim())?.hex_code;
      map.set(clr, {
        stock: prev.stock + (r.stock_quantity || 0),
        hex: matched || '#6d4aff'
      });
    });
    return Array.from(map.entries()).map(([color, data]) => ({
      color,
      stock: data.stock,
      hex: data.hex
    }));
  }, [modalProductInventory, coloursList]);

  const modalAvailableSizes = useMemo(() => {
    if (!modalColor) return [];
    return modalProductInventory
      .filter((r) => (r.variant_color || 'Standard') === modalColor)
      .map((r) => ({
        size: r.variant_size || 'Free Size',
        stock: r.stock_quantity || 0
      }));
  }, [modalProductInventory, modalColor]);

  const modalCurrentStock = useMemo(() => {
    if (!modalColor || !modalSize) return 0;
    const match = modalProductInventory.find(
      (r) => (r.variant_color || 'Standard') === modalColor && (r.variant_size || 'Free Size') === modalSize
    );
    return match ? match.stock_quantity : 0;
  }, [modalProductInventory, modalColor, modalSize]);

  // Add Item to Cart from Modal
  const handleConfirmVariantToCart = () => {
    if (!selectedProductForModal) return;
    if (!modalColor) {
      alert('Color shade select cheyandi.');
      return;
    }
    if (!modalSize) {
      alert('Size select cheyandi.');
      return;
    }
    if (modalQty <= 0) {
      alert('Quantity kanisam 1 undali.');
      return;
    }
    if (modalQty > modalCurrentStock) {
      alert(`Stock saripodu! Undedi kevalam ${modalCurrentStock} matrame.`);
      return;
    }

    const matchedHex = coloursList.find((c) => c.name.toLowerCase().trim() === modalColor.toLowerCase().trim())?.hex_code;
    const cartId = `${selectedProductForModal.id}_${modalColor}_${modalSize}`;

    const existingIndex = cartItems.findIndex((c) => c.cart_id === cartId);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      const newQty = updated[existingIndex].quantity + modalQty;
      if (newQty > modalCurrentStock) {
        alert(`Mottam stock (${modalCurrentStock}) minchi bill cheyaleru.`);
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
          product_id: selectedProductForModal.id,
          product_name: selectedProductForModal.name,
          color: modalColor,
          size: modalSize,
          quantity: modalQty,
          unit_price: modalRate,
          total_price: modalQty * modalRate,
          available_stock: modalCurrentStock,
          hex_code: matchedHex || '#6d4aff'
        }
      ]);
    }

    setIsVariantModalOpen(false);
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

  // Complete Sale & Store Everything Linked to Customer ID
  const handleCompleteSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('Customer select cheyali.');
      return;
    }
    if (cartItems.length === 0) {
      alert('Cart lo kanisam oka item aina undali.');
      return;
    }

    const isUtrPending = paymentMode === 'upi' && !utrNumber.trim();

    setSubmitting(true);
    try {
      const orderPayload: OrderRecord = {
        id: invoiceNo.trim(),
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        customer_phone: selectedCustomer.phone || undefined,
        order_type: 'offline',
        total_amount: subTotalAmount,
        discount_amount: Number(discountAmount) || 0,
        final_amount: finalPayableAmount,
        payment_mode: paymentMode,
        utr_number: paymentMode === 'upi' && utrNumber.trim() ? utrNumber.trim() : null,
        payment_status: isUtrPending ? 'utr_pending' : 'paid',
        created_at: new Date().toISOString()
      };

      // 1. Insert Order
      const { error: orderErr } = await supabase.from('orders').insert([orderPayload]);
      if (orderErr) throw orderErr;

      // 2. Insert Line Items
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

      // 3. Deduct Stock in inventory table
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

      setCompletedInvoice(orderPayload);
      setCompletedItems([...cartItems]);
      setIsBillingModalOpen(false);
      loadData();
    } catch (err: any) {
      alert('Failed to save order: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // WhatsApp Message Share
  const handleShareWhatsApp = (inv: OrderRecord, items: any[]) => {
    const phone = inv.customer_phone?.replace(/\D/g, '') || '';
    if (!phone) {
      alert('Customer mobile number ledu.');
      return;
    }

    const itemsSummary = items
      .map((it, idx) => `${idx + 1}. ${it.product_name || it.product_id} (${it.color || it.variant_color} / ${it.size || it.variant_size}) x ${it.quantity} = ₹${it.total_price || it.total}`)
      .join('%0A');

    const message = `✨ *KASHVI CREATIONS - TAX INVOICE* ✨%0A%0A` +
      `*Bill No:* ${inv.id}%0A` +
      `*Date:* ${new Date(inv.created_at).toLocaleDateString('en-IN')}%0A` +
      `*Customer:* ${inv.customer_name}%0A` +
      `*Payment Mode:* ${inv.payment_mode.toUpperCase()} ${inv.payment_status === 'utr_pending' ? '(UTR Pending)' : '(Paid)'}%0A%0A` +
      `*ITEMS PURCHASED:*%0A${itemsSummary}%0A%0A` +
      `*Subtotal:* ₹${inv.total_amount}%0A` +
      `*Discount:* ₹${inv.discount_amount}%0A` +
      `*TOTAL AMOUNT:* ₹${inv.final_amount}%0A%0A` +
      `Thank you for shopping with us! Visit again. 🙏%0A` +
      `_Kashvi Command Deck_`;

    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
  };

  const handleOpenViewOrder = async (order: OrderRecord) => {
    setViewingOrder(order);
    setLoadingViewItems(true);
    try {
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      setViewingOrderItems(data || []);
    } catch (err: any) {
      alert('Error fetching items: ' + err.message);
    } finally {
      setLoadingViewItems(false);
    }
  };

  // Customer Ledger Query directly using separate customers table id
  const customerPastOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter((o) => o.customer_id === selectedCustomer.id || o.customer_phone === selectedCustomer.phone);
  }, [orders, selectedCustomer]);

  const filteredExistingCustomers = useMemo(() => {
    if (!custSearchTerm.trim()) return customersList;
    const q = custSearchTerm.toLowerCase().trim();
    return customersList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q))
    );
  }, [customersList, custSearchTerm]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        (o.customer_phone && o.customer_phone.includes(q))
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
              <span>Sales & POS Invoicing Desk</span>
              <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 text-[10px] font-mono">
                {orders.length} Invoices
              </span>
            </h2>
            <span className="text-[10px] text-[#8b9bb4]">
              Customers Register Table • Series: KFINV0001 • Variant Card Picker • WhatsApp Invoices
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-56 sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bill no, customer, mobile..."
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

          <button
            type="button"
            onClick={handleStartNewBill}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#6d4aff] hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#00d9ff]/30 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
            <span>New Bill</span>
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
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer (Register ID)</th>
                <th className="py-2.5 px-3">Store Channel</th>
                <th className="py-2.5 px-3">Payment & UTR Status</th>
                <th className="py-2.5 px-3 text-right">Net Amount</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
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
                    No sales invoices recorded yet. Click &quot;New Bill&quot; to begin.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-extrabold text-[#00ff9d] text-xs">
                      {ord.id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#8b9bb4] text-[11px]">
                      {new Date(ord.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white block">{ord.customer_name}</span>
                        {ord.customer_id && (
                          <span className="text-[9.5px] font-mono text-[#00d9ff] bg-[#00d9ff]/10 px-1 rounded">[{ord.customer_id}]</span>
                        )}
                      </div>
                      {ord.customer_phone && (
                        <span className="text-[10px] font-mono text-[#8b9bb4]">{ord.customer_phone}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffa500]/15 text-[#ffa500] text-[10px] font-mono font-bold">
                        <Store className="w-3 h-3" /> Walk-in
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="uppercase font-mono font-bold text-[#8b9bb4] text-[10px]">
                          {ord.payment_mode}
                        </span>
                        {ord.payment_status === 'utr_pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ff6b6b]/20 text-[#ff6b6b] border border-[#ff6b6b]/40 text-[9px] font-mono font-bold">
                            <Clock className="w-2.5 h-2.5" /> UTR Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00ff9d]/15 text-[#00ff9d] border border-[#00ff9d]/30 text-[9px] font-mono font-bold">
                            <Check className="w-2.5 h-2.5" /> Paid
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-white text-xs">
                      ₹{Number(ord.final_amount || ord.total_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenViewOrder(ord)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-[#00d9ff]/20 text-[#8b9bb4] hover:text-[#00d9ff] cursor-pointer"
                          title="View Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(ord, [])}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-[#25D366]/20 text-[#8b9bb4] hover:text-[#25D366] cursor-pointer"
                          title="Share to WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DIALOG 1: NEW OR EXISTING CUSTOMER CHOICE */}
      {isCustomerPromptOpen && (
        <div className="fixed inset-0 z-[100010] p-4 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in select-none">
          <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00d9ff] to-[#6d4aff] text-white flex items-center justify-center mx-auto shadow-lg">
              <User className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Select Customer Type</h3>
              <p className="text-xs text-[#8b9bb4] mt-1">Kotha customer register cheyala leda register ayina customer aa?</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleChooseNewCustomer}
                className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/15 hover:border-[#00d9ff] text-white font-bold text-xs flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 group hover:bg-white/5"
              >
                <div className="w-8 h-8 rounded-xl bg-[#00d9ff]/20 text-[#00d9ff] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserPlus className="w-4 h-4" />
                </div>
                <span>New Register</span>
              </button>

              <button
                type="button"
                onClick={handleChooseExistingCustomer}
                className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/15 hover:border-[#6d4aff] text-white font-bold text-xs flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 group hover:bg-white/5"
              >
                <div className="w-8 h-8 rounded-xl bg-[#6d4aff]/20 text-[#6d4aff] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <span>Existing Customer</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsCustomerPromptOpen(false)}
                className="w-full py-2 rounded-xl text-[#8b9bb4] hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 2A: NEW CUSTOMER REGISTRATION (SEPARATE CUSTOMERS TABLE) */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-[100010] p-4 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in select-none">
          <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#00d9ff]" />
                <h3 className="text-sm font-bold text-white">Customer Register (customers Table)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="text-[#8b9bb4] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterCustomer} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                  Customer ID (Auto-Generated)
                </label>
                <input
                  type="text"
                  disabled
                  value={newCustId}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0a0e17] border border-white/15 text-[#00ff9d] font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter full name..."
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0a0e17] border border-white/15 text-white font-semibold text-xs outline-none focus:border-[#00d9ff]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                  Mobile Number (For WhatsApp Invoice) *
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  placeholder="10 digit mobile..."
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0a0e17] border border-white/15 text-white font-mono text-xs outline-none focus:border-[#00d9ff]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                  City / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hyderabad, Kakinada..."
                  value={newCustCity}
                  onChange={(e) => setNewCustCity(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0a0e17] border border-white/15 text-white text-xs outline-none focus:border-[#00d9ff]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#8b9bb4] hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registeringCust}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#6d4aff] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {registeringCust ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save to Register & Bill</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 2B: EXISTING CUSTOMER SEARCH PICKER */}
      {isExistingCustomerPickerOpen && (
        <div className="fixed inset-0 z-[100010] p-4 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in select-none">
          <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00d9ff]" />
                <h3 className="text-sm font-bold text-white">Select from Customer Register</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExistingCustomerPickerOpen(false)}
                className="text-[#8b9bb4] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative shrink-0">
              <input
                type="text"
                autoFocus
                placeholder="Search by customer name, mobile or city..."
                value={custSearchTerm}
                onChange={(e) => setCustSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#0a0e17] border border-white/15 text-white text-xs outline-none focus:border-[#00d9ff]"
              />
              <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
              {filteredExistingCustomers.length === 0 ? (
                <div className="p-6 text-center text-[#8b9bb4] italic text-xs">
                  No matching registered customers found.
                </div>
              ) : (
                filteredExistingCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectExistingCustomer(c)}
                    className="p-2.5 rounded-xl hover:bg-white/10 cursor-pointer flex items-center justify-between transition-colors border border-transparent hover:border-white/10"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#00ff9d] font-bold text-xs">[{c.id}]</span>
                        <span className="font-bold text-white text-xs">{c.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#8b9bb4] block mt-0.5">
                        Phone: {c.phone} {c.city ? `• ${c.city}` : ''}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#8b9bb4]" />
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsExistingCustomerPickerOpen(false)}
                className="px-4 py-2 rounded-xl text-[#8b9bb4] hover:text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 3: CUSTOMER LEDGER MODAL */}
      {isCustomerLedgerOpen && selectedCustomer && (
        <div className="fixed inset-0 z-[100020] p-4 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in select-none">
          <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-2xl w-full p-5 shadow-2xl space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#00d9ff]" />
                <div>
                  <h4 className="text-sm font-bold text-white">Customer Ledger: {selectedCustomer.name}</h4>
                  <span className="text-[10px] font-mono text-[#8b9bb4]">ID: {selectedCustomer.id} • Mobile: {selectedCustomer.phone}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomerLedgerOpen(false)}
                className="text-[#8b9bb4] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {customerPastOrders.length === 0 ? (
                <div className="p-8 text-center text-[#8b9bb4] italic text-xs">
                  Ee customer ku sambandhinchina previous bills levu.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0a0e17] text-[#8b9bb4] font-mono text-[9px] uppercase sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5">Bill No</th>
                      <th className="py-2 px-2.5">Date</th>
                      <th className="py-2 px-2.5">Mode</th>
                      <th className="py-2 px-2.5 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {customerPastOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td className="py-2 px-2.5 text-[#00ff9d] font-bold">{ord.id}</td>
                        <td className="py-2 px-2.5 text-[#8b9bb4]">{new Date(ord.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="py-2 px-2.5 uppercase">{ord.payment_mode}</td>
                        <td className="py-2 px-2.5 text-right font-bold text-white">₹{ord.final_amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsCustomerLedgerOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN SALES BILLING FORM (KFINV0001 Format) */}
      {isBillingModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-[100005] pt-[76px] pb-6 px-2 sm:px-4 flex items-start justify-center bg-black/85 backdrop-blur-md overflow-y-auto select-none">
          <div className="bg-[#101628] border border-white/20 rounded-3xl w-full max-w-[98vw] xl:max-w-7xl overflow-hidden shadow-2xl relative flex flex-col my-auto max-h-[calc(100vh-100px)]">
            
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-[#0a0e17] sticky top-0 z-30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00d9ff] to-[#6d4aff] text-white flex items-center justify-center shadow">
                  <Receipt className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>Store POS Billing Desk</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/30 text-[9px] font-mono font-bold">
                      {invoiceNo}
                    </span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-[#ffa500]/15 text-[#ffa500] border border-[#ffa500]/30 font-mono text-xs font-bold flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" /> Walk-in POS Sale
                </span>

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
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-[#0a0e17] border border-white/10 items-center">
                
                <div className="sm:col-span-2 flex items-center justify-between p-2 rounded-xl bg-[#101628] border border-white/15">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#00d9ff]/20 text-[#00d9ff] flex items-center justify-center font-bold font-mono text-xs">
                      {selectedCustomer.id.slice(-2)}
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs block">{selectedCustomer.name}</span>
                      <span className="text-[10px] font-mono text-[#8b9bb4]">{selectedCustomer.phone} {selectedCustomer.city ? `• ${selectedCustomer.city}` : ''}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCustomerLedgerOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#6d4aff]/20 hover:bg-[#6d4aff]/30 border border-[#6d4aff]/40 text-[#00d9ff] text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                    title="View Customer Transaction Ledger"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Ledger</span>
                  </button>
                </div>

                <div>
                  <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                    Billing Date (Automatic)
                  </label>
                  <input
                    type="date"
                    disabled
                    value={invoiceDate}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#101628] border border-white/15 text-[#00ff9d] font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                    Invoice Series
                  </label>
                  <input
                    type="text"
                    disabled
                    value={invoiceNo}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#101628] border border-white/15 text-white font-mono font-extrabold text-xs"
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                
                {/* Left Products Deck */}
                <div className="lg:col-span-6 space-y-2.5 p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> Select Product (Opens Variant Popup)
                    </span>
                    <span className="text-[10px] text-[#8b9bb4] font-mono">{productsList.length} Models</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto custom-scrollbar p-1">
                    {productsList.map((p) => {
                      const price = p.offline_price || p.selling_price || p.price || 0;

                      return (
                        <div
                          key={p.id}
                          onClick={() => handleOpenVariantPicker(p)}
                          className="p-3 rounded-2xl bg-[#101628] border border-white/10 hover:border-[#00d9ff] cursor-pointer transition-all hover:scale-[1.02] shadow-md flex flex-col justify-between group"
                        >
                          <div>
                            <span className="font-mono font-extrabold text-[#00ff9d] text-xs block group-hover:underline">
                              [{p.id}]
                            </span>
                            <span className="font-bold text-white text-xs block truncate mt-0.5">
                              {p.name}
                            </span>
                            <span className="text-[9.5px] font-mono text-[#8b9bb4] block">
                              {p.sub_category || 'Fashion'}
                            </span>
                          </div>

                          <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="font-mono font-bold text-[#00d9ff] text-xs">
                              ₹{price}
                            </span>
                            <span className="text-[9px] font-bold text-white bg-white/10 px-1.5 py-0.5 rounded-md">
                              Choose
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Live Cart */}
                <div className="lg:col-span-6 space-y-2.5">
                  <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17] shadow-xl flex flex-col">
                    
                    <div className="px-4 py-2.5 bg-[#101628] border-b border-white/10 flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-[#00ff9d] uppercase flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5" /> Cart Items ({cartItems.length})
                      </span>
                      <span className="text-white font-bold">{totalCartUnits} Units</span>
                    </div>

                    <div className="max-h-48 min-h-[120px] overflow-y-auto custom-scrollbar p-1">
                      {cartItems.length === 0 ? (
                        <div className="p-8 text-center text-[#8b9bb4] italic text-xs">
                          Cart khaleega undi. Left side product click chesi variants add cheyandi.
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
                                  <span className="font-bold text-white block truncate max-w-[160px]">
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

                    <div className="p-3 bg-[#101628] border-t border-white/10 space-y-2.5">
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase block">
                          Select Payment Mode:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentMode('cash')}
                            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 font-mono text-xs font-bold transition-all cursor-pointer border ${
                              paymentMode === 'cash'
                                ? 'bg-[#00ff9d] text-neutral-950 border-[#00ff9d] shadow-md'
                                : 'bg-[#0a0e17] text-[#8b9bb4] border-white/10 hover:text-white'
                            }`}
                          >
                            <Banknote className="w-4 h-4" />
                            <span>CASH</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentMode('upi')}
                            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 font-mono text-xs font-bold transition-all cursor-pointer border ${
                              paymentMode === 'upi'
                                ? 'bg-[#00d9ff] text-neutral-950 border-[#00d9ff] shadow-md'
                                : 'bg-[#0a0e17] text-[#8b9bb4] border-white/10 hover:text-white'
                            }`}
                          >
                            <QrCode className="w-4 h-4" />
                            <span>UPI PAYMENT</span>
                          </button>
                        </div>

                        {paymentMode === 'upi' && (
                          <div className="pt-1">
                            <input
                              type="text"
                              placeholder="Enter UPI / UTR Reference No (Leave blank if pending)..."
                              value={utrNumber}
                              onChange={(e) => setUtrNumber(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl bg-[#0a0e17] border border-white/15 text-[#00d9ff] font-mono text-xs outline-none focus:border-[#00d9ff]"
                            />
                            {!utrNumber.trim() && (
                              <span className="text-[9.5px] text-[#ff6b6b] block mt-0.5">
                                * UTR number enter cheyakapothe invoice &quot;UTR Pending&quot; status tho save avthundi.
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 font-mono text-xs pt-1 border-t border-white/5">
                        <div className="flex justify-between text-[#8b9bb4]">
                          <span>Subtotal:</span>
                          <span>₹{subTotalAmount.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="flex justify-between items-center text-[#8b9bb4]">
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
                          <span>Generate & Complete Bill</span>
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

      {/* 5. VARIANT SELECTION MODAL */}
      {isVariantModalOpen && selectedProductForModal && (
        <div className="fixed inset-0 z-[100010] p-4 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in select-none">
          <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#00ff9d]">[{selectedProductForModal.id}]</span>
                <h3 className="text-sm font-bold text-white">{selectedProductForModal.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVariantModalOpen(false)}
                className="text-[#8b9bb4] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10.5px] font-mono font-bold text-[#8b9bb4] uppercase block">
                1. Select Colour Shade (In-Stock Only):
              </span>
              {modalAvailableColors.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#0a0e17] text-[#ff6b6b] text-xs font-bold">
                  Ee product ku inventory lo stock ledu!
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {modalAvailableColors.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => {
                        setModalColor(c.color);
                        setModalSize('');
                      }}
                      className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer border ${
                        modalColor === c.color
                          ? 'border-2 border-[#FFB6C1] shadow-[0_0_15px_rgba(255,182,193,0.85)] scale-105 bg-[#0a0e17] text-white'
                          : 'border-white/10 bg-[#0a0e17] text-[#8b9bb4] hover:text-white'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.color}</span>
                      <span className="text-[9px] font-mono opacity-70">({c.stock})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {modalColor && (
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-mono font-bold text-[#8b9bb4] uppercase block">
                  2. Select Size:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {modalAvailableSizes.map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      disabled={s.stock <= 0}
                      onClick={() => setModalSize(s.size)}
                      className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer border ${
                        modalSize === s.size
                          ? 'bg-[#00ff9d] text-neutral-950 border-[#00ff9d] shadow-md scale-105'
                          : s.stock <= 0
                          ? 'bg-white/5 text-white/30 border-white/5 cursor-not-allowed'
                          : 'bg-[#0a0e17] text-white border-white/15 hover:border-[#00d9ff]'
                      }`}
                    >
                      <span>{s.size}</span>
                      <span className="text-[9px] ml-1 opacity-70">[{s.stock}]</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {modalColor && modalSize && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[#0a0e17] border border-white/10">
                <div>
                  <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    value={modalRate}
                    onChange={(e) => setModalRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#101628] border border-white/15 text-white font-mono font-bold text-xs outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase">Quantity</label>
                    <span className="text-[9px] font-mono text-[#00ff9d]">Available: {modalCurrentStock}</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={modalCurrentStock}
                    value={modalQty}
                    onChange={(e) => setModalQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#101628] border border-white/15 text-[#00ff9d] font-mono font-bold text-xs outline-none text-center"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsVariantModalOpen(false)}
                className="px-4 py-2 rounded-xl text-[#8b9bb4] hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!modalColor || !modalSize}
                onClick={handleConfirmVariantToCart}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#00ff9d] text-neutral-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Add to Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. COLORFUL INVOICE MODAL WITH WHATSAPP SHARE BUTTON */}
      {(completedInvoice || viewingOrder) && (
        <div className="fixed inset-0 z-[100020] p-4 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in select-none overflow-y-auto">
          <div className="bg-[#101628] border-2 border-[#00d9ff]/30 rounded-3xl max-w-lg w-full p-5 shadow-[0_0_40px_rgba(0,217,255,0.2)] space-y-4 my-auto">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] p-[1px] shadow-lg">
                  <div className="w-full h-full bg-[#0a0e17] rounded-2xl flex items-center justify-center font-serif font-black text-xs text-white">
                    KF
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-wider">KASHVI CREATIONS</h3>
                  <span className="text-[9px] font-mono text-[#00ff9d] uppercase">Authorized Tax Invoice</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCompletedInvoice(null);
                  setViewingOrder(null);
                }}
                className="text-[#8b9bb4] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const activeBill = completedInvoice || viewingOrder!;
              const activeLineItems = completedInvoice ? completedItems : viewingOrderItems;

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#0a0e17] border border-white/10 font-mono text-[11px]">
                    <div>
                      <span className="text-[#8b9bb4] text-[9.5px] uppercase block">Invoice No:</span>
                      <strong className="text-[#00ff9d] text-xs">{activeBill.id}</strong>
                    </div>
                    <div>
                      <span className="text-[#8b9bb4] text-[9.5px] uppercase block">Date:</span>
                      <strong className="text-white">{new Date(activeBill.created_at).toLocaleDateString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-[#8b9bb4] text-[9.5px] uppercase block">Customer:</span>
                      <strong className="text-white">{activeBill.customer_name} {activeBill.customer_id ? `[${activeBill.customer_id}]` : ''}</strong>
                    </div>
                    <div>
                      <span className="text-[#8b9bb4] text-[9.5px] uppercase block">Payment / Status:</span>
                      <strong className={activeBill.payment_status === 'utr_pending' ? 'text-[#ff6b6b]' : 'text-[#00ff9d]'}>
                        {activeBill.payment_mode.toUpperCase()} ({activeBill.payment_status === 'utr_pending' ? 'UTR PENDING' : 'PAID'})
                      </strong>
                    </div>
                  </div>

                  <div className="max-h-52 overflow-y-auto custom-scrollbar border border-white/10 rounded-2xl bg-[#0a0e17]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#101628] text-[#8b9bb4] font-mono text-[9px] uppercase border-b border-white/10 sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">Item & Variant</th>
                          <th className="py-2 px-2 text-center">Qty</th>
                          <th className="py-2 px-2 text-right">Price</th>
                          <th className="py-2 px-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {activeLineItems.map((it: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-2 px-2.5">
                              <span className="font-bold text-white block">{it.product_name || it.product_id}</span>
                              <span className="text-[10px] text-[#00d9ff] font-mono">
                                {it.color || it.variant_color} • {it.size || it.variant_size}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-[#00ff9d]">{it.quantity}</td>
                            <td className="py-2 px-2 text-right font-mono text-[#8b9bb4]">₹{it.unit_price || it.price}</td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-white">₹{(it.total_price || it.total).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 rounded-2xl bg-gradient-to-r from-[#6d4aff]/20 to-[#00d9ff]/20 border border-white/15 flex items-center justify-between font-mono">
                    <div>
                      <span className="text-[10px] text-[#8b9bb4] block">NET PAYABLE AMOUNT</span>
                      <span className="text-xl font-extrabold text-[#00ff9d]">
                        ₹{Number(activeBill.final_amount || activeBill.total_amount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="text-right text-[10px] text-[#8b9bb4]">
                      <span>Discount: ₹{activeBill.discount_amount || 0}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(activeBill, activeLineItems)}
                      className="py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-neutral-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-lg shadow-[#25D366]/30"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share on WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Receipt</span>
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

    </div>
  );
}