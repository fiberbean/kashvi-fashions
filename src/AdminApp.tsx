import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Package,
  Clock,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
  Truck,
  RotateCcw,
  MessageCircle,
  ChevronRight,
  Shirt,
  Gem,
  X,
  ExternalLink,
  Search,
  LayoutDashboard,
  FolderTree,
  Settings
} from 'lucide-react';
import { supabase } from './lib/supabase';

// --- SUB-COMPONENT 1: ADMIN NAVBAR ---
function AdminNavbar() {
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#dce6e1] shadow-[0_4px_20px_rgba(11,59,44,0.05)] select-none">
      <div className="max-w-[1540px] mx-auto px-4 sm:px-8 h-17 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to="/kfmama" className="flex items-center gap-3 shrink-0 group">
          <div className="w-10 h-10 rounded-xl bg-[#0b3b2c] text-[#e5c07b] flex items-center justify-center font-serif font-black text-lg shadow-md group-hover:scale-105 transition-transform">
            KF
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-extrabold text-base tracking-wider text-[#0b3b2c] leading-none">
              KASHVI
            </span>
            <span className="text-[10px] font-bold tracking-widest text-[#ff4d6d] uppercase mt-0.5">
              Ceramic OS
            </span>
          </div>
        </Link>

        {/* Center Navigation */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/kfmama"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-[#0b3b2c] text-white shadow-md transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <span className="text-neutral-300">|</span>
          <span className="text-xs font-semibold text-[#809c93]">Nordic Live Operations Deck</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#dce6e1] bg-white hover:bg-[#f0f4f2] text-[#0b3b2c] text-xs font-bold transition-all shadow-xs"
          >
            <span>Live Store</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

      </div>
    </nav>
  );
}

// --- SUB-COMPONENT 2: COMPLETED DASHBOARD ---
interface OrderRecord {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  total_amount: number;
  subtotal?: number;
  delivery_fee?: number;
  shipping_address?: string;
  pincode?: string;
  order_status: string;
  payment_status: string;
  payment_method?: string;
  items?: any[];
  created_at: string;
}

interface LowStockItem {
  id: string;
  name: string;
  stock: number;
  department: string;
  price: number;
  image_url?: string;
}

function AdminDashboardView() {
  const [loading, setLoading] = useState(true);

  const [todaySales, setTodaySales] = useState<number>(0);
  const [totalOrdersToday, setTotalOrdersToday] = useState<number>(0);
  const [aov, setAov] = useState<number>(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);

  const [fashionSales, setFashionSales] = useState<number>(0);
  const [jewellerySales, setJewellerySales] = useState<number>(0);

  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!ordersErr && orders) {
        setRecentOrders(orders);

        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(
          (o) => o.created_at && o.created_at.startsWith(today)
        );

        const sum = todayOrders.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
        setTodaySales(sum);
        setTotalOrdersToday(todayOrders.length);
        setAov(todayOrders.length > 0 ? Math.round(sum / todayOrders.length) : 0);

        const pending = orders.filter(
          (o) => o.order_status === 'new' || o.order_status === 'pending'
        ).length;
        setPendingOrdersCount(pending);

        let fSales = 0;
        let jSales = 0;
        orders.forEach((o) => {
          if (Array.isArray(o.items)) {
            o.items.forEach((it: any) => {
              const itemTotal = (Number(it.price) || 0) * (Number(it.qty) || 1);
              if (it.department === 'jewellery') {
                jSales += itemTotal;
              } else {
                fSales += itemTotal;
              }
            });
          }
        });
        setFashionSales(fSales);
        setJewellerySales(jSales);
      }

      const { data: stockItems } = await supabase
        .from('products')
        .select('id, name, stock, department, price, image_url')
        .lte('stock', 5)
        .order('stock', { ascending: true })
        .limit(4);

      if (stockItems) {
        setLowStockProducts(stockItems);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalDeptSales = fashionSales + jewellerySales || 1;
  const fashionPercent = Math.round((fashionSales / totalDeptSales) * 100);
  const jewelleryPercent = 100 - fashionPercent;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e4efe9] text-[#0b3b2c] text-[10px] font-extrabold uppercase tracking-widest mb-2 border border-[#dce6e1]">
            <Sparkles className="w-3 h-3 text-[#c6933a]" /> Live Store Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0b3b2c] leading-tight">
            Store Pulse & Operations
          </h1>
          <p className="text-xs sm:text-sm text-[#4d6960] mt-0.5">
            Real-time transaction inflow, active dispatches and vault alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchDashboardData}
            className="p-2.5 rounded-full border border-[#dce6e1] bg-white hover:bg-[#f0f4f2] text-[#0b3b2c] shadow-xs cursor-pointer transition-all active:scale-95"
            title="Refresh Live Ledger"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4d6960]">
              Today's Net Inflow
            </span>
            <div className="w-9 h-9 rounded-2xl bg-[#e4efe9] text-[#0b3b2c] flex items-center justify-center">
              <IndianRupee className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-black text-[#0b3b2c]">
              ₹{todaySales.toLocaleString('en-IN')}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-2">
              <TrendingUp className="w-3 h-3" /> Live Transaction Ledger
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4d6960]">
              Orders Placed Today
            </span>
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-[#ff4d6d] flex items-center justify-center">
              <ShoppingBag className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-black text-[#0b3b2c]">
              {totalOrdersToday}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ff4d6d] bg-rose-50 px-2 py-0.5 rounded-full mt-2">
              Today's Order Stream
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4d6960]">
              Avg. Basket Value
            </span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-[#c6933a] flex items-center justify-center">
              <Package className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-black text-[#0b3b2c]">
              ₹{aov.toLocaleString('en-IN')}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full mt-2">
              Average Cart Size
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4d6960]">
              Pending Fulfillment
            </span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-black text-[#0b3b2c]">
              {pendingOrdersCount}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full mt-2">
              Action Required
            </span>
          </div>
        </div>

      </div>

      {/* 3. Department Share & Low Stock Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0b3b2c]">
              Department Ratios
            </span>
            <span className="text-[10px] font-bold text-[#809c93]">Live Flow</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-[#ff4d6d]">
                  <Shirt className="w-3.5 h-3.5" /> Fashions ({fashionPercent}%)
                </span>
                <span className="text-[#0c2b22]">₹{fashionSales.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#f0f4f2] overflow-hidden">
                <div className="h-full bg-[#ff4d6d]" style={{ width: `${fashionPercent}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-[#c6933a]">
                  <Gem className="w-3.5 h-3.5" /> Jewellery ({jewelleryPercent}%)
                </span>
                <span className="text-[#0c2b22]">₹{jewellerySales.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#f0f4f2] overflow-hidden">
                <div className="h-full bg-[#0b3b2c]" style={{ width: `${jewelleryPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04)] lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0b3b2c]">
                Low Stock Vault Warnings
              </h3>
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              Threshold: ≤ 5 units
            </span>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="py-6 text-center text-xs text-neutral-400">
              All inventory levels are healthy. Zero out-of-stock items.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lowStockProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="p-3 rounded-2xl border border-[#dce6e1] bg-[#fbfcfc] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.name}
                        className="w-10 h-12 object-cover object-top rounded-lg border border-[#dce6e1] shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-12 rounded-lg bg-[#f0f4f2] border border-[#dce6e1] flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-neutral-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#0c2b22] truncate">{prod.name}</div>
                      <div className="text-[10px] text-neutral-400">₹{prod.price.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                    {prod.stock} Left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 4. Live Orders Pipeline Table */}
      <div className="bg-white rounded-3xl border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04)] overflow-hidden">
        <div className="p-6 border-b border-[#edf2ef] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f0f4f2] text-[#0b3b2c] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-[#0b3b2c]">
                Live Order Pipeline
              </h2>
              <span className="text-[11px] text-[#809c93]">Click on any order to view full invoice & items</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8faf9] text-[#809c93] uppercase text-[10px] font-extrabold tracking-wider border-b border-[#edf2ef]">
              <tr>
                <th className="py-4 px-6">Order ID</th>
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Total Amount</th>
                <th className="py-4 px-6">Payment</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ef]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-neutral-400 font-medium">
                    Listening for incoming orders...
                  </td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-neutral-400 font-medium">
                    No orders found yet. Placed store orders will appear here automatically.
                  </td>
                </tr>
              ) : (
                recentOrders.map((ord) => (
                  <tr
                    key={ord.id}
                    onClick={() => setSelectedOrder(ord)}
                    className="hover:bg-[#f4f7f5] transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6 font-mono font-bold text-[#0c2b22] group-hover:text-[#ff4d6d]">
                      {ord.id}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-[#0c2b22]">{ord.customer_name || 'Guest User'}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">{ord.customer_phone}</div>
                    </td>
                    <td className="py-4 px-6 font-bold text-[#0b3b2c] font-serif text-sm">
                      ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        ord.payment_status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {ord.payment_status || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#f0f4f2] text-[#0b3b2c] capitalize border border-[#dce6e1]">
                        {ord.order_status || 'New'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="inline-flex items-center gap-1 text-[#0b3b2c] group-hover:text-[#ff4d6d] font-bold text-xs">
                        <span>View</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Slide-in Order Details Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          <div
            onClick={() => setSelectedOrder(null)}
            className="absolute inset-0 bg-black/45 backdrop-blur-xs transition-opacity cursor-pointer"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-[#dce6e1]">
              <div className="p-5 border-b border-[#edf2ef] flex items-center justify-between bg-[#f8faf9]">
                <div>
                  <span className="text-[10px] font-extrabold text-[#809c93] uppercase tracking-widest block">
                    Order Details
                  </span>
                  <h3 className="font-mono font-bold text-base text-[#0b3b2c]">
                    {selectedOrder.id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                <div className="bg-[#f0f4f2] p-4 rounded-2xl border border-[#dce6e1] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-[#0c2b22]">{selectedOrder.customer_name}</div>
                      <div className="text-neutral-500 text-xs font-mono">{selectedOrder.customer_phone}</div>
                    </div>
                    <a
                      href={`https://wa.me/91${selectedOrder.customer_phone?.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(selectedOrder.customer_name || 'Customer')},%20thank%20you%20for%20your%20Kashvi%20order%20(${selectedOrder.id})!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shadow-xs"
                      title="Chat on WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                  {selectedOrder.shipping_address && (
                    <div className="pt-2 border-t border-[#dce6e1]/70 text-[11px] text-[#4d6960]">
                      <strong>Address:</strong> {selectedOrder.shipping_address}
                    </div>
                  )}
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#dce6e1] space-y-2">
                  <div className="flex justify-between text-sm font-bold text-[#0b3b2c]">
                    <span>Total Amount Paid</span>
                    <span className="text-base font-serif font-black">
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

// --- MAIN WRAPPER EXPORT ---
export default function AdminApp() {
  const location = useLocation();

  if (!location.pathname.startsWith('/kfmama')) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    document.title = 'Kashvi Studio OS — Super Admin';
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f4f2] text-[#0c2b22] flex flex-col selection:bg-[#0b3b2c] selection:text-white">
      <AdminNavbar />

      <main className="flex-1 w-full max-w-[1540px] mx-auto p-4 sm:p-8">
        <Routes>
          <Route path="/" element={<AdminDashboardView />} />
          <Route path="*" element={<Navigate to="/kfmama" replace />} />
        </Routes>
      </main>
    </div>
  );
}