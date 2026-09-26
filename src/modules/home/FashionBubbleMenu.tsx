import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, Sparkles, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SubCategory {
  id: string;
  name: string;
  category_id?: string | null;
  category_name?: string | null;
  image_url?: string | null;
  active?: boolean | null;
}

interface Category {
  id: string;
  name: string;
  slug?: string | null;
  department?: string | null;
  image_url?: string | null;
  active?: boolean | null;
  sub_categories?: SubCategory[];
}

export default function FashionBubbleMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mouse Drag States
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (activeCategory) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeCategory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveCategory(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Native wheel event binding for horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 1.5;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [loading, categories]);

  // Button Scroll Handler
  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Mouse Drag to Scroll Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.6;
    if (Math.abs(walk) > 4) {
      setHasMoved(true);
    }
    scrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadFashionMenu() {
      setLoading(true);
      try {
        const [catRes, subRes] = await Promise.all([
          supabase.from('categories').select('*').order('name'),
          supabase.from('sub_categories').select('*').order('name'),
        ]);

        const catData: any[] = catRes.data || [];
        const subData: any[] = subRes.data || [];

        const fashionCats = catData.filter((c) => {
          if (c.active === false) return false;
          const dept = (c.department || '').toLowerCase().trim();
          const name = (c.name || '').toLowerCase().trim();
          const slug = (c.slug || '').toLowerCase().trim();
          const isJewel = dept.includes('jewel') || name.includes('jewel') || slug.includes('jewel');
          return !isJewel;
        });

        const mappedCategories: Category[] = fashionCats.map((cat) => {
          const catIdStr = String(cat.id).trim();
          const catNameStr = (cat.name || '').toLowerCase().trim();

          const relatedSubs = subData.filter((sub) => {
            if (sub.active === false) return false;
            const subDept = (sub.department || '').toLowerCase().trim();
            if (subDept.includes('jewel')) return false;

            const mId = sub.category_id && String(sub.category_id).trim() === catIdStr;
            const mName = sub.category_name && sub.category_name.toLowerCase().trim() === catNameStr;
            return mId || mName;
          });

          return {
            ...cat,
            sub_categories: relatedSubs,
          };
        });

        if (isMounted) {
          setCategories(mappedCategories);
        }
      } catch (err) {
        console.error('Error loading fashion menu:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFashionMenu();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff2d85]"></div>
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-3 pb-4 select-none relative z-10 flex flex-col items-center">
      {/* Scroll Navigation Controls */}
      <div className="w-full flex items-center justify-end mb-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="p-1.5 sm:p-2 rounded-full bg-white/95 hover:bg-[#ff2d85] text-stone-700 hover:text-white border-0 transition-all cursor-pointer shadow-[0_4px_14px_rgba(255,182,193,0.5)] hover:shadow-[0_4px_18px_rgba(255,140,165,0.7)] active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="p-1.5 sm:p-2 rounded-full bg-white/95 hover:bg-[#ff2d85] text-stone-700 hover:text-white border-0 transition-all cursor-pointer shadow-[0_4px_14px_rgba(255,182,193,0.5)] hover:shadow-[0_4px_18px_rgba(255,140,165,0.7)] active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Track: Fully Center-Aligned Arched Cards with Baby Pink Shadow */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full flex items-center justify-center overflow-x-auto pb-4 pt-1 px-2 focus:outline-none scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex items-start justify-center gap-3.5 sm:gap-5 min-w-max mx-auto">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => {
                if (!hasMoved) setActiveCategory(cat);
              }}
              className="group shrink-0 flex flex-col items-center w-[84px] sm:w-[94px] cursor-pointer active:scale-95 transition-all duration-300 text-center"
            >
              {/* Arched Window Shape - Pure Baby Pink Shadow */}
              <div className="relative w-full h-[116px] sm:h-[126px] rounded-t-full rounded-b-2xl overflow-hidden bg-stone-100 shadow-[0_8px_20px_rgba(255,182,193,0.55),0_2px_6px_rgba(255,192,203,0.3)] group-hover:shadow-[0_12px_28px_rgba(255,150,175,0.75),0_4px_12px_rgba(255,182,193,0.5)] transition-all duration-300">
                <img
                  src={
                    cat.image_url ||
                    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'
                  }
                  alt={cat.name}
                  className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500 ease-out"
                  loading="lazy"
                  draggable={false}
                />
                {/* Subtle Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-40 group-hover:opacity-15 transition-opacity" />
              </div>

              {/* Typography */}
              <span className="mt-2 text-[11px] sm:text-[11.5px] font-sans font-semibold text-stone-800 group-hover:text-[#ff2d85] transition-colors leading-tight text-center line-clamp-1 w-full tracking-tight">
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-Category Pop-Up Modal */}
      {activeCategory &&
        createPortal(
          <div
            onClick={() => setActiveCategory(null)}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_-15px_rgba(255,182,193,0.6)] border-0 cursor-default animate-in zoom-in-95 duration-200 flex flex-col z-[10000] my-auto max-h-[88vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-stone-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-pink-50 text-[#ff2d85]">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-sans font-bold text-stone-900 leading-none">
                      {activeCategory.name}
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider text-[#ff2d85] font-semibold">
                      Curated Boutique Edit
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className="p-1.5 rounded-full bg-stone-100 hover:bg-pink-50 text-stone-500 hover:text-[#ff2d85] transition-all cursor-pointer border-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Subcategories Grid - Center-Aligned with Baby Pink Shadow */}
              <div className="overflow-y-auto max-h-[58vh] py-4 no-scrollbar flex-1">
                {activeCategory.sub_categories && activeCategory.sub_categories.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3.5 sm:gap-4 justify-items-center">
                    {activeCategory.sub_categories.map((sub) => {
                      const catSlug = activeCategory.slug || activeCategory.id;

                      return (
                        <Link
                          key={sub.id}
                          to={`/category/${catSlug}?sub=${encodeURIComponent(sub.name)}`}
                          onClick={() => setActiveCategory(null)}
                          className="group flex flex-col items-center w-[78px] sm:w-[86px] text-center cursor-pointer active:scale-95 transition-all"
                        >
                          <div className="relative w-full h-[100px] sm:h-[110px] rounded-t-full rounded-b-xl overflow-hidden bg-stone-50 shadow-[0_6px_16px_rgba(255,182,193,0.45)] group-hover:shadow-[0_10px_22px_rgba(255,150,175,0.7)] transition-all">
                            <img
                              src={
                                sub.image_url ||
                                activeCategory.image_url ||
                                'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=80'
                              }
                              alt={sub.name}
                              className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                              loading="lazy"
                            />
                          </div>

                          <span className="mt-1.5 text-[11px] font-sans font-medium text-stone-700 group-hover:text-[#ff2d85] transition-colors leading-tight line-clamp-1 w-full text-center">
                            {sub.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-stone-400">
                    No sub-categories found in this category.
                  </div>
                )}
              </div>

              {/* Modal Footer CTA */}
              <div className="pt-3 border-t border-stone-100 text-center shrink-0">
                <Link
                  to={`/category/${activeCategory.slug || activeCategory.id}`}
                  onClick={() => setActiveCategory(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ff2d85] hover:text-[#e01e6e] transition-colors tracking-wide"
                >
                  <span>Explore All {activeCategory.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </Link>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}