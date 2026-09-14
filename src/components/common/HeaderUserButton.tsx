"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Package,
  MapPin,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProfileModal from "@/components/auth/ProfileModal";
import OrdersModal from "@/components/auth/OrdersModal";

export default function HeaderUserButton({
  isJewellery = false,
}: {
  isJewellery?: boolean;
}) {
  const { user, setIsAuthModalOpen, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // యూజర్ లాగిన్ కానప్పుడు: నేరుగా లాగిన్ / రిజిస్ట్రేషన్ మోడల్ ఓపెన్ అవుతుంది
  if (!user) {
    return (
      <button
        type="button"
        aria-label="Sign In or Register"
        onClick={() => setIsAuthModalOpen(true)}
        className={`p-2 rounded-full transition-colors cursor-pointer text-neutral-700 active:scale-90 ${
          isJewellery
            ? "hover:text-[#0b3b2c] hover:bg-[#f4f7f5]"
            : "hover:text-[#ff4d6d] hover:bg-[#fff0f3]"
        }`}
      >
        <User className="w-5 h-5" />
      </button>
    );
  }

  // యూజర్ లాగిన్ అయిన తర్వాత మాత్రమే: ప్రొఫైల్ డ్రాప్‌డౌన్
  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Customer";

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropdownOpen(false);
    await signOut();
  };

  const openProfileModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setDropdownOpen(false);
    setIsProfileModalOpen(true);
  };

  const openOrdersModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setDropdownOpen(false);
    setIsOrdersModalOpen(true);
  };

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          aria-label="User Account Menu"
          className={`flex items-center gap-1.5 p-1.5 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${
            isJewellery
              ? "border border-[#0b3b2c]/20 hover:bg-[#f4f7f5]"
              : "border border-[#ff4d6d]/20 hover:bg-[#fff0f3]"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white uppercase shadow-xs ${
              isJewellery ? "bg-[#0b3b2c]" : "bg-[#ff4d6d]"
            }`}
          >
            {displayName.charAt(0)}
          </div>

          <span className="text-xs font-semibold text-neutral-800 max-w-[90px] truncate hidden md:inline">
            {displayName}
          </span>

          <ChevronDown
            className={`w-3 h-3 text-neutral-400 transition-transform duration-200 ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-neutral-200/80 py-2 z-[999] animate-in fade-in zoom-in-95 duration-150 text-neutral-800">
            <div className="px-4 py-2.5 border-b border-neutral-100">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                Kashvi Customer
              </span>
              <span className="text-xs font-serif font-bold text-neutral-900 truncate block mt-0.5">
                {displayName}
              </span>
              <span className="text-[11px] text-neutral-500 truncate block font-light">
                {user.email}
              </span>
            </div>

            <div className="py-1">
              <button
                type="button"
                onClick={openProfileModal}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50 transition-colors text-left cursor-pointer"
              >
                <User
                  className={`w-4 h-4 ${
                    isJewellery ? "text-[#0b3b2c]" : "text-[#ff4d6d]"
                  }`}
                />
                <span className="font-medium">Account Settings</span>
              </button>

              <button
                type="button"
                onClick={openOrdersModal}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50 transition-colors text-left cursor-pointer"
              >
                <Package
                  className={`w-4 h-4 ${
                    isJewellery ? "text-[#0b3b2c]" : "text-[#ff4d6d]"
                  }`}
                />
                <span className="font-medium">My Orders</span>
              </button>
            </div>

            <div className="pt-1 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50/80 transition-colors text-left font-medium cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile & Addresses Modal Popup */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Orders Modal Popup */}
      <OrdersModal
        isOpen={isOrdersModalOpen}
        onClose={() => setIsOrdersModalOpen(false)}
      />
    </>
  );
}