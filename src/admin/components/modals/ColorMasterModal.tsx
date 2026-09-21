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

function getContrastTextColor(hexColor: string | null | undefined): string {
  if (!hexColor) return '#FFFFFF';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#0B0F19' : '#FFFFFF';
}

export default function ColorMasterModal({ onClose, onSuccess }: ColorMasterModalProps) {
  const [colours, setColours] = useState<ColourRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('Green');
  const [selectedBaseFamily, setSelectedBaseFamily] = useState<string>('green');

  const [customName, setCustomName] = useState<string>('');
  const [customHex, setCustomHex] = useState<string>('#50C878');

  const loadColoursFromDB = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('colours')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setColours(data || []);
    } catch (err: any) {
      console.error('Failed to load colours from database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadColoursFromDB();
  }, []);

  // Base colors sorted alphabetically A to Z
  const baseFamilies = useMemo(() => {
    const set = new Set<string>();
    colours.forEach((c) => {
      if (c.base_color && c.base_color.trim()) {
        set.add(c.base_color.trim().toLowerCase());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [colours]);

  useEffect(() => {
    const clean = searchTerm.toLowerCase().trim();
    if (!clean) return;
    const match = baseFamilies.find((f) => clean.includes(f));
    if (match) {
      setSelectedBaseFamily(match);
    } else {
      setSelectedBaseFamily(clean);
    }
  }, [searchTerm, baseFamilies]);

  // Shades strictly filtered and sorted alphabetically A to Z
  const currentFamilyShades = useMemo(() => {
    const fam = selectedBaseFamily.toLowerCase().trim();
    if (!fam) return [];

    const list = colours.filter((c) => {
      const cBase = (c.base_color || '').toLowerCase().trim();
      const cName = c.name.toLowerCase().trim();
      return cBase === fam || cName.includes(fam);
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [colours, selectedBaseFamily]);

  const handleToggleCardSelection = async (shade: ColourRecord) => {
    const nextActive = !Boolean(shade.active);
    setActionLoadingId(shade.id);

    try {
      const { error } = await supabase
        .from('colours')
        .update({ active: nextActive })
        .eq('id', shade.id);

      if (error) throw error;

      setColours((prev) =>
        prev.map((c) => (c.id === shade.id ? { ...c, active: nextActive } : c))
      );

      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Error updating shade selection: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddNewShade = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = customName.trim();
    if (!cleanName) {
      alert('Please enter a shade name.');
      return;
    }

    if (colours.some((c) => c.name.toLowerCase().trim() === cleanName.toLowerCase())) {
      alert(`Shade "${cleanName}" already exists in Database.`);
      return;
    }

    setActionLoadingId('new_add');
    try {
      const { data: lastRecord } = await supabase
        .from('colours')
        .select('id')
        .like('id', 'COL%')
        .order('id', { ascending: false })
        .limit(1);

      let nextId = 'COL0001';
      if (lastRecord && lastRecord.length > 0) {
        const match = lastRecord[0].id.match(/\d+$/);
        const nextNum = match ? parseInt(match[0], 10) + 1 : 1;
        nextId = `COL${String(nextNum).padStart(4, '0')}`;
      }

      const newRecord: ColourRecord = {
        id: nextId,
        name: cleanName,
        hex_code: customHex,
        base_color: selectedBaseFamily || 'general',
        active: true,
        display_order: colours.length + 1
      };

      const { error } = await supabase.from('colours').insert([newRecord]);
      if (error) throw error;

      setColours((prev) => [...prev, newRecord]);
      setCustomName('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Error adding shade: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeFamilyCount = useMemo(() => {
    return currentFamilyShades.filter((c) => Boolean(c.active)).length;
  }, [currentFamilyShades]);

  return (
    <div className="fixed inset-0 z-[100000] pt-[76px] pb-6 px-3 sm:px-6 flex items-start justify-center bg-black/85 backdrop-blur-md overflow-y-auto select-none">
      <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-4xl w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[calc(100vh-100px)] flex flex-col my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6d4aff] to-[#ff6b6b] text-white flex items-center justify-center shadow-md shadow-[#6d4aff]/30">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Colour & Shades Master Registry</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FF69B4]/20 text-[#FF69B4] border border-[#FF69B4]/40 text-[9.5px] font-mono font-bold">
                  {activeFamilyCount} Selected for {selectedBaseFamily}
                </span>
              </h3>
              <span className="text-[10.5px] text-[#8b9bb4]">
                Alphabetically sorted shades • Click any shade card to Select / Unselect
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar text-xs p-1">
          
          {/* Base Color Search */}
          <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10.5px] font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> 1. Select Base Color Family (A-Z)
              </span>
              <span className="text-[10px] text-[#8b9bb4]">
                Active Family: <strong className="text-white capitalize">{selectedBaseFamily}</strong> ({currentFamilyShades.length} shades in DB)
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Type base color (e.g. Green, Pink, Blue, Yellow, Red)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#101628] border border-white/20 text-white font-semibold text-xs outline-none focus:border-[#00d9ff]"
              />
              <Palette className="w-4 h-4 text-[#8b9bb4] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Base Color Family Pills (A-Z) */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {baseFamilies.map((fam) => {
                const isActive = selectedBaseFamily === fam;
                return (
                  <button
                    key={fam}
                    type="button"
                    onClick={() => {
                      setSelectedBaseFamily(fam);
                      setSearchTerm(fam.charAt(0).toUpperCase() + fam.slice(1));
                    }}
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
          </div>

          {/* COLOR CARDS (ALPHABETICAL ORDER A-Z) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs sticky top-0 bg-[#101628] py-1 z-10">
              <span className="font-mono font-bold text-white uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF69B4]" /> 
                2. Shades for &quot;{selectedBaseFamily.toUpperCase()}&quot; (Alphabetical Order A-Z)
              </span>
              <span className="text-[10px] text-[#8b9bb4] flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-[#FFB6C1] bg-[#FFB6C1]" />
                  <strong className="text-[#FF69B4]">Baby Pink Border = SELECTED</strong>
                </span>
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-[#8b9bb4]">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff] mb-1.5" />
                Loading shades...
              </div>
            ) : currentFamilyShades.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#0a0e17] border border-dashed border-white/10 text-center text-[#8b9bb4] italic text-xs space-y-1">
                <p>No shades found in Database for &quot;{selectedBaseFamily}&quot;.</p>
                <p className="text-[10px] text-white/40">Use the form below to add a custom shade.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {currentFamilyShades.map((shade) => {
                  const isLoading = actionLoadingId === shade.id;
                  const isPicked = Boolean(shade.active);
                  const cardBg = shade.hex_code || '#006400';
                  const textColor = getContrastTextColor(cardBg);

                  return (
                    <div
                      key={shade.id}
                      onClick={() => !isLoading && handleToggleCardSelection(shade)}
                      style={{ backgroundColor: cardBg }}
                      className={`p-3 rounded-2xl transition-all duration-150 cursor-pointer relative group flex flex-col justify-between min-h-[92px] ${
                        isPicked
                          ? 'border-4 border-[#FFB6C1] shadow-[0_0_22px_rgba(255,182,193,0.95)] ring-2 ring-[#FF69B4] scale-[1.02] z-10'
                          : 'border-2 border-black/25 opacity-75 hover:opacity-100 hover:border-white/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-2">
                        {isPicked ? (
                          <span
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.65)',
                              color: '#FFB6C1'
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold border border-[#FFB6C1]/50 backdrop-blur-xs shadow"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 stroke-[3] text-[#FF69B4]" />
                            <span>SELECTED</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              backgroundColor: textColor === '#FFFFFF' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.65)',
                              color: textColor
                            }}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold backdrop-blur-xs border border-white/20"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>SELECT</span>
                          </span>
                        )}

                        {isPicked && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#FF69B4] text-neutral-950 text-[8px] font-mono font-black uppercase tracking-wider shadow">
                            PICKED
                          </span>
                        )}
                      </div>

                      <div>
                        <span
                          style={{ color: textColor }}
                          className="font-extrabold text-xs block truncate drop-shadow-sm"
                          title={shade.name}
                        >
                          {shade.name}
                        </span>
                        <div
                          style={{ color: textColor, opacity: 0.85 }}
                          className="flex items-center justify-between text-[9.5px] font-mono font-bold pt-0.5"
                        >
                          <span className="uppercase">{shade.hex_code || '—'}</span>
                          <span className="text-[8.5px] opacity-75">[{shade.id}]</span>
                        </div>
                      </div>

                      {isLoading && (
                        <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center backdrop-blur-xs">
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Custom Shade */}
          <form onSubmit={handleAddNewShade} className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10 space-y-2">
            <span className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase block">
              3. Need Another Specific Shade? Insert for &quot;{selectedBaseFamily}&quot;
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder={`New shade name (e.g. Pistachio ${selectedBaseFamily})...`}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl bg-[#101628] border border-white/15 text-white text-xs outline-none focus:border-[#00d9ff]"
              />

              <div className="flex items-center gap-1.5 bg-[#101628] px-2 py-1 rounded-xl border border-white/15">
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <input
                  type="text"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="w-16 text-white font-mono text-[11px] outline-none uppercase bg-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoadingId === 'new_add'}
                className="px-4 py-1.5 rounded-xl bg-[#6d4aff] hover:bg-[#5b3adb] text-white font-bold text-xs flex items-center gap-1 cursor-pointer active:scale-95 shadow disabled:opacity-50"
              >
                {actionLoadingId === 'new_add' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
                <span>Insert Shade</span>
              </button>
            </div>
          </form>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 bg-[#101628] flex justify-end shrink-0">
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