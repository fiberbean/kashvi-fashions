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

  // 1. Small Inline
  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-pink-200/80 rounded-full shadow-xs animate-in fade-in duration-150 ${className}`}>
        <span className="text-xs animate-bounce">{line.emoji1}</span>
        <span className="text-[10.5px] font-bold text-[#ff2d85] whitespace-nowrap tracking-tight">
          {line.text}
        </span>
        <span className="text-xs animate-bounce">{line.emoji2}</span>
      </div>
    );
  }

  // 2. Medium
  if (size === 'md') {
    return (
      <div className={`py-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-150 ${className}`}>
        <div className="px-4 py-2 bg-white border border-pink-200 rounded-2xl shadow-[0_4px_16px_rgba(255,45,133,0.12)] flex items-center gap-2">
          <span className="text-sm animate-bounce">{line.emoji1}</span>
          <h3 className="text-xs sm:text-sm font-bold text-[#ff2d85] whitespace-nowrap">
            {line.text}
          </h3>
          <span className="text-sm animate-bounce">{line.emoji2}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff2d85] animate-ping" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff639f] animate-ping" />
        </div>
      </div>
    );
  }

  // 3. Large
  return (
    <div className={`py-14 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-150 ${className}`}>
      <div className="px-5 py-2.5 bg-white border border-pink-200/90 rounded-2xl shadow-[0_8px_25px_rgba(255,45,133,0.14)] flex items-center gap-2.5">
        <span className="text-lg animate-bounce">{line.emoji1}</span>
        <h3 className="text-sm sm:text-base font-bold text-[#ff2d85] whitespace-nowrap">
          {line.text}
        </h3>
        <span className="text-lg animate-bounce">{line.emoji2}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-3.5">
        <span className="w-2 h-2 rounded-full bg-[#ff2d85] animate-ping" />
        <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce" />
        <span className="w-2 h-2 rounded-full bg-[#ff639f] animate-ping" />
      </div>
    </div>
  );
}