import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  LogOut,
  Package,
  MapPin,
  Settings,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CustomerOrdersModal from '../orders/CustomerOrdersModal';
import CustomerAddressesModal from '../profile/CustomerAddressesModal';
import ProfileSettingsModal from '../profile/ProfileSettingsModal';

interface HeaderUserButtonProps {
  isJewellery?: boolean;
}

export default function HeaderUserButton({ isJewellery = false }: HeaderUserButtonProps) {
  const { user, customer, signOut } = useAuth();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isAddressesOpen, setIsAddressesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Logout Confirm & Toast Feedback States
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#user-menu-wrapper')) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isDropdownOpen]);

  const handleUserButtonClick = () => {
    if (!user) {
      // లాగిన్ అయి లేకపోతే డైరెక్ట్ AuthModal ట్రిగ్గర్ అవుతుంది
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
    } else {
      setIsDropdownOpen((prev) => !prev);
    }
  };

  const handlePerformLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      setShowLogoutConfirm(false);
      setIsDropdownOpen(false);
      
      // స్పష్టమైన సక్సెస్ టోస్ట్ ఫీడ్‌బ్యాక్
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3500);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = customer?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Member';
  const displayPhone = customer?.mobile || user?.user_metadata?.whatsapp_number || user?.email;

  return (
    <div id="user-menu-wrapper" className="relative inline-block">
      {/* Main Header User Button */}
      <button
        type="button"
        aria-label="User Account"
        onClick={handleUserButtonClick}
        className={`relative p-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
          isJewellery
            ? 'text-neutral-700 hover:text-[#0b3b2c] hover:bg-[#f4f7f5]'
            : 'text-neutral-700 hover:text-[#ff4d6d] hover:bg-[#fff0f3]'
        } ${user ? 'ring-1.5 ring-neutral-900/10' : ''}`}
      >
        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-neutral-100 text-neutral-800">
          <User className="w-3.5 h-3.5" />
        </div>

        {user && (
          <span className="hidden sm:inline text-xs font-semibold text-neutral-800 max-w-[85px] truncate">
            {displayName}
          </span>
        )}

        {user && <ChevronDown className="w-3 h-3 text-neutral-400 -ml-0.5" />}
      </button>

      {/* Dropdown Menu for Logged-in Customer */}
      {user && isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-neutral-100 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* User Info Capsule */}
          <div className="px-5 py-2.5 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0b3b2c] font-bold text-xs flex items-center justify-center border border-emerald-100">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-neutral-900 truncate leading-snug">
                  {displayName}
                </h4>
                <p className="text-[10px] text-neutral-400 truncate">{displayPhone}</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="py-2 px-2 space-y-1 text-xs text-neutral-700 font-medium">
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                setIsOrdersOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer text-left"
            >
              <Package className="w-4 h-4 text-[#0b3b2c]" />
              <span>My Orders & Invoices</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                setIsAddressesOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer text-left"
            >
              <MapPin className="w-4 h-4 text-[#ff4d6d]" />
              <span>Saved Delivery Addresses</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                setIsSettingsOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer text-left"
            >
              <Settings className="w-4 h-4 text-neutral-500" />
              <span>Profile Settings</span>
            </button>
          </div>

          {/* Sign Out Trigger */}
          <div className="pt-2 px-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors font-bold text-xs cursor-pointer text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. LOGOUT CONFIRMATION POPUP MODAL */}
      {showLogoutConfirm &&
        createPortal(
          <div
            onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border border-neutral-100 cursor-default animate-in zoom-in-95 duration-150 space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs border border-rose-100">
                <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
              </div>

              <div>
                <h3 className="font-serif font-bold text-neutral-900 text-lg">
                  Confirm Sign Out
                </h3>
                <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                  Are you sure you want to sign out from <strong className="text-neutral-800">Kashvi Fashions</strong>? Your shopping bag and saved wishlist will be cleared securely.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-bold uppercase tracking-wider hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handlePerformLogout}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Signing Out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 2. SUCCESS LOGOUT TOAST NOTIFICATION */}
      {showToast &&
        createPortal(
          <div className="fixed top-5 inset-x-0 z-[10001] flex justify-center pointer-events-none px-4 animate-in slide-in-from-top-4 duration-300">
            <div className="bg-neutral-950 text-white border border-neutral-800 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md pointer-events-auto">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <h5 className="font-bold text-white leading-tight">Signed Out Successfully</h5>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Your session, bag and wishlist items have been cleared.
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modals */}
      <CustomerOrdersModal isOpen={isOrdersOpen} onClose={() => setIsOrdersOpen(false)} />
      <CustomerAddressesModal isOpen={isAddressesOpen} onClose={() => setIsAddressesOpen(false)} />
      <ProfileSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}