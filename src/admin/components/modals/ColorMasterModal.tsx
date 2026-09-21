import React, { useState, useEffect, useMemo } from 'react';
import {
  Palette,
  Search,
  X,
  Loader2,
  Trash2,
  Check,
  RefreshCw,
  Sparkles,
  Plus,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export interface ColourRecord {
  id: string;
  name: string;
  hex_code?: string | null;
  base_color?: string | null;
  active?: boolean;
  display_order?: number | null;
  created_at?: string;
}

interface ColorMasterModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ColorMasterModal({ onClose, onSuccess }: ColorMasterModalProps) {
  const [savedColours, setSavedColours] = useState<ColourRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Active Base Color Family (e.g., Green, Blue, Pink, Yellow)
  const [baseColorInput, setBaseColorInput] = useState<string>('Green');

  // New Shade Input
  const [shadeName, setShadeName] = useState<string>('');
  const [shadeHex, setShadeHex] = useState<string>('#00ff9d');

  const loadSavedColours = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('colours')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setSavedColours(data || []);
    } catch (err: any) {
      console.error('Failed to load colours:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSavedColours();
  }, []);

  // Distinct base color families created by user
  const uniqueBaseFamilies = useMemo(() => {
    const set = new Set<string>();
    savedColours.forEach((c) => {
      if (c.base_color && c.base_color.trim()) {
        set.add(c.base_color.trim().toLowerCase());
      }
    });
    return Array.from(set);
  }, [savedColours]);

  // Current active family string
  const activeFamilyClean = (baseColorInput || '').trim().toLowerCase();

  // Shades belonging to the active base family
  const currentFamilyShades = useMemo(() => {
    if (!activeFamilyClean) return savedColours;
    return savedColours.filter(
      (c) => (c.base_color || '').toLowerCase().trim() === activeFamilyClean
    );
  }, [savedColours, activeFamilyClean]);

  // Generate Next Auto ID (COL0001, COL0002...)
  const getNextColorId = async (): Promise<string> => {
    try {
      const { data } = await supabase
        .from('colours')
        .select('id')
        .like('id', 'COL%')
        .order('id', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const match = data[0].id.match(/\d+$/);
        const nextNum = match ? parseInt(match[0], 10) + 1 : 1;
        return `COL${String(nextNum).padStart(4, '0')}`;
      }
      return 'COL0001';
    } catch {
      return `COL${Date.now().toString().slice(-4)}`;
    }
  };

  // Create & Save New Shade under current base color
  const handleCreateShade = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanShade = shadeName.trim();
    const cleanBase = (baseColorInput.trim() || 'General').toLowerCase();

    if (!cleanShade) {
      alert('Please enter a shade name (e.g., Bottle Green, Pista Green, Mint Green).');
      return;
    }

    // Check duplicate
    if (
      savedColours.some(
        (c) => c.name.toLowerCase().trim() === cleanShade.toLowerCase()
      )
    ) {
      alert(`Shade "${cleanShade}" is already created.`);
      return;
    }

    setSubmitting(true);
    try {
      const nextId = await getNextColorId();
      const newRecord: ColourRecord = {
        id: nextId,
        name: cleanShade,
        hex_code: shadeHex,
        base_color: cleanBase,
        active: true,
        display_order: savedColours.length + 1
      };

      const { error } = await supabase.from('colours').insert([newRecord]);
      if (error) throw error;

      setSavedColours((prev) => [...prev, newRecord]);
      setShadeName('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Error creating shade: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete shade
  const handleDeleteShade = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete shade "${name}" [${id}]?`)) return;

    setActionLoadingId(id);
    try {
      const { error } = await supabase.from('colours').delete().eq('id', id);
      if (error) throw error;

      setSavedColours((prev) => prev.filter((c) => c.id !== id));
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] p-3 sm:p-5 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#0a0e17] sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6d4aff] to-[#ff6b6b] text-white flex items-center justify-center shadow-md shadow-[#6d4aff]/30">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Colour & Shades Master Registry</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/30 text-[9.5px] font-mono">
                  {savedColours.length} Total Saved
                </span>
              </h3>
              <span className="text-[10.5px] text-[#8b9bb4]">
                Create custom base color families & register their exact shades with hex codes
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-[#ff6b6b]/30 text-[#8b9bb4] hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar text-xs">
          
          {/* Step 1: Base Color Selector / Input */}
          <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10.5px] font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> 1. Select or Enter Base Color Family
              </span>
              <span className="text-[10px] text-[#8b9bb4]">
                Current Active Family: <strong className="text-white capitalize">{baseColorInput || 'All'}</strong> ({currentFamilyShades.length} shades)
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Type base color name (e.g. Green, Blue, Pink, Maroon, Yellow)..."
                value={baseColorInput}
                onChange={(e) => setBaseColorInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#101628] border border-white/20 text-white font-semibold text-xs outline-none focus:border-[#00d9ff]"
              />
              <Palette className="w-4 h-4 text-[#8b9bb4] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Quick Pills for existing Base Families created by User */}
            {uniqueBaseFamilies.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-[#8b9bb4] font-mono mr-1">Saved Families:</span>
                {uniqueBaseFamilies.map((fam) => {
                  const isActive = activeFamilyClean === fam;
                  return (
                    <button
                      key={fam}
                      type="button"
                      onClick={() => setBaseColorInput(fam.charAt(0).toUpperCase() + fam.slice(1))}
                      className={`px-2.5 py-1 rounded-xl font-mono text-[10.5px] font-semibold transition-all capitalize cursor-pointer ${
                        isActive
                          ? 'bg-[#00d9ff] text-neutral-950 font-bold shadow-md'
                          : 'bg-[#101628] text-[#8b9bb4] hover:text-white border border-white/10'
                      }`}
                    >
                      {fam}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Create Shade Under this Base Color */}
          <form onSubmit={handleCreateShade} className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10 space-y-2.5">
            <span className="text-[10.5px] font-mono font-bold text-[#00ff9d] uppercase flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> 2. Add New Shade for &quot;{baseColorInput || 'General'}&quot;
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              {/* Shade Name */}
              <div className="sm:col-span-6">
                <input
                  type="text"
                  required
                  placeholder={`Enter shade name (e.g. Bottle ${baseColorInput || 'Green'}, Pista ${baseColorInput || 'Green'})...`}
                  value={shadeName}
                  onChange={(e) => setShadeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#101628] border border-white/15 text-white font-semibold outline-none text-xs focus:border-[#00ff9d]"
                />
              </div>

              {/* Hex Code & Color Picker */}
              <div className="sm:col-span-4 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-[#101628] px-2.5 py-1 rounded-xl border border-white/15">
                  <input
                    type="color"
                    value={shadeHex}
                    onChange={(e) => setShadeHex(e.target.value)}
                    className="w-6 h-6 rounded-lg cursor-pointer border-0 p-0 bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    value={shadeHex}
                    onChange={(e) => setShadeHex(e.target.value)}
                    className="w-full text-white font-mono text-xs outline-none uppercase bg-transparent"
                  />
                </div>
              </div>

              {/* Add Button */}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#00d9ff] to-[#00ff9d] text-neutral-950 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>Save Shade</span>
                </button>
              </div>
            </div>
          </form>

          {/* Step 3: Mini Cards of Saved Shades */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-white uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00ff9d]" /> 
                Saved Shades for &quot;{baseColorInput || 'All'}&quot; ({currentFamilyShades.length})
              </span>
              <span className="text-[10px] text-[#8b9bb4]">
                Green Border = <strong className="text-[#00ff9d]">Saved in DB</strong> (Available for Inwards)
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-[#8b9bb4]">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff] mb-1.5" />
                Loading shades...
              </div>
            ) : currentFamilyShades.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#0a0e17] border border-dashed border-white/10 text-center text-[#8b9bb4] italic text-xs space-y-1">
                <Palette className="w-5 h-5 mx-auto text-white/20 mb-1" />
                <p>No shades created under &quot;{baseColorInput}&quot; yet.</p>
                <p className="text-[10.5px] text-white/40">Enter a shade name and pick hex color above to save your first shade card.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {currentFamilyShades.map((shade) => {
                  const isLoading = actionLoadingId === shade.id;

                  return (
                    <div
                      key={shade.id}
                      className="p-2.5 rounded-2xl border border-[#00ff9d]/40 bg-[#00ff9d]/5 hover:bg-[#00ff9d]/10 transition-all relative group flex flex-col justify-between shadow-[0_0_12px_rgba(0,255,157,0.08)] ring-1 ring-[#00ff9d]/30"
                    >
                      {/* Top: Swatch + Saved Badge + Delete button */}
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <div
                          className="w-7 h-7 rounded-xl border border-white/20 shadow-inner shrink-0"
                          style={{ backgroundColor: shade.hex_code || '#6d4aff' }}
                        />
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] text-[8.5px] font-mono font-extrabold border border-[#00ff9d]/40">
                            <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
                            <span>SAVED</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleDeleteShade(shade.id, shade.name)}
                            className="p-1 rounded-lg text-[#8b9bb4] hover:text-[#ff6b6b] hover:bg-white/10 cursor-pointer transition-colors"
                            title="Delete Shade"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom: Shade Title & Hex Code */}
                      <div>
                        <span className="font-bold text-white text-xs block truncate" title={shade.name}>
                          {shade.name}
                        </span>
                        <div className="flex items-center justify-between text-[9.5px] font-mono text-[#8b9bb4] pt-0.5">
                          <span className="uppercase">{shade.hex_code || '—'}</span>
                          <span className="text-[#00d9ff]">[{shade.id}]</span>
                        </div>
                      </div>

                      {/* Loading overlay */}
                      {isLoading && (
                        <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center backdrop-blur-xs">
                          <Loader2 className="w-4 h-4 animate-spin text-[#00d9ff]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 4: All Registered Colours Overview */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-white uppercase flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00d9ff]" />
                All Registered Shades Across Families ({savedColours.length})
              </span>
              <button
                type="button"
                onClick={loadSavedColours}
                className="p-1 text-[#00d9ff] hover:text-white cursor-pointer"
                title="Refresh DB"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17] max-h-40 overflow-y-auto custom-scrollbar p-2">
              {savedColours.length === 0 ? (
                <div className="p-3 text-center text-[#8b9bb4] italic text-xs">
                  No shades registered yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {savedColours.map((sc) => (
                    <div
                      key={sc.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#101628] border border-white/15 text-xs text-white"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
                        style={{ backgroundColor: sc.hex_code || '#6d4aff' }}
                      />
                      <span className="font-bold">{sc.name}</span>
                      <span className="font-mono text-[9px] text-[#8b9bb4]">({sc.base_color || 'general'})</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteShade(sc.id, sc.name)}
                        className="text-[#8b9bb4] hover:text-[#ff6b6b] ml-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/10 bg-[#0a0e17] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
          >
            Done & Close
          </button>
        </div>

      </div>
    </div>
  );
}