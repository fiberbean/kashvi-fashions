import React, { useEffect, useState } from 'react';
import {
  Layers,
  Palette,
  Ruler,
  Scissors,
  Scale,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Truck,
  Users,
  Search,
  MessageCircle,
  Sparkles,
  MapPin,
  Tag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  CategoryRecord,
  SubCategoryRecord,
  ColourRecord,
  SizeRecord,
  FabricRecord,
  UnitRecord,
  PincodeRecord,
  DeliveryRateCardRecord,
  CustomerMasterRecord,
  AdminStaffUser
} from '../types';

interface AdminMastersProps {
  currentUser: AdminStaffUser | null;
}

export default function AdminMasters({ currentUser }: AdminMastersProps) {
  // Main Pillar Tabs
  const [activeTab, setActiveTab] = useState<'categories' | 'variants' | 'logistics' | 'customers'>('categories');
  const [variantSubTab, setVariantSubTab] = useState<'colours' | 'sizes' | 'fabrics' | 'units'>('colours');
  const [logisticsSubTab, setLogisticsSubTab] = useState<'pincodes' | 'ratecards'>('pincodes');

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data States matched to database tables
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryRecord[]>([]);
  const [colours, setColours] = useState<ColourRecord[]>([]);
  const [sizes, setSizes] = useState<SizeRecord[]>([]);
  const [fabrics, setFabrics] = useState<FabricRecord[]>([]);
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [pincodes, setPincodes] = useState<PincodeRecord[]>([]);
  const [rateCards, setRateCards] = useState<DeliveryRateCardRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerMasterRecord[]>([]);

  // Permissions
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const canDelete = currentUser?.role === 'admin';

  // Modals state
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Form Inputs
  const [catName, setCatName] = useState('');
  const [catDept, setCatDept] = useState('fashions');

  const [subCatName, setSubCatName] = useState('');
  const [subCatParentId, setSubCatParentId] = useState('');

  const [variantNameInput, setVariantNameInput] = useState('');
  const [unitShortName, setUnitShortName] = useState('');

  // Pincode Inputs
  const [pinNumber, setPinNumber] = useState('');
  const [pinCity, setPinCity] = useState('');
  const [pinState, setPinState] = useState('');
  const [pinZone, setPinZone] = useState('Within State');

  // Load all master tables data
  const loadMastersData = async () => {
    setLoading(true);
    try {
      // 1. Categories & Subcategories
      const { data: catData } = await supabase.from('categories').select('*').order('name');
      if (catData) setCategories(catData);

      const { data: subCatData } = await supabase.from('sub_categories').select('*').order('name');
      if (subCatData) setSubCategories(subCatData);

      // 2. Variants: Colours, Sizes, Fabrics, Units
      const { data: colData } = await supabase.from('colours').select('*').order('name');
      if (colData) setColours(colData);

      const { data: sizeData } = await supabase.from('sizes').select('*').order('name');
      if (sizeData) setSizes(sizeData);

      const { data: fabData } = await supabase.from('fabrics').select('*').order('name');
      if (fabData) setFabrics(fabData);

      const { data: unitData } = await supabase.from('units').select('*').order('name');
      if (unitData) setUnits(unitData);

      // 3. Logistics: Pincodes & Rate Cards
      const { data: pinData } = await supabase.from('pincodes').select('*').order('pincode').limit(150);
      if (pinData) setPincodes(pinData);

      const { data: rateData } = await supabase.from('delivery_rate_cards').select('*').order('weight_from');
      if (rateData) setRateCards(rateData);

      // 4. Customers List from Orders
      const { data: orders } = await supabase.from('orders').select('*');
      if (orders && orders.length > 0) {
        const custMap = new Map<string, CustomerMasterRecord>();
        orders.forEach((o: any) => {
          const phone = o.customer_phone || 'N/A';
          const name = o.customer_name || 'Guest User';
          const amt = Number(o.total_amount) || 0;
          const city = o.shipping_address ? o.shipping_address.split(',').slice(-2, -1)[0]?.trim() : 'AP';

          if (custMap.has(phone)) {
            const existing = custMap.get(phone)!;
            existing.total_orders += 1;
            existing.total_spend += amt;
          } else {
            custMap.set(phone, {
              id: phone,
              name,
              phone,
              email: o.customer_email,
              total_orders: 1,
              total_spend: amt,
              city,
              last_order_date: o.created_at
            });
          }
        });
        setCustomers(Array.from(custMap.values()));
      }
    } catch (err) {
      console.error('Failed to fetch masters state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMastersData();
  }, []);

  // Helper ID generator for text primary keys
  const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // 1. Add Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const id = makeId('cat');
    const slug = catName.trim().toLowerCase().replace(/\s+/g, '-');

    const { data, error } = await supabase
      .from('categories')
      .insert([{
        id,
        name: catName.trim(),
        slug,
        department: catDept,
        active: true
      }])
      .select()
      .single();

    if (!error && data) {
      setCategories((prev) => [...prev, data]);
      setCatName('');
      setActiveModal(null);
    }
  };

  // 2. Add Sub-Category
  const handleSaveSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCatName.trim() || !subCatParentId) return;

    const parent = categories.find((c) => c.id === subCatParentId);
    const id = makeId('subcat');

    const { data, error } = await supabase
      .from('sub_categories')
      .insert([{
        id,
        name: subCatName.trim(),
        category_id: subCatParentId,
        category_name: parent?.name || '',
        active: true
      }])
      .select()
      .single();

    if (!error && data) {
      setSubCategories((prev) => [...prev, data]);
      setSubCatName('');
      setActiveModal(null);
    }
  };

  // 3. Add Variant (Colour / Size / Fabric / Unit)
  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantNameInput.trim()) return;

    const name = variantNameInput.trim();

    if (variantSubTab === 'colours') {
      const id = makeId('col');
      const { data, error } = await supabase.from('colours').insert([{ id, name, active: true }]).select().single();
      if (!error && data) setColours((prev) => [...prev, data]);
    } else if (variantSubTab === 'sizes') {
      const id = makeId('sz');
      const { data, error } = await supabase.from('sizes').insert([{ id, name, active: true }]).select().single();
      if (!error && data) setSizes((prev) => [...prev, data]);
    } else if (variantSubTab === 'fabrics') {
      const id = makeId('fab');
      const { data, error } = await supabase.from('fabrics').insert([{ id, name }]).select().single();
      if (!error && data) setFabrics((prev) => [...prev, data]);
    } else if (variantSubTab === 'units') {
      const id = makeId('unt');
      const { data, error } = await supabase
        .from('units')
        .insert([{ id, name, short_name: unitShortName.trim() || name, active: true }])
        .select()
        .single();
      if (!error && data) setUnits((prev) => [...prev, data]);
    }

    setVariantNameInput('');
    setUnitShortName('');
    setActiveModal(null);
  };

  // 4. Add Pincode
  const handleSavePincode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinNumber.trim().length !== 6) {
      alert('Pincode must be exactly 6 digits.');
      return;
    }

    const id = makeId('pin');
    const { data, error } = await supabase
      .from('pincodes')
      .insert([{
        id,
        pincode: pinNumber.trim(),
        city: pinCity.trim() || 'Kakinada',
        state: pinState.trim() || 'Andhra Pradesh',
        zone_type: pinZone,
        delivery_available: true
      }])
      .select()
      .single();

    if (!error && data) {
      setPincodes((prev) => [data, ...prev]);
      setPinNumber('');
      setPinCity('');
      setPinState('');
      setActiveModal(null);
    }
  };

  // Generic Delete Action for text ID primary keys
  const handleDeleteItem = async (table: string, id: string) => {
    if (!canDelete) {
      alert('Access Denied: Only Admin can delete master records.');
      return;
    }
    if (!confirm('Permanently delete this record?')) return;

    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) {
      loadMastersData();
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 select-none font-sans pb-12">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e2eae6] shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#e4efe9] text-[#0b3b2c] text-[9.5px] font-bold uppercase tracking-wider mb-1 border border-[#dce6e1]">
            <Sparkles className="w-2.5 h-2.5 text-[#c6933a]" /> Kashvi Master Vaults
          </div>
          <h1 className="text-xl font-serif font-bold text-[#0b3b2c] leading-none">
            Store Masters, Variants & Logistics Engine
          </h1>
          <p className="text-[11px] text-[#4d6960] mt-1">
            Connected to tables: categories, sub_categories, colours, sizes, fabrics, units, pincodes, rate cards.
          </p>
        </div>

        {/* Pillar Switcher */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#f0f4f2] rounded-full self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'categories'
                ? 'bg-[#0b3b2c] text-white shadow-xs'
                : 'text-[#4d6960] hover:text-[#0b3b2c]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Categories</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('variants')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'variants'
                ? 'bg-[#0b3b2c] text-white shadow-xs'
                : 'text-[#4d6960] hover:text-[#0b3b2c]'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Dynamic Variants</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logistics')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'logistics'
                ? 'bg-[#0b3b2c] text-white shadow-xs'
                : 'text-[#4d6960] hover:text-[#0b3b2c]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Pincodes & Rates</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'customers'
                ? 'bg-[#0b3b2c] text-white shadow-xs'
                : 'text-[#4d6960] hover:text-[#0b3b2c]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customers</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB 1: CATEGORIES & SUB-CATEGORIES */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Left: Main Categories */}
            <div className="bg-white rounded-2xl border border-[#e2eae6] shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 border-b border-[#edf2ef] flex items-center justify-between bg-[#fbfcfc]">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#0b3b2c]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#0b3b2c]">
                    Main Categories ({categories.length})
                  </h3>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('category')}
                    className="px-3 py-1 rounded-full bg-[#0b3b2c] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3 h-3 text-[#e5c07b]" />
                    <span>Add Category</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-[#f8faf9] text-[#809c93] uppercase text-[9px] font-bold tracking-wider border-b border-[#edf2ef]">
                    <tr>
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-4">Department</th>
                      <th className="py-2.5 px-4">Slug</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2ef]">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-[#f4f7f5] transition-colors">
                        <td className="py-2.5 px-4 font-bold text-[#0c2b22]">{cat.name}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-[#f0f4f2] text-[#0b3b2c] text-[10px] font-semibold uppercase">
                            {cat.department || 'fashions'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-400">{cat.slug}</td>
                        <td className="py-2.5 px-4 text-right">
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem('categories', cat.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Sub-Categories */}
            <div className="bg-white rounded-2xl border border-[#e2eae6] shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 border-b border-[#edf2ef] flex items-center justify-between bg-[#fbfcfc]">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0b3b2c]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#0b3b2c]">
                    Sub-Categories ({subCategories.length})
                  </h3>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('subcategory')}
                    className="px-3 py-1 rounded-full bg-[#0b3b2c] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3 h-3 text-[#e5c07b]" />
                    <span>Add Sub-Category</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-[#f8faf9] text-[#809c93] uppercase text-[9px] font-bold tracking-wider border-b border-[#edf2ef]">
                    <tr>
                      <th className="py-2.5 px-4">Sub-Category</th>
                      <th className="py-2.5 px-4">Parent Category</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2ef]">
                    {subCategories.map((sub) => (
                      <tr key={sub.id} className="hover:bg-[#f4f7f5] transition-colors">
                        <td className="py-2.5 px-4 font-bold text-[#0c2b22]">{sub.name}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-[#e4efe9] text-[#0b3b2c] font-bold text-[10px]">
                            {sub.category_name || 'Category'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem('sub_categories', sub.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB 2: DYNAMIC VARIANTS (COLOURS, SIZES, FABRICS, UNITS) */}
      {/* ========================================================================= */}
      {activeTab === 'variants' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVariantSubTab('colours')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  variantSubTab === 'colours' ? 'bg-[#0b3b2c] text-white shadow-xs' : 'bg-white border text-neutral-600'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-[#ff4d6d]" />
                <span>Colours ({colours.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setVariantSubTab('sizes')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  variantSubTab === 'sizes' ? 'bg-[#0b3b2c] text-white shadow-xs' : 'bg-white border text-neutral-600'
                }`}
              >
                <Ruler className="w-3.5 h-3.5 text-blue-500" />
                <span>Sizes ({sizes.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setVariantSubTab('fabrics')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  variantSubTab === 'fabrics' ? 'bg-[#0b3b2c] text-white shadow-xs' : 'bg-white border text-neutral-600'
                }`}
              >
                <Scissors className="w-3.5 h-3.5 text-emerald-500" />
                <span>Fabrics ({fabrics.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setVariantSubTab('units')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  variantSubTab === 'units' ? 'bg-[#0b3b2c] text-white shadow-xs' : 'bg-white border text-neutral-600'
                }`}
              >
                <Scale className="w-3.5 h-3.5 text-amber-500" />
                <span>Units ({units.length})</span>
              </button>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => setActiveModal('variant')}
                className="px-3.5 py-1.5 rounded-full bg-[#0b3b2c] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#e5c07b]" />
                <span>+ Add {variantSubTab.slice(0, -1).toUpperCase()}</span>
              </button>
            )}
          </div>

          {/* Variants Grid List */}
          <div className="bg-white rounded-2xl border border-[#e2eae6] p-5 shadow-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {variantSubTab === 'colours' &&
                colours.map((col) => (
                  <div key={col.id} className="p-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-[#0c2b22] truncate">{col.name}</span>
                    {canDelete && (
                      <button onClick={() => handleDeleteItem('colours', col.id)} className="text-rose-500 hover:text-rose-700">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}

              {variantSubTab === 'sizes' &&
                sizes.map((sz) => (
                  <div key={sz.id} className="p-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-[#0c2b22] truncate">{sz.name}</span>
                    {canDelete && (
                      <button onClick={() => handleDeleteItem('sizes', sz.id)} className="text-rose-500 hover:text-rose-700">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}

              {variantSubTab === 'fabrics' &&
                fabrics.map((fb) => (
                  <div key={fb.id} className="p-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-[#0c2b22] truncate">{fb.name}</span>
                    {canDelete && (
                      <button onClick={() => handleDeleteItem('fabrics', fb.id)} className="text-rose-500 hover:text-rose-700">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}

              {variantSubTab === 'units' &&
                units.map((un) => (
                  <div key={un.id} className="p-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] flex items-center justify-between gap-1.5">
                    <div>
                      <div className="text-xs font-bold text-[#0c2b22]">{un.name}</div>
                      <span className="text-[10px] text-neutral-400 font-mono">{un.short_name}</span>
                    </div>
                    {canDelete && (
                      <button onClick={() => handleDeleteItem('units', un.id)} className="text-rose-500 hover:text-rose-700">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB 3: LOGISTICS (PINCODES & DELIVERY RATE CARDS) */}
      {/* ========================================================================= */}
      {activeTab === 'logistics' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLogisticsSubTab('pincodes')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  logisticsSubTab === 'pincodes' ? 'bg-[#0b3b2c] text-white shadow-xs' : 'bg-white border text-neutral-600'
                }`}
              >
                Delivery Pincodes ({pincodes.length})
              </button>

              <button
                type="button"
                onClick={() => setLogisticsSubTab('ratecards')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  logisticsSubTab === 'ratecards' ? 'bg-[#0b3b2c] text-white shadow-xs' : 'bg-white border text-neutral-600'
                }`}
              >
                Shipping Rate Cards ({rateCards.length})
              </button>
            </div>

            {canEdit && logisticsSubTab === 'pincodes' && (
              <button
                type="button"
                onClick={() => setActiveModal('pincode')}
                className="px-3.5 py-1.5 rounded-full bg-[#0b3b2c] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#e5c07b]" />
                <span>+ Add Pincode</span>
              </button>
            )}
          </div>

          {/* Sub-Tab 1: Pincodes Table */}
          {logisticsSubTab === 'pincodes' && (
            <div className="bg-white rounded-2xl border border-[#e2eae6] overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#fbfcfc] text-[#809c93] uppercase text-[9px] font-bold tracking-wider border-b border-[#edf2ef]">
                  <tr>
                    <th className="py-2.5 px-4">Pincode</th>
                    <th className="py-2.5 px-4">City & State</th>
                    <th className="py-2.5 px-4">Zone Type</th>
                    <th className="py-2.5 px-4">Delivery Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2ef]">
                  {pincodes.map((pin) => (
                    <tr key={pin.id} className="hover:bg-[#f4f7f5] transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#0c2b22] text-sm">{pin.pincode}</td>
                      <td className="py-2.5 px-4 font-semibold text-neutral-800">{pin.city}, {pin.state}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-[#e4efe9] text-[#0b3b2c] font-bold text-[10px]">
                          {pin.zone_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        {pin.delivery_available ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <XCircle className="w-3 h-3" /> Blocked
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem('pincodes', pin.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-Tab 2: Rate Cards */}
          {logisticsSubTab === 'ratecards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rateCards.map((rc) => (
                <div key={rc.id} className="bg-white rounded-2xl p-5 border border-[#e2eae6] shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <span className="font-bold text-sm text-[#0b3b2c]">
                      Weight: {rc.weight_from}g - {rc.weight_to ? `${rc.weight_to}g` : 'Any'}
                    </span>
                    {rc.active && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                        ACTIVE CARD
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-[#f8faf9] rounded-xl border border-[#edf2ef]">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase block">Local Delivery</span>
                      <span className="font-bold text-base text-[#0b3b2c]">₹{rc.local_rate}</span>
                    </div>
                    <div className="p-2.5 bg-[#f8faf9] rounded-xl border border-[#edf2ef]">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase block">Within State</span>
                      <span className="font-bold text-base text-[#0b3b2c]">₹{rc.within_state_rate}</span>
                    </div>
                    <div className="p-2.5 bg-[#f8faf9] rounded-xl border border-[#edf2ef]">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase block">Metro / Zones</span>
                      <span className="font-bold text-base text-[#0b3b2c]">₹{rc.zone_metro_rate}</span>
                    </div>
                    <div className="p-2.5 bg-[#f8faf9] rounded-xl border border-[#edf2ef]">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase block">Other States</span>
                      <span className="font-bold text-base text-[#0b3b2c]">₹{rc.other_states_rate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB 4: CUSTOMER DATABASE MASTER */}
      {/* ========================================================================= */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-[#e2eae6] overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-[#edf2ef] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0b3b2c]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#0b3b2c]">
                Store Customers Directory ({customers.length})
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#fbfcfc] text-[#809c93] uppercase text-[9px] font-bold tracking-wider border-b border-[#edf2ef]">
                <tr>
                  <th className="py-2.5 px-4">Customer Name</th>
                  <th className="py-2.5 px-4">WhatsApp Phone</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4">Total Orders</th>
                  <th className="py-2.5 px-4">Lifetime Spend (LTV)</th>
                  <th className="py-2.5 px-4 text-right">Connect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2ef]">
                {customers.map((cust) => (
                  <tr key={cust.phone} className="hover:bg-[#f8faf9] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#0c2b22]">{cust.name}</td>
                    <td className="py-3 px-4 font-mono text-neutral-600">{cust.phone}</td>
                    <td className="py-3 px-4 text-neutral-700">{cust.city}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-[#f0f4f2] text-[#0b3b2c] font-bold text-[10px]">
                        {cust.total_orders} Orders
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0b3b2c]">
                      ₹{cust.total_spend.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`https://wa.me/91${cust.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(cust.name)},%20greetings%20from%20Kashvi!`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-xs"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Ping</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODALS FOR RECORD CREATION */}
      {/* ========================================================================= */}
      {/* Add Category Modal */}
      {activeModal === 'category' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#dce6e1] space-y-3 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-[#0b3b2c]">Add Main Category</h3>
              <button onClick={() => setActiveModal(null)}><X className="w-4 h-4 text-neutral-400" /></button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="font-bold text-neutral-600 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarees"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-neutral-600 block mb-1">Department</label>
                <select
                  value={catDept}
                  onChange={(e) => setCatDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                >
                  <option value="fashions">Fashions</option>
                  <option value="jewellery">Jewellery</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 rounded-full text-neutral-500">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0b3b2c] text-white font-bold">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sub-Category Modal */}
      {activeModal === 'subcategory' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#dce6e1] space-y-3 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-[#0b3b2c]">Add Sub-Category</h3>
              <button onClick={() => setActiveModal(null)}><X className="w-4 h-4 text-neutral-400" /></button>
            </div>
            <form onSubmit={handleSaveSubCategory} className="space-y-3">
              <div>
                <label className="font-bold text-neutral-600 block mb-1">Select Parent Category *</label>
                <select
                  required
                  value={subCatParentId}
                  onChange={(e) => setSubCatParentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-neutral-600 block mb-1">Sub-Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kanchipuram Silk"
                  value={subCatName}
                  onChange={(e) => setSubCatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 rounded-full text-neutral-500">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0b3b2c] text-white font-bold">Save Sub-Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Variant Modal */}
      {activeModal === 'variant' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#dce6e1] space-y-3 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-[#0b3b2c]">
                Add New {variantSubTab.slice(0, -1).toUpperCase()}
              </h3>
              <button onClick={() => setActiveModal(null)}><X className="w-4 h-4 text-neutral-400" /></button>
            </div>
            <form onSubmit={handleSaveVariant} className="space-y-3">
              <div>
                <label className="font-bold text-neutral-600 block mb-1">
                  {variantSubTab.slice(0, -1).toUpperCase()} Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    variantSubTab === 'colours'
                      ? 'e.g. Magenta Pink'
                      : variantSubTab === 'sizes'
                      ? 'e.g. XL / Free Size'
                      : variantSubTab === 'fabrics'
                      ? 'e.g. Pure Georgette'
                      : 'e.g. Piece / Meter'
                  }
                  value={variantNameInput}
                  onChange={(e) => setVariantNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                />
              </div>

              {variantSubTab === 'units' && (
                <div>
                  <label className="font-bold text-neutral-600 block mb-1">Short Name / Code</label>
                  <input
                    type="text"
                    placeholder="e.g. pcs / mtr"
                    value={unitShortName}
                    onChange={(e) => setUnitShortName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 rounded-full text-neutral-500">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0b3b2c] text-white font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Pincode Modal */}
      {activeModal === 'pincode' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#dce6e1] space-y-3 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-[#0b3b2c]">Add Delivery Pincode</h3>
              <button onClick={() => setActiveModal(null)}><X className="w-4 h-4 text-neutral-400" /></button>
            </div>
            <form onSubmit={handleSavePincode} className="space-y-3">
              <div>
                <label className="font-bold text-neutral-600 block mb-1">6-Digit Pincode *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="533001"
                  value={pinNumber}
                  onChange={(e) => setPinNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-mono font-bold outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-neutral-600 block mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="Kakinada"
                    value={pinCity}
                    onChange={(e) => setPinCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-600 block mb-1">State</label>
                  <input
                    type="text"
                    required
                    placeholder="Andhra Pradesh"
                    value={pinState}
                    onChange={(e) => setPinState(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-neutral-600 block mb-1">Shipping Zone</label>
                <select
                  value={pinZone}
                  onChange={(e) => setPinZone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none font-semibold"
                >
                  <option value="Local">Local</option>
                  <option value="Within State">Within State</option>
                  <option value="Zone / Metro">Zone / Metro</option>
                  <option value="Other States">Other States</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 rounded-full text-neutral-500">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0b3b2c] text-white font-bold">Save Pincode</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}