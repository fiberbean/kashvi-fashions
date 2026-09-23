import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Sparkles, X } from 'lucide-react';
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
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}&dept=${currentTab}`);
    setIsSearchOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 backdrop-blur-md border-b ${
        isJewellery
          ? 'bg-[#04120e]/95 border-[#e5c07b]/20 shadow-[0_4px_20px_-10px_rgba(229,192,123,0.15)] text-[#f5ebd7]'
          : 'bg-[#060b18]/95 border-[#00f5d4]/20 shadow-[0_4px_20px_-10px_rgba(0,245,212,0.12)] text-white'
      }`}
    >
      {/* Top Micro Strip (Notice Bar) */}
      <div
        className={`w-full py-1 text-center text-[10px] font-semibold tracking-widest uppercase transition-colors border-b ${
          isJewellery
            ? 'bg-[#020b08] text-[#e5c07b] border-[#e5c07b]/15'
            : 'bg-[#03060f] text-[#00f5d4] border-[#00f5d4]/15'
        }`}
      >
        <span className="inline-flex items-center gap-1.5 font-mono">
          <Sparkles className="w-2.5 h-2.5 opacity-80" />
          <span>Complimentary Insured Delivery Across India</span>
          <Sparkles className="w-2.5 h-2.5 opacity-80" />
        </span>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Left Section: Logo with Glow */}
        <div className="flex items-center">
          <Link to={`/?tab=${currentTab}`} className="group flex items-center gap-3">
            <div
              className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden p-1 transition-all duration-300 shadow-sm border flex items-center justify-center shrink-0 ${
                isJewellery
                  ? 'bg-[#061e17] border-[#e5c07b]/40 shadow-[#061e17]/40 group-hover:border-[#e5c07b]'
                  : 'bg-[#080d1a] border-[#00f5d4]/40 shadow-[#00f5d4]/10 group-hover:border-[#00f5d4]'
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
                  isJewellery ? 'text-[#e5c07b]' : 'text-white'
                }`}
              >
                KASHVI
              </span>
              <span
                className={`text-[8px] uppercase tracking-[0.25em] font-semibold mt-1 font-mono ${
                  isJewellery ? 'text-[#b38728]' : 'text-[#00f5d4]'
                }`}
              >
                {isJewellery ? 'Royal Vault' : 'Haute Couture'}
              </span>
            </div>
          </Link>
        </div>

        {/* Center Section: Department Switcher Capsule */}
        <div className="flex items-center justify-center">
          <div
            className={`inline-flex p-1 rounded-full border shadow-inner transition-colors ${
              isJewellery
                ? 'bg-[#020b08]/80 border-[#e5c07b]/30'
                : 'bg-[#02050d]/80 border-[#00f5d4]/30'
            }`}
          >
            <button
              type="button"
              onClick={() => handleTabSwitch('fashions')}
              className={`px-3.5 sm:px-5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                !isJewellery
                  ? 'bg-[#00f5d4] text-[#040814] shadow-[0_0_12px_rgba(0,245,212,0.4)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Fashions
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('jewellery')}
              className={`px-3.5 sm:px-5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                isJewellery
                  ? 'bg-gradient-to-r from-[#e5c07b] to-[#b38728] text-[#04120e] shadow-[0_0_12px_rgba(229,192,123,0.4)] font-serif'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Jewellery
            </button>
          </div>
        </div>

        {/* Right Section: Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            aria-label="Search"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isJewellery
                ? 'text-[#e5c07b] hover:bg-[#0b3b2c]'
                : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {isSearchOpen ? (
              <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
            ) : (
              <Search className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.8]" />
            )}
          </button>

          <HeaderUserButton isJewellery={isJewellery} />
          <HeaderHeartButton isJewellery={isJewellery} />
          <HeaderBagButton isJewellery={isJewellery} />
        </div>
      </div>

      {/* Expandable Luxury Search Drawer */}
      {isSearchOpen && (
        <div
          className={`w-full border-t px-4 py-3 animate-in slide-in-from-top-2 duration-200 ${
            isJewellery
              ? 'bg-[#020b08]/95 border-[#e5c07b]/20'
              : 'bg-[#03060f]/95 border-[#00f5d4]/20'
          }`}
        >
          <form
            onSubmit={handleSearchSubmit}
            className={`max-w-2xl mx-auto flex items-center gap-2 rounded-2xl px-3.5 py-2 border transition-all ${
              isJewellery
                ? 'bg-[#061e17] border-[#e5c07b]/30 focus-within:border-[#e5c07b]'
                : 'bg-[#080d1a] border-white/15 focus-within:border-[#00f5d4]'
            }`}
          >
            <Search
              className={`w-4 h-4 shrink-0 ${
                isJewellery ? 'text-[#e5c07b]' : 'text-[#00f5d4]'
              }`}
            />
            <input
              type="text"
              autoFocus
              placeholder={`Search handcrafted ${isJewellery ? 'jewellery, chokers, bangles...' : 'sarees, silks, lehengas...'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[11px] text-neutral-400 hover:text-white font-semibold px-1 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                isJewellery
                  ? 'bg-gradient-to-r from-[#e5c07b] to-[#b38728] text-[#04120e] hover:brightness-110'
                  : 'bg-[#00f5d4] text-[#040814] hover:bg-white'
              }`}
            >
              Search
            </button>
          </form>
        </div>
      )}
    </header>
  );
}