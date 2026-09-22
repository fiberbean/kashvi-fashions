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
  ChevronDown,
  ArrowLeft
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
  payment_type?: string;
  payment_mode?: string;
  bank_reference?: string;
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
    payment_type?: string;
    utr?: string;
    bank_reference?: string;
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
    code?: string;
    sku?: string;
    product_code?: string;
  }> | null;
  refund?: {
    utr?: string;
    date?: string;
  } | null;
  is_refunded?: boolean;
}

interface StoreSettingsData {
  store_name: string;
  sender_address: string;
  city: string;
  state: string;
  pincode: string;
  support_phone: string;
  support_email: string;
  whatsapp_no: string;
  upi_payee_name?: string;
  pipeline_pin?: string;
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

  const [storeConfig, setStoreConfig] = useState<StoreSettingsData>({
    store_name: 'Kashvi Fashions',
    sender_address: 'Main Road, Near Clock Tower',
    city: 'Kakinada',
    state: 'Andhra Pradesh',
    pincode: '533001',
    support_phone: '8686353574',
    support_email: 'contact@kashvifashions.com',
    whatsapp_no: '8686353574',
    pipeline_pin: '1234'
  });

  const [currentStageFilter, setCurrentStageFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  const [confirmStageChange, setConfirmStageChange] = useState<{
    orderId: string;
    targetStatus: string;
    currentStatus: string;
  } | null>(null);

  const [pendingRollback, setPendingRollback] = useState<{
    orderId: string;
    targetStatus: string;
    prevStatus: string;
  } | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [dispatchOrderId, setDispatchOrderId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string>('');

  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
  const [refundUtr, setRefundUtr] = useState<string>('');

  const fetchStoreConfig = async () => {
    try {
      const { data } = await supabase
        .from('store_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data) {
        setStoreConfig({
          store_name: data.store_name || data.upi_payee_name || 'Kashvi Fashions',
          sender_address: data.sender_address || 'Main Road, Near Clock Tower',
          city: data.city || 'Kakinada',
          state: data.state || 'Andhra Pradesh',
          pincode: data.pincode || '533001',
          support_phone: data.support_phone || data.whatsapp_no || '8686353574',
          support_email: data.support_email || 'contact@kashvifashions.com',
          whatsapp_no: data.whatsapp_no || '8686353574',
          pipeline_pin: data.pipeline_pin || '1234'
        });
      }
    } catch (err) {
      console.warn('Store config load warning:', err);
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
      
      // Filter out Offline Store Bills (KFINV series & offline type) strictly for Online Orders Pipeline
      const onlineOrders = (data || []).filter((o: any) => {
        const orderId = String(o.id || '').toUpperCase().trim();
        const orderType = String(o.order_type || '').toLowerCase().trim();
        const isOfflineBill = orderId.startsWith('KFINV');
        const isOfflineCustomer = orderType === 'offline' || String(o.customer_id || '').toUpperCase().startsWith('CUST');
        return !isOfflineBill && !isOfflineCustomer;
      });

      setOrders(onlineOrders);
    } catch (err: any) {
      console.error('Orders load error:', err);
      setErrorMsg(err.message || 'Failed to load live orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreConfig();
    loadOrders();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmStageChange) setConfirmStageChange(null);
        else if (pendingRollback) setPendingRollback(null);
        else if (dispatchOrderId) setDispatchOrderId(null);
        else if (refundOrderId) setRefundOrderId(null);
        else if (showDetailModal) setShowDetailModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmStageChange, pendingRollback, dispatchOrderId, refundOrderId, showDetailModal]);

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

  const handleStageSelectChange = (orderId: string, targetStatus: string, currentStatus: string) => {
    if (currentStatus === targetStatus) return;

    setConfirmStageChange({
      orderId,
      targetStatus,
      currentStatus,
    });
  };

  const handleProceedStageChange = async () => {
    if (!confirmStageChange) return;

    const { orderId, targetStatus, currentStatus } = confirmStageChange;
    setConfirmStageChange(null);

    const currentRank = getStageRank(currentStatus);
    const targetRank = getStageRank(targetStatus);

    if (targetRank < currentRank) {
      setPendingRollback({ orderId, targetStatus, prevStatus: currentStatus });
      setEnteredPin('');
      setPinError(null);
      return;
    }

    if (targetStatus === 'dispatched') {
      setDispatchOrderId(orderId);
      setTrackingNumber('');
      return;
    }

    if (targetStatus === 'cancelled') {
      setRefundOrderId(orderId);
      setRefundUtr('');
      return;
    }

    await updateOrderStatus(orderId, targetStatus);
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin.trim() !== storeConfig.pipeline_pin) {
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

  const printShippingLabel = (order: OrderRecord) => {
    const custName = order.customer?.name || order.customer_name || 'Customer';
    const custPhone = order.customer?.phone || order.customer_phone || '-';
    const shipAddr = order.shipping?.address || order.shipping_address || '';
    const shipPin = order.shipping?.pincode || order.pincode || '';
    const city = order.shipping?.city || '';
    const tracking = order.shipping?.tracking_number || (order as any).tracking_number || order.id;

    const items = order.items || [];
    const itemsListHtml = items
      .map((i) => `<li><b>${i.name}</b> ${i.size ? `(${i.size})` : ''} ${i.color ? `[${i.color}]` : ''} &times; ${i.quantity || i.qty || 1}</li>`)
      .join('');

    const storeTitle = (storeConfig.store_name || 'KASHVI FASHIONS').toUpperCase();
    const returnAddressText = `${storeConfig.sender_address}, ${storeConfig.city}, ${storeConfig.state} - ${storeConfig.pincode}`;
    const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const printWindow = window.open('', '_blank', 'width=460,height=680');
    if (!printWindow) return;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Shipping Label • ${order.id}</title>
  <meta charset="utf-8" />
  <style>
    @page {
      size: 4in 6in;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #ffffff;
      color: #0f172a;
      padding: 14px;
      font-size: 11px;
      line-height: 1.35;
    }
    .label-wrapper {
      width: 100%;
      height: 100%;
      border: 2px solid #0f172a;
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #0f172a;
    }
    .courier-badge {
      background: #0f172a;
      color: #ffffff;
      padding: 4px 8px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 9px;
      letter-spacing: 1px;
    }
    .barcode-box {
      text-align: center;
      margin: 10px 0;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      padding: 8px;
      border-radius: 8px;
    }
    .barcode-bars {
      font-family: 'Courier New', Courier, monospace;
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 5px;
      color: #0f172a;
    }
    .barcode-text {
      font-family: monospace;
      font-size: 10px;
      font-weight: bold;
      color: #475569;
      margin-top: 3px;
    }
    .dest-card {
      background: #f1f5f9;
      border-left: 4px solid #0f172a;
      padding: 10px;
      border-radius: 4px 8px 8px 4px;
      margin-bottom: 8px;
    }
    .dest-tag {
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #475569;
      display: block;
      margin-bottom: 4px;
    }
    .dest-name {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .dest-address {
      font-size: 11px;
      color: #1e293b;
      line-height: 1.4;
    }
    .dest-pincode {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 1px;
      margin-top: 4px;
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .items-preview-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 8px;
      background: #ffffff;
    }
    .items-preview-box span {
      font-size: 9px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: block;
      margin-bottom: 3px;
    }
    .items-preview-box ul {
      padding-left: 14px;
      font-size: 10px;
      color: #334155;
    }
    .order-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 8px;
    }
    .meta-pill {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 5px 8px;
      border-radius: 6px;
    }
    .meta-pill-label {
      font-size: 8.5px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: bold;
      display: block;
    }
    .meta-pill-val {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
    }
    .sender-box {
      border-top: 1.5px solid #0f172a;
      padding-top: 6px;
      font-size: 9.5px;
      color: #475569;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .sender-box strong {
      color: #0f172a;
    }
  </style>
</head>
<body onload="window.print(); window.close();">
  <div class="label-wrapper">
    <div>
      <div class="header-row">
        <div>
          <div class="brand-title">${storeTitle}</div>
          <div style="font-size: 8.5px; color: #64748b; letter-spacing: 1px; font-weight: 600;">SPEED POST PRIORITY</div>
        </div>
        <div class="courier-badge">INDIA POST</div>
      </div>

      <div class="barcode-box">
        <div class="barcode-bars">|||||| ${tracking} ||||||</div>
        <div class="barcode-text">AWB: ${tracking}</div>
      </div>

      <div class="dest-card">
        <span class="dest-tag">Deliver To Destination</span>
        <div class="dest-name">${custName}</div>
        <div class="dest-address">
          ${shipAddr}<br/>
          ${city ? `${city}, ` : ''}
          Phone: <b>${custPhone}</b>
        </div>
        <div class="dest-pincode">PIN: ${shipPin}</div>
      </div>

      <div class="order-meta-grid">
        <div class="meta-pill">
          <span class="meta-pill-label">Order Ref & Date</span>
          <span class="meta-pill-val">${order.id} • ${formattedDate}</span>
        </div>
        <div class="meta-pill">
          <span class="meta-pill-label">Payment Mode</span>
          <span class="meta-pill-val">${(order.payment_method || order.payment?.method || 'Prepaid').toUpperCase()} • ₹${Number(order.total || order.total_amount || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div class="items-preview-box">
        <span>Package Contents (${items.length} item${items.length > 1 ? 's' : ''})</span>
        <ul>
          ${itemsListHtml || '<li>Standard Order Package</li>'}
        </ul>
      </div>
    </div>

    <div class="sender-box">
      <div>
        <strong>RETURN IF UNDELIVERED TO:</strong><br/>
        <b>${storeTitle}</b>, ${returnAddressText}<br/>
        Helpline: ${storeConfig.support_phone}
      </div>
      <div style="font-weight: 800; font-size: 10px; color: #0f172a;">PREPAID</div>
    </div>
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintTaxInvoice = (order: OrderRecord) => {
    const custName = order.customer?.name || order.customer_name || 'Customer';
    const custPhone = order.customer?.phone || order.customer_phone || '';
    const custEmail = order.customer?.email || order.customer_email || '';
    const shipAddr = order.shipping?.address || order.shipping_address || 'Address on file';
    const shipCity = order.shipping?.city || '';
    const shipPin = order.shipping?.pincode || order.pincode || '';
    const items = order.items || [];
    const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const storeTitle = (storeConfig.store_name || 'Kashvi Fashions').toUpperCase();
    const returnAddressText = `${storeConfig.sender_address}, ${storeConfig.city}, ${storeConfig.state} - ${storeConfig.pincode}`;

    const rawPayMethod = (order.payment_method || order.payment?.method || '').toLowerCase();
    const rawPayType = (order.payment_type || order.payment_mode || order.payment?.payment_type || '').toLowerCase();
    
    let resolvedPaymentType = 'Online Payment';
    if (rawPayType.includes('credit') || rawPayMethod.includes('credit')) {
      resolvedPaymentType = 'Credit Card';
    } else if (rawPayType.includes('debit') || rawPayMethod.includes('debit')) {
      resolvedPaymentType = 'Debit Card';
    } else if (rawPayType.includes('upi') || rawPayMethod.includes('upi') || rawPayMethod.includes('gpay') || rawPayMethod.includes('phonepe')) {
      resolvedPaymentType = 'UPI Payment';
    } else if (rawPayType.includes('net') || rawPayMethod.includes('netbanking')) {
      resolvedPaymentType = 'Net Banking';
    } else if (rawPayMethod.includes('cashfree')) {
      resolvedPaymentType = 'Online (UPI / Card / Net Banking)';
    } else if (rawPayMethod) {
      resolvedPaymentType = order.payment_method || 'Prepaid';
    }

    const resolvedUtr =
      order.bank_reference ||
      order.payment?.utr ||
      order.payment?.bank_reference ||
      order.refund?.utr ||
      order.payment_reference ||
      order.id;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up was blocked. Please allow pop-ups to print bill.');
      return;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Bill • ${order.id}</title>
  <meta charset="utf-8" />
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11.5px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .bill-card {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 26px 30px;
    }
    .top-brand-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 18px;
    }
    .brand-name {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #0f172a;
    }
    .brand-contact {
      font-size: 11px;
      color: #475569;
      margin-top: 5px;
      line-height: 1.4;
    }
    .receipt-tag {
      text-align: right;
    }
    .bill-pill {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      padding: 5px 14px;
      border-radius: 9999px;
      margin-bottom: 6px;
    }
    .invoice-num {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      font-family: monospace;
    }
    .invoice-date {
      font-size: 11px;
      color: #64748b;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 16px;
      margin: 20px 0 16px 0;
    }
    .info-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }
    .info-block-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #334155;
      display: block;
      margin-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .info-block-val {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }
    .info-block-text {
      font-size: 11px;
      color: #334155;
      line-height: 1.5;
      margin-top: 4px;
    }

    .pay-row {
      margin-bottom: 8px;
    }
    .pay-row:last-child {
      margin-bottom: 0;
    }
    .pay-label {
      font-size: 9.5px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      display: block;
    }
    .pay-val {
      font-size: 11.5px;
      font-weight: 800;
      color: #0f172a;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    th {
      background: #f8fafc;
      color: #475569;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 800;
      padding: 10px 12px;
      text-align: left;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    th:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
    th:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; text-align: right; }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 11.5px;
      vertical-align: middle;
    }
    td:last-child {
      text-align: right;
      font-weight: 800;
      color: #0f172a;
    }
    .product-code-badge {
      font-family: monospace;
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      background: #e2e8f0;
      padding: 1.5px 5px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 2px;
    }
    .product-name-title {
      font-weight: 800;
      color: #0f172a;
      font-size: 12px;
    }
    .size-val {
      font-weight: 700;
      color: #0f172a;
    }
    .color-val {
      font-size: 10.5px;
      color: #64748b;
    }
    .qty-val {
      font-weight: 800;
      color: #0f172a;
      font-size: 12px;
    }
    .units-label {
      font-size: 9.5px;
      color: #64748b;
    }

    .summary-card {
      width: 48%;
      margin-left: auto;
      margin-top: 18px;
      background: #f8fafc;
      border-radius: 12px;
      padding: 14px 18px;
      border: 1px solid #f1f5f9;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      color: #475569;
      margin-bottom: 6px;
    }
    .summary-row.total {
      border-top: 2px solid #0f172a;
      padding-top: 8px;
      margin-top: 8px;
      margin-bottom: 0;
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
    }

    .thank-you-footer {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
      text-align: center;
      color: #64748b;
      font-size: 11px;
      line-height: 1.5;
    }
    .thank-you-footer strong {
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="bill-card">
    
    <div class="top-brand-bar">
      <div>
        <div class="brand-name">${storeTitle}</div>
        <div class="brand-contact">
          ${returnAddressText}<br/>
          Helpline: +91 ${storeConfig.support_phone} • Email: ${storeConfig.support_email}
        </div>
      </div>
      <div class="receipt-tag">
        <span class="bill-pill">BILL</span>
        <div class="invoice-num">${order.id}</div>
        <div class="invoice-date">${formattedDate}</div>
      </div>
    </div>

    <div class="details-grid">
      <div class="info-block">
        <span class="info-block-title">Customer & Delivery Details</span>
        <div class="info-block-val">${custName}</div>
        <div class="info-block-text">
          WhatsApp: <b>${custPhone}</b>${custEmail ? ` • Email: ${custEmail}` : ''}<br/>
          ${shipAddr}<br/>
          ${shipCity ? `${shipCity}, ` : ''}${shipPin ? `PIN: <b>${shipPin}</b>` : ''}
        </div>
      </div>

      <div class="info-block">
        <span class="info-block-title">Payment Details</span>
        <div class="pay-row">
          <span class="pay-label">Payment Type</span>
          <span class="pay-val">${resolvedPaymentType}</span>
        </div>
        <div class="pay-row">
          <span class="pay-label">UTR / Reference Number</span>
          <span class="pay-val" style="font-family: monospace; font-size: 11px;">${resolvedUtr}</span>
        </div>
        <div class="pay-row">
          <span class="pay-label">Payment Status</span>
          <span class="pay-val" style="color: #059669;">${(order.payment_status || order.payment?.status || 'PAID').toUpperCase()}</span>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 42%;">Product Code / Name</th>
          <th style="width: 22%;">Size / Colour</th>
          <th style="width: 14%; text-align: center;">Qty / Units</th>
          <th style="width: 11%; text-align: right;">Price</th>
          <th style="width: 11%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((item, idx) => {
            const q = item.quantity || item.qty || 1;
            const itemCode = item.product_code || item.sku || item.code || `PRD-${String(idx + 1).padStart(3, '0')}`;
            return `
              <tr>
                <td>
                  <div class="product-code-badge">${itemCode}</div>
                  <div class="product-name-title">${item.name}</div>
                </td>
                <td>
                  <div class="size-val">Size: ${item.size || 'Free Size'}</div>
                  <div class="color-val">Colour: ${item.color || 'Standard'}</div>
                </td>
                <td style="text-align: center;">
                  <div class="qty-val">${q}</div>
                  <div class="units-label">Units</div>
                </td>
                <td style="text-align: right; color: #475569;">₹${item.price.toLocaleString('en-IN')}</td>
                <td>₹${(item.price * q).toLocaleString('en-IN')}</td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>

    <div class="summary-card">
      <div class="summary-row">
        <span>Items Subtotal</span>
        <span>₹${Number(order.subtotal || order.total || 0).toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row">
        <span>Delivery Charges</span>
        <span>₹${order.delivery_fee || order.shipping?.fee || 0}</span>
      </div>
      <div class="summary-row total">
        <span>Total Paid Amount</span>
        <span>₹${Number(order.total || order.total_amount || 0).toLocaleString('en-IN')}</span>
      </div>
    </div>

    <div class="thank-you-footer">
      Thank you for shopping with <strong>${storeTitle}</strong>.<br/>
      For support or tracking queries, reach us on WhatsApp at <strong>+91 ${storeConfig.whatsapp_no}</strong>.
    </div>

  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

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
      `Hello ${custName},\n\n*${storeConfig.store_name || 'Kashvi Fashions'}* Order Update:\n\n📦 *Order ID:* ${order.id}\n📊 *Status:* ${formatStatusName(order.status || order.order_status)}\n💰 *Total:* ₹ ${Number(order.total || order.total_amount || 0).toLocaleString('en-IN')}${trackingMsg}\n\nThank you for shopping with us!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

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

  const filteredOrders = useMemo(() => {
    let list = orders;

    if (currentStageFilter !== 'all') {
      list = list.filter((o) => {
        const st = (o.status || o.order_status || '').toLowerCase();
        return st === currentStageFilter.toLowerCase();
      });
    }

    if (paymentFilter !== 'all') {
      list = list.filter((o) => {
        const payStatus = (o.payment_status || o.payment?.status || '').toLowerCase();
        if (paymentFilter === 'paid') return payStatus === 'paid';
        if (paymentFilter === 'pending') return payStatus === 'pending' || payStatus === 'payment_pending';
        if (paymentFilter === 'refunded') return payStatus === 'refunded' || o.is_refunded;
        return true;
      });
    }

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
                {orders.length} Online Web Orders
              </span>
            </h2>
            <span className="text-[10px] text-[#8b9bb4]">
              {storeConfig.store_name} • 8-Stage Dispatch Pipeline • India Post Speed Post
            </span>
          </div>
        </div>

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
          Showing <strong className="text-white">{filteredOrders.length}</strong> online orders
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
                    Loading online orders pipeline...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#8b9bb4] italic">
                    No online orders match your filter criteria.
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

                      <td className="p-3.5">
                        <span className="font-bold text-white block">
                          {custName}
                        </span>
                        <span className="text-[9.5px] text-[#8b9bb4] font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5 text-[#00ff9d]" />
                          {custPhone}
                        </span>
                      </td>

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

                      <td className="p-3.5">
                        <span className="font-mono font-bold text-[#00ff9d] text-[11px] block">
                          ₹ {Number(order.total || order.total_amount || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/90 inline-block mt-0.5">
                          {payMethod} ({payStatus})
                        </span>
                      </td>

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

                      <td className="p-3.5">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStageSelectChange(order.id, e.target.value, currentStatus)}
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

                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailModal(true);
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

      {/* 5. CENTER POPUP MODAL: VIEW FULL ORDER DETAILS */}
      {showDetailModal && selectedOrder && (
        <div
          onClick={() => setShowDetailModal(false)}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#101628] border border-white/15 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default animate-in zoom-in-95 duration-200"
          >
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0a0e17]/80 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white transition-colors cursor-pointer mr-0.5"
                  title="Go Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#00d9ff] shrink-0">
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
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
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

            <div className="p-4 border-t border-white/10 bg-[#0a0e17]/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-[#8b9bb4] hover:text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Orders</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintTaxInvoice(selectedOrder)}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#00d9ff]" />
                  <span>Bill</span>
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

      {/* 6. PIPELINE STAGE CHANGE CONFIRMATION MODAL */}
      {confirmStageChange && (
        <div 
          onClick={() => setConfirmStageChange(null)}
          className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#101628] border border-[#00d9ff]/30 rounded-3xl p-6 max-w-sm w-full space-y-4 relative shadow-2xl cursor-default animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3 text-[#00d9ff]">
              <div className="w-10 h-10 rounded-2xl bg-[#00d9ff]/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[#00d9ff]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Confirm Pipeline Change</h3>
                <span className="text-[10px] text-[#8b9bb4] font-mono">Order: {confirmStageChange.orderId}</span>
              </div>
            </div>

            <p className="text-[11.5px] text-[#8b9bb4] leading-relaxed">
              Are you sure you want to change status from{' '}
              <strong className="text-white font-mono bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                {formatStatusName(confirmStageChange.currentStatus)}
              </strong>{' '}
              to{' '}
              <strong className="text-[#00ff9d] font-mono bg-[#00ff9d]/10 px-2 py-0.5 rounded-md border border-[#00ff9d]/30">
                {formatStatusName(confirmStageChange.targetStatus)}
              </strong>?
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmStageChange(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-[#8b9bb4] hover:text-white rounded-xl font-bold cursor-pointer transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedStageChange}
                className="flex-1 py-2.5 bg-[#00d9ff] hover:bg-[#00c0e0] text-neutral-950 font-extrabold rounded-xl cursor-pointer shadow-lg shadow-[#00d9ff]/25 transition-all text-xs"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. SECURITY PIN MODAL FOR STEP ROLLBACK */}
      {pendingRollback && (
        <div 
          onClick={() => setPendingRollback(null)}
          className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#101628] border border-[#ff6b6b]/40 rounded-3xl p-5 max-w-sm w-full space-y-3.5 relative shadow-2xl cursor-default animate-in zoom-in-95 duration-200"
          >
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

      {/* 8. INDIA POST TRACKING NUMBER MODAL */}
      {dispatchOrderId && (
        <div 
          onClick={() => setDispatchOrderId(null)}
          className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#101628] border border-[#38bdf8]/40 rounded-3xl p-5 max-w-sm w-full space-y-3.5 relative shadow-2xl cursor-default animate-in zoom-in-95 duration-200"
          >
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

      {/* 9. CANCEL & REFUND UTR MODAL */}
      {refundOrderId && (
        <div 
          onClick={() => setRefundOrderId(null)}
          className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#101628] border border-[#ff6b6b]/40 rounded-3xl p-5 max-w-sm w-full space-y-3.5 relative shadow-2xl cursor-default animate-in zoom-in-95 duration-200"
          >
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