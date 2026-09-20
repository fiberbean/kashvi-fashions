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
  Loader2,
  Download,
  Filter,
  FileText,
  User,
  ShieldCheck,
  Check,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface OrderRecord {
  id: string;
  created_at: string;
  status: string;
  order_status?: string;
  total: number;
  total_amount?: number;
  subtotal?: number;
  delivery_fee?: number;
  payment_status?: string;
  payment_method?: string;
  payment_reference?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  } | null;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  shipping?: {
    address?: string;
    city?: string;
    pincode?: string;
    courier?: string;
    tracking_number?: string;
    fee?: number;
  } | null;
  shipping_address?: string;
  pincode?: string;
  payment?: {
    method?: string;
    status?: string;
    delivery_charge?: number;
  } | null;
  items?: Array<{
    name: string;
    variant_title?: string;
    quantity?: number;
    qty?: number;
    price: number;
    color?: string;
    size?: string;
    image?: string;
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

function formatStatusName(status: string = '') {
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
  return map[status.toLowerCase()] || status;
}

function getStageRank(statusKey: string = ''): number {
  const stage = PIPELINE_STAGES.find((s) => s.key === statusKey.toLowerCase());
  return stage ? stage.order : 99;
}

export default function OrdersManager() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters State
  const [currentStageFilter, setCurrentStageFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const [masterPipelinePin, setMasterPipelinePin] = useState<string>('1234');

  // Modal States
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState<boolean>(false);

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

  // Load Settings & Orders
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
      // Default pin
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

  // Update Status in Supabase
  const updateOrderStatus = async (orderId: string, newStatus: string, additionalFields: any = {}) => {
    try {
      const payload = { 
        status: newStatus, 
        order_status: newStatus,
        ...additionalFields 
      };
      const { error } = await supabase.from('orders').update(payload).eq('id', orderId);
      if (error) throw error;

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

  // Stage Progression / Rollback Handler
  const handleStageChange = async (orderId: string, targetStatus: string, currentStatus: string) => {
    if (currentStatus === targetStatus) return;

    const currentRank = getStageRank(currentStatus);
    const targetRank = getStageRank(targetStatus);

    // Rollback to previous step -> PIN verification required
    if (targetRank < currentRank) {
      setPendingRollback({ orderId, targetStatus, prevStatus: currentStatus });
      setEnteredPin('');
      setPinError(null);
      return;
    }

    // Special Requirement: Dispatched
    if (targetStatus === 'dispatched') {
      setDispatchOrderId(orderId);
      setTrackingNumber('');
      return;
    }

    // Special Requirement: Cancelled
    if (targetStatus === 'cancelled') {
      setRefundOrderId(orderId);
      setRefundUtr('');
      return;
    }

    await updateOrderStatus(orderId, targetStatus);
  };

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

  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrderId || !trackingNumber.trim()) return;

    const targetOrder = orders.find((o) => o.id === dispatchOrderId);
    const updatedShipping = {
      ...(targetOrder?.shipping || {}),
      courier: 'India Post',
      tracking_number: trackingNumber.trim()
    };

    await updateOrderStatus(dispatchOrderId, 'dispatched', { 
      shipping: updatedShipping,
      tracking_number: trackingNumber.trim(),
      courier_name: 'India Post'
    });
    setDispatchOrderId(null);
    setTrackingNumber('');
  };

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
      refund: updatedRefund,
      payment_status: 'refunded'
    });
    setRefundOrderId(null);
    setRefundUtr('');
  };

  // 4x6 Shipping Label Print
  const printShippingLabel = (order: OrderRecord) => {
    const custName = order.customer?.name || order.customer_name || 'Customer';
    const custPhone = order.customer?.phone || order.customer_phone || '-';
    const shipAddr = order.shipping?.address || order.shipping_address || '';
    const shipPin = order.shipping?.pincode || order.pincode || '';
    const city = order.shipping?.city || '';
    const tracking = order.shipping?.tracking_number || (order as any).tracking_number || order.id;

    const items = order.items || [];
    const itemsSummary = items
      .map((i) => `${i.name} x${i.quantity || i.qty || 1}`)
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
          <div class="label-barcode">||| ${tracking} |||</div>
          <div class="label-section">
            <strong>SHIP TO:</strong><br>
            ${custName}<br>
            ${shipAddr}<br>
            ${city} ${shipPin ? '- ' + shipPin : ''}<br>
            Phone: <strong>${custPhone}</strong>
          </div>
          <div class="label-section">
            <strong>ORDER DETAILS:</strong><br>
            Items: ${itemsSummary || 'Standard Order'}<br>
            Payment: <strong>${order.payment_method || order.payment?.method || 'UPI'}</strong> | Total: <strong>₹ ${Number(order.total || order.total_amount || 0).toLocaleString('en-IN')}</strong>
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

  // Full Tax Invoice Print
  const handlePrintTaxInvoice = (order: OrderRecord) => {
    const custName = order.customer?.name || order.customer_name || 'Customer';
    const custPhone = order.customer?.phone || order.customer_phone || '';
    const shipAddr = order.shipping?.address || order.shipping_address || 'Address on file';
    const items = order.items || [];
    const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up was blocked. Please allow pop-ups to print invoice.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tax Invoice - ${order.id}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; padding: 40px; margin: 0; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0b3b2c; padding-bottom: 20px; }
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
            ${custName}<br/>
            WhatsApp: ${custPhone}<br/>
            ${shipAddr}
          </div>
          <div class="meta-col" style="text-align: right;">
            <strong>Payment Summary:</strong><br/>
            Payment Mode: ${order.payment_method || order.payment?.method || 'Online PG'}<br/>
            Status: ${order.payment_status || order.payment?.status || 'Confirmed'}<br/>
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
              .map((item) => {
                const q = item.quantity || item.qty || 1;
                return `
                  <tr>
                    <td><strong>${item.name}</strong></td>
                    <td>${item.size ? 'Size: ' + item.size : ''} ${item.color ? '• Color: ' + item.color : ''}</td>
                    <td style="text-align: center;">${q}</td>
                    <td style="text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
                    <td style="text-align: right;">₹${(item.price * q).toLocaleString('en-IN')}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right;">₹${Number(order.subtotal || order.total || 0).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td>Delivery / Shipping:</td>
            <td style="text-align: right;">₹${order.delivery_fee || order.shipping?.fee || 0}</td>
          </tr>
          <tr class="grand-total">
            <td>Total Paid:</td>
            <td style="text-align: right;">₹${Number(order.total || order.total_amount || 0).toLocaleString('en-IN')}</td>
          </tr>
        </table>

        <div class="footer">
          This is a computer-generated invoice and requires no physical signature.<br/>
          Thank you for choosing <strong>Kashvi Fashions</strong>.
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // WhatsApp Messaging
  const sendWhatsAppUpdate = (order: OrderRecord) => {
    const custName = order.customer?.name || order.customer_name || 'Customer';
    const rawPhone = order.customer?.phone || order.customer_phone || '';
    const phone = rawPhone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('91') ? phone : `91${phone}`;

    const trackingNo = order.shipping?.tracking_number || (order as any).tracking_number;
    let trackingMsg = '';
    if ((order.status === 'dispatched' || order.order_status === 'dispatched') && trackingNo) {
      trackingMsg = `\n🚀 *Courier:* India Post\n📦 *Tracking Number:* ${trackingNo}\n🔗 *Track Here:* https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
    }

    const text = encodeURIComponent(
      `Hello ${custName},\n\n*Kashvi Fashions* Order Update:\n\n📦 *Order ID:* ${order.id}\n📊 *Status:* ${formatStatusName(order.status || order.order_status)}\n💰 *Total:* ₹ ${Number(order.total || order.total_amount || 0).toLocaleString('en-IN')}${trackingMsg}\n\nThank you for shopping with us!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert('No orders to export.');
      return;
    }

    const headers = ['Order ID', 'Date', 'Customer Name', 'Phone', 'Items Count', 'Total Amount', 'Status', 'Payment Status', 'Payment Method', 'Tracking Number'];
    const rows = filteredOrders.map((o) => {
      const custName = o.customer?.name || o.customer_name || 'Customer';
      const custPhone = o.customer?.phone || o.customer_phone || '-';
      const itemsCount = (o.items || []).length;
      const total = o.total || o.total_amount || 0;
      const date = new Date(o.created_at).toLocaleDateString('en-IN');
      const tracking = o.shipping?.tracking_number || (o as any).tracking_number || '-';

      return [
        `"${o.id}"`,
        `"${date}"`,
        `"${custName}"`,
        `"${custPhone}"`,
        itemsCount,
        total,
        `"${o.status || o.order_status}"`,
        `"${o.payment_status || o.payment?.status || '-'}"`,
        `"${o.payment_method || o.payment?.method || '-'}"`,
        `"${tracking}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Pipeline Logic
  const filteredOrders = useMemo(() => {
    let list = orders;

    // 1. Pipeline Stage Tab
    if (currentStageFilter !== 'all') {
      list = list.filter((o) => {
        const st = (o.status || o.order_status || '').toLowerCase();
        return st === currentStageFilter.toLowerCase();
      });
    }

    // 2. Payment Status Filter
    if (paymentFilter !== 'all') {
      list = list.filter((o) => {
        const payStatus = (o.payment_status || o.payment?.status || '').toLowerCase();
        if (paymentFilter === 'paid') return payStatus === 'paid';
        if (paymentFilter === 'pending') return payStatus === 'pending' || payStatus === 'payment_pending';
        if (paymentFilter === 'refunded') return payStatus === 'refunded' || o.is_refunded;
        return true;
      });
    }

    // 3. Date Range Filter
    if (dateFilter !== 'all') {
      const now = Date.now();
      list = list.filter((o) => {
        const orderTime = new Date(o.created_at).getTime();
        const diffDays = (now - orderTime) / (1000 * 3600 * 24);
        if (dateFilter === 'today') return diffDays <= 1;
        if (dateFilter === '7days') return diffDays <= 7;
        if (dateFilter === '30days') return diffDays <= 30;
        return true;
      });
    }

    // 4. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((o) => {
        const custName = (o.customer?.name || o.customer_name || '').toLowerCase();
        const custPhone = (o.customer?.phone || o.customer_phone || '').toLowerCase();
        const tracking = (o.shipping?.tracking_number || (o as any).tracking_number || '').toLowerCase();
        return (
          o.id.toLowerCase().includes(q) ||
          custName.includes(q) ||
          custPhone.includes(q) ||
          tracking.includes(q)
        );
      });
    }

    return list;
  }, [orders, currentStageFilter, paymentFilter, dateFilter, searchQuery]);

  return (
    <div className="space-y-4 font-sans text-xs select-none">
      
      {/* 1. TOP HEADER & MAIN SEARCH BAR */}
      <div className="p-4 rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] text-white flex items-center justify-center shadow-lg shadow-[#6d4aff]/30">
            <Package className="w-5 h-5 text-[#00d9ff]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Orders Command Deck</span>
              <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 text-[9.5px] font-mono">
                {orders.length} Total Live
              </span>
            </h2>
            <span className="text-[10px] text-[#8b9bb4]">
              8-Stage Dispatch Pipeline • Security PIN Rollback • India Post Speed Post
            </span>
          </div>
        </div>

        {/* Global Search & Export Buttons */}
        <div className="flex items-center gap-2.5 flex-1 max-w-lg justify-end">
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order ID, Name, Phone, AWB..."
              className="w-full pl-8 pr-3 py-2 bg-[#0a0e17] rounded-xl text-white text-[11px] outline-none border border-white/10 focus:border-[#00d9ff] placeholder:text-[#8b9bb4]/50"
            />
            <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Export filtered orders to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#00ff9d]" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={loadOrders}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-[#00d9ff] cursor-pointer transition-colors"
            title="Refresh Live Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. FINE-TUNING FILTER CONTROL BAR */}
      <div className="p-3 rounded-2xl bg-[#0a0e17]/80 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-[#101628] border border-white/10 rounded-xl px-2.5 py-1">
            <Calendar className="w-3 h-3 text-[#00d9ff]" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-white font-medium outline-none cursor-pointer [&>option]:bg-[#101628] [&>option]:text-white"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#101628] border border-white/10 rounded-xl px-2.5 py-1">
            <CreditCard className="w-3 h-3 text-[#00ff9d]" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-transparent text-white font-medium outline-none cursor-pointer [&>option]:bg-[#101628] [&>option]:text-white"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid & Confirmed</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        <div className="text-[10px] font-mono text-[#8b9bb4]">
          Showing <strong className="text-white">{filteredOrders.length}</strong> of {orders.length} orders
        </div>
      </div>

      {/* 3. PIPELINE STATUS FILTER PILLS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => setCurrentStageFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl font-mono text-[10.5px] font-bold border transition-all cursor-pointer shrink-0 ${
            currentStageFilter === 'all'
              ? 'bg-[#6d4aff] text-white border-[#6d4aff] shadow-md shadow-[#6d4aff]/40'
              : 'bg-[#101628] text-[#8b9bb4] border-white/10 hover:text-white'
          }`}
        >
          All ({orders.length})
        </button>

        {PIPELINE_STAGES.map((st) => {
          const count = orders.filter((o) => (o.status || o.order_status || '').toLowerCase() === st.key).length;
          const isActive = currentStageFilter === st.key;
          return (
            <button
              key={st.key}
              type="button"
              onClick={() => setCurrentStageFilter(st.key)}
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
          onClick={() => setCurrentStageFilter('cancelled')}
          className={`px-3 py-1.5 rounded-xl font-mono text-[10.5px] font-bold border transition-all cursor-pointer shrink-0 ${
            currentStageFilter === 'cancelled'
              ? 'bg-[#ff6b6b]/20 text-[#ff6b6b] border-[#ff6b6b]/50'
              : 'bg-[#101628] text-[#8b9bb4] border-white/10 hover:text-white'
          }`}
        >
          Cancelled ({orders.filter((o) => (o.status || o.order_status) === 'cancelled').length})
        </button>
      </div>

      {/* 4. ORDERS TABLE */}
      <div className="rounded-3xl bg-[#101628]/95 border border-white/10 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#0a0e17]/80 text-[#8b9bb4] font-mono text-[9.5px] uppercase tracking-wider">
                <th className="p-3.5">Order ID & Date</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Items</th>
                <th className="p-3.5">Amount & Payment</th>
                <th className="p-3.5">Current Stage</th>
                <th className="p-3.5">Pipeline Control</th>
                <th className="p-3.5 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#8b9bb4]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00d9ff] mb-2" />
                    Loading live orders pipeline...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#8b9bb4] italic">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const custName = order.customer?.name || order.customer_name || 'Customer';
                  const custPhone = order.customer?.phone || order.customer_phone || '-';
                  const payMethod = order.payment_method || order.payment?.method || 'UPI';
                  const payStatus = order.payment_status || order.payment?.status || 'Pending';
                  const items = order.items || [];
                  const currentStatus = order.status || order.order_status || 'new';
                  const tracking = order.shipping?.tracking_number || (order as any).tracking_number;

                  return (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Order ID & Date */}
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-white text-[11px] block">
                          {order.id}
                        </span>
                        <span className="text-[9.5px] text-[#8b9bb4] font-mono flex items-center gap-1 mt-0.5">
                          <Calendar className="w-2.5 h-2.5 text-[#00d9ff]" />
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </td>

                      {/* Customer Info */}
                      <td className="p-3.5">
                        <span className="font-bold text-white block">
                          {custName}
                        </span>
                        <span className="text-[9.5px] text-[#8b9bb4] font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5 text-[#00ff9d]" />
                          {custPhone}
                        </span>
                      </td>

                      {/* Items Count & First Item Preview */}
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-[#00d9ff] text-[11px] block">
                          {items.length} Item{items.length > 1 ? 's' : ''}
                        </span>
                        {items[0] && (
                          <span className="text-[9.5px] text-[#8b9bb4] truncate block max-w-[140px]">
                            {items[0].name}
                          </span>
                        )}
                      </td>

                      {/* Amount & Payment */}
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-[#00ff9d] text-[11px] block">
                          ₹ {Number(order.total || order.total_amount || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/90 inline-block mt-0.5">
                          {payMethod} ({payStatus})
                        </span>
                      </td>

                      {/* Current Stage Badge with Tracking note */}
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-xl text-[9.5px] font-mono font-bold border border-white/10 bg-white/5 text-white inline-block">
                          {formatStatusName(currentStatus)}
                        </span>
                        {tracking && (
                          <span className="text-[8.5px] font-mono text-[#38bdf8] block mt-0.5">
                            AWB: {tracking}
                          </span>
                        )}
                      </td>

                      {/* Pipeline Stage Selector */}
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

                      {/* Row Action Buttons */}
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailDrawer(true);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#00d9ff]/20 text-[#8b9bb4] hover:text-[#00d9ff] cursor-pointer transition-colors"
                            title="View Full Order Details"
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

      {/* ========================================================================= */}
      {/* 5. ORDER DETAILS DRAWER (MODAL)                                           */}
      {/* ========================================================================= */}
      {showDetailDrawer && selectedOrder && (
        <div className="fixed inset-0 z-[1000] flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#101628] border-l border-white/10 w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0a0e17]/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#00d9ff]">
                  <Package className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white font-mono flex items-center gap-2">
                    <span>{selectedOrder.id}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40">
                      {formatStatusName(selectedOrder.status || selectedOrder.order_status)}
                    </span>
                  </h3>
                  <span className="text-[10px] text-[#8b9bb4]">
                    Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailDrawer(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              
              {/* Visual 8-Stage Progress Tracker */}
              <div className="p-3.5 bg-[#0a0e17] rounded-2xl border border-white/10 overflow-x-auto custom-scrollbar">
                <span className="text-[10px] font-mono text-[#8b9bb4] uppercase tracking-wider block mb-2.5">
                  Pipeline Stage Tracker
                </span>
                <div className="flex items-center justify-between min-w-[500px] relative">
                  {PIPELINE_STAGES.map((st, idx) => {
                    const currentStatus = selectedOrder.status || selectedOrder.order_status || 'new';
                    const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === currentStatus.toLowerCase());
                    const isCompleted = currentIdx > idx;
                    const isCurrent = currentIdx === idx;

                    return (
                      <div key={st.key} className="flex flex-col items-center flex-1 relative z-10">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] font-bold transition-all ${
                            isCompleted
                              ? 'bg-[#00ff9d] text-neutral-950 shadow-[0_0_10px_#00ff9d]'
                              : isCurrent
                              ? 'bg-[#00d9ff] text-neutral-950 ring-4 ring-[#00d9ff]/30 font-extrabold'
                              : 'bg-white/10 text-[#8b9bb4]'
                          }`}
                        >
                          {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                        </div>
                        <span
                          className={`text-[8.5px] mt-1.5 text-center font-mono ${
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

              {/* Customer & Shipping Details Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10 space-y-1.5">
                  <span className="text-[10px] font-mono text-[#00d9ff] uppercase font-bold flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Customer Profile
                  </span>
                  <span className="text-white font-bold block text-xs">
                    {selectedOrder.customer?.name || selectedOrder.customer_name || 'Customer'}
                  </span>
                  <span className="text-[#8b9bb4] block font-mono text-[10.5px]">
                    Phone: {selectedOrder.customer?.phone || selectedOrder.customer_phone || '-'}
                  </span>
                  {selectedOrder.customer_email && (
                    <span className="text-[#8b9bb4] block font-mono text-[10px] truncate">
                      {selectedOrder.customer_email}
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10 space-y-1.5">
                  <span className="text-[10px] font-mono text-[#00ff9d] uppercase font-bold flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Delivery Destination
                  </span>
                  <p className="text-white text-[10.5px] leading-relaxed">
                    {selectedOrder.shipping?.address || selectedOrder.shipping_address || 'Address on record'}
                  </p>
                  {(selectedOrder.shipping?.tracking_number || (selectedOrder as any).tracking_number) && (
                    <span className="text-[9.5px] text-[#38bdf8] font-mono block mt-1">
                      India Post AWB: <strong>{selectedOrder.shipping?.tracking_number || (selectedOrder as any).tracking_number}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0e17]">
                <div className="p-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                    Ordered Products ({selectedOrder.items?.length || 0})
                  </span>
                </div>
                <table className="w-full text-left">
                  <thead className="text-[#8b9bb4] font-mono text-[9px] uppercase border-b border-white/10">
                    <tr>
                      <th className="p-2.5">Item Info</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[10.5px]">
                    {(selectedOrder.items || []).map((itm, i) => {
                      const qty = itm.quantity || itm.qty || 1;
                      return (
                        <tr key={i} className="text-white">
                          <td className="p-2.5">
                            <div className="flex items-center gap-2">
                              {itm.image && (
                                <img
                                  src={itm.image}
                                  alt={itm.name}
                                  className="w-8 h-10 object-cover rounded-md border border-white/10 shrink-0"
                                />
                              )}
                              <div>
                                <strong className="block leading-tight">{itm.name}</strong>
                                <div className="text-[9.5px] text-[#8b9bb4] flex gap-1.5 mt-0.5">
                                  {itm.color && <span>Color: {itm.color}</span>}
                                  {itm.size && <span>• Size: {itm.size}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-2.5 text-center text-[#00d9ff] font-bold">{qty}</td>
                          <td className="p-2.5 text-right text-[#8b9bb4]">₹ {itm.price}</td>
                          <td className="p-2.5 text-right font-bold text-[#00ff9d]">
                            ₹ {(qty * itm.price).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Payment Breakdown Card */}
              <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between text-[#8b9bb4]">
                  <span>Subtotal</span>
                  <span className="text-white font-mono">
                    ₹ {Number(selectedOrder.subtotal || selectedOrder.total || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-[#8b9bb4]">
                  <span>Delivery / Shipping</span>
                  <span className="text-white font-mono">
                    ₹ {selectedOrder.delivery_fee || selectedOrder.shipping?.fee || 0}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10 text-sm font-bold">
                  <span className="text-white">Total Amount Paid</span>
                  <span className="text-base font-extrabold text-[#00ff9d] font-mono">
                    ₹ {Number(selectedOrder.total || selectedOrder.total_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="pt-1 text-[10px] text-[#8b9bb4] flex justify-between border-t border-white/5">
                  <span>Payment Gateway: {selectedOrder.payment_method || selectedOrder.payment?.method || 'Online'}</span>
                  <span className="text-[#00ff9d] font-bold capitalize">
                    {selectedOrder.payment_status || selectedOrder.payment?.status || 'Paid'}
                  </span>
                </div>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-white/10 bg-[#0a0e17]/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintTaxInvoice(selectedOrder)}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#00d9ff]" />
                  <span>Tax Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => printShippingLabel(selectedOrder)}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-[#00ff9d]" />
                  <span>4x6 Label</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => sendWhatsAppUpdate(selectedOrder)}
                className="px-4 py-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Customer</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SECURITY PIN MODAL FOR STEP ROLLBACK                                    */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 7. INDIA POST TRACKING NUMBER MODAL                                       */}
      {/* ========================================================================= */}
      {dispatchOrderId && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#101628] border border-[#38bdf8]/40 rounded-3xl p-5 max-w-sm w-full space-y-3.5 relative shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#38bdf8]">
              <Truck className="w-5 h-5" />
              <h3 className="font-extrabold text-sm text-white">India Post Dispatch</h3>
            </div>

            <p className="text-[10.5px] text-[#8b9bb4]">
              Enter Speed Post consignment tracking ID for Order <strong className="text-white">{dispatchOrderId}</strong>:
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

      {/* ========================================================================= */}
      {/* 8. CANCEL & REFUND UTR MODAL                                              */}
      {/* ========================================================================= */}
      {refundOrderId && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#101628] border border-[#ff6b6b]/40 rounded-3xl p-5 max-w-sm w-full space-y-3.5 relative shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#ff6b6b]">
              <RotateCcw className="w-5 h-5" />
              <h3 className="font-extrabold text-sm text-white">Cancel & Refund UTR</h3>
            </div>

            <p className="text-[10.5px] text-[#8b9bb4]">
              Enter Bank / UPI Refund UTR reference for Order <strong className="text-white">{refundOrderId}</strong>:
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