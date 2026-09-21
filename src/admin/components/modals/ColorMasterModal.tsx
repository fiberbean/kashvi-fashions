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
  Layers,
  ArrowRight
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

// Global Apparel & Textile Shade Library Palette
const APPAREL_SHADE_DICTIONARY: { [base: string]: { name: string; hex: string }[] } = {
  green: [
    { name: 'Bottle Green', hex: '#004225' },
    { name: 'Dark Green', hex: '#006400' },
    { name: 'Forest Green', hex: '#228B22' },
    { name: 'Emerald Green', hex: '#50C878' },
    { name: 'Olive Green', hex: '#808000' },
    { name: 'Mint Green', hex: '#98FF98' },
    { name: 'Sage Green', hex: '#9DC183' },
    { name: 'Pista Green', hex: '#93C572' },
    { name: 'Sea Green', hex: '#2E8B57' },
    { name: 'Lime Green', hex: '#32CD32' },
    { name: 'Army Green', hex: '#4B5320' },
    { name: 'Teal Green', hex: '#00827F' },
    { name: 'Mehendi Green', hex: '#556B2F' },
    { name: 'Parrot Green', hex: '#44D62C' },
    { name: 'Moss Green', hex: '#8A9A5B' },
    { name: 'Pastel Green', hex: '#77DD77' }
  ],
  pink: [
    { name: 'Rani Pink', hex: '#E30B5C' },
    { name: 'Baby Pink', hex: '#F4C2C2' },
    { name: 'Rose Pink', hex: '#FF66CC' },
    { name: 'Dusty Pink', hex: '#DCAE96' },
    { name: 'Hot Pink', hex: '#FF69B4' },
    { name: 'Blush Pink', hex: '#FE828C' },
    { name: 'Magenta Pink', hex: '#CC338B' },
    { name: 'Pastel Pink', hex: '#FFD1DC' },
    { name: 'Onion Pink', hex: '#C48793' },
    { name: 'Coral Pink', hex: '#F88379' },
    { name: 'Deep Pink', hex: '#FF1493' },
    { name: 'Flamingo Pink', hex: '#FC8EAC' }
  ],
  blue: [
    { name: 'Navy Blue', hex: '#000080' },
    { name: 'Royal Blue', hex: '#4169E1' },
    { name: 'Sky Blue', hex: '#87CEEB' },
    { name: 'Aqua Blue', hex: '#00FFFF' },
    { name: 'Turquoise Blue', hex: '#40E0D0' },
    { name: 'Midnight Blue', hex: '#191970' },
    { name: 'Powder Blue', hex: '#B0E0E6' },
    { name: 'Indigo Blue', hex: '#4B0082' },
    { name: 'Teal Blue', hex: '#008080' },
    { name: 'Ice Blue', hex: '#AFEEEE' },
    { name: 'Denim Blue', hex: '#1560BD' },
    { name: 'Cyan Blue', hex: '#00B7EB' }
  ],
  yellow: [
    { name: 'Mustard Yellow', hex: '#E1AD01' },
    { name: 'Lemon Yellow', hex: '#FFF44F' },
    { name: 'Golden Yellow', hex: '#FFDF00' },
    { name: 'Haldi Yellow', hex: '#EAA221' },
    { name: 'Pastel Yellow', hex: '#FFFFE0' },
    { name: 'Amber Yellow', hex: '#FFBF00' },
    { name: 'Bright Yellow', hex: '#FFFF00' },
    { name: 'Mango Yellow', hex: '#FF8243' }
  ],
  red: [
    { name: 'Crimson Red', hex: '#DC143C' },
    { name: 'Maroon Red', hex: '#800000' },
    { name: 'Rusty Red', hex: '#B7410E' },
    { name: 'Wine Red', hex: '#722F37' },
    { name: 'Cherry Red', hex: '#D2042D' },
    { name: 'Scarlet Red', hex: '#FF2400' },
    { name: 'Ruby Red', hex: '#E0115F' },
    { name: 'Brick Red', hex: '#CB4154' },
    { name: 'Coral Red', hex: '#FF4040' },
    { name: 'Blood Red', hex: '#660000' }
  ],
  orange: [
    { name: 'Peach', hex: '#FFE5B4' },
    { name: 'Rust Orange', hex: '#C45214' },
    { name: 'Tangerine Orange', hex: '#F28500' },
    { name: 'Coral Orange', hex: '#FF7F50' },
    { name: 'Apricot', hex: '#FBCEB1' },
    { name: 'Burnt Orange', hex: '#CC5500' },
    { name: 'Carrot Orange', hex: '#ED9121' }
  ],
  purple: [
    { name: 'Lavender', hex: '#E6E6FA' },
    { name: 'Violet', hex: '#8F00FF' },
    { name: 'Plum Purple', hex: '#8E4585' },
    { name: 'Mauve', hex: '#E0B0FF' },
    { name: 'Grape Purple', hex: '#6F2DA8' },
    { name: 'Lilac', hex: '#C8A2C8' },
    { name: 'Aubergine', hex: '#3B0910' }
  ],
  white: [
    { name: 'Pure White', hex: '#FFFFFF' },
    { name: 'Off White', hex: '#FAF9F6' },
    { name: 'Ivory White', hex: '#FFFFF0' },
    { name: 'Cream White', hex: '#FFFDD0' },
    { name: 'Milky White', hex: '#F8F9FA' }
  ],
  black: [
    { name: 'Pure Black', hex: '#000000' },
    { name: 'Jet Black', hex: '#0A0A0A' },
    { name: 'Charcoal Black', hex: '#36454F' },
    { name: 'Matte Black', hex: '#28282B' }
  ],
  grey: [
    { name: 'Steel Grey', hex: '#71797E' },
    { name: 'Silver Grey', hex: '#C0C0C0' },
    { name: 'Slate Grey', hex: '#708090' },
    { name: 'Ash Grey', hex: '#B2BEB5' },
    { name: 'Dark Grey', hex: '#5A5A5A' },
    { name: 'Light Grey', hex: '#D3D3D3' }
  ],
  brown: [
    { name: 'Tan Brown', hex: '#D2B48C' },
    { name: 'Chocolate Brown', hex: '#7B3F00' },
    { name: 'Beige', hex: '#F5F5DC' },
    { name: 'Coffee Brown', hex: '#4B3621' },
    { name: 'Khaki', hex: '#C3B091' },
    { name: 'Mocha', hex: '#967969' }
  ]
};

export default function ColorMasterModal({ onClose, onSuccess }: ColorMasterModalProps) {
  const [savedColours, setSavedColours] = useState<ColourRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Search input: e.g. "Green", "Pink", "Blue", etc.
  const [colorInputText, setColorInputText] = useState<string>('Green');

  // Custom Shade creator inside the active family
  const [customShadeName, setCustomShadeName] = useState<string>('');
  const [customHexCode, setCustomHexCode] = useState<string>('#50C878');

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

  // Map of saved shades by normalized lowercase name for instant lookup
  const savedColorMap = useMemo(() => {
    const map = new Map<string, ColourRecord>();
    savedColours.forEach((c) => {
      map.set(c.name.toLowerCase().trim(), c);
    });
    return map;
  }, [savedColours]);

  // Determine current active base family
  const activeBaseFamily = useMemo(() => {
    const clean = colorInputText.toLowerCase().trim();
    if (!clean) return 'green';
    const matchedKey = Object.keys(APPAREL_SHADE_DICTIONARY).find((k) => clean.includes(k));
    return matchedKey || clean;
  }, [colorInputText]);

  // Generate the full shade card list for current family:
  // Combines (1) Textile shade palette + (2) User-saved shades that match this family
  const currentFamilyCards = useMemo(() => {
    const baseClean = activeBaseFamily.toLowerCase().trim();
    const presetShades = APPAREL_SHADE_DICTIONARY[baseClean] || [];

    const map = new Map<string, { name: string; hex: string; isCustom?: boolean }>();

    // 1. Add palette shades
    presetShades.forEach((ps) => {
      map.set(ps.name.toLowerCase().trim(), { name: ps.name, hex: ps.hex });
    });

    // 2. Also check DB saved items belonging to this base_color OR containing the family name
    savedColours.forEach((sc) => {
      const scName = sc.name.toLowerCase().trim();
      const scBase = (sc.base_color || '').toLowerCase().trim();
      if (scBase === baseClean || scName.includes(baseClean)) {
        if (!map.has(scName)) {
          map.set(scName, { name: sc.name, hex: sc.hex_code || '#6d4aff', isCustom: true });
        }
      }
    });

    // If typing custom search that doesn't match base, filter across dictionary
    if (map.size === 0 && colorInputText.trim()) {
      const q = colorInputText.toLowerCase().trim();
      Object.values(APPAREL_SHADE_DICTIONARY).forEach((list) => {
        list.forEach((it) => {
          if (it.name.toLowerCase().includes(q)) {
            map.set(it.name.toLowerCase().trim(), it);
          }
        });
      });
    }

    return Array.from(map.values());
  }, [activeBaseFamily, colorInputText, savedColours]);

  // Generate Next Auto Color ID
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

  // Click card to Save (if not saved) or Delete (if saved)
  const handleToggleShadeCard = async (shade: { name: string; hex: string }) => {
    const cleanName = shade.name.trim();
    const existing = savedColorMap.get(cleanName.toLowerCase());

    setActionLoadingId(cleanName);
    try {
      if (existing) {
        // Unsave from database
        const { error } = await supabase.from('colours').delete().eq('id', existing.id);
        if (error) throw error;
        setSavedColours((prev) => prev.filter((c) => c.id !== existing.id));
      } else {
        // Save to database
        const nextId = await getNextColorId();
        const newRecord: ColourRecord = {
          id: nextId,
          name: cleanName,
          hex_code: shade.hex,
          base_color: activeBaseFamily,
          active: true,
          display_order: savedColours.length + 1
        };

        const { error } = await supabase.from('colours').insert([newRecord]);
        if (error) throw error;
        setSavedColours((prev) => [...prev, newRecord]);
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Error updating shade: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Add Custom User-defined Shade to the active family
  const handleAddCustomShade = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customShadeName.trim();
    if (!clean) {
      alert('Please enter a shade name.');
      return;
    }

    if (savedColorMap.has(clean.toLowerCase())) {
      alert(`Shade "${clean}" is already saved.`);
      return;
    }

    setActionLoadingId('custom_add');
    try {
      const nextId = await getNextColorId();
      const newRecord: ColourRecord = {
        id: nextId,
        name: clean,
        hex_code: customHexCode,
        base_color: activeBaseFamily || 'general',
        active: true,
        display_order: savedColours.length + 1
      };

      const { error } = await supabase.from('colours').insert([newRecord]);
      if (error) throw error;

      setSavedColours((prev) => [...prev, newRecord]);
      setCustomShadeName('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Error adding shade: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete directly from all saved registry
  const handleDeleteDirect = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete shade "${name}"?`)) return;

    try {
      const { error } = await supabase.from('colours').delete().eq('id', id);
      if (error) throw error;
      setSavedColours((prev) => prev.filter((c) => c.id !== id));
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] p-3 sm:p-5 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-[#101628] border border-white/20 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#0a0e17] sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6d4aff] to-[#ff6b6b] text-white flex items-center justify-center shadow-md shadow-[#6d4aff]/30">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Colour & Shades Master Registry</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/30 text-[9.5px] font-mono">
                  {savedColours.length} Saved in DB
                </span>
              </h3>
              <span className="text-[10.5px] text-[#8b9bb4]">
                Type a base color to generate and save shades with exact hex codes
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar text-xs">
          
          {/* 1. Base Color Input + Family Pills */}
          <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10.5px] font-mono font-bold text-[#00d9ff] uppercase flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> 1. Select or Enter Base Color Family
              </span>
              <span className="text-[10px] text-[#8b9bb4]">
                Active Family: <strong className="text-white capitalize">{activeBaseFamily}</strong> ({currentFamilyCards.length} shades ready)
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Type base color (e.g. Green, Pink, Blue, Yellow, Red, Maroon, White)..."
                value={colorInputText}
                onChange={(e) => setColorInputText(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#101628] border border-white/20 text-white font-semibold text-xs outline-none focus:border-[#00d9ff]"
              />
              <Palette className="w-4 h-4 text-[#8b9bb4] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Quick Family Shortcuts */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.keys(APPAREL_SHADE_DICTIONARY).map((fam) => {
                const isActive = activeBaseFamily === fam;
                return (
                  <button
                    key={fam}
                    type="button"
                    onClick={() => {
                      setColorInputText(fam.charAt(0).toUpperCase() + fam.slice(1));
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

          {/* 2. MINI CARDS: SHADES PREVIEW & VISUAL STATES */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-white uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00ff9d]" /> 
                2. Shades for &quot;{activeBaseFamily.toUpperCase()}&quot; — Click Card to Save / Remove
              </span>
              <span className="text-[10px] text-[#8b9bb4]">
                <strong className="text-[#00ff9d]">Green Border (SAVED)</strong> = Stored in DB • <strong className="text-white">Dark Card (+ SAVE)</strong> = Click to Store
              </span>
            </div>

            {currentFamilyCards.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#0a0e17] border border-dashed border-white/10 text-center text-[#8b9bb4] italic text-xs space-y-1">
                <p>No presets found for &quot;{colorInputText}&quot;.</p>
                <p className="text-[10px] text-white/40">You can type a new shade name and hex code below to add it.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {currentFamilyCards.map((shade) => {
                  const isSaved = savedColorMap.has(shade.name.toLowerCase().trim());
                  const isLoading = actionLoadingId === shade.name.trim();

                  return (
                    <div
                      key={shade.name}
                      onClick={() => !isLoading && handleToggleShadeCard(shade)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                        isSaved
                          ? 'bg-[#00ff9d]/10 border-[#00ff9d] shadow-[0_0_15px_rgba(0,255,157,0.15)] ring-1 ring-[#00ff9d]/40'
                          : 'bg-[#0a0e17] border-white/10 hover:border-white/30 hover:bg-[#101628]'
                      }`}
                    >
                      {/* Top: Swatch & Status Badge */}
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <div
                          className="w-7 h-7 rounded-xl border border-white/20 shadow-inner shrink-0"
                          style={{ backgroundColor: shade.hex }}
                        />
                        {isSaved ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] text-[9px] font-mono font-extrabold border border-[#00ff9d]/40">
                            <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
                            <span>SAVED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/5 text-[#8b9bb4] group-hover:text-white text-[9px] font-mono border border-white/10">
                            <Plus className="w-2.5 h-2.5" />
                            <span>SAVE</span>
                          </span>
                        )}
                      </div>

                      {/* Bottom: Title & Hex */}
                      <div>
                        <span className="font-bold text-white text-xs block truncate" title={shade.name}>
                          {shade.name}
                        </span>
                        <span className="font-mono text-[10px] text-[#8b9bb4] block uppercase">
                          {shade.hex}
                        </span>
                      </div>

                      {/* Loading spinner */}
                      {isLoading && (
                        <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center backdrop-blur-xs">
                          <Loader2 className="w-4 h-4 animate-spin text-[#00d9ff]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. ADD CUSTOM SHADE FORM */}
          <form onSubmit={handleAddCustomShade} className="p-3 rounded-2xl bg-[#0a0e17] border border-white/10 space-y-2">
            <span className="text-[10px] font-mono font-bold text-[#8b9bb4] uppercase block">
              3. Need Another Specific Shade? Add Custom Shade
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder={`Custom shade name (e.g. Pistachio ${activeBaseFamily}, Pastel ${activeBaseFamily})...`}
                value={customShadeName}
                onChange={(e) => setCustomShadeName(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl bg-[#101628] border border-white/15 text-white text-xs outline-none focus:border-[#00d9ff]"
              />

              <div className="flex items-center gap-1.5 bg-[#101628] px-2 py-1 rounded-xl border border-white/15">
                <input
                  type="color"
                  value={customHexCode}
                  onChange={(e) => setCustomHexCode(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <input
                  type="text"
                  value={customHexCode}
                  onChange={(e) => setCustomHexCode(e.target.value)}
                  className="w-16 text-white font-mono text-[11px] outline-none uppercase bg-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoadingId === 'custom_add'}
                className="px-4 py-1.5 rounded-xl bg-[#6d4aff] hover:bg-[#5b3adb] text-white font-bold text-xs flex items-center gap-1 cursor-pointer active:scale-95 shadow"
              >
                {actionLoadingId === 'custom_add' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
                <span>Save Shade</span>
              </button>
            </div>
          </form>

          {/* 4. CURRENTLY SAVED REGISTRY IN DATABASE */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-white uppercase flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00d9ff]" />
                Registered Shades in Database ({savedColours.length})
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
                  No shades saved in database yet. Click on any shade card above to save it.
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
                      <span className="font-mono text-[9px] text-[#00ff9d]">[{sc.id}]</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteDirect(sc.id, sc.name)}
                        className="text-[#8b9bb4] hover:text-[#ff6b6b] ml-1 cursor-pointer"
                        title="Delete from DB"
                      >
                        <Trash2 className="w-3 h-3" />
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