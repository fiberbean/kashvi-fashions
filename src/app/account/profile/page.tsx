"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { User, Phone, MapPin, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function AccountProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Customer Profile State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Addresses State
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // New Address Form State
  const [addressType, setAddressType] = useState("Home");
  const [addrName, setAddrName] = useState("");
  const [addrMobile, setAddrMobile] = useState("");
  const [doorAddress, setDoorAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const { data: custData } = await supabase
        .from("customers")
        .select("*")
        .eq("auth_user_id", user?.id)
        .single();

      if (custData) {
        setFullName(custData.name || "");
        setPhone(custData.mobile || "");
        setEmail(custData.email || user?.email || "");
      } else {
        setEmail(user?.email || "");
      }

      const { data: addrData } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("auth_user_id", user?.id);

      if (addrData) {
        setAddresses(addrData);
      }
    } catch (err) {
      console.error("Error fetching account data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name: fullName.trim(),
          mobile: phone.trim(),
        })
        .eq("auth_user_id", user?.id);

      if (error) throw error;
      setMsg({ type: "success", text: "Profile updated successfully!" });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const { data: cust } = await supabase
        .from("customers")
        .select("id")
        .eq("auth_user_id", user?.id)
        .single();

      if (!cust) throw new Error("Customer record not found.");

      const { error } = await supabase.from("customer_addresses").insert({
        customer_id: cust.id,
        auth_user_id: user?.id,
        address_type: addressType,
        full_name: addrName.trim(),
        mobile: addrMobile.trim(),
        door_address: doorAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        is_default: addresses.length === 0,
      });

      if (error) throw error;

      setMsg({ type: "success", text: "New address added successfully!" });
      setShowAddressForm(false);
      setAddrName("");
      setAddrMobile("");
      setDoorAddress("");
      setCity("");
      setState("");
      setPincode("");
      
      fetchUserData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to add address." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const { error } = await supabase
        .from("customer_addresses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setAddresses(addresses.filter((a) => a.id !== id));
      setMsg({ type: "success", text: "Address removed." });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    }
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-center px-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-neutral-900 mb-2">Please Sign In</h2>
          <p className="text-sm text-neutral-500">You need to be logged in to view your account profile.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff4d6d]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-neutral-900">My Account Profile</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage your Kashvi profile and delivery addresses.</p>
      </div>

      {msg && (
        <div
          className={`mb-6 p-4 rounded-2xl text-sm flex items-start gap-3 border ${
            msg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Personal Profile */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-sm">
          <h2 className="text-lg font-serif font-bold text-neutral-900 mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-[#ff4d6d]" />
            <span>Personal Information</span>
          </h2>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-sm">
            <div>
              <label className="block text-neutral-700 font-medium mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-neutral-700 font-medium mb-1">WhatsApp Mobile Number</label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center gap-1 text-neutral-600 font-semibold border-r border-neutral-200 pr-2">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-21 pr-3.5 py-2.5 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none"
                  placeholder="10-digit number"
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-700 font-medium mb-1">Email Address (Read-only)</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500 cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full mt-2 py-3 rounded-xl bg-neutral-950 hover:bg-[#ff4d6d] text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Profile Changes</span>}
            </button>
          </form>
        </div>

        {/* Saved Addresses */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-serif font-bold text-neutral-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#ff4d6d]" />
                <span>Delivery Addresses</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="text-xs font-bold text-[#ff4d6d] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddressForm ? "Cancel" : "Add New"}</span>
              </button>
            </div>

            {!showAddressForm ? (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {addresses.length === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-8">No saved addresses found. Add one for quick checkout.</p>
                ) : (
                  addresses.map((addr) => (
                    <div key={addr.id} className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 relative group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider bg-[#ff4d6d]/10 text-[#ff4d6d] px-2 py-0.5 rounded-md">
                          {addr.address_type}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-neutral-900 mt-1">{addr.full_name} ({addr.mobile})</p>
                      <p className="text-xs text-neutral-600 mt-0.5">{addr.door_address}, {addr.city}, {addr.state} - {addr.pincode}</p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <form onSubmit={handleAddAddress} className="space-y-3 text-xs">
                <div className="flex gap-2 mb-2">
                  {["Home", "Office", "Other"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAddressType(type)}
                      className={`flex-1 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                        addressType === type ? "bg-[#ff4d6d] text-white border-[#ff4d6d]" : "bg-white text-neutral-700 border-neutral-200"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={addrName}
                    onChange={(e) => setAddrName(e.target.value)}
                    className="p-2.5 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none"
                  />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Mobile Number"
                    value={addrMobile}
                    onChange={(e) => setAddrMobile(e.target.value.replace(/\D/g, ""))}
                    className="p-2.5 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none"
                  />
                </div>

                <input
                  type="text"
                  required
                  placeholder="Street Address, House No, Landmark"
                  value={doorAddress}
                  onChange={(e) => setDoorAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none"
                />

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="p-2.5 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="p-2.5 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    className="p-2.5 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full mt-2 py-2.5 rounded-xl bg-neutral-950 hover:bg-[#ff4d6d] text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <span>Save Address</span>}
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}