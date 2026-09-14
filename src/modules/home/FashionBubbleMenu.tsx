"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Category {
  id: string;
  name: string;
  image_url?: string | null;
  active: boolean;
}

interface SubCategory {
  id: string;
  name: string;
  category_id: string;
  category_name?: string;
  image_url?: string | null;
}

export default function FashionBubbleMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const subCircleScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const { data: catData } = await supabase
          .from("categories")
          .select("id, name, image_url, active")
          .eq("active", true)
          .not("name", "ilike", "%jewel%");

        const { data: subData } = await supabase
          .from("sub_categories")
          .select("id, name, category_id, category_name, image_url, active")
          .eq("active", true);

        if (isMounted) {
          if (catData && catData.length > 0) {
            setCategories(catData);
            setActiveCategoryId(catData[0].id);
          }
          if (subData) {
            setSubCategories(subData);
          }
        }
      } catch (err) {
        console.error("Error loading fashion categories:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleMainScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleSubScroll = (direction: "left" | "right") => {
    if (subCircleScrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      subCircleScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const selectedCategory =
    categories.find((c) => c.id === activeCategoryId) || categories[0];

  const currentSubCategories = subCategories.filter((sub) => {
    if (!selectedCategory) return false;
    const subCatId = String(sub.category_id || "").trim();
    const subCatName = String(sub.category_name || "").trim().toLowerCase();
    const activeId = String(selectedCategory.id || "").trim();
    const activeName = String(selectedCategory.name || "").trim().toLowerCase();

    return subCatId === activeId || subCatName === activeName;
  });

  if (isLoading) {
    return (
      <div className="w-full py-6 flex items-center justify-center text-neutral-400 bg-white">
        <Loader2 className="w-4 h-4 animate-spin mr-2 text-[#ff4d6d]" />
        <span className="text-xs">Loading Collections...</span>
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 py-4 bg-white">
      {/* Level 1 Header: Main Departments */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <span className="text-[10px] md:text-xs uppercase tracking-[0.25em] font-bold text-[#ff4d6d] block">
            Couture Directory
          </span>
          <span className="text-xs md:text-sm font-serif font-bold text-neutral-900">
            Browse By Department
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 mr-2">
            <button
              type="button"
              onClick={() => handleMainScroll("left")}
              aria-label="Scroll left"
              className="p-1.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 active:scale-90 transition-all shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMainScroll("right")}
              aria-label="Scroll right"
              className="p-1.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 active:scale-90 transition-all shadow-xs"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedCategory && (
            <Link
              href={`/category/${selectedCategory.id}?type=fashion`}
              className="text-xs font-semibold text-[#ff4d6d] hover:underline flex items-center gap-1"
            >
              View All {selectedCategory.name} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Main Categories Bubbles */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-4 md:gap-7 overflow-x-auto pb-2 scrollbar-none no-scrollbar justify-start md:justify-center touch-pan-x"
      >
        {categories.map((category) => {
          const isSelected = activeCategoryId === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategoryId(category.id)}
              className="flex flex-col items-center shrink-0 group active:scale-95 transition-transform outline-none focus:outline-none"
            >
              <div
                className={`w-16 h-16 md:w-20 md:h-20 rounded-full p-[2.5px] transition-all duration-300 ${
                  isSelected
                    ? "bg-[#ff4d6d] shadow-md shadow-[#ff4d6d]/30 scale-105"
                    : "bg-neutral-200 hover:bg-[#ff4d6d]/40"
                }`}
              >
                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-neutral-50 flex items-center justify-center">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <span className="font-serif font-bold text-sm text-[#ff4d6d]">
                      {category.name.charAt(0)}
                    </span>
                  )}
                </div>
              </div>

              <span
                className={`text-[11px] md:text-xs font-medium mt-1.5 transition-colors text-center max-w-[80px] md:max-w-[90px] truncate ${
                  isSelected ? "text-[#ff4d6d] font-bold" : "text-neutral-700"
                }`}
              >
                {category.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* ================= LEVEL 2: ENLARGED SUB-CATEGORY BUBBLE CIRCLES ================= */}
      {selectedCategory && (
        <div className="mt-5 pt-4 border-t border-neutral-100 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#ff4d6d]" />
              <h3 className="text-sm sm:text-base font-serif font-bold text-neutral-950 tracking-wide">
                {selectedCategory.name} Collection
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {currentSubCategories.length > 4 && (
                <div className="hidden sm:flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSubScroll("left")}
                    aria-label="Scroll sub-categories left"
                    className="p-1.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 active:scale-90 shadow-2xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubScroll("right")}
                    aria-label="Scroll sub-categories right"
                    className="p-1.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 active:scale-90 shadow-2xs"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <Link
                href={`/category/${selectedCategory.id}?type=fashion`}
                className="text-xs font-semibold text-[#ff4d6d] hover:underline flex items-center gap-1"
              >
                Explore All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Sub-Category Circles */}
          {currentSubCategories.length > 0 ? (
            <div
              ref={subCircleScrollRef}
              className="flex items-center gap-4 sm:gap-7 overflow-x-auto pb-2 pt-1 scrollbar-none no-scrollbar scroll-smooth touch-pan-x"
            >
              {currentSubCategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/category/${sub.id}?type=fashion`}
                  className="flex flex-col items-center shrink-0 group active:scale-95 transition-transform outline-none"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[3px] bg-gradient-to-tr from-[#ff4d6d] via-[#ffb3c1] to-[#ff4d6d]/30 shadow-sm group-hover:scale-105 group-hover:shadow-lg transition-all duration-300">
                    <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-neutral-50 flex items-center justify-center">
                      {sub.image_url ? (
                        <img
                          src={sub.image_url}
                          alt={sub.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <span className="font-serif font-bold text-lg sm:text-xl text-[#ff4d6d]">
                          {sub.name.charAt(0)}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-xs sm:text-sm font-medium text-neutral-800 group-hover:text-[#ff4d6d] mt-2 text-center max-w-[90px] sm:max-w-[100px] truncate transition-colors">
                    {sub.name}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-3 text-center text-xs text-neutral-400 font-light">
              No sub-categories available under {selectedCategory.name} yet.
            </div>
          )}
        </div>
      )}
    </section>
  );
}