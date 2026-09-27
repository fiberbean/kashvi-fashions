import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface SubCategoryItem {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  display_order: number;
}

export default function JewelleryBubbleMenu() {
  const [subCategories, setSubCategories] = useState<SubCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const currentSub = searchParams.get('sub');

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadJewellerySubCategoriesDirectly() {
      setLoading(true);
      try {
        // Step 1: categories table nunchi Jewellery category id thesukuntam
        // (department column DB lo lekapoyina, name/slug based ga idi reliable)
        const { data: catList } = await supabase
          .from('categories')
          .select('id, name, slug');

        const jewelIds = new Set<string>();
        (catList || []).forEach((c: any) => {
          const name = (c.name || '').toLowerCase().trim();
          const slug = (c.slug || '').toLowerCase().trim();
          if (name.includes('jewel') || slug.includes('jewel')) {
            jewelIds.add(String(c.id));
          }
        });

        // Step 2: sub_categories table nunchi all active records query chestham
        const { data: subData, error: subErr } = await supabase
          .from('sub_categories')
          .select('id, name, slug, image_url, display_order, active, category_id, category_name')
          .eq('active', true)
          .order('display_order', { ascending: true });

        if (subErr) throw subErr;

        if (isMounted && subData) {
          const list: SubCategoryItem[] = subData
            .filter((item) => {
              const cleanName = (item.name || '').trim().toLowerCase();
              const cleanSlug = (item.slug || '').trim().toLowerCase();
              const cId = String(item.category_id || '').trim();

              // Only show active sub-categories actually linked
              // to the Jewellery parent through category_id.
              if (!cId || !jewelIds.has(cId)) {
                return false;
              }

              // Hide the parent Jewellery category itself.
              // "Jewellery Sets" is intentionally kept.
              if (
                cleanName === 'jewellery' ||
                cleanName === 'jewelry' ||
                cleanSlug === 'jewellery' ||
                cleanSlug === 'jewelry'
              ) {
                return false;
              }

              return Boolean((item.name || '').trim());
            })
            .map((item) => ({
              id: String(item.id),
              name: item.name.trim(),
              slug: item.slug || item.name.trim().toLowerCase().replace(/\s+/g, '-'),
              image_url:
                item.image_url ||
                'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&q=80',
              display_order: item.display_order ?? 0,
            }));

          setSubCategories(list);
        }
      } catch (err) {
        console.error('Error loading subcategories from DB:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadJewellerySubCategoriesDirectly();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || subCategories.length === 0) {
    return null;
  }

  return (
    <div className="w-full py-2.5 sm:py-4 select-none relative z-10">
      {/* Horizontal non-wrapping smooth touch container */}
      <div 
        className="w-full overflow-x-auto overflow-y-hidden no-scrollbar px-3 sm:px-6 touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex flex-nowrap items-start justify-start md:justify-center gap-3.5 sm:gap-6 min-w-max mx-auto py-1.5 px-2">
          {subCategories.map((sub) => {
            const targetSlug = sub.slug || sub.name.toLowerCase().replace(/\s+/g, '-');
            const isActive = currentSub === targetSlug || currentSub === sub.name;

            return (
              <Link
                key={sub.id}
                to={`/category/${targetSlug}?tab=jewellery&sub=${encodeURIComponent(sub.name)}`}
                onClick={triggerHaptic}
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

                {/* Multiline Category Label */}
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
