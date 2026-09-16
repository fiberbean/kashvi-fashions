import React from 'react';
import { Link } from 'react-router-dom';

export default function JewelleryUnevenBanners() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        <Link
          to="/category/jewellery?sub=Choker%20Sets"
          className="md:col-span-5 relative h-72 sm:h-96 rounded-2xl overflow-hidden group shadow-sm"
        >
          <img
            src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80"
            alt="Polki Sets"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
            <span className="text-xs uppercase tracking-widest text-[#e5c07b] font-bold">22K Handcrafted</span>
            <h3 className="text-xl font-serif font-bold mt-1">Nizam Heritage Chokers</h3>
          </div>
        </Link>

        <Link
          to="/category/jewellery?sub=Necklaces"
          className="md:col-span-7 relative h-72 sm:h-96 rounded-2xl overflow-hidden group shadow-sm"
        >
          <img
            src="https://images.unsplash.com/photo-1611591475819-797de2338ff3?w=1000&q=80"
            alt="Antique Temple"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
            <span className="text-xs uppercase tracking-widest text-[#e5c07b] font-bold">Sacred Antiquity</span>
            <h3 className="text-2xl font-serif font-bold mt-1">South Temple Bridal Collection</h3>
          </div>
        </Link>
      </div>
    </section>
  );
}