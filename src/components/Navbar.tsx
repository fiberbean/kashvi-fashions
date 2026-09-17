import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import HeaderUserButton from './common/HeaderUserButton';
import HeaderHeartButton from './common/HeaderHeartButton';
import HeaderBagButton from './common/HeaderBagButton';

// లోగోలను డైరెక్ట్‌గా import చేయడం (బిల్డ్ ఎర్రర్స్ లేకుండా 100% లోడ్ అవుతాయి)
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

  // ట్యాబ్‌ను బట్టి కరెక్ట్ లోగో సెలెక్ట్ చేయడం
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
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}&dept=${currentTab}`);
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
      {/* Top Micro Strip (Notice Bar) */}
      <div
        className={`w-full py-1 text-center text-[10px] font-semibold tracking-widest uppercase transition-colors ${
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

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Left Section: Square Logo with High Visibility */}
        <div className="flex items-center">
          <Link to={`/?tab=${currentTab}`} className="group flex items-center gap-3">
            <div
              className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden p-1 transition-all duration-300 bg-white shadow-xs border flex items-center justify-center ${
                isJewellery
                  ? 'border-[#0b3b2c]/20 group-hover:border-[#0b3b2c]'
                  : 'border-neutral-200 group-hover:border-neutral-400'
              }`}
            >
              <img
                src={currentLogo}
                alt={brandAlt}
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            <div className="hidden md:flex flex-col text-left">
              <span
                className={`font-serif text-lg sm:text-xl font-bold tracking-[0.18em] leading-none ${
                  isJewellery ? 'text-[#0b3b2c]' : 'text-neutral-950'
                }`}
              >
                KASHVI
              </span>
              <span
                className={`text-[8px] uppercase tracking-[0.25em] font-semibold mt-1 ${
                  isJewellery ? 'text-[#b38728]' : 'text-[#ff4d6d]'
                }`}
              >
                {isJewellery ? 'Royal Vault' : 'Haute Couture'}
              </span>
            </div>
          </Link>
        </div>

        {/* Center Section: Department Switcher Capsule */}
        <div className="flex items-center justify-center">
          <div className="inline-flex p-1 rounded-full bg-neutral-100 border border-neutral-200/60 shadow-inner">
            <button
              type="button"
              onClick={() => handleTabSwitch('fashions')}
              className={`px-3.5 sm:px-5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                !isJewellery
                  ? 'bg-white text-neutral-950 shadow-xs ring-1 ring-neutral-200'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Fashions
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('jewellery')}
              className={`px-3.5 sm:px-5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                isJewellery
                  ? 'bg-[#0b3b2c] text-[#e5c07b] shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Jewellery
            </button>
          </div>
        </div>

        {/* Right Section: Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            aria-label="Search"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 rounded-full text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.8]" />
          </button>

          <HeaderUserButton isJewellery={isJewellery} />
          <HeaderHeartButton isJewellery={isJewellery} />
          <HeaderBagButton isJewellery={isJewellery} />
        </div>
      </div>

      {/* Expandable Luxury Search Drawer */}
      {isSearchOpen && (
        <div className="w-full bg-neutral-50 border-t border-neutral-100 px-4 py-3 animate-in slide-in-from-top-2 duration-200">
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-2xl mx-auto flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2 border border-neutral-200 focus-within:border-neutral-900 shadow-2xs transition-all"
          >
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder={`Search handcrafted ${isJewellery ? 'jewellery, chokers, bangles...' : 'sarees, silks, lehengas...'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[11px] text-neutral-400 hover:text-neutral-900 font-semibold px-1"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all cursor-pointer shrink-0"
            >
              Search
            </button>
          </form>
        </div>
      )}
    </header>
  );
}