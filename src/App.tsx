import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerApp from './CustomerApp';
import AdminApp from "./AdminApp";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* కేవలం /kfmama ద్వారా మాత్రమే AdminApp యాక్సెస్ అవుతుంది */}
        <Route path="/kfmama/*" element={<AdminApp />} />

        {/* సాధారణ కస్టమర్ స్టోర్‌ఫ్రంట్ రూట్లు */}
        <Route path="/*" element={<CustomerApp />} />

        {/* ఇతర ఏవైనా తప్పుడు అడ్మిన్ పాత్‌లు వస్తే హోమ్‌పేజీకి రీడైరెక్ట్ అవుతాయి */}
        <Route path="/admin/*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}