import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface JewellerySubCategory {
  id: string;
  name: string;
  category_id?: string | null;
  category_name?: string | null;
  department?: string | null;
  image_url?: string | null;
  active?: boolean | null;
}

export default function JewelleryBubbleMenu() {
  const [jewellerySubs, setJewellerySubs] = useState<JewellerySubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mouse drag states
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);

  // Native wheel horizontal scroll
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
  }, [loading, jewellerySubs]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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

    async function loadJewelleryMenu() {
      setLoading(true);
      try {
        const [catRes, subRes] = await Promise.all([
          supabase.from('categories').select('id, name, slug, department'),
          supabase.from('sub_categories').select('*').order('name'),
        ]);

        const catData: any[] = catRes.data || [];
        const subData: any[] = subRes.data || [];

        const jewelCatIds = new Set(
          catData
            .filter((c) => {
              const d = (c.department || '').toLowerCase().trim();
              const n = (c.name || '').toLowerCase().trim();
              const s = (c.slug || '').toLowerCase().trim();
              return d.includes('jewel') || n.includes('jewel') || s.includes('jewel');
            })
            .map((c) => String(c.id).trim())
        );

        let items = subData.filter((sub) => {
          if (sub.active === false) return false;

          const subDept = (sub.department || '').toLowerCase().trim();
          if (subDept.includes('jewel')) return true;

          if (sub.category_id && jewelCatIds.has(String(sub.category_id).trim())) return true;

          const cName = (sub.category_name || '').toLowerCase().trim();
          if (cName.includes('jewel')) return true;

          const sName = (sub.name || '').toLowerCase().trim();
          return (
            sName.includes('bangle') ||
            sName.includes('necklace') ||
            sName.includes('earring') ||
            sName.includes('chain') ||
            sName.includes('ring') ||
            sName.includes('chuda') ||
            sName.includes('haram') ||
            sName.includes('choker') ||
            sName.includes('pendant') ||
            sName.includes('anklet') ||
            sName.includes('jewel')
          );
        });

        if (items.length === 0 && subData.length > 0) {
          items = subData.filter((sub) => {
            const subDept = (sub.department || '').toLowerCase().trim();
            return !subDept.includes('fashion') && sub.active !== false;
          });
        }

        if (isMounted) {
          setJewellerySubs(items);
        }
      } catch (err) {
        console.error('Error loading jewellery menu:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadJewelleryMenu();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (jewellerySubs.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-3 pb-4 select-none relative z-10 flex flex-col items-center">
      {/* 1. Header Navigation Arrows with Royal Gold Glow */}
      <div className="w-full flex items-center justify-end mb-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="p-1.5 sm:p-2 rounded-full bg-white/95 hover:bg-[#D4AF37] text-stone-700 hover:text-black border-0 transition-all cursor-pointer shadow-[0_4px_14px_rgba(212,175,55,0.4)] hover:shadow-[0_4px_18px_rgba(212,175,55,0.7)] active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="p-1.5 sm:p-2 rounded-full bg-white/95 hover:bg-[#D4AF37] text-stone-700 hover:text-black border-0 transition-all cursor-pointer shadow-[0_4px_14px_rgba(212,175,55,0.4)] hover:shadow-[0_4px_18px_rgba(212,175,55,0.7)] active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* 2. Main Track: Seamless Arched Silhouette with Soft Royal Gold Shadow */}
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
          {jewellerySubs.map((item) => (
            <Link
              key={item.id}
              to={`/category/jewellery?sub=${encodeURIComponent(item.name)}`}
              onClick={(e) => {
                if (hasMoved) e.preventDefault();
              }}
              className="group shrink-0 flex flex-col items-center w-[84px] sm:w-[94px] cursor-pointer active:scale-95 transition-all duration-300 text-center"
            >
              {/* Arched Window Shape */}
              <div className="relative w-full h-[116px] sm:h-[126px] rounded-t-full rounded-b-2xl overflow-hidden bg-stone-100 shadow-[0_8px_20px_rgba(212,175,55,0.38),0_2px_6px_rgba(212,175,55,0.2)] group-hover:shadow-[0_12px_28px_rgba(212,175,55,0.65),0_4px_12px_rgba(212,175,55,0.4)] transition-all duration-300">
                <img
                  src={
                    item.image_url ||
                    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80'
                  }
                  alt={item.name}
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500 ease-out"
                  loading="lazy"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/50 via-transparent to-transparent opacity-40 group-hover:opacity-15 transition-opacity" />
              </div>

              {/* Title Tag with Clean Text Wrap & Equal Height */}
              <div className="mt-2 w-full px-0.5 min-h-[34px] flex items-center justify-center">
                <span className="block text-[10.5px] sm:text-[11px] font-cinzel font-bold text-stone-800 group-hover:text-[#B8860B] transition-colors leading-snug text-center whitespace-normal break-words tracking-wide uppercase">
                  {item.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}