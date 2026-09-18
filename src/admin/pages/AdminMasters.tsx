import React, { useEffect, useState } from 'react';
import {
  Package,
  Layers,
  Palette,
  Ruler,
  Scissors,
  Plus,
  Trash2,
  X,
  Sparkles,
  Building2,
  Tag,
  Upload,
  Check,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  CategoryRecord,
  SubCategoryRecord,
  ColourRecord,
  SizeRecord,
  FabricRecord,
  UnitRecord,
  AdminStaffUser
} from '../types';

interface AdminMastersProps {
  currentUser: AdminStaffUser | null;
}

interface TaggedImage {
  id: string;
  url: string;
  color_tag: string;
}

export default function AdminMasters({ currentUser }: AdminMastersProps) {
  const [loading, setLoading] = useState<boolean>(true);

  // Database Master States
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryRecord[]>([]);
  const [colours, setColours] = useState<ColourRecord[]>([]);
  const [sizes, setSizes] = useState<SizeRecord[]>([]);
  const [fabrics, setFabrics] = useState<FabricRecord[]>([]);
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);

  // Permissions
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const canDelete = currentUser?.role === 'admin';

  // Active Popup Modal Controller
  // Options: 'product' | 'category' | 'subcategory' | 'colours' | 'sizes' | 'fabrics' | null
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Form Inputs for Small Masters
  // -------------------------------------------------------------
  const [catName, setCatName] = useState('');
  const [catDept, setCatDept] = useState('fashions');

  const [subCatName, setSubCatName] = useState('');
  const [subCatParentId, setSubCatParentId] = useState('');

  const [variantNameInput, setVariantNameInput] = useState('');

  // -------------------------------------------------------------
  // Product Master Modal Form States
  // -------------------------------------------------------------
  const [department, setDepartment] = useState<'fashions' | 'jewellery'>('fashions');
  const [productCode, setProductCode] = useState<string>('');
  const [codeLoading, setCodeLoading] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [openingStock, setOpeningStock] = useState<number>(0);
  const [images, setImages] = useState<TaggedImage[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [selectedColorForUpload, setSelectedColorForUpload] = useState<string>('');
  const [submittingProduct, setSubmittingProduct] = useState<boolean>(false);
  const [productStatus, setProductStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load all master tables data
  const loadMastersData = async () => {
    setLoading(true);
    try {
      const [catRes, subCatRes, colRes, sizeRes, fabRes, unitRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('sub_categories').select('*').order('name'),
        supabase.from('colours').select('*').order('name'),
        supabase.from('sizes').select('*').order('name'),
        supabase.from('fabrics').select('*').order('name'),
        supabase.from('units').select('*').order('name'),
        supabase.from('products').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      if (catRes.data) setCategories(catRes.data);
      if (subCatRes.data) setSubCategories(subCatRes.data);
      if (colRes.data) setColours(colRes.data);
      if (sizeRes.data) setSizes(sizeRes.data);
      if (fabRes.data) setFabrics(fabRes.data);
      if (unitRes.data) {
        setUnits(unitRes.data);
        if (unitRes.data.length > 0 && !selectedUnit) setSelectedUnit(unitRes.data[0].id);
      }
      if (prodRes.data) setProductsList(prodRes.data);
    } catch (err) {
      console.error('Failed to fetch masters state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMastersData();
  }, []);

  // Automated Product Code Generator (KFXXXX vs KJXXXX)
  useEffect(() => {
    if (activeModal !== 'product') return;

    const generateProductCode = async () => {
      setCodeLoading(true);
      const prefix = department === 'fashions' ? 'KF' : 'KJ';
      try {
        const { data, error } = await supabase
          .from('products')
          .select('product_code')
          .like('product_code', `${prefix}%`)
          .order('product_code', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const lastCode = data[0].product_code;
          const match = lastCode.match(/\d+$/);
          if (match) {
            const nextNum = parseInt(match[0], 10) + 1;
            setProductCode(`${prefix}${String(nextNum).padStart(4, '0')}`);
          } else {
            setProductCode(`${prefix}0001`);
          }
        } else {
          setProductCode(`${prefix}0001`);
        }
      } catch (err) {
        setProductCode(`${prefix}0001`);
      } finally {
        setCodeLoading(false);
      }
    };

    generateProductCode();
  }, [department, activeModal]);

  const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Save Category
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

  // Save Sub-Category
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

  // Save Variant (Colours, Sizes, Fabrics)
  const handleSaveVariant = async (table: 'colours' | 'sizes' | 'fabrics') => {
    if (!variantNameInput.trim()) return;
    const nameVal = variantNameInput.trim();
    const prefix = table === 'colours' ? 'col' : table === 'sizes' ? 'sz' : 'fab';
    const id = makeId(prefix);

    const payload: any = { id, name: nameVal };
    if (table !== 'fabrics') payload.active = true;

    const { data, error } = await supabase.from(table).insert([payload]).select().single();
    if (!error && data) {
      if (table === 'colours') setColours((prev) => [...prev, data]);
      if (table === 'sizes') setSizes((prev) => [...prev, data]);
      if (table === 'fabrics') setFabrics((prev) => [...prev, data]);
      setVariantNameInput('');
      setActiveModal(null);
    }
  };

  // Delete Item
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

  // Product Master Multi-Selection Helper
  const toggleSelection = (item: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Image Upload Handlers
  const handleAddImage = () => {
    if (!imageUrlInput.trim()) return;
    const tag = selectedColorForUpload || (selectedColors[0] || 'Default');
    const newImage: TaggedImage = {
      id: `${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      url: imageUrlInput.trim(),
      color_tag: tag
    };
    setImages([...images, newImage]);
    setImageUrlInput('');
  };

  const handleRemoveImage = (id: string) => {
    setImages(images.filter((img) => img.id !== id));
  };

  // Save Product Master Record
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProduct(true);
    setProductStatus(null);

    try {
      const selectedCatObj = categories.find((c) => c.id === selectedCategory);
      const selectedSubCatObj = subCategories.find((sc) => sc.id === selectedSubCategory);

      const productPayload = {
        id: `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        product_code: productCode,
        name: name.trim(),
        description: description.trim(),
        department: department,
        category_id: selectedCategory || null,
        category_name: selectedCatObj?.name || null,
        sub_category_id: selectedSubCategory || null,
        sub_category_name: selectedSubCatObj?.name || null,
        unit_id: selectedUnit || null,
        stock_quantity: Number(openingStock) || 0,
        variants: {
          colors: selectedColors,
          sizes: selectedSizes,
          fabrics: selectedFabrics
        },
        images: images,
        barcode: productCode,
        active: true,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('products').insert([productPayload]).select().single();
      if (error) throw error;

      if (data) setProductsList((prev) => [data, ...prev]);

      setName('');
      setDescription('');
      setSelectedCategory('');
      setSelectedSubCategory('');
      setSelectedColors([]);
      setSelectedSizes([]);
      setSelectedFabrics([]);
      setOpeningStock(0);
      setImages([]);
      setActiveModal(null);
      alert(`Product ${productCode} saved successfully!`);
    } catch (err: any) {
      setProductStatus({
        type: 'error',
        text: err.message || 'Failed to save product record.'
      });
    } finally {
      setSubmittingProduct(false);
    }
  };

  const filteredSubCategories = subCategories.filter(
    (sub) => sub.category_id === selectedCategory
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-200 select-none font-sans pb-12">
      
      {/* 1. Header Bar with Direct Master Modal Launchers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e2eae6] shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#e4efe9] text-[#0b3b2c] text-[9.5px] font-bold uppercase tracking-wider mb-1 border border-[#dce6e1]">
            <Sparkles className="w-2.5 h-2.5 text-[#c6933a]" /> Kashvi Master Architecture
          </div>
          <h1 className="text-xl font-serif font-bold text-[#0b3b2c] leading-none">
            Store Masters Hub
          </h1>
          <p className="text-[11px] text-[#4d6960] mt-1">
            Click any button below to open its dedicated creation popup modal.
          </p>
        </div>

        {/* 6 Popup Modal Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#f0f4f2] rounded-2xl self-start sm:self-center border border-[#dce6e1]">
          <button
            type="button"
            onClick={() => setActiveModal('product')}
            className="px-3 py-1.5 rounded-xl bg-[#0b3b2c] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:bg-[#082a20]"
          >
            <Package className="w-3.5 h-3.5 text-[#e5c07b]" />
            <span>+ Product</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('category')}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#dce6e1] text-[#0b3b2c] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:bg-[#e4efe9]"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>+ Category</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('subcategory')}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#dce6e1] text-[#0b3b2c] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:bg-[#e4efe9]"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>+ Sub-Category</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('colours')}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#dce6e1] text-[#0b3b2c] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:bg-[#e4efe9]"
          >
            <Palette className="w-3.5 h-3.5 text-[#ff4d6d]" />
            <span>+ Colours</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('sizes')}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#dce6e1] text-[#0b3b2c] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:bg-[#e4efe9]"
          >
            <Ruler className="w-3.5 h-3.5 text-blue-500" />
            <span>+ Size</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('fabrics')}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#dce6e1] text-[#0b3b2c] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:bg-[#e4efe9]"
          >
            <Scissors className="w-3.5 h-3.5 text-emerald-500" />
            <span>+ Fabric</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Master Overview Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Categories Table */}
        <div className="bg-white rounded-2xl border border-[#e2eae6] shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-[#edf2ef] flex items-center justify-between bg-[#fbfcfc]">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#0b3b2c]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#0b3b2c]">
                Categories ({categories.length})
              </h3>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setActiveModal('category')}
                className="px-2.5 py-1 rounded-full bg-[#0b3b2c] text-white text-[10px] font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-[#e5c07b]" /> Add
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#f8faf9] text-[#809c93] uppercase text-[9px] font-bold tracking-wider border-b border-[#edf2ef]">
                <tr>
                  <th className="py-2 px-4">Name</th>
                  <th className="py-2 px-4">Dept</th>
                  <th className="py-2 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2ef]">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-[#f4f7f5]">
                    <td className="py-2 px-4 font-bold text-[#0c2b22]">{cat.name}</td>
                    <td className="py-2 px-4 uppercase text-[10px] text-[#0b3b2c]">{cat.department}</td>
                    <td className="py-2 px-4 text-right">
                      {canDelete && (
                        <button onClick={() => handleDeleteItem('categories', cat.id)} className="p-1 text-rose-600">
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

        {/* Sub-Categories Table */}
        <div className="bg-white rounded-2xl border border-[#e2eae6] shadow-xs overflow-hidden">
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
                className="px-2.5 py-1 rounded-full bg-[#0b3b2c] text-white text-[10px] font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-[#e5c07b]" /> Add
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#f8faf9] text-[#809c93] uppercase text-[9px] font-bold tracking-wider border-b border-[#edf2ef]">
                <tr>
                  <th className="py-2 px-4">Sub-Category</th>
                  <th className="py-2 px-4">Parent Category</th>
                  <th className="py-2 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2ef]">
                {subCategories.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#f4f7f5]">
                    <td className="py-2 px-4 font-bold text-[#0c2b22]">{sub.name}</td>
                    <td className="py-2 px-4 text-[#0b3b2c] font-semibold">{sub.category_name}</td>
                    <td className="py-2 px-4 text-right">
                      {canDelete && (
                        <button onClick={() => handleDeleteItem('sub_categories', sub.id)} className="p-1 text-rose-600">
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

        {/* Variants Summary Card (Colours, Sizes, Fabrics) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e2eae6] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#0b3b2c]">
              Variant Masters Vaults (Colours, Sizes, Fabrics)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Colours Pill Box */}
            <div className="p-3 rounded-xl border border-[#dce6e1] bg-[#f8faf9]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#0b3b2c] flex items-center gap-1">
                  <Palette className="w-3 h-3 text-[#ff4d6d]" /> Colours ({colours.length})
                </span>
                <button onClick={() => setActiveModal('colours')} className="text-[10px] font-bold text-[#0b3b2c] underline cursor-pointer">+ Add</button>
              </div>
              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                {colours.map((c) => (
                  <span key={c.id} className="px-2 py-0.5 rounded-md bg-white border border-[#dce6e1] text-[10.5px] font-semibold flex items-center gap-1">
                    {c.name}
                    {canDelete && <X onClick={() => handleDeleteItem('colours', c.id)} className="w-2.5 h-2.5 text-rose-500 cursor-pointer" />}
                  </span>
                ))}
              </div>
            </div>

            {/* Sizes Pill Box */}
            <div className="p-3 rounded-xl border border-[#dce6e1] bg-[#f8faf9]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#0b3b2c] flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-blue-500" /> Sizes ({sizes.length})
                </span>
                <button onClick={() => setActiveModal('sizes')} className="text-[10px] font-bold text-[#0b3b2c] underline cursor-pointer">+ Add</button>
              </div>
              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                {sizes.map((s) => (
                  <span key={s.id} className="px-2 py-0.5 rounded-md bg-white border border-[#dce6e1] text-[10.5px] font-semibold flex items-center gap-1">
                    {s.name}
                    {canDelete && <X onClick={() => handleDeleteItem('sizes', s.id)} className="w-2.5 h-2.5 text-rose-500 cursor-pointer" />}
                  </span>
                ))}
              </div>
            </div>

            {/* Fabrics Pill Box */}
            <div className="p-3 rounded-xl border border-[#dce6e1] bg-[#f8faf9]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#0b3b2c] flex items-center gap-1">
                  <Scissors className="w-3 h-3 text-emerald-500" /> Fabrics ({fabrics.length})
                </span>
                <button onClick={() => setActiveModal('fabrics')} className="text-[10px] font-bold text-[#0b3b2c] underline cursor-pointer">+ Add</button>
              </div>
              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                {fabrics.map((f) => (
                  <span key={f.id} className="px-2 py-0.5 rounded-md bg-white border border-[#dce6e1] text-[10.5px] font-semibold flex items-center gap-1">
                    {f.name}
                    {canDelete && <X onClick={() => handleDeleteItem('fabrics', f.id)} className="w-2.5 h-2.5 text-rose-500 cursor-pointer" />}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. POPUP MODALS SECTION */}
      {/* ========================================================================= */}

      {/* MODAL 1: PRODUCT MASTER POPUP */}
      {activeModal === 'product' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#dce6e1] space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-[#edf2ef] pb-3 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#0b3b2c]" />
                <div>
                  <h2 className="text-base font-bold text-[#0b3b2c]">Product Master Creator</h2>
                  <span className="text-[10px] text-[#4d6960]">Create retail catalog item with code & live masters</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-[#f0f4f2] px-3 py-1 rounded-xl border border-[#dce6e1] text-right">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[#4d6960] block">Assigned Code</span>
                  <span className="font-mono text-sm font-bold text-[#0b3b2c]">
                    {codeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : productCode}
                  </span>
                </div>
                <button onClick={() => setActiveModal(null)} className="p-1 rounded-full hover:bg-neutral-100 cursor-pointer">
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
            </div>

            {productStatus && (
              <div className="p-3 rounded-xl border bg-rose-50 border-rose-200 text-rose-800 text-xs font-bold">
                {productStatus.text}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Department Selection */}
              <div>
                <label className="text-xs font-bold text-[#0b3b2c] block mb-1.5">Department *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDepartment('fashions')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                      department === 'fashions' ? 'bg-[#0b3b2c] text-white border-[#0b3b2c] shadow-xs' : 'bg-[#f8faf9] text-[#4d6960] border-[#dce6e1]'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Kashvi Fashions (KF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepartment('jewellery')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                      department === 'jewellery' ? 'bg-[#0b3b2c] text-white border-[#0b3b2c] shadow-xs' : 'bg-[#f8faf9] text-[#4d6960] border-[#dce6e1]'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Kashvi Jewellery (KJ)</span>
                  </button>
                </div>
              </div>

              {/* 2-Column: Product Name & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Pure Banarasi Silk Saree"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Product Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Weaving specs, fabric blend, stone quality..."
                    className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none resize-none"
                  />
                </div>
              </div>

              {/* Categories & Opening Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Category (Live Masters) *</label>
                  <select
                    required
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedSubCategory('');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-semibold outline-none"
                  >
                    <option value="">-- Select Category --</option>
                    {categories
                      .filter((c) => !c.department || c.department.toLowerCase() === department.toLowerCase())
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Sub-Category (Dynamic)</label>
                  <select
                    value={selectedSubCategory}
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                    disabled={!selectedCategory}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-semibold outline-none disabled:opacity-50"
                  >
                    <option value="">-- Select Sub-Category --</option>
                    {filteredSubCategories.map((sc) => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Opening Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={openingStock}
                    onChange={(e) => setOpeningStock(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-bold outline-none"
                  />
                </div>
              </div>

              {/* Multi-Select Variant Pills */}
              <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#dce6e1] space-y-2.5">
                <span className="text-xs font-bold text-[#0b3b2c] block uppercase tracking-wider">
                  Select Variants (From Live Masters)
                </span>

                {/* Colours */}
                <div>
                  <span className="text-[10px] font-bold text-neutral-600 block mb-1">Colours:</span>
                  <div className="flex flex-wrap gap-1">
                    {colours.map((c) => {
                      const active = selectedColors.includes(c.name);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleSelection(c.name, selectedColors, setSelectedColors)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border cursor-pointer ${
                            active ? 'bg-[#0b3b2c] text-white border-[#0b3b2c]' : 'bg-white text-neutral-600 border-[#dce6e1]'
                          }`}
                        >
                          {active && <Check className="w-2.5 h-2.5 text-[#e5c07b]" />}
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sizes */}
                <div>
                  <span className="text-[10px] font-bold text-neutral-600 block mb-1">Sizes:</span>
                  <div className="flex flex-wrap gap-1">
                    {sizes.map((s) => {
                      const active = selectedSizes.includes(s.name);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSelection(s.name, selectedSizes, setSelectedSizes)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border cursor-pointer ${
                            active ? 'bg-[#0b3b2c] text-white border-[#0b3b2c]' : 'bg-white text-neutral-600 border-[#dce6e1]'
                          }`}
                        >
                          {active && <Check className="w-2.5 h-2.5 text-[#e5c07b]" />}
                          <span>{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fabrics */}
                <div>
                  <span className="text-[10px] font-bold text-neutral-600 block mb-1">Fabrics:</span>
                  <div className="flex flex-wrap gap-1">
                    {fabrics.map((f) => {
                      const active = selectedFabrics.includes(f.name);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleSelection(f.name, selectedFabrics, setSelectedFabrics)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border cursor-pointer ${
                            active ? 'bg-[#0b3b2c] text-white border-[#0b3b2c]' : 'bg-white text-neutral-600 border-[#dce6e1]'
                          }`}
                        >
                          {active && <Check className="w-2.5 h-2.5 text-[#e5c07b]" />}
                          <span>{f.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tagged Images Section */}
              <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#dce6e1] space-y-2">
                <span className="text-xs font-bold text-[#0b3b2c] block uppercase tracking-wider">
                  Product Media & Colour Mapping
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Paste Image URL..."
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#dce6e1] bg-white outline-none"
                  />
                  <select
                    value={selectedColorForUpload}
                    onChange={(e) => setSelectedColorForUpload(e.target.value)}
                    className="sm:w-44 px-3 py-2 rounded-xl border border-[#dce6e1] bg-white font-semibold outline-none"
                  >
                    <option value="">Tag To Colour</option>
                    {selectedColors.length > 0 ? (
                      selectedColors.map((c) => <option key={c} value={c}>{c}</option>)
                    ) : (
                      colours.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-3 py-2 rounded-xl bg-[#0b3b2c] text-white font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#e5c07b]" /> Add
                  </button>
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                    {images.map((img) => (
                      <div key={img.id} className="relative rounded-xl border border-[#dce6e1] bg-white overflow-hidden">
                        <img src={img.url} alt={img.color_tag} className="w-full h-16 object-cover" />
                        <div className="p-1 flex items-center justify-between text-[9px] font-bold">
                          <span className="truncate text-[#0b3b2c]">{img.color_tag}</span>
                          <Trash2 onClick={() => handleRemoveImage(img.id)} className="w-3 h-3 text-rose-500 cursor-pointer" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-neutral-500 hover:bg-neutral-100 cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="px-6 py-2 rounded-xl bg-[#0b3b2c] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-[#e5c07b]" />}
                  <span>Save Product Master</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CATEGORY POPUP */}
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
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none font-semibold"
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
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 rounded-full text-neutral-500">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0b3b2c] text-white font-bold">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SUB-CATEGORY POPUP */}
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
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none font-semibold"
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
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 rounded-full text-neutral-500">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-full bg-[#0b3b2c] text-white font-bold">Save Sub-Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4, 5, 6: (COLOURS / SIZES / FABRICS) DYNAMIC POPUP */}
      {(activeModal === 'colours' || activeModal === 'sizes' || activeModal === 'fabrics') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#dce6e1] space-y-3 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-[#0b3b2c] uppercase">Add New {activeModal.slice(0, -1)}</h3>
              <button onClick={() => setActiveModal(null)}><X className="w-4 h-4 text-neutral-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="font-bold text-neutral-600 block mb-1 uppercase">{activeModal.slice(0, -1)} Name *</label>
                <input
                  type="text"
                  required
                  placeholder={
                    activeModal === 'colours'
                      ? 'e.g. Rani Pink'
                      : activeModal === 'sizes'
                      ? 'e.g. Free Size / XL'
                      : 'e.g. Pure Georgette'
                  }
                  value={variantNameInput}
                  onChange={(e) => setVariantNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 rounded-full text-neutral-500">Cancel</button>
                <button
                  type="button"
                  onClick={() => handleSaveVariant(activeModal as 'colours' | 'sizes' | 'fabrics')}
                  className="px-4 py-1.5 rounded-full bg-[#0b3b2c] text-white font-bold cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}