import React from 'react';
import { HashRouter as Router, Routes, Route, Link, useSearchParams } from 'react-router-dom';
import { Sparkles, ShieldCheck, Gem, Crown } from 'lucide-react';
import FashionBubbleMenu from './modules/home/FashionBubbleMenu';
import JewelleryBubbleMenu from './modules/home/JewelleryBubbleMenu';
import FashionUnevenBanners from './modules/home/FashionUnevenBanners';
import JewelleryUnevenBanners from './modules/home/JewelleryUnevenBanners';
import HeaderBagButton from './components/common/HeaderBagButton';
import HeaderUserButton from './components/common/HeaderUserButton';
import HeaderHeartButton from './components/common/HeaderHeartButton';
import CategoryProductListPage from './modules/products/CategoryProductListPage';
import ProductDetailPage from './modules/products/ProductDetailPage';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import AuthModal from './components/auth/AuthModal';
import CartDrawer from './components/common/CartDrawer';
import CompleteProfileModal from './components/auth/CompleteProfileModal';
import WishlistModal from './components/wishlist/WishlistModal';

// src/assets నుండి నేరుగా import (బిల్డ్‌లో ఎప్పటికీ మిస్ అవ్వదు)
import fashionLogo from './assets/fashion-logo.png';
import jewelleryLogo from './assets/jewellery-logo.png';

function HomePageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isJewellery = searchParams.get('tab') === 'jewellery';

  const currentLogo = isJewellery ? jewelleryLogo : fashionLogo;
  const brandAlt = isJewellery ? 'Kashvi Jewellery' : 'Kashvi Fashions';

  return (
    <main className="min-h-screen bg-white text-neutral-900 pb-20 w-full overflow-x-hidden">
      <header
        className={`w-full sticky top-0 z-40 backdrop-blur-md transition-all duration-300 border-b bg-white/95 ${
          isJewellery ? 'border-[#0b3b2c]/15 shadow-xs' : 'border-[#ff4d6d]/20 shadow-xs'
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 py-2.5 md:py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand Identity with Square Logo */}
          <div className="flex items-center justify-between w-full md:w-auto md:flex-1">
            <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group">
              <div
                className={`relative h-11 w-11 sm:h-13 sm:w-13 rounded-2xl overflow-hidden p-1 transition-all duration-300 bg-white shadow-xs border flex items-center justify-center shrink-0 ${
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

              <div className="flex flex-col text-left">
                <span
                  className={`text-lg sm:text-2xl font-serif font-bold tracking-[0.18em] transition-colors leading-none ${
                    isJewellery ? 'text-[#0b3b2c]' : 'text-neutral-950'
                  }`}
                >
                  KASHVI
                </span>
                <span
                  className={`text-[8px] sm:text-[9px] uppercase tracking-[0.28em] font-medium mt-1 transition-colors ${
                    isJewellery ? 'text-[#b38728]' : 'text-[#ff4d6d]'
                  }`}
                >
                  {isJewellery ? 'Royal Vault' : 'Haute Couture'}
                </span>
              </div>
            </Link>

            {/* Mobile Action Buttons */}
            <div className="flex items-center gap-2 md:hidden">
              <HeaderUserButton isJewellery={isJewellery} />
              <HeaderHeartButton isJewellery={isJewellery} />
              <HeaderBagButton isJewellery={isJewellery} />
            </div>
          </div>

          {/* Center: Department Switcher Capsule */}
          <div className="w-full md:w-auto md:flex-none">
            <div
              className={`grid grid-cols-2 p-1 rounded-2xl border transition-all duration-300 w-full md:w-80 ${
                isJewellery
                  ? 'bg-[#f4f7f5] border-[#0b3b2c]/20 shadow-inner'
                  : 'bg-[#fff0f3] border-[#ff4d6d]/30 shadow-inner'
              }`}
            >
              <button
                type="button"
                onClick={() => setSearchParams({ tab: 'fashions' })}
                className={`w-full py-2 px-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                  !isJewellery
                    ? 'bg-[#ff4d6d] text-white shadow-md shadow-[#ff4d6d]/30'
                    : 'text-neutral-600 hover:text-[#ff4d6d]'
                }`}
              >
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span>Fashions</span>
              </button>

              <button
                type="button"
                onClick={() => setSearchParams({ tab: 'jewellery' })}
                className={`w-full py-2 px-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                  isJewellery
                    ? 'bg-[#0b3b2c] text-[#e5c07b] shadow-md shadow-[#0b3b2c]/30'
                    : 'text-neutral-600 hover:text-[#0b3b2c]'
                }`}
              >
                <Gem className="w-3.5 h-3.5 shrink-0" />
                <span>Jewellery</span>
              </button>
            </div>
          </div>

          {/* Desktop Action Controls */}
          <div className="hidden md:flex flex-1 justify-end items-center gap-3">
            <HeaderUserButton isJewellery={isJewellery} />
            <HeaderHeartButton isJewellery={isJewellery} />
            <HeaderBagButton isJewellery={isJewellery} />
          </div>
        </div>
      </header>

      {!isJewellery && (
        <div className="w-full bg-white animate-in fade-in duration-300">
          <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-4">
            <div className="w-full overflow-hidden rounded-2xl md:rounded-3xl shadow-xs border border-[#ff4d6d]/20 bg-neutral-900">
              <div className="relative aspect-21/9 md:aspect-3/1 w-full">
                <img
                  src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80"
                  alt="Kashvi Fashions Grand Festive Banner"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent flex items-center px-6 md:px-12">
                  <div className="max-w-md text-white">
                    <span className="inline-flex items-center gap-1 text-[10px] md:text-xs font-semibold uppercase tracking-[0.25em] bg-[#ff4d6d] text-white px-2.5 py-0.5 rounded-full shadow-xs mb-2">
                      New Couture Drop
                    </span>
                    <h2 className="text-xl md:text-4xl font-serif font-bold mt-1 leading-tight text-white">
                      Kashvi Silk Edit
                    </h2>
                    <p className="text-xs md:text-sm text-neutral-200 mt-1.5 line-clamp-2">
                      Kanchipuram, Banarasi Zari Sarees & Contemporary Designer Wear.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <FashionBubbleMenu />
          <FashionUnevenBanners />
        </div>
      )}

      {isJewellery && (
        <div className="w-full bg-white animate-in fade-in duration-300">
          <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-4">
            <div className="w-full overflow-hidden rounded-2xl md:rounded-3xl shadow-xs border border-[#0b3b2c]/20 bg-neutral-900 relative">
              <div className="relative aspect-21/9 md:aspect-3/1 w-full">
                <img
                  src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1600&q=80"
                  alt="Kashvi Royal Jewellery"
                  className="w-full h-full object-cover opacity-85"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0b3b2c]/90 via-[#0b3b2c]/40 to-transparent flex items-center px-6 md:px-12">
                  <div className="max-w-lg">
                    <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] bg-[#0b3b2c] border border-[#e5c07b]/40 text-[#e5c07b] px-3 py-1 rounded-full shadow-xs mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#e5c07b]" />
                      Royal Heirloom Craft
                    </span>
                    <h2 className="text-xl md:text-4xl font-serif font-bold text-white leading-tight">
                      Royal Jewellery Lounge
                    </h2>
                    <p className="text-xs md:text-sm text-neutral-200 mt-1.5 line-clamp-2">
                      Handcrafted 22K Gold, Polki Sets, and Certified Antique Temple Collections.
                    </p>
                    <div className="mt-4 flex items-center gap-4 text-[11px] text-[#e5c07b] font-medium">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> 100% Certified Quality
                      </span>
                      <span>•</span>
                      <span>Insured Express Shipping</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <JewelleryBubbleMenu />
          <JewelleryUnevenBanners />
        </div>
      )}
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <Router>
            <Routes>
              <Route path="/" element={<HomePageContent />} />
              <Route path="/category/:slug" element={<CategoryProductListPage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
            </Routes>
            <CartDrawer />
            <WishlistModal />
            <AuthModal />
            <CompleteProfileModal />
          </Router>
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}