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
      id,
      name,
      price,
      image,
      qty: 1,
      color: colors[0],
      size: sizes[0],
      fabric,
      department,
    });
    openCart();
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col bg-white rounded-2xl overflow-hidden border border-neutral-100 hover:border-neutral-200 transition-all duration-300 shadow-2xs hover:shadow-md cursor-pointer"
    >
      {/* Product Image Container */}
      <div className="relative aspect-3/4 w-full overflow-hidden bg-neutral-50">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Badge */}
        {badge && (
          <span
            className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-xs ${
              isJewellery
                ? 'bg-[#0b3b2c] text-[#e5c07b] border border-[#e5c07b]/30'
                : 'bg-[#ff4d6d] text-white shadow-[#ff4d6d]/30'
            }`}
          >
            {badge}
          </span>
        )}

        {/* Wishlist Heart Button */}
        <button
          type="button"
          aria-label={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
          onClick={handleWishlistToggle}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-xs transition-transform active:scale-90 hover:bg-white z-10"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorited
                ? 'fill-[#ff4d6d] text-[#ff4d6d]'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          />
        </button>

        {/* Quick Add to Bag Overlay Button */}
        <button
          type="button"
          onClick={handleQuickAdd}
          className="absolute bottom-2.5 left-2.5 right-2.5 py-2 rounded-xl bg-white/95 backdrop-blur-xs text-neutral-900 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md hover:bg-neutral-900 hover:text-white"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Quick Add</span>
        </button>
      </div>

      {/* Product Details */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-1.5">
        <div>
          {fabric && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block truncate">
              {fabric}
            </span>
          )}
          <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate group-hover:text-[#ff4d6d] transition-colors">
            {name}
          </h3>
        </div>

        <div className="flex items-baseline gap-2 mt-0.5">
          <span
            className={`text-sm sm:text-base font-serif font-black ${
              isJewellery ? 'text-[#0b3b2c]' : 'text-neutral-950'
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