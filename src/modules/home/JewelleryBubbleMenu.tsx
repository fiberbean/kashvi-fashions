import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

        // 1. Identify any category IDs belonging to Jewellery
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

        // 2. Fetch all Jewellery Sub-Categories as Main Menu Items
        let items = subData.filter((sub) => {
          if (sub.active === false) return false;

          // Department check
          const subDept = (sub.department || '').toLowerCase().trim();
          if (subDept.includes('jewel')) return true;

          // Category ID check
          if (sub.category_id && jewelCatIds.has(String(sub.category_id).trim())) return true;

          // Category name check
          const cName = (sub.category_name || '').toLowerCase().trim();
          if (cName.includes('jewel')) return true;

          // Jewellery name keywords check
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

        // Fallback: If no explicit match, exclude strictly fashion items
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
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#0b3b2c]"></div>
      </div>
    );
  }

  if (jewellerySubs.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-7 pb-2 select-none">
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

      {/* 2. Main Track: Jewellery Sub-Categories Direct Menu */}
      <div className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth">
        {jewellerySubs.map((item) => (
          <Link
            key={item.id}
            to={`/category/jewellery?sub=${encodeURIComponent(item.name)}`}
            className="group shrink-0 flex flex-col items-center w-[108px] sm:w-[122px] text-center transition-all duration-300 active:scale-95 cursor-pointer focus:outline-hidden"
          >
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