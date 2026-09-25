import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Upload,
  Save,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  Link2,
  CheckCircle2,
  Trash2,
  Edit2,
  Building2,
  Tag,
  Eye,
  Sliders,
  Layers,
  Ruler,
  Plus
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { optimizeAndUploadToR2, deleteFromR2 } from '../../utils/imageOptimizer';

export type BillboardSlot = 'main_spotlight' | 'right_top' | 'right_bottom';

export interface BannerRecord {
  id?: string;
  banner_type?: 'fashions' | 'jewellery' | string;
  placement?: BillboardSlot | string;
  title?: string;
  subtitle?: string;
  image_url?: string;
  link_url?: string;
  redirect_link?: string;
  display_order?: number;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BannerClicksModalProps {
  isOpen?: boolean;
  onClose: () => void;
  initialBanner?: BannerRecord | null;
  onSuccess?: () => void;
}

export function BannerClicksModal({
  isOpen = true,
  onClose,
  initialBanner,
  onSuccess
}: BannerClicksModalProps) {
  if (isOpen === false) return null;

  const [activeEditingId, setActiveEditingId] = useState<string | null>(initialBanner?.id || null);

  const [department, setDepartment] = useState<'fashions' | 'jewellery'>('fashions');
  const [slot, setSlot] = useState<BillboardSlot>('main_spotlight');
  const [bannerCode, setBannerCode] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [targetType, setTargetType] = useState<'category' | 'product' | 'external' | 'none'>('category');
  const [targetValue, setTargetValue] = useState<string>('');
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [active, setActive] = useState<boolean>(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string>('');

  const [slotBanners, setSlotBanners] = useState<BannerRecord[]>([]);
  const [loadingSlotData, setLoadingSlotData] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch banners for current slot
  const fetchSlotBanners = async () => {
    setLoadingSlotData(true);
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('banner_type', department)
        .eq('placement', slot)
        .order('display_order', { ascending: true });

      if (error) throw error;
      if (data) {
        setSlotBanners(data);
      }
    } catch (err) {
      console.error('Failed to load billboard slot banners:', err);
    } finally {
      setLoadingSlotData(false);
    }
  };

  useEffect(() => {
    fetchSlotBanners();
  }, [department, slot]);

  // Handle Edit selection
  const handleSelectBannerForEdit = (banner: BannerRecord) => {
    setActiveEditingId(banner.id || null);
    setTitle(banner.title || '');
    setSubtitle(banner.subtitle || '');
    setImageUrl(banner.image_url || '');
    setPreviewBlobUrl(banner.image_url || '');

    const link = banner.redirect_link || banner.link_url || '';
    if (link.startsWith('http')) {
      setTargetType('external');
      setTargetValue(link);
    } else if (link.startsWith('/product/') || link.startsWith('KF') || link.startsWith('KJ')) {
      setTargetType('product');
      setTargetValue(link.replace('/product/', ''));
    } else if (link.startsWith('/category/') || link) {
      setTargetType('category');
      setTargetValue(link.replace('/category/', ''));
    } else {
      setTargetType('none');
      setTargetValue('');
    }

    setDisplayOrder(banner.display_order ?? 1);
    setActive(banner.active ?? true);
    setSelectedFile(null);
  };

  // Reset form for next upload
  const handleResetToNew = () => {
    setActiveEditingId(null);
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setPreviewBlobUrl('');
    setTargetType('category');
    setTargetValue('');
    setDisplayOrder(slotBanners.length + 1);
    setActive(true);
    setSelectedFile(null);
    setErrorMsg(null);
  };

  // Delete Banner without closing screen
  const handleDeleteBanner = async (banner: BannerRecord) => {
    if (!banner.id) return;
    const confirmDelete = window.confirm(`"${banner.title || 'Pure Poster Image'}" banner ni delete cheyala?`);
    if (!confirmDelete) return;

    setDeletingId(banner.id);
    try {
      if (banner.image_url && (banner.image_url.includes('kashvi-media') || banner.image_url.includes('r2.dev'))) {
        try {
          await deleteFromR2(banner.image_url);
        } catch (r2Err) {
          console.warn('R2 delete warning:', r2Err);
        }
      }

      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', banner.id);

      if (error) throw error;

      if (activeEditingId === banner.id) {
        handleResetToNew();
      }

      await fetchSlotBanners();
    } catch (err: any) {
      console.error('Delete banner error:', err);
      alert('Delete fail aindi: ' + (err.message || 'Error occurred'));
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (initialBanner) {
      handleSelectBannerForEdit(initialBanner);
    } else {
      const dPrefix = department === 'fashions' ? 'FSH' : 'JWL';
      const sPrefix = slot === 'main_spotlight' ? 'MAIN' : slot === 'right_top' ? 'RT' : 'RB';
      setBannerCode(`BNR-${dPrefix}-${sPrefix}`);
    }
  }, [initialBanner, department, slot]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewBlobUrl(localUrl);
    setErrorMsg(null);
  };

  const handleClearImage = async () => {
    if (imageUrl && (imageUrl.includes('kashvi-media') || imageUrl.includes('r2.dev'))) {
      try {
        await deleteFromR2(imageUrl);
      } catch (err) {
        console.error('R2 deletion error:', err);
      }
    }
    setSelectedFile(null);
    setPreviewBlobUrl('');
    setImageUrl('');
  };

  const handleSaveAndLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewBlobUrl && !imageUrl) {
      setErrorMsg('Banner graphic photo select cheyandi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    let finalUploadedUrl = imageUrl;

    try {
      if (selectedFile) {
        if (imageUrl && (imageUrl.includes('kashvi-media') || imageUrl.includes('r2.dev'))) {
          await deleteFromR2(imageUrl);
        }

        const dPrefix = department === 'fashions' ? 'FSH' : 'JWL';
        const sPrefix = slot === 'main_spotlight' ? 'MAIN' : slot === 'right_top' ? 'RT' : 'RB';
        const filePrefix = `BNR-${dPrefix}-${sPrefix}-${Date.now().toString().slice(-4)}`;

        const uploadResult = await optimizeAndUploadToR2(
          selectedFile,
          'banners',
          filePrefix,
          1
        );

        finalUploadedUrl = uploadResult.url;
      }

      let formattedLink = targetValue.trim();
      if (targetType === 'category' && formattedLink) {
        formattedLink = formattedLink.startsWith('/') ? formattedLink : `/category/${formattedLink}`;
      } else if (targetType === 'product' && formattedLink) {
        formattedLink = formattedLink.startsWith('/') ? formattedLink : `/product/${formattedLink}`;
      } else if (targetType === 'none') {
        formattedLink = '';
      }

      const payload: any = {
        title: title.trim() || null,
        subtitle: subtitle.trim() || null,
        image_url: finalUploadedUrl,
        link_url: formattedLink || null,
        redirect_link: formattedLink || null,
        display_order: Number(displayOrder) || 1,
        active: active,
        banner_type: department,
        placement: slot,
        updated_at: new Date().toISOString()
      };

      if (activeEditingId) {
        const { error } = await supabase
          .from('banners')
          .update(payload)
          .eq('id', activeEditingId);
        if (error) throw error;
        alert('Billboard Banner update aindi!');
      } else {
        const { error } = await supabase
          .from('banners')
          .insert([
            {
              ...payload,
              created_at: new Date().toISOString()
            }
          ]);
        if (error) throw error;
        alert('Billboard Banner live publish aindi!');
      }

      // Live queue ni refresh chesi, screen close avvakunda form ni reset chestham
      await fetchSlotBanners();
      handleResetToNew();
    } catch (err: any) {
      console.error('Banner publish error:', err);
      setErrorMsg(err.message || 'Banner publish fail aindi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const slotInfo = useMemo(() => {
    switch (slot) {
      case 'main_spotlight':
        return {
          title: 'Left Spotlight Main Billboard (Multi-Scroll)',
          sub: 'Primary spotlight showcase hoarding with multi-slide carousel',
          aspect: 'aspect-[16/9] min-h-[220px]',
          recommendedSize: '1600 × 900 px',
          aspectRatioText: '16:9 Wide Landscape',
          recLimit: '< 150 KB WebP'
        };
      case 'right_top':
        return {
          title: 'Right Top Billboard Card',
          sub: 'Top secondary promotional spotlight card',
          aspect: 'aspect-[16/9] min-h-[140px]',
          recommendedSize: '960 × 540 px',
          aspectRatioText: '16:9 Landscape',
          recLimit: '< 120 KB WebP'
        };
      case 'right_bottom':
        return {
          title: 'Right Bottom Billboard Card',
          sub: 'Bottom secondary promotional spotlight card',
          aspect: 'aspect-[16/9] min-h-[140px]',
          recommendedSize: '960 × 540 px',
          aspectRatioText: '16:9 Landscape',
          recLimit: '< 120 KB WebP'
        };
    }
  }, [slot]);

  const frameAccent = department === 'fashions'
    ? {
        border: 'border-[#3b82f6]',
        glow: 'shadow-[0_0_15px_rgba(59,130,246,0.35)]',
        spotlight: 'from-cyan-400/20 via-blue-500/10 to-transparent',
        badge: 'bg-blue-500/20 text-[#00d9ff] border-blue-500/40'
      }
    : {
        border: 'border-[#eab308]',
        glow: 'shadow-[0_0_15px_rgba(234,179,8,0.35)]',
        spotlight: 'from-amber-300/25 via-yellow-500/10 to-transparent',
        badge: 'bg-amber-500/20 text-[#ffd700] border-amber-500/40'
      };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-2 sm:p-4 bg-[#0a0e17]/90 backdrop-blur-2xl select-none font-sans animate-in fade-in">
      <div className="bg-[#101628]/95 backdrop-blur-2xl rounded-3xl p-5 max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 space-y-4 text-xs relative custom-scrollbar">
        
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6d4aff] via-[#00d9ff] to-[#ff6b6b] rounded-t-3xl" />

        {/* Top Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3 sticky top-0 bg-[#101628]/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
              <ImageIcon className="w-4.5 h-4.5 text-[#00d9ff]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Spotlight Billboard Studio</span>
                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono uppercase ${frameAccent.badge}`}>
                  {department}
                </span>
                {activeEditingId && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono uppercase">
                    Editing Mode
                  </span>
                )}
              </h2>
              <span className="text-[10px] text-[#8b9bb4]">
                Storefront neon billboard map aadharamga slot select chesi banner live cheyandi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeEditingId && (
              <button
                type="button"
                onClick={handleResetToNew}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-[#00ff9d]" />
                <span>+ Add New Slide</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl border bg-[#ff6b6b]/10 border-[#ff6b6b]/30 text-[#ff6b6b] font-bold">
            {errorMsg}
          </div>
        )}

        {/* Department Switcher */}
        <div className="flex items-center justify-between p-2 bg-[#0a0e17]/80 rounded-2xl border border-white/10">
          <span className="text-[10.5px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider px-2">
            Target Store Section:
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDepartment('fashions');
                handleResetToNew();
              }}
              className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                department === 'fashions'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Fashions Storefront</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDepartment('jewellery');
                handleResetToNew();
              }}
              className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                department === 'jewellery'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-neutral-950 font-extrabold shadow-md shadow-yellow-500/30'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Jewellery Storefront</span>
            </button>
          </div>
        </div>

        {/* Blueprint Map + Editor Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT: EXACT STOREFRONT BILLBOARD BLUEPRINT MAP */}
          <div className="lg:col-span-6 bg-[#0a0e17]/95 p-4 rounded-3xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <span className="text-[10px] font-mono font-bold text-[#00d9ff] uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Storefront Neon Billboard Map
              </span>
              <span className="text-[9px] text-[#8b9bb4]">Click any billboard frame to select</span>
            </div>

            {/* Neon Spotlight Frame Layout */}
            <div className="p-3 bg-[#0c101c] rounded-2xl border border-white/10 space-y-2">
              
              <div className="grid grid-cols-6 gap-1 pb-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-6 rounded-md bg-white/5 border border-white/5 flex items-center justify-center text-[7px] text-[#8b9bb4]">
                    Cat {i}
                  </div>
                ))}
              </div>

              {/* Exact Billboard Layout */}
              <div className="grid grid-cols-12 gap-2.5">
                
                {/* 1. Main Large Spotlight Billboard (Col 7) */}
                <div
                  onClick={() => {
                    setSlot('main_spotlight');
                    handleResetToNew();
                  }}
                  className={`col-span-7 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden group p-2 flex flex-col justify-between ${
                    slot === 'main_spotlight'
                      ? `${frameAccent.border}${frameAccent.glow} bg-white/10`
                      : 'border-white/15 bg-white/5 hover:border-white/30'
                  }`}
                  style={{ minHeight: '190px' }}
                >
                  <div className="flex justify-center gap-2 mb-1">
                    <span className="w-2.5 h-1 rounded-full bg-white shadow-[0_0_6px_#fff]" />
                    <span className="w-2.5 h-1 rounded-full bg-white shadow-[0_0_6px_#fff]" />
                    <span className="w-2.5 h-1 rounded-full bg-white shadow-[0_0_6px_#fff]" />
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
                    <span className="text-[11px] font-extrabold text-white block">
                      1. Main Spotlight Billboard
                    </span>
                    <span className="text-[8px] font-mono text-[#00ff9d] mt-1 bg-black/60 px-1.5 py-0.5 rounded font-bold">
                      Multi-Scroll ({slotBanners.length} Slides)
                    </span>
                    
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 text-[#00d9ff] border border-blue-500/30 text-[8px] font-mono">
                      <Ruler className="w-2.5 h-2.5" />
                      <span>Best: 1600 × 900 px (16:9)</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[8px] text-[#8b9bb4] pt-1 border-t border-white/10">
                    <span className="font-mono text-[#00ff9d]">&lt; 150 KB WebP</span>
                    {slot === 'main_spotlight' && <span className="text-[#00ff9d] font-bold">Active Selection</span>}
                  </div>
                </div>

                {/* 2 & 3. Right Side Stacked Billboards (Col 5) */}
                <div className="col-span-5 flex flex-col gap-2">
                  
                  {/* Right Top */}
                  <div
                    onClick={() => {
                      setSlot('right_top');
                      handleResetToNew();
                    }}
                    className={`flex-1 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden p-2 flex flex-col justify-between ${
                      slot === 'right_top'
                        ? `${frameAccent.border}${frameAccent.glow} bg-white/10`
                        : 'border-white/15 bg-white/5 hover:border-white/30'
                    }`}
                    style={{ minHeight: '90px' }}
                  >
                    <div className="flex justify-center gap-1.5">
                      <span className="w-2 h-0.5 rounded-full bg-white shadow-[0_0_4px_#fff]" />
                      <span className="w-2 h-0.5 rounded-full bg-white shadow-[0_0_4px_#fff]" />
                    </div>

                    <div className="text-center">
                      <span className="text-[9.5px] font-bold text-white block">2. Right Top Card</span>
                      <span className="text-[7.5px] font-mono text-[#00d9ff] bg-black/50 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                        960 × 540 px (16:9)
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[7.5px]">
                      <span className="text-[#8b9bb4] font-mono">&lt; 120 KB</span>
                      {slot === 'right_top' && <span className="text-[#00ff9d] font-bold">Active</span>}
                    </div>
                  </div>

                  {/* Right Bottom */}
                  <div
                    onClick={() => {
                      setSlot('right_bottom');
                      handleResetToNew();
                    }}
                    className={`flex-1 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden p-2 flex flex-col justify-between ${
                      slot === 'right_bottom'
                        ? `${frameAccent.border}${frameAccent.glow} bg-white/10`
                        : 'border-white/15 bg-white/5 hover:border-white/30'
                    }`}
                    style={{ minHeight: '90px' }}
                  >
                    <div className="flex justify-center gap-1.5">
                      <span className="w-2 h-0.5 rounded-full bg-white shadow-[0_0_4px_#fff]" />
                      <span className="w-2 h-0.5 rounded-full bg-white shadow-[0_0_4px_#fff]" />
                    </div>

                    <div className="text-center">
                      <span className="text-[9.5px] font-bold text-white block">3. Right Bottom Card</span>
                      <span className="text-[7.5px] font-mono text-[#ff6b6b] bg-black/50 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                        960 × 540 px (16:9)
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[7.5px]">
                      <span className="text-[#8b9bb4] font-mono">&lt; 120 KB</span>
                      {slot === 'right_bottom' && <span className="text-[#00ff9d] font-bold">Active</span>}
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* Live Queue with EDIT & DELETE options */}
            <div className="p-3 rounded-2xl bg-[#101628] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-mono font-bold text-[#00ff9d] flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Live Slides in this Frame:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-white bg-white/10 px-2 py-0.5 rounded-md font-bold">
                    {loadingSlotData ? '...' : `${slotBanners.length} banners active`}
                  </span>
                  <button
                    type="button"
                    onClick={handleResetToNew}
                    className="p-1 rounded bg-[#00ff9d]/20 text-[#00ff9d] hover:bg-[#00ff9d]/30 cursor-pointer"
                    title="Add new banner to this slot"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {slotBanners.length === 0 ? (
                  <div className="text-[9px] text-[#8b9bb4] italic py-1">
                    No banners uploaded for this billboard frame yet.
                  </div>
                ) : (
                  slotBanners.map((b, idx) => (
                    <div
                      key={b.id || idx}
                      className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                        activeEditingId === b.id
                          ? 'bg-[#6d4aff]/20 border-[#00d9ff]/50 shadow-sm'
                          : 'bg-black/40 border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {b.image_url ? (
                          <img
                            src={b.image_url}
                            alt="thumbnail"
                            className="w-10 h-6 object-cover rounded-md border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-6 rounded-md bg-white/5 border border-white/10 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="truncate block font-semibold text-white text-[9.5px]">
                            #{b.display_order} • {b.title || 'Pure Poster Image'}
                          </span>
                          <span className={`text-[8px] font-mono ${b.active ? 'text-[#00ff9d]' : 'text-slate-500'}`}>
                            {b.active ? '● Active' : '○ Hidden'}
                          </span>
                        </div>
                      </div>

                      {/* ACTION BUTTONS (EDIT & DELETE) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectBannerForEdit(b)}
                          className="p-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 text-[#00d9ff] border border-blue-500/30 cursor-pointer transition-colors"
                          title="Edit this banner"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === b.id}
                          onClick={() => handleDeleteBanner(b)}
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 cursor-pointer transition-colors disabled:opacity-50"
                          title="Delete banner from storefront"
                        >
                          {deletingId === b.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* RIGHT: LIVE SPOTLIGHT SIMULATOR & LAUNCH FORM */}
          <div className="lg:col-span-6 space-y-3">
            
            <div className="p-3 bg-[#0a0e17]/90 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <span className="font-extrabold text-white text-[11px] block">{slotInfo.title}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-mono text-[#00d9ff] bg-[#00d9ff]/10 px-2 py-0.5 rounded-md border border-[#00d9ff]/30 font-bold">
                    Ideal: {slotInfo.recommendedSize}
                  </span>
                  <span className="text-[8.5px] font-mono text-[#8b9bb4]">
                    Ratio: {slotInfo.aspectRatioText}
                  </span>
                  <span className="text-[8.5px] font-mono text-[#00ff9d]">
                    Max: {slotInfo.recLimit}
                  </span>
                </div>
              </div>
              <span className="text-[8px] font-mono text-[#00d9ff] bg-[#00d9ff]/10 px-2 py-1 rounded-lg border border-[#00d9ff]/30 font-bold uppercase">
                Active Slot
              </span>
            </div>

            {/* LIVE BILLBOARD SIMULATOR BOX */}
            <div className="p-3 bg-[#0a0e17] rounded-3xl border border-white/10 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[9.5px] font-mono font-bold text-white flex items-center gap-1.5 uppercase">
                  <Eye className="w-3.5 h-3.5 text-[#00ff9d]" /> Customer Storefront Spotlight Simulator
                </span>
                {previewBlobUrl && (
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="text-[8.5px] font-mono text-[#ff6b6b] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Clear Image
                  </button>
                )}
              </div>

              <div className={`relative rounded-2xl border-2 ${frameAccent.border} ${frameAccent.glow} overflow-hidden bg-[#151c33] flex items-center justify-center ${slotInfo.aspect}`}>
                
                <div className={`absolute top-0 left-0 right-0 h-16 bg-gradient-to-b ${frameAccent.spotlight} pointer-events-none z-10`} />

                {previewBlobUrl ? (
                  <div className="w-full h-full relative flex items-center justify-center">
                    <img
                      src={previewBlobUrl}
                      alt="Billboard Live Preview"
                      className="w-full h-full object-contain"
                    />

                    {(title || subtitle) && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-3 text-white pointer-events-none z-20">
                        {title && <span className="text-xs font-extrabold tracking-tight drop-shadow">{title}</span>}
                        {subtitle && <span className="text-[9.5px] text-slate-300 drop-shadow">{subtitle}</span>}
                      </div>
                    )}

                    <div className="absolute top-2 left-2 bg-black/80 text-[#00ff9d] border border-white/10 px-2 py-0.5 rounded-lg text-[8px] font-mono flex items-center gap-1 z-20">
                      <Sparkles className="w-2.5 h-2.5 text-[#00d9ff]" />
                      <span>{activeEditingId ? 'Editing Live Slide' : 'New Slide Ready'}</span>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 text-center cursor-pointer w-full h-full hover:bg-white/5 transition-colors">
                    <Upload className="w-6 h-6 text-[#00d9ff] mb-1.5" />
                    <span className="font-bold text-white text-[10.5px]">Upload Graphic for this Billboard</span>
                    
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-mono text-[#00d9ff]">
                      <Ruler className="w-3 h-3 text-[#00ff9d]" />
                      <span>Best Dimensions: <strong>{slotInfo.recommendedSize}</strong> ({slotInfo.aspectRatioText})</span>
                    </div>

                    <span className="text-[8px] text-[#8b9bb4] mt-1">Real-time simulator will load immediately</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Launch Form */}
            <form onSubmit={handleSaveAndLaunch} className="space-y-3">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[9px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                    Banner Title / Headline <span className="text-[8px] text-[#00d9ff] lowercase font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Poster lo text unte blank ga vadileyandi"
                    className="w-full px-3 py-1.5 rounded-xl border border-white/10 bg-[#0a0e17] font-semibold text-white outline-none focus:border-[#00d9ff]"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-mono font-bold text-[#8b9bb4] uppercase tracking-wider block mb-1">
                    Subtitle / Promotional Offer <span className="text-[8px] text-[#00d9ff] lowercase font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Optional sub-text"
                    className="w-full px-3 py-1.5 rounded-xl border border-white/10 bg-[#0a0e17] font-semibold text-white outline-none focus:border-[#00d9ff]"
                  />
                </div>
              </div>

              {/* Navigation & Order */}
              <div className="p-3 bg-[#0a0e17] rounded-2xl border border-white/10 space-y-2">
                <span className="text-[9px] font-mono font-bold text-[#00d9ff] uppercase tracking-wider flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> Navigation Link & Multi-Scroll Sequence
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[8.5px] font-mono font-bold text-[#8b9bb4] uppercase block mb-0.5">
                      Link Type
                    </label>
                    <select
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value as any)}
                      className="w-full px-2 py-1.5 rounded-lg border border-white/10 bg-[#101628] font-semibold text-white outline-none focus:border-[#00d9ff] text-[10px]"
                    >
                      <option value="category">Category Redirect</option>
                      <option value="product">Specific Product</option>
                      <option value="external">External Link</option>
                      <option value="none">No Click Action</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[8.5px] font-mono font-bold text-[#8b9bb4] uppercase block mb-0.5">
                      Destination Target
                    </label>
                    <input
                      type="text"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder={targetType === 'category' ? "e.g. Bra's / nighties" : targetType === 'product' ? 'e.g. KF0036' : 'URL / None'}
                      disabled={targetType === 'none'}
                      className="w-full px-2 py-1.5 rounded-lg border border-white/10 bg-[#101628] font-semibold text-white outline-none focus:border-[#00d9ff] text-[10px] disabled:opacity-40"
                    />
                  </div>

                  <div>
                    <label className="text-[8.5px] font-mono font-bold text-[#8b9bb4] uppercase block mb-0.5 flex items-center justify-between">
                      <span>Slide Order #</span>
                      <span className="text-[#00ff9d]">Order</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2 py-1.5 rounded-lg border border-white/10 bg-[#101628] font-mono font-bold text-[#00ff9d] outline-none focus:border-[#00ff9d] text-[10px]"
                    />
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className={`py-1.5 px-3 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    active
                      ? 'bg-[#00ff9d]/20 text-[#00ff9d] border-[#00ff9d]/40'
                      : 'bg-white/5 text-[#8b9bb4] border-white/10'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{active ? 'Status: Active on Storefront' : 'Status: Hidden'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 rounded-xl font-bold text-[#8b9bb4] hover:text-white hover:bg-white/5 cursor-pointer transition-colors text-[10.5px]"
                  >
                    Close
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || (!previewBlobUrl && !imageUrl)}
                    className="px-4 py-1.5 rounded-xl font-bold flex items-center gap-2 bg-gradient-to-r from-[#00d9ff] to-[#6d4aff] text-neutral-950 font-extrabold shadow-lg shadow-[#00d9ff]/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95 text-[11px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-neutral-950" />
                        <span>Updating Live...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3" />
                        <span>{activeEditingId ? 'Save Changes' : 'Confirm & Launch Live'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>

          </div>

        </div>

      </div>
    </div>
  );
}

export default BannerClicksModal;