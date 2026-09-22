import React from 'react';
import { Link } from 'react-router-dom';

const JEWELLERY_FIXED_BANNERS = [
  {
    id: 1,
    title: 'Certified Antique Temple Sets',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1000&q=80',
    link: '/category/jewellery?sub=temple',
    colSpan: 'md:col-span-8',
    height: 'h-[370px] md:h-[460px]',
    lightsCount: 3,
  },
  {
    id: 2,
    title: 'Polki & Kundan Chokers',
    image: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=800&q=80',
    link: '/category/jewellery?sub=choker-sets',
    colSpan: 'md:col-span-4',
    height: 'h-[220px]',
    lightsCount: 2,
  },
  {
    id: 3,
    title: 'Heirloom Bangles & Kadas',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
    link: '/category/jewellery?sub=bangles',
    colSpan: 'md:col-span-4',
    height: 'h-[220px]',
    lightsCount: 2,
  },
];

export default function JewelleryUnevenBanners() {
  const mainBanner = JEWELLERY_FIXED_BANNERS[0];
  const sideBanners = JEWELLERY_FIXED_BANNERS.slice(1);

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-10 pb-12 select-none relative z-10">
      {/* Royal Hoardings Grid (No Top Header Text) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        
        {/* 1. Large Main Hoarding Board */}
        <Link
          to={mainBanner.link}
          className={`${mainBanner.colSpan} relative rounded-xl bg-[#030a08] border-[4px] border-[#946e20] hover:border-[#e5c07b] shadow-[0_25px_60px_rgba(0,0,0,0.98),0_0_20px_rgba(229,192,123,0.15)] group ${mainBanner.height} flex flex-col p-2.5 pt-3 transition-all duration-300 block cursor-pointer`}
        >
          {/* Top Brass Beam / Truss Bar */}
          <div className="absolute -top-3.5 inset-x-6 h-2 bg-gradient-to-r from-[#785918] via-[#e5c07b] to-[#785918] rounded-t-xs shadow-md z-30" />

          {/* Polished Gold Overhead Spotlights */}
          <div className="absolute -top-9 inset-x-0 flex justify-around px-16 z-40 pointer-events-none">
            {[...Array(mainBanner.lightsCount)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                {/* Curved Brass Arm */}
                <div className="w-1.5 h-6 bg-gradient-to-b from-[#e5c07b] via-[#b38728] to-[#5a4110] rounded-t-full shadow-inner" />
                {/* Gold Lamp Hood */}
                <div className="w-8 h-4 rounded-t-sm bg-[#120e06] border border-[#e5c07b] shadow-[0_4px_12px_rgba(0,0,0,0.9)] flex items-center justify-center -mt-0.5">
                  {/* Warm Glowing Bulb */}
                  <div className="w-5 h-2 rounded-full bg-white shadow-[0_0_15px_#fff,0_0_25px_#fde68a,0_0_35px_#e5c07b]" />
                </div>
              </div>
            ))}
          </div>

          {/* Golden Volumetric Light Cones */}
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

          {/* Stretched Royal Canvas (Pure Image without text) */}
          <div className="w-full h-full rounded-xs overflow-hidden bg-[#020617] relative border border-[#e5c07b]/30 shadow-inner z-10">
            <img
              src={mainBanner.image}
              alt={mainBanner.title}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-100 group-hover:brightness-105 contrast-105"
              loading="lazy"
            />

            {/* Corner 24K Gold Fasteners */}
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
          </div>
        </Link>

        {/* 2. Side Stacked Hoarding Boards */}
        <div className="md:col-span-4 flex flex-col gap-8 justify-between">
          {sideBanners.map((banner) => (
            <Link
              key={banner.id}
              to={banner.link}
              className={`relative rounded-xl bg-[#030a08] border-[4px] border-[#946e20] hover:border-[#e5c07b] shadow-[0_20px_45px_rgba(0,0,0,0.98),0_0_15px_rgba(229,192,123,0.12)] group ${banner.height} flex flex-col p-2.5 pt-3 transition-all duration-300 block cursor-pointer`}
            >
              {/* Top Brass Beam */}
              <div className="absolute -top-3.5 inset-x-5 h-2 bg-gradient-to-r from-[#785918] via-[#e5c07b] to-[#785918] rounded-t-xs shadow-md z-30" />

              {/* Spotlights */}
              <div className="absolute -top-9 inset-x-0 flex justify-around px-8 z-40 pointer-events-none">
                {[...Array(banner.lightsCount)].map((_, i) => (
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

              {/* Stretched Inner Canvas (Pure Image) */}
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