import React from 'react';
import type { Product } from '../types';
import { ShoppingBag, Star, Heart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  isJewellery?: boolean;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isJewellery = false,
  onAddToCart,
}) => {
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <div
      className={`group bg-white rounded-2xl border overflow-hidden transition-all duration-300 flex flex-col justify-between hover:shadow-xl ${
        isJewellery
          ? 'border-[#0b3b2c]/10 hover:border-[#0b3b2c]/30 shadow-xs'
          : 'border-[#ff4d6d]/15 hover:border-[#ff4d6d]/30 shadow-xs'
      }`}
    >
      <div className="relative aspect-3/4 overflow-hidden bg-neutral-100">
        <img
          src={
            product.image_url ||
            (isJewellery
              ? 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80'
              : 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80')
          }
          alt={product.name}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Discount Tag */}
        {discount > 0 && (
          <span
            className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-white shadow-xs ${
              isJewellery ? 'bg-[#0b3b2c]' : 'bg-[#ff4d6d]'
            }`}
          >
            {discount}% OFF
          </span>
        )}

        {/* Wishlist Icon */}
        <button
          type="button"
          aria-label="Add to Wishlist"
          className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/80 backdrop-blur-xs text-neutral-700 hover:text-rose-600 transition-colors shadow-xs opacity-0 group-hover:opacity-100 duration-200"
        >
          <Heart className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-col flex-grow justify-between">
        <div>
          <p
            className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
              isJewellery ? 'text-[#b38728]' : 'text-[#ff4d6d]'
            }`}
          >
            {product.category}
          </p>
          <h3 className="text-sm font-serif font-bold text-neutral-900 line-clamp-1 group-hover:underline">
            {product.name}
          </h3>

          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex text-amber-400">
              <Star className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="text-xs font-semibold text-neutral-800">
              {product.rating || 4.9}
            </span>
            <span className="text-[11px] text-neutral-400">
              ({product.reviews_count || 85})
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-neutral-950">₹{product.price}</span>
            {product.original_price && (
              <span className="text-xs text-neutral-400 line-through">
                ₹{product.original_price}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 shadow-2xs ${
              isJewellery
                ? 'bg-[#0b3b2c] hover:bg-[#082a20] text-[#e5c07b]'
                : 'bg-[#ff4d6d] hover:bg-[#e03a58] text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
};