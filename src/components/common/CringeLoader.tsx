import React, { useState, useEffect } from 'react';

export type CringeLoaderSize = 'sm' | 'md' | 'lg';

interface CringeLoaderProps {
  size?: CringeLoaderSize;
  className?: string;
}

const TELUGU_GENZ_LINES = [
  { text: '"Akka.. Vastundi Akka... Jara Aagaradheeeee.."', emoji1: '💃', emoji2: '💅' },
  { text: '"Wait chey Bro.. Drip loading, no cap!"', emoji1: '🔥', emoji2: '🕶️' },
  { text: '"Aagamma Koncham.. Aesthetic vibes render avthunnayi!"', emoji1: '✨', emoji2: '💅' },
  { text: '"Patience Mukhyam Bigilu.. Outfits cook avthunnayi!"', emoji1: '🍳', emoji2: '🔥' },
  { text: '"Era Bujji.. Antha aathram aithe ela? Vastundi aagu!"', emoji1: '😜', emoji2: '🚀' },
  { text: '"Hold up Bestie.. Wardrobe flex in process!"', emoji1: '👗', emoji2: '✨' },
  { text: '"Main Character energy loading.. 2 seconds aagu!"', emoji1: '👑', emoji2: '💃' },
  { text: '"Slow net aa? Lekapothe aathram ekkuva? Loading ikkada!"', emoji1: '😂', emoji2: '📦' },
  { text: '"Fit check in 3.. 2.. 1.. Slay cheyadaniki ready undu!"', emoji1: '💅', emoji2: '💄' },
  { text: '"FOMO vaddu thammudu.. Saraku diguthundi!"', emoji1: '🛍️', emoji2: '✨' },
  { text: '"Appude mood paadu chesukoku.. Dope collection loading!"', emoji1: '😎', emoji2: '🤙' },
  { text: '"Rey Chanti.. Refresh kottaku ra babu, loading aithondi ga!"', emoji1: '🤦‍♂️', emoji2: '⚡' },
];

export default function CringeLoader({ size = 'md', className = '' }: CringeLoaderProps) {
  const [line, setLine] = useState(TELUGU_GENZ_LINES[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * TELUGU_GENZ_LINES.length);
    setLine(TELUGU_GENZ_LINES[randomIndex]);
  }, []);

  // 1. Menu Bar / Button / Compact Inline Header Level (Small)
  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0b1426]/90 border border-[#ffe600]/60 rounded-lg shadow-xs animate-in fade-in duration-150 ${className}`}>
        <span className="text-xs animate-bounce">{line.emoji1}</span>
        <span className="text-[10px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#ff3385] via-[#ffe600] to-[#00f5d4] whitespace-nowrap">
          {line.text}
        </span>
        <span className="text-xs animate-bounce">{line.emoji2}</span>
      </div>
    );
  }

  // 2. Cart Drawer / Modal / Half Screen Level (Medium)
  if (size === 'md') {
    return (
      <div className={`py-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-150 ${className}`}>
        <div className="px-3.5 py-1.5 bg-[#0b1426]/95 border border-[#ffe600]/80 rounded-xl shadow-[0_0_12px_rgba(255,230,0,0.2)] flex items-center gap-2">
          <span className="text-sm animate-bounce">{line.emoji1}</span>
          <h3 className="text-xs sm:text-sm font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#ff3385] via-[#ffe600] to-[#00f5d4] whitespace-nowrap">
            {line.text}
          </h3>
          <span className="text-sm animate-bounce">{line.emoji2}</span>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff3385] animate-ping" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffe600] animate-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f5d4] animate-ping" />
        </div>
      </div>
    );
  }

  // 3. Full Products Grid / Main Page Level (Large)
  return (
    <div className={`py-14 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-150 ${className}`}>
      <div className="px-5 py-2.5 bg-[#0b1426]/95 border border-[#ffe600]/80 rounded-2xl shadow-[0_0_20px_rgba(255,230,0,0.3)] flex items-center gap-2.5">
        <span className="text-lg animate-bounce">{line.emoji1}</span>
        <h3 className="text-sm sm:text-base font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#ff3385] via-[#ffe600] to-[#00f5d4] whitespace-nowrap">
          {line.text}
        </h3>
        <span className="text-lg animate-bounce">{line.emoji2}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        <span className="w-2 h-2 rounded-full bg-[#ff3385] animate-ping" />
        <span className="w-2 h-2 rounded-full bg-[#ffe600] animate-bounce" />
        <span className="w-2 h-2 rounded-full bg-[#00f5d4] animate-ping" />
      </div>
    </div>
  );
} 