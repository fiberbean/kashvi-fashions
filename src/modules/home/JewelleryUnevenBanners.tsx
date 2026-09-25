import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const JEWELLERY_DEFAULT_BANNERS = [
  {
    id: 'jwl-def-1',
    title: 'Certified Antique Temple Sets',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1600&h=900&fit=crop&q=80',
    link: '/category/jewellery?sub=temple',
  },
  {
    id: 'jwl-def-2',
    title: 'Polki & Kundan Chokers',
    image: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=960&h=540&fit=crop&q=80',
    link: '/category/jewellery?sub=choker-sets',
  },
  {
    id: 'jwl-def-3',
    title: 'Heirloom Bangles & Kadas',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=960&h=540&fit=crop&q=80',
    link: '/category/jewellery?sub=bangles',
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
              link: b.redirect_link || b.link_url || '/category/jewellery',
            }));

          const rt = data.find((b) => b.placement === 'right_top');
          const rb = data.find((b) => b.placement === 'right_bottom');

          if (main.length > 0) setMainSlides(main);
          if (rt && rt.image_url) {
            setRightTop({
              id: rt.id,
              title: rt.title || 'Royal Chokers',
              image: rt.image_url,
              link: rt.redirect_link || rt.link_url || '/category/jewellery',
            });
          }
          if (rb && rb.image_url) {
            setRightBottom({
              id: rb.id,
              title: rb.title || 'Royal Bangles',
              image: rb.image_url,
              link: rb.redirect_link || rb.link_url || '/category/jewellery',
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

  const activeMain = mainSlides[currentSlide] || mainSlides[0];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-10 pb-12 select-none relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* 1. Large Main Hoarding Board - Exact 16:9 Aspect Ratio (1600 x 900 px) */}
        <Link
          to={activeMain.link}
          className="md:col-span-8 relative rounded-xl bg-[#030a08] border-[4px] border-[#946e20] hover:border-[#e5c07b] shadow-[0_25px_60px_rgba(0,0,0,0.98),0_0_20px_rgba(229,192,123,0.15)] group aspect-[16/9] w-full flex flex-col p-2.5 pt-3 transition-all duration-300 block cursor-pointer"
        >
          {/* Top Brass Beam */}
          <div className="absolute -top-3.5 inset-x-6 h-2 bg-gradient-to-r from-[#785918] via-[#e5c07b] to-[#785918] rounded-t-xs shadow-md z-30" />

          {/* Spotlights */}
          <div className="absolute -top-9 inset-x-0 flex justify-around px-16 z-40 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-1.5 h-6 bg-gradient-to-b from-[#e5c07b] via-[#b38728] to-[#5a4110] rounded-t-full shadow-inner" />
                <div className="w-8 h-4 rounded-t-sm bg-[#120e06] border border-[#e5c07b] shadow-[0_4px_12px_rgba(0,0,0,0.9)] flex items-center justify-center -mt-0.5">
                  <div className="w-5 h-2 rounded-full bg-white shadow-[0_0_15px_#fff,0_0_25px_#fde68a,0_0_35px_#e5c07b]" />
                </div>
              </div>
            ))}
          </div>

          {/* Light Cones */}
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-md">
            <div
              className="absolute -top-2 left-[5%] w-[40%] h-[95%] bg-gradient-to-b from-[#fde68a]/35 via-[#e5c07b]/10 to-transparent blur-xl"
              style={{ clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)' }}
            />
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-[45%] h-[100%] bg-gradient-to-b from-[#fde68a]/40 via-[#e5c07b]/12 to-transparent blur-xl"
              style={{ clipPath: 'polygon(38% 0%, 62% 0%, 100% 100%, 0% 100%)' }}
            />
            <div
              className="absolute -top-2 right-[5%] w-[40%] h-[95%] bg-gradient-to-b from-[#fde68a]/35 via-[#e5c07b]/10 to-transparent blur-xl"
              style={{ clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)' }}
            />
          </div>

          {/* Stretched Canvas 16:9 */}
          <div className="w-full h-full rounded-xs overflow-hidden bg-[#020617] relative border border-[#e5c07b]/30 shadow-inner z-10">
            <img
              key={activeMain.id}
              src={activeMain.image}
              alt={activeMain.title}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-100 group-hover:brightness-105 contrast-105 animate-in fade-in"
              loading="lazy"
            />

            {/* Corner Fasteners */}
            <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30 flex items-center justify-center">
              <div className="w-1 h-0.5 bg-[#3d2c0b] rotate-45" />
            </div>
            <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30 flex items-center justify-center">
              <div className="w-1 h-0.5 bg-[#3d2c0b] -rotate-45" />
            </div>
            <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30 flex items-center justify-center">
              <div className="w-1 h-0.5 bg-[#3d2c0b] -rotate-45" />
            </div>
            <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30 flex items-center justify-center">
              <div className="w-1 h-0.5 bg-[#3d2c0b] rotate-45" />
            </div>

            {/* Navigation Dots */}
            {mainSlides.length > 1 && (
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-30 bg-black/60 px-2 py-1 rounded-full backdrop-blur-md border border-[#e5c07b]/30">
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
                      currentSlide === idx ? 'w-4 bg-[#ffd700]' : 'w-1.5 bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* 2. Side Stacked Hoarding Boards (Both exact 16:9 -> 960 x 540 px) */}
        <div className="md:col-span-4 flex flex-col gap-6">
          {[rightTop, rightBottom].map((banner, index) => (
            <Link
              key={banner.id || index}
              to={banner.link}
              className="relative rounded-xl bg-[#030a08] border-[4px] border-[#946e20] hover:border-[#e5c07b] shadow-[0_20px_45px_rgba(0,0,0,0.98),0_0_15px_rgba(229,192,123,0.12)] group aspect-[16/9] w-full flex flex-col p-2.5 pt-3 transition-all duration-300 block cursor-pointer"
            >
              {/* Top Brass Beam */}
              <div className="absolute -top-3.5 inset-x-5 h-2 bg-gradient-to-r from-[#785918] via-[#e5c07b] to-[#785918] rounded-t-xs shadow-md z-30" />

              {/* Overhead Spotlights */}
              <div className="absolute -top-9 inset-x-0 flex justify-around px-8 z-40 pointer-events-none">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-1.5 h-6 bg-gradient-to-b from-[#e5c07b] via-[#b38728] to-[#5a4110] rounded-t-full shadow-inner" />
                    <div className="w-7 h-4 rounded-t-sm bg-[#120e06] border border-[#e5c07b] shadow-[0_4px_10px_rgba(0,0,0,0.9)] flex items-center justify-center -mt-0.5">
                      <div className="w-4 h-2 rounded-full bg-white shadow-[0_0_15px_#fff,0_0_22px_#fde68a,0_0_30px_#e5c07b]" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Light Cones */}
              <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-md">
                <div
                  className="absolute -top-2 left-[10%] w-[50%] h-[95%] bg-gradient-to-b from-[#fde68a]/35 via-[#e5c07b]/10 to-transparent blur-xl"
                  style={{ clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)' }}
                />
                <div
                  className="absolute -top-2 right-[10%] w-[50%] h-[95%] bg-gradient-to-b from-[#fde68a]/35 via-[#e5c07b]/10 to-transparent blur-xl"
                  style={{ clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)' }}
                />
              </div>

              {/* Canvas 16:9 Cover */}
              <div className="w-full h-full rounded-xs overflow-hidden bg-[#020617] relative border border-[#e5c07b]/30 shadow-inner z-10">
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-100 group-hover:brightness-105 contrast-105"
                  loading="lazy"
                />

                {/* Corner Fasteners */}
                <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30 flex items-center justify-center">
                  <div className="w-1 h-0.5 bg-[#3d2c0b] rotate-45" />
                </div>
                <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30 flex items-center justify-center">
                  <div className="w-1 h-0.5 bg-[#3d2c0b] -rotate-45" />
                </div>
                <div className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30 flex items-center justify-center">
                  <div className="w-1 h-0.5 bg-[#3d2c0b] -rotate-45" />
                </div>
                <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#785918] via-[#e5c07b] to-[#fff] border border-[#5a4110] shadow-md z-30 flex items-center justify-center">
                  <div className="w-1 h-0.5 bg-[#3d2c0b] rotate-45" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}