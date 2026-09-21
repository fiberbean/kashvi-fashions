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
import CategoryMasterModal from './admin/components/modals/CategoryMasterModal';
import SubCategoryMasterModal from './admin/components/modals/SubCategoryMasterModal';
import ColorMasterModal from './admin/components/modals/ColorMasterModal';
import SizeMasterModal from './admin/components/modals/SizeMasterModal';
import { OrderRecord, AdminStaffUser } from './admin/types';

export type AdminViewType = 
  | 'dashboard' 
  | 'orders' 
  | 'sales' 
  | 'purchase' 
  | 'expenses' 
  | 'reports' 
  | 'products' 
  | 'product_master'
  | 'staff';

export default function AdminApp() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<AdminStaffUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [activeAlerts, setActiveAlerts] = useState<OrderRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncTrigger, setSyncTrigger] = useState<number>(0);

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

  if (!location.pathname.startsWith('/kfmama')) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    document.title = currentUser
      ? `Kashvi Command Deck — ${currentUser.role.toUpperCase()}`
      : 'Kashvi Studio OS — Secure Staff Gateway';
  }, [currentUser]);

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

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white flex flex-col selection:bg-[#6d4aff] selection:text-white font-sans relative overflow-x-hidden">
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

      <div className="relative z-40">
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
        !isSizeSection
      )) && (
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-5 relative z-10">
          {currentView === 'dashboard' && (
            <AdminDashboard
              currentUser={currentUser}
              onNewOrderNotice={handleNewOrderAlert}
              syncTrigger={syncTrigger}
            />
          )}

          {currentView === 'orders' && (
            <OrdersManager />
          )}

          {currentView === 'product_master' && (
            <ProductMasterManager />
          )}

          {currentView === 'sales' && (
            <div className="p-8 rounded-3xl bg-[#101628]/90 border border-white/10 shadow-2xl backdrop-blur-xl text-center space-y-3 animate-in fade-in">
              <div className="w-14 h-14 rounded-2xl bg-[#00d9ff]/10 text-[#00d9ff] border border-[#00d9ff]/20 flex items-center justify-center mx-auto shadow-lg">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white">Sales Management Deck</h2>
              <p className="text-xs text-[#8b9bb4] max-w-md mx-auto leading-relaxed">
                POS billing, offline counter sales, custom discounts, customer loyalty points and transaction ledgers.
              </p>
            </div>
          )}

          {currentView === 'purchase' && (
            <div className="p-8 rounded-3xl bg-[#101628]/90 border border-white/10 shadow-2xl backdrop-blur-xl text-center space-y-3 animate-in fade-in">
              <div className="w-14 h-14 rounded-2xl bg-[#ffa500]/10 text-[#ffa500] border border-[#ffa500]/20 flex items-center justify-center mx-auto shadow-lg">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white">Purchase & Stock Inward Hub</h2>
              <p className="text-xs text-[#8b9bb4] max-w-md mx-auto leading-relaxed">
                Supplier bills, purchase orders, bulk variant inwards, inventory updates and vendor payment trackings.
              </p>
            </div>
          )}

          {currentView === 'expenses' && (
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

          {currentView === 'reports' && (
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

          {currentView === 'products' && (
            <AdminProducts currentUser={currentUser} />
          )}

          {currentView === 'staff' && (
            <AdminStaff currentUser={currentUser} />
          )}
        </main>
      )}
    </div>
  );
}