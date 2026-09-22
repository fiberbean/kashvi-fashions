import React from 'react';
import { Link } from 'react-router-dom';

const FASHION_FIXED_BANNERS = [
  {
    id: 1,
    title: 'Heritage Kanchipuram Silks',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80',
    link: '/category/fashions?sub=sarees',
    colSpan: 'md:col-span-8',
    height: 'h-[370px] md:h-[460px]',
    lightsCount: 3,
  },
  {
    id: 2,
    title: 'Designer Lehengas',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80',
    link: '/category/fashions?sub=lehengas',
    colSpan: 'md:col-span-4',
    height: 'h-[220px]',
    lightsCount: 2,
  },
  {
    id: 3,
    title: 'Contemporary Kurtis',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
    link: '/category/fashions?sub=kurtis',
    colSpan: 'md:col-span-4',
    height: 'h-[220px]',
    lightsCount: 2,
  },
];

export default function FashionUnevenBanners() {
  const mainBanner = FASHION_FIXED_BANNERS[0];
  const sideBanners = FASHION_FIXED_BANNERS.slice(1);

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-10 pb-12 select-none relative z-10">
      {/* Industrial Billboard Grid (Pure Image Hoardings without any text) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        
        {/* 1. Large Main Hoarding */}
        <Link
          to={mainBanner.link}
          className={`${mainBanner.colSpan} relative rounded-md bg-[#0a0f1d] border-4 border-[#1e293b] hover:border-[#00f5d4] shadow-[0_25px_60px_rgba(0,0,0,0.98)] group ${mainBanner.height} flex flex-col p-2.5 pt-3 transition-all duration-300 block cursor-pointer`}
        >
          {/* Top Metal Truss Bar */}
          <div className="absolute -top-3.5 inset-x-4 h-2 bg-gradient-to-r from-[#1e293b] via-[#475569] to-[#1e293b] rounded-t-xs shadow-md z-30" />

          {/* Industrial Gooseneck Overhead Spotlights */}
          <div className="absolute -top-9 inset-x-0 flex justify-around px-16 z-40 pointer-events-none">
            {[...Array(mainBanner.lightsCount)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                {/* Curved Iron Arm */}
                <div className="w-1.5 h-6 bg-gradient-to-b from-[#475569] via-[#334155] to-[#1e293b] rounded-t-full shadow-inner" />
                {/* Floodlight Hood */}
                <div className="w-8 h-4 rounded-t-sm bg-[#0f172a] border border-[#64748b] shadow-[0_4px_10px_rgba(0,0,0,0.9)] flex items-center justify-center -mt-0.5">
                  {/* High Intensity LED Emitter */}
                  <div className="w-5 h-2 rounded-full bg-white shadow-[0_0_15px_#ffffff,0_0_30px_rgba(255,255,255,0.95)]" />
                </div>
              </div>
            ))}
          </div>

          {/* Atmospheric Downward Volumetric Light Beam Cones */}
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

          {/* Stretched Heavy-Duty Flex Canvas (Pure Image) */}
          <div className="w-full h-full rounded-xs overflow-hidden bg-[#020617] relative border border-[#334155] shadow-[inset_0_0_30px_rgba(0,0,0,0.85)] z-10">
            <img
              src={mainBanner.image}
              alt={mainBanner.title}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-105 contrast-105"
              loading="lazy"
            />

            {/* Industrial Fasteners at 4 Corners */}
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
          </div>
        </Link>

        {/* 2. Side Stacked Hoardings */}
        <div className="md:col-span-4 flex flex-col gap-8 justify-between">
          {sideBanners.map((banner) => (
            <Link
              key={banner.id}
              to={banner.link}
              className={`relative rounded-md bg-[#0a0f1d] border-4 border-[#1e293b] hover:border-[#00f5d4] shadow-[0_20px_45px_rgba(0,0,0,0.95)] group ${banner.height} flex flex-col p-2.5 pt-3 transition-all duration-300 block cursor-pointer`}
            >
              {/* Top Metal Truss Bar */}
              <div className="absolute -top-3.5 inset-x-3 h-2 bg-gradient-to-r from-[#1e293b] via-[#475569] to-[#1e293b] rounded-t-xs shadow-md z-30" />

              {/* Spotlights */}
              <div className="absolute -top-9 inset-x-0 flex justify-around px-8 z-40 pointer-events-none">
                {[...Array(banner.lightsCount)].map((_, i) => (
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

              {/* Inner Flex Sheet (Pure Image) */}
              <div className="w-full h-full rounded-xs overflow-hidden bg-[#020617] relative border border-[#334155] shadow-[inset_0_0_20px_rgba(0,0,0,0.85)] z-10">
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-105 contrast-105"
                  loading="lazy"
                />

                {/* Industrial Fasteners */}
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