import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Truck,
  ChevronLeft,
  MapPin,
  Home,
  Briefcase,
  Bookmark,
  Loader2,
  PackageCheck,
  XCircle,
  Clock3,
  RotateCcw,
  MessageCircle,
  LogIn,
  Sparkles,
} from 'lucide-react';
import { load } from '@cashfreepayments/cashfree-js';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface Address {
  id: string;
  name: string;
  whatsapp_number: string;
  email?: string;
  door_no: string;
  building_name: string;
  street: string;
  area: string;
  pincode: string;
  city: string;
  state: string;
  address_type?: 'Home' | 'Work' | 'Others' | string;
  custom_label?: string;
  zone_type?: string;
  is_default?: boolean;
}

interface ConfirmedOrderInfo {
  orderId: string;
  totalAmount: number;
  subtotal: number;
  shippingCharge: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  gateway: string;
  items: any[];
}

interface PaymentStatusState {
  type: 'success' | 'failed' | 'user_dropped' | 'pending';
  title: string;
  message: string;
  orderId?: string;
}

const COLOR_HEX_MAP: Record<string, string> = {
  pink: '#e83e8c',
  magenta: '#d63384',
  beige: '#f5e1d5',
  skin: '#e8beac',
  nude: '#d2b48c',
  black: '#1f2937',
  white: '#ffffff',
  red: '#dc2626',
  maroon: '#800000',
  wine: '#722f37',
  navy: '#0f172a',
  blue: '#2563eb',
  green: '#16a34a',
  purple: '#9333ea',
  yellow: '#eab308',
  grey: '#4b5563',
};

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    openCart,
    closeCart,
    updateQty,
    removeFromCart,
    clearCart,
    totalItems,
    subtotal,
    shippingCharge,
    setShippingCharge,
    setUserPincode,
    totalDue,
  } = useCart();

  const authContext = useAuth();
  const { user, customer } = authContext;

  const [activeStep, setActiveStep] = useState<'cart' | 'address' | 'order_result'>('cart');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeGatewayName, setActiveGatewayName] = useState<string>('Cashfree Payments');
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrderInfo | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentStatusState | null>(null);

  const [savedAddresses, setSavedAddresses] = useState<Address[]>(() => {
    try {
      const saved = localStorage.getItem('kashvi_saved_addresses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    name: customer?.name || user?.user_metadata?.name || '',
    whatsapp_number: customer?.mobile || user?.user_metadata?.whatsapp_number || '',
    email: customer?.email || user?.email || '',
    door_no: '',
    building_name: '',
    street: '',
    area: '',
    pincode: '',
    city: '',
    state: '',
    address_type: 'Home' as 'Home' | 'Work' | 'Others',
    custom_label: '',
    zone_type: '',
  });

  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState<{
    zoneType?: string;
    deliveryAvailable?: boolean;
    message?: string;
  } | null>(null);

  const hasJewelleryItems = cart.some((item) => item?.department === 'jewellery');

  // బలమైన Auth Modal Trigger ఫంక్షన్
  const triggerAuthModal = () => {
    // 1. మొబైల్ స్క్రీన్‌పై లాగిన్ మోడల్ కనిపించడానికి ముందుగా కార్ట్ డ్రాయర్ క్లోజ్ చేయాలి
    closeCart();

    // 2. AuthContext లో ఉన్న ప్రతి సంభావ్య మెథడ్‌ను ప్రయత్నించడం
    const ctx = authContext as any;
    if (typeof ctx.openAuthModal === 'function') {
      ctx.openAuthModal();
      return;
    }
    if (typeof ctx.setIsAuthOpen === 'function') {
      ctx.setIsAuthOpen(true);
      return;
    }
    if (typeof ctx.setIsAuthModalOpen === 'function') {
      ctx.setIsAuthModalOpen(true);
      return;
    }
    if (typeof ctx.setShowAuthModal === 'function') {
      ctx.setShowAuthModal(true);
      return;
    }

    // 3. Custom Event ఫాల్‌బ్యాక్
    window.dispatchEvent(new CustomEvent('open-auth-modal'));

    // 4. హెడర్ బటన్ ఫాల్‌బ్యాక్
    setTimeout(() => {
      const selectors = [
        '[aria-label="User Account"]',
        '[aria-label="Account"]',
        '[aria-label="User Profile"]',
        'button:has(svg.lucide-user)',
      ];
      for (const sel of selectors) {
        const btn = document.querySelector(sel) as HTMLButtonElement | null;
        if (btn) {
          btn.click();
          break;
        }
      }
    }, 50);
  };

  // యూజర్ లాగిన్ అవ్వగానే ఆటోమేటిక్‌గా అడ్రస్ స్టెప్‌కు తీసుకురావడం
  useEffect(() => {
    if (user || customer) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || customer?.name || user?.user_metadata?.name || '',
        whatsapp_number: prev.whatsapp_number || customer?.mobile || user?.user_metadata?.whatsapp_number || '',
        email: prev.email || customer?.email || user?.email || '',
      }));

      // ఒకవేళ కార్ట్ ఓపెన్ అయ్యి యూజర్ లాగిన్ అయితే నేరుగా అడ్రస్ స్టెప్ చూపించాలి
      if (isCartOpen && activeStep === 'cart' && cart.length > 0) {
        setActiveStep('address');
      }
    }
  }, [user, customer, isCartOpen]);

  useEffect(() => {
    const fetchActiveGateway = async () => {
      try {
        const { data } = await supabase
          .from('payment_gateway_configs')
          .select('name')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (data?.name) {
          setActiveGatewayName(data.name);
        }
      } catch (err) {
        console.error('Error reading gateway config:', err);
      }
    };
    if (isCartOpen) {
      fetchActiveGateway();
    }
  }, [isCartOpen]);

  useEffect(() => {
    if (savedAddresses.length > 0) {
      const targetId = selectedAddressId || savedAddresses[0].id;
      if (!selectedAddressId) setSelectedAddressId(targetId);

      const targetAddr = savedAddresses.find((a) => a.id === targetId) || savedAddresses[0];
      if (targetAddr?.pincode) {
        setUserPincode(targetAddr.pincode);
        fetchShippingByPincode(targetAddr.pincode);
      }
    }
  }, [savedAddresses, selectedAddressId, isCartOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddressModalOpen) {
          setIsAddressModalOpen(false);
        } else if (isCartOpen) {
          handleCloseModal();
        }
      }
    };
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartOpen, isAddressModalOpen]);

  const handleCloseModal = () => {
    if (activeStep === 'order_result') {
      setActiveStep('cart');
      setConfirmedOrder(null);
      setPaymentResult(null);
    }
    closeCart();
  };

  const fetchShippingByPincode = async (pincode: string): Promise<number> => {
    const cleanPin = pincode.trim();
    if (cleanPin.length !== 6) return 0;

    setPincodeLoading(true);
    try {
      const { data: pinData } = await supabase
        .from('pincodes')
        .select('pincode, city, state, zone_type, delivery_available')
        .eq('pincode', cleanPin)
        .maybeSingle();

      const isAvailable = pinData ? pinData.delivery_available !== false : true;
      const detectedZone =
        pinData?.zone_type ||
        (cleanPin.startsWith('533')
          ? 'Local'
          : cleanPin.startsWith('5')
          ? 'Within State'
          : 'Other States');

      if (!isAvailable) {
        setPincodeStatus({
          zoneType: detectedZone,
          deliveryAvailable: false,
          message: 'Delivery is not available to this location',
        });
        setShippingCharge(0);
        return 0;
      }

      if (pinData) {
        setFormData((prev) => ({
          ...prev,
          city: pinData.city || prev.city,
          state: pinData.state || prev.state,
          zone_type: detectedZone,
        }));
      }

      let rateCard: any = null;
      const { data: cards } = await supabase
        .from('delivery_rate_cards')
        .select('*')
        .limit(5);

      if (cards && cards.length > 0) {
        rateCard = cards.find((c: any) => c.active === true || c.active === 'true') || cards[0];
      }

      let calculatedRate = 0;
      const zoneNorm = detectedZone.toLowerCase().trim();

      if (rateCard) {
        if (zoneNorm.includes('local')) {
          calculatedRate = parseFloat(rateCard.local_rate) || 0;
        } else if (zoneNorm.includes('within state') || zoneNorm.includes('state')) {
          calculatedRate = parseFloat(rateCard.within_state_rate) || 0;
        } else if (zoneNorm.includes('zone') || zoneNorm.includes('metro')) {
          calculatedRate = parseFloat(rateCard.zone_metro_rate) || 0;
        } else if (zoneNorm.includes('other')) {
          calculatedRate = parseFloat(rateCard.other_states_rate) || 0;
        } else {
          calculatedRate = parseFloat(rateCard.local_rate) || 40;
        }
      }

      if (calculatedRate === 0) {
        calculatedRate = zoneNorm.includes('local')
          ? 30
          : zoneNorm.includes('within state')
          ? 50
          : 70;
      }

      setShippingCharge(calculatedRate);
      setUserPincode(cleanPin);
      setPincodeStatus({
        zoneType: detectedZone,
        deliveryAvailable: true,
        message: `${detectedZone} Delivery`,
      });

      return calculatedRate;
    } catch (err) {
      console.error('Error in shipping calculation:', err);
      const fallbackRate = cleanPin.startsWith('533') ? 30 : 50;
      setShippingCharge(fallbackRate);
      setPincodeStatus({
        zoneType: cleanPin.startsWith('533') ? 'Local' : 'Within State',
        deliveryAvailable: true,
      });
      return fallbackRate;
    } finally {
      setPincodeLoading(false);
    }
  };

  const handlePincodeChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setFormData((prev) => ({ ...prev, pincode: cleaned }));

    if (cleaned.length === 6) {
      await fetchShippingByPincode(cleaned);
    } else {
      setPincodeStatus(null);
    }
  };

  const handleSelectExistingAddress = async (addr: Address) => {
    setSelectedAddressId(addr.id);
    setUserPincode(addr.pincode);
    await fetchShippingByPincode(addr.pincode);
  };

  const handleOpenAddAddressModal = () => {
    if (!user) {
      triggerAuthModal();
      return;
    }

    setFormData({
      name: customer?.name || user?.user_metadata?.name || '',
      whatsapp_number: customer?.mobile || user?.user_metadata?.whatsapp_number || '',
      email: customer?.email || user?.email || '',
      door_no: '',
      building_name: '',
      street: '',
      area: '',
      pincode: '',
      city: '',
      state: '',
      address_type: 'Home',
      custom_label: '',
      zone_type: '',
    });
    setPincodeStatus(null);
    setIsAddressModalOpen(true);
  };

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.whatsapp_number || !formData.pincode || !formData.door_no) {
      alert('Please fill all required address details.');
      return;
    }

    if (formData.address_type === 'Others' && !formData.custom_label.trim()) {
      alert("Please enter a name for this address (e.g. Mom's House, Boutique).");
      return;
    }

    if (pincodeStatus && pincodeStatus.deliveryAvailable === false) {
      alert('Sorry, delivery is not available for this pincode.');
      return;
    }

    const newAddr: Address = {
      id: `addr_${Date.now()}`,
      ...formData,
      custom_label: formData.address_type === 'Others' ? formData.custom_label.trim() : undefined,
    };

    const updated = [newAddr, ...savedAddresses];
    setSavedAddresses(updated);
    localStorage.setItem('kashvi_saved_addresses', JSON.stringify(updated));

    setSelectedAddressId(newAddr.id);
    setUserPincode(newAddr.pincode);
    await fetchShippingByPincode(newAddr.pincode);
    setIsAddressModalOpen(false);
  };

  const handlePaymentSuccess = async (
    orderId: string,
    address: Address,
    amount: number,
    gwName: string,
    itemsSnapshot: any[]
  ) => {
    const fullAddress = `${address.door_no}, ${
      address.building_name ? address.building_name + ', ' : ''
    }${address.street}, ${address.area}, ${address.city}, ${address.state} - ${address.pincode}`;

    setConfirmedOrder({
      orderId,
      totalAmount: amount,
      subtotal,
      shippingCharge,
      customerName: address.name,
      customerPhone: address.whatsapp_number,
      deliveryAddress: fullAddress,
      gateway: gwName,
      items: [...itemsSnapshot],
    });

    setPaymentResult({
      type: 'success',
      title: 'Thank You for Shopping!',
      message: 'Your payment was successful and your imperial order is confirmed.',
      orderId,
    });

    const resolvedEmail = address.email?.trim() || user?.email?.trim();
    if (resolvedEmail) {
      supabase.functions
        .invoke('send-order-email', {
          body: {
            orderId,
            customerName: address.name,
            customerEmail: resolvedEmail,
            customerPhone: address.whatsapp_number,
            shippingAddress: fullAddress,
            totalAmount: amount,
            subtotal,
            deliveryFee: shippingCharge,
            items: itemsSnapshot,
          },
        })
        .catch((err) => console.error('Failed to trigger order confirmation email:', err));
    }

    clearCart();
    setActiveStep('order_result');
  };

  const handlePaymentFailure = async (
    orderId: string,
    errorMsg: string,
    statusType: 'failed' | 'user_dropped' | 'pending' = 'failed'
  ) => {
    await supabase
      .from('orders')
      .update({
        payment_status:
          statusType === 'user_dropped'
            ? 'cancelled_by_user'
            : statusType === 'pending'
            ? 'payment_pending'
            : 'payment_failed',
        order_status: statusType === 'pending' ? 'payment_pending' : 'cancelled',
        history: [
          {
            status: statusType,
            time: new Date().toISOString(),
            note: errorMsg,
          },
        ],
      })
      .eq('id', orderId);

    setPaymentResult({
      type: statusType,
      title:
        statusType === 'user_dropped'
          ? 'Payment Cancelled'
          : statusType === 'pending'
          ? 'Payment Verification Pending'
          : 'Payment Failed',
      message:
        statusType === 'user_dropped'
          ? 'You closed or cancelled the transaction. No amount was debited.'
          : statusType === 'pending'
          ? 'Waiting for bank confirmation. If debited, your order will confirm automatically.'
          : errorMsg || 'Transaction was declined by the payment gateway. Please try again.',
      orderId,
    });

    setActiveStep('order_result');
  };

  const handleProceedToAddress = () => {
    if (!user) {
      triggerAuthModal();
      return;
    }
    setActiveStep('address');
  };

  const handleInstantCheckout = async () => {
    if (!user) {
      triggerAuthModal();
      return;
    }

    if (!selectedAddressId) {
      alert('Please select a delivery address');
      return;
    }

    const currentAddress = savedAddresses.find((a) => a.id === selectedAddressId);
    if (!currentAddress) return;

    setIsCheckingOut(true);
    const cartSnapshot = [...cart];

    try {
      const orderId = `KF_${Date.now()}`;
      const fullAddressText = `${currentAddress.door_no}, ${
        currentAddress.building_name ? currentAddress.building_name + ', ' : ''
      }${currentAddress.street}, ${currentAddress.area}, ${currentAddress.city}, ${
        currentAddress.state
      } - ${currentAddress.pincode}`;
      const resolvedEmail =
        currentAddress.email?.trim() ||
        user?.email?.trim() ||
        `${currentAddress.whatsapp_number}@kashvifashions.local`;

      const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
        'create-payment-order',
        {
          body: {
            orderId: orderId,
            orderAmount: totalDue,
            customerPhone: currentAddress.whatsapp_number,
            customerName: currentAddress.name,
            customerEmail: resolvedEmail,
          },
        }
      );

      if (sessionError || !sessionData) {
        console.error('Payment initialization error:', sessionError || sessionData);
        alert(sessionData?.error || 'Could not connect to the Payment Gateway.');
        setIsCheckingOut(false);
        return;
      }

      const activeGateway = sessionData.gateway;
      const usedGatewayName = sessionData.gatewayName || 'Cashfree Payments';

      const orderPayload = {
        id: orderId,
        customer_id: currentAddress.whatsapp_number,
        status: 'new',
        order_status: 'new',
        payment_status: 'payment_pending',
        payment_method: usedGatewayName,
        customer_name: currentAddress.name,
        customer_phone: currentAddress.whatsapp_number,
        customer_email: resolvedEmail,
        shipping_address: fullAddressText,
        pincode: currentAddress.pincode,
        subtotal: subtotal,
        delivery_fee: shippingCharge,
        total_amount: totalDue,
        total: totalDue,
        items: cartSnapshot,
        shipping: {
          address: fullAddressText,
          pincode: currentAddress.pincode,
          fee: shippingCharge,
          zone: pincodeStatus?.zoneType || 'Standard',
        },
        customer: {
          name: currentAddress.name,
          phone: currentAddress.whatsapp_number,
          email: resolvedEmail,
        },
        payment: {
          method: usedGatewayName,
          status: 'pending',
        },
        history: [
          {
            status: 'order_initiated',
            time: new Date().toISOString(),
            note: `Order initiated using gateway: ${usedGatewayName}`,
          },
        ],
      };

      await supabase.from('orders').insert([orderPayload]);

      if (activeGateway === 'cashfree') {
        const cashfreeMode = sessionData.environment === 'production' ? 'production' : 'sandbox';
        const cashfree = await load({ mode: cashfreeMode });

        cashfree
          .checkout({
            paymentSessionId: sessionData.paymentSessionId,
            redirectTarget: '_modal',
          })
          .then(async (result: any) => {
            if (result.error) {
              const errMsg = result.error.message || 'Transaction failed or aborted';
              if (
                errMsg.toLowerCase().includes('user dropped') ||
                errMsg.toLowerCase().includes('cancelled') ||
                errMsg.toLowerCase().includes('closed')
              ) {
                await handlePaymentFailure(orderId, errMsg, 'user_dropped');
              } else {
                await handlePaymentFailure(orderId, errMsg, 'failed');
              }
              return;
            }

            if (result.paymentDetails) {
              const paymentStatus = (result.paymentDetails.payment_status || 'SUCCESS').toUpperCase();

              if (paymentStatus === 'SUCCESS') {
                await supabase
                  .from('orders')
                  .update({
                    payment_status: 'paid',
                    order_status: 'confirmed',
                    payment_reference: sessionData.orderId,
                    payment_time: new Date().toISOString(),
                    payment_verified: true,
                  })
                  .eq('id', orderId);

                await handlePaymentSuccess(
                  orderId,
                  currentAddress,
                  totalDue,
                  usedGatewayName,
                  cartSnapshot
                );
              } else if (paymentStatus === 'PENDING') {
                await handlePaymentFailure(orderId, 'Payment is processing at bank', 'pending');
              } else {
                await handlePaymentFailure(
                  orderId,
                  `Payment failed with status: ${paymentStatus}`,
                  'failed'
                );
              }
            } else {
              await handlePaymentFailure(
                orderId,
                'Payment window closed without completion',
                'user_dropped'
              );
            }
          });
      } else {
        alert(`${usedGatewayName} is active but checkout handling is in progress.`);
      }
    } catch (err: any) {
      console.error('Checkout execution error:', err);
      alert('An error occurred during checkout. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleNavigateToOrders = () => {
    handleCloseModal();
    const userBtn = document.querySelector('[aria-label="User Account"]') as HTMLButtonElement | null;
    if (userBtn) {
      userBtn.click();
    } else {
      window.location.hash = '#/orders';
    }
  };

  if (!isCartOpen) return null;

  const drawerContent = (
    <div
      onClick={handleCloseModal}
      className="fixed inset-0 z-[999] flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-300"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md md:max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-neutral-200/80 cursor-default"
      >
        {/* Drawer Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between sticky top-0 z-20 transition-colors ${
            hasJewelleryItems
              ? 'bg-[#0b3b2c] text-white border-[#0b3b2c]/20'
              : 'bg-white text-neutral-900 border-neutral-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {activeStep === 'address' && (
              <button
                type="button"
                onClick={() => setActiveStep('cart')}
                className={`p-1.5 -ml-1 rounded-full transition-colors cursor-pointer ${
                  hasJewelleryItems ? 'hover:bg-white/10 text-white' : 'hover:bg-neutral-100 text-neutral-700'
                }`}
                aria-label="Back to Cart"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <ShoppingBag
                className={`w-5 h-5 ${
                  hasJewelleryItems ? 'text-[#e5c07b]' : 'text-[#ff4d6d]'
                }`}
              />
              <h2 className="text-base sm:text-lg font-serif font-bold leading-none">
                {activeStep === 'cart'
                  ? 'Your Shopping Bag'
                  : activeStep === 'address'
                  ? 'Select Delivery Address'
                  : paymentResult?.type === 'success'
                  ? 'Order Confirmed'
                  : 'Transaction Status'}
              </h2>
            </div>
            {activeStep === 'cart' && totalItems > 0 && (
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  hasJewelleryItems
                    ? 'bg-[#e5c07b] text-[#0b3b2c]'
                    : 'bg-[#fff0f3] text-[#ff4d6d]'
                }`}
              >
                {totalItems} item{totalItems > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              hasJewelleryItems
                ? 'hover:bg-white/10 text-white'
                : 'bg-neutral-100 hover:bg-neutral-900 text-neutral-600 hover:text-white'
            }`}
            aria-label="Close Cart"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* 1. PAYMENT STATUS VIEW */}
          {activeStep === 'order_result' && paymentResult && (
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div
                className={`rounded-3xl p-5 text-center border relative overflow-hidden ${
                  paymentResult.type === 'success'
                    ? 'bg-gradient-to-b from-emerald-50/70 via-white to-emerald-50/30 border-emerald-200'
                    : paymentResult.type === 'pending'
                    ? 'bg-gradient-to-b from-amber-50/70 via-white to-amber-50/30 border-amber-200'
                    : 'bg-gradient-to-b from-rose-50/70 via-white to-rose-50/30 border-rose-200'
                }`}
              >
                <div className="flex justify-center mb-2.5">
                  {paymentResult.type === 'success' && (
                    <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
                    </div>
                  )}
                  {paymentResult.type === 'failed' && (
                    <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                      <XCircle className="w-8 h-8 stroke-[2.2]" />
                    </div>
                  )}
                  {paymentResult.type === 'user_dropped' && (
                    <div className="w-14 h-14 rounded-2xl bg-neutral-800 text-white flex items-center justify-center shadow-lg shadow-neutral-700/30">
                      <RotateCcw className="w-8 h-8 stroke-[2]" />
                    </div>
                  )}
                  {paymentResult.type === 'pending' && (
                    <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <Clock3 className="w-8 h-8 stroke-[2.2]" />
                    </div>
                  )}
                </div>

                <span
                  className={`text-[10px] font-extrabold uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${
                    paymentResult.type === 'success'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : paymentResult.type === 'pending'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {paymentResult.type === 'success'
                    ? 'Order Confirmed'
                    : paymentResult.type === 'pending'
                    ? 'Verification Pending'
                    : paymentResult.type === 'user_dropped'
                    ? 'Payment Cancelled'
                    : 'Payment Declined'}
                </span>

                <h3 className="text-xl font-serif font-bold text-neutral-950 mt-2.5">
                  {paymentResult.title}
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  {paymentResult.message}
                </p>

                {paymentResult.orderId && (
                  <div className="mt-3 inline-block bg-white/80 border border-neutral-200 px-3 py-1.5 rounded-xl">
                    <span className="text-[9px] text-neutral-400 uppercase tracking-widest block">
                      Order Reference
                    </span>
                    <span className="text-xs font-mono font-bold text-neutral-800">
                      {paymentResult.orderId}
                    </span>
                  </div>
                )}
              </div>

              {paymentResult.type === 'success' && confirmedOrder && (
                <div className="space-y-3">
                  <div className="border border-neutral-200 rounded-2xl p-4 bg-neutral-50/50 space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2">
                      <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-neutral-600" />
                        Items ({confirmedOrder.items.length})
                      </span>
                      <span className="text-xs font-serif font-bold text-neutral-950">
                        ₹{confirmedOrder.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {confirmedOrder.items.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-neutral-100 shadow-2xs"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-14 object-cover object-top rounded-lg border border-neutral-100 shrink-0"
                          />
                          <div className="flex-1 min-w-0 text-xs">
                            <h5 className="font-bold text-neutral-900 truncate leading-tight">
                              {item.name}
                            </h5>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500">
                              {item.color && <span className="capitalize">{item.color}</span>}
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

                  <div className="border border-neutral-200 rounded-2xl p-3 bg-white text-xs space-y-0.5">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Delivery Address
                    </span>
                    <p className="font-bold text-neutral-900">
                      {confirmedOrder.customerName} ({confirmedOrder.customerPhone})
                    </p>
                    <p className="text-neutral-600 leading-relaxed text-[11px]">
                      {confirmedOrder.deliveryAddress}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2">
                {paymentResult.type === 'success' ? (
                  <>
                    <button
                      type="button"
                      onClick={handleNavigateToOrders}
                      className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-[#0b3b2c] shadow-lg shadow-[#0b3b2c]/30 hover:opacity-95 active:scale-98 transition-all cursor-pointer"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>View in My Orders</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider border border-neutral-200 text-neutral-800 hover:bg-neutral-50 transition-all cursor-pointer"
                    >
                      Continue Shopping
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveStep('address')}
                      className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-neutral-900 hover:bg-neutral-800 active:scale-98 transition-all cursor-pointer shadow-md"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Retry Payment</span>
                    </button>
                    <a
                      href="https://wa.me/918686353574?text=Hi%20Kashvi%20Support,%20I%20need%20help%20with%20my%20order"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>Support on WhatsApp</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 2. CART ITEMS LIST VIEW */}
          {activeStep === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-300">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <p className="text-neutral-800 font-serif font-semibold text-base">Your bag is empty</p>
                  <p className="text-xs text-neutral-400 max-w-xs">
                    Explore our haute couture fashion and royal jewellery vaults to add your favorites.
                  </p>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="mt-2 px-6 py-2.5 rounded-full bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all cursor-pointer"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => {
                    const itemColor = (item?.color || '').toLowerCase();
                    const hex = COLOR_HEX_MAP[itemColor] || itemColor || '#e83e8c';
                    const isJewelleryItem = item?.department === 'jewellery';

                    return (
                      <div
                        key={item.id}
                        className={`flex gap-3.5 p-3 rounded-2xl border transition-all duration-300 items-center ${
                          isJewelleryItem
                            ? 'border-[#0b3b2c]/15 bg-[#f4f7f5]/40 hover:border-[#0b3b2c]/30'
                            : 'border-neutral-200/80 bg-neutral-50/50 hover:border-[#ff4d6d]/30'
                        }`}
                      >
                        <div className="w-16 h-20 rounded-t-[22px] rounded-b-xl overflow-hidden bg-white shrink-0 border border-neutral-200/80 p-0.5 shadow-2xs">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover object-top rounded-t-[20px] rounded-b-lg"
                          />
                        </div>

                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-serif font-bold text-neutral-900 truncate leading-snug">
                                {item.name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.id)}
                                className="text-neutral-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                                title="Remove Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {item.color && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-neutral-600 bg-white border border-neutral-200 px-2 py-0.5 rounded-md">
                                  <span
                                    className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                                    style={{ backgroundColor: hex }}
                                  />
                                  <span className="capitalize">{item.color}</span>
                                </span>
                              )}
                              {item.size && (
                                <span className="text-[10px] font-bold text-neutral-700 bg-white border border-neutral-200 px-2 py-0.5 rounded-md">
                                  Size: {item.size}
                                </span>
                              )}
                              {item.fabric && (
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-neutral-200/70 text-neutral-700 font-semibold">
                                  {item.fabric}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div className="inline-flex items-center gap-1 bg-white border border-neutral-200 rounded-full px-2 py-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, -1)}
                                className="text-neutral-500 hover:text-neutral-900 transition-colors p-0.5 cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-xs font-bold text-neutral-900 w-4 text-center">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, 1)}
                                className="text-neutral-500 hover:text-neutral-900 transition-colors p-0.5 cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            <span
                              className={`text-sm font-bold ${
                                isJewelleryItem ? 'text-[#0b3b2c]' : 'text-neutral-950'
                              }`}
                            >
                              ₹{(item.price * item.qty).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* 3. ADDRESS SELECTION VIEW */}
          {activeStep === 'address' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  Deliver To
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddAddressModal}
                  className="text-xs font-bold text-[#ff4d6d] hover:underline cursor-pointer flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-full"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New
                </button>
              </div>

              {savedAddresses.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-neutral-200 rounded-2xl p-6 space-y-3">
                  <MapPin className="w-8 h-8 text-neutral-300 mx-auto" />
                  <p className="text-xs text-neutral-500">No delivery address saved yet.</p>
                  <button
                    type="button"
                    onClick={handleOpenAddAddressModal}
                    className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold cursor-pointer"
                  >
                    + Add New Delivery Address
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    const displayLabel =
                      addr.address_type === 'Others' && addr.custom_label
                        ? addr.custom_label
                        : addr.address_type || 'Home';

                    return (
                      <div
                        key={addr.id}
                        onClick={() => handleSelectExistingAddress(addr)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                          isSelected
                            ? hasJewelleryItems
                              ? 'border-[#0b3b2c] bg-[#f4f7f5] shadow-xs'
                              : 'border-[#ff4d6d] bg-rose-50/30 shadow-xs'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="delivery_address"
                          checked={isSelected}
                          onChange={() => handleSelectExistingAddress(addr)}
                          className={`mt-1 cursor-pointer ${
                            hasJewelleryItems ? 'accent-[#0b3b2c]' : 'accent-[#ff4d6d]'
                          }`}
                        />

                        <div className="flex-1 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900 text-sm">{addr.name}</span>
                              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200 flex items-center gap-1">
                                {addr.address_type === 'Work' && <Briefcase className="w-2.5 h-2.5" />}
                                {addr.address_type === 'Home' && <Home className="w-2.5 h-2.5" />}
                                {addr.address_type === 'Others' && <Bookmark className="w-2.5 h-2.5 text-[#ff4d6d]" />}
                                <span>{displayLabel}</span>
                              </span>
                            </div>

                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              WA: {addr.whatsapp_number}
                            </span>
                          </div>

                          <p className="text-neutral-600 leading-relaxed pt-0.5">
                            {addr.door_no}, {addr.building_name ? `${addr.building_name}, ` : ''}
                            {addr.street}, {addr.area}
                          </p>

                          <div className="flex items-center justify-between pt-1">
                            <p className="font-semibold text-neutral-900">
                              {addr.city}, {addr.state} — <span className="font-bold">{addr.pincode}</span>
                            </p>
                            {isSelected && pincodeStatus?.zoneType && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md">
                                {pincodeStatus.zoneType}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Checkout & Action Area */}
        {cart.length > 0 && activeStep !== 'order_result' && (
          <div className="p-5 border-t border-neutral-200/80 bg-white space-y-3 shrink-0 shadow-lg">
            <div className="space-y-1.5 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-neutral-900">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-neutral-500" />
                  Delivery Charge {pincodeStatus?.zoneType ? `(${pincodeStatus.zoneType})` : ''}
                </span>
                <span className="font-bold text-neutral-900">₹{shippingCharge}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-neutral-900 pt-2 border-t border-neutral-100">
                <span>Total Due</span>
                <span
                  className={`text-lg font-serif font-black ${
                    hasJewelleryItems ? 'text-[#0b3b2c]' : 'text-neutral-950'
                  }`}
                >
                  ₹{totalDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {activeStep === 'cart' ? (
              <button
                type="button"
                onClick={handleProceedToAddress}
                className={`relative w-full py-4 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white shadow-xl transition-all duration-300 active:scale-98 cursor-pointer ${
                  hasJewelleryItems
                    ? 'bg-[#0b3b2c] hover:bg-[#07261c] shadow-[#0b3b2c]/30'
                    : 'bg-[#ff4d6d] hover:bg-[#e03a58] shadow-[#ff4d6d]/30'
                }`}
              >
                {!user ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Login to Place Order</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current animate-bounce" />
                    <span>Proceed to Delivery Address</span>
                  </>
                )}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!selectedAddressId || isCheckingOut}
                onClick={handleInstantCheckout}
                className={`relative w-full py-4 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white shadow-xl transition-all duration-300 active:scale-98 cursor-pointer disabled:opacity-50 ${
                  hasJewelleryItems
                    ? 'bg-gradient-to-r from-[#0b3b2c] via-[#14532d] to-[#0b3b2c] ring-2 ring-[#e5c07b]/60 shadow-[#0b3b2c]/40'
                    : 'bg-gradient-to-r from-[#ff4d6d] via-[#e63956] to-[#ff2a55] ring-2 ring-rose-300/60 shadow-[#ff4d6d]/40'
                }`}
              >
                {isCheckingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 fill-current animate-bounce" />
                )}
                <span>
                  {isCheckingOut
                    ? 'Connecting Gateway...'
                    : `Pay via ${activeGatewayName} • ₹${totalDue.toLocaleString('en-IN')}`}
                </span>
                {!isCheckingOut && <ArrowRight className="w-4 h-4" />}
              </button>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-400 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-600" />
              <span>100% Secure Encrypted Checkout with {activeGatewayName}</span>
            </div>
          </div>
        )}
      </aside>

      {/* Add New Address Modal */}
      {isAddressModalOpen && (
        <div
          onClick={() => setIsAddressModalOpen(false)}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 cursor-default my-auto animate-in zoom-in-95 duration-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#ff4d6d]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Add New Delivery Address
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewAddress} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-700 block mb-1.5">
                  Save Address As:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'Home', icon: Home, label: 'Home' },
                    { type: 'Work', icon: Briefcase, label: 'Work' },
                    { type: 'Others', icon: Bookmark, label: 'Others' },
                  ].map(({ type, icon: Icon, label }) => {
                    const isSelected = formData.address_type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, address_type: type as any })}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                            : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {formData.address_type === 'Others' && (
                <div className="animate-in fade-in duration-200">
                  <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                    Address Label Name * (e.g. Mom's House, Boutique)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Custom Address Name"
                    value={formData.custom_label}
                    onChange={(e) => setFormData({ ...formData, custom_label: e.target.value })}
                    className="w-full bg-white border border-[#ff4d6d]/50 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:border-[#ff4d6d] font-medium"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abhilash"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                    Mobile WhatsApp No. *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit WhatsApp No."
                    value={formData.whatsapp_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        whatsapp_number: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                  Email Address (For Invoices & Tracking)
                </label>
                <input
                  type="email"
                  placeholder="e.g. yourname@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:border-neutral-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                    Door / House / Flat No. *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2-1-65/2"
                    value={formData.door_no}
                    onChange={(e) => setFormData({ ...formData, door_no: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                    Building Name / House Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nemani Complex"
                    value={formData.building_name}
                    onChange={(e) =>
                      setFormData({ ...formData, building_name: e.target.value })
                    }
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:border-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                    Street Name / Road
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bhanugundi Junction"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                    Area / Landmark
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bhanugundi"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:border-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="533003"
                    value={formData.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:border-neutral-900 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                    City (Auto)
                  </label>
                  <input
                    type="text"
                    required
                    readOnly
                    placeholder={pincodeLoading ? '...' : 'City'}
                    value={formData.city}
                    className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 font-medium cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                    State (Auto)
                  </label>
                  <input
                    type="text"
                    required
                    readOnly
                    placeholder={pincodeLoading ? '...' : 'State'}
                    value={formData.state}
                    className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              {pincodeStatus && (
                <div className="text-[11px] flex items-center gap-1.5 pt-1">
                  {pincodeStatus.deliveryAvailable ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Delivery Available ({pincodeStatus.zoneType} — ₹{shippingCharge})
                    </span>
                  ) : (
                    <span className="text-red-500 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {pincodeStatus.message}
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-bold uppercase tracking-wider hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pincodeStatus?.deliveryAvailable === false}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(drawerContent, document.body);
}