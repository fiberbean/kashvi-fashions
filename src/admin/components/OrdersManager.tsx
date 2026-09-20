import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  RefreshCw,
  Eye,
  Printer,
  MessageCircle,
  CheckCircle2,
  Lock,
  Truck,
  RotateCcw,
  X,
  AlertCircle,
  ExternalLink,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Layers,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface OrderRecord {
  id: string;
  created_at: string;
  status: string;
  total: number;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  } | null;
  shipping?: {
    address?: string;
    city?: string;
    pincode?: string;
    courier?: string;
    tracking_number?: string;
  } | null;
  payment?: {
    method?: string;
    status?: string;
    delivery_charge?: number;
  } | null;
  items?: Array<{
    name: string;
    variant_title?: string;
    quantity: number;
    price: number;
  }> | null;
  refund?: {
    utr?: string;
    date?: string;
  } | null;
  is_refunded?: boolean;
}

const PIPELINE_STAGES = [
  { key: 'new', label: 'New', order: 1, color: '#00d9ff' },
  { key: 'payment_check', label: 'Payment Check', order: 2, color: '#6d4aff' },
  { key: 'order_check', label: 'Order Check', order: 3, color: '#b76e79' },
  { key: 'processing', label: 'Processing', order: 4, color: '#ffa500' },
  { key: 'packing', label: 'Packing', order: 5, color: '#e30b5c' },
  { key: 'ready_to_dispatch', label: 'Ready to Dispatch', order: 6, color: '#00ff9d' },
  { key: 'dispatched', label: 'Dispatched', order: 7, color: '#38bdf8' },
  { key: 'delivered', label: 'Delivered', order: 8, color: '#10b981' }
];

function formatStatusName(status: string) {
  const map: { [key: string]: string } = {
    new: 'New Order',
    payment_check: 'Payment Check',
    order_check: 'Order Check',
    processing: 'Processing',
    packing: 'Packing',
    ready_to_dispatch: 'Ready to Dispatch',
    dispatched: 'Dispatched (India Post)',
    delivered: 'Delivered',
    cancelled: 'Cancelled / Refunded'
  };
  return map[status] || status;
}

function getStageRank(statusKey: string): number {
  const stage = PIPELINE_STAGES.find((s) => s.key === statusKey);
  return stage ? stage.order : 99;
}

export default function OrdersManager() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [masterPipelinePin, setMasterPipelinePin] = useState<string>('1234');

  // Modal States
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  // Rollback PIN modal
  const [pendingRollback, setPendingRollback] = useState<{
    orderId: string;
    targetStatus: string;
    prevStatus: string;
  } | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Dispatch Courier modal
  const [dispatchOrderId, setDispatchOrderId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string>('');

  // Refund UTR modal
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
  const [refundUtr, setRefundUtr] = useState<string>('');

  // 1. Fetch Store PIN and Orders
  const fetchStorePin = async () => {
    try {
      const { data } = await supabase
        .from('store_settings')
        .select('pipeline_pin')
        .eq('id', 'store_config')
        .single();
      if (data?.pipeline_pin) {
        setMasterPipelinePin(String(data.pipeline_pin));
      }
    } catch {
      // Default PIN
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Orders load error:', err);
      setErrorMsg(err.message || 'Failed to load live orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorePin();
    loadOrders();
  }, []);

  // 2. Order Status Update
  const updateOrderStatus = async (orderId: string, newStatus: string, additionalFields: any = {}) => {
    try {
      const payload = { status: newStatus, ...additionalFields };
      const { error } = await supabase.from('orders').update(payload).eq('id', orderId);
      if (error) throw error;

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...payload } : o))
      );

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, ...payload } : null));
      }
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // 3. Stage Progression / Rollback Handler
  const handleStageChange = async (orderId: string, targetStatus: string, currentStatus: string) => {
    if (currentStatus === targetStatus) return;

    const currentRank = getStageRank(currentStatus);
    const targetRank = getStageRank(targetStatus);

    // Rollback to previous step -> Require PIN
    if (targetRank < currentRank) {
      setPendingRollback({ orderId, targetStatus, prevStatus: currentStatus });
      setEnteredPin('');
      setPinError(null);
      return;
    }

    // Special: Dispatched (Tracking Number)
    if (targetStatus === 'dispatched') {
      setDispatchOrderId(orderId);
      setTrackingNumber('');
      return;
    }

    // Special: Cancelled (Refund UTR)
    if (targetStatus === 'cancelled') {
      setRefundOrderId(orderId);
      setRefundUtr('');
      return;
    }

    // Regular Forward Step
    await updateOrderStatus(orderId, targetStatus);
  };

  // Submit Rollback PIN
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin.trim() !== masterPipelinePin) {
      setPinError('❌ Incorrect Security PIN! Previous step transition denied.');
      return;
    }

    if (pendingRollback) {
      await updateOrderStatus(pendingRollback.orderId, pendingRollback.targetStatus);
      setPendingRollback(null);
      setEnteredPin('');
      setPinError(null);
    }
  };

  // Submit Dispatch Tracking
  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrderId || !trackingNumber.trim()) return;

    const targetOrder = orders.find((o) => o.id === dispatchOrderId);
    const updatedShipping = {
      ...(targetOrder?.shipping || {}),
      courier: 'India Post',
      tracking_number: trackingNumber.trim()
    };

    await updateOrderStatus(dispatchOrderId, 'dispatched', { shipping: updatedShipping });
    setDispatchOrderId(null);
    setTrackingNumber('');
  };

  // Submit Refund UTR
  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundOrderId || !refundUtr.trim()) return;

    const targetOrder = orders.find((o) => o.id === refundOrderId);
    const updatedRefund = {
      ...(targetOrder?.refund || {}),
      utr: refundUtr.trim(),
      date: new Date().toISOString()
    };

    await updateOrderStatus(refundOrderId, 'cancelled', {
      is_refunded: true,
      refund: updatedRefund
    });
    setRefundOrderId(null);
    setRefundUtr('');
  };

  // 4. Print Shipping Label
  const printShippingLabel = (order: OrderRecord) => {
    const cust = order.customer || {};
    const ship = order.shipping || {};
    const pay = order.payment || {};
    const items = order.items || [];
    const itemsSummary = items
      .map((i) => `${i.name} (${i.variant_title || ''}) x${i.quantity || 1}`)
      .join(', ');

    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shipping Label - ${order.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .shipping-label-card { width: 380px; border: 2px solid #000; padding: 16px; margin: 0 auto; box-sizing: border-box; }
          .label-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; font-size: 0.85rem; font-weight: bold; }
          .label-section { border-bottom: 1px solid #000; padding: 8px 0; font-size: 0.85rem; line-height: 1.4; }
          .label-barcode { text-align: center; font-family: monospace; font-size: 1.25rem; font-weight: bold; letter-spacing: 4px; padding: 8px 0; background: #f0f0f0; margin: 6px 0; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="shipping-label-card">
          <div class="label-header">
            <span>KASHVI FASHIONS</span>
            <span>INDIA POST SPEED POST</span>
          </div>
          <div class="label-barcode">||| ${ship.tracking_number || order.id} |||</div>
          <div class="label-section">
            <strong>SHIP TO:</strong><br>
            ${cust.name || 'Customer'}<br>
            ${ship.address || ''}<br>
            ${ship.city || ''} - ${ship.pincode || ''}<br>
            Phone: <strong>${cust.phone || '-'}</strong>
          </div>
          <div class="label-section">
            <strong>ORDER DETAILS:</strong><br>
            Items: ${itemsSummary || 'Standard Order'}<br>
            Payment: <strong>${pay.method || 'UPI'}</strong> | Total: <strong>₹ ${Number(order.total || 0).toLocaleString('en-IN')}</strong>
          </div>
          <div class="label-section" style="border-bottom:none; font-size:0.75rem;">
            <strong>RETURN / SENDER:</strong><br>
            Kashvi Fashions, Main Road, Kakinada, AP - 533001
          </div>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // 5. WhatsApp Update Sender
  const sendWhatsAppUpdate = (order: OrderRecord) => {
    const cust = order.customer || {};
    const ship = order.shipping || {};
    const phone = (cust.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('91') ? phone : `91${phone}`;

    let trackingMsg = '';
    if (order.status === 'dispatched' && ship.tracking_number) {
      trackingMsg = `\n🚀 *Courier:* India Post\n📦 *Tracking Number:* ${ship.tracking_number}\n🔗 *Track Here:* https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
    }

    const text = encodeURIComponent(
      `Hello ${cust.name || 'Customer'},\n\n*Kashvi Fashions* Order Update:\n\n📦 *Order ID:* ${order.id}\n📊 *Status:* ${formatStatusName(order.status)}\n💰 *Total:* ₹ ${Number(order.total || 0).toLocaleString('en-IN')}${trackingMsg}\n\nThank you for shopping with us!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    let list = orders;
    if (currentFilter !== 'all') {
      list = list.filter((o) => (o.status || '').toLowerCase() === currentFilter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((o) => {
        const c = o.customer || {};
        return (
          o.id.toLowerCase().includes(q) ||
          (c.name || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [orders, currentFilter, searchQuery]);

  return (
    <div className="space-y-4 font-sans text-xs select-none">
      
      {/* Top Header & Search Bar */}
      <div className="p-4 rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
            <Package className="w-4.5 h-4.5 text-[#00d9ff]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Orders Command Deck</span>
              <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 text-[9.5px] font-mono">
                {orders.length} Total
              </span>
            </h2>
            <span className="text-[10px] text-[#8b9bb4]">
              Live 8-Stage Pipeline with PIN Rollback & India Post Dispatch
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, Customer Name, Phone..."
              className="w-full pl-8 pr-3 py-2 bg-[#0a0e17] rounded-xl text-white text-[11px] outline-none border border-white/10 focus:border-[#00d9ff] placeholder:text-[#8b9bb4]/50"
            />
            <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="button"
            onClick={loadOrders}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-[#00d9ff] cursor-pointer transition-colors"
            title="Refresh Live Orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Pipeline Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => setCurrentFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-mono text-[10.5px] font-bold border transition-all cursor-pointer shrink-0 ${
            currentFilter === 'all'
              ? 'bg-[#6d4aff] text-white border-[#6d4aff] shadow-md shadow-[#6d4aff]/40'
              : 'bg-[#101628] text-[#8b9bb4] border-white/10 hover:text-white'
          }`}
        >
          All ({orders.length})
        </button>

        {PIPELINE_STAGES.map((st) => {
          const count = orders.filter((o) => (o.status || '').toLowerCase() === st.key).length;
          const isActive = currentFilter === st.key;
          return (
            <button
              key={st.key}
              type="button"
              onClick={() => setCurrentFilter(st.key)}
              className={`px-3 py-1.5 rounded-xl font-mono text-[10.5px] font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-white/15 text-white border-[#00d9ff] shadow-md shadow-[#00d9ff]/20'
                  : 'bg-[#101628] text-[#8b9bb4] border-white/10 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }} />
              <span>{st.label}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-black/40 text-white/80">
                {count}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setCurrentFilter('cancelled')}
          className={`px-3 py-1.5 rounded-xl font-mono text-[10.5px] font-bold border transition-all cursor-pointer shrink-0 ${
            currentFilter === 'cancelled'
              ? 'bg-[#ff6b6b]/20 text-[#ff6b6b] border-[#ff6b6b]/50'
              : 'bg-[#101628] text-[#8b9bb4] border-white/10 hover:text-white'
          }`}
        >
          Cancelled ({orders.filter((o) => o.status === 'cancelled').length})
        </button>
      </div>

      {/* Orders Table View */}
      <div className="rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#0a0e17]/80 text-[#8b9bb4] font-mono text-[9.5px] uppercase tracking-wider">
                <th className="p-3.5">Order ID & Date</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Items</th>
                <th className="p-3.5">Amount & Pay</th>
                <th className="p-3.5">Current Stage</th>
                <th className="p-3.5">Pipeline Action</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#8b9bb4]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff] mb-2" />
                    Loading live orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#8b9bb4] italic">
                    No orders found in this stage.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const cust = order.customer || {};
                  const pay = order.payment || {};
                  const items = order.items || [];
                  const currentStatus = order.status || 'new';

                  return (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Order ID & Date */}
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-white text-[11px] block">
                          {order.id}
                        </span>
                        <span className="text-[9.5px] text-[#8b9bb4] font-mono flex items-center gap-1 mt-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="p-3.5">
                        <span className="font-bold text-white block">
                          {cust.name || 'Customer'}
                        </span>
                        <span className="text-[9.5px] text-[#8b9bb4] font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5 text-[#00d9ff]" />
                          {cust.phone || '-'}
                        </span>
                      </td>

                      {/* Items */}
                      <td className="p-3.5 font-mono text-[#00d9ff] font-bold">
                        {items.length} Items
                      </td>

                      {/* Amount & Pay */}
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-[#00ff9d] text-[11px] block">
                          ₹ {Number(order.total || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9px] text-[#8b9bb4] font-mono">
                          {pay.method || 'UPI'} ({pay.status || 'Pending'})
                        </span>
                      </td>

                      {/* Current Stage Badge */}
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-xl text-[9.5px] font-mono font-bold border border-white/10 bg-white/5 text-white inline-block">
                          {formatStatusName(currentStatus)}
                        </span>
                      </td>

                      {/* Pipeline Action Select */}
                      <td className="p-3.5">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStageChange(order.id, e.target.value, currentStatus)}
                          className="px-2.5 py-1.5 bg-[#0a0e17] rounded-xl text-white font-mono text-[10.5px] font-bold outline-none border border-white/15 focus:border-[#00d9ff] cursor-pointer [&>option]:bg-[#101628] [&>option]:text-white"
                        >
                          {PIPELINE_STAGES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#00d9ff]/20 text-[#8b9bb4] hover:text-[#00d9ff] cursor-pointer transition-colors"
                            title="View Order Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => printShippingLabel(order)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#00ff9d]/20 text-[#8b9bb4] hover:text-[#00ff9d] cursor-pointer transition-colors"
                            title="Print 4x6 Shipping Label"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => sendWhatsAppUpdate(order)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#25D366]/20 text-[#8b9bb4] hover:text-[#25D366] cursor-pointer transition-colors"
                            title="Send WhatsApp Update"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ORDER DETAILS & VISUAL STEPPER */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#101628] border border-white/10 rounded-3xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 relative shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2 font-mono">
                  <span>Order: {selectedOrder.id}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40">
                    {formatStatusName(selectedOrder.status)}
                  </span>
                </h3>
                <span className="text-[10px] text-[#8b9bb4]">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Stepper Nodes */}
            <div className="p-3 bg-[#0a0e17] rounded-2xl border border-white/10 overflow-x-auto custom-scrollbar">
              <div className="flex items-center justify-between min-w-[560px] relative">
                {PIPELINE_STAGES.map((st, idx) => {
                  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === selectedOrder.status);
                  const isCompleted = currentIdx > idx;
                  const isCurrent = currentIdx === idx;

                  return (
                    <div key={st.key} className="flex flex-col items-center flex-1 relative z-10">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10.5px] font-bold transition-all ${
                          isCompleted
                            ? 'bg-[#00ff9d] text-neutral-950 shadow-[0_0_10px_#00ff9d]'
                            : isCurrent
                            ? 'bg-[#00d9ff] text-neutral-950 ring-4 ring-[#00d9ff]/30 font-extrabold'
                            : 'bg-white/10 text-[#8b9bb4]'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[9px] mt-1 text-center font-mono ${
                          isCurrent ? 'text-[#00d9ff] font-bold' : isCompleted ? 'text-white' : 'text-[#8b9bb4]'
                        }`}
                      >
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer & Shipping Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-[#0a0e17] border border-white/10 space-y-1">
                <span className="text-[10px] font-mono text-[#00d9ff] uppercase font-bold block flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Customer Info
                </span>
                <span className="text-white font-bold block">{selectedOrder.customer?.name || 'Customer'}</span>
                <span className="text-[#8b9bb4] block font-mono">{selectedOrder.customer?.phone || '-'}</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#0a0e17] border border-white/10 space-y-1">
                <span className="text-[10px] font-mono text-[#00ff9d] uppercase font-bold block flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Shipping Address
                </span>
                <span className="text-white text-[10.5px] block leading-relaxed">
                  {selectedOrder.shipping?.address || '-'}, {selectedOrder.shipping?.city || ''} -{' '}
                  {selectedOrder.shipping?.pincode || ''}
                </span>
                {selectedOrder.shipping?.tracking_number && (
                  <span className="text-[9.5px] text-[#38bdf8] font-mono block mt-1">
                    India Post AWB: <strong>{selectedOrder.shipping.tracking_number}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#0a0e17] text-[#8b9bb4] font-mono text-[9px] uppercase border-b border-white/10">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[10.5px]">
                  {(selectedOrder.items || []).map((itm, i) => (
                    <tr key={i} className="text-white">
                      <td className="p-2.5">
                        <strong className="block">{itm.name}</strong>
                        <small className="text-[#8b9bb4]">{itm.variant_title || ''}</small>
                      </td>
                      <td className="p-2.5 text-center text-[#00d9ff]">{itm.quantity || 1}</td>
                      <td className="p-2.5 text-right">₹ {itm.price}</td>
                      <td className="p-2.5 text-right font-bold text-[#00ff9d]">
                        ₹ {(itm.quantity || 1) * itm.price}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Grand Total */}
            <div className="p-3 rounded-2xl bg-[#0a0e17] border border-white/10 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-[#8b9bb4] block font-mono">Payment Mode</span>
                <span className="text-white font-bold text-xs">
                  {selectedOrder.payment?.method || 'UPI'} ({selectedOrder.payment?.status || 'Pending'})
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#8b9bb4] block font-mono">Total Payable</span>
                <span className="text-base font-extrabold text-[#00ff9d] font-mono">
                  ₹ {Number(selectedOrder.total || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => printShippingLabel(selectedOrder)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#00ff9d]" />
                <span>Print Label</span>
              </button>
              <button
                type="button"
                onClick={() => sendWhatsAppUpdate(selectedOrder)}
                className="px-4 py-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SECURITY PIN MODAL FOR STEP ROLLBACK */}
      {pendingRollback && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#101628] border border-[#ff6b6b]/40 rounded-3xl p-5 max-w-sm w-full space-y-3.5 relative shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#ff6b6b]">
              <Lock className="w-5 h-5" />
              <h3 className="font-extrabold text-sm text-white">Pipeline Rollback PIN</h3>
            </div>

            <p className="text-[10.5px] text-[#8b9bb4] leading-relaxed">
              Authorisation required to move Order <strong className="text-white">{pendingRollback.orderId}</strong>{' '}
              back from &quot;{formatStatusName(pendingRollback.prevStatus)}&quot; to &quot;
              {formatStatusName(pendingRollback.targetStatus)}&quot;.
            </p>

            {pinError && (
              <div className="p-2 rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 text-[#ff6b6b] text-[10px]">
                {pinError}
              </div>
            )}

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <input
                type="password"
                autoFocus
                placeholder="Enter 4-digit Store PIN..."
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0e17] rounded-xl text-center text-white text-base font-mono tracking-widest outline-none border border-white/10 focus:border-[#ff6b6b]"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPendingRollback(null)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-[#8b9bb4] rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!enteredPin.trim()}
                  className="flex-1 py-2 bg-[#ff6b6b] hover:bg-[#ff6b6b]/90 text-white rounded-xl font-bold cursor-pointer disabled:opacity-40 shadow-lg shadow-[#ff6b6b]/30"
                >
                  Confirm Rollback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INDIA POST TRACKING NUMBER ENTRY */}
      {dispatchOrderId && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#101628] border border-[#38bdf8]/40 rounded-3xl p-5 max-w-sm w-full space-y-3.5 relative shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#38bdf8]">
              <Truck className="w-5 h-5" />
              <h3 className="font-extrabold text-sm text-white">India Post Dispatch</h3>
            </div>

            <p className="text-[10.5px] text-[#8b9bb4]">
              Enter Speed Post / Parcel tracking number for Order <strong className="text-white">{dispatchOrderId}</strong>:
            </p>

            <form onSubmit={handleConfirmDispatch} className="space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="e.g. EU123456789IN"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0e17] rounded-xl text-white font-mono text-[11px] outline-none border border-white/10 focus:border-[#38bdf8]"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDispatchOrderId(null)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-[#8b9bb4] rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!trackingNumber.trim()}
                  className="flex-1 py-2 bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-neutral-950 font-extrabold rounded-xl cursor-pointer disabled:opacity-40"
                >
                  Mark Dispatched
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CANCEL & REFUND UTR ENTRY */}
      {refundOrderId && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#101628] border border-[#ff6b6b]/40 rounded-3xl p-5 max-w-sm w-full space-y-3.5 relative shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#ff6b6b]">
              <RotateCcw className="w-5 h-5" />
              <h3 className="font-extrabold text-sm text-white">Cancel & Refund UTR</h3>
            </div>

            <p className="text-[10.5px] text-[#8b9bb4]">
              Enter Bank / UPI Refund UTR number for Order <strong className="text-white">{refundOrderId}</strong>:
            </p>

            <form onSubmit={handleConfirmRefund} className="space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="Enter 12-digit UTR / Reference No..."
                value={refundUtr}
                onChange={(e) => setRefundUtr(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0e17] rounded-xl text-white font-mono text-[11px] outline-none border border-white/10 focus:border-[#ff6b6b]"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRefundOrderId(null)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-[#8b9bb4] rounded-xl font-bold cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!refundUtr.trim()}
                  className="flex-1 py-2 bg-[#ff6b6b] hover:bg-[#ff6b6b]/90 text-white font-extrabold rounded-xl cursor-pointer disabled:opacity-40 shadow-lg shadow-[#ff6b6b]/30"
                >
                  Confirm Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}