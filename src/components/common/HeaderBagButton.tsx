"use client";

import React from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function HeaderBagButton({ isJewellery = false }: { isJewellery?: boolean }) {
  const { totalItems, setIsCartOpen } = useCart();

  return (
    <button
      type="button"
      aria-label="My Bag"
      onClick={() => setIsCartOpen(true)}
      className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold text-white shadow-xs transition-transform active:scale-95 ${
        isJewellery ? "bg-[#0b3b2c] hover:bg-[#082b20]" : "bg-[#ff4d6d] hover:bg-[#ff3358]"
      }`}
    >
      <ShoppingBag className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">My Bag</span>
      <span className="font-bold">{totalItems}</span>
    </button>
  );
}