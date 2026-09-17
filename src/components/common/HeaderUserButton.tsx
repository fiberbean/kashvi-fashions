import React, { useState } from 'react';
import { User as UserIcon, LogOut, PackageCheck, Phone, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderUserButtonProps {
  isJewellery?: boolean;
}

export default function HeaderUserButton({ isJewellery = false }: HeaderUserButtonProps) {
  const { user, customer, openAuthModal, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // User is not logged in -> Trigger Auth Modal
  if (!user) {
    return (
      <button
        type="button"
        aria-label="User Account"
        onClick={openAuthModal}
        className={`p-2 rounded-full transition-colors cursor-pointer ${
          isJewellery
            ? 'text-neutral-700 hover:text-[#0b3b2c] hover:bg-[#f4f7f5]'
            : 'text-neutral-700 hover:text-[#ff4d6d] hover:bg-[#fff0f3]'
        }`}
      >
        <UserIcon className="w-5 h-5" />
      </button>
    );
  }

  // User is logged in -> Resolve display attributes
  const displayName =
    customer?.name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Customer';

  const initialLetter = displayName.trim().charAt(0).toUpperCase();
  const whatsappNumber = customer?.mobile || user.user_metadata?.whatsapp_number;

  const handleOpenOrders = () => {
    setDropdownOpen(false);
    window.location.hash = '#/orders';
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut();
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="User Account"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className={`flex items-center gap-2 py-1 px-2.5 rounded-full border transition-all cursor-pointer ${
          isJewellery
            ? 'border-[#0b3b2c]/20 bg-[#f4f7f5] text-[#0b3b2c] hover:bg-[#ebf2ee]'
            : 'border-[#ff4d6d]/25 bg-[#fff0f3] text-[#ff4d6d] hover:bg-[#ffe5ea]'
        }`}
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white uppercase shadow-2xs ${
            isJewellery ? 'bg-[#0b3b2c]' : 'bg-[#ff4d6d]'
          }`}
        >
          {initialLetter}
        </div>
        <span className="text-xs font-bold text-neutral-900 max-w-[85px] truncate hidden sm:inline">
          {displayName}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
      </button>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-100 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1.5">
            {/* Account Info */}
            <div className="p-2.5 bg-neutral-50/80 rounded-xl border border-neutral-100 space-y-0.5">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase ${
                    isJewellery ? 'bg-[#0b3b2c]' : 'bg-[#ff4d6d]'
                  }`}
                >
                  {initialLetter}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-neutral-900 truncate">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              {whatsappNumber && (
                <div className="pt-1.5 mt-1 border-t border-neutral-200/60 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>WA: {whatsappNumber}</span>
                </div>
              )}
            </div>

            {/* Menu Options */}
            <div className="pt-1 space-y-1">
              <button
                type="button"
                onClick={handleOpenOrders}
                className="w-full px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100/80 hover:text-neutral-950 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <PackageCheck className="w-4 h-4 text-neutral-500" />
                <span>My Orders</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}