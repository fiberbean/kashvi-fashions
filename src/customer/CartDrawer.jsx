import React from "react";
import { useCart } from "../context/CartContext";

const money = value => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function CartDrawer({
  isOpen,
  onClose,
  customer,
  onOpenLogin,
  onProceedToCheckout
}) {
  const { cart, changeQty, removeItem, cartCount, subtotal } = useCart();

  if (!isOpen) return null;

  return (
    <div className="store-overlay" onClick={onClose}>
      <aside className="store-cart-drawer" onClick={e => e.stopPropagation()}>
        <div className="store-drawer-head">
          <div>
            <span>SHOPPING BAG</span>
            <h2>Your Cart ({cartCount})</h2>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </div>

        <div className="store-drawer-items">
          {!cart.length && (
            <div className="store-empty-notice" style={{ padding: "40px 0", textAlign: "center", color: "#64748b" }}>
              <h3>Your bag is empty</h3>
              <p style={{ fontSize: "13px", marginTop: "4px" }}>Add your favourite products to continue shopping.</p>
            </div>
          )}
          {cart.map((item, index) => (
            <div className="store-cart-item" key={`${item.productId}-${item.size}-${item.colour}-${index}`}>
              <div className="store-cart-item-img">
                {item.image ? <img src={item.image} alt={item.name} /> : "KF"}
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <strong style={{ fontSize: "14px", color: "var(--store-text)", display: "block", lineHeight: "1.3" }}>
                    {item.name}
                  </strong>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", margin: "4px 0 6px" }}>
                    <span className="store-variant-tag">{item.size}</span>
                    {item.colour && <span className="store-variant-tag colour">{item.colour}</span>}
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "var(--store-primary)" }}>
                    {money(item.price)}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                  <div className="store-qty-controls" style={{ margin: 0 }}>
                    <button type="button" onClick={() => changeQty(index, -1)}>−</button>
                    <span>{item.qty}</span>
                    <button type="button" onClick={() => changeQty(index, 1)}>+</button>
                  </div>
                  <button 
                    type="button" 
                    className="store-remove-btn" 
                    style={{ margin: 0, padding: "4px 8px" }} 
                    onClick={() => removeItem(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="store-drawer-bottom">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#64748b" }}>Bag Subtotal</span>
              <strong style={{ fontSize: "20px", fontWeight: "800", color: "var(--store-text)" }}>{money(subtotal)}</strong>
            </div>
            <button
              type="button"
              className="store-primary-btn full"
              onClick={() => {
                if (!customer) {
                  onClose();
                  onOpenLogin();
                  return;
                }
                onClose();
                onProceedToCheckout();
              }}
            >
              Proceed to Secure Checkout →
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}