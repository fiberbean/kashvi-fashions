import React from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';

interface HeaderHeartButtonProps {
  isJewellery?: boolean;
}

export default function HeaderHeartButton({ isJewellery = false }: HeaderHeartButtonProps) {
  const { wishlistCount, openWishlist } = useWishlist();

  return (
    <button
      type="button"
      aria-label="Wishlist"
      onClick={openWishlist}
      className={`relative p-2.5 rounded-full transition-all cursor-pointer ${
        isJewellery
          ? 'text-neutral-700 hover:text-[#0b3b2c] hover:bg-[#f4f7f5]'
          : 'text-neutral-700 hover:text-[#ff4d6d] hover:bg-[#fff0f3]'
      }`}
    >
      <Heart className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />

      {wishlistCount > 0 && (
        <span
          className={`absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black text-white flex items-center justify-center shadow-xs animate-in zoom-in duration-150 ${
            isJewellery ? 'bg-[#0b3b2c]' : 'bg-[#ff4d6d]'
          }`}
        >
          {wishlistCount > 99 ? '99+' : wishlistCount}
        </span>
      )}
    </button>
  );
}