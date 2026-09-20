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
  Wand2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export interface ColorRecord {
  id: string;
  name: string;
  hex_code?: string;
  display_order?: number;
  active?: boolean;
  created_at?: string;
}

interface ColorMasterModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const STANDARD_PALETTE = [
  { name: 'Pure Black', hex: '#000000' },
  { name: 'Charcoal Grey', hex: '#333333' },
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Off White / Cream', hex: '#f8f9fa' },
  { name: 'Ivory', hex: '#fffff0' },
  { name: 'Beige', hex: '#f5f5dc' },
  { name: 'Crimson Red', hex: '#dc143c' },
  { name: 'Ruby Red', hex: '#9b111e' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Wine / Burgundy', hex: '#4a0e17' },
  { name: 'Coral Red', hex: '#ff4040' },
  { name: 'Rani Pink', hex: '#ff1493' },
  { name: 'Hot Pink', hex: '#ff69b4' },
  { name: 'Baby Pink', hex: '#ffb6c1' },
  { name: 'Blush Pink', hex: '#ffd1dc' },
  { name: 'Magenta', hex: '#ff00ff' },
  { name: 'Lavender', hex: '#e6e6fa' },
  { name: 'Lilac', hex: '#c8a2c8' },
  { name: 'Royal Purple', hex: '#7851a9' },
  { name: 'Deep Violet', hex: '#4b0082' },
  { name: 'Plum', hex: '#dda0dd' },
  { name: 'Navy Blue', hex: '#000080' },
  { name: 'Midnight Blue', hex: '#191970' },
  { name: 'Royal Blue', hex: '#4169e1' },
  { name: 'Cobalt Blue', hex: '#0047ab' },
  { name: 'Sky Blue', hex: '#87ceeb' },
  { name: 'Powder Blue', hex: '#b0e0e6' },
  { name: 'Teal Blue', hex: '#008080' },
  { name: 'Turquoise / Firozi', hex: '#40e0d0' },
  { name: 'Aqua Blue', hex: '#00ffff' },
  { name: 'Cyan / Electric Blue', hex: '#00d9ff' },
  { name: 'Emerald Green', hex: '#50c878' },
  { name: 'Bottle Green', hex: '#004225' },
  { name: 'Forest Green', hex: '#228b22' },
  { name: 'Olive Green', hex: '#808000' },
  { name: 'Mint Green', hex: '#98ff98' },
  { name: 'Pista Green', hex: '#93c572' },
  { name: 'Lime Green', hex: '#32cd32' },
  { name: 'Neon Green', hex: '#00ff9d' },
  { name: 'Mustard Yellow', hex: '#ffdb58' },
  { name: 'Lemon Yellow', hex: '#fff44f' },
  { name: 'Bright Yellow', hex: '#ffff00' },
  { name: 'Gold / Golden', hex: '#ffd700' },
  { name: 'Dark Orange', hex: '#ff8c00' },
  { name: 'Tangerine Orange', hex: '#f28500' },
  { name: 'Peach', hex: '#ffe5b4' },
  { name: 'Rust Orange', hex: '#b7410e' },
  { name: 'Chocolate Brown', hex: '#7b3f00' },
  { name: 'Coffee Brown', hex: '#4a2c2a' },
  { name: 'Tan Brown', hex: '#d2b48c' },
  { name: 'Silver / Grey', hex: '#c0c0c0' },
  { name: 'Steel Grey', hex: '#708090' },
  { name: 'Slate Blue', hex: '#6a5acd' }
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16)
    };
  }
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16)
    };
  }
  return null;
}

function getNearestColorName(hex: string): string {
  const target = hexToRgb(hex);
  if (!target) return '';

  let minDistance = Infinity;
  let closestName = 'Custom Shade';

  for (const item of STANDARD_PALETTE) {
    const itemRgb = hexToRgb(item.hex);
    if (!itemRgb) continue;

    const distance = Math.sqrt(
      Math.pow(target.r - itemRgb.r, 2) +
      Math.pow(target.g - itemRgb.g, 2) +
      Math.pow(target.b - itemRgb.b, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestName = item.name;
    }
  }

  return closestName;
}

export default function ColorMasterModal({ onClose, onSuccess }: ColorMasterModalProps) {
  const [colors, setColors] = useState<ColorRecord[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form State
  const [colorCode, setColorCode] = useState<string>('');
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [name, setName] = useState<string>('Royal Purple');
  const [hexCode, setHexCode] = useState<string>('#6d4aff');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [editingMode, setEditingMode] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadColors = async () => {
    setLoadingList(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('colours')
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
      console.error('Error fetching colours:', err);
      setFetchError(err.message || 'Failed to load colours.');
    } finally {
      setLoadingList(false);
    }
  };

  const generateColorCode = async () => {
    try {
      const { data } = await supabase
        .from('colours')
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

  const handleHexChange = (newHex: string) => {
    setHexCode(newHex);
    const detectedName = getNearestColorName(newHex);
    if (detectedName) {
      setName(detectedName);
    }
  };

  const resetForm = () => {
    setEditingMode(false);
    setOriginalId(null);
    setHexCode('#6d4aff');
    setName('Royal Purple');
    setDisplayOrder(colors.length > 0 ? colors.length + 1 : 1);
    setIsActive(true);
    generateColorCode();
  };

  const handleSelectCard = (color: ColorRecord) => {
    setEditingMode(true);
    setOriginalId(color.id);
    setColorCode(color.id);
    setName(color.name);
    setHexCode(color.hex_code || '#6d4aff');
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
    if (!window.confirm(`Are you sure you want to delete color "${colorName}" (${id})?`)) return;

    try {
      const { error } = await supabase.from('colours').delete().eq('id', id);
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
      setErrorMsg('Color ID cannot be empty.');
      setSubmitting(false);
      return;
    }

    try {
      if (editingMode && originalId) {
        if (targetId !== originalId) {
          const { data: exists } = await supabase.from('colours').select('id').eq('id', targetId).maybeSingle();
          if (exists) {
            throw new Error(`Color ID "${targetId}" already exists.`);
          }

          const { error: insertErr } = await supabase.from('colours').insert([{
            id: targetId,
            name: name.trim(),
            hex_code: hexCode.trim(),
            display_order: Number(displayOrder) || 0,
            active: isActive,
            created_at: new Date().toISOString()
          }]);
          if (insertErr) throw insertErr;

          await supabase.from('colours').delete().eq('id', originalId);
        } else {
          const { error: updateErr } = await supabase
            .from('colours')
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
        const { error: insertErr } = await supabase.from('colours').insert([{
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
      setErrorMsg(err.message || 'Failed to save color.');
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
                Compact color swatch matrix with automatic shade detection
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
          
          {/* LEFT PANE: COMPACT COLOR SWATCH CARDS (7 COLS) */}
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

            {/* COMPACT CARDS GRID (NO LARGE PHOTO PLACEHOLDER) */}
            <div className="flex-1 overflow-y-auto max-h-[58vh] pr-1.5 custom-scrollbar">
              {loadingList ? (
                <div className="flex items-center justify-center p-12 text-[#8b9bb4]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00d9ff] mr-2" /> Loading colors...
                </div>
              ) : colors.length === 0 ? (
                <div className="p-8 text-center text-[#8b9bb4] border border-dashed border-white/10 rounded-2xl">
                  No colors registered yet. Create one using the form.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {colors.map((c) => {
                    const isSelected = editingMode && originalId === c.id;
                    const isLocked = isColSeries(c.id);

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCard(c)}
                        className={`group p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative min-h-[92px] ${
                          isSelected
                            ? 'bg-[#6d4aff]/25 border-[#6d4aff] shadow-lg shadow-[#6d4aff]/30 scale-[1.02]'
                            : 'bg-[#0a0e17]/80 border-white/10 hover:border-[#00d9ff]/50 hover:bg-[#151c33]/80'
                        }`}
                      >
                        {/* Top Row: Swatch Circle + Badges & Delete */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Visual Color Pill / Circle */}
                            <div
                              className="w-7 h-7 rounded-xl border border-white/20 shrink-0 shadow-md flex items-center justify-center transition-transform group-hover:scale-105"
                              style={{ backgroundColor: c.hex_code || '#6d4aff' }}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-mono text-[8.5px] text-[#8b9bb4]">
                                #{c.display_order ?? 0}
                              </span>
                              <span className="font-mono text-[9px] text-[#00d9ff] uppercase font-bold tracking-tight">
                                {c.hex_code || '#------'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteColor(e, c.id, c.name)}
                            className="p-1 rounded-lg bg-white/5 hover:bg-[#ff6b6b] text-[#8b9bb4] hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Delete Color"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Middle: Color Name */}
                        <div className="my-1">
                          <h3 className="font-bold text-white text-[12px] truncate w-full" title={c.name}>
                            {c.name}
                          </h3>
                        </div>

                        {/* Bottom Row: ID Badge & Active Pill */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className={`font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded border tracking-wider flex items-center gap-1 ${
                            isLocked
                              ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/30'
                              : 'bg-[#ffa500]/15 text-[#ffa500] border-[#ffa500]/40'
                          }`}>
                            {isLocked && <Lock className="w-2.5 h-2.5" />}
                            {c.id}
                          </span>

                          <span className={`text-[8.5px] font-mono ${c.active ? 'text-[#00ff9d]' : 'text-[#ff6b6b]'}`}>
                            ● {c.active ? 'Active' : 'Disabled'}
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

              {/* HEX Code Picker & Live Detection */}
              <div className="p-3 bg-[#101628] rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1">
                    <Palette className="w-3 h-3" /> Color Picker & HEX
                  </span>
                  <span className="text-[8.5px] font-mono text-[#00ff9d] flex items-center gap-1">
                    <Wand2 className="w-2.5 h-2.5" /> Auto Identify Active
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/20 shrink-0 shadow-md">
                    <input
                      type="color"
                      value={hexCode.startsWith('#') ? hexCode : `#${hexCode}`}
                      onChange={(e) => handleHexChange(e.target.value)}
                      className="absolute -inset-2 w-16 h-16 cursor-pointer"
                    />
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-mono text-[#8b9bb4] block">HEX CODE</label>
                    <input
                      type="text"
                      required
                      value={hexCode}
                      onChange={(e) => handleHexChange(e.target.value)}
                      placeholder="#6d4aff"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-white/10 bg-[#0a0e17] font-mono font-bold text-white text-[11px] outline-none focus:border-[#00d9ff]"
                    />
                  </div>
                </div>
              </div>

              {/* Color Name */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>Color Name (Auto Identified) *</span>
                  <span className="text-[8.5px] text-[#00d9ff] font-mono">EDITABLE</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Royal Blue / Maroon / Rani Pink"
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#101628] font-semibold text-white outline-none focus:border-[#00d9ff] transition-colors placeholder:text-slate-600"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Wand2 className="w-3.5 h-3.5 text-[#00d9ff]" />
                  </div>
                </div>
              </div>

              {/* Order Index & Status */}
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