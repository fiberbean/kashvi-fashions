import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface JewelleryItem {
  id: string;
  name: string;
  category_id: string | null;
  image_url: string | null;
  active: boolean | null;
}

// ఇన్‌స్టంట్ లోడింగ్ కోసం గ్లోబల్ ఇన్-మెమరీ క్యాష్
let jewelleryCache: JewelleryItem[] | null = null;

export default function JewelleryBubbleMenu() {
  const [jewelleryItems, setJewelleryItems] = useState<JewelleryItem[]>(jewelleryCache || []);
  const [loading, setLoading] = useState(!jewelleryCache);

  useEffect(() => {
    let isMounted = true;

    async function fetchJewelleryData() {
      if (jewelleryCache && jewelleryCache.length > 0) {
        setJewelleryItems(jewelleryCache);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // రెండు క్వెరీలను ఏకకాలంలో పారలెల్‌గా కాల్ చేయడం
        const [catResponse, subResponse] = await Promise.all([
          supabase
            .from('categories')
            .select('id, name, slug, department')
            .or('slug.eq.jewellery,name.ilike.%jewellery%,department.eq.jewellery'),
          supabase
            .from('sub_categories')
            .select('id, name, category_id, category_name, image_url, active')
            .eq('active', true),
        ]);

        const catData = catResponse.data || [];
        const subData = subResponse.data || [];

        const jewelleryCategoryIds = catData.map((c) => c.id);

        let items: JewelleryItem[] = [];

        if (subData.length > 0) {
          items = subData.filter((sub) => {
            const matchesId = sub.category_id && jewelleryCategoryIds.includes(sub.category_id);
            const matchesName = sub.category_name && sub.category_name.toLowerCase().includes('jewellery');
            return matchesId || matchesName;
          });

          if (items.length === 0 && catData.length > 0) {
            items = subData;
          }
        }

        jewelleryCache = items;
        if (isMounted) setJewelleryItems(items);
      } catch (err) {
        console.error('Error fetching jewellery items:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchJewelleryData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#0b3b2c]"></div>
      </div>
    );
  }

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 overflow-x-auto no-scrollbar relative">
      <div className="flex items-center gap-4 sm:gap-6 min-w-max md:justify-center">
        {jewelleryItems.map((item) => (
          <Link
            key={item.id}
            to={`/category/jewellery?sub=${encodeURIComponent(item.name)}`}
            className="flex flex-col items-center gap-2 group text-center cursor-pointer focus:outline-hidden"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-[#0b3b2c]/30 group-hover:border-[#b38728] p-0.5 transition-all shadow-xs group-hover:scale-105 bg-neutral-50">
              <img
                src={
                  item.image_url ||
                  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&q=80'
                }
                alt={item.name}
                className="w-full h-full object-cover rounded-full"
                loading="eager"
              />
            </div>
            <span className="text-xs font-medium text-neutral-800 group-hover:text-[#0b3b2c] transition-colors">
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}