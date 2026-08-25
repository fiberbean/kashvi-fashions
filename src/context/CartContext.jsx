import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const CartContext = createContext();

export function CartProvider({ children, currentCustomer, notify }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("kashvi_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isInitialSync = useRef(true);

  // 1. Customer Login అయినప్పుడు Supabase DB నుండి Cart restore & merge చేయడం
  useEffect(() => {
    async function syncCloudCart() {
      if (!currentCustomer?.id) {
        isInitialSync.current = true;
        return;
      }

      try {
        const { data, error } = await supabase
          .from("customer_carts")
          .select("cart_items")
          .eq("customer_id", String(currentCustomer.id))
          .maybeSingle();

        if (data && Array.isArray(data.cart_items)) {
          const dbCart = data.cart_items;
          setCart(prevCart => {
            if (prevCart.length === 0) {
              localStorage.setItem("kashvi_cart", JSON.stringify(dbCart));
              return dbCart;
            }

            // Merge local cart and cloud cart without duplicates
            const merged = [...dbCart];
            prevCart.forEach(localItem => {
              const matchIdx = merged.findIndex(
                i => i.productId === localItem.productId && i.size === localItem.size && i.colour === localItem.colour
              );
              if (matchIdx >= 0) {
                merged[matchIdx] = {
                  ...merged[matchIdx],
                  qty: Math.max(merged[matchIdx].qty, localItem.qty)
                };
              } else {
                merged.push(localItem);
              }
            });

            saveToDb(currentCustomer.id, merged);
            localStorage.setItem("kashvi_cart", JSON.stringify(merged));
            return merged;
          });
        } else if (cart.length > 0) {
          saveToDb(currentCustomer.id, cart);
        }
      } catch (err) {
        console.error("Cart sync error with Supabase:", err);
      } finally {
        isInitialSync.current = false;
      }
    }

    syncCloudCart();
  }, [currentCustomer?.id]);

  // 2. Save Cart to Supabase Helper
  const saveToDb = async (customerId, cartData) => {
    if (!customerId) return;
    try {
      await supabase.from("customer_carts").upsert(
        {
          customer_id: String(customerId),
          cart_items: cartData,
          updated_at: new Date().toISOString()
        },
        { onConflict: "customer_id" }
      );
    } catch (err) {
      console.error("Failed to save cart to Supabase:", err);
    }
  };

  const updateCartState = (newCart) => {
    setCart(newCart);
    localStorage.setItem("kashvi_cart", JSON.stringify(newCart));
    if (currentCustomer?.id) {
      saveToDb(currentCustomer.id, newCart);
    }
  };

  const addItemsToCart = (itemsToAdd, actionType = "continue", onCheckoutProceed) => {
    if (!itemsToAdd || !itemsToAdd.length) return;

    let updated = [...cart];
    itemsToAdd.forEach(newItem => {
      const idx = updated.findIndex(
        x => x.productId === newItem.productId && x.size === newItem.size && x.colour === newItem.colour
      );
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + newItem.qty };
      } else {
        updated.push(newItem);
      }
    });

    updateCartState(updated);

    if (actionType === "checkout") {
      if (onCheckoutProceed) onCheckoutProceed();
    } else if (notify) {
      notify(`Added ${itemsToAdd.length} selection(s) to bag. Continue browsing!`);
    }
  };

  const changeQty = (index, delta) => {
    const updated = cart.map((item, i) =>
      i === index ? { ...item, qty: Math.max(1, item.qty + delta) } : item
    );
    updateCartState(updated);
  };

  const removeItem = (index) => {
    const updated = cart.filter((_, i) => i !== index);
    updateCartState(updated);
  };

  const clearCart = () => {
    updateCartState([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        setCart: updateCartState,
        addItemsToCart,
        changeQty,
        removeItem,
        clearCart,
        cartCount,
        subtotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};