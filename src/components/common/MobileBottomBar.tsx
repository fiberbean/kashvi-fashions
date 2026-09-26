import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Home,
  LayoutGrid,
  Heart,
  ShoppingBag,
  User,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';

export default function MobileBottomBar() {
  const location = useLocation();
  const { openCart, totalItems } = useCart();
  const { wishlist } = useWishlist();
  const { user } = useAuth();

  const isJewelleryPage =
    location.search.includes('tab=jewellery') ||
    location.pathname.toLowerCase().includes('jewel');

  const openAuth = () => {
    const userBtn = document.querySelector('[aria-label="User Account"]') as HTMLButtonElement | null;
    if (userBtn) {
      userBtn.click();
    } else {
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl border-t transition-all duration-300 bg-white/95 ${
        isJewelleryPage
          ? 'border-amber-100 shadow-[0_-4px_20px_rgba(212,175,55,0.08)]'
          : 'border-pink-100 shadow-[0_-4px_20px_rgba(255,45,133,0.08)]'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
    >
      <div className="grid grid-cols-5 items-center h-15 px-2">
        {/* 1. HOME */}
        <Link
          to={`/?tab=${isJewelleryPage ? 'jewellery' : 'fashions'}`}
          className="flex flex-col items-center justify-center gap-1 py-1 transition-transform active:scale-90"
        >
          <div className="relative">
            <Home
              className={`w-5 h-5 transition-colors ${
                isActive('/') && !location.pathname.includes('/category')
                  ? isJewelleryPage
                    ? 'text-[#b38728] stroke-[2.4]'
                    : 'text-[#ff2d85] stroke-[2.4]'
                  : 'text-stone-400 stroke-[1.8]'
              }`}
            />
          </div>
          <span
            className={`text-[10px] tracking-tight ${
              isActive('/') && !location.pathname.includes('/category')
                ? isJewelleryPage
                  ? 'text-[#b38728] font-bold'
                  : 'text-[#ff2d85] font-bold'
                : 'text-stone-400 font-medium'
            }`}
          >
            Home
          </span>
        </Link>

        {/* 2. CATEGORIES */}
        <Link
          to={`/category/${isJewelleryPage ? 'jewellery' : 'fashions'}`}
          className="flex flex-col items-center justify-center gap-1 py-1 transition-transform active:scale-90"
        >
          <div className="relative">
            <LayoutGrid
              className={`w-5 h-5 transition-colors ${
                isActive('/category')
                  ? isJewelleryPage
                    ? 'text-[#b38728] stroke-[2.4]'
                    : 'text-[#ff2d85] stroke-[2.4]'
                  : 'text-stone-400 stroke-[1.8]'
              }`}
            />
          </div>
          <span
            className={`text-[10px] tracking-tight ${
              isActive('/category')
                ? isJewelleryPage
                  ? 'text-[#b38728] font-bold'
                  : 'text-[#ff2d85] font-bold'
                : 'text-stone-400 font-medium'
            }`}
          >
            {isJewelleryPage ? 'Vault' : 'Boutique'}
          </span>
        </Link>

        {/* 3. WISHLIST */}
        <button
          type="button"
          onClick={() => {
            const heartBtn = document.querySelector('[aria-label="Wishlist"]') as HTMLButtonElement | null;
            if (heartBtn) heartBtn.click();
          }}
          className="flex flex-col items-center justify-center gap-1 py-1 transition-transform active:scale-90 cursor-pointer"
        >
          <div className="relative">
            <Heart
              className={`w-5 h-5 transition-colors ${
                wishlist.length > 0
                  ? isJewelleryPage
                    ? 'text-[#D4AF37] fill-[#D4AF37]/20'
                    : 'text-[#ff2d85] fill-[#ff2d85]/20'
                  : 'text-stone-400 stroke-[1.8]'
              }`}
            />
            {wishlist.length > 0 && (
              <span
                className={`absolute -top-1 -right-1.5 min-w-3.5 h-3.5 px-0.5 rounded-full text-[9px] font-black flex items-center justify-center text-white ${
                  isJewelleryPage ? 'bg-[#D4AF37]' : 'bg-[#ff2d85]'
                }`}
              >
                {wishlist.length > 9 ? '9+' : wishlist.length}
              </span>
            )}
          </div>
          <span className="text-[10px] text-stone-400 font-medium tracking-tight">
            Wishlist
          </span>
        </button>

        {/* 4. BAG / CART */}
        <button
          type="button"
          onClick={openCart}
          className="flex flex-col items-center justify-center gap-1 py-1 transition-transform active:scale-90 cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag
              className={`w-5 h-5 transition-colors ${
                totalItems > 0
                  ? isJewelleryPage
                    ? 'text-[#D4AF37] stroke-[2.2]'
                    : 'text-[#ff2d85] stroke-[2.2]'
                  : 'text-stone-400 stroke-[1.8]'
              }`}
            />
            {totalItems > 0 && (
              <span
                className={`absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center text-white animate-in zoom-in-50 ${
                  isJewelleryPage ? 'bg-[#D4AF37]' : 'bg-[#ff2d85]'
                }`}
              >
                {totalItems}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] tracking-tight ${
              totalItems > 0
                ? isJewelleryPage
                  ? 'text-[#b38728] font-bold'
                  : 'text-[#ff2d85] font-bold'
                : 'text-stone-400 font-medium'
            }`}
          >
            Bag
          </span>
        </button>

        {/* 5. ACCOUNT */}
        <button
          type="button"
          onClick={openAuth}
          className="flex flex-col items-center justify-center gap-1 py-1 transition-transform active:scale-90 cursor-pointer"
        >
          <div className="relative">
            <User
              className={`w-5 h-5 transition-colors ${
                user
                  ? isJewelleryPage
                    ? 'text-[#b38728] stroke-[2.4]'
                    : 'text-[#ff2d85] stroke-[2.4]'
                  : 'text-stone-400 stroke-[1.8]'
              }`}
            />
            {user && (
              <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </div>
          <span
            className={`text-[10px] tracking-tight ${
              user
                ? isJewelleryPage
                  ? 'text-[#b38728] font-bold'
                  : 'text-[#ff2d85] font-bold'
                : 'text-stone-400 font-medium'
            }`}
          >
            {user ? 'Account' : 'Login'}
          </span>
        </button>
      </div>
    </nav>
  );
}