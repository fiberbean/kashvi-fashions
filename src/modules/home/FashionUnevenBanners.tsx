import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function FashionUnevenBanners() {
  return (
    <section className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-6 bg-white">
      <div className="flex items-end justify-between mb-3 md:mb-4 px-1">
        <div>
          <span className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-[#ff4d6d] font-bold block">
            Curated Atelier Edit
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-neutral-950 mt-0.5">
            The Kashvi Couture Showcase
          </h2>
        </div>
        <Link
          href="/category/sarees"
          className="text-xs text-[#ff4d6d] hover:underline hidden sm:inline-flex items-center gap-1 font-semibold"
        >
          View Full Atelier <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Interlocking Editorial Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 md:gap-3.5">
        
        {/* Row 1 - Left: 8-Cols Wide Saree Feature */}
        <Link
          href="/category/sarees"
          className="md:col-span-8 relative h-64 sm:h-72 md:h-[340px] rounded-2xl md:rounded-3xl overflow-hidden group border border-[#ff4d6d]/20 shadow-sm bg-neutral-900 block"
        >
          <img
            src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80"
            alt="Handcrafted Silk Sarees"
            className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex flex-col justify-end p-4 sm:p-6 text-white">
            <span className="text-[9px] uppercase tracking-[0.2em] text-white bg-[#ff4d6d] px-2.5 py-0.5 rounded-full font-bold w-fit mb-1.5 shadow-xs">
              Royal Silk Handlooms
            </span>
            <h3 className="text-lg sm:text-2xl font-serif font-bold text-white leading-tight">
              Festive Kanchipuram & Banarasi Elegance
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-300 mt-0.5 max-w-md line-clamp-1">
              Hand-woven pure zari borders crafted by master weavers across India.
            </p>
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#ff4d6d]">
              Explore Sarees <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>

        {/* Row 1 - Right: 4-Cols Tall Anarkalis */}
        <Link
          href="/category/kurtis"
          className="md:col-span-4 relative h-56 sm:h-72 md:h-[340px] rounded-2xl md:rounded-3xl overflow-hidden group border border-[#ff4d6d]/20 shadow-sm bg-neutral-900 block"
        >
          <img
            src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80"
            alt="Designer Kurtis"
            className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between text-white">
            <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-white bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full w-fit">
              Celebration Pret
            </span>
            <div>
              <h3 className="text-base sm:text-xl font-serif font-bold text-white leading-tight">
                Embroidered Anarkalis & Kurtis
              </h3>
              <p className="text-[10px] sm:text-xs text-neutral-300 mt-0.5 line-clamp-1">
                Handcrafted zardozi detailing with modern drapes.
              </p>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#ff4d6d]">
                Explore Pret <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        </Link>

        {/* Row 2 - Left: 4-Cols Compact Essentials */}
        <Link
          href="/category/essentials"
          className="md:col-span-4 relative h-56 sm:h-64 md:h-[260px] rounded-2xl md:rounded-3xl overflow-hidden group border border-neutral-200 bg-neutral-900 shadow-xs block"
        >
          <img
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80"
            alt="Comfort Essentials"
            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-4 sm:p-6 text-white">
            <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#ff4d6d] font-bold mb-1">
              Under-Layers
            </span>
            <h4 className="text-sm sm:text-lg font-serif font-bold leading-tight text-white">
              Padded Camisoles & Slips
            </h4>
            <span className="text-[11px] text-white mt-1 font-medium flex items-center gap-0.5 group-hover:text-[#ff4d6d] transition-colors">
              Shop <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Row 2 - Right: 8-Cols Wide Ready-To-Wear */}
        <Link
          href="/category/ready-to-wear"
          className="md:col-span-8 relative h-56 sm:h-64 md:h-[260px] rounded-2xl md:rounded-3xl overflow-hidden group border border-neutral-200 bg-neutral-900 shadow-xs block"
        >
          <img
            src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1000&q=80"
            alt="Contemporary Wear"
            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-center text-white">
            <span className="text-[9px] uppercase tracking-widest text-[#ff4d6d] font-bold">
              Contemporary Cuts
            </span>
            <h4 className="text-base sm:text-2xl font-serif font-bold mt-0.5">
              Ready-To-Wear Designer Sets
            </h4>
            <p className="text-[11px] sm:text-xs text-neutral-300 mt-0.5 max-w-sm line-clamp-1">
              Modern silhouettes with heritage weaves for luxury styling.
            </p>
            <span className="text-xs text-white mt-2 font-medium flex items-center gap-1 group-hover:text-[#ff4d6d] transition-colors">
              Shop Ready-To-Wear <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>

      </div>
    </section>
  );
}