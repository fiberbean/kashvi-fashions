import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Layers,
  FolderTree,
  Tag,
  Palette,
  Ruler,
  Scroll,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
  UploadCloud,
  Search,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type MasterType = 'category' | 'subcategory' | 'brand' | 'colour' | 'size' | 'fabric';

interface MasterItem {
  id: string;
  name?: string;
  title?: string;
  category_name?: string;
  category_id?: string;
  image_url?: string;
  code?: string;
  created_at?: string;
}

const TABS: { id: MasterType; label: string; icon: any; desc: string; table: string }[] = [
  { id: 'category', label: 'Categories', icon: Layers, desc: 'Fashions, Jewellery & Main Departments', table: 'categories' },
  { id: 'subcategory', label: 'Sub-Categories', icon: FolderTree, desc: 'Royal Arch Banners & Sub-collections', table: 'sub_categories' },
  { id: 'brand', label: 'Brands', icon: Tag, desc: 'Designer Labels & In-house Lines', table: 'brands' },
  { id: 'colour', label: 'Colours', icon: Palette, desc: 'Hex Shades & Palette Swatches', table: 'colours' },
  { id: 'size', label: 'Sizes', icon: Ruler, desc: 'Dress & Bangle Size Standards', table: 'sizes' },
  { id: 'fabric', label: 'Fabrics', icon: Scroll, desc: 'Silks, Kundan & Raw Materials', table: 'fabrics' },
];

export default function AdminMasters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as MasterType) || 'category';

  const [items, setItems] = useState<MasterItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Drawer / Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [itemName, setItemName] = useState('');
  const [parentCategory, setParentCategory] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [colorCode, setColorCode] = useState('#0b3b2c');
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTabMeta = TABS.find((t) => t.id === activeTab) || TABS[0];

  // Fetch Parent Categories for subcategory dropdown
  const fetchParentCategories = async () => {
    try {
      const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (data) setCategoriesList(data);
    } catch (e) {
      console.error('Error fetching parent categories:', e);
    }
  };

  // Fetch Current Master Data
  const fetchMasterItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(currentTabMeta.table)
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Error loading master records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParentCategories();
  }, []);

  useEffect(() => {
    fetchMasterItems();
    closeDrawer();
  }, [activeTab]);

  const openNewDrawer = () => {
    setIsEditing(false);
    setEditingId(null);
    setItemName('');
    setParentCategory(categoriesList[0]?.name || '');
    setParentCategoryId(categoriesList[0]?.id || '');
    setImageUrl('');
    setColorCode('#0b3b2c');
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (item: MasterItem) => {
    setIsEditing(true);
    setEditingId(item.id);
    setItemName(item.name || item.title || '');
    setParentCategory(item.category_name || '');
    setParentCategoryId(item.category_id || '');
    setImageUrl(item.image_url || '');
    setColorCode(item.code || '#0b3b2c');
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setIsEditing(false);
    setEditingId(null);
    setItemName('');
    setImageUrl('');
    setSaving(false);
  };

  // Direct Supabase Storage Uploader
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${activeTab}_${Date.now()}.${fileExt}`;
      const filePath = `masters/${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('categories')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // Fallback bucket
        const { error: fallbackErr } = await supabase.storage
          .from('public-assets')
          .upload(filePath, file, { upsert: true });
        if (fallbackErr) throw fallbackErr;
      }

      const { data } = supabase.storage.from('categories').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      alert('Upload failed: ' + (err.message || 'Check storage permissions.'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    setSaving(true);
    try {
      const payload: any = {
        name: itemName.trim(),
      };

      if (activeTab === 'category') {
        payload.slug = itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        payload.image_url = imageUrl || null;
        payload.active = true;
      } else if (activeTab === 'subcategory') {
        payload.category_name = parentCategory;
        payload.category_id = parentCategoryId || null;
        payload.image_url = imageUrl || null;
        payload.active = true;
      } else if (activeTab === 'colour') {
        payload.code = colorCode;
      }

      if (isEditing && editingId) {
        const { error } = await supabase
          .from(currentTabMeta.table)
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const newId = `${activeTab.slice(0, 3).toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;
        const { error } = await supabase
          .from(currentTabMeta.table)
          .insert([{ id: newId, ...payload }]);
        if (error) throw error;
      }

      closeDrawer();
      await fetchMasterItems();
    } catch (err: any) {
      console.error('Save error:', err);
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: MasterItem) => {
    const name = item.name || item.title;
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from(currentTabMeta.table)
        .delete()
        .eq('id', item.id);
      if (error) throw error;
      await fetchMasterItems();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Delete failed: ' + err.message);
    }
  };

  const filteredItems = items.filter((item) => {
    const name = (item.name || item.title || '').toLowerCase();
    const sub = (item.category_name || '').toLowerCase();
    const query = searchTerm.toLowerCase().trim();
    return name.includes(query) || sub.includes(query);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header & Attribute Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0b3b2c]">
            Store Masters & Dropdown Attributes
          </h1>
          <p className="text-xs sm:text-sm text-[#4d6960] mt-1">
            {currentTabMeta.desc}
          </p>
        </div>

        <button
          type="button"
          onClick={openNewDrawer}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0b3b2c] hover:bg-[#06231a] text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-[#0b3b2c]/20 transition-all active:scale-95 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add {currentTabMeta.label.slice(0, -1)}</span>
        </button>
      </div>

      {/* Pill Navigation Bar for Masters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#dce6e1] scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#0b3b2c] text-white shadow-md'
                  : 'bg-white border border-[#dce6e1] text-[#4d6960] hover:bg-[#f0f4f2] hover:text-[#0b3b2c]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#e5c07b]' : ''}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#dce6e1] shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#809c93]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Filter ${currentTabMeta.label}...`}
            className="w-full text-xs text-[#0c2b22] bg-transparent outline-none placeholder:text-[#809c93]"
          />
        </div>
        <span className="text-xs font-bold text-[#4d6960] bg-[#f0f4f2] px-3 py-1 rounded-full shrink-0">
          {filteredItems.length} Registered
        </span>
      </div>

      {/* Master Items Grid Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#0b3b2c] animate-spin" />
          <p className="text-xs font-semibold text-[#4d6960]">Loading master items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 bg-white rounded-3xl border border-[#dce6e1] text-center p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#f0f4f2] text-[#4d6960] flex items-center justify-center mx-auto">
            <Tag className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h4 className="text-sm font-bold text-[#0c2b22]">No items found</h4>
          <p className="text-xs text-[#809c93] max-w-xs mx-auto">
            Get started by creating your first entry in {currentTabMeta.label}.
          </p>
          <button
            type="button"
            onClick={openNewDrawer}
            className="mt-2 px-5 py-2 rounded-full bg-[#0b3b2c] text-white text-xs font-bold cursor-pointer hover:bg-[#06231a]"
          >
            + Add New
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((item) => {
            const hasImage = activeTab === 'category' || activeTab === 'subcategory';
            const name = item.name || item.title;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-[#dce6e1] p-4.5 shadow-[6px_6px_18px_rgba(11,59,44,0.03)] hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div className="flex items-start gap-3.5">
                  {/* Arch Thumbnail for Category/Subcategory */}
                  {hasImage && (
                    <div className="w-14 h-18 rounded-t-[20px] rounded-b-xl overflow-hidden bg-[#f0f4f2] border border-[#dce6e1] shrink-0 p-0.5 shadow-2xs">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={name}
                          className="w-full h-full object-cover object-top rounded-t-[18px] rounded-b-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 bg-white rounded-t-[18px] rounded-b-lg text-[9px] font-bold uppercase tracking-wider">
                          <ImageIcon className="w-4 h-4 mb-0.5 text-[#809c93]" />
                          Arch
                        </div>
                      )}
                    </div>
                  )}

                  {/* Color Swatch Preview for Colours */}
                  {activeTab === 'colour' && (
                    <div
                      className="w-10 h-10 rounded-2xl border border-black/10 shadow-xs shrink-0"
                      style={{ backgroundColor: item.code || '#0b3b2c' }}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[#0c2b22] truncate leading-snug">
                      {name}
                    </h3>
                    {item.category_name && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-[#0b3b2c] bg-[#e4efe9] px-2 py-0.5 rounded-md">
                        Parent: {item.category_name}
                      </span>
                    )}
                    {item.code && (
                      <span className="inline-block mt-1 text-[10px] font-mono text-[#809c93]">
                        {item.code}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-neutral-400 block mt-1.5 truncate">
                      ID: {item.id}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-[#edf2ef] flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditDrawer(item)}
                    className="p-1.5 rounded-xl hover:bg-[#f0f4f2] text-[#4d6960] hover:text-[#0b3b2c] transition-colors cursor-pointer"
                    title="Edit Item"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="p-1.5 rounded-xl hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-in Edit & Add Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          <div
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-[#dce6e1]">
              
              {/* Drawer Header */}
              <div className="p-5 border-b border-[#edf2ef] flex items-center justify-between bg-[#f8faf9]">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#0b3b2c]">
                    {isEditing ? 'Edit Item' : `Add to ${currentTabMeta.label}`}
                  </h3>
                  <span className="text-xs text-[#809c93]">
                    {currentTabMeta.table} table
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Form Body */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* 1. Item Name */}
                <div>
                  <label className="text-xs font-bold text-[#0c2b22] block mb-1.5 uppercase tracking-wider">
                    {currentTabMeta.label.slice(0, -1)} Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Sarees, Kundan Bangles, XL, Pure Silk"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#dce6e1] bg-white text-xs text-[#0c2b22] outline-none focus:border-[#0b3b2c] focus:ring-2 focus:ring-[#0b3b2c]/10 font-semibold"
                  />
                </div>

                {/* 2. Parent Category Select (Only for Subcategory) */}
                {activeTab === 'subcategory' && (
                  <div>
                    <label className="text-xs font-bold text-[#0c2b22] block mb-1.5 uppercase tracking-wider">
                      Parent Category *
                    </label>
                    <select
                      value={parentCategory}
                      onChange={(e) => {
                        setParentCategory(e.target.value);
                        const sel = categoriesList.find((c) => (c.name || c.title) === e.target.value);
                        if (sel) setParentCategoryId(sel.id);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#dce6e1] bg-white text-xs text-[#0c2b22] outline-none focus:border-[#0b3b2c] font-semibold cursor-pointer"
                    >
                      {categoriesList.map((cat) => {
                        const cName = cat.name || cat.title || cat.id;
                        return (
                          <option key={cat.id} value={cName}>
                            {cName}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* 3. Color Hex Code (Only for Colours) */}
                {activeTab === 'colour' && (
                  <div>
                    <label className="text-xs font-bold text-[#0c2b22] block mb-1.5 uppercase tracking-wider">
                      Pick Color Swatch
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={colorCode}
                        onChange={(e) => setColorCode(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-[#dce6e1] p-0.5 cursor-pointer bg-white"
                      />
                      <input
                        type="text"
                        value={colorCode}
                        onChange={(e) => setColorCode(e.target.value)}
                        placeholder="#0b3b2c"
                        className="w-36 px-4 py-2 rounded-xl border border-[#dce6e1] font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                )}

                {/* 4. Arch Cover Image (For Category & Subcategory) */}
                {(activeTab === 'category' || activeTab === 'subcategory') && (
                  <div className="space-y-3 pt-2 border-t border-[#edf2ef]">
                    <label className="text-xs font-bold text-[#0c2b22] block uppercase tracking-wider">
                      Royal Arch Cover Image
                    </label>

                    <div className="flex items-center gap-4">
                      {/* Image Preview Box */}
                      <div className="w-18 h-22 rounded-t-[24px] rounded-b-xl overflow-hidden bg-[#f0f4f2] border-2 border-dashed border-[#dce6e1] shrink-0 flex items-center justify-center p-0.5 shadow-2xs">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt="Arch Preview"
                            className="w-full h-full object-cover object-top rounded-t-[22px] rounded-b-lg"
                          />
                        ) : (
                          <span className="text-[10px] text-neutral-400 font-bold text-center">
                            Arch Preview
                          </span>
                        )}
                      </div>

                      {/* File Upload / URL Controls */}
                      <div className="flex-1 space-y-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-2 px-3 rounded-xl border border-[#dce6e1] bg-[#f8faf9] hover:bg-[#edf2ef] text-[#0b3b2c] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          {uploadingImage ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UploadCloud className="w-3.5 h-3.5" />
                          )}
                          <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                        </button>

                        <input
                          type="url"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="Or paste direct image URL (https://...)"
                          className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] text-[11px] text-[#0c2b22] outline-none focus:border-[#0b3b2c]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="pt-6 border-t border-[#edf2ef] flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="flex-1 py-3 rounded-xl border border-[#dce6e1] text-neutral-600 font-bold text-xs uppercase tracking-wider hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !itemName.trim()}
                    className="flex-1 py-3 rounded-xl bg-[#0b3b2c] hover:bg-[#06231a] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-[#0b3b2c]/20"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>{isEditing ? 'Save Changes' : 'Add Item'}</span>
                  </button>
                </div>

              </form>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}