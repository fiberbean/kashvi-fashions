import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SubCategory {
  id: string;
  name: string;
  category_id: string | null;
  category_name?: string | null;
  image_url: string | null;
  active: boolean | null;
}

interface Category {
  id: string;
  name: string;
  slug: string | null;
  department: string | null;
  image_url: string | null;
  active: boolean | null;
  sub_categories?: SubCategory[];
}

// ఇన్‌స్టంట్ లోడింగ్ కోసం గ్లోబల్ ఇన్-మెమరీ క్యాష్
let fashionCache: Category[] | null = null;

export default function FashionBubbleMenu() {
  const [categories, setCategories] = useState<Category[]>(fashionCache || []);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(!fashionCache);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveCategory(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchFashionMenu() {
      if (fashionCache && fashionCache.length > 0) {
        setCategories(fashionCache);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [catResponse, subResponse] = await Promise.all([
          supabase
            .from('categories')
            .select('id, name, slug, department, image_url, active'),
          supabase
            .from('sub_categories')
            .select('id, name, category_id, category_name, image_url, active')
            .eq('active', true),
        ]);

        const catData = catResponse.data || [];
        const subData = subResponse.data || [];

        if (catData.length > 0) {
          const fashionCats = catData.filter((c) => {
            const nameLower = (c.name || '').toLowerCase();
            const slugLower = (c.slug || '').toLowerCase();
            const deptLower = (c.department || '').toLowerCase();

            const isJewellery =
              nameLower.includes('jewel') ||
              slugLower.includes('jewel') ||
              deptLower.includes('jewel');

            return !isJewellery && c.active !== false;
          });

          const subByCatId = new Map<string, SubCategory[]>();
          const subByCatName = new Map<string, SubCategory[]>();

          subData.forEach((sub) => {
            if (sub.category_id) {
              const cid = String(sub.category_id).trim();
              if (!subByCatId.has(cid)) subByCatId.set(cid, []);
              subByCatId.get(cid)!.push(sub);
            }
            if (sub.category_name) {
              const cname = sub.category_name.toLowerCase().trim();
              if (!subByCatName.has(cname)) subByCatName.set(cname, []);
              subByCatName.get(cname)!.push(sub);
            }
          });

          const mappedCategories: Category[] = fashionCats.map((cat) => {
            const byId = subByCatId.get(String(cat.id).trim()) || [];
            const byName = subByCatName.get((cat.name || '').toLowerCase().trim()) || [];

            const combined = [...byId];
            byName.forEach((item) => {
              if (!combined.some((c) => c.id === item.id)) {
                combined.push(item);
              }
            });

            return {
              ...cat,
              sub_categories: combined,
            };
          });

          fashionCache = mappedCategories;
          if (isMounted) setCategories(mappedCategories);
        }
      } catch (err) {
        console.error('Error fetching fashion categories:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchFashionMenu();

    return () => {
      isMounted = false;
    };
  }, []);

  const getAutoAdjustedDimensions = (total: number, text: string) => {
    let baseSize = 64;
    let radius = 34;

    if (total <= 4) {
      baseSize = 74;
      radius = 32;
    } else if (total <= 6) {
      baseSize = 68;
      radius = 34;
    } else if (total <= 9) {
      baseSize = 58;
      radius = 35;
    } else {
      baseSize = 48;
      radius = 36;
    }

    const len = text.trim().length;
    let size = baseSize;
    if (len > 10) size = Math.round(baseSize * 1.08);
    if (len < 5) size = Math.round(baseSize * 0.94);

    let fontSize = 'text-[10px]';
    if (size <= 50) fontSize = 'text-[8px]';
    else if (size <= 60) fontSize = 'text-[9px]';
    else if (size >= 72) fontSize = 'text-[11px]';

    return { size, radius, fontSize };
  };

  const getCenteredCircularPosition = (index: number, total: number, radiusPercent: number) => {
    const angleStep = (2 * Math.PI) / total;
    const angle = index * angleStep - Math.PI / 2;

    const x = 50 + radiusPercent * Math.cos(angle);
    const y = 50 + radiusPercent * Math.sin(angle);

    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  if (loading) {
    return (
      <div className="w-full py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#ff4d6d]"></div>
      </div>
    );
  }

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-7 pb-2">
      {/* 1. Header with Couture Title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#ff4d6d] font-bold block">
            Haute Couture
          </span>
          <h3 className="text-lg sm:text-xl font-serif font-bold text-neutral-900 tracking-tight">
            Curated Boutiques
          </h3>
        </div>
        <span className="text-[11px] text-neutral-400 font-medium tracking-wider uppercase hidden sm:inline-block">
          Select collection →
        </span>
      </div>

      {/* 2. Royal Arch / Vault Capsule Category Menu */}
      <div className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className="group shrink-0 flex flex-col items-center w-[108px] sm:w-[122px] text-center transition-all duration-300 active:scale-95 cursor-pointer focus:outline-hidden"
          >
            {/* Royal Arch Frame */}
            <div className="relative w-full h-[142px] sm:h-[155px] rounded-t-[54px] rounded-b-2xl p-1 bg-gradient-to-b from-[#fff0f3] to-white border border-[#ff4d6d]/25 shadow-2xs group-hover:border-[#ff4d6d] group-hover:shadow-md group-hover:shadow-[#ff4d6d]/15 transition-all duration-300 flex flex-col justify-between">
              {/* Inner Arch Image */}
              <div className="w-full h-full rounded-t-[48px] rounded-b-xl overflow-hidden bg-neutral-100 relative">
                <img
                  src={
                    cat.image_url ||
                    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'
                  }
                  alt={cat.name}
                  className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-108"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
              </div>
            </div>

            {/* Labels */}
            <div className="mt-2.5 w-full px-1">
              <h4 className="text-xs font-serif font-bold text-neutral-900 group-hover:text-[#ff4d6d] transition-colors truncate">
                {cat.name}
              </h4>
              <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-semibold mt-0.5 truncate">
                {cat.sub_categories?.length ? `${cat.sub_categories.length} Edits` : 'Explore'}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* 3. Subcategory Popup Showcase Modal */}
      {activeCategory && (
        <div
          onClick={() => setActiveCategory(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative cursor-default flex flex-col items-center"
          >
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="absolute -top-12 sm:-top-14 right-0 p-2.5 rounded-full bg-white/95 hover:bg-[#ff4d6d] text-neutral-800 hover:text-white transition-all shadow-lg hover:scale-110 cursor-pointer z-50 flex items-center gap-1 text-xs font-bold"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
              <span className="pr-1">Close</span>
            </button>

            <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] rounded-full bg-white border-4 border-[#ff4d6d] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 px-8 text-center">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.25em] text-[#ff4d6d]">
                  <Sparkles className="w-2.5 h-2.5" />
                  Collection
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-neutral-900 mt-0.5 leading-tight">
                  {activeCategory.name}
                </h3>
              </div>

              <div className="relative w-full h-full">
                {activeCategory.sub_categories && activeCategory.sub_categories.length > 0 ? (
                  activeCategory.sub_categories.map((sub, index) => {
                    const { size, radius, fontSize } = getAutoAdjustedDimensions(
                      activeCategory.sub_categories!.length,
                      sub.name
                    );
                    const positionStyle = getCenteredCircularPosition(
                      index,
                      activeCategory.sub_categories!.length,
                      radius
                    );
                    const categoryTarget = activeCategory.slug || activeCategory.id;

                    return (
                      <Link
                        key={sub.id}
                        to={`/category/${categoryTarget}?sub=${encodeURIComponent(sub.name)}`}
                        onClick={() => setActiveCategory(null)}
                        style={{
                          position: 'absolute',
                          width: `${size}px`,
                          height: `${size}px`,
                          ...positionStyle,
                        }}
                        className="rounded-full overflow-hidden border-2 border-[#ff4d6d]/40 hover:border-[#ff4d6d] transition-all duration-300 shadow-md hover:scale-115 flex items-center justify-center cursor-pointer z-10 group"
                      >
                        <img
                          src={
                            sub.image_url ||
                            'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=80'
                          }
                          alt={sub.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="eager"
                        />
                        <div className="absolute inset-0 bg-black/45 group-hover:bg-[#ff4d6d]/75 transition-colors flex items-center justify-center p-1">
                          <span
                            className={`text-white font-bold text-center leading-tight drop-shadow-xs px-1 ${fontSize}`}
                          >
                            {sub.name}
                          </span>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xs text-neutral-400">View all {activeCategory.name}</p>
                    <Link
                      to={`/category/${activeCategory.slug || activeCategory.id}`}
                      onClick={() => setActiveCategory(null)}
                      className="mt-2 text-xs font-bold text-[#ff4d6d] underline"
                    >
                      Browse Catalog
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}