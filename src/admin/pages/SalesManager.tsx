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
  phone?: string | null;
  mobile?: string | null;
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

  // 1. Customer Modals
  const [isCustomerPromptOpen, setIsCustomerPromptOpen] = useState<boolean>(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState<boolean>(false);
  const [isExistingCustomerPickerOpen, setIsExistingCustomerPickerOpen] = useState<boolean>(false);
  const [isCustomerLedgerOpen, setIsCustomerLedgerOpen] = useState<boolean>(false);

  // New Customer Form State
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

  // Auto Generate CUST0001 ID
  const generateCustomerId = async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('id')
        .like('id', 'CUST%')
        .order('id', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const match = String(data[0].id).match(/\d+$/);
        const nextNum = match ? parseInt(match[0], 10) + 1 : 1;
        setNewCustId(`CUST${String(nextNum).padStart(4, '0')}`);
      } else {
        setNewCustId('CUST0001');
      }
    } catch {
      setNewCustId('CUST0001');
    }
  };

  // Auto Generate KFINV0001 Series
  const generateBillNumber = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('id')
        .like('id', 'KFINV%')
        .order('id', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const match = String(data[0].id).match(/\d+$/);
        const nextNum = match ? parseInt(match[0], 10) + 1 : 1;
        setInvoiceNo(`KFINV${String(nextNum).padStart(4, '0')}`);
      } else {
        setInvoiceNo('KFINV0001');
      }
    } catch {
      setInvoiceNo(`KFINV${Math.floor(1000 + Math.random() * 9000)}`);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderRes, prodRes, invRes, clrRes, custRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*'),
        supabase.from('inventory').select('*'),
        supabase.from('colours').select('name, hex_code'),
        supabase.from('customers').select('*').order('created_at', { ascending: false })
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

  const handleStartNewBill = () => {
    setIsCustomerPromptOpen(true);
  };

  const handleChooseNewCustomer = () => {
    setIsCustomerPromptOpen(false);
    generateCustomerId();
    setNewCustName('');
    setNewCustPhone('');
    setNewCustCity('');
    setIsNewCustomerModalOpen(true);
  };

  const handleChooseExistingCustomer = () => {
    setIsCustomerPromptOpen(false);
    setCustSearchTerm('');
    setIsExistingCustomerPickerOpen(true);
  };

  // Safe Customer Registration (Handles both phone and mobile column schemas)
  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCustName.trim().toUpperCase();
    const cleanPhone = newCustPhone.trim();
    const cleanCity = newCustCity.trim().toUpperCase();

    if (!cleanName || !cleanPhone) {
      alert('CUSTOMER NAME MARIYU MOBILE NUMBER TAPPANISARI.');
      return;
    }

    setRegisteringCust(true);
    try {
      // Primary payload
      let insertPayload: any = {
        id: newCustId.trim().toUpperCase(),
        name: cleanName
      };

      // Try inserting with phone and mobile fallbacks
      let errorOccurred: any = null;

      // Attempt 1: Try with phone column
      const res1 = await supabase.from('customers').insert([{
        ...insertPayload,
        phone: cleanPhone,
        city: cleanCity || null
      }]).select();

      if (res1.error) {
        // Attempt 2: If phone column is missing, try mobile column
        const res2 = await supabase.from('customers').insert([{
          ...insertPayload,
          mobile: cleanPhone,
          city: cleanCity || null
        }]).select();

        if (res2.error) {
          // Attempt 3: Try minimal insert (id and name only if other columns are strict)
          const res3 = await supabase.from('customers').insert([{
            ...insertPayload
          }]).select();

          if (res3.error) {
            errorOccurred = res3.error;
          }
        }
      }

      if (errorOccurred) throw errorOccurred;

      const createdCust: CustomerRecord = {
        id: newCustId.trim().toUpperCase(),
        name: cleanName,
        phone: cleanPhone,
        mobile: cleanPhone,
        city: cleanCity || null
      };

      setCustomersList((prev) => [createdCust, ...prev]);
      setSelectedCustomer(createdCust);
      setIsNewCustomerModalOpen(false);

      openSalesBillingDesk(createdCust);
    } catch (err: any) {
      alert('Error registering customer: ' + (err.message || 'Check database columns'));
    } finally {
      setRegisteringCust(false);
    }
  };

  const handleSelectExistingCustomer = (cust: CustomerRecord) => {
    setSelectedCustomer(cust);
    setIsExistingCustomerPickerOpen(false);
    openSalesBillingDesk(cust);
  };

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
      const clr = (r.variant_color || 'STANDARD').toUpperCase();
      const prev = map.get(clr) || { stock: 0 };
      const matched = coloursList.find((c) => c.name.toUpperCase().trim() === clr.trim())?.hex_code;
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
      .filter((r) => (r.variant_color || 'STANDARD').toUpperCase() === modalColor.toUpperCase())
      .map((r) => ({
        size: (r.variant_size || 'FREE SIZE').toUpperCase(),
        stock: r.stock_quantity || 0
      }));
  }, [modalProductInventory, modalColor]);

  const modalCurrentStock = useMemo(() => {
    if (!modalColor || !modalSize) return 0;
    const match = modalProductInventory.find(
      (r) =>
        (r.variant_color || 'STANDARD').toUpperCase() === modalColor.toUpperCase() &&
        (r.variant_size || 'FREE SIZE').toUpperCase() === modalSize.toUpperCase()
    );
    return match ? match.stock_quantity : 0;
  }, [modalProductInventory, modalColor, modalSize]);

  const handleConfirmVariantToCart = () => {
    if (!selectedProductForModal) return;
    if (!modalColor) {
      alert('COLOR SHADE SELECT CHEYANDI.');
      return;
    }
    if (!modalSize) {
      alert('SIZE SELECT CHEYANDI.');
      return;
    }
    if (modalQty <= 0) {
      alert('QUANTITY KANISAM 1 UNDALI.');
      return;
    }
    if (modalQty > modalCurrentStock) {
      alert(`STOCK SARIPODU! UNDEDI KEVALAM ${modalCurrentStock} MATRAME.`);
      return;
    }

    const matchedHex = coloursList.find((c) => c.name.toUpperCase().trim() === modalColor.toUpperCase().trim())?.hex_code;
    const cartId = `${selectedProductForModal.id}_${modalColor}_${modalSize}`.toUpperCase();

    const existingIndex = cartItems.findIndex((c) => c.cart_id === cartId);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      const newQty = updated[existingIndex].quantity + modalQty;
      if (newQty > modalCurrentStock) {
        alert(`MOTTAM STOCK (${modalCurrentStock}) MINCHI BILL CHEYALERU.`);
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
          product_id: selectedProductForModal.id.toUpperCase(),
          product_name: selectedProductForModal.name.toUpperCase(),
          color: modalColor.toUpperCase(),
          size: modalSize.toUpperCase(),
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

  const handleCompleteSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('CUSTOMER SELECT CHEYALI.');
      return;
    }
    if (cartItems.length === 0) {
      alert('CART LO KANISAM OKA ITEM AINA UNDALI.');
      return;
    }

    const cleanUtr = utrNumber.trim().toUpperCase();
    const isUtrPending = paymentMode === 'upi' && !cleanUtr;

    setSubmitting(true);
    try {
      const custPhoneVal = selectedCustomer.phone || selectedCustomer.mobile || undefined;
      const orderPayload: OrderRecord = {
        id: invoiceNo.trim().toUpperCase(),
        customer_id: selectedCustomer.id.toUpperCase(),
        customer_name: selectedCustomer.name.toUpperCase(),
        customer_phone: custPhoneVal,
        order_type: 'offline',
        total_amount: subTotalAmount,
        discount_amount: Number(discountAmount) || 0,
        final_amount: finalPayableAmount,
        payment_mode: paymentMode,
        utr_number: paymentMode === 'upi' && cleanUtr ? cleanUtr : null,
        payment_status: isUtrPending ? 'utr_pending' : 'paid',
        created_at: new Date().toISOString()
      };

      // 1. Insert Order
      const { error: orderErr } = await supabase.from('orders').insert([orderPayload]);
      if (orderErr) throw orderErr;

      // 2. Insert Line Items
      const orderItemsPayload = cartItems.map((item, idx) => ({
        id: `oi_${invoiceNo}_${Date.now()}_${idx}`.toUpperCase(),
        order_id: invoiceNo.trim().toUpperCase(),
        product_id: item.product_id.toUpperCase(),
        variant_color: item.color.toUpperCase(),
        variant_size: item.size.toUpperCase(),
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

  const handleShareWhatsApp = (inv: OrderRecord, items: any[]) => {
    const phone = (inv.customer_phone || '').replace(/\D/g, '');
    if (!phone) {
      alert('CUSTOMER MOBILE NUMBER LEDU.');
      return;
    }

    const itemsSummary = items
      .map((it, idx) => `${idx + 1}. ${(it.product_name || it.product_id).toUpperCase()} (${(it.color || it.variant_color).toUpperCase()} / ${(it.size || it.variant_size).toUpperCase()}) x ${it.quantity} = ₹${it.total_price || it.total}`)
      .join('%0A');

    const message = `✨ *KASHVI CREATIONS - TAX INVOICE* ✨%0A%0A` +
      `*BILL NO:* ${inv.id.toUpperCase()}%0A` +
      `*DATE:* ${new Date(inv.created_at).toLocaleDateString('en-IN')}%0A` +
      `*CUSTOMER:* ${inv.customer_name.toUpperCase()}%0A` +
      `*PAYMENT MODE:* ${inv.payment_mode.toUpperCase()} ${inv.payment_status === 'utr_pending' ? '(UTR PENDING)' : '(PAID)'}%0A%0A` +
      `*ITEMS PURCHASED:*%0A${itemsSummary}%0A%0A` +
      `*SUBTOTAL:* ₹${inv.total_amount}%0A` +
      `*DISCOUNT:* ₹${inv.discount_amount}%0A` +
      `*TOTAL AMOUNT:* ₹${inv.final_amount}%0A%0A` +
      `THANK YOU FOR SHOPPING WITH US! VISIT AGAIN. 🙏%0A` +
      `_KASHVI COMMAND DECK_`;

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

  const customerPastOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    const custPhone = selectedCustomer.phone || selectedCustomer.mobile;
    return orders.filter((o) => o.customer_id === selectedCustomer.id || (custPhone && o.customer_phone === custPhone));
  }, [orders, selectedCustomer]);

  const filteredExistingCustomers = useMemo(() => {
    if (!custSearchTerm.trim()) return customersList;
    const q = custSearchTerm.toUpperCase().trim();
    return customersList.filter((c) => {
      const cPhone = c.phone || c.mobile || '';
      return (
        c.name.toUpperCase().includes(q) ||
        cPhone.includes(q) ||
        (c.city && c.city.toUpperCase().includes(q))
      );
    });
  }, [customersList, custSearchTerm]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toUpperCase().trim();
    return orders.filter(
      (o) =>
        o.id.toUpperCase().includes(q) ||
        o.customer_name.toUpperCase().includes(q) ||
        (o.customer_phone && o.customer_phone.includes(q))
    );
  }, [orders, searchQuery]);

  return (
    <div className="space-y-3 font-sans text-xs select-none uppercase">
      
      {/* 1. Header Bar */}
      <div className="px-3.5 py-2.5 rounded-2xl bg-[#101628]/95 border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00d9ff] to-[#6d4aff] text-white flex items-center justify-center shadow-md shadow-[#00d9ff]/20">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>SALES & POS INVOICING DESK</span>
              <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 text-[10px] font-mono">
                {orders.length} INVOICES
              </span>
            </h2>
            <span className="text-[10px] text-[#8b9bb4]">
              SERIES: KFINV0001 • CAPITAL INPUTS • SAFE REGISTRATION • WHATSAPP INVOICES
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-56 sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              placeholder="SEARCH BILL NO, CUSTOMER, MOBILE..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0a0e17] rounded-xl text-white text-xs outline-none border border-white/10 focus:border-[#00d9ff] uppercase"
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
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#6d4aff] hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#00d9ff]/30 cursor-pointer active:scale-95 uppercase"
          >
            <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
            <span>NEW BILL</span>
          </button>
        </div>
      </div>

      {/* 2. Invoices History Table */}
      <div className="rounded-2xl bg-[#101628]/95 border border-white/10 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#0a0e17]/80 text-[#8b9bb4] font-mono text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">INVOICE NO</th>
                <th className="py-2.5 px-3">DATE</th>
                <th className="py-2.5 px-3">CUSTOMER (ID)</th>
                <th className="py-2.5 px-3">CHANNEL</th>
                <th className="py-2.5 px-3">PAYMENT & UTR STATUS</th>
                <th className="py-2.5 px-3 text-right">NET AMOUNT</th>
                <th className="py-2.5 px-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#8b9bb4]">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-[#00d9ff] mb-1.5" />
                    LOADING INVOICES...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#8b9bb4] italic text-xs">
                    NO SALES INVOICES RECORDED YET. CLICK &quot;NEW BILL&quot; TO BEGIN.
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
                        <Store className="w-3 h-3" /> WALK-IN
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="uppercase font-mono font-bold text-[#8b9bb4] text-[10px]">
                          {ord.payment_mode}
                        </span>
                        {ord.payment_status === 'utr_pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ff6b6b]/20 text-[#ff6b6b] border border-[#ff6b6b]/40 text-[9px] font-mono font-bold">
                            <Clock className="w-2.5 h-2.5" /> UTR PENDING
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00ff9d]/15 text-[#00ff9d] border border-[#00ff9d]/30 text-[9px] font-mono font-bold">
                            <Check className="w-2.5 h-2.5" /> PAID
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

      {/* DIALOG 1: CUSTOMER CHOICE */}
      {isCustomerPromptOpen && (
        <div className="fixed inset-0 z-[100010] p-4 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in select-none">
          <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00d9ff] to-[#6d4aff] text-white flex items-center justify-center mx-auto shadow-lg">
              <User className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase">SELECT CUSTOMER TYPE</h3>
              <p className="text-xs text-[#8b9bb4] mt-1">NEW REGISTER OR EXISTING CUSTOMER</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleChooseNewCustomer}
                className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/15 hover:border-[#00d9ff] text-white font-bold text-xs flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 group hover:bg-white/5 uppercase"
              >
                <div className="w-8 h-8 rounded-xl bg-[#00d9ff]/20 text-[#00d9ff] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserPlus className="w-4 h-4" />
                </div>
                <span>NEW REGISTER</span>
              </button>

              <button
                type="button"
                onClick={handleChooseExistingCustomer}
                className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/15 hover:border-[#6d4aff] text-white font-bold text-xs flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 group hover:bg-white/5 uppercase"
              >
                <div className="w-8 h-8 rounded-xl bg-[#6d4aff]/20 text-[#6d4aff] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <span>EXISTING</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsCustomerPromptOpen(false)}
                className="w-full py-2 rounded-xl text-[#8b9bb4] hover:text-white text-xs font-semibold cursor-pointer uppercase"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 2A: NEW CUSTOMER REGISTRATION (ALL UPPERCASE & SAFE COLUMNS) */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-[100010] p-4 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in select-none">
          <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#00d9ff]" />
                <h3 className="text-sm font-bold text-white uppercase">CUSTOMER REGISTRATION</h3>
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
                  CUSTOMER ID (AUTO-GENERATED)
                </label>
                <input
                  type="text"
                  disabled
                  value={newCustId}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0a0e17] border border-white/15 text-[#00ff9d] font-mono font-bold text-xs uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                  CUSTOMER NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ENTER FULL NAME..."
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0a0e17] border border-white/15 text-white font-semibold text-xs outline-none focus:border-[#00d9ff] uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                  MOBILE NUMBER (FOR WHATSAPP INVOICE) *
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  placeholder="10 DIGIT MOBILE..."
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0a0e17] border border-white/15 text-white font-mono text-xs outline-none focus:border-[#00d9ff]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                  CITY / LOCATION
                </label>
                <input
                  type="text"
                  placeholder="E.G. HYDERABAD, KAKINADA..."
                  value={newCustCity}
                  onChange={(e) => setNewCustCity(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0a0e17] border border-white/15 text-white text-xs outline-none focus:border-[#00d9ff] uppercase"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#8b9bb4] hover:text-white text-xs font-semibold cursor-pointer uppercase"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={registeringCust}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#6d4aff] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 uppercase"
                >
                  {registeringCust ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>SAVE & OPEN BILL</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 2B: EXISTING CUSTOMER PICKER */}
      {isExistingCustomerPickerOpen && (
        <div className="fixed inset-0 z-[100010] p-4 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in select-none">
          <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00d9ff]" />
                <h3 className="text-sm font-bold text-white uppercase">SELECT REGISTERED CUSTOMER</h3>
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
                placeholder="SEARCH CUSTOMER NAME, MOBILE OR CITY..."
                value={custSearchTerm}
                onChange={(e) => setCustSearchTerm(e.target.value.toUpperCase())}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#0a0e17] border border-white/15 text-white text-xs outline-none focus:border-[#00d9ff] uppercase"
              />
              <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
              {filteredExistingCustomers.length === 0 ? (
                <div className="p-6 text-center text-[#8b9bb4] italic text-xs uppercase">
                  NO MATCHING REGISTERED CUSTOMERS FOUND.
                </div>
              ) : (
                filteredExistingCustomers.map((c) => {
                  const phoneNum = c.phone || c.mobile || '—';
                  return (
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
                          PHONE: {phoneNum} {c.city ? `• ${c.city}` : ''}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#8b9bb4]" />
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsExistingCustomerPickerOpen(false)}
                className="px-4 py-2 rounded-xl text-[#8b9bb4] hover:text-white text-xs font-semibold cursor-pointer uppercase"
              >
                CLOSE
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
                  <h4 className="text-sm font-bold text-white uppercase">CUSTOMER LEDGER: {selectedCustomer.name}</h4>
                  <span className="text-[10px] font-mono text-[#8b9bb4]">ID: {selectedCustomer.id} • MOBILE: {selectedCustomer.phone || selectedCustomer.mobile}</span>
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
                <div className="p-8 text-center text-[#8b9bb4] italic text-xs uppercase">
                  EE CUSTOMER KU SAMBANDHINCHINA PREVIOUS BILLS LEVU.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0a0e17] text-[#8b9bb4] font-mono text-[9px] uppercase sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5">BILL NO</th>
                      <th className="py-2 px-2.5">DATE</th>
                      <th className="py-2 px-2.5">MODE</th>
                      <th className="py-2 px-2.5 text-right">AMOUNT (₹)</th>
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
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer uppercase"
              >
                CLOSE LEDGER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN SALES BILLING FORM */}
      {isBillingModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-[100005] pt-[76px] pb-6 px-2 sm:px-4 flex items-start justify-center bg-black/85 backdrop-blur-md overflow-y-auto select-none">
          <div className="bg-[#101628] border border-white/20 rounded-3xl w-full max-w-[98vw] xl:max-w-7xl overflow-hidden shadow-2xl relative flex flex-col my-auto max-h-[calc(100vh-100px)]">
            
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-[#0a0e17] sticky top-0 z-30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00d9ff] to-[#6d4aff] text-white flex items-center justify-center shadow">
                  <Receipt className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase">
                    <span>STORE POS BILLING DESK</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/30 text-[9px] font-mono font-bold">
                      {invoiceNo}
                    </span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-[#ffa500]/15 text-[#ffa500] border border-[#ffa500]/30 font-mono text-xs font-bold flex items-center gap-1.5 uppercase">
                  <Store className="w-3.5 h-3.5" /> WALK-IN POS SALE
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
                      <span className="font-bold text-white text-xs block uppercase">{selectedCustomer.name}</span>
                      <span className="text-[10px] font-mono text-[#8b9bb4]">{selectedCustomer.phone || selectedCustomer.mobile} {selectedCustomer.city ? `• ${selectedCustomer.city}` : ''}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCustomerLedgerOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#6d4aff]/20 hover:bg-[#6d4aff]/30 border border-[#6d4aff]/40 text-[#00d9ff] text-[10.5px] font-bold flex items-center gap-1 cursor-pointer uppercase"
                    title="View Customer Transaction Ledger"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>LEDGER</span>
                  </button>
                </div>

                <div>
                  <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                    BILLING DATE (AUTO)
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
                    INVOICE SERIES
                  </label>
                  <input
                    type="text"
                    disabled
                    value={invoiceNo}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#101628] border border-white/15 text-white font-mono font-extrabold text-xs uppercase"
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                
                {/* Left Products Deck */}
                <div className="lg:col-span-6 space-y-2.5 p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> SELECT PRODUCT (OPENS VARIANT POPUP)
                    </span>
                    <span className="text-[10px] text-[#8b9bb4] font-mono">{productsList.length} MODELS</span>
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
                            <span className="font-mono font-extrabold text-[#00ff9d] text-xs block group-hover:underline uppercase">
                              [{p.id}]
                            </span>
                            <span className="font-bold text-white text-xs block truncate mt-0.5 uppercase">
                              {p.name}
                            </span>
                            <span className="text-[9.5px] font-mono text-[#8b9bb4] block uppercase">
                              {p.sub_category || 'FASHION'}
                            </span>
                          </div>

                          <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="font-mono font-bold text-[#00d9ff] text-xs">
                              ₹{price}
                            </span>
                            <span className="text-[9px] font-bold text-white bg-white/10 px-1.5 py-0.5 rounded-md uppercase">
                              CHOOSE
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Cart */}
                <div className="lg:col-span-6 space-y-2.5">
                  <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17] shadow-xl flex flex-col">
                    
                    <div className="px-4 py-2.5 bg-[#101628] border-b border-white/10 flex items-center justify-between text-xs font-mono uppercase">
                      <span className="font-bold text-[#00ff9d] flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5" /> CART ITEMS ({cartItems.length})
                      </span>
                      <span className="text-white font-bold">{totalCartUnits} UNITS</span>
                    </div>

                    <div className="max-h-48 min-h-[120px] overflow-y-auto custom-scrollbar p-1">
                      {cartItems.length === 0 ? (
                        <div className="p-8 text-center text-[#8b9bb4] italic text-xs uppercase">
                          CART KHALEEGA UNDI. LEFT SIDE PRODUCT CLICK CHESI VARIANTS ADD CHEYANDI.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#101628]/80 text-[#8b9bb4] font-mono uppercase text-[8.5px] sticky top-0">
                            <tr>
                              <th className="py-1.5 px-2">ITEM DETAILS</th>
                              <th className="py-1.5 px-2 text-center">QTY</th>
                              <th className="py-1.5 px-2 text-right">RATE</th>
                              <th className="py-1.5 px-2 text-right">TOTAL</th>
                              <th className="py-1.5 px-1.5 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {cartItems.map((c) => (
                              <tr key={c.cart_id} className="hover:bg-white/[0.02]">
                                <td className="py-1.5 px-2">
                                  <span className="font-bold text-white block truncate max-w-[160px] uppercase">
                                    {c.product_name}
                                  </span>
                                  <span className="text-[10px] text-[#00d9ff] font-mono uppercase">
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
                          SELECT PAYMENT MODE:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentMode('cash')}
                            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 font-mono text-xs font-bold transition-all cursor-pointer border uppercase ${
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
                            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 font-mono text-xs font-bold transition-all cursor-pointer border uppercase ${
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
                              placeholder="ENTER UPI / UTR REFERENCE NO (LEAVE BLANK IF PENDING)..."
                              value={utrNumber}
                              onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                              className="w-full px-3 py-1.5 rounded-xl bg-[#0a0e17] border border-white/15 text-[#00d9ff] font-mono text-xs outline-none focus:border-[#00d9ff] uppercase"
                            />
                            {!utrNumber.trim() && (
                              <span className="text-[9.5px] text-[#ff6b6b] block mt-0.5 uppercase">
                                * UTR NUMBER ENTER CHEYAKAPOTHE INVOICE &quot;UTR PENDING&quot; STATUS THO SAVE AVTHUNDI.
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 font-mono text-xs pt-1 border-t border-white/5 uppercase">
                        <div className="flex justify-between text-[#8b9bb4]">
                          <span>SUBTOTAL:</span>
                          <span>₹{subTotalAmount.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="flex justify-between items-center text-[#8b9bb4]">
                          <span>DISCOUNT (₹):</span>
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
                          className="px-4 py-2 rounded-xl text-[#8b9bb4] hover:text-white text-xs font-semibold cursor-pointer uppercase"
                        >
                          CANCEL
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || cartItems.length === 0}
                          className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#00ff9d] text-neutral-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer active:scale-95 disabled:opacity-50 uppercase"
                        >
                          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>GENERATE & COMPLETE BILL</span>
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
                <span className="font-mono text-xs font-bold text-[#00ff9d] uppercase">[{selectedProductForModal.id}]</span>
                <h3 className="text-sm font-bold text-white uppercase">{selectedProductForModal.name}</h3>
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
                1. SELECT COLOUR SHADE (IN-STOCK ONLY):
              </span>
              {modalAvailableColors.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#0a0e17] text-[#ff6b6b] text-xs font-bold uppercase">
                  EE PRODUCT KU INVENTORY LO STOCK LEDU!
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
                      className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer border uppercase ${
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
                  2. SELECT SIZE:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {modalAvailableSizes.map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      disabled={s.stock <= 0}
                      onClick={() => setModalSize(s.size)}
                      className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer border uppercase ${
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
                    SELLING PRICE (₹)
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
                    <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase">QUANTITY</label>
                    <span className="text-[9px] font-mono text-[#00ff9d]">AVAILABLE: {modalCurrentStock}</span>
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
                className="px-4 py-2 rounded-xl text-[#8b9bb4] hover:text-white text-xs font-semibold cursor-pointer uppercase"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={!modalColor || !modalSize}
                onClick={handleConfirmVariantToCart}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#00ff9d] text-neutral-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 uppercase"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ADD TO BILL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. COLORFUL INVOICE MODAL */}
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
                  <h3 className="text-sm font-extrabold text-white tracking-wider uppercase">KASHVI CREATIONS</h3>
                  <span className="text-[9px] font-mono text-[#00ff9d] uppercase">AUTHORIZED TAX INVOICE</span>
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
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#0a0e17] border border-white/10 font-mono text-[11px] uppercase">
                    <div>
                      <span className="text-[#8b9bb4] text-[9.5px] uppercase block">INVOICE NO:</span>
                      <strong className="text-[#00ff9d] text-xs">{activeBill.id}</strong>
                    </div>
                    <div>
                      <span className="text-[#8b9bb4] text-[9.5px] uppercase block">DATE:</span>
                      <strong className="text-white">{new Date(activeBill.created_at).toLocaleDateString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-[#8b9bb4] text-[9.5px] uppercase block">CUSTOMER:</span>
                      <strong className="text-white">{activeBill.customer_name} {activeBill.customer_id ? `[${activeBill.customer_id}]` : ''}</strong>
                    </div>
                    <div>
                      <span className="text-[#8b9bb4] text-[9.5px] uppercase block">PAYMENT / STATUS:</span>
                      <strong className={activeBill.payment_status === 'utr_pending' ? 'text-[#ff6b6b]' : 'text-[#00ff9d]'}>
                        {activeBill.payment_mode.toUpperCase()} ({activeBill.payment_status === 'utr_pending' ? 'UTR PENDING' : 'PAID'})
                      </strong>
                    </div>
                  </div>

                  <div className="max-h-52 overflow-y-auto custom-scrollbar border border-white/10 rounded-2xl bg-[#0a0e17]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#101628] text-[#8b9bb4] font-mono text-[9px] uppercase border-b border-white/10 sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">ITEM & VARIANT</th>
                          <th className="py-2 px-2 text-center">QTY</th>
                          <th className="py-2 px-2 text-right">PRICE</th>
                          <th className="py-2 px-2.5 text-right">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 uppercase">
                        {activeLineItems.map((it: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-2 px-2.5">
                              <span className="font-bold text-white block">{(it.product_name || it.product_id).toUpperCase()}</span>
                              <span className="text-[10px] text-[#00d9ff] font-mono">
                                {(it.color || it.variant_color).toUpperCase()} • {(it.size || it.variant_size).toUpperCase()}
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

                  <div className="p-3 rounded-2xl bg-gradient-to-r from-[#6d4aff]/20 to-[#00d9ff]/20 border border-white/15 flex items-center justify-between font-mono uppercase">
                    <div>
                      <span className="text-[10px] text-[#8b9bb4] block">NET PAYABLE AMOUNT</span>
                      <span className="text-xl font-extrabold text-[#00ff9d]">
                        ₹{Number(activeBill.final_amount || activeBill.total_amount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="text-right text-[10px] text-[#8b9bb4]">
                      <span>DISCOUNT: ₹{activeBill.discount_amount || 0}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(activeBill, activeLineItems)}
                      className="py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-neutral-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-lg shadow-[#25D366]/30 uppercase"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>SHARE ON WHATSAPP</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer uppercase"
                    >
                      <Printer className="w-4 h-4" />
                      <span>PRINT RECEIPT</span>
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