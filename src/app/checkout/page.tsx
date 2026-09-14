"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, MapPin, Loader2, CheckCircle2, Plus, X, Package, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  
  // Cart Items State
  const [cartItems, setCartItems] = useState<any[]>([]);
  
  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);

  // Shipping & Rate Calculation State
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [calculatingShipping, setCalculatingShipping] = useState<boolean>(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // New Address Popup State
  const [showNewAddressPopup, setShowNewAddressPopup] = useState(false);
  const [savingNewAddr, setSavingNewAddr] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  // New Address Form Fields
  const [newAddrType, setNewAddrType] = useState("Home");
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [newAddrName, setNewAddrName] = useState("");
  const [newAddrMobile, setNewAddrMobile] = useState("");
  const [newDoorNo, setNewDoorNo] = useState("");
  const [newBuildingName, setNewBuildingName] = useState("");
  const [newStreet, setNewStreet] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newPincode, setNewPincode] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newLandmark, setNewLandmark] = useState("");

  // Customer Info
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  useEffect(() => {
    // Load Cashfree SDK dynamically
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    document.body.appendChild(script);

    try {
      const storedCart = localStorage.getItem("kashvi_cart");
      if (storedCart) {
        setCartItems(JSON.parse(storedCart));
      } else {
        setCartItems([
          {
            name: "Full Coverage Non Padded",
            size: "32B",
            color: "Pink",
            quantity: 1,
            price: 299,
            weight: 0.25,
            image: "",
          },
        ]);
      }
    } catch (e) {
      console.error("Error loading cart:", e);
    }

    if (user) {
      fetchCustomerAndAddresses();
    } else {
      setFetchingData(false);
    }
  }, [user]);

  const fetchCustomerAndAddresses = async () => {
    setFetchingData(true);
    try {
      const { data: custData } = await supabase
        .from("customers")
        .select("*")
        .eq("auth_user_id", user?.id)
        .single();

      if (custData) {
        setCustomerId(custData.id || "");
        setCustomerName(custData.name || "");
        setCustomerPhone(custData.mobile || "");
        setCustomerEmail(custData.email || user?.email || "");
      } else {
        setCustomerEmail(user?.email || "");
      }

      const { data: addrData } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("auth_user_id", user?.id);

      if (addrData && addrData.length > 0) {
        setSavedAddresses(addrData);
        const defaultAddr = addrData.find((a) => a.is_default) || addrData[0];
        handleSelectAddress(defaultAddr);
      }
    } catch (err) {
      console.error("Error fetching checkout details:", err);
    } finally {
      setFetchingData(false);
    }
  };

  const handlePincodeChange = async (val: string) => {
    const cleanPin = val.replace(/\D/g, "").slice(0, 6);
    setNewPincode(cleanPin);

    if (cleanPin.length === 6) {
      setPincodeLoading(true);
      try {
        const { data } = await supabase
          .from("pincodes")
          .select("city, state, delivery_available")
          .eq("pincode", cleanPin)
          .single();

        if (data) {
          setNewCity(data.city || "");
          setNewState(data.state || "");
          if (!data.delivery_available) {
            alert("Delivery is currently not available for this pincode.");
          }
        } else {
          setNewCity("");
          setNewState("");
        }
      } catch (err) {
        console.error("Error fetching pincode details:", err);
      } finally {
        setPincodeLoading(false);
      }
    } else {
      setNewCity("");
      setNewState("");
    }
  };

  const calculateShippingRate = async (pincodeStr: string, itemsList: any[]) => {
    if (!pincodeStr || pincodeStr.length !== 6) return;
    setCalculatingShipping(true);
    setDeliveryError(null);

    try {
      const { data: pinData, error: pinError } = await supabase
        .from("pincodes")
        .select("*")
        .eq("pincode", pincodeStr.trim())
        .single();

      if (pinError || !pinData) {
        setDeliveryError("Delivery not available for this pincode.");
        setShippingFee(0);
        setCalculatingShipping(false);
        return;
      }

      if (!pinData.delivery_available) {
        setDeliveryError("Delivery is currently unavailable to this location.");
        setShippingFee(0);
        setCalculatingShipping(false);
        return;
      }

      const zoneType = pinData.zone_type;
      const totalWeightKg = itemsList.reduce((acc, item) => {
        const itemWeight = Number(item.weight || 0.25);
        return acc + (itemWeight * Number(item.quantity || 1));
      }, 0);

      const { data: rateData } = await supabase
        .from("delivery_rate_cards")
        .select("*")
        .eq("active", true)
        .lte("weight_from", totalWeightKg)
        .or(`weight_to.gte.${totalWeightKg},weight_to.is.null`)
        .limit(1)
        .single();

      if (!rateData) {
        setShippingFee(50);
        setCalculatingShipping(false);
        return;
      }

      let baseRate = 0;
      let additionalRate = 0;
      let baseWeightLimit = 1.0;

      if (zoneType === 'Local') {
        baseRate = Number(rateData.local_rate || 0);
        additionalRate = Number(rateData.additional_kg_rate_local || 0);
      } else if (zoneType === 'Within State') {
        baseRate = Number(rateData.within_state_rate || 0);
        additionalRate = Number(rateData.additional_kg_rate_within_state || 0);
      } else if (zoneType === 'Zone / Metro') {
        baseRate = Number(rateData.zone_metro_rate || 0);
        additionalRate = Number(rateData.additional_kg_rate_zone_metro || 0);
      } else {
        baseRate = Number(rateData.other_states_rate || 0);
        additionalRate = Number(rateData.additional_kg_rate_other_states || 0);
      }

      let finalShipping = baseRate;
      if (totalWeightKg > baseWeightLimit) {
        const extraKg = Math.ceil(totalWeightKg - baseWeightLimit);
        finalShipping += extraKg * additionalRate;
      }

      setShippingFee(finalShipping);
    } catch (err) {
      console.error("Error calculating shipping:", err);
      setShippingFee(50);
    } finally {
      setCalculatingShipping(false);
    }
  };

  const handleSelectAddress = (addr: any) => {
    setSelectedAddress(addr);
    if (addr.pincode) {
      calculateShippingRate(addr.pincode, cartItems);
    }
  };

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity || !newState) {
      alert("Please enter a valid 6-digit pincode to auto-fetch City and State.");
      return;
    }

    setSavingNewAddr(true);

    try {
      const { data: cust } = await supabase
        .from("customers")
        .select("id")
        .eq("auth_user_id", user?.id)
        .single();

      if (!cust) throw new Error("Customer record not found.");

      const fullFormattedAddress = `${newDoorNo}, ${newBuildingName ? newBuildingName + ", " : ""}${newStreet}, ${newArea}, Pincode: ${newPincode}, ${newCity}, ${newState}${newLandmark ? " (Landmark: " + newLandmark + ")" : ""}`;

      const { data, error } = await supabase
        .from("customer_addresses")
        .insert({
          customer_id: cust.id,
          auth_user_id: user?.id,
          address_type: newAddrType,
          custom_label: newAddrType === "Other" ? newCustomLabel.trim() : null,
          full_name: newAddrName.trim(),
          mobile: newAddrMobile.trim(),
          door_address: fullFormattedAddress,
          building_name: newBuildingName.trim(),
          street: newStreet.trim(),
          area: newArea.trim(),
          landmark: newLandmark.trim(),
          city: newCity.trim(),
          state: newState,
          pincode: newPincode.trim(),
          is_default: savedAddresses.length === 0,
        })
        .select()
        .single();

      if (error) throw error;

      const updatedList = [...savedAddresses, data];
      setSavedAddresses(updatedList);
      handleSelectAddress(data);

      setShowNewAddressPopup(false);
      setNewDoorNo("");
      setNewBuildingName("");
      setNewStreet("");
      setNewArea("");
      setNewPincode("");
      setNewCity("");
      setNewState("");
      setNewLandmark("");
      setNewCustomLabel("");
    } catch (err: any) {
      alert(err.message || "Failed to save new address.");
    } finally {
      setSavingNewAddr(false);
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
  const totalWeight = cartItems.reduce((acc, item) => acc + (Number(item.weight || 0.25) * Number(item.quantity || 1)), 0);
  const grandTotal = subtotal + shippingFee;

  // Confirm & Pay Order Handler matching Orders Table Schema
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddress) {
      alert("Please select a delivery address to proceed.");
      return;
    }

    if (deliveryError) {
      alert(deliveryError);
      return;
    }

    setLoading(true);

    try {
      // Unique order ID generation
      const orderId = `ORD-${Date.now()}`;

      const orderData = {
        id: orderId,
        customer_id: customerId || null,
        status: "new",
        total: grandTotal,
        total_weight: totalWeight,
        subtotal: subtotal,
        delivery_fee: shippingFee,
        total_amount: grandTotal,
        customer_name: selectedAddress.full_name || customerName.trim(),
        customer_phone: selectedAddress.mobile || customerPhone.trim(),
        customer_email: customerEmail.trim(),
        shipping_address: selectedAddress.door_address.trim(),
        pincode: selectedAddress.pincode.trim(),
        items: cartItems,
        payment_status: "payment_pending",
        order_status: "new",
        payment_method: "Cashfree PG",
      };

      const { data: savedOrder, error } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;

      // Call API Route to create Cashfree payment session
      const response = await fetch("/api/create-cashfree-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId,
          orderAmount: grandTotal,
          customerName: orderData.customer_name,
          customerPhone: orderData.customer_phone,
          customerEmail: orderData.customer_email,
        }),
      });

      const paymentData = await response.json();
      if (!response.ok) {
        throw new Error(paymentData.error || "Failed to initialize payment gateway.");
      }

      // Clear cart storage
      localStorage.removeItem("kashvi_cart");

      // Trigger Cashfree Checkout
      if ((window as any).Cashfree) {
        const cashfree = (window as any).Cashfree({
          mode: paymentData.environment || "sandbox",
        });

        cashfree.checkout({
          paymentSessionId: paymentData.payment_session_id,
          redirectTarget: "_self",
        });
      } else {
        alert("Payment gateway SDK is still loading. Please try again.");
      }

    } catch (err: any) {
      alert(err.message || "Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 text-neutral-800 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-neutral-200/60 py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Continue Shopping</span>
        </Link>
        <h1 className="font-serif font-bold text-lg md:text-xl tracking-widest text-neutral-900">KASHVI</h1>
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span className="hidden sm:inline">Secure Checkout</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        <h2 className="text-2xl font-serif font-bold text-neutral-900 mb-6">Maison Checkout</h2>

        {fetchingData ? (
          <div className="py-24 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#ff4d6d]" />
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Addresses */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-2xs space-y-5">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                  <div>
                    <h3 className="text-base font-serif font-bold text-neutral-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-[#ff4d6d]" />
                      <span>Select Delivery Address</span>
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Choose where you want your order delivered</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewAddrName(customerName);
                      setNewAddrMobile(customerPhone);
                      setShowNewAddressPopup(true);
                    }}
                    className="text-xs font-bold text-[#ff4d6d] hover:underline flex items-center gap-1.5 bg-[#fff0f3] px-4 py-2 rounded-full border border-[#ff4d6d]/30 shadow-2xs cursor-pointer transition-all hover:bg-[#ff4d6d] hover:text-white"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Address</span>
                  </button>
                </div>

                {savedAddresses.length === 0 ? (
                  <div className="text-center py-12 bg-[#fff0f3]/20 rounded-2xl border border-dashed border-[#ff4d6d]/30 space-y-3">
                    <p className="text-xs text-neutral-500">No saved delivery addresses found.</p>
                    <button
                      type="button"
                      onClick={() => setShowNewAddressPopup(true)}
                      className="px-4 py-2 bg-[#ff4d6d] text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Add Address Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddress?.id === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => handleSelectAddress(addr)}
                          className={`p-5 rounded-2xl border cursor-pointer transition-all relative flex items-start justify-between gap-4 ${
                            isSelected
                              ? "border-[#ff4d6d] bg-[#fff0f3]/40 shadow-sm ring-1 ring-[#ff4d6d]/30"
                              : "border-neutral-200 bg-white hover:border-neutral-300"
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#ff4d6d]/10 text-[#ff4d6d] px-2.5 py-0.5 rounded-md">
                                {addr.address_type === "Other" && addr.custom_label ? addr.custom_label : addr.address_type}
                              </span>
                              {addr.is_default && (
                                <span className="text-[10px] text-neutral-400 font-medium">(Default)</span>
                              )}
                            </div>
                            <p className="text-sm font-bold text-neutral-900">{addr.full_name} <span className="text-neutral-500 font-normal">({addr.mobile})</span></p>
                            <p className="text-xs text-neutral-600 leading-relaxed">{addr.door_address}</p>
                          </div>

                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border mt-1 ${
                            isSelected ? "bg-[#ff4d6d] border-[#ff4d6d] text-white" : "border-neutral-300 bg-white"
                          }`}>
                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {deliveryError && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{deliveryError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="lg:col-span-5">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-xl space-y-6 sticky top-24">
                <h3 className="text-base font-serif font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                  Order Summary ({cartItems.reduce((acc, i) => acc + Number(i.quantity || 1), 0)} items)
                </h3>

                <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0">
                      {item.image || item.image_url ? (
                        <img 
                          src={item.image || item.image_url} 
                          alt={item.name} 
                          className="w-14 h-14 rounded-xl object-cover border border-neutral-200 shrink-0" 
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 shrink-0">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-serif font-bold text-neutral-900 truncate">{item.name}</h4>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {item.size ? `Size: ${item.size} • ` : ""}
                          {item.color ? `Color: ${item.color} • ` : ""}
                          Qty: {item.quantity || 1}
                        </p>
                        <p className="text-xs font-bold text-neutral-900 mt-0.5">₹{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2.5 text-xs border-t border-neutral-100 pt-4">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-neutral-900">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600 items-center">
                    <span>Shipping ({totalWeight.toFixed(2)} kg)</span>
                    {calculatingShipping ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff4d6d]" />
                    ) : (
                      <span className="font-semibold text-emerald-600">
                        {shippingFee === 0 ? "Free" : `₹${shippingFee}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-neutral-900">Grand Total</span>
                  <span className="text-lg font-serif font-bold text-neutral-900">₹{grandTotal}</span>
                </div>

                <button
                  type="submit"
                  disabled={loading || !selectedAddress || !!deliveryError || calculatingShipping}
                  className="w-full py-3.5 rounded-2xl bg-neutral-950 hover:bg-[#ff4d6d] text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#ff4d6d]/25 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Confirm & Pay Securely</span>}
                </button>

                <div className="text-center">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Verified Official Maison Gateway
                  </span>
                </div>
              </div>
            </div>

          </form>
        )}
      </div>

      {/* POPUP MODAL: Add New Address */}
      {showNewAddressPopup && (
        <div className="fixed inset-0 z-[100000] w-screen h-screen bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 w-full h-full" onClick={() => setShowNewAddressPopup(false)} />

          <div className="relative z-[100001] w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-7 border border-[#ff4d6d]/30 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-base font-serif font-bold text-neutral-900">Add New Delivery Address</h3>
              <button
                type="button"
                onClick={() => setShowNewAddressPopup(false)}
                className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewAddress} className="space-y-3.5 text-xs">
              <div className="flex gap-2 mb-1.5">
                {["Home", "Office", "Other"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewAddrType(type)}
                    className={`flex-1 py-2 rounded-xl font-bold border transition-all cursor-pointer text-xs ${
                      newAddrType === type 
                        ? "bg-[#ff4d6d] text-white border-[#ff4d6d] shadow-sm shadow-[#ff4d6d]/30" 
                        : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {newAddrType === "Other" && (
                <input
                  type="text"
                  required
                  placeholder="Address Name (e.g. Mom's House, Studio)"
                  value={newCustomLabel}
                  onChange={(e) => setNewCustomLabel(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#ff4d6d]/40 bg-white focus:border-[#ff4d6d] focus:outline-none font-medium"
                />
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={newAddrName}
                  onChange={(e) => setNewAddrName(e.target.value)}
                  className="p-3 rounded-xl border border-neutral-200 bg-white focus:border-[#ff4d6d] focus:outline-none"
                />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="WhatsApp Number"
                  value={newAddrMobile}
                  onChange={(e) => setNewAddrMobile(e.target.value.replace(/\D/g, ""))}
                  className="p-3 rounded-xl border border-neutral-200 bg-white focus:border-[#ff4d6d] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="Door No. / Flat No."
                  value={newDoorNo}
                  onChange={(e) => setNewDoorNo(e.target.value)}
                  className="p-3 rounded-xl border border-neutral-200 bg-white focus:border-[#ff4d6d] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Apartment / Building"
                  value={newBuildingName}
                  onChange={(e) => setNewBuildingName(e.target.value)}
                  className="p-3 rounded-xl border border-neutral-200 bg-white focus:border-[#ff4d6d] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="Street"
                  value={newStreet}
                  onChange={(e) => setNewStreet(e.target.value)}
                  className="p-3 rounded-xl border border-neutral-200 bg-white focus:border-[#ff4d6d] focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="Area / Locality"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="p-3 rounded-xl border border-neutral-200 bg-white focus:border-[#ff4d6d] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Pincode *"
                    value={newPincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    className="w-full p-3 rounded-xl border border-neutral-200 bg-white focus:border-[#ff4d6d] focus:outline-none font-semibold"
                  />
                  {pincodeLoading && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff4d6d] absolute right-3 top-3.5" />
                  )}
                </div>
                <input
                  type="text"
                  required
                  readOnly
                  placeholder="City (Auto)"
                  value={newCity}
                  className="p-3 rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-700 cursor-not-allowed font-medium"
                />
                <input
                  type="text"
                  required
                  readOnly
                  placeholder="State (Auto)"
                  value={newState}
                  className="p-3 rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-700 cursor-not-allowed font-medium text-[11px]"
                />
              </div>

              <input
                type="text"
                placeholder="Landmark (Optional)"
                value={newLandmark}
                onChange={(e) => setNewLandmark(e.target.value)}
                className="w-full p-3 rounded-xl border border-neutral-200 bg-white focus:border-[#ff4d6d] focus:outline-none"
              />

              <button
                type="submit"
                disabled={savingNewAddr || !newCity}
                className="w-full mt-3 py-3.5 rounded-xl bg-[#ff4d6d] hover:bg-[#e03b5b] text-white font-bold uppercase tracking-widest text-xs transition-all cursor-pointer shadow-sm shadow-[#ff4d6d]/30 disabled:opacity-50"
              >
                {savingNewAddr ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <span>Save & Select Address</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}