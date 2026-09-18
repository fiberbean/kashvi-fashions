import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BellRing,
  ExternalLink,
  LogOut,
  LayoutDashboard,
  Users,
  RefreshCw,
  ShoppingBag,
  Package,
  Layers,
  MapPin,
  Truck,
  CreditCard,
  Settings,
  ChevronDown,
  Search,
  Tag,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { AdminStaffUser } from '../types';

interface AdminNavbarProps {
  unreadCount: number;
  currentUser: AdminStaffUser | null;
  isSyncing: boolean;
  onManualSync: () => void;
  onLogout: () => void;
}

export default function AdminNavbar({
  unreadCount,
  currentUser,
  isSyncing,
  onManualSync,
  onLogout
}: AdminNavbarProps) {
  const location = useLocation();
  const isAdmin = currentUser?.role === 'admin';
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (menu: string) => {
    setOpenDropdown((prev) => (prev === menu ? null : menu));
  };

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
    <nav
      ref={navRef}
      className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#e2eae6] shadow-[0_2px_12px_rgba(11,59,44,0.03)] select-none font-sans"
    >
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 h-15 flex items-center justify-between gap-3">
        
        {/* Left Section: Brand Logo & Navigation Menus */}
        <div className="flex items-center gap-4 lg:gap-5">
          <Link to="/kfmama" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8.5 h-8.5 rounded-xl bg-[#0b3b2c] text-[#e5c07b] flex items-center justify-center font-serif font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
              KF
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-extrabold text-sm tracking-wide text-[#0b3b2c] leading-none">
                KASHVI
              </span>
              <span className="text-[8.5px] font-bold tracking-widest text-[#ff4d6d] uppercase mt-0.5">
                Command OS
              </span>
            </div>
          </Link>

          {/* Primary Nav Links & Dropdowns */}
          <div className="hidden md:flex items-center gap-1 text-xs font-semibold text-[#4d6960]">
            
            {/* Dashboard Link */}
            <Link
              to="/kfmama"
              onClick={() => setOpenDropdown(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                location.pathname === '/kfmama'
                  ? 'bg-[#0b3b2c] text-white font-bold shadow-xs'
                  : 'hover:bg-[#f0f4f2] hover:text-[#0b3b2c]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>

            {/* Catalog Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('catalog')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  openDropdown === 'catalog'
                    ? 'bg-[#f0f4f2] text-[#0b3b2c]'
                    : 'hover:bg-[#f0f4f2] hover:text-[#0b3b2c]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Catalog</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'catalog' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'catalog' && (
                <div className="absolute top-full left-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-[#e2eae6] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <Link
                    to="/kfmama"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-neutral-700 hover:bg-[#f4f7f5] hover:text-[#0b3b2c] font-medium"
                  >
                    <Layers className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Product Catalog</span>
                  </Link>
                  <Link
                    to="/kfmama"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-neutral-700 hover:bg-[#f4f7f5] hover:text-[#0b3b2c] font-medium"
                  >
                    <Tag className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Collections & Vaults</span>
                  </Link>
                  <Link
                    to="/kfmama"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-neutral-700 hover:bg-[#f4f7f5] hover:text-[#0b3b2c] font-medium"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Stock & Inventory</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Masters Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('masters')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  openDropdown === 'masters'
                    ? 'bg-[#f0f4f2] text-[#0b3b2c]'
                    : 'hover:bg-[#f0f4f2] hover:text-[#0b3b2c]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Masters</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'masters' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'masters' && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-[#e2eae6] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <Link
                    to="/kfmama"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-neutral-700 hover:bg-[#f4f7f5] hover:text-[#0b3b2c] font-medium"
                  >
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Delivery Pincodes</span>
                  </Link>
                  <Link
                    to="/kfmama"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-neutral-700 hover:bg-[#f4f7f5] hover:text-[#0b3b2c] font-medium"
                  >
                    <Truck className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Rate Cards & Shipping</span>
                  </Link>
                  <Link
                    to="/kfmama"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-neutral-700 hover:bg-[#f4f7f5] hover:text-[#0b3b2c] font-medium"
                  >
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Customer Directory</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Orders Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('orders')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  openDropdown === 'orders'
                    ? 'bg-[#f0f4f2] text-[#0b3b2c]'
                    : 'hover:bg-[#f0f4f2] hover:text-[#0b3b2c]'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Orders</span>
                {unreadCount > 0 && (
                  <span className="bg-[#ff4d6d] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                    {unreadCount}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'orders' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'orders' && (
                <div className="absolute top-full left-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-[#e2eae6] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <Link
                    to="/kfmama"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center justify-between px-3.5 py-2 text-xs text-neutral-700 hover:bg-[#f4f7f5] hover:text-[#0b3b2c] font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Live Order Stream</span>
                    </span>
                    {unreadCount > 0 && (
                      <span className="bg-[#ff4d6d] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/kfmama"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-neutral-700 hover:bg-[#f4f7f5] hover:text-[#0b3b2c] font-medium"
                  >
                    <Truck className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Dispatched Shipments</span>
                  </Link>
                  <Link
                    to="/kfmama"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-neutral-700 hover:bg-[#f4f7f5] hover:text-[#0b3b2c] font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Returns & Exchanges</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Store Config Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('config')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  openDropdown === 'config' || location.pathname === '/kfmama/staff'
                    ? 'bg-[#f0f4f2] text-[#0b3b2c]'
                    : 'hover:bg-[#f0f4f2] hover:text-[#0b3b2c]'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Store Config</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'config' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'config' && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-[#e2eae6] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <Link
                    to="/kfmama"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-neutral-700 hover:bg-[#f4f7f5] hover:text-[#0b3b2c] font-medium"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Payment Gateways</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/kfmama/staff"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs text-[#0b3b2c] hover:bg-[#f4f7f5] font-bold"
                    >
                      <Users className="w-3.5 h-3.5 text-[#0b3b2c]" />
                      <span>Staff & Duty PINs</span>
                    </Link>
                  )}

                  <Link
                    to="/kfmama"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-neutral-700 hover:bg-[#f4f7f5] hover:text-[#0b3b2c] font-medium"
                  >
                    <Settings className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Store Profile Settings</span>
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Section: Auto Sync, Profile & Logout */}
        <div className="flex items-center gap-2.5">
          
          {/* Clickable Auto Sync Button */}
          <button
            type="button"
            onClick={onManualSync}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f8faf9] hover:bg-[#e4efe9] border border-[#dce6e1] text-[10.5px] font-semibold text-[#0b3b2c] shadow-2xs transition-all cursor-pointer active:scale-95"
            title="Click to Instant Sync Data"
          >
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>Auto Sync Active</span>
            <RefreshCw className={`w-3 h-3 text-[#809c93] ${isSyncing ? 'animate-spin text-[#0b3b2c]' : ''}`} />
          </button>

          {currentUser && (
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-[#dce6e1]">
              <div className="text-right">
                <div className="text-[11px] font-bold text-[#0c2b22] leading-none">
                  {currentUser.full_name}
                </div>
                <div className="text-[9px] font-mono text-[#809c93] mt-0.5">
                  ID: {currentUser.employee_id}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-extrabold uppercase border ${getRoleBadge(currentUser.role)}`}>
                {currentUser.role}
              </span>
            </div>
          )}

          <Link
            to="/"
            target="_blank"
            className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full border border-[#dce6e1] bg-white hover:bg-[#f0f4f2] text-[#0b3b2c] text-[10.5px] font-bold transition-all shadow-xs"
          >
            <span>Store</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </Link>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[#ff4d6d] hover:bg-rose-100 text-[10.5px] font-bold transition-all shadow-xs cursor-pointer"
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