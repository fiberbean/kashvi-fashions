import React from "react";
import Link from "next/link";
import { Sparkles, ShoppingBag, Heart } from "lucide-react";

export interface JewelleryItem {
  id: string;
  title: string;
  subtitle?: string | null;
  price: number;
  originalPrice: number;
  purity?: string | null;
  weight?: string | null;
  image: string;
  tag?: string | null;
}

interface JewelleryCardProps {
  item: JewelleryItem;
}

export default function JewelleryCard({ item }: JewelleryCardProps) {
  const discount =
    item.originalPrice > item.price
      ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
      : 0;

  return (
    <div className="group relative rounded-2xl md:rounded-3xl overflow-hidden bg-white border border-neutral-200/80 hover:border-[#0b3b2c]/40 flex flex-col justify-between shadow-xs hover:shadow-xl transition-all duration-300">
      {/* Top Image Canvas with White Foundation & Hover Zoom */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-50">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {/* Floating Top Badges */}
        <div className="absolute top-3 inset-x-3 flex justify-between items-center pointer-events-none">
          {item.purity ? (
            <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest bg-[#0b3b2c] text-[#e5c07b] border border-[#e5c07b]/30 px-2.5 py-0.5 rounded-full shadow-sm">
              <Sparkles className="w-2.5 h-2.5 text-[#e5c07b]" />
              {item.purity}
            </span>
          ) : <span />}

          {item.tag && (
            <span className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-wider bg-white/90 backdrop-blur-md text-[#0b3b2c] border border-neutral-200 px-2 py-0.5 rounded-full shadow-xs">
              {item.tag}
            </span>
          )}
        </div>

        {/* Quick Wishlist Button */}
        <button
          type="button"
          aria-label="Wishlist"
          className="absolute bottom-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-md hover:bg-white text-neutral-700 hover:text-[#ff4d6d] shadow-xs active:scale-90 transition-transform"
        >
          <Heart className="w-4 h-4" />
        </button>
      </div>

      {/* Details Section */}
      <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-grow">
        <div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1 font-medium tracking-wider uppercase">
            <span>Handcrafted</span>
            {item.weight && <span>Net Wt: {item.weight}</span>}
          </div>

          <Link href={`/product/${item.id}`}>
            <h3 className="text-sm sm:text-base font-serif font-bold text-neutral-900 group-hover:text-[#0b3b2c] transition-colors line-clamp-1">
              {item.title}
            </h3>
          </Link>

          {item.subtitle && (
            <p className="text-[11px] sm:text-xs text-neutral-500 mt-0.5 line-clamp-1 font-light">
              {item.subtitle}
            </p>
          )}
        </div>

        {/* Pricing & Action */}
        <div className="mt-3.5 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-bold text-neutral-950 tracking-tight">
                ₹{item.price.toLocaleString("en-IN")}
              </span>
              {item.originalPrice > item.price && (
                <span className="text-[10px] sm:text-xs text-neutral-400 line-through">
                  ₹{item.originalPrice.toLocaleString("en-IN")}
                </span>
              )}
            </div>
            {discount > 0 && (
              <span className="text-[9px] sm:text-[10px] font-bold text-[#b38728]">
                Save {discount}% OFF
              </span>
            )}
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#e5c07b] bg-[#0b3b2c] hover:bg-[#082b20] px-3 py-1.5 rounded-xl shadow-xs active:scale-95 transition-all"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Bag</span>
          </button>
        </div>
      </div>
    </div>
  );
}