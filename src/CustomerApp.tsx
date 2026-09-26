import React from 'react';
import { Routes, Route, useSearchParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import FashionBubbleMenu from './modules/home/FashionBubbleMenu';
import JewelleryBubbleMenu from './modules/home/JewelleryBubbleMenu';
import FashionUnevenBanners from './modules/home/FashionUnevenBanners';
import JewelleryUnevenBanners from './modules/home/JewelleryUnevenBanners';
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

function HomePageContent() {
  const [searchParams] = useSearchParams();
  const isJewellery = searchParams.get('tab') === 'jewellery';

  return (
    <main
      className={`min-h-screen pb-24 md:pb-20 w-full overflow-x-hidden relative transition-colors duration-500 ${
        isJewellery
          ? 'bg-[#FBF9F5] text-stone-900 selection:bg-[#D4AF37] selection:text-black font-cinzel'
          : 'bg-[#FAF8F5] text-stone-900 selection:bg-[#ff2d85] selection:text-white font-sans'
      }`}
    >
      {/* Dynamic Ambient Luxury Glows */}
      {!isJewellery ? (
        <>
          <div className="fixed -top-24 left-1/4 w-[500px] h-[500px] bg-pink-100/60 rounded-full blur-[120px] pointer-events-none z-0" />
          <div className="fixed top-1/2 -right-20 w-[450px] h-[450px] bg-rose-50/70 rounded-full blur-[100px] pointer-events-none z-0" />
        </>
      ) : (
        <>
          <div className="fixed -top-24 left-1/4 w-[500px] h-[500px] bg-amber-100/50 rounded-full blur-[130px] pointer-events-none z-0" />
          <div className="fixed top-1/2 -right-20 w-[450px] h-[450px] bg-emerald-50/60 rounded-full blur-[120px] pointer-events-none z-0" />
        </>
      )}

      {/* Fashions Tab Content */}
      {!isJewellery && (
        <div className="w-full relative z-10 animate-in fade-in duration-300 pt-2 sm:pt-4">
          <FashionBubbleMenu />
          <FashionUnevenBanners />
        </div>
      )}

      {/* Jewellery Tab Content */}
      {isJewellery && (
        <div className="w-full relative z-10 animate-in fade-in duration-300 pt-2 sm:pt-4">
          <JewelleryBubbleMenu />
          <JewelleryUnevenBanners />
        </div>
      )}
    </main>
  );
}

export default function CustomerApp() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <div className="relative min-h-screen bg-[#FAF8F5] text-stone-900">
            {/* Dedicated Top Navbar */}
            <Navbar />

            <Routes>
              <Route path="/" element={<HomePageContent />} />
              <Route path="/category/:slug" element={<CategoryProductListPage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
            </Routes>

            {/* Native App-Style Bottom Navigation Bar */}
            <MobileBottomBar />

            {/* Modals & Drawers */}
            <CartDrawer />
            <WishlistModal />
            <AuthModal />
            <CompleteProfileModal />
          </div>
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}