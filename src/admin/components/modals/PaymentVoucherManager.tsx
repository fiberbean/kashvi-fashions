import React, { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface SupplierRecord {
  id: string;
  name: string;
  shop_name?: string | null;
  phone?: string | null;
  city?: string | null;
  balance_due?: number | null;
}

interface PaymentVoucherRecord {
  id: string;
  supplier_id: string;
  voucher_date: string;
  amount: number;
  payment_mode: string;
  reference_no?: string | null;
  notes?: string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
}

interface PaymentVoucherManagerProps {
  currentUser?: { role?: string | null; full_name?: string | null } | null;
}

const clean = (value: unknown) => String(value ?? '').trim();
const money = (value: number) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const paymentModes = ['CASH', 'UPI', 'BANK TRANSFER', 'CHEQUE'];

function getRole(value?: string | null) {
  return clean(value).toLowerCase();
}

function roleFlags(roleValue?: string | null) {
  const role = getRole(roleValue);

  return {
    role,
    canView: ['admin', 'manager', 'operations'].includes(role),
    canCreate: ['admin', 'manager', 'operations'].includes(role),
    canDelete: role === 'admin'
  };
}

export default function PaymentVoucherManager({
  currentUser
}: PaymentVoucherManagerProps) {
  const { role, canView, canCreate, canDelete } = roleFlags(currentUser?.role);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [vouchers, setVouchers] = useState<PaymentVoucherRecord[]>([]);
  const [search, setSearch] = useState('');

  const [showEntry, setShowEntry] = useState(false);
  const [viewVoucher, setViewVoucher] = useState<PaymentVoucherRecord | null>(null);

  const [voucherId, setVoucherId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  const [message, setMessage] = useState<{
    type: 'info' | 'error' | 'success';
    title: string;
    body: string;
    reference?: string;
  } | null>(null);

  const show = (
    type: 'info' | 'error' | 'success',
    title: string,
    body: string,
    reference?: string
  ) => {
    setMessage({ type, title, body, reference });
  };

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === supplierId) || null,
    [suppliers, supplierId]
  );

  const enteredAmount = Number(amount) || 0;
  const currentOutstanding = Number(selectedSupplier?.balance_due || 0);

  // Keep the supplier order exactly as loaded from the database (name A-Z),
  // while allowing quick filtering without changing the underlying order.
  const filteredSuppliers = useMemo(() => {
    const query = supplierSearch.trim().toLowerCase();

    if (!query) return suppliers;

    return suppliers.filter((supplier) =>
      [
        supplier.id,
        supplier.name,
        supplier.shop_name,
        supplier.phone,
        supplier.city
      ].some((value) => clean(value).toLowerCase().includes(query))
    );
  }, [supplierSearch, suppliers]);

  const filteredVouchers = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return vouchers;

    return vouchers.filter((voucher) => {
      const supplier = suppliers.find((s) => s.id === voucher.supplier_id);

      return [
        voucher.id,
        voucher.supplier_id,
        supplier?.name,
        supplier?.shop_name,
        voucher.payment_mode,
        voucher.reference_no
      ].some((value) => clean(value).toLowerCase().includes(query));
    });
  }, [search, vouchers, suppliers]);

  const loadData = async () => {
    if (!canView) return;

    setLoading(true);

    try {
      // Load suppliers independently so a voucher-table/query issue cannot make
      // the Supplier dropdown appear empty.
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .select('id,name,shop_name,phone,city,balance_due')
        .order('name', { ascending: true });

      if (supplierError) {
        throw new Error(`Supplier list could not be loaded: ${supplierError.message}`);
      }

      setSuppliers((supplierData || []) as SupplierRecord[]);

      // Load vouchers separately. Existing supplier data must remain visible even
      // if the voucher query has a schema/RLS problem.
      const { data: voucherData, error: voucherError } = await supabase
        .from('payment_vouchers')
        .select(
          'id,supplier_id,voucher_date,amount,payment_mode,reference_no,notes,status,created_at,updated_at'
        )
        .order('created_at', { ascending: false });

      if (voucherError) {
        setVouchers([]);
        show(
          'error',
          'Payment Voucher History Load Failed',
          voucherError.message || 'Payment Voucher history could not be loaded.',
          'Supplier list is still available for new payment entry.'
        );
      } else {
        setVouchers((voucherData || []) as PaymentVoucherRecord[]);
      }
    } catch (error: any) {
      show(
        'error',
        'Payment Vouchers — Load Failed',
        error?.message || 'Unable to load Payment Vouchers.',
        'WHERE: Accounts → Payment Vouchers'
      );
    } finally {
      setLoading(false);
    }
  };

  const getNextVoucherNo = async () => {
    const { data, error } = await supabase
      .from('payment_vouchers')
      .select('id')
      .like('id', 'KFPV%')
      .order('id', { ascending: false })
      .limit(1);

    if (error) throw error;

    const latest = data?.[0]?.id ? String(data[0].id) : '';
    const match = latest.match(/(\d+)$/);
    const next = match ? Number(match[1]) + 1 : 1;

    return `KFPV${String(next).padStart(4, '0')}`;
  };

  const resetEntry = async () => {
    setSupplierId('');
    setSupplierSearch('');
    setSupplierDropdownOpen(false);
    setVoucherDate(new Date().toISOString().slice(0, 10));
    setAmount('');
    setPaymentMode('CASH');
    setReferenceNo('');
    setNotes('');

    try {
      const next = await getNextVoucherNo();
      setVoucherId(next);
    } catch {
      setVoucherId('KFPV0001');
    }
  };

  useEffect(() => {
    loadData();
  }, [canView]);

  const handleOpenEntry = async () => {
    if (!canCreate) {
      show(
        'error',
        'Access Restricted',
        'Your role cannot create Payment Vouchers.',
        `ROLE: ${role.toUpperCase()} | ACTION: CREATE`
      );
      return;
    }

    await resetEntry();
    setMessage(null);
    setShowEntry(true);
  };

  const handleSave = async () => {
    if (!canCreate) return;

    if (!supplierId) {
      show(
        'error',
        'Supplier Required',
        'Select a supplier before saving the Payment Voucher.',
        'WHERE: Accounts → Payment Vouchers → Entry'
      );
      return;
    }

    if (enteredAmount <= 0) {
      show(
        'error',
        'Invalid Payment Amount',
        'Payment amount must be greater than zero.'
      );
      return;
    }

    if (enteredAmount > currentOutstanding) {
      show(
        'error',
        'Payment Exceeds Outstanding',
        `Current outstanding is ${money(currentOutstanding)}. Payment cannot exceed the outstanding amount.`,
        `SUPPLIER: ${supplierId}`
      );
      return;
    }

    if (!voucherId) {
      show(
        'error',
        'Voucher Number Missing',
        'Unable to generate the Payment Voucher number.'
      );
      return;
    }

    setSaving(true);

    let voucherInserted = false;
    let supplierBalanceUpdated = false;
    let ledgerInserted = false;

    try {
      // Fresh supplier read prevents using an old balance from the UI.
      const { data: freshSupplier, error: freshSupplierError } = await supabase
        .from('suppliers')
        .select('id,name,balance_due')
        .eq('id', supplierId)
        .maybeSingle();

      if (freshSupplierError) throw freshSupplierError;

      if (!freshSupplier) {
        throw new Error(`Supplier not found: ${supplierId}`);
      }

      const freshBalance = Number(freshSupplier.balance_due || 0);

      if (enteredAmount > freshBalance) {
        throw new Error(
          `Payment exceeds current supplier outstanding. Current outstanding: ${money(
            freshBalance
          )}`
        );
      }

      // Duplicate protection.
      const { data: duplicateVoucher, error: duplicateError } = await supabase
        .from('payment_vouchers')
        .select('id')
        .eq('id', voucherId)
        .maybeSingle();

      if (duplicateError) throw duplicateError;

      if (duplicateVoucher) {
        throw new Error(`Payment Voucher ${voucherId} already exists.`);
      }

      const newBalance = Math.max(0, freshBalance - enteredAmount);

      const { error: voucherError } = await supabase
        .from('payment_vouchers')
        .insert([
          {
            id: voucherId,
            supplier_id: supplierId,
            voucher_date: voucherDate,
            amount: enteredAmount,
            payment_mode: paymentMode,
            reference_no: referenceNo.trim() || null,
            notes: notes.trim() || null,
            status: 'completed'
          }
        ]);

      if (voucherError) throw voucherError;
      voucherInserted = true;

      const { error: balanceError } = await supabase
        .from('suppliers')
        .update({
          balance_due: newBalance
        })
        .eq('id', supplierId)
        .eq('balance_due', freshBalance);

      if (balanceError) throw balanceError;

      supplierBalanceUpdated = true;

      const { error: ledgerError } = await supabase
        .from('supplier_ledger')
        .insert([
          {
            id: `led_${Date.now()}_pay`,
            supplier_id: supplierId,
            purchase_id: null,
            transaction_type: 'PAYMENT',
            amount: -enteredAmount,
            balance_after: newBalance,
            reference_id: voucherId,
            reference_type: 'PAYMENT',
            description: `Supplier payment via ${paymentMode}${
              referenceNo.trim() ? ` | Ref: ${referenceNo.trim()}` : ''
            }`
          }
        ]);

      if (ledgerError) throw ledgerError;
      ledgerInserted = true;

      show(
        'success',
        'Payment Voucher Saved',
        `${voucherId} saved successfully. Supplier outstanding reduced by ${money(
          enteredAmount
        )}.`,
        `SUPPLIER: ${supplierId} | BALANCE: ${money(newBalance)}`
      );

      setShowEntry(false);
      await loadData();
    } catch (error: any) {
      // Best-effort compensation when the later steps fail.
      try {
        if (ledgerInserted) {
          await supabase
            .from('supplier_ledger')
            .delete()
            .eq('reference_id', voucherId)
            .eq('reference_type', 'PAYMENT');
        }

        if (supplierBalanceUpdated) {
          await supabase
            .from('suppliers')
            .update({ balance_due: currentOutstanding })
            .eq('id', supplierId);
        }

        if (voucherInserted) {
          await supabase
            .from('payment_vouchers')
            .delete()
            .eq('id', voucherId);
        }
      } catch (rollbackError) {
        console.error('Payment Voucher compensation failed:', rollbackError);
      }

      show(
        'error',
        'Payment Voucher Not Completed',
        error?.message ||
          'Payment Voucher could not be saved safely. Any partial changes were compensated where possible.',
        `REFERENCE: ${voucherId || supplierId}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (voucher: PaymentVoucherRecord) => {
    if (!canDelete) {
      show(
        'error',
        'Access Restricted',
        'Only Admin can delete a Payment Voucher.',
        `ROLE: ${role.toUpperCase()} | ACTION: DELETE | VOUCHER: ${voucher.id}`
      );
      return;
    }

    const supplier = suppliers.find((s) => s.id === voucher.supplier_id);
    const supplierName = supplier?.shop_name || supplier?.name || voucher.supplier_id;

    if (
      !window.confirm(
        `Delete ${voucher.id} for ${supplierName}?\n\n` +
          `${money(Number(voucher.amount || 0))} will be added back to supplier outstanding and a reversal entry will be recorded in Supplier Ledger.`
      )
    ) {
      return;
    }

    try {
      const { data: freshSupplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('id,balance_due')
        .eq('id', voucher.supplier_id)
        .maybeSingle();

      if (supplierError) throw supplierError;
      if (!freshSupplier) throw new Error(`Supplier not found: ${voucher.supplier_id}`);

      const currentBalance = Number(freshSupplier.balance_due || 0);
      const restoredBalance = currentBalance + Number(voucher.amount || 0);

      // First restore supplier outstanding.
      const { error: balanceError } = await supabase
        .from('suppliers')
        .update({ balance_due: restoredBalance })
        .eq('id', voucher.supplier_id)
        .eq('balance_due', currentBalance);

      if (balanceError) throw balanceError;

      let reversalInserted = false;

      try {
        const { error: reversalError } = await supabase
          .from('supplier_ledger')
          .insert([
            {
              id: `led_${Date.now()}_paydel`,
              supplier_id: voucher.supplier_id,
              purchase_id: null,
              transaction_type: 'PAYMENT_REVERSAL',
              amount: Number(voucher.amount || 0),
              balance_after: restoredBalance,
              reference_id: voucher.id,
              reference_type: 'PAYMENT',
              description: `Payment Voucher deleted and outstanding restored: ${voucher.id}`
            }
          ]);

        if (reversalError) throw reversalError;
        reversalInserted = true;

        const { error: deleteError } = await supabase
          .from('payment_vouchers')
          .delete()
          .eq('id', voucher.id);

        if (deleteError) throw deleteError;

        show(
          'success',
          'Payment Voucher Deleted',
          `${voucher.id} deleted and supplier outstanding restored by ${money(
            Number(voucher.amount || 0)
          )}.`,
          `SUPPLIER: ${voucher.supplier_id} | BALANCE: ${money(restoredBalance)}`
        );

        await loadData();
      } catch (innerError: any) {
        // Compensate supplier balance if voucher deletion sequence fails.
        await supabase
          .from('suppliers')
          .update({ balance_due: currentBalance })
          .eq('id', voucher.supplier_id);

        if (reversalInserted) {
          await supabase
            .from('supplier_ledger')
            .delete()
            .eq('reference_id', voucher.id)
            .eq('transaction_type', 'PAYMENT_REVERSAL');
        }

        throw innerError;
      }
    } catch (error: any) {
      show(
        'error',
        'Payment Voucher Delete Failed',
        error?.message ||
          'Payment Voucher could not be deleted safely.',
        `WHERE: Accounts → Payment Vouchers | REFERENCE: ${voucher.id}`
      );
    }
  };

  if (!canView) {
    return (
      <div className="p-10 rounded-3xl bg-[#101628]/95 border border-white/10 text-center">
        <AlertTriangle className="w-8 h-8 text-[#ff6b6b] mx-auto mb-3" />
        <h2 className="text-white font-bold">Payment Vouchers Restricted</h2>
        <p className="text-[#8b9bb4] text-xs mt-2">
          Your role does not have access to Payment Vouchers.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-[#080c14] text-white overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-white/10 bg-[#0a0e17]/95 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#00d9ff]/10 border border-[#00d9ff]/20 flex items-center justify-center">
              <Banknote className="w-4.5 h-4.5 text-[#00d9ff]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                Supplier Payment Vouchers
              </h2>
              <p className="text-[9px] sm:text-[10px] text-[#8b9bb4]">
                Supplier Payments • Ledger • Outstanding Control
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenEntry}
          disabled={!canCreate}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          New Payment Voucher
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0a0e17]/70 flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Voucher, Supplier, UTR..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#101628] border border-white/10 text-white text-[11px] outline-none focus:border-[#00d9ff]"
          />
        </div>

        <button
          type="button"
          onClick={loadData}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#8b9bb4] hover:text-white cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <span className="text-[9px] font-mono text-[#8b9bb4] whitespace-nowrap">
          {filteredVouchers.length} VOUCHERS
        </span>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mx-4 sm:mx-6 mt-3 p-3 rounded-xl border text-xs ${
            message.type === 'success'
              ? 'bg-[#00ff9d]/10 border-[#00ff9d]/25 text-[#00ff9d]'
              : message.type === 'error'
              ? 'bg-[#ff6b6b]/10 border-[#ff6b6b]/25 text-[#ff6b6b]'
              : 'bg-[#00d9ff]/10 border-[#00d9ff]/25 text-[#00d9ff]'
          }`}
        >
          <div className="font-bold">{message.title}</div>
          <div className="mt-1 opacity-90">{message.body}</div>
          {message.reference && (
            <div className="mt-1 text-[9px] font-mono opacity-70">
              {message.reference}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 custom-scrollbar">
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#101628] text-[#8b9bb4] font-mono uppercase text-[9px] border-b border-white/10 sticky top-0 z-10">
              <tr>
                <th className="p-3">Voucher</th>
                <th className="p-3">Date</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">Payment Mode</th>
                <th className="p-3">Reference</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-[#8b9bb4]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff] mb-2" />
                    Loading Payment Vouchers...
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-[#8b9bb4]">
                    No Payment Vouchers found.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((voucher) => {
                  const supplier = suppliers.find(
                    (s) => s.id === voucher.supplier_id
                  );

                  return (
                    <tr
                      key={voucher.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-3 font-mono font-extrabold text-[#00ff9d]">
                        {voucher.id}
                      </td>

                      <td className="p-3 text-[#c8d1df]">
                        {voucher.voucher_date}
                      </td>

                      <td className="p-3">
                        <span className="text-white font-bold block">
                          {supplier?.shop_name || supplier?.name || voucher.supplier_id}
                        </span>
                        <span className="text-[9px] text-[#8b9bb4] font-mono">
                          {voucher.supplier_id}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-1 rounded-lg bg-[#00d9ff]/10 border border-[#00d9ff]/20 text-[#00d9ff] text-[9px] font-bold">
                          {voucher.payment_mode}
                        </span>
                      </td>

                      <td className="p-3 text-[#8b9bb4] font-mono text-[10px]">
                        {voucher.reference_no || '—'}
                      </td>

                      <td className="p-3 text-right font-mono font-extrabold text-[#ffcf5c]">
                        {money(Number(voucher.amount || 0))}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewVoucher(voucher)}
                            className="p-1.5 rounded-lg text-[#8b9bb4] hover:text-[#00d9ff] hover:bg-white/5 cursor-pointer"
                            title="View Voucher"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(voucher)}
                              className="p-1.5 rounded-lg text-[#8b9bb4] hover:text-[#ff6b6b] hover:bg-white/5 cursor-pointer"
                              title="Delete Voucher"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Entry Modal */}
      {showEntry && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl bg-[#101628] border border-white/15 shadow-2xl overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-[#667eea] via-[#00d9ff] to-[#00ff9d]" />

            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  New Supplier Payment Voucher
                </h3>
                <p className="text-[9px] text-[#8b9bb4] mt-1">
                  Payment does not affect inventory. It only reduces supplier outstanding.
                </p>
              </div>

              <button
                type="button"
                onClick={() => !saving && setShowEntry(false)}
                className="p-1.5 rounded-xl bg-white/5 text-[#8b9bb4] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] text-[#8b9bb4] uppercase font-mono block mb-1">
                    Voucher No
                  </label>
                  <input
                    value={voucherId}
                    readOnly
                    className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-white/10 text-[#00ff9d] font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-[#8b9bb4] uppercase font-mono block mb-1">
                    Voucher Date
                  </label>
                  <input
                    type="date"
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-white/10 text-white text-xs outline-none focus:border-[#00d9ff]"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-[#8b9bb4] uppercase font-mono block mb-1">
                    Payment Mode
                  </label>
                  <div className="relative">
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full appearance-none px-3 py-2 rounded-xl bg-[#0a0e17] border border-white/10 text-white text-xs outline-none focus:border-[#00d9ff]"
                    >
                      {paymentModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#8b9bb4] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] text-[#8b9bb4] uppercase font-mono block mb-1">
                  Supplier *
                </label>

                <div className="relative">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={
                        supplierId
                          ? (() => {
                              const selected = suppliers.find(
                                (supplier) => supplier.id === supplierId
                              );
                              return selected
                                ? `${selected.id} — ${selected.shop_name || selected.name}`
                                : supplierSearch;
                            })()
                          : supplierSearch
                      }
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        setSupplierId('');
                        setSupplierDropdownOpen(true);
                      }}
                      onFocus={() => setSupplierDropdownOpen(true)}
                      placeholder="Search Supplier / ID / Shop Name..."
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#0a0e17] border border-white/10 text-white text-xs outline-none focus:border-[#00d9ff]"
                    />

                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#8b9bb4] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform ${
                        supplierDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>

                  {supplierDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-[80] rounded-xl bg-[#0b101c] border border-white/15 shadow-2xl overflow-hidden">
                      <div className="max-h-56 overflow-y-auto custom-scrollbar">
                        {filteredSuppliers.length === 0 ? (
                          <div className="px-3 py-3 text-[10px] text-[#64748b] text-center">
                            No Supplier Found
                          </div>
                        ) : (
                          filteredSuppliers.map((supplier) => {
                            const outstanding = Number(supplier.balance_due || 0);
                            const disabled = outstanding <= 0;
                            const label =
                              supplier.shop_name &&
                              supplier.shop_name !== supplier.name
                                ? `${supplier.shop_name} — ${supplier.name}`
                                : supplier.name;

                            return (
                              <button
                                key={supplier.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  if (disabled) return;
                                  setSupplierId(supplier.id);
                                  setSupplierSearch('');
                                  setSupplierDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2.5 border-b border-white/5 last:border-b-0 transition-colors ${
                                  disabled
                                    ? 'opacity-45 cursor-not-allowed'
                                    : 'hover:bg-[#667eea]/15 cursor-pointer'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-[11px] text-white font-semibold truncate">
                                      {label}
                                    </div>
                                    <div className="text-[8px] text-[#64748b] font-mono mt-0.5">
                                      {supplier.id}
                                      {supplier.city ? ` • ${supplier.city}` : ''}
                                    </div>
                                  </div>

                                  <div className="shrink-0 text-right">
                                    <div
                                      className={`text-[10px] font-bold ${
                                        disabled
                                          ? 'text-[#64748b]'
                                          : 'text-[#00ff9d]'
                                      }`}
                                    >
                                      {money(outstanding)}
                                    </div>
                                    <div className="text-[7px] text-[#64748b] uppercase">
                                      {disabled ? 'No Outstanding' : 'Outstanding'}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      <div className="px-3 py-1.5 border-t border-white/10 bg-[#101628] text-[8px] text-[#64748b]">
                        {filteredSuppliers.length} supplier
                        {filteredSuppliers.length === 1 ? '' : 's'} found
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-[#0a0e17] border border-white/10">
                  <span className="text-[9px] text-[#8b9bb4] uppercase font-mono block">
                    Current Outstanding
                  </span>
                  <span className="text-lg font-extrabold text-[#ff6b6b] block mt-1">
                    {money(currentOutstanding)}
                  </span>
                </div>

                <div>
                  <label className="text-[9px] text-[#8b9bb4] uppercase font-mono block mb-1">
                    Payment Amount *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-3 rounded-xl bg-[#0a0e17] border border-white/10 text-[#00ff9d] font-bold text-sm outline-none focus:border-[#00ff9d]"
                  />
                  <span className="text-[8px] text-[#8b9bb4] mt-1 block">
                    Maximum: {money(currentOutstanding)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-[#8b9bb4] uppercase font-mono block mb-1">
                    Reference / UTR / Cheque No
                  </label>
                  <input
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="Optional reference number"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0a0e17] border border-white/10 text-white text-xs outline-none focus:border-[#00d9ff]"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-[#8b9bb4] uppercase font-mono block mb-1">
                    Notes
                  </label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0a0e17] border border-white/10 text-white text-xs outline-none focus:border-[#00d9ff]"
                  />
                </div>
              </div>

              {enteredAmount > 0 && (
                <div className="p-3 rounded-2xl bg-[#00ff9d]/5 border border-[#00ff9d]/15">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8b9bb4]">Outstanding After Payment</span>
                    <span className="font-extrabold text-[#00ff9d]">
                      {money(Math.max(0, currentOutstanding - enteredAmount))}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => !saving && setShowEntry(false)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#8b9bb4] hover:text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !canCreate}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff9d]" />
                  )}
                  Save Payment Voucher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewVoucher && (
        <div className="fixed inset-0 z-[1250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#101628] border border-white/15 shadow-2xl overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-[#667eea] via-[#00d9ff] to-[#00ff9d]" />

            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Payment Voucher Details
                </h3>
                <p className="text-[9px] text-[#8b9bb4] font-mono">
                  {viewVoucher.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewVoucher(null)}
                className="p-1.5 rounded-xl bg-white/5 text-[#8b9bb4] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {[
                ['Voucher No', viewVoucher.id],
                ['Date', viewVoucher.voucher_date],
                [
                  'Supplier',
                  suppliers.find((s) => s.id === viewVoucher.supplier_id)?.shop_name ||
                    suppliers.find((s) => s.id === viewVoucher.supplier_id)?.name ||
                    viewVoucher.supplier_id
                ],
                ['Supplier ID', viewVoucher.supplier_id],
                ['Payment Mode', viewVoucher.payment_mode],
                ['Reference', viewVoucher.reference_no || '—'],
                ['Amount', money(Number(viewVoucher.amount || 0))],
                ['Status', viewVoucher.status],
                ['Notes', viewVoucher.notes || '—']
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-start justify-between gap-4 p-2.5 rounded-xl bg-[#0a0e17] border border-white/5"
                >
                  <span className="text-[9px] uppercase font-mono text-[#8b9bb4]">
                    {label}
                  </span>
                  <span className="text-[10px] text-white font-semibold text-right">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
