import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  Download,
  Edit3,
  FileText,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ExpensesManagerProps {
  currentUser?: { role?: string | null; full_name?: string | null } | null;
}

interface ExpenseRecord {
  id: string;
  expense_date: string;
  category: string;
  description?: string | null;
  amount: number;
  payment_mode: string;
  reference_no?: string | null;
  notes?: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
}

const EXPENSE_CATEGORIES = [
  'Rent',
  'Salary',
  'Electricity',
  'Internet',
  'Transport',
  'Packaging',
  'Maintenance',
  'Marketing',
  'Office',
  'Bank Charges',
  'Courier',
  'Travel',
  'Miscellaneous'
];

const PAYMENT_MODES = ['CASH', 'UPI', 'BANK TRANSFER', 'CARD', 'CHEQUE'];

const clean = (v: unknown) => String(v ?? '').trim();
const money = (v: number) =>
  `₹${Number(v || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

function roleFlags(roleValue: string | null | undefined) {
  const role = clean(roleValue).toLowerCase();
  return {
    canView: ['admin', 'manager', 'operations'].includes(role),
    canCreate: ['admin', 'manager', 'operations'].includes(role),
    canEdit: ['admin', 'manager'].includes(role),
    canDelete: role === 'admin'
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export default function ExpensesManager({ currentUser }: ExpensesManagerProps) {
  const { canView, canCreate, canEdit, canDelete } = roleFlags(currentUser?.role);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());

  const [showEntry, setShowEntry] = useState(false);
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const [viewing, setViewing] = useState<ExpenseRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);

  const [expenseId, setExpenseId] = useState('');
  const [expenseDate, setExpenseDate] = useState(today());
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('id,expense_date,category,description,amount,payment_mode,reference_no,notes,status,created_at,updated_at')
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses((data || []) as ExpenseRecord[]);
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Unable to load expenses.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canView]);

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (fromDate && expense.expense_date < fromDate) return false;
      if (toDate && expense.expense_date > toDate) return false;
      if (categoryFilter !== 'ALL' && expense.category !== categoryFilter) return false;
      if (paymentFilter !== 'ALL' && expense.payment_mode !== paymentFilter) return false;
      if (!q) return true;
      return [
        expense.id,
        expense.category,
        expense.description,
        expense.payment_mode,
        expense.reference_no,
        expense.notes
      ].some((v) => clean(v).toLowerCase().includes(q));
    });
  }, [expenses, search, categoryFilter, paymentFilter, fromDate, toDate]);

  const summary = useMemo(() => {
    const total = filteredExpenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const count = filteredExpenses.length;
    const categoryTotals = new Map<string, number>();
    filteredExpenses.forEach((row) => {
      categoryTotals.set(row.category, (categoryTotals.get(row.category) || 0) + Number(row.amount || 0));
    });
    const topCategory = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0];
    const todayTotal = expenses
      .filter((row) => row.expense_date === today() && row.status !== 'cancelled')
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return { total, count, topCategory, todayTotal };
  }, [filteredExpenses, expenses]);

  const getNextExpenseNo = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('id')
      .like('id', 'KFEXP%')
      .order('id', { ascending: false })
      .limit(1);
    if (error) throw error;
    const latest = data?.[0]?.id ? String(data[0].id) : '';
    const match = latest.match(/(\d+)$/);
    const next = match ? Number(match[1]) + 1 : 1;
    return `KFEXP${String(next).padStart(4, '0')}`;
  };

  const resetEntry = async () => {
    setEditing(null);
    setExpenseId(await getNextExpenseNo());
    setExpenseDate(today());
    setCategory('');
    setDescription('');
    setAmount('');
    setPaymentMode('CASH');
    setReferenceNo('');
    setNotes('');
    setMessage(null);
    setShowEntry(true);
  };

  const openEdit = (expense: ExpenseRecord) => {
    setEditing(expense);
    setExpenseId(expense.id);
    setExpenseDate(expense.expense_date);
    setCategory(expense.category);
    setDescription(expense.description || '');
    setAmount(String(expense.amount ?? ''));
    setPaymentMode(expense.payment_mode);
    setReferenceNo(expense.reference_no || '');
    setNotes(expense.notes || '');
    setMessage(null);
    setShowEntry(true);
  };

  const saveExpense = async () => {
    if (!canCreate && !editing) return;
    if (!editing && !canCreate) return;
    if (editing && !canEdit) return;

    const numericAmount = Number(amount);
    if (!expenseDate) {
      setMessage({ type: 'error', text: 'Expense date is required.' });
      return;
    }
    if (!category) {
      setMessage({ type: 'error', text: 'Select an expense category.' });
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid expense amount greater than ₹0.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      if (editing) {
        const { error } = await supabase
          .from('expenses')
          .update({
            expense_date: expenseDate,
            category,
            description: description.trim() || null,
            amount: numericAmount,
            payment_mode: paymentMode,
            reference_no: referenceNo.trim() || null,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editing.id);
        if (error) throw error;
        setMessage({ type: 'success', text: `${editing.id} updated successfully.` });
      } else {
        const freshId = await getNextExpenseNo();
        const { data: existing, error: duplicateError } = await supabase
          .from('expenses')
          .select('id')
          .eq('id', freshId)
          .maybeSingle();
        if (duplicateError) throw duplicateError;
        if (existing?.id) throw new Error(`${freshId} already exists. Please save again.`);

        const { error } = await supabase.from('expenses').insert({
          id: freshId,
          expense_date: expenseDate,
          category,
          description: description.trim() || null,
          amount: numericAmount,
          payment_mode: paymentMode,
          reference_no: referenceNo.trim() || null,
          notes: notes.trim() || null,
          status: 'completed'
        });
        if (error) throw error;
        setMessage({ type: 'success', text: `${freshId} saved successfully.` });
      }

      setShowEntry(false);
      setEditing(null);
      await loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Unable to save expense.' });
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async () => {
    if (!deleteTarget || !canDelete) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      setMessage({ type: 'success', text: `${deleteTarget.id} deleted successfully.` });
      await loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Unable to delete expense.' });
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    if (!filteredExpenses.length) return;
    const header = ['Expense No', 'Date', 'Category', 'Description', 'Payment Mode', 'Reference No', 'Amount', 'Notes'];
    const rows = filteredExpenses.map((row) => [
      row.id,
      row.expense_date,
      row.category,
      row.description || '',
      row.payment_mode,
      row.reference_no || '',
      Number(row.amount || 0).toFixed(2),
      row.notes || ''
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Kashvi_Expenses_${fromDate}_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!canView) {
    return (
      <div className="p-10 rounded-3xl bg-[#101628]/95 border border-white/10 text-center">
        <Receipt className="w-8 h-8 text-[#ff6b6b] mx-auto mb-3" />
        <h2 className="text-white font-bold">Expenses Restricted</h2>
        <p className="text-[#8b9bb4] text-xs mt-2">Your role does not have access to Expenses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-[#ff6b6b]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Expenses</h1>
              <p className="text-[10px] text-[#8b9bb4] font-mono uppercase tracking-wider">Accounts → Operating Expenses</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} disabled={!filteredExpenses.length} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[#8b9bb4] hover:text-white text-xs flex items-center gap-2 disabled:opacity-40">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={loadData} disabled={loading} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[#8b9bb4] hover:text-white text-xs flex items-center gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {canCreate && (
            <button onClick={resetEntry} className="px-3 py-2 rounded-xl bg-[#ff6b6b]/15 border border-[#ff6b6b]/30 text-[#ffb0b0] hover:text-white hover:bg-[#ff6b6b]/25 text-xs font-bold flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> New Expense
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`rounded-xl px-3 py-2.5 text-xs border flex items-center gap-2 ${message.type === 'success' ? 'bg-[#00ff9d]/10 border-[#00ff9d]/20 text-[#00ff9d]' : 'bg-[#ff6b6b]/10 border-[#ff6b6b]/20 text-[#ffb4b4]'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2.5">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b9bb4]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expense no / category / description / reference..." className="w-full bg-[#0a0e17] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:border-[#ff6b6b]/40" />
          </div>
          <div className="relative">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full appearance-none bg-[#0a0e17] border border-white/10 rounded-xl px-3 pr-9 py-2.5 text-xs text-white outline-none">
              <option value="ALL">All Categories</option>
              {EXPENSE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8b9bb4]" />
          </div>
          <div className="relative">
            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="w-full appearance-none bg-[#0a0e17] border border-white/10 rounded-xl px-3 pr-9 py-2.5 text-xs text-white outline-none">
              <option value="ALL">All Payment Modes</option>
              {PAYMENT_MODES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8b9bb4]" />
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-[#8b9bb4] shrink-0" />
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="min-w-0 w-full bg-[#0a0e17] border border-white/10 rounded-xl px-2.5 py-2.5 text-[11px] text-white outline-none" />
            <span className="text-[#64748b] text-[10px]">to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="min-w-0 w-full bg-[#0a0e17] border border-white/10 rounded-xl px-2.5 py-2.5 text-[11px] text-white outline-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <SummaryCard icon={<Wallet className="w-4 h-4" />} label="Filtered Expenses" value={summary.total} />
        <SummaryCard icon={<Receipt className="w-4 h-4" />} label="Expense Entries" value={summary.count} isCount />
        <SummaryCard icon={<CalendarDays className="w-4 h-4" />} label="Today" value={summary.todayTotal} />
        <SummaryCard icon={<FileText className="w-4 h-4" />} label="Top Category" value={summary.topCategory ? `${summary.topCategory[0]} · ${money(summary.topCategory[1])}` : '—'} textValue />
      </div>

      <div className="rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl overflow-hidden">
        <div className="p-3 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Receipt className="w-4 h-4 text-[#ff6b6b]" /><h2 className="text-sm font-black text-white">Expense Ledger</h2><span className="text-[9px] font-mono bg-white/5 text-[#8b9bb4] rounded-lg px-2 py-1">{filteredExpenses.length}</span></div>
            <p className="text-[9px] text-[#64748b] mt-1">Operating expenses only · no supplier or inventory impact</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a0e17] text-[#8b9bb4] font-mono uppercase text-[9px]">
              <tr>
                <th className="p-3">Expense No</th><th className="p-3">Date</th><th className="p-3">Category</th><th className="p-3">Description</th><th className="p-3">Payment</th><th className="p-3">Reference</th><th className="p-3 text-right">Amount</th><th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={8} className="p-10 text-center text-[#8b9bb4]"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#ff6b6b]" /></td></tr>
              ) : filteredExpenses.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-[#8b9bb4]">No expenses found for the selected filters.</td></tr>
              ) : filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-3 font-mono font-extrabold text-[#ff8f8f]">{expense.id}</td>
                  <td className="p-3 whitespace-nowrap text-[#cbd5e1]">{formatDate(expense.expense_date)}</td>
                  <td className="p-3"><span className="px-2 py-1 rounded-lg bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 text-[#ffb0b0] text-[9px] font-bold">{expense.category}</span></td>
                  <td className="p-3 text-[#8b9bb4] max-w-[300px] truncate">{expense.description || '—'}</td>
                  <td className="p-3"><span className="px-2 py-1 rounded-lg bg-[#00d9ff]/10 border border-[#00d9ff]/20 text-[#00d9ff] text-[9px] font-bold">{expense.payment_mode}</span></td>
                  <td className="p-3 text-[#8b9bb4] font-mono text-[10px]">{expense.reference_no || '—'}</td>
                  <td className="p-3 text-right font-mono font-extrabold text-[#ffcf5c]">{money(Number(expense.amount || 0))}</td>
                  <td className="p-3"><div className="flex items-center justify-center gap-1">
                    <button onClick={() => setViewing(expense)} className="p-1.5 rounded-lg text-[#8b9bb4] hover:text-[#00d9ff] hover:bg-white/5" title="View"><FileText className="w-3.5 h-3.5" /></button>
                    {canEdit && <button onClick={() => openEdit(expense)} className="p-1.5 rounded-lg text-[#8b9bb4] hover:text-[#ffcf5c] hover:bg-white/5" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>}
                    {canDelete && <button onClick={() => setDeleteTarget(expense)} className="p-1.5 rounded-lg text-[#8b9bb4] hover:text-[#ff6b6b] hover:bg-white/5" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showEntry && (
        <Modal title={editing ? `Edit ${editing.id}` : 'New Expense'} onClose={() => !saving && setShowEntry(false)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Expense No"><input value={expenseId} readOnly className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none opacity-70" /></Field>
            <Field label="Expense Date"><input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff6b6b]/40" /></Field>
            <Field label="Category *"><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff6b6b]/40"><option value="">Select Category</option>{EXPENSE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
            <Field label="Amount *"><input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff6b6b]/40" /></Field>
            <Field label="Payment Mode"><select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff6b6b]/40">{PAYMENT_MODES.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
            <Field label="Reference No"><input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="UPI / bank / cheque reference" className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff6b6b]/40" /></Field>
            <Field label="Description" full><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this expense for?" className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff6b6b]/40" /></Field>
            <Field label="Notes" full><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional notes" className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff6b6b]/40 resize-none" /></Field>
          </div>
          {message?.type === 'error' && <div className="mt-3 text-xs text-[#ffb4b4] bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 rounded-xl p-2.5">{message.text}</div>}
          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowEntry(false)} disabled={saving} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[#8b9bb4] text-xs">Cancel</button><button onClick={saveExpense} disabled={saving} className="px-4 py-2 rounded-xl bg-[#ff6b6b]/20 border border-[#ff6b6b]/30 text-[#ffb0b0] hover:text-white text-xs font-bold flex items-center gap-2">{saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{editing ? 'Update Expense' : 'Save Expense'}</button></div>
        </Modal>
      )}

      {viewing && (
        <Modal title={viewing.id} onClose={() => setViewing(null)}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Info label="Date" value={formatDate(viewing.expense_date)} /><Info label="Category" value={viewing.category} /><Info label="Amount" value={money(Number(viewing.amount || 0))} /><Info label="Payment" value={viewing.payment_mode} /><Info label="Reference" value={viewing.reference_no || '—'} /><Info label="Status" value={viewing.status} />
          </div>
          <div className="mt-4"><div className="text-[9px] text-[#8b9bb4] font-mono uppercase">Description</div><div className="mt-1 rounded-xl bg-[#0a0e17] border border-white/10 p-3 text-xs text-[#cbd5e1]">{viewing.description || '—'}</div></div>
          <div className="mt-3"><div className="text-[9px] text-[#8b9bb4] font-mono uppercase">Notes</div><div className="mt-1 rounded-xl bg-[#0a0e17] border border-white/10 p-3 text-xs text-[#cbd5e1] whitespace-pre-wrap">{viewing.notes || '—'}</div></div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Expense" onClose={() => !saving && setDeleteTarget(null)}>
          <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 flex items-center justify-center"><Trash2 className="w-5 h-5 text-[#ff6b6b]" /></div><div><p className="text-sm font-bold text-white">Delete {deleteTarget.id}?</p><p className="text-xs text-[#8b9bb4] mt-1">{deleteTarget.category} · {money(Number(deleteTarget.amount || 0))}</p><p className="text-[10px] text-[#64748b] mt-2">This removes only the expense entry. Supplier outstanding and inventory are not affected.</p></div></div>
          <div className="mt-5 flex justify-end gap-2"><button onClick={() => setDeleteTarget(null)} disabled={saving} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[#8b9bb4] text-xs">Cancel</button><button onClick={deleteExpense} disabled={saving} className="px-4 py-2 rounded-xl bg-[#ff6b6b]/15 border border-[#ff6b6b]/30 text-[#ffb0b0] text-xs font-bold">Delete</button></div>
        </Modal>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, isCount, textValue }: { icon: React.ReactNode; label: string; value: number | string; isCount?: boolean; textValue?: boolean }) {
  return <div className="rounded-2xl border border-white/10 p-3 bg-[#101628]/95"><div className="flex items-center gap-2 text-[#8b9bb4] text-[9px] font-mono uppercase">{icon}{label}</div><div className={`mt-2 font-black ${textValue ? 'text-xs text-[#ffcf5c]' : 'text-sm text-white'}`}>{isCount ? String(value) : typeof value === 'number' ? money(value) : value}</div></div>;
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? 'md:col-span-2' : ''}><label className="block text-[9px] text-[#8b9bb4] font-mono uppercase mb-1">{label}</label>{children}</div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#101628] border border-white/10 shadow-2xl"><div className="sticky top-0 z-10 px-4 py-3 bg-[#101628]/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between"><h3 className="text-sm font-black text-white">{title}</h3><button onClick={onClose} className="p-1.5 rounded-lg text-[#8b9bb4] hover:text-white hover:bg-white/5"><X className="w-4 h-4" /></button></div><div className="p-4">{children}</div></div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#0a0e17] border border-white/10 p-3"><div className="text-[9px] text-[#8b9bb4] font-mono uppercase">{label}</div><div className="text-white font-bold mt-1">{value}</div></div>;
}
