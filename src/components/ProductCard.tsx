import React from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  colors?: string[];
  sizes?: string[];
  fabric?: string;
  department?: 'fashions' | 'jewellery';
}

export default function ProductCard({
  id,
  name,
  price,
  originalPrice,
  image,
  badge,
  colors = [],
  sizes = [],
  fabric,
  department = 'fashions',
}: ProductCardProps) {
  const navigate = useNavigate();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { addToCart, openCart } = useCart();

  const isFavorited = isInWishlist(id);
  const isJewellery = department === 'jewellery';

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorited) {
      removeFromWishlist(id);
    } else {
      addToWishlist({
        id,
        name,
        price,
        originalPrice,
        image,
        color: colors[0],
        size: sizes[0],
        fabric,
        department,
      });
    }
  };

  const handleCardClick = () => {
    navigate(`/product/${id}`);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      id: `${id}-${sizes[0] || 'default'}-${colors[0] || 'default'}`,
      productId: id,
      name,
      price,
      mrp: originalPrice,
      image,
      qty: 1,
      color: colors[0],
      size: sizes[0],
      fabric,
      department,
    });
    openCart();
  };

  const discountPercent =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 shadow-lg hover:shadow-2xl cursor-pointer ${
        isJewellery
          ? 'bg-[#061e17]/90 border-[#e5c07b]/25 hover:border-[#e5c07b] hover:shadow-[0_0_25px_rgba(229,192,123,0.2)]'
          : 'bg-[#0f172a]/90 border-[#1e293b] hover:border-[#00f5d4] hover:shadow-[0_0_25px_rgba(0,245,212,0.2)]'
      }`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-900">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Badge or Discount */}
        {(badge || discountPercent) && (
          <span
            className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-md backdrop-blur-md ${
              isJewellery
                ? 'bg-[#0b3b2c] text-[#e5c07b] border border-[#e5c07b]/40'
                : 'bg-[#ff3385] text-white border border-[#ff3385]/50'
            }`}
          >
            {badge || `${discountPercent}% OFF`}
          </span>
        )}

        {/* Wishlist Button */}
        <button
          type="button"
          aria-label={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
          onClick={handleWishlistToggle}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white backdrop-blur-md flex items-center justify-center shadow-md transition-transform active:scale-90 border border-white/10 z-10 cursor-pointer"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorited
                ? isJewellery
                  ? 'fill-[#e5c07b] text-[#e5c07b]'
                  : 'fill-[#ff3385] text-[#ff3385]'
                : 'text-neutral-400 hover:text-white'
            }`}
          />
        </button>

        {/* Quick Add Button */}
        <button
          type="button"
          onClick={handleQuickAdd}
          className={`absolute bottom-2.5 left-2.5 right-2.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-lg active:scale-95 cursor-pointer z-10 ${
            isJewellery
              ? 'bg-gradient-to-r from-[#e5c07b] to-[#b38728] text-[#04120e] hover:brightness-110'
              : 'bg-[#00f5d4] text-[#040814] hover:bg-white'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Quick Add</span>
        </button>
      </div>

      {/* Product Details */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-1.5">
        <div>
          {fabric && (
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-400 block truncate">
              {fabric}
            </span>
          )}
          <h3
            className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
              isJewellery
                ? 'font-serif text-[#f5ebd7] group-hover:text-[#e5c07b]'
                : 'font-sans text-neutral-200 group-hover:text-white'
            }`}
          >
            {name}
          </h3>
        </div>

        <div className="flex items-baseline gap-2 pt-1 border-t border-white/10">
          <span
            className={`text-sm sm:text-base font-bold ${
              isJewellery ? 'text-[#e5c07b]' : 'text-white'
            }`}
          >
            ₹{price.toLocaleString('en-IN')}
          </span>
          {originalPrice && originalPrice > price && (
            <span className="text-[11px] text-neutral-400 line-through">
              ₹{originalPrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}