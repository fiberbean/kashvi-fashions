import React, { useState, useEffect } from 'react';
import {
  Building2,
  X,
  Plus,
  Trash2,
  Phone,
  MapPin,
  FileSpreadsheet,
  IndianRupee,
  Loader2,
  Check,
  Search
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface SupplierRecord {
  id: string;
  name: string;
  phone?: string | null;
  city?: string | null;
  gstin?: string | null;
  balance_due: number;
  created_at?: string;
}

interface SupplierMasterModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SupplierMasterModal({ onClose, onSuccess }: SupplierMasterModalProps) {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Supplier Form State
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<number | string>(0);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err: any) {
      console.error('Failed to load suppliers:', err);
      setErrorMsg(err.message || 'Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    const suppId = `supp_${Date.now()}`;
    const initialBal = Number(openingBalance) || 0;

    try {
      const { error } = await supabase.from('suppliers').insert([
        {
          id: suppId,
          name: name.trim(),
          phone: phone.trim() || null,
          city: city.trim() || null,
          gstin: gstin.trim() || null,
          balance_due: initialBal
        }
      ]);

      if (error) throw error;

      // Opening balance unte ledger lo initial record veyadam
      if (initialBal > 0) {
        await supabase.from('supplier_ledger').insert([
          {
            id: `led_${Date.now()}_open`,
            supplier_id: suppId,
            transaction_type: 'BILL',
            amount: initialBal,
            balance_after: initialBal,
            description: 'Opening Balance Setup'
          }
        ]);
      }

      setName('');
      setPhone('');
      setCity('');
      setGstin('');
      setOpeningBalance(0);
      fetchSuppliers();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (supp: SupplierRecord) => {
    const confirmDelete = window.confirm(`Permanently delete supplier "${supp.name}"?`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', supp.id);
      if (error) throw error;
      setSuppliers((prev) => prev.filter((s) => s.id !== supp.id));
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.city && s.city.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl select-none font-sans animate-in fade-in">
      <div className="bg-[#101628]/95 border border-white/15 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl relative animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="h-[2px] w-full bg-gradient-to-r from-[#6d4aff] via-[#00d9ff] to-[#00ff9d]" />

        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-white/10 flex items-center justify-between bg-[#0a0e17]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
              <Building2 className="w-4.5 h-4.5 text-[#00d9ff]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Supplier Master</h3>
              <span className="text-[10px] text-[#8b9bb4]">
                Manage Raw Material, Fabric & Finished Goods Vendors
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="m-4 p-3 rounded-2xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 text-[#ff6b6b] text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Add Supplier Form */}
          <form onSubmit={handleAddSupplier} className="p-4 rounded-2xl bg-[#0a0e17]/80 border border-white/10 space-y-3">
            <span className="text-[10.5px] font-mono font-bold text-[#00d9ff] uppercase block tracking-wider">
              ➕ Add New Supplier
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  required
                  placeholder="Supplier / Mill Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#101628] border border-white/10 text-white font-semibold outline-none focus:border-[#00d9ff] text-xs"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#101628] border border-white/10 text-white outline-none focus:border-[#00d9ff] text-xs"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="City / Market Hub"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#101628] border border-white/10 text-white outline-none focus:border-[#00d9ff] text-xs"
                />
              </div>

              <div>
                <input
                  type="number"
                  min="0"
                  placeholder="Opening Due (₹)"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#101628] border border-white/10 text-[#00ff9d] font-bold outline-none focus:border-[#00ff9d] text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#6d4aff]/30 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 text-[#00ff9d]" />}
                <span>Save Supplier Master</span>
              </button>
            </div>
          </form>

          {/* Search Supplier */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendor name, city or phone..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#0a0e17] rounded-xl text-white text-[11px] outline-none border border-white/10 focus:border-[#00d9ff] placeholder:text-[#8b9bb4]/50"
              />
              <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-[10px] font-mono text-[#8b9bb4]">{filteredSuppliers.length} Vendors Registered</span>
          </div>

          {/* Suppliers Table */}
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#101628] text-[#8b9bb4] font-mono uppercase text-[9px] border-b border-white/10">
                <tr>
                  <th className="p-3">Vendor / Firm Name</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Location</th>
                  <th className="p-3 text-right">Current Balance Due</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[#8b9bb4]">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto text-[#00d9ff] mb-1" />
                      Loading supplier list...
                    </td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[#8b9bb4] italic">
                      No suppliers registered yet.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supp) => (
                    <tr key={supp.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-[#00d9ff] shrink-0" />
                          <span>{supp.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-[#8b9bb4] font-mono text-[11px]">
                        {supp.phone ? (
                          <div className="flex items-center gap-1.5 text-white">
                            <Phone className="w-3 h-3 text-[#00ff9d]" />
                            <span>{supp.phone}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3 text-[#8b9bb4]">
                        {supp.city ? (
                          <div className="flex items-center gap-1.5 text-white">
                            <MapPin className="w-3 h-3 text-[#ffa500]" />
                            <span>{supp.city}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-xs">
                        <span className={supp.balance_due > 0 ? 'text-[#ff6b6b]' : 'text-[#00ff9d]'}>
                          ₹{Number(supp.balance_due || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteSupplier(supp)}
                          className="p-1.5 rounded-lg text-[#8b9bb4] hover:text-[#ff6b6b] hover:bg-white/5 cursor-pointer transition-colors"
                          title="Delete Supplier"
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
        </div>
      </div>
    </div>
  );
}