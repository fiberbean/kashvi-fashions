import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';

export default function WishlistModal() {
  const { wishlist, isWishlistOpen, closeWishlist, removeFromWishlist } = useWishlist() as any;
  const { addToCart, openCart, openCartDrawer } = useCart() as any;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeWishlist();
    };
    if (isWishlistOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWishlistOpen, closeWishlist]);

  if (!isWishlistOpen) return null;

  const handleMoveToBag = (item: any) => {
    const itemPrice = Number(item.price || item.selling_price || 0);
    const itemColor = item.color || item.variant_color || 'Standard';
    const itemSize = item.size || item.variant_size || 'Free Size';

    // Full property mapping to avoid CartContext & Navbar counter issues
    addToCart({
      id: item.id.includes('-') ? item.id : `${item.id}-${itemSize}-${itemColor}`,
      productId: item.productId || item.product_id || item.id,
      product_id: item.productId || item.product_id || item.id,
      name: item.name,
      price: itemPrice,
      selling_price: itemPrice,
      mrp: item.mrp || item.originalPrice || undefined,
      image: item.image,
      image_url: item.image,
      quantity: 1,
      qty: 1,
      color: itemColor,
      size: itemSize,
      variant_color: itemColor,
      variant_size: itemSize,
      fabric: item.fabric,
      department: item.department || 'fashions',
    });

    removeFromWishlist(item.id);
    closeWishlist();

    if (typeof openCartDrawer === 'function') {
      openCartDrawer();
    } else if (typeof openCart === 'function') {
      openCart();
    }
  };

  const modalContent = (
    <div
      onClick={closeWishlist}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(255,182,193,0.35)] overflow-hidden border border-pink-100 cursor-default my-auto animate-in zoom-in-95 duration-200 max-h-[88vh] flex flex-col text-stone-900"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-pink-50 text-[#ff2d85] flex items-center justify-center shadow-xs">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                My Wishlist
              </h2>
              <p className="text-[10px] text-stone-400 font-medium">
                Saved boutique couture & royal vault pieces
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {wishlist.length > 0 && (
              <span className="text-xs bg-pink-50 text-[#ff2d85] font-bold px-2.5 py-0.5 rounded-full border border-pink-200/60">
                {wishlist.length} {wishlist.length === 1 ? 'Item' : 'Items'}
              </span>
            )}
            <button
              type="button"
              onClick={closeWishlist}
              className="p-1.5 rounded-full bg-stone-100 hover:bg-pink-50 text-stone-500 hover:text-[#ff2d85] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-3 flex-1">
          {wishlist.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-pink-50/70 border border-pink-100 flex items-center justify-center text-pink-300 mx-auto shadow-xs">
                <Heart className="w-8 h-8 stroke-1" />
              </div>
              <div>
                <h4 className="font-bold text-stone-800 text-base">Your Wishlist is Empty</h4>
                <p className="text-xs text-stone-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Save your favorite sarees, designer lehengas, and royal jewellery to inspect or purchase later.
                </p>
              </div>
              <button
                type="button"
                onClick={closeWishlist}
                className="mt-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#ff2d85] to-[#ff639f] hover:brightness-105 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
              >
                Explore Collections
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {wishlist.map((item: any) => {
                const isJewelleryItem = item.department === 'jewellery';

                return (
                  <div
                    key={item.id}
                    className={`flex gap-3.5 p-3 rounded-2xl border transition-all items-center bg-white shadow-2xs ${
                      isJewelleryItem
                        ? 'border-amber-200/80 hover:border-amber-300 hover:shadow-amber-50'
                        : 'border-pink-200/80 hover:border-pink-300 hover:shadow-pink-50'
                    }`}
                  >
                    <div className="w-16 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-xs font-bold truncate leading-snug ${
                            isJewelleryItem ? 'font-cinzel text-stone-900' : 'font-sans text-stone-900'
                          }`}>
                            {item.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeFromWishlist(item.id)}
                            className="text-stone-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                            title="Remove from Wishlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-stone-500">
                          {item.color && <span className="capitalize">Color: {item.color}</span>}
                          {item.size && <span>• Size: {item.size}</span>}
                          {item.fabric && <span>• {item.fabric}</span>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span
                          className={`text-sm font-bold ${
                            isJewelleryItem ? 'text-[#b38728] font-cinzel' : 'text-stone-950 font-sans'
                          }`}
                        >
                          ₹{Number(item.price || item.selling_price || 0).toLocaleString('en-IN')}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleMoveToBag(item)}
                          className={`px-3 py-1.5 rounded-xl text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                            isJewelleryItem
                              ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:brightness-105'
                              : 'bg-gradient-to-r from-[#ff2d85] to-[#ff639f] hover:brightness-105'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Move to Bag</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}