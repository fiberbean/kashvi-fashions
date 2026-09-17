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
  ChevronDown,
  ChevronUp,
  Package,
  MapPin,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface CustomerOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ORDER_STAGES = [
  { key: 'placed', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packed', label: 'Packed' },
  { key: 'dispatched', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

export default function CustomerOrdersModal({ isOpen, onClose }: CustomerOrdersModalProps) {
  const { user, customer } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const fetchOrdersFast = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const email = user.email?.trim().toLowerCase();
      const phone = customer?.mobile?.trim() || user.user_metadata?.whatsapp_number?.trim();

      // ఫాస్ట్ పారలల్ ప్రామిస్ క్వెరీస్
      const queries = [];
      if (email) {
        queries.push(
          supabase
            .from('orders')
            .select('*')
            .eq('customer_email', email)
            .order('created_at', { ascending: false })
            .limit(25)
        );
      }
      if (phone) {
        queries.push(
          supabase
            .from('orders')
            .select('*')
            .eq('customer_phone', phone)
            .order('created_at', { ascending: false })
            .limit(25)
        );
        queries.push(
          supabase
            .from('orders')
            .select('*')
            .eq('customer_id', phone)
            .order('created_at', { ascending: false })
            .limit(25)
        );
      }

      const results = await Promise.all(queries);
      const combined = new Map<string, any>();

      results.forEach((res) => {
        if (!res.error && res.data) {
          res.data.forEach((ord: any) => combined.set(ord.id, ord));
        }
      });

      const sorted = Array.from(combined.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setOrders(sorted);
      if (sorted.length > 0 && !expandedOrderId) {
        setExpandedOrderId(sorted[0].id);
      }
    } catch (err) {
      console.error('Fast fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOrdersFast();
    }
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

  const getStageIndex = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('deliver')) return 4;
    if (s.includes('ship') || s.includes('dispatch') || s.includes('transit')) return 3;
    if (s.includes('pack')) return 2;
    if (s.includes('confirm') || s.includes('paid')) return 1;
    return 0;
  };

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
        <Clock3 className="w-3 h-3" /> Payment Pending
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
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 cursor-default my-auto animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0b3b2c]/10 text-[#0b3b2c] flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 leading-tight">
                My Orders & Status
              </h2>
              <p className="text-[10px] text-neutral-400 font-medium">
                Click any order to view live shipment timeline
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

        {/* Orders List Area */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-2 text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#0b3b2c]" />
              <span className="text-xs font-medium">Fetching orders instantly...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center space-y-3">
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
                const isExpanded = expandedOrderId === ord.id;
                const items = Array.isArray(ord.items) ? ord.items : [];
                const currentStageIdx = getStageIndex(ord.order_status || ord.status);
                const orderDate = ord.created_at
                  ? new Date(ord.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent';

                return (
                  <div
                    key={ord.id}
                    className={`border-2 rounded-3xl transition-all overflow-hidden ${
                      isExpanded
                        ? 'border-[#0b3b2c] shadow-md bg-white'
                        : 'border-neutral-200/90 bg-white hover:border-neutral-300 shadow-2xs'
                    }`}
                  >
                    {/* Clickable Card Header */}
                    <div
                      onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                      className="p-4 sm:p-5 cursor-pointer flex flex-wrap items-center justify-between gap-3 select-none bg-neutral-50/40 hover:bg-neutral-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            isExpanded
                              ? 'bg-[#0b3b2c] text-white'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-neutral-900 text-xs sm:text-sm">
                              {ord.id}
                            </span>
                            {renderStatusBadge(ord.order_status, ord.payment_status)}
                          </div>
                          <p className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" /> {orderDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-auto">
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                            Amount Paid
                          </span>
                          <span className="font-serif font-black text-sm sm:text-base text-neutral-950">
                            ₹{Number(ord.total_amount || ord.total || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="p-1.5 rounded-full bg-white border border-neutral-200 text-neutral-600">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Order Status & Tracking Timeline */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-neutral-100 space-y-5 animate-in fade-in duration-200">
                        {/* 5-Step Status Progress Tracker */}
                        <div className="bg-neutral-50/80 border border-neutral-200/80 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-[#0b3b2c]" />
                              Order Status Tracker
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full capitalize">
                              Current: {ord.order_status || 'Processing'}
                            </span>
                          </div>

                          {/* Progress Line */}
                          <div className="relative flex items-center justify-between w-full px-2 pt-2 pb-1">
                            <div className="absolute left-4 right-4 top-4.5 h-1 bg-neutral-200 -z-0" />
                            <div
                              className="absolute left-4 top-4.5 h-1 bg-emerald-600 transition-all duration-500 -z-0"
                              style={{
                                width: `${(currentStageIdx / (ORDER_STAGES.length - 1)) * 90}%`,
                              }}
                            />

                            {ORDER_STAGES.map((stage, idx) => {
                              const isCompleted = idx <= currentStageIdx;
                              const isCurrent = idx === currentStageIdx;

                              return (
                                <div
                                  key={stage.key}
                                  className="flex flex-col items-center relative z-10"
                                >
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                      isCompleted
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                                        : 'bg-white border-2 border-neutral-300 text-neutral-400'
                                    } ${isCurrent ? 'ring-4 ring-emerald-100 scale-110' : ''}`}
                                  >
                                    {isCompleted ? '✓' : idx + 1}
                                  </div>
                                  <span
                                    className={`text-[9px] sm:text-[10px] mt-1.5 font-bold uppercase tracking-tight ${
                                      isCurrent
                                        ? 'text-emerald-700'
                                        : isCompleted
                                        ? 'text-neutral-800'
                                        : 'text-neutral-400'
                                    }`}
                                  >
                                    {stage.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Courier Tracking Details */}
                          {(ord.tracking_number || ord.courier_name) && (
                            <div className="mt-4 pt-3 border-t border-neutral-200/80 flex flex-wrap items-center justify-between gap-2 text-xs bg-white p-3 rounded-xl">
                              <div>
                                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                                  Courier Partner
                                </span>
                                <span className="font-bold text-neutral-900">
                                  {ord.courier_name || 'India Post'}
                                </span>
                              </div>
                              {ord.tracking_number ? (
                                <div className="text-right">
                                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                                    Tracking ID (AWB)
                                  </span>
                                  <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                                    {ord.tracking_number}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-neutral-400 italic">
                                  Tracking number will be assigned once dispatched
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Items Breakdown */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider block">
                            Items Ordered ({items.length})
                          </span>
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                                    {item.color && (
                                      <span className="capitalize">Color: {item.color}</span>
                                    )}
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
                        </div>

                        {/* Shipping & Payment Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-neutral-100">
                          <div className="bg-neutral-50/60 p-3 rounded-2xl border border-neutral-100 space-y-1">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Delivered To
                            </span>
                            <p className="text-neutral-700 leading-relaxed font-medium">
                              {ord.shipping_address || 'Address on file'}
                            </p>
                          </div>

                          <div className="bg-neutral-50/60 p-3 rounded-2xl border border-neutral-100 space-y-1">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Payment Details
                            </span>
                            <div className="space-y-0.5 text-neutral-600">
                              <p>
                                Method: <strong className="text-neutral-900">{ord.payment_method || 'Online'}</strong>
                              </p>
                              <p>
                                Status: <strong className="text-emerald-700 capitalize">{ord.payment_status || 'Paid'}</strong>
                              </p>
                              {ord.payment_reference && (
                                <p className="font-mono text-[10px] text-neutral-500 truncate">
                                  Ref: {ord.payment_reference}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
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