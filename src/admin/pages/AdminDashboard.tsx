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
  Store,
  Clock3,
  AlertTriangle,
  LineChart,
  Download,
  Calendar,
  Flame,
  Award,
  Volume2,
  ArrowUpRight,
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
  const [onlineOrdersToday, setOnlineOrdersToday] = useState<number>(0);
  const [onlineSalesToday, setOnlineSalesToday] = useState<number>(0);
  const [walkInSalesToday, setWalkInSalesToday] = useState<number>(0);
  const [walkInOrdersToday, setWalkInOrdersToday] = useState<number>(0);
  const [totalOrdersToday, setTotalOrdersToday] = useState<number>(0);
  const [aov, setAov] = useState<number>(0);
  const [pendingPaymentCount, setPendingPaymentCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [outOfStockCount, setOutOfStockCount] = useState<number>(0);
  const [salesTrend, setSalesTrend] = useState<Array<{ label: string; online: number; store: number }>>([]);

  const [tableTab, setTableTab] = useState<'orders' | 'abandoned'>('orders');
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCartUser[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);


  const [itemTimeFilter, setItemTimeFilter] = useState<TimeRangeFilter>('today');
  const [audioReady, setAudioReady] = useState<boolean>(false);

  const role = currentUser?.role || 'operations';

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

      const [{ data: orders, error: ordersError }, { data: inventoryRows, error: inventoryError }] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('inventory')
          .select('stock_quantity')
      ]);

      if (ordersError) throw ordersError;

      const allOrders = (orders || []) as OrderRecord[];
      const onlineOrders = allOrders.filter((o) => o.id?.toUpperCase().startsWith('KFOD'));
      const storeOrders = allOrders.filter((o) => o.id?.toUpperCase().startsWith('KFINV'));

      // Dashboard "sales" excludes cancelled/refunded orders.
      const isCancelled = (o: OrderRecord) =>
        (o.order_status || o.status || '').toLowerCase() === 'cancelled' ||
        o.is_refunded === true ||
        (o.payment_status || '').toLowerCase() === 'refunded';

      const validSales = (o: OrderRecord) => !isCancelled(o);
      const todayKey = new Date().toLocaleDateString('en-CA');
      const isToday = (o: OrderRecord) => {
        if (!o.created_at) return false;
        return new Date(o.created_at).toLocaleDateString('en-CA') === todayKey;
      };

      const todayOnline = onlineOrders.filter((o) => isToday(o) && validSales(o));
      const todayStore = storeOrders.filter((o) => isToday(o) && validSales(o));
      const onlineSales = todayOnline.reduce((sum, o) => sum + Number(o.total_amount || o.total || 0), 0);
      const storeSales = todayStore.reduce((sum, o) => sum + Number(o.total_amount || o.total || 0), 0);
      const combinedSales = onlineSales + storeSales;

      setRecentOrders(onlineOrders.slice(0, 50));
      setOnlineOrdersToday(todayOnline.length);
      setOnlineSalesToday(onlineSales);
      setWalkInOrdersToday(todayStore.length);
      setWalkInSalesToday(storeSales);
      setTodaySales(combinedSales);
      setTotalOrdersToday(todayOnline.length + todayStore.length);
      setAov(todayOnline.length + todayStore.length > 0 ? Math.round(combinedSales / (todayOnline.length + todayStore.length)) : 0);

      const freshOnlineOrders = onlineOrders.filter((o) => {
        const st = (o.order_status || o.status || '').toLowerCase();
        return !isCancelled(o) && (st === 'new' || st === 'pending' || st === 'confirmed' || !st);
      });

      const pendingLeads = onlineOrders
        .filter((o) =>
          !isCancelled(o) &&
          (o.payment_status === 'payment_pending' || o.order_status === 'payment_pending')
        )
        .slice(0, 10)
        .map((o) => ({
          id: o.id,
          customer_name: o.customer_name || 'Customer',
          customer_phone: o.customer_phone || 'N/A',
          items_count: Array.isArray(o.items) ? o.items.length : 1,
          cart_value: Number(o.total_amount || o.total) || 0,
          last_active: o.created_at || new Date().toISOString(),
          items_preview: Array.isArray(o.items)
            ? o.items.map((i: any) => i.name).slice(0, 2).join(', ')
            : 'Saree / Jewellery Item'
        }));
      setAbandonedCarts(pendingLeads);
      setPendingPaymentCount(pendingLeads.length);

      if (!inventoryError && inventoryRows) {
        const stocks = inventoryRows.map((row: any) => Number(row.stock_quantity) || 0);
        setOutOfStockCount(stocks.filter((stock) => stock <= 0).length);
        setLowStockCount(stocks.filter((stock) => stock > 0 && stock <= 3).length);
      }

      // Last 7 calendar days: Online vs Walk-In sales trend.
      const trend = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (6 - index));
        const key = date.toLocaleDateString('en-CA');
        const onlineValue = onlineOrders
          .filter((o) => o.created_at && new Date(o.created_at).toLocaleDateString('en-CA') === key && validSales(o))
          .reduce((sum, o) => sum + Number(o.total_amount || o.total || 0), 0);
        const storeValue = storeOrders
          .filter((o) => o.created_at && new Date(o.created_at).toLocaleDateString('en-CA') === key && validSales(o))
          .reduce((sum, o) => sum + Number(o.total_amount || o.total || 0), 0);
        return {
          label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          online: onlineValue,
          store: storeValue
        };
      });
      setSalesTrend(trend);
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
          const isOnline = newOrder.id?.toUpperCase().startsWith('KFOD');
          const isStore = newOrder.id?.toUpperCase().startsWith('KFINV');
          const isCancelled = (newOrder.order_status || newOrder.status || '').toLowerCase() === 'cancelled';
          if (!isOnline && !isStore) return;

          if (isOnline) {
            playAlertSound();
            triggerBrowserNotification(newOrder);
            setRecentOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)].slice(0, 50));
            onNewOrderNotice(newOrder);
          }

          if (!isCancelled) {
            const amount = Number(newOrder.total_amount || newOrder.total || 0);
            setTotalOrdersToday((c) => c + 1);
            setTodaySales((s) => s + amount);
            if (isStore) {
              setWalkInOrdersToday((c) => c + 1);
              setWalkInSalesToday((s) => s + amount);
            } else {
              setOnlineOrdersToday((c) => c + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

      {/* 5 Visual KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 relative z-10">
        {/* Online Orders — Line Chart */}
        <div className="bg-[rgba(16,22,40,0.88)] backdrop-blur-xl rounded-2xl p-3.5 border border-[#6d4aff]/30 shadow-[0_10px_30px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#a78bfa] flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> Online Orders</span>
            <span className="text-lg font-extrabold text-white">{onlineOrdersToday}</span>
          </div>
          <div className="mt-2 h-12">
            <svg viewBox="0 0 220 48" className="w-full h-full" preserveAspectRatio="none">
              {(() => {
                const vals = salesTrend.map(d => d.online);
                const max = Math.max(1, ...vals);
                const pts = vals.map((v,i) => `${8 + (i * 204) / Math.max(1, vals.length - 1)},${42 - (v / max) * 31}`).join(' ');
                return <><polyline points={pts} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{vals.map((v,i) => <circle key={i} cx={8 + (i * 204) / Math.max(1, vals.length - 1)} cy={42 - (v / max) * 31} r="2.3" fill="#a78bfa" />)}</>;
              })()}
            </svg>
          </div>
          <div className="flex justify-between text-[8px] font-mono text-[#8b9bb4] mt-0.5"><span>7-DAY TREND</span><span className="text-[#a78bfa]">ORDERS</span></div>
        </div>

        {/* Walk-In Sales — Bar Chart */}
        <div className="bg-[rgba(16,22,40,0.88)] backdrop-blur-xl rounded-2xl p-3.5 border border-[#38bdf8]/30 shadow-[0_10px_30px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#38bdf8] flex items-center gap-1"><Store className="w-3 h-3" /> Walk-In Sales</span>
            <span className="text-sm font-extrabold text-white">₹{walkInSalesToday.toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-2 h-12 flex items-end gap-1.5 px-1">
            {salesTrend.map((d,i) => {
              const max = Math.max(1, ...salesTrend.map(x => x.store));
              return <div key={d.label + i} className="flex-1 rounded-t-sm bg-[#38bdf8]/70 hover:bg-[#38bdf8] transition-all" style={{height:`${Math.max(8,(d.store/max)*100)}%`}} title={`${d.label}: ₹${d.store.toLocaleString('en-IN')}`} />;
            })}
          </div>
          <div className="flex justify-between text-[8px] font-mono text-[#8b9bb4] mt-1"><span>{walkInOrdersToday} BILLS</span><span className="text-[#38bdf8]">7-DAY SALES</span></div>
        </div>

        {/* In Cart — Radial / Donut */}
        <div className="bg-[rgba(16,22,40,0.88)] backdrop-blur-xl rounded-2xl p-3.5 border border-[#ffa500]/30 shadow-[0_10px_30px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ffa500] flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> In Cart</span>
            <span className="text-lg font-extrabold text-white">{abandonedCarts.length}</span>
          </div>
          <div className="mt-1 h-12 flex items-center gap-3">
            {(() => {
              const base = Math.max(1, onlineOrdersToday + abandonedCarts.length);
              const pct = Math.min(100, Math.round((abandonedCarts.length / base) * 100));
              const r=17, c=2*Math.PI*r, dash=(pct/100)*c;
              return <svg viewBox="0 0 44 44" className="w-12 h-12 shrink-0 -rotate-90"><circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,165,0,0.12)" strokeWidth="5"/><circle cx="22" cy="22" r={r} fill="none" stroke="#ffa500" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${dash} ${c-dash}`}/></svg>;
            })()}
            <div><div className="text-[9px] text-[#d7dce5]">RECOVERY QUEUE</div><div className="text-[9px] text-[#8b9bb4] mt-0.5">Pending customer carts</div></div>
          </div>
        </div>

        {/* Basket / AOV — Gauge */}
        <div className="bg-[rgba(16,22,40,0.88)] backdrop-blur-xl rounded-2xl p-3.5 border border-[#00d9ff]/30 shadow-[0_10px_30px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00d9ff] flex items-center gap-1"><Package className="w-3 h-3" /> Basket</span>
            <span className="text-sm font-extrabold text-white">₹{aov.toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-3 h-7 flex items-center">
            <div className="w-full h-2 rounded-full bg-[#00d9ff]/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#00d9ff]/40 to-[#00d9ff]" style={{width:`${Math.min(100, Math.max(8, (aov / Math.max(1, todaySales)) * 100))}%`}} /></div>
          </div>
          <div className="flex justify-between text-[8px] font-mono text-[#8b9bb4] mt-1"><span>AVERAGE ORDER VALUE</span><span className="text-[#00d9ff]">AOV</span></div>
        </div>

        {/* Today Sales — Donut */}
        <div className="bg-[rgba(16,22,40,0.88)] backdrop-blur-xl rounded-2xl p-3.5 border border-[#00ff9d]/30 shadow-[0_10px_30px_rgba(0,0,0,0.4)] overflow-hidden col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00ff9d] flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Today Sales</span>
            <span className="text-sm font-extrabold text-white">₹{todaySales.toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-1 h-12 flex items-center gap-3">
            {(() => {
              const total=Math.max(1,todaySales), onlinePct=Math.max(0,Math.min(100,(onlineSalesToday/total)*100));
              const r=17,c=2*Math.PI*r,dash=(onlinePct/100)*c;
              return <svg viewBox="0 0 44 44" className="w-12 h-12 shrink-0 -rotate-90"><circle cx="22" cy="22" r={r} fill="none" stroke="rgba(56,189,248,0.25)" strokeWidth="5"/><circle cx="22" cy="22" r={r} fill="none" stroke="#a78bfa" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${dash} ${c-dash}`}/></svg>;
            })()}
            <div className="text-[8px] font-mono space-y-0.5"><div className="text-[#a78bfa]">● ONLINE ₹{onlineSalesToday.toLocaleString('en-IN')}</div><div className="text-[#38bdf8]">● STORE ₹{walkInSalesToday.toLocaleString('en-IN')}</div></div>
          </div>
        </div>
      </div>

      {/* Command metrics + 7-day sales graph */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 relative z-10">
        <div className="xl:col-span-8 bg-[rgba(16,22,40,0.88)] backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2"><LineChart className="w-4 h-4 text-[#00d9ff]" /><div><h3 className="text-xs font-bold uppercase tracking-wider text-white">Sales Trend</h3><span className="text-[9px] text-[#8b9bb4]">Last 7 days • Online vs Walk-In</span></div></div>
            <div className="flex items-center gap-3 text-[9px] font-mono"><span className="flex items-center gap-1 text-[#a78bfa]"><span className="w-2 h-2 rounded-full bg-[#a78bfa]" /> Online</span><span className="flex items-center gap-1 text-[#38bdf8]"><span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> Store</span></div>
          </div>
          <div className="p-4 h-[230px]">
            {salesTrend.length > 0 ? (
              <svg viewBox="0 0 700 220" className="w-full h-full" preserveAspectRatio="none" aria-label="Seven day sales trend">
                <defs>
                  <linearGradient id="onlineFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity="0.28"/><stop offset="100%" stopColor="#a78bfa" stopOpacity="0"/></linearGradient>
                  <linearGradient id="storeFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22"/><stop offset="100%" stopColor="#38bdf8" stopOpacity="0"/></linearGradient>
                </defs>
                {[0,1,2,3].map((g) => <line key={g} x1="40" x2="690" y1={25 + g * 48} y2={25 + g * 48} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />)}
                {(() => {
                  const max = Math.max(1, ...salesTrend.flatMap((d) => [d.online, d.store]));
                  const x = (i: number) => 45 + (i * 645) / Math.max(1, salesTrend.length - 1);
                  const y = (v: number) => 185 - (v / max) * 145;
                  const onlinePoints = salesTrend.map((d, i) => `${x(i)},${y(d.online)}`).join(' ');
                  const storePoints = salesTrend.map((d, i) => `${x(i)},${y(d.store)}`).join(' ');
                  return <>
                    <polyline points={onlinePoints} fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points={storePoints} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {salesTrend.map((d, i) => <g key={d.label + i}><circle cx={x(i)} cy={y(d.online)} r="3.5" fill="#a78bfa"/><circle cx={x(i)} cy={y(d.store)} r="3.5" fill="#38bdf8"/><text x={x(i)} y="208" textAnchor="middle" fill="#8b9bb4" fontSize="10">{d.label}</text></g>)}
                  </>;
                })()}
              </svg>
            ) : <div className="h-full flex items-center justify-center text-xs text-[#8b9bb4]">Loading sales telemetry…</div>}
          </div>
        </div>

        <div className="xl:col-span-4 grid grid-cols-2 gap-3">
          <div className="bg-[rgba(16,22,40,0.88)] rounded-2xl border border-[#ffa500]/25 p-4"><div className="flex items-center gap-2 text-[#ffa500] text-[10px] font-bold uppercase"><Clock3 className="w-3.5 h-3.5"/> Pending Payment</div><div className="text-2xl font-extrabold mt-3">{pendingPaymentCount}</div><div className="text-[9px] text-[#8b9bb4] mt-1">Online orders waiting</div></div>
          <div className="bg-[rgba(16,22,40,0.88)] rounded-2xl border border-[#ff6b6b]/25 p-4"><div className="flex items-center gap-2 text-[#ff6b6b] text-[10px] font-bold uppercase"><AlertTriangle className="w-3.5 h-3.5"/> Stock Alert</div><div className="text-2xl font-extrabold mt-3">{lowStockCount}</div><div className="text-[9px] text-[#8b9bb4] mt-1">Low-stock variants</div><div className="text-[9px] text-[#ff6b6b] mt-1">{outOfStockCount} out of stock</div></div>
          <div className="col-span-2 bg-[rgba(16,22,40,0.88)] rounded-2xl border border-white/10 p-4"><div className="flex items-center justify-between mb-3"><div className="text-[10px] font-bold uppercase tracking-wider text-white">Today Sales Split</div><span className="text-[9px] font-mono text-[#8b9bb4]">{totalOrdersToday} orders</span></div><div className="space-y-2"><div className="flex items-center justify-between text-[10px]"><span className="text-[#a78bfa]">Online</span><strong>₹{onlineSalesToday.toLocaleString('en-IN')}</strong></div><div className="flex items-center justify-between text-[10px]"><span className="text-[#38bdf8]">Walk-In</span><strong>₹{walkInSalesToday.toLocaleString('en-IN')}</strong></div></div></div>
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
                      const st = (ord.order_status || '').toLowerCase();
                      const isNew = st === 'new' || st === 'pending' || st === 'confirmed' || !ord.order_status; 
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

      {/* View-only Online Order Details Modal */}
      {selectedOrder && (
        <div
          onClick={() => setSelectedOrder(null)}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-[#101628] border border-white/15 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0a0e17]/80 shrink-0">
              <div>
                <span className="text-[9px] font-mono font-bold text-[#00d9ff] uppercase tracking-wider block">Online Order • View Only</span>
                <h3 className="font-mono font-bold text-sm text-white mt-0.5">{selectedOrder.id}</h3>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)} className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white cursor-pointer transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10 space-y-1.5">
                  <span className="text-[10px] font-mono text-[#00d9ff] uppercase font-bold">Customer</span>
                  <span className="text-white font-bold block text-xs">{selectedOrder.customer_name || selectedOrder.customer?.name || 'Customer'}</span>
                  <span className="text-[#8b9bb4] block font-mono text-[10.5px]">{selectedOrder.customer_phone || selectedOrder.customer?.phone || '-'}</span>
                  {selectedOrder.customer_email && <span className="text-[#8b9bb4] block font-mono text-[10px] truncate">{selectedOrder.customer_email}</span>}
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10 space-y-1.5">
                  <span className="text-[10px] font-mono text-[#00ff9d] uppercase font-bold">Order Status</span>
                  <div className="flex items-center gap-2"><span className="px-2.5 py-1 rounded-full bg-[#00d9ff]/10 border border-[#00d9ff]/30 text-[#00d9ff] text-[9px] font-bold uppercase">{selectedOrder.order_status || selectedOrder.status || 'New'}</span><span className="text-[9px] text-[#8b9bb4]">{selectedOrder.payment_status || selectedOrder.payment?.status || 'Pending'}</span></div>
                  <span className="text-[9px] text-[#8b9bb4] font-mono">{new Date(selectedOrder.created_at).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10">
                <span className="text-[10px] font-mono text-[#00ff9d] uppercase font-bold block mb-2">Delivery</span>
                <p className="text-white text-[10.5px] leading-relaxed">{selectedOrder.shipping_address || selectedOrder.shipping?.address || 'Address on record'}</p>
                {selectedOrder.pincode && <span className="text-[9.5px] text-[#8b9bb4] font-mono block mt-1">PIN: {selectedOrder.pincode}</span>}
                {(selectedOrder.shipping?.tracking_number || (selectedOrder as any).tracking_number) && <span className="text-[9.5px] text-[#38bdf8] font-mono block mt-1">AWB: {selectedOrder.shipping?.tracking_number || (selectedOrder as any).tracking_number}</span>}
              </div>

              <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17]">
                <div className="p-2.5 bg-white/5 border-b border-white/10 text-[10px] font-mono font-bold text-white uppercase tracking-wider">Ordered Products ({selectedOrder.items?.length || 0})</div>
                <div className="divide-y divide-white/5">
                  {(selectedOrder.items || []).map((item: any, index: number) => {
                    const qty = Number(item.qty ?? item.quantity ?? 1);
                    const price = Number(item.price ?? item.unit_price ?? 0);
                    return <div key={index} className="p-3 flex items-center gap-3"><img src={item.image || '/favicon.ico'} alt={item.name || 'Product'} className="w-11 h-13 object-cover rounded-lg border border-white/10"/><div className="min-w-0 flex-1"><div className="text-[11px] font-bold text-white truncate">{item.name || 'Product'}</div><div className="text-[9px] text-[#8b9bb4] mt-0.5">{item.color ? `Color: ${item.color}` : ''}{item.color && item.size ? ' • ' : ''}{item.size ? `Size: ${item.size}` : ''}</div></div><div className="text-right shrink-0"><div className="text-[9px] text-[#8b9bb4]">Qty {qty}</div><div className="text-[11px] font-bold text-[#00ff9d]">₹{(qty * price).toLocaleString('en-IN')}</div></div></div>;
                  })}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#667eea]/20 to-[#764ba2]/20 border border-[#6d4aff]/40 space-y-2">
                <div className="flex justify-between text-[10px] text-[#8b9bb4]"><span>Subtotal</span><span className="text-white">₹{Number(selectedOrder.subtotal || selectedOrder.total || 0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-[10px] text-[#8b9bb4]"><span>Delivery</span><span className="text-white">₹{Number(selectedOrder.delivery_fee || selectedOrder.shipping?.fee || 0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between pt-2 border-t border-white/10"><span className="text-xs font-bold text-white">Total</span><span className="text-base font-extrabold text-[#00ff9d]">₹{Number(selectedOrder.total_amount || selectedOrder.total || 0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-[9.5px] text-[#8b9bb4]"><span>Payment: {selectedOrder.payment_method || selectedOrder.payment?.method || 'Online'}</span><span>Ref: {selectedOrder.payment_reference || selectedOrder.bank_reference || selectedOrder.payment?.utr || '—'}</span></div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-[#0a0e17]/90 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[9px] text-[#8b9bb4]">View only • Order actions are managed in Order Manager.</span>
              <div className="flex gap-2">
                <a href={`https://wa.me/91${(selectedOrder.customer_phone || '').replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(selectedOrder.customer_name || 'Customer')},%20thank%20you%20for%20your%20Kashvi%20order%20(${selectedOrder.id})!`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 rounded-xl font-bold text-[10px] flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5"/> WhatsApp</a>
                <button type="button" onClick={() => setSelectedOrder(null)} className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-[10px]">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
} 