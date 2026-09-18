import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminNavbar from './admin/components/AdminNavbar';
import AdminLoginScreen from './admin/components/AdminLoginScreen';
import StickyOrderAlerts from './admin/components/StickyOrderAlerts';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminStaff from './admin/pages/AdminStaff';
import { OrderRecord, AdminStaffUser } from './admin/types';

export default function AdminApp() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<AdminStaffUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [activeAlerts, setActiveAlerts] = useState<OrderRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncTrigger, setSyncTrigger] = useState<number>(0);

  // 10 minutes inactivity timeout
  const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const logoutSession = () => {
    sessionStorage.removeItem('kfmama_auth_session');
    sessionStorage.removeItem('kfmama_auth_user');
    sessionStorage.removeItem('kfmama_auth_timestamp');
    setCurrentUser(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const resetInactivityTimer = () => {
    if (!currentUser) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      logoutSession();
    }, INACTIVITY_TIMEOUT_MS);
  };

  // Manual Sync trigger from Navbar button
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

  // Polling every 15s
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
      <div className="min-h-screen bg-[#f0f4f2] flex items-center justify-center text-xs font-semibold text-[#0b3b2c]">
        Verifying Security Credentials...
      </div>
    );
  }

  if (!currentUser) {
    return <AdminLoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-[#f0f4f2] text-[#0c2b22] flex flex-col selection:bg-[#0b3b2c] selection:text-white font-sans">
      <AdminNavbar
        unreadCount={activeAlerts.length}
        currentUser={currentUser}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
        onLogout={logoutSession}
      />

      <StickyOrderAlerts
        notifications={activeAlerts}
        onDismiss={handleDismissAlert}
      />

      <main className="flex-1 w-full max-w-[1540px] mx-auto p-3 sm:p-5">
        <Routes>
          <Route
            path="/"
            element={
              <AdminDashboard
                currentUser={currentUser}
                onNewOrderNotice={handleNewOrderAlert}
                syncTrigger={syncTrigger}
              />
            }
          />
          <Route
            path="/staff"
            element={<AdminStaff currentUser={currentUser} />}
          />
          <Route path="*" element={<Navigate to="/kfmama" replace />} />
        </Routes>
      </main>
    </div>
  );
}