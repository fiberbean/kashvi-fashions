import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, TrendingUp, ShoppingCart, Receipt, BarChart3 } from 'lucide-react';
import AdminNavbar, { MasterSectionType } from './admin/components/AdminNavbar';
import AdminLoginScreen from './admin/components/AdminLoginScreen';
import StickyOrderAlerts from './admin/components/StickyOrderAlerts';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminStaff from './admin/pages/AdminStaff';
import AdminProducts from './admin/pages/AdminProducts';
import OrdersManager from './admin/components/OrdersManager';
import ProductMasterManager from './admin/pages/ProductMasterManager';
import InventoryManager from './admin/pages/InventoryManager';
import PurchaseManager from './admin/pages/PurchaseManager';
import SalesManager from './admin/pages/SalesManager';
import CategoryMasterModal from './admin/components/modals/CategoryMasterModal';
import SubCategoryMasterModal from './admin/components/modals/SubCategoryMasterModal';
import ColorMasterModal from './admin/components/modals/ColorMasterModal';
import SizeMasterModal from './admin/components/modals/SizeMasterModal';
import SupplierMasterModal from './admin/components/modals/SupplierMasterModal';
import PaymentGatewayManager from './admin/pages/PaymentGatewayManager';
import { OrderRecord, AdminStaffUser } from './admin/types';
import { supabase } from './lib/supabase';

export type AdminViewType = 
  | 'dashboard' 
  | 'orders' 
  | 'inventory' 
  | 'sales' 
  | 'purchase' 
  | 'expenses' 
  | 'reports' 
  | 'products' 
  | 'product_master'
  | 'staff'
  | 'gateways';

export default function AdminApp() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<AdminStaffUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [activeAlerts, setActiveAlerts] = useState<OrderRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncTrigger, setSyncTrigger] = useState<number>(0);
  const salesAudioContextRef = useRef<AudioContext | null>(null);

  const [currentView, setCurrentView] = useState<AdminViewType>('dashboard');
  const [selectedMasterSection, setSelectedMasterSection] = useState<MasterSectionType | null>(null);

  const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const logoutSession = () => {
    sessionStorage.removeItem('kfmama_auth_session');
    sessionStorage.removeItem('kfmama_auth_user');
    sessionStorage.removeItem('kfmama_auth_timestamp');
    setCurrentUser(null);
    setCurrentView('dashboard');
    setSelectedMasterSection(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const resetInactivityTimer = () => {
    if (!currentUser) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      logoutSession();
    }, INACTIVITY_TIMEOUT_MS);
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setSyncTrigger((prev) => prev + 1);
    setTimeout(() => {
      setIsSyncing(false);
    }, 600);
  };

  useEffect(() => {
    const hasSession = sessionStorage.getItem('kfmama_auth_session');
    const storedUser = sessionStorage.getItem('kfmama_auth_user');

    if (hasSession === 'true' && storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        logoutSession();
      }
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      handleManualSync();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    resetInactivityTimer();

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetInactivityTimer();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetInactivityTimer();
      }
    };

    activityEvents.forEach((ev) => window.addEventListener(ev, handleActivity));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  // Keep every hook above the conditional returns below.
  // React requires hooks to run in the same order on every render.
  const normalizedRole = String(currentUser?.role || 'operations').toLowerCase().trim();
  const isAdmin = normalizedRole === 'admin';
  const isManager = normalizedRole === 'manager';
  const isOperations = normalizedRole === 'operations';
  const isSales = normalizedRole === 'sales';
  const canAccess = (view: AdminViewType) => {
    if (isAdmin) return true;
    if (isSales) return view === 'orders' || view === 'sales';
    if (isManager || isOperations) return !['staff', 'gateways'].includes(view);
    return false;
  };

  useEffect(() => {
    document.title = currentUser
      ? `Kashvi Command Deck — ${currentUser.role.toUpperCase()}`
      : 'Kashvi Studio OS — Secure Staff Gateway';
  }, [currentUser]);

  useEffect(() => {
    if (isSales && !canAccess(currentView)) {
      setCurrentView('sales');
    }
  }, [isSales, currentView]);

  // Sales role should always open directly on the Walk-In Store billing screen
  // after login instead of the Online Orders screen.
  useEffect(() => {
    if (isSales) {
      setSelectedMasterSection(null);
      setCurrentView('sales');
    }
  }, [isSales]);

  // Sales role must receive online-order alerts even though Sales cannot access Dashboard.
  // Keep a reusable AudioContext and unlock it from a real user gesture so browser
  // autoplay policy does not block the alert sound when a realtime order arrives.
  useEffect(() => {
    if (!isSales) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }

    const getAudioContext = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return null;

        if (!salesAudioContextRef.current) {
          salesAudioContextRef.current = new AudioContextClass();
        }

        return salesAudioContextRef.current;
      } catch (e) {
        console.warn('Sales audio context unavailable:', e);
        return null;
      }
    };

    // IMPORTANT: create the AudioContext INSIDE the real user gesture.
    // Creating it earlier and only calling resume() later can leave Chrome's
    // autoplay policy blocking realtime sounds until the user clicks again.
    const unlockSalesAudio = async () => {
      const ctx = getAudioContext();
      if (!ctx) return;

      try {
        if (ctx.state !== 'running') {
          await ctx.resume();
        }

        // Prime the audio output during the user gesture with an inaudible
        // oscillator. This makes subsequent realtime alert sounds eligible
        // to play without requiring another click.
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.01);
      } catch (e) {
        console.warn('Sales audio unlock unavailable:', e);
      }
    };

    const gestureEvents = ['pointerdown', 'mousedown', 'keydown', 'touchstart'];
    gestureEvents.forEach((eventName) => {
      window.addEventListener(eventName, unlockSalesAudio, { passive: true });
    });

    const playSalesOrderAlert = () => {
      const ctx = salesAudioContextRef.current;
      if (!ctx || ctx.state !== 'running') return;

      try {
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(587.33, now);
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain1.gain.setValueAtTime(0.38, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.4);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1174.66, now + 0.18);
        gain2.gain.setValueAtTime(0.28, now + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.72);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.18);
        osc2.stop(now + 0.72);
      } catch (e) {
        console.warn('Sales order alert sound unavailable:', e);
      }
    };

    const channel = supabase
      .channel('kfmama-sales-online-order-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as OrderRecord;
          if (!newOrder?.id?.toUpperCase().startsWith('KFOD')) return;

          playSalesOrderAlert();
          setActiveAlerts((prev) => {
            if (prev.some((order) => order.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              const items = Array.isArray(newOrder.items) ? newOrder.items : [];
              const firstItem = items[0] as any;
              const itemName = firstItem?.name || 'New Online Order';
              const qty = firstItem?.qty || firstItem?.quantity || 1;
              new Notification(`🚨 NEW ORDER: ${itemName}`, {
                body: `Qty: ${qty} • ${newOrder.customer_name || 'Customer'} • ${newOrder.id}`,
                icon: firstItem?.image || '/favicon.ico',
                requireInteraction: true
              });
            } catch (e) {
              console.warn('Sales browser notification failed:', e);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      gestureEvents.forEach((eventName) => {
        window.removeEventListener(eventName, unlockSalesAudio);
      });
    };
  }, [isSales]);

  if (!location.pathname.startsWith('/kfmama')) {
    return <Navigate to="/" replace />;
  }

  const handleNewOrderAlert = (ord: OrderRecord) => {
    setActiveAlerts((prev) => [ord, ...prev]);
  };

  const handleDismissAlert = (orderId: string) => {
    setActiveAlerts((prev) => prev.filter((o) => o.id !== orderId));
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col items-center justify-center text-xs font-mono text-[#00d9ff] relative overflow-hidden select-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#6d4aff]/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[#00d9ff]/15 rounded-full blur-3xl animate-pulse delay-700 pointer-events-none" />

        <div className="relative z-10 bg-[rgba(16,22,40,0.92)] border border-[#6d4aff]/30 p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.7),0_0_20px_rgba(109,74,255,0.25)] flex flex-col items-center gap-3 backdrop-blur-2xl">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#667eea] to-[#764ba2] p-[1px] shadow-lg shadow-[#6d4aff]/30">
            <div className="w-full h-full bg-[#101628] rounded-2xl flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-[#00d9ff] animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <span className="font-bold text-white tracking-wide block">Authenticating Terminal</span>
            <span className="text-[10px] text-[#8b9bb4]">Verifying cryptographic credentials...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AdminLoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const normalizedSection = selectedMasterSection ? String(selectedMasterSection).toLowerCase().trim() : '';
  const isCategorySection = normalizedSection === 'category' || normalizedSection === 'categories';
  const isSubCategorySection = 
    normalizedSection === 'sub_category' || 
    normalizedSection === 'sub-category' || 
    normalizedSection === 'subcategory' ||
    normalizedSection === 'subcategories';
  const isColorSection = 
    normalizedSection === 'color' || 
    normalizedSection === 'colors' || 
    normalizedSection === 'colour' || 
    normalizedSection === 'colours';
  const isSizeSection = normalizedSection === 'size' || normalizedSection === 'sizes';
  const isSupplierSection = normalizedSection === 'supplier' || normalizedSection === 'suppliers';

  return (
    <div
      data-user-role={normalizedRole}
      className="min-h-screen bg-[#0a0e17] text-white flex flex-col selection:bg-[#6d4aff] selection:text-white font-sans relative overflow-x-hidden"
    >
      {/* Universal RBAC Rule Enforcement Engine */}
      <style>{`
        /* 1. ADMIN (Full Access everywhere across all components & future modals) */
        [data-user-role="admin"] .btn-edit,
        [data-user-role="admin"] .btn-delete,
        [data-user-role="admin"] .admin-only,
        [data-user-role="admin"] .manager-restricted,
        [data-user-role="admin"] button[title*="Edit" i],
        [data-user-role="admin"] button[title*="Delete" i],
        [data-user-role="admin"] button[aria-label*="Edit" i],
        [data-user-role="admin"] button[aria-label*="Delete" i] {
          display: inline-flex !important;
          pointer-events: auto !important;
        }

        /* 2. MANAGER (Create, Edit & View — Hide Delete & Admin-Only modals) */
        [data-user-role="manager"] .btn-delete,
        [data-user-role="manager"] .admin-only,
        [data-user-role="manager"] button[title*="Delete" i],
        [data-user-role="manager"] button[aria-label*="Delete" i] {
          display: none !important;
          pointer-events: none !important;
        }
        [data-user-role="manager"] .btn-edit,
        [data-user-role="manager"] button[title*="Edit" i],
        [data-user-role="manager"] button[aria-label*="Edit" i] {
          display: inline-flex !important;
          pointer-events: auto !important;
        }

        /* 3. OPERATIONS (Create & View Only — Hide Edit, Delete & Restricted Modals) */
        [data-user-role="operations"] .btn-edit,
        [data-user-role="operations"] .btn-delete,
        [data-user-role="operations"] .admin-only,
        [data-user-role="operations"] .manager-restricted,
        [data-user-role="operations"] button[title*="Edit" i],
        [data-user-role="operations"] button[title*="Delete" i],
        [data-user-role="operations"] button[aria-label*="Edit" i],
        [data-user-role="operations"] button[aria-label*="Delete" i] {
          display: none !important;
          pointer-events: none !important;
        }
      `}</style>

      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-48 -right-48 w-[500px] h-[500px] bg-[#6d4aff]/15 rounded-full blur-[130px] animate-pulse" />
        <div className="absolute top-1/2 -left-48 w-[450px] h-[450px] bg-[#00d9ff]/10 rounded-full blur-[130px] animate-pulse delay-1000" />
        <div className="absolute -bottom-48 right-1/4 w-[450px] h-[450px] bg-[#ff6b6b]/10 rounded-full blur-[140px] animate-pulse delay-500" />
        
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)', 
            backgroundSize: '32px 32px' 
          }} 
        />
      </div>

      {/* Top Navbar */}
      <div className="relative z-30">
        <AdminNavbar
          unreadCount={activeAlerts.length}
          currentUser={currentUser}
          isSyncing={isSyncing}
          onManualSync={handleManualSync}
          onLogout={logoutSession}
          currentView={currentView}
          onViewChange={(view) => {
            setSelectedMasterSection(null);
            setCurrentView(view);
          }}
          onSelectMaster={(section) => {
            if (section === 'product') {
              setSelectedMasterSection(null);
              setCurrentView('product_master');
            } else {
              setSelectedMasterSection(section);
            }
          }}
        />
      </div>

      <StickyOrderAlerts
        notifications={activeAlerts}
        onDismiss={handleDismissAlert}
      />

      {/* Masters Modal Popups */}
      {isSupplierSection && (
        <SupplierMasterModal
          onClose={() => setSelectedMasterSection(null)}
          onSuccess={() => handleManualSync()}
        />
      )}
      {isCategorySection && (
        <CategoryMasterModal
          onClose={() => setSelectedMasterSection(null)}
          onSuccess={() => handleManualSync()}
        />
      )}
      {isSubCategorySection && (
        <SubCategoryMasterModal
          onClose={() => setSelectedMasterSection(null)}
          onSuccess={() => handleManualSync()}
        />
      )}
      {isColorSection && (
        <ColorMasterModal
          onClose={() => setSelectedMasterSection(null)}
          onSuccess={() => handleManualSync()}
        />
      )}
      {isSizeSection && (
        <SizeMasterModal
          onClose={() => setSelectedMasterSection(null)}
          onSuccess={() => handleManualSync()}
        />
      )}

      {(!selectedMasterSection || (
        !isCategorySection && 
        !isSubCategorySection && 
        !isColorSection && 
        !isSizeSection &&
        !isSupplierSection
      )) && (
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-5 relative z-10">
          {currentView === 'dashboard' && canAccess('dashboard') && (
            <AdminDashboard
              currentUser={currentUser}
              onNewOrderNotice={handleNewOrderAlert}
              syncTrigger={syncTrigger}
            />
          )}

          {currentView === 'orders' && canAccess('orders') && (
            <OrdersManager currentUser={currentUser} />
          )}

          {currentView === 'inventory' && canAccess('inventory') && (
            <InventoryManager currentUser={currentUser} />
          )}

          {currentView === 'product_master' && canAccess('product_master') && (
            <ProductMasterManager />
          )}

          {currentView === 'purchase' && canAccess('purchase') && (
            <PurchaseManager currentUser={currentUser} />
          )}

          {currentView === 'sales' && canAccess('sales') && (
            <SalesManager currentUser={currentUser} />
          )}

          {currentView === 'expenses' && canAccess('expenses') && (
            <div className="p-8 rounded-3xl bg-[#101628]/90 border border-white/10 shadow-2xl backdrop-blur-xl text-center space-y-3 animate-in fade-in">
              <div className="w-14 h-14 rounded-2xl bg-[#ff6b6b]/10 text-[#ff6b6b] border border-[#ff6b6b]/20 flex items-center justify-center mx-auto shadow-lg">
                <Receipt className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white">Operating Expenses Tracker</h2>
              <p className="text-xs text-[#8b9bb4] max-w-md mx-auto leading-relaxed">
                Store rent, staff salaries, electricity bills, packaging, transport and everyday operational costs.
              </p>
            </div>
          )}

          {currentView === 'reports' && canAccess('reports') && (
            <div className="p-8 rounded-3xl bg-[#101628]/90 border border-white/10 shadow-2xl backdrop-blur-xl text-center space-y-3 animate-in fade-in">
              <div className="w-14 h-14 rounded-2xl bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 flex items-center justify-center mx-auto shadow-lg">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white">Analytics & Financial Reports</h2>
              <p className="text-xs text-[#8b9bb4] max-w-md mx-auto leading-relaxed">
                Profit & loss statements, GST filing summaries, fast-moving items analysis and monthly sales trends.
              </p>
            </div>
          )}

          {currentView === 'products' && canAccess('products') && (
            <AdminProducts currentUser={currentUser} />
          )}

          {currentView === 'staff' && canAccess('staff') && (
            <AdminStaff currentUser={currentUser} />
          )}

          {currentView === 'gateways' && canAccess('gateways') && (
            <PaymentGatewayManager currentUser={currentUser} />
          )}
        </main>
      )}
    </div>
  );
}