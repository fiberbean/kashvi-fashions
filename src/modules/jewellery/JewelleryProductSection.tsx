"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import JewelleryCard, { JewelleryItem } from "./JewelleryCard";

export default function JewelleryProductSection() {
  const [products, setProducts] = useState<JewelleryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      try {
        // Supabase products table nunchi jewellery products fetch cheddam
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .or("category.ilike.%jewel%,department.ilike.%jewel%")
          .limit(8);

        if (!error && data && data.length > 0) {
          const formatted: JewelleryItem[] = data.map((p: any) => ({
            id: String(p.id),
            title: p.title || p.name || "Royal Masterpiece",
            subtitle: p.subtitle || p.description || "Handcrafted Heritage Design",
            price: Number(p.price) || 0,
            originalPrice: Number(p.original_price || p.originalPrice) || Number(p.price) || 0,
            purity: p.purity || "22K Gold",
            weight: p.weight || "32.4g",
            image:
              p.image ||
              p.image_url ||
              (p.images && p.images[0]) ||
              "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80",
            tag: p.tag || "Royal Drop",
          }));
          setProducts(formatted);
        } else {
          // Fallback static items if products table is currently empty
          setProducts([
            {
              id: "jewel-1",
              title: "Royal 24K Gold Foil Polki Choker",
              subtitle: "Silver Base, Hydro Emerald Beads & Basra Pearls",
              price: 8499,
              originalPrice: 12999,
              purity: "24K Foil",
              weight: "42.5g",
              image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80",
              tag: "Signature Drop",
            },
            {
              id: "jewel-2",
              title: "Antique Temple Nakshi Lakshmi Jhumkas",
              subtitle: "Goddess Motif with South Sea Pearl Bell Drops",
              price: 3499,
              originalPrice: 5299,
              purity: "22K Polish",
              weight: "21.0g",
              image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80",
              tag: "Bestseller",
            },
            {
              id: "jewel-3",
              title: "Grand Victorian Hydro Emerald Haaram",
              subtitle: "Multi-layered Columbian Emerald Accents",
              price: 12999,
              originalPrice: 18999,
              purity: "Victorian Polish",
              weight: "68.2g",
              image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
              tag: "Bridal Heirloom",
            },
            {
              id: "jewel-4",
              title: "Royal Nakshi Screw Kada Pair",
              subtitle: "Heavy Floral Carving with Openable Mechanism",
              price: 5499,
              originalPrice: 7999,
              purity: "22K Gold Tone",
              weight: "36.8g",
              image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80",
            },
          ]);
        }
      } catch (err) {
        console.error("Error loading jewellery items:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 bg-white">
      <div className="flex items-end justify-between mb-4 px-1">
        <div>
          <span className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-[#0b3b2c] font-bold block">
            Featured Curations
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-neutral-950 mt-0.5">
            Royal Heirloom Pieces
          </h2>
        </div>
        <Link
          href="/category/jewellery"
          className="text-xs text-[#0b3b2c] hover:underline font-semibold flex items-center gap-1"
        >
          View Full Vault <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="w-full py-12 flex items-center justify-center text-neutral-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#0b3b2c]" />
          <span className="text-xs">Loading Vault Pieces...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {products.map((item) => (
            <JewelleryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}