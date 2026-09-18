import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminNavbar from './components/AdminNavbar';
import AdminDashboard from './pages/AdminDashboard';
import AdminMasters from './pages/AdminMasters';
import AdminProducts from './pages/AdminProducts';

export default function AdminApp() {
  const location = useLocation();

  // /kfmama తో మొదలవ్వకపోతే వెంటనే హోమ్‌పేజీకి రీడైరెక్ట్ చేసే కఠినమైన గార్డ్
  if (!location.pathname.startsWith('/kfmama')) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    // అడ్మిన్ పేజీ టైటిల్ సెట్ చేయడం
    document.title = 'Kashvi Studio OS — Super Admin';
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f4f2] text-[#0c2b22] flex flex-col selection:bg-[#0b3b2c] selection:text-white">
      {/* 1. Nordic Ceramic Top Navigation Bar */}
      <AdminNavbar />

      {/* 2. Admin Workspace Content */}
      <main className="flex-1 w-full max-w-[1540px] mx-auto p-4 sm:p-8">
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/masters" element={<AdminMasters />} />
          <Route path="/products" element={<AdminProducts />} />
          <Route path="/products/new" element={<AdminProducts />} />
          {/* సరిపోలని ఏదైనా తప్పుడు సబ్-రౌట్ వస్తే /kfmama డాష్‌బోర్డ్‌కు రీడైరెక్ట్ */}
          <Route path="*" element={<Navigate to="/kfmama" replace />} />
        </Routes>
      </main>
    </div>
  );
}