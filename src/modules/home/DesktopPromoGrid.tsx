import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function DesktopPromoGrid() {
  return (
    <section className="hidden md:block w-full max-w-7xl mx-auto px-6 py-12 bg-white">
      <div className="text-center max-w-xl mx-auto mb-10">
        <span className="text-xs uppercase tracking-[0.3em] text-[#ff4d6d] font-bold">
          Curated Atelier Showcase
        </span>
        <h2 className="text-3xl font-serif font-bold text-neutral-950 mt-1">
          The Kashvi Couture Edit
        </h2>
      </div>

      {/* Main Promo Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Big Promo: Pure Silk Sarees */}
        <Link
          href="/category/sarees"
          className="col-span-7 relative h-[450px] rounded-3xl overflow-hidden group border border-[#ff4d6d]/20 shadow-sm"
        >
          <img
            src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80"
            alt="Handcrafted Silk Sarees"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex flex-col justify-end p-8 text-white">
            <span className="text-xs uppercase tracking-[0.2em] text-[#ff4d6d] font-bold">
              Royal Silk Handlooms
            </span>
            <h3 className="text-2xl font-serif font-bold mt-1 text-white">
              Festive Kanchipuram & Banarasi Elegance
            </h3>
            <p className="text-sm text-neutral-300 mt-1 max-w-md">
              Hand-woven pure zari borders crafted by master handloom weavers across India.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white bg-[#ff4d6d] hover:bg-[#ff3358] px-5 py-2.5 rounded-full w-fit transition-colors shadow-sm">
              Explore Sarees <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Right Promo: Designer Pret */}
        <Link
          href="/category/kurtis"
          className="col-span-5 relative h-[450px] rounded-3xl overflow-hidden group border border-[#ff4d6d]/20 shadow-sm bg-neutral-900"
        >
          <img
            src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80"
            alt="Designer Kurtis"
            className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-6 text-white">
            <span className="text-xs uppercase tracking-[0.2em] text-[#ff4d6d] font-bold">
              Festive Silhouette
            </span>
            <h3 className="text-xl font-serif font-bold mt-1 text-white">
              Embroidered Anarkalis & Festive Kurtis
            </h3>
            <p className="text-xs text-neutral-300 mt-1">
              Graceful ethnic silhouettes curated for intimate festivities and ceremonies.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#ff4d6d] bg-white px-5 py-2.5 rounded-full w-fit hover:bg-neutral-100 transition-all shadow-sm">
              Explore Pret <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </Link>
      </div>

      {/* Secondary Bottom Banners */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        <Link
          href="/category/essentials"
          className="relative h-64 rounded-2xl overflow-hidden group border border-neutral-200"
        >
          <img
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80"
            alt="Comfort Essentials"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex flex-col justify-center p-6 text-white">
            <span className="text-[11px] uppercase tracking-widest text-[#ff4d6d] font-bold">
              Modern Under-Layers
            </span>
            <h4 className="text-xl font-serif font-bold mt-1">Padded Camisoles & Comfort Slips</h4>
            <span className="text-xs text-white mt-2 font-medium flex items-center gap-1 group-hover:text-[#ff4d6d] transition-colors">
              Shop Essentials <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>

        <Link
          href="/category/ready-to-wear"
          className="relative h-64 rounded-2xl overflow-hidden group border border-neutral-200"
        >
          <img
            src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80"
            alt="Contemporary Wear"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex flex-col justify-center p-6 text-white">
            <span className="text-[11px] uppercase tracking-widest text-[#ff4d6d] font-bold">
              Contemporary
            </span>
            <h4 className="text-xl font-serif font-bold mt-1">Ready-To-Wear Designer Sets</h4>
            <span className="text-xs text-white mt-2 font-medium flex items-center gap-1 group-hover:text-[#ff4d6d] transition-colors">
              Shop Ready-To-Wear <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}