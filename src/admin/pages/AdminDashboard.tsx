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
  Volume2,
  Activity,
  ArrowUpRight,
  ShieldAlert
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
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 12px;">
        <td style="padding: 12px 14px; font-weight: bold; text-align: center; color: #00d9ff;">#${idx + 1}</td>
        <td style="padding: 12px 14px; font-weight: 600; color: #ffffff;">${item.name}</td>
        <td style="padding: 12px 14px; text-align: center; font-weight: bold; color: #ff6b6b;">${item.unitsSold} Units</td>
        <td style="padding: 12px 14px; text-align: right; font-weight: bold; color: #00ff9d;">₹${item.totalRevenue.toLocaleString('en-IN')}</td>
      </tr>
    `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kashvi Command OS - Top Demand Analytics</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              padding: 35px;
              background-color: #0a0e17;
              color: #ffffff;
              max-width: 850px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #6d4aff;
              padding-bottom: 18px;
              margin-bottom: 24px;
            }
            .logo {
              font-size: 22px;
              font-weight: 900;
              letter-spacing: 1px;
              background: linear-gradient(135deg, #00d9ff, #6d4aff);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            .sub {
              font-size: 12px;
              color: #8b9bb4;
              margin-top: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              background: rgba(16, 22, 40, 0.7);
              border-radius: 12px;
              overflow: hidden;
            }
            th {
              background-color: rgba(109, 74, 255, 0.15);
              color: #00d9ff;
              padding: 12px 14px;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              border-bottom: 1px solid rgba(109, 74, 255, 0.3);
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">KASHVI COMMAND DECK</div>
              <div class="sub">Top Demand Performance Stream (${filterLabels[itemTimeFilter]})</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #8b9bb4;">
              <div><strong>Operator:</strong> ${currentUser?.full_name || 'Terminal Admin'}</div>
              <div><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">Rank</th>
                <th style="text-align: left;">Product Spec</th>
                <th style="text-align: center; width: 120px;">Units Sold</th>
                <th style="text-align: right; width: 140px;">Gross Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="4" style="text-align:center; padding: 25px; color:#8b9bb4;">No item telemetry recorded in timeframe.</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top: 35px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 15px; font-size: 10px; color: #8b9bb4; text-align: center;">
            Kashvi Hyper OS • Encrypted Telemetry Ledger
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
    <div className="min-h-screen bg-[#0a0e17] text-white p-4 space-y-5 select-none font-sans relative overflow-hidden">
      {/* Background Animated Neon Mesh Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[#6d4aff]/20 rounded-full blur-[130px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[#00d9ff]/15 rounded-full blur-[130px] animate-pulse delay-1000" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#ff6b6b]/10 rounded-full blur-[140px] animate-pulse delay-500" />
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`, 
            backgroundSize: '28px 28px' 
          }} 
        />
      </div>

      {/* Audio & Alert Notice Bar */}
      {!audioReady && (
        <div
          onClick={handleEnableAlerts}
          className="relative z-10 bg-gradient-to-r from-[#6d4aff]/20 via-[#00d9ff]/20 to-[#6d4aff]/20 border border-[#00d9ff]/40 p-3 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-[0_0_25px_rgba(0,217,255,0.25)] transition-all backdrop-blur-xl group"
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold text-white">
            <div className="w-7 h-7 rounded-xl bg-[#00d9ff]/20 flex items-center justify-center border border-[#00d9ff]/40">
              <Volume2 className="w-4 h-4 text-[#00d9ff] group-hover:scale-110 transition-transform animate-bounce" />
            </div>
            <span>Initialize Dispatch Audio Frequency & Push Alert Stream</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white px-3.5 py-1.5 rounded-xl shadow-md border border-white/20">
            Arm Audio 🔔
          </span>
        </div>
      )}

      {/* 4 Stat Cards: Floating Glassmorphism Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-10">
        
        {/* New Orders */}
        <div className="bg-[rgba(16,22,40,0.85)] backdrop-blur-xl rounded-2xl p-4 border border-[#ff6b6b]/30 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:border-[#ff6b6b]/60 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ff6b6b] flex items-center gap-1">
              <Activity className="w-3 h-3 animate-pulse" /> New Orders
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#ff6b6b]/15 text-[#ff6b6b] border border-[#ff6b6b]/30 flex items-center justify-center">
              <BellRing className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {newOrdersCount}
            </div>
            <span className="text-[9.5px] font-mono text-[#ff6b6b] bg-[#ff6b6b]/10 px-2 py-0.5 rounded-md border border-[#ff6b6b]/20">
              Awaiting Pack
            </span>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="bg-[rgba(16,22,40,0.85)] backdrop-blur-xl rounded-2xl p-4 border border-[#00ff9d]/30 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:border-[#00ff9d]/60 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00ff9d] flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Today's Sales
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#00ff9d]/15 text-[#00ff9d] border border-[#00ff9d]/30 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-extrabold text-white tracking-tight">
              ₹{todaySales.toLocaleString('en-IN')}
            </div>
            <span className="text-[9.5px] font-mono text-[#00ff9d] bg-[#00ff9d]/10 px-2 py-0.5 rounded-md border border-[#00ff9d]/20">
              Verified Stream
            </span>
          </div>
        </div>

        {/* In Carts */}
        <div className="bg-[rgba(16,22,40,0.85)] backdrop-blur-xl rounded-2xl p-4 border border-[#ffa500]/30 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:border-[#ffa500]/60 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ffa500] flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" /> In Carts
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#ffa500]/15 text-[#ffa500] border border-[#ffa500]/30 flex items-center justify-center">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {abandonedCarts.length} <span className="text-xs font-normal text-[#8b9bb4]">Users</span>
            </div>
            <span className="text-[9.5px] font-mono text-[#ffa500] bg-[#ffa500]/10 px-2 py-0.5 rounded-md border border-[#ffa500]/20">
              Recovery Leads
            </span>
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-[rgba(16,22,40,0.85)] backdrop-blur-xl rounded-2xl p-4 border border-[#00d9ff]/30 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:border-[#00d9ff]/60 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00d9ff] flex items-center gap-1">
              <Package className="w-3 h-3" /> Basket (AOV)
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#00d9ff]/15 text-[#00d9ff] border border-[#00d9ff]/30 flex items-center justify-center">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-extrabold text-white tracking-tight">
              ₹{aov.toLocaleString('en-IN')}
            </div>
            <span className="text-[9.5px] font-mono text-[#00d9ff] bg-[#00d9ff]/10 px-2 py-0.5 rounded-md border border-[#00d9ff]/20">
              {totalOrdersToday} Placed
            </span>
          </div>
        </div>

      </div>

      {/* Main Grid: Orders Telemetry Table & Top Sellers Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 relative z-10">
        
        {/* Left Table Section */}
        <div className="lg:col-span-7 xl:col-span-8 bg-[rgba(16,22,40,0.88)] backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Table Tab Bar */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3 bg-white/[0.02]">
            <div className="flex items-center gap-1.5 p-1 bg-[#0a0e17]/80 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setTableTab('orders')}
                className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tableTab === 'orders'
                    ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-[0_0_15px_rgba(109,74,255,0.4)]'
                    : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Live Orders ({recentOrders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setTableTab('abandoned')}
                className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tableTab === 'abandoned'
                    ? 'bg-[#ffa500] text-neutral-950 font-extrabold shadow-[0_0_15px_rgba(255,165,0,0.4)]'
                    : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Abandoned ({abandonedCarts.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10.5px] font-mono text-[#8b9bb4]">
              <span>ROLE:</span>
              <span className="px-2 py-0.5 rounded-md bg-[#6d4aff]/20 border border-[#6d4aff]/40 text-[#00d9ff] uppercase font-bold tracking-wider">
                {role}
              </span>
            </div>
          </div>

          {tableTab === 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#0a0e17]/60 text-[#8b9bb4] uppercase text-[9px] font-mono tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer Identity</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[#8b9bb4] font-medium">
                        Syncing live store telemetry...
                      </td>
                    </tr>
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[#8b9bb4] font-medium">
                        No orders recorded in queue.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((ord) => {
                      const isNew = ord.order_status === 'new' || ord.order_status === 'pending' || !ord.order_status;
                      return (
                        <tr
                          key={ord.id}
                          onClick={() => setSelectedOrder(ord)}
                          className={`hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                            isNew ? 'bg-[#ff6b6b]/[0.06]' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[#00d9ff] group-hover:text-white transition-colors">
                            <div className="flex items-center gap-2">
                              {isNew && <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b6b] animate-ping" />}
                              <span>{ord.id}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-white leading-tight">{ord.customer_name || 'Guest'}</div>
                            <div className="text-[10px] text-[#8b9bb4] font-mono mt-0.5">{ord.customer_phone}</div>
                          </td>
                          <td className="py-3 px-4 font-bold text-white text-xs font-mono">
                            ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-wide border ${
                              ord.payment_status === 'paid'
                                ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/30'
                                : 'bg-[#ffa500]/10 text-[#ffa500] border-[#ffa500]/30'
                            }`}>
                              {ord.payment_status || 'PENDING'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold capitalize border ${
                              isNew
                                ? 'bg-[#ff6b6b]/15 text-[#ff6b6b] border-[#ff6b6b]/30'
                                : 'bg-white/10 text-[#00d9ff] border-white/15'
                            }`}>
                              {ord.order_status || 'New'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <span className="text-[11px] font-bold text-[#6d4aff] group-hover:text-[#00d9ff] transition-colors flex items-center gap-0.5">
                                Inspect <ArrowUpRight className="w-3 h-3" />
                              </span>

                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingOrderId(ord.id);
                                    setSelectedNewStatus(ord.order_status || 'new');
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white transition-colors cursor-pointer"
                                  title="Edit Order Status"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteOrder(ord.id, e)}
                                  className="p-1.5 rounded-lg bg-[#ff6b6b]/10 hover:bg-[#ff6b6b]/20 text-[#ff6b6b] transition-colors cursor-pointer"
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

          {tableTab === 'abandoned' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#0a0e17]/60 text-[#8b9bb4] uppercase text-[9px] font-mono tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Lead ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items Trapped</th>
                    <th className="py-3 px-4">Value</th>
                    <th className="py-3 px-4 text-right">Recovery Dispatch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {abandonedCarts.map((cart) => (
                    <tr key={cart.id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#00d9ff]">{cart.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{cart.customer_name}</div>
                        <div className="text-[10px] text-[#8b9bb4] font-mono">{cart.customer_phone}</div>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-[#8b9bb4] truncate max-w-xs">
                        {cart.items_preview}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#ffa500] font-mono">
                        ₹{cart.cart_value.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href={`https://wa.me/91${cart.customer_phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(cart.customer_name)},%20we%20noticed%20you%20left%20items%20in%20your%20Kashvi%20cart!`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#00ff9d]/20 hover:bg-[#00ff9d]/30 text-[#00ff9d] border border-[#00ff9d]/40 font-bold text-[10px] shadow-sm transition-all"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp Ping</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Section: Top Selling Items Leaderboard */}
        <div className="lg:col-span-5 xl:col-span-4 bg-[rgba(16,22,40,0.88)] backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#ff6b6b]/15 text-[#ff6b6b] border border-[#ff6b6b]/30 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Top Demand Index
              </h3>
            </div>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white text-[10px] font-bold shadow-md shadow-[#6d4aff]/30 transition-all cursor-pointer active:scale-95 border border-white/10"
              title="Download Leaderboard PDF Report"
            >
              <Download className="w-3 h-3 text-[#00d9ff]" />
              <span>PDF Report</span>
            </button>
          </div>

          {/* Timeframe Filter Switcher */}
          <div className="px-4 py-2.5 border-b border-white/10 bg-[#0a0e17]/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-[#8b9bb4] font-semibold">
              <Calendar className="w-3.5 h-3.5 text-[#00d9ff]" />
              <span>Timeframe:</span>
            </div>

            <select
              value={itemTimeFilter}
              onChange={(e) => setItemTimeFilter(e.target.value as TimeRangeFilter)}
              className="px-3 py-1 rounded-xl border border-white/10 bg-[#101628] text-[10.5px] font-semibold text-white outline-none cursor-pointer focus:border-[#00d9ff] shadow-inner"
            >
              <option value="today">Today (Ee Roju)</option>
              <option value="yesterday">Yesterday (Ninna)</option>
              <option value="3days">Last 3 Days</option>
              <option value="1week">One Week (7 Days)</option>
              <option value="half_month">Half Month (15 Days)</option>
              <option value="full_month">Full Month (30 Days)</option>
              <option value="3months">Last 3 Months (Quarter)</option>
              <option value="half_year">Half Year (6 Months)</option>
              <option value="year">Full Year (365 Days)</option>
            </select>
          </div>

          {/* Leaderboard Scroll List */}
          <div className="divide-y divide-white/5 overflow-y-auto max-h-[420px] flex-1">
            {topSellingItems.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#8b9bb4] space-y-2">
                <Package className="w-8 h-8 mx-auto text-[#8b9bb4]/40" />
                <p>No sales metrics recorded in timeframe.</p>
                <span className="text-[10px] text-[#8b9bb4]/60">Switch the timeframe filter above.</span>
              </div>
            ) : (
              topSellingItems.map((item, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;

                return (
                  <div
                    key={item.name + idx}
                    className="p-3.5 hover:bg-white/[0.04] transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Indicator */}
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-[11px] shrink-0 border ${
                          isTop1
                            ? 'bg-[#ffa500]/20 text-[#ffa500] border-[#ffa500]/50 shadow-[0_0_12px_rgba(255,165,0,0.35)]'
                            : isTop2
                            ? 'bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/40'
                            : isTop3
                            ? 'bg-[#6d4aff]/20 text-[#6d4aff] border-[#6d4aff]/40'
                            : 'bg-white/5 text-[#8b9bb4] border-white/10'
                        }`}
                      >
                        {isTop1 ? <Award className="w-4 h-4 text-[#ffa500]" /> : `#${idx + 1}`}
                      </div>

                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-9 h-11 object-cover object-top rounded-xl border border-white/10 shrink-0 shadow-md"
                        />
                      )}

                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-white group-hover:text-[#00d9ff] transition-colors truncate leading-tight">
                          {item.name}
                        </h4>
                        <div className="text-[10px] text-[#8b9bb4] font-mono mt-0.5">
                          {item.ordersCount} checkout{item.ordersCount > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold text-[#ff6b6b] font-mono">
                        {item.unitsSold} {item.unitsSold === 1 ? 'Unit' : 'Units'}
                      </div>
                      <div className="text-[10.5px] font-bold text-[#00ff9d] font-mono mt-0.5">
                        ₹{item.totalRevenue.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Leaderboard Footer */}
          <div className="px-4 py-2.5 border-t border-white/10 bg-[#0a0e17]/60 flex items-center justify-between text-[10px] text-[#8b9bb4] font-mono">
            <span>PRODUCTS: <strong className="text-white">{topSellingItems.length}</strong></span>
            <span className="text-[#00ff9d] font-bold">
              TOTAL UNITS: {topSellingItems.reduce((acc, curr) => acc + curr.unitsSold, 0)}
            </span>
          </div>
        </div>

      </div>

      {/* Status Editor Modal (Futuristic Glass Popup) */}
      {editingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0e17]/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#101628]/95 border border-[#6d4aff]/40 rounded-3xl p-5 max-w-xs w-full shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(109,74,255,0.2)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 className="font-bold text-xs text-white tracking-wide">Update Order State</h3>
              <button
                type="button"
                onClick={() => setEditingOrderId(null)}
                className="p-1 text-[#8b9bb4] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <select
              value={selectedNewStatus}
              onChange={(e) => setSelectedNewStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-white/15 text-xs font-semibold text-white bg-[#0a0e17] outline-none focus:border-[#00d9ff] transition-colors"
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
                className="px-3.5 py-1.5 rounded-xl text-xs text-[#8b9bb4] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOrderStatus(editingOrderId)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#6d4aff] text-white shadow-md shadow-[#6d4aff]/30 transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Order Drawer (Futuristic Glass Flyout) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          <div
            onClick={() => setSelectedOrder(null)}
            className="absolute inset-0 bg-[#0a0e17]/80 backdrop-blur-sm cursor-pointer"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-8">
            <div className="w-screen max-w-sm bg-[#101628]/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col border-l border-[#6d4aff]/30">
              {/* Drawer Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div>
                  <span className="text-[9px] font-mono font-bold text-[#00d9ff] uppercase tracking-wider block">
                    Order Telemetry Inspect
                  </span>
                  <h3 className="font-mono font-bold text-sm text-white mt-0.5">
                    {selectedOrder.id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
                {/* Customer Details Box */}
                <div className="bg-[#0a0e17]/80 p-4 rounded-2xl border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-white">{selectedOrder.customer_name}</div>
                      <div className="text-[#8b9bb4] text-[11px] font-mono mt-0.5">{selectedOrder.customer_phone}</div>
                    </div>
                    <a
                      href={`https://wa.me/91${selectedOrder.customer_phone?.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(selectedOrder.customer_name || 'Customer')},%20thank%20you%20for%20your%20Kashvi%20order%20(${selectedOrder.id})!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#00ff9d]/20 hover:bg-[#00ff9d]/30 text-[#00ff9d] border border-[#00ff9d]/40 shadow-sm transition-all cursor-pointer"
                      title="Direct WhatsApp Ping"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                  {selectedOrder.shipping_address && (
                    <div className="pt-2 border-t border-white/10 text-[11px] text-[#8b9bb4] leading-relaxed">
                      <strong className="text-white">Shipping Coordinates:</strong> {selectedOrder.shipping_address}
                    </div>
                  )}
                </div>

                {/* Amount Paid Box */}
                <div className="bg-gradient-to-br from-[#667eea]/20 to-[#764ba2]/20 p-4 rounded-2xl border border-[#6d4aff]/40 flex justify-between items-center shadow-lg shadow-[#6d4aff]/15">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#00d9ff]">Gross Captured:</span>
                  <span className="text-base font-extrabold text-white font-mono">
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