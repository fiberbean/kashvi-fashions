"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Plus,
  Minus,
  Trash2,
  Check,
  ShoppingBag,
  Sparkles,
  Zap,
} from "lucide-react";
import { ProductItem } from "./CategoryProductGrid";

interface ProductQuickViewModalProps {
  product: ProductItem;
  isJewellery: boolean;
  onClose: () => void;
}

interface SelectedComboItem {
  size: string;
  colour: string;
  qty: number;
  price: number;
  availableStock: number;
}

export default function ProductQuickViewModal({
  product,
  isJewellery,
  onClose,
}: ProductQuickViewModalProps) {
  // Extract images
  const images = useMemo(() => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images.map((img: any) =>
        typeof img === "string" ? img : img?.url || ""
      ).filter(Boolean);
    }
    return [
      product.image ||
        (isJewellery
          ? "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80"
          : "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80"),
    ];
  }, [product, isJewellery]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // 1. Parse Variants or create from size/colour
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

    // If variants array is empty, synthesize from product fields
    if (vars.length === 0) {
      const sizes = product.size
        ? product.size.split(",").map((s) => s.trim())
        : ["Standard"];
      const colours = product.colour
        ? product.colour.split(",").map((c) => c.trim())
        : ["Default"];
      const defaultStock = Number(product.stock_quantity ?? 10);

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

  // Extract unique Sizes and Colours
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

  // Current Selection in Picker
  const [currentSize, setCurrentSize] = useState<string>(
    availableSizes[0] || "Standard"
  );
  const [currentColour, setCurrentColour] = useState<string>(
    availableColours[0] || "Default"
  );

  // Check stock for current combo
  const currentComboStock = useMemo(() => {
    const found = variantsData.find(
      (v) =>
        String(v.size || "").trim().toLowerCase() === currentSize.trim().toLowerCase() &&
        String(v.colour || v.color || "").trim().toLowerCase() ===
          currentColour.trim().toLowerCase()
    );

    if (found) {
      return Number(found.stock ?? found.stock_quantity ?? 10);
    }
    return Number(product.stock_quantity ?? 10);
  }, [variantsData, currentSize, currentColour, product.stock_quantity]);

  // Multi-Variant Selection Basket
  const [selectedCombos, setSelectedCombos] = useState<SelectedComboItem[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  // Add Combo to Multi-Select List
  const handleAddCombo = () => {
    if (currentComboStock <= 0) return;

    setSelectedCombos((prev) => {
      const idx = prev.findIndex(
        (item) => item.size === currentSize && item.colour === currentColour
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
            colour: currentColour,
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
    if (selectedCombos.length === 0) {
      handleAddCombo();
    }
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Background Overlay dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col md:flex-row border border-neutral-100">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/90 backdrop-blur-md text-neutral-600 hover:text-neutral-950 hover:bg-white shadow-md active:scale-90 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left: Images */}
        <div className="md:w-1/2 p-4 md:p-6 bg-neutral-50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-100">
          <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-white shadow-xs">
            <img
              src={images[activeImageIdx] || images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.tag && (
              <span
                className={`absolute top-3 left-3 text-[9px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full shadow-xs ${
                  isJewellery
                    ? "bg-[#0b3b2c] text-[#e5c07b]"
                    : "bg-[#ff4d6d] text-white"
                }`}
              >
                {product.tag}
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-14 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    activeImageIdx === idx
                      ? isJewellery
                        ? "border-[#0b3b2c]"
                        : "border-[#ff4d6d]"
                      : "border-neutral-200 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details & Multi-Variant Builder */}
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
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

            {/* 2. Colour Selection */}
            {availableColours.length > 0 && (
              <div className="mt-4">
                <span className="text-xs font-semibold text-neutral-800 block mb-2">
                  Select Colour:{" "}
                  <span className="font-bold text-[#ff4d6d]">{currentColour}</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {availableColours.map((clr) => {
                    const isSelected = currentColour === clr;
                    return (
                      <button
                        key={clr}
                        type="button"
                        onClick={() => setCurrentColour(clr)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all active:scale-95 ${
                          isSelected
                            ? isJewellery
                              ? "bg-[#0b3b2c] text-[#e5c07b] border-[#0b3b2c]"
                              : "bg-[#ff4d6d] text-white border-[#ff4d6d]"
                            : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        {clr}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Stock Indicator & Add Combo Action */}
            <div className="mt-4 p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-neutral-700 block">
                  Combo: {currentSize} • {currentColour}
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

            {/* 3. Multi-Variant Selected List (The Batch Tray) */}
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
                      <div>
                        <span className="font-bold text-neutral-900 block">
                          Size: {item.size} | {item.colour}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          ₹{item.price.toLocaleString("en-IN")} each
                        </span>
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

          {/* Bottom Total & Checkout Actions */}
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
                    <Check className="w-4 h-4" /> Added to Maison Bag!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      {selectedCombos.length > 0
                        ? `Add All (${totalItemsCount}) to Bag`
                        : "Add to Bag"}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
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