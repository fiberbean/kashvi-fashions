import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminNavbar from './components/AdminNavbar';
import AdminDashboard from './pages/AdminDashboard';
import AdminMasters from './pages/AdminMasters';
import AdminProducts from './pages/AdminProducts';

export default function AdminApp() {
  const location = useLocation();

  if (!location.pathname.startsWith('/kfmama')) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    document.title = 'Kashvi Studio OS — Super Admin';
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f4f2] text-[#0c2b22] flex flex-col selection:bg-[#0b3b2c] selection:text-white">
      <AdminNavbar />

      <main className="flex-1 w-full max-w-[1540px] mx-auto p-4 sm:p-8">
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/masters" element={<AdminMasters />} />
          <Route path="/products" element={<AdminProducts />} />
          <Route path="/products/new" element={<AdminProducts />} />
          <Route path="*" element={<Navigate to="/kfmama" replace />} />
        </Routes>
      </main>
    </div>
  );
}