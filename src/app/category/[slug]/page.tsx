import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import CategoryProductGrid, { ProductItem } from "./CategoryProductGrid";
import HeaderBagButton from "@/components/common/HeaderBagButton";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedQuery = await searchParams;
  const currentSlug = decodeURIComponent(resolvedParams?.slug || "").trim();
  const explicitType = resolvedQuery?.type;

  let displayName = currentSlug;
  let isJewellery = explicitType === "jewellery";
  let subCategoryPills: { id: string; name: string }[] = [];
  let categoryFilterName = currentSlug;

  try {
    const { data: subData } = await supabase
      .from("sub_categories")
      .select("id, name, category_id, category_name")
      .or(`id.eq.${currentSlug},name.ilike.%${currentSlug}%`)
      .limit(1)
      .maybeSingle();

    if (subData) {
      displayName = subData.name;
      categoryFilterName = subData.name;
      const parentName = (subData.category_name || "").toLowerCase();
      if (!isJewellery) {
        isJewellery =
          parentName.includes("jewel") ||
          subData.category_id === "CAT-MTO3UY3I";
      }

      if (subData.category_id) {
        const { data: siblingSubs } = await supabase
          .from("sub_categories")
          .select("id, name")
          .eq("category_id", subData.category_id)
          .eq("active", true);

        if (siblingSubs) subCategoryPills = siblingSubs;
      }
    } else {
      const { data: catData } = await supabase
        .from("categories")
        .select("id, name, department")
        .or(`id.eq.${currentSlug},name.ilike.%${currentSlug}%`)
        .limit(1)
        .maybeSingle();

      if (catData) {
        displayName = catData.name;
        categoryFilterName = catData.name;
        const dept = (catData.department || "").toLowerCase();
        if (!isJewellery) {
          isJewellery =
            dept.includes("jewel") ||
            catData.name.toLowerCase().includes("jewel") ||
            catData.id === "CAT-MTO3UY3I";
        }

        const { data: childSubs } = await supabase
          .from("sub_categories")
          .select("id, name")
          .eq("category_id", catData.id)
          .eq("active", true);

        if (childSubs) subCategoryPills = childSubs;
      }
    }
  } catch (err) {
    console.error("Error identifying target category:", err);
  }

  let products: ProductItem[] = [];

  try {
    const { data: prodData, error } = await supabase
      .from("products")
      .select(
        "id, name, category, sub_category, selling_price, mrp, images, variants, colour, size, stock_quantity, brand, fabric, description, active"
      )
      .eq("active", true)
      .or(
        `sub_category.ilike.%${categoryFilterName}%,category.ilike.%${categoryFilterName}%,name.ilike.%${categoryFilterName}%`
      )
      .limit(30);

    if (!error && prodData && prodData.length > 0) {
      products = prodData.map((p: any) => {
        let firstImage = "";
        if (Array.isArray(p.images) && p.images.length > 0) {
          const item0 = p.images[0];
          firstImage = typeof item0 === "string" ? item0 : item0?.url || item0?.src || "";
        }

        return {
          id: String(p.id),
          name: p.name || "Exclusive Creation",
          subtitle: p.fabric || p.brand || p.sub_category || null,
          price: Number(p.selling_price) || Number(p.mrp) || 0,
          originalPrice: Number(p.mrp) || Number(p.selling_price) || 0,
          image:
            firstImage ||
            (isJewellery
              ? "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80"
              : "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80"),
          images: p.images || [],
          variants: p.variants || {},
          colour: p.colour || null,
          size: p.size || null,
          stock_quantity: Number(p.stock_quantity ?? 10),
          description: p.description || "",
          fabric: p.fabric || null,
          tag: p.brand || (isJewellery ? "Heirloom Craft" : "Couture Edit"),
          meta: p.fabric || (isJewellery ? "Certified" : "Pure Fabric"),
        };
      });
    }
  } catch (err) {
    console.error("Product query error:", err);
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 pb-20">
      {/* Header */}
      <header
        className={`w-full sticky top-0 z-40 backdrop-blur-md bg-white/95 border-b ${
          isJewellery ? "border-[#0b3b2c]/15" : "border-[#ff4d6d]/20"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link
            href={isJewellery ? "/?tab=jewellery" : "/?tab=fashions"}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:text-neutral-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Maison</span>
          </Link>

          <Link href="/" className="font-serif font-bold text-xl tracking-[0.2em]">
            KASHVI
          </Link>

          {/* లైవ్ కార్ట్ బటన్ */}
          <HeaderBagButton isJewellery={isJewellery} />
        </div>
      </header>

      {/* Hero Banner */}
      <section
        className={`w-full border-b py-8 md:py-12 ${
          isJewellery
            ? "bg-gradient-to-b from-[#f4f7f5] to-white border-[#0b3b2c]/10"
            : "bg-gradient-to-b from-[#fff5f7] to-white border-[#ff4d6d]/10"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <span
            className={`text-[10px] md:text-xs uppercase tracking-[0.3em] font-bold ${
              isJewellery ? "text-[#b38728]" : "text-[#ff4d6d]"
            }`}
          >
            {isJewellery ? "Royal Vault Collection" : "Atelier Haute Couture"}
          </span>

          <h1 className="text-2xl md:text-4xl font-serif font-bold text-neutral-950 mt-1 capitalize">
            {displayName}
          </h1>

          <span className="inline-block mt-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">
            {products.length} Designs Ready to Ship
          </span>

          {subCategoryPills.length > 0 && (
            <div className="mt-5 flex items-center justify-center gap-2 flex-wrap max-w-3xl mx-auto px-2">
              {subCategoryPills.map((sub) => {
                const isActive =
                  sub.id === currentSlug ||
                  sub.name.toLowerCase() === displayName.toLowerCase();

                return (
                  <Link
                    key={sub.id}
                    href={`/category/${sub.id}?type=${isJewellery ? "jewellery" : "fashion"}`}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all shadow-2xs ${
                      isActive
                        ? isJewellery
                          ? "bg-[#0b3b2c] text-[#e5c07b] border-[#0b3b2c]"
                          : "bg-[#ff4d6d] text-white border-[#ff4d6d]"
                        : isJewellery
                        ? "bg-white text-neutral-700 border-neutral-200 hover:border-[#0b3b2c]"
                        : "bg-white text-neutral-700 border-neutral-200 hover:border-[#ff4d6d]"
                    }`}
                  >
                    {sub.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
        <CategoryProductGrid initialProducts={products} isJewellery={isJewellery} />
      </main>
    </div>
  );
}