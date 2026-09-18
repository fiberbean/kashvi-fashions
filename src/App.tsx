import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useSearchParams, useLocation } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  Gem,
  Crown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import FashionBubbleMenu from './modules/home/FashionBubbleMenu';
import JewelleryBubbleMenu from './modules/home/JewelleryBubbleMenu';
import FashionUnevenBanners from './modules/home/FashionUnevenBanners';
import JewelleryUnevenBanners from './modules/home/JewelleryUnevenBanners';
import HeaderBagButton from './components/common/HeaderBagButton';
import HeaderUserButton from './components/common/HeaderUserButton';
import HeaderHeartButton from './components/common/HeaderHeartButton';
import MobileBottomBar from './components/common/MobileBottomBar';
import CategoryProductListPage from './modules/products/CategoryProductListPage';
import ProductDetailPage from './modules/products/ProductDetailPage';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import AuthModal from './components/auth/AuthModal';
import CartDrawer from './components/common/CartDrawer';
import CompleteProfileModal from './components/auth/CompleteProfileModal';
import WishlistModal from './components/wishlist/WishlistModal';

// Admin Imports (/kfmama)
import AdminNavbar from './admin/components/AdminNavbar';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminMasters from './admin/pages/AdminMasters';
import AdminProducts from './admin/pages/AdminProducts';

// Assets నుండి నేరుగా ఇంపోర్ట్
import fashionLogo from './assets/fashion-logo.png';
import jewelleryLogo from './assets/jewellery-logo.png';

// Fashions స్లైడర్ బ్యానర్లు
const FASHION_SLIDES = [
  {
    tag: 'Festive Couture Drop',
    title: 'Kashvi Silk Edit',
    desc: 'Kanchipuram, Banarasi Zari Sarees & Contemporary Designer Wear.',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80',
    link: '/category/fashions?sub=sarees',
  },
  {
    tag: 'Royal Bridal Edition',
    title: 'Heritage Lehengas',
    desc: 'Hand-embroidered silhouettes crafted with timeless elegance.',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1600&q=80',
    link: '/category/fashions?sub=lehengas',
  },
  {
    tag: 'Pret-a-Porter',
    title: 'Modern Kurtis & Sets',
    desc: 'Boutique-finished breathable fabrics for every occasion.',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1600&q=80',
    link: '/category/fashions?sub=kurtis',
  },
];

// Jewellery స్లైడర్ బ్యానర్లు
const JEWELLERY_SLIDES = [
  {
    tag: 'Royal Heirloom Craft',
    title: 'Royal Jewellery Lounge',
    desc: 'Handcrafted 22K Gold, Polki Sets, and Certified Antique Temple Collections.',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1600&q=80',
    link: '/category/jewellery?sub=temple',
  },
  {
    tag: 'Kundan & Jadau Edit',
    title: 'Bridal Choker Sets',
    desc: 'Imperial stones meticulously handset by master artisans.',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1600&q=80',
    link: '/category/jewellery?sub=choker-sets',
  },
  {
    tag: 'Pure Elegance',
    title: 'Heirloom Bangles & Kadas',
    desc: 'Timeless temple motifs and modern filigree gold artistry.',
    image: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=1600&q=80',
    link: '/category/jewellery?sub=bangles',
  },
];

function HeroBannerSlider({
  slides,
  isJewellery,
}: {
  slides: typeof FASHION_SLIDES;
  isJewellery: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Touch Swipe Handlers for Mobile App
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 45;

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, currentIndex]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    resetTimer();
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    resetTimer();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-3 sm:px-6 pt-2 sm:pt-4 select-none">
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`relative w-full aspect-4/5 xs:aspect-1/1 sm:aspect-21/9 md:aspect-[2.4/1] rounded-3xl sm:rounded-[2rem] overflow-hidden shadow-lg border bg-neutral-950 group ${
          isJewellery ? 'border-[#0b3b2c]/20' : 'border-[#ff4d6d]/20'
        }`}
      >
        {/* Slides Track */}
        <div
          className="flex transition-transform duration-700 ease-out w-full h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className="min-w-full h-full relative select-none"
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover object-center"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />

              {/* Luxury Mobile-Optimized Gradient Protection */}
              <div
                className={`absolute inset-0 flex flex-col justify-end p-5 sm:p-10 md:p-14 ${
                  isJewellery
                    ? 'bg-gradient-to-t from-[#0b3b2c]/95 via-[#0b3b2c]/40 to-black/15 sm:bg-gradient-to-r sm:from-[#0b3b2c]/95 sm:via-[#0b3b2c]/50 sm:to-transparent'
                    : 'bg-gradient-to-t from-black/90 via-black/40 to-black/10 sm:bg-gradient-to-r sm:from-black/85 sm:via-black/40 sm:to-transparent'
                }`}
              >
                <div className="max-w-lg text-white space-y-1.5 sm:space-y-3">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] px-3 py-1 rounded-full shadow-xs ${
                      isJewellery
                        ? 'bg-[#0b3b2c] border border-[#e5c07b]/50 text-[#e5c07b]'
                        : 'bg-[#ff4d6d] text-white'
                    }`}
                  >
                    {isJewellery && <Sparkles className="w-3 h-3 text-[#e5c07b]" />}
                    {slide.tag}
                  </span>

                  <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-serif font-bold leading-tight text-white drop-shadow-md">
                    {slide.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-neutral-200 line-clamp-2 max-w-md font-normal leading-relaxed drop-shadow-xs">
                    {slide.desc}
                  </p>

                  <div className="pt-2 sm:pt-4 flex items-center gap-3 sm:gap-4">
                    <Link
                      to={slide.link}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 ${
                        isJewellery
                          ? 'bg-[#e5c07b] text-[#0b3b2c] hover:bg-white hover:text-[#0b3b2c]'
                          : 'bg-white text-neutral-950 hover:bg-[#ff4d6d] hover:text-white'
                      }`}
                    >
                      <span>Explore Collection</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {isJewellery && (
                      <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-[#e5c07b] font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" /> Certified Quality
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Previous Button (Desktop) */}
        <button
          type="button"
          aria-label="Previous Slide"
          onClick={prevSlide}
          className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xs text-white items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Next Button (Desktop) */}
        <button
          type="button"
          aria-label="Next Slide"
          onClick={nextSlide}
          className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xs text-white items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Story-Style Progress Bars */}
        <div className="absolute top-3.5 inset-x-5 sm:inset-x-auto sm:left-auto sm:right-6 sm:bottom-6 sm:top-auto flex items-center justify-center gap-1.5 z-30 pointer-events-none">
          {slides.map((_, dotIdx) => {
            const isCurrent = currentIndex === dotIdx;
            return (
              <div
                key={dotIdx}
                className={`h-1 sm:h-1.5 rounded-full transition-all duration-500 overflow-hidden ${
                  isCurrent
                    ? isJewellery
                      ? 'w-7 sm:w-8 bg-[#e5c07b] shadow-sm'
                      : 'w-7 sm:w-8 bg-[#ff4d6d] shadow-sm'
                    : 'w-2 sm:w-2.5 bg-white/40'
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HomePageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isJewellery = searchParams.get('tab') === 'jewellery';

  const currentLogo = isJewellery ? jewelleryLogo : fashionLogo;
  const brandAlt = isJewellery ? 'Kashvi Jewellery' : 'Kashvi Fashions';

  return (
    <main className="min-h-screen bg-white text-neutral-900 pb-24 md:pb-20 w-full overflow-x-hidden">
      <header
        className={`w-full sticky top-0 z-40 backdrop-blur-md transition-all duration-300 border-b bg-white/95 ${
          isJewellery ? 'border-[#0b3b2c]/15 shadow-xs' : 'border-[#ff4d6d]/20 shadow-xs'
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 py-2 sm:py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          {/* Brand Identity */}
          <div className="flex items-center justify-between w-full md:w-auto md:flex-1">
            <Link to={`/?tab=${isJewellery ? 'jewellery' : 'fashions'}`} className="inline-flex items-center group py-0.5">
              <div
                className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden p-1 transition-all duration-300 shadow-sm border flex items-center justify-center shrink-0 ${
                  isJewellery
                    ? 'bg-[#1c3830] border-[#e5c07b]/40 shadow-[#1c3830]/20'
                    : 'bg-white border-neutral-200 group-hover:border-neutral-400'
                }`}
              >
                <img
                  src={currentLogo}
                  alt={brandAlt}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </Link>

            {/* Mobile Top Actions */}
            <div className="flex items-center gap-1 sm:gap-2 md:hidden">
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
          <div className="hidden md:flex flex-1 justify-end items-center gap-2 lg:gap-3">
            <HeaderUserButton isJewellery={isJewellery} />
            <HeaderHeartButton isJewellery={isJewellery} />
            <HeaderBagButton isJewellery={isJewellery} />
          </div>
        </div>
      </header>

      {/* Fashions Tab Content */}
      {!isJewellery && (
        <div className="w-full bg-white animate-in fade-in duration-300">
          <HeroBannerSlider slides={FASHION_SLIDES} isJewellery={false} />
          <FashionBubbleMenu />
          <FashionUnevenBanners />
        </div>
      )}

      {/* Jewellery Tab Content */}
      {isJewellery && (
        <div className="w-full bg-white animate-in fade-in duration-300">
          <HeroBannerSlider slides={JEWELLERY_SLIDES} isJewellery={true} />
          <JewelleryBubbleMenu />
          <JewelleryUnevenBanners />
        </div>
      )}
    </main>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/kfmama');

  return (
    <div className="relative min-h-screen">
      <Routes>
        {/* Customer Storefront Routes */}
        <Route path="/" element={<HomePageContent />} />
        <Route path="/category/:slug" element={<CategoryProductListPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />

        {/* /kfmama Admin OS Routes */}
        <Route
          path="/kfmama/*"
          element={
            <div className="min-h-screen bg-[#f0f4f2] text-[#0c2b22]">
              <AdminNavbar />
              <main className="max-w-[1540px] mx-auto p-4 sm:p-8">
                <Routes>
                  <Route path="" element={<AdminDashboard />} />
                  <Route path="masters" element={<AdminMasters />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="products/new" element={<AdminProducts />} />
                </Routes>
              </main>
            </div>
          }
        />
      </Routes>

      {/* Mobile Bottom Bar is displayed only on Customer Facing Pages */}
      {!isAdminRoute && <MobileBottomBar />}

      {/* Modals & Drawers */}
      <CartDrawer />
      <WishlistModal />
      <AuthModal />
      <CompleteProfileModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <Router>
            <AppContent />
          </Router>
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}