import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Package,
  X,
  BellRing,
  ShoppingCart,
  MessageCircle,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { OrderRecord, AbandonedCartUser, AdminStaffUser } from '../types';

interface AdminDashboardProps {
  currentUser: AdminStaffUser | null;
  onNewOrderNotice: (ord: OrderRecord) => void;
  syncTrigger: number;
}

export default function AdminDashboard({
  currentUser,
  onNewOrderNotice,
  syncTrigger
}: AdminDashboardProps) {
  const [loading, setLoading] = useState(true);

  const [todaySales, setTodaySales] = useState<number>(0);
  const [newOrdersCount, setNewOrdersCount] = useState<number>(0);
  const [totalOrdersToday, setTotalOrdersToday] = useState<number>(0);
  const [aov, setAov] = useState<number>(0);

  const [tableTab, setTableTab] = useState<'orders' | 'abandoned'>('orders');
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCartUser[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<string>('');

  const role = currentUser?.role || 'operations';
  const canEdit = role === 'admin' || role === 'manager';
  const canDelete = role === 'admin';

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  };

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && orders) {
        setRecentOrders(orders);

        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(
          (o) => o.created_at && o.created_at.startsWith(today)
        );

        const sum = todayOrders.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
        setTodaySales(sum);
        setTotalOrdersToday(todayOrders.length);
        setAov(todayOrders.length > 0 ? Math.round(sum / todayOrders.length) : 0);

        const freshOrders = orders.filter(
          (o) => o.order_status === 'new' || o.order_status === 'pending' || !o.order_status
        ).length;
        setNewOrdersCount(freshOrders);
      }

      const { data: cartsData } = await supabase
        .from('cart_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (cartsData && cartsData.length > 0) {
        const mapped = cartsData.map((c: any) => ({
          id: c.id,
          customer_name: c.customer_name || 'Anonymous Shopper',
          customer_phone: c.phone || 'N/A',
          items_count: Array.isArray(c.items) ? c.items.length : 1,
          cart_value: Number(c.total_amount) || 2850,
          last_active: c.updated_at || new Date().toISOString(),
          items_preview: Array.isArray(c.items)
            ? c.items.map((i: any) => i.name).slice(0, 2).join(', ')
            : 'Saree / Jewellery Items'
        }));
        setAbandonedCarts(mapped);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
  }, [syncTrigger]);

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel('kfmama-realtime-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as OrderRecord;
          playChime();
          setRecentOrders((prev) => [newOrder, ...prev]);
          setNewOrdersCount((c) => c + 1);
          setTotalOrdersToday((c) => c + 1);
          setTodaySales((s) => s + (Number(newOrder.total_amount) || 0));
          onNewOrderNotice(newOrder);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateOrderStatus = async (orderId: string) => {
    if (!canEdit) return;

    try {
      await supabase
        .from('orders')
        .update({ order_status: selectedNewStatus })
        .eq('id', orderId);

      setRecentOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, order_status: selectedNewStatus } : o))
      );

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, order_status: selectedNewStatus });
      }

      setEditingOrderId(null);
    } catch (e) {
      console.error('Status update failed:', e);
    }
  };

  const handleDeleteOrder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canDelete) return;

    if (!confirm(`Permanently delete order ${orderId}?`)) return;

    try {
      await supabase.from('orders').delete().eq('id', orderId);
      setRecentOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Helper to extract location details from address
  const getLocationDetails = (ord: OrderRecord) => {
    const raw = ord.shipping_address || '';
    const pincode = ord.pincode || (raw.match(/\b\d{6}\b/) ? raw.match(/\b\d{6}\b/)![0] : '533003');
    
    // Attempt to extract city/state
    const parts = raw.split(',').map((p) => p.trim());
    let locationText = 'Kakinada, AP';
    if (parts.length >= 2) {
      locationText = `${parts[parts.length - 2]}, ${parts[parts.length - 1].replace(pincode, '').replace('-', '').trim()}`;
    }

    return {
      pincode,
      locationText: locationText.length > 25 ? locationText.slice(0, 25) + '...' : locationText
    };
  };

  return (
    <div className="space-y-4.5 animate-in fade-in duration-200 select-none font-sans">
      
      {/* 1. Compact Metric Bento Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl p-3.5 border border-[#ffccd5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff4d6d]">
              New Orders
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-[#ff4d6d] flex items-center justify-center">
              <BellRing className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <div className="text-xl font-bold text-[#ff4d6d] tracking-tight">
              {newOrdersCount}
            </div>
            <span className="text-[9.5px] font-semibold text-neutral-500">
              Awaiting Packing
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-[#e2eae6] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4d6960]">
              Today's Sales
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#e4efe9] text-[#0b3b2c] flex items-center justify-center">
              <IndianRupee className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <div className="text-xl font-bold text-[#0b3b2c] tracking-tight">
              ₹{todaySales.toLocaleString('en-IN')}
            </div>
            <span className="text-[9.5px] font-bold text-emerald-700">
              Verified Today
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-[#e2eae6] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4d6960]">
              In Carts
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-[#c6933a] flex items-center justify-center">
              <ShoppingCart className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <div className="text-xl font-bold text-[#c6933a] tracking-tight">
              {abandonedCarts.length} <span className="text-xs font-normal text-neutral-400">Users</span>
            </div>
            <span className="text-[9.5px] font-bold text-amber-700">
              Recovery Leads
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-[#e2eae6] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4d6960]">
              Avg. Basket (AOV)
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#f0f4f2] text-[#0b3b2c] flex items-center justify-center">
              <Package className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <div className="text-xl font-bold text-[#0b3b2c] tracking-tight">
              ₹{aov.toLocaleString('en-IN')}
            </div>
            <span className="text-[9.5px] font-semibold text-neutral-500">
              {totalOrdersToday} Placed
            </span>
          </div>
        </div>
      </div>

      {/* 2. SIDE-BY-SIDE MAIN WORKSPACE: Live Orders Table (Left 70%) & Live Customer Location Feed (Right 30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT 8 COLUMNS: LIVE ORDERS TABLE */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#e2eae6] shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#edf2ef] flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-0.5 bg-[#f0f4f2] rounded-full">
              <button
                type="button"
                onClick={() => setTableTab('orders')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tableTab === 'orders'
                    ? 'bg-[#0b3b2c] text-white shadow-xs'
                    : 'text-[#4d6960] hover:text-[#0b3b2c]'
                }`}
              >
                <ShoppingBag className="w-3 h-3" />
                <span>Live Orders ({recentOrders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setTableTab('abandoned')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tableTab === 'abandoned'
                    ? 'bg-[#c6933a] text-white shadow-xs'
                    : 'text-[#4d6960] hover:text-[#c6933a]'
                }`}
              >
                <ShoppingCart className="w-3 h-3" />
                <span>Abandoned ({abandonedCarts.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
              <span>Role: <strong className="uppercase text-[#0b3b2c]">{role}</strong></span>
            </div>
          </div>

          {/* Table Tab 1: Orders */}
          {tableTab === 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#fbfcfc] text-[#809c93] uppercase text-[9px] font-bold tracking-wider border-b border-[#edf2ef]">
                  <tr>
                    <th className="py-2.5 px-4">Order ID</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Payment</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2ef]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400 font-medium">
                        Syncing store orders...
                      </td>
                    </tr>
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400 font-medium">
                        No orders placed yet.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((ord) => {
                      const isNew = ord.order_status === 'new' || ord.order_status === 'pending' || !ord.order_status;
                      return (
                        <tr
                          key={ord.id}
                          onClick={() => setSelectedOrder(ord)}
                          className={`hover:bg-[#f4f7f5] transition-colors cursor-pointer group ${
                            isNew ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 font-mono font-bold text-[#0c2b22] group-hover:text-[#ff4d6d]">
                            <div className="flex items-center gap-1.5">
                              {isNew && <span className="w-1.5 h-1.5 rounded-full bg-[#ff4d6d] animate-ping" />}
                              <span>{ord.id}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-[#0c2b22] leading-tight">{ord.customer_name || 'Guest'}</div>
                            <div className="text-[9.5px] text-neutral-400 font-mono">{ord.customer_phone}</div>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-[#0b3b2c] text-xs">
                            ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              ord.payment_status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {ord.payment_status || 'PENDING'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize border ${
                              isNew
                                ? 'bg-rose-100 text-[#ff4d6d] border-rose-200'
                                : 'bg-[#f0f4f2] text-[#0b3b2c] border-[#dce6e1]'
                            }`}>
                              {ord.order_status || 'New'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-[10.5px] font-bold text-[#0b3b2c] group-hover:text-[#ff4d6d]">
                                View
                              </span>

                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingOrderId(ord.id);
                                    setSelectedNewStatus(ord.order_status || 'new');
                                  }}
                                  className="p-1 rounded-md hover:bg-neutral-200 text-neutral-500 transition-colors"
                                  title="Edit Status"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteOrder(ord.id, e)}
                                  className="p-1 rounded-md hover:bg-rose-100 text-rose-600 transition-colors"
                                  title="Delete Order"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Tab 2: Abandoned */}
          {tableTab === 'abandoned' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#fbfcfc] text-[#809c93] uppercase text-[9px] font-bold tracking-wider border-b border-[#edf2ef]">
                  <tr>
                    <th className="py-2.5 px-4">Cart ID</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Items</th>
                    <th className="py-2.5 px-4">Value</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2ef]">
                  {abandonedCarts.map((cart) => (
                    <tr key={cart.id} className="hover:bg-[#fcfaf4] transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#0c2b22]">{cart.id}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-[#0c2b22]">{cart.customer_name}</div>
                        <div className="text-[9.5px] text-neutral-400 font-mono">{cart.customer_phone}</div>
                      </td>
                      <td className="py-2.5 px-4 text-[11px] text-neutral-700 truncate max-w-xs">
                        {cart.items_preview}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-[#c6933a]">
                        ₹{cart.cart_value.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <a
                          href={`https://wa.me/91${cart.customer_phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(cart.customer_name)},%20we%20noticed%20you%20left%20items%20in%20your%20Kashvi%20cart!`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-xs transition-colors"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Ping</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT 4 COLUMNS: LIVE LOCATION & ORDER FEED (ఎవరు ఎక్కడి నుంచి ఆర్డర్ చేస్తున్నారు) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#e2eae6] shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#edf2ef] flex items-center justify-between bg-[#fbfcfc]">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0b3b2c]">
                Live Geographic Feed
              </h3>
            </div>
            <span className="text-[9.5px] font-mono text-neutral-400">
              Realtime Dispatch
            </span>
          </div>

          <div className="divide-y divide-[#edf2ef] overflow-y-auto max-h-[440px] flex-1">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400 space-y-1">
                <Compass className="w-7 h-7 mx-auto text-neutral-300 animate-spin" />
                <p>Awaiting new location checkouts...</p>
              </div>
            ) : (
              recentOrders.map((ord) => {
                const geo = getLocationDetails(ord);
                return (
                  <div
                    key={'geo_' + ord.id}
                    onClick={() => setSelectedOrder(ord)}
                    className="p-3.5 hover:bg-[#f8faf9] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-[#0c2b22] group-hover:text-[#ff4d6d] leading-tight">
                            {ord.customer_name || 'Direct Shopper'}
                          </h4>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {ord.id}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-bold text-[#0b3b2c]">
                        ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="mt-2 bg-[#f4f7f5] rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[10.5px]">
                      <div className="flex items-center gap-1 text-[#0b3b2c] font-semibold truncate">
                        <Compass className="w-3 h-3 text-[#c6933a] shrink-0" />
                        <span className="truncate">{geo.locationText}</span>
                      </div>
                      <span className="font-mono font-bold text-neutral-600 shrink-0">
                        {geo.pincode}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2.5 border-t border-[#edf2ef] bg-[#fbfcfc] text-[10px] text-center text-neutral-400 font-medium">
            ⚡ Instant sync whenever customer places order
          </div>
        </div>

      </div>

      {/* Edit Status Modal */}
      {editingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-[#dce6e1] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#0b3b2c]">Update Status</h3>
              <button
                type="button"
                onClick={() => setEditingOrderId(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <select
              value={selectedNewStatus}
              onChange={(e) => setSelectedNewStatus(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#dce6e1] text-xs font-semibold text-[#0c2b22] bg-[#f8faf9] outline-none"
            >
              <option value="new">New (Awaiting)</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingOrderId(null)}
                className="px-3 py-1 rounded-full text-xs text-neutral-500 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOrderStatus(editingOrderId)}
                className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#0b3b2c] text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-in Order Details Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          <div
            onClick={() => setSelectedOrder(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-2xs cursor-pointer"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-8">
            <div className="w-screen max-w-sm bg-white shadow-2xl flex flex-col border-l border-[#dce6e1]">
              <div className="p-4 border-b border-[#edf2ef] flex items-center justify-between bg-[#f8faf9]">
                <div>
                  <span className="text-[9px] font-bold text-[#809c93] uppercase tracking-wider block">
                    Order Details
                  </span>
                  <h3 className="font-mono font-bold text-xs text-[#0b3b2c]">
                    {selectedOrder.id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
                <div className="bg-[#f0f4f2] p-3 rounded-xl border border-[#dce6e1] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-[#0c2b22]">{selectedOrder.customer_name}</div>
                      <div className="text-neutral-500 text-[11px] font-mono">{selectedOrder.customer_phone}</div>
                    </div>
                    <a
                      href={`https://wa.me/91${selectedOrder.customer_phone?.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(selectedOrder.customer_name || 'Customer')},%20thank%20you%20for%20your%20Kashvi%20order%20(${selectedOrder.id})!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      title="Direct WhatsApp Ping"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  {selectedOrder.shipping_address && (
                    <div className="pt-1.5 border-t border-[#dce6e1]/70 text-[10px] text-[#4d6960]">
                      <strong>Address:</strong> {selectedOrder.shipping_address}
                    </div>
                  )}
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#dce6e1] flex justify-between items-center">
                  <span className="text-xs font-bold text-[#0b3b2c]">Total Paid:</span>
                  <span className="text-sm font-bold text-[#0b3b2c]">
                    ₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}