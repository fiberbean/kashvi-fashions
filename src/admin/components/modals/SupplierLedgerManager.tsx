import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BookOpen, Building2, CalendarDays, ChevronDown, Download, FileText, Loader2, MapPin, Phone, RefreshCw, Search, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface SupplierLedgerManagerProps {
  currentUser?: { role?: string | null; full_name?: string | null } | null;
}

interface SupplierRecord {
  id: string;
  name: string;
  shop_name?: string | null;
  phone?: string | null;
  city?: string | null;
  balance_due?: number | null;
}

interface LedgerRow {
  id: string;
  supplier_id: string;
  purchase_id?: string | null;
  transaction_type: string;
  amount: number;
  balance_after?: number | null;
  description?: string | null;
  created_at?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
}

const clean = (v: unknown) => String(v ?? '').trim();
const money = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function roleFlags(roleValue: string | null | undefined) {
  const role = clean(roleValue).toLowerCase();
  return {
    role,
    canView: ['admin', 'manager', 'operations'].includes(role)
  };
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function displaySupplier(s: SupplierRecord) {
  return s.shop_name?.trim() || s.name || s.id;
}

export default function SupplierLedgerManager({ currentUser }: SupplierLedgerManagerProps) {
  const { role, canView } = roleFlags(currentUser?.role);

  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [showSupplierList, setShowSupplierList] = useState(false);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [message, setMessage] = useState('');

  const loadData = async () => {
    if (!canView) return;
    setLoading(true);
    setMessage('');
    try {
      const [supplierRes, ledgerRes] = await Promise.all([
        supabase
          .from('suppliers')
          .select('id,name,shop_name,phone,city,balance_due')
          .order('name', { ascending: true }),
        supabase
          .from('supplier_ledger')
          .select('id,supplier_id,purchase_id,transaction_type,amount,balance_after,description,created_at,reference_id,reference_type')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
      ]);

      if (supplierRes.error) throw supplierRes.error;
      if (ledgerRes.error) throw ledgerRes.error;

      setSuppliers((supplierRes.data || []) as SupplierRecord[]);
      setLedger((ledgerRes.data || []) as LedgerRow[]);
    } catch (err: any) {
      setMessage(err?.message || 'Unable to load Supplier Ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canView]);

  const supplierLedger = useMemo(() => {
    if (!selectedSupplierId) return [];
    return ledger.filter((row) => row.supplier_id === selectedSupplierId);
  }, [ledger, selectedSupplierId]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId) || null,
    [suppliers, selectedSupplierId]
  );

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      [s.id, s.name, s.shop_name, s.phone, s.city]
        .some((v) => clean(v).toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearch]);

  const filteredLedger = useMemo(() => {
    const q = transactionSearch.trim().toLowerCase();
    return supplierLedger.filter((row) => {
      if (typeFilter !== 'ALL' && row.transaction_type !== typeFilter) return false;
      if (!q) return true;
      return [
        row.id,
        row.purchase_id,
        row.transaction_type,
        row.reference_id,
        row.reference_type,
        row.description
      ].some((v) => clean(v).toLowerCase().includes(q));
    });
  }, [supplierLedger, transactionSearch, typeFilter]);

  const summary = useMemo(() => {
    let purchases = 0;
    let returns = 0;
    let payments = 0;
    let opening = 0;

    for (const row of supplierLedger) {
      const type = clean(row.transaction_type).toUpperCase();
      const amount = Number(row.amount || 0);
      if (type === 'PURCHASE') purchases += amount;
      else if (type === 'PURCHASE_RETURN') returns += Math.abs(amount);
      else if (type === 'PAYMENT') payments += Math.abs(amount);
      else if (type === 'OPENING_BALANCE' || type === 'BILL') opening += amount;
    }

    return {
      opening,
      purchases,
      returns,
      payments,
      outstanding: Number(selectedSupplier?.balance_due || 0)
    };
  }, [supplierLedger, selectedSupplier]);

  const transactionTypes = useMemo(() => {
    const values = new Set(supplierLedger.map((x) => x.transaction_type));
    return Array.from(values).sort();
  }, [supplierLedger]);

  const handleSelectSupplier = (supplier: SupplierRecord) => {
    setSelectedSupplierId(supplier.id);
    setSupplierSearch(displaySupplier(supplier));
    setShowSupplierList(false);
    setTransactionSearch('');
    setTypeFilter('ALL');
  };

  const exportCsv = () => {
    if (!selectedSupplier || !filteredLedger.length) return;
    const header = ['Date', 'Transaction Type', 'Reference', 'Purchase', 'Debit/Credit', 'Balance After', 'Description'];
    const rows = filteredLedger.map((row) => [
      formatDate(row.created_at),
      row.transaction_type,
      row.reference_id || '',
      row.purchase_id || '',
      Number(row.amount || 0).toFixed(2),
      Number(row.balance_after || 0).toFixed(2),
      row.description || ''
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSupplier.id}_Supplier_Ledger.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!canView) {
    return (
      <div className="p-10 rounded-3xl bg-[#101628]/95 border border-white/10 text-center">
        <BookOpen className="w-8 h-8 text-[#ff6b6b] mx-auto mb-3" />
        <h2 className="text-white font-bold">Supplier Ledger Restricted</h2>
        <p className="text-[#8b9bb4] text-xs mt-2">Your role does not have access to Supplier Ledger.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 font-sans pb-4">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#00d9ff]/10 border border-[#00d9ff]/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#00d9ff]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Supplier Ledger</h1>
              <p className="text-[9px] text-[#71809a] font-mono uppercase tracking-[0.18em] mt-0.5">Accounts → Supplier Ledger</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedSupplier && (
            <button
              onClick={exportCsv}
              disabled={!filteredLedger.length}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#a7b3c8] hover:text-white hover:bg-white/[0.07] text-xs flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#a7b3c8] hover:text-white hover:bg-white/[0.07] text-xs flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Supplier selector */}
      <div className="rounded-2xl bg-[#101628]/95 border border-white/10 shadow-xl p-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-[#00d9ff]" />
            <label className="text-[9px] text-[#8b9bb4] font-mono uppercase tracking-wider">Supplier</label>
          </div>
          {selectedSupplier && <span className="text-[9px] text-[#65748d] font-mono">{selectedSupplier.id}</span>}
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#73829b]" />
          <input
            value={supplierSearch}
            onFocus={() => setShowSupplierList(true)}
            onChange={(e) => {
              setSupplierSearch(e.target.value);
              setShowSupplierList(true);
              if (!e.target.value) setSelectedSupplierId('');
            }}
            placeholder="Search Supplier ID / Name / Shop / Phone / City..."
            className="w-full bg-[#080c14] border border-white/10 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder:text-[#56647a] outline-none focus:border-[#00d9ff]/40 focus:ring-1 focus:ring-[#00d9ff]/10 transition-all"
          />
          {supplierSearch && (
            <button
              onClick={() => { setSupplierSearch(''); setSelectedSupplierId(''); setShowSupplierList(false); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#73829b] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {showSupplierList && (
            <div className="absolute z-40 mt-1 w-full max-h-64 overflow-y-auto rounded-2xl bg-[#101628] border border-white/10 shadow-2xl shadow-black/40">
              {filteredSuppliers.length === 0 ? (
                <div className="p-4 text-xs text-[#8b9bb4] text-center">No suppliers found.</div>
              ) : filteredSuppliers.map((supplier) => {
                const due = Number(supplier.balance_due || 0);
                return (
                  <button
                    key={supplier.id}
                    onClick={() => handleSelectSupplier(supplier)}
                    className={`w-full text-left px-3 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/[0.04] transition-colors ${supplier.id === selectedSupplierId ? 'bg-[#00d9ff]/10' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{displaySupplier(supplier)}</div>
                        <div className="text-[9px] font-mono text-[#71809a] mt-1 truncate">
                          {supplier.id}{supplier.phone ? ` • ${supplier.phone}` : ''}{supplier.city ? ` • ${supplier.city}` : ''}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[8px] uppercase tracking-wider text-[#68768d]">Outstanding</div>
                        <div className={`text-xs font-black ${due > 0 ? 'text-[#ffb000]' : 'text-[#00e6a0]'}`}>{money(due)}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 p-3 text-xs text-[#ffb4b4]">{message}</div>
      )}

      {!selectedSupplier ? (
        <div className="rounded-2xl bg-[#101628]/95 border border-white/10 min-h-[220px] flex items-center justify-center text-center px-6">
          <div>
            <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-[#73829b]" />
            </div>
            <h3 className="text-white font-bold">Select a Supplier</h3>
            <p className="text-[#71809a] text-xs mt-2 max-w-md">Choose a supplier above to view purchases, purchase returns, payments and the running outstanding balance.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Supplier profile */}
          <div className="rounded-2xl bg-[#101628]/95 border border-white/10 shadow-xl p-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#00d9ff]/10 border border-[#00d9ff]/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[#00d9ff]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-base font-black text-white truncate">{displaySupplier(selectedSupplier)}</div>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-[8px] font-mono text-[#8b9bb4]">{selectedSupplier.id}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[9px] text-[#71809a]">
                    {selectedSupplier.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{selectedSupplier.phone}</span>}
                    {selectedSupplier.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedSupplier.city}</span>}
                  </div>
                </div>
              </div>
              <div className="lg:text-right lg:pl-6 lg:border-l lg:border-white/10">
                <div className="text-[8px] text-[#71809a] font-mono uppercase tracking-wider">Current Outstanding</div>
                <div className={`text-2xl font-black mt-0.5 ${summary.outstanding > 0 ? 'text-[#ffb000]' : 'text-[#00e6a0]'}`}>{money(summary.outstanding)}</div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2">
            <SummaryCard icon={<Wallet className="w-3.5 h-3.5" />} label="Opening" value={summary.opening} />
            <SummaryCard icon={<TrendingUp className="w-3.5 h-3.5" />} label="Purchases" value={summary.purchases} />
            <SummaryCard icon={<TrendingDown className="w-3.5 h-3.5" />} label="Returns" value={summary.returns} negative />
            <SummaryCard icon={<TrendingDown className="w-3.5 h-3.5" />} label="Payments" value={summary.payments} negative />
            <SummaryCard icon={<Wallet className="w-3.5 h-3.5" />} label="Outstanding" value={summary.outstanding} highlight />
          </div>

          {/* Ledger */}
          <div className="rounded-2xl bg-[#101628]/95 border border-white/10 shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00d9ff]" />
                  <h2 className="text-sm font-black text-white">Transaction Ledger</h2>
                  <span className="px-1.5 py-0.5 rounded-md bg-white/[0.04] text-[8px] font-mono text-[#71809a]">{filteredLedger.length}</span>
                </div>
                <p className="text-[9px] text-[#65748d] mt-1">Complete supplier transaction history with running balance</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 xl:min-w-[430px]">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#71809a]" />
                  <input value={transactionSearch} onChange={(e) => setTransactionSearch(e.target.value)} placeholder="Search transaction / reference..." className="w-full bg-[#080c14] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-[10px] text-white placeholder:text-[#56647a] outline-none focus:border-[#00d9ff]/30" />
                </div>
                <div className="relative">
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="appearance-none w-full sm:w-auto bg-[#080c14] border border-white/10 rounded-xl pl-3 pr-8 py-2 text-[10px] text-white outline-none cursor-pointer">
                    <option value="ALL">All Transactions</option>
                    {transactionTypes.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#71809a]" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[860px]">
                <thead className="bg-[#080c14] text-[#71809a] font-mono uppercase text-[8px] tracking-wider">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Transaction</th>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff]" /></td></tr>
                  ) : filteredLedger.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-[#71809a]">No ledger transactions found.</td></tr>
                  ) : filteredLedger.map((row) => {
                    const amount = Number(row.amount || 0);
                    const isDebit = amount >= 0;
                    return (
                      <tr key={row.id} className="hover:bg-white/[0.025] transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap text-[#cbd5e1]">
                          <div className="flex items-center gap-1.5"><CalendarDays className="w-3 h-3 text-[#5e6c82]" />{formatDate(row.created_at)}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[8px] font-mono uppercase ${isDebit ? 'bg-[#ffb000]/10 text-[#ffd166] border-[#ffb000]/20' : 'bg-[#00e6a0]/10 text-[#00e6a0] border-[#00e6a0]/20'}`}>
                            {isDebit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {row.transaction_type.replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-[#00d9ff]">{row.reference_id || row.purchase_id || '-'}</td>
                        <td className="px-3 py-2 text-[#8b9bb4] max-w-[360px]">{row.description || '-'}</td>
                        <td className={`px-3 py-2 text-right font-bold whitespace-nowrap ${isDebit ? 'text-[#ffb000]' : 'text-[#00e6a0]'}`}>{isDebit ? '+' : '-'}{money(Math.abs(amount))}</td>
                        <td className="px-3 py-2 text-right font-black text-white whitespace-nowrap">{money(Number(row.balance_after || 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, negative, highlight }: { icon: React.ReactNode; label: string; value: number; negative?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-2.5 bg-[#101628]/95 ${highlight ? 'border-[#ffb000]/30 bg-[#ffb000]/[0.025]' : 'border-white/10'}`}>
      <div className="flex items-center gap-2 text-[#71809a] text-[8px] font-mono uppercase tracking-wider">{icon}{label}</div>
      <div className={`mt-2 text-sm font-black ${highlight ? 'text-[#ffb000]' : negative ? 'text-[#00e6a0]' : 'text-white'}`}>{money(value)}</div>
    </div>
  );
}
