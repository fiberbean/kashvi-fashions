import React from 'react';
import { Routes, Route, Link, useSearchParams } from 'react-router-dom';
import {
  Gem,
  Crown,
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

// Assets direct import
import fashionLogo from './assets/fashion-logo.png';
import jewelleryLogo from './assets/jewellery-logo.png';

// Dense Fashion Graffiti Wallpaper Background
function FashionGraffitiBackground() {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-40 overflow-hidden select-none">
      {/* LEFT SIDE */}
      <div className="absolute top-[2%] left-[3%] font-mono font-black text-2xl text-[#00f5d4] drop-shadow-[0_0_10px_rgba(0,245,212,0.4)] -rotate-12">SLAY 💅</div>
      <div className="absolute top-[8%] left-[16%] rotate-[25deg] scale-[2.1]">
        <svg width="60" height="42" viewBox="0 0 60 42" fill="none" stroke="#ff3385" strokeWidth="2.2"><path d="M12 32 L30 16 C33 11 33 6 28 6 C23 6 24 11 29 16 L48 32 Z"/><path d="M12 32 L48 32"/></svg>
      </div>
      <div className="absolute top-[14%] left-[4%] -rotate-[35deg] scale-[1.9]">
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none" stroke="#00f5d4" strokeWidth="2"><circle cx="12" cy="12" r="5"/><circle cx="12" cy="30" r="5"/><path d="M16 15 L36 27 M16 27 L36 15"/></svg>
      </div>
      <div className="absolute top-[18%] left-[15%] font-mono font-black text-base text-[#a5b4fc] rotate-12">#OOTD</div>

      <div className="absolute top-[24%] left-[24%] -rotate-[18deg] scale-[1.6]">
        <svg width="45" height="30" viewBox="0 0 45 30" fill="none" stroke="#ffb800" strokeWidth="2"><rect x="5" y="6" width="35" height="18" rx="4"/><path d="M12 6 L12 14 M18 6 L18 11 M24 6 L24 14 M30 6 L30 11 M36 6 L36 14"/></svg>
      </div>
      <div className="absolute top-[25%] left-[2%] font-mono font-black text-xs text-[#ffb800] border-2 border-dashed border-[#ffb800] px-2 py-0.5 rounded-lg -rotate-6">NO CAP 🧢</div>
      <div className="absolute top-[30%] left-[10%] rotate-[15deg] scale-[2.5]">
        <svg width="35" height="55" viewBox="0 0 35 55" fill="none" stroke="#818cf8" strokeWidth="1.8"><path d="M17 5 Q27 5 27 14 L23 38 L11 38 L7 14 Q7 5 17 5 Z"/><path d="M12 38 L10 50 M22 38 L24 50"/><circle cx="17" cy="3" r="2.5" fill="#818cf8"/></svg>
      </div>
      <div className="absolute top-[35%] left-[22%] font-mono font-black text-xl text-[#ff3385] drop-shadow-[0_0_10px_rgba(255,51,133,0.4)] -rotate-12">ATE THAT! 🔥</div>

      <div className="absolute top-[42%] left-[2%] -rotate-[25deg] scale-[1.9]">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffb800" strokeWidth="2"><ellipse cx="20" cy="8" rx="14" ry="4"/><ellipse cx="20" cy="32" rx="14" ry="4"/><line x1="6" y1="8" x2="6" y2="32"/><line x1="34" y1="8" x2="34" y2="32"/><line x1="10" y1="14" x2="30" y2="26" strokeDasharray="2 3"/></svg>
      </div>
      <div className="absolute top-[48%] left-[5%] font-mono font-black text-4xl text-[#818cf8] opacity-75 -rotate-90 tracking-widest">DRIP</div>
      <div className="absolute top-[46%] left-[18%] rotate-[25deg] scale-[2.2]">
        <svg width="40" height="25" viewBox="0 0 40 25" fill="none" stroke="#00f5d4" strokeWidth="2"><path d="M8 12 C8 6 14 4 28 4 L34 4 C36 4 38 6 38 9 C38 12 36 14 34 14 L12 18 C9 18 7 15 7 12 Z"/><circle cx="8" cy="12" r="3"/></svg>
      </div>

      <div className="absolute top-[56%] left-[2%] -rotate-12 scale-[2.3]">
        <svg width="40" height="35" viewBox="0 0 40 35" fill="none" stroke="#ff3385" strokeWidth="2"><path d="M6 8 L10 24 L24 24 Q30 24 35 15 L32 14 Q28 20 22 20 L14 18 L10 8 Z"/><line x1="8" y1="24" x2="7" y2="32"/></svg>
      </div>
      <div className="absolute top-[58%] left-[15%] font-mono font-black text-xs text-[#00f5d4] border border-[#00f5d4] px-2.5 py-0.5 rounded-full rotate-12">VIBE CHECK ✓</div>
      <div className="absolute top-[66%] left-[14%] font-mono font-black text-2xl text-[#ffb800] -rotate-12">PERIODT 💅</div>
      <div className="absolute top-[68%] left-[3%] rotate-[40deg] scale-[2]">
        <svg width="60" height="42" viewBox="0 0 60 42" fill="none" stroke="#00f5d4" strokeWidth="2"><path d="M12 32 L30 16 C33 11 33 6 28 6 C23 6 24 11 29 16 L48 32 Z"/><path d="M12 32 L48 32"/></svg>
      </div>

      <div className="absolute top-[75%] left-[15%] font-mono font-black text-sm text-[#ff3385] -rotate-6">BOP 🎶</div>
      <div className="absolute top-[77%] left-[3%] rotate-6 scale-[2.4]">
        <svg width="48" height="38" viewBox="0 0 48 38" fill="none" stroke="#00f5d4" strokeWidth="1.8"><rect x="4" y="28" width="40" height="5" rx="2"/><path d="M10 28 L10 10 L30 10 L30 18 L26 18"/><line x1="26" y1="18" x2="26" y2="28"/><circle cx="36" cy="15" r="5"/><circle cx="26" cy="24" r="1.5" fill="#00f5d4"/></svg>
      </div>
      <div className="absolute top-[86%] left-[16%] -rotate-[22deg] scale-[2]">
        <svg width="35" height="40" viewBox="0 0 35 40" fill="none" stroke="#ff3385" strokeWidth="2"><rect x="4" y="12" width="27" height="24" rx="4"/><path d="M11 12 C11 6 24 6 24 12"/></svg>
      </div>
      <div className="absolute top-[92%] left-[2%] font-mono font-black text-xl text-[#00f5d4] rotate-6">MAIN CHARACTER ⚡</div>

      {/* RIGHT SIDE */}
      <div className="absolute top-[4%] right-[4%] font-mono font-black text-2xl text-[#ff3385] rotate-12 border-2 border-[#ff3385] px-3 py-1 rounded-2xl drop-shadow-[0_0_10px_rgba(255,51,133,0.3)]">IT GIRL ✨</div>
      <div className="absolute top-[3%] right-[20%] rotate-[30deg] scale-[2.3]">
        <svg width="45" height="45" viewBox="0 0 45 45" fill="none" stroke="#00f5d4" strokeWidth="2"><line x1="8" y1="37" x2="35" y2="10" strokeWidth="2.5"/><path d="M35 10 Q42 5 38 18 T24 28" strokeDasharray="2 3"/></svg>
      </div>
      <div className="absolute top-[12%] right-[16%] -rotate-[18deg] scale-[2.4]">
        <svg width="60" height="42" viewBox="0 0 60 42" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M12 32 L30 16 C33 11 33 6 28 6 C23 6 24 11 29 16 L48 32 Z"/><path d="M12 32 L48 32"/></svg>
      </div>
      <div className="absolute top-[17%] right-[4%] font-mono font-black text-sm text-[#ffb800] -rotate-12">HIGH KEY LUXE</div>

      <div className="absolute top-[24%] right-[5%] rotate-[35deg] scale-[2.1]">
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none" stroke="#ffb800" strokeWidth="2"><circle cx="12" cy="12" r="5"/><circle cx="12" cy="30" r="5"/><path d="M16 15 L36 27 M16 27 L36 15"/></svg>
      </div>
      <div className="absolute top-[26%] right-[18%] font-mono font-black text-2xl text-[#00f5d4] rotate-6">ICONIC 👑</div>
      <div className="absolute top-[38%] right-[4%] -rotate-12 scale-[2.4]">
        <svg width="42" height="40" viewBox="0 0 42 40" fill="none" stroke="#00f5d4" strokeWidth="2"><path d="M6 14 L10 34 L32 34 L36 14 Z"/><path d="M14 14 C14 7 28 7 28 14"/></svg>
      </div>

      <div className="absolute top-[45%] right-[3%] font-mono font-black text-4xl text-[#ff3385] opacity-70 rotate-90 tracking-widest">AESTHETIC</div>
      <div className="absolute top-[52%] right-[18%] rotate-[20deg] scale-[2.6]">
        <svg width="35" height="55" viewBox="0 0 35 55" fill="none" stroke="#ff3385" strokeWidth="1.8"><path d="M17 5 Q27 5 27 14 L23 38 L11 38 L7 14 Q7 5 17 5 Z"/><path d="M12 38 L10 50 M22 38 L24 50"/><circle cx="17" cy="3" r="2.5" fill="#ff3385"/></svg>
      </div>
      <div className="absolute top-[60%] right-[16%] font-mono font-black text-xs text-[#00f5d4] border-2 border-dashed border-[#00f5d4] px-2 py-0.5 rounded-lg -rotate-12">FIT CHECK 📸</div>

      <div className="absolute top-[75%] right-[18%] font-mono font-black text-2xl text-[#ffb800] rotate-12">LIVING RENT FREE</div>
      <div className="absolute top-[80%] right-[4%] rotate-[22deg] scale-[2.3]">
        <svg width="40" height="35" viewBox="0 0 40 35" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M6 8 L10 24 L24 24 Q30 24 35 15 L32 14 Q28 20 22 20 L14 18 L10 8 Z"/><line x1="8" y1="24" x2="7" y2="32"/></svg>
      </div>
      <div className="absolute top-[86%] right-[4%] font-mono font-black text-xs text-[#ff3385] bg-[#ff3385]/20 border border-[#ff3385]/40 px-3 py-1 rounded-full -rotate-6">ATE & LEFT NO CRUMBS 🔥</div>
      <div className="absolute top-[92%] right-[18%] -rotate-12 scale-[2.2]">
        <svg width="60" height="42" viewBox="0 0 60 42" fill="none" stroke="#ff3385" strokeWidth="2"><path d="M12 32 L30 16 C33 11 33 6 28 6 C23 6 24 11 29 16 L48 32 Z"/><path d="M12 32 L48 32"/></svg>
      </div>
    </div>
  );
}

// Dense Jewellery Graffiti Wallpaper Background
function JewelleryGraffitiBackground() {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-40 overflow-hidden select-none">
      {/* LEFT SIDE */}
      <div className="absolute top-[3%] left-[3%] font-mono font-black text-3xl text-[#ffb800] drop-shadow-[0_0_10px_rgba(255,184,0,0.4)] -rotate-12">BLING 💎</div>
      <div className="absolute top-[10%] left-[18%] rotate-[22deg] scale-[2.2]">
        <svg width="45" height="35" viewBox="0 0 45 35" fill="none" stroke="#00f5d4" strokeWidth="2"><path d="M12 4 L33 4 L42 14 L22.5 32 L3 14 Z"/><path d="M3 14 L42 14 M12 4 L22.5 32 L33 4"/></svg>
      </div>
      <div className="absolute top-[16%] left-[4%] -rotate-[25deg] scale-[2.3]">
        <svg width="35" height="42" viewBox="0 0 35 42" fill="none" stroke="#ff3385" strokeWidth="2"><circle cx="17.5" cy="24" r="14"/><path d="M12 10 L17.5 4 L23 10 Z" fill="#00f5d4" stroke="#00f5d4"/></svg>
      </div>
      <div className="absolute top-[25%] left-[16%] font-mono font-black text-sm text-[#a5b4fc] rotate-6">ICE COLD ❄️</div>

      <div className="absolute top-[30%] left-[2%] rotate-[15deg] scale-[2.5]">
        <svg width="45" height="40" viewBox="0 0 45 40" fill="none" stroke="#ffb800" strokeWidth="1.8"><path d="M6 8 C12 28 33 28 39 8"/><circle cx="22.5" cy="23" r="3" fill="#ffb800"/><circle cx="14" cy="18" r="2" fill="#00f5d4"/><circle cx="31" cy="18" r="2" fill="#00f5d4"/></svg>
      </div>
      <div className="absolute top-[42%] left-[18%] font-mono font-black text-2xl text-[#ff3385] -rotate-12">ATE! ✨</div>
      <div className="absolute top-[48%] left-[4%] -rotate-[30deg] scale-[2.2]">
        <svg width="30" height="45" viewBox="0 0 30 45" fill="none" stroke="#00f5d4" strokeWidth="2"><circle cx="15" cy="8" r="4"/><line x1="15" y1="12" x2="15" y2="20"/><path d="M5 32 C5 22 25 22 25 32 Z"/><line x1="8" y1="32" x2="8" y2="38"/><line x1="15" y1="32" x2="15" y2="40"/><line x1="22" y1="32" x2="22" y2="38"/></svg>
      </div>

      <div className="absolute top-[60%] left-[12%] font-mono font-black text-xs text-[#ffb800] border border-[#ffb800] px-2.5 py-0.5 rounded-full rotate-12">GLAM CHECK ✓</div>
      <div className="absolute top-[68%] left-[2%] rotate-6 scale-[2.4]">
        <svg width="45" height="30" viewBox="0 0 45 30" fill="none" stroke="#ff3385" strokeWidth="2"><path d="M4 24 L8 8 L18 16 L22.5 4 L27 16 L37 8 L41 24 Z"/><line x1="4" y1="24" x2="41" y2="24"/><circle cx="22.5" cy="4" r="2" fill="#ffb800"/></svg>
      </div>
      <div className="absolute top-[79%] left-[14%] font-mono font-black text-2xl text-[#a5b4fc] -rotate-12">NO CAP 👑</div>
      <div className="absolute top-[86%] left-[4%] -rotate-[20deg] scale-[2.1]">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#00f5d4" strokeWidth="2"><circle cx="20" cy="20" r="14"/><path d="M20 34 L20 38 M18 38 L22 38"/></svg>
      </div>
      <div className="absolute top-[94%] left-[8%] font-mono font-black text-lg text-[#ffb800] rotate-6">MAIN CHARACTER ⚡</div>

      {/* RIGHT SIDE */}
      <div className="absolute top-[4%] right-[4%] font-mono font-black text-2xl text-[#ff3385] rotate-12 border-2 border-[#ff3385] px-3 py-1 rounded-2xl drop-shadow-[0_0_10px_rgba(255,51,133,0.3)]">IT GIRL ✨</div>
      <div className="absolute top-[4%] right-[22%] rotate-[30deg] scale-[2.3]">
        <svg width="45" height="35" viewBox="0 0 45 35" fill="none" stroke="#ffb800" strokeWidth="2"><path d="M12 4 L33 4 L42 14 L22.5 32 L3 14 Z"/><path d="M3 14 L42 14 M12 4 L22.5 32 L33 4"/></svg>
      </div>
      <div className="absolute top-[15%] right-[16%] -rotate-[20deg] scale-[2.5]">
        <svg width="35" height="42" viewBox="0 0 35 42" fill="none" stroke="#00f5d4" strokeWidth="2"><circle cx="17.5" cy="24" r="14"/><path d="M12 10 L17.5 4 L23 10 Z" fill="#ffb800" stroke="#ffb800"/></svg>
      </div>
      <div className="absolute top-[18%] right-[3%] font-mono font-black text-sm text-[#ffb800] -rotate-12">PURE GOLD VIBE</div>

      <div className="absolute top-[27%] right-[18%] font-mono font-black text-2xl text-[#00f5d4] rotate-6">ICONIC 👑</div>
      <div className="absolute top-[36%] right-[4%] -rotate-12 scale-[2.4]">
        <svg width="45" height="40" viewBox="0 0 45 40" fill="none" stroke="#ff3385" strokeWidth="1.8"><path d="M6 8 C12 28 33 28 39 8"/><circle cx="22.5" cy="23" r="3" fill="#00f5d4"/><circle cx="14" cy="18" r="2" fill="#ffb800"/><circle cx="31" cy="18" r="2" fill="#ffb800"/></svg>
      </div>
      <div className="absolute top-[46%] right-[3%] font-mono font-black text-4xl text-[#ffb800] opacity-70 rotate-90 tracking-widest">SHINE</div>
      <div className="absolute top-[54%] right-[18%] rotate-[25deg] scale-[2.5]">
        <svg width="45" height="30" viewBox="0 0 45 30" fill="none" stroke="#00f5d4" strokeWidth="2"><path d="M4 24 L8 8 L18 16 L22.5 4 L27 16 L37 8 L41 24 Z"/><line x1="4" y1="24" x2="41" y2="24"/></svg>
      </div>

      <div className="absolute top-[66%] right-[16%] font-mono font-black text-xs text-[#ff3385] border-2 border-dashed border-[#ff3385] px-2 py-0.5 rounded-lg -rotate-12">FIT CHECK 📸</div>
      <div className="absolute top-[72%] right-[5%] -rotate-[30deg] scale-[2.2]">
        <svg width="30" height="45" viewBox="0 0 30 45" fill="none" stroke="#ffb800" strokeWidth="2"><circle cx="15" cy="8" r="4"/><line x1="15" y1="12" x2="15" y2="20"/><path d="M5 32 C5 22 25 22 25 32 Z"/><line x1="8" y1="32" x2="8" y2="38"/><line x1="15" y1="32" x2="15" y2="40"/><line x1="22" y1="32" x2="22" y2="38"/></svg>
      </div>
      <div className="absolute top-[84%] right-[18%] font-mono font-black text-2xl text-[#00f5d4] rotate-12">PERIODT 💅</div>
      <div className="absolute top-[91%] right-[16%] -rotate-12 scale-[2.3]">
        <svg width="35" height="42" viewBox="0 0 35 42" fill="none" stroke="#ff3385" strokeWidth="2"><circle cx="17.5" cy="24" r="14"/><path d="M12 10 L17.5 4 L23 10 Z" fill="#ffb800" stroke="#ffb800"/></svg>
      </div>
    </div>
  );
}

function HomePageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isJewellery = searchParams.get('tab') === 'jewellery';

  const currentLogo = isJewellery ? jewelleryLogo : fashionLogo;
  const brandAlt = isJewellery ? 'Kashvi Jewellery' : 'Kashvi Fashions';

  return (
    <main className="min-h-screen bg-[#040814] text-white pb-24 md:pb-20 w-full overflow-x-hidden relative font-sans">
      
      {/* Ambient Atmosphere Lights */}
      <div className="fixed top-5 left-10 w-[450px] h-[450px] bg-[#ff3385]/20 rounded-full blur-[90px] pointer-events-none z-0" />
      <div className="fixed bottom-5 right-10 w-[450px] h-[450px] bg-[#00f5d4]/18 rounded-full blur-[90px] pointer-events-none z-0" />

      {/* Dynamic Dense Graffiti Wallpapers */}
      {!isJewellery ? <FashionGraffitiBackground /> : <JewelleryGraffitiBackground />}

      {/* Modern Vaporwave Header with Enhanced Text Contrast */}
      <header
        className={`w-full sticky top-0 z-40 backdrop-blur-2xl transition-all duration-300 border-b bg-[#040814]/90 ${
          isJewellery ? 'border-[#ffb800]/40 shadow-[0_4px_30px_rgba(255,184,0,0.15)]' : 'border-[#ff3385]/40 shadow-[0_4px_30px_rgba(255,51,133,0.18)]'
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Brand Identity */}
          <div className="flex items-center justify-between w-full md:w-auto md:flex-1">
            <Link to={`/?tab=${isJewellery ? 'jewellery' : 'fashions'}`} className="inline-flex items-center group py-0.5">
              <div
                className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden p-0.5 transition-all duration-300 shadow-lg border flex items-center justify-center shrink-0 ${
                  isJewellery
                    ? 'bg-[#1c3830] border-[#ffb800]/50 shadow-[#ffb800]/25 group-hover:scale-105'
                    : 'bg-transparent border-transparent group-hover:scale-105'
                }`}
              >
                <img
                  src={currentLogo}
                  alt={brandAlt}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
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

          {/* Center: High-Visibility Gen-Z Department Switcher Capsule */}
          <div className="w-full md:w-auto md:flex-none">
            <div
              className={`grid grid-cols-2 p-1.5 rounded-2xl border transition-all duration-300 w-full md:w-80 backdrop-blur-xl ${
                isJewellery
                  ? 'bg-[#0b1122]/95 border-[#ffb800]/40 shadow-lg shadow-[#ffb800]/15'
                  : 'bg-[#0b1122]/95 border-[#ff3385]/40 shadow-lg shadow-[#ff3385]/15'
              }`}
            >
              <button
                type="button"
                onClick={() => setSearchParams({ tab: 'fashions' })}
                className={`w-full py-2 px-3 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                  !isJewellery
                    ? 'bg-gradient-to-r from-[#ff3385] to-[#6366f1] text-white shadow-md shadow-[#ff3385]/50'
                    : 'text-[#cbd5e1] hover:text-[#00f5d4]'
                }`}
              >
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span>Fashions</span>
              </button>

              <button
                type="button"
                onClick={() => setSearchParams({ tab: 'jewellery' })}
                className={`w-full py-2 px-3 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                  isJewellery
                    ? 'bg-gradient-to-r from-[#ffb800] to-[#ff3385] text-[#040814] shadow-md shadow-[#ffb800]/50'
                    : 'text-[#cbd5e1] hover:text-[#ffb800]'
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
          <div className="relative min-h-screen bg-[#040814] text-white selection:bg-[#ff3385] selection:text-white">
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