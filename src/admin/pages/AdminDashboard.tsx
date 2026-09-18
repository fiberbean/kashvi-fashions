import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Package,
  Clock,
  ArrowRight,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RecentOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [todaySales, setTodaySales] = useState<number>(0);
  const [totalOrdersToday, setTotalOrdersToday] = useState<number>(0);
  const [aov, setAov] = useState<number>(0);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardMetrics() {
      try {
        setLoading(true);

        // Fetch recent 10 orders
        const { data: orders, error } = await supabase
          .from('orders')
          .select('id, customer_name, customer_phone, total_amount, order_status, payment_status, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && orders) {
          setRecentOrders(orders);

          // Calculate today's totals
          const today = new Date().toISOString().split('T')[0];
          const todayList = orders.filter(
            (o) => o.created_at && o.created_at.startsWith(today)
          );

          const sum = todayList.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
          setTodaySales(sum);
          setTotalOrdersToday(todayList.length);
          setAov(todayList.length > 0 ? Math.round(sum / todayList.length) : 0);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardMetrics();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0b3b2c]">
            Store Pulse & Performance
          </h1>
          <p className="text-xs sm:text-sm text-[#4d6960] mt-1">
            Real-time sales, order streams and inventory metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/kfmama/products/new"
            className="px-5 py-2.5 rounded-full bg-[#0b3b2c] hover:bg-[#06231a] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>+ Add Product</span>
          </Link>
        </div>
      </div>

      {/* KPI Ceramic Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* KPI 1: Today's Revenue */}
        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04),-4px_-4px_14px_rgba(255,255,255,0.8)] hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4d6960]">
              Today's Net Sales
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#e4efe9] text-[#0b3b2c] flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-serif font-black text-[#0b3b2c]">
              ₹{todaySales.toLocaleString('en-IN')}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full mt-2">
              <TrendingUp className="w-3.5 h-3.5" /> Verified Today
            </span>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04),-4px_-4px_14px_rgba(255,255,255,0.8)] hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4d6960]">
              Orders Received
            </span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#ff4d6d] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-serif font-black text-[#0b3b2c]">
              {totalOrdersToday}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff4d6d] bg-rose-50 px-2.5 py-0.5 rounded-full mt-2">
              Live Pipeline
            </span>
          </div>
        </div>

        {/* KPI 3: AOV */}
        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04),-4px_-4px_14px_rgba(255,255,255,0.8)] hover:shadow-lg transition-all sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4d6960]">
              Avg. Order Value (AOV)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#c6933a] flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-serif font-black text-[#0b3b2c]">
              ₹{aov.toLocaleString('en-IN')}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full mt-2">
              Cart Basket Average
            </span>
          </div>
        </div>

      </div>

      {/* Recent Orders Live Table */}
      <div className="bg-white rounded-3xl border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04)] overflow-hidden">
        <div className="p-6 border-b border-[#edf2ef] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-[#0b3b2c]" />
            <h2 className="font-serif font-bold text-lg text-[#0b3b2c]">
              Recent Orders
            </h2>
          </div>
          <Link
            to="/kfmama/orders"
            className="text-xs font-bold text-[#ff4d6d] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8faf9] text-[#809c93] uppercase text-[10px] font-extrabold tracking-wider border-b border-[#edf2ef]">
              <tr>
                <th className="py-3.5 px-6">Order ID</th>
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6">Payment</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ef]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400 font-medium">
                    Loading live pipeline...
                  </td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400 font-medium">
                    No orders placed yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#fbfcfc] transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-[#0c2b22]">
                      {ord.id}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-[#0c2b22]">{ord.customer_name || 'Guest'}</div>
                      <div className="text-[10px] text-neutral-400">{ord.customer_phone}</div>
                    </td>
                    <td className="py-4 px-6 font-bold text-[#0b3b2c]">
                      ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        ord.payment_status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {ord.payment_status?.toUpperCase() || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#f0f4f2] text-[#0b3b2c] capitalize">
                        {ord.order_status || 'New'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/kfmama/orders?id=${ord.id}`}
                        className="inline-flex items-center gap-1 text-[#0b3b2c] hover:text-[#ff4d6d] font-bold transition-colors"
                      >
                        <span>Manage</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}