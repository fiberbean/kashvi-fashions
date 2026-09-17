import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';

export default function WishlistModal() {
  const { wishlist, isWishlistOpen, closeWishlist, removeFromWishlist } = useWishlist();
  const { addToCart, openCart } = useCart();

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
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      qty: 1,
      color: item.color,
      size: item.size,
      fabric: item.fabric,
      department: item.department,
    });
    removeFromWishlist(item.id);
    closeWishlist();
    openCart();
  };

  const modalContent = (
    <div
      onClick={closeWishlist}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 cursor-default my-auto animate-in zoom-in-95 duration-200 max-h-[88vh] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-50 text-[#ff4d6d] flex items-center justify-center">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 leading-tight">
                My Wishlist
              </h2>
              <p className="text-[10px] text-neutral-400 font-medium">
                Saved luxury heirlooms & couture edits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {wishlist.length > 0 && (
              <span className="text-xs bg-rose-50 text-[#ff4d6d] font-bold px-2.5 py-0.5 rounded-full border border-rose-100">
                {wishlist.length} {wishlist.length === 1 ? 'Item' : 'Items'}
              </span>
            )}
            <button
              type="button"
              onClick={closeWishlist}
              className="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-900 text-neutral-500 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-3 flex-1">
          {wishlist.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-300 mx-auto">
                <Heart className="w-8 h-8 stroke-1" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-neutral-800 text-base">Your Wishlist is Empty</h4>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto mt-1">
                  Save your favorite sarees, silk sets, and royal jewellery to inspect or purchase later.
                </p>
              </div>
              <button
                type="button"
                onClick={closeWishlist}
                className="mt-2 px-6 py-2.5 rounded-full bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all cursor-pointer shadow-md"
              >
                Explore Collections
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {wishlist.map((item) => {
                const isJewelleryItem = item.department === 'jewellery';

                return (
                  <div
                    key={item.id}
                    className="flex gap-3.5 p-3 rounded-2xl border border-neutral-100 bg-neutral-50/50 hover:border-neutral-200 transition-all items-center shadow-2xs"
                  >
                    <div className="w-16 h-20 rounded-xl overflow-hidden bg-white shrink-0 border border-neutral-100">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-neutral-900 truncate leading-snug">
                            {item.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeFromWishlist(item.id)}
                            className="text-neutral-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                            title="Remove from Wishlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-neutral-500">
                          {item.color && <span className="capitalize">Color: {item.color}</span>}
                          {item.size && <span>• Size: {item.size}</span>}
                          {item.fabric && <span>• {item.fabric}</span>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span
                          className={`text-sm font-bold font-serif ${
                            isJewelleryItem ? 'text-[#0b3b2c]' : 'text-neutral-950'
                          }`}
                        >
                          ₹{item.price.toLocaleString('en-IN')}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleMoveToBag(item)}
                          className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
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