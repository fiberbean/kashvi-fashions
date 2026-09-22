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

const PAPER_TAPES = [
  {
    tapeColor: 'bg-[#ff3385]/75 border-y border-[#ff3385]/40 shadow-[0_2px_8px_rgba(255,51,133,0.35)]',
    tapeTilt: 'rotate-[-3deg]',
    paperTilt: 'hover:rotate-0 rotate-[-1.5deg]',
    borderGlow: 'border-[#ff3385]/40 group-hover:border-[#ff3385]',
  },
  {
    tapeColor: 'bg-[#00f5d4]/75 border-y border-[#00f5d4]/40 shadow-[0_2px_8px_rgba(0,245,212,0.35)]',
    tapeTilt: 'rotate-[2.5deg]',
    paperTilt: 'hover:rotate-0 rotate-[1.8deg]',
    borderGlow: 'border-[#00f5d4]/40 group-hover:border-[#00f5d4]',
  },
  {
    tapeColor: 'bg-[#ffb800]/75 border-y border-[#ffb800]/40 shadow-[0_2px_8px_rgba(255,184,0,0.35)]',
    tapeTilt: 'rotate-[-2deg]',
    paperTilt: 'hover:rotate-0 rotate-[-1.2deg]',
    borderGlow: 'border-[#ffb800]/40 group-hover:border-[#ffb800]',
  },
  {
    tapeColor: 'bg-[#6366f1]/75 border-y border-[#6366f1]/40 shadow-[0_2px_8px_rgba(99,102,241,0.35)]',
    tapeTilt: 'rotate-[3deg]',
    paperTilt: 'hover:rotate-0 rotate-[1.5deg]',
    borderGlow: 'border-[#6366f1]/40 group-hover:border-[#6366f1]',
  },
];

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00f5d4] shadow-[0_0_12px_#00f5d4]"></div>
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-2 pb-3 select-none relative z-10">
      {/* 1. Header with Scroll Controls Only */}
      <div className="flex items-center justify-end mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="p-1.5 sm:p-2 rounded-lg bg-[#0b1122]/90 hover:bg-[#ff3385] text-white border border-white/10 hover:border-[#ff3385] transition-all cursor-pointer shadow-md active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="p-1.5 sm:p-2 rounded-lg bg-[#0b1122]/90 hover:bg-[#00f5d4] text-white hover:text-[#040814] border border-white/10 hover:border-[#00f5d4] transition-all cursor-pointer shadow-md active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Track */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex items-start gap-4 sm:gap-5 overflow-x-auto pb-4 pt-3 px-2 focus:outline-none scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {categories.map((cat, idx) => {
          const profile = PAPER_TAPES[idx % PAPER_TAPES.length];

          return (
            <div
              key={cat.id}
              onClick={() => {
                if (!hasMoved) setActiveCategory(cat);
              }}
              className={`group shrink-0 flex flex-col items-center w-[104px] sm:w-[116px] text-center transition-all duration-300 active:scale-95 cursor-pointer focus:outline-hidden ${profile.paperTilt} hover:scale-105 hover:z-20`}
            >
              {/* Paper Poster Card */}
              <div
                className={`relative w-full h-[118px] sm:h-[128px] rounded-xs p-1.5 bg-[#0f172a] border ${profile.borderGlow} shadow-[0_10px_20px_rgba(0,0,0,0.85)] group-hover:shadow-[0_14px_28px_rgba(0,0,0,0.95)] transition-all duration-300 flex flex-col`}
              >
                {/* Wall Stick Tape */}
                <div
                  className={`absolute -top-2.5 left-1/2 -translate-x-1/2 w-11 h-3.5 ${profile.tapeColor} ${profile.tapeTilt} backdrop-blur-xs z-30 pointer-events-none opacity-90`}
                  style={{
                    clipPath: 'polygon(0% 15%, 4% 0%, 96% 0%, 100% 15%, 98% 85%, 100% 100%, 0% 100%, 2% 85%)',
                  }}
                />

                {/* Inner Image Frame */}
                <div className="w-full h-full rounded-xs overflow-hidden bg-[#040814] relative border border-white/5 pointer-events-none">
                  <img
                    src={
                      cat.image_url ||
                      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'
                    }
                    alt={cat.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-110 filter brightness-95 group-hover:brightness-105 pointer-events-none"
                    loading="lazy"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#040814]/85 via-transparent to-transparent opacity-70 group-hover:opacity-20 transition-opacity" />
                </div>
              </div>

              {/* Title Tag */}
              <div className="mt-2 w-full px-0.5 pointer-events-none min-h-[30px] flex items-center justify-center">
                <span className="block text-[11px] font-mono font-black text-white group-hover:text-[#00f5d4] transition-colors whitespace-normal break-words leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-[#040814]/90 border border-white/15 py-1 px-1.5 rounded-xs shadow-md group-hover:border-[#00f5d4] text-center w-full">
                  {cat.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Sub-Category Pop-Up Menu Modal via React Portal (Never covered by banners) */}
      {activeCategory &&
        createPortal(
          <div
            onClick={() => setActiveCategory(null)}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl bg-[#0b1122] rounded-2xl p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.98)] border border-[#ff3385]/50 cursor-default animate-in zoom-in-95 duration-200 flex flex-col z-[10000] my-auto max-h-[88vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-md bg-[#ff3385]/20 text-[#ff3385] border border-[#ff3385]/40">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-sans font-black text-white leading-none uppercase tracking-tight">
                      {activeCategory.name}
                    </h3>
                    <span className="text-[10px] font-mono text-[#00f5d4] font-bold">SELECT SUB-COLLECTION</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className="p-1.5 rounded-md bg-white/10 hover:bg-[#ff3385] text-white hover:text-[#040814] transition-all cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Subcategories Grid */}
              <div className="overflow-y-auto max-h-[58vh] py-4 no-scrollbar flex-1">
                {activeCategory.sub_categories && activeCategory.sub_categories.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3.5 sm:gap-4 justify-items-center">
                    {activeCategory.sub_categories.map((sub, sIdx) => {
                      const catSlug = activeCategory.slug || activeCategory.id;
                      const profile = PAPER_TAPES[sIdx % PAPER_TAPES.length];

                      return (
                        <Link
                          key={sub.id}
                          to={`/category/${catSlug}?sub=${encodeURIComponent(sub.name)}`}
                          onClick={() => setActiveCategory(null)}
                          className={`group flex flex-col items-center w-[82px] sm:w-[92px] text-center cursor-pointer active:scale-95 transition-all ${profile.paperTilt}`}
                        >
                          <div
                            className={`relative w-full h-[92px] sm:h-[102px] rounded-xs p-1 bg-[#0f172a] border ${profile.borderGlow} shadow-md transition-all duration-300`}
                          >
                            <div
                              className={`absolute -top-2 left-1/2 -translate-x-1/2 w-9 h-2.5 ${profile.tapeColor} ${profile.tapeTilt} z-20 pointer-events-none opacity-85`}
                            />

                            <div className="w-full h-full rounded-xs overflow-hidden bg-[#040814] relative">
                              <img
                                src={
                                  sub.image_url ||
                                  activeCategory.image_url ||
                                  'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=80'
                                }
                                alt={sub.name}
                                className="w-full h-full object-cover object-top group-hover:scale-115 transition-transform duration-500"
                                loading="lazy"
                              />
                            </div>
                          </div>

                          <span className="mt-1.5 text-[10.5px] font-mono font-bold text-neutral-200 group-hover:text-[#00f5d4] transition-colors whitespace-normal break-words leading-tight w-full text-center min-h-[26px] flex items-center justify-center">
                            {sub.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs font-mono text-[#7d8ea7]">
                    No sub-categories found in this category.
                  </div>
                )}
              </div>

              {/* Modal Footer CTA */}
              <div className="pt-3 border-t border-white/10 text-center shrink-0">
                <Link
                  to={`/category/${activeCategory.slug || activeCategory.id}`}
                  onClick={() => setActiveCategory(null)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono font-black text-[#00f5d4] hover:text-[#ff3385] transition-colors uppercase tracking-wider"
                >
                  <span>View All {activeCategory.name}</span>
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