import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  CheckCircle2,
  XCircle,
  RotateCcw,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Shirt,
  Gem,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OrderItem {
  name: string;
  price: number;
  qty: number;
  color?: string;
  size?: string;
  image?: string;
}

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
  items?: OrderItem[];
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

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);

  // Metrics
  const [todaySales, setTodaySales] = useState<number>(0);
  const [totalOrdersToday, setTotalOrdersToday] = useState<number>(0);
  const [aov, setAov] = useState<number>(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);

  // Department Sales Ratios
  const [fashionSales, setFashionSales] = useState<number>(0);
  const [jewellerySales, setJewellerySales] = useState<number>(0);

  // Lists
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockItem[]>([]);

  // Selected Order for Drawer View
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Orders
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

        // Estimate Department Sales based on items in orders
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

      // 2. Fetch Low Stock Products (< 5 items)
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
      
      {/* 1. Header Bar with Refresh & Action */}
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

          <Link
            to="/kfmama/products/new"
            className="px-5 py-2.5 rounded-full bg-[#0b3b2c] hover:bg-[#06231a] text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-[#0b3b2c]/20 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>+ Add Product</span>
          </Link>
        </div>
      </div>

      {/* 2. Bento KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Today Sales */}
        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04),-4px_-4px_14px_rgba(255,255,255,0.8)] hover:shadow-lg transition-all">
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

        {/* KPI 2: Today Orders */}
        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04),-4px_-4px_14px_rgba(255,255,255,0.8)] hover:shadow-lg transition-all">
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

        {/* KPI 3: AOV */}
        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04),-4px_-4px_14px_rgba(255,255,255,0.8)] hover:shadow-lg transition-all">
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

        {/* KPI 4: Pending Dispatch */}
        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04),-4px_-4px_14px_rgba(255,255,255,0.8)] hover:shadow-lg transition-all">
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

      {/* 3. Middle Section: Department Ratio & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Department Ratio */}
        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0b3b2c]">
                Couture vs Jewellery Share
              </span>
              <span className="text-[10px] font-bold text-[#809c93]">Historical Total</span>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="flex items-center gap-1.5 text-[#ff4d6d]">
                    <Shirt className="w-3.5 h-3.5" /> Fashions ({fashionPercent}%)
                  </span>
                  <span className="text-[#0c2b22]">₹{fashionSales.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#f0f4f2] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#ff4d6d] transition-all duration-700"
                    style={{ width: `${fashionPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="flex items-center gap-1.5 text-[#c6933a]">
                    <Gem className="w-3.5 h-3.5" /> Jewellery ({jewelleryPercent}%)
                  </span>
                  <span className="text-[#0c2b22]">₹{jewellerySales.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#f0f4f2] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0b3b2c] transition-all duration-700"
                    style={{ width: `${jewelleryPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#edf2ef] flex items-center justify-between text-[11px] text-[#4d6960]">
            <span>Active Catalog sync</span>
            <Link to="/kfmama/products" className="font-bold text-[#0b3b2c] hover:underline flex items-center gap-0.5">
              <span>View Catalog</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-3xl p-6 border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04)] lg:col-span-2 flex flex-col justify-between">
          <div>
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
              <div className="py-8 text-center text-xs text-neutral-400 font-medium">
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

                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                        {prod.stock} Left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-[#edf2ef] flex justify-end">
            <Link to="/kfmama/products" className="text-xs font-bold text-[#ff4d6d] hover:underline flex items-center gap-1">
              <span>Restock Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* 4. Live Orders Stream Table */}
      <div className="bg-white rounded-3xl border border-[#dce6e1] shadow-[6px_6px_18px_rgba(11,59,44,0.04)] overflow-hidden">
        <div className="p-6 border-b border-[#edf2ef] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f0f4f2] text-[#0b3b2c] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-[#0b3b2c] leading-tight">
                Live Order Pipeline
              </h2>
              <span className="text-[11px] text-[#809c93]">Click on any order to view full invoice & items</span>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchDashboardData}
            className="text-xs font-bold text-[#0b3b2c] hover:text-[#ff4d6d] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Auto-refreshing</span>
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8faf9] text-[#809c93] uppercase text-[10px] font-extrabold tracking-wider border-b border-[#edf2ef]">
              <tr>
                <th className="py-4 px-6">Order ID</th>
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Items Count</th>
                <th className="py-4 px-6">Total Amount</th>
                <th className="py-4 px-6">Payment</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ef]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-neutral-400 font-medium">
                    Listening for incoming orders...
                  </td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-neutral-400 font-medium">
                    No orders in database. Placed store orders will appear here automatically.
                  </td>
                </tr>
              ) : (
                recentOrders.map((ord) => {
                  const itemCount = Array.isArray(ord.items) ? ord.items.length : 1;
                  return (
                    <tr
                      key={ord.id}
                      onClick={() => setSelectedOrder(ord)}
                      className="hover:bg-[#f4f7f5] transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 font-mono font-bold text-[#0c2b22] group-hover:text-[#ff4d6d] transition-colors">
                        {ord.id}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-[#0c2b22]">{ord.customer_name || 'Guest User'}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">{ord.customer_phone}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md text-[11px]">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
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
                          {ord.payment_status?.replace('_', ' ') || 'PENDING'}
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
                  );
                })
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
              
              {/* Drawer Header */}
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

              {/* Drawer Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                
                {/* Customer Contact & WhatsApp Ping */}
                <div className="bg-[#f0f4f2] p-4 rounded-2xl border border-[#dce6e1] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-[#0c2b22]">{selectedOrder.customer_name}</div>
                      <div className="text-neutral-500 text-xs font-mono">{selectedOrder.customer_phone}</div>
                      {selectedOrder.customer_email && (
                        <div className="text-[11px] text-neutral-400">{selectedOrder.customer_email}</div>
                      )}
                    </div>

                    <a
                      href={`https://wa.me/91${selectedOrder.customer_phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(selectedOrder.customer_name)},%20thank%20you%20for%20your%20Kashvi%20order%20(${selectedOrder.id})!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shadow-xs"
                      title="Chat on WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>

                  {selectedOrder.shipping_address && (
                    <div className="pt-2 border-t border-[#dce6e1]/70 text-[11px] text-[#4d6960] leading-relaxed">
                      <strong>Delivery Address:</strong> {selectedOrder.shipping_address}
                    </div>
                  )}
                </div>

                {/* Ordered Items List */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#0b3b2c] border-b border-[#edf2ef] pb-1.5">
                    Purchased Items ({selectedOrder.items?.length || 1})
                  </h4>

                  <div className="space-y-2.5">
                    {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-[#fbfcfc] border border-[#edf2ef]"
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-14 object-cover object-top rounded-lg border border-[#dce6e1] shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-14 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-neutral-400" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-[#0c2b22] truncate">{item.name}</h5>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-0.5">
                              {item.size && <span>Size: {item.size}</span>}
                              {item.color && <span>• Color: {item.color}</span>}
                              <span>• Qty: {item.qty}</span>
                            </div>
                            <div className="font-bold text-[#0b3b2c] mt-1">
                              ₹{(Number(item.price) * Number(item.qty)).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-neutral-400 italic">No item details available.</p>
                    )}
                  </div>
                </div>

                {/* Amount Ledger Breakdown */}
                <div className="bg-white p-4 rounded-2xl border border-[#dce6e1] space-y-2">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal</span>
                    <span className="font-bold text-[#0c2b22]">
                      ₹{(selectedOrder.subtotal || selectedOrder.total_amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Delivery Charge</span>
                    <span className="font-bold text-[#0c2b22]">
                      {selectedOrder.delivery_fee ? `₹${selectedOrder.delivery_fee}` : 'FREE'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#0b3b2c] pt-2 border-t border-[#edf2ef]">
                    <span>Total Amount Paid</span>
                    <span className="text-base font-serif font-black">
                      ₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Gateway & Status Overview */}
                <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#edf2ef] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Payment Gateway:</span>
                    <span className="font-bold text-[#0c2b22]">{selectedOrder.payment_method || 'Cashfree'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Payment Status:</span>
                    <span className={`font-bold capitalize ${
                      selectedOrder.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {selectedOrder.payment_status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Order Fulfillment:</span>
                    <span className="font-bold capitalize text-[#0b3b2c]">{selectedOrder.order_status}</span>
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