import React, { useEffect, useMemo, useState } from 'react';
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
  ChevronDown,
  ChevronUp,
  Package,
  MapPin,
  ShieldCheck,
  Download,
  Search,
  Filter,
  FileText,
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

  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '30days' | '6months' | 'year'>('all');

  // Instant Cache Initialization
  const [orders, setOrders] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('kashvi_cached_orders');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(orders.length === 0);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const email = user.email?.trim().toLowerCase();
    const phone = customer?.mobile?.trim() || user.user_metadata?.whatsapp_number?.trim();

    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (email && phone) {
        query = query.or(`customer_email.eq.${email},customer_phone.eq.${phone},customer_id.eq.${phone}`);
      } else if (email) {
        query = query.eq('customer_email', email);
      } else if (phone) {
        query = query.or(`customer_phone.eq.${phone},customer_id.eq.${phone}`);
      }

      const { data, error } = await query;

      if (!error && data) {
        setOrders(data);
        localStorage.setItem('kashvi_cached_orders', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Order fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (orders.length === 0) setLoading(true);
      fetchOrders();
    }
  }, [isOpen, user?.id, customer?.mobile]);

  // Handle Escape Key & Body Scroll Lock
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

  const getStageIndex = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('deliver')) return 4;
    if (s.includes('ship') || s.includes('dispatch') || s.includes('transit')) return 3;
    if (s.includes('pack')) return 2;
    if (s.includes('confirm') || s.includes('paid')) return 1;
    return 0;
  };

  const isDelivered = (order: any) => {
    const s = (order.order_status || order.status || '').toLowerCase();
    return s.includes('deliver');
  };

  // Split Active and Past Orders
  const activeOrders = useMemo(() => orders.filter((o) => !isDelivered(o)), [orders]);
  const pastOrdersRaw = useMemo(() => orders.filter((o) => isDelivered(o)), [orders]);

  // Filter Past Orders based on Search and Time Filter
  const filteredPastOrders = useMemo(() => {
    return pastOrdersRaw.filter((ord) => {
      // 1. Search Query Filter (Matches Order ID or Item Names)
      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        ord.id.toLowerCase().includes(query) ||
        (Array.isArray(ord.items) &&
          ord.items.some((it: any) => it.name?.toLowerCase().includes(query)));

      if (!matchesSearch) return false;

      // 2. Date Filter
      if (dateFilter === 'all') return true;
      const orderDate = new Date(ord.created_at).getTime();
      const now = Date.now();
      const dayDiff = (now - orderDate) / (1000 * 3600 * 24);

      if (dateFilter === '30days') return dayDiff <= 30;
      if (dateFilter === '6months') return dayDiff <= 180;
      if (dateFilter === 'year') return dayDiff <= 365;

      return true;
    });
  }, [pastOrdersRaw, searchTerm, dateFilter]);

  // Set default expanded order when tab switches
  useEffect(() => {
    if (activeTab === 'active' && activeOrders.length > 0) {
      setExpandedOrderId(activeOrders[0].id);
    } else if (activeTab === 'past' && filteredPastOrders.length > 0) {
      setExpandedOrderId(null);
    }
  }, [activeTab]);

  if (!isOpen) return null;

  // Invoice Generation & Print Handler
  const handleDownloadInvoice = (order: any) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up was blocked. Please allow pop-ups to download invoice.');
      return;
    }

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tax Invoice - ${order.id}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; padding: 40px; margin: 0; }
          .header { display: flex; justify-content: space-between; border-b: 2px solid #0b3b2c; padding-bottom: 20px; }
          .brand { font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #0b3b2c; }
          .tagline { font-size: 10px; text-transform: uppercase; color: #b38728; letter-spacing: 1px; }
          .invoice-title { font-size: 20px; font-weight: bold; text-align: right; color: #111; }
          .meta-grid { display: flex; justify-content: space-between; margin: 30px 0; font-size: 12px; }
          .meta-col { width: 45%; }
          .meta-col strong { color: #111; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f8fafc; text-align: left; padding: 12px 10px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
          td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
          .totals-table { width: 40%; margin-left: auto; margin-top: 20px; font-size: 12px; }
          .totals-table td { border: none; padding: 6px 10px; }
          .grand-total { font-weight: bold; font-size: 15px; color: #0b3b2c; border-top: 2px solid #0b3b2c !important; }
          .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">KASHVI FASHIONS</div>
            <div class="tagline">Haute Couture & Royal Vault • Kakinada</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 5px;">GSTIN: 37AAEFK1234F1Z5 • Support: +91 8686353574</div>
          </div>
          <div class="invoice-title">
            TAX INVOICE
            <div style="font-size: 12px; font-weight: normal; color: #64748b; margin-top: 4px;">Invoice ID: INV-${order.id}</div>
            <div style="font-size: 12px; font-weight: normal; color: #64748b;">Date: ${formattedDate}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-col">
            <strong>Billed & Shipped To:</strong><br/>
            ${order.customer_name || 'Valued Customer'}<br/>
            WhatsApp: ${order.customer_phone || ''}<br/>
            ${order.shipping_address || 'Address on file'}
          </div>
          <div class="meta-col" style="text-align: right;">
            <strong>Payment Summary:</strong><br/>
            Payment Mode: ${order.payment_method || 'Online PG'}<br/>
            Status: Confirmed & Paid<br/>
            Reference: ${order.payment_reference || order.id}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th>Specifications</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item: any) => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.size ? 'Size: ' + item.size : ''} ${item.color ? '• Color: ' + item.color : ''}</td>
                <td style="text-align: center;">${item.qty}</td>
                <td style="text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
                <td style="text-align: right;">₹${(item.price * item.qty).toLocaleString('en-IN')}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right;">₹${(order.subtotal || 0).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td>Delivery / Shipping:</td>
            <td style="text-align: right;">₹${order.delivery_fee || 0}</td>
          </tr>
          <tr class="grand-total">
            <td>Total Paid:</td>
            <td style="text-align: right;">₹${(order.total_amount || order.total || 0).toLocaleString('en-IN')}</td>
          </tr>
        </table>

        <div class="footer">
          This is a computer-generated invoice and requires no physical signature.<br/>
          Thank you for choosing <strong>Kashvi Fashions</strong>. For returns or support, contact help@kashvifashions.in.
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
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
        <Clock3 className="w-3 h-3" /> Pending
      </span>
    );
  };

  const currentDisplayList = activeTab === 'active' ? activeOrders : filteredPastOrders;

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 cursor-default my-auto animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0b3b2c]/10 text-[#0b3b2c] flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 leading-tight">
                My Orders
              </h2>
              <p className="text-[10px] text-neutral-400 font-medium">
                Track live packages and download tax invoices
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

        {/* Tab Selector: Active vs Past */}
        <div className="px-6 pt-3 pb-2 bg-neutral-50/50 border-b border-neutral-100 flex items-center justify-between gap-2">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-neutral-200/60 w-full sm:w-80">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-white text-neutral-950 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-[#0b3b2c]" />
              <span>Active Orders ({activeOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('past')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'past'
                  ? 'bg-white text-neutral-950 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#ff4d6d]" />
              <span>Past Orders ({pastOrdersRaw.length})</span>
            </button>
          </div>
        </div>

        {/* Filters for Past Orders */}
        {activeTab === 'past' && pastOrdersRaw.length > 0 && (
          <div className="px-6 py-2.5 bg-neutral-50 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-150">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Order ID or item name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-white focus:outline-hidden focus:border-neutral-900"
              />
            </div>

            {/* Time Filter Select */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-neutral-500" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-neutral-800 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="30days">Last 30 Days</option>
                <option value="6months">Last 6 Months</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        )}

        {/* Orders List Area */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
          {/* Skeleton Loader */}
          {loading && orders.length === 0 && (
            <div className="space-y-4 animate-pulse">
              {[1, 2].map((n) => (
                <div key={n} className="border-2 border-neutral-100 rounded-3xl p-5 bg-neutral-50/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-neutral-200 rounded-md" />
                      <div className="h-3 w-20 bg-neutral-200/60 rounded-md" />
                    </div>
                    <div className="h-5 w-16 bg-neutral-200 rounded-md" />
                  </div>
                  <div className="h-16 bg-white rounded-2xl border border-neutral-100" />
                </div>
              ))}
            </div>
          )}

          {/* Current Orders List */}
          {currentDisplayList.length > 0 ? (
            <div className="space-y-4">
              {currentDisplayList.map((ord, index) => {
                const isExpanded = expandedOrderId === ord.id;
                const items = Array.isArray(ord.items) ? ord.items : [];
                const currentStageIdx = getStageIndex(ord.order_status || ord.status);
                const orderDelivered = isDelivered(ord);
                const orderDate = ord.created_at
                  ? new Date(ord.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Recent';

                return (
                  <div
                    key={ord.id}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className={`border-2 rounded-3xl transition-all overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-200 ${
                      isExpanded
                        ? 'border-[#0b3b2c] shadow-md bg-white'
                        : 'border-neutral-200/90 bg-white hover:border-neutral-300 shadow-2xs'
                    }`}
                  >
                    {/* Clickable Header */}
                    <div
                      onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                      className="p-4 sm:p-5 cursor-pointer flex flex-wrap items-center justify-between gap-3 select-none bg-neutral-50/40 hover:bg-neutral-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            orderDelivered
                              ? 'bg-emerald-100 text-emerald-800'
                              : isExpanded
                              ? 'bg-[#0b3b2c] text-white shadow-xs'
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
                            Total Paid
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

                    {/* Expandable Order Details & Tracking Timeline */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-neutral-100 space-y-5 animate-in fade-in duration-200">
                        {/* Status Progress Tracker (Active Orders) */}
                        <div className="bg-neutral-50/80 border border-neutral-200/80 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-[#0b3b2c]" />
                              Order Status Tracker
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full capitalize">
                              {orderDelivered ? 'Delivered Successfully' : `Status: ${ord.order_status || 'Processing'}`}
                            </span>
                          </div>

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
                                  Tracking ID will be assigned upon dispatch
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

                        {/* Download Invoice Button for Delivered Orders */}
                        {orderDelivered && (
                          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                Tax Invoice Available
                              </span>
                              <p className="text-[11px] text-emerald-700">
                                Official invoice with GST details for your records.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDownloadInvoice(ord)}
                              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Invoice</span>
                            </button>
                          </div>
                        )}

                        {/* Address & Payment Info */}
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
          ) : (
            !loading && (
              <div className="py-20 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-300 mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-neutral-800 text-base">
                    {activeTab === 'active' ? 'No active orders right now' : 'No past orders match your filter'}
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto mt-1">
                    {activeTab === 'active'
                      ? 'Your placed orders will show up here until they are delivered to your doorstep.'
                      : 'Try changing the date filter or searching for another term.'}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}