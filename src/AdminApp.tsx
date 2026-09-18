import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminNavbar from './components/AdminNavbar';
import AdminLoginScreen from './components/AdminLoginScreen';
import StickyOrderAlerts from './components/StickyOrderAlerts';
import AdminDashboard from './pages/AdminDashboard';
import { OrderRecord } from './types';

export default function AdminApp() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [activeAlerts, setActiveAlerts] = useState<OrderRecord[]>([]);

  // 10 నిమిషాల ఇన్‌యాక్టివిటీ టైమర్
  const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const logoutSession = () => {
    sessionStorage.removeItem('kfmama_auth_session');
    sessionStorage.removeItem('kfmama_auth_timestamp');
    setIsAuthenticated(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const resetInactivityTimer = () => {
    if (!isAuthenticated) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      logoutSession();
    }, INACTIVITY_TIMEOUT_MS);
  };

  useEffect(() => {
    const hasSession = sessionStorage.getItem('kfmama_auth_session');
    if (hasSession === 'true') {
      setIsAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

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
  }, [isAuthenticated]);

  if (!location.pathname.startsWith('/kfmama')) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    document.title = isAuthenticated
      ? 'Kashvi Live Command Deck'
      : 'Kashvi Studio OS — Secure Gateway';
  }, [isAuthenticated]);

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

  if (!isAuthenticated) {
    return <AdminLoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#f0f4f2] text-[#0c2b22] flex flex-col selection:bg-[#0b3b2c] selection:text-white">
      <AdminNavbar unreadCount={activeAlerts.length} onLogout={logoutSession} />

      <StickyOrderAlerts
        notifications={activeAlerts}
        onDismiss={handleDismissAlert}
      />

      <main className="flex-1 w-full max-w-[1540px] mx-auto p-4 sm:p-6">
        <Routes>
          <Route
            path="/"
            element={<AdminDashboard onNewOrderNotice={handleNewOrderAlert} />}
          />
          <Route path="*" element={<Navigate to="/kfmama" replace />} />
        </Routes>
      </main>
    </div>
  );
}