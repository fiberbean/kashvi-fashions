import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerApp from './CustomerApp';
import AdminApp from "./AdminApp";
import AdminRouteGuard from './components/AdminRouteGuard';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* ADMIN ROUTES - Protected */}
        <Route path="/kfmama/*" element={
          <AdminRouteGuard>
            <AdminApp />
          </AdminRouteGuard>
        } />

        {/* CUSTOMER ROUTES - Public */}
        <Route path="/*" element={<CustomerApp />} />

        {/* Redirect old admin paths */}
        <Route path="/admin/*" element={<Navigate to="/" replace />} />

        {/* Admin login page (public access) */}
        <Route path="/login" element={<AdminApp />} />
      </Routes>
    </Router>
  );
}