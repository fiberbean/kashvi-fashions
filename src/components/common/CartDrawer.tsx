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
} from 'lucide-react';
import { load } from '@cashfreepayments/cashfree-js';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import CringeLoader from '../common/CringeLoader';

interface Address {
  id: string;
  name: string;
  whatsapp_number: string;
  email?: string;
  door_no: string;
  building_name?: string;
  street?: string;
  area?: string;
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

async function generateOrderNumber(): Promise<string> {
  const PREFIX = 'KFOD';
  const PADDING = 4;

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .ilike('id', `${PREFIX}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data && data.length > 0) {
      let maxNum = 0;
      data.forEach((o: any) => {
        const numPart = parseInt(o.id.replace(PREFIX, '').trim(), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      });

      if (maxNum > 0) {
        return `${PREFIX}${String(maxNum + 1).padStart(PADDING, '0')}`;
      }
    }

    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .ilike('id', `${PREFIX}%`);

    const nextCount = (count || 0) + 1;
    return `${PREFIX}${String(nextCount).padStart(PADDING, '0')}`;
  } catch (err) {
    console.error('Order ID generation error:', err);
    return `${PREFIX}0001`;
  }
}

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    closeCart,
    updateQty,
    removeFromCart,
    clearCart,
    totalItems,
    subtotal,
    shippingCharge,
    setShippingCharge,
    setUserPincode,
  } = useCart();

  const authContext = useAuth();
  const { user, customer } = authContext;

  const [activeStep, setActiveStep] = useState<'cart' | 'address' | 'order_result'>('cart');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeGatewayName, setActiveGatewayName] = useState<string>('Cashfree Payments');
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrderInfo | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentStatusState | null>(null);

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState<boolean>(false);
  const [savingAddress, setSavingAddress] = useState<boolean>(false);

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState<boolean>(false);

  const [dbColoursMap, setDbColoursMap] = useState<Record<string, string>>({});

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

  const totalWeightGrams = cart.reduce((acc, item: any) => {
    const itemWeight = Number(item.weight) || Number(item.weight_grams) || 250;
    return acc + itemWeight * (item.qty || 1);
  }, 0);

  const weightSlabs = Math.max(1, Math.ceil(totalWeightGrams / 500));
  const finalPayableAmount = activeStep === 'cart' ? subtotal : subtotal + (shippingCharge || 0);

  useEffect(() => {
    async function fetchColours() {
      try {
        const { data, error } = await supabase
          .from('colours')
          .select('name, hex_code')
          .eq('active', true);

        if (!error && data) {
          const map: Record<string, string> = {};
          data.forEach((item: any) => {
            if (item.name && item.hex_code) {
              map[item.name.toLowerCase().trim()] = item.hex_code.trim();
            }
          });
          setDbColoursMap(map);
        }
      } catch (err) {
        console.error('Error fetching colours:', err);
      }
    }
    if (isCartOpen) {
      fetchColours();
    }
  }, [isCartOpen]);

  const resolveColorHex = (colorName?: string): string => {
    if (!colorName) return '#94a3b8';
    const clean = colorName.toLowerCase().trim();

    if (dbColoursMap[clean]) return dbColoursMap[clean];

    for (const [name, hex] of Object.entries(dbColoursMap)) {
      if (clean.includes(name) || name.includes(clean)) {
        return hex;
      }
    }

    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  const fetchAddressesFromDb = async () => {
    const customerId = customer?.id || customer?.mobile || user?.user_metadata?.whatsapp_number;
    const authId = user?.id;

    if (!customerId && !authId) {
      try {
        const saved = localStorage.getItem('kashvi_saved_addresses');
        if (saved) {
          const parsed = JSON.parse(saved);
          setSavedAddresses(parsed);
          if (parsed.length > 0 && !selectedAddressId) {
            setSelectedAddressId(parsed[0].id);
          }
        }
      } catch (e) {
        console.warn('Fallback storage load error:', e);
      }
      return;
    }

    try {
      setLoadingAddresses(true);
      let query = supabase
        .from('customer_addresses')
        .select('*')
        .order('created_at', { ascending: false });

      if (authId) {
        query = query.eq('auth_user_id', authId);
      } else if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (!error && data) {
        const mapped: Address[] = data.map((row: any) => ({
          id: row.id,
          name: row.full_name || '',
          whatsapp_number: row.mobile || '',
          door_no: row.door_address || '',
          building_name: row.building_name || '',
          street: row.street || '',
          area: row.area || '',
          pincode: row.pincode || '',
          city: row.city || '',
          state: row.state || '',
          address_type: row.address_type || 'Home',
          custom_label: row.custom_label || '',
          is_default: !!row.is_default,
        }));

        setSavedAddresses(mapped);
        localStorage.setItem('kashvi_saved_addresses', JSON.stringify(mapped));

        if (mapped.length > 0) {
          const def = mapped.find((a) => a.is_default) || mapped[0];
          setSelectedAddressId(def.id);
        }
      }
    } catch (err) {
      console.error('Failed to load addresses from db:', err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (isCartOpen) {
      fetchAddressesFromDb();
    }
  }, [isCartOpen, user?.id, customer?.id]);

  const triggerAuthModal = () => {
    closeCart();
    const ctx = authContext as any;
    if (typeof ctx.openAuthModal === 'function') {
      ctx.openAuthModal();
      return;
    }
    window.dispatchEvent(new CustomEvent('open-auth-modal'));
  };

  useEffect(() => {
    if (user || customer) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || customer?.name || user?.user_metadata?.name || '',
        whatsapp_number: prev.whatsapp_number || customer?.mobile || user?.user_metadata?.whatsapp_number || '',
        email: prev.email || customer?.email || user?.email || '',
      }));
    }
  }, [user, customer]);

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
    if (activeStep === 'address' && savedAddresses.length > 0) {
      const target = savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0];
      if (target?.pincode) {
        setUserPincode(target.pincode);
        fetchShippingByPincode(target.pincode);
      }
    }
  }, [activeStep, selectedAddressId, savedAddresses, cart]);

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
    setActiveStep('cart');
    if (activeStep === 'order_result') {
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

      let baseRate = 0;
      const zoneNorm = detectedZone.toLowerCase().trim();

      if (rateCard) {
        if (zoneNorm.includes('local')) {
          baseRate = parseFloat(rateCard.local_rate) || 0;
        } else if (zoneNorm.includes('within state') || zoneNorm.includes('state')) {
          baseRate = parseFloat(rateCard.within_state_rate) || 0;
        } else if (zoneNorm.includes('zone') || zoneNorm.includes('metro')) {
          baseRate = parseFloat(rateCard.zone_metro_rate) || 0;
        } else if (zoneNorm.includes('other')) {
          baseRate = parseFloat(rateCard.other_states_rate) || 0;
        } else {
          baseRate = parseFloat(rateCard.local_rate) || 40;
        }
      }

      if (baseRate === 0) {
        baseRate = zoneNorm.includes('local')
          ? 30
          : zoneNorm.includes('within state')
          ? 50
          : 70;
      }

      const calculatedRate = Math.round(baseRate * weightSlabs);

      setShippingCharge(calculatedRate);
      setUserPincode(cleanPin);
      setPincodeStatus({
        zoneType: detectedZone,
        deliveryAvailable: true,
        message: `${detectedZone} Delivery (${totalWeightGrams}g)`,
      });

      return calculatedRate;
    } catch (err) {
      console.error('Error in shipping calculation:', err);
      const fallbackRate = (cleanPin.startsWith('533') ? 30 : 50) * weightSlabs;
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

  const handleDeleteAddress = async (addrId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from('customer_addresses').delete().eq('id', addrId);
      const updated = savedAddresses.filter((a) => a.id !== addrId);
      setSavedAddresses(updated);
      localStorage.setItem('kashvi_saved_addresses', JSON.stringify(updated));

      if (selectedAddressId === addrId) {
        if (updated.length > 0) {
          setSelectedAddressId(updated[0].id);
          fetchShippingByPincode(updated[0].pincode);
        } else {
          setSelectedAddressId('');
          setShippingCharge(0);
        }
      }
    } catch (err) {
      console.error('Failed to delete address:', err);
    }
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

    setSavingAddress(true);
    try {
      const customerId = customer?.id || customer?.mobile || formData.whatsapp_number;
      const authUserId = user?.id || null;
      const isFirst = savedAddresses.length === 0;

      const payload = {
        customer_id: customerId,
        auth_user_id: authUserId,
        address_type: formData.address_type,
        full_name: formData.name.trim(),
        mobile: formData.whatsapp_number.trim(),
        door_address: formData.door_no.trim(),
        building_name: formData.building_name.trim() || null,
        street: formData.street.trim() || null,
        area: formData.area.trim() || null,
        pincode: formData.pincode.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        custom_label: formData.address_type === 'Others' ? formData.custom_label.trim() : null,
        is_default: isFirst,
      };

      const { data, error } = await supabase
        .from('customer_addresses')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Error inserting address in database:', error);
      }

      const createdId = data?.id || `addr_${Date.now()}`;
      const newAddr: Address = {
        id: createdId,
        ...formData,
        custom_label: formData.address_type === 'Others' ? formData.custom_label.trim() : undefined,
        is_default: isFirst,
      };

      const updated = [newAddr, ...savedAddresses];
      setSavedAddresses(updated);
      localStorage.setItem('kashvi_saved_addresses', JSON.stringify(updated));

      setSelectedAddressId(createdId);
      setUserPincode(newAddr.pincode);
      await fetchShippingByPincode(newAddr.pincode);

      setIsAddressModalOpen(false);
      setActiveStep('address');
    } catch (err) {
      console.error('Save address error:', err);
    } finally {
      setSavingAddress(false);
    }
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

    try {
      await supabase.rpc('reduce_order_inventory', { order_items: itemsSnapshot });
    } catch (invErr) {
      console.error('Failed to deduct stock from inventory:', invErr);
    }

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
      message: 'Your payment was successful and your order is confirmed.',
      orderId,
    });

    const resolvedEmail = address.email?.trim() || user?.email?.trim();
    if (resolvedEmail && resolvedEmail.includes('@') && !resolvedEmail.endsWith('.local')) {
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
        .catch((err) => console.warn('Order confirmation email notice:', err));
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
    if (!currentAddress) {
      alert('Selected address not found. Please re-select or add a new address.');
      return;
    }

    setIsCheckingOut(true);
    const cartSnapshot = [...cart];

    try {
      const orderId = await generateOrderNumber();

      const fullAddressText = `${currentAddress.door_no}, ${
        currentAddress.building_name ? currentAddress.building_name + ', ' : ''
      }${currentAddress.street}, ${currentAddress.area}, ${currentAddress.city}, ${
        currentAddress.state
      } - ${currentAddress.pincode}`;

      const resolvedEmail =
        currentAddress.email?.trim() ||
        user?.email?.trim() ||
        `${currentAddress.whatsapp_number}@kashvifashions.local`;

      const totalOrderAmount = subtotal + shippingCharge;

      const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
        'create-payment-order',
        {
          body: {
            orderId: orderId,
            order_id: orderId,
            orderAmount: totalOrderAmount,
            order_amount: totalOrderAmount,
            customerPhone: currentAddress.whatsapp_number,
            customer_phone: currentAddress.whatsapp_number,
            customerName: currentAddress.name,
            customer_name: currentAddress.name,
            customerEmail: resolvedEmail,
            customer_email: resolvedEmail,
          },
        }
      );

      const sessionId = sessionData?.paymentSessionId || sessionData?.payment_session_id;

      if (sessionError || !sessionData || !sessionId) {
        console.error('Payment initialization error:', sessionError || sessionData);
        alert(sessionData?.error || 'Could not connect to the Payment Gateway.');
        setIsCheckingOut(false);
        return;
      }

      const activeGateway = sessionData.gateway || 'cashfree';
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
        total_amount: totalOrderAmount,
        total: totalOrderAmount,
        items: cartSnapshot,
        shipping: {
          address: fullAddressText,
          pincode: currentAddress.pincode,
          fee: shippingCharge,
          zone: pincodeStatus?.zoneType || 'Standard',
          total_weight_grams: totalWeightGrams,
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
            note: `Order initiated using gateway: ${usedGatewayName} with weight ${totalWeightGrams}g`,
          },
        ],
      };

      await supabase.from('orders').insert([orderPayload]);

      if (activeGateway === 'cashfree') {
        const cashfreeMode = sessionData.environment === 'production' ? 'production' : 'sandbox';
        const cashfree = await load({ mode: cashfreeMode });

        cashfree
          .checkout({
            paymentSessionId: sessionId,
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
                    payment_reference: sessionData.orderId || sessionData.order_id || orderId,
                    payment_time: new Date().toISOString(),
                    payment_verified: true,
                  })
                  .eq('id', orderId);

                await handlePaymentSuccess(
                  orderId,
                  currentAddress,
                  totalOrderAmount,
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
      className="fixed inset-0 z-[999] flex justify-end bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-300"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md md:max-w-lg h-full shadow-[0_0_50px_rgba(0,0,0,0.15)] flex flex-col animate-in slide-in-from-right duration-300 border-l cursor-default bg-white text-stone-900 ${
          hasJewelleryItems
            ? 'border-amber-100 font-cinzel'
            : 'border-pink-100 font-sans'
        }`}
      >
        {/* Drawer Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between sticky top-0 z-20 backdrop-blur-md transition-colors bg-white/95 ${
            hasJewelleryItems
              ? 'border-amber-100 text-stone-900 shadow-xs'
              : 'border-pink-100 text-stone-900 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {activeStep === 'address' && (
              <button
                type="button"
                onClick={() => setActiveStep('cart')}
                className={`p-1.5 -ml-1 rounded-full transition-colors cursor-pointer ${
                  hasJewelleryItems ? 'hover:bg-amber-50 text-[#b38728]' : 'hover:bg-pink-50 text-[#ff2d85]'
                }`}
                aria-label="Back to Cart"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <ShoppingBag
                className={`w-5 h-5 ${
                  hasJewelleryItems ? 'text-[#b38728]' : 'text-[#ff2d85]'
                }`}
              />
              <h2 className="text-base sm:text-lg font-bold leading-none">
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
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  hasJewelleryItems
                    ? 'bg-amber-100 text-[#b38728]'
                    : 'bg-pink-100 text-[#ff2d85]'
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
                ? 'hover:bg-amber-50 text-stone-500 hover:text-stone-900'
                : 'hover:bg-pink-50 text-stone-500 hover:text-stone-900'
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
                className={`rounded-3xl p-6 text-center border relative overflow-hidden ${
                  paymentResult.type === 'success'
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : paymentResult.type === 'pending'
                    ? 'bg-amber-50/60 border-amber-200'
                    : 'bg-rose-50/60 border-rose-200'
                }`}
              >
                <div className="flex justify-center mb-2.5">
                  {paymentResult.type === 'success' && (
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
                    </div>
                  )}
                  {paymentResult.type === 'failed' && (
                    <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                      <XCircle className="w-8 h-8 stroke-[2.2]" />
                    </div>
                  )}
                  {paymentResult.type === 'user_dropped' && (
                    <div className="w-14 h-14 rounded-2xl bg-stone-700 text-white flex items-center justify-center shadow-lg shadow-stone-700/20">
                      <RotateCcw className="w-8 h-8 stroke-[2]" />
                    </div>
                  )}
                  {paymentResult.type === 'pending' && (
                    <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <Clock3 className="w-8 h-8 stroke-[2.2]" />
                    </div>
                  )}
                </div>

                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${
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

                <h3 className="text-xl font-bold text-stone-900 mt-2.5">
                  {paymentResult.title}
                </h3>
                <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto leading-relaxed">
                  {paymentResult.message}
                </p>

                {paymentResult.orderId && (
                  <div className="mt-3 inline-block bg-white border border-stone-200 px-3.5 py-1.5 rounded-xl shadow-xs">
                    <span className="text-[9px] text-stone-400 uppercase tracking-widest block font-bold">
                      Order Reference
                    </span>
                    <span className={`text-xs font-bold ${hasJewelleryItems ? 'text-[#b38728]' : 'text-[#ff2d85]'}`}>
                      {paymentResult.orderId}
                    </span>
                  </div>
                )}
              </div>

              {paymentResult.type === 'success' && confirmedOrder && (
                <div className="space-y-3">
                  <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/70 space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className={`w-3.5 h-3.5 ${hasJewelleryItems ? 'text-[#b38728]' : 'text-[#ff2d85]'}`} />
                        Items ({confirmedOrder.items.length})
                      </span>
                      <span className={`text-xs font-bold ${hasJewelleryItems ? 'text-[#b38728]' : 'text-[#ff2d85]'}`}>
                        ₹{confirmedOrder.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {confirmedOrder.items.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-stone-200 shadow-xs"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-14 object-cover object-top rounded-lg border border-stone-200 shrink-0"
                          />
                          <div className="flex-1 min-w-0 text-xs">
                            <h5 className="font-bold text-stone-900 truncate leading-tight">
                              {item.name}
                            </h5>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
                              {item.color && <span className="capitalize">{item.color}</span>}
                              {item.size && <span>• Size: {item.size}</span>}
                              <span>• Qty: {item.qty}</span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-stone-900 shrink-0">
                            ₹{(item.price * item.qty).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-stone-200 rounded-2xl p-3 bg-stone-50/70 text-xs space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      Delivery Address
                    </span>
                    <p className="font-bold text-stone-900">
                      {confirmedOrder.customerName} ({confirmedOrder.customerPhone})
                    </p>
                    <p className="text-stone-600 leading-relaxed text-[11px]">
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
                      className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer text-white ${
                        hasJewelleryItems
                          ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] shadow-amber-200 hover:brightness-105'
                          : 'bg-gradient-to-r from-[#ff2d85] to-[#ff639f] shadow-pink-200 hover:brightness-105'
                      }`}
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>View in My Orders</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider border border-stone-200 text-stone-700 hover:bg-stone-50 transition-all cursor-pointer"
                    >
                      Continue Shopping
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveStep('address')}
                      className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-md text-white ${
                        hasJewelleryItems
                          ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B]'
                          : 'bg-gradient-to-r from-[#ff2d85] to-[#ff639f]'
                      }`}
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
                  <div className="w-16 h-16 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-400">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <p className="text-stone-900 font-bold text-base">Your bag is empty</p>
                  <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                    Explore our prêt boutique fashion and royal jewellery vaults to add your favorites.
                  </p>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className={`mt-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-white shadow-sm ${
                      hasJewelleryItems
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:brightness-105'
                        : 'bg-gradient-to-r from-[#ff2d85] to-[#ff639f] hover:brightness-105'
                    }`}
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => {
                    const resolvedHex = resolveColorHex(item?.color);
                    const isJewelleryItem = item?.department === 'jewellery';

                    return (
                      <div
                        key={item.id}
                        className={`flex gap-3.5 p-3 rounded-2xl border transition-all duration-300 items-center bg-white shadow-xs ${
                          isJewelleryItem
                            ? 'border-amber-200/80 hover:shadow-[0_4px_16px_rgba(212,175,55,0.18)]'
                            : 'border-pink-200/80 hover:shadow-[0_4px_16px_rgba(255,45,133,0.15)]'
                        }`}
                      >
                        <div className="w-16 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200 p-0.5 shadow-2xs">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover object-top rounded-lg"
                          />
                        </div>

                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                className={`text-xs font-bold truncate leading-snug ${
                                  isJewelleryItem ? 'font-cinzel text-stone-900' : 'font-sans text-stone-900'
                                }`}
                              >
                                {item.name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.id)}
                                className="text-stone-400 hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                                title="Remove Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {item.color && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-stone-700 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-md font-medium">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                                    style={{ backgroundColor: resolvedHex }}
                                  />
                                  <span className="capitalize">{item.color}</span>
                                </span>
                              )}
                              {item.size && (
                                <span className="text-[10px] font-bold text-stone-700 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-md">
                                  Size: {item.size}
                                </span>
                              )}
                              {item.fabric && (
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 font-semibold">
                                  {item.fabric}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div className="inline-flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-full px-2 py-0.5">
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, -1)}
                                className="text-stone-500 hover:text-stone-900 transition-colors p-0.5 cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-xs font-bold text-stone-900 w-4 text-center">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, 1)}
                                className="text-stone-500 hover:text-stone-900 transition-colors p-0.5 cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            <span
                              className={`text-sm font-bold ${
                                isJewelleryItem ? 'text-[#b38728]' : 'text-stone-950'
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
                <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                  Deliver To
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddAddressModal}
                  className={`text-xs font-bold hover:underline cursor-pointer flex items-center gap-1 px-3 py-1.5 rounded-full border ${
                    hasJewelleryItems
                      ? 'text-[#b38728] bg-amber-50 border-amber-200'
                      : 'text-[#ff2d85] bg-pink-50 border-pink-200'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" /> Add New
                </button>
              </div>

              {loadingAddresses ? (
                <CringeLoader size="md" />
              ) : savedAddresses.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-stone-200 rounded-2xl p-6 space-y-3 bg-stone-50/50">
                  <MapPin className="w-8 h-8 text-stone-400 mx-auto" />
                  <p className="text-xs text-stone-500">No delivery address saved yet.</p>
                  <button
                    type="button"
                    onClick={handleOpenAddAddressModal}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer text-white shadow-xs ${
                      hasJewelleryItems ? 'bg-[#D4AF37]' : 'bg-[#ff2d85]'
                    }`}
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
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 relative group ${
                          isSelected
                            ? hasJewelleryItems
                              ? 'border-[#D4AF37] bg-amber-50/40 shadow-sm'
                              : 'border-[#ff2d85] bg-pink-50/40 shadow-sm'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="delivery_address"
                          checked={isSelected}
                          onChange={() => handleSelectExistingAddress(addr)}
                          className={`mt-1 cursor-pointer ${
                            hasJewelleryItems ? 'accent-[#D4AF37]' : 'accent-[#ff2d85]'
                          }`}
                        />

                        <div className="flex-1 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900 text-sm">{addr.name}</span>
                              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200 flex items-center gap-1">
                                {addr.address_type === 'Work' && <Briefcase className="w-2.5 h-2.5" />}
                                {addr.address_type === 'Home' && <Home className="w-2.5 h-2.5" />}
                                {addr.address_type === 'Others' && <Bookmark className="w-2.5 h-2.5 text-[#ff2d85]" />}
                                <span>{displayLabel}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                WA: {addr.whatsapp_number}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteAddress(addr.id, e)}
                                className="text-stone-400 hover:text-rose-500 p-1 rounded-md hover:bg-stone-100 transition-colors"
                                title="Delete Address"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-stone-600 leading-relaxed pt-0.5">
                            {addr.door_no}, {addr.building_name ? `${addr.building_name}, ` : ''}
                            {addr.street}, {addr.area}
                          </p>

                          <div className="flex items-center justify-between pt-1">
                            <p className="font-semibold text-stone-700">
                              {addr.city}, {addr.state} — <span className="font-bold text-stone-900">{addr.pincode}</span>
                            </p>
                            {isSelected && pincodeStatus?.zoneType && (
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                hasJewelleryItems
                                  ? 'text-[#b38728] bg-amber-50 border-amber-200'
                                  : 'text-[#ff2d85] bg-pink-50 border-pink-200'
                              }`}>
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
          <div
            className="p-5 border-t space-y-3 shrink-0 shadow-lg bg-white border-stone-100"
          >
            <div className="space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-stone-900">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {activeStep === 'address' && (
                <div className="flex justify-between items-center animate-in fade-in duration-150">
                  <span className="flex items-center gap-1 text-stone-600">
                    <Truck className={`w-3.5 h-3.5 ${hasJewelleryItems ? 'text-[#b38728]' : 'text-[#ff2d85]'}`} />
                    Delivery Charge {pincodeStatus?.zoneType ? `(${pincodeStatus.zoneType} • ${totalWeightGrams}g)` : ''}
                  </span>
                  <span className="font-bold text-stone-900">
                    {pincodeLoading ? '...' : `₹${shippingCharge}`}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-100">
                <span>{activeStep === 'cart' ? 'Subtotal Due' : 'Total Due'}</span>
                <span
                  className={`text-lg font-bold ${
                    hasJewelleryItems ? 'text-[#b38728]' : 'text-stone-950'
                  }`}
                >
                  ₹{finalPayableAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {activeStep === 'cart' ? (
              <button
                type="button"
                onClick={handleProceedToAddress}
                className={`relative w-full py-4 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all duration-300 active:scale-98 cursor-pointer text-white ${
                  hasJewelleryItems
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] shadow-amber-200 hover:brightness-105'
                    : 'bg-gradient-to-r from-[#ff2d85] to-[#ff639f] shadow-pink-200 hover:brightness-105'
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
                className={`relative w-full py-4 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all duration-300 active:scale-98 cursor-pointer text-white disabled:opacity-50 ${
                  hasJewelleryItems
                    ? 'bg-gradient-to-r from-[#D4AF37] via-[#DFBF58] to-[#B8860B] shadow-amber-200 hover:brightness-105'
                    : 'bg-gradient-to-r from-[#ff2d85] via-[#ff4d94] to-[#ff639f] shadow-pink-200 hover:brightness-105'
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
                    : `Pay via ${activeGatewayName} • ₹${(subtotal + shippingCharge).toLocaleString('en-IN')}`}
                </span>
                {!isCheckingOut && <ArrowRight className="w-4 h-4" />}
              </button>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-stone-400 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
              <span>100% Secure Encrypted Checkout with {activeGatewayName}</span>
            </div>
          </div>
        )}
      </aside>

      {/* Add New Address Modal */}
      {isAddressModalOpen && (
        <div
          onClick={() => setIsAddressModalOpen(false)}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-stone-100 cursor-default my-auto animate-in zoom-in-95 duration-200 p-6 space-y-4 bg-white text-stone-900"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className={`w-5 h-5 ${hasJewelleryItems ? 'text-[#b38728]' : 'text-[#ff2d85]'}`} />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Add New Delivery Address
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewAddress} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1.5">
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
                            ? hasJewelleryItems
                              ? 'bg-[#D4AF37] text-stone-950 border-[#D4AF37] shadow-xs'
                              : 'bg-[#ff2d85] text-white border-[#ff2d85] shadow-xs'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-300'
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
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Address Label Name * (e.g. Mom's House, Boutique)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Custom Address Name"
                    value={formData.custom_label}
                    onChange={(e) => setFormData({ ...formData, custom_label: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-[#ff2d85] font-medium"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abhilash"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-[#ff2d85]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
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
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-[#ff2d85]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Email Address (For Invoices & Tracking)
                </label>
                <input
                  type="email"
                  placeholder="e.g. yourname@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-[#ff2d85]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Door / House / Flat No. *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2-1-65/2"
                    value={formData.door_no}
                    onChange={(e) => setFormData({ ...formData, door_no: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-[#ff2d85]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Building Name / House Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nemani Complex"
                    value={formData.building_name}
                    onChange={(e) =>
                      setFormData({ ...formData, building_name: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-[#ff2d85]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Street Name / Road
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bhanugundi Junction"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-[#ff2d85]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Area / Landmark
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bhanugundi"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-[#ff2d85]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="533003"
                    value={formData.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-[#ff2d85] font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    City (Auto)
                  </label>
                  <input
                    type="text"
                    required
                    readOnly
                    placeholder={pincodeLoading ? '...' : 'City'}
                    value={formData.city}
                    className="w-full bg-stone-100 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-500 font-medium cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    State (Auto)
                  </label>
                  <input
                    type="text"
                    required
                    readOnly
                    placeholder={pincodeLoading ? '...' : 'State'}
                    value={formData.state}
                    className="w-full bg-stone-100 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-500 font-medium cursor-not-allowed"
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
                    <span className="text-rose-600 font-semibold flex items-center gap-1">
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
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold uppercase tracking-wider hover:bg-stone-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress || pincodeStatus?.deliveryAvailable === false}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-40 transition-all cursor-pointer shadow-sm text-white flex items-center justify-center gap-1.5 ${
                    hasJewelleryItems
                      ? 'bg-[#D4AF37] hover:brightness-105'
                      : 'bg-[#ff2d85] hover:brightness-105'
                  }`}
                >
                  {savingAddress ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Address</span>
                  )}
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