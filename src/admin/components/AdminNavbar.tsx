import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BellRing, ExternalLink, LogOut, LayoutDashboard, Users } from 'lucide-react';
import { AdminStaffUser } from '../types';

interface AdminNavbarProps {
  unreadCount: number;
  currentUser: AdminStaffUser | null;
  onLogout: () => void;
}

export default function AdminNavbar({ unreadCount, currentUser, onLogout }: AdminNavbarProps) {
  const location = useLocation();
  const isAdmin = currentUser?.role === 'admin';

  const getRoleBadge = (role: string = '') => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'operations':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

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

        {/* Navigation Tabs */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/kfmama"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              location.pathname === '/kfmama'
                ? 'bg-[#0b3b2c] text-white shadow-xs'
                : 'text-[#4d6960] hover:text-[#0b3b2c]'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>

          {/* Staff Tab (Only visible to Admin) */}
          {isAdmin && (
            <Link
              to="/kfmama/staff"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                location.pathname === '/kfmama/staff'
                  ? 'bg-[#0b3b2c] text-white shadow-xs'
                  : 'text-[#4d6960] hover:text-[#0b3b2c]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff & PINs</span>
            </Link>
          )}

          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold bg-[#ff4d6d] text-white px-2.5 py-0.5 rounded-full shadow-xs animate-bounce">
              <BellRing className="w-2.5 h-2.5" /> {unreadCount} New Unhandled
            </span>
          )}
        </div>

        {/* Right Controls & Profile Info */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="flex items-center gap-2 pr-2 border-r border-[#dce6e1]">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-[#0c2b22] leading-none">
                  {currentUser.full_name}
                </div>
                <div className="text-[10px] font-mono text-[#809c93] mt-0.5">
                  ID: {currentUser.employee_id}
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${getRoleBadge(currentUser.role)}`}>
                {currentUser.role}
              </span>
            </div>
          )}

          <Link
            to="/"
            target="_blank"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#dce6e1] bg-white hover:bg-[#f0f4f2] text-[#0b3b2c] text-[11px] font-bold transition-all shadow-xs"
          >
            <span>Store</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-[#ff4d6d] hover:bg-rose-100 text-[11px] font-bold transition-all shadow-xs cursor-pointer"
            title="Lock & Logout Session"
          >
            <LogOut className="w-3 h-3" />
            <span>Lock</span>
          </button>
        </div>

      </div>
    </nav>
  );
}