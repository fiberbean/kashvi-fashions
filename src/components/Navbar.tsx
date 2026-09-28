import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import HeaderUserButton from './common/HeaderUserButton';
import HeaderHeartButton from './common/HeaderHeartButton';
import HeaderBagButton from './common/HeaderBagButton';

import fashionLogo from '../assets/fashion-logo.png';
import jewelleryLogo from '../assets/jewellery-logo.png';

export default function Navbar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = searchParams.get('tab') || 'fashions';
  const isJewellery = currentTab === 'jewellery';

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentLogo = isJewellery ? jewelleryLogo : fashionLogo;
  const brandAlt = isJewellery ? 'Kashvi Jewellery' : 'Kashvi Fashions';

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

    navigate(
      `/search?q=${encodeURIComponent(searchQuery.trim())}&dept=${currentTab}`
    );

    setIsSearchOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 backdrop-blur-md bg-white/95 border-b ${
        isJewellery
          ? 'border-[#0b3b2c]/10 shadow-[0_4px_20px_-10px_rgba(11,59,44,0.08)]'
          : 'border-neutral-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]'
      }`}
    >
      {/* =========================================================
          TOP MICRO STRIP
          Desktop only - unchanged
      ========================================================== */}
      <div
        className={`hidden md:block w-full py-1 text-center text-[10px] font-semibold tracking-widest uppercase transition-colors ${
          isJewellery
            ? 'bg-[#0b3b2c] text-[#e5c07b]'
            : 'bg-neutral-950 text-neutral-300'
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-2.5 h-2.5 opacity-80" />

          <span>Complimentary Insured Delivery Across India</span>

          <Sparkles className="w-2.5 h-2.5 opacity-80" />
        </span>
      </div>

      {/* =========================================================
          MAIN NAVIGATION
          Same structure for Desktop + Mobile
          Mobile only adjusts size/spacing
      ========================================================== */}
      <div
        className="
          max-w-7xl mx-auto
          px-2.5 sm:px-6 lg:px-8
          h-16 sm:h-20
          flex items-center
          justify-between
          gap-1.5 sm:gap-4
        "
      >
        {/* =======================================================
            LEFT SECTION: LOGO + BRAND
        ======================================================== */}
        <div className="flex items-center shrink-0 min-w-0">
          <Link
            to={`/?tab=${currentTab}`}
            className="group flex items-center gap-1.5 sm:gap-3 min-w-0"
          >
            {/* LOGO */}
            <div
              className={`relative
                h-10 w-10
                sm:h-14 sm:w-14
                rounded-xl sm:rounded-2xl
                overflow-hidden
                p-1
                transition-all duration-300
                bg-white
                shadow-xs
                border
                flex items-center justify-center
                shrink-0
                ${
                  isJewellery
                    ? 'border-[#0b3b2c]/20 group-hover:border-[#0b3b2c]'
                    : 'border-neutral-200 group-hover:border-neutral-400'
                }`}
            >
              <img
                src={currentLogo}
                alt={brandAlt}
                className="
                  w-full h-full
                  object-contain
                  transition-transform duration-300
                  group-hover:scale-105
                "
              />
            </div>

            {/* BRAND NAME
                Same desktop branding, compact on mobile */}
            <div className="flex flex-col text-left min-w-0">
              <span
                className={`font-serif
                  text-[13px]
                  sm:text-lg
                  lg:text-xl
                  font-bold
                  tracking-[0.12em]
                  sm:tracking-[0.18em]
                  leading-none
                  truncate
                  ${
                    isJewellery
                      ? 'text-[#0b3b2c]'
                      : 'text-neutral-950'
                  }`}
              >
                KASHVI
              </span>

              <span
                className={`text-[6px]
                  sm:text-[8px]
                  uppercase
                  tracking-[0.16em]
                  sm:tracking-[0.25em]
                  font-semibold
                  mt-1
                  truncate
                  ${
                    isJewellery
                      ? 'text-[#b38728]'
                      : 'text-[#ff4d6d]'
                  }`}
              >
                {isJewellery ? 'Royal Vault' : 'Haute Couture'}
              </span>
            </div>
          </Link>
        </div>

        {/* =======================================================
            CENTER SECTION: DEPARTMENT SWITCHER
            Same design, only compact sizing on mobile
        ======================================================== */}
        <div className="flex items-center justify-center flex-1 min-w-0 px-1 sm:px-2">
          <div
            className="
              inline-flex
              p-0.5 sm:p-1
              rounded-full
              bg-neutral-100
              border border-neutral-200/60
              shadow-inner
              w-full
              max-w-[210px]
              sm:max-w-none
            "
          >
            {/* FASHIONS */}
            <button
              type="button"
              onClick={() => handleTabSwitch('fashions')}
              className={`flex-1
                px-2 sm:px-5
                py-1.5 sm:py-1.5
                rounded-full
                text-[9px] sm:text-xs
                font-bold
                tracking-[0.06em] sm:tracking-wider
                uppercase
                transition-all duration-200
                cursor-pointer
                whitespace-nowrap
                ${
                  !isJewellery
                    ? 'bg-white text-neutral-950 shadow-xs ring-1 ring-neutral-200'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
            >
              Fashions
            </button>

            {/* JEWELLERY */}
            <button
              type="button"
              onClick={() => handleTabSwitch('jewellery')}
              className={`flex-1
                px-2 sm:px-5
                py-1.5 sm:py-1.5
                rounded-full
                text-[9px] sm:text-xs
                font-bold
                tracking-[0.06em] sm:tracking-wider
                uppercase
                transition-all duration-200
                cursor-pointer
                whitespace-nowrap
                ${
                  isJewellery
                    ? 'bg-[#0b3b2c] text-[#e5c07b] shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
            >
              Jewellery
            </button>
          </div>
        </div>

        {/* =======================================================
            ACTION CONTROLS
            Same controls on Desktop + Mobile
            Mobile only reduces spacing/size
        ======================================================== */}
        <div
          className="
            flex items-center
            gap-0 sm:gap-1.5 lg:gap-3
            shrink-0
          "
        >
          {/* SEARCH */}
          <button
            type="button"
            aria-label="Search"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="
              p-1.5 sm:p-2
              rounded-full
              text-neutral-600
              hover:text-neutral-950
              hover:bg-neutral-100
              transition-colors
              cursor-pointer
            "
          >
            <Search
              className="
                w-[17px] h-[17px]
                sm:w-5 sm:h-5
                stroke-[1.8]
              "
            />
          </button>

          {/* GLOBAL USER / PROFILE */}
          <div className="shrink-0">
            <HeaderUserButton isJewellery={isJewellery} />
          </div>

          {/* GLOBAL WISHLIST */}
          <div className="shrink-0">
            <HeaderHeartButton isJewellery={isJewellery} />
          </div>

          {/* GLOBAL CART */}
          <div className="shrink-0">
            <HeaderBagButton isJewellery={isJewellery} />
          </div>
        </div>
      </div>

      {/* =========================================================
          SEARCH DRAWER
          Desktop + Mobile
      ========================================================== */}
      {isSearchOpen && (
        <div
          className="
            w-full
            bg-neutral-50
            border-t border-neutral-100
            px-2.5 sm:px-4
            py-2.5 sm:py-3
            animate-in
            slide-in-from-top-2
            duration-200
          "
        >
          <form
            onSubmit={handleSearchSubmit}
            className="
              max-w-2xl mx-auto
              flex items-center
              gap-1.5 sm:gap-2
              bg-white
              rounded-xl sm:rounded-2xl
              px-2.5 sm:px-3.5
              py-2 sm:py-2
              border border-neutral-200
              focus-within:border-neutral-900
              shadow-2xs
              transition-all
            "
          >
            <Search
              className="
                w-3.5 h-3.5
                sm:w-4 sm:h-4
                text-neutral-400
                shrink-0
              "
            />

            <input
              type="text"
              autoFocus
              placeholder={`Search handcrafted ${
                isJewellery
                  ? 'jewellery, chokers, bangles...'
                  : 'sarees, silks, lehengas...'
              }`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full
                min-w-0
                bg-transparent
                text-xs sm:text-sm
                text-neutral-900
                placeholder:text-neutral-400
                focus:outline-hidden
              "
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="
                  text-[9px] sm:text-[11px]
                  text-neutral-400
                  hover:text-neutral-900
                  font-semibold
                  px-1
                  shrink-0
                "
              >
                Clear
              </button>
            )}

            <button
              type="submit"
              className="
                px-2.5 sm:px-4
                py-1.5
                rounded-lg sm:rounded-xl
                bg-neutral-900
                text-white
                text-[9px] sm:text-xs
                font-bold
                uppercase
                tracking-wider
                hover:bg-neutral-800
                transition-all
                cursor-pointer
                shrink-0
              "
            >
              Search
            </button>
          </form>
        </div>
      )}
    </header>
  );
}