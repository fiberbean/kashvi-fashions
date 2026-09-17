import React from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';

interface HeaderHeartButtonProps {
  isJewellery?: boolean;
}

export default function HeaderHeartButton({ isJewellery = false }: HeaderHeartButtonProps) {
  const { openWishlist, totalWishlistItems } = useWishlist();

  return (
    <button
      type="button"
      aria-label="Wishlist"
      onClick={openWishlist}
      className={`relative p-2 rounded-full transition-colors cursor-pointer ${
        isJewellery
          ? 'text-neutral-700 hover:text-[#0b3b2c] hover:bg-[#f4f7f5]'
          : 'text-neutral-700 hover:text-[#ff4d6d] hover:bg-[#fff0f3]'
      }`}
    >
      <Heart className="w-5 h-5" />
      {totalWishlistItems > 0 && (
        <span className="absolute 0 top-1 right-1 w-4 h-4 rounded-full bg-[#ff4d6d] text-white text-[9px] font-bold flex items-center justify-center shadow-xs animate-in zoom-in-75">
          {totalWishlistItems}
        </span>
      )}
    </button>
  );
}