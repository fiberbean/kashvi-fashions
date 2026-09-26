import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const FASHION_DEFAULT_BANNERS = [
  {
    id: 'fsh-def-1',
    title: 'Heritage Kanchipuram Silks',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1600&h=900&fit=crop&q=80',
    link: 'noclick',
  },
  {
    id: 'fsh-def-2',
    title: 'Designer Lehengas',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=960&h=540&fit=crop&q=80',
    link: 'noclick',
  },
  {
    id: 'fsh-def-3',
    title: 'Contemporary Kurtis',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=960&h=540&fit=crop&q=80',
    link: 'noclick',
  },
];

interface BannerItem {
  id: string;
  title: string;
  image: string;
  link: string;
}

export default function FashionUnevenBanners() {
  const [mainSlides, setMainSlides] = useState<BannerItem[]>([FASHION_DEFAULT_BANNERS[0]]);
  const [rightTop, setRightTop] = useState<BannerItem>(FASHION_DEFAULT_BANNERS[1]);
  const [rightBottom, setRightBottom] = useState<BannerItem>(FASHION_DEFAULT_BANNERS[2]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const isClickDisabled = (targetLink?: string) => {
    if (!targetLink) return true;
    const clean = targetLink.trim().toLowerCase();
    return clean === 'noclick' || clean === '#' || clean === 'none' || clean === '';
  };

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('banner_type', 'fashions')
          .eq('active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          const main = data
            .filter((b) => b.placement === 'main_spotlight')
            .map((b) => ({
              id: b.id,
              title: b.title || 'Fashion Collection',
              image: b.image_url,
              link: b.redirect_link || b.link_url || 'noclick',
            }));

          const rt = data.find((b) => b.placement === 'right_top');
          const rb = data.find((b) => b.placement === 'right_bottom');

          if (main.length > 0) setMainSlides(main);
          if (rt && rt.image_url) {
            setRightTop({
              id: rt.id,
              title: rt.title || 'Fashion Trending',
              image: rt.image_url,
              link: rt.redirect_link || rt.link_url || 'noclick',
            });
          }
          if (rb && rb.image_url) {
            setRightBottom({
              id: rb.id,
              title: rb.title || 'Fashion Promo',
              image: rb.image_url,
              link: rb.redirect_link || rb.link_url || 'noclick',
            });
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic fashions banners:', err);
      }
    };

    fetchBanners();
  }, []);

  useEffect(() => {
    if (mainSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % mainSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [mainSlides.length]);

  const activeMain = mainSlides[currentSlide] || mainSlides[0];
  const isMainNoClick = isClickDisabled(activeMain.link);

  return (
    <section className="w-full max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-8 sm:pb-12 select-none relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-6 items-start">
        
        {/* 1. Main Spotlight Banner */}
        <Link
          to={isMainNoClick ? '#' : activeMain.link}
          onClick={(e) => {
            if (isMainNoClick) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className={`md:col-span-8 relative rounded-2xl sm:rounded-3xl overflow-hidden bg-white shadow-[0_10px_30px_rgba(255,182,193,0.45),0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_40px_rgba(255,140,165,0.65)] group aspect-[16/9] w-full transition-shadow duration-500 block border border-pink-100/60 ${
            isMainNoClick ? 'cursor-default' : 'cursor-pointer'
          }`}
        >
          <div className="w-full h-full relative overflow-hidden bg-stone-100">
            <img
              key={activeMain.id}
              src={activeMain.image}
              alt={activeMain.title}
              className="w-full h-full object-cover filter brightness-[0.98] group-hover:brightness-100 animate-in fade-in"
              loading="lazy"
            />

            {/* Ambient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />

            {/* Navigation Dots */}
            {mainSlides.length > 1 && (
              <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-5 flex items-center gap-1 sm:gap-1.5 z-30 bg-white/70 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full backdrop-blur-md border border-white/60 shadow-xs">
                {mainSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentSlide(idx);
                    }}
                    className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 ${
                      currentSlide === idx ? 'w-4 sm:w-5 bg-[#ff2d85] shadow-[0_0_8px_rgba(255,45,133,0.5)]' : 'w-1 sm:w-1.5 bg-stone-400/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* 2. Side Banners - Mobile lo 2-column grid ga pakkana pakkana osthayi */}
        <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-3 sm:gap-6">
          {[rightTop, rightBottom].map((banner, index) => {
            const isBannerNoClick = isClickDisabled(banner.link);

            return (
              <Link
                key={banner.id || index}
                to={isBannerNoClick ? '#' : banner.link}
                onClick={(e) => {
                  if (isBannerNoClick) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                className={`relative rounded-xl sm:rounded-3xl overflow-hidden bg-white shadow-[0_8px_25px_rgba(255,182,193,0.38),0_2px_6px_rgba(0,0,0,0.03)] hover:shadow-[0_14px_34px_rgba(255,140,165,0.6)] group aspect-[16/9] w-full transition-shadow duration-500 block border border-pink-100/60 ${
                  isBannerNoClick ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                <div className="w-full h-full relative overflow-hidden bg-stone-100">
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="w-full h-full object-cover filter brightness-[0.98] group-hover:brightness-100"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}