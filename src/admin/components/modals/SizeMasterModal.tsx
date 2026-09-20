import React, { useState, useEffect, useMemo } from 'react';
import {
  Ruler,
  X,
  Save,
  Loader2,
  Trash2,
  Edit2,
  RefreshCw,
  Plus,
  Lock,
  Sparkles,
  Settings,
  Check,
  Search
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { SubCategoryRecord } from '../../types';

export interface SizeGroupItem {
  id: string;
  name: string;
  description?: string | null;
  display_order?: number;
  active?: boolean;
}

export interface SizeRecord {
  id: string;
  name: string;
  created_at?: string;
  active: boolean;
  sub_category_id?: string | null;
  sub_category_name?: string | null;
  size_group: string;
  display_order: number;
}

interface SizeMasterModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SizeMasterModal({ onClose, onSuccess }: SizeMasterModalProps) {
  const [sizes, setSizes] = useState<SizeRecord[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryRecord[]>([]);
  const [sizeGroups, setSizeGroups] = useState<SizeGroupItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Group Manager Popup State
  const [showGroupManager, setShowGroupManager] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string>('');
  
  // Size Edit Inside Group Manager State
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null);
  const [editingSizeName, setEditingSizeName] = useState<string>('');
  const [quickSizeInputs, setQuickSizeInputs] = useState<{ [groupId: string]: string }>({});
  const [groupActionLoading, setGroupActionLoading] = useState<boolean>(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Sub Category Search State
  const [subCatSearch, setSubCatSearch] = useState<string>('');

  // Main Form State
  const [sizeCode, setSizeCode] = useState<string>('');
  const [sizeName, setSizeName] = useState<string>('');
  const [selectedSubCatId, setSelectedSubCatId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('apparel');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch Sizes, Groups, and SubCategories
  const loadData = async () => {
    setLoadingData(true);
    setFetchError(null);
    try {
      const [sizesRes, subCatRes, groupRes] = await Promise.all([
        supabase.from('sizes').select('*'),
        supabase.from('sub_categories').select('*').order('display_order', { ascending: true }),
        supabase.from('size_groups').select('*').order('display_order', { ascending: true })
      ]);

      if (sizesRes.error) throw sizesRes.error;
      if (subCatRes.error) throw subCatRes.error;

      if (groupRes.data && groupRes.data.length > 0) {
        setSizeGroups(groupRes.data);
      } else {
        setSizeGroups([
          { id: 'apparel', name: 'Apparel' },
          { id: 'bangles', name: 'Bangles' },
          { id: 'lingerie', name: 'Lingerie' },
          { id: 'free_size', name: 'Free Size' }
        ]);
      }

      if (subCatRes.data) {
        setSubCategories(subCatRes.data);
      }

      if (sizesRes.data) {
        setSizes(sizesRes.data);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setFetchError(err.message || 'Failed to fetch size data.');
    } finally {
      setLoadingData(false);
    }
  };

  // 2. Fetch Next Series ID (SIZE0001)
  const fetchNextSizeCode = async () => {
    try {
      const { data } = await supabase
        .from('sizes')
        .select('id')
        .like('id', 'SIZE%');

      if (data && data.length > 0) {
        let maxNum = 0;
        data.forEach((item) => {
          const match = item.id.match(/^SIZE(\d+)$/i);
          if (match) {
            const val = parseInt(match[1], 10);
            if (val > maxNum) maxNum = val;
          }
        });
        return `SIZE${String(maxNum + 1).padStart(4, '0')}`;
      }
      return 'SIZE0001';
    } catch {
      return 'SIZE0001';
    }
  };

  useEffect(() => {
    loadData();
    fetchNextSizeCode().then((code) => setSizeCode(code));
  }, []);

  const resetForm = async () => {
    setSizeName('');
    setSelectedSubCatId('');
    setSubCatSearch('');
    setDisplayOrder(sizes.length + 1);
    setIsActive(true);
    setFormMessage(null);
    const code = await fetchNextSizeCode();
    setSizeCode(code);
  };

  // Group Actions: Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setGroupActionLoading(true);
    setGroupError(null);

    const slug = newGroupName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)+/g, '');

    try {
      const { error } = await supabase.from('size_groups').insert([{
        id: slug,
        name: newGroupName.trim(),
        display_order: sizeGroups.length + 1,
        active: true
      }]);
      if (error) throw error;

      setSizeGroups((prev) => [...prev, { id: slug, name: newGroupName.trim() }]);
      setSelectedGroupId(slug);
      setNewGroupName('');
    } catch (err: any) {
      setGroupError(err.message || 'Failed to create group.');
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Group Actions: Update Group Name
  const handleUpdateGroup = async (groupId: string) => {
    if (!editingGroupName.trim()) return;
    setGroupActionLoading(true);
    setGroupError(null);

    try {
      const { error } = await supabase
        .from('size_groups')
        .update({ name: editingGroupName.trim() })
        .eq('id', groupId);

      if (error) throw error;

      setSizeGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, name: editingGroupName.trim() } : g))
      );
      setEditingGroupId(null);
      setEditingGroupName('');
    } catch (err: any) {
      setGroupError(err.message || 'Failed to update group.');
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Group Actions: Delete Group
  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!window.confirm(`Are you sure you want to delete group "${groupName}"?`)) return;
    setGroupActionLoading(true);
    setGroupError(null);

    try {
      const { error } = await supabase.from('size_groups').delete().eq('id', groupId);
      if (error) throw error;

      setSizeGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (selectedGroupId === groupId && sizeGroups.length > 0) {
        setSelectedGroupId(sizeGroups[0].id);
      }
    } catch (err: any) {
      setGroupError(err.message || 'Failed to delete group. Please remove associated sizes first.');
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Size Actions inside Group Manager: Add Size to Group
  const handleAddSizeToGroup = async (groupId: string) => {
    const val = quickSizeInputs[groupId]?.trim();
    if (!val) return;

    setGroupActionLoading(true);
    setGroupError(null);
    try {
      const nextId = await fetchNextSizeCode();
      const { error } = await supabase.from('sizes').insert([{
        id: nextId,
        name: val.toUpperCase(),
        size_group: groupId,
        display_order: sizes.length + 1,
        active: true,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;

      setQuickSizeInputs((prev) => ({ ...prev, [groupId]: '' }));
      await loadData();
    } catch (err: any) {
      setGroupError(err.message || 'Failed to add size.');
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Size Actions inside Group Manager: Edit Size Label
  const handleUpdateSizeInGroup = async (sizeId: string) => {
    if (!editingSizeName.trim()) return;
    setGroupActionLoading(true);
    setGroupError(null);

    try {
      const { error } = await supabase
        .from('sizes')
        .update({ name: editingSizeName.trim().toUpperCase() })
        .eq('id', sizeId);

      if (error) throw error;

      setSizes((prev) =>
        prev.map((s) => (s.id === sizeId ? { ...s, name: editingSizeName.trim().toUpperCase() } : s))
      );
      setEditingSizeId(null);
      setEditingSizeName('');
    } catch (err: any) {
      setGroupError(err.message || 'Failed to update size.');
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Size Actions inside Group Manager: Delete Size
  const handleDeleteSizeInGroup = async (sizeId: string, sName: string) => {
    if (!window.confirm(`Delete size "${sName}" (${sizeId})?`)) return;
    setGroupActionLoading(true);
    setGroupError(null);

    try {
      const { error } = await supabase.from('sizes').delete().eq('id', sizeId);
      if (error) throw error;

      setSizes((prev) => prev.filter((s) => s.id !== sizeId));
    } catch (err: any) {
      setGroupError(err.message || 'Failed to delete size.');
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Main Form Submission
  const handleSaveSize = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMessage(null);

    const targetId = sizeCode.trim();
    if (!targetId || !sizeName.trim()) {
      setFormMessage({ type: 'error', text: 'Size Label cannot be empty.' });
      setSubmitting(false);
      return;
    }

    let subCatName: string | null = null;
    if (selectedSubCatId) {
      const found = subCategories.find((s) => String(s.id) === String(selectedSubCatId));
      subCatName = found ? found.name : null;
    }

    try {
      const { error: insertErr } = await supabase.from('sizes').insert([{
        id: targetId,
        name: sizeName.trim().toUpperCase(),
        sub_category_id: selectedSubCatId || null,
        sub_category_name: subCatName,
        size_group: selectedGroupId,
        display_order: Number(displayOrder) || 0,
        active: isActive,
        created_at: new Date().toISOString()
      }]);

      if (insertErr) throw insertErr;

      setFormMessage({ type: 'success', text: `Size ${sizeName.toUpperCase()} saved successfully!` });
      await loadData();
      resetForm();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error saving size:', err);
      setFormMessage({ type: 'error', text: err.message || 'Failed to save size.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter Sub Categories via search
  const searchedSubCategories = useMemo(() => {
    if (!subCatSearch.trim()) return subCategories;
    return subCategories.filter((sc) =>
      sc.name.toLowerCase().includes(subCatSearch.toLowerCase())
    );
  }, [subCategories, subCatSearch]);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-[#0a0e17]/85 backdrop-blur-xl select-none font-sans animate-in fade-in">
      <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(109,74,255,0.2)] border border-white/10 flex flex-col text-xs relative">
        
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6d4aff] via-[#00d9ff] to-[#00ff9d] rounded-t-3xl" />

        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
              <Ruler className="w-4 h-4 text-[#00d9ff]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Size Master Configuration</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/40 text-[9px] font-mono uppercase">
                  Total Sizes: {sizes.length}
                </span>
              </h2>
              <span className="text-[10px] text-[#8b9bb4]">
                Select Sub-Category & Size Group to quickly register new sizes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-[#00d9ff] transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {fetchError && (
          <div className="mt-3 p-2.5 bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 rounded-xl text-[#ff6b6b] text-[10px]">
            {fetchError}
          </div>
        )}

        {formMessage && (
          <div className={`mt-3 p-2.5 rounded-xl border text-[10.5px] font-bold ${
            formMessage.type === 'success'
              ? 'bg-[#00ff9d]/10 border-[#00ff9d]/40 text-[#00ff9d]'
              : 'bg-[#ff6b6b]/10 border-[#ff6b6b]/40 text-[#ff6b6b]'
          }`}>
            {formMessage.text}
          </div>
        )}

        {/* Main Clean Form Console */}
        <form onSubmit={handleSaveSize} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Auto Generated Series ID */}
            <div>
              <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1 flex items-center justify-between">
                <span>Size ID</span>
                <span className="text-[8.5px] text-[#8b9bb4] font-mono flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-[#00ff9d]" /> AUTO-GENERATED
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  readOnly
                  value={sizeCode}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#0a0e17]/60 font-mono font-bold text-[11px] text-[#00ff9d] outline-none cursor-not-allowed"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b9bb4]">
                  <Lock className="w-3.5 h-3.5 text-[#8b9bb4]" />
                </div>
              </div>
            </div>

            {/* Direct Size Label */}
            <div>
              <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                Size *
              </label>
              <input
                type="text"
                required
                value={sizeName}
                onChange={(e) => setSizeName(e.target.value.toUpperCase())}
                placeholder="e.g. S, M, L, XL or 2.4, 2.6 or 34B"
                className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#0a0e17] font-bold text-white text-[11px] outline-none focus:border-[#00d9ff] transition-colors placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Size Group Selection & Manage Groups Button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider">
                Size Group *
              </label>
              <button
                type="button"
                onClick={() => setShowGroupManager(true)}
                className="text-[10px] font-mono text-[#00d9ff] hover:text-[#00ff9d] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Manage Size Groups</span>
              </button>
            </div>

            <select
              required
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#0a0e17] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors cursor-pointer [&>option]:bg-[#101628] [&>option]:text-white"
            >
              {sizeGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-Category Selection with Live Search */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block">
              Sub-Category (Optional Link)
            </label>

            <div className="relative">
              <input
                type="text"
                value={subCatSearch}
                onChange={(e) => setSubCatSearch(e.target.value)}
                placeholder="Search sub-category by name..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-white/10 bg-[#0a0e17] text-white text-[10.5px] outline-none focus:border-[#00d9ff] placeholder:text-[#8b9bb4]/50"
              />
              <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <select
              value={selectedSubCatId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSubCatId(val);
                if (val) {
                  const found = subCategories.find((s) => String(s.id) === String(val));
                  if (found && found.size_group) setSelectedGroupId(found.size_group);
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#0a0e17] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors cursor-pointer [&>option]:bg-[#101628] [&>option]:text-white"
            >
              <option value="">-- Universal (Applicable to All) --</option>
              {searchedSubCategories.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Order Index & Status Controls */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                Order Index
              </label>
              <input
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#0a0e17] font-mono font-bold text-[#00ff9d] outline-none focus:border-[#00d9ff]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                Status
              </label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full py-2 px-3 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#00ff9d]/15 border-[#00ff9d]/40 text-[#00ff9d]'
                    : 'bg-[#ff6b6b]/15 border-[#ff6b6b]/40 text-[#ff6b6b]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isActive ? 'bg-[#00ff9d] shadow-[0_0_8px_#00ff9d]' : 'bg-[#ff6b6b] shadow-[0_0_8px_#ff6b6b]'
                  }`}
                />
                <span>{isActive ? 'Active' : 'Disabled'}</span>
              </button>
            </div>
          </div>

          {/* Save Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || loadingData}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#6d4aff]/30 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#00d9ff]" />
              ) : (
                <Save className="w-4 h-4 text-[#00ff9d]" />
              )}
              <span>Save Size Node</span>
            </button>
          </div>
        </form>
      </div>

      {/* POPUP MODAL: SIZE GROUPS & SIZES MANAGEMENT (EDIT/DELETE GROUPS & SIZES) */}
      {showGroupManager && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#101628] border border-[#6d4aff]/40 rounded-3xl p-5 max-w-xl w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#00d9ff]" />
                <h3 className="font-extrabold text-white text-sm tracking-wide">
                  Size Groups & Associated Sizes
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGroupManager(false);
                  setEditingGroupId(null);
                  setEditingSizeId(null);
                  setGroupError(null);
                }}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {groupError && (
              <div className="p-2.5 rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 text-[#ff6b6b] text-[10.5px]">
                {groupError}
              </div>
            )}

            {/* Create New Group Input */}
            <form onSubmit={handleCreateGroup} className="flex gap-2">
              <input
                type="text"
                placeholder="New Group Name (e.g. Footwear, Kids)..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#0a0e17] rounded-xl text-white text-[11px] outline-none border border-white/10 focus:border-[#00d9ff]"
              />
              <button
                type="submit"
                disabled={groupActionLoading || !newGroupName.trim()}
                className="px-3.5 py-2 rounded-xl bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 text-[#00d9ff] font-bold text-[11px] border border-[#00d9ff]/40 flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Group</span>
              </button>
            </form>

            {/* Existing Groups List with Attached Sizes, Edit, Delete Controls */}
            <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1 custom-scrollbar">
              <span className="text-[10px] font-mono text-[#8b9bb4] uppercase tracking-wider block">
                Groups List ({sizeGroups.length})
              </span>

              {sizeGroups.map((grp) => {
                const isEditingGroup = editingGroupId === grp.id;
                const attachedSizes = sizes.filter((s) => s.size_group === grp.id);

                return (
                  <div
                    key={grp.id}
                    className="p-3.5 rounded-2xl bg-[#0a0e17]/90 border border-white/10 space-y-3 transition-all"
                  >
                    {/* Top Row: Group Name Edit & Delete */}
                    <div className="flex items-center justify-between gap-2">
                      {isEditingGroup ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input
                            type="text"
                            autoFocus
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            className="flex-1 px-2.5 py-1 bg-[#101628] rounded-lg text-white text-[11px] border border-[#00d9ff] outline-none font-bold"
                          />
                          <button
                            type="button"
                            disabled={groupActionLoading}
                            onClick={() => handleUpdateGroup(grp.id)}
                            className="p-1.5 rounded bg-[#00ff9d]/20 text-[#00ff9d] hover:bg-[#00ff9d]/30 cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingGroupId(null)}
                            className="p-1.5 rounded bg-white/5 text-[#8b9bb4] hover:text-white cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-extrabold text-white text-[13px] tracking-wide">
                              {grp.name}
                            </span>
                            <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-white/5 text-[#00d9ff] border border-white/10">
                              {attachedSizes.length} sizes
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGroupId(grp.id);
                                setEditingGroupName(grp.name);
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-[#00d9ff]/20 text-[#8b9bb4] hover:text-[#00d9ff] transition-colors cursor-pointer"
                              title="Edit Group Name"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(grp.id, grp.name)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-[#ff6b6b]/20 text-[#8b9bb4] hover:text-[#ff6b6b] transition-colors cursor-pointer"
                              title="Delete Group"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* SIZES PILLS WITH INLINE EDIT & DELETE FOR EACH SIZE */}
                    <div className="flex flex-wrap gap-1.5">
                      {attachedSizes.length === 0 ? (
                        <span className="text-[9.5px] font-mono text-[#8b9bb4]/60 italic py-1">
                          No sizes registered under this group yet.
                        </span>
                      ) : (
                        attachedSizes.map((s) => {
                          const isEditingThisSize = editingSizeId === s.id;

                          if (isEditingThisSize) {
                            return (
                              <div key={s.id} className="flex items-center gap-1 bg-[#101628] border border-[#00d9ff] px-1.5 py-0.5 rounded-lg">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingSizeName}
                                  onChange={(e) => setEditingSizeName(e.target.value)}
                                  className="w-14 bg-transparent text-white font-mono font-bold text-[10px] outline-none"
                                />
                                <button
                                  type="button"
                                  disabled={groupActionLoading}
                                  onClick={() => handleUpdateSizeInGroup(s.id)}
                                  className="text-[#00ff9d] hover:text-white"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSizeId(null)}
                                  className="text-[#8b9bb4] hover:text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={s.id}
                              className="group/pill flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#101628] border border-white/10 hover:border-[#00d9ff]/50 transition-all"
                            >
                              <span className="text-white font-mono font-bold text-[10.5px]">
                                {s.name}
                              </span>
                              <span className="text-[8px] text-[#8b9bb4] font-mono">
                                ({s.id})
                              </span>

                              {/* Size Edit & Delete Buttons */}
                              <div className="flex items-center gap-1 opacity-0 group-hover/pill:opacity-100 transition-opacity ml-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSizeId(s.id);
                                    setEditingSizeName(s.name);
                                  }}
                                  className="text-[#8b9bb4] hover:text-[#00d9ff] cursor-pointer"
                                  title="Edit size label"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSizeInGroup(s.id, s.name)}
                                  className="text-[#8b9bb4] hover:text-[#ff6b6b] cursor-pointer"
                                  title="Delete size"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Quick Add Size Input Box */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                      <input
                        type="text"
                        placeholder={`Add new size to ${grp.name} (e.g. XL, 38, 2.6)...`}
                        value={quickSizeInputs[grp.id] || ''}
                        onChange={(e) =>
                          setQuickSizeInputs((prev) => ({ ...prev, [grp.id]: e.target.value }))
                        }
                        className="flex-1 px-2.5 py-1.5 bg-[#101628] rounded-xl text-white text-[10px] outline-none border border-white/10 focus:border-[#00d9ff]"
                      />
                      <button
                        type="button"
                        disabled={groupActionLoading || !quickSizeInputs[grp.id]?.trim()}
                        onClick={() => handleAddSizeToGroup(grp.id)}
                        className="px-3 py-1.5 bg-[#00ff9d]/20 hover:bg-[#00ff9d]/30 text-[#00ff9d] rounded-xl font-mono font-bold text-[10px] border border-[#00ff9d]/40 flex items-center gap-1 cursor-pointer disabled:opacity-30"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Size</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowGroupManager(false);
                  setEditingGroupId(null);
                  setEditingSizeId(null);
                }}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-[11px] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}