import React, { useState, useRef, useEffect } from 'react';
import {
  ExternalLink,
  LogOut,
  LayoutDashboard,
  RefreshCw,
  Package,
  Layers,
  ChevronDown,
  Tag,
  Palette,
  Ruler,
  Scissors,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  ShoppingCart,
  Receipt,
  BarChart3
} from 'lucide-react';
import { AdminStaffUser } from '../types';
import { AdminViewType } from '../../AdminApp';

export type MasterSectionType = 'product' | 'category' | 'subcategory' | 'colours' | 'sizes' | 'fabrics';

interface AdminNavbarProps {
  unreadCount: number;
  currentUser: AdminStaffUser | null;
  isSyncing: boolean;
  onManualSync: () => void;
  onLogout: () => void;
  currentView: AdminViewType;
  onViewChange: (view: AdminViewType) => void;
  onSelectMaster?: (masterKey: MasterSectionType) => void;
}

export default function AdminNavbar({
  currentUser,
  isSyncing,
  onManualSync,
  onLogout,
  currentView,
  onViewChange,
  onSelectMaster
}: AdminNavbarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

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

  const handleSelectView = (view: AdminViewType) => {
    onViewChange(view);
    setOpenDropdown(null);
  };

  const handleMasterClick = (section: MasterSectionType) => {
    if (onSelectMaster) {
      onSelectMaster(section);
    }
    setOpenDropdown(null);
  };

  const getRoleBadge = (role: string = '') => {
    switch (role) {
      case 'admin':
        return 'bg-[#6d4aff]/20 text-[#00d9ff] border-[#6d4aff]/40 shadow-[0_0_10px_rgba(109,74,255,0.3)]';
      case 'manager':
        return 'bg-[#00d9ff]/15 text-[#00d9ff] border-[#00d9ff]/30';
      case 'operations':
        return 'bg-[#ffa500]/15 text-[#ffa500] border-[#ffa500]/30';
      default:
        return 'bg-white/10 text-white border-white/20';
    }
  };

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 bg-[#0a0e17]/95 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.6)] select-none font-sans"
    >
      <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-[#6d4aff] to-[#00d9ff]" />

      <div className="max-w-[1680px] mx-auto px-3 sm:px-5 h-15 flex items-center justify-between gap-2.5">
        
        <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => handleSelectView('dashboard')}
            className="flex items-center gap-2 shrink-0 group cursor-pointer mr-1"
          >
            <div className="relative w-8.5 h-8.5 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] p-[1px] shadow-lg shadow-[#6d4aff]/30 group-hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] transition-all duration-300">
              <div className="w-full h-full bg-[#101628] rounded-2xl flex items-center justify-center font-serif font-black text-xs text-white">
                <span className="bg-gradient-to-r from-white via-slate-100 to-[#00d9ff] bg-clip-text text-transparent">
                  KF
                </span>
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-[#00d9ff] animate-pulse" />
            </div>

            <div className="flex flex-col text-left">
              <span className="font-serif font-black text-xs tracking-wider text-white leading-none group-hover:text-[#00d9ff] transition-colors">
                KASHVI
              </span>
              <span className="text-[7.5px] font-mono font-extrabold tracking-widest text-[#00ff9d] uppercase mt-1">
                COMMAND OS
              </span>
            </div>
          </button>

          <div className="flex items-center gap-1 text-[11.5px] font-semibold flex-wrap">
            <button
              type="button"
              onClick={() => handleSelectView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer border shrink-0 ${
                currentView === 'dashboard'
                  ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white border-white/20 shadow-[0_4px_16px_rgba(109,74,255,0.4)] font-bold'
                  : 'text-[#8b9bb4] border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectView('orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer border shrink-0 ${
                currentView === 'orders'
                  ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white border-white/20 shadow-[0_4px_16px_rgba(109,74,255,0.4)] font-bold'
                  : 'text-[#8b9bb4] border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#00ff9d]" />
              <span>Orders</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectView('sales')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer border shrink-0 ${
                currentView === 'sales'
                  ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white border-white/20 shadow-[0_4px_16px_rgba(109,74,255,0.4)] font-bold'
                  : 'text-[#8b9bb4] border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#00d9ff]" />
              <span>Sales</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectView('purchase')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer border shrink-0 ${
                currentView === 'purchase'
                  ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white border-white/20 shadow-[0_4px_16px_rgba(109,74,255,0.4)] font-bold'
                  : 'text-[#8b9bb4] border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-[#ffa500]" />
              <span>Purchase</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectView('expenses')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer border shrink-0 ${
                currentView === 'expenses'
                  ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white border-white/20 shadow-[0_4px_16px_rgba(109,74,255,0.4)] font-bold'
                  : 'text-[#8b9bb4] border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-[#ff6b6b]" />
              <span>Expenses</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectView('reports')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer border shrink-0 ${
                currentView === 'reports'
                  ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white border-white/20 shadow-[0_4px_16px_rgba(109,74,255,0.4)] font-bold'
                  : 'text-[#8b9bb4] border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#a78bfa]" />
              <span>Reports</span>
            </button>

            <div className="relative shrink-0 z-[100]">
              <button
                type="button"
                onClick={() => toggleDropdown('masters')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${
                  openDropdown === 'masters'
                    ? 'bg-white/15 text-white border-white/30 shadow-lg shadow-[#6d4aff]/30'
                    : 'text-[#8b9bb4] border-transparent hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#00d9ff]" />
                <span>Masters</span>
                <ChevronDown className={`w-3 h-3 text-[#8b9bb4] transition-transform duration-200 ${openDropdown === 'masters' ? 'rotate-180 text-white' : ''}`} />
              </button>

              {openDropdown === 'masters' && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-[#101628]/98 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(109,74,255,0.25)] border border-white/15 py-2 z-[9999] animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => handleMasterClick('product')}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#8b9bb4] hover:text-white hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <Package className="w-4 h-4 text-[#6d4aff] group-hover:text-[#00d9ff] transition-colors" />
                    <span className="font-semibold">Product Master</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMasterClick('category')}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#8b9bb4] hover:text-white hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <Tag className="w-4 h-4 text-[#00d9ff] group-hover:text-white transition-colors" />
                    <span className="font-semibold">Category Master</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMasterClick('subcategory')}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#8b9bb4] hover:text-white hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <Layers className="w-4 h-4 text-[#8b9bb4] group-hover:text-[#00d9ff] transition-colors" />
                    <span className="font-semibold">Sub-Category Master</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMasterClick('colours')}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#8b9bb4] hover:text-white hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <Palette className="w-4 h-4 text-[#ff6b6b] group-hover:text-white transition-colors" />
                    <span className="font-semibold">Colours Master</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMasterClick('sizes')}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#8b9bb4] hover:text-white hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <Ruler className="w-4 h-4 text-[#00d9ff] group-hover:text-white transition-colors" />
                    <span className="font-semibold">Size Master</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMasterClick('fabrics')}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#8b9bb4] hover:text-white hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <Scissors className="w-4 h-4 text-[#00ff9d] group-hover:text-white transition-colors" />
                    <span className="font-semibold">Fabric Master</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onManualSync}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10.5px] font-mono text-white transition-all cursor-pointer active:scale-95 shadow-inner"
            title="Click for Realtime Sync"
          >
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff9d] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ff9d]" />
            </span>
            <span className="font-semibold tracking-wide hidden md:inline">Sync</span>
            <RefreshCw className={`w-3 h-3 text-[#00d9ff] ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {currentUser && (
            <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="text-right">
                <div className="text-[11px] font-bold text-white leading-none">
                  {currentUser.full_name}
                </div>
                <div className="text-[9px] font-mono text-[#8b9bb4] mt-0.5">
                  ID: {currentUser.employee_id}
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-mono font-extrabold uppercase border ${getRoleBadge(currentUser.role)}`}>
                {currentUser.role}
              </span>
            </div>
          )}

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-[10.5px] font-semibold transition-all"
          >
            <span>Store</span>
            <ExternalLink className="w-3 h-3 text-[#00d9ff]" />
          </a>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff6b6b]/15 border border-[#ff6b6b]/30 text-[#ff6b6b] hover:bg-[#ff6b6b]/25 hover:shadow-[0_0_15px_rgba(255,107,107,0.3)] text-[10.5px] font-bold transition-all cursor-pointer"
            title="Lock & Logout Shift Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock Shift</span>
          </button>
        </div>

      </div>
    </nav>
  );
}