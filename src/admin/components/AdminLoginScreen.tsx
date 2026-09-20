import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Sparkles, Terminal } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminStaffUser } from '../types';

interface AdminLoginScreenProps {
  onLoginSuccess: (user: AdminStaffUser) => void;
}

export default function AdminLoginScreen({ onLoginSuccess }: AdminLoginScreenProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const { data: staff, error } = await supabase
        .from('admin_staff')
        .select('id, employee_id, full_name, role, is_active, last_login, pin')
        .eq('employee_id', employeeId.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !staff) {
        setErrorMsg('Invalid Employee ID or account inactive.');
        setSubmitting(false);
        return;
      }

      if (staff.pin !== pin.trim()) {
        setErrorMsg('Invalid Security PIN. Access denied.');
        setSubmitting(false);
        return;
      }

      await supabase
        .from('admin_staff')
        .update({ last_login: new Date().toISOString() })
        .eq('id', staff.id);

      completeSession(staff as AdminStaffUser);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg('Login service error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const completeSession = (user: AdminStaffUser) => {
    sessionStorage.setItem('kfmama_auth_session', 'true');
    sessionStorage.setItem('kfmama_auth_user', JSON.stringify(user));
    sessionStorage.setItem('kfmama_auth_timestamp', Date.now().toString());
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      {/* Background Animated Neon Mesh & Floating Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-36 -right-36 w-[450px] h-[450px] bg-[#6d4aff]/25 rounded-full blur-[110px] animate-pulse" />
        <div className="absolute -bottom-36 -left-36 w-[450px] h-[450px] bg-[#00d9ff]/20 rounded-full blur-[110px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#ff6b6b]/15 rounded-full blur-[120px] animate-pulse delay-700" />
        
        {/* Subtle Futuristic Background Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.04]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`, 
            backgroundSize: '32px 32px' 
          }} 
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Floating Glassmorphic Container */}
        <div className="relative bg-[rgba(16,22,40,0.92)] backdrop-blur-2xl rounded-3xl p-7 sm:p-8 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(109,74,255,0.15)] hover:border-[#6d4aff]/40 transition-all duration-500 animate-in fade-in zoom-in-95">
          
          {/* Top Edge Neon Accent Line */}
          <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#00d9ff] to-transparent opacity-80" />

          {/* Logo & Header */}
          <div className="text-center mb-7">
            <div className="relative w-16 h-16 mx-auto mb-4 group">
              {/* Outer Glow Halo */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#6d4aff] to-[#00d9ff] rounded-2xl blur-md opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Rotated Backing Cards */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#667eea] to-[#764ba2] rounded-2xl rotate-6 group-hover:rotate-12 transition-transform duration-300 opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-bl from-[#00d9ff] to-[#6d4aff] rounded-2xl -rotate-6 group-hover:-rotate-12 transition-transform duration-300 opacity-60" />
              
              {/* Main Badge */}
              <div className="relative w-full h-full bg-[#101628] border border-white/20 rounded-2xl flex items-center justify-center font-serif font-black text-2xl text-white shadow-2xl overflow-hidden">
                <span className="bg-gradient-to-r from-white via-slate-100 to-[#00d9ff] bg-clip-text text-transparent">
                  KF
                </span>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              </div>
              <Sparkles className="absolute -top-1.5 -right-1.5 w-5 h-5 text-[#00d9ff] animate-bounce" />
            </div>

            <h2 className="font-serif font-bold text-xl text-white tracking-tight">
              Kashvi Command Deck
            </h2>
            <p className="text-[11px] text-[#8b9bb4] mt-1 font-mono tracking-wide">
              ADMIN CONTROL CENTER
            </p>

            {/* Futuristic Status Badge */}
            <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6d4aff]/15 border border-[#6d4aff]/30 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff9d] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff9d]" />
              </span>
              <span className="text-[10.5px] font-semibold text-[#00d9ff] tracking-wide">
                System Online • Duty Node
              </span>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-2xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 flex items-start gap-2.5 text-[#ff6b6b] text-xs font-semibold backdrop-blur-md animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Employee ID */}
            <div className="group">
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#8b9bb4] block mb-1.5 flex items-center justify-between">
                <span>Employee Identity</span>
                <span className="text-[9px] text-[#00d9ff]/70 group-focus-within:text-[#00d9ff]">SECURE AUTH</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="E.G. ABHI"
                  className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-[#0a0e17]/80 text-sm font-semibold text-white uppercase tracking-wider outline-none transition-all duration-300 placeholder:text-slate-600 focus:border-[#00d9ff] focus:bg-[#0a0e17] focus:shadow-[0_0_20px_rgba(0,217,255,0.25)]"
                />
                <Terminal className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-focus-within:text-[#00d9ff] transition-colors" />
              </div>
            </div>

            {/* PIN Input */}
            <div className="group">
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#8b9bb4] block mb-1.5 flex items-center justify-between">
                <span>Passcode (4-8 Digits)</span>
                <span className="text-[9px] text-slate-500">ENCRYPTED PIN</span>
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-[#0a0e17]/80 text-sm font-semibold text-white tracking-widest outline-none transition-all duration-300 placeholder:text-slate-600 font-mono pr-12 focus:border-[#6d4aff] focus:bg-[#0a0e17] focus:shadow-[0_0_20px_rgba(109,74,255,0.3)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00d9ff] cursor-pointer transition-colors p-1"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="relative w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#6d4aff] hover:from-[#764ba2] hover:to-[#00d9ff] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(109,74,255,0.4)] hover:shadow-[0_10px_35px_rgba(0,217,255,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group cursor-pointer"
            >
              <span className="absolute inset-0 w-full h-full bg-white/15 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Lock className="w-3.5 h-3.5 text-[#00ff9d] relative z-10" />
              <span className="relative z-10">
                {submitting ? 'Authenticating...' : 'Authorize Shift Login'}
              </span>
            </button>
          </form>

          {/* Footer Security Badge */}
          <div className="mt-6 pt-4 border-t border-white/10 text-center text-[10px] text-[#8b9bb4] flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00ff9d]" />
            <span>256-Bit Hardware Encrypted Terminal Access</span>
          </div>
        </div>

        {/* Bottom OS Info */}
        <div className="text-center mt-5">
          <p className="text-[10px] text-[#8b9bb4]/60 font-mono tracking-wider">
            KASHVI FASHIONS COMMAND OS • v2.6 HYPER
          </p>
        </div>
      </div>
    </div>
  );
}