import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  redirect_link: string | null;
  active: boolean;
  priority: number;
}

export default function FashionHeroScroller() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Touch Swipe States
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 45;

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchHeroBanners() {
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('active', true)
          .eq('banner_type', 'hero')
          .order('priority', { ascending: true });

        if (!error && data && data.length > 0) {
          setBanners(data);
        } else {
          // Luxury Boutique Fallback
          setBanners([
            {
              id: '1',
              title: 'Royal Heritage Collection',
              subtitle: 'Handcrafted Sarees & Imperial Silks',
              image_url:
                'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1600&q=85',
              redirect_link: '/category/fashions',
              active: true,
              priority: 1,
            },
            {
              id: '2',
              title: 'The Imperial Vault',
              subtitle: 'Kundan, Polki & Pure Temple Jewellery',
              image_url:
                'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1600&q=85',
              redirect_link: '/category/jewellery',
              active: true,
              priority: 2,
            },
          ]);
        }
      } catch (err) {
        console.error('Error loading banners:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHeroBanners();
  }, []);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (banners.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, 5000);
    }
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length, currentIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    resetTimer();
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    resetTimer();
  };

  // Touch Swipe Handlers for Mobile App Feel
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
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 pt-2 sm:pt-4">
        <div className="w-full aspect-[4/5] sm:aspect-[21/9] md:aspect-[2.4/1] rounded-3xl sm:rounded-[2rem] bg-neutral-100 animate-pulse" />
      </div>
    );
  }

  if (banners.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-3 sm:px-6 pt-2 sm:pt-4 select-none">
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative w-full aspect-[4/5] xs:aspect-[1/1] sm:aspect-[21/9] md:aspect-[2.4/1] rounded-3xl sm:rounded-[2rem] overflow-hidden shadow-lg shadow-black/5 bg-neutral-950 group"
      >
        {/* Slides Track */}
        {banners.map((banner, index) => {
          const isActive = index === currentIndex;

          return (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-all duration-700 ease-out ${
                isActive
                  ? 'opacity-100 scale-100 z-10'
                  : 'opacity-0 scale-105 pointer-events-none z-0'
              }`}
            >
              {/* Responsive Image with App Quality Object Positioning */}
              <img
                src={banner.image_url}
                alt={banner.title}
                className="w-full h-full object-cover object-center sm:object-center"
                loading={index === 0 ? 'eager' : 'lazy'}
              />

              {/* Dynamic Gradient Overlay for Mobile Legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 sm:from-black/70 sm:via-transparent sm:to-transparent" />

              {/* Content Box */}
              <div className="absolute inset-0 p-5 sm:p-10 md:p-14 flex flex-col justify-end items-start text-left z-20">
                <div className="max-w-xl space-y-2 sm:space-y-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] bg-white/15 text-white backdrop-blur-md border border-white/20">
                    <Sparkles className="w-3 h-3 text-[#e5c07b]" />
                    Featured Boutique
                  </span>

                  <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white tracking-tight leading-tight drop-shadow-md">
                    {banner.title}
                  </h2>

                  {banner.subtitle && (
                    <p className="text-xs sm:text-sm md:text-base text-neutral-200 line-clamp-2 leading-relaxed drop-shadow-xs">
                      {banner.subtitle}
                    </p>
                  )}

                  <div className="pt-2 sm:pt-3">
                    <Link
                      to={banner.redirect_link || '/category/fashions'}
                      className="inline-flex items-center justify-center px-5 py-2.5 sm:px-7 sm:py-3.5 rounded-2xl bg-white text-neutral-950 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-xl hover:bg-neutral-100 active:scale-95 transition-all"
                    >
                      Explore Collection →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Desktop Arrow Controls */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/90 text-white hover:text-black backdrop-blur-md border border-white/30 items-center justify-center shadow-lg transition-all active:scale-90 z-30 cursor-pointer"
              aria-label="Previous Banner"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/90 text-white hover:text-black backdrop-blur-md border border-white/30 items-center justify-center shadow-lg transition-all active:scale-90 z-30 cursor-pointer"
              aria-label="Next Banner"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Native App-Style Live Progress Bars */}
        {banners.length > 1 && (
          <div className="absolute top-3.5 inset-x-5 sm:inset-x-auto sm:left-auto sm:right-6 sm:bottom-6 sm:top-auto flex items-center justify-center gap-1.5 z-30 pointer-events-none">
            {banners.map((_, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <div
                  key={idx}
                  className={`h-1 sm:h-1.5 rounded-full transition-all duration-500 overflow-hidden ${
                    isCurrent
                      ? 'w-7 sm:w-8 bg-white shadow-sm'
                      : 'w-2 sm:w-2.5 bg-white/35'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}