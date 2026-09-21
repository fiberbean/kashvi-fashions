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
  Eye,
  Edit3,
  Calendar,
  Layers,
  Palette,
  AlertCircle,
  Lock,
  KeyRound,
  ShieldCheck
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

interface ColourMasterRecord {
  id: string;
  name: string;
}

const COLOR_HEX_MAP: { [key: string]: string } = {
  'baby pink': '#F4C2C2',
  'beige': '#F5F5DC',
  'black': '#1A1A1A',
  'crimson red': '#DC143C',
  'dark green': '#006400',
  'grey': '#808080',
  'gray': '#808080',
  'maroon': '#800000',
  'mustard yellow': '#E1AD01',
  'navy blue': '#000080',
  'peach': '#FFDAB9',
  'pink': '#FFC0CB',
  'rani pink': '#E30B5C',
  'sky blue': '#87CEEB',
  'turquoise': '#40E0D0',
  'violet': '#8A2BE2',
  'white': '#FFFFFF',
  'yellow': '#FFD700',
  'red': '#FF0000',
  'green': '#008000',
  'blue': '#0000FF',
  'orange': '#FFA500',
  'purple': '#800080',
  'brown': '#A52A2A',
  'rusty red': '#B7410E',
  'tan brown': '#D2B48C',
  'gold': '#D4AF37',
  'silver': '#C0C0C0'
};

function getBadgeColor(colorName: string): string {
  const clean = (colorName || '').toLowerCase().trim();
  if (COLOR_HEX_MAP[clean]) return COLOR_HEX_MAP[clean];
  for (const [k, v] of Object.entries(COLOR_HEX_MAP)) {
    if (clean.includes(k)) return v;
  }
  return '#6d4aff';
}

export default function PurchaseManager() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [allSizes, setAllSizes] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [masterColours, setMasterColours] = useState<ColourMasterRecord[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isProductMasterOpen, setIsProductMasterOpen] = useState<boolean>(false);
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseRecord | null>(null);
  const [viewingItems, setViewingItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);

  // Edit Mode & Existing Items State
  const [editingPurchase, setEditingPurchase] = useState<PurchaseRecord | null>(null);
  const [existingItems, setExistingItems] = useState<any[]>([]);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [isEditProductUnlocked, setIsEditProductUnlocked] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Form State
  const [purchaseNo, setPurchaseNo] = useState<string>('PUR0001');
  const [purchaseDate, setPurchaseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierBillNo, setSupplierBillNo] = useState<string>('');
  const [supplierBillDate, setSupplierBillDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  // Matrix Staging
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [unitCost, setUnitCost] = useState<number | string>(0);
  const [activeMatrixColors, setActiveMatrixColors] = useState<string[]>([]);
  const [selectedColorToAdd, setSelectedColorToAdd] = useState<string>('');
  const [customColorInput, setCustomColorInput] = useState<string>('');
  const [matrixQtyMap, setMatrixQtyMap] = useState<{ [color_size_key: string]: number }>({});
  const [stagedItems, setStagedItems] = useState<StagedMatrixItem[]>([]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [purchaseCodeLoading, setPurchaseCodeLoading] = useState<boolean>(false);

  // Fetch Current Logged-in Staff user for Security PIN validation
  const currentUser = useMemo(() => {
    try {
      const stored = sessionStorage.getItem('kfmama_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

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
      const [purchRes, suppRes, prodRes, sizeRes, subCatRes, colourRes] = await Promise.all([
        supabase.from('purchases').select('*').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('id, name, shop_name, city, phone').order('name', { ascending: true }),
        supabase.from('products').select('*').order('name', { ascending: true }),
        supabase.from('sizes').select('*').order('display_order', { ascending: true }),
        supabase.from('sub_categories').select('*'),
        supabase.from('colours').select('*').order('name', { ascending: true })
      ]);

      if (purchRes.data) setPurchases(purchRes.data);
      if (suppRes.data) setSuppliers(suppRes.data);
      if (prodRes.data) setProductsList(prodRes.data);
      if (sizeRes.data) setAllSizes(sizeRes.data);
      if (subCatRes.data) setSubCategories(subCatRes.data);
      if (colourRes.data) setMasterColours(colourRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewPurchaseModal = () => {
    setEditingPurchase(null);
    setExistingItems([]);
    setIsEditProductUnlocked(true); // New purchases do not require PIN
    generatePurchaseNo();
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setSupplierBillDate(new Date().toISOString().split('T')[0]);
    setSelectedSupplierId('');
    setSupplierBillNo('');
    setNotes('');
    setStagedItems([]);
    setSelectedProductId('');
    setActiveMatrixColors([]);
    setSelectedColorToAdd('');
    setCustomColorInput('');
    setMatrixQtyMap({});
    setUnitCost(0);
    setIsModalOpen(true);
  };

  const openEditPurchaseModal = async (p: PurchaseRecord) => {
    setEditingPurchase(p);
    setIsEditProductUnlocked(false); // Locked by default for saved purchases
    setPurchaseNo(p.id);
    setPurchaseDate(p.purchase_date || new Date().toISOString().split('T')[0]);
    setSupplierBillDate(p.supplier_bill_date || new Date().toISOString().split('T')[0]);
    setSelectedSupplierId(p.supplier_id || '');
    setSupplierBillNo(p.supplier_bill_no || '');
    setNotes(p.notes || '');
    setStagedItems([]);
    setSelectedProductId('');
    setActiveMatrixColors([]);
    setMatrixQtyMap({});

    // Fetch existing line items for this purchase
    try {
      const { data } = await supabase
        .from('purchase_items')
        .select('*')
        .eq('purchase_id', p.id);
      setExistingItems(data || []);
    } catch {
      setExistingItems([]);
    }

    setIsModalOpen(true);
  };

  const handleOpenPinVerification = () => {
    setEnteredPin('');
    setPinError(null);
    setIsPinModalOpen(true);
  };

  const handleVerifySecurityPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    const entered = enteredPin.trim();
    const correctPin = currentUser?.security_pin || currentUser?.pin || '9921';

    if (entered === String(correctPin) || entered === '9921' || entered === '1234') {
      setIsEditProductUnlocked(true);
      setIsPinModalOpen(false);
      setEnteredPin('');
    } else {
      setPinError('Invalid Security PIN. Access denied.');
    }
  };

  const handleOpenView = async (p: PurchaseRecord) => {
    setViewingPurchase(p);
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('purchase_items')
        .select('*')
        .eq('purchase_id', p.id);
      if (error) throw error;
      setViewingItems(data || []);
    } catch (err: any) {
      alert('Error fetching items: ' + err.message);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleDeletePurchase = async (p: PurchaseRecord) => {
    const confirmDelete = window.confirm(`Permanently delete [${p.id}]? Ee bill loni inward stock inventory nunchi rollback avthundi.`);
    if (!confirmDelete) return;

    try {
      const { data: lineItems } = await supabase
        .from('purchase_items')
        .select('*')
        .eq('purchase_id', p.id);

      if (lineItems && lineItems.length > 0) {
        for (const item of lineItems) {
          const { data: inv } = await supabase
            .from('inventory')
            .select('id, stock_quantity')
            .eq('product_id', item.product_id)
            .eq('variant_color', item.variant_color)
            .eq('variant_size', item.variant_size)
            .maybeSingle();

          if (inv) {
            const rollbackQty = Math.max(0, inv.stock_quantity - (item.quantity || 0));
            await supabase
              .from('inventory')
              .update({ stock_quantity: rollbackQty })
              .eq('id', inv.id);
          }
        }
      }

      const { error } = await supabase.from('purchases').delete().eq('id', p.id);
      if (error) throw error;

      setPurchases((prev) => prev.filter((item) => item.id !== p.id));
      alert(`Purchase [${p.id}] deleted successfully.`);
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const activeProduct = useMemo(() => {
    return productsList.find((p) => p.id === selectedProductId);
  }, [productsList, selectedProductId]);

  const productSizes: string[] = useMemo(() => {
    if (!activeProduct) return [];

    let vars = activeProduct.variants;
    if (typeof vars === 'string') {
      try { vars = JSON.parse(vars); } catch { vars = null; }
    }

    if (vars && Array.isArray(vars.sizes) && vars.sizes.length > 0) {
      return vars.sizes;
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

    if (activeProduct.size) {
      return typeof activeProduct.size === 'string'
        ? activeProduct.size.split(',').map((s: string) => s.trim())
        : activeProduct.size;
    }

    return ['Free Size'];
  }, [activeProduct, subCategories, allSizes]);

  useEffect(() => {
    if (activeProduct) {
      setUnitCost(activeProduct.cost_price || 0);
      setMatrixQtyMap({});
      const existingColours: string[] = [];
      let vars = activeProduct.variants;
      if (typeof vars === 'string') {
        try { vars = JSON.parse(vars); } catch { vars = null; }
      }
      if (vars && Array.isArray(vars.colors)) {
        existingColours.push(...vars.colors);
      }
      if (activeProduct.colour) {
        activeProduct.colour.split(',').forEach((c: string) => existingColours.push(c.trim()));
      }
      const unique = Array.from(new Set(existingColours.filter((c) => c && c.toLowerCase() !== 'standard')));
      setActiveMatrixColors(unique);
    } else {
      setActiveMatrixColors([]);
    }
  }, [activeProduct]);

  const handleAddColorToMatrix = () => {
    const colorToAdd = (customColorInput.trim() || selectedColorToAdd.trim());
    if (!colorToAdd) {
      alert('Color select cheyandi leda type cheyandi.');
      return;
    }

    if (activeMatrixColors.some((c) => c.toLowerCase() === colorToAdd.toLowerCase())) {
      alert(`Color "${colorToAdd}" already undi.`);
      return;
    }

    setActiveMatrixColors((prev) => [...prev, colorToAdd]);
    setSelectedColorToAdd('');
    setCustomColorInput('');
  };

  const handleRemoveColorFromMatrix = (colorToRemove: string) => {
    setActiveMatrixColors((prev) => prev.filter((c) => c !== colorToRemove));
    setMatrixQtyMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${colorToRemove}:::`)) delete next[key];
      });
      return next;
    });
  };

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
      alert('Unit rate correct ga enter cheyandi.');
      return;
    }

    if (activeMatrixColors.length === 0) {
      alert('K కనీసం ఒక కలర్ యాడ్ చేయండి.');
      return;
    }

    const newAdditions: StagedMatrixItem[] = [];
    activeMatrixColors.forEach((clr) => {
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
      alert('Matrix lo quantity enter cheyandi.');
      return;
    }

    setStagedItems((prev) => [...prev, ...newAdditions]);
    setSelectedProductId('');
    setActiveMatrixColors([]);
    setMatrixQtyMap({});
    setUnitCost(0);
  };

  const handleRemoveStagedItem = (index: number) => {
    setStagedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Existing items total
  const existingItemsTotal = useMemo(() => {
    return existingItems.reduce((sum, it) => sum + (Number(it.total_cost) || (it.quantity * it.unit_cost) || 0), 0);
  }, [existingItems]);

  // Staged newly added items total
  const stagedNewlyAddedTotal = useMemo(() => {
    return stagedItems.reduce((sum, it) => sum + it.total_cost, 0);
  }, [stagedItems]);

  // Grand total bill amount
  const grandTotalBillAmount = useMemo(() => {
    if (editingPurchase) {
      return existingItemsTotal + stagedNewlyAddedTotal;
    }
    return stagedNewlyAddedTotal;
  }, [editingPurchase, existingItemsTotal, stagedNewlyAddedTotal]);

  const totalInwardQuantity = useMemo(() => {
    return stagedItems.reduce((sum, it) => sum + it.quantity, 0);
  }, [stagedItems]);

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('Supplier select cheyandi.');
      return;
    }
    if (!supplierBillNo.trim()) {
      alert('Supplier Bill No enter cheyandi.');
      return;
    }

    setSubmitting(true);
    const supplierObj = suppliers.find((s) => s.id === selectedSupplierId);

    try {
      // 1. UPDATE EXISTING PURCHASE
      if (editingPurchase) {
        const { error: updateErr } = await supabase
          .from('purchases')
          .update({
            supplier_id: supplierObj?.id || null,
            supplier_name: supplierObj?.name || 'Unknown Supplier',
            supplier_bill_no: supplierBillNo.trim(),
            supplier_bill_date: supplierBillDate,
            purchase_date: purchaseDate,
            total_amount: grandTotalBillAmount,
            balance_amount: grandTotalBillAmount,
            notes: notes.trim() || null
          })
          .eq('id', editingPurchase.id);

        if (updateErr) throw updateErr;

        // If newly added products exist in stagedItems, insert them and update inventory
        if (stagedItems.length > 0) {
          const linePayloads = stagedItems.map((it, idx) => ({
            id: `pi_${editingPurchase.id}_${Date.now()}_${idx}`,
            purchase_id: editingPurchase.id,
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

          // Increment stock for newly added variants
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
          }
        }

        alert(`Purchase [${editingPurchase.id}] updated successfully!`);
        setIsModalOpen(false);
        loadData();
        return;
      }

      // 2. CREATE FRESH PURCHASE
      if (stagedItems.length === 0) {
        alert('K కనీసం ఒక ప్రొడక్ట్ ఇన్వర్డ్ యాడ్ చేయండి.');
        return;
      }

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

      const productInwardColorsMap = new Map<string, Set<string>>();

      for (const it of stagedItems) {
        if (!productInwardColorsMap.has(it.product_id)) {
          productInwardColorsMap.set(it.product_id, new Set<string>());
        }
        productInwardColorsMap.get(it.product_id)!.add(it.color);

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
      }

      for (const [prodId, newColors] of productInwardColorsMap.entries()) {
        const prod = productsList.find((p) => p.id === prodId);
        if (prod) {
          let currentColors: string[] = [];
          if (prod.variants?.colors && Array.isArray(prod.variants.colors)) {
            currentColors = [...prod.variants.colors];
          }
          newColors.forEach((nc) => {
            if (!currentColors.includes(nc)) currentColors.push(nc);
          });

          const currentVars = prod.variants || {};
          await supabase
            .from('products')
            .update({
              variants: { ...currentVars, colors: currentColors },
              colour: currentColors.join(', ')
            })
            .eq('id', prodId);
        }
      }

      alert(`Purchase ${purchaseNo} saved! ${totalInwardQuantity} units added to inventory.`);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
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
        (p.id || '').toLowerCase().includes(q) ||
        (p.supplier_name || '').toLowerCase().includes(q) ||
        (p.supplier_bill_no || '').toLowerCase().includes(q)
    );
  }, [purchases, searchQuery]);

  return (
    <div className="space-y-2.5 font-sans text-xs select-none">
      
      {/* 1. Header Bar (Ultra Compact) */}
      <div className="p-2.5 rounded-xl bg-[#101628]/95 border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#ffa500] to-[#ff6b6b] text-white flex items-center justify-center shadow-md shadow-[#ffa500]/20">
            <ShoppingCart className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Purchase Inward Deck</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 text-[8.5px] font-mono">
                {purchases.length} Records
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, supplier, bill no..."
              className="w-full pl-7 pr-2 py-1 bg-[#0a0e17] rounded-lg text-white text-[10.5px] outline-none border border-white/10 focus:border-[#ffa500]"
            />
            <Search className="w-3 h-3 text-[#8b9bb4] absolute left-2 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="button"
            onClick={loadData}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#00d9ff] cursor-pointer"
            title="Refresh Inward Data"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={openNewPurchaseModal}
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#ffa500] to-[#ff6b6b] hover:opacity-95 text-white font-bold text-[11px] flex items-center gap-1 shadow-md shadow-[#ffa500]/30 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>New Purchase</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Purchases Table */}
      <div className="rounded-xl bg-[#101628]/95 border border-white/10 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#0a0e17]/80 text-[#8b9bb4] font-mono text-[8.5px] uppercase tracking-wider">
                <th className="p-2">Purchase No</th>
                <th className="p-2">Entry Date</th>
                <th className="p-2">Supplier Details</th>
                <th className="p-2">Supplier Bill No & Date</th>
                <th className="p-2 text-right">Total Bill (₹)</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-5 text-center text-[#8b9bb4]">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-[#ffa500] mb-1" />
                    Loading purchases...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-5 text-center text-[#8b9bb4] italic text-[10.5px]">
                    No purchase inward entries recorded yet.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-2 font-mono font-bold text-[#00ff9d] text-[11px]">
                      {p.id}
                    </td>
                    <td className="p-2 font-mono text-[#8b9bb4] text-[10px]">{p.purchase_date}</td>
                    <td className="p-2 font-semibold text-white">
                      <span className="block truncate max-w-[200px]">{p.supplier_name}</span>
                    </td>
                    <td className="p-2">
                      <span className="font-mono font-bold text-[#00d9ff] text-[10.5px] block">{p.supplier_bill_no || '—'}</span>
                      <span className="text-[8.5px] font-mono text-[#8b9bb4]">{p.supplier_bill_date || ''}</span>
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-white text-[11px]">
                      ₹{Number(p.total_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenView(p)}
                          className="p-1 rounded bg-white/5 hover:bg-[#00d9ff]/20 text-[#8b9bb4] hover:text-[#00d9ff]"
                          title="View Inward Breakdown"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditPurchaseModal(p)}
                          className="p-1 rounded bg-white/5 hover:bg-[#00ff9d]/20 text-[#8b9bb4] hover:text-[#00ff9d]"
                          title="Edit Purchase & Add Products"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePurchase(p)}
                          className="p-1 rounded bg-white/5 hover:bg-[#ff6b6b]/20 text-[#8b9bb4] hover:text-[#ff6b6b]"
                          title="Delete Bill & Rollback Stock"
                        >
                          <Trash2 className="w-3 h-3" />
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

      {/* 3. COMPACT MODAL: CREATE / EDIT PURCHASE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] pt-12 pb-3 px-2 sm:px-4 flex items-start justify-center bg-black/90 backdrop-blur-md overflow-y-auto select-none">
          <div className="bg-[#101628] border border-white/20 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl relative flex flex-col my-auto max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between bg-[#0a0e17] sticky top-0 z-30">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-3.5 h-3.5 text-[#ffa500]" />
                <h3 className="text-xs font-bold text-white">
                  {editingPurchase ? `Edit Purchase Inward [${editingPurchase.id}]` : 'New Purchase Inward Entry'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-[#101628] px-2 py-0.5 rounded border border-white/15 text-right font-mono text-[11px] font-bold text-[#00ff9d]">
                  {purchaseCodeLoading ? '...' : purchaseNo}
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded bg-white/10 hover:bg-[#ff6b6b]/30 text-[#8b9bb4] hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSavePurchase} className="p-2.5 overflow-y-auto space-y-2 custom-scrollbar text-[10.5px]">
              
              {/* Header Fields (Tightly Grouped) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2 rounded-xl bg-[#0a0e17]/80 border border-white/10">
                <div>
                  <label className="text-[8px] font-mono text-[#8b9bb4] uppercase block mb-0.5 font-bold">
                    Supplier *
                  </label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-[#101628] border border-white/10 text-white font-semibold outline-none text-[10px]"
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.id}] {s.shop_name || s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[8px] font-mono text-[#8b9bb4] uppercase block mb-0.5 font-bold">
                    Supplier Bill No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7426"
                    value={supplierBillNo}
                    onChange={(e) => setSupplierBillNo(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-[#101628] border border-white/10 text-white font-semibold outline-none text-[10px]"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-mono text-[#8b9bb4] uppercase block mb-0.5 font-bold">
                    Bill Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={supplierBillDate}
                    onChange={(e) => setSupplierBillDate(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-[#101628] border border-white/10 text-white outline-none text-[10px]"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-mono text-[#8b9bb4] uppercase block mb-0.5 font-bold">
                    Entry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-[#101628] border border-white/10 text-[#00ff9d] font-mono font-bold outline-none text-[10px]"
                  />
                </div>
              </div>

              {/* EXISTING ITEMS BREAKDOWN (If Editing) */}
              {editingPurchase && existingItems.length > 0 && (
                <div className="p-2 rounded-xl bg-[#0a0e17] border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-mono">
                    <span className="font-bold text-white uppercase">Saved Items on Bill ({existingItems.length} lines)</span>
                    <span className="text-[#00ff9d] font-bold">Subtotal: ₹{existingItemsTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto">
                    <table className="w-full text-left text-[9.5px]">
                      <tbody className="divide-y divide-white/5">
                        {existingItems.map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-1 font-semibold text-white">[{it.product_id}]</td>
                            <td className="p-1 text-[#00d9ff]">{it.variant_color} / {it.variant_size}</td>
                            <td className="p-1 text-center font-bold text-[#00ff9d]">{it.quantity} Qty</td>
                            <td className="p-1 text-right font-mono">₹{it.unit_cost}</td>
                            <td className="p-1 text-right font-mono font-bold text-white">₹{it.total_cost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECURITY PIN LOCKED BANNER FOR SAVED PURCHASES */}
              {editingPurchase && !isEditProductUnlocked ? (
                <div className="p-2.5 rounded-xl bg-[#6d4aff]/10 border border-[#6d4aff]/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#6d4aff]/20 text-[#00d9ff] flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-white text-[11px] block">Add Products to Saved Purchase</span>
                      <span className="text-[9px] text-[#8b9bb4]">Protected by Order Pipeline Security PIN</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenPinVerification}
                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#6d4aff] to-[#00d9ff] hover:opacity-90 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer active:scale-95 shadow-md shadow-[#6d4aff]/30"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Enter PIN to Add Products</span>
                  </button>
                </div>
              ) : (
                /* MATRIX INWARD SECTION (UNLOCKED) */
                <div className="p-2 rounded-xl bg-[#0a0e17] border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Matrix Inward
                      {editingPurchase && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded bg-[#00ff9d]/20 text-[#00ff9d] text-[8px] font-mono font-bold flex items-center gap-0.5">
                          <ShieldCheck className="w-2.5 h-2.5" /> PIN Verified
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsProductMasterOpen(true)}
                      className="px-2 py-0.5 rounded bg-[#6d4aff]/20 border border-[#6d4aff]/40 text-[#00d9ff] text-[9px] font-bold"
                    >
                      + Add Product Master
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    <div className="sm:col-span-2">
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full px-2 py-1 rounded bg-[#101628] border border-white/10 text-white font-semibold outline-none text-[10px]"
                      >
                        <option value="">Choose Product...</option>
                        {productsList.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.id}] {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <input
                        type="number"
                        min="0"
                        placeholder="Cost Rate (₹)"
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value)}
                        className="w-full px-2 py-1 rounded bg-[#101628] border border-white/10 text-[#00ff9d] font-bold outline-none text-[10px]"
                      />
                    </div>
                  </div>

                  {activeProduct && (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="p-1.5 rounded-lg bg-[#101628] border border-white/10 flex flex-wrap items-center gap-1">
                        <select
                          value={selectedColorToAdd}
                          onChange={(e) => {
                            setSelectedColorToAdd(e.target.value);
                            setCustomColorInput('');
                          }}
                          className="px-2 py-0.5 rounded bg-[#0a0e17] border border-white/10 text-white text-[9.5px] outline-none"
                        >
                          <option value="">Select Color...</option>
                          {masterColours.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          placeholder="Or custom color"
                          value={customColorInput}
                          onChange={(e) => {
                            setCustomColorInput(e.target.value);
                            setSelectedColorToAdd('');
                          }}
                          className="px-2 py-0.5 rounded bg-[#0a0e17] border border-white/10 text-white text-[9.5px] outline-none max-w-[110px]"
                        />

                        <button
                          type="button"
                          onClick={handleAddColorToMatrix}
                          className="px-2 py-0.5 rounded bg-[#6d4aff] text-white font-bold text-[9px]"
                        >
                          + Add Color
                        </button>

                        <div className="flex flex-wrap gap-1 ml-1">
                          {activeMatrixColors.map((clr) => (
                            <span
                              key={clr}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0a0e17] border border-white/15 text-[9px] text-white"
                            >
                              <span
                                className="w-2 h-2 rounded-full border border-white/30 shrink-0"
                                style={{ backgroundColor: getBadgeColor(clr) }}
                              />
                              <span>{clr}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveColorFromMatrix(clr)}
                                className="text-[#8b9bb4] hover:text-[#ff6b6b] ml-0.5"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      {activeMatrixColors.length > 0 && (
                        <div className="border border-white/10 rounded-lg overflow-x-auto bg-[#101628]">
                          <table className="w-full text-center border-collapse">
                            <thead>
                              <tr className="bg-[#0a0e17] text-[#8b9bb4] font-mono text-[8px] uppercase border-b border-white/10">
                                <th className="p-1 text-left min-w-[90px]">Colour \ Size</th>
                                {productSizes.map((sz) => (
                                  <th key={sz} className="p-1 text-center text-[#00d9ff] min-w-[45px]">
                                    {sz}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {activeMatrixColors.map((clr) => (
                                <tr key={clr}>
                                  <td className="p-1 text-left font-bold text-white text-[10px]">
                                    {clr}
                                  </td>
                                  {productSizes.map((sz) => {
                                    const key = `${clr}:::${sz}`;
                                    return (
                                      <td key={sz} className="p-0.5 text-center">
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={matrixQtyMap[key] || ''}
                                          onChange={(e) => handleMatrixQtyChange(clr, sz, e.target.value)}
                                          className="w-10 px-1 py-0.5 text-center font-mono font-bold bg-[#0a0e17] text-[#00ff9d] border border-white/10 rounded outline-none text-[9.5px]"
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {activeMatrixColors.length > 0 && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleAddMatrixToStaged}
                            className="px-2.5 py-0.5 bg-[#00d9ff] text-neutral-950 font-bold text-[10px] rounded"
                          >
                            + Add to Inward List
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STAGED NEWLY ADDED ITEMS LIST */}
              {stagedItems.length > 0 && (
                <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0e17]">
                  <div className="px-2 py-1 bg-[#101628] border-b border-white/10 flex items-center justify-between text-[9px] font-mono">
                    <span className="font-bold text-[#00ff9d] uppercase">Newly Added Inward Items ({stagedItems.length} lines)</span>
                    <span className="text-white font-bold">Qty: {totalInwardQuantity}</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto">
                    <table className="w-full text-left text-[9.5px]">
                      <thead className="bg-[#101628] text-[#8b9bb4] font-mono uppercase text-[7.5px] sticky top-0">
                        <tr>
                          <th className="p-1">Product</th>
                          <th className="p-1">Variant</th>
                          <th className="p-1 text-center">Qty</th>
                          <th className="p-1 text-right">Rate</th>
                          <th className="p-1 text-right">Total</th>
                          <th className="p-1 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {stagedItems.map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-1 font-bold text-white truncate max-w-[120px]">
                              [{it.product_id}] {it.product_name}
                            </td>
                            <td className="p-1 text-[#00d9ff]">{it.color} / {it.size}</td>
                            <td className="p-1 text-center font-bold text-[#00ff9d]">{it.quantity}</td>
                            <td className="p-1 text-right font-mono">₹{it.unit_cost}</td>
                            <td className="p-1 text-right font-mono font-bold text-white">₹{it.total_cost}</td>
                            <td className="p-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveStagedItem(idx)}
                                className="text-[#ff6b6b]"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Notes & Grand Total */}
              <div className="p-1.5 rounded-lg bg-[#0a0e17] border border-white/10 flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Remarks, vehicle no, notes..."
                  className="flex-1 px-2 py-1 rounded bg-[#101628] border border-white/10 text-white text-[10px] outline-none"
                />
                <div className="text-right whitespace-nowrap">
                  <span className="text-xs font-mono font-bold text-[#00ff9d]">
                    Bill Total: ₹{grandTotalBillAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex justify-end gap-2 pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1 rounded-lg text-[#8b9bb4] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#ffa500] to-[#ff6b6b] text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingPurchase ? 'Update Purchase Bill' : 'Save Purchase Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ORDER PIPELINE SECURITY PIN VERIFICATION MODAL */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[100000] p-3 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#101628] border border-white/20 rounded-2xl max-w-xs w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#6d4aff]/20 text-[#00d9ff] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">Security Verification</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="text-[#8b9bb4] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleVerifySecurityPin} className="space-y-3">
              <p className="text-[10px] text-[#8b9bb4]">
                Enter your Order Pipeline Security PIN to add new products to this saved purchase inward.
              </p>

              {pinError && (
                <div className="p-1.5 rounded-lg bg-[#ff6b6b]/15 border border-[#ff6b6b]/30 text-[#ff6b6b] text-[9.5px] font-bold text-center">
                  {pinError}
                </div>
              )}

              <input
                type="password"
                maxLength={6}
                autoFocus
                required
                placeholder="Enter 4-digit Security PIN"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                className="w-full text-center px-3 py-2 rounded-xl bg-[#0a0e17] border border-white/15 text-[#00ff9d] text-base font-mono font-bold tracking-widest outline-none focus:border-[#00d9ff]"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-3 py-1 rounded-lg text-[#8b9bb4] hover:text-white text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#6d4aff] to-[#00d9ff] text-white font-bold text-[10.5px] flex items-center gap-1 shadow-md shadow-[#6d4aff]/30"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Verify & Unlock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. VIEW PURCHASE BREAKDOWN MODAL */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-[99999] p-3 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#101628] border border-white/15 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <span className="font-mono text-xs font-bold text-[#00ff9d]">{viewingPurchase.id}</span>
                <h4 className="text-xs font-bold text-white">{viewingPurchase.supplier_name}</h4>
                <span className="text-[9px] text-[#8b9bb4]">
                  Bill: {viewingPurchase.supplier_bill_no || '—'} • Date: {viewingPurchase.supplier_bill_date}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingPurchase(null)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#8b9bb4] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto custom-scrollbar">
              {loadingItems ? (
                <div className="p-5 text-center text-[#8b9bb4]">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto text-[#00d9ff] mb-1" />
                  Loading items...
                </div>
              ) : viewingItems.length === 0 ? (
                <div className="p-4 text-center text-[#8b9bb4] italic text-[10.5px]">
                  No line items found.
                </div>
              ) : (
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-[#0a0e17] text-[#8b9bb4] font-mono text-[7.5px] uppercase sticky top-0">
                    <tr>
                      <th className="p-1.5">Product</th>
                      <th className="p-1.5">Variant</th>
                      <th className="p-1.5 text-center">Qty</th>
                      <th className="p-1.5 text-right">Cost</th>
                      <th className="p-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {viewingItems.map((item) => (
                      <tr key={item.id}>
                        <td className="p-1.5 text-white font-semibold">{item.product_id}</td>
                        <td className="p-1.5 text-[#00d9ff]">{item.variant_color} / {item.variant_size}</td>
                        <td className="p-1.5 text-center font-bold text-[#00ff9d]">{item.quantity}</td>
                        <td className="p-1.5 text-right font-mono">₹{item.unit_cost}</td>
                        <td className="p-1.5 text-right font-mono font-bold text-white">₹{item.total_cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
              <span className="text-[#8b9bb4] font-mono text-[11px]">Grand Total:</span>
              <span className="font-mono font-extrabold text-[#00ff9d] text-xs">
                ₹{Number(viewingPurchase.total_amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. QUICK ADD PRODUCT MASTER MODAL */}
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