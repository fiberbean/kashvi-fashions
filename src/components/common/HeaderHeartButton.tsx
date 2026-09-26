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
          ? 'text-stone-700 hover:text-[#b38728] hover:bg-amber-50'
          : 'text-stone-700 hover:text-[#ff2d85] hover:bg-pink-50'
      }`}
    >
      <Heart className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />

      {wishlistCount > 0 && (
        <span
          className={`absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black text-white flex items-center justify-center shadow-xs animate-in zoom-in duration-150 ${
            isJewellery ? 'bg-[#D4AF37] text-stone-950' : 'bg-[#ff2d85]'
          }`}
        >
          {wishlistCount > 99 ? '99+' : wishlistCount}
        </span>
      )}
    </button>
  );
}