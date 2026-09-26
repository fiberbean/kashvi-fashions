import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface CategoryItem {
  id: string;
  name: string;
  slug?: string;
  image_url?: string;
}

export default function JewelleryBubbleMenu() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const currentSub = searchParams.get('sub');

  useEffect(() => {
    async function loadJewelleryCategories() {
      setLoading(true);
      try {
        // 1. Fetch categories
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .eq('active', true)
          .order('name', { ascending: true });

        // 2. Fetch sub_categories
        const { data: subData } = await supabase
          .from('sub_categories')
          .select('*')
          .eq('active', true)
          .order('name', { ascending: true });

        const combinedList: CategoryItem[] = [];
        const seenNames = new Set<string>();

        const isJewelleryItem = (item: any) => {
          const dept = (item.department || '').toLowerCase().trim();
          const name = (item.name || '').toLowerCase().trim();
          const slug = (item.slug || '').toLowerCase().trim();

          return (
            dept === 'jewellery' ||
            dept.includes('jewel') ||
            name.includes('jewel') ||
            slug.includes('jewel') ||
            name.includes('temple') ||
            name.includes('choker') ||
            name.includes('bangle') ||
            name.includes('earring') ||
            name.includes('bridal') ||
            name.includes('kundan') ||
            name.includes('necklace') ||
            name.includes('ring') ||
            name.includes('chain') ||
            name.includes('kada') ||
            name.includes('har') ||
            name.includes('polki')
          );
        };

        // Sub categories nunchi add cheyadam
        (subData || []).forEach((s: any) => {
          if (isJewelleryItem(s)) {
            const cleanNameLower = s.name.trim().toLowerCase();
            if (!seenNames.has(cleanNameLower)) {
              seenNames.add(cleanNameLower);
              combinedList.push({
                id: String(s.id),
                name: s.name.trim(),
                slug: s.slug || s.name.toLowerCase().replace(/\s+/g, '-'),
                image_url: s.image_url || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&q=80',
              });
            }
          }
        });

        // Categories nunchi kooda add cheyadam
        (catData || []).forEach((c: any) => {
          if (isJewelleryItem(c)) {
            const cleanNameLower = c.name.trim().toLowerCase();
            if (!seenNames.has(cleanNameLower)) {
              seenNames.add(cleanNameLower);
              combinedList.push({
                id: String(c.id),
                name: c.name.trim(),
                slug: c.slug || c.name.toLowerCase().replace(/\s+/g, '-'),
                image_url: c.image_url || 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&q=80',
              });
            }
          }
        });

        // Complete Alphabetical (A to Z) Sorting
        combinedList.sort((a, b) => a.name.localeCompare(b.name));

        setCategories(combinedList);
      } catch (err) {
        console.error('Error loading jewellery menu:', err);
      } finally {
        setLoading(false);
      }
    }

    loadJewelleryCategories();
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
                to={`/category/${targetSlug}?tab=jewellery`}
                className="group shrink-0 flex flex-col items-center w-[74px] sm:w-[88px] text-center cursor-pointer transition-transform active:scale-95"
              >
                <div
                  className={`relative w-full h-[102px] sm:h-[118px] rounded-t-full rounded-b-2xl overflow-hidden bg-stone-100 transition-all duration-300 ${
                    isActive
                      ? 'shadow-[0_10px_25px_rgba(212,175,55,0.5)] ring-2 ring-[#D4AF37]'
                      : 'shadow-[0_6px_18px_rgba(212,175,55,0.28)] group-hover:shadow-[0_10px_25px_rgba(212,175,55,0.45)]'
                  }`}
                >
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-108"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent opacity-45 group-hover:opacity-15 transition-opacity" />
                </div>

                <div className="mt-1.5 w-full px-0.5 min-h-[30px] flex items-center justify-center">
                  <span
                    className={`block text-[10px] sm:text-[11px] font-cinzel font-bold uppercase leading-tight text-center tracking-tight transition-colors whitespace-normal break-words ${
                      isActive ? 'text-[#b38728]' : 'text-stone-800 group-hover:text-[#b38728]'
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