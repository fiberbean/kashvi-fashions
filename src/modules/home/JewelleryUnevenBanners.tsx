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

const DEFAULT_JEWELLERY_CATEGORIES: CategoryItem[] = [
  { id: 'j1', name: 'Temple Sets', slug: 'temple-sets', image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&q=80' },
  { id: 'j2', name: 'Chokers', slug: 'chokers', image_url: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=300&q=80' },
  { id: 'j3', name: 'Bangles', slug: 'bangles', image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&q=80' },
  { id: 'j4', name: 'Earrings', slug: 'earrings', image_url: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=300&q=80' },
  { id: 'j5', name: 'Bridal Sets', slug: 'bridal-sets', image_url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&q=80' },
  { id: 'j6', name: 'Kundan Sets', slug: 'kundan-sets', image_url: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=300&q=80' },
];

export default function JewelleryBubbleMenu() {
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_JEWELLERY_CATEGORIES);
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
          // Jewellery categories detection
          const jewelCats = data.filter((c: any) => {
            if (c.active === false) return false;
            const dept = (c.department || '').toLowerCase().trim();
            const name = (c.name || '').toLowerCase().trim();
            const slug = (c.slug || '').toLowerCase().trim();

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
              name.includes('chain')
            );
          });

          // Oka vela database lo categories lo direct ga lekapothe sub_categories check cheyadam
          if (jewelCats.length > 0) {
            setCategories(jewelCats);
          } else {
            const { data: subData } = await supabase
              .from('sub_categories')
              .select('*')
              .order('name', { ascending: true });

            if (subData && subData.length > 0) {
              const subJewels = subData.filter((s: any) => {
                if (s.active === false) return false;
                const sDept = (s.department || '').toLowerCase().trim();
                const sName = (s.name || '').toLowerCase().trim();
                return sDept.includes('jewel') || sName.includes('bangle') || sName.includes('necklace') || sName.includes('earring') || sName.includes('choker') || sName.includes('set');
              }).map((s: any) => ({
                id: s.id,
                name: s.name,
                slug: s.slug || s.name.toLowerCase().replace(/\s+/g, '-'),
                image_url: s.image_url || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&q=80',
              }));

              if (subJewels.length > 0) {
                setCategories(subJewels);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching jewellery categories:', err);
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
                to={`/category/${targetSlug}?tab=jewellery`}
                className="group shrink-0 flex flex-col items-center w-[72px] sm:w-[88px] text-center cursor-pointer transition-transform active:scale-95"
              >
                <div
                  className={`relative w-full h-[98px] sm:h-[118px] rounded-t-full rounded-b-2xl overflow-hidden bg-stone-100 transition-all duration-300 ${
                    isActive
                      ? 'shadow-[0_10px_25px_rgba(212,175,55,0.5)] ring-2 ring-[#D4AF37]'
                      : 'shadow-[0_6px_18px_rgba(212,175,55,0.28)] group-hover:shadow-[0_10px_25px_rgba(212,175,55,0.45)]'
                  }`}
                >
                  <img
                    src={cat.image_url || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&q=80'}
                    alt={cat.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-108"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent opacity-50 group-hover:opacity-20 transition-opacity" />
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