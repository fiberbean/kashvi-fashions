import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface CategoryItem {
  id: string;
  name: string;
  slug?: string;
  image_url?: string;
}

export default function FashionBubbleMenu() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const currentSub = searchParams.get('sub');

  useEffect(() => {
    async function loadFashionCategories() {
      setLoading(true);
      try {
        // 1. Categories table nunchi A-Z order lo fetch cheyadam
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .eq('active', true)
          .order('name', { ascending: true });

        // 2. Sub-categories table nunchi kooda fetch cheyadam
        const { data: subData } = await supabase
          .from('sub_categories')
          .select('*')
          .eq('active', true)
          .order('name', { ascending: true });

        const combinedList: CategoryItem[] = [];
        const seenNames = new Set<string>();

        // Categories nunchi jewellery lenivi add cheyadam
        (catData || []).forEach((c: any) => {
          const dept = (c.department || '').toLowerCase().trim();
          const name = (c.name || '').trim();
          const cleanNameLower = name.toLowerCase();

          const isJewel = 
            dept.includes('jewel') || 
            cleanNameLower.includes('jewel') || 
            cleanNameLower.includes('bangle') || 
            cleanNameLower.includes('choker') || 
            cleanNameLower.includes('necklace') || 
            cleanNameLower.includes('earring');

          if (!isJewel && !seenNames.has(cleanNameLower)) {
            seenNames.add(cleanNameLower);
            combinedList.push({
              id: String(c.id),
              name: c.name,
              slug: c.slug || c.name.toLowerCase().replace(/\s+/g, '-'),
              image_url: c.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80',
            });
          }
        });

        // Sub-categories nunchi add cheyadam
        (subData || []).forEach((s: any) => {
          const dept = (s.department || '').toLowerCase().trim();
          const name = (s.name || '').trim();
          const cleanNameLower = name.toLowerCase();

          const isJewel = 
            dept.includes('jewel') || 
            cleanNameLower.includes('jewel') || 
            cleanNameLower.includes('bangle') || 
            cleanNameLower.includes('choker') || 
            cleanNameLower.includes('necklace') || 
            cleanNameLower.includes('earring');

          if (!isJewel && !seenNames.has(cleanNameLower)) {
            seenNames.add(cleanNameLower);
            combinedList.push({
              id: String(s.id),
              name: s.name,
              slug: s.slug || s.name.toLowerCase().replace(/\s+/g, '-'),
              image_url: s.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80',
            });
          }
        });

        // Complete Alphabetical (A to Z) Sorting
        combinedList.sort((a, b) => a.name.localeCompare(b.name));

        setCategories(combinedList);
      } catch (err) {
        console.error('Error loading fashion menu:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFashionCategories();
  }, []);

  return (
    <div className="w-full py-2.5 sm:py-4 select-none relative z-10">
      <div 
        className="w-full overflow-x-auto overflow-y-hidden no-scrollbar px-3 sm:px-6 touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex flex-nowrap items-start justify-start md:justify-center gap-3.5 sm:gap-6 min-w-max py-1.5 px-1">
          {categories.map((cat) => {
            const targetSlug = cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-');
            const isActive = currentSub === targetSlug || currentSub === cat.name;

            return (
              <Link
                key={cat.id}
                to={`/category/${targetSlug}?tab=fashions`}
                className="group shrink-0 flex flex-col items-center w-[74px] sm:w-[88px] text-center cursor-pointer transition-transform active:scale-95"
              >
                <div
                  className={`relative w-full h-[102px] sm:h-[118px] rounded-t-full rounded-b-2xl overflow-hidden bg-stone-100 transition-all duration-300 ${
                    isActive
                      ? 'shadow-[0_10px_25px_rgba(255,45,133,0.45)] ring-2 ring-[#ff2d85]'
                      : 'shadow-[0_6px_18px_rgba(255,182,193,0.38)] group-hover:shadow-[0_10px_25px_rgba(255,140,165,0.55)]'
                  }`}
                >
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-108"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 via-transparent to-transparent opacity-45 group-hover:opacity-15 transition-opacity" />
                </div>

                <div className="mt-1.5 w-full px-0.5 min-h-[30px] flex items-center justify-center">
                  <span
                    className={`block text-[10.5px] sm:text-[11.5px] font-semibold leading-tight text-center tracking-tight transition-colors whitespace-normal break-words ${
                      isActive ? 'text-[#ff2d85]' : 'text-stone-800 group-hover:text-[#ff2d85]'
                    }`}
                  >
                    {cat.name}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}