import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Sparkles, X, Crown, Gem, User, Heart, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';

import fashionLogo from '../assets/fashion-logo.png';
import jewelleryLogo from '../assets/jewellery-logo.png';

export default function Navbar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { user, openAuthModal, openProfileModal } = useAuth();
  const wishlistContext = useWishlist() as any;
  const cartContext = useCart() as any;

  const currentTab = searchParams.get('tab') || 'fashions';
  const isJewellery = currentTab === 'jewellery';

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentLogo = isJewellery ? jewelleryLogo : fashionLogo;
  const brandAlt = isJewellery ? 'Kashvi Jewellery' : 'Kashvi Fashions';

  const wishlistArray =
    wishlistContext?.wishlistItems ||
    wishlistContext?.wishlist ||
    wishlistContext?.items ||
    [];

  const wishlistCount =
    typeof wishlistContext?.wishlistCount === 'number'
      ? wishlistContext.wishlistCount
      : Array.isArray(wishlistArray)
        ? wishlistArray.length
        : 0;

  const rawCartList =
    cartContext?.cartItems ||
    cartContext?.items ||
    cartContext?.cart ||
    [];

  const cartList = Array.isArray(rawCartList) ? rawCartList : [];

  const computedCount = cartList.reduce((sum: number, item: any) => {
    const q = Number(item?.quantity ?? item?.qty ?? item?.count ?? 1);
    return sum + (Number.isFinite(q) && q > 0 ? q : 1);
  }, 0);

  const cartCount =
    typeof cartContext?.totalItems === 'number'
      ? cartContext.totalItems
      : typeof cartContext?.itemCount === 'number'
        ? cartContext.itemCount
        : typeof cartContext?.cartCount === 'number'
          ? cartContext.cartCount
          : computedCount;

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }
  };

  const handleTabSwitch = (tab: 'fashions' | 'jewellery') => {
    triggerHaptic();
    if (location.pathname === '/') {
      setSearchParams({ tab });
    } else {
      navigate(`/?tab=${tab}`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    navigate(`/search?q=${encodeURIComponent(query)}&dept=${currentTab}`);
    setIsSearchOpen(false);
    triggerHaptic();
  };

  const handleUserClick = () => {
    triggerHaptic();

    if (user) {
      openProfileModal();
    } else {
      openAuthModal();
    }
  };

  const handleWishlistClick = () => {
    triggerHaptic();
    if (typeof wishlistContext?.openWishlistModal === 'function') {
      wishlistContext.openWishlistModal();
    } else if (typeof wishlistContext?.openWishlist === 'function') {
      wishlistContext.openWishlist();
    }
  };

  const handleCartClick = () => {
    triggerHaptic();
    if (typeof cartContext?.openCartDrawer === 'function') {
      cartContext.openCartDrawer();
    } else if (typeof cartContext?.openCart === 'function') {
      cartContext.openCart();
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full overflow-x-clip bg-white/95 backdrop-blur-xl border-b transition-all duration-300 ${
        isJewellery
          ? 'border-amber-100/80 shadow-[0_4px_24px_rgba(212,175,55,0.08)]'
          : 'border-stone-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)]'
      }`}
    >
      <div
        className={`hidden sm:block w-full py-1.5 text-center text-[10px] font-semibold tracking-[0.16em] uppercase border-b px-2 ${
          isJewellery
            ? 'bg-[#FAF6EE] text-[#b38728] border-amber-100/80'
            : 'bg-[#FFF5F8] text-[#ff2d85] border-pink-100/80'
        }`}
      >
        <span className="inline-flex items-center gap-2 font-sans">
          <Sparkles className="w-2.5 h-2.5 opacity-80" />
          Complimentary Insured Delivery Across India
          <Sparkles className="w-2.5 h-2.5 opacity-80" />
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-[62px] sm:h-20 flex items-center gap-2 sm:gap-4">
        <Link
          to={`/?tab=${currentTab}`}
          onClick={triggerHaptic}
          className="group flex items-center shrink-0"
          aria-label={brandAlt}
        >
          <div
            className={`relative h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl overflow-hidden p-1 border flex items-center justify-center ${
              isJewellery
                ? 'bg-gradient-to-br from-[#0f281e] to-[#071610] border-[#D4AF37]/50 shadow-[0_3px_12px_rgba(212,175,55,0.20)]'
                : 'bg-white border-stone-200/80 shadow-[0_3px_12px_rgba(0,0,0,0.05)]'
            }`}
          >
            <img src={currentLogo} alt={brandAlt} className="w-full h-full object-contain" />
          </div>
        </Link>

        <div className="flex-1 min-w-0 flex justify-center">
          <div
            className={`flex min-w-0 items-center gap-1 p-1 rounded-full border w-full max-w-[285px] sm:max-w-[320px] ${
              isJewellery
                ? 'bg-stone-50/90 border-amber-200/70'
                : 'bg-stone-50/90 border-pink-200/60'
            }`}
          >
            <button
              type="button"
              onClick={() => handleTabSwitch('fashions')}
              className={`flex-1 min-w-0 h-9 sm:h-10 rounded-full transition-all flex items-center justify-center gap-1.5 ${
                !isJewellery
                  ? 'bg-gradient-to-r from-[#ff2d85] to-[#ff639f] text-white shadow-[0_3px_12px_rgba(255,45,133,0.28)]'
                  : 'text-stone-600 active:scale-95'
              }`}
            >
              <Crown className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[13px] sm:text-[15px] font-semibold tracking-wide">Fashions</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch('jewellery')}
              className={`flex-1 min-w-0 h-9 sm:h-10 rounded-full transition-all flex items-center justify-center gap-1.5 ${
                isJewellery
                  ? 'bg-gradient-to-r from-[#D4AF37] via-[#DFBF58] to-[#B8860B] text-stone-950 shadow-[0_3px_14px_rgba(212,175,55,0.30)]'
                  : 'text-stone-600 active:scale-95'
              }`}
            >
              <Gem className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[12px] sm:text-[13px] font-semibold tracking-[0.04em]">Jewellery</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          aria-label="Search"
          onClick={() => {
            triggerHaptic();
            setIsSearchOpen((prev) => !prev);
          }}
          className={`md:hidden shrink-0 w-10 h-10 rounded-full flex items-center justify-center active:scale-90 ${
            isJewellery ? 'bg-[#FAF6EE] text-[#9d741b]' : 'bg-[#FFF1F6] text-[#ff2d85]'
          }`}
        >
          <Search className="w-[19px] h-[19px]" strokeWidth={2} />
        </button>

        <div className="hidden md:flex items-center gap-1 shrink-0">
          <button type="button" aria-label="Search" onClick={() => setIsSearchOpen((prev) => !prev)} className="flex items-center justify-center w-10 h-10 rounded-full active:scale-95">
            <Search className={`w-5 h-5 ${isJewellery ? 'text-[#8f6b1b]' : 'text-stone-700'}`} />
          </button>

          <button type="button" onClick={handleUserClick} aria-label="User Account" className="relative flex items-center justify-center w-10 h-10 rounded-full active:scale-95">
            <User className={`w-5 h-5 ${user ? (isJewellery ? 'text-[#D4AF37]' : 'text-[#ff2d85]') : 'text-stone-700'}`} strokeWidth={1.8} />
          </button>

          <button type="button" onClick={handleWishlistClick} aria-label="Wishlist" className="relative flex items-center justify-center w-10 h-10 rounded-full active:scale-95">
            <Heart
              className={`w-5 h-5 ${
                wishlistCount > 0
                  ? isJewellery ? 'fill-[#D4AF37] text-[#D4AF37]' : 'fill-[#ff2d85] text-[#ff2d85]'
                  : 'text-stone-700'
              }`}
              strokeWidth={1.8}
            />
            {wishlistCount > 0 && (
              <span className={`absolute top-0 right-0 min-w-[17px] h-[17px] px-1 text-[9px] font-bold rounded-full flex items-center justify-center ${isJewellery ? 'bg-[#D4AF37] text-stone-950' : 'bg-[#ff2d85] text-white'}`}>
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            )}
          </button>

          <button type="button" onClick={handleCartClick} aria-label="Shopping Bag" className="relative flex items-center justify-center w-10 h-10 rounded-full active:scale-95">
            <ShoppingBag className={`w-5 h-5 ${isJewellery ? 'text-[#8f6b1b]' : 'text-stone-700'}`} strokeWidth={1.8} />
            {cartCount > 0 && (
              <span className={`absolute top-0 right-0 min-w-[18px] h-[18px] px-1 text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white ${isJewellery ? 'bg-[#D4AF37] text-stone-950' : 'bg-[#ff2d85] text-white'}`}>
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {isSearchOpen && (
        <div className={`w-full border-t px-3 py-2.5 sm:py-3 ${isJewellery ? 'bg-[#FBF9F5] border-amber-200/50' : 'bg-[#FAF8F5] border-pink-200/40'}`}>
          <form
            onSubmit={handleSearchSubmit}
            className={`max-w-2xl mx-auto flex items-center gap-2 rounded-2xl px-3 py-2.5 border bg-white shadow-sm ${
              isJewellery ? 'border-amber-200/70 focus-within:border-amber-400' : 'border-pink-200/70 focus-within:border-[#ff2d85]'
            }`}
          >
            <Search className={`w-4 h-4 shrink-0 ${isJewellery ? 'text-[#b38728]' : 'text-[#ff2d85]'}`} />
            <input
              type="text"
              autoFocus
              placeholder={isJewellery ? 'Search jewellery...' : 'Search products...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-w-0 bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="shrink-0 text-[11px] text-stone-400 font-semibold px-1">
                Clear
              </button>
            )}
            <button
              type="submit"
              className={`shrink-0 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider ${
                isJewellery ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-stone-950' : 'bg-gradient-to-r from-[#ff2d85] to-[#ff639f] text-white'
              }`}
            >
              Search
            </button>
            <button type="button" aria-label="Close search" onClick={() => setIsSearchOpen(false)} className="shrink-0 p-1 text-stone-400">
              <X className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
