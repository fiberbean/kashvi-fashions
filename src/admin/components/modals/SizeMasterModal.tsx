import React, { useState, useEffect, useMemo } from 'react';
import {
  Ruler,
  X,
  Save,
  Loader2,
  Trash2,
  Edit2,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Plus,
  Lock,
  Filter,
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
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Group Filter
  const [filterGroup, setFilterGroup] = useState<string>('ALL');

  // Group Manager Popup State
  const [showGroupManager, setShowGroupManager] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string>('');
  const [groupActionLoading, setGroupActionLoading] = useState<boolean>(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  
  // Adding size directly from inside group manager
  const [quickSizeInputs, setQuickSizeInputs] = useState<{ [groupId: string]: string }>({});

  // Sub Category Search State
  const [subCatSearch, setSubCatSearch] = useState<string>('');

  // Size Form State
  const [sizeCode, setSizeCode] = useState<string>('');
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [nextSeriesCode, setNextSeriesCode] = useState<string>('SIZE0001');
  const [name, setName] = useState<string>('');
  const [selectedSubCatId, setSelectedSubCatId] = useState<string>('');
  const [sizeGroup, setSizeGroup] = useState<string>('apparel');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [editingMode, setEditingMode] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSizeSeries = (idString: string | null) => {
    if (!idString) return false;
    return /^SIZE\d+$/i.test(idString.trim());
  };

  const loadData = async () => {
    setLoadingList(true);
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
        const sorted = [...sizesRes.data].sort((a, b) => {
          const ordA = Number(a.display_order) || 0;
          const ordB = Number(b.display_order) || 0;
          if (ordA !== ordB) return ordA - ordB;
          return (a.id || '').localeCompare(b.id || '');
        });
        setSizes(sorted);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setFetchError(err.message || 'Failed to fetch size masters.');
    } finally {
      setLoadingList(false);
    }
  };

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
        const generated = `SIZE${String(maxNum + 1).padStart(4, '0')}`;
        setNextSeriesCode(generated);
        return generated;
      } else {
        setNextSeriesCode('SIZE0001');
        return 'SIZE0001';
      }
    } catch {
      setNextSeriesCode('SIZE0001');
      return 'SIZE0001';
    }
  };

  useEffect(() => {
    loadData();
    fetchNextSizeCode().then((code) => setSizeCode(code));
  }, []);

  const resetForm = async () => {
    setEditingMode(false);
    setOriginalId(null);
    setName('');
    setSelectedSubCatId('');
    setSubCatSearch('');
    setSizeGroup(sizeGroups.length > 0 ? sizeGroups[0].id : 'apparel');
    setDisplayOrder(sizes.length > 0 ? sizes.length + 1 : 1);
    setIsActive(true);
    const code = await fetchNextSizeCode();
    setSizeCode(code);
  };

  const handleSelectCard = async (item: SizeRecord) => {
    setEditingMode(true);
    setOriginalId(item.id);
    setName(item.name);
    setSelectedSubCatId(item.sub_category_id || '');
    setSizeGroup(item.size_group || 'apparel');
    setDisplayOrder(Number(item.display_order) || 0);
    setIsActive(item.active ?? true);

    if (isSizeSeries(item.id)) {
      setSizeCode(item.id);
    } else {
      const freshCode = await fetchNextSizeCode();
      setSizeCode(freshCode);
    }
  };

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

      const updated = [...sizeGroups, { id: slug, name: newGroupName.trim() }];
      setSizeGroups(updated);
      setSizeGroup(slug);
      setNewGroupName('');
    } catch (err: any) {
      setGroupError(err.message || 'Failed to create group.');
    } finally {
      setGroupActionLoading(false);
    }
  };

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

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!window.confirm(`Are you sure you want to delete size group "${groupName}"?`)) return;
    setGroupActionLoading(true);
    setGroupError(null);

    try {
      const { error } = await supabase.from('size_groups').delete().eq('id', groupId);
      if (error) throw error;

      setSizeGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (sizeGroup === groupId && sizeGroups.length > 0) {
        setSizeGroup(sizeGroups[0].id);
      }
    } catch (err: any) {
      setGroupError(err.message || 'Failed to delete group. Sizes may be attached.');
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Add Size Directly inside Group Manager
  const handleQuickAddSizeToGroup = async (groupId: string) => {
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
      setGroupError(err.message || 'Failed to add size to group.');
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleDeleteSize = async (e: React.MouseEvent, id: string, sizeName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete size "${sizeName}" (${id})?`)) return;

    try {
      const { error } = await supabase.from('sizes').delete().eq('id', id);
      if (error) throw error;

      if (originalId === id) resetForm();
      loadData();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const targetId = sizeCode.trim();
    if (!targetId) {
      setErrorMsg('Size ID cannot be empty.');
      setSubmitting(false);
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Size is required.');
      setSubmitting(false);
      return;
    }

    let subCatName: string | null = null;
    if (selectedSubCatId) {
      const found = subCategories.find((s) => String(s.id) === String(selectedSubCatId));
      subCatName = found ? found.name : null;
    }

    try {
      if (editingMode && originalId) {
        if (targetId !== originalId) {
          const { data: exists } = await supabase.from('sizes').select('id').eq('id', targetId).maybeSingle();
          if (exists) {
            throw new Error(`Size ID "${targetId}" already exists.`);
          }

          const { error: insertErr } = await supabase.from('sizes').insert([{
            id: targetId,
            name: name.trim(),
            sub_category_id: selectedSubCatId || null,
            sub_category_name: subCatName,
            size_group: sizeGroup,
            display_order: Number(displayOrder) || 0,
            active: isActive,
            created_at: new Date().toISOString()
          }]);
          if (insertErr) throw insertErr;

          await supabase.from('sizes').delete().eq('id', originalId);
        } else {
          const { error: updateErr } = await supabase
            .from('sizes')
            .update({
              name: name.trim(),
              sub_category_id: selectedSubCatId || null,
              sub_category_name: subCatName,
              size_group: sizeGroup,
              display_order: Number(displayOrder) || 0,
              active: isActive
            })
            .eq('id', originalId);

          if (updateErr) throw updateErr;
        }
      } else {
        const { error: insertErr } = await supabase.from('sizes').insert([{
          id: targetId,
          name: name.trim(),
          sub_category_id: selectedSubCatId || null,
          sub_category_name: subCatName,
          size_group: sizeGroup,
          display_order: Number(displayOrder) || 0,
          active: isActive,
          created_at: new Date().toISOString()
        }]);

        if (insertErr) throw insertErr;
      }

      resetForm();
      loadData();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error saving size:', err);
      setErrorMsg(err.message || 'Failed to save size record.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSizes = sizes.filter((s) => {
    if (filterGroup === 'ALL') return true;
    return s.size_group === filterGroup;
  });

  // Filter Sub Categories for dropdown via search
  const searchedSubCategories = useMemo(() => {
    if (!subCatSearch.trim()) return subCategories;
    return subCategories.filter((sc) =>
      sc.name.toLowerCase().includes(subCatSearch.toLowerCase())
    );
  }, [subCategories, subCatSearch]);

  const isLegacyMigration = editingMode && originalId && !isSizeSeries(originalId);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-[#0a0e17]/85 backdrop-blur-xl select-none font-sans animate-in fade-in">
      <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(109,74,255,0.2)] border border-white/10 flex flex-col text-xs relative">
        
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
                <span>Size Command Center</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/40 text-[9px] font-mono uppercase">
                  Total: {sizes.length}
                </span>
              </h2>
              <span className="text-[10px] text-[#8b9bb4]">
                Compact size tags with real-time status LED
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-[#00d9ff] transition-all cursor-pointer"
              title="Refresh List"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
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

        {/* Dual Pane Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 flex-1 overflow-y-auto pr-1">
          
          {/* LEFT PANE: SIZES LIST (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                  Size Matrix ({filteredSizes.length})
                </span>

                {/* Filter Dropdown (Fixed White Background Bug) */}
                <div className="flex items-center gap-1 bg-[#0a0e17] px-2.5 py-1 rounded-xl border border-white/10">
                  <Filter className="w-3 h-3 text-[#00d9ff]" />
                  <select
                    value={filterGroup}
                    onChange={(e) => setFilterGroup(e.target.value)}
                    className="bg-[#0a0e17] text-[10px] font-mono text-white outline-none cursor-pointer uppercase [&>option]:bg-[#101628] [&>option]:text-white"
                  >
                    <option value="ALL">All Groups</option>
                    {sizeGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-[#00ff9d] flex items-center gap-1.5 transition-all cursor-pointer"
                title="Reset Form to New Size"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {fetchError && (
              <div className="p-3 bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 rounded-2xl text-[#ff6b6b] text-[10px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>DB Error: {fetchError}</span>
              </div>
            )}

            {/* SUPER COMPACT SIZES GRID */}
            <div className="flex-1 overflow-y-auto max-h-[58vh] pr-1.5 custom-scrollbar">
              {loadingList ? (
                <div className="flex items-center justify-center p-12 text-[#8b9bb4]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00d9ff] mr-2" /> Loading sizes...
                </div>
              ) : filteredSizes.length === 0 ? (
                <div className="p-8 text-center text-[#8b9bb4] border border-dashed border-white/10 rounded-2xl">
                  No sizes found in this group. Register using the form.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredSizes.map((s) => {
                    const isSelected = editingMode && originalId === s.id;
                    const isLocked = isSizeSeries(s.id);
                    const grp = sizeGroups.find((g) => g.id === s.size_group);

                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSelectCard(s)}
                        className={`group px-2.5 py-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative min-h-[64px] ${
                          isSelected
                            ? 'bg-[#6d4aff]/25 border-[#6d4aff] shadow-md shadow-[#6d4aff]/30 scale-[1.01]'
                            : 'bg-[#0a0e17]/80 border-white/10 hover:border-[#00d9ff]/50 hover:bg-[#151c33]/80'
                        }`}
                      >
                        {/* RIGHT TOP: LED LIGHT INDICATOR & DELETE */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5">
                          {/* LED Bulb */}
                          <div
                            className={`w-2 h-2 rounded-full transition-all ${
                              s.active
                                ? 'bg-[#00ff9d] shadow-[0_0_8px_#00ff9d]'
                                : 'bg-[#ff6b6b] shadow-[0_0_8px_#ff6b6b]'
                            }`}
                            title={s.active ? 'Active' : 'Deactive'}
                          />

                          <button
                            type="button"
                            onClick={(e) => handleDeleteSize(e, s.id, s.name)}
                            className="p-0.5 rounded bg-white/5 hover:bg-[#ff6b6b] text-[#8b9bb4] hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* BIG & BOLD SIZE VALUE */}
                        <div className="pr-6">
                          <span className="text-[16px] font-extrabold text-white tracking-wide font-mono block leading-none">
                            {s.name}
                          </span>
                        </div>

                        {/* BOTTOM: SIZE ID + GROUP */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-1">
                          <span className={`font-mono text-[8.5px] font-extrabold px-1.5 py-0.2 rounded border tracking-wider flex items-center gap-0.5 ${
                            isLocked
                              ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/30'
                              : 'bg-[#ffa500]/15 text-[#ffa500] border-[#ffa500]/40'
                          }`}>
                            {isLocked ? <Lock className="w-2 h-2" /> : <Sparkles className="w-2 h-2" />}
                            {s.id}
                          </span>

                          <span className="font-mono text-[8px] text-[#8b9bb4] uppercase truncate max-w-[70px]">
                            {grp?.name || s.size_group}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANE: FORM (5 COLS) */}
          <div className="lg:col-span-5 bg-[#0a0e17]/60 p-4 rounded-3xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-mono font-bold text-[#00d9ff] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                {editingMode ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {editingMode ? `Edit Node (${originalId})` : 'Create New Size'}
              </span>
              {editingMode && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[9.5px] font-mono text-[#8b9bb4] hover:text-white underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl border bg-[#ff6b6b]/10 border-[#ff6b6b]/30 text-[#ff6b6b] font-bold text-[10px]">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              {/* Size ID */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>Size ID *</span>
                  {isLegacyMigration ? (
                    <span className="text-[8.5px] text-[#00ff9d] font-mono font-bold flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> AUTO-UPGRADED TO SERIES
                    </span>
                  ) : (
                    <span className="text-[8.5px] text-[#8b9bb4] font-mono flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-[#00ff9d]" /> LOCKED & AUTO-GENERATED
                    </span>
                  )}
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

              {/* SIZE FIELD (Cleaned up from "Size Label / Value") */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                  Size *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="e.g. S, M, L, XL or 2.4, 2.6 or 34B"
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#101628] font-bold text-white outline-none focus:border-[#00d9ff] transition-colors placeholder:text-slate-600"
                />
              </div>

              {/* SIZE GROUP DROPDOWN + MANAGE GROUPS POPUP */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider">
                    Size Group *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowGroupManager(true)}
                    className="text-[9.5px] font-mono text-[#00d9ff] hover:text-[#00ff9d] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Manage Groups</span>
                  </button>
                </div>

                <select
                  required
                  value={sizeGroup}
                  onChange={(e) => setSizeGroup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#101628] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors cursor-pointer [&>option]:bg-[#101628] [&>option]:text-white"
                >
                  {sizeGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* LINKED SUB-CATEGORY (Only Names with Live Search Filter) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block">
                  Linked Sub-Category (Optional)
                </label>

                {/* Search box for sub categories */}
                <div className="relative">
                  <input
                    type="text"
                    value={subCatSearch}
                    onChange={(e) => setSubCatSearch(e.target.value)}
                    placeholder="Search sub-category by name..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-white/10 bg-[#0a0e17] text-white text-[10px] outline-none focus:border-[#00d9ff] placeholder:text-[#8b9bb4]/50"
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
                      if (found && found.size_group) setSizeGroup(found.size_group);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#101628] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors cursor-pointer [&>option]:bg-[#101628] [&>option]:text-white"
                >
                  <option value="">-- Universal (Applicable to All) --</option>
                  {searchedSubCategories.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Display Order & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                    Order Index
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#101628] font-mono font-bold text-[#00ff9d] outline-none focus:border-[#00d9ff]"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 mt-2 rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#6d4aff]/30 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#00d9ff]" />
                ) : (
                  <Save className="w-4 h-4 text-[#00ff9d]" />
                )}
                <span>{editingMode ? 'Update Size Node' : 'Save Size Node'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* POPUP MODAL: SIZE GROUPS MANAGER WITH DIRECT SIZE CREATION */}
      {showGroupManager && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#101628] border border-[#6d4aff]/40 rounded-3xl p-5 max-w-lg w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#00d9ff]" />
                <h3 className="font-extrabold text-white text-sm tracking-wide">
                  Manage Groups & Add Sizes
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGroupManager(false);
                  setEditingGroupId(null);
                  setGroupError(null);
                }}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {groupError && (
              <div className="p-2 rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 text-[#ff6b6b] text-[10px]">
                {groupError}
              </div>
            )}

            {/* Create New Group Input */}
            <form onSubmit={handleCreateGroup} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter new group name (e.g. Footwear, Kids)..."
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

            {/* Existing Groups with Attached Sizes & Quick Add Size Box */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              <span className="text-[10px] font-mono text-[#8b9bb4] uppercase tracking-wider block">
                Existing Groups ({sizeGroups.length})
              </span>

              {sizeGroups.map((grp) => {
                const isEditing = editingGroupId === grp.id;
                const attachedSizes = sizes.filter((s) => s.size_group === grp.id);

                return (
                  <div
                    key={grp.id}
                    className="p-3 rounded-2xl bg-[#0a0e17]/90 border border-white/10 space-y-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {isEditing ? (
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
                            <span className="font-extrabold text-white text-[12px] truncate">
                              {grp.name}
                            </span>
                            <span className="font-mono text-[8.5px] px-1.5 py-0.5 rounded bg-white/5 text-[#00d9ff] border border-white/10">
                              {attachedSizes.length} sizes
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
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

                    {/* SIZES PILLS LIST FOR THIS GROUP */}
                    <div className="flex flex-wrap gap-1">
                      {attachedSizes.length === 0 ? (
                        <span className="text-[9px] font-mono text-[#8b9bb4]/60 italic">
                          No sizes under this group yet.
                        </span>
                      ) : (
                        attachedSizes.map((s) => (
                          <span
                            key={s.id}
                            className="px-2 py-0.5 rounded-md bg-[#101628] border border-white/10 text-white font-mono font-bold text-[9px] shadow-sm"
                          >
                            {s.name}
                          </span>
                        ))
                      )}
                    </div>

                    {/* QUICK ADD SIZE INTO THIS GROUP */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                      <input
                        type="text"
                        placeholder={`Add new size to ${grp.name} (e.g. XL, 38, 2.6)...`}
                        value={quickSizeInputs[grp.id] || ''}
                        onChange={(e) =>
                          setQuickSizeInputs((prev) => ({ ...prev, [grp.id]: e.target.value }))
                        }
                        className="flex-1 px-2.5 py-1 bg-[#101628] rounded-lg text-white text-[10px] outline-none border border-white/10 focus:border-[#00d9ff]"
                      />
                      <button
                        type="button"
                        disabled={groupActionLoading || !quickSizeInputs[grp.id]?.trim()}
                        onClick={() => handleQuickAddSizeToGroup(grp.id)}
                        className="px-2.5 py-1 bg-[#00ff9d]/20 hover:bg-[#00ff9d]/30 text-[#00ff9d] rounded-lg font-mono font-bold text-[9.5px] border border-[#00ff9d]/40 flex items-center gap-1 cursor-pointer disabled:opacity-30"
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
                }}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-[11px] cursor-pointer"
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