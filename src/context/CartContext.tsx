import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  mrp?: number | null;
  image: string;
  color: string;
  size: string;
  fabric?: string | null;
  qty: number;
  department?: 'fashions' | 'jewellery';
}

interface CartContextType {
  cart: CartItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (items: CartItem | CartItem[]) => void;
  updateQty: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  shippingCharge: number;
  setShippingCharge: (charge: number) => void;
  userPincode: string;
  setUserPincode: (pincode: string) => void;
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
  const [userPincode, setUserPincode] = useState<string>(() => {
    return localStorage.getItem('kashvi_pincode') || '';
  });
  const [shippingCharge, setShippingCharge] = useState<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem('kashvi_cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  useEffect(() => {
    if (userPincode) {
      localStorage.setItem('kashvi_pincode', userPincode);
    }
  }, [userPincode]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const addToCart = (newItems: CartItem | CartItem[]) => {
    const itemsToAdd = Array.isArray(newItems) ? newItems : [newItems];

    setCart((prev) => {
      let updated = [...prev];
      itemsToAdd.forEach((item) => {
        const idx = updated.findIndex((i) => i.id === item.id);
        if (idx > -1) {
          updated[idx] = { ...updated[idx], qty: updated[idx].qty + item.qty };
        } else {
          updated.push(item);
        }
      });
      return updated;
    });

    setIsCartOpen(true);
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

  const clearCart = () => setCart([]);

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