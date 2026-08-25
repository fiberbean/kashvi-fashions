import React, { useState, useEffect } from "react";
import "./Storefront.css";
import { supabase } from "../lib/supabase";
import { sendAutomatedEmail } from "../lib/emailService";

const money = value => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const makeId = prefix => `${prefix}${Date.now().toString().slice(-8)}`;

const statuses = {
  new: "New Order",
  payment_verification: "Payment Verification",
  stock_check: "Stock Verification",
  payment_received: "Payment Received",
  packing: "Order Packed & Ready",
  shipped: "Dispatched (India Post)",
  delivered: "Delivered",
  stock_unavailable: "Stock Unavailable / Refund Required",
  refund_pending: "Refund Required",
  refund_initiated: "Refund Initiated",
  refund_completed: "Refund Completed"
};

const statusTone = status =>
  ["delivered", "payment_received", "refund_completed"].includes(status)
    ? "success"
    : status === "shipped" || status === "packing"
    ? "shipped"
    : status === "stock_check" || status === "processing"
    ? "processing"
    : ["stock_unavailable", "refund_pending"].includes(status)
    ? "danger"
    : "warning";

const weightGrams = item =>
  Number(item.productWeight || 0) * (item.weightUnit === "kg" ? 1000 : 1) * Number(item.qty || 0);

const shippingRate = (grams, zone) => {
  const slabs = [
    [500, [27, 31, 34, 35]],
    [1000, [31, 44, 51, 57]],
    [1500, [36, 58, 70, 80]],
    [2000, [45, 80, 100, 115]],
    [3000, [57, 100, 125, 145]],
    [4000, [69, 120, 150, 175]],
    [5000, [81, 140, 175, 205]]
  ];
  const index = { Local: 0, "Within State": 1, "Zone/Metro": 2, "Other States": 3 }[zone] ?? 3;
  const slab = slabs.find(item => grams <= item[0]);
  if (slab) return slab[1][index];
  const extra = Math.ceil((grams - 5000) / 1000);
  return slabs[slabs.length - 1][1][index] + extra * [15, 20, 25, 30][index];
};

const shippingCategory = (destination, originPincode) => {
  if (!destination) return "";
  const destPin = String(destination.pincode || destination.pin || "").trim();
  const origPin = String(originPincode || "533001").trim();
  const destZone = (destination.zone_type || destination.zone || destination.region || "").trim().toLowerCase();
  const destState = (destination.state || "").trim().toLowerCase();

  if (destPin === origPin || destZone === "local") return "Local";
  if (destState === "andhra pradesh" || destZone === "within state") return "Within State";
  if (destZone === "zone/metro" || destZone === "metro") return "Zone/Metro";
  return "Other States";
};

export default function StorefrontLayout({
  products = [],
  categories = [],
  banners = [],
  settings = {},
  orders = [],
  setOrders = () => {},
  pincodes = [],
  notify = () => {},
  onAdmin = () => {}
}) {
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState("");
  const [paymentStep, setPaymentStep] = useState(false);

  const [enlargedImage, setEnlargedImage] = useState(null);
  const [liveDestination, setLiveDestination] = useState(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState(false);

  // CUSTOMER PROFILE & AUTH
  const [customer, setCustomer] = useState(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [myOrdersModal, setMyOrdersModal] = useState(false);
  const [inspectCustomerOrder, setInspectCustomerOrder] = useState(null);
  const [addressesModal, setAddressesModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);

  // SAVED ADDRESSES
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [newAddressForm, setNewAddressForm] = useState({ name: "", phone: "", address: "", pincode: "", city: "", state: "" });

  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMode, setAccountMode] = useState("login");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [regForm, setRegForm] = useState({ name: "", email: "", mobile: "", password: "" });
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });

  const [currentSlide, setCurrentSlide] = useState(0);
  const activeBanners =
    banners && banners.length > 0
      ? banners
      : [
          {
            id: "BAN001",
            tagline: "SUMMER & EVERYDAY LUXURY",
            mainTitle: "EFFORTLESS ELEGANCE.\nPRECISION TAILORED.",
            desc: "Experience pure silhouette comfort with high-grade breathable fabrics, designed for perfection in every stitch.",
            ctaText: "Explore Catalogue ↓",
            sideBadge: "ORIGINAL DESIGN",
            sideTitle: "PURE COMFORT.\nZERO COMPROMISE.",
            watermark: "KASHVI"
          }
        ];

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const loadCustomerData = user => {
    if (!user) return;
    setProfileForm({
      name: user.user_metadata?.full_name || user.user_metadata?.name || "",
      phone: user.user_metadata?.mobile || user.phone || ""
    });

    try {
      const localStored = localStorage.getItem(`addresses_${user.id}`);
      if (localStored) {
        setSavedAddresses(JSON.parse(localStored));
      }
    } catch (err) {
      console.warn("Addresses local load:", err);
    }
  };

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setCustomer(data.session.user);
        loadCustomerData(data.session.user);
      }
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setCustomer(u);
      if (u) loadCustomerData(u);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", pincode: "" });

  useEffect(() => {
    if (customer) {
      setForm(prev => ({
        ...prev,
        name: prev.name || customer.user_metadata?.full_name || customer.user_metadata?.name || "",
        email: prev.email || customer.email || "",
        phone: prev.phone || customer.user_metadata?.mobile || customer.phone || ""
      }));
    }
  }, [customer]);

  useEffect(() => {
    const cleanPin = String(form.pincode || "").trim();
    if (cleanPin.length !== 6) {
      setLiveDestination(null);
      setPincodeError(false);
      return;
    }

    const checkPincode = async () => {
      setPincodeLoading(true);
      try {
        const matchedLocal = pincodes.find(
          item => String(item.pincode || item.pin || "").trim() === cleanPin
        );

        if (matchedLocal) {
          setLiveDestination(matchedLocal);
          setPincodeError(false);
          setPincodeLoading(false);
          return;
        }

        const { data: res1 } = await supabase.from("pincodes").select("*").eq("pincode", cleanPin).maybeSingle();

        if (res1) {
          setLiveDestination(res1);
          setPincodeError(false);
        } else {
          const { data: res2 } = await supabase.from("pincodes").select("*").eq("pin", cleanPin).maybeSingle();
          if (res2) {
            setLiveDestination(res2);
            setPincodeError(false);
          } else {
            if (cleanPin.startsWith("533")) {
              setLiveDestination({
                pincode: cleanPin,
                city: "Kakinada Region",
                district: "Kakinada",
                state: "Andhra Pradesh",
                zone_type: "Local"
              });
              setPincodeError(false);
            } else {
              setLiveDestination(null);
              setPincodeError(true);
            }
          }
        }
      } catch (err) {
        console.error("Pincode query error:", err);
      } finally {
        setPincodeLoading(false);
      }
    };

    checkPincode();
  }, [form.pincode, pincodes]);

  const zone = shippingCategory(liveDestination, settings.originPincode);
  const totalWeight = cart.reduce((sum, item) => sum + weightGrams(item), 0);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  const shipping = liveDestination ? shippingRate(totalWeight || 1, zone) : 0;
  const total = subtotal + shipping;
  const cartCount = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  const filtered = products.filter(
    p =>
      p.active !== false &&
      (category === "All" || p.category === category) &&
      (!search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.code?.toLowerCase().includes(search.toLowerCase()) ||
        p.model_no?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const addItemsToCart = (itemsToAdd, actionType = "continue") => {
    if (!itemsToAdd || !itemsToAdd.length) return;

    setCart(prevList => {
      let updated = [...prevList];
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
      return updated;
    });

    setSelectedProduct(null);

    if (actionType === "checkout") {
      if (!customer) {
        setCartOpen(false);
        setAccountMode("login");
        setAccountOpen(true);
        notify("Please sign in to proceed with your order");
        return;
      }
      setCheckoutOpen(true);
      notify("Proceeding to secure checkout");
    } else {
      notify(`Added ${itemsToAdd.length} selection(s) to bag. Continue browsing!`);
    }
  };

  const changeQty = (index, delta) =>
    setCart(list => list.map((item, i) => (i === index ? { ...item, qty: Math.max(1, item.qty + delta) } : item)));

  const removeItem = index => setCart(list => list.filter((_, i) => i !== index));

  const baseUpiParams = `pa=${encodeURIComponent(settings.upiId || "")}&pn=${encodeURIComponent(
    settings.storeName || "Kashvi Fashions"
  )}&am=${encodeURIComponent(total.toFixed(2))}&cu=INR&tn=${encodeURIComponent(
    "Kashvi Fashions Order"
  )}`;

  const upiLink = `upi://pay?${baseUpiParams}`;
  const gpayLink = `gpay://upi/pay?${baseUpiParams}`;
  const phonepeLink = `phonepe://pay?${baseUpiParams}`;
  const paytmLink = `paytmmp://pay?${baseUpiParams}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=4&data=${encodeURIComponent(
    upiLink
  )}`;

  const handleCustomerLogin = async e => {
    e.preventDefault();
    setAuthError("");
    const identifier = loginForm.identifier.trim();
    if (!identifier || !loginForm.password) {
      setAuthError("Please enter your registered Email and password");
      return;
    }

    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: loginForm.password
      });
      if (error) throw error;
      if (data?.user) {
        setCustomer(data.user);
        setAccountOpen(false);
        setLoginForm({ identifier: "", password: "" });
        notify(`Welcome back, ${data.user.user_metadata?.full_name || "Customer"}!`);
      }
    } catch (err) {
      setAuthError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCustomerRegister = async e => {
    e.preventDefault();
    setAuthError("");
    const name = regForm.name.trim();
    const email = regForm.email.trim().toLowerCase();
    const mobile = regForm.mobile.trim();
    const password = regForm.password;

    if (!name || !email || !mobile || !password) {
      setAuthError("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters long.");
      return;
    }

    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            mobile: mobile
          }
        }
      });

      if (error) {
        if (error.message?.toLowerCase().includes("already registered") || error.message?.toLowerCase().includes("already exists")) {
          setAuthError("This email is already registered. Please Sign In.");
          return;
        }
        throw error;
      }

      if (data?.user?.identities && data.user.identities.length === 0) {
        setAuthError("This email is already registered. Please Sign In.");
        return;
      }

      setVerificationEmail(email);
      setOtpCode("");
      setAccountMode("verify");
      notify("Verification code dispatched to your email!");
    } catch (err) {
      console.error(err);
      setAuthError(err.message || "Registration failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async e => {
    e.preventDefault();
    setAuthError("");
    const cleanOtp = otpCode.replace(/\s+/g, "").trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setAuthError("Please enter the complete 6-digit verification code.");
      return;
    }

    setAuthLoading(true);
    try {
      let verifyRes = await supabase.auth.verifyOtp({
        email: verificationEmail,
        token: cleanOtp,
        type: "signup"
      });

      if (verifyRes.error) {
        verifyRes = await supabase.auth.verifyOtp({
          email: verificationEmail,
          token: cleanOtp,
          type: "email"
        });
      }

      if (verifyRes.error) throw verifyRes.error;

      if (verifyRes.data?.user || verifyRes.data?.session?.user) {
        const u = verifyRes.data.user || verifyRes.data.session.user;
        setCustomer(u);
        notify("Account verified successfully! Welcome to Kashvi Fashions.");
        setAccountOpen(false);
        setAccountMode("login");
        setOtpCode("");
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setAuthError(err.message || "Invalid or expired verification code.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setAuthError("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: verificationEmail
      });
      if (error) throw error;
      notify("A fresh verification code has been dispatched to your email.");
    } catch (err) {
      setAuthError(err.message || "Failed to resend code.");
    }
  };

  const handleCustomerLogout = async () => {
    await supabase.auth.signOut();
    setCustomer(null);
    setAccountMenuOpen(false);
    notify("Signed out successfully");
  };

  const handleUpdateProfile = async e => {
    e.preventDefault();
    if (!profileForm.name.trim()) return notify("Name is required");

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: profileForm.name.trim(), mobile: profileForm.phone.trim() }
      });
      if (error) throw error;
      setCustomer(prev => ({
        ...prev,
        user_metadata: { ...prev.user_metadata, full_name: profileForm.name.trim(), mobile: profileForm.phone.trim() }
      }));
      notify("Profile updated successfully!");
      setProfileModal(false);
    } catch (err) {
      notify(err.message || "Failed to update profile");
    }
  };

  const handleSaveAddress = e => {
    e.preventDefault();
    if (!newAddressForm.name || !newAddressForm.phone || !newAddressForm.address || !newAddressForm.pincode) {
      return notify("Please complete all required address fields");
    }

    const payload = {
      id: makeId("ADDR"),
      name: newAddressForm.name.trim(),
      phone: newAddressForm.phone.trim(),
      address: newAddressForm.address.trim(),
      pincode: newAddressForm.pincode.trim(),
      city: newAddressForm.city.trim() || liveDestination?.city || "Local",
      state: newAddressForm.state.trim() || liveDestination?.state || "Andhra Pradesh"
    };

    const updated = [payload, ...savedAddresses];
    setSavedAddresses(updated);
    if (customer?.id) {
      localStorage.setItem(`addresses_${customer.id}`, JSON.stringify(updated));
    }
    notify("Address saved successfully!");
    setNewAddressForm({ name: "", phone: "", address: "", pincode: "", city: "", state: "" });
  };

  const startPayment = () => {
    if (!customer) {
      setCheckoutOpen(false);
      setAccountMode("login");
      setAccountOpen(true);
      return notify("Please sign in to place your order");
    }
    if (!cart.length) return notify("Your shopping bag is empty");
    if (!form.name || !form.phone || !form.pincode || !form.address) return notify("Please complete all delivery coordinates");
    if (!liveDestination) return notify("Destination pincode is not serviceable currently");
    if (!settings.upiId) return notify("Store UPI VPA is not configured");

    setPaymentStep(true);
  };

  const launchUpiApp = specificUri => {
    if (!settings.upiId) return notify("Store UPI ID is missing");
    window.location.href = specificUri || upiLink;
  };

  const placeOrder = async () => {
    if (!customer) {
      setCheckoutOpen(false);
      setAccountMode("login");
      setAccountOpen(true);
      return notify("Authentication required to place order");
    }
    if (!cart.length || !form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.pincode.trim()) {
      return notify("Please complete required contact & address fields");
    }
    if (!liveDestination) return notify("Pincode is unserviceable");
    if (!settings.upiId) return notify("UPI ID configuration missing");

    const createdAt = new Date().toISOString();
    const newOrderId = makeId("KF");

    const newOrder = {
      id: newOrderId,
      customer_id: customer.id,
      status: "payment_verification",
      total: Number(total.toFixed(2)),
      total_weight: Number(totalWeight || 0),
      payment: {
        status: "claimed",
        claimedAt: createdAt,
        method: "UPI",
        amount: Number(total.toFixed(2))
      },
      shipping: {
        courier: "India Post (Speed Post)",
        trackingId: ""
      },
      refund: {},
      customer: {
        ...form,
        city: liveDestination.city || liveDestination.office || "",
        district: liveDestination.district || "",
        state: liveDestination.state || ""
      },
      items: cart,
      history: [
        { status: "new", at: createdAt },
        { status: "payment_verification", at: createdAt }
      ]
    };

    try {
      const { error } = await supabase.from("orders").insert([newOrder]);
      if (error) throw error;

      setOrders(list => [newOrder, ...list]);
      setSubmittedOrderId(newOrderId);
      setCart([]);
      setPaymentStep(false);
      setPaymentSubmitted(true);
      notify("Order placed successfully!");

      const recipientEmail = form.email || customer?.email;
      sendAutomatedEmail({
        toEmail: recipientEmail,
        customerName: form.name,
        orderId: newOrderId,
        stage: "payment_verification",
        total: total.toFixed(2),
        items: cart,
        trackingNo: "",
        courier: "India Post"
      });

    } catch (err) {
      console.error(err);
      notify(`Error: ${err.message || "Failed to place order. Try again."}`);
    }
  };

  const myOrdersList = customer
    ? orders.filter(o => o.customer_id === customer.id || o.customer?.email?.toLowerCase() === customer.email?.toLowerCase())
    : [];

  const activeBanner = activeBanners[currentSlide] || activeBanners[0];

  return (
    <div className="store-container">
      <div className="store-announcement">
        ✦ COMPLIMENTARY SHIPPING ON ALL PREPAID UPI PURCHASES ✦
      </div>

      {/* HEADER */}
      <header className="store-header">
        <div className="store-header-inner">
          <div className="store-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Store Logo" className="store-header-logo-img" />
            ) : (
              <div>
                <strong>{settings?.storeName || "KASHVI"}</strong>
                <span>FASHIONS · ESTD 2025</span>
              </div>
            )}
          </div>

          <div className="store-actions">
            {customer ? (
              <div className="store-user-menu-wrap" style={{ position: "relative" }}>
                <button
                  type="button"
                  className="store-auth-btn user-logged"
                  onClick={() => setAccountMenuOpen(v => !v)}
                >
                  👤 {customer.user_metadata?.full_name?.split(" ")[0] || customer.user_metadata?.name || customer.email?.split("@")[0] || "My Account"} ▾
                </button>

                {accountMenuOpen && (
                  <div
                    className="store-user-dropdown"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      background: "#ffffff",
                      border: "1px solid var(--store-border)",
                      borderRadius: "10px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      minWidth: "220px",
                      padding: "8px",
                      zIndex: 1000,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}
                  >
                    <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--store-border)", marginBottom: "4px" }}>
                      <strong style={{ fontSize: "13.5px", color: "var(--store-primary)", display: "block" }}>
                        {customer.user_metadata?.full_name || "Valued Customer"}
                      </strong>
                      <small style={{ color: "var(--store-text-muted)", fontSize: "11px" }}>{customer.email}</small>
                    </div>

                    <button
                      type="button"
                      className="store-dropdown-link"
                      style={{ textAlign: "left", padding: "8px 10px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#334155", display: "flex", alignItems: "center", gap: "8px" }}
                      onClick={() => { setAccountMenuOpen(false); setMyOrdersModal(true); }}
                    >
                      📦 <span>My Orders ({myOrdersList.length})</span>
                    </button>

                    <button
                      type="button"
                      className="store-dropdown-link"
                      style={{ textAlign: "left", padding: "8px 10px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#334155", display: "flex", alignItems: "center", gap: "8px" }}
                      onClick={() => { setAccountMenuOpen(false); setAddressesModal(true); }}
                    >
                      📍 <span>Saved Addresses</span>
                    </button>

                    <button
                      type="button"
                      className="store-dropdown-link"
                      style={{ textAlign: "left", padding: "8px 10px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#334155", display: "flex", alignItems: "center", gap: "8px" }}
                      onClick={() => { setAccountMenuOpen(false); setProfileModal(true); }}
                    >
                      ⚙️ <span>Profile Settings</span>
                    </button>

                    <hr style={{ margin: "4px 0", borderColor: "var(--store-border)" }} />

                    <button
                      type="button"
                      className="store-dropdown-link"
                      style={{ textAlign: "left", padding: "8px 10px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", fontWeight: "700", color: "#ef4444", display: "flex", alignItems: "center", gap: "8px" }}
                      onClick={handleCustomerLogout}
                    >
                      🚪 <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="store-auth-btn"
                onClick={() => {
                  setAuthError("");
                  setAccountMode("login");
                  setAccountOpen(true);
                }}
              >
                Sign In
              </button>
            )}

            <button type="button" className="store-cart-btn" onClick={() => setCartOpen(true)}>
              <span>🛍 Bag</span>
              {cartCount > 0 && <span className="store-cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="store-hero">
        <div className="store-hero-watermark">{activeBanner.watermark || "KASHVI"}</div>
        <div className="store-hero-left">
          <span className="store-eyebrow">{activeBanner.tagline}</span>
          <h1>
            {activeBanner.mainTitle?.split("\n").map((line, i) => (
              <React.Fragment key={i}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </h1>
          <p>{activeBanner.desc}</p>
          <button
            type="button"
            className="store-cta-btn"
            onClick={() => document.getElementById("store-catalogue")?.scrollIntoView({ behavior: "smooth" })}
          >
            {activeBanner.ctaText}
          </button>
        </div>

        <div className="store-hero-right">
          <span>{activeBanner.sideBadge}</span>
          <strong>
            {activeBanner.sideTitle?.split("\n").map((line, i) => (
              <React.Fragment key={i}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </strong>
        </div>

        {activeBanners.length > 1 && (
          <div className="store-slider-dots">
            {activeBanners.map((_, i) => (
              <button
                type="button"
                key={i}
                className={`store-dot ${i === currentSlide ? "active" : ""}`}
                onClick={() => setCurrentSlide(i)}
              />
            ))}
          </div>
        )}
      </section>

      {/* CATALOGUE TOOLBAR */}
      <section id="store-catalogue" className="store-catalogue-wrap">
        <div className="store-toolbar">
          <div className="store-search-box">
            <span>⌕</span>
            <input
              placeholder="Search styles, fabrics, codes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button type="button" onClick={() => setSearch("")}>×</button>}
          </div>

            <div className="store-pills-scroll">
            <button
              type="button"
              className={`store-pill-btn ${category === "All" ? "active" : ""}`}
              onClick={() => setCategory("All")}
            >
              All
            </button>
            {(
              categories && categories.length > 0
                ? categories.map(c => (typeof c === "string" ? { id: c, name: c } : c)).filter(c => c.active !== false && Boolean(c.name))
                : Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(name => ({ id: name, name }))
            ).map(c => (
              <button
                type="button"
                key={c.id || c.name}
                className={`store-pill-btn ${category === c.name ? "active" : ""}`}
                onClick={() => setCategory(c.name)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* PRODUCTS GRID */}
        <div className="store-product-grid">
          {filtered.map(product => {
            const rawSelling = Number(product.sellingPrice || product.selling_price || 0);
            const rawMrp = Number(product.mrp || 0);
            const price = rawSelling > 0 ? rawSelling : (rawMrp > 0 ? rawMrp : 0);
            const mrp = rawMrp > price ? rawMrp : 0;
            const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
            
            const rawList = Array.isArray(product.images) && product.images.length > 0 
              ? product.images 
              : (product.image ? [product.image] : []);
            
            const firstImg = typeof rawList[0] === "object" ? rawList[0]?.url : rawList[0];

            return (
              <article className="store-card" key={product.id}>
                <div className="store-card-img" onClick={() => setSelectedProduct(product)}>
                  {firstImg ? (
                    <img 
                      src={firstImg} 
                      alt={product.name} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&q=80";
                      }} 
                    />
                  ) : "KF"}
                  {discount > 0 && <span className="store-discount-tag">{discount}% OFF</span>}
                  {rawList.length > 1 && <span className="store-multi-photo-pill">+{rawList.length} Photos</span>}
                </div>

                <div className="store-card-info">
                  <small>{product.category}</small>
                  <h3>{product.name}</h3>
                  <div className="store-price-row">
                    <strong>{money(price)}</strong>
                    {mrp > price && <del>{money(mrp)}</del>}
                  </div>
                  <button type="button" className="store-add-btn" onClick={() => setSelectedProduct(product)}>
                    Quick Select
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* VALUE HIGHLIGHTS - 2x2 ON MOBILE & 4-COL ON DESKTOP */}
      <section className="store-trust-banner">
        <div className="trust-item">
          <span className="trust-icon">✓</span>
          <span className="trust-text">Certified Fabrics</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">₹</span>
          <span className="trust-text">Instant UPI QR</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">📮</span>
          <span className="trust-text">India Post Dispatch</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">♡</span>
          <span className="trust-text">Helpline Support</span>
        </div>
      </section>

      {/* MINIMAL FOOTER WITH DYNAMIC ADMIN-LINKED SOCIAL ICONS */}
      <footer className="store-footer">
        <div className="store-footer-inner">
          <strong className="store-footer-brand">{settings?.storeName?.toUpperCase() || "KASHVI FASHIONS"}</strong>
          <p className="store-footer-desc">Redefining daily lifestyle essentials with unmatched precision and silhouette comfort.</p>
          
          {/* DYNAMIC ICON-ONLY SOCIAL LINKS */}
          <div className="store-footer-social-icons">
            {/* WhatsApp */}
            {settings?.whatsappNo && (
              <a 
                href={`https://wa.me/91${String(settings.whatsappNo).replace(/[^0-9]/g, "")}`} 
                target="_blank" 
                rel="noreferrer"
                className="store-social-icon-btn wa"
                title="Chat on WhatsApp"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.062-2.115-.527-1.745-.724-2.87-2.502-2.96-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.044c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.392-10.416c-5.514 0-10 4.486-10 10 0 1.932.551 3.737 1.506 5.267l-1.545 5.64 5.801-1.521c1.477.854 3.197 1.334 5.038 1.334 5.514 0 10-4.486 10-10s-4.486-10-10-10z"/>
                </svg>
              </a>
            )}

            {/* Instagram */}
            {settings?.instagramUrl && (
              <a 
                href={settings.instagramUrl} 
                target="_blank" 
                rel="noreferrer"
                className="store-social-icon-btn insta"
                title="Follow on Instagram"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            )}

            {/* Facebook */}
            {settings?.facebookUrl && (
              <a 
                href={settings.facebookUrl} 
                target="_blank" 
                rel="noreferrer"
                className="store-social-icon-btn fb"
                title="Like on Facebook"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.688 5H18V0h-3.808C10.595 0 9 1.582 9 4.615V8z"/>
                </svg>
              </a>
            )}

            {/* YouTube */}
            {settings?.youtubeUrl && (
              <a 
                href={settings.youtubeUrl} 
                target="_blank" 
                rel="noreferrer"
                className="store-social-icon-btn yt"
                title="Subscribe on YouTube"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
              </a>
            )}
          </div>

          <div className="store-footer-bottom">
            <small>© {new Date().getFullYear()} {settings?.storeName || "Kashvi Fashions"}. All rights reserved.</small>
          </div>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="store-mobile-bottom-bar">
        <button type="button" className="store-mobile-nav-item" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span>⌂</span><small>Home</small>
        </button>
        <button type="button" className="store-mobile-nav-item" onClick={() => document.getElementById("store-catalogue")?.scrollIntoView({ behavior: "smooth" })}>
          <span>▦</span><small>Shop</small>
        </button>
        <button type="button" className="store-mobile-nav-item" onClick={() => {
          if (!customer) { setAuthError(""); setAccountMode("login"); setAccountOpen(true); }
          else { setMyOrdersModal(true); }
        }}>
          <span>📦</span><small>{customer ? "My Orders" : "Sign In"}</small>
        </button>
        <button type="button" className="store-mobile-nav-item mobile-cart-highlight" onClick={() => setCartOpen(true)}>
          <div style={{ position: "relative" }}>
            <span>🛍</span>{cartCount > 0 && <span className="mobile-nav-badge">{cartCount}</span>}
          </div>
          <small>Bag</small>
        </button>
      </div>

      {/* AUTH MODAL */}
      {accountOpen && (
        <div className="store-overlay" onClick={() => setAccountOpen(false)}>
          <div className="store-auth-modal-card" onClick={e => e.stopPropagation()}>
            <div className="store-drawer-head">
              <div>
                <span>CUSTOMER ACCESS</span>
                <h2>
                  {accountMode === "forgot"
                    ? "Reset Password"
                    : accountMode === "verify"
                    ? "Verify Your Email"
                    : accountMode === "register"
                    ? "Create Account"
                    : "Sign In Required"}
                </h2>
              </div>
              <button type="button" onClick={() => setAccountOpen(false)}>×</button>
            </div>

            <div className="store-auth-modal-body">
              {authError && (
                <div style={{ background: "#fee2e2", border: "1.5px solid #ef4444", color: "#991b1b", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", lineHeight: "1.4", marginBottom: "14px" }}>
                  ⚠️ {authError}
                </div>
              )}

              {/* 1. SIGN IN */}
              {accountMode === "login" && (
                <form onSubmit={handleCustomerLogin} className="store-auth-form">
                  <p style={{ fontSize: "13px", color: "var(--store-text-muted)", margin: "0 0 10px" }}>
                    Please sign in with your registered account to proceed with checkout and manage orders.
                  </p>
                  <label className="store-field">
                    Email Address *
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={loginForm.identifier}
                      onChange={e => { setAuthError(""); setLoginForm({ ...loginForm, identifier: e.target.value }); }}
                    />
                  </label>
                  <label className="store-field">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Password *</span>
                      <button
                        type="button"
                        className="store-forgot-link"
                        onClick={() => { setAuthError(""); setForgotEmail(loginForm.identifier); setAccountMode("forgot"); }}
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={e => { setAuthError(""); setLoginForm({ ...loginForm, password: e.target.value }); }}
                        style={{ width: "100%", paddingRight: "40px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(v => !v)}
                        style={{ position: "absolute", right: "10px", background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--store-text-muted)" }}
                      >
                        {showLoginPassword ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                  </label>
                  <button type="submit" className="store-primary-btn full" disabled={authLoading}>
                    {authLoading ? "Signing In..." : "Sign In & Proceed"}
                  </button>
                  <div className="store-auth-switch" style={{ marginTop: "14px" }}>
                    <span>New customer?</span>
                    <button type="button" className="store-auth-text-btn" onClick={() => { setAuthError(""); setAccountMode("register"); }}>Create Profile →</button>
                  </div>
                </form>
              )}

              {/* 2. REGISTRATION */}
              {accountMode === "register" && (
                <form onSubmit={handleCustomerRegister} className="store-auth-form" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <label className="store-field">
                    Full Name *
                    <input
                      type="text"
                      required
                      placeholder="Abhilash"
                      value={regForm.name}
                      onChange={e => { setAuthError(""); setRegForm({ ...regForm, name: e.target.value }); }}
                    />
                  </label>

                  <label className="store-field">
                    Email Address *
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={regForm.email}
                      onChange={e => { setAuthError(""); setRegForm({ ...regForm, email: e.target.value }); }}
                    />
                  </label>

                  <label className="store-field">
                    WhatsApp Mobile Number *
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={regForm.mobile}
                      onChange={e => { setAuthError(""); setRegForm({ ...regForm, mobile: e.target.value }); }}
                    />
                    <small style={{ fontSize: "11px", color: "var(--store-text-muted)", marginTop: "2px" }}>
                      We'll use this number to send order status and dispatch updates directly on WhatsApp.
                    </small>
                  </label>

                  <label className="store-field">
                    Password *
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        type={showRegPassword ? "text" : "password"}
                        required
                        placeholder="At least 6 characters"
                        value={regForm.password}
                        onChange={e => { setAuthError(""); setRegForm({ ...regForm, password: e.target.value }); }}
                        style={{ width: "100%", paddingRight: "40px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(v => !v)}
                        style={{ position: "absolute", right: "10px", background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--store-text-muted)" }}
                      >
                        {showRegPassword ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                  </label>

                  <button type="submit" className="store-primary-btn full" disabled={authLoading} style={{ marginTop: "6px" }}>
                    {authLoading ? "Creating Account..." : "Create Account"}
                  </button>

                  <div className="store-auth-switch" style={{ marginTop: "10px", textAlign: "center" }}>
                    <span>Already have an account?</span>
                    <button type="button" className="store-auth-text-btn" onClick={() => { setAuthError(""); setAccountMode("login"); }} style={{ marginLeft: "6px" }}>
                      Sign In →
                    </button>
                  </div>
                </form>
              )}

              {/* 3. OTP VERIFICATION */}
              {accountMode === "verify" && (
                <form onSubmit={handleVerifyOtp} className="store-auth-form" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: 0 }}>
                  <div style={{ textAlign: "center", marginBottom: "4px" }}>
                    <p style={{ fontSize: "13.5px", color: "var(--store-text-muted)", lineHeight: "1.5", margin: 0 }}>
                      We sent a secure 6-digit verification code to:
                    </p>
                    <strong style={{ fontSize: "14.5px", color: "var(--store-primary)", display: "block", marginTop: "6px" }}>
                      {verificationEmail}
                    </strong>
                  </div>

                  <label className="store-field" style={{ textAlign: "center" }}>
                    Verification Code *
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="123456"
                      value={otpCode}
                      onChange={e => { setAuthError(""); setOtpCode(e.target.value); }}
                      style={{ textAlign: "center", letterSpacing: "6px", fontSize: "18px", fontWeight: "700", padding: "12px", color: "var(--store-primary)" }}
                    />
                  </label>

                  <button type="submit" className="store-primary-btn full" disabled={authLoading} style={{ marginTop: "4px" }}>
                    {authLoading ? "Verifying..." : "Verify & Complete"}
                  </button>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "13px" }}>
                    <button type="button" className="store-auth-text-btn" onClick={handleResendOtp}>Resend Code</button>
                    <button type="button" className="store-auth-text-btn" onClick={() => { setAuthError(""); setAccountMode("register"); }} style={{ color: "var(--store-text-muted)" }}>
                      ← Change Email
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MY ORDERS DASHBOARD */}
      {myOrdersModal && (
        <div className="store-overlay" onClick={() => setMyOrdersModal(false)}>
          <div className="store-checkout-modal" style={{ maxWidth: "780px", padding: "24px" }} onClick={e => e.stopPropagation()}>
            <div className="store-drawer-head" style={{ padding: "0 0 16px 0", borderBottom: "1px solid var(--store-border)", marginBottom: "20px" }}>
              <div>
                <span>CUSTOMER PORTAL</span>
                <h2>My Orders & Consignments ({myOrdersList.length})</h2>
              </div>
              <button type="button" onClick={() => setMyOrdersModal(false)}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "68vh", overflowY: "auto", paddingRight: "4px" }}>
              {!myOrdersList.length ? (
                <div className="store-empty-notice" style={{ padding: "40px 0" }}>
                  <h3>No orders placed yet</h3>
                  <p>Your purchases, live India Post tracking, and stage updates will appear here.</p>
                </div>
              ) : (
                myOrdersList.map(ord => (
                  <div
                    key={ord.id}
                    style={{
                      background: "#ffffff",
                      border: "1.5px solid var(--store-border)",
                      borderRadius: "12px",
                      padding: "18px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "gap", gap: "8px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <strong style={{ fontSize: "16px", fontFamily: "monospace", color: "var(--store-primary)" }}>
                            #{ord.id}
                          </strong>
                          <span className={`store-status-badge ${statusTone(ord.status)}`}>
                            {statuses[ord.status] || ord.status}
                          </span>
                        </div>
                        <small style={{ color: "var(--store-text-muted)", fontSize: "12px", display: "block", marginTop: "3px" }}>
                          Placed on: {new Date(ord.created_at || ord.createdAt || Date.now()).toLocaleDateString("en-IN", { dateStyle: "long", timeStyle: "short" })}
                        </small>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--store-text-muted)", display: "block" }}>TOTAL BILL</span>
                        <strong style={{ fontSize: "18px", color: "var(--store-primary)" }}>{money(ord.total)}</strong>
                      </div>
                    </div>

                    <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 14px", border: "1px solid var(--store-border)" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--store-text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                        Purchased Items ({ord.items?.length || 0}) · {ord.total_weight || ord.totalWeight || 0} g
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {(ord.items || []).map((item, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                            <span>
                              <b>{item.name}</b> <span style={{ color: "var(--store-primary)", fontWeight: "600" }}>[{item.size} · {item.colour || "Standard"}]</span> × {item.qty}
                            </span>
                            <strong>{money(item.price * item.qty)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px" }}>
                      <div style={{ fontSize: "12px", color: "var(--store-text-muted)" }}>
                        {ord.shipping?.trackingId ? (
                          <span>📮 Speed Post Article: <b style={{ color: "#0284c7" }}>{ord.shipping.trackingId}</b></span>
                        ) : (
                          <span>Payment: <b>Prepaid UPI</b></span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="store-primary-btn"
                        style={{ padding: "8px 16px", fontSize: "12.5px" }}
                        onClick={() => {
                          setMyOrdersModal(false);
                          setInspectCustomerOrder(ord);
                        }}
                      >
                        View Full Details & Tracking →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* INSPECT ORDER FULL VIEW & TRACKING MODAL */}
      {inspectCustomerOrder && (
        <div className="store-overlay" onClick={() => setInspectCustomerOrder(null)}>
          <div className="store-checkout-modal" style={{ maxWidth: "660px", padding: "26px" }} onClick={e => e.stopPropagation()}>
            <div className="store-drawer-head" style={{ padding: "0 0 16px 0", borderBottom: "1px solid var(--store-border)", marginBottom: "18px" }}>
              <div>
                <span>CONSIGNMENT STATUS</span>
                <h2>Order #{inspectCustomerOrder.id}</h2>
              </div>
              <button type="button" onClick={() => setInspectCustomerOrder(null)}>×</button>
            </div>

            <div className="store-customer-stepper">
              <div className={`step-dot-box ${["payment_verification", "stock_check", "payment_received", "packing", "shipped", "delivered"].includes(inspectCustomerOrder.status) ? "active" : ""}`}>
                <span>1</span><small>Claimed</small>
              </div>
              <div className="step-bar" />
              <div className={`step-dot-box ${["stock_check", "payment_received", "packing", "shipped", "delivered"].includes(inspectCustomerOrder.status) ? "active" : ""}`}>
                <span>2</span><small>Verified</small>
              </div>
              <div className="step-bar" />
              <div className={`step-dot-box ${["packing", "shipped", "delivered"].includes(inspectCustomerOrder.status) ? "active" : ""}`}>
                <span>3</span><small>Packed</small>
              </div>
              <div className="step-bar" />
              <div className={`step-dot-box ${["shipped", "delivered"].includes(inspectCustomerOrder.status) ? "active" : ""}`}>
                <span>4</span><small>Dispatched</small>
              </div>
              <div className="step-bar" />
              <div className={`step-dot-box ${inspectCustomerOrder.status === "delivered" ? "active" : ""}`}>
                <span>5</span><small>Delivered</small>
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: "8px", border: "1px solid var(--store-border)", margin: "16px 0" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--store-text-muted)" }}>CURRENT FULFILMENT STAGE</span>
              <h3 style={{ margin: "4px 0 0", color: "var(--store-primary)", fontSize: "16px" }}>
                {statuses[inspectCustomerOrder.status] || inspectCustomerOrder.status}
              </h3>
              {inspectCustomerOrder.shipping?.trackingId && (
                <p style={{ margin: "8px 0 0", fontSize: "13px" }}>
                  Carrier: <b>{inspectCustomerOrder.shipping.courier || "India Post"}</b> | Article No: <strong>{inspectCustomerOrder.shipping.trackingId}</strong>
                </p>
              )}
            </div>

            <h4 style={{ fontSize: "14px", marginBottom: "10px" }}>Ordered Items</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(inspectCustomerOrder.items || []).map((it, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "8px 12px", background: "#ffffff", borderRadius: "6px", border: "1px solid var(--store-border)" }}>
                  <span><b>{it.name}</b> [{it.size} · {it.colour || "Standard"}] × {it.qty}</span>
                  <strong>{money(it.price * it.qty)}</strong>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="store-secondary-btn" onClick={() => { setInspectCustomerOrder(null); setMyOrdersModal(true); }}>
                ← Back to My Orders
              </button>
              <button type="button" className="store-primary-btn" onClick={() => setInspectCustomerOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVED ADDRESSES STORAGE MODAL */}
      {addressesModal && (
        <div className="store-overlay" onClick={() => setAddressesModal(false)}>
          <div className="store-checkout-modal" style={{ maxWidth: "680px", padding: "24px" }} onClick={e => e.stopPropagation()}>
            <div className="store-drawer-head" style={{ padding: "0 0 14px 0", borderBottom: "1px solid var(--store-border)", marginBottom: "18px" }}>
              <div>
                <span>ADDRESS STORAGE</span>
                <h2>Manage Saved Delivery Addresses</h2>
              </div>
              <button type="button" onClick={() => setAddressesModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveAddress} style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid var(--store-border)", marginBottom: "18px" }}>
              <strong style={{ fontSize: "13.5px", color: "var(--store-primary)", display: "block", marginBottom: "10px" }}>
                + Add New Shipping Address
              </strong>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <input
                  placeholder="Recipient Name *"
                  required
                  value={newAddressForm.name}
                  onChange={e => setNewAddressForm({ ...newAddressForm, name: e.target.value })}
                  style={{ padding: "9px 12px", borderRadius: "6px", border: "1px solid var(--store-border)", fontSize: "13px" }}
                />
                <input
                  placeholder="10-digit WhatsApp Mobile *"
                  required
                  value={newAddressForm.phone}
                  onChange={e => setNewAddressForm({ ...newAddressForm, phone: e.target.value })}
                  style={{ padding: "9px 12px", borderRadius: "6px", border: "1px solid var(--store-border)", fontSize: "13px" }}
                />
                <input
                  placeholder="Door No, Street, Landmark *"
                  required
                  style={{ gridColumn: "1 / -1", padding: "9px 12px", borderRadius: "6px", border: "1px solid var(--store-border)", fontSize: "13px" }}
                  value={newAddressForm.address}
                  onChange={e => setNewAddressForm({ ...newAddressForm, address: e.target.value })}
                />
                <input
                  placeholder="6-digit Pincode *"
                  maxLength={6}
                  required
                  value={newAddressForm.pincode}
                  onChange={e => setNewAddressForm({ ...newAddressForm, pincode: e.target.value })}
                  style={{ padding: "9px 12px", borderRadius: "6px", border: "1px solid var(--store-border)", fontSize: "13px" }}
                />
                <button type="submit" className="store-primary-btn" style={{ padding: "9px 12px", fontSize: "13px" }}>
                  Save Address
                </button>
              </div>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "40vh", overflowY: "auto" }}>
              {!savedAddresses.length ? (
                <p style={{ color: "var(--store-text-muted)", fontSize: "13px", textAlign: "center", margin: "20px 0" }}>
                  No saved addresses found. Add your primary shipping address above.
                </p>
              ) : (
                savedAddresses.map((addr, idx) => (
                  <div key={idx} style={{ padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--store-border)", background: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: "14px" }}>{addr.name}</strong> <small style={{ color: "var(--store-text-muted)" }}>({addr.phone})</small>
                      <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#475569" }}>
                        {addr.address}, {addr.city}, {addr.state} - <b>{addr.pincode}</b>
                      </p>
                    </div>
                    <button
                      type="button"
                      className="store-secondary-btn"
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                      onClick={() => {
                        setForm({
                          name: addr.name,
                          phone: addr.phone,
                          address: addr.address,
                          pincode: addr.pincode,
                          email: form.email || customer?.email
                        });
                        notify("Address selected for active delivery!");
                        setAddressesModal(false);
                      }}
                    >
                      Use for Order
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROFILE SETTINGS MODAL */}
      {profileModal && (
        <div className="store-overlay" onClick={() => setProfileModal(false)}>
          <div className="store-checkout-modal" style={{ maxWidth: "480px", padding: "24px" }} onClick={e => e.stopPropagation()}>
            <div className="store-drawer-head" style={{ padding: "0 0 14px 0", borderBottom: "1px solid var(--store-border)", marginBottom: "18px" }}>
              <div>
                <span>PROFILE SETTINGS</span>
                <h2>Update Account Details</h2>
              </div>
              <button type="button" onClick={() => setProfileModal(false)}>×</button>
            </div>

            <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label className="store-field">
                Registered Email Address
                <input value={customer?.email} disabled style={{ background: "#f1f5f9", cursor: "not-allowed" }} />
              </label>

              <label className="store-field">
                Full Name *
                <input
                  required
                  value={profileForm.name}
                  onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                />
              </label>

              <label className="store-field">
                WhatsApp Phone Number
                <input
                  value={profileForm.phone}
                  onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="store-secondary-btn" onClick={() => setProfileModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="store-primary-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {cartOpen && (
        <div className="store-overlay" onClick={() => setCartOpen(false)}>
          <aside className="store-cart-drawer" onClick={e => e.stopPropagation()}>
            <div className="store-drawer-head">
              <div><span>SHOPPING BAG</span><h2>Your Cart ({cartCount})</h2></div>
              <button type="button" onClick={() => setCartOpen(false)}>×</button>
            </div>

            <div className="store-drawer-items">
              {!cart.length && <div className="store-empty-notice"><h3>Your bag is empty</h3></div>}
              {cart.map((item, index) => (
                <div className="store-cart-item" key={`${item.productId}-${item.size}-${item.colour}-${index}`}>
                  <div className="store-cart-item-img">{item.image ? <img src={item.image} alt="" /> : "KF"}</div>
                  <div style={{ flex: 1 }}>
                    <strong>{item.name}</strong>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", margin: "3px 0 6px" }}>
                      <span className="store-variant-tag">{item.size}</span>
                      {item.colour && <span className="store-variant-tag colour">{item.colour}</span>}
                    </div>
                    <b style={{ fontSize: "14px" }}>{money(item.price)}</b>
                    <div className="store-qty-controls">
                      <button type="button" onClick={() => changeQty(index, -1)}>−</button>
                      <span>{item.qty}</span>
                      <button type="button" onClick={() => changeQty(index, 1)}>+</button>
                      <button type="button" className="store-remove-btn" onClick={() => removeItem(index)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="store-drawer-bottom">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                  <span>Bag Subtotal</span><strong style={{ fontSize: "19px" }}>{money(subtotal)}</strong>
                </div>
                <button type="button" className="store-primary-btn full" onClick={() => {
                  if (!customer) {
                    setCartOpen(false);
                    setAccountMode("login");
                    setAccountOpen(true);
                    notify("Please sign in to proceed with checkout");
                    return;
                  }
                  setCartOpen(false);
                  setCheckoutOpen(true);
                }}>
                  Proceed to Secure Checkout →
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {checkoutOpen && (
        <div className="store-overlay" onClick={() => { if (!paymentSubmitted) { setCheckoutOpen(false); setPaymentStep(false); } }}>
          <div className="store-checkout-modal" onClick={e => e.stopPropagation()}>
            <div className="store-drawer-head">
              <div>
                <span>KASHVI CHECKOUT</span>
                <h2>{paymentSubmitted ? "Order Confirmation" : paymentStep ? "Instant UPI Settlement" : "Delivery Coordinates"}</h2>
              </div>
              <button type="button" onClick={() => { setCheckoutOpen(false); setPaymentStep(false); setPaymentSubmitted(false); }}>×</button>
            </div>

            {paymentSubmitted ? (
              <div className="store-payment-success">
                <div className="store-success-icon">✓</div>
                <span className="store-eyebrow">ORDER SUBMITTED</span>
                <h2>Thank you for your purchase!</h2>
                <p>Your order is placed successfully. You can track its status anytime under <b>My Orders</b>.</p>
                <div className="store-submitted-id">
                  <span>ORDER IDENTIFIER</span><strong>#{submittedOrderId}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                  <button type="button" className="store-secondary-btn" onClick={() => { setCheckoutOpen(false); setPaymentSubmitted(false); setMyOrdersModal(true); }}>
                    View My Orders
                  </button>
                  <button type="button" className="store-primary-btn" onClick={() => { setCheckoutOpen(false); setPaymentSubmitted(false); }}>
                    Continue Browsing
                  </button>
                </div>
              </div>
            ) : !paymentStep ? (
              <div className="store-checkout-grid">
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h3 style={{ fontSize: "15px", margin: 0 }}>Contact & Address Details</h3>
                    {savedAddresses.length > 0 && (
                      <button
                        type="button"
                        className="store-auth-text-btn"
                        style={{ fontSize: "12px", fontWeight: "700" }}
                        onClick={() => setAddressesModal(true)}
                      >
                        📍 Use Saved Address
                      </button>
                    )}
                  </div>

                  <div className="store-checkout-fields">
                    <label className="store-field">
                      Full Name *
                      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Recipient name" />
                    </label>
                    <label className="store-field">
                      Email Address *
                      <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="For order updates" />
                    </label>
                    <label className="store-field" style={{ gridColumn: "1 / -1" }}>
                      Mobile Number *
                      <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile" />
                    </label>
                    <label className="store-field" style={{ gridColumn: "1 / -1" }}>
                      Street Address, Flat, House No. *
                      <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Complete postal address" />
                    </label>
                    <label className="store-field" style={{ gridColumn: "1 / -1" }}>
                      Destination Pincode *
                      <input value={form.pincode} maxLength={6} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="6-digit pincode" />
                    </label>
                  </div>

                  {pincodeLoading ? (
                    <div style={{ fontSize: "12.5px", color: "var(--store-primary)", marginTop: "8px" }}>Verifying pincode...</div>
                  ) : liveDestination ? (
                    <div className="store-destination-card">
                      <small>SERVICEABLE DESTINATION</small>
                      <strong>{liveDestination.city || "Local Area"}, {liveDestination.district || ""}</strong>
                      <span>{liveDestination.state || ""} · Zone: {zone}</span>
                    </div>
                  ) : pincodeError ? (
                    <p className="store-error-text">Entered pincode not found in delivery registry.</p>
                  ) : null}
                </div>

                <div className="store-summary-card">
                  <h3 style={{ fontSize: "15px", marginBottom: "12px" }}>Order Summary</h3>
                  {cart.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                      <span>{item.name} <small style={{ color: "var(--store-primary)", fontWeight: 700 }}>[{item.size} · {item.colour || "Standard"}] x{item.qty}</small></span>
                      <strong>{money(item.price * item.qty)}</strong>
                    </div>
                  ))}
                  <hr style={{ margin: "12px 0", borderColor: "var(--store-border)" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "6px" }}>
                    <span>Consignment Weight</span><strong>{totalWeight} g</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "6px" }}>
                    <span>Delivery Charge</span><strong>{liveDestination ? money(shipping) : "—"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 800, marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--store-border)" }}>
                    <span>Grand Total</span><strong>{liveDestination ? money(total) : "—"}</strong>
                  </div>
                  <button type="button" className="store-primary-btn full" style={{ marginTop: "16px" }} onClick={startPayment}>
                    Proceed to UPI Payment · {liveDestination ? money(total) : "—"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="store-responsive-payment-view">
                <div className="store-pay-header-bar">
                  <div><span>TOTAL PAYABLE AMOUNT</span><h3>{money(total)}</h3></div>
                  <div className="store-secure-shield">🔒 100% Secure UPI</div>
                </div>

                <div className="store-mobile-app-picker">
                  <span className="picker-title">⚡ PAY INSTANTLY VIA INSTALLED APP</span>
                  <div className="store-app-buttons-grid">
                    <button type="button" className="store-app-launch-btn gpay-btn" onClick={() => launchUpiApp(gpayLink)}>
                      <span className="app-icon">G</span><b>Google Pay</b>
                    </button>
                    <button type="button" className="store-app-launch-btn phonepe-btn" onClick={() => launchUpiApp(phonepeLink)}>
                      <span className="app-icon">पे</span><b>PhonePe</b>
                    </button>
                    <button type="button" className="store-app-launch-btn paytm-btn" onClick={() => launchUpiApp(paytmLink)}>
                      <span className="app-icon">₹</span><b>Paytm</b>
                    </button>
                    <button type="button" className="store-app-launch-btn any-upi-btn" onClick={() => launchUpiApp(upiLink)}>
                      <span className="app-icon">✦</span><b>Other UPI</b>
                    </button>
                  </div>
                </div>

                <div className="store-desktop-qr-container">
                  <div className="store-qr-wrapper">
                    <img src={qrUrl} alt="UPI QR Code" />
                    <small>Scan using phone scanner or banking app</small>
                  </div>
                  <div className="store-vpa-copy-card">
                    <div><small>MERCHANT UPI VPA</small><strong>{settings.upiId || "kashvifashions@upi"}</strong></div>
                    <button type="button" className="store-copy-pill" onClick={() => { navigator.clipboard.writeText(settings.upiId); notify("UPI ID copied!"); }}>Copy VPA</button>
                  </div>
                </div>

                <div className="store-payment-completion-bar">
                  <p>Completed your payment? Tap below to finish order.</p>
                  <button type="button" className="store-primary-btn full pulse" onClick={placeOrder}>
                    ✓ I HAVE COMPLETED PAYMENT
                  </button>
                  <button type="button" className="store-text-button-subtle" onClick={() => setPaymentStep(false)}>
                    ← Back to Address Details
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK VIEW */}
      {selectedProduct && (
        <ProductQuickViewModal
          product={selectedProduct}
          onAddItems={addItemsToCart}
          onEnlarge={imgUrl => setEnlargedImage(imgUrl)}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* LIGHTBOX */}
      {enlargedImage && (
        <div className="store-lightbox-overlay" onClick={() => setEnlargedImage(null)}>
          <button type="button" className="store-lightbox-close" onClick={() => setEnlargedImage(null)}>×</button>
          <div className="store-lightbox-card" onClick={e => e.stopPropagation()}>
            <img src={enlargedImage} alt="Enlarged" />
          </div>
        </div>
      )}
    </div>
  );
}

function ProductQuickViewModal({ product, onAddItems, onEnlarge, onClose }) {
  const rawList = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : (product.image ? [product.image] : []);

  const imageObjects = rawList.map(item => {
    if (typeof item === "string") return { url: item, colour: "" };
    return { url: item.url || "", colour: item.colour || "" };
  }).filter(item => Boolean(item.url));

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [currentSize, setCurrentSize] = useState(product.sizes?.[0] || "Standard");
  const [currentColour, setCurrentColour] = useState(product.colours?.[0] || "Standard");
  const [currentQty, setCurrentQty] = useState(1);
  const [stagedVariants, setStagedVariants] = useState([]);

  const handleSelectColour = chosenColour => {
    setCurrentColour(chosenColour);
    const matchedIndex = imageObjects.findIndex(img => img.colour && img.colour.toLowerCase() === chosenColour.toLowerCase());
    if (matchedIndex >= 0) setActiveImgIndex(matchedIndex);
  };

  const currentImg = imageObjects[activeImgIndex]?.url || "";
  const sp = Number(product.sellingPrice || product.selling_price || 0);
  const mp = Number(product.mrp || 0);
  const price = sp > 0 ? sp : (mp > 0 ? mp : 0);
  const mrp = mp > price ? mp : 0;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const handleAddCombination = () => {
    const matchedImg = imageObjects.find(img => img.colour && img.colour.toLowerCase() === currentColour.toLowerCase())?.url || currentImg || (imageObjects[0]?.url || "");
    const newComb = { size: currentSize, colour: currentColour, qty: currentQty, image: matchedImg };
    setStagedVariants(prev => {
      const idx = prev.findIndex(item => item.size === newComb.size && item.colour === newComb.colour);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + newComb.qty };
        return updated;
      }
      return [...prev, newComb];
    });
    setCurrentQty(1);
  };

  const handleRemoveStaged = index => setStagedVariants(list => list.filter((_, i) => i !== index));
  const handleUpdateStagedQty = (index, delta) => setStagedVariants(list => list.map((item, i) => (i === index ? { ...item, qty: Math.max(1, item.qty + delta) } : item)));

  const getCompiledItems = () => {
    if (stagedVariants.length > 0) {
      return stagedVariants.map(v => ({
        productId: product.id,
        name: product.name,
        price: price,
        qty: v.qty,
        size: v.size,
        colour: v.colour,
        productWeight: Number(product.weight || 0),
        weightUnit: product.weight_unit || product.weightUnit || "grams",
        image: v.image
      }));
    }
    return [{
      productId: product.id,
      name: product.name,
      price: price,
      qty: currentQty,
      size: currentSize,
      colour: currentColour,
      productWeight: Number(product.weight || 0),
      weightUnit: product.weight_unit || product.weightUnit || "grams",
      image: currentImg
    }];
  };

  const totalStagedQty = stagedVariants.reduce((sum, v) => sum + v.qty, 0);
  const totalItemCount = totalStagedQty > 0 ? totalStagedQty : currentQty;
  const totalStagedPrice = totalItemCount * price;

  return (
    <div className="store-overlay" onClick={onClose}>
      <div className="store-quick-view-card" onClick={e => e.stopPropagation()}>
        <button type="button" className="store-quick-close" onClick={onClose}>×</button>
        <div className="store-quick-gallery-col">
          <div className="store-quick-img-main" onClick={() => currentImg && onEnlarge(currentImg)} style={{ cursor: "pointer" }}>
            {currentImg ? (
              <>
                <img 
                  src={currentImg} 
                  alt="" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&q=80";
                  }}
                />
                <span className="store-zoom-hint">🔍 Tap to Expand</span>
              </>
            ) : "KF"}
            {discount > 0 && <span className="store-discount-tag">{discount}% OFF</span>}
          </div>

          {imageObjects.length > 1 && (
            <div className="store-quick-thumb-strip">
              {imageObjects.map((imgObj, idx) => (
                <div key={idx} className={`store-quick-thumb-box ${idx === activeImgIndex ? "active" : ""}`} onClick={() => { setActiveImgIndex(idx); if (imgObj.colour) setCurrentColour(imgObj.colour); }}>
                  <img src={imgObj.url} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="store-quick-details">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <small className="store-eyebrow">{product.category}</small>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534", background: "#dcfce7", padding: "2px 8px", borderRadius: "99px" }}>
              ✓ In Stock
            </span>
          </div>
          <h2>{product.name}</h2>
          
          <div className="store-price-row" style={{ margin: "6px 0 10px", alignItems: "baseline" }}>
            <strong style={{ fontSize: "24px" }}>{money(price)}</strong>
            {mrp > price && <del style={{ color: "var(--store-text-muted)", fontSize: "15px", marginLeft: "4px" }}>{money(mrp)}</del>}
            {discount > 0 && <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#166534", background: "#dcfce7", padding: "2px 8px", borderRadius: "99px", marginLeft: "4px" }}>Save {discount}%</span>}
          </div>

          {product.description && (
            <p style={{ fontSize: "13px", color: "var(--store-text-muted)", lineHeight: "1.5", margin: "0 0 12px" }}>
              {product.description}
            </p>
          )}

          <div className="store-variant-builder-box">
            {product.sizes?.length > 0 && (
              <div style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <small style={{ fontSize: "11px", fontWeight: 700, color: "var(--store-text-muted)" }}>Size: <b>{currentSize}</b></small>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {product.sizes.map(sz => (
                    <button type="button" key={sz} className={`store-chip-btn mini ${currentSize === sz ? "active" : ""}`} onClick={() => setCurrentSize(sz)}>{sz}</button>
                  ))}
                </div>
              </div>
            )}

            {product.colours?.length > 0 && (
              <div style={{ marginBottom: "10px" }}>
                <small style={{ fontSize: "11px", fontWeight: 700, color: "var(--store-text-muted)", display: "block", marginBottom: "4px" }}>Colour: <b>{currentColour}</b></small>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {product.colours.map(clr => (
                    <button type="button" key={clr} className={`store-chip-btn mini ${currentColour === clr ? "active" : ""}`} onClick={() => handleSelectColour(clr)}>{clr}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
              <div className="store-qty-controls">
                <button type="button" onClick={() => setCurrentQty(v => Math.max(1, v - 1))}>−</button>
                <span>{currentQty}</span>
                <button type="button" onClick={() => setCurrentQty(v => v + 1)}>+</button>
              </div>
              <button type="button" className="store-secondary-btn" style={{ flex: 1, padding: "8px 14px", fontSize: "12px", borderColor: "var(--store-primary)", color: "var(--store-primary)", fontWeight: 700 }} onClick={handleAddCombination}>
                + Add Combo ({currentSize} · {currentColour})
              </button>
            </div>
          </div>

          {stagedVariants.length > 0 && (
            <div className="store-staged-list">
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--store-text-muted)", display: "block", marginBottom: "6px" }}>Selected Combos ({totalStagedQty} pcs):</span>
              <div style={{ maxHeight: "110px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                {stagedVariants.map((item, idx) => (
                  <div key={idx} className="store-staged-row">
                    <span style={{ fontSize: "12.5px", fontWeight: 600 }}>{item.size} · {item.colour}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div className="store-qty-controls mini">
                        <button type="button" onClick={() => handleUpdateStagedQty(idx, -1)}>−</button>
                        <span>{item.qty}</span>
                        <button type="button" onClick={() => handleUpdateStagedQty(idx, 1)}>+</button>
                      </div>
                      <b style={{ fontSize: "12.5px" }}>{money(price * item.qty)}</b>
                      <button type="button" className="store-remove-staged-btn" onClick={() => handleRemoveStaged(idx)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="store-modal-dual-actions">
            <button type="button" className="store-secondary-btn store-continue-btn" onClick={() => onAddItems(getCompiledItems(), "continue")}>
              🛍️ Continue Shopping
            </button>
            <button type="button" className="store-primary-btn store-checkout-btn" onClick={() => onAddItems(getCompiledItems(), "checkout")}>
              ⚡ Check Out ({money(totalStagedPrice)})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}