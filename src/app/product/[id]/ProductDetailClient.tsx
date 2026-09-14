"use client";

import React, { useState } from "react";
import {
  Heart,
  ShoppingBag,
  Sparkles,
  Share2,
  Check,
  Zap,
} from "lucide-react";

interface ProductDetailClientProps {
  product: any;
  images: string[];
  isJewellery: boolean;
}

const defaultSizes = ["XS", "S", "M", "L", "XL"];
const defaultPurities = ["22K BIS Hallmarked", "18K Fine Gold"];

export default function ProductDetailClient({
  product,
  images,
  isJewellery,
}: ProductDetailClientProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(product.size || defaultSizes[1]);
  const [selectedPurity, setSelectedPurity] = useState(defaultPurities[0]);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddedToBag, setIsAddedToBag] = useState(false);

  const price = Number(product.selling_price) || Number(product.mrp) || 0;
  const originalPrice = Number(product.mrp) || price;
  const discountPct =
    originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  const handleAddToBag = () => {
    setIsAddedToBag(true);
    setTimeout(() => setIsAddedToBag(false), 2500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
      {/* Left Column: Image Viewer */}
      <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-4">
        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto max-h-[540px] scrollbar-none no-scrollbar shrink-0">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative w-16 h-20 md:w-20 md:h-24 rounded-2xl overflow-hidden border-2 transition-all shrink-0 active:scale-95 ${
                  selectedImageIndex === idx
                    ? isJewellery
                      ? "border-[#0b3b2c] shadow-md shadow-[#0b3b2c]/20"
                      : "border-[#ff4d6d] shadow-md shadow-[#ff4d6d]/20"
                    : "border-neutral-200 opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Main Canvas */}
        <div className="relative w-full aspect-[3/4] md:aspect-[4/5] rounded-3xl overflow-hidden bg-neutral-100 border border-neutral-200/80 shadow-xs">
          <img
            src={images[selectedImageIndex] || images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-105"
          />

          {/* Product Badge */}
          {(product.brand || product.sub_brand) && (
            <span
              className={`absolute top-4 left-4 text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full shadow-sm ${
                isJewellery
                  ? "bg-[#0b3b2c] text-[#e5c07b] border border-[#e5c07b]/30"
                  : "bg-[#ff4d6d] text-white"
              }`}
            >
              {product.brand || product.sub_brand}
            </span>
          )}

          {/* Top-Right Share & Wishlist */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              type="button"
              aria-label="Wishlist"
              onClick={() => setIsWishlisted(!isWishlisted)}
              className="p-2.5 rounded-full bg-white/85 backdrop-blur-md hover:bg-white text-neutral-800 shadow-sm transition-transform active:scale-90"
            >
              <Heart
                className={`w-4 h-4 ${
                  isWishlisted
                    ? "fill-[#ff4d6d] text-[#ff4d6d]"
                    : "text-neutral-700"
                }`}
              />
            </button>
            <button
              type="button"
              aria-label="Share"
              className="p-2.5 rounded-full bg-white/85 backdrop-blur-md hover:bg-white text-neutral-800 shadow-sm transition-transform active:scale-90"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Details */}
      <div className="lg:col-span-5 flex flex-col justify-between">
        <div>
          {/* Atelier Department Tag */}
          <div className="flex items-center gap-1.5">
            <Sparkles
              className={`w-3.5 h-3.5 ${
                isJewellery ? "text-[#b38728]" : "text-[#ff4d6d]"
              }`}
            />
            <span
              className={`text-[10px] md:text-xs uppercase tracking-[0.25em] font-bold ${
                isJewellery ? "text-[#b38728]" : "text-[#ff4d6d]"
              }`}
            >
              {isJewellery ? "Royal Vault Selection" : "Atelier Haute Couture"}
            </span>
          </div>

          {/* Product Title */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-neutral-950 mt-1 leading-tight">
            {product.name}
          </h1>

          {/* Price Block */}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-neutral-950">
              ₹{price.toLocaleString("en-IN")}
            </span>
            {originalPrice > price && (
              <span className="text-sm sm:text-base text-neutral-400 line-through">
                ₹{originalPrice.toLocaleString("en-IN")}
              </span>
            )}
            {discountPct > 0 && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isJewellery
                    ? "bg-[#0b3b2c]/10 text-[#0b3b2c]"
                    : "bg-[#fff0f3] text-[#ff4d6d]"
                }`}
              >
                {discountPct}% OFF
              </span>
            )}
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            Inclusive of all taxes & luxury packaging
          </span>

          {/* Description & Features */}
          <p className="text-xs sm:text-sm text-neutral-600 mt-4 leading-relaxed font-light">
            {product.description ||
              "Handcrafted with meticulous detailing by master artisans. Every seam and curve reflects heirloom elegance."}
          </p>

          {/* Metadata Specs (Fabric / Weight / Colour) */}
          <div className="mt-4 py-3 border-y border-neutral-100 grid grid-cols-2 gap-2 text-xs">
            {product.fabric && (
              <div>
                <span className="text-neutral-400 text-[10px] uppercase tracking-wider block">
                  Fabric / Material
                </span>
                <span className="font-medium text-neutral-800">{product.fabric}</span>
              </div>
            )}
            {product.colour && (
              <div>
                <span className="text-neutral-400 text-[10px] uppercase tracking-wider block">
                  Colour
                </span>
                <span className="font-medium text-neutral-800">{product.colour}</span>
              </div>
            )}
            {product.weight > 0 && (
              <div>
                <span className="text-neutral-400 text-[10px] uppercase tracking-wider block">
                  Gross Weight
                </span>
                <span className="font-medium text-neutral-800">
                  {product.weight} {product.weight_unit || "grams"}
                </span>
              </div>
            )}
            {product.model_no && (
              <div>
                <span className="text-neutral-400 text-[10px] uppercase tracking-wider block">
                  Design Code
                </span>
                <span className="font-medium text-neutral-800">{product.model_no}</span>
              </div>
            )}
          </div>

          {/* Options: Sizes for Fashion, Grade for Jewellery */}
          <div className="mt-5">
            {isJewellery ? (
              <div>
                <span className="text-xs font-semibold text-neutral-900 block mb-2">
                  Purity & Certification
                </span>
                <div className="flex flex-wrap gap-2">
                  {defaultPurities.map((purity) => (
                    <button
                      key={purity}
                      type="button"
                      onClick={() => setSelectedPurity(purity)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95 ${
                        selectedPurity === purity
                          ? "bg-[#0b3b2c] text-[#e5c07b] border-[#0b3b2c] shadow-xs"
                          : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      {purity}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neutral-900">
                    Select Size
                  </span>
                  <button
                    type="button"
                    className="text-[11px] text-[#ff4d6d] hover:underline font-medium"
                  >
                    Size Guide
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {defaultSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`w-11 h-11 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                        selectedSize === size
                          ? "bg-[#ff4d6d] text-white border-[#ff4d6d] shadow-xs"
                          : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-6 border-t border-neutral-100 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleAddToBag}
            className={`w-full py-3.5 px-6 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-md ${
              isAddedToBag
                ? "bg-neutral-900 text-white"
                : isJewellery
                ? "bg-[#0b3b2c] text-[#e5c07b] hover:bg-[#082b20] shadow-[#0b3b2c]/20"
                : "bg-[#ff4d6d] text-white hover:bg-[#ff3358] shadow-[#ff4d6d]/25"
            }`}
          >
            {isAddedToBag ? (
              <>
                <Check className="w-4 h-4" /> Added to Bag
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" /> Add to Bag
              </>
            )}
          </button>

          <button
            type="button"
            className="w-full py-3.5 px-6 rounded-2xl text-xs font-bold uppercase tracking-wider bg-neutral-950 text-white hover:bg-neutral-800 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-xs"
          >
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" /> Instant Checkout
          </button>
        </div>
      </div>
    </div>
  );
}