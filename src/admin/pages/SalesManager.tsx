import React, { useState, useEffect, useMemo } from 'react';
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
  Layers,
  Palette,
  Banknote,
  QrCode,
  Store,
  Receipt,
  Printer,
  ArrowRight,
  User,
  UserPlus,
  Users,
  Share2,
  BookOpen,
  Clock,
  Globe,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminStaffUser } from '../types';

interface SalesManagerProps {
  currentUser?: AdminStaffUser | null;
}

interface CustomerRecord {
  id: string;
  name: string;
  phone?: string | null;
  mobile?: string | null;
  city?: string | null;
  address?: string | null;
  customer_type?: 'offline' | 'online' | string;
  created_at?: string;
}

interface ProductRecord {
  id: string;
  code?: string;
  product_code?: string;
  name: string;
  category?: string;
  sub_category?: string;
  sub_category_id?: string;
  colour?: string;
  size?: string;
  variants?: any;
  offline_price?: number;
  store_price?: number;
  online_price?: number;
  selling_price?: number;
  price?: number;
}

interface InventoryItemRecord {
  id: string;
  product_id: string;
  variant_color?: string | null;
  variant_size?: string | null;
  stock_quantity?: number | null;
}

interface ColourMasterRecord {
  id?: string;
  name: string;
  hex_code?: string;
  parent_colour?: string | null;
  parent_color?: string | null;
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
  order_type?: 'offline' | 'online' | string;
  total?: number;
  total_amount?: number;
  subtotal?: number;
  discount?: number;
  discount_amount?: number;
  final_amount?: number;
  payment_mode?: 'cash' | 'upi' | string;
  payment_ref?: string | null;
  payment_status?: 'paid' | 'utr_pending' | string;
  order_status?: string;
  items?: any;
  items_summary?: any;
  created_at: string;
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

function isOfflineCustomer(id: string | null | undefined): boolean {
  if (!id) return false;
  const cleanId = id.trim().toUpperCase();
  return /^CUST\d+$/.test(cleanId);
}

function cleanStr(val: string | null | undefined): string {
  return (val || '').toString().trim().toUpperCase();
}

function getBaseFamily(colorName: string): string {
  const c = cleanStr(colorName);
  if (c.includes('GREEN') || c.includes('OLIVE') || c.includes('MINT') || c.includes('PISTA')) return 'GREEN';
  if (c.includes('PINK') || c.includes('ROSE') || c.includes('MAGENTA') || c.includes('RANI')) return 'PINK';
  if (c.includes('BLUE') || c.includes('NAVY') || c.includes('TEAL') || c.includes('AQUA') || c.includes('SKY')) return 'BLUE';
  if (c.includes('RED') || c.includes('MAROON') || c.includes('CRIMSON') || c.includes('WINE')) return 'RED';
  if (c.includes('YELLOW') || c.includes('MUSTARD') || c.includes('GOLD') || c.includes('LEMON')) return 'YELLOW';
  if (c.includes('BLACK') || c.includes('GREY') || c.includes('GRAY') || c.includes('CHARCOAL')) return 'BLACK & GREY';
  if (c.includes('WHITE') || c.includes('OFFWHITE') || c.includes('CREAM') || c.includes('IVORY')) return 'WHITE & CREAM';
  if (c.includes('ORANGE') || c.includes('PEACH') || c.includes('RUST') || c.includes('CORAL')) return 'ORANGE';
  if (c.includes('PURPLE') || c.includes('VIOLET') || c.includes('LAVENDER') || c.includes('LILAC')) return 'PURPLE';
  if (c.includes('BROWN') || c.includes('BEIGE') || c.includes('KHAKI') || c.includes('CHESTNUT')) return 'BROWN';
  return 'OTHER';
}

function getProductStorePrice(p: ProductRecord): number {
  if (p.offline_price && Number(p.offline_price) > 0) return Number(p.offline_price);
  if (p.store_price && Number(p.store_price) > 0) return Number(p.store_price);
  if (p.selling_price && Number(p.selling_price) > 0) return Number(p.selling_price);
  if (p.price && Number(p.price) > 0) return Number(p.price);
  return 0;
}

export default function SalesManager({ currentUser }: SalesManagerProps) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [productsList, setProductsList] = useState<ProductRecord[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItemRecord[]>([]);
  const [purchaseItemsList, setPurchaseItemsList] = useState<any[]>([]);
  const [coloursList, setColoursList] = useState<ColourMasterRecord[]>([]);
  const [customersList, setCustomersList] = useState<CustomerRecord[]>([]);
  const [allSizesList, setAllSizesList] = useState<any[]>([]);
  const [subCategoriesList, setSubCategoriesList] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Customer Modals
  const [isCustomerPromptOpen, setIsCustomerPromptOpen] = useState<boolean>(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState<boolean>(false);
  const [isExistingCustomerPickerOpen, setIsExistingCustomerPickerOpen] = useState<boolean>(false);
  const [isCustomerLedgerOpen, setIsCustomerLedgerOpen] = useState<boolean>(false);

  // Customer Filter Switcher
  const [customerPickerType, setCustomerPickerType] = useState<'offline' | 'online'>('offline');

  // New Customer Form State
  const [newCustId, setNewCustId] = useState<string>('CUST0001');
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustCity, setNewCustCity] = useState<string>('');
  const [registeringCust, setRegisteringCust] = useState<boolean>(false);

  // Existing Customer Search
  const [custSearchTerm, setCustSearchTerm] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

  // Sales Form State
  const [isBillingModalOpen, setIsBillingModalOpen] = useState<boolean>(false);
  const [invoiceNo, setInvoiceNo] = useState<string>('KFINV0001');
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number | string>(0);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Product Filter Search
  const [billingProductSearch, setBillingProductSearch] = useState<string>('');

  // Variant Picker Modal State
  const [isVariantModalOpen, setIsVariantModalOpen] = useState<boolean>(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<ProductRecord | null>(null);
  const [selectedParentColor, setSelectedParentColor] = useState<string>('');
  const [modalColor, setModalColor] = useState<string>('');
  const [modalSize, setModalSize] = useState<string>('');
  const [modalRate, setModalRate] = useState<number>(0);
  const [modalQty, setModalQty] = useState<number>(1);

  // Cart
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Invoice Preview Modal
  const [completedInvoice, setCompletedInvoice] = useState<OrderRecord | null>(null);
  const [completedItems, setCompletedItems] = useState<CartItem[]>([]);
  const [viewingOrder, setViewingOrder] = useState<OrderRecord | null>(null);
  const [viewingOrderItems, setViewingOrderItems] = useState<any[]>([]);

  const generateCustomerId = async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('id')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const custMatches = data
          .map((c) => cleanStr(c.id))
          .filter((id) => /^CUST\d+$/.test(id))
          .map((id) => parseInt(id.replace('CUST', ''), 10))
          .filter((num) => !isNaN(num));

        if (custMatches.length > 0) {
          const maxNum = Math.max(...custMatches);
          setNewCustId(`CUST${String(maxNum + 1).padStart(4, '0')}`);
          return;
        }
      }
      setNewCustId('CUST0001');
    } catch {
      setNewCustId('CUST0001');
    }
  };

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
      const [orderRes, prodRes, invRes, purchRes, clrRes, custRes, sizeRes, subCatRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*'),
        supabase.from('inventory').select('*'),
        supabase.from('purchase_items').select('*'),
        supabase.from('colours').select('*'),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('sizes').select('*').order('display_order', { ascending: true }),
        supabase.from('sub_categories').select('*')
      ]);

      if (orderRes.data) setOrders(orderRes.data);
      if (prodRes.data) {
        const sorted = [...prodRes.data].sort((a, b) =>
          String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' })
        );
        setProductsList(sorted);
      }
      if (invRes.data) setInventoryList(invRes.data);
      if (purchRes.data) setPurchaseItemsList(purchRes.data);
      if (clrRes.data) setColoursList(clrRes.data);
      if (custRes.data) setCustomersList(custRes.data);
      if (sizeRes.data) setAllSizesList(sizeRes.data);
      if (subCatRes.data) setSubCategoriesList(subCatRes.data);
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
    setCustomerPickerType('offline');
    setIsExistingCustomerPickerOpen(true);
  };

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
      const insertPayload = {
        id: newCustId.trim().toUpperCase(),
        name: cleanName,
        customer_type: 'offline'
      };

      let errorOccurred: any = null;

      const res1 = await supabase.from('customers').insert([{
        ...insertPayload,
        phone: cleanPhone,
        city: cleanCity || null
      }]).select();

      if (res1.error) {
        const res2 = await supabase.from('customers').insert([{
          ...insertPayload,
          mobile: cleanPhone,
          city: cleanCity || null
        }]).select();

        if (res2.error) {
          const res3 = await supabase.from('customers').insert([{
            id: newCustId.trim().toUpperCase(),
            name: cleanName
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
        city: cleanCity || null,
        customer_type: 'offline'
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
    setDiscountError(null);
    setBillingProductSearch('');
    setCartItems([]);
    setIsBillingModalOpen(true);
  };

  const handleOpenVariantPicker = (prod: ProductRecord) => {
    setSelectedProductForModal(prod);
    const storePrice = getProductStorePrice(prod);

    setModalRate(storePrice);
    setSelectedParentColor('');
    setModalColor('');
    setModalSize('');
    setModalQty(1);
    setIsVariantModalOpen(true);
  };

  const productKeySet = useMemo(() => {
    if (!selectedProductForModal) return new Set<string>();
    const keys = new Set<string>();
    const p = selectedProductForModal;

    if (p.id) {
      keys.add(cleanStr(p.id));
      keys.add(cleanStr(p.id).replace(/\s+/g, ''));
    }
    if (p.code) {
      keys.add(cleanStr(p.code));
      keys.add(cleanStr(p.code).replace(/\s+/g, ''));
    }
    if (p.product_code) {
      keys.add(cleanStr(p.product_code));
      keys.add(cleanStr(p.product_code).replace(/\s+/g, ''));
    }
    return keys;
  }, [selectedProductForModal]);

  const currentProductInventory = useMemo(() => {
    if (!selectedProductForModal || productKeySet.size === 0) return [];

    return inventoryList.filter((inv) => {
      const invPId = cleanStr(inv.product_id);
      return productKeySet.has(invPId) || productKeySet.has(invPId.replace(/\s+/g, ''));
    });
  }, [selectedProductForModal, productKeySet, inventoryList]);

  const currentProductPurchases = useMemo(() => {
    if (!selectedProductForModal || productKeySet.size === 0) return [];

    return purchaseItemsList.filter((pi) => {
      const piPId = cleanStr(pi.product_id);
      return productKeySet.has(piPId) || productKeySet.has(piPId.replace(/\s+/g, ''));
    });
  }, [selectedProductForModal, productKeySet, purchaseItemsList]);

  const getCentralizedStock = (colorName: string, sizeName?: string): number => {
    const cTarget = cleanStr(colorName);
    const sTarget = sizeName ? cleanStr(sizeName) : null;

    const invMatches = currentProductInventory.filter((inv) => {
      const c = cleanStr(inv.variant_color || 'STANDARD');
      if (sTarget) {
        const s = cleanStr(inv.variant_size || 'FREE SIZE');
        return c === cTarget && s === sTarget;
      }
      return c === cTarget;
    });

    if (invMatches.length > 0) {
      return invMatches.reduce((sum, inv) => sum + Number(inv.stock_quantity ?? 0), 0);
    }

    const purchMatches = currentProductPurchases.filter((pi) => {
      const c = cleanStr(pi.variant_color || pi.color || 'STANDARD');
      if (sTarget) {
        const s = cleanStr(pi.variant_size || pi.size || 'FREE SIZE');
        return c === cTarget && s === sTarget;
      }
      return c === cTarget;
    });

    return purchMatches.reduce((sum, pi) => sum + Number(pi.quantity ?? 0), 0);
  };

  const allShadesForProduct = useMemo(() => {
    if (!selectedProductForModal) return [];
    const map = new Map<string, { stock: number; hex?: string; parent?: string }>();

    currentProductInventory.forEach((r) => {
      const clrKey = cleanStr(r.variant_color || 'STANDARD');
      if (clrKey && !map.has(clrKey)) {
        const liveStock = getCentralizedStock(clrKey);
        const matched = coloursList.find((c) => cleanStr(c.name) === clrKey);
        map.set(clrKey, {
          stock: liveStock,
          hex: matched?.hex_code || '#6d4aff',
          parent: matched?.parent_colour || matched?.parent_color || getBaseFamily(clrKey)
        });
      }
    });

    currentProductPurchases.forEach((pi) => {
      const clrKey = cleanStr(pi.variant_color || pi.color || 'STANDARD');
      if (clrKey && !map.has(clrKey)) {
        const liveStock = getCentralizedStock(clrKey);
        const matched = coloursList.find((c) => cleanStr(c.name) === clrKey);
        map.set(clrKey, {
          stock: liveStock,
          hex: matched?.hex_code || '#6d4aff',
          parent: matched?.parent_colour || matched?.parent_color || getBaseFamily(clrKey)
        });
      }
    });

    if (map.size === 0) {
      const prod = selectedProductForModal;
      if (prod.colour) {
        const rawColors = typeof prod.colour === 'string'
          ? prod.colour.split(',').map((c) => cleanStr(c))
          : [cleanStr(prod.colour)];
        rawColors.filter(Boolean).forEach((clrKey) => {
          if (!map.has(clrKey)) {
            const matched = coloursList.find((c) => cleanStr(c.name) === clrKey);
            map.set(clrKey, {
              stock: 0,
              hex: matched?.hex_code || '#6d4aff',
              parent: matched?.parent_colour || matched?.parent_color || getBaseFamily(clrKey)
            });
          }
        });
      }

      if (prod.variants?.colors && Array.isArray(prod.variants.colors)) {
        prod.variants.colors.forEach((c: string) => {
          const clrKey = cleanStr(c);
          if (!map.has(clrKey)) {
            const matched = coloursList.find((x) => cleanStr(x.name) === clrKey);
            map.set(clrKey, {
              stock: 0,
              hex: matched?.hex_code || '#6d4aff',
              parent: matched?.parent_colour || matched?.parent_color || getBaseFamily(clrKey)
            });
          }
        });
      }
    }

    return Array.from(map.entries()).map(([color, data]) => ({
      color,
      stock: data.stock,
      hex: data.hex || '#6d4aff',
      parent: (data.parent || getBaseFamily(color)).toUpperCase()
    }));
  }, [currentProductInventory, currentProductPurchases, selectedProductForModal, coloursList]);

  const parentColorFamilies = useMemo(() => {
    const map = new Map<string, { totalStock: number; sampleHex: string; shadeCount: number }>();

    allShadesForProduct.forEach((s) => {
      const fam = s.parent || 'OTHER';
      const existing = map.get(fam) || { totalStock: 0, sampleHex: s.hex, shadeCount: 0 };
      map.set(fam, {
        totalStock: existing.totalStock + s.stock,
        sampleHex: existing.sampleHex || s.hex,
        shadeCount: existing.shadeCount + 1
      });
    });

    return Array.from(map.entries()).map(([family, data]) => ({
      family,
      stock: data.totalStock,
      hex: data.sampleHex,
      count: data.shadeCount
    }));
  }, [allShadesForProduct]);

  useEffect(() => {
    if (isVariantModalOpen && parentColorFamilies.length > 0 && !selectedParentColor) {
      const withStock = parentColorFamilies.find((f) => f.stock > 0);
      setSelectedParentColor(withStock ? withStock.family : parentColorFamilies[0].family);
    }
  }, [isVariantModalOpen, parentColorFamilies, selectedParentColor]);

  const activeSubShades = useMemo(() => {
    if (!selectedParentColor) return allShadesForProduct;
    return allShadesForProduct.filter((s) => s.parent === selectedParentColor);
  }, [allShadesForProduct, selectedParentColor]);

  const modalAvailableSizes = useMemo(() => {
    if (!selectedProductForModal || !modalColor) return [];
    const chosenColor = cleanStr(modalColor);
    const map = new Map<string, number>();

    currentProductInventory
      .filter((r) => cleanStr(r.variant_color || 'STANDARD') === chosenColor)
      .forEach((r) => {
        const szKey = cleanStr(r.variant_size || 'FREE SIZE');
        if (!map.has(szKey)) {
          const liveStock = getCentralizedStock(chosenColor, szKey);
          map.set(szKey, liveStock);
        }
      });

    currentProductPurchases
      .filter((pi) => cleanStr(pi.variant_color || pi.color || 'STANDARD') === chosenColor)
      .forEach((pi) => {
        const szKey = cleanStr(pi.variant_size || pi.size || 'FREE SIZE');
        if (!map.has(szKey)) {
          const liveStock = getCentralizedStock(chosenColor, szKey);
          map.set(szKey, liveStock);
        }
      });

    if (map.size === 0) {
      const prod = selectedProductForModal;
      if (prod.size) {
        const rawSizes = typeof prod.size === 'string'
          ? prod.size.split(',').map((s) => cleanStr(s))
          : [cleanStr(prod.size)];
        rawSizes.filter(Boolean).forEach((szKey) => {
          if (!map.has(szKey)) {
            const liveStock = getCentralizedStock(chosenColor, szKey);
            map.set(szKey, liveStock);
          }
        });
      }

      if (prod.variants?.sizes && Array.isArray(prod.variants.sizes)) {
        prod.variants.sizes.forEach((s: string) => {
          const szKey = cleanStr(s);
          if (!map.has(szKey)) {
            const liveStock = getCentralizedStock(chosenColor, szKey);
            map.set(szKey, liveStock);
          }
        });
      }
    }

    if (map.size === 0) {
      map.set('FREE SIZE', 0);
    }

    return Array.from(map.entries()).map(([size, stock]) => ({
      size,
      stock
    }));
  }, [currentProductInventory, currentProductPurchases, selectedProductForModal, modalColor]);

  const modalCurrentStock = useMemo(() => {
    if (!modalColor || !modalSize) return 0;
    return getCentralizedStock(modalColor, modalSize);
  }, [modalColor, modalSize, currentProductInventory, currentProductPurchases]);

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

    const matchedHex = coloursList.find((c) => cleanStr(c.name) === cleanStr(modalColor))?.hex_code;
    const cartId = `${selectedProductForModal.id}_${modalColor}_${modalSize}`.toUpperCase();

    const existingIndex = cartItems.findIndex((c) => c.cart_id === cartId);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      const newQty = updated[existingIndex].quantity + modalQty;
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

  const maxAllowedDiscount = useMemo(() => {
    return Math.floor(subTotalAmount * 0.10);
  }, [subTotalAmount]);

  const handleDiscountChange = (val: string) => {
    const num = Number(val) || 0;
    if (num > maxAllowedDiscount) {
      setDiscountAmount(maxAllowedDiscount);
      setDiscountError(`MAXIMUM 10% DISCOUNT ALLOWED (₹${maxAllowedDiscount})`);
    } else {
      setDiscountAmount(val);
      setDiscountError(null);
    }
  };

  const finalPayableAmount = useMemo(() => {
    const disc = Math.min(Number(discountAmount) || 0, maxAllowedDiscount);
    return Math.max(0, subTotalAmount - disc);
  }, [subTotalAmount, discountAmount, maxAllowedDiscount]);

  const totalCartUnits = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  // SALE EXECUTION: EXACT SCHEMA MATCH WITH 'items' COLUMN
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

    const appliedDisc = Math.min(Number(discountAmount) || 0, maxAllowedDiscount);
    const cleanUtr = utrNumber.trim().toUpperCase();
    const isUtrPending = paymentMode === 'upi' && !cleanUtr;

    setSubmitting(true);
    try {
      const custPhoneVal = selectedCustomer.phone || selectedCustomer.mobile || undefined;

      // STRICT SCHEMA OBJECT USING 'items' (NOT items_summary)
      const orderPayload: any = {
        id: invoiceNo.trim().toUpperCase(),
        customer_id: selectedCustomer.id.toUpperCase(),
        customer_name: selectedCustomer.name.toUpperCase(),
        customer_phone: custPhoneVal,
        total: finalPayableAmount,
        total_amount: subTotalAmount,
        subtotal: subTotalAmount,
        discount: appliedDisc,
        discount_amount: appliedDisc,
        final_amount: finalPayableAmount,
        payment_mode: paymentMode,
        payment_method: paymentMode.toUpperCase(),
        payment_ref: paymentMode === 'upi' && cleanUtr ? cleanUtr : null,
        payment_status: isUtrPending ? 'utr_pending' : 'paid',
        order_status: 'delivered',
        status: 'completed',
        items: cartItems, // Matches exact 'items' jsonb column from orders schema
        created_at: new Date().toISOString()
      };

      const { error: orderError } = await supabase.from('orders').insert([orderPayload]);
      if (orderError) throw orderError;

      // Safe Line Items insert in order_items table
      try {
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
        await supabase.from('order_items').insert(orderItemsPayload);
      } catch (e) {
        console.warn('order_items insert skipped:', e);
      }

      // Live Inventory Stock Deduction
      for (const item of cartItems) {
        const { data: invRow } = await supabase
          .from('inventory')
          .select('id, stock_quantity')
          .ilike('product_id', item.product_id.trim())
          .ilike('variant_color', item.color.trim())
          .ilike('variant_size', item.size.trim())
          .maybeSingle();

        if (invRow) {
          const currentStock = Number(invRow.stock_quantity ?? 0);
          const newStock = currentStock - item.quantity;
          await supabase
            .from('inventory')
            .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
            .eq('id', invRow.id);
        } else {
          const liveStockBeforeSale = getCentralizedStock(item.color, item.size);
          const newStock = liveStockBeforeSale - item.quantity;

          await supabase.from('inventory').insert([
            {
              id: `inv_${item.product_id}_${item.color}_${item.size}_${Date.now()}`.toUpperCase(),
              product_id: item.product_id.toUpperCase(),
              variant_color: item.color.toUpperCase(),
              variant_size: item.size.toUpperCase(),
              stock_quantity: newStock,
              low_stock_threshold: 3,
              updated_at: new Date().toISOString()
            }
          ]);
        }
      }

      setCompletedInvoice({ ...orderPayload, discount_amount: appliedDisc });
      setCompletedItems([...cartItems]);
      setIsBillingModalOpen(false);
      loadData();
    } catch (err: any) {
      alert('Failed to save order: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareWhatsApp = (inv: OrderRecord, itemsList: any[]) => {
    const phone = (inv.customer_phone || '').replace(/\D/g, '');
    if (!phone) {
      alert('CUSTOMER MOBILE NUMBER LEDU.');
      return;
    }

    const lineItems = itemsList.length > 0 ? itemsList : (inv.items || inv.items_summary || []);
    const itemsSummary = lineItems
      .map((it: any, idx: number) => `${idx + 1}. ${(it.product_name || it.product_id).toUpperCase()} (${(it.color || it.variant_color).toUpperCase()} / ${(it.size || it.variant_size).toUpperCase()}) x ${it.quantity} = ₹${it.total_price || it.total || it.price}`)
      .join('%0A');

    const message = `✨ *KASHVI CREATIONS - TAX INVOICE* ✨%0A%0A` +
      `*BILL NO:* ${inv.id.toUpperCase()}%0A` +
      `*DATE:* ${new Date(inv.created_at).toLocaleDateString('en-IN')}%0A` +
      `*CUSTOMER:* ${inv.customer_name.toUpperCase()}%0A` +
      `*PAYMENT MODE:* ${(inv.payment_mode || 'CASH').toUpperCase()} ${inv.payment_status === 'utr_pending' ? '(UTR PENDING)' : '(PAID)'}%0A%0A` +
      `*ITEMS PURCHASED:*%0A${itemsSummary}%0A%0A` +
      `*SUBTOTAL:* ₹${inv.total_amount || inv.subtotal || inv.total}%0A` +
      `*DISCOUNT:* ₹${inv.discount_amount || inv.discount || 0}%0A` +
      `*TOTAL AMOUNT:* ₹${inv.final_amount || inv.total}%0A%0A` +
      `THANK YOU FOR SHOPPING WITH US! VISIT AGAIN. 🙏%0A` +
      `_KASHVI COMMAND DECK_`;

    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
  };

  const handleOpenViewOrder = async (order: OrderRecord) => {
    setViewingOrder(order);
    const existingItems = order.items || order.items_summary;
    if (existingItems && Array.isArray(existingItems)) {
      setViewingOrderItems(existingItems);
    } else {
      try {
        const { data } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);
        setViewingOrderItems(data || []);
      } catch {
        setViewingOrderItems([]);
      }
    }
  };

  const customerPastOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    const custPhone = selectedCustomer.phone || selectedCustomer.mobile;
    return orders.filter((o) => o.customer_id === selectedCustomer.id || (custPhone && o.customer_phone === custPhone));
  }, [orders, selectedCustomer]);

  const filteredExistingCustomers = useMemo(() => {
    let list = customersList;

    if (customerPickerType === 'offline') {
      list = list.filter((c) => isOfflineCustomer(c.id));
    } else {
      list = list.filter((c) => !isOfflineCustomer(c.id));
    }

    if (!custSearchTerm.trim()) return list;
    const q = custSearchTerm.toUpperCase().trim();
    return list.filter((c) => {
      const cPhone = c.phone || c.mobile || '';
      return (
        c.name.toUpperCase().includes(q) ||
        c.id.toUpperCase().includes(q) ||
        cPhone.includes(q) ||
        (c.city && c.city.toUpperCase().includes(q))
      );
    });
  }, [customersList, customerPickerType, custSearchTerm]);

  const filteredDeskProducts = useMemo(() => {
    if (!billingProductSearch.trim()) return productsList;
    const q = billingProductSearch.toUpperCase().trim();
    return productsList.filter(
      (p) =>
        cleanStr(p.id).includes(q) ||
        cleanStr(p.code).includes(q) ||
        cleanStr(p.name).includes(q) ||
        (p.sub_category && cleanStr(p.sub_category).includes(q))
    );
  }, [productsList, billingProductSearch]);

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
              STORE PRICE BILLING • STRICT 10% DISCOUNT CAP • AUTOMATED INVENTORY SYNC
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
              className="w-full pl-8 pr-3 py-1.5 bg-[#0a0e17] rounded-xl text-white text-xs outline-none border border-white/10 focus:border-[#00d9ff] uppercase font-mono"
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
                filteredOrders.map((ord) => {
                  const isOffline = isOfflineCustomer(ord.customer_id);

                  return (
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
                            <span className={`text-[9.5px] font-mono px-1 rounded ${isOffline ? 'bg-[#ffa500]/15 text-[#ffa500]' : 'bg-[#00d9ff]/15 text-[#00d9ff]'}`}>
                              [{ord.customer_id}]
                            </span>
                          )}
                        </div>
                        {ord.customer_phone && (
                          <span className="text-[10px] font-mono text-[#8b9bb4]">{ord.customer_phone}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffa500]/15 text-[#ffa500] text-[10px] font-mono font-bold">
                          <Store className="w-3.5 h-3.5" /> WALK-IN
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="uppercase font-mono font-bold text-[#8b9bb4] text-[10px]">
                            {ord.payment_mode || 'CASH'}
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
                        ₹{Number(ord.final_amount || ord.total || ord.total_amount || 0).toLocaleString('en-IN')}
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
                  );
                })
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
              <p className="text-xs text-[#8b9bb4] mt-1">NEW REGISTER (CUST0001) OR EXISTING DIRECTORY</p>
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

      {/* DIALOG 2A: NEW CUSTOMER REGISTRATION */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-[100010] p-4 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in select-none">
          <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#00d9ff]" />
                <h3 className="text-sm font-bold text-white uppercase">OFFLINE CUSTOMER REGISTRATION</h3>
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
                  CUSTOMER ID (CUST0001 SERIES - OFFLINE)
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
                  <span>SAVE TO REGISTER & BILL</span>
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
                <h3 className="text-sm font-bold text-white uppercase">CUSTOMER DIRECTORY</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExistingCustomerPickerOpen(false)}
                className="text-[#8b9bb4] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 rounded-2xl bg-[#0a0e17] border border-white/10 flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-[#8b9bb4] uppercase font-bold tracking-wider">
                FILTER:
              </span>

              <div className="inline-flex p-0.5 rounded-xl bg-[#101628] border border-white/15">
                <button
                  type="button"
                  onClick={() => setCustomerPickerType('offline')}
                  className={`px-4 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    customerPickerType === 'offline'
                      ? 'bg-[#ffa500] text-neutral-950 shadow-md font-extrabold'
                      : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>OFFLINE</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerPickerType('online')}
                  className={`px-4 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    customerPickerType === 'online'
                      ? 'bg-[#00d9ff] text-neutral-950 shadow-md font-extrabold'
                      : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>ONLINE</span>
                </button>
              </div>
            </div>

            <div className="relative shrink-0">
              <input
                type="text"
                autoFocus
                placeholder={`SEARCH ${customerPickerType.toUpperCase()} CUSTOMER...`}
                value={custSearchTerm}
                onChange={(e) => setCustSearchTerm(e.target.value.toUpperCase())}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#0a0e17] border border-white/15 text-white text-xs outline-none focus:border-[#00d9ff] uppercase font-mono"
              />
              <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
              {filteredExistingCustomers.length === 0 ? (
                <div className="p-6 text-center text-[#8b9bb4] italic text-xs uppercase">
                  NO {customerPickerType.toUpperCase()} CUSTOMERS FOUND.
                </div>
              ) : (
                filteredExistingCustomers.map((c) => {
                  const phoneNum = c.phone || c.mobile || '—';
                  const isOffline = isOfflineCustomer(c.id);

                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectExistingCustomer(c)}
                      className="p-2.5 rounded-xl hover:bg-white/10 cursor-pointer flex items-center justify-between transition-colors border border-transparent hover:border-white/10"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold text-xs ${isOffline ? 'text-[#00ff9d]' : 'text-[#00d9ff]'}`}>
                            [{c.id}]
                          </span>
                          <span className="font-bold text-white text-xs">{c.name}</span>
                          {isOffline ? (
                            <span className="px-1.5 py-0.2 rounded bg-[#ffa500]/15 text-[#ffa500] text-[9px] font-mono font-bold flex items-center gap-0.5">
                              <Store className="w-2.5 h-2.5" /> OFFLINE
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-[#00d9ff]/15 text-[#00d9ff] text-[9px] font-mono font-bold flex items-center gap-0.5">
                              <Globe className="w-2.5 h-2.5" /> ONLINE
                            </span>
                          )}
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
                  <span className="text-[10px] font-mono text-[#8b9bb4]">
                    ID: {selectedCustomer.id} • TYPE: {isOfflineCustomer(selectedCustomer.id) ? 'OFFLINE (CUST)' : 'ONLINE'} • MOBILE: {selectedCustomer.phone || selectedCustomer.mobile}
                  </span>
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
                      <th className="py-2 px-2.5">CHANNEL</th>
                      <th className="py-2 px-2.5">MODE</th>
                      <th className="py-2 px-2.5 text-right">AMOUNT (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {customerPastOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td className="py-2 px-2.5 text-[#00ff9d] font-bold">{ord.id}</td>
                        <td className="py-2 px-2.5 text-[#8b9bb4]">{new Date(ord.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="py-2 px-2.5 uppercase">
                          {ord.order_type === 'online' ? (
                            <span className="text-[#00d9ff] font-bold">ONLINE</span>
                          ) : (
                            <span className="text-[#ffa500] font-bold">WALK-IN</span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 uppercase">{ord.payment_mode || 'CASH'}</td>
                        <td className="py-2 px-2.5 text-right font-bold text-white">₹{Number(ord.final_amount || ord.total || ord.total_amount || 0).toLocaleString('en-IN')}</td>
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
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${isOfflineCustomer(selectedCustomer.id) ? 'bg-[#ffa500]/20 text-[#ffa500]' : 'bg-[#00d9ff]/20 text-[#00d9ff]'}`}>
                      {selectedCustomer.id.slice(-2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs block uppercase">{selectedCustomer.name}</span>
                        <span className={`text-[9px] font-mono px-1 rounded ${isOfflineCustomer(selectedCustomer.id) ? 'bg-[#ffa500]/15 text-[#ffa500]' : 'bg-[#00d9ff]/15 text-[#00d9ff]'}`}>
                          {isOfflineCustomer(selectedCustomer.id) ? 'OFFLINE' : 'ONLINE'}
                        </span>
                      </div>
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
                <div className="lg:col-span-6 space-y-2.5 p-3 rounded-2xl bg-[#0a0e17] border border-white/10">
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <span className="text-xs font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1.5 shrink-0">
                      <Layers className="w-3.5 h-3.5" /> SELECT PRODUCT ({filteredDeskProducts.length})
                    </span>

                    <div className="relative flex-1 max-w-xs sm:ml-auto">
                      <input
                        type="text"
                        value={billingProductSearch}
                        onChange={(e) => setBillingProductSearch(e.target.value.toUpperCase())}
                        placeholder="SEARCH CODE (KF...) OR NAME..."
                        className="w-full pl-7 pr-2.5 py-1 bg-[#101628] rounded-xl text-white text-[11px] outline-none border border-white/15 focus:border-[#00d9ff] uppercase font-mono"
                      />
                      <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto custom-scrollbar p-0.5">
                    {filteredDeskProducts.length === 0 ? (
                      <div className="col-span-full p-8 text-center text-[#8b9bb4] italic text-xs uppercase">
                        NO PRODUCTS MATCHING YOUR SEARCH.
                      </div>
                    ) : (
                      filteredDeskProducts.map((p) => {
                        const storePrice = getProductStorePrice(p);
                        const displayCode = p.code || p.id;

                        return (
                          <div
                            key={p.id}
                            onClick={() => handleOpenVariantPicker(p)}
                            className="p-2 rounded-xl bg-[#101628] border border-white/10 hover:border-[#00d9ff] cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between group"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-extrabold text-[#00ff9d] text-[11px] block group-hover:underline uppercase">
                                  [{displayCode}]
                                </span>
                                <span className="font-mono font-bold text-[#00d9ff] text-[11.5px]">
                                  ₹{storePrice}
                                </span>
                              </div>
                              <span className="font-bold text-white text-[11px] block truncate mt-0.5 uppercase leading-snug">
                                {p.name}
                              </span>
                            </div>

                            <div className="pt-1 mt-1 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-[#8b9bb4]">
                              <span className="truncate max-w-[80px] uppercase">
                                {p.sub_category || 'FASHION'}
                              </span>
                              <span className="text-[8.5px] font-bold text-white bg-white/10 px-1.5 py-0.2 rounded uppercase">
                                SELECT
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
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
                              <th className="py-1.5 px-2 text-right">STORE RATE</th>
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
                          <div className="flex items-center gap-1">
                            <span>DISCOUNT (₹):</span>
                            <span className="text-[9px] text-[#00d9ff] font-bold">
                              (MAX 10%: ₹{maxAllowedDiscount})
                            </span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={maxAllowedDiscount}
                            value={discountAmount}
                            onChange={(e) => handleDiscountChange(e.target.value)}
                            className={`w-20 px-2 py-0.5 rounded bg-[#0a0e17] border font-mono text-right text-xs outline-none ${
                              discountError ? 'border-[#ff6b6b] text-[#ff6b6b]' : 'border-white/15 text-white'
                            }`}
                          />
                        </div>

                        {discountError && (
                          <div className="flex items-center gap-1 text-[9.5px] text-[#ff6b6b] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{discountError}</span>
                          </div>
                        )}

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
          <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div>
                <span className="font-mono text-xs font-bold text-[#00ff9d] uppercase">
                  [{selectedProductForModal.code || selectedProductForModal.id}]
                </span>
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

            <div className="flex-1 overflow-y-auto space-y-3.5 custom-scrollbar pr-1">
              
              {/* STEP 1: PARENT COLOR FAMILY CAPSULES */}
              {parentColorFamilies.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1">
                      <Palette className="w-3 h-3" /> 1. SELECT MAIN COLOUR:
                    </span>
                    {selectedParentColor && (
                      <span className="text-[9.5px] font-mono text-[#00ff9d] font-bold">
                        ACTIVE: {selectedParentColor}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {parentColorFamilies.map((f) => {
                      const isSelected = selectedParentColor === f.family;
                      return (
                        <button
                          key={f.family}
                          type="button"
                          onClick={() => {
                            setSelectedParentColor(f.family);
                            setModalColor('');
                            setModalSize('');
                          }}
                          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-mono text-[11px] font-bold transition-all cursor-pointer border uppercase ${
                            isSelected
                              ? 'bg-[#6d4aff] text-white border-[#00d9ff] shadow-md shadow-[#6d4aff]/40 scale-105'
                              : 'bg-[#0a0e17] text-[#8b9bb4] border-white/10 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
                            style={{ backgroundColor: f.hex }}
                          />
                          <span>{f.family}</span>
                          <span className={`text-[9px] px-1 rounded-full ${f.stock > 0 ? 'bg-[#00ff9d]/20 text-[#00ff9d] font-black' : 'bg-white/10 text-[#8b9bb4]'}`}>
                            {f.stock > 0 ? `${f.stock}` : '0'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: PURE VISUAL SWATCH CUBES */}
              <div className="space-y-2 p-3 rounded-2xl bg-[#0a0e17] border border-white/10">
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase">
                    2. CHOOSE SHADE CUBE ({activeSubShades.length} SHADES):
                  </span>
                  {modalColor ? (
                    <span className="text-[11px] font-mono font-black text-[#00d9ff] bg-[#00d9ff]/10 px-2 py-0.5 rounded-lg border border-[#00d9ff]/30">
                      SHADE: {modalColor} ({activeSubShades.find(s => cleanStr(s.color) === cleanStr(modalColor))?.stock || 0} PCS)
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-mono text-[#8b9bb4] italic">
                      TAP ANY CUBE
                    </span>
                  )}
                </div>

                {activeSubShades.length === 0 ? (
                  <div className="p-4 text-center text-[#ff6b6b] italic text-xs uppercase font-mono">
                    NO PURCHASED VARIANTS FOUND FOR THIS PRODUCT.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto custom-scrollbar p-1">
                    {activeSubShades.map((s) => {
                      const isSelected = cleanStr(modalColor) === cleanStr(s.color);
                      const cardBg = s.hex || '#6d4aff';
                      const textColor = getContrastTextColor(cardBg);

                      return (
                        <div
                          key={s.color}
                          title={`${s.color} — Stock: ${s.stock}`}
                          onClick={() => {
                            setModalColor(s.color);
                            setModalSize('');
                          }}
                          className={`relative w-10 h-10 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center border shadow-md active:scale-95 group ${
                            isSelected
                              ? 'border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.85)] scale-110 ring-2 ring-[#00ff9d]'
                              : 'border-white/20 hover:border-white/60 hover:scale-105'
                          }`}
                          style={{ backgroundColor: cardBg }}
                        >
                          {isSelected && (
                            <Check className="w-4 h-4 stroke-[3]" style={{ color: textColor }} />
                          )}

                          <span
                            className={`absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-full text-[8px] font-mono font-black border shadow-sm ${
                              s.stock > 0
                                ? 'bg-[#00ff9d] text-neutral-950 border-neutral-950'
                                : 'bg-[#ff6b6b] text-white border-white/20'
                            }`}
                          >
                            {s.stock}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STEP 3: SIZE SELECTION */}
              {modalColor && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-mono font-bold text-[#8b9bb4] uppercase block">
                      3. SELECT SIZE FOR &quot;{modalColor}&quot;:
                    </span>
                    <span className="text-[9.5px] font-mono text-[#00ff9d]">
                      CENTRALISED STOCK
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {modalAvailableSizes.map((s) => {
                      const isSelected = cleanStr(modalSize) === cleanStr(s.size);
                      return (
                        <button
                          key={s.size}
                          type="button"
                          onClick={() => setModalSize(s.size)}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer border uppercase ${
                            isSelected
                              ? 'bg-[#00ff9d] text-neutral-950 border-[#00ff9d] shadow-md scale-105'
                              : 'bg-[#0a0e17] text-white border-white/15 hover:border-[#00d9ff]'
                          }`}
                        >
                          <span>{s.size}</span>
                          <span className={`text-[9.5px] ml-1.5 font-black ${s.stock > 0 ? 'text-[#00ff9d] bg-[#00ff9d]/20 px-1 py-0.2 rounded' : 'text-[#ff6b6b]'}`}>
                            [{s.stock}]
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 4: STORE PRICE & QUANTITY */}
              {modalColor && modalSize && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[#0a0e17] border border-white/10">
                  <div>
                    <label className="text-[9.5px] font-mono text-[#ffa500] uppercase block mb-1 font-bold">
                      STORE SELLING PRICE (₹)
                    </label>
                    <input
                      type="number"
                      value={modalRate}
                      onChange={(e) => setModalRate(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#101628] border border-white/15 text-[#ffa500] font-mono font-bold text-xs outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase">QUANTITY</label>
                      <span className={`text-[9.5px] font-mono font-bold ${modalCurrentStock > 0 ? 'text-[#00ff9d]' : 'text-[#ff6b6b]'}`}>
                        STOCK: {modalCurrentStock}
                      </span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={modalQty}
                      onChange={(e) => setModalQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#101628] border border-white/15 text-[#00ff9d] font-mono font-bold text-xs outline-none text-center"
                    />
                  </div>
                </div>
              )}

            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10 shrink-0">
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
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#00ff9d] text-neutral-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 uppercase shadow-md active:scale-95"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
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
              const isCustOffline = isOfflineCustomer(activeBill.customer_id);

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
                      <strong className="text-white">
                        {activeBill.customer_name} {activeBill.customer_id ? `[${activeBill.customer_id}]` : ''}
                      </strong>
                      <span className="text-[9px] block text-[#8b9bb4]">
                        TYPE: {isCustOffline ? 'OFFLINE (CUST)' : 'ONLINE'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8b9bb4] text-[9.5px] uppercase block">PAYMENT / STATUS:</span>
                      <strong className={activeBill.payment_status === 'utr_pending' ? 'text-[#ff6b6b]' : 'text-[#00ff9d]'}>
                        {(activeBill.payment_mode || 'CASH').toUpperCase()} ({activeBill.payment_status === 'utr_pending' ? 'UTR PENDING' : 'PAID'})
                      </strong>
                    </div>
                  </div>

                  <div className="max-h-52 overflow-y-auto custom-scrollbar border border-white/10 rounded-2xl bg-[#0a0e17]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#101628] text-[#8b9bb4] font-mono text-[9px] uppercase border-b border-white/10 sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">ITEM & VARIANT</th>
                          <th className="py-2 px-2 text-center">QTY</th>
                          <th className="py-2 px-2 text-right">STORE RATE</th>
                          <th className="py-2 px-2.5 text-right">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 uppercase">
                        {activeLineItems.map((it: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-2 px-2.5">
                              <span className="font-bold text-white block uppercase">{(it.product_name || it.product_id).toUpperCase()}</span>
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
                        ₹{Number(activeBill.final_amount || activeBill.total || activeBill.total_amount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="text-right text-[10px] text-[#8b9bb4]">
                      <span>DISCOUNT: ₹{activeBill.discount_amount || activeBill.discount || 0}</span>
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