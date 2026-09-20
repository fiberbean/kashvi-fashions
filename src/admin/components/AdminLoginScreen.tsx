import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-[#f0f4f2] flex items-center justify-center p-4 selection:bg-[#0b3b2c] selection:text-white font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl p-7 border border-[#dce6e1] shadow-[6px_6px_24px_rgba(11,59,44,0.06),-4px_-4px_16px_rgba(255,255,255,0.9)] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[#0b3b2c] text-[#e5c07b] flex items-center justify-center font-serif font-black text-lg mx-auto shadow-md mb-2.5">
            KF
          </div>
          <h2 className="font-serif font-bold text-xl text-[#0b3b2c] tracking-tight">
            Kashvi Command OS
          </h2>
          <p className="text-[11px] text-[#4d6960] mt-0.5">Staff Access & Duty Gateway</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-[11px] font-semibold">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#4d6960] block mb-1">
              Employee User ID
            </label>
            <input
              type="text"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. KF_ADM01"
              className="w-full px-3.5 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] uppercase tracking-wider outline-none focus:border-[#0b3b2c] focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#4d6960] block mb-1">
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
                className="w-full px-3.5 py-2 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none focus:border-[#0b3b2c] focus:bg-white transition-colors pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#809c93] hover:text-[#0b3b2c] cursor-pointer"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 rounded-full bg-[#0b3b2c] hover:bg-[#06231a] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-[#0b3b2c]/20 transition-all cursor-pointer active:scale-98 disabled:opacity-60"
          >
            <Lock className="w-3.5 h-3.5 text-[#e5c07b]" />
            <span>{submitting ? 'Authenticating...' : 'Sign In to Shift'}</span>
          </button>
        </form>

        <div className="mt-5 pt-3.5 border-t border-[#edf2ef] text-center text-[9.5px] text-[#809c93] flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Encrypted duty session access</span>
        </div>
      </div>
    </div>
  );
}