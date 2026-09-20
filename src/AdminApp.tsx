import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import AdminNavbar, { MasterSectionType } from './admin/components/AdminNavbar';
import AdminLoginScreen from './admin/components/AdminLoginScreen';
import StickyOrderAlerts from './admin/components/StickyOrderAlerts';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminStaff from './admin/pages/AdminStaff';
import AdminProducts from './admin/pages/AdminProducts';
import ProductMasterModal from './admin/components/modals/ProductMasterModal';
import CategoryMasterModal from './admin/components/modals/CategoryMasterModal';
import SubCategoryMasterModal from './admin/components/modals/SubCategoryMasterModal';
import { OrderRecord, AdminStaffUser } from './admin/types';

export type AdminViewType = 'dashboard' | 'products' | 'staff';

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
        {/* Ambient Neon Blobs */}
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

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white flex flex-col selection:bg-[#6d4aff] selection:text-white font-sans relative overflow-x-hidden">
      {/* Global Background Neon Glow Matrix */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-48 -right-48 w-[500px] h-[500px] bg-[#6d4aff]/15 rounded-full blur-[130px] animate-pulse" />
        <div className="absolute top-1/2 -left-48 w-[450px] h-[450px] bg-[#00d9ff]/10 rounded-full blur-[130px] animate-pulse delay-1000" />
        <div className="absolute -bottom-48 right-1/4 w-[450px] h-[450px] bg-[#ff6b6b]/10 rounded-full blur-[140px] animate-pulse delay-500" />
        
        {/* Futuristic Subtle Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)', 
            backgroundSize: '32px 32px' 
          }} 
        />
      </div>

      {/* Top Navbar */}
      <div className="relative z-40">
        <AdminNavbar
          unreadCount={activeAlerts.length}
          currentUser={currentUser}
          isSyncing={isSyncing}
          onManualSync={handleManualSync}
          onLogout={logoutSession}
          currentView={currentView}
          onViewChange={(view) => setCurrentView(view)}
          onSelectMaster={(section) => setSelectedMasterSection(section)}
        />
      </div>

      {/* Realtime Alert Stream */}
      <StickyOrderAlerts
        notifications={activeAlerts}
        onDismiss={handleDismissAlert}
      />

      {/* Product Master Modal Popup (On Hold) */}
      {selectedMasterSection === 'product' && (
        <ProductMasterModal onClose={() => setSelectedMasterSection(null)} />
      )}

      {/* Category Master Modal Popup */}
      {selectedMasterSection === 'category' && (
        <CategoryMasterModal
          onClose={() => setSelectedMasterSection(null)}
          onSuccess={() => {
            handleManualSync();
          }}
        />
      )}

      {/* Sub-Category Master Modal Popup */}
      {selectedMasterSection === 'sub_category' && (
        <SubCategoryMasterModal
          onClose={() => setSelectedMasterSection(null)}
          onSuccess={() => {
            handleManualSync();
          }}
        />
      )}

      {/* Main Content Area */}
      {!selectedMasterSection && (
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-5 relative z-10">
          {currentView === 'dashboard' && (
            <AdminDashboard
              currentUser={currentUser}
              onNewOrderNotice={handleNewOrderAlert}
              syncTrigger={syncTrigger}
            />
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