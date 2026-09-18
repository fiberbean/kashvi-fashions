import React from 'react';
import { Link } from 'react-router-dom';
import { BellRing, ExternalLink, LogOut } from 'lucide-react';

interface AdminNavbarProps {
  unreadCount: number;
  onLogout: () => void;
}

export default function AdminNavbar({ unreadCount, onLogout }: AdminNavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#e2eae6] shadow-[0_2px_12px_rgba(11,59,44,0.03)] select-none">
      <div className="max-w-[1540px] mx-auto px-4 sm:px-8 h-15 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/kfmama" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8.5 h-8.5 rounded-xl bg-[#0b3b2c] text-[#e5c07b] flex items-center justify-center font-serif font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
            KF
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-extrabold text-sm tracking-wide text-[#0b3b2c] leading-none">
              KASHVI
            </span>
            <span className="text-[9px] font-bold tracking-widest text-[#ff4d6d] uppercase mt-0.5">
              Live Command OS
            </span>
          </div>
        </Link>

        {/* Center Live Indicator */}
        <div className="hidden md:flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-semibold text-[#0b3b2c] font-sans tracking-wide">
            Realtime Node Active
          </span>

          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold bg-[#ff4d6d] text-white px-2.5 py-0.5 rounded-full shadow-xs animate-bounce">
              <BellRing className="w-2.5 h-2.5" /> {unreadCount} New Unhandled
            </span>
          )}
        </div>

        {/* Right Controls & Logout */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            target="_blank"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#dce6e1] bg-white hover:bg-[#f0f4f2] text-[#0b3b2c] text-[11px] font-bold transition-all shadow-xs"
          >
            <span>Live Storefront</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-[#ff4d6d] hover:bg-rose-100 text-[11px] font-bold transition-all shadow-xs cursor-pointer"
            title="Lock & Logout Session"
          >
            <LogOut className="w-3 h-3" />
            <span>Lock OS</span>
          </button>
        </div>
      </div>
    </nav>
  );
}