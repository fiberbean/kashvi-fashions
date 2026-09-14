"use client";

import React, { useState, useMemo } from "react";
import {
  Heart,
  ShoppingBag,
  Sparkles,
  Eye,
  X,
  Plus,
  Minus,
  Trash2,
  Check,
  Zap,
} from "lucide-react";
import { useCart, CartItem } from "@/context/CartContext";

export interface ProductItem {
  id: string;
  name: string;
  subtitle?: string | null;
  price: number;
  originalPrice: number;
  image?: string | null;
  images?: any;
  tag?: string | null;
  meta?: string | null;
  size?: string | null;
  colour?: string | null;
  variants?: any;
  stock_quantity?: number;
  description?: string;
  fabric?: string | null;
  brand?: string | null;
}

interface CategoryProductGridProps {
  initialProducts: ProductItem[];
  isJewellery: boolean;
}

interface SelectedComboItem {
  size: string;
  colour: string;
  qty: number;
  price: number;
  availableStock: number;
}

interface ImageObject {
  url: string;
  colour?: string | null;
}

function getColorHex(colourName: string): string {
  const c = colourName.toLowerCase().trim();
  if (c.includes("pink") || c.includes("rose")) return "#ff4d6d";
  if (c.includes("magenta")) return "#d90429";
  if (c.includes("red") || c.includes("ruby")) return "#e63946";
  if (c.includes("maroon") || c.includes("wine")) return "#800020";
  if (c.includes("blue") || c.includes("navy")) return "#1d3557";
  if (c.includes("sky") || c.includes("cyan")) return "#48cae4";
  if (c.includes("green") || c.includes("emerald")) return "#0b3b2c";
  if (c.includes("olive")) return "#556b2f";
  if (c.includes("teal")) return "#008080";
  if (c.includes("black")) return "#111111";
  if (c.includes("white")) return "#ffffff";
  if (c.includes("beige") || c.includes("nude") || c.includes("skin")) return "#e8d8c8";
  if (c.includes("yellow") || c.includes("mustard")) return "#ffb703";
  if (c.includes("gold")) return "#d4af37";
  if (c.includes("silver") || c.includes("grey") || c.includes("gray")) return "#adb5bd";
  if (c.includes("purple") || c.includes("violet")) return "#7209b7";
  if (c.includes("orange") || c.includes("peach")) return "#f77f00";
  if (c.includes("brown") || c.includes("coffee")) return "#582f0e";
  return "#e5e5e5";
}

export default function CategoryProductGrid({
  initialProducts,
  isJewellery,
}: CategoryProductGridProps) {
  const [sortBy, setSortBy] = useState<"featured" | "price-low" | "price-high">("featured");
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  const filteredProducts = useMemo(() => {
    let items = [...initialProducts];
    if (sortBy === "price-low") {
      items.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      items.sort((a, b) => b.price - a.price);
    }
    return items;
  }, [initialProducts, sortBy]);

  const toggleWishlist = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (filteredProducts.length === 0) {
    return (
      <div className="w-full py-16 text-center text-neutral-400">
        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-serif">No products currently listed in this collection.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
        <span className="text-xs text-neutral-500 font-medium">
          Showing {filteredProducts.length} items
        </span>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 hidden sm:inline">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-semibold bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="featured">Featured Curations</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {filteredProducts.map((product) => {
          const isSaved = wishlist.includes(product.id);
          const imgSrc =
            product.image ||
            "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80";

          const discountPct =
            product.originalPrice > product.price
              ? Math.round(
                  ((product.originalPrice - product.price) / product.originalPrice) * 100
                )
              : 0;

          return (
            <div
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="group relative flex flex-col rounded-2xl md:rounded-3xl overflow-hidden border border-neutral-200/80 bg-white hover:shadow-xl transition-all duration-300 cursor-pointer text-left"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
                <img
                  src={imgSrc}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  loading="lazy"
                />

                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-semibold text-neutral-900 shadow-md">
                    <Eye className="w-3.5 h-3.5" /> Quick View
                  </span>
                </div>

                <button
                  type="button"
                  aria-label="Wishlist"
                  onClick={(e) => toggleWishlist(e, product.id)}
                  className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/80 backdrop-blur-md hover:bg-white text-neutral-700 shadow-xs transition-transform active:scale-90 z-10"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      isSaved ? "fill-[#ff4d6d] text-[#ff4d6d]" : "text-neutral-700"
                    }`}
                  />
                </button>

                {product.tag && (
                  <span
                    className={`absolute top-2.5 left-2.5 text-[8px] sm:text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full shadow-xs ${
                      isJewellery
                        ? "bg-[#0b3b2c] text-[#e5c07b]"
                        : "bg-[#ff4d6d] text-white"
                    }`}
                  >
                    {product.tag}
                  </span>
                )}
              </div>

              <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between">
                <div>
                  {product.meta && (
                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block mb-0.5">
                      {product.meta}
                    </span>
                  )}
                  <h3 className="text-xs sm:text-sm font-serif font-bold text-neutral-900 line-clamp-1 group-hover:text-neutral-600 transition-colors">
                    {product.name}
                  </h3>
                  {product.subtitle && (
                    <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5 font-light">
                      {product.subtitle}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-neutral-950">
                        ₹{product.price.toLocaleString("en-IN")}
                      </span>
                      {product.originalPrice > product.price && (
                        <span className="text-[10px] text-neutral-400 line-through">
                          ₹{product.originalPrice.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                    {discountPct > 0 && (
                      <span
                        className={`text-[9px] font-bold ${
                          isJewellery ? "text-[#b38728]" : "text-[#ff4d6d]"
                        }`}
                      >
                        {discountPct}% OFF
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label="Quick Select"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(product);
                    }}
                    className={`p-2 rounded-full text-white active:scale-90 transition-transform shadow-xs ${
                      isJewellery ? "bg-[#0b3b2c]" : "bg-[#ff4d6d]"
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedProduct && (
        <InlineQuickViewModal
          product={selectedProduct}
          isJewellery={isJewellery}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

function InlineQuickViewModal({
  product,
  isJewellery,
  onClose,
}: {
  product: ProductItem;
  isJewellery: boolean;
  onClose: () => void;
}) {
  const { addToCart } = useCart();

  const allImageObjects: ImageObject[] = useMemo(() => {
    let list: ImageObject[] = [];

    if (Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach((img: any) => {
        if (typeof img === "string" && img.trim()) {
          list.push({ url: img.trim(), colour: null });
        } else if (img && typeof img === "object") {
          const url = img.url || img.src || img.image || "";
          const clr = img.colour || img.color || img.tag || null;
          if (url) list.push({ url, colour: clr ? String(clr).trim() : null });
        }
      });
    }

    if (list.length === 0 && product.image) {
      list.push({ url: product.image, colour: null });
    }

    if (list.length === 0) {
      list.push({
        url: isJewellery
          ? "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80"
          : "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80",
        colour: null,
      });
    }

    return list;
  }, [product, isJewellery]);

  const variantsData = useMemo(() => {
    let vars: any[] = [];
    if (Array.isArray(product.variants)) {
      vars = product.variants;
    } else if (product.variants && typeof product.variants === "object") {
      if (Array.isArray(product.variants.items)) {
        vars = product.variants.items;
      } else {
        vars = Object.values(product.variants);
      }
    }

    if (vars.length === 0) {
      const sizes = product.size
        ? product.size.split(",").map((s) => s.trim())
        : ["32B", "34B", "36B", "38B"];
      const colours = product.colour
        ? product.colour.split(",").map((c) => c.trim())
        : ["Pink", "Blue", "Green"];
      const defaultStock = Number(product.stock_quantity ?? 8);

      sizes.forEach((s) => {
        colours.forEach((c) => {
          vars.push({
            size: s,
            colour: c,
            stock: defaultStock,
            price: product.price,
          });
        });
      });
    }

    return vars;
  }, [product]);

  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    variantsData.forEach((v) => {
      if (v.size) set.add(String(v.size).trim());
    });
    return Array.from(set);
  }, [variantsData]);

  const availableColours = useMemo(() => {
    const set = new Set<string>();
    variantsData.forEach((v) => {
      if (v.colour || v.color) set.add(String(v.colour || v.color).trim());
    });
    return Array.from(set);
  }, [variantsData]);

  const [currentSize, setCurrentSize] = useState<string>(availableSizes[0] || "32B");
  const [currentColour, setCurrentColour] = useState<string | null>(null);

  const displayedImages = useMemo(() => {
    if (!currentColour) {
      return allImageObjects.map((img) => img.url);
    }

    const targetColor = currentColour.toLowerCase().trim();
    const colorMatches = allImageObjects.filter((img) => {
      if (img.colour && img.colour.toLowerCase().trim() === targetColor) return true;
      if (img.url.toLowerCase().includes(targetColor)) return true;
      return false;
    });

    if (colorMatches.length > 0) return colorMatches.map((img) => img.url);
    return allImageObjects.map((img) => img.url);
  }, [allImageObjects, currentColour]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const handleSelectColour = (clr: string) => {
    if (currentColour === clr) {
      setCurrentColour(null);
    } else {
      setCurrentColour(clr);
    }
    setActiveImageIdx(0);
  };

  const activeColorForStock = currentColour || availableColours[0] || "Default";
  const currentComboStock = useMemo(() => {
    const found = variantsData.find(
      (v) =>
        String(v.size || "").trim().toLowerCase() === currentSize.trim().toLowerCase() &&
        String(v.colour || v.color || "").trim().toLowerCase() ===
          activeColorForStock.trim().toLowerCase()
    );

    if (found) return Number(found.stock ?? found.stock_quantity ?? 8);
    return Number(product.stock_quantity ?? 8);
  }, [variantsData, currentSize, activeColorForStock, product.stock_quantity]);

  const [selectedCombos, setSelectedCombos] = useState<SelectedComboItem[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAddCombo = () => {
    if (currentComboStock <= 0) return;

    setSelectedCombos((prev) => {
      const idx = prev.findIndex(
        (item) => item.size === currentSize && item.colour === activeColorForStock
      );
      if (idx > -1) {
        const next = [...prev];
        if (next[idx].qty < currentComboStock) {
          next[idx].qty += 1;
        }
        return next;
      } else {
        return [
          ...prev,
          {
            size: currentSize,
            colour: activeColorForStock,
            qty: 1,
            price: product.price,
            availableStock: currentComboStock,
          },
        ];
      }
    });
  };

  const updateComboQty = (idx: number, delta: number) => {
    setSelectedCombos((prev) => {
      const next = [...prev];
      const newQty = next[idx].qty + delta;
      if (newQty <= 0) {
        return next.filter((_, i) => i !== idx);
      }
      if (newQty <= next[idx].availableStock) {
        next[idx].qty = newQty;
      }
      return next;
    });
  };

  const removeCombo = (idx: number) => {
    setSelectedCombos((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalItemsCount = selectedCombos.reduce((sum, item) => sum + item.qty, 0);
  const totalAmount = selectedCombos.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleBatchAddToCart = () => {
    let itemsToPush: SelectedComboItem[] = [...selectedCombos];

    if (itemsToPush.length === 0) {
      if (currentComboStock > 0) {
        itemsToPush = [
          {
            size: currentSize,
            colour: activeColorForStock,
            qty: 1,
            price: product.price,
            availableStock: currentComboStock,
          },
        ];
      }
    }

    if (itemsToPush.length === 0) return;

    const cartItemsFormatted: CartItem[] = itemsToPush.map((combo) => ({
      id: `${product.id}_${combo.size}_${combo.colour}`,
      productId: product.id,
      name: product.name,
      price: combo.price,
      originalPrice: product.originalPrice,
      image: displayedImages[0] || product.image || "",
      size: combo.size,
      colour: combo.colour,
      qty: combo.qty,
      type: isJewellery ? "jewellery" : "fashion",
      fabric: product.fabric,
    }));

    addToCart(cartItemsFormatted);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col md:flex-row border border-neutral-100">
        
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/90 backdrop-blur-md text-neutral-600 hover:text-neutral-950 hover:bg-white shadow-md active:scale-90 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left Side: Images */}
        <div className="md:w-1/2 p-4 md:p-6 bg-neutral-50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-100">
          <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-white shadow-xs">
            <img
              src={displayedImages[activeImageIdx] || displayedImages[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
            {currentColour && (
              <span
                className={`absolute top-3 left-3 text-[9px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full shadow-xs ${
                  isJewellery
                    ? "bg-[#0b3b2c] text-[#e5c07b]"
                    : "bg-[#ff4d6d] text-white"
                }`}
              >
                {currentColour}
              </span>
            )}
          </div>

          {displayedImages.length > 1 && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
              {displayedImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-14 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    activeImageIdx === idx
                      ? isJewellery
                        ? "border-[#0b3b2c] shadow-xs"
                        : "border-[#ff4d6d] shadow-xs"
                      : "border-neutral-200 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {currentColour && (
            <button
              type="button"
              onClick={() => setCurrentColour(null)}
              className="mt-2 text-[10px] text-neutral-500 hover:text-neutral-900 underline text-left block"
            >
              Showing {currentColour} shade • View all photos
            </button>
          )}
        </div>

        {/* Right Side: Details & Multi-Variant Builder */}
        <div className="md:w-1/2 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto max-h-[580px] md:max-h-[85vh]">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles
                className={`w-3.5 h-3.5 ${
                  isJewellery ? "text-[#b38728]" : "text-[#ff4d6d]"
                }`}
              />
              <span
                className={`text-[9px] uppercase tracking-[0.25em] font-bold ${
                  isJewellery ? "text-[#b38728]" : "text-[#ff4d6d]"
                }`}
              >
                {isJewellery ? "Royal Vault Edition" : "Atelier Couture"}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-serif font-bold text-neutral-900 leading-snug">
              {product.name}
            </h2>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xl font-serif font-bold text-neutral-950">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-xs text-neutral-400 line-through">
                  ₹{product.originalPrice.toLocaleString("en-IN")}
                </span>
              )}
            </div>

            {/* 1. Size Selection */}
            {availableSizes.length > 0 && (
              <div className="mt-4 pt-3 border-t border-neutral-100">
                <span className="text-xs font-semibold text-neutral-800 block mb-2">
                  Select Size: <span className="font-bold text-[#ff4d6d]">{currentSize}</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((sz) => {
                    const isSelected = currentSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setCurrentSize(sz)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                          isSelected
                            ? isJewellery
                              ? "bg-[#0b3b2c] text-[#e5c07b] border-[#0b3b2c]"
                              : "bg-[#ff4d6d] text-white border-[#ff4d6d]"
                            : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Color Swatches */}
            {availableColours.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neutral-800">
                    Colour:{" "}
                    <span className="font-bold text-neutral-900">
                      {currentColour || "Select a shade"}
                    </span>
                  </span>
                  {currentColour && (
                    <button
                      type="button"
                      onClick={() => setCurrentColour(null)}
                      className="text-[10px] text-[#ff4d6d] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {availableColours.map((clr) => {
                    const isSelected = currentColour === clr;
                    const hexCode = getColorHex(clr);
                    const isWhiteOrLight = hexCode === "#ffffff" || hexCode === "#e8d8c8";

                    return (
                      <button
                        key={clr}
                        type="button"
                        title={clr}
                        onClick={() => handleSelectColour(clr)}
                        className={`relative group rounded-full p-[2px] transition-all duration-200 active:scale-90 ${
                          isSelected
                            ? isJewellery
                              ? "ring-2 ring-[#0b3b2c] ring-offset-2 scale-110"
                              : "ring-2 ring-[#ff4d6d] ring-offset-2 scale-110"
                            : "hover:scale-105"
                        }`}
                      >
                        <span
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full block shadow-xs transition-transform ${
                            isWhiteOrLight ? "border border-neutral-300" : ""
                          }`}
                          style={{ backgroundColor: hexCode }}
                        />
                        {isSelected && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Check
                              className={`w-3.5 h-3.5 ${
                                isWhiteOrLight ? "text-neutral-900" : "text-white"
                              }`}
                            />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Stock & Add Combo Button */}
            <div className="mt-5 p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-neutral-700 block">
                  Combo: {currentSize} • {activeColorForStock}
                </span>
                {currentComboStock > 0 ? (
                  <span className="text-[10px] text-emerald-600 font-bold inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    In Stock ({currentComboStock} available)
                  </span>
                ) : (
                  <span className="text-[10px] text-red-500 font-bold">
                    Out of Stock for this combo
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={currentComboStock <= 0}
                onClick={handleAddCombo}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 ${
                  currentComboStock > 0
                    ? isJewellery
                      ? "bg-[#0b3b2c] text-[#e5c07b] hover:bg-[#082b20]"
                      : "bg-[#ff4d6d] text-white hover:bg-[#ff3358]"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variant</span>
              </button>
            </div>

            {/* Selected Combos Tray */}
            {selectedCombos.length > 0 && (
              <div className="mt-4 pt-3 border-t border-neutral-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">
                  Selected Combos ({totalItemsCount} items):
                </span>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {selectedCombos.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#fffbfc] border border-[#ff4d6d]/20 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-neutral-300 shrink-0"
                          style={{ backgroundColor: getColorHex(item.colour) }}
                        />
                        <div>
                          <span className="font-bold text-neutral-900 block">
                            Size: {item.size} • {item.colour}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            ₹{item.price.toLocaleString("en-IN")} each
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-neutral-200 rounded-lg bg-white">
                          <button
                            type="button"
                            onClick={() => updateComboQty(idx, -1)}
                            className="p-1 text-neutral-500 hover:text-neutral-950"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-bold text-neutral-900">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            disabled={item.qty >= item.availableStock}
                            onClick={() => updateComboQty(idx, 1)}
                            className="p-1 text-neutral-500 hover:text-neutral-950 disabled:opacity-30"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeCombo(idx)}
                          className="p-1 text-neutral-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Summary & Actions */}
          <div className="mt-5 pt-4 border-t border-neutral-100">
            {selectedCombos.length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-neutral-500 font-medium">
                  Subtotal ({totalItemsCount} variants)
                </span>
                <span className="text-base font-serif font-bold text-neutral-950">
                  ₹{totalAmount.toLocaleString("en-IN")}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchAddToCart}
                className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 ${
                  isSuccess
                    ? "bg-neutral-900 text-white"
                    : isJewellery
                    ? "bg-[#0b3b2c] text-[#e5c07b] hover:bg-[#082b20]"
                    : "bg-[#ff4d6d] text-white hover:bg-[#ff3358]"
                }`}
              >
                {isSuccess ? (
                  <>
                    <Check className="w-4 h-4" /> Added to My Bag!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      {selectedCombos.length > 0
                        ? `Add All (${totalItemsCount}) to My Bag`
                        : "Add to My Bag"}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBatchAddToCart}
                className="py-3 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider bg-neutral-950 text-white hover:bg-neutral-800 transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="hidden sm:inline">Instant Order</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}