"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";
import JewelleryCard, { JewelleryItem } from "@/modules/jewellery/JewelleryCard";

interface SubCategoryBubble {
  id: string;
  name: string;
  image: string;
}

const subCategories: SubCategoryBubble[] = [
  {
    id: "all",
    name: "All Jewels",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&q=80",
  },
  {
    id: "chokers",
    name: "Chokers",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200&q=80",
  },
  {
    id: "jhumkas",
    name: "Jhumkas",
    image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=200&q=80",
  },
  {
    id: "haarams",
    name: "Haarams",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&q=80",
  },
  {
    id: "bangles",
    name: "Kadas & Bangles",
    image: "https://images.unsplash.com/photo-1611591475824-7491d90471b4?w=200&q=80",
  },
  {
    id: "rings",
    name: "Polki Rings",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200&q=80",
  },
];

const jewelleryCatalog: (JewelleryItem & { subCategory: string })[] = [
  {
    id: "jw-1",
    subCategory: "chokers",
    title: "Royal Kundan & Polki Choker",
    subtitle: "Pure Silver Base, 24K Gold Foil & Semi-Precious Stones",
    price: 6499,
    originalPrice: 9999,
    purity: "22K Micron Gold",
    weight: "48.5g",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80",
    tag: "Heritage Pick",
  },
  {
    id: "jw-2",
    subCategory: "jhumkas",
    title: "Antique Temple Nakshi Jhumkas",
    subtitle: "Goddess Lakshmi Motif with Hanging South Sea Pearls",
    price: 3299,
    originalPrice: 4999,
    purity: "Antique Gold Tone",
    weight: "26.0g",
    image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80",
    tag: "Best Seller",
  },
  {
    id: "jw-3",
    subCategory: "haarams",
    title: "Victorian Emerald Floral Haaram",
    subtitle: "Hydro Emerald Drops with Cz Solitaire Accents",
    price: 8999,
    originalPrice: 13999,
    purity: "Rose Gold Polish",
    weight: "58.2g",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
    tag: "Artisan Edition",
  },
  {
    id: "jw-4",
    subCategory: "bangles",
    title: "Heritage South Indian Kada Pair",
    subtitle: "Openable Screw Bangle Set with Ruby Gemstone Inlay",
    price: 4599,
    originalPrice: 6999,
    purity: "22K Micron Gold",
    weight: "34.8g",
    image: "https://images.unsplash.com/photo-1611591475824-7491d90471b4?w=800&q=80",
  },
];

export default function JewelleryPage() {
  const [selectedSub, setSelectedSub] = useState("all");

  const filteredItems =
    selectedSub === "all"
      ? jewelleryCatalog
      : jewelleryCatalog.filter((item) => item.subCategory === selectedSub);

  return (
    <main className="min-h-screen bg-[#001a00] text-white pb-20">
      {/* Top Lounge Bar */}
      <header className="sticky top-0 z-30 bg-[#001a00]/90 backdrop-blur-md border-b border-[#FFD700]/20 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#FFD700] hover:text-yellow-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </Link>
        <span className="text-xs uppercase tracking-[0.25em] font-serif font-bold text-[#FFD700]">
          Kashvi Jewellery Lounge
        </span>
        <div className="w-12 text-right">
          <span className="text-[11px] text-[#FFD700]/80 font-mono">
            {filteredItems.length} Items
          </span>
        </div>
      </header>

      {/* Cinematic Emerald & Gold Hero Section */}
      <section className="relative px-4 md:px-8 pt-8 pb-4 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute -top-16 left-1/4 w-96 h-96 bg-[#006400]/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-1/4 w-72 h-72 bg-[#FFD700]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center max-w-2xl mx-auto relative z-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-[0.3em] text-[#FFD700] bg-[#006400]/80 border border-[#FFD700]/40 px-3.5 py-1 rounded-full mb-2.5 shadow-lg">
            <Sparkles className="w-3 h-3 text-[#FFD700]" />
            Hallmarked Craftsmanship
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#FFD700] tracking-tight leading-tight drop-shadow-sm">
            Royal Heirloom Jewellery
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-lg mx-auto font-light">
            Exquisite Polki, Kundan, and certified Temple jewellery crafted to accompany your finest handloom silks.
          </p>

          <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-[#FFD700]/90">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FFD700]" /> 100% Quality Inspected
            </span>
            <span>•</span>
            <span>Insured Express Delivery</span>
          </div>
        </div>
      </section>

      {/* Sub-Category Story Bubbles Menu */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-5">
        <div className="flex items-center justify-start md:justify-center gap-4 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
          {subCategories.map((sub) => {
            const isActive = selectedSub === sub.id;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSub(sub.id)}
                className="flex flex-col items-center shrink-0 active:scale-95 transition-transform"
              >
                <div
                  className={`w-[66px] h-[66px] rounded-full p-[2.5px] transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-tr from-[#FFD700] via-yellow-200 to-[#FFD700] shadow-md shadow-[#FFD700]/30 scale-105"
                      : "bg-[#006400]/70 border border-[#FFD700]/30 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#001a00] bg-neutral-900">
                    <img
                      src={sub.image}
                      alt={sub.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
                <span
                  className={`text-[11px] mt-1.5 tracking-tight font-medium transition-colors ${
                    isActive
                      ? "text-[#FFD700] font-bold"
                      : "text-neutral-300 hover:text-white"
                  }`}
                >
                  {sub.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Products Grid */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-2">
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredItems.map((item) => (
              <JewelleryCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-[#FFD700]/70 text-sm">
            No jewellery pieces found under this collection.
          </div>
        )}
      </section>
    </main>
  );
}