import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, LayoutGrid, Heart, ShoppingBag, User } from 'lucide-react';
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

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
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

  const isHomeActive = location.pathname === '/';
  const isCategoryActive = location.pathname.startsWith('/category');
  const activeColor = isJewelleryPage ? '#D4AF37' : '#ff2d85';

  const navItemClass =
    'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 h-[58px] active:scale-[0.92] transition-transform';

  return (
    <nav
      className={`md:hidden fixed bottom-0 inset-x-0 z-50 select-none border-t backdrop-blur-2xl ${
        isJewelleryPage
          ? 'bg-[#0b1712]/95 border-[#D4AF37]/25 shadow-[0_-10px_35px_rgba(0,0,0,0.22)]'
          : 'bg-white/96 border-stone-200/80 shadow-[0_-10px_35px_rgba(0,0,0,0.10)]'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex h-[64px] w-full max-w-lg px-2">
        <Link
          to={`/?tab=${isJewelleryPage ? 'jewellery' : 'fashions'}`}
          onClick={triggerHaptic}
          className={navItemClass}
        >
          {isHomeActive && (
            <span
              className="absolute top-0 h-[3px] w-8 rounded-b-full"
              style={{ backgroundColor: activeColor, boxShadow: `0 0 10px ${activeColor}66` }}
            />
          )}
          <Home
            className="h-[21px] w-[21px]"
            style={{ color: isHomeActive ? activeColor : isJewelleryPage ? '#a6aaa7' : '#8b8b8b' }}
            strokeWidth={isHomeActive ? 2.4 : 1.8}
          />
          <span
            className={`text-[10px] leading-none ${isHomeActive ? 'font-bold' : 'font-medium'}`}
            style={{ color: isHomeActive ? activeColor : isJewelleryPage ? '#a6aaa7' : '#777' }}
          >
            Home
          </span>
        </Link>

        <Link
          to={`/category/${isJewelleryPage ? 'jewellery' : 'fashions'}`}
          onClick={triggerHaptic}
          className={navItemClass}
        >
          {isCategoryActive && (
            <span
              className="absolute top-0 h-[3px] w-8 rounded-b-full"
              style={{ backgroundColor: activeColor, boxShadow: `0 0 10px ${activeColor}66` }}
            />
          )}
          <LayoutGrid
            className="h-[21px] w-[21px]"
            style={{ color: isCategoryActive ? activeColor : isJewelleryPage ? '#a6aaa7' : '#8b8b8b' }}
            strokeWidth={isCategoryActive ? 2.4 : 1.8}
          />
          <span
            className={`text-[10px] leading-none ${isCategoryActive ? 'font-bold' : 'font-medium'}`}
            style={{ color: isCategoryActive ? activeColor : isJewelleryPage ? '#a6aaa7' : '#777' }}
          >
            {isJewelleryPage ? 'Explore' : 'Categories'}
          </span>
        </Link>

        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            const heartBtn = document.querySelector('[aria-label="Wishlist"]') as HTMLButtonElement | null;
            if (heartBtn) heartBtn.click();
          }}
          className={navItemClass}
          aria-label="Mobile Wishlist"
        >
          <div className="relative">
            <Heart
              className="h-[21px] w-[21px]"
              style={{
                color: wishlist.length > 0 ? activeColor : isJewelleryPage ? '#a6aaa7' : '#8b8b8b',
                fill: wishlist.length > 0 ? `${activeColor}22` : 'none',
              }}
              strokeWidth={wishlist.length > 0 ? 2.1 : 1.8}
            />
            {wishlist.length > 0 && (
              <span
                className="absolute -right-2 -top-2 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[8px] font-black"
                style={{ backgroundColor: activeColor, color: isJewelleryPage ? '#111' : '#fff' }}
              >
                {wishlist.length > 99 ? '99+' : wishlist.length}
              </span>
            )}
          </div>
          <span
            className="text-[10px] font-medium leading-none"
            style={{ color: isJewelleryPage ? '#a6aaa7' : '#777' }}
          >
            Wishlist
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            openCart();
          }}
          className={navItemClass}
          aria-label="Mobile Shopping Bag"
        >
          <div className="relative">
            <ShoppingBag
              className="h-[21px] w-[21px]"
              style={{ color: totalItems > 0 ? activeColor : isJewelleryPage ? '#a6aaa7' : '#8b8b8b' }}
              strokeWidth={totalItems > 0 ? 2.1 : 1.8}
            />
            {totalItems > 0 && (
              <span
                className="absolute -right-2 -top-2 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[8px] font-black"
                style={{ backgroundColor: activeColor, color: isJewelleryPage ? '#111' : '#fff' }}
              >
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] leading-none ${totalItems > 0 ? 'font-bold' : 'font-medium'}`}
            style={{ color: totalItems > 0 ? activeColor : isJewelleryPage ? '#a6aaa7' : '#777' }}
          >
            Bag
          </span>
        </button>

        <button
          type="button"
          onClick={openAuth}
          className={navItemClass}
          aria-label="Mobile Account"
        >
          <div className="relative">
            <User
              className="h-[21px] w-[21px]"
              style={{ color: user ? activeColor : isJewelleryPage ? '#a6aaa7' : '#8b8b8b' }}
              strokeWidth={user ? 2.2 : 1.8}
            />
            {user && (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full"
                style={{
                  backgroundColor: '#22c55e',
                  boxShadow: isJewelleryPage ? '0 0 0 2px #0b1712' : '0 0 0 2px white',
                }}
              />
            )}
          </div>
          <span
            className={`text-[10px] leading-none ${user ? 'font-bold' : 'font-medium'}`}
            style={{ color: user ? activeColor : isJewelleryPage ? '#a6aaa7' : '#777' }}
          >
            {user ? 'Profile' : 'Account'}
          </span>
        </button>
      </div>
    </nav>
  );
}
