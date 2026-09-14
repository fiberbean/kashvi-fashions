"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Zap,
  ArrowLeft,
} from "lucide-react";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  size?: string;
  colour?: string;
  qty: number;
  type: "fashion" | "jewellery";
  fabric?: string | null;
}

interface CartContextType {
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (items: CartItem[]) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("kashvi_cart");
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to parse cart storage", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem("kashvi_cart", JSON.stringify(cart));
      } catch (e) {
        console.error("Failed to save cart storage", e);
      }
    }
  }, [cart, isLoaded]);

  const addToCart = (newItems: CartItem[]) => {
    setCart((prev) => {
      const updated = [...prev];
      newItems.forEach((newItem) => {
        const existingIndex = updated.findIndex((item) => item.id === newItem.id);
        if (existingIndex > -1) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            qty: updated[existingIndex].qty + newItem.qty,
          };
        } else {
          updated.push(newItem);
        }
      });
      return updated;
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
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
    try {
      localStorage.removeItem("kashvi_cart");
    } catch (e) {
      console.error(e);
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
      <GlobalCartDrawer />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

function GlobalCartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, totalItems, subtotal } =
    useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-neutral-100">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-neutral-900" />
              <h2 className="text-base font-serif font-bold text-neutral-950">My Bag</h2>
              <span className="text-xs bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-full font-bold">
                {totalItems}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              aria-label="Close cart drawer"
              className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-950 transition-colors active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-300 mb-3">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-serif font-semibold text-neutral-800">Your Bag is Empty</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed">
                  Discover our curated Haute Couture and Royal Vault Collections to add pieces to your bag.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="mt-5 px-6 py-2.5 rounded-full bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 transition-all shadow-xs active:scale-95"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3.5 p-3 rounded-2xl bg-neutral-50/90 border border-neutral-200/70"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-24 object-cover rounded-xl bg-white shrink-0 border border-neutral-100"
                  />

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span
                          className={`text-[9px] uppercase tracking-wider font-bold ${
                            item.type === "jewellery" ? "text-[#0b3b2c]" : "text-[#ff4d6d]"
                          }`}
                        >
                          {item.type === "jewellery" ? "Royal Vault" : "Haute Couture"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          aria-label="Remove item"
                          className="text-neutral-400 hover:text-red-500 transition-colors p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="text-xs font-serif font-bold text-neutral-900 line-clamp-1 mt-0.5">
                        {item.name}
                      </h4>

                      <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {item.size && (
                          <span>
                            Size: <strong className="text-neutral-800">{item.size}</strong>
                          </span>
                        )}
                        {item.size && item.colour && <span>•</span>}
                        {item.colour && (
                          <span>
                            Colour: <strong className="text-neutral-800">{item.colour}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200/50">
                      <span className="text-xs font-bold text-neutral-950">
                        ₹{(item.price * item.qty).toLocaleString("en-IN")}
                      </span>

                      <div className="flex items-center border border-neutral-200 rounded-lg bg-white shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-neutral-50 text-neutral-600 rounded-l-lg"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-neutral-800">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-neutral-50 text-neutral-600 rounded-r-lg"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-neutral-100 bg-white space-y-3.5">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-500">
                  <span>Subtotal ({totalItems} items)</span>
                  <span className="font-semibold text-neutral-900">
                    ₹{subtotal.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Luxury Shipping</span>
                  <span className="font-semibold text-emerald-600">Complimentary</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-neutral-950 pt-2 border-t border-neutral-100">
                  <span>Estimated Total</span>
                  <span className="font-serif text-base">₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <Link
                  href="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-neutral-950/15"
                >
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Instant Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </Link>

                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-3 px-4 rounded-2xl border border-neutral-300 hover:border-neutral-950 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Continue Shopping</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-400 pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
                <span>Encrypted 256-bit Secure Checkout</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}