import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  PackageCheck,
  ShoppingBag,
  Calendar,
  Clock3,
  CheckCircle2,
  XCircle,
  Truck,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface CustomerOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerOrdersModal({ isOpen, onClose }: CustomerOrdersModalProps) {
  const { user, customer } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const identifiers = [user.id, user.email];
        if (customer?.mobile) identifiers.push(customer.mobile);

        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .or(
            `customer_email.eq.${user.email},customer_phone.eq.${customer?.mobile || ''},customer_id.eq.${customer?.mobile || user.id}`
          )
          .order('created_at', { ascending: false });

        if (!error && data) {
          setOrders(data);
        }
      } catch (err) {
        console.error('Error fetching customer orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isOpen, user, customer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderStatusBadge = (status: string, paymentStatus: string) => {
    const isPaid = paymentStatus?.toLowerCase() === 'paid';
    const isCancelled = status?.toLowerCase() === 'cancelled';

    if (isCancelled) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
          <XCircle className="w-3 h-3" /> Cancelled
        </span>
      );
    }

    if (isPaid) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
          <CheckCircle2 className="w-3 h-3" /> Confirmed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
        <Clock3 className="w-3 h-3" /> Pending
      </span>
    );
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 cursor-default my-auto animate-in zoom-in-95 duration-200 max-h-[88vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0b3b2c]/10 text-[#0b3b2c] flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 leading-tight">
                My Orders
              </h2>
              <p className="text-[10px] text-neutral-400 font-medium">
                Track your luxury couture & jewellery shipments
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-900 text-neutral-500 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#0b3b2c]" />
              <span className="text-xs">Loading your orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-300 mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-neutral-800 text-base">No orders found</h4>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto mt-1">
                  You haven't placed any orders yet. Discover our exclusive handpicked pieces.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => {
                const items = Array.isArray(ord.items) ? ord.items : [];
                const orderDate = ord.created_at
                  ? new Date(ord.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Recent';

                return (
                  <div
                    key={ord.id}
                    className="border border-neutral-200/90 rounded-3xl p-4 sm:p-5 bg-white shadow-2xs space-y-3.5"
                  >
                    {/* Order Meta Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-neutral-900">{ord.id}</span>
                          {renderStatusBadge(ord.order_status, ord.payment_status)}
                        </div>
                        <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Placed on {orderDate}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                          Total Amount
                        </span>
                        <span className="font-serif font-black text-sm text-neutral-950">
                          ₹{Number(ord.total_amount || ord.total || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Ordered Items List */}
                    <div className="space-y-2">
                      {items.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 bg-neutral-50/60 p-2.5 rounded-2xl border border-neutral-100"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-14 object-cover object-top rounded-xl border border-neutral-200/60 shrink-0"
                          />
                          <div className="flex-1 min-w-0 text-xs">
                            <h5 className="font-bold text-neutral-900 truncate leading-tight">
                              {item.name}
                            </h5>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500">
                              {item.color && <span className="capitalize">Color: {item.color}</span>}
                              {item.size && <span>• Size: {item.size}</span>}
                              <span>• Qty: {item.qty}</span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-neutral-900 shrink-0">
                            ₹{(item.price * item.qty).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Shipping Address Brief */}
                    {ord.shipping_address && (
                      <div className="pt-2 border-t border-neutral-100 flex items-start justify-between gap-2 text-[11px] text-neutral-500">
                        <div className="flex items-start gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">Deliver to: {ord.shipping_address}</span>
                        </div>
                        <span className="font-medium text-neutral-700 shrink-0">
                          {ord.payment_method || 'Online'}
                        </span>
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

  return createPortal(modalContent, document.body);
}