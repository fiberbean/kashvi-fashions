import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const JEWELLERY_DEFAULT_BANNERS = [
  {
    id: 'jwl-def-1',
    title: 'Certified Antique Temple Sets',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1600&h=900&fit=crop&q=80',
    link: '',
  },
  {
    id: 'jwl-def-2',
    title: 'Polki & Kundan Chokers',
    image: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=960&h=540&fit=crop&q=80',
    link: '',
  },
  {
    id: 'jwl-def-3',
    title: 'Heirloom Bangles & Kadas',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=960&h=540&fit=crop&q=80',
    link: '',
  },
];

interface BannerItem {
  id: string;
  title: string;
  image: string;
  link: string;
}

export default function JewelleryUnevenBanners() {
  const [mainSlides, setMainSlides] = useState<BannerItem[]>([JEWELLERY_DEFAULT_BANNERS[0]]);
  const [rightTop, setRightTop] = useState<BannerItem>(JEWELLERY_DEFAULT_BANNERS[1]);
  const [rightBottom, setRightBottom] = useState<BannerItem>(JEWELLERY_DEFAULT_BANNERS[2]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('banner_type', 'jewellery')
          .eq('active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          const main = data
            .filter((b) => b.placement === 'main_spotlight')
            .map((b) => ({
              id: b.id,
              title: b.title || 'Royal Jewellery',
              image: b.image_url,
              link: b.redirect_link || b.link_url || '',
            }));

          const rt = data.find((b) => b.placement === 'right_top');
          const rb = data.find((b) => b.placement === 'right_bottom');

          if (main.length > 0) setMainSlides(main);
          if (rt && rt.image_url) {
            setRightTop({
              id: rt.id,
              title: rt.title || 'Royal Chokers',
              image: rt.image_url,
              link: rt.redirect_link || rt.link_url || '',
            });
          }
          if (rb && rb.image_url) {
            setRightBottom({
              id: rb.id,
              title: rb.title || 'Royal Bangles',
              image: rb.image_url,
              link: rb.redirect_link || rb.link_url || '',
            });
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic jewellery banners:', err);
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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      setCurrentSlide((prev) => (prev + 1) % mainSlides.length);
    } else if (distance < -50) {
      setCurrentSlide((prev) => (prev === 0 ? mainSlides.length - 1 : prev - 1));
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const activeMain = mainSlides[currentSlide] || mainSlides[0];

  const renderBannerContainer = (banner: BannerItem, children: React.ReactNode, extraClass: string) => {
    const hasValidLink = Boolean(banner.link && banner.link.trim() !== '' && banner.link !== '#');

    if (hasValidLink) {
      return (
        <Link to={banner.link} className={`${extraClass} cursor-pointer active:scale-[0.99] transition-transform`}>
          {children}
        </Link>
      );
    }

    return (
      <div className={`${extraClass} cursor-default select-none pointer-events-auto`}>
        {children}
      </div>
    );
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-10 pb-8 sm:pb-12 select-none relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
        
        {/* 1. Large Main Hoarding (Touch Swipeable & No-Click Guard) */}
        {renderBannerContainer(
          activeMain,
          <>
            <div className="absolute -top-3.5 inset-x-6 h-2 bg-gradient-to-r from-[#785918] via-[#e5c07b] to-[#785918] rounded-t-xs shadow-md z-30" />

            <div className="absolute -top-7 sm:-top-9 inset-x-0 flex justify-around px-8 sm:px-16 z-40 pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-1 sm:w-1.5 h-4 sm:h-6 bg-gradient-to-b from-[#e5c07b] via-[#b38728] to-[#5a4110] rounded-t-full shadow-inner" />
                  <div className="w-6 sm:w-8 h-3 sm:h-4 rounded-t-sm bg-[#120e06] border border-[#e5c07b] shadow-[0_4px_12px_rgba(0,0,0,0.9)] flex items-center justify-center -mt-0.5">
                    <div className="w-3.5 sm:w-5 h-1.5 sm:h-2 rounded-full bg-white shadow-[0_0_15px_#fff,0_0_25px_#fde68a,0_0_35px_#e5c07b]" />
                  </div>
                </div>
              ))}
            </div>

            <div
              className="w-full h-full rounded-xs overflow-hidden bg-[#020617] relative border border-[#e5c07b]/30 shadow-inner z-10"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                key={activeMain.id}
                src={activeMain.image}
                alt={activeMain.title}
                className="w-full h-full object-cover filter brightness-100 contrast-105 animate-in fade-in duration-300"
                loading="eager"
              />

              <div className="absolute top-2 left-2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30 flex items-center justify-center">
                <div className="w-1 h-0.5 bg-[#3d2c0b] rotate-45" />
              </div>
              <div className="absolute top-2 right-2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30 flex items-center justify-center">
                <div className="w-1 h-0.5 bg-[#3d2c0b] -rotate-45" />
              </div>
              <div className="absolute bottom-2 left-2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30 flex items-center justify-center">
                <div className="w-1 h-0.5 bg-[#3d2c0b] -rotate-45" />
              </div>
              <div className="absolute bottom-2 right-2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30 flex items-center justify-center">
                <div className="w-1 h-0.5 bg-[#3d2c0b] rotate-45" />
              </div>

              {mainSlides.length > 1 && (
                <div className="absolute bottom-2.5 right-3 flex items-center gap-1 z-30 bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-md border border-[#e5c07b]/30">
                  {mainSlides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCurrentSlide(idx);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        currentSlide === idx ? 'w-3.5 bg-[#ffd700]' : 'w-1.5 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </>,
          "md:col-span-8 relative rounded-xl bg-[#030a08] border-[4px] border-[#946e20] hover:border-[#e5c07b] shadow-[0_25px_60px_rgba(0,0,0,0.98),0_0_20px_rgba(229,192,123,0.15)] group aspect-[16/9] w-full flex flex-col p-2 sm:p-2.5 pt-2.5 sm:pt-3 block touch-pan-y"
        )}

        {/* 2. Side Stacked Hoardings */}
        <div className="md:col-span-4 flex flex-col gap-4 sm:gap-6 w-full">
          {[rightTop, rightBottom].map((banner, index) =>
            renderBannerContainer(
              banner,
              <>
                <div className="absolute -top-3.5 inset-x-5 h-2 bg-gradient-to-r from-[#785918] via-[#e5c07b] to-[#785918] rounded-t-xs shadow-md z-30" />

                <div className="absolute -top-7 sm:-top-9 inset-x-0 flex justify-around px-8 z-40 pointer-events-none">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-1 sm:w-1.5 h-4 sm:h-6 bg-gradient-to-b from-[#e5c07b] via-[#b38728] to-[#5a4110] rounded-t-full shadow-inner" />
                      <div className="w-5 sm:w-7 h-3 sm:h-4 rounded-t-sm bg-[#120e06] border border-[#e5c07b] shadow-[0_4px_10px_rgba(0,0,0,0.9)] flex items-center justify-center -mt-0.5">
                        <div className="w-3 sm:w-4 h-1.5 sm:h-2 rounded-full bg-white shadow-[0_0_15px_#fff,0_0_22px_#fde68a,0_0_30px_#e5c07b]" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="w-full h-full rounded-xs overflow-hidden bg-[#020617] relative border border-[#e5c07b]/30 shadow-inner z-10">
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="w-full h-full object-cover filter brightness-100 contrast-105"
                    loading="lazy"
                  />

                  <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30" />
                  <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30" />
                  <div className="absolute bottom-1.5 left-1.5 w-2 h-2 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30" />
                  <div className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30" />
                </div>
              </>,
              "relative rounded-xl bg-[#030a08] border-[4px] border-[#946e20] hover:border-[#e5c07b] shadow-[0_20px_45px_rgba(0,0,0,0.98),0_0_15px_rgba(229,192,123,0.12)] group aspect-[16/9] w-full flex flex-col p-2 sm:p-2.5 pt-2.5 sm:pt-3 block"
            )
          )}
        </div>
      </div>
    </section>
  );
}