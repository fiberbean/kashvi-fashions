import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function HeaderBagButton({ isJewellery }: { isJewellery?: boolean }) {
  const { totalItems, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label="Shopping Bag"
      className={`relative p-2 rounded-full transition-colors text-neutral-700 cursor-pointer ${
        isJewellery ? 'hover:text-[#0b3b2c] hover:bg-[#f4f7f5]' : 'hover:text-[#ff4d6d] hover:bg-[#fff0f3]'
      }`}
    >
      <ShoppingBag className="w-5 h-5" />
      {totalItems > 0 && (
        <span
          className={`absolute -top-1 -right-1 text-[10px] font-bold text-white w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in-75 duration-200 ${
            isJewellery ? 'bg-[#0b3b2c]' : 'bg-[#ff4d6d]'
          }`}
        >
          {totalItems}
        </span>
      )}
    </button>
  );
}