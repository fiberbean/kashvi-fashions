import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
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
      // ఒకవేళ క్యాష్‌లో డేటా ఉంటే మళ్లీ నెట్‌వర్క్ కాల్ చేయదు
      if (fashionCache && fashionCache.length > 0) {
        setCategories(fashionCache);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // రెండు క్వెరీలను ఏకకాలంలో (Parallel) ఫెచ్ చేయడం + కేవలం కావాల్సిన ఫీల్డ్స్ మాత్రమే
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
          // ఫ్యాషన్ కేటగిరీల ఫిల్టర్
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

          // ఫాస్ట్ మ్యాపింగ్ కోసం Map డేటా స్ట్రక్చర్
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
            
            // డూప్లికేట్స్ లేకుండా మెర్జ్ చేయడం
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
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 overflow-x-auto no-scrollbar relative">
      {/* 1. Base Horizontal Bubble Menu */}
      <div className="flex items-center gap-4 sm:gap-6 min-w-max md:justify-center">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className="flex flex-col items-center gap-2 group text-center cursor-pointer focus:outline-hidden"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-[#ff4d6d]/30 group-hover:border-[#ff4d6d] p-0.5 transition-all shadow-xs group-hover:scale-105 bg-neutral-50">
              <img
                src={
                  cat.image_url ||
                  'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80'
                }
                alt={cat.name}
                className="w-full h-full object-cover rounded-full"
                loading="eager"
              />
            </div>
            <span className="text-xs font-medium text-neutral-800 group-hover:text-[#ff4d6d] transition-colors">
              {cat.name}
            </span>
          </button>
        ))}
      </div>

      {/* 2. Pop-up Showcase with Center Alignment & Close Button */}
      {activeCategory && (
        <div
          onClick={() => setActiveCategory(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative cursor-default flex flex-col items-center"
          >
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="absolute -top-12 sm:-top-14 right-0 p-2.5 rounded-full bg-white/90 hover:bg-[#ff4d6d] text-neutral-800 hover:text-white transition-all shadow-lg hover:scale-110 cursor-pointer z-50 flex items-center gap-1 text-xs font-bold"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
              <span className="pr-1">Close</span>
            </button>

            <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] rounded-full bg-white border-4 border-[#ff4d6d] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 px-8 text-center">
                <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#ff4d6d]">
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