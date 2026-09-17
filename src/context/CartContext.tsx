import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface CartItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  mrp?: number | null;
  image: string;
  qty: number;
  color?: string;
  size?: string;
  fabric?: string;
  department?: 'fashions' | 'jewellery';
}

interface CartContextType {
  cart: CartItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (itemOrItems: CartItem | CartItem[]) => void;
  updateQty: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  shippingCharge: number;
  setShippingCharge: (charge: number) => void;
  userPincode: string;
  setUserPincode: (pin: string) => void;
  totalDue: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('kashvi_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [userPincode, setUserPincode] = useState('');

  // లాగౌట్ డిటెక్షన్: యూజర్ లాగౌట్ అవ్వగానే కార్ట్ & కాష్‌లను పూర్తిగా క్లియర్ చేయడం
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setCart([]);
        setShippingCharge(0);
        setUserPincode('');
        localStorage.removeItem('kashvi_cart');
        localStorage.removeItem('kashvi_saved_addresses');
        localStorage.removeItem('kashvi_cached_orders');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Cart మార్పులను LocalStorage లో భద్రపరచడం
  useEffect(() => {
    try {
      localStorage.setItem('kashvi_cart', JSON.stringify(cart));
    } catch (err) {
      console.error('Cart sync error:', err);
    }
  }, [cart]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const addToCart = (itemOrItems: CartItem | CartItem[]) => {
    const itemsToAdd = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];

    setCart((prev) => {
      let updated = [...prev];
      itemsToAdd.forEach((newItem) => {
        const existingIndex = updated.findIndex((item) => item.id === newItem.id);
        if (existingIndex > -1) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            qty: updated[existingIndex].qty + newItem.qty,
          };
        } else {
          updated.push({ ...newItem });
        }
      });
      return updated;
    });

    openCart();
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('kashvi_cart');
  };

  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const totalDue = subtotal + shippingCharge;

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartOpen,
        openCart,
        closeCart,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        totalItems,
        subtotal,
        shippingCharge,
        setShippingCharge,
        userPincode,
        setUserPincode,
        totalDue,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}