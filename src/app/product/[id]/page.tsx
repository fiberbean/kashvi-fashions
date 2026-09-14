import React from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, ShieldCheck, Truck, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import ProductDetailClient from "./ProductDetailClient";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const productId = decodeURIComponent(resolvedParams?.id || "").trim();

  let product: any = null;

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (!error && data) {
      product = data;
    }
  } catch (err) {
    console.error("Error fetching product details:", err);
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-neutral-800 p-6 text-center">
        <h2 className="text-xl font-serif font-bold">Product Not Found</h2>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm">
          The curated creation you are looking for might have been moved or archived.
        </p>
        <Link
          href="/"
          className="mt-4 px-6 py-2.5 rounded-full bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 transition-all"
        >
          Return to Maison
        </Link>
      </div>
    );
  }

  // Department Detection
  const isJewellery =
    (product.category || "").toLowerCase().includes("jewel") ||
    (product.sub_category || "").toLowerCase().includes("jewel") ||
    product.category === "CAT-MTO3UY3I";

  // Parse images from JSONB array
  let productImages: string[] = [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    productImages = product.images.map((img: any) =>
      typeof img === "string" ? img : img?.url || ""
    ).filter(Boolean);
  }

  if (productImages.length === 0) {
    productImages = [
      isJewellery
        ? "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=1200&q=80"
        : "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80",
    ];
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 pb-28">
      {/* Top Header */}
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
            <span>Back</span>
          </Link>

          <Link href="/" className="font-serif font-bold text-xl tracking-[0.2em]">
            KASHVI
          </Link>

          <button
            type="button"
            aria-label="Shopping Bag"
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-xs ${
              isJewellery ? "bg-[#0b3b2c]" : "bg-[#ff4d6d]"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>0</span>
          </button>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 border-b border-neutral-100 flex items-center gap-2 text-[11px] text-neutral-400">
        <Link href="/" className="hover:text-neutral-700">
          Maison
        </Link>
        <span>/</span>
        <span className="capitalize">{product.category || "Collection"}</span>
        {product.sub_category && (
          <>
            <span>/</span>
            <span className="capitalize">{product.sub_category}</span>
          </>
        )}
        <span>/</span>
        <span className="text-neutral-800 font-medium truncate max-w-[200px]">
          {product.name}
        </span>
      </div>

      {/* Main PDP View */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-10">
        <ProductDetailClient
          product={product}
          images={productImages}
          isJewellery={isJewellery}
        />

        {/* Brand Assurance Section */}
        <section className="mt-16 pt-10 border-t border-neutral-100 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
            <ShieldCheck
              className={`w-6 h-6 shrink-0 ${
                isJewellery ? "text-[#0b3b2c]" : "text-[#ff4d6d]"
              }`}
            />
            <div>
              <h4 className="text-xs font-serif font-bold text-neutral-900 uppercase tracking-wider">
                100% Certified Quality
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                Handcrafted under rigorous standards with pure verified grade materials.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
            <Truck
              className={`w-6 h-6 shrink-0 ${
                isJewellery ? "text-[#0b3b2c]" : "text-[#ff4d6d]"
              }`}
            />
            <div>
              <h4 className="text-xs font-serif font-bold text-neutral-900 uppercase tracking-wider">
                Insured Express Shipping
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                Dispatched in tamper-proof luxury packaging with real-time tracking.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
            <RefreshCw
              className={`w-6 h-6 shrink-0 ${
                isJewellery ? "text-[#0b3b2c]" : "text-[#ff4d6d]"
              }`}
            />
            <div>
              <h4 className="text-xs font-serif font-bold text-neutral-900 uppercase tracking-wider">
                Atelier Assistance
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                Dedicated styling concierge and hassle-free assistance for sizing inquiries.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}