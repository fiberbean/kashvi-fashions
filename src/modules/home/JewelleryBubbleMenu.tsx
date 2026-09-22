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
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.6;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e5c07b]"></div>
      </div>
    );
  }

  if (jewellerySubs.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-2 pb-3 select-none relative z-10">
      {/* 1. Header Navigation Arrows */}
      <div className="flex items-center justify-end mb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="p-1.5 rounded-lg bg-[#061e17]/90 hover:bg-[#e5c07b] text-[#e5c07b] hover:text-[#061e17] border border-[#e5c07b]/30 transition-all cursor-pointer shadow-md active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="p-1.5 rounded-lg bg-[#061e17]/90 hover:bg-[#e5c07b] text-[#e5c07b] hover:text-[#061e17] border border-[#e5c07b]/30 transition-all cursor-pointer shadow-md active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 2. Main Track: Centered Hanging Gold Ring Displays */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex items-start justify-start md:justify-center gap-3.5 sm:gap-4 overflow-x-auto pb-3 pt-4 px-2 focus:outline-none scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {jewellerySubs.map((item, idx) => {
          const tilts = ['rotate-[-1.5deg]', 'rotate-[1.5deg]', 'rotate-[-1deg]', 'rotate-[1.2deg]'];
          const hangTilt = tilts[idx % tilts.length];

          return (
            <Link
              key={item.id}
              to={`/category/jewellery?sub=${encodeURIComponent(item.name)}`}
              className={`group shrink-0 flex flex-col items-center w-[88px] sm:w-[98px] text-center transition-all duration-300 active:scale-95 cursor-pointer focus:outline-hidden ${hangTilt} hover:rotate-0 hover:scale-105 hover:z-20`}
            >
              {/* Hanging Structure with Top Gold Ring */}
              <div className="relative w-full flex flex-col items-center pt-2.5">
                {/* Wall Pin Stud */}
                <div className="absolute -top-2.5 w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-30 border border-[#b38728] flex items-center justify-center">
                  <div className="w-0.5 h-0.5 rounded-full bg-[#3d2c0b]" />
                </div>

                {/* Hanging Gold Ring */}
                <div
                  className="absolute -top-2 w-6 h-6 rounded-full border-[2.5px] border-[#e5c07b] bg-transparent shadow-[0_2px_8px_rgba(229,192,123,0.45),inset_0_1px_2px_rgba(255,255,255,0.7)] z-20 group-hover:shadow-[0_0_12px_#e5c07b] transition-all"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(0,0,0,0) 55%, rgba(180,135,40,0.35) 100%)',
                  }}
                />

                {/* Small Hanging Link */}
                <div className="absolute top-2.5 w-1 h-2 bg-gradient-to-b from-[#e5c07b] to-[#b38728] rounded-xs shadow-xs z-25" />

                {/* Compact Jewellery Portrait Frame */}
                <div className="relative w-full h-[98px] sm:h-[108px] rounded-lg p-[1.5px] bg-gradient-to-b from-[#e5c07b] via-[#946e20] to-[#e5c07b] shadow-[0_8px_18px_rgba(0,0,0,0.85)] group-hover:shadow-[0_12px_22px_rgba(229,192,123,0.3)] transition-all duration-300 flex flex-col mt-1.5">
                  <div className="w-full h-full rounded-[6px] overflow-hidden bg-[#061e17] relative border border-[#0b3b2c] pointer-events-none">
                    <img
                      src={
                        item.image_url ||
                        'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80'
                      }
                      alt={item.name}
                      className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-110 filter brightness-95 group-hover:brightness-105"
                      loading="lazy"
                      draggable={false}
                    />

                    {/* Royal Shadow Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#04120e]/90 via-transparent to-transparent opacity-75 group-hover:opacity-30 transition-opacity" />

                    {/* Royal Gold Inner Rim */}
                    <div className="absolute inset-0 border border-[#e5c07b]/30 rounded-[6px] pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Title Tag */}
              <div className="mt-2 w-full px-0.5 pointer-events-none min-h-[26px] flex items-center justify-center">
                <span className="block text-[10px] font-serif font-bold text-[#f5ebd7] group-hover:text-[#e5c07b] transition-colors whitespace-normal break-words leading-tight bg-[#061e17]/95 border border-[#e5c07b]/30 group-hover:border-[#e5c07b] py-0.5 px-1 rounded-sm shadow-[0_3px_8px_rgba(0,0,0,0.8)] text-center w-full">
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}