import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface BannerItem {
  id: string;
  title: string;
  tagline: string;
  slug: string;
  image: string;
  pillText: string;
}

const fashionEditorialBanners: BannerItem[] = [
  {
    id: "sarees",
    title: "The Kanchipuram Weaves",
    tagline: "Pure Mulberry Silk & Authentic Silver-Gilded Zari",
    slug: "sarees",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&q=80",
    pillText: "Handloom Heritage",
  },
  {
    id: "kurtis",
    title: "Festive Pret & Kurtis",
    tagline: "Handcrafted Zardozi Detailing with Modern Drapes",
    slug: "kurtis",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=900&q=80",
    pillText: "Celebration Edit",
  },
  {
    id: "essentials",
    title: "Seamless Comfort Essentials",
    tagline: "Ultra-soft Breathable Cotton, Slips & Padded Tops",
    slug: "essentials",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80",
    pillText: "Daily Luxury",
  },
  {
    id: "ready-to-wear",
    title: "Couture Ready-To-Wear",
    tagline: "Contemporary Silhouettes Crafted for Festive Elegance",
    slug: "ready-to-wear",
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=900&q=80",
    pillText: "Designer Edit",
  },
];

export default function MobileCategoryList() {
  return (
    <section className="w-full md:hidden px-4 pt-2 pb-12 bg-white">
      <div className="flex items-baseline justify-between mb-4">
        <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-[#ff4d6d]">
          Couture Collections
        </span>
        <span className="text-[11px] font-medium text-neutral-400">
          Handcrafted
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {fashionEditorialBanners.map((banner) => (
          <Link
            key={banner.id}
            href={`/category/${banner.slug}`}
            className="group relative h-48 w-full rounded-3xl overflow-hidden shadow-sm border border-[#ff4d6d]/20 active:scale-[0.98] transition-transform duration-200 block bg-neutral-900"
          >
            <img
              src={banner.image}
              alt={banner.title}
              className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

            <div className="absolute inset-0 p-5 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider bg-[#ff4d6d] text-white px-3 py-1 rounded-full w-fit shadow-xs">
                {banner.pillText}
              </span>

              <div>
                <h3 className="text-lg font-serif font-bold text-white">
                  {banner.title}
                </h3>
                <p className="text-xs text-neutral-200 mt-0.5 line-clamp-1 font-light">
                  {banner.tagline}
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#ff4d6d]">
                  Explore Wardrobe <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}