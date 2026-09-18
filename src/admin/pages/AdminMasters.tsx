import React, { useEffect, useState, useRef } from 'react';
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
  Loader2
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
  selectedSection?: 'product' | 'category' | 'subcategory' | 'colours' | 'sizes' | 'fabrics' | null;
  onClearSection?: () => void;
}

interface TaggedImage {
  id: string;
  url: string;
  color_tag: string;
}

export default function AdminMasters({ currentUser, selectedSection, onClearSection }: AdminMastersProps) {
  const [loading, setLoading] = useState<boolean>(true);

  // Database Data States
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryRecord[]>([]);
  const [colours, setColours] = useState<ColourRecord[]>([]);
  const [sizes, setSizes] = useState<SizeRecord[]>([]);
  const [fabrics, setFabrics] = useState<FabricRecord[]>([]);
  const [units, setUnits] = useState<UnitRecord[]>([]);

  // Permissions
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const canDelete = currentUser?.role === 'admin';

  // Active Popup Modal Controller
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Sync with Navbar Selection
  useEffect(() => {
    if (selectedSection) {
      setActiveModal(selectedSection);
    }
  }, [selectedSection]);

  const handleCloseModal = () => {
    setActiveModal(null);
    if (onClearSection) {
      onClearSection();
    }
  };

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
  const [brand, setBrand] = useState<'fashions' | 'jewellery'>('fashions');
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
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [submittingProduct, setSubmittingProduct] = useState<boolean>(false);
  const [productError, setProductError] = useState<string | null>(null);

  // Load all master tables data
  const loadMastersData = async () => {
    setLoading(true);
    try {
      const [catRes, subCatRes, colRes, sizeRes, fabRes, unitRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('sub_categories').select('*').order('name'),
        supabase.from('colours').select('*').order('name'),
        supabase.from('sizes').select('*').order('name'),
        supabase.from('fabrics').select('*').order('name'),
        supabase.from('units').select('*').order('name')
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
    } catch (err) {
      console.error('Failed to fetch masters state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMastersData();
  }, []);

  // Automated Product Code Generator (KF vs KJ)
  useEffect(() => {
    if (activeModal !== 'product') return;

    const generateProductCode = async () => {
      setCodeLoading(true);
      const prefix = brand === 'fashions' ? 'KF' : 'KJ';
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
  }, [brand, activeModal]);

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
      handleCloseModal();
    }
  };

  // Save Sub-Category
  const handleSaveSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCatName.trim() || !subCatParentId) return;

    const parent = categories.find((c) => String(c.id) === String(subCatParentId));
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
      handleCloseModal();
    }
  };

  // Save Variant
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
      handleCloseModal();
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

  // Direct File Image Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        let finalUrl = '';
        if (!uploadError) {
          const { data: publicData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
          finalUrl = publicData.publicUrl;
        } else {
          finalUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }

        const defaultTag = selectedColors.length > 0 ? selectedColors[0] : (colours[0]?.name || 'General');
        const newImg: TaggedImage = {
          id: `${Date.now()}_${i}`,
          url: finalUrl,
          color_tag: defaultTag
        };

        setImages((prev) => [...prev, newImg]);
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to upload image.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateImageColorTag = (imgId: string, newTag: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === imgId ? { ...img, color_tag: newTag } : img))
    );
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Save Product Master Record
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProduct(true);
    setProductError(null);

    try {
      const selectedCatObj = categories.find((c) => String(c.id) === String(selectedCategory));
      const selectedSubCatObj = subCategories.find((sc) => String(sc.id) === String(selectedSubCategory));

      const productPayload = {
        id: `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        product_code: productCode,
        name: name.trim(),
        description: description.trim(),
        department: brand,
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

      const { error } = await supabase.from('products').insert([productPayload]);
      if (error) throw error;

      setName('');
      setDescription('');
      setSelectedCategory('');
      setSelectedSubCategory('');
      setSelectedColors([]);
      setSelectedSizes([]);
      setSelectedFabrics([]);
      setOpeningStock(0);
      setImages([]);
      handleCloseModal();
      alert(`Product ${productCode} saved successfully!`);
    } catch (err: any) {
      setProductError(err.message || 'Failed to save product record.');
    } finally {
      setSubmittingProduct(false);
    }
  };

  // Robust Sub-Category Filter (Matches by ID or by Category Name)
  const selectedCatObject = categories.find((c) => String(c.id) === String(selectedCategory));
  const filteredSubCategories = subCategories.filter((sub) => {
    if (!selectedCategory) return false;
    const matchById = String(sub.category_id).trim() === String(selectedCategory).trim();
    const matchByName = selectedCatObject && sub.category_name
      ? sub.category_name.trim().toLowerCase() === selectedCatObject.name.trim().toLowerCase()
      : false;
    return matchById || matchByName;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200 select-none font-sans pb-12">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e2eae6] shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#e4efe9] text-[#0b3b2c] text-[9.5px] font-bold uppercase tracking-wider mb-1 border border-[#dce6e1]">
            <Sparkles className="w-2.5 h-2.5 text-[#c6933a]" /> Kashvi Master Architecture
          </div>
          <h1 className="text-xl font-serif font-bold text-[#0b3b2c] leading-none">
            Store Masters Control
          </h1>
          <p className="text-[11px] text-[#4d6960] mt-1">
            Access specific masters directly from the top Admin Navbar.
          </p>
        </div>
      </div>

      {/* 2. Overview Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Categories Table */}
        <div className="bg-white rounded-2xl border border-[#e2eae6] shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-[#edf2ef] flex items-center justify-between bg-[#fbfcfc]">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#0b3b2c]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#0b3b2c]">
                Categories
              </h3>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setActiveModal('category')}
                className="px-2.5 py-1 rounded-full bg-[#0b3b2c] text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[#e5c07b]" /> Add Category
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#f8faf9] text-[#809c93] uppercase text-[9px] font-bold tracking-wider border-b border-[#edf2ef]">
                <tr>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Brand</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2ef]">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-[#f4f7f5]">
                    <td className="py-2.5 px-4 font-bold text-[#0c2b22]">{cat.name}</td>
                    <td className="py-2.5 px-4 uppercase text-[10px] text-[#0b3b2c]">{cat.department}</td>
                    <td className="py-2.5 px-4 text-right">
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
                Sub-Categories
              </h3>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setActiveModal('subcategory')}
                className="px-2.5 py-1 rounded-full bg-[#0b3b2c] text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[#e5c07b]" /> Add Sub-Category
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
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
                  <tr key={sub.id} className="hover:bg-[#f4f7f5]">
                    <td className="py-2.5 px-4 font-bold text-[#0c2b22]">{sub.name}</td>
                    <td className="py-2.5 px-4 text-[#0b3b2c] font-semibold">{sub.category_name}</td>
                    <td className="py-2.5 px-4 text-right">
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

        {/* Variants Summary Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e2eae6] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#0b3b2c]">
              Variant Masters
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Colours */}
            <div className="p-3.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#0b3b2c] flex items-center gap-1">
                  <Palette className="w-3 h-3 text-[#ff4d6d]" /> Colours
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

            {/* Sizes */}
            <div className="p-3.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#0b3b2c] flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-blue-500" /> Sizes
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

            {/* Fabrics */}
            <div className="p-3.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#0b3b2c] flex items-center gap-1">
                  <Scissors className="w-3 h-3 text-emerald-500" /> Fabrics
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
      {/* 3. DEDICATED POPUP MODALS */}
      {/* ========================================================================= */}

      {/* MODAL 1: PRODUCT MASTER POPUP */}
      {activeModal === 'product' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#dce6e1] space-y-4 text-xs">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-[#edf2ef] pb-3 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#0b3b2c]" />
                <div>
                  <h2 className="text-base font-bold text-[#0b3b2c]">Product Master Creator</h2>
                  <span className="text-[10px] text-[#4d6960]">Create retail catalog item with code and live masters</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-[#f0f4f2] px-4 py-1.5 rounded-xl border border-[#dce6e1] text-right">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[#4d6960] block">PRODUCT CODE</span>
                  <span className="font-mono text-sm font-bold text-[#0b3b2c]">
                    {codeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : productCode}
                  </span>
                </div>
                <button onClick={handleCloseModal} className="p-1 rounded-full hover:bg-neutral-100 cursor-pointer">
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
            </div>

            {productError && (
              <div className="p-3 rounded-xl border bg-rose-50 border-rose-200 text-rose-800 text-xs font-bold">
                {productError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              
              {/* Brand Toggle Switch (Fashion vs Jewellery) */}
              <div>
                <label className="text-xs font-bold text-[#0b3b2c] block mb-1.5">Brand *</label>
                <div className="inline-flex p-1 bg-[#f0f4f2] rounded-2xl border border-[#dce6e1] w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setBrand('fashions')}
                    className={`flex-1 sm:flex-initial px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      brand === 'fashions'
                        ? 'bg-[#0b3b2c] text-white shadow-xs'
                        : 'text-[#4d6960] hover:text-[#0b3b2c]'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Fashion</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrand('jewellery')}
                    className={`flex-1 sm:flex-initial px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      brand === 'jewellery'
                        ? 'bg-[#0b3b2c] text-white shadow-xs'
                        : 'text-[#4d6960] hover:text-[#0b3b2c]'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Jewellery</span>
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

              {/* Categories, Sub-Categories & Opening Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Category *</label>
                  <select
                    required
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedSubCategory('');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-semibold outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0b3b2c] block mb-1">Sub-Category</label>
                  <select
                    value={selectedSubCategory}
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                    disabled={!selectedCategory}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] font-semibold outline-none disabled:opacity-50"
                  >
                    <option value="">Select Sub-Category</option>
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
                  Select Variants
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

              {/* Direct File Image Upload & Color Tagging */}
              <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#dce6e1] space-y-3">
                <div>
                  <span className="text-xs font-bold text-[#0b3b2c] block uppercase tracking-wider">
                    Product Images & Colour Tagging
                  </span>
                  <p className="text-[10px] text-[#4d6960] mt-0.5">
                    Upload product photos directly. Once uploaded, tag each photo to its corresponding variant colour below the image.
                  </p>
                </div>

                {/* Upload Action Box */}
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="product-file-input"
                  />
                  <label
                    htmlFor="product-file-input"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#dce6e1] hover:border-[#0b3b2c] text-[#0b3b2c] font-bold text-xs shadow-2xs transition-all cursor-pointer"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#0b3b2c]" />
                    ) : (
                      <Upload className="w-4 h-4 text-[#e5c07b]" />
                    )}
                    <span>{uploadingImage ? 'Uploading Photos...' : 'Choose Product Images'}</span>
                  </label>
                  <span className="text-[11px] text-neutral-400">Supports JPG, PNG, WEBP</span>
                </div>

                {/* Uploaded Images Grid with Colour Tagging */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                    {images.map((img) => (
                      <div key={img.id} className="rounded-2xl border border-[#dce6e1] bg-white overflow-hidden shadow-xs flex flex-col justify-between">
                        <div className="relative group h-28 bg-[#f0f4f2]">
                          <img src={img.url} alt="Variant" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(img.id)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        {/* Tag to Colour Dropdown */}
                        <div className="p-2 border-t border-[#edf2ef] bg-[#fbfcfc] space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#4d6960] block">Tag To Colour:</span>
                          <select
                            value={img.color_tag}
                            onChange={(e) => handleUpdateImageColorTag(img.id, e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-[#dce6e1] bg-white text-[11px] font-bold text-[#0b3b2c] outline-none"
                          >
                            {selectedColors.length > 0 ? (
                              selectedColors.map((c) => <option key={c} value={c}>{c}</option>)
                            ) : (
                              colours.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)
                            )}
                          </select>
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
                  onClick={handleCloseModal}
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
              <button onClick={handleCloseModal}><X className="w-4 h-4 text-neutral-400" /></button>
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
                <label className="font-bold text-neutral-600 block mb-1">Brand</label>
                <select
                  value={catDept}
                  onChange={(e) => setCatDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] outline-none"
                >
                  <option value="fashions">Fashion</option>
                  <option value="jewellery">Jewellery</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={handleCloseModal} className="px-3 py-1.5 rounded-full text-neutral-500">Cancel</button>
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
              <button onClick={handleCloseModal}><X className="w-4 h-4 text-neutral-400" /></button>
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
                  <option value="">Select Category</option>
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
                <button type="button" onClick={handleCloseModal} className="px-3 py-1.5 rounded-full text-neutral-500">Cancel</button>
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
              <button onClick={handleCloseModal}><X className="w-4 h-4 text-neutral-400" /></button>
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
                <button type="button" onClick={handleCloseModal} className="px-3 py-1.5 rounded-full text-neutral-500">Cancel</button>
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