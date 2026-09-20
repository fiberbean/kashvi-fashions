import React, { useState, useEffect } from 'react';
import {
  Ruler,
  X,
  Save,
  Loader2,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Plus,
  Lock,
  Filter,
  FolderPlus
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

  // Custom Group Creation State
  const [isAddingGroup, setIsAddingGroup] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupDesc, setNewGroupDesc] = useState<string>('');
  const [creatingGroup, setCreatingGroup] = useState<boolean>(false);

  // Size Form State
  const [sizeCode, setSizeCode] = useState<string>('');
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [selectedSubCatId, setSelectedSubCatId] = useState<string>('');
  const [sizeGroup, setSizeGroup] = useState<string>('apparel');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [editingMode, setEditingMode] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch Sizes, Groups, and SubCategories
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
        // Fallback default list
        setSizeGroups([
          { id: 'apparel', name: 'Apparel', description: 'XS, S, M, L, XL...' },
          { id: 'bangles', name: 'Bangles', description: '2.2, 2.4, 2.6, 2.8...' },
          { id: 'lingerie', name: 'Lingerie', description: '30B, 32B, 34B, 36C...' },
          { id: 'free_size', name: 'Free Size', description: 'Sarees, Fabrics' }
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

  // 2. Generate Next Code in SIZE0001 series
  const generateSizeCode = async () => {
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
        setSizeCode(`SIZE${String(maxNum + 1).padStart(4, '0')}`);
      } else {
        setSizeCode('SIZE0001');
      }
    } catch {
      setSizeCode('SIZE0001');
    }
  };

  useEffect(() => {
    loadData();
    generateSizeCode();
  }, []);

  const resetForm = () => {
    setEditingMode(false);
    setOriginalId(null);
    setName('');
    setSelectedSubCatId('');
    setSizeGroup(sizeGroups.length > 0 ? sizeGroups[0].id : 'apparel');
    setDisplayOrder(sizes.length > 0 ? sizes.length + 1 : 1);
    setIsActive(true);
    generateSizeCode();
  };

  const handleSelectCard = (item: SizeRecord) => {
    setEditingMode(true);
    setOriginalId(item.id);
    setSizeCode(item.id);
    setName(item.name);
    setSelectedSubCatId(item.sub_category_id || '');
    setSizeGroup(item.size_group || 'apparel');
    setDisplayOrder(Number(item.display_order) || 0);
    setIsActive(item.active ?? true);
  };

  const handleSubCategoryChange = (subCatId: string) => {
    setSelectedSubCatId(subCatId);
    if (!subCatId) return;
    const found = subCategories.find((s) => String(s.id) === String(subCatId));
    if (found && found.size_group) {
      setSizeGroup(found.size_group);
    }
  };

  const isSizeSeries = (idString: string | null) => {
    if (!idString) return false;
    return /^SIZE\d+$/i.test(idString.trim());
  };

  const isIdEditable = editingMode && originalId ? !isSizeSeries(originalId) : false;

  // Handle Custom Group Creation
  const handleCreateCustomGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);

    const slug = newGroupName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)+/g, '');

    try {
      const { error } = await supabase.from('size_groups').insert([{
        id: slug,
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || null,
        display_order: sizeGroups.length + 1,
        active: true
      }]);

      if (error) throw error;

      const updatedList = [...sizeGroups, {
        id: slug,
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || null
      }];
      setSizeGroups(updatedList);
      setSizeGroup(slug);
      setNewGroupName('');
      setNewGroupDesc('');
      setIsAddingGroup(false);
    } catch (err: any) {
      alert(`Could not create group: ${err.message}`);
    } finally {
      setCreatingGroup(false);
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
      setErrorMsg('Size label is required.');
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
                Create customizable size groups & manage size matrix
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

                {/* Filter Dropdown with Dynamic Groups */}
                <div className="flex items-center gap-1 bg-[#0a0e17] px-2 py-1 rounded-xl border border-white/10">
                  <Filter className="w-3 h-3 text-[#00d9ff]" />
                  <select
                    value={filterGroup}
                    onChange={(e) => setFilterGroup(e.target.value)}
                    className="bg-transparent text-[9.5px] font-mono text-white outline-none cursor-pointer uppercase"
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

            {/* COMPACT SIZES GRID */}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {filteredSizes.map((s) => {
                    const isSelected = editingMode && originalId === s.id;
                    const isLocked = isSizeSeries(s.id);
                    const grp = sizeGroups.find((g) => g.id === s.size_group);

                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSelectCard(s)}
                        className={`group p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative min-h-[96px] ${
                          isSelected
                            ? 'bg-[#6d4aff]/25 border-[#6d4aff] shadow-lg shadow-[#6d4aff]/30 scale-[1.02]'
                            : 'bg-[#0a0e17]/80 border-white/10 hover:border-[#00d9ff]/50 hover:bg-[#151c33]/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center font-bold text-white text-[12px] font-mono shadow-inner group-hover:border-[#00d9ff]/50">
                              {s.name}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-mono text-[8.5px] text-[#8b9bb4]">
                                #{s.display_order ?? 0}
                              </span>
                              <span className="font-mono text-[8.5px] text-[#00d9ff] uppercase font-bold truncate">
                                {grp?.name || s.size_group}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteSize(e, s.id, s.name)}
                            className="p-1 rounded-lg bg-white/5 hover:bg-[#ff6b6b] text-[#8b9bb4] hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Delete Size"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="my-1">
                          <span className="text-[8.5px] font-mono text-[#8b9bb4] block truncate">
                            {s.sub_category_name ? `📁 ${s.sub_category_name}` : '🌐 Universal All'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className={`font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded border tracking-wider flex items-center gap-1 ${
                            isLocked
                              ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/30'
                              : 'bg-[#ffa500]/15 text-[#ffa500] border-[#ffa500]/40'
                          }`}>
                            {isLocked && <Lock className="w-2.5 h-2.5" />}
                            {s.id}
                          </span>

                          <span className={`text-[8.5px] font-mono ${s.active ? 'text-[#00ff9d]' : 'text-[#ff6b6b]'}`}>
                            ● {s.active ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANE: FORM & CUSTOM GROUP MAKER (5 COLS) */}
          <div className="lg:col-span-5 bg-[#0a0e17]/60 p-4 rounded-3xl border border-white/10 space-y-3.5">
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
                  {isIdEditable ? (
                    <span className="text-[8.5px] text-[#ffa500] font-mono font-bold">
                      ASSIGN SIZE SERIES NOW
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
                    readOnly={!isIdEditable}
                    value={sizeCode}
                    onChange={(e) => {
                      if (isIdEditable) {
                        setSizeCode(e.target.value.toUpperCase());
                      }
                    }}
                    placeholder="e.g. SIZE0001"
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-[11px] outline-none transition-colors ${
                      isIdEditable
                        ? 'border-[#ffa500]/50 bg-[#101628] text-[#ffa500] focus:border-[#ffa500]'
                        : 'border-white/10 bg-[#0a0e17]/60 text-[#00ff9d] cursor-not-allowed'
                    }`}
                  />
                  {!isIdEditable && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b9bb4]">
                      <Lock className="w-3.5 h-3.5 text-[#8b9bb4]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Size Label / Value */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                  Size Label / Value *
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

              {/* Dynamic Size Groups Section with Custom Group Creator */}
              <div className="p-2.5 bg-[#101628] rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider">
                    Size Group *
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingGroup(!isAddingGroup)}
                    className="text-[9px] font-mono text-[#00d9ff] hover:text-[#00ff9d] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <FolderPlus className="w-3 h-3" />
                    <span>{isAddingGroup ? 'Close' : '+ New Group'}</span>
                  </button>
                </div>

                {/* Inline Custom Group Form */}
                {isAddingGroup && (
                  <div className="p-2.5 rounded-xl bg-[#0a0e17] border border-[#00d9ff]/30 space-y-2">
                    <span className="text-[9.5px] font-bold text-[#00d9ff] block">
                      Create Custom Size Group
                    </span>
                    <input
                      type="text"
                      placeholder="Group Name (e.g. Kids Wear, Footwear)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-white/10 bg-[#101628] text-white text-[10px] outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Example sizes (e.g. 6-7Y, 8-9Y or UK 6, UK 7)"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-white/10 bg-[#101628] text-[#8b9bb4] text-[9.5px] outline-none"
                    />
                    <button
                      type="button"
                      disabled={creatingGroup || !newGroupName.trim()}
                      onClick={handleCreateCustomGroup}
                      className="w-full py-1.5 rounded-lg bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 border border-[#00d9ff]/50 text-[#00d9ff] font-bold text-[9.5px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {creatingGroup ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      <span>Save & Apply Group</span>
                    </button>
                  </div>
                )}

                {/* Dynamic Groups Grid */}
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {sizeGroups.map((grp) => {
                    const isSelected = sizeGroup === grp.id;
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => setSizeGroup(grp.id)}
                        className={`p-2 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#6d4aff]/25 border-[#6d4aff] text-white shadow-sm'
                            : 'bg-[#0a0e17] border-white/10 text-[#8b9bb4] hover:text-white'
                        }`}
                      >
                        <div className="font-bold text-[10.5px] text-white truncate">{grp.name}</div>
                        <div className="text-[8.5px] text-[#8b9bb4] truncate">{grp.description || grp.id}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sub-Category Association (Optional) */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                  Linked Sub-Category (Optional)
                </label>
                <select
                  value={selectedSubCatId}
                  onChange={(e) => handleSubCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#101628] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors"
                >
                  <option value="">-- Universal (Applicable to All) --</option>
                  {subCategories.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name} ({sc.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Display Order & Active Status */}
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
                    className={`w-full py-2 px-3 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#00ff9d]/15 border-[#00ff9d]/40 text-[#00ff9d]'
                        : 'bg-[#ff6b6b]/15 border-[#ff6b6b]/40 text-[#ff6b6b]'
                    }`}
                  >
                    {isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
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
    </div>
  );
}