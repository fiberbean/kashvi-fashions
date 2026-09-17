import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  color?: string;
  size?: string;
  fabric?: string;
  department?: 'fashions' | 'jewellery';
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  isWishlistOpen: boolean;
  openWishlist: () => void;
  closeWishlist: () => void;
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  totalWishlistItems: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    try {
      const saved = localStorage.getItem('kashvi_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  // లాగౌట్ డిటెక్షన్: యూజర్ లాగౌట్ అవ్వగానే విష్‌లిస్ట్‌ను క్లియర్ చేయడం
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setWishlist([]);
        localStorage.removeItem('kashvi_wishlist');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Wishlist LocalStorage Sync
  useEffect(() => {
    try {
      localStorage.setItem('kashvi_wishlist', JSON.stringify(wishlist));
    } catch (err) {
      console.error('Failed to save wishlist:', err);
    }
  }, [wishlist]);

  const openWishlist = () => setIsWishlistOpen(true);
  const closeWishlist = () => setIsWishlistOpen(false);

  const addToWishlist = (item: WishlistItem) => {
    setWishlist((prev) => {
      if (prev.some((it) => it.id === item.id)) return prev;
      return [item, ...prev];
    });
  };

  const removeFromWishlist = (id: string) => {
    setWishlist((prev) => prev.filter((it) => it.id !== id));
  };

  const isInWishlist = (id: string) => {
    return wishlist.some((it) => it.id === id);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isWishlistOpen,
        openWishlist,
        closeWishlist,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        totalWishlistItems: wishlist.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}