import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  LogOut,
  Package,
  MapPin,
  Settings,
  ChevronDown,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CustomerOrdersModal from '../orders/CustomerOrdersModal';
import CustomerAddressesModal from '../profile/CustomerAddressesModal';
import ProfileSettingsModal from '../profile/ProfileSettingsModal';
import AuthModal from '../auth/AuthModal';

interface HeaderUserButtonProps {
  isJewellery?: boolean;
}

export default function HeaderUserButton({ isJewellery = false }: HeaderUserButtonProps) {
  const authContext = useAuth();
  const { user, customer, signOut } = authContext;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isAddressesOpen, setIsAddressesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDirectAuthOpen, setIsDirectAuthOpen] = useState(false);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showToast, setShowToast] = useState(false);

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
      if (typeof (authContext as any).openAuthModal === 'function') {
        (authContext as any).openAuthModal();
      } else if (typeof (authContext as any).setIsAuthOpen === 'function') {
        (authContext as any).setIsAuthOpen(true);
      } else if (typeof (authContext as any).setIsAuthModalOpen === 'function') {
        (authContext as any).setIsAuthModalOpen(true);
      }
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
      setIsDirectAuthOpen(true);
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
      <button
        type="button"
        aria-label="User Account"
        onClick={handleUserButtonClick}
        className={`relative p-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
          isJewellery
            ? 'text-stone-700 hover:text-[#b38728] hover:bg-amber-50'
            : 'text-stone-700 hover:text-[#ff2d85] hover:bg-pink-50'
        } ${user ? 'ring-1.5 ring-stone-200 bg-stone-50' : ''}`}
      >
        <User className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />

        {user && (
          <span className="hidden sm:inline text-xs font-semibold text-stone-800 max-w-[85px] truncate ml-0.5">
            {displayName}
          </span>
        )}

        {user && <ChevronDown className="w-3.5 h-3.5 text-stone-400" />}
      </button>

      {/* Dropdown Menu */}
      {user && isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-xl border border-stone-100 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-5 py-2.5 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-50 text-[#ff2d85] font-bold text-xs flex items-center justify-center border border-pink-100">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-stone-900 truncate leading-snug">
                  {displayName}
                </h4>
                <p className="text-[10px] text-stone-400 truncate">{displayPhone}</p>
              </div>
            </div>
          </div>

          <div className="py-2 px-2 space-y-1 text-xs text-stone-700 font-medium">
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                setIsOrdersOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer text-left"
            >
              <Package className="w-4 h-4 text-[#D4AF37]" />
              <span>My Orders & Invoices</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                setIsAddressesOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer text-left"
            >
              <MapPin className="w-4 h-4 text-[#ff2d85]" />
              <span>Saved Delivery Addresses</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                setIsSettingsOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer text-left"
            >
              <Settings className="w-4 h-4 text-stone-500" />
              <span>Profile Settings</span>
            </button>
          </div>

          <div className="pt-2 px-2 border-t border-stone-100">
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

      {/* Confirmation Modal */}
      {showLogoutConfirm &&
        createPortal(
          <div
            onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border border-stone-100 cursor-default animate-in zoom-in-95 duration-150 space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs border border-rose-100">
                <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
              </div>

              <div>
                <h3 className="font-bold text-stone-900 text-lg">
                  Confirm Sign Out
                </h3>
                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                  Are you sure you want to sign out from <strong className="text-stone-800">Kashvi Fashions</strong>? Your shopping bag and saved wishlist will be cleared securely.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold uppercase tracking-wider hover:bg-stone-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handlePerformLogout}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
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

      {/* Toast */}
      {showToast &&
        createPortal(
          <div className="fixed top-5 inset-x-0 z-[10001] flex justify-center pointer-events-none px-4 animate-in slide-in-from-top-4 duration-300">
            <div className="bg-stone-900 text-white border border-stone-800 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 max-w-md pointer-events-auto">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <h5 className="font-bold text-white leading-tight">Signed Out Successfully</h5>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Your session has been securely ended.
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}

      {!user && isDirectAuthOpen && (
        <AuthModal
          isOpen={isDirectAuthOpen}
          onClose={() => setIsDirectAuthOpen(false)}
        />
      )}

      <CustomerOrdersModal isOpen={isOrdersOpen} onClose={() => setIsOrdersOpen(false)} />
      <CustomerAddressesModal isOpen={isAddressesOpen} onClose={() => setIsAddressesOpen(false)} />
      <ProfileSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}