import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Crown, Sparkles } from 'lucide-react';

const JEWELLERY_FIXED_BANNERS = [
  {
    id: 1,
    title: 'Certified Antique Temple Sets',
    tagline: '22K Gold Heritage Craftsmanship with Natural Rubies & Pearls',
    badge: 'Imperial Vault',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1000&q=80',
    link: '/category/jewellery?sub=temple',
    colSpan: 'md:col-span-8',
    height: 'h-[360px] md:h-[440px]',
  },
  {
    id: 2,
    title: 'Polki & Kundan Chokers',
    tagline: 'Regal Wedding Masterpieces',
    badge: 'Bridal Pick',
    image: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=800&q=80',
    link: '/category/jewellery?sub=choker-sets',
    colSpan: 'md:col-span-4',
    height: 'h-[210px]',
  },
  {
    id: 3,
    title: 'Heirloom Bangles & Kadas',
    tagline: 'Timeless Carved Filigree Work',
    badge: 'Artisanal',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
    link: '/category/jewellery?sub=bangles',
    colSpan: 'md:col-span-4',
    height: 'h-[210px]',
  },
];

export default function JewelleryUnevenBanners() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[#b38728] font-bold block mb-1">
            Royal Vault Showcase
          </span>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#0b3b2c] tracking-tight">
            Imperial Heirloom Jewellery
          </h3>
        </div>
        <Link
          to="/category/jewellery"
          className="text-xs font-bold text-neutral-700 hover:text-[#0b3b2c] flex items-center gap-1 transition-colors uppercase tracking-wider group"
        >
          <span>View Vault</span>
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Fixed Royal Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Large Feature Banner */}
        <div className={`${JEWELLERY_FIXED_BANNERS[0].colSpan} relative rounded-3xl overflow-hidden border border-[#0b3b2c]/20 shadow-xs group bg-[#061e17] ${JEWELLERY_FIXED_BANNERS[0].height}`}>
          <img
            src={JEWELLERY_FIXED_BANNERS[0].image}
            alt={JEWELLERY_FIXED_BANNERS[0].title}
            className="w-full h-full object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#061e17]/95 via-[#061e17]/40 to-transparent flex flex-col justify-end p-6 md:p-8">
            <span className="inline-flex items-center gap-1.5 self-start text-[9px] uppercase tracking-[0.25em] font-extrabold px-3 py-1 rounded-full bg-[#0b3b2c] border border-[#e5c07b]/40 text-[#e5c07b] shadow-xs mb-2">
              <Crown className="w-2.5 h-2.5" />
              {JEWELLERY_FIXED_BANNERS[0].badge}
            </span>
            <h4 className="text-xl sm:text-3xl font-serif font-bold text-white drop-shadow-sm">
              {JEWELLERY_FIXED_BANNERS[0].title}
            </h4>
            <p className="text-xs sm:text-sm text-[#e5c07b]/90 mt-1 max-w-md font-light">
              {JEWELLERY_FIXED_BANNERS[0].tagline}
            </p>
            <div className="mt-4">
              <Link
                to={JEWELLERY_FIXED_BANNERS[0].link}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#e5c07b] text-[#0b3b2c] text-xs font-bold uppercase tracking-wider hover:bg-white transition-all shadow-md active:scale-95"
              >
                <span>Explore Antique Vault</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Stacked Fixed Tiles */}
        <div className="md:col-span-4 flex flex-col gap-4">
          {JEWELLERY_FIXED_BANNERS.slice(1).map((banner) => (
            <div
              key={banner.id}
              className={`relative rounded-3xl overflow-hidden border border-[#0b3b2c]/20 shadow-xs group bg-[#061e17] ${banner.height}`}
            >
              <img
                src={banner.image}
                alt={banner.title}
                className="w-full h-full object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#061e17]/90 via-[#061e17]/30 to-transparent flex flex-col justify-end p-5">
                <span className="inline-block self-start text-[8px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 rounded-full bg-[#0b3b2c] border border-[#e5c07b]/30 text-[#e5c07b] mb-1.5 shadow-xs">
                  {banner.badge}
                </span>
                <h4 className="text-base sm:text-lg font-serif font-bold text-white leading-tight drop-shadow-sm">
                  {banner.title}
                </h4>
                <p className="text-[11px] text-neutral-300 line-clamp-1 mt-0.5">
                  {banner.tagline}
                </p>
                <div className="mt-2.5">
                  <Link
                    to={banner.link}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#e5c07b] hover:text-white uppercase tracking-wider group-hover:underline"
                  >
                    <span>View Collection</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}