import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Ruler,
  X,
  Save,
  Loader2,
  Trash2,
  Edit2,
  RefreshCw,
  Plus,
  Settings,
  Check,
  Search,
  Tag,
  ChevronDown,
  Layers,
  Copy
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
  
  // Adding / Assigning Size State inside Group Manager
  const [activeAddingGroupId, setActiveAddingGroupId] = useState<string | null>(null);
  const [newSizeValue, setNewSizeValue] = useState<string>('');
  const [showAssignPickerForGroupId, setShowAssignPickerForGroupId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState<string>('');
  
  // Editing Size State inside Group Manager
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null);
  const [editingSizeName, setEditingSizeName] = useState<string>('');
  
  const [groupActionLoading, setGroupActionLoading] = useState<boolean>(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Sub Category Searchable Dropdown State
  const [isSubCatDropdownOpen, setIsSubCatDropdownOpen] = useState<boolean>(false);
  const [subCatSearch, setSubCatSearch] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Main Form Selection State
  const [selectedSubCatId, setSelectedSubCatId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSubCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Fetch Sizes, Groups, and SubCategories (Including auto-merging distinct groups from sizes)
  const loadData = async () => {
    setLoadingData(true);
    setFetchError(null);
    try {
      const [sizesRes, subCatRes, groupRes] = await Promise.all([
        supabase.from('sizes').select('*'),
        supabase.from('sub_categories').select('*'),
        supabase.from('size_groups').select('*').order('display_order', { ascending: true })
      ]);

      if (sizesRes.error) throw sizesRes.error;
      if (subCatRes.error) throw subCatRes.error;

      const loadedSizes: SizeRecord[] = sizesRes.data || [];
      setSizes(loadedSizes);

      if (subCatRes.data) {
        const sortedSubCats = [...subCatRes.data].sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
        );
        setSubCategories(sortedSubCats);
      }

      // Collect registered size groups
      let groupsList: SizeGroupItem[] = groupRes.data || [];

      // Auto discover any groups present in sizes table but missing in size_groups
      const knownGroupIds = new Set(groupsList.map((g) => g.id.toLowerCase().trim()));
      loadedSizes.forEach((s) => {
        if (s.size_group && !knownGroupIds.has(s.size_group.toLowerCase().trim())) {
          const rawId = s.size_group.trim();
          groupsList.push({
            id: rawId,
            name: rawId.charAt(0).toUpperCase() + rawId.slice(1).replace(/_/g, ' '),
            display_order: groupsList.length + 1
          });
          knownGroupIds.add(rawId.toLowerCase());
        }
      });

      if (groupsList.length === 0) {
        groupsList = [
          { id: 'apparel', name: 'Apparel' },
          { id: 'bangles', name: 'Bangles' },
          { id: 'lingerie', name: 'Lingerie' },
          { id: 'free_size', name: 'Free Size' }
        ];
      }

      setSizeGroups(groupsList);
      if (!selectedGroupId && groupsList.length > 0) {
        setSelectedGroupId(groupsList[0].id);
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
  }, []);

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
      setGroupError(err.message || 'Failed to update group name.');
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Group Actions: Delete Group
  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!window.confirm(`Are you sure you want to delete size group "${groupName}"?`)) return;
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
      setGroupError(err.message || 'Failed to delete group.');
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Size Actions inside Group Manager: Add Fresh New Size
  const handleAddNewSize = async (groupId: string) => {
    if (!newSizeValue.trim()) return;
    setGroupActionLoading(true);
    setGroupError(null);

    try {
      const nextId = await fetchNextSizeCode();
      const { error } = await supabase.from('sizes').insert([{
        id: nextId,
        name: newSizeValue.trim().toUpperCase(),
        size_group: groupId,
        display_order: sizes.length + 1,
        active: true,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;

      setNewSizeValue('');
      setActiveAddingGroupId(null);
      await loadData();
    } catch (err: any) {
      setGroupError(err.message || 'Failed to add size.');
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Multi-Group Reuse: Copy/Add Existing Size into Target Group without removing from original group
  const handleAddExistingSizeToGroup = async (existingSizeName: string, targetGroupId: string) => {
    setGroupActionLoading(true);
    setGroupError(null);

    // Check if this size label already exists in target group
    const alreadyInGroup = sizes.some(
      (s) =>
        (s.size_group || '').toLowerCase().trim() === targetGroupId.toLowerCase().trim() &&
        s.name.toLowerCase().trim() === existingSizeName.toLowerCase().trim()
    );

    if (alreadyInGroup) {
      setGroupError(`Size "${existingSizeName}" already exists in this group.`);
      setGroupActionLoading(false);
      return;
    }

    try {
      const nextId = await fetchNextSizeCode();
      const newRecord: SizeRecord = {
        id: nextId,
        name: existingSizeName.trim().toUpperCase(),
        size_group: targetGroupId,
        display_order: sizes.length + 1,
        active: true,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('sizes').insert([newRecord]);
      if (error) throw error;

      setSizes((prev) => [...prev, newRecord]);
    } catch (err: any) {
      setGroupError(err.message || 'Failed to add size to group.');
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Size Actions inside Group Manager: Update Existing Size
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
    if (!window.confirm(`Delete size "${sName}"?`)) return;
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

  // Main Screen: Save Group & Sub-Category Association
  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMessage(null);

    let subCatName: string | null = null;
    if (selectedSubCatId) {
      const found = subCategories.find((s) => String(s.id) === String(selectedSubCatId));
      subCatName = found ? found.name : null;
    }

    try {
      if (selectedSubCatId) {
        const { error } = await supabase
          .from('sizes')
          .update({
            sub_category_id: selectedSubCatId,
            sub_category_name: subCatName,
            active: isActive
          })
          .eq('size_group', selectedGroupId);

        if (error) throw error;

        await supabase
          .from('sub_categories')
          .update({ size_group: selectedGroupId })
          .eq('id', selectedSubCatId);
      }

      setFormMessage({ 
        type: 'success', 
        text: `Successfully linked "${selectedGroupId.toUpperCase()}" with sub-category!` 
      });
      await loadData();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error saving mapping:', err);
      setFormMessage({ type: 'error', text: err.message || 'Failed to save association.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Alphabetical (A to Z) filtered and sorted Sub-Categories list
  const filteredSubCategories = useMemo(() => {
    const list = subCatSearch.trim()
      ? subCategories.filter((sc) =>
          sc.name.toLowerCase().includes(subCatSearch.toLowerCase())
        )
      : subCategories;

    return [...list].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
  }, [subCategories, subCatSearch]);

  const selectedSubCatName = useMemo(() => {
    if (!selectedSubCatId) return '-- Universal (Applicable to All) --';
    const found = subCategories.find((s) => String(s.id) === String(selectedSubCatId));
    return found ? found.name : '-- Universal (Applicable to All) --';
  }, [selectedSubCatId, subCategories]);

  // Unique list of all distinct size names across the system
  const distinctGlobalSizeNames = useMemo(() => {
    const set = new Set<string>();
    sizes.forEach((s) => {
      if (s.name) set.add(s.name.trim().toUpperCase());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [sizes]);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-[#0a0e17]/85 backdrop-blur-xl select-none font-sans animate-in fade-in">
      <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(109,74,255,0.2)] border border-white/10 flex flex-col text-xs relative">
        
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
                Link Size Groups with Sub-Categories
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

        {/* MAIN SCREEN FORM */}
        <form onSubmit={handleSaveMapping} className="mt-4 space-y-4">
          
          {/* SIZE GROUP SELECTION */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider">
                Select Size Group *
              </label>
              <button
                type="button"
                onClick={() => setShowGroupManager(true)}
                className="text-[10.5px] font-mono text-[#00d9ff] hover:text-[#00ff9d] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
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

          {/* SUB-CATEGORY SELECTION */}
          <div className="relative" ref={dropdownRef}>
            <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1.5">
              Select Sub-Category *
            </label>

            <div
              onClick={() => setIsSubCatDropdownOpen(!isSubCatDropdownOpen)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#0a0e17] font-semibold text-white flex items-center justify-between cursor-pointer hover:border-[#00d9ff]/50 transition-colors"
            >
              <span className="truncate">{selectedSubCatName}</span>
              <ChevronDown className={`w-4 h-4 text-[#8b9bb4] transition-transform ${isSubCatDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {isSubCatDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#101628] border border-white/15 rounded-2xl p-2.5 shadow-2xl space-y-2 animate-in fade-in">
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    value={subCatSearch}
                    onChange={(e) => setSubCatSearch(e.target.value)}
                    placeholder="Type to filter alphabetically..."
                    className="w-full pl-8 pr-3 py-2 bg-[#0a0e17] rounded-xl text-white text-[11px] outline-none border border-white/10 focus:border-[#00d9ff] placeholder:text-[#8b9bb4]/50"
                  />
                  <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  <div
                    onClick={() => {
                      setSelectedSubCatId('');
                      setIsSubCatDropdownOpen(false);
                      setSubCatSearch('');
                    }}
                    className={`px-3 py-2 rounded-xl text-[11px] font-medium cursor-pointer transition-colors flex items-center justify-between ${
                      selectedSubCatId === ''
                        ? 'bg-[#6d4aff]/30 text-[#00d9ff] font-bold'
                        : 'text-[#8b9bb4] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>-- Universal (Applicable to All) --</span>
                    {selectedSubCatId === '' && <Check className="w-3.5 h-3.5 text-[#00d9ff]" />}
                  </div>

                  {filteredSubCategories.length === 0 ? (
                    <div className="p-3 text-center text-[#8b9bb4] text-[10px] italic">
                      No matching sub-categories found.
                    </div>
                  ) : (
                    filteredSubCategories.map((sc) => (
                      <div
                        key={sc.id}
                        onClick={() => {
                          setSelectedSubCatId(sc.id);
                          if (sc.size_group) setSelectedGroupId(sc.size_group);
                          setIsSubCatDropdownOpen(false);
                          setSubCatSearch('');
                        }}
                        className={`px-3 py-2 rounded-xl text-[11px] font-medium cursor-pointer transition-colors flex items-center justify-between ${
                          selectedSubCatId === sc.id
                            ? 'bg-[#6d4aff]/30 text-[#00d9ff] font-bold'
                            : 'text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate">{sc.name}</span>
                        {selectedSubCatId === sc.id && <Check className="w-3.5 h-3.5 text-[#00d9ff]" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* STATUS TOGGLE */}
          <div className="pt-1">
            <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
              Active Status
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

          {/* SAVE BUTTON */}
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
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>

      {/* POPUP MODAL: MANAGE GROUPS & GROUP-WISE SIZE LIST + MULTI-GROUP REUSE */}
      {showGroupManager && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#101628] border border-[#6d4aff]/40 rounded-3xl p-5 max-w-xl w-full shadow-2xl space-y-4 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#00d9ff]" />
                <h3 className="font-extrabold text-white text-sm tracking-wide">
                  Manage Size Groups & Sizes
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGroupManager(false);
                  setEditingGroupId(null);
                  setEditingSizeId(null);
                  setActiveAddingGroupId(null);
                  setShowAssignPickerForGroupId(null);
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

            {/* Create New Group Section */}
            <form onSubmit={handleCreateGroup} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter new group name (e.g. Bra, Footwear, Kids)..."
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

            {/* Groups List with Sizes and "Add New Size" button */}
            <div className="space-y-3.5 max-h-[62vh] overflow-y-auto pr-1 custom-scrollbar">
              <span className="text-[10px] font-mono text-[#8b9bb4] uppercase tracking-wider block">
                Groups List ({sizeGroups.length}) — Click &quot;Add Existing Size&quot; or &quot;Add New Size&quot; to populate
              </span>

              {sizeGroups.map((grp) => {
                const isEditingGroup = editingGroupId === grp.id;
                const isAddingSizeToThisGroup = activeAddingGroupId === grp.id;
                const isPickingExisting = showAssignPickerForGroupId === grp.id;
                
                // Matches case-insensitively
                const attachedSizes = sizes.filter(
                  (s) => (s.size_group || '').toLowerCase().trim() === grp.id.toLowerCase().trim()
                );

                const attachedNamesSet = new Set(
                  attachedSizes.map((s) => s.name.toLowerCase().trim())
                );

                // Distinct sizes available from other groups to reuse
                const availableGlobalSizes = distinctGlobalSizeNames.filter((sName) => {
                  const matchesSearch = assignSearch
                    ? sName.toLowerCase().includes(assignSearch.toLowerCase())
                    : true;
                  return !attachedNamesSet.has(sName.toLowerCase().trim()) && matchesSearch;
                });

                return (
                  <div
                    key={grp.id}
                    className="p-3.5 rounded-2xl bg-[#0a0e17]/90 border border-white/10 space-y-3 transition-all"
                  >
                    {/* Group Header: Group Name + Edit/Delete */}
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
                            <Tag className="w-3.5 h-3.5 text-[#00d9ff]" />
                            <span className="font-extrabold text-white text-[13px] tracking-wide">
                              {grp.name}
                            </span>
                            <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-white/5 text-[#00d9ff] border border-white/10 font-bold">
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

                    {/* SIZES LIST FOR THIS GROUP */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {attachedSizes.length === 0 ? (
                        <span className="text-[9.5px] font-mono text-[#8b9bb4]/60 italic py-1">
                          No sizes assigned to this group yet. Use the buttons below to add or reuse existing sizes.
                        </span>
                      ) : (
                        attachedSizes.map((s) => {
                          const isEditingThisSize = editingSizeId === s.id;

                          if (isEditingThisSize) {
                            return (
                              <div key={s.id} className="flex items-center gap-1 bg-[#101628] border border-[#00d9ff] px-2 py-1 rounded-lg">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingSizeName}
                                  onChange={(e) => setEditingSizeName(e.target.value)}
                                  className="w-16 bg-transparent text-white font-mono font-bold text-[10.5px] outline-none"
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

                              {/* Size Edit & Delete Buttons on Hover */}
                              <div className="flex items-center gap-1 opacity-0 group-hover/pill:opacity-100 transition-opacity ml-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSizeId(s.id);
                                    setEditingSizeName(s.name);
                                  }}
                                  className="text-[#8b9bb4] hover:text-[#00d9ff] cursor-pointer"
                                  title="Edit size"
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

                    {/* REUSE EXISTING SIZES PICKER DRAWER (DOES NOT REMOVE FROM OTHER GROUPS) */}
                    {isPickingExisting && (
                      <div className="p-3 bg-[#101628] rounded-xl border border-[#6d4aff]/40 space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1.5">
                            <Copy className="w-3 h-3 text-[#00ff9d]" />
                            Click any size to also add it into &quot;{grp.name}&quot;
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAssignPickerForGroupId(null);
                              setAssignSearch('');
                            }}
                            className="text-[10px] text-[#8b9bb4] hover:text-white"
                          >
                            Close
                          </button>
                        </div>

                        <input
                          type="text"
                          value={assignSearch}
                          onChange={(e) => setAssignSearch(e.target.value)}
                          placeholder="Filter existing sizes (e.g. 30A, 32B, XL, 2.6)..."
                          className="w-full px-2.5 py-1.5 bg-[#0a0e17] rounded-lg text-white text-[10px] outline-none border border-white/10 focus:border-[#00d9ff]"
                        />

                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                          {availableGlobalSizes.length === 0 ? (
                            <span className="text-[9px] text-[#8b9bb4] italic py-1">
                              All available sizes are already included in this group.
                            </span>
                          ) : (
                            availableGlobalSizes.map((sizeVal) => (
                              <button
                                key={sizeVal}
                                type="button"
                                onClick={() => handleAddExistingSizeToGroup(sizeVal, grp.id)}
                                className="px-2.5 py-1 bg-[#0a0e17] hover:bg-[#6d4aff]/40 hover:border-[#6d4aff] border border-white/10 rounded-md text-white font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                title={`Click to also add "${sizeVal}" into ${grp.name}`}
                              >
                                <Plus className="w-3 h-3 text-[#00ff9d]" />
                                <span>{sizeVal}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* ACTION BUTTONS: ADD NEW OR REUSE EXISTING */}
                    <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2">
                      {isAddingSizeToThisGroup ? (
                        <div className="flex items-center gap-1.5 w-full animate-in fade-in">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Enter new size name (e.g. 30B, 34C, XL)..."
                            value={newSizeValue}
                            onChange={(e) => setNewSizeValue(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-[#101628] rounded-xl text-white text-[10.5px] outline-none border border-[#00ff9d]/50"
                          />
                          <button
                            type="button"
                            disabled={groupActionLoading || !newSizeValue.trim()}
                            onClick={() => handleAddNewSize(grp.id)}
                            className="px-3 py-1.5 bg-[#00ff9d]/20 hover:bg-[#00ff9d]/30 text-[#00ff9d] rounded-xl font-mono font-bold text-[10px] border border-[#00ff9d]/40 flex items-center gap-1 cursor-pointer disabled:opacity-30"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save Size</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAddingGroupId(null);
                              setNewSizeValue('');
                            }}
                            className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-[#8b9bb4] rounded-xl text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAddingGroupId(grp.id);
                              setNewSizeValue('');
                              setShowAssignPickerForGroupId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#00d9ff]/15 text-[#00d9ff] border border-white/10 text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add New Size</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowAssignPickerForGroupId(isPickingExisting ? null : grp.id);
                              setActiveAddingGroupId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#00ff9d]/15 text-[#00ff9d] border border-white/10 text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Reuse Existing Sizes ({distinctGlobalSizeNames.length})</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Done Button */}
            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowGroupManager(false);
                  setEditingGroupId(null);
                  setEditingSizeId(null);
                  setActiveAddingGroupId(null);
                  setShowAssignPickerForGroupId(null);
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