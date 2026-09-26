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

  const { user, openAuthModal, openProfileModal } = useAuth() as any;
  const wishlistContext = useWishlist() as any;
  const cartContext = useCart() as any;

  const currentTab = searchParams.get('tab') || 'fashions';
  const isJewellery = currentTab === 'jewellery';

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentLogo = isJewellery ? jewelleryLogo : fashionLogo;
  const brandAlt = isJewellery ? 'Kashvi Jewellery' : 'Kashvi Fashions';

  const wishlistArray = wishlistContext?.wishlistItems || wishlistContext?.wishlist || wishlistContext?.items || [];
  const wishlistCount = typeof wishlistContext?.wishlistCount === 'number' 
    ? wishlistContext.wishlistCount 
    : wishlistArray.length || 0;

  const rawCartList = cartContext?.cartItems || cartContext?.items || cartContext?.cart || [];
  const cartList = Array.isArray(rawCartList) ? rawCartList : [];
  
  const computedCount = cartList.reduce((sum: number, item: any) => {
    const q = Number(item?.quantity ?? item?.qty ?? item?.count ?? 1);
    return sum + (isNaN(q) || q <= 0 ? 1 : q);
  }, 0);

  const cartCount = typeof cartContext?.totalItems === 'number'
    ? cartContext.totalItems
    : typeof cartContext?.itemCount === 'number'
    ? cartContext.itemCount
    : typeof cartContext?.cartCount === 'number'
    ? cartContext.cartCount
    : computedCount;

  const handleTabSwitch = (tab: 'fashions' | 'jewellery') => {
    if (location.pathname === '/') {
      setSearchParams({ tab });
    } else {
      navigate(`/?tab=${tab}`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}&dept=${currentTab}`);
    setIsSearchOpen(false);
  };

  const handleUserClick = () => {
    if (user) {
      if (typeof openProfileModal === 'function') openProfileModal();
    } else {
      if (typeof openAuthModal === 'function') openAuthModal();
    }
  };

  const handleWishlistClick = () => {
    if (typeof wishlistContext?.openWishlistModal === 'function') {
      wishlistContext.openWishlistModal();
    } else if (typeof wishlistContext?.openWishlist === 'function') {
      wishlistContext.openWishlist();
    }
  };

  const handleCartClick = () => {
    if (typeof cartContext?.openCartDrawer === 'function') {
      cartContext.openCartDrawer();
    } else if (typeof cartContext?.openCart === 'function') {
      cartContext.openCart();
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-white transition-all duration-300 border-b ${
        isJewellery
          ? 'border-amber-100/70 shadow-[0_10px_30px_-5px_rgba(212,175,55,0.12),0_4px_6px_-2px_rgba(0,0,0,0.03)] text-stone-900'
          : 'border-stone-100 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.08),0_4px_6px_-2px_rgba(0,0,0,0.04)] text-stone-900'
      }`}
    >
      {/* Top Delivery Strip */}
      <div
        className={`w-full py-1 text-center text-[9.5px] sm:text-[10px] font-semibold tracking-wider sm:tracking-widest uppercase transition-colors border-b px-2 ${
          isJewellery
            ? 'bg-[#FAF6EE] text-[#b38728] border-amber-100/80'
            : 'bg-[#FFF5F8] text-[#ff2d85] border-pink-100/80'
        }`}
      >
        <span className="inline-flex items-center gap-1.5 font-sans truncate">
          <Sparkles className="w-2.5 h-2.5 shrink-0 opacity-80" />
          <span className="truncate">Complimentary Insured Delivery Across India</span>
          <Sparkles className="w-2.5 h-2.5 shrink-0 opacity-80" />
        </span>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-20 flex items-center justify-between gap-3 sm:gap-4">
        
        {/* Left: Brand Logo */}
        <div className="flex items-center shrink-0">
          <Link to={`/?tab=${currentTab}`} className="group flex items-center">
            <div
              className={`relative h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl overflow-hidden p-1 transition-all duration-300 border flex items-center justify-center shrink-0 ${
                isJewellery
                  ? 'bg-gradient-to-br from-[#0f281e] to-[#071610] border-[#D4AF37]/50 shadow-[0_4px_12px_rgba(212,175,55,0.25)] group-hover:scale-105'
                  : 'bg-white border-stone-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.05)] group-hover:scale-105'
              }`}
            >
              <img
                src={currentLogo}
                alt={brandAlt}
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          </Link>
        </div>

        {/* Center / Right for Mobile: Fashions / Jewellery Switcher */}
        <div className="flex items-center justify-end sm:justify-center flex-1 sm:flex-initial">
          <div
            className={`flex items-center gap-1.5 p-1 sm:p-1.5 rounded-full border transition-all duration-300 w-[240px] sm:w-[320px] backdrop-blur-md ${
              isJewellery
                ? 'bg-stone-50/90 border-amber-200/70 shadow-[0_4px_20px_rgba(212,175,55,0.12)]'
                : 'bg-stone-50/90 border-pink-200/60 shadow-[0_4px_15px_rgba(255,45,133,0.08)]'
            }`}
          >
            {/* Fashions Tab Button */}
            <button
              type="button"
              onClick={() => handleTabSwitch('fashions')}
              className={`relative overflow-hidden flex-1 py-1 sm:py-0.5 px-3 rounded-full transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer bonheur-royale-regular ${
                !isJewellery
                  ? 'bg-gradient-to-r from-[#ff2d85] to-[#ff639f] text-white border border-pink-300/60 shadow-[0_4px_14px_rgba(255,45,133,0.35)]'
                  : 'text-stone-600 hover:text-[#ff2d85] hover:bg-white/80 active:scale-95'
              }`}
            >
              {!isJewellery && (
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
              )}
              <Crown
                className={`w-3.5 h-3.5 shrink-0 font-sans ${
                  !isJewellery ? 'scale-110 drop-shadow-[0_1px_3px_rgba(0,0,0,0.2)]' : ''
                }`}
              />
              <span className="text-[22px] sm:text-[26px] leading-none tracking-wide pt-0.5 sm:pt-1">
                Fashions
              </span>
            </button>

            {/* Jewellery Tab Button */}
            <button
              type="button"
              onClick={() => handleTabSwitch('jewellery')}
              className={`relative overflow-hidden flex-1 py-1.5 sm:py-2 px-3 rounded-full text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.14em] transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer cinzel-bold ${
                isJewellery
                  ? 'bg-gradient-to-r from-[#D4AF37] via-[#DFBF58] to-[#B8860B] text-stone-950 border border-amber-300/80 shadow-[0_4px_16px_rgba(212,175,55,0.4)]'
                  : 'text-stone-600 hover:text-[#B8860B] hover:bg-white/80 active:scale-95'
              }`}
            >
              {isJewellery && (
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
              )}
              <Gem
                className={`w-3.5 h-3.5 shrink-0 ${
                  isJewellery ? 'scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] text-stone-950' : ''
                }`}
              />
              <span className="leading-none pt-0.5 sm:pt-0">Jewellery</span>
            </button>
          </div>
        </div>

        {/* Right Section: Desktop lo mathrame kanipisthundi (Mobile lo poorthiga hidden) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label="Search"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="group relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 active:scale-95 cursor-pointer bg-transparent border-0 outline-hidden"
          >
            <Search
              className={`w-5 h-5 text-stone-700 transition-all duration-300 ${
                isJewellery
                  ? 'group-hover:text-[#D4AF37] group-hover:scale-110'
                  : 'group-hover:text-[#ff2d85] group-hover:scale-110'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={handleUserClick}
            aria-label="User Account"
            className="group relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 active:scale-95 cursor-pointer bg-transparent border-0 outline-hidden"
          >
            <User
              className={`w-5 h-5 transition-all duration-300 ${
                user
                  ? isJewellery
                    ? 'text-[#D4AF37] drop-shadow-[0_0_9px_rgba(212,175,55,0.8)]'
                    : 'text-[#ff2d85] drop-shadow-[0_0_8px_rgba(255,45,133,0.7)]'
                  : isJewellery
                  ? 'text-stone-700 group-hover:text-[#D4AF37] group-hover:scale-110'
                  : 'text-stone-700 group-hover:text-[#ff2d85] group-hover:scale-110'
              }`}
              strokeWidth={1.8}
            />
          </button>

          <button
            type="button"
            onClick={handleWishlistClick}
            aria-label="Wishlist"
            className="group relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 active:scale-95 cursor-pointer bg-transparent border-0 outline-hidden"
          >
            <Heart
              className={`w-5 h-5 transition-all duration-300 text-stone-700 group-hover:scale-110 ${
                isJewellery ? 'group-hover:text-[#D4AF37]' : 'group-hover:text-[#ff2d85]'
              } ${
                wishlistCount > 0
                  ? isJewellery
                    ? 'fill-[#D4AF37] text-[#D4AF37]'
                    : 'fill-[#ff2d85] text-[#ff2d85]'
                  : ''
              }`}
              strokeWidth={1.8}
            />
            {wishlistCount > 0 && (
              <span
                className={`absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-in zoom-in-50 ${
                  isJewellery
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-stone-950 font-black'
                    : 'bg-gradient-to-r from-[#ff2d85] to-[#ff4d94]'
                }`}
              >
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleCartClick}
            aria-label="Shopping Bag"
            className="group relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 active:scale-95 cursor-pointer bg-transparent border-0 outline-hidden"
          >
            <ShoppingBag
              className={`w-5 h-5 transition-all duration-300 text-stone-700 ${
                isJewellery ? 'group-hover:text-[#D4AF37]' : 'group-hover:text-[#ff2d85]'
              }`}
              strokeWidth={1.8}
            />
            {cartCount > 0 && (
              <span
                className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-white text-[10.5px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in-50 ${
                  isJewellery
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-stone-950 font-black'
                    : 'bg-gradient-to-r from-[#ff2d85] to-[#ff4d94]'
                }`}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop Search Drawer */}
      {isSearchOpen && (
        <div
          className={`hidden md:block w-full border-t px-4 py-3 animate-in slide-in-from-top-2 duration-200 ${
            isJewellery
              ? 'bg-[#FBF9F5] border-amber-200/50'
              : 'bg-[#FAF8F5] border-pink-200/40'
          }`}
        >
          <form
            onSubmit={handleSearchSubmit}
            className={`max-w-2xl mx-auto flex items-center gap-2 rounded-2xl px-3 py-2 border transition-all bg-white shadow-sm ${
              isJewellery
                ? 'border-amber-200/60 focus-within:border-amber-400'
                : 'border-pink-200/60 focus-within:border-[#ff2d85]'
            }`}
          >
            <Search
              className={`w-4 h-4 shrink-0 ${
                isJewellery ? 'text-[#b38728]' : 'text-[#ff2d85]'
              }`}
            />
            <input
              type="text"
              autoFocus
              placeholder={`Search ${isJewellery ? 'jewellery, chokers...' : 'sarees, kurtis, silks...'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[11px] text-stone-400 hover:text-stone-700 font-semibold px-1 cursor-pointer"
              >
                Clear
              </button>
            )}

            <button
              type="submit"
              className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                isJewellery
                  ? 'bg-gradient-to-r from-[#D4AF37] via-[#DFBF58] to-[#B8860B] text-stone-950'
                  : 'bg-gradient-to-r from-[#ff2d85] to-[#ff639f] text-white'
              }`}
            >
              Search
            </button>

            <button
              type="button"
              aria-label="Close search"
              onClick={() => setIsSearchOpen(false)}
              className="p-1 text-stone-400 hover:text-stone-700 ml-1 cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}