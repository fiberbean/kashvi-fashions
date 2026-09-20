import React, { useEffect, useState, useMemo } from 'react';
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
  Download,
  Calendar,
  Sparkles,
  Flame,
  Award,
  Volume2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { OrderRecord, AbandonedCartUser, AdminStaffUser } from '../types';

interface AdminDashboardProps {
  currentUser: AdminStaffUser | null;
  onNewOrderNotice: (ord: OrderRecord) => void;
  syncTrigger: number;
}

type TimeRangeFilter =
  | 'today'
  | 'yesterday'
  | '3days'
  | '1week'
  | 'half_month'
  | 'full_month'
  | '3months'
  | 'half_year'
  | 'year';

interface TopItemMetric {
  name: string;
  image?: string;
  unitsSold: number;
  totalRevenue: number;
  ordersCount: number;
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

  const [itemTimeFilter, setItemTimeFilter] = useState<TimeRangeFilter>('today');
  const [audioReady, setAudioReady] = useState<boolean>(false);

  const role = currentUser?.role || 'operations';
  const canEdit = role === 'admin' || role === 'manager';
  const canDelete = role === 'admin';

  const playAlertSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain1.gain.setValueAtTime(0.4, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);

      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1174.66, ctx.currentTime);
          gain2.gain.setValueAtTime(0.5, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.6);
        } catch (e) {
          console.warn('Secondary audio tone error:', e);
        }
      }, 180);
    } catch (err) {
      console.warn('Audio play restricted by browser:', err);
    }
  };

  const triggerBrowserNotification = (ord: OrderRecord) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const items = Array.isArray(ord.items) ? ord.items : [];
        const firstItem = items[0] || null;
        const itemName = firstItem ? firstItem.name : 'Exclusive Product';
        const itemQty = firstItem ? firstItem.qty || 1 : 1;
        const extraItems = items.length > 1 ? ` (+${items.length - 1} more products)` : '';

        new Notification(`🚨 NEW ORDER: ${itemName}`, {
          body: `Qty: ${itemQty} ${firstItem?.size ? `• Size: ${firstItem.size}` : ''}${extraItems}\nCustomer: ${ord.customer_name || 'Direct Customer'} • ${ord.id}`,
          icon: firstItem?.image || '/favicon.ico',
          requireInteraction: true
        });
      } catch (e) {
        console.warn('Desktop notification trigger failed:', e);
      }
    }
  };

  const handleEnableAlerts = () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    playAlertSound();
    setAudioReady(true);
  };

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && orders) {
        setRecentOrders(orders);

        const todayStr = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(
          (o) => o.created_at && o.created_at.startsWith(todayStr)
        );

        const sum = todayOrders.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
        setTodaySales(sum);
        setTotalOrdersToday(todayOrders.length);
        setAov(todayOrders.length > 0 ? Math.round(sum / todayOrders.length) : 0);

        const freshOrders = orders.filter(
          (o) => o.order_status === 'new' || o.order_status === 'pending' || !o.order_status
        ).length;
        setNewOrdersCount(freshOrders);

        // Pending/Initiated orders as leads (404 cart_sessions table avoidance)
        const pendingLeads = orders
          .filter((o) => o.payment_status === 'payment_pending' || o.order_status === 'payment_pending')
          .slice(0, 10)
          .map((o) => ({
            id: o.id,
            customer_name: o.customer_name || 'Customer',
            customer_phone: o.customer_phone || 'N/A',
            items_count: Array.isArray(o.items) ? o.items.length : 1,
            cart_value: Number(o.total_amount) || 0,
            last_active: o.created_at || new Date().toISOString(),
            items_preview: Array.isArray(o.items)
              ? o.items.map((i: any) => i.name).slice(0, 2).join(', ')
              : 'Saree / Jewellery Item'
          }));
        setAbandonedCarts(pendingLeads);
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

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel('kfmama-realtime-orders-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as OrderRecord;
          playAlertSound();
          triggerBrowserNotification(newOrder);
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

  const topSellingItems = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const filteredOrders = recentOrders.filter((ord) => {
      if (!ord.created_at) return false;
      const orderTime = new Date(ord.created_at).getTime();

      switch (itemTimeFilter) {
        case 'today':
          return orderTime >= todayStart;
        case 'yesterday': {
          const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
          return orderTime >= yesterdayStart && orderTime < todayStart;
        }
        case '3days': {
          const threeDaysAgo = todayStart - 3 * 24 * 60 * 60 * 1000;
          return orderTime >= threeDaysAgo;
        }
        case '1week': {
          const oneWeekAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
          return orderTime >= oneWeekAgo;
        }
        case 'half_month': {
          const fifteenDaysAgo = todayStart - 15 * 24 * 60 * 60 * 1000;
          return orderTime >= fifteenDaysAgo;
        }
        case 'full_month': {
          const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;
          return orderTime >= thirtyDaysAgo;
        }
        case '3months': {
          const ninetyDaysAgo = todayStart - 90 * 24 * 60 * 60 * 1000;
          return orderTime >= ninetyDaysAgo;
        }
        case 'half_year': {
          const halfYearAgo = todayStart - 180 * 24 * 60 * 60 * 1000;
          return orderTime >= halfYearAgo;
        }
        case 'year': {
          const oneYearAgo = todayStart - 365 * 24 * 60 * 60 * 1000;
          return orderTime >= oneYearAgo;
        }
        default:
          return true;
      }
    });

    const itemMap = new Map<string, TopItemMetric>();

    filteredOrders.forEach((ord) => {
      if (Array.isArray(ord.items) && ord.items.length > 0) {
        ord.items.forEach((it: any) => {
          const name = it.name || 'Custom Product';
          const qty = Number(it.qty) || 1;
          const price = Number(it.price) || 0;
          const image = it.image || '';

          if (itemMap.has(name)) {
            const existing = itemMap.get(name)!;
            existing.unitsSold += qty;
            existing.totalRevenue += price * qty;
            existing.ordersCount += 1;
            if (!existing.image && image) existing.image = image;
          } else {
            itemMap.set(name, {
              name,
              image,
              unitsSold: qty,
              totalRevenue: price * qty,
              ordersCount: 1
            });
          }
        });
      } else {
        const name = 'Handcrafted Heritage Order';
        const qty = 1;
        const price = Number(ord.total_amount) || 0;

        if (itemMap.has(name)) {
          const existing = itemMap.get(name)!;
          existing.unitsSold += qty;
          existing.totalRevenue += price;
          existing.ordersCount += 1;
        } else {
          itemMap.set(name, {
            name,
            unitsSold: qty,
            totalRevenue: price,
            ordersCount: 1
          });
        }
      }
    });

    return Array.from(itemMap.values()).sort((a, b) => b.unitsSold - a.unitsSold);
  }, [recentOrders, itemTimeFilter]);

  const handleDownloadPDF = () => {
    const filterLabels: Record<TimeRangeFilter, string> = {
      today: 'Today',
      yesterday: 'Yesterday',
      '3days': 'Last 3 Days',
      '1week': 'One Week (7 Days)',
      half_month: 'Half Month (15 Days)',
      full_month: 'Full Month (30 Days)',
      '3months': 'Last 3 Months (90 Days)',
      half_year: 'Half Year (180 Days)',
      year: 'Full Year (365 Days)'
    };

    const printableWindow = window.open('', '_blank');
    if (!printableWindow) {
      alert('Pop-up blocked! Please allow pop-ups to print or download PDF.');
      return;
    }

    const rowsHtml = topSellingItems
      .map(
        (item, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb; font-size: 12px;">
        <td style="padding: 10px 12px; font-weight: bold; text-align: center; color: #667eea;">#${idx + 1}</td>
        <td style="padding: 10px 12px; font-weight: 600; color: #111827;">${item.name}</td>
        <td style="padding: 10px 12px; text-align: center; font-weight: bold; color: #ff6b6b;">${item.unitsSold} Units</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: #667eea;">₹${item.totalRevenue.toLocaleString('en-IN')}</td>
      </tr>
    `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kashvi Fashions Management System - Top Selling Items Report</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              padding: 30px;
              color: #1f2937;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #667eea;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .logo {
              font-family: serif;
              font-size: 22px;
              font-weight: 900;
              color: #667eea;
            }
            .sub {
              font-size: 11px;
              color: #6b7280;
              margin-top: 3px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th {
              background-color: #f3f4f6;
              color: #374151;
              padding: 10px 12px;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              border-bottom: 1px solid #d1d5db;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">KASHVI FASHIONS MANAGEMENT SYSTEM</div>
              <div class="sub">Top Selling Items Demand Report (${filterLabels[itemTimeFilter]})</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #4b5563;">
              <div><strong>Generated by:</strong> ${currentUser?.full_name || 'Admin'}</div>
              <div><strong>Date:</strong> ${new Date().toLocaleString('en-IN')}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">Rank</th>
                <th style="text-align: left;">Item Description</th>
                <th style="text-align: center; width: 120px;">Units Sold</th>
                <th style="text-align: right; width: 140px;">Gross Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="4" style="text-align:center; padding: 20px; color:#9ca3af;">No items sold during this period.</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: 10px; color: #9ca3af; text-align: center;">
            Kashvi Fashions Management System • Confidential Internal Sales Ledger
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printableWindow.document.open();
    printableWindow.document.write(htmlContent);
    printableWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-cyan-50 p-4 space-y-4.5 animate-in fade-in duration-200 select-none font-sans relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {!audioReady && (
        <div
          onClick={handleEnableAlerts}
          className="group relative bg-white/80 backdrop-blur-lg rounded-2xl p-4 border border-white/40 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-cyan-500/5 rounded-2xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
              <Volume2 className="w-5 h-5 text-purple-600 animate-bounce" />
              <span>Click to enable Order Dispatch Sound & Notifications 🔔</span>
            </div>
            <span className="text-xs font-bold bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-1.5 rounded-full shadow-lg group-hover:scale-110 transition-transform">
              Test Sound
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'New Orders', value: newOrdersCount, icon: BellRing, color: 'from-rose-500 to-pink-500', bg: 'bg-rose-50' },
          { label: "Today's Sales", value: `₹${todaySales.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'from-green-500 to-teal-500', bg: 'bg-green-50' },
          { label: 'In Carts', value: abandonedCarts.length, icon: ShoppingCart, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50' },
          { label: 'Avg Basket', value: `₹${aov.toLocaleString('en-IN')}`, icon: Package, color: 'from-purple-500 to-cyan-500', bg: 'bg-purple-50' },
        ].map((stat, idx) => (
          <div key={idx} className="group relative bg-white/80 backdrop-blur-lg rounded-2xl p-5 border border-white/40 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 rounded-2xl`}></div>
            <div className="relative flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 xl:col-span-8 group relative bg-white/80 backdrop-blur-lg rounded-2xl border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 pointer-events-none"></div>
          <div className="relative px-4 py-2.5 border-b border-white/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-0.5 bg-white/50 backdrop-blur-sm rounded-full">
              <button
                type="button"
                onClick={() => setTableTab('orders')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 group relative overflow-hidden ${
                  tableTab === 'orders' 
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg' 
                    : 'bg-white/50 text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Live Orders ({recentOrders.length})</span>
                {tableTab === 'orders' && <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 opacity-20 blur-md"></div>}
              </button>

              <button
                type="button"
                onClick={() => setTableTab('abandoned')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 group relative overflow-hidden ${
                  tableTab === 'abandoned' 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' 
                    : 'bg-white/50 text-gray-600 hover:text-amber-600 hover:bg-amber-50'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Abandoned ({abandonedCarts.length})</span>
                {tableTab === 'abandoned' && <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur-md"></div>}
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span>Role: <strong className="uppercase text-gray-700">{role}</strong></span>
            </div>
          </div>

          {tableTab === 'orders' && (
            <div className="overflow-x-auto relative">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-white/50 backdrop-blur-sm text-gray-500 uppercase text-[9px] font-bold tracking-wider border-b border-white/30">
                  <tr>
                    <th className="py-2.5 px-4">Order ID</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Payment</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/30">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">
                        Syncing store orders...
                      </td>
                    </tr>
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">
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
                          className={`relative cursor-pointer transition-all duration-300 hover:bg-purple-50/50 hover:shadow-inner ${isNew ? 'bg-rose-50/30 hover:bg-rose-100/50' : ''}`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:via-purple-500/2 group-hover:to-purple-500/5 transition-all duration-300"></div>
                          <td className="py-2.5 px-4 font-mono font-bold text-gray-800 group-hover:text-purple-600 relative z-10">
                            <div className="flex items-center gap-1.5">
                              {isNew && <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping"></span>}
                              <span>{ord.id}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 relative z-10">
                            <div className="font-bold text-gray-800 leading-tight">{ord.customer_name || 'Guest'}</div>
                            <div className="text-[9.5px] text-gray-400 font-mono">{ord.customer_phone}</div>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-gray-800 text-xs relative z-10">
                            ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-4 relative z-10">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              ord.payment_status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {ord.payment_status || 'PENDING'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 relative z-10">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize border ${
                              isNew
                                ? 'bg-rose-100 text-pink-600 border-rose-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                              {ord.order_status || 'New'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right relative z-10">
                            <div className="inline-flex items-center gap-2">
                              <span className="text-[10.5px] font-bold text-gray-700 group-hover:text-purple-600">
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
                                  className="p-2 rounded-lg hover:bg-purple-100 text-gray-500 hover:text-purple-600 transition-all duration-300 group-hover:scale-110"
                                  title="Edit Status"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteOrder(ord.id, e)}
                                  className="p-2 rounded-lg hover:bg-rose-100 text-gray-500 hover:text-rose-600 transition-all duration-300 group-hover:scale-110"
                                  title="Delete Order"
                                >
                                  <Trash2 className="w-4 h-4" />
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
            <div className="overflow-x-auto relative">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-white/50 backdrop-blur-sm text-gray-500 uppercase text-[9px] font-bold tracking-wider border-b border-white/30">
                  <tr>
                    <th className="py-2.5 px-4">Cart ID</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Items</th>
                    <th className="py-2.5 px-4">Value</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/30">
                  {abandonedCarts.map((cart) => (
                    <tr key={cart.id} className="hover:bg-amber-50