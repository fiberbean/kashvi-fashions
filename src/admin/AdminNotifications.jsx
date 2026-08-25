import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export default function AdminNotifications({ orders = [], navigateToOrders }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Filter pending verification orders as active alerts
  const pendingOrders = orders.filter(o => o.status === "payment_verification");

  useEffect(() => {
    setUnreadCount(pendingOrders.length);
  }, [pendingOrders.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={dropdownRef}>
      {/* NOTIFICATION BELL ICON BUTTON */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(prev => !prev);
          setUnreadCount(0); // Mark as viewed
        }}
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid var(--admin-border-subtle, rgba(255,255,255,0.15))",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          color: "#fff",
          position: "relative",
          transition: "all 0.2s ease"
        }}
        title="Admin Notifications"
      >
        <span style={{ fontSize: "18px" }}>🔔</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              background: "#ef4444",
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: "800",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)"
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN PANEL */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "50px",
            width: "340px",
            background: "#0c1813",
            border: "1px solid rgba(45, 212, 191, 0.25)",
            borderRadius: "12px",
            boxShadow: "0 15px 35px rgba(0, 0, 0, 0.5)",
            zIndex: 99999,
            overflow: "hidden",
            fontFamily: "inherit"
          }}
        >
          {/* HEADER */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.02)"
            }}
          >
            <strong style={{ fontSize: "13.5px", color: "#fff", letterSpacing: "0.5px" }}>
              🔔 Action Center ({pendingOrders.length} Pending)
            </strong>
            <span
              style={{
                fontSize: "10.5px",
                color: "#2dd4bf",
                background: "rgba(45, 212, 191, 0.1)",
                padding: "2px 8px",
                borderRadius: "12px",
                fontWeight: "700"
              }}
            >
              Live Feed
            </span>
          </div>

          {/* LIST OF NOTIFICATIONS */}
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {pendingOrders.length > 0 ? (
              pendingOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => {
                    setIsOpen(false);
                    if (navigateToOrders) navigateToOrders();
                  }}
                  style={{
                    padding: "12px 18px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(45, 212, 191, 0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "13px", color: "#38bdf8", fontFamily: "monospace" }}>
                      #{order.id}
                    </strong>
                    <span style={{ fontSize: "11px", color: "#fef08a", fontWeight: "700" }}>
                      ₹{order.total}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#e2e8f0" }}>
                    <b>{order.customer?.name}</b> claimed payment verification.
                  </div>
                  <small style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", marginTop: "2px" }}>
                    {order.customer?.phone} · {order.items?.length || 0} item(s)
                  </small>
                </div>
              ))
            ) : (
              <div style={{ padding: "30px 18px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                ✨ No pending verifications. All caught up!
              </div>
            )}
          </div>

          {/* FOOTER */}
          {pendingOrders.length > 0 && (
            <div
              style={{
                padding: "10px 18px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                textAlign: "center",
                background: "rgba(0,0,0,0.2)"
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (navigateToOrders) navigateToOrders();
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2dd4bf",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                View All in Orders Pipeline →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}