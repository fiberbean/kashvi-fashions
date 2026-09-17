import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useSearchParams } from 'react-router-dom';
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
import CategoryProductListPage from './modules/products/CategoryProductListPage';
import ProductDetailPage from './modules/products/ProductDetailPage';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import AuthModal from './components/auth/AuthModal';
import CartDrawer from './components/common/CartDrawer';
import CompleteProfileModal from './components/auth/CompleteProfileModal';
import WishlistModal from './components/wishlist/WishlistModal';

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

  // 5 సెకన్లకు ఒకసారి ఆటోమేటిక్ స్క్రోల్ (Auto-play)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-4">
      <div
        className={`relative w-full overflow-hidden rounded-2xl md:rounded-3xl shadow-sm border bg-neutral-950 group ${
          isJewellery ? 'border-[#0b3b2c]/20' : 'border-[#ff4d6d]/20'
        }`}
      >
        {/* Slides Track */}
        <div
          className="flex transition-transform duration-700 ease-out w-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className="min-w-full relative aspect-21/9 md:aspect-3/1 select-none"
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />

              {/* Luxury Gradient Overlay */}
              <div
                className={`absolute inset-0 flex items-center px-6 md:px-14 ${
                  isJewellery
                    ? 'bg-gradient-to-r from-[#0b3b2c]/95 via-[#0b3b2c]/50 to-transparent'
                    : 'bg-gradient-to-r from-black/85 via-black/40 to-transparent'
                }`}
              >
                <div className="max-w-lg text-white">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] px-3 py-1 rounded-full shadow-xs mb-2 ${
                      isJewellery
                        ? 'bg-[#0b3b2c] border border-[#e5c07b]/50 text-[#e5c07b]'
                        : 'bg-[#ff4d6d] text-white'
                    }`}
                  >
                    {isJewellery && <Sparkles className="w-3 h-3 text-[#e5c07b]" />}
                    {slide.tag}
                  </span>

                  <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold mt-1 leading-tight text-white drop-shadow-sm">
                    {slide.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-neutral-200 mt-2 line-clamp-2 max-w-md font-normal leading-relaxed drop-shadow-xs">
                    {slide.desc}
                  </p>

                  <div className="mt-4 sm:mt-6 flex items-center gap-4">
                    <Link
                      to={slide.link}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 ${
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

        {/* Previous Button */}
        <button
          type="button"
          aria-label="Previous Slide"
          onClick={prevSlide}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xs text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Next Button */}
        <button
          type="button"
          aria-label="Next Slide"
          onClick={nextSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xs text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Dots Indicators */}
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {slides.map((_, dotIdx) => (
            <button
              key={dotIdx}
              type="button"
              aria-label={`Go to slide ${dotIdx + 1}`}
              onClick={() => setCurrentIndex(dotIdx)}
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${
                currentIndex === dotIdx
                  ? isJewellery
                    ? 'w-6 sm:w-8 bg-[#e5c07b]'
                    : 'w-6 sm:w-8 bg-[#ff4d6d]'
                  : 'w-1.5 sm:w-2 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
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
    <main className="min-h-screen bg-white text-neutral-900 pb-20 w-full overflow-x-hidden">
      <header
        className={`w-full sticky top-0 z-40 backdrop-blur-md transition-all duration-300 border-b bg-white/95 ${
          isJewellery ? 'border-[#0b3b2c]/15 shadow-xs' : 'border-[#ff4d6d]/20 shadow-xs'
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 py-2 sm:py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          {/* Brand Identity - Logo with Matching Background Color */}
          <div className="flex items-center justify-between w-full md:w-auto md:flex-1">
            <Link to="/" className="inline-flex items-center group py-0.5">
              <div
                className={`relative h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 rounded-2xl overflow-hidden p-1 transition-all duration-300 shadow-sm border flex items-center justify-center shrink-0 ${
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

            {/* Mobile Action Buttons */}
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