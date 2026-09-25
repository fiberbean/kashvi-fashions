import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const FASHION_DEFAULT_BANNERS = [
  {
    id: 'fsh-def-1',
    title: 'Heritage Kanchipuram Silks',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1600&h=900&fit=crop&q=80',
    link: '/category/fashions?sub=sarees',
  },
  {
    id: 'fsh-def-2',
    title: 'Designer Lehengas',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=960&h=540&fit=crop&q=80',
    link: '/category/fashions?sub=lehengas',
  },
  {
    id: 'fsh-def-3',
    title: 'Contemporary Kurtis',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=960&h=540&fit=crop&q=80',
    link: '/category/fashions?sub=kurtis',
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
              link: b.redirect_link || b.link_url || '/category/fashions',
            }));

          const rt = data.find((b) => b.placement === 'right_top');
          const rb = data.find((b) => b.placement === 'right_bottom');

          if (main.length > 0) setMainSlides(main);
          if (rt && rt.image_url) {
            setRightTop({
              id: rt.id,
              title: rt.title || 'Fashion Trending',
              image: rt.image_url,
              link: rt.redirect_link || rt.link_url || '/category/fashions',
            });
          }
          if (rb && rb.image_url) {
            setRightBottom({
              id: rb.id,
              title: rb.title || 'Fashion Promo',
              image: rb.image_url,
              link: rb.redirect_link || rb.link_url || '/category/fashions',
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

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-10 pb-12 select-none relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* 1. Large Main Hoarding (Exact 16:9 -> 1600 x 900 px) */}
        <Link
          to={activeMain.link}
          className="md:col-span-8 relative rounded-md bg-[#0a0f1d] border-4 border-[#1e293b] hover:border-[#00f5d4] shadow-[0_25px_60px_rgba(0,0,0,0.98)] group aspect-[16/9] w-full flex flex-col p-2.5 pt-3 transition-all duration-300 block cursor-pointer"
        >
          {/* Top Metal Truss Bar */}
          <div className="absolute -top-3.5 inset-x-4 h-2 bg-gradient-to-r from-[#1e293b] via-[#475569] to-[#1e293b] rounded-t-xs shadow-md z-30" />

          {/* Overhead Spotlights */}
          <div className="absolute -top-9 inset-x-0 flex justify-around px-16 z-40 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-1.5 h-6 bg-gradient-to-b from-[#475569] via-[#334155] to-[#1e293b] rounded-t-full shadow-inner" />
                <div className="w-8 h-4 rounded-t-sm bg-[#0f172a] border border-[#64748b] shadow-[0_4px_10px_rgba(0,0,0,0.9)] flex items-center justify-center -mt-0.5">
                  <div className="w-5 h-2 rounded-full bg-white shadow-[0_0_15px_#ffffff,0_0_30px_rgba(255,255,255,0.95)]" />
                </div>
              </div>
            ))}
          </div>

          {/* Light Cones */}
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-md">
            <div
              className="absolute -top-2 left-[5%] w-[40%] h-[95%] bg-gradient-to-b from-white/30 via-white/8 to-transparent blur-xl"
              style={{ clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)' }}
            />
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-[45%] h-[100%] bg-gradient-to-b from-white/35 via-white/10 to-transparent blur-xl"
              style={{ clipPath: 'polygon(38% 0%, 62% 0%, 100% 100%, 0% 100%)' }}
            />
            <div
              className="absolute -top-2 right-[5%] w-[40%] h-[95%] bg-gradient-to-b from-white/30 via-white/8 to-transparent blur-xl"
              style={{ clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)' }}
            />
          </div>

          {/* Pure Flex Sheet (Zero gaps, Full Frame 16:9) */}
          <div className="w-full h-full rounded-xs overflow-hidden bg-[#020617] relative border border-[#334155] shadow-[inset_0_0_30px_rgba(0,0,0,0.85)] z-10">
            <img
              key={activeMain.id}
              src={activeMain.image}
              alt={activeMain.title}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-105 contrast-105 animate-in fade-in"
              loading="lazy"
            />

            {/* Corner Fasteners */}
            <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-700 border border-black shadow-md z-30 flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-black/70 rotate-45" />
            </div>
            <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-700 border border-black shadow-md z-30 flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-black/70 -rotate-45" />
            </div>
            <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-700 border border-black shadow-md z-30 flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-black/70 -rotate-45" />
            </div>
            <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-700 border border-black shadow-md z-30 flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-black/70 rotate-45" />
            </div>

            {/* Multi-Slide Navigation Dots */}
            {mainSlides.length > 1 && (
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-30 bg-black/60 px-2 py-1 rounded-full backdrop-blur-md border border-white/10">
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
                      currentSlide === idx ? 'w-4 bg-[#00f5d4]' : 'w-1.5 bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* 2. Side Stacked Hoardings (Both exact 16:9 -> 960 x 540 px) */}
        <div className="md:col-span-4 flex flex-col gap-6">
          {[rightTop, rightBottom].map((banner, index) => (
            <Link
              key={banner.id || index}
              to={banner.link}
              className="relative rounded-md bg-[#0a0f1d] border-4 border-[#1e293b] hover:border-[#00f5d4] shadow-[0_20px_45px_rgba(0,0,0,0.95)] group aspect-[16/9] w-full flex flex-col p-2.5 pt-3 transition-all duration-300 block cursor-pointer"
            >
              {/* Top Metal Truss Bar */}
              <div className="absolute -top-3.5 inset-x-3 h-2 bg-gradient-to-r from-[#1e293b] via-[#475569] to-[#1e293b] rounded-t-xs shadow-md z-30" />

              {/* Overhead Spotlights */}
              <div className="absolute -top-9 inset-x-0 flex justify-around px-8 z-40 pointer-events-none">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-1.5 h-6 bg-gradient-to-b from-[#475569] via-[#334155] to-[#1e293b] rounded-t-full shadow-inner" />
                    <div className="w-7 h-4 rounded-t-sm bg-[#0f172a] border border-[#64748b] shadow-[0_4px_10px_rgba(0,0,0,0.9)] flex items-center justify-center -mt-0.5">
                      <div className="w-4 h-2 rounded-full bg-white shadow-[0_0_15px_#ffffff,0_0_25px_rgba(255,255,255,0.95)]" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Light Cones */}
              <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-md">
                <div
                  className="absolute -top-2 left-[10%] w-[50%] h-[95%] bg-gradient-to-b from-white/30 via-white/8 to-transparent blur-xl"
                  style={{ clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)' }}
                />
                <div
                  className="absolute -top-2 right-[10%] w-[50%] h-[95%] bg-gradient-to-b from-white/30 via-white/8 to-transparent blur-xl"
                  style={{ clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)' }}
                />
              </div>

              {/* Canvas 16:9 Cover */}
              <div className="w-full h-full rounded-xs overflow-hidden bg-[#020617] relative border border-[#334155] shadow-[inset_0_0_20px_rgba(0,0,0,0.85)] z-10">
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-105 contrast-105"
                  loading="lazy"
                />

                {/* Corner Fasteners */}
                <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-700 border border-black shadow-md z-30 flex items-center justify-center">
                  <div className="w-1 h-0.5 bg-black/70 rotate-45" />
                </div>
                <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-700 border border-black shadow-md z-30 flex items-center justify-center">
                  <div className="w-1 h-0.5 bg-black/70 -rotate-45" />
                </div>
                <div className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-700 border border-black shadow-md z-30 flex items-center justify-center">
                  <div className="w-1 h-0.5 bg-black/70 -rotate-45" />
                </div>
                <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-700 border border-black shadow-md z-30 flex items-center justify-center">
                  <div className="w-1 h-0.5 bg-black/70 rotate-45" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}