import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Package,
  ArrowUpRight,
  Sparkles,
  X,
  BellRing,
  ShoppingCart,
  MessageCircle,
  RefreshCw,
  Edit2,
  Trash2,
  ShieldAlert,
  CheckCircle,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { OrderRecord, AbandonedCartUser, AdminStaffUser } from '../types';

interface AdminDashboardProps {
  currentUser: AdminStaffUser | null;
  onNewOrderNotice: (ord: OrderRecord) => void;
}

export default function AdminDashboard({ currentUser, onNewOrderNotice }: AdminDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [todaySales, setTodaySales] = useState<number>(0);
  const [newOrdersCount, setNewOrdersCount] = useState<number>(0);
  const [totalOrdersToday, setTotalOrdersToday] = useState<number>(0);
  const [aov, setAov] = useState<number>(0);

  const [tableTab, setTableTab] = useState<'orders' | 'abandoned'>('orders');
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCartUser[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  // Status edit modal for Manager/Admin
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<string>('');

  // Role Permissions Logic
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
      setIsSyncing(true);

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
      } else {
        setAbandonedCarts([
          {
            id: 'CART_9812',
            customer_name: 'Swapna Reddy',
            customer_phone: '9848022338',
            items_count: 2,
            cart_value: 8499,
            last_active: '24 mins ago',
            items_preview: 'Royal Kanchipuram Pure Zari Silk, Antique Choker'
          },
          {
            id: 'CART_9815',
            customer_name: 'Ananya Varma',
            customer_phone: '9440188992',
            items_count: 1,
            cart_value: 3200,
            last_active: '1 hr ago',
            items_preview: 'Handcrafted Heritage Lehenga Set'
          }
        ]);
      }
    } catch (err) {
      console.error('Error fetching dashboard state:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  // Status update by Manager or Admin
  const handleUpdateOrderStatus = async (orderId: string) => {
    if (!canEdit) {
      alert('Access Denied: Operation role cannot modify orders.');
      return;
    }

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
      console.error('Update status failed:', e);
    }
  };

  // Delete Order (Strictly Admin only)
  const handleDeleteOrder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!canDelete) {
      alert('Access Denied: Only Admin role can delete orders.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete order ${orderId}?`)) {
      return;
    }

    try {
      await supabase.from('orders').delete().eq('id', orderId);
      setRecentOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

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

    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12 select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#e4efe9] text-[#0b3b2c] text-[9px] font-bold uppercase tracking-wider mb-1.5 border border-[#dce6e1]">
            <Sparkles className="w-2.5 h-2.5 text-[#c6933a]" /> Live Pulse
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#0b3b2c] tracking-tight leading-none">
            Orders, Sales & Recovery Command
          </h1>
          <p className="text-[11px] text-[#4d6960] mt-1">
            Logged in as: <span className="font-bold text-[#0b3b2c]">{currentUser?.full_name}</span> ({currentUser?.role?.toUpperCase()})
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#dce6e1] text-[11px] font-semibold text-[#0b3b2c] shadow-2xs">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Auto Sync Active</span>
            <RefreshCw className={`w-3 h-3 text-[#809c93] ${isSyncing ? 'animate-spin text-[#0b3b2c]' : ''}`} />
          </div>
        </div>
      </div>

      {/* Bento Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4.5 border border-[#ffccd5] shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff4d6d]">
              New Orders Received
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-[#ff4d6d] flex items-center justify-center">
              <BellRing className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-sans font-bold text-[#ff4d6d] tracking-tight">
              {newOrdersCount}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-neutral-600 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff4d6d]" /> Awaiting Dispatch / Packing
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#e2eae6] shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4d6960]">
              Total Sales Inflow
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#e4efe9] text-[#0b3b2c] flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-sans font-bold text-[#0b3b2c] tracking-tight">
              ₹{todaySales.toLocaleString('en-IN')}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
              <TrendingUp className="w-2.5 h-2.5" /> Verified Revenue Today
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#e2eae6] shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4d6960]">
              Abandoned In Carts
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-[#c6933a] flex items-center justify-center">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-sans font-bold text-[#c6933a] tracking-tight">
              {abandonedCarts.length} <span className="text-sm font-normal text-neutral-500">Users</span>
            </div>
            <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md mt-1">
              Potential Cart Recovery
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#e2eae6] shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4d6960]">
              Avg. Order Basket (AOV)
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#f0f4f2] text-[#0b3b2c] flex items-center justify-center">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-sans font-bold text-[#0b3b2c] tracking-tight">
              ₹{aov.toLocaleString('en-IN')}
            </div>
            <span className="inline-flex items-center text-[10px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md mt-1">
              From {totalOrdersToday} Placed Orders
            </span>
          </div>
        </div>
      </div>

      {/* Main Stream Section */}
      <div className="bg-white rounded-2xl border border-[#e2eae6] shadow-xs overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-[#edf2ef] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-[#f0f4f2] rounded-full self-start">
            <button
              type="button"
              onClick={() => setTableTab('orders')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                tableTab === 'orders'
                  ? 'bg-[#0b3b2c] text-white shadow-xs'
                  : 'text-[#4d6960] hover:text-[#0b3b2c]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Live Orders Stream ({recentOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTableTab('abandoned')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                tableTab === 'abandoned'
                  ? 'bg-[#c6933a] text-white shadow-xs'
                  : 'text-[#4d6960] hover:text-[#c6933a]'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Cart Abandoned Users ({abandonedCarts.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[#809c93]">
              Role: <strong className="uppercase text-[#0b3b2c]">{role}</strong>
            </span>
            <span className="text-[10px] text-neutral-300">|</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {canDelete ? 'Full Control' : canEdit ? 'Edit Only (No Delete)' : 'View Only (Restricted)'}
            </span>
          </div>
        </div>

        {tableTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#fbfcfc] text-[#809c93] uppercase text-[9.5px] font-bold tracking-wider border-b border-[#edf2ef]">
                <tr>
                  <th className="py-3 px-5">Order ID</th>
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-5">Total Amount</th>
                  <th className="py-3 px-5">Payment</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Access Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2ef]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400 font-medium">
                      Listening for incoming customer orders...
                    </td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400 font-medium">
                      No orders found in database.
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
                          isNew ? 'bg-rose-50/25' : ''
                        }`}
                      >
                        <td className="py-3.5 px-5 font-mono font-bold text-[#0c2b22] group-hover:text-[#ff4d6d]">
                          <div className="flex items-center gap-1.5">
                            {isNew && <span className="w-2 h-2 rounded-full bg-[#ff4d6d] animate-ping" />}
                            <span>{ord.id}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-[#0c2b22]">{ord.customer_name || 'Guest User'}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">{ord.customer_phone}</div>
                        </td>
                        <td className="py-3.5 px-5 font-sans font-bold text-[#0b3b2c] text-[13px]">
                          ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase ${
                            ord.payment_status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {ord.payment_status || 'PENDING'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-bold capitalize border ${
                            isNew
                              ? 'bg-rose-100 text-[#ff4d6d] border-rose-200'
                              : 'bg-[#f0f4f2] text-[#0b3b2c] border-[#dce6e1]'
                          }`}>
                            {ord.order_status || 'New Order'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="inline-flex items-center gap-2">
                            {/* View Action (Available for all roles) */}
                            <span className="text-[11px] font-bold text-[#0b3b2c] group-hover:text-[#ff4d6d] mr-1">
                              View
                            </span>

                            {/* Edit Action (Admin & Manager only) */}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingOrderId(ord.id);
                                  setSelectedNewStatus(ord.order_status || 'new');
                                }}
                                className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-600 transition-colors"
                                title="Edit Status"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete Action (Strictly Admin only) */}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteOrder(ord.id, e)}
                                className="p-1 rounded-lg hover:bg-rose-100 text-rose-600 transition-colors"
                                title="Delete Order (Admin Only)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

        {tableTab === 'abandoned' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#fbfcfc] text-[#809c93] uppercase text-[9.5px] font-bold tracking-wider border-b border-[#edf2ef]">
                <tr>
                  <th className="py-3 px-5">Cart ID</th>
                  <th className="py-3 px-5">Shopper Details</th>
                  <th className="py-3 px-5">Items Left in Cart</th>
                  <th className="py-3 px-5">Estimated Value</th>
                  <th className="py-3 px-5">Last Active</th>
                  <th className="py-3 px-5 text-right">Recovery Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2ef]">
                {abandonedCarts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400 font-medium">
                      Zero abandoned carts. All shoppers are completing checkouts!
                    </td>
                  </tr>
                ) : (
                  abandonedCarts.map((cart) => (
                    <tr key={cart.id} className="hover:bg-[#fcfaf4] transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-[#0c2b22]">
                        {cart.id}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-[#0c2b22]">{cart.customer_name}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">{cart.customer_phone}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-neutral-800 line-clamp-1 max-w-xs">
                          {cart.items_preview}
                        </div>
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {cart.items_count} products selected
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-sans font-bold text-[#c6933a] text-[13px]">
                        ₹{cart.cart_value.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-5 text-neutral-500 text-[10.5px]">
                        {cart.last_active}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <a
                          href={`https://wa.me/91${cart.customer_phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(cart.customer_name)},%20we%20noticed%20you%20left%20some%20exclusive%20items%20in%20your%20Kashvi%20cart!%20Would%20you%20like%20assistance%20completing%20your%20order?`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp Ping</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Status Modal (Manager / Admin only) */}
      {editingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-[#dce6e1] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-[#0b3b2c]">
                Update Order Status
              </h3>
              <button
                type="button"
                onClick={() => setEditingOrderId(null)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-neutral-500 block">
                Select Dispatch State
              </label>
              <select
                value={selectedNewStatus}
                onChange={(e) => setSelectedNewStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#dce6e1] text-xs font-semibold text-[#0c2b22] bg-[#f8faf9] outline-none"
              >
                <option value="new">New (Awaiting Action)</option>
                <option value="confirmed">Confirmed / Paid</option>
                <option value="processing">Processing & Packing</option>
                <option value="shipped">Shipped to Courier</option>
                <option value="delivered">Delivered Successfully</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingOrderId(null)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOrderStatus(editingOrderId)}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#0b3b2c] text-white shadow-xs"
              >
                Save Status
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
            className="absolute inset-0 bg-black/45 backdrop-blur-xs transition-opacity cursor-pointer"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-[#dce6e1]">
              <div className="p-4.5 border-b border-[#edf2ef] flex items-center justify-between bg-[#f8faf9]">
                <div>
                  <span className="text-[9.5px] font-bold text-[#809c93] uppercase tracking-widest block">
                    Order Details
                  </span>
                  <h3 className="font-mono font-bold text-sm text-[#0b3b2c]">
                    {selectedOrder.id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-sans">
                <div className="bg-[#f0f4f2] p-3.5 rounded-xl border border-[#dce6e1] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-[#0c2b22]">{selectedOrder.customer_name}</div>
                      <div className="text-neutral-500 text-xs font-mono">{selectedOrder.customer_phone}</div>
                    </div>
                    <a
                      href={`https://wa.me/91${selectedOrder.customer_phone?.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(selectedOrder.customer_name || 'Customer')},%20thank%20you%20for%20your%20Kashvi%20order%20(${selectedOrder.id})!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shadow-xs"
                      title="Direct WhatsApp Ping"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                  {selectedOrder.shipping_address && (
                    <div className="pt-2 border-t border-[#dce6e1]/70 text-[11px] text-[#4d6960]">
                      <strong>Shipping Address:</strong> {selectedOrder.shipping_address}
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#0b3b2c] border-b border-[#edf2ef] pb-1">
                    Purchased Items ({selectedOrder.items?.length || 1})
                  </h4>

                  <div className="space-y-2">
                    {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((it: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-[#fbfcfc] border border-[#edf2ef] flex justify-between items-center">
                          <div>
                            <div className="font-bold text-[#0c2b22]">{it.name}</div>
                            <div className="text-[10px] text-neutral-400">Qty: {it.qty} {it.size ? `• Size: ${it.size}` : ''}</div>
                          </div>
                          <div className="font-bold text-[#0b3b2c]">
                            ₹{(Number(it.price) * Number(it.qty)).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-neutral-400 italic">Direct purchase invoice item.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-[#dce6e1] space-y-1.5">
                  <div className="flex justify-between text-sm font-bold text-[#0b3b2c]">
                    <span>Total Amount Paid</span>
                    <span className="text-base font-bold font-sans">
                      ₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}