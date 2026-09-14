import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

interface SubPill {
  name: string;
  query: string;
  img: string;
}

const quickSubBubbles: SubPill[] = [
  {
    name: "Chokers",
    query: "chokers",
    img: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200&q=80",
  },
  {
    name: "Jhumkas",
    query: "jhumkas",
    img: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=200&q=80",
  },
  {
    name: "Haarams",
    query: "haarams",
    img: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&q=80",
  },
  {
    name: "Kadas",
    query: "bangles",
    img: "https://images.unsplash.com/photo-1611591475824-7491d90471b4?w=200&q=80",
  },
];

export default function JewellerySpotlight() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 my-6 md:my-10">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#002b00] via-[#001800] to-[#000d00] border-2 border-[#FFD700]/40 shadow-2xl p-5 md:p-10">
        {/* Deep Emerald & Gold Glow Backdrops */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#006400]/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#FFD700]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Text Showcase */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            <div className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] bg-[#006400] text-[#FFD700] border border-[#FFD700]/50 px-3.5 py-1 rounded-full w-fit shadow-md mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Boutique Grand Edition
            </div>

            <h2 className="text-2xl md:text-4xl lg:text-5xl font-serif font-bold text-[#FFD700] tracking-tight leading-tight">
              The Royal Jewellery Lounge
            </h2>

            <p className="text-xs md:text-base text-neutral-300 mt-2 max-w-xl font-light leading-relaxed">
              Certified 22K Gold craft, handcrafted Polki choker sets, and heritage Temple pieces customized for weddings and celebrations.
            </p>

            {/* Quick Sub-Category Round Navigation */}
            <div className="mt-5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#FFD700]/70 block mb-2.5">
                Popular Collections
              </span>
              <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
                {quickSubBubbles.map((sub) => (
                  <Link
                    key={sub.name}
                    href="/category/jewellery"
                    className="flex flex-col items-center shrink-0 group active:scale-95 transition-transform"
                  >
                    <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-[#FFD700] to-[#006400] group-hover:scale-105 transition-transform shadow-md">
                      <div className="w-full h-full rounded-full overflow-hidden border border-[#001800]">
                        <img
                          src={sub.img}
                          alt={sub.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </div>
                    <span className="text-[11px] text-neutral-200 group-hover:text-[#FFD700] font-medium mt-1">
                      {sub.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* CTA Action */}
            <div className="mt-6 flex items-center gap-4">
              <Link
                href="/category/jewellery"
                className="inline-flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-wider text-[#003800] bg-[#FFD700] hover:bg-yellow-300 px-6 py-3 rounded-xl shadow-lg transition-all active:scale-95"
              >
                Enter Dedicated Lounge <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#FFD700]/90">
                <ShieldCheck className="w-4 h-4 text-[#FFD700]" /> Hallmarked Purity
              </div>
            </div>
          </div>

          {/* Right Macro Visual Card */}
          <div className="lg:col-span-5 relative">
            <Link
              href="/category/jewellery"
              className="block relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/4] rounded-2xl overflow-hidden border-2 border-[#FFD700]/40 shadow-xl group"
            >
              <img
                src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1000&q=80"
                alt="Jewellery Showcase"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute bottom-4 inset-x-4 flex justify-between items-end">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#FFD700] font-semibold">
                    Signature Drop
                  </span>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-white leading-tight">
                    Heritage Kundan Choker
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#004d00] bg-[#FFD700] px-3 py-1 rounded-full">
                  Explore Now
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}