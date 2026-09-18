import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, KeyRound, UserCheck } from 'lucide-react';
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
      // 1. Check in admin_staff table
      const { data: staff, error } = await supabase
        .from('admin_staff')
        .select('*')
        .eq('employee_id', employeeId.trim())
        .eq('is_active', true)
        .single();

      if (error || !staff) {
        // Fallback for demo / first-run if database table is not synced yet
        if (employeeId.trim().toUpperCase() === 'KF_ADM01' && pin.trim() === '2026') {
          const mockUser: AdminStaffUser = {
            id: 'admin-temp-id',
            employee_id: 'KF_ADM01',
            full_name: 'Kashvi Super Admin',
            role: 'admin',
            pin: '2026',
            is_active: true,
            created_at: new Date().toISOString()
          };
          completeSession(mockUser);
          return;
        }

        setErrorMsg('Invalid Employee ID or account inactive.');
        setSubmitting(false);
        return;
      }

      // 2. Validate PIN
      if (staff.pin !== pin.trim()) {
        setErrorMsg('Invalid Security PIN. Access denied.');
        setSubmitting(false);
        return;
      }

      // 3. Update Last Login Timestamp
      await supabase
        .from('admin_staff')
        .update({ last_login: new Date().toISOString() })
        .eq('id', staff.id);

      completeSession(staff as AdminStaffUser);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg('Login server error. Please try again.');
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
    <div className="min-h-screen bg-[#f0f4f2] flex items-center justify-center p-4 selection:bg-[#0b3b2c] selection:text-white">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#dce6e1] shadow-[6px_6px_24px_rgba(11,59,44,0.06),-4px_-4px_16px_rgba(255,255,255,0.9)] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0b3b2c] text-[#e5c07b] flex items-center justify-center font-serif font-black text-xl mx-auto shadow-md mb-3">
            KF
          </div>
          <h2 className="font-serif font-bold text-2xl text-[#0b3b2c] tracking-tight">
            Kashvi Command OS
          </h2>
          <p className="text-xs text-[#4d6960] mt-1">Staff Access & Duty Dispatch Gateway</p>
        </div>

        {/* Demo Credentials Hint Pills */}
        <div className="mb-5 p-3 rounded-2xl bg-[#f8faf9] border border-[#e2eae6] text-[10.5px] text-[#4d6960] space-y-1">
          <div className="font-bold text-[#0b3b2c] flex items-center gap-1">
            <KeyRound className="w-3 h-3 text-[#c6933a]" /> Available Access Roles:
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="bg-purple-50 border border-purple-200 text-purple-800 px-2 py-0.5 rounded-md font-mono">
              KF_ADM01 / PIN: 2026 (Admin)
            </span>
            <span className="bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-md font-mono">
              KF_MGR01 / PIN: 1234 (Manager)
            </span>
            <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md font-mono">
              KF_OPS01 / PIN: 5678 (Operations)
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#4d6960] block mb-1.5">
              Employee User ID
            </label>
            <input
              type="text"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. KF_ADM01"
              className="w-full px-4 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] uppercase tracking-wider outline-none focus:border-[#0b3b2c] focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#4d6960] block mb-1.5">
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
                className="w-full px-4 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none focus:border-[#0b3b2c] focus:bg-white transition-colors pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#809c93] hover:text-[#0b3b2c] cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 rounded-full bg-[#0b3b2c] hover:bg-[#06231a] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-[#0b3b2c]/20 transition-all cursor-pointer active:scale-98 disabled:opacity-60"
          >
            <Lock className="w-3.5 h-3.5 text-[#e5c07b]" />
            <span>{submitting ? 'Authenticating...' : 'Sign In to Shift'}</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#edf2ef] text-center text-[10px] text-[#809c93] flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Role-based permissions & audit logging</span>
        </div>
      </div>
    </div>
  );
}