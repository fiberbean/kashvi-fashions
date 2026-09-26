import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface CategoryItem {
  id: string;
  name: string;
  slug?: string;
  image_url?: string;
  department?: string;
}

const DEFAULT_FASHION_CATEGORIES: CategoryItem[] = [
  { id: '1', name: 'Sarees', slug: 'sarees', image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80' },
  { id: '2', name: 'Lehengas', slug: 'lehengas', image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&q=80' },
  { id: '3', name: 'Kurtis', slug: 'kurtis', image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&q=80' },
  { id: '4', name: 'Ethnic Wear', slug: 'ethnic-wear', image_url: 'https://images.unsplash.com/photo-1583391733975-01584c2a4f47?w=300&q=80' },
  { id: '5', name: 'Western', slug: 'western', image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&q=80' },
  { id: '6', name: 'Nightwear', slug: 'nightwear', image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&q=80' },
];

export default function FashionBubbleMenu() {
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_FASHION_CATEGORIES);
  const [searchParams] = useSearchParams();
  const currentSub = searchParams.get('sub');

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          const filtered = data.filter((c: any) => {
            if (c.active === false) return false;
            const dept = (c.department || '').toLowerCase().trim();
            const name = (c.name || '').toLowerCase().trim();
            const slug = (c.slug || '').toLowerCase().trim();

            // Jewellery items ni fashion nunchi poorthiga filter out cheyadam
            const isJewel = 
              dept === 'jewellery' || 
              dept.includes('jewel') || 
              name.includes('jewel') || 
              slug.includes('jewel') ||
              name.includes('bangle') ||
              name.includes('choker') ||
              name.includes('necklace') ||
              name.includes('earring');

            return !isJewel;
          });

          if (filtered.length > 0) {
            setCategories(filtered);
          }
        }
      } catch (err) {
        console.error('Error fetching fashion categories:', err);
      }
    }
    loadCategories();
  }, []);

  return (
    <div className="w-full py-2 sm:py-4 select-none relative z-10">
      <div 
        className="w-full overflow-x-auto overflow-y-hidden no-scrollbar px-3 sm:px-6 touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex items-start justify-start md:justify-center gap-3.5 sm:gap-6 min-w-max py-2 px-1">
          {categories.map((cat) => {
            const targetSlug = cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-');
            const isActive = currentSub === targetSlug || currentSub === cat.name;

            return (
              <Link
                key={cat.id}
                to={`/category/${targetSlug}?tab=fashions`}
                className="group shrink-0 flex flex-col items-center w-[72px] sm:w-[88px] text-center cursor-pointer transition-transform active:scale-95"
              >
                <div
                  className={`relative w-full h-[98px] sm:h-[118px] rounded-t-full rounded-b-2xl overflow-hidden bg-stone-100 transition-all duration-300 ${
                    isActive
                      ? 'shadow-[0_10px_25px_rgba(255,45,133,0.45)] ring-2 ring-[#ff2d85]'
                      : 'shadow-[0_6px_18px_rgba(255,182,193,0.38)] group-hover:shadow-[0_10px_25px_rgba(255,140,165,0.55)]'
                  }`}
                >
                  <img
                    src={cat.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80'}
                    alt={cat.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-108"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 via-transparent to-transparent opacity-50 group-hover:opacity-20 transition-opacity" />
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