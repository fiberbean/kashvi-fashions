import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-cyan-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Glass Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/40 shadow-2xl hover:shadow-3xl transition-all duration-500 animate-in fade-in zoom-in-95">
          
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="relative w-16 h-16 mx-auto mb-4 group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl rotate-6 group-hover:rotate-12 transition-transform duration-300 shadow-lg"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl -rotate-6 group-hover:-rotate-12 transition-transform duration-300"></div>
              <div className="relative w-full h-full bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl flex items-center justify-center font-serif font-black text-2xl text-white shadow-xl">
                KF
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-yellow-400 animate-bounce" />
            </div>

            <h2 className="font-serif font-bold text-2xl text-gray-800 tracking-tight mb-1">
              Kashvi Command OS
            </h2>
            <p className="text-xs text-gray-500 mt-1.5 font-medium">
              Staff Access & Duty Gateway
            </p>
            
            {/* Welcome Badge */}
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100/80 border border-purple-200/50">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-purple-700">Welcome Back!</span>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50/90 backdrop-blur-sm border border-red-200/50 flex items-start gap-3 text-red-700 text-xs font-semibold animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Employee ID Input */}
            <div className="group">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 block mb-2">
                Employee User ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. ABHI"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200/50 bg-white/50 backdrop-blur-sm text-sm font-semibold text-gray-800 uppercase tracking-wider outline-none focus:border-purple-500 focus:bg-white/80 focus:shadow-lg transition-all duration-300 placeholder:text-gray-400"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-500 opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
              </div>
            </div>

            {/* PIN Input */}
            <div className="group">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 block mb-2">
                Duty PIN (4-6 Digits)
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200/50 bg-white/50 backdrop-blur-sm text-sm font-semibold text-gray-800 outline-none focus:border-purple-500 focus:bg-white/80 focus:shadow-lg transition-all duration-300 placeholder:text-gray-400 font-mono pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 cursor-pointer transition-colors p-1"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="relative w-full mt-3 py-3.5 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-600 to-purple-600 opacity-0 group-hover:opacity-20 blur-md transition-opacity"></span>
              <Lock className="w-4 h-4 text-yellow-300 relative z-10" />
              <span className="relative z-10">
                {submitting ? 'Authenticating...' : 'Sign In to Shift'}
              </span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-gray-200/50 text-center text-[10px] text-gray-500 flex items-center justify-center gap-2 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
            <span>Encrypted duty session access • Secure & Protected</span>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-gray-400 font-medium">
            Authorized personnel only • Protected by Kashvi Command OS
          </p>
        </div>
      </div>
    </div>
  );
}