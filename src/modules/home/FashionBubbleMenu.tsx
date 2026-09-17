import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Sparkles, ChevronRight } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="w-full py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#ff4d6d]"></div>
      </div>
    );
  }

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-7 pb-2">
      {/* 1. Category Section Header */}
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

      {/* 2. Main Royal Arch Menu Track */}
      <div className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className="group shrink-0 flex flex-col items-center w-[108px] sm:w-[122px] text-center transition-all duration-300 active:scale-95 cursor-pointer focus:outline-hidden"
          >
            <div className="relative w-full h-[142px] sm:h-[155px] rounded-t-[54px] rounded-b-2xl p-1 bg-gradient-to-b from-[#fff0f3] to-white border border-[#ff4d6d]/25 shadow-2xs group-hover:border-[#ff4d6d] group-hover:shadow-md group-hover:shadow-[#ff4d6d]/15 transition-all duration-300 flex flex-col justify-between">
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

            <div className="mt-2.5 w-full px-1">
              <h4 className="text-xs font-serif font-bold text-neutral-900 group-hover:text-[#ff4d6d] transition-colors truncate">
                {cat.name}
              </h4>
            </div>
          </button>
        ))}
      </div>

      {/* 3. Compact Half-Sized Modal for Sub-Categories */}
      {activeCategory && (
        <div
          onClick={() => setActiveCategory(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-neutral-100 cursor-default animate-in zoom-in-95 duration-200 flex flex-col"
          >
            {/* Header with Title & Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#ff4d6d] block">
                  Select Style
                </span>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-neutral-950 leading-tight mt-0.5">
                  {activeCategory.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-900 text-neutral-600 hover:text-white transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Compact 2-Column Capsule Pills List */}
            <div className="overflow-y-auto max-h-[50vh] py-3.5 no-scrollbar flex-1">
              {activeCategory.sub_categories && activeCategory.sub_categories.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                  {activeCategory.sub_categories.map((sub) => {
                    const categoryTarget = activeCategory.slug || activeCategory.id;

                    return (
                      <Link
                        key={sub.id}
                        to={`/category/${categoryTarget}?sub=${encodeURIComponent(sub.name)}`}
                        onClick={() => setActiveCategory(null)}
                        className="group flex items-center gap-2 p-1.5 rounded-2xl bg-neutral-50 hover:bg-[#fff0f3] border border-neutral-200/70 hover:border-[#ff4d6d]/40 transition-all cursor-pointer active:scale-95 shadow-2xs"
                      >
                        {/* Micro Image Thumbnail */}
                        <div className="w-8 h-8 rounded-xl overflow-hidden bg-neutral-200 shrink-0">
                          <img
                            src={
                              sub.image_url ||
                              activeCategory.image_url ||
                              'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=150&q=80'
                            }
                            alt={sub.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        {/* Label */}
                        <span className="text-xs font-semibold text-neutral-800 group-hover:text-[#ff4d6d] transition-colors truncate">
                          {sub.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-neutral-400">
                  No sub-categories available
                </div>
              )}
            </div>

            {/* Compact Footer Link */}
            <div className="pt-3 border-t border-neutral-100 text-center shrink-0">
              <Link
                to={`/category/${activeCategory.slug || activeCategory.id}`}
                onClick={() => setActiveCategory(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-700 hover:text-[#ff4d6d] transition-colors uppercase tracking-wider"
              >
                <span>View All {activeCategory.name}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}