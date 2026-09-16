import React from 'react';
import { Link } from 'react-router-dom';

export default function FashionUnevenBanners() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        <Link
          to="/category/sarees"
          className="md:col-span-7 relative h-72 sm:h-96 rounded-2xl overflow-hidden group shadow-sm"
        >
          <img
            src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80"
            alt="Handloom Sarees"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
            <span className="text-xs uppercase tracking-widest text-[#ff4d6d] font-bold">Royal Heritage</span>
            <h3 className="text-2xl font-serif font-bold mt-1">Exclusive Zari & Silk Sarees</h3>
          </div>
        </Link>

        <Link
          to="/category/kurtis"
          className="md:col-span-5 relative h-72 sm:h-96 rounded-2xl overflow-hidden group shadow-sm"
        >
          <img
            src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80"
            alt="Designer Kurtis"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
            <span className="text-xs uppercase tracking-widest text-[#ff4d6d] font-bold">Casual & Festive</span>
            <h3 className="text-xl font-serif font-bold mt-1">Signature Daily Glamour</h3>
          </div>
        </Link>
      </div>
    </section>
  );
}