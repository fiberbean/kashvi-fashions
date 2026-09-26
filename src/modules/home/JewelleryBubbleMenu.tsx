import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface SubCategoryItem {
  id: string;
  name: string;
  slug?: string;
  image_url?: string;
  category_id?: string;
}

export default function JewelleryBubbleMenu() {
  const [subCategories, setSubCategories] = useState<SubCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const currentSub = searchParams.get('sub');

  useEffect(() => {
    async function loadJewellerySubCategories() {
      setLoading(true);
      try {
        // 1. 'categories' table nunchi Jewellery category ID ni theesukovali
        const { data: catData } = await supabase
          .from('categories')
          .select('id, name, slug')
          .or('name.ilike.%jewel%,slug.ilike.%jewel%');

        let jewelleryCatIds: string[] = [];
        if (catData && catData.length > 0) {
          jewelleryCatIds = catData.map((c: any) => String(c.id));
        }

        // 2. 'sub_categories' table nunchi Jewellery kinda unna Sub-Categories ni Alphabetical order lo thevali
        const { data: subData, error: subError } = await supabase
          .from('sub_categories')
          .select('*')
          .eq('active', true)
          .order('name', { ascending: true });

        if (subError) throw subError;

        if (subData && subData.length > 0) {
          // Jewellery sub categories filter
          const filtered = subData.filter((sub: any) => {
            const matchesCatId = jewelleryCatIds.length > 0 && jewelleryCatIds.includes(String(sub.category_id));
            const dept = (sub.department || '').toLowerCase().trim();
            const catName = (sub.category_name || '').toLowerCase().trim();
            const isJewelDept = dept.includes('jewel') || catName.includes('jewel');

            return matchesCatId || isJewelDept;
          });

          // A to Z sort
          const sortedList = (filtered.length > 0 ? filtered : subData)
            .map((item: any) => ({
              id: String(item.id),
              name: item.name.trim(),
              slug: item.slug || item.name.toLowerCase().replace(/\s+/g, '-'),
              image_url: item.image_url || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&q=80',
            }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));

          setSubCategories(sortedList);
        }
      } catch (err) {
        console.error('Error fetching jewellery sub-categories:', err);
      } finally {
        setLoading(false);
      }
    }

    loadJewellerySubCategories();
  }, []);

  return (
    <div className="w-full py-2.5 sm:py-4 select-none relative z-10">
      <div 
        className="w-full overflow-x-auto overflow-y-hidden no-scrollbar px-3 sm:px-6 touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex flex-nowrap items-start justify-start md:justify-center gap-3.5 sm:gap-6 min-w-max py-1.5 px-1">
          {subCategories.map((sub) => {
            const targetSlug = sub.slug || sub.name.toLowerCase().replace(/\s+/g, '-');
            const isActive = currentSub === targetSlug || currentSub === sub.name;

            return (
              <Link
                key={sub.id}
                to={`/category/jewellery?sub=${encodeURIComponent(sub.name)}&tab=jewellery`}
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
                    src={sub.image_url}
                    alt={sub.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-108"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent opacity-45 group-hover:opacity-15 transition-opacity" />
                </div>

                {/* Sub-Category Name */}
                <div className="mt-1.5 w-full px-0.5 min-h-[30px] flex items-center justify-center">
                  <span
                    className={`block text-[10px] sm:text-[11px] font-cinzel font-bold uppercase leading-tight text-center tracking-tight transition-colors whitespace-normal break-words ${
                      isActive ? 'text-[#b38728]' : 'text-stone-800 group-hover:text-[#b38728]'
                    }`}
                  >
                    {sub.name}
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