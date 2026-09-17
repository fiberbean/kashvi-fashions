import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Sparkles } from 'lucide-react';

const FASHION_FIXED_BANNERS = [
  {
    id: 1,
    title: 'Heritage Kanchipuram Silks',
    tagline: 'Pure Zari Weaves Handpicked From Master Weavers',
    badge: 'Exclusive Edit',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80',
    link: '/category/fashions?sub=sarees',
    colSpan: 'md:col-span-8',
    height: 'h-[360px] md:h-[440px]',
  },
  {
    id: 2,
    title: 'Designer Lehengas',
    tagline: 'Bridal & Reception Coutures',
    badge: 'Trending',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80',
    link: '/category/fashions?sub=lehengas',
    colSpan: 'md:col-span-4',
    height: 'h-[210px]',
  },
  {
    id: 3,
    title: 'Contemporary Kurtis',
    tagline: 'Boutique Breathable Fabrics',
    badge: 'New Arrivals',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
    link: '/category/fashions?sub=kurtis',
    colSpan: 'md:col-span-4',
    height: 'h-[210px]',
  },
];

export default function FashionUnevenBanners() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[#ff4d6d] font-bold block mb-1">
            Curated Collections
          </span>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-neutral-900 tracking-tight">
            Handcrafted Haute Couture
          </h3>
        </div>
        <Link
          to="/category/fashions"
          className="text-xs font-bold text-neutral-700 hover:text-[#ff4d6d] flex items-center gap-1 transition-colors uppercase tracking-wider group"
        >
          <span>View All</span>
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Fixed Luxury Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Large Feature Banner */}
        <div className={`${FASHION_FIXED_BANNERS[0].colSpan} relative rounded-3xl overflow-hidden border border-neutral-200/80 shadow-xs group bg-neutral-950 ${FASHION_FIXED_BANNERS[0].height}`}>
          <img
            src={FASHION_FIXED_BANNERS[0].image}
            alt={FASHION_FIXED_BANNERS[0].title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-6 md:p-8">
            <span className="inline-flex items-center gap-1.5 self-start text-[9px] uppercase tracking-[0.25em] font-extrabold px-3 py-1 rounded-full bg-[#ff4d6d] text-white shadow-xs mb-2">
              <Sparkles className="w-2.5 h-2.5" />
              {FASHION_FIXED_BANNERS[0].badge}
            </span>
            <h4 className="text-xl sm:text-3xl font-serif font-bold text-white drop-shadow-sm">
              {FASHION_FIXED_BANNERS[0].title}
            </h4>
            <p className="text-xs sm:text-sm text-neutral-200 mt-1 max-w-md font-light">
              {FASHION_FIXED_BANNERS[0].tagline}
            </p>
            <div className="mt-4">
              <Link
                to={FASHION_FIXED_BANNERS[0].link}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-neutral-900 text-xs font-bold uppercase tracking-wider hover:bg-[#ff4d6d] hover:text-white transition-all shadow-md active:scale-95"
              >
                <span>Shop Silk Sarees</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Stacked Fixed Tiles */}
        <div className="md:col-span-4 flex flex-col gap-4">
          {FASHION_FIXED_BANNERS.slice(1).map((banner) => (
            <div
              key={banner.id}
              className={`relative rounded-3xl overflow-hidden border border-neutral-200/80 shadow-xs group bg-neutral-950 ${banner.height}`}
            >
              <img
                src={banner.image}
                alt={banner.title}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-5">
                <span className="inline-block self-start text-[8px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 rounded-full bg-white/90 text-neutral-900 mb-1.5 shadow-xs">
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
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#ff4d6d] hover:text-white uppercase tracking-wider group-hover:underline"
                  >
                    <span>Explore Now</span>
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