import React from "react";
import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";

export default function JewelleryUnevenBanners() {
  return (
    <section className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8 bg-white">
      <div className="flex items-end justify-between mb-4 px-1">
        <div>
          <span className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-[#0b3b2c] font-bold block">
            Royal Vault Curations
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-neutral-950 mt-0.5">
            Heirloom Craft Showcase
          </h2>
        </div>
        <Link
          href="/category/CAT-MTO3UY3I"
          className="text-xs text-[#0b3b2c] hover:underline font-semibold hidden sm:inline-flex items-center gap-1"
        >
          View All Vaults <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Editorial Bento Grid (8:4 and 4:8) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
        
        {/* Row 1 - Left: 8-Cols Wide Dominant Choker */}
        <Link
          href="/category/CAT-MTO3UY3I"
          className="md:col-span-8 relative h-64 sm:h-72 md:h-[340px] rounded-2xl md:rounded-3xl overflow-hidden group border border-[#0b3b2c]/15 shadow-sm bg-neutral-900 block"
        >
          <img
            src="https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=1200&q=80"
            alt="Royal Heritage Choker"
            className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-end text-white">
            <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest bg-[#0b3b2c] text-[#e5c07b] border border-[#e5c07b]/30 px-2.5 py-0.5 rounded-full w-fit mb-1.5 shadow-xs">
              <Sparkles className="w-2.5 h-2.5" /> Signature Drop
            </span>
            <h3 className="text-lg sm:text-2xl font-serif font-bold text-white leading-tight">
              24K Gold Foil Polki Chokers
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-300 mt-0.5 max-w-md line-clamp-1 font-light">
              Heritage uncut diamond settings with natural basra pearl drops.
            </p>
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#e5c07b]">
              Explore Collection <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>

        {/* Row 1 - Right: 4-Cols Tall Temple Jhumkas */}
        <Link
          href="/category/CAT-MTO3UY3I"
          className="md:col-span-4 relative h-56 sm:h-72 md:h-[340px] rounded-2xl md:rounded-3xl overflow-hidden group border border-[#0b3b2c]/15 shadow-sm bg-neutral-900 block"
        >
          <img
            src="https://images.unsplash.com/photo-1630019852942-f89202989a59?w=900&q=80"
            alt="Nakshi Temple Jhumkas"
            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between text-white">
            <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-[#e5c07b] bg-[#0b3b2c]/90 border border-[#e5c07b]/30 px-2.5 py-0.5 rounded-full w-fit">
              Temple Craft
            </span>
            <div>
              <h3 className="text-base sm:text-xl font-serif font-bold text-white leading-tight">
                Antique Nakshi Jhumkas
              </h3>
              <p className="text-[10px] sm:text-xs text-neutral-300 mt-0.5 line-clamp-1 font-light">
                South Sea pearls with Goddess motifs.
              </p>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#e5c07b]">
                View Designs <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </Link>

        {/* Row 2 - Left: 4-Cols Compact Kada Sets */}
        <Link
          href="/category/CAT-MTO3UY3I"
          className="md:col-span-4 relative h-56 sm:h-64 md:h-[260px] rounded-2xl md:rounded-3xl overflow-hidden group border border-neutral-200 shadow-xs bg-neutral-900 block"
        >
          <img
            src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&q=80"
            alt="22K Screw Bangles"
            className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-end text-white">
            <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#e5c07b] font-bold mb-1">
              Kadas & Bangles
            </span>
            <h4 className="text-sm sm:text-lg font-serif font-bold text-white leading-tight">
              22K Kada Sets
            </h4>
            <span className="text-[11px] text-[#e5c07b] mt-1 inline-flex items-center gap-0.5 font-semibold">
              Explore Sets <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Row 2 - Right: 8-Cols Wide Statement Haarams */}
        <Link
          href="/category/CAT-MTO3UY3I"
          className="md:col-span-8 relative h-56 sm:h-64 md:h-[260px] rounded-2xl md:rounded-3xl overflow-hidden group border border-neutral-200 shadow-xs bg-neutral-900 block"
        >
          <img
            src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1200&q=80"
            alt="Hydro Emerald Statement Haaram"
            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
          <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-center text-white">
            <span className="text-[9px] uppercase tracking-widest text-[#e5c07b] font-bold">
              Grand Haarams
            </span>
            <h4 className="text-base sm:text-2xl font-serif font-bold text-white mt-0.5">
              Hydro Emerald Statement Sets
            </h4>
            <p className="text-[11px] sm:text-xs text-neutral-300 mt-0.5 max-w-sm line-clamp-1 font-light">
              Opulent multi-layered royal neckpieces with Columbian emeralds.
            </p>
            <span className="text-xs text-[#e5c07b] mt-2 font-medium flex items-center gap-1">
              Browse Bridal Edit <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>

      </div>
    </section>
  );
}