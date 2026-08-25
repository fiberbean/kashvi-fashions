import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function KFUPISystem({
  isOpen,
  onClose,
  orderData,
  settings,
  onPaymentSuccess
}) {
  const [timeLeft, setTimeLeft] = useState(600);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [storeInfo, setStoreInfo] = useState({
    upiId: settings?.upiId || "",
    storeName: settings?.storeName || "Kashvi Fashions"
  });

  // 1. Fetch Store Info from Supabase Database if not passed via props
  useEffect(() => {
    async function loadStoreInfo() {
      if (!storeInfo.upiId) {
        try {
          const { data, error } = await supabase
            .from("settings")
            .select("*")
            .single();

          if (data) {
            setStoreInfo({
              upiId: data.upi_id || data.upiId || data.payment_upi || "",
              storeName: data.store_name || data.storeName || "Kashvi Fashions"
            });
          }
        } catch (err) {
          console.error("Failed to load store settings from DB:", err);
        }
      }
    }
    if (isOpen) {
      loadStoreInfo();
    }
  }, [isOpen, storeInfo.upiId]);

  // 2. 10-Minute Expiry Countdown Timer
  useEffect(() => {
    if (!isOpen || !orderData || paymentDone) return;
    setTimeLeft(600);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, orderData, paymentDone, onClose]);

  // 3. Realtime Listener & Rapid Polling for Bank Credit Detection
  useEffect(() => {
    if (!isOpen || !orderData?.id || paymentDone) return;

    const handleSuccess = (updatedData) => {
      setPaymentDone(true);
      setTimeout(() => {
        onPaymentSuccess(updatedData || orderData);
      }, 2000);
    };

    // Supabase Postgres Realtime Subscription
    const channel = supabase
      .channel(`order-status-${orderData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderData.id}`
        },
        (payload) => {
          if (
            payload.new?.status === "payment_received" ||
            payload.new?.payment?.status === "received"
          ) {
            handleSuccess(payload.new);
          }
        }
      )
      .subscribe();

    // High-frequency Polling Fallback (Every 2 seconds)
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("orders")
          .select("status, payment")
          .eq("id", orderData.id)
          .single();

        if (
          data &&
          (data.status === "payment_received" || data.payment?.status === "received")
        ) {
          clearInterval(interval);
          handleSuccess(data);
        }
      } catch (err) {
        console.error("Payment check error:", err);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isOpen, orderData, paymentDone, onPaymentSuccess]);

  if (!isOpen || !orderData) return null;

  const upiId = String(storeInfo.upiId || settings?.upiId || "").trim();
  const storeName = storeInfo.storeName || settings?.storeName || "Kashvi Fashions";
  const amount = Number(orderData.total || orderData.total_amount || 0).toFixed(2);
  const orderRef = orderData.id;
  
  // Standard Generic UPI Intent URI (Triggers Android Installed Apps Chooser)
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(String(orderRef))}`;
  
  // Clean QR Code Matrix
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiIntentUrl)}&color=0d5249&bgcolor=ffffff&margin=1`;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handlePayViaApp = () => {
    if (!upiId) {
      alert("Store UPI ID DB lo load avvaledu. Please check Store Info.");
      return;
    }
    setIsVerifying(true);
    window.location.href = upiIntentUrl;
  };

  return (
    <div style={overlayStyle}>
      <style>{`
        @keyframes kfLaserScan {
          0% { top: 0%; opacity: 0.2; }
          50% { opacity: 1; }
          100% { top: 96%; opacity: 0.2; }
        }
        @keyframes kfPulseRadar {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(13, 82, 73, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(13, 82, 73, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(13, 82, 73, 0); }
        }
        @keyframes kfShimmerBtn {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes kfPopIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div style={modalCardStyle}>
        {paymentDone ? (
          /* SUCCESS SCREEN */
          <div style={{ textAlign: "center", padding: "20px 0", animation: "kfPopIn 0.4s ease-out" }}>
            <div style={successCheckCircleStyle}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fd79a8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0d5249", margin: "16px 0 4px" }}>
              Payment Successful!
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
              Order #{orderRef} Verified
            </p>

            <div style={successAmountCardStyle}>
              <span style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Amount Paid</span>
              <span style={{ fontSize: "22px", fontWeight: "800", color: "#0d5249" }}>
                ₹{amount}
              </span>
            </div>

            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "14px 0 0" }}>
              Redirecting to order confirmation...
            </p>
          </div>
        ) : (
          /* ADVANCED HUD CYBER QR CHECKOUT */
          <>
            <div style={headerContainerStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="24" height="24" viewBox="0 0 100 100" fill="none" stroke="#0d5249" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M50 20 L20 65 L80 65 Z" />
                  <path d="M50 10 C50 10 50 20 50 20" />
                </svg>
                <div>
                  <h3 style={brandTitleStyle}>KASHVI SECURE CHECKOUT</h3>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", letterSpacing: "0.5px" }}>
                    ORDER: <span style={{ color: "#000000" }}>#{orderRef}</span>
                  </div>
                </div>
              </div>

              <div style={timerBadgeStyle}>
                ⏱️ {formatTime(timeLeft)}
              </div>
            </div>

            <div style={amountVaultStyle}>
              <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "500" }}>Total Payable</span>
              <span style={amountNumberStyle}>₹{amount}</span>
            </div>

            {/* HUD SCANNER CHAMBER */}
            <div style={hudOuterFrameStyle}>
              <div style={{ ...hudCornerStyle, top: "-4px", left: "-4px", borderTop: "3px solid #0d5249", borderLeft: "3px solid #0d5249" }} />
              <div style={{ ...hudCornerStyle, top: "-4px", right: "-4px", borderTop: "3px solid #0d5249", borderRight: "3px solid #0d5249" }} />
              <div style={{ ...hudCornerStyle, bottom: "-4px", left: "-4px", borderBottom: "3px solid #0d5249", borderLeft: "3px solid #0d5249" }} />
              <div style={{ ...hudCornerStyle, bottom: "-4px", right: "-4px", borderBottom: "3px solid #0d5249", borderRight: "3px solid #0d5249" }} />

              <div style={hudGridOverlayStyle} />
              <div style={laserScanBeamStyle} />

              <div style={qrImageWrapperStyle}>
                {upiId ? (
                  <>
                    <img
                      src={qrUrl}
                      alt="Scan to Pay"
                      style={{ width: "175px", height: "175px", borderRadius: "10px", display: "block" }}
                    />
                    <div style={centerBrandBadgeStyle}>
                      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" stroke="#0d5249" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M50 20 L20 65 L80 65 Z" />
                        <path d="M50 10 C50 10 50 20 50 20" />
                      </svg>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "20px", color: "#ef4444", fontSize: "12px", fontWeight: "600" }}>
                    Loading Store UPI Info...
                  </div>
                )}
              </div>
            </div>

            <div style={{ position: "relative", overflow: "hidden", borderRadius: "12px", marginTop: "14px" }}>
              <button
                type="button"
                onClick={handlePayViaApp}
                style={primaryCtaButtonStyle}
              >
                ⚡ Launch UPI App (GPay / PhonePe / Paytm / CRED)
              </button>
              <div style={shimmerEffectStyle} />
            </div>

            <div style={statusBarStyle}>
              <span style={radarDotStyle} />
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
                {isVerifying 
                  ? "Awaiting bank signal... Screen updates automatically." 
                  : "Detecting payment in real-time. Do not close..."}
              </span>
            </div>

            <button onClick={onClose} style={cancelActionStyle}>
              Cancel Transaction
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.75)",
  backdropFilter: "blur(6px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  padding: "16px",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
};

const modalCardStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "22px",
  width: "100%",
  maxWidth: "380px",
  padding: "20px",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)"
};

const headerContainerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #e2e8f0",
  paddingBottom: "12px"
};

const brandTitleStyle = {
  margin: 0,
  fontSize: "13px",
  letterSpacing: "1px",
  color: "#0d5249",
  fontWeight: "800"
};

const timerBadgeStyle = {
  background: "#fd79a81a",
  color: "#fd79a8",
  border: "1px solid #fd79a8",
  padding: "5px 10px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "700"
};

const amountVaultStyle = {
  marginTop: "14px",
  background: "#f8fafc",
  padding: "12px 16px",
  borderRadius: "14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid #e2e8f0"
};

const amountNumberStyle = {
  fontSize: "22px",
  fontWeight: "800",
  color: "#000000"
};

const hudOuterFrameStyle = {
  position: "relative",
  margin: "18px auto 0",
  width: "205px",
  height: "205px",
  padding: "14px",
  background: "linear-gradient(135deg, rgba(13, 82, 73, 0.05), rgba(253, 121, 168, 0.05))",
  borderRadius: "16px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  border: "1px dashed rgba(13, 82, 73, 0.25)"
};

const hudGridOverlayStyle = {
  position: "absolute",
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundImage: "radial-gradient(rgba(13, 82, 73, 0.15) 1px, transparent 1px)",
  backgroundSize: "12px 12px",
  pointerEvents: "none",
  borderRadius: "16px"
};

const qrImageWrapperStyle = {
  position: "relative",
  background: "#ffffff",
  padding: "6px",
  borderRadius: "12px",
  boxShadow: "0 4px 15px rgba(13, 82, 73, 0.12)",
  border: "1px solid rgba(13, 82, 73, 0.2)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const centerBrandBadgeStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "32px",
  height: "32px",
  background: "#ffffff",
  borderRadius: "50%",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  border: "2px solid #0d5249",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const hudCornerStyle = {
  position: "absolute",
  width: "16px",
  height: "16px"
};

const laserScanBeamStyle = {
  position: "absolute",
  left: "8px",
  right: "8px",
  height: "2px",
  background: "linear-gradient(90deg, transparent, #fd79a8, transparent)",
  boxShadow: "0 0 10px #fd79a8",
  animation: "kfLaserScan 2.4s infinite ease-in-out",
  zIndex: 10
};

const primaryCtaButtonStyle = {
  width: "100%",
  padding: "13px",
  background: "linear-gradient(135deg, #0d5249, #083c34)",
  color: "#ffffff",
  border: "none",
  borderRadius: "12px",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
  position: "relative",
  zIndex: 1
};

const shimmerEffectStyle = {
  position: "absolute",
  top: 0, left: 0, width: "50%", height: "100%",
  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
  animation: "kfShimmerBtn 2.8s infinite",
  pointerEvents: "none",
  zIndex: 2
};

const statusBarStyle = {
  marginTop: "12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "9px 12px",
  display: "flex",
  alignItems: "center",
  gap: "10px"
};

const radarDotStyle = {
  width: "10px",
  height: "10px",
  background: "#0d5249",
  borderRadius: "50%",
  animation: "kfPulseRadar 1.8s infinite",
  flexShrink: 0
};

const cancelActionStyle = {
  width: "100%",
  marginTop: "10px",
  background: "transparent",
  border: "none",
  color: "#64748b",
  fontSize: "12px",
  cursor: "pointer",
  padding: "4px"
};

const successCheckCircleStyle = {
  width: "70px",
  height: "70px",
  borderRadius: "50%",
  background: "rgba(253, 121, 168, 0.1)",
  border: "2px solid #fd79a8",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  margin: "0 auto"
};

const successAmountCardStyle = {
  background: "rgba(253, 121, 168, 0.05)",
  border: "1px solid rgba(253, 121, 168, 0.2)",
  borderRadius: "12px",
  padding: "10px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  maxWidth: "240px",
  margin: "0 auto"
};