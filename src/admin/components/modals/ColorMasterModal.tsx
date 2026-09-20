import React, { useState, useEffect } from 'react';
import {
  Palette,
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
  Sparkles
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ColorRecord {
  id: string;
  name: string;
  hex_code: string;
  display_order?: number;
  active?: boolean;
  created_at?: string;
}

interface ColorMasterModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ColorMasterModal({ onClose, onSuccess }: ColorMasterModalProps) {
  const [colors, setColors] = useState<ColorRecord[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form State
  const [colorCode, setColorCode] = useState<string>('');
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [hexCode, setHexCode] = useState<string>('#6d4aff');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [editingMode, setEditingMode] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch Colors list
  const loadColors = async () => {
    setLoadingList(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('colors')
        .select('*');

      if (error) throw error;

      if (data) {
        const sorted = [...data].sort((a, b) => {
          const ordA = Number(a.display_order) || 0;
          const ordB = Number(b.display_order) || 0;
          if (ordA !== ordB) return ordA - ordB;
          return (a.id || '').localeCompare(b.id || '');
        });
        setColors(sorted);
      }
    } catch (err: any) {
      console.error('Error fetching colors:', err);
      setFetchError(err.message || 'Failed to load color masters.');
    } finally {
      setLoadingList(false);
    }
  };

  // 2. Generate Next Code in COL0001 series
  const generateColorCode = async () => {
    try {
      const { data } = await supabase
        .from('colors')
        .select('id')
        .like('id', 'COL%');

      if (data && data.length > 0) {
        let maxNum = 0;
        data.forEach((item) => {
          const match = item.id.match(/^COL(\d+)$/i);
          if (match) {
            const val = parseInt(match[1], 10);
            if (val > maxNum) maxNum = val;
          }
        });
        setColorCode(`COL${String(maxNum + 1).padStart(4, '0')}`);
      } else {
        setColorCode('COL0001');
      }
    } catch {
      setColorCode('COL0001');
    }
  };

  useEffect(() => {
    loadColors();
    generateColorCode();
  }, []);

  const resetForm = () => {
    setEditingMode(false);
    setOriginalId(null);
    setName('');
    setHexCode('#6d4aff');
    setDisplayOrder(colors.length > 0 ? colors.length + 1 : 1);
    setIsActive(true);
    generateColorCode();
  };

  const handleSelectCard = (color: ColorRecord) => {
    setEditingMode(true);
    setOriginalId(color.id);
    setColorCode(color.id);
    setName(color.name);
    setHexCode(color.hex_code || '#000000');
    setDisplayOrder(Number(color.display_order) || 0);
    setIsActive(color.active ?? true);
  };

  const isColSeries = (idString: string | null) => {
    if (!idString) return false;
    return /^COL\d+$/i.test(idString.trim());
  };

  const isIdEditable = editingMode && originalId ? !isColSeries(originalId) : false;

  const handleDeleteColor = async (e: React.MouseEvent, id: string, colorName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Color "${colorName}" (${id}) ni delete cheyala?`)) return;

    try {
      const { error } = await supabase.from('colors').delete().eq('id', id);
      if (error) throw error;

      if (originalId === id) resetForm();
      loadColors();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const targetId = colorCode.trim();
    if (!targetId) {
      setErrorMsg('Color ID ivvali.');
      setSubmitting(false);
      return;
    }

    try {
      if (editingMode && originalId) {
        if (targetId !== originalId) {
          const { data: exists } = await supabase.from('colors').select('id').eq('id', targetId).maybeSingle();
          if (exists) {
            throw new Error(`Color ID "${targetId}" already exist ayyi undi.`);
          }

          const { error: insertErr } = await supabase.from('colors').insert([{
            id: targetId,
            name: name.trim(),
            hex_code: hexCode.trim(),
            display_order: Number(displayOrder) || 0,
            active: isActive,
            created_at: new Date().toISOString()
          }]);
          if (insertErr) throw insertErr;

          // Cascade update in product_colors if references exist
          await supabase.from('product_colors').update({ color_id: targetId }).eq('color_id', originalId);
          await supabase.from('colors').delete().eq('id', originalId);
        } else {
          const { error: updateErr } = await supabase
            .from('colors')
            .update({
              name: name.trim(),
              hex_code: hexCode.trim(),
              display_order: Number(displayOrder) || 0,
              active: isActive
            })
            .eq('id', originalId);

          if (updateErr) throw updateErr;
        }
      } else {
        const { error: insertErr } = await supabase.from('colors').insert([{
          id: targetId,
          name: name.trim(),
          hex_code: hexCode.trim(),
          display_order: Number(displayOrder) || 0,
          active: isActive,
          created_at: new Date().toISOString()
        }]);

        if (insertErr) throw insertErr;
      }

      resetForm();
      loadColors();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error saving color:', err);
      setErrorMsg(err.message || 'Failed to save color master.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-[#0a0e17]/85 backdrop-blur-xl select-none font-sans animate-in fade-in">
      <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(109,74,255,0.2)] border border-white/10 flex flex-col text-xs relative">
        
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6d4aff] via-[#00d9ff] to-[#ff6b6b] rounded-t-3xl" />

        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
              <Palette className="w-4 h-4 text-[#00d9ff]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Color Command Center</span>
                <span className="px-2 py-0.5 rounded-full bg-[#6d4aff]/20 text-[#00d9ff] border border-[#6d4aff]/40 text-[9px] font-mono uppercase">
                  Total: {colors.length}
                </span>
              </h2>
              <span className="text-[10px] text-[#8b9bb4]">
                Manage universal color shade library and HEX codes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadColors}
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
          
          {/* LEFT PANE: EXISTING COLOR CARDS (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Color Palette ({colors.length})
              </span>
              <button
                type="button"
                onClick={resetForm}
                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-[#00ff9d] flex items-center gap-1.5 transition-all cursor-pointer"
                title="Reset Form to New Color"
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

            {/* CARDS GRID */}
            <div className="flex-1 overflow-y-auto max-h-[58vh] pr-1.5 custom-scrollbar">
              {loadingList ? (
                <div className="flex items-center justify-center p-12 text-[#8b9bb4]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00d9ff] mr-2" /> Colors load avthunnayi...
                </div>
              ) : colors.length === 0 ? (
                <div className="p-8 text-center text-[#8b9bb4] border border-dashed border-white/10 rounded-2xl">
                  Colors em levu. Kotha color create cheyandi.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {colors.map((c) => {
                    const isSelected = editingMode && originalId === c.id;
                    const isLocked = isColSeries(c.id);

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCard(c)}
                        className={`group rounded-2xl border transition-all cursor-pointer overflow-hidden flex flex-col relative ${
                          isSelected
                            ? 'bg-[#6d4aff]/25 border-[#6d4aff] shadow-lg shadow-[#6d4aff]/30 scale-[1.02]'
                            : 'bg-[#0a0e17]/80 border-white/10 hover:border-[#00d9ff]/50 hover:bg-[#151c33]/70'
                        }`}
                      >
                        {/* Order Badge */}
                        <div className="absolute top-2 left-2 z-10 bg-black/75 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold text-[#00ff9d] border border-white/10 backdrop-blur-md">
                          #{c.display_order ?? 0}
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteColor(e, c.id, c.name)}
                          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/70 hover:bg-[#ff6b6b] text-[#8b9bb4] hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100 backdrop-blur-md"
                          title="Delete Color"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>

                        {/* 1. Color Swatch Box */}
                        <div
                          className="w-full h-20 sm:h-24 relative overflow-hidden flex items-center justify-center transition-all"
                          style={{ backgroundColor: c.hex_code || '#151c33' }}
                        >
                          <div className="w-9 h-9 rounded-full border-2 border-white/40 shadow-xl backdrop-blur-sm flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white/80" />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-transparent to-transparent opacity-80" />
                        </div>

                        {/* 2. Swatch Kinda: Name and ID */}
                        <div className="p-2.5 flex flex-col items-center text-center space-y-1 bg-[#101628]/60 flex-1 justify-between">
                          <div className="w-full">
                            <h3 className="font-bold text-white text-[12px] truncate w-full" title={c.name}>
                              {c.name}
                            </h3>
                            <span className="font-mono text-[9px] text-[#8b9bb4] block uppercase">
                              {c.hex_code}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className={`font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded border tracking-wider flex items-center gap-1 ${
                              isLocked
                                ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/30'
                                : 'bg-[#ffa500]/15 text-[#ffa500] border-[#ffa500]/40'
                            }`}>
                              {isLocked && <Lock className="w-2.5 h-2.5" />}
                              {c.id}
                            </span>
                          </div>

                          <div className="text-[8.5px] font-mono pt-0.5 text-[#8b9bb4]">
                            <span className={c.active ? 'text-[#00ff9d]' : 'text-[#ff6b6b]'}>
                              ● {c.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANE: FORM (5 COLS) */}
          <div className="lg:col-span-5 bg-[#0a0e17]/60 p-4 rounded-3xl border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-mono font-bold text-[#00d9ff] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                {editingMode ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {editingMode ? `Edit Node (${originalId})` : 'Create New Color'}
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

            <form onSubmit={handleSave} className="space-y-3.5">
              {/* Color ID */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>Color ID *</span>
                  {isIdEditable ? (
                    <span className="text-[8.5px] text-[#ffa500] font-mono font-bold">
                      ASSIGN COL SERIES NOW
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
                    value={colorCode}
                    onChange={(e) => {
                      if (isIdEditable) {
                        setColorCode(e.target.value.toUpperCase());
                      }
                    }}
                    placeholder="e.g. COL0001"
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

              {/* Color Name */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                  Color Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Royal Blue / Maroon / Rani Pink"
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#101628] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors placeholder:text-slate-600"
                />
              </div>

              {/* HEX Code Picker & Live Preview */}
              <div className="p-3 bg-[#101628] rounded-2xl border border-white/10 space-y-2">
                <span className="text-[10px] font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1">
                  <Palette className="w-3 h-3" /> Color Shade / HEX Code
                </span>

                <div className="flex items-center gap-3">
                  {/* HTML5 Native Color input + Swatch Preview */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/20 shrink-0 shadow-md">
                    <input
                      type="color"
                      value={hexCode}
                      onChange={(e) => setHexCode(e.target.value)}
                      className="absolute -inset-2 w-16 h-16 cursor-pointer"
                    />
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-mono text-[#8b9bb4] block">HEX VALUE</label>
                    <input
                      type="text"
                      required
                      value={hexCode}
                      onChange={(e) => setHexCode(e.target.value)}
                      placeholder="#6d4aff"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-white/10 bg-[#0a0e17] font-mono font-bold text-white text-[11px] outline-none focus:border-[#00d9ff]"
                    />
                  </div>
                </div>
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
                <span>{editingMode ? 'Update Color Node' : 'Save Color Node'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}