import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Eye,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PurchaseReturnsManagerProps {
  currentUser?: { role?: string | null; full_name?: string | null } | null;
}

interface PurchaseRecord {
  id: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_bill_no?: string | null;
  supplier_bill_date?: string | null;
  purchase_date?: string | null;
  total_amount?: number | null;
}

interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product_name?: string | null;
  variant_color: string;
  variant_size: string;
  quantity: number;
  unit_cost: number;
  total_cost?: number | null;
}

interface ReturnLine extends PurchaseItem {
  alreadyReturned: number;
  returnable: number;
  returnQty: number;
}

interface ReturnRecord {
  id: string;
  purchase_id: string;
  supplier_id?: string | null;
  supplier_name: string;
  original_bill_no?: string | null;
  return_date: string;
  total_quantity: number;
  total_amount: number;
  reason?: string | null;
  notes?: string | null;
  status: string;
}

const clean = (v: unknown) => String(v ?? '').trim();
const money = (v: number) => `₹${Number(v || 0).toFixed(2)}`;

function roleFlags(roleValue: string | null | undefined) {
  const role = clean(roleValue).toLowerCase();
  return {
    role,
    canView: ['admin', 'manager', 'operations'].includes(role),
    canCreate: ['admin', 'manager', 'operations'].includes(role),
    canEdit: ['admin', 'manager'].includes(role),
    canDelete: role === 'admin'
  };
}

export default function PurchaseReturnsManager({ currentUser }: PurchaseReturnsManagerProps) {
  const { role, canView, canCreate, canEdit, canDelete } = roleFlags(currentUser?.role);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [returnedByItem, setReturnedByItem] = useState<Record<string, number>>({});
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [search, setSearch] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [showEntry, setShowEntry] = useState(false);
  const [viewReturn, setViewReturn] = useState<ReturnRecord | null>(null);
  const [returnDetailItems, setReturnDetailItems] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingReturn, setEditingReturn] = useState<ReturnRecord | null>(null);
  const [editReturnItems, setEditReturnItems] = useState<any[]>([]);
  const [editReturnQty, setEditReturnQty] = useState<Record<string, number>>({});
  const [editReturnDate, setEditReturnDate] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [message, setMessage] = useState<{ type: 'info' | 'error' | 'success'; title: string; body: string; reference?: string } | null>(null);
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});

  const selectedPurchase = useMemo(
    () => purchases.find((p) => p.id === selectedPurchaseId) || null,
    [purchases, selectedPurchaseId]
  );

  const lines: ReturnLine[] = useMemo(() => purchaseItems.map((item) => {
    const alreadyReturned = Number(returnedByItem[item.id] || 0);
    const returnable = Math.max(0, Number(item.quantity || 0) - alreadyReturned);
    return { ...item, alreadyReturned, returnable, returnQty: Number(returnQty[item.id] || 0) };
  }), [purchaseItems, returnedByItem, returnQty]);

  const filteredReturns = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return returns;
    return returns.filter((r) => [r.id, r.purchase_id, r.supplier_name, r.original_bill_no].some((v) => clean(v).toLowerCase().includes(q)));
  }, [returns, search]);

  const totalQty = lines.reduce((sum, l) => sum + Math.max(0, Number(l.returnQty || 0)), 0);
  const totalAmount = lines.reduce((sum, l) => sum + Math.max(0, Number(l.returnQty || 0)) * Number(l.unit_cost || 0), 0);

  const show = (type: 'info' | 'error' | 'success', title: string, body: string, reference?: string) => {
    setMessage({ type, title, body, reference });
  };

  const rebuildSupplierLedger = async (supplierId: string) => {
    const sid = clean(supplierId);
    if (!sid) throw new Error('Supplier ID is required for supplier ledger update.');

    const { data: ledgerRows, error: ledgerError } = await supabase
      .from('supplier_ledger')
      .select('id,amount,created_at')
      .eq('supplier_id', sid)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    if (ledgerError) throw ledgerError;

    let balance = 0;
    for (const row of ledgerRows || []) {
      balance += Number(row.amount || 0);
      const { error } = await supabase
        .from('supplier_ledger')
        .update({ balance_after: balance })
        .eq('id', row.id);
      if (error) throw error;
    }

    const { error: supplierError } = await supabase
      .from('suppliers')
      .update({ balance_due: balance })
      .eq('id', sid);
    if (supplierError) throw supplierError;

    return balance;
  };

  const addSupplierLedgerEntry = async ({
    supplierId,
    amount,
    transactionType,
    referenceId,
    description
  }: {
    supplierId: string;
    amount: number;
    transactionType: string;
    referenceId: string;
    description: string;
  }) => {
    const sid = clean(supplierId);
    const rid = clean(referenceId);
    if (!sid || !rid || !transactionType) throw new Error('Supplier ledger reference is incomplete.');

    const { data: existing, error: existingError } = await supabase
      .from('supplier_ledger')
      .select('id')
      .eq('reference_id', rid)
      .eq('reference_type', 'PURCHASE_RETURN')
      .eq('transaction_type', transactionType)
      .limit(1);
    if (existingError) throw existingError;
    if (existing && existing.length > 0) {
      throw new Error(`Supplier ledger entry already exists for ${rid} (${transactionType}).`);
    }

    const ledgerId = `led_pr_${rid}_${transactionType.toLowerCase()}_${Date.now()}`;
    const { error: insertError } = await supabase
      .from('supplier_ledger')
      .insert({
        id: ledgerId,
        supplier_id: sid,
        purchase_id: null,
        transaction_type: transactionType,
        amount: Number(amount || 0),
        balance_after: 0,
        description,
        reference_id: rid,
        reference_type: 'PURCHASE_RETURN'
      });
    if (insertError) throw insertError;

    try {
      await rebuildSupplierLedger(sid);
    } catch (err) {
      await supabase.from('supplier_ledger').delete().eq('id', ledgerId);
      throw err;
    }

    return ledgerId;
  };

  const loadData = async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([
        supabase.from('purchases').select('id,supplier_id,supplier_name,supplier_bill_no,supplier_bill_date,purchase_date,total_amount').order('purchase_date', { ascending: false }),
        supabase.from('purchase_returns').select('*').order('created_at', { ascending: false })
      ]);
      if (pRes.error) throw pRes.error;
      if (rRes.error) throw rRes.error;
      setPurchases((pRes.data || []) as PurchaseRecord[]);
      setReturns((rRes.data || []) as ReturnRecord[]);
    } catch (err: any) {
      show('error', 'Purchase Returns — Load Failed', err?.message || 'Unable to load purchase returns.', 'WHERE: Inventory → Purchase → Returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [canView]);

  const loadPurchaseItems = async (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    setPurchaseItems([]);
    setReturnedByItem({});
    setReturnQty({});
    if (!purchaseId) return;
    try {
      // purchase_items does not store product_name in the current Purchase module.
      // Resolve the display name from the central products master using product_id.
      const { data, error } = await supabase
        .from('purchase_items')
        .select('id,purchase_id,product_id,variant_color,variant_size,quantity,unit_cost,total_cost')
        .eq('purchase_id', purchaseId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const rawItems = data || [];
      const productIds = Array.from(
        new Set(
          rawItems
            .map((item: any) => clean(item.product_id))
            .filter(Boolean)
        )
      );

      const productNameMap: Record<string, string> = {};

      if (productIds.length) {
        const { data: products, error: productError } = await supabase
          .from('products')
          .select('id,name')
          .in('id', productIds);

        if (productError) throw productError;

        for (const product of products || []) {
          const id = clean((product as any).id);
          if (id) {
            productNameMap[id] = clean((product as any).name) || id;
          }
        }
      }

      const items = rawItems.map((item: any) => ({
        ...item,
        product_name:
          productNameMap[clean(item.product_id)] ||
          clean(item.product_id) ||
          'Unknown Product'
      })) as PurchaseItem[];

      const ids = items.map((x) => x.id);
      let aggregate: Record<string, number> = {};
      if (ids.length) {
        const { data: rd, error: re } = await supabase
          .from('purchase_return_items')
          .select('purchase_item_id,return_quantity')
          .in('purchase_item_id', ids);
        if (re) throw re;
        for (const row of rd || []) {
          const id = clean(row.purchase_item_id);
          aggregate[id] = (aggregate[id] || 0) + Number(row.return_quantity || 0);
        }
      }
      setPurchaseItems(items);
      setReturnedByItem(aggregate);
    } catch (err: any) {
      show('error', 'Purchase Items — Load Failed', err?.message || 'Unable to load original purchase items.', `WHERE: Purchase Return Entry → ${purchaseId}`);
    }
  };

  const getNextReturnNo = async () => {
    const { data, error } = await supabase.from('purchase_returns').select('id').like('id', 'KFPR%').order('id', { ascending: false }).limit(1);
    if (error) throw error;
    const latest = data?.[0]?.id ? String(data[0].id) : '';
    const match = latest.match(/(\d+)$/);
    const next = match ? Number(match[1]) + 1 : 1;
    return `KFPR${String(next).padStart(4, '0')}`;
  };

  const handleOpenEntry = () => {
    if (!canCreate) {
      show('error', 'Access Restricted', 'Your role can view Purchase Returns but cannot create a return.', `ROLE: ${role.toUpperCase()} | ACTION: CREATE`);
      return;
    }
    setSelectedPurchaseId('');
    setPurchaseItems([]);
    setReturnedByItem({});
    setReturnQty({});
    setReason('');
    setNotes('');
    setReturnDate(new Date().toISOString().slice(0, 10));
    setShowEntry(true);
  };

  const handleQtyChange = (item: ReturnLine, raw: string) => {
    const qty = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(qty) || qty < 0) {
      show('error', 'Invalid Return Quantity', 'Return quantity must be zero or greater.', `WHERE: Return Entry → ${item.product_id} → ${item.variant_color} / ${item.variant_size}`);
      return;
    }
    if (qty > item.returnable) {
      show('error', 'Return Quantity Exceeds Returnable Quantity', `You entered ${qty}, but only ${item.returnable} is available for return.`, `WHERE: Return Entry → ${item.product_id} → ${item.variant_color} / ${item.variant_size}`);
      return;
    }
    setReturnQty((prev) => ({ ...prev, [item.id]: qty }));
  };

  const handleSave = async () => {
    if (!canCreate) return;
    if (!selectedPurchase) {
      show('error', 'Original Purchase Required', 'Select the original purchase before saving the return.', 'WHERE: Inventory → Purchase → Returns → Return Entry');
      return;
    }
    const selectedLines = lines.filter((l) => Number(l.returnQty || 0) > 0);
    if (!selectedLines.length) {
      show('error', 'Return Items Required', 'Select at least one variant and enter a return quantity.', `REFERENCE: ${selectedPurchase.id}`);
      return;
    }
    for (const l of selectedLines) {
      if (l.returnQty > l.returnable) {
        show('error', 'Return Quantity Not Allowed', `${l.returnQty} cannot be returned. Maximum available is ${l.returnable}.`, `REFERENCE: ${l.product_id} / ${l.variant_color} / ${l.variant_size}`);
        return;
      }
    }

    setSaving(true);
    const applied: Array<{ productId: string; color: string; size: string; qty: number }> = [];
    let returnId = '';
    try {
      returnId = await getNextReturnNo();
      const movementResults: Array<{ productId: string; color: string; size: string; qty: number }> = [];
      for (const l of selectedLines) {
        const { error } = await supabase.rpc('record_inventory_movement', {
          p_product_id: l.product_id,
          p_variant_color: l.variant_color,
          p_variant_size: l.variant_size,
          p_stock_delta: -l.returnQty,
          p_reserved_delta: 0,
          p_movement_type: 'PURCHASE_RETURN',
          p_reference_id: returnId,
          p_notes: `Purchase return against ${selectedPurchase.id}`
        });
        if (error) throw error;
        movementResults.push({ productId: l.product_id, color: l.variant_color, size: l.variant_size, qty: l.returnQty });
        applied.push({ productId: l.product_id, color: l.variant_color, size: l.variant_size, qty: l.returnQty });
      }

      const { error: masterErr } = await supabase.from('purchase_returns').insert({
        id: returnId,
        purchase_id: selectedPurchase.id,
        supplier_id: selectedPurchase.supplier_id || null,
        supplier_name: selectedPurchase.supplier_name || 'Unknown Supplier',
        original_bill_no: selectedPurchase.supplier_bill_no || null,
        return_date: returnDate,
        total_quantity: totalQty,
        total_amount: totalAmount,
        reason: reason.trim() || null,
        notes: notes.trim() || null,
        status: 'completed'
      });
      if (masterErr) throw masterErr;

      const { error: itemErr } = await supabase.from('purchase_return_items').insert(
        selectedLines.map((l) => ({
          id: `${returnId}_${l.id}`,
          return_id: returnId,
          purchase_item_id: l.id,
          product_id: l.product_id,
          product_name: l.product_name || l.product_id,
          variant_color: l.variant_color,
          variant_size: l.variant_size,
          purchased_quantity: l.quantity,
          already_returned_quantity: l.alreadyReturned,
          return_quantity: l.returnQty,
          unit_cost: l.unit_cost,
          total_cost: l.returnQty * Number(l.unit_cost || 0),
          reason: reason.trim() || null
        }))
      );
      if (itemErr) throw itemErr;

      if (totalAmount > 0) {
        await addSupplierLedgerEntry({
          supplierId: selectedPurchase.supplier_id || '',
          amount: -totalAmount,
          transactionType: 'PURCHASE_RETURN',
          referenceId: returnId,
          description: `Purchase return ${returnId} against ${selectedPurchase.id}`
        });
      }

      show('success', 'Purchase Return Completed', `Return ${returnId} was saved and stock was reduced for the selected variants.`, `REFERENCE: ${returnId} | PURCHASE: ${selectedPurchase.id}`);
      setShowEntry(false);
      await loadData();
    } catch (err: any) {
      // Remove any partially-created return records/ledger before compensating stock.
      if (returnId) {
        await supabase.from('purchase_return_items').delete().eq('return_id', returnId);
        await supabase.from('purchase_returns').delete().eq('id', returnId);
        const { error: ledgerCleanupError } = await supabase
          .from('supplier_ledger')
          .delete()
          .eq('reference_id', returnId)
          .eq('reference_type', 'PURCHASE_RETURN');
        if (!ledgerCleanupError && selectedPurchase?.supplier_id) {
          await rebuildSupplierLedger(selectedPurchase.supplier_id);
        }
      }
      for (const a of applied.reverse()) {
        await supabase.rpc('record_inventory_movement', {
          p_product_id: a.productId,
          p_variant_color: a.color,
          p_variant_size: a.size,
          p_stock_delta: a.qty,
          p_reserved_delta: 0,
          p_movement_type: 'PURCHASE_RETURN_ROLLBACK',
          p_reference_id: returnId || selectedPurchase.id,
          p_notes: 'Compensation after failed Purchase Return save'
        });
      }
      show('error', 'Purchase Return Not Completed', err?.message || 'Return could not be saved. Any stock adjustment already made was compensated.', `WHERE: Inventory → Purchase → Returns → Save | REFERENCE: ${returnId || selectedPurchase.id}`);
    } finally {
      setSaving(false);
    }
  };

  const loadReturnItems = async (returnId: string) => {
    setDetailLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_return_items')
        .select('*')
        .eq('return_id', returnId)
        .order('id', { ascending: true });
      if (error) throw error;

      if (data && data.length > 0) {
        setReturnDetailItems(data);
        return data;
      }

      // Recovery path for an older/incomplete Purchase Return master record.
      // If the line table is empty, reconstruct the returned variants from the
      // inventory movement reference and the original purchase items.
      const { data: retMaster, error: masterError } = await supabase
        .from('purchase_returns')
        .select('purchase_id')
        .eq('id', returnId)
        .maybeSingle();
      if (masterError) throw masterError;

      const purchaseId = clean(retMaster?.purchase_id);
      if (!purchaseId) {
        setReturnDetailItems([]);
        return [];
      }

      const [{ data: movements, error: movementError }, { data: purchaseItemsData, error: purchaseItemsError }] = await Promise.all([
        supabase
          .from('inventory_movements')
          .select('product_id,variant_color,variant_size,stock_delta,quantity')
          .eq('reference_id', returnId)
          .eq('movement_type', 'PURCHASE_RETURN'),
        supabase
          .from('purchase_items')
          .select('id,purchase_id,product_id,product_name,variant_color,variant_size,quantity,unit_cost,total_cost')
          .eq('purchase_id', purchaseId)
      ]);
      if (movementError) throw movementError;
      if (purchaseItemsError) throw purchaseItemsError;

      const rebuilt: any[] = [];
      for (const movement of movements || []) {
        const productId = clean(movement.product_id);
        const color = clean(movement.variant_color);
        const size = clean(movement.variant_size);
        const returnedQty = Math.abs(Number(movement.stock_delta ?? movement.quantity ?? 0));
        if (!productId || !color || !size || returnedQty <= 0) continue;

        const purchaseItem = (purchaseItemsData || []).find((item: any) =>
          clean(item.product_id) === productId &&
          clean(item.variant_color) === color &&
          clean(item.variant_size) === size
        );
        if (!purchaseItem) continue;

        rebuilt.push({
          id: `${returnId}_${purchaseItem.id}`,
          return_id: returnId,
          purchase_item_id: purchaseItem.id,
          product_id: productId,
          product_name: clean(purchaseItem.product_name) || productId,
          variant_color: color,
          variant_size: size,
          purchased_quantity: Number(purchaseItem.quantity || 0),
          already_returned_quantity: 0,
          return_quantity: returnedQty,
          unit_cost: Number(purchaseItem.unit_cost || 0),
          total_cost: returnedQty * Number(purchaseItem.unit_cost || 0),
          reason: null
        });
      }

      setReturnDetailItems(rebuilt);
      return rebuilt;
    } catch (err: any) {
      show('error', 'Return Details — Load Failed', err?.message || 'Unable to load Purchase Return items.', `REFERENCE: ${returnId}`);
      setReturnDetailItems([]);
      return [];
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenView = async (ret: ReturnRecord) => {
    setViewReturn(ret);
    await loadReturnItems(ret.id);
  };

  const handleOpenEdit = async (ret: ReturnRecord) => {
    if (!canEdit) {
      show('error', 'Access Restricted', 'Your role can view Purchase Returns but cannot edit a completed return.', `ROLE: ${role.toUpperCase()} | ACTION: EDIT | RETURN: ${ret.id}`);
      return;
    }
    let items = await loadReturnItems(ret.id);
    if (!items.length) {
      show('error', 'Edit Not Available', 'This Purchase Return has no recoverable line items. The original return line data is required before editing.', `REFERENCE: ${ret.id}`);
      return;
    }

    // If the return was created before line-item persistence was available,
    // repair the missing child rows before enabling Edit.
    const { data: storedItems, error: storedItemsError } = await supabase
      .from('purchase_return_items')
      .select('id')
      .eq('return_id', ret.id);
    if (storedItemsError) throw storedItemsError;

    if (!storedItems?.length) {
      const repairRows = items.map((item: any) => ({
        id: item.id,
        return_id: ret.id,
        purchase_item_id: item.purchase_item_id,
        product_id: item.product_id,
        product_name: item.product_name || item.product_id,
        variant_color: item.variant_color,
        variant_size: item.variant_size,
        purchased_quantity: Number(item.purchased_quantity || 0),
        already_returned_quantity: Number(item.already_returned_quantity || 0),
        return_quantity: Number(item.return_quantity || 0),
        unit_cost: Number(item.unit_cost || 0),
        total_cost: Number(item.total_cost || 0),
        reason: item.reason || ret.reason || null
      }));
      const { error: repairError } = await supabase
        .from('purchase_return_items')
        .upsert(repairRows, { onConflict: 'id' });
      if (repairError) throw repairError;

      items = await loadReturnItems(ret.id);
    }

    if (!items.length) {
      show('error', 'Edit Not Available', 'Purchase Return line items could not be recovered safely.', `REFERENCE: ${ret.id}`);
      return;
    }

    setEditingReturn(ret);
    setEditReturnItems(items);
    setEditReturnDate(ret.return_date || new Date().toISOString().slice(0, 10));
    setEditReason(ret.reason || '');
    setEditNotes(ret.notes || '');
    const qtyMap: Record<string, number> = {};
    for (const item of items) qtyMap[String(item.id)] = Number(item.return_quantity || 0);
    setEditReturnQty(qtyMap);
    setViewReturn(null);
  };

  const handleEditQtyChange = (item: any, raw: string) => {
    const qty = raw === '' ? 0 : Number(raw);
    const purchasedQty = Number(item.purchased_quantity || 0);
    if (!Number.isFinite(qty) || qty < 0 || qty > purchasedQty) {
      show('error', 'Invalid Return Quantity', `Quantity must be between 0 and ${purchasedQty}.`, `REFERENCE: ${editingReturn?.id || ''} | VARIANT: ${item.product_id} / ${item.variant_color} / ${item.variant_size}`);
      return;
    }
    setEditReturnQty((prev) => ({ ...prev, [String(item.id)]: qty }));
  };

  const handleSaveEdit = async () => {
    if (!editingReturn || !canEdit) return;
    if (!editReturnDate) {
      show('error', 'Return Date Required', 'Select the Purchase Return date before saving.', `REFERENCE: ${editingReturn.id}`);
      return;
    }

    const changes = editReturnItems.map((item) => ({
      item,
      oldQty: Number(item.return_quantity || 0),
      newQty: Number(editReturnQty[String(item.id)] || 0)
    })).filter((x) => x.oldQty !== x.newQty);

    if (!changes.length && editReturnDate === editingReturn.return_date && editReason.trim() === (editingReturn.reason || '').trim() && editNotes.trim() === (editingReturn.notes || '').trim()) {
      show('info', 'No Changes', 'There are no changes to save.', `REFERENCE: ${editingReturn.id}`);
      return;
    }

    if (!window.confirm(`Update ${editingReturn.id}? Stock will be adjusted according to the quantity changes.`)) return;

    setSavingEdit(true);
    const applied: Array<{ productId: string; color: string; size: string; delta: number }> = [];
    const updatedItems: Array<{ id: string; oldQty: number; oldTotal: number; oldReason: string | null }> = [];
    const oldTotalAmount = Number(editingReturn.total_amount || 0);
    let editLedgerReference = '';
    try {
      for (const c of changes) {
        const delta = c.newQty - c.oldQty;
        if (delta === 0) continue;
        const { error } = await supabase.rpc('record_inventory_movement', {
          p_product_id: c.item.product_id,
          p_variant_color: c.item.variant_color,
          p_variant_size: c.item.variant_size,
          p_stock_delta: -delta,
          p_reserved_delta: 0,
          p_movement_type: 'PURCHASE_RETURN_ADJUSTMENT',
          p_reference_id: editingReturn.id,
          p_notes: `Purchase return quantity edited: ${c.oldQty} → ${c.newQty}`
        });
        if (error) throw error;
        applied.push({ productId: c.item.product_id, color: c.item.variant_color, size: c.item.variant_size, delta });
      }

      for (const c of changes) {
        const { error } = await supabase
          .from('purchase_return_items')
          .update({
            return_quantity: c.newQty,
            total_cost: c.newQty * Number(c.item.unit_cost || 0),
            reason: editReason.trim() || null
          })
          .eq('id', c.item.id)
          .eq('return_id', editingReturn.id);
        if (error) throw error;
        updatedItems.push({
          id: c.item.id,
          oldQty: c.oldQty,
          oldTotal: Number(c.item.total_cost || 0),
          oldReason: c.item.reason ?? null
        });
      }

      const newTotalQty = editReturnItems.reduce((sum, item) => sum + Number(editReturnQty[String(item.id)] || 0), 0);
      const newTotalAmount = editReturnItems.reduce((sum, item) => sum + Number(editReturnQty[String(item.id)] || 0) * Number(item.unit_cost || 0), 0);
      const { error: masterError } = await supabase
        .from('purchase_returns')
        .update({
          return_date: editReturnDate,
          total_quantity: newTotalQty,
          total_amount: newTotalAmount,
          reason: editReason.trim() || null,
          notes: editNotes.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingReturn.id);
      if (masterError) throw masterError;

      const ledgerDelta = oldTotalAmount - newTotalAmount;
      if (Math.abs(ledgerDelta) > 0.000001) {
        let supplierId = clean(editingReturn.supplier_id);
        if (!supplierId) {
          const { data: returnMaster, error: returnMasterError } = await supabase
            .from('purchase_returns')
            .select('supplier_id')
            .eq('id', editingReturn.id)
            .maybeSingle();
          if (returnMasterError) throw returnMasterError;
          supplierId = clean(returnMaster?.supplier_id);
        }
        if (!supplierId) throw new Error(`Supplier ID missing for Purchase Return ${editingReturn.id}. Supplier ledger cannot be updated safely.`);

        editLedgerReference = `${editingReturn.id}_EDIT_${Date.now()}`;
        await addSupplierLedgerEntry({
          supplierId,
          amount: ledgerDelta,
          transactionType: 'PURCHASE_RETURN_ADJUSTMENT',
          referenceId: editLedgerReference,
          description: `Purchase return ${editingReturn.id} edited: ${money(oldTotalAmount)} → ${money(newTotalAmount)}`
        });
      }

      show('success', 'Purchase Return Updated', `${editingReturn.id} was updated and stock was adjusted safely.`, `REFERENCE: ${editingReturn.id}`);
      setEditingReturn(null);
      await loadData();
    } catch (err: any) {
      if (editLedgerReference) {
        const { error: ledgerCleanupError } = await supabase
          .from('supplier_ledger')
          .delete()
          .eq('reference_id', editLedgerReference)
          .eq('reference_type', 'PURCHASE_RETURN');
        if (!ledgerCleanupError && editingReturn.supplier_id) {
          await rebuildSupplierLedger(editingReturn.supplier_id);
        }
      }
      for (const item of updatedItems.reverse()) {
        await supabase
          .from('purchase_return_items')
          .update({
            return_quantity: item.oldQty,
            total_cost: item.oldTotal,
            reason: item.oldReason
          })
          .eq('id', item.id)
          .eq('return_id', editingReturn.id);
      }
      await supabase
        .from('purchase_returns')
        .update({
          return_date: editingReturn.return_date,
          total_quantity: editReturnItems.reduce((sum, item) => sum + Number(item.return_quantity || 0), 0),
          total_amount: oldTotalAmount,
          reason: editingReturn.reason || null,
          notes: editingReturn.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingReturn.id);
      for (const a of applied.reverse()) {
        await supabase.rpc('record_inventory_movement', {
          p_product_id: a.productId,
          p_variant_color: a.color,
          p_variant_size: a.size,
          p_stock_delta: a.delta,
          p_reserved_delta: 0,
          p_movement_type: 'PURCHASE_RETURN_ADJUSTMENT_ROLLBACK',
          p_reference_id: editingReturn.id,
          p_notes: 'Compensation after failed Purchase Return edit'
        });
      }
      show('error', 'Edit Failed', err?.message || 'Purchase Return could not be updated. Stock adjustments were compensated where possible.', `REFERENCE: ${editingReturn.id}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (ret: ReturnRecord) => {
    if (!canDelete) {
      show('error', 'Access Restricted', 'Only Admin can delete a completed Purchase Return.', `ROLE: ${role.toUpperCase()} | ACTION: DELETE | RETURN: ${ret.id}`);
      return;
    }
    if (!window.confirm(`Delete ${ret.id}? Any active returned quantity will be restored to stock.`)) return;

    const applied: Array<{ productId: string; color: string; size: string; qty: number }> = [];
    let deleteLedgerReference = '';
    const zeroAudit: Array<{ productId: string; color: string; size: string }> = [];

    try {
      const { data: items, error: ie } = await supabase
        .from('purchase_return_items')
        .select('*')
        .eq('return_id', ret.id);
      if (ie) throw ie;

      // Delete must reverse the CURRENT return quantity, not the original quantity.
      // If an item was edited from 1 -> 0, there is nothing left to restore in stock.
      // We still write a zero-delta audit entry so the deletion is traceable.
      for (const item of items || []) {
        const qty = Number(item.return_quantity || 0);
        if (qty <= 0) {
          zeroAudit.push({
            productId: item.product_id,
            color: item.variant_color,
            size: item.variant_size
          });
          continue;
        }

        const { error } = await supabase.rpc('record_inventory_movement', {
          p_product_id: item.product_id,
          p_variant_color: item.variant_color,
          p_variant_size: item.variant_size,
          p_stock_delta: qty,
          p_reserved_delta: 0,
          p_movement_type: 'PURCHASE_RETURN_ROLLBACK',
          p_reference_id: ret.id,
          p_notes: 'Stock restored after Purchase Return deletion'
        });
        if (error) throw error;

        applied.push({
          productId: item.product_id,
          color: item.variant_color,
          size: item.variant_size,
          qty
        });
      }

      // record_inventory_movement intentionally rejects a zero delta. For an item
      // whose current return quantity is already zero, add an audit-only movement
      // row with zero stock impact so the deletion is still traceable.
      for (let i = 0; i < zeroAudit.length; i += 1) {
        const a = zeroAudit[i];
        const { data: inv, error: invError } = await supabase
          .from('inventory')
          .select('id')
          .eq('product_id', a.productId)
          .eq('variant_color', a.color)
          .eq('variant_size', a.size)
          .maybeSingle();
        if (invError) throw invError;

        const auditId = `im_prdel_${ret.id}_${Date.now()}_${i}`;
        const { error: auditError } = await supabase
          .from('inventory_movements')
          .insert({
            id: auditId,
            product_id: a.productId,
            inventory_id: inv?.id || null,
            variant_color: a.color,
            variant_size: a.size,
            quantity: 0,
            movement_type: 'PURCHASE_RETURN_DELETE',
            reference_id: ret.id,
            notes: 'Purchase Return deleted; current return quantity was 0, so no stock rollback was required',
            stock_delta: 0,
            reserved_delta: 0
          });
        if (auditError) throw auditError;
      }

      const returnAmount = Number(ret.total_amount || 0);
      if (returnAmount > 0) {
        let supplierId = clean(ret.supplier_id);
        if (!supplierId) {
          const { data: returnMaster, error: returnMasterError } = await supabase
            .from('purchase_returns')
            .select('supplier_id')
            .eq('id', ret.id)
            .maybeSingle();
          if (returnMasterError) throw returnMasterError;
          supplierId = clean(returnMaster?.supplier_id);
        }
        if (!supplierId) throw new Error(`Supplier ID missing for Purchase Return ${ret.id}. Supplier ledger rollback cannot be completed safely.`);

        deleteLedgerReference = `${ret.id}_DELETE_${Date.now()}`;
        await addSupplierLedgerEntry({
          supplierId,
          amount: returnAmount,
          transactionType: 'PURCHASE_RETURN_REVERSAL',
          referenceId: deleteLedgerReference,
          description: `Purchase return ${ret.id} deleted; supplier outstanding restored`
        });
      }

      const { error: de } = await supabase
        .from('purchase_returns')
        .delete()
        .eq('id', ret.id);
      if (de) throw de;

      show(
        'success',
        'Purchase Return Deleted',
        applied.length > 0
          ? 'Return deleted and active returned stock was restored. Deletion was recorded in inventory history.'
          : 'Return deleted successfully. Its current return quantity was already zero, so no stock rollback was required; the deletion was recorded in inventory history.',
        `REFERENCE: ${ret.id}`
      );
      await loadData();
    } catch (err: any) {
      if (deleteLedgerReference) {
        const { error: ledgerCleanupError } = await supabase
          .from('supplier_ledger')
          .delete()
          .eq('reference_id', deleteLedgerReference)
          .eq('reference_type', 'PURCHASE_RETURN');
        if (!ledgerCleanupError && ret.supplier_id) {
          await rebuildSupplierLedger(ret.supplier_id);
        }
      }
      // If the database delete failed after stock was restored, compensate those
      // successful rollback movements so the return remains financially/stock-wise intact.
      for (const a of [...applied].reverse()) {
        await supabase.rpc('record_inventory_movement', {
          p_product_id: a.productId,
          p_variant_color: a.color,
          p_variant_size: a.size,
          p_stock_delta: -a.qty,
          p_reserved_delta: 0,
          p_movement_type: 'PURCHASE_RETURN_DELETE_ROLLBACK',
          p_reference_id: ret.id,
          p_notes: 'Compensation after failed Purchase Return deletion'
        });
      }

      show(
        'error',
        'Delete Failed',
        err?.message || 'Purchase Return could not be deleted safely. Any stock adjustments already made were compensated where possible.',
        `WHERE: Purchase Return History | REFERENCE: ${ret.id}`
      );
    }
  };

  if (!canView) {
    return <div className="p-10 rounded-3xl bg-[#101628]/95 border border-white/10 text-center"><AlertTriangle className="w-8 h-8 text-[#ff6b6b] mx-auto mb-3" /><h2 className="text-white font-bold">Purchase Returns Restricted</h2><p className="text-[#8b9bb4] text-xs mt-2">Your role does not have access to Purchase Returns.</p></div>;
  }

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><ArrowDownToLine className="w-5 h-5 text-[#ff6b6b]" /><h1 className="text-xl font-black text-white">Purchase Returns</h1></div>
          <p className="text-[10px] text-[#8b9bb4] font-mono uppercase tracking-wider mt-1">Inventory → Purchase → Returns</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} disabled={loading} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[#8b9bb4] hover:text-white text-xs flex items-center gap-2"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          {canCreate && <button onClick={handleOpenEntry} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-xs font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> New Return</button>}
        </div>
      </div>

      <div className="rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl overflow-hidden">
        <div className="p-3 border-b border-white/10 flex items-center gap-2"><Search className="w-4 h-4 text-[#8b9bb4]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Return No / Purchase No / Supplier / Bill No..." className="flex-1 bg-transparent outline-none text-xs text-white" /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs"><thead className="bg-[#0a0e17] text-[#8b9bb4] font-mono uppercase text-[9px]"><tr><th className="p-3">Return No</th><th className="p-3">Purchase</th><th className="p-3">Supplier</th><th className="p-3">Date</th><th className="p-3">Qty</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan={8} className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff]" /></td></tr> : filteredReturns.length === 0 ? <tr><td colSpan={8} className="p-10 text-center text-[#8b9bb4]">No Purchase Returns found.</td></tr> : filteredReturns.map((r) => <tr key={r.id} className="hover:bg-white/[0.02]"><td className="p-3 font-mono font-bold text-white">{r.id}</td><td className="p-3 text-[#00d9ff] font-mono">{r.purchase_id}</td><td className="p-3">{r.supplier_name}</td><td className="p-3">{r.return_date}</td><td className="p-3">{r.total_quantity}</td><td className="p-3 font-bold">{money(r.total_amount)}</td><td className="p-3"><span className="px-2 py-1 rounded-lg bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/20 text-[9px] font-mono uppercase">{r.status}</span></td><td className="p-3 text-right"><div className="flex justify-end gap-1"><button onClick={() => handleOpenView(r)} className="p-2 rounded-lg bg-white/5 text-[#8b9bb4] hover:text-white" title="View Details"><Eye className="w-3.5 h-3.5" /></button>{canEdit && <button onClick={() => handleOpenEdit(r)} className="p-2 rounded-lg bg-[#00d9ff]/10 text-[#00d9ff] hover:bg-[#00d9ff]/20" title="Edit Return"><Edit2 className="w-3.5 h-3.5" /></button>}{canDelete && <button onClick={() => handleDelete(r)} className="p-2 rounded-lg bg-[#ff6b6b]/10 text-[#ff6b6b] hover:bg-[#ff6b6b]/20" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}</div></td></tr>)}
            </tbody></table>
        </div>
      </div>

      {showEntry && <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center"><div className="w-full max-w-6xl max-h-[94vh] bg-[#101628] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden"><div className="p-4 border-b border-white/10 flex items-center justify-between"><div><h2 className="text-white font-black">New Purchase Return</h2><p className="text-[9px] text-[#8b9bb4] font-mono uppercase mt-1">Stock return only • Supplier payment is handled separately</p></div><button onClick={() => setShowEntry(false)} className="p-2 text-[#8b9bb4] hover:text-white"><X className="w-5 h-5" /></button></div>
        <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3"><div><label className="text-[9px] text-[#8b9bb4] font-mono">RETURN DATE</label><input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="mt-1 w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white" /></div><div className="md:col-span-3"><label className="text-[9px] text-[#8b9bb4] font-mono">ORIGINAL PURCHASE</label><select value={selectedPurchaseId} onChange={(e) => loadPurchaseItems(e.target.value)} className="mt-1 w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"><option value="">Select Purchase...</option>{purchases.map((p) => <option key={p.id} value={p.id}>{p.id} • {p.supplier_name || 'Supplier'} • Bill {p.supplier_bill_no || '-'}</option>)}</select></div></div>
          {selectedPurchase && <div className="rounded-2xl bg-[#0a0e17] border border-white/10 p-3"><div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs"><div><span className="text-[9px] text-[#8b9bb4] block">SUPPLIER</span><b>{selectedPurchase.supplier_name || '-'}</b></div><div><span className="text-[9px] text-[#8b9bb4] block">BILL NO</span><b className="font-mono">{selectedPurchase.supplier_bill_no || '-'}</b></div><div><span className="text-[9px] text-[#8b9bb4] block">PURCHASE DATE</span><b>{selectedPurchase.purchase_date || '-'}</b></div><div><span className="text-[9px] text-[#8b9bb4] block">PURCHASE TOTAL</span><b>{money(Number(selectedPurchase.total_amount || 0))}</b></div></div></div>}
          <div className="rounded-2xl border border-white/10 overflow-hidden"><div className="overflow-x-auto max-h-[430px] overflow-y-auto"><table className="w-full text-xs"><thead className="sticky top-0 bg-[#0a0e17] z-10 text-[#8b9bb4] font-mono text-[9px] uppercase"><tr><th className="p-3 text-left">Product / Variant</th><th className="p-3">Purchased</th><th className="p-3">Returned</th><th className="p-3">Returnable</th><th className="p-3 w-28">Return Qty</th><th className="p-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-white/5">{lines.map((l) => <tr key={l.id} className="hover:bg-white/[0.02]"><td className="p-3"><div className="font-bold text-white">{l.product_name || l.product_id}</div><div className="text-[9px] font-mono text-[#8b9bb4]">{l.variant_color} / {l.variant_size}</div></td><td className="p-3 text-center">{l.quantity}</td><td className="p-3 text-center">{l.alreadyReturned}</td><td className="p-3 text-center text-[#00ff9d]">{l.returnable}</td><td className="p-3"><input type="number" min={0} max={l.returnable} value={l.returnQty || ''} onChange={(e) => handleQtyChange(l, e.target.value)} disabled={l.returnable <= 0} className="w-full bg-[#101628] border border-white/10 rounded-lg px-2 py-1.5 text-white text-center" /></td><td className="p-3 text-right font-bold">{money(l.returnQty * Number(l.unit_cost || 0))}</td></tr>)}</tbody></table></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="text-[9px] text-[#8b9bb4] font-mono">RETURN REASON</label><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Damaged / Wrong item / Quality issue..." className="mt-1 w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white" /></div><div><label className="text-[9px] text-[#8b9bb4] font-mono">NOTES</label><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." className="mt-1 w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white" /></div></div>
        </div><div className="p-4 border-t border-white/10 flex items-center justify-between gap-3"><div className="text-xs"><span className="text-[#8b9bb4]">Return Qty:</span> <b className="text-white">{totalQty}</b><span className="mx-3 text-[#8b9bb4]">Amount:</span><b className="text-[#00ff9d]">{money(totalAmount)}</b></div><div className="flex gap-2"><button onClick={() => setShowEntry(false)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-[#8b9bb4]">Cancel</button><button onClick={handleSave} disabled={saving || !canCreate} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-xs font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Complete Return'}</button></div></div></div></div>}

      {viewReturn && <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center overflow-y-auto"><div className="w-full max-w-3xl max-h-[92vh] bg-[#101628] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden"><div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0"><div><h3 className="text-white font-bold text-base">{viewReturn.id}</h3><p className="text-[9px] text-[#8b9bb4] font-mono mt-1 uppercase">Purchase Return • Detailed View</p></div><div className="flex items-center gap-2">{canEdit && <button onClick={() => handleOpenEdit(viewReturn)} className="px-3 py-2 rounded-xl bg-[#00d9ff]/10 border border-[#00d9ff]/20 text-[#00d9ff] text-xs font-bold flex items-center gap-1.5"><Edit2 className="w-3.5 h-3.5" /> Edit</button>}<button onClick={() => setViewReturn(null)} className="p-2 text-[#8b9bb4] hover:text-white"><X className="w-4 h-4" /></button></div></div><div className="p-4 overflow-y-auto min-h-0 space-y-4"><div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs"><div><span className="text-[9px] text-[#8b9bb4] block">PURCHASE</span><b className="font-mono text-[#00d9ff]">{viewReturn.purchase_id}</b></div><div><span className="text-[9px] text-[#8b9bb4] block">SUPPLIER</span><b>{viewReturn.supplier_name || '-'}</b></div><div><span className="text-[9px] text-[#8b9bb4] block">ORIGINAL BILL</span><b className="font-mono">{viewReturn.original_bill_no || '-'}</b></div><div><span className="text-[9px] text-[#8b9bb4] block">DATE</span><b>{viewReturn.return_date}</b></div><div><span className="text-[9px] text-[#8b9bb4] block">TOTAL QTY</span><b>{viewReturn.total_quantity}</b></div><div><span className="text-[9px] text-[#8b9bb4] block">TOTAL AMOUNT</span><b className="text-[#00ff9d]">{money(viewReturn.total_amount)}</b></div><div><span className="text-[9px] text-[#8b9bb4] block">STATUS</span><b className="uppercase text-[#00ff9d]">{viewReturn.status}</b></div><div><span className="text-[9px] text-[#8b9bb4] block">REASON</span><b>{viewReturn.reason || '-'}</b></div></div><div className="rounded-2xl border border-white/10 overflow-hidden"><div className="px-3 py-2 bg-[#0a0e17] border-b border-white/10 text-[9px] text-[#8b9bb4] font-mono uppercase">Returned Items</div>{detailLoading ? <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff]" /></div> : returnDetailItems.length === 0 ? <div className="p-8 text-center text-xs text-[#8b9bb4]">No return items found.</div> : <div className="overflow-x-auto max-h-[360px] overflow-y-auto"><table className="w-full text-xs"><thead className="sticky top-0 bg-[#0a0e17] text-[#8b9bb4] text-[9px] font-mono uppercase"><tr><th className="p-3 text-left">Product / Variant</th><th className="p-3">Purchased</th><th className="p-3">Returned</th><th className="p-3">Rate</th><th className="p-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-white/5">{returnDetailItems.map((item) => <tr key={item.id}><td className="p-3"><div className="font-bold text-white">{item.product_name || item.product_id}</div><div className="text-[9px] font-mono text-[#8b9bb4]">{item.variant_color} / {item.variant_size}</div></td><td className="p-3 text-center">{item.purchased_quantity}</td><td className="p-3 text-center text-[#ff6b6b] font-bold">{item.return_quantity}</td><td className="p-3 text-center">{money(Number(item.unit_cost || 0))}</td><td className="p-3 text-right font-bold">{money(Number(item.total_cost || 0))}</td></tr>)}</tbody></table></div>}</div>{viewReturn.notes && <div><span className="text-[9px] text-[#8b9bb4] font-mono uppercase">Notes</span><div className="mt-1 rounded-xl bg-[#0a0e17] border border-white/10 p-3 text-xs text-[#cbd5e1] whitespace-pre-wrap">{viewReturn.notes}</div></div>}</div><div className="p-4 border-t border-white/10 shrink-0"><button onClick={() => setViewReturn(null)} className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white">Close</button></div></div></div>}

      {editingReturn && <div className="fixed inset-0 z-[10010] bg-black/85 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center overflow-y-auto"><div className="w-full max-w-4xl max-h-[94vh] bg-[#101628] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden"><div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0"><div><h3 className="text-white font-bold">Edit {editingReturn.id}</h3><p className="text-[9px] text-[#8b9bb4] font-mono mt-1 uppercase">Stock will be adjusted by quantity difference</p></div><button onClick={() => setEditingReturn(null)} className="p-2 text-[#8b9bb4] hover:text-white"><X className="w-4 h-4" /></button></div><div className="p-4 overflow-y-auto min-h-0 space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div><label className="text-[9px] text-[#8b9bb4] font-mono">RETURN DATE</label><input type="date" value={editReturnDate} onChange={(e) => setEditReturnDate(e.target.value)} className="mt-1 w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white" /></div><div><label className="text-[9px] text-[#8b9bb4] font-mono">REASON</label><input value={editReason} onChange={(e) => setEditReason(e.target.value)} className="mt-1 w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white" /></div><div><label className="text-[9px] text-[#8b9bb4] font-mono">NOTES</label><input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="mt-1 w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white" /></div></div><div className="rounded-2xl border border-white/10 overflow-hidden"><div className="px-3 py-2 bg-[#0a0e17] border-b border-white/10 text-[9px] text-[#8b9bb4] font-mono uppercase">Return Items</div><div className="overflow-x-auto max-h-[420px] overflow-y-auto"><table className="w-full text-xs"><thead className="sticky top-0 bg-[#0a0e17] z-10 text-[#8b9bb4] text-[9px] font-mono uppercase"><tr><th className="p-3 text-left">Product / Variant</th><th className="p-3">Purchased</th><th className="p-3">Original Return</th><th className="p-3 w-28">New Return</th><th className="p-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-white/5">{editReturnItems.map((item) => { const qty = Number(editReturnQty[String(item.id)] || 0); return <tr key={item.id}><td className="p-3"><div className="font-bold text-white">{item.product_name || item.product_id}</div><div className="text-[9px] font-mono text-[#8b9bb4]">{item.variant_color} / {item.variant_size}</div></td><td className="p-3 text-center">{item.purchased_quantity}</td><td className="p-3 text-center text-[#ff6b6b]">{item.return_quantity}</td><td className="p-3"><input type="number" min={0} max={Number(item.purchased_quantity || 0)} value={qty} onChange={(e) => handleEditQtyChange(item, e.target.value)} className="w-full bg-[#0a0e17] border border-white/10 rounded-lg px-2 py-1.5 text-white text-center" /></td><td className="p-3 text-right font-bold">{money(qty * Number(item.unit_cost || 0))}</td></tr>; })}</tbody></table></div></div><div className="rounded-xl bg-[#ffb000]/10 border border-[#ffb000]/20 p-3 text-[10px] text-[#f5d98a]">Quantity increase will deduct additional stock. Quantity decrease will restore stock. The edit is not saved if the required stock adjustment cannot be applied.</div></div><div className="p-4 border-t border-white/10 flex items-center justify-between gap-3 shrink-0"><button onClick={() => setEditingReturn(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-[#8b9bb4]">Cancel</button><button onClick={handleSaveEdit} disabled={savingEdit} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-xs font-bold disabled:opacity-50">{savingEdit ? 'Saving...' : 'Apply Changes'}</button></div></div></div>}


      {message && <div className="fixed inset-0 z-[11000] bg-black/45 flex items-center justify-center p-4"><div className="w-full max-w-md rounded-3xl bg-[#101628] border border-white/15 shadow-2xl p-5"><div className="flex items-start gap-3"><div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${message.type === 'error' ? 'bg-[#ff6b6b]/10 text-[#ff6b6b]' : message.type === 'success' ? 'bg-[#00ff9d]/10 text-[#00ff9d]' : 'bg-[#00d9ff]/10 text-[#00d9ff]'}`}>{message.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}</div><div className="flex-1"><h3 className="text-white font-bold">{message.title}</h3><p className="text-xs text-[#cbd5e1] mt-2 leading-relaxed">{message.body}</p>{message.reference && <div className="mt-3 rounded-xl bg-black/25 border border-white/10 p-3 text-[9px] font-mono text-[#8b9bb4] whitespace-pre-wrap">{message.reference}</div>}</div><button onClick={() => setMessage(null)} className="text-[#8b9bb4] hover:text-white"><X className="w-4 h-4" /></button></div><button onClick={() => setMessage(null)} className="mt-4 w-full py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white">OK</button></div></div>}
    </div>
  );
}
