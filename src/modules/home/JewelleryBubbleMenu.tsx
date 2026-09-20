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
        const [catResponse, subResponse] = await Promise.all([
          supabase.from('categories').select('id, name, slug, department'),
          supabase.from('sub_categories').select('id, name, category_id, category_name, department, image_url, active'),
        ]);

        const catData = catResponse.data || [];
        const subData = subResponse.data || [];

        // 1. Identify all Jewellery Category IDs
        const jewelleryCategoryIds = new Set(
          catData
            .filter((c) => {
              const d = (c.department || '').toLowerCase().trim();
              const n = (c.name || '').toLowerCase().trim();
              const s = (c.slug || '').toLowerCase().trim();
              return d.includes('jewel') || n.includes('jewel') || s.includes('jewel');
            })
            .map((c) => String(c.id).trim())
        );

        // 2. Extract Jewellery Sub-Categories
        let items = subData.filter((sub) => {
          if (sub.active === false) return false;

          const subDept = ((sub as any).department || '').toLowerCase().trim();
          if (subDept.includes('jewel')) return true;

          if (sub.category_id && jewelleryCategoryIds.has(String(sub.category_id).trim())) {
            return true;
          }

          const cName = (sub.category_name || '').toLowerCase().trim();
          if (cName.includes('jewel')) return true;

          // Name-based fallback for jewellery ornaments
          const sName = (sub.name || '').toLowerCase().trim();
          return (
            sName.includes('bangle') ||
            sName.includes('necklace') ||
            sName.includes('earring') ||
            sName.includes('chain') ||
            sName.includes('ring') ||
            sName.includes('chuda') ||
            sName.includes('haram') ||
            sName.includes('choker')
          );
        });

        // 3. Fallback: If still empty, display non-fashion items
        if (items.length === 0 && subData.length > 0) {
          items = subData.filter((sub) => {
            const subDept = ((sub as any).department || '').toLowerCase().trim();
            return !subDept.includes('fashion') && sub.active !== false;
          });
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
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-7 pb-2">
      {/* 1. Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#b38728] font-bold block">
            The Royal Vault
          </span>
          <h3 className="text-lg sm:text-xl font-serif font-bold text-[#0b3b2c] tracking-tight">
            Imperial Heirloom Collections
          </h3>
        </div>
        <span className="text-[11px] text-[#b38728] font-medium tracking-wider uppercase hidden sm:inline-block">
          Explore Vault →
        </span>
      </div>

      {/* 2. Royal Arch Menu */}
      <div className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth">
        {jewelleryItems.map((item) => (
          <Link
            key={item.id}
            to={`/category/jewellery?sub=${encodeURIComponent(item.name)}`}
            className="group shrink-0 flex flex-col items-center w-[108px] sm:w-[122px] text-center transition-all duration-300 active:scale-95 cursor-pointer focus:outline-hidden"
          >
            {/* Royal Arch Frame */}
            <div className="relative w-full h-[142px] sm:h-[155px] rounded-t-[54px] rounded-b-2xl p-1 bg-gradient-to-b from-[#f8f5eb] to-white border border-[#e5c07b]/60 shadow-2xs group-hover:border-[#b38728] group-hover:shadow-md group-hover:shadow-[#0b3b2c]/15 transition-all duration-300 flex flex-col justify-between">
              <div className="w-full h-full rounded-t-[48px] rounded-b-xl overflow-hidden bg-neutral-100 relative">
                <img
                  src={
                    item.image_url ||
                    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80'
                  }
                  alt={item.name}
                  className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-108"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#061e17]/65 via-transparent to-transparent opacity-65 group-hover:opacity-30 transition-opacity" />
              </div>
            </div>

            {/* Clean Category Label */}
            <div className="mt-2.5 w-full px-1">
              <h4 className="text-xs font-serif font-bold text-neutral-900 group-hover:text-[#0b3b2c] transition-colors truncate">
                {item.name}
              </h4>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}