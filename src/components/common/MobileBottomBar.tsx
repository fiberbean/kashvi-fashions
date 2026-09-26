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

  // Native Mobile Haptic Touch Feedback
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      navigator.vibrate(12);
    }
  };

  const openAuth = () => {
    triggerHaptic();
    const userBtn = document.querySelector('[aria-label="User Account"]') as HTMLButtonElement | null;
    if (userBtn) {
      userBtn.click();
    } else {
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' && !location.pathname.includes('/category');
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className={`md:hidden fixed bottom-0 inset-x-0 z-50 transition-all duration-300 select-none ${
        isJewelleryPage
          ? 'bg-[#0f172a]/92 backdrop-blur-2xl border-t border-[#e5c07b]/25 shadow-[0_-8px_30px_rgba(0,0,0,0.85)]'
          : 'bg-[#0b101e]/92 backdrop-blur-2xl border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.85)]'
      }`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)' }}
    >
      <div className="grid grid-cols-5 items-center h-14 px-3 max-w-md mx-auto">
        
        {/* 1. HOME */}
        <Link
          to={`/?tab=${isJewelleryPage ? 'jewellery' : 'fashions'}`}
          onClick={triggerHaptic}
          className="flex flex-col items-center justify-center gap-0.5 py-1 transition-all active:scale-[0.84] relative"
        >
          {isActive('/') && (
            <span
              className={`absolute -top-1 w-6 h-0.5 rounded-full ${
                isJewelleryPage
                  ? 'bg-[#ffd700] shadow-[0_0_8px_#ffd700]'
                  : 'bg-[#00f5d4] shadow-[0_0_8px_#00f5d4]'
              }`}
            />
          )}
          <div className="relative p-1">
            <Home
              className={`w-5 h-5 transition-all ${
                isActive('/')
                  ? isJewelleryPage
                    ? 'text-[#ffd700] stroke-[2.4] scale-110 drop-shadow-[0_0_6px_rgba(255,215,0,0.4)]'
                    : 'text-[#00f5d4] stroke-[2.4] scale-110 drop-shadow-[0_0_6px_rgba(0,245,212,0.4)]'
                  : 'text-slate-400 stroke-[1.8]'
              }`}
            />
          </div>
          <span
            className={`text-[9.5px] tracking-tight ${
              isActive('/')
                ? isJewelleryPage
                  ? 'text-[#ffd700] font-bold'
                  : 'text-[#00f5d4] font-bold'
                : 'text-slate-400 font-medium'
            }`}
          >
            Home
          </span>
        </Link>

        {/* 2. CATEGORIES */}
        <Link
          to={`/category/${isJewelleryPage ? 'jewellery' : 'fashions'}`}
          onClick={triggerHaptic}
          className="flex flex-col items-center justify-center gap-0.5 py-1 transition-all active:scale-[0.84] relative"
        >
          {isActive('/category') && (
            <span
              className={`absolute -top-1 w-6 h-0.5 rounded-full ${
                isJewelleryPage
                  ? 'bg-[#ffd700] shadow-[0_0_8px_#ffd700]'
                  : 'bg-[#00f5d4] shadow-[0_0_8px_#00f5d4]'
              }`}
            />
          )}
          <div className="relative p-1">
            <LayoutGrid
              className={`w-5 h-5 transition-all ${
                isActive('/category')
                  ? isJewelleryPage
                    ? 'text-[#ffd700] stroke-[2.4] scale-110 drop-shadow-[0_0_6px_rgba(255,215,0,0.4)]'
                    : 'text-[#00f5d4] stroke-[2.4] scale-110 drop-shadow-[0_0_6px_rgba(0,245,212,0.4)]'
                  : 'text-slate-400 stroke-[1.8]'
              }`}
            />
          </div>
          <span
            className={`text-[9.5px] tracking-tight ${
              isActive('/category')
                ? isJewelleryPage
                  ? 'text-[#ffd700] font-bold'
                  : 'text-[#00f5d4] font-bold'
                : 'text-slate-400 font-medium'
            }`}
          >
            {isJewelleryPage ? 'Vault' : 'Categories'}
          </span>
        </Link>

        {/* 3. WISHLIST */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            const heartBtn = document.querySelector('[aria-label="Wishlist"]') as HTMLButtonElement | null;
            if (heartBtn) heartBtn.click();
          }}
          className="flex flex-col items-center justify-center gap-0.5 py-1 transition-all active:scale-[0.84] cursor-pointer relative"
        >
          <div className="relative p-1">
            <Heart
              className={`w-5 h-5 transition-all ${
                wishlist.length > 0
                  ? isJewelleryPage
                    ? 'text-[#ffd700] fill-[#ffd700]/30 stroke-[2]'
                    : 'text-[#ff2d85] fill-[#ff2d85]/30 stroke-[2]'
                  : 'text-slate-400 stroke-[1.8]'
              }`}
            />
            {wishlist.length > 0 && (
              <span
                className={`absolute top-0 right-0 min-w-3.5 h-3.5 px-1 rounded-full text-[8.5px] font-black flex items-center justify-center text-white ${
                  isJewelleryPage ? 'bg-[#ffd700] text-black font-extrabold' : 'bg-[#ff2d85]'
                }`}
              >
                {wishlist.length > 9 ? '9+' : wishlist.length}
              </span>
            )}
          </div>
          <span className="text-[9.5px] text-slate-400 font-medium tracking-tight">
            Saved
          </span>
        </button>

        {/* 4. BAG / CART */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            openCart();
          }}
          className="flex flex-col items-center justify-center gap-0.5 py-1 transition-all active:scale-[0.84] cursor-pointer relative"
        >
          <div className="relative p-1">
            <ShoppingBag
              className={`w-5 h-5 transition-all ${
                totalItems > 0
                  ? isJewelleryPage
                    ? 'text-[#ffd700] stroke-[2.2] scale-110 drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]'
                    : 'text-[#00f5d4] stroke-[2.2] scale-110 drop-shadow-[0_0_6px_rgba(0,245,212,0.5)]'
                  : 'text-slate-400 stroke-[1.8]'
              }`}
            />
            {totalItems > 0 && (
              <span
                className={`absolute -top-0.5 -right-1 min-w-4 h-4 px-1 rounded-full text-[8.5px] font-black flex items-center justify-center text-white animate-in zoom-in-75 ${
                  isJewelleryPage ? 'bg-[#ffd700] text-black font-extrabold' : 'bg-[#00f5d4] text-black font-black'
                }`}
              >
                {totalItems}
              </span>
            )}
          </div>
          <span
            className={`text-[9.5px] tracking-tight ${
              totalItems > 0
                ? isJewelleryPage
                  ? 'text-[#ffd700] font-bold'
                  : 'text-[#00f5d4] font-bold'
                : 'text-slate-400 font-medium'
            }`}
          >
            Bag
          </span>
        </button>

        {/* 5. ACCOUNT */}
        <button
          type="button"
          onClick={openAuth}
          className="flex flex-col items-center justify-center gap-0.5 py-1 transition-all active:scale-[0.84] cursor-pointer relative"
        >
          <div className="relative p-1">
            <User
              className={`w-5 h-5 transition-all ${
                user
                  ? isJewelleryPage
                    ? 'text-[#ffd700] stroke-[2.4]'
                    : 'text-[#00f5d4] stroke-[2.4]'
                  : 'text-slate-400 stroke-[1.8]'
              }`}
            />
            {user && (
              <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-[#00ff9d] ring-2 ring-[#0b101e]" />
            )}
          </div>
          <span
            className={`text-[9.5px] tracking-tight ${
              user
                ? isJewelleryPage
                  ? 'text-[#ffd700] font-bold'
                  : 'text-[#00f5d4] font-bold'
                : 'text-slate-400 font-medium'
            }`}
          >
            {user ? 'Profile' : 'Login'}
          </span>
        </button>

      </div>
    </nav>
  );
}