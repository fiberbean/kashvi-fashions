"use client";

import React, { useEffect, useState } from "react";
import { X, Package, Loader2, ShoppingBag, Clock, CreditCard, ExternalLink, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function OrdersModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserOrders();
    }
  }, [isOpen, user]);

  const fetchUserOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_email", user?.email)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setOrders(data);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = (orderId: string) => {
    onClose();
    // Redirect to checkout or payment gateway page with order id
    router.push(`/checkout?order_id=${orderId}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] w-screen h-screen bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 w-full h-full" onClick={onClose} />

      <div className="relative z-[100000] w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#ff4d6d]/30 flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-neutral-100 bg-white shrink-0">
          <div>
            <h2 className="text-lg font-serif font-bold text-neutral-900 tracking-wide">My Orders</h2>
            <p className="text-xs text-neutral-500 font-light">View your couture order history & payment status</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#ff4d6d]" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#fff0f3] text-[#ff4d6d] flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-base font-serif font-bold text-neutral-900">No Orders Yet</h3>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">You haven't placed any orders with us yet. Explore our collection to begin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                let orderItems = [];
                try {
                  orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
                } catch (e) {
                  orderItems = [];
                }

                const isPaymentPending = order.payment_status === 'payment_pending' || !order.payment_verified;

                return (
                  <div key={order.id} className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/50 space-y-3 hover:border-[#ff4d6d]/40 transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/60 pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Order ID</span>
                        <span className="text-xs font-mono font-semibold text-neutral-800">#{order.id.slice(0, 8)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Date</span>
                        <span className="text-xs text-neutral-700">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Total Amount</span>
                        <span className="text-xs font-bold text-neutral-900">₹{order.total_amount || order.total}</span>
                      </div>
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isPaymentPending 
                            ? "bg-red-50 text-red-700 border-red-200" 
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {isPaymentPending ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          {isPaymentPending ? "Payment Pending" : "Paid / Confirmed"}
                        </span>
                      </div>
                    </div>

                    {/* Order Items List */}
                    <div className="space-y-2">
                      {orderItems.length === 0 ? (
                        <p className="text-xs text-neutral-400 italic">No item details available.</p>
                      ) : (
                        orderItems.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              {item.image || item.image_url ? (
                                <img src={item.image || item.image_url} alt={item.name || item.product_name} className="w-10 h-10 rounded-xl object-cover border border-neutral-200" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-neutral-200 flex items-center justify-center text-neutral-500">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-neutral-900">{item.name || item.product_name}</p>
                                <p className="text-[11px] text-neutral-500">Qty: {item.quantity || 1}</p>
                              </div>
                            </div>
                            <span className="font-bold text-neutral-900">₹{(item.price || 0) * (item.quantity || 1)}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Payment Gateway Action Button if Payment is Pending */}
                    {isPaymentPending && (
                      <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between">
                        <span className="text-[11px] text-neutral-500 font-medium">Complete your payment securely via Gateway.</span>
                        <button
                          type="button"
                          onClick={() => handlePayNow(order.id)}
                          className="px-4 py-2 rounded-xl bg-[#ff4d6d] hover:bg-[#e03b5b] text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-[#ff4d6d]/30"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Now</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}