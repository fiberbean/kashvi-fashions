"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface SubCategory {
  id: string;
  name: string;
  category_id?: string;
  category_name?: string;
  image_url?: string | null;
  active?: boolean;
}

const defaultJewelleryFallback =
  "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=300&q=80";

export default function JewelleryBubbleMenu() {
  const [jewelItems, setJewelItems] = useState<SubCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadJewelleryItems() {
      setIsLoading(true);
      try {
        const { data: subData, error } = await supabase
          .from("sub_categories")
          .select("id, name, category_id, category_name, image_url, active")
          .eq("category_id", "CAT-MTO3UY3I")
          .eq("active", true);

        if (!error && subData && subData.length > 0) {
          setJewelItems(subData);
        } else {
          const { data: allSubs } = await supabase
            .from("sub_categories")
            .select("id, name, category_id, category_name, image_url, active")
            .eq("active", true);

          if (allSubs) {
            setJewelItems(
              allSubs.filter(
                (s) =>
                  s.category_id === "CAT-MTO3UY3I" ||
                  s.category_name?.toLowerCase().includes("jewel")
              )
            );
          }
        }
      } catch (err) {
        console.error("Error loading jewellery items:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadJewelleryItems();
  }, []);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full py-8 flex items-center justify-center text-neutral-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#0b3b2c]" />
        <span className="text-xs">Loading Collections...</span>
      </div>
    );
  }

  if (jewelItems.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 py-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <span className="text-[10px] md:text-xs uppercase tracking-[0.25em] font-bold text-[#0b3b2c] block">
            Royal Vault Directory
          </span>
          <span className="text-xs md:text-sm font-serif font-bold text-neutral-900">
            Explore Collections
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-2">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              aria-label="Scroll left"
              className="p-1.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 active:scale-90 transition-all shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              aria-label="Scroll right"
              className="p-1.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 active:scale-90 transition-all shadow-xs"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <Link
            href="/category/CAT-MTO3UY3I?type=jewellery"
            className="text-xs font-semibold text-[#0b3b2c] hover:underline flex items-center gap-1"
          >
            View All Vaults <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Horizontal Scrollable Pure-Image Bubble Strip */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-3 pt-1 scroll-smooth scrollbar-none no-scrollbar cursor-grab active:cursor-grabbing"
      >
        {jewelItems.map((item) => {
          const displayImage = item.image_url || defaultJewelleryFallback;

          return (
            <Link
              key={item.id}
              href={`/category/${item.id}?type=jewellery`}
              className="flex flex-col items-center shrink-0 group active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[2px] bg-gradient-to-tr from-[#0b3b2c] via-[#b38728] to-[#e5c07b] shadow-xs group-hover:scale-105 group-hover:shadow-md transition-all duration-300">
                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-neutral-100">
                  <img
                    src={displayImage}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              </div>

              <span className="text-[11px] sm:text-xs text-neutral-800 group-hover:text-[#0b3b2c] font-medium mt-1.5 transition-colors text-center max-w-[80px] sm:max-w-[90px] truncate">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}