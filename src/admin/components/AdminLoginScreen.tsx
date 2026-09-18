import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

interface AdminLoginScreenProps {
  onLoginSuccess: () => void;
}

export default function AdminLoginScreen({ onLoginSuccess }: AdminLoginScreenProps) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const VALID_USER = 'kashviadmin';
  const VALID_PASS = 'Kashvi@2026';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    setTimeout(() => {
      if (loginId.trim() === VALID_USER && password.trim() === VALID_PASS) {
        sessionStorage.setItem('kfmama_auth_session', 'true');
        sessionStorage.setItem('kfmama_auth_timestamp', Date.now().toString());
        onLoginSuccess();
      } else {
        setErrorMsg('Invalid Admin ID or Password. Access denied.');
      }
      setSubmitting(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#f0f4f2] flex items-center justify-center p-4 selection:bg-[#0b3b2c] selection:text-white">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#dce6e1] shadow-[6px_6px_24px_rgba(11,59,44,0.06),-4px_-4px_16px_rgba(255,255,255,0.9)] animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-[#0b3b2c] text-[#e5c07b] flex items-center justify-center font-serif font-black text-xl mx-auto shadow-md mb-3">
            KF
          </div>
          <h2 className="font-serif font-bold text-2xl text-[#0b3b2c] tracking-tight">
            Kashvi Command OS
          </h2>
          <p className="text-xs text-[#4d6960] mt-1">Authorized administrative access gateway</p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-semibold animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#4d6960] block mb-1.5">
              Admin Login ID
            </label>
            <input
              type="text"
              required
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="Enter Admin ID"
              className="w-full px-4 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none focus:border-[#0b3b2c] focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#4d6960] block mb-1.5">
              Secure Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-[#dce6e1] bg-[#f8faf9] text-xs font-semibold text-[#0c2b22] outline-none focus:border-[#0b3b2c] focus:bg-white transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#809c93] hover:text-[#0b3b2c] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 rounded-full bg-[#0b3b2c] hover:bg-[#06231a] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-[#0b3b2c]/20 transition-all cursor-pointer active:scale-98 disabled:opacity-60"
          >
            <Lock className="w-3.5 h-3.5 text-[#e5c07b]" />
            <span>{submitting ? 'Verifying Credentials...' : 'Unlock Command Deck'}</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#edf2ef] text-center text-[10px] text-[#809c93] flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Auto-locks on inactivity & page closure</span>
        </div>
      </div>
    </div>
  );
}