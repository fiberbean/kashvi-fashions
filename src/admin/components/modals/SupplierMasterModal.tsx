import React, { useState, useEffect } from 'react';
import {
  Building2,
  X,
  Plus,
  Trash2,
  Phone,
  MapPin,
  Loader2,
  Check,
  Search,
  IndianRupee,
  Layers,
  MapPinned
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export interface SupplierAddress {
  id: string;
  type: 'Shop / Showroom' | 'Head Office' | 'Godown / Warehouse' | 'Mill / Factory';
  line1: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  is_default?: boolean;
}

export interface SupplierRecord {
  id: string;
  name: string;
  shop_name?: string | null;
  phone?: string | null;
  city?: string | null;
  gstin?: string | null;
  balance_due: number;
  addresses?: SupplierAddress[] | null;
  created_at?: string;
}

interface SupplierMasterModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SupplierMasterModal({ onClose, onSuccess }: SupplierMasterModalProps) {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [codeLoading, setCodeLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [supplierId, setSupplierId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [shopName, setShopName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<number | string>(0);

  // Multiple Detailed Addresses State
  const [addresses, setAddresses] = useState<SupplierAddress[]>([
    {
      id: 'addr_1',
      type: 'Shop / Showroom',
      line1: '',
      landmark: '',
      city: '',
      state: 'Andhra Pradesh',
      pincode: '',
      is_default: true
    }
  ]);

  // Generate automated SUP0001, SUP0002...
  const generateSupplierId = async () => {
    setCodeLoading(true);
    try {
      const { data } = await supabase
        .from('suppliers')
        .select('id')
        .like('id', 'SUP%')
        .order('id', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const match = data[0].id.match(/\d+$/);
        const nextNum = match ? parseInt(match[0], 10) + 1 : 1;
        setSupplierId(`SUP${String(nextNum).padStart(4, '0')}`);
      } else {
        setSupplierId('SUP0001');
      }
    } catch {
      setSupplierId('SUP0001');
    } finally {
      setCodeLoading(false);
    }
  };

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
    generateSupplierId();
  }, []);

  // Address Handlers
  const handleAddAddress = () => {
    setAddresses((prev) => [
      ...prev,
      {
        id: `addr_${Date.now()}`,
        type: 'Godown / Warehouse',
        line1: '',
        landmark: '',
        city: '',
        state: 'Andhra Pradesh',
        pincode: '',
        is_default: false
      }
    ]);
  };

  const handleUpdateAddress = (id: string, field: keyof SupplierAddress, value: any) => {
    setAddresses((prev) =>
      prev.map((addr) => (addr.id === id ? { ...addr, [field]: value } : addr))
    );
  };

  const handleRemoveAddress = (id: string) => {
    if (addresses.length <= 1) {
      alert('At least one address is required.');
      return;
    }
    setAddresses((prev) => prev.filter((addr) => addr.id !== id));
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Check if at least primary address line1 & city are filled
    const firstAddr = addresses[0];
    if (!firstAddr.line1.trim() || !firstAddr.city.trim()) {
      alert('Please fill Door No/Street and City in the primary address.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    const initialBal = Number(openingBalance) || 0;
    const primaryCity = firstAddr.city.trim();

    try {
      const { error } = await supabase.from('suppliers').insert([
        {
          id: supplierId.trim(),
          name: name.trim(),
          shop_name: shopName.trim() || name.trim(),
          phone: phone.trim() || null,
          city: primaryCity || null,
          gstin: gstin.trim() || null,
          balance_due: initialBal,
          addresses: addresses
        }
      ]);

      if (error) throw error;

      if (initialBal > 0) {
        await supabase.from('supplier_ledger').insert([
          {
            id: `led_${Date.now()}_open`,
            supplier_id: supplierId.trim(),
            transaction_type: 'BILL',
            amount: initialBal,
            balance_after: initialBal,
            description: 'Opening Balance Setup'
          }
        ]);
      }

      // Reset form & generate next ID
      setName('');
      setShopName('');
      setPhone('');
      setGstin('');
      setOpeningBalance(0);
      setAddresses([
        {
          id: `addr_${Date.now()}`,
          type: 'Shop / Showroom',
          line1: '',
          landmark: '',
          city: '',
          state: 'Andhra Pradesh',
          pincode: '',
          is_default: true
        }
      ]);

      fetchSuppliers();
      generateSupplierId();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (supp: SupplierRecord) => {
    const confirmDelete = window.confirm(`Permanently delete supplier [${supp.id}] - "${supp.name}"?`);
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
      s.id.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      (s.shop_name && s.shop_name.toLowerCase().includes(q)) ||
      (s.city && s.city.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl select-none font-sans animate-in fade-in">
      <div className="bg-[#101628]/95 border border-white/15 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl relative animate-in zoom-in-95 flex flex-col max-h-[92vh]">
        <div className="h-[2px] w-full bg-gradient-to-r from-[#6d4aff] via-[#00d9ff] to-[#00ff9d]" />

        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-white/10 flex items-center justify-between bg-[#0a0e17]/80 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
              <Building2 className="w-4.5 h-4.5 text-[#00d9ff]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Supplier Master Registry</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/40 text-[9px] font-mono">
                  SUPPLIER CODE AUTO
                </span>
              </h3>
              <span className="text-[10px] text-[#8b9bb4]">
                Automated IDs, Multi-Address Registry & Ledger Accounts
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#0a0e17] px-3.5 py-1.5 rounded-2xl border border-white/15 text-right shadow-inner min-w-[110px]">
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-[#8b9bb4] block">
                SUPPLIER ID
              </span>
              <span className="font-mono text-sm font-extrabold text-[#00ff9d] tracking-wide block">
                {codeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00d9ff] ml-auto" /> : supplierId}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="m-4 p-3 rounded-2xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 text-[#ff6b6b] text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Add Supplier Form */}
          <form onSubmit={handleAddSupplier} className="p-4 rounded-2xl bg-[#0a0e17]/80 border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[11px] font-mono font-bold text-[#00d9ff] uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Supplier Identification Details
              </span>
              <span className="text-[9px] font-mono text-[#00ff9d] bg-[#00ff9d]/10 px-2 py-0.5 rounded border border-[#00ff9d]/30">
                Code: {supplierId}
              </span>
            </div>

            {/* Firm, Contact & Opening Balance */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#101628] border border-white/10 text-white font-semibold outline-none focus:border-[#00d9ff] text-xs"
                />
              </div>

              <div>
                <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                  Firm / Shop Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Balaji Textiles & Mills"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#101628] border border-white/10 text-white font-semibold outline-none focus:border-[#00d9ff] text-xs"
                />
              </div>

              <div>
                <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                  Cell / Phone Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9848012345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#101628] border border-white/10 text-white font-mono font-semibold outline-none focus:border-[#00d9ff] text-xs"
                />
              </div>

              <div>
                <label className="text-[9.5px] font-mono text-[#8b9bb4] uppercase block mb-1 font-bold">
                  Opening Balance Due (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#101628] border border-white/10 text-[#00ff9d] font-bold outline-none focus:border-[#00ff9d] text-xs"
                />
              </div>
            </div>

            {/* Multiple Addresses Management */}
            <div className="p-3.5 bg-[#101628] rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-mono font-bold text-[#00d9ff] flex items-center gap-1.5 uppercase">
                  <MapPinned className="w-3.5 h-3.5 text-[#00ff9d]" /> Detailed Addresses ({addresses.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddAddress}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[#00d9ff] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Another Address</span>
                </button>
              </div>

              <div className="space-y-3">
                {addresses.map((addr, idx) => (
                  <div
                    key={addr.id}
                    className="p-3 rounded-xl bg-[#0a0e17] border border-white/10 space-y-2.5 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-mono text-[#8b9bb4] uppercase font-bold flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center text-[9px]">
                          {idx + 1}
                        </span>
                        <span>{idx === 0 ? 'Primary Address' : `Address #${idx + 1}`}</span>
                      </span>

                      {addresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAddress(addr.id)}
                          className="text-[#ff6b6b] hover:text-white p-1 cursor-pointer"
                          title="Remove Address"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                      <div className="sm:col-span-2">
                        <label className="text-[8.5px] font-mono text-[#8b9bb4] uppercase block mb-0.5">Address Type</label>
                        <select
                          value={addr.type}
                          onChange={(e) => handleUpdateAddress(addr.id, 'type', e.target.value as any)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#101628] border border-white/10 text-white text-[11px] outline-none"
                        >
                          <option value="Shop / Showroom">Shop / Showroom</option>
                          <option value="Head Office">Head Office</option>
                          <option value="Godown / Warehouse">Godown / Warehouse</option>
                          <option value="Mill / Factory">Mill / Factory</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="text-[8.5px] font-mono text-[#8b9bb4] uppercase block mb-0.5">
                          Door No, Building, Street / Road *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="D.No: 12-3-4, Main Market Road, Textile Lane"
                          value={addr.line1}
                          onChange={(e) => handleUpdateAddress(addr.id, 'line1', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#101628] border border-white/10 text-white text-[11px] outline-none focus:border-[#00d9ff]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[8.5px] font-mono text-[#8b9bb4] uppercase block mb-0.5">Landmark</label>
                        <input
                          type="text"
                          placeholder="Near Clock Tower"
                          value={addr.landmark}
                          onChange={(e) => handleUpdateAddress(addr.id, 'landmark', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#101628] border border-white/10 text-white text-[11px] outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[8.5px] font-mono text-[#8b9bb4] uppercase block mb-0.5">City / Town *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Surat / Surat Cloth Market"
                          value={addr.city}
                          onChange={(e) => handleUpdateAddress(addr.id, 'city', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#101628] border border-white/10 text-white text-[11px] outline-none focus:border-[#00d9ff]"
                        />
                      </div>

                      <div>
                        <label className="text-[8.5px] font-mono text-[#8b9bb4] uppercase block mb-0.5">State</label>
                        <input
                          type="text"
                          placeholder="Gujarat / Andhra Pradesh"
                          value={addr.state}
                          onChange={(e) => handleUpdateAddress(addr.id, 'state', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#101628] border border-white/10 text-white text-[11px] outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[8.5px] font-mono text-[#8b9bb4] uppercase block mb-0.5">Pincode</label>
                        <input
                          type="text"
                          placeholder="533001"
                          value={addr.pincode}
                          onChange={(e) => handleUpdateAddress(addr.id, 'pincode', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#101628] border border-white/10 text-white text-[11px] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting || codeLoading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#6d4aff]/30 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-[#00ff9d]" />}
                <span>Save Supplier & Auto Register ({supplierId})</span>
              </button>
            </div>
          </form>

          {/* Search Supplier Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Code, Firm Name, City or Cell..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#0a0e17] rounded-xl text-white text-[11px] outline-none border border-white/10 focus:border-[#00d9ff] placeholder:text-[#8b9bb4]/50"
              />
              <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-[10px] font-mono text-[#8b9bb4]">{filteredSuppliers.length} Registered Suppliers</span>
          </div>

          {/* Suppliers Registered Master Table */}
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#101628] text-[#8b9bb4] font-mono uppercase text-[9px] border-b border-white/10">
                <tr>
                  <th className="p-3">Supplier ID</th>
                  <th className="p-3">Firm & Contact</th>
                  <th className="p-3">Cell Phone</th>
                  <th className="p-3">Registered Addresses</th>
                  <th className="p-3 text-right">Balance Due</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-[#8b9bb4]">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto text-[#00d9ff] mb-1" />
                      Loading supplier registry...
                    </td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-[#8b9bb4] italic">
                      No suppliers found. Fill the form above to add one.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supp) => (
                    <tr key={supp.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-mono font-extrabold text-[#00ff9d]">
                        {supp.id}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-white block">{supp.shop_name || supp.name}</span>
                        <span className="text-[10px] text-[#8b9bb4]">Attn: {supp.name}</span>
                      </td>
                      <td className="p-3 text-white font-mono text-[11px]">
                        {supp.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#00d9ff]" />
                            <span>{supp.phone}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3 max-w-xs">
                        {supp.addresses && supp.addresses.length > 0 ? (
                          <div className="space-y-1">
                            {supp.addresses.map((ad, i) => (
                              <div key={i} className="text-[10px] text-[#8b9bb4] leading-tight">
                                <span className="text-white font-semibold">{ad.type}:</span> {ad.line1}, {ad.city}
                                {ad.pincode ? ` - ${ad.pincode}` : ''}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#8b9bb4] text-[10px]">{supp.city || '—'}</span>
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