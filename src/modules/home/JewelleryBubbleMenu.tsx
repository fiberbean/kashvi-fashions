import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface CategoryItem {
  id: string;
  name: string;
  slug?: string;
  image_url?: string;
}

const DEFAULT_JEWELLERY_ITEMS: CategoryItem[] = [
  { id: 'j-bangles', name: 'Bangles', slug: 'bangles', image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&q=80' },
  { id: 'j-bridal', name: 'Bridal Jewellery', slug: 'bridal-jewellery', image_url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&q=80' },
  { id: 'j-chains', name: 'Chains', slug: 'chains', image_url: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=300&q=80' },
  { id: 'j-chokers', name: 'Chokers', slug: 'chokers', image_url: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=300&q=80' },
  { id: 'j-earrings', name: 'Earrings', slug: 'earrings', image_url: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=300&q=80' },
  { id: 'j-kundan', name: 'Kundan Sets', slug: 'kundan-sets', image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&q=80' },
  { id: 'j-necklaces', name: 'Necklaces', slug: 'necklaces', image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&q=80' },
  { id: 'j-rings', name: 'Rings', slug: 'rings', image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&q=80' },
  { id: 'j-temple', name: 'Temple Sets', slug: 'temple-sets', image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&q=80' },
];

export default function JewelleryBubbleMenu() {
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_JEWELLERY_ITEMS);
  const [searchParams] = useSearchParams();
  const currentSub = searchParams.get('sub');

  useEffect(() => {
    async function loadCategories() {
      try {
        const [catRes, subRes] = await Promise.all([
          supabase.from('categories').select('*').order('name', { ascending: true }),
          supabase.from('sub_categories').select('*').order('name', { ascending: true })
        ]);

        const catData = catRes.data || [];
        const subData = subRes.data || [];

        const isJewelleryItem = (item: any) => {
          const dept = (item.department || '').toLowerCase().trim();
          const name = (item.name || '').toLowerCase().trim();
          const slug = (item.slug || '').toLowerCase().trim();

          return (
            dept.includes('jewel') ||
            name.includes('jewel') ||
            slug.includes('jewel') ||
            name.includes('bangle') ||
            name.includes('choker') ||
            name.includes('necklace') ||
            name.includes('earring') ||
            name.includes('temple') ||
            name.includes('bridal') ||
            name.includes('chain') ||
            name.includes('ring') ||
            name.includes('kundan') ||
            name.includes('kada') ||
            name.includes('polki')
          );
        };

        const mergedMap = new Map<string, CategoryItem>();

        // 1. Database nunchi match aina sub_categories add cheyadam
        subData.filter(isJewelleryItem).forEach((s: any) => {
          const key = s.name.trim().toLowerCase();
          mergedMap.set(key, {
            id: String(s.id),
            name: s.name.trim(),
            slug: s.slug || s.name.toLowerCase().replace(/\s+/g, '-'),
            image_url: s.image_url || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&q=80',
          });
        });

        // 2. Categories table nunchi add cheyadam
        catData.filter(isJewelleryItem).forEach((c: any) => {
          const key = c.name.trim().toLowerCase();
          if (!mergedMap.has(key)) {
            mergedMap.set(key, {
              id: String(c.id),
              name: c.name.trim(),
              slug: c.slug || c.name.toLowerCase().replace(/\s+/g, '-'),
              image_url: c.image_url || 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&q=80',
            });
          }
        });

        // 3. Database lo items thakkuva unte defaults ni add chesi full catalog ivvadam
        DEFAULT_JEWELLERY_ITEMS.forEach((def) => {
          const key = def.name.toLowerCase();
          if (!mergedMap.has(key)) {
            mergedMap.set(key, def);
          }
        });

        const sortedList = Array.from(mergedMap.values()).sort((a, b) => 
          a.name.localeCompare(b.name)
        );

        if (sortedList.length > 0) {
          setCategories(sortedList);
        }
      } catch (err) {
        console.error('Error loading dynamic jewellery categories:', err);
      }
    }

    loadCategories();
  }, []);

  return (
    <div className="w-full py-2.5 sm:py-4 select-none relative z-10">
      {/* Horizontal non-wrapping smooth touch container */}
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
                {/* Royal Gold Arched Window */}
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

                {/* Multiline Category Label */}
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