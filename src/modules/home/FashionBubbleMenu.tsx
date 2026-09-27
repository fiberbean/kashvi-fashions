import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MenuBubble {
  id: string;
  name: string;
  slug: string;
  image_url: string;
}

interface SubBubble {
  id: string;
  name: string;
  slug: string;
  image_url: string;
}

// category_id NULL unna (orphan) sub-categories anni ee virtual
// "Others" Menu bubble kinda kanipistayi (DB lo fix ayye varaku)
const OTHERS_TAB_ID = '__others__';
const FALLBACK_MENU_IMG =
  'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80';
const FALLBACK_SUB_IMG =
  'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&q=80';

export default function FashionBubbleMenu() {
  const [menuItems, setMenuItems] = useState<MenuBubble[]>([]);
  const [subByCategory, setSubByCategory] = useState<Record<string, SubBubble[]>>({});
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<MenuBubble | null>(null);
  const [searchParams] = useSearchParams();
  const currentSub = searchParams.get('sub');

  useEffect(() => {
    let isMounted = true;

    async function loadMenu() {
      setLoading(true);
      try {
        const [catRes, subRes] = await Promise.all([
          supabase.from('categories').select('*').eq('active', true),
          supabase.from('sub_categories').select('*').eq('active', true),
        ]);

        const catData = catRes.data || [];
        const subData = subRes.data || [];

        // Jewellery category ni identify chesi Fashion Menu nunchi exclude chestham
        const isJewelleryCategory = (c: any) => {
          const name = (c.name || '').toLowerCase().trim();
          const slug = (c.slug || '').toLowerCase().trim();
          return name.includes('jewel') || slug.includes('jewel');
        };

        const jewelCatIds = new Set<string>(
          catData.filter(isJewelleryCategory).map((c: any) => String(c.id))
        );

        const jewelTerms = [
          'jewel', 'jewellery', 'bangle', 'bracelet', 'choker',
          'necklace', 'earring', 'ring', 'kundan', 'temple',
          'bridal jewellery', 'jewellery sets', 'anklet', 'kada', 'chain',
          'haram', 'pendant', 'jhumka', 'jhumki', 'mangalsutra',
        ];
        const isJewelleryTermMatch = (name: string, slug: string) =>
          jewelTerms.some((term) => name.includes(term) || slug.includes(term));

        // LEVEL 1 (Menu): Categories - image_url categories table nunchi
        const fashionCats = catData
          .filter((c: any) => !jewelCatIds.has(String(c.id)) && c.name)
          .map((c: any) => ({
            id: String(c.id),
            name: c.name.trim(),
            slug: c.slug || c.name.trim().toLowerCase().replace(/\s+/g, '-'),
            image_url: c.image_url || FALLBACK_MENU_IMG,
            display_order: c.display_order ?? 0,
          }))
          .sort(
            (a: any, b: any) => a.display_order - b.display_order || a.name.localeCompare(b.name)
          );

        // LEVEL 2 (Sub-Menu): Sub-Categories - image_url sub_categories table nunchi,
        // category_id prakaram group chestham
        const grouped: Record<string, SubBubble[]> = {};
        fashionCats.forEach((c: any) => {
          grouped[c.id] = [];
        });
        grouped[OTHERS_TAB_ID] = [];

        subData.forEach((s: any) => {
          if (!s.name) return;

          const catId = s.category_id ? String(s.category_id).trim() : '';
          const name = s.name.trim().toLowerCase();
          const slug = (s.slug || '').trim().toLowerCase();

          if (catId && jewelCatIds.has(catId)) return;
          if (isJewelleryTermMatch(name, slug)) return;

          const bubble: SubBubble = {
            id: String(s.id),
            name: s.name.trim(),
            slug: s.slug || s.name.trim().toLowerCase().replace(/\s+/g, '-'),
            image_url: s.image_url || FALLBACK_SUB_IMG,
          };

          if (catId && grouped[catId]) {
            grouped[catId].push(bubble);
          } else {
            grouped[OTHERS_TAB_ID].push(bubble);
          }
        });

        Object.keys(grouped).forEach((key) => {
          grouped[key].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          );
        });

        const menuList: MenuBubble[] = fashionCats.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          image_url: c.image_url,
        }));

        if (grouped[OTHERS_TAB_ID].length > 0) {
          menuList.push({
            id: OTHERS_TAB_ID,
            name: 'Others',
            slug: 'others',
            image_url: grouped[OTHERS_TAB_ID][0]?.image_url || FALLBACK_SUB_IMG,
          });
        }

        if (isMounted) {
          setMenuItems(menuList);
          setSubByCategory(grouped);
        }
      } catch (err) {
        console.error('Error loading fashion menu:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMenu();

    return () => {
      isMounted = false;
    };
  }, []);

  // Popup open ayyi unnappudu background scroll lock + Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    if (openMenu) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  if (loading && menuItems.length === 0) {
    return (
      <div className="w-full py-4 flex items-center justify-start md:justify-center gap-4 px-4 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="w-[74px] sm:w-[88px] flex flex-col items-center gap-2 shrink-0 animate-pulse">
            <div className="w-full h-[102px] sm:h-[118px] rounded-t-full rounded-b-2xl bg-pink-100/50" />
            <div className="w-12 h-2.5 bg-pink-100/60 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (menuItems.length === 0) {
    return null;
  }

  const activeSubs = openMenu ? subByCategory[openMenu.id] || [] : [];

  // Bubble card ni renderu chese common function - Menu row lo, Popup lo
  // rendu chotla okate design (arched image window) vadutundi
  const renderBubble = (opts: {
    key: string;
    imageUrl: string;
    label: string;
    isActive: boolean;
    onClick?: () => void;
    linkTo?: string;
  }) => {
    const inner = (
      <>
        <div
          className={`relative w-full h-[102px] sm:h-[118px] rounded-t-full rounded-b-2xl overflow-hidden bg-stone-100 transition-all duration-300 ${
            opts.isActive
              ? 'shadow-[0_10px_25px_rgba(255,45,133,0.45)] ring-2 ring-[#ff2d85]'
              : 'shadow-[0_6px_18px_rgba(255,182,193,0.38)] group-hover:shadow-[0_10px_25px_rgba(255,140,165,0.55)]'
          }`}
        >
          <img
            src={opts.imageUrl}
            alt={opts.label}
            className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-108"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 via-transparent to-transparent opacity-45 group-hover:opacity-15 transition-opacity" />
        </div>

        <div className="mt-1.5 w-full px-0.5 min-h-[30px] flex items-center justify-center">
          <span
            className={`block text-[10.5px] sm:text-[11.5px] font-semibold leading-tight text-center tracking-tight transition-colors whitespace-normal break-words ${
              opts.isActive ? 'text-[#ff2d85]' : 'text-stone-800 group-hover:text-[#ff2d85]'
            }`}
          >
            {opts.label}
          </span>
        </div>
      </>
    );

    const className =
      'group shrink-0 flex flex-col items-center w-[74px] sm:w-[88px] text-center cursor-pointer transition-transform active:scale-95';

    if (opts.linkTo) {
      return (
        <Link key={opts.key} to={opts.linkTo} className={className} onClick={opts.onClick}>
          {inner}
        </Link>
      );
    }

    return (
      <button key={opts.key} type="button" onClick={opts.onClick} className={className}>
        {inner}
      </button>
    );
  };

  const popup =
    openMenu &&
    createPortal(
      <div
        onClick={() => setOpenMenu(null)}
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(255,182,193,0.35)] overflow-hidden border border-pink-100 cursor-default animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[80vh] flex flex-col text-stone-900"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-pink-50 shrink-0">
                <img src={openMenu.image_url} alt={openMenu.name} className="w-full h-full object-cover" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                {openMenu.name}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setOpenMenu(null)}
              className="w-8 h-8 rounded-full bg-stone-50 hover:bg-pink-50 hover:text-[#ff2d85] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-Menu bubble grid */}
          <div className="px-4 sm:px-5 py-4 overflow-y-auto">
            {activeSubs.length > 0 ? (
              <div className="flex flex-wrap items-start justify-start gap-3.5 sm:gap-5">
                {activeSubs.map((item) =>
                  renderBubble({
                    key: item.id,
                    imageUrl: item.image_url,
                    label: item.name,
                    isActive: currentSub === item.slug || currentSub === item.name,
                    linkTo: `/category/${item.slug}?tab=fashions&sub=${encodeURIComponent(item.name)}`,
                    onClick: () => setOpenMenu(null),
                  })
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-[12px] text-stone-400">
                Ee category lo sub-categories ippudu ledu.
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <div className="w-full py-2.5 sm:py-4 select-none relative z-10">
      <div
        className="w-full overflow-x-auto overflow-y-hidden no-scrollbar px-3 sm:px-6 touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex flex-nowrap items-start justify-start md:justify-center gap-3.5 sm:gap-6 min-w-max py-1.5 px-1">
          {menuItems.map((item) =>
            renderBubble({
              key: item.id,
              imageUrl: item.image_url,
              label: item.name,
              isActive: openMenu?.id === item.id,
              onClick: () => setOpenMenu(item),
            })
          )}
        </div>
      </div>

      {popup}
    </div>
  );
}
