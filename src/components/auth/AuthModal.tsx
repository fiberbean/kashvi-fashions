import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  KeyRound,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type AuthMode = 'login_password' | 'login_otp' | 'forgot_password' | 'signup';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login_password');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  if (!isAuthModalOpen) return null;

  const resetMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const navigateTo = (nextMode: AuthMode) => {
    resetMessages();
    setMode(nextMode);
  };

  // 1. Google OAuth Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      resetMessages();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Login failed');
    } finally {
      setLoading(false);
    }
  };

  // 2. Email + Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      resetMessages();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      closeAuthModal();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // 3. Send Email OTP for Login
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address');
      return;
    }
    try {
      setLoading(true);
      resetMessages();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
      setOtpSent(true);
      setSuccessMsg(`A 6-digit login code has been sent to ${email}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send OTP code. Please check if this email is registered.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Verify Email OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      resetMessages();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode.trim(),
        type: 'email',
      });
      if (error) throw error;
      closeAuthModal();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP code');
    } finally {
      setLoading(false);
    }
  };

  // 5. Forgot Password (Password Reset Link)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address');
      return;
    }
    try {
      setLoading(true);
      resetMessages();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      if (error) throw error;
      setSuccessMsg(`Password reset instructions have been sent to ${email}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  // 6. Signup with WhatsApp Mobile Number
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = whatsappNumber.trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp mobile number');
      return;
    }

    try {
      setLoading(true);
      resetMessages();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: name.trim(),
            whatsapp_number: cleanMobile,
          },
        },
      });
      if (error) throw error;

      if (data.session) {
        closeAuthModal();
      } else {
        setSuccessMsg('Account created! Please check your email to verify your account.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={closeAuthModal}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 cursor-default animate-in zoom-in-95 duration-200 p-6 sm:p-7 my-auto"
      >
        {/* Modal Top Header with Back Navigation */}
        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            {mode !== 'login_password' && (
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  navigateTo('login_password');
                }}
                className="p-1.5 -ml-1.5 rounded-full hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                title="Back to Login"
                aria-label="Back to Login"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#0b3b2c]">
                <Sparkles className="w-3.5 h-3.5 text-[#b38728]" />
                <span>Kashvi Customer Portal</span>
              </div>
              <h3 className="text-lg font-serif font-bold text-neutral-900 mt-0.5">
                {mode === 'signup'
                  ? 'Create an Account'
                  : mode === 'login_otp'
                  ? 'Sign In with OTP'
                  : mode === 'forgot_password'
                  ? 'Reset Password'
                  : 'Welcome Back'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={closeAuthModal}
            className="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-900 text-neutral-500 hover:text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alert Notifications */}
        {errorMsg && (
          <div className="mt-3.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-3.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google OAuth (Visible on Main Login & Signup) */}
        {(mode === 'login_password' || mode === 'signup') && (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-2xl border border-neutral-300 hover:border-neutral-400 bg-white text-xs font-bold text-neutral-700 flex items-center justify-center gap-2.5 shadow-2xs hover:bg-neutral-50 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2 text-neutral-400 font-bold tracking-wider">
                  Or with Email
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 1. SCREEN: LOGIN WITH PASSWORD */}
        {mode === 'login_password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-3.5 mt-2">
            <div>
              <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:border-neutral-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-neutral-700">Password</label>
                <button
                  type="button"
                  onClick={() => navigateTo('forgot_password')}
                  className="text-[11px] font-semibold text-[#ff4d6d] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:border-neutral-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-2xl bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
            </button>

            {/* Separate Mode Switchers */}
            <div className="pt-2.5 flex flex-col gap-2 text-center text-xs border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  navigateTo('login_otp');
                }}
                className="w-full py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-neutral-600" />
                <span>Login with Email OTP</span>
              </button>

              <p className="text-neutral-500 text-[11px]">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigateTo('signup')}
                  className="font-bold text-[#ff4d6d] hover:underline cursor-pointer"
                >
                  Create Account
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 2. SCREEN: LOGIN WITH EMAIL OTP (SEPARATE) */}
        {mode === 'login_otp' && (
          <div className="space-y-4 mt-2">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Enter your registered email address. We will send a 6-digit one-time password (OTP) directly to your inbox.
                </p>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="name@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:border-neutral-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Login OTP</span>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Code sent to: <strong className="text-neutral-800">{email}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                    }}
                    className="text-[#ff4d6d] font-semibold hover:underline cursor-pointer text-[11px]"
                  >
                    Change Email
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                    Enter 6-Digit OTP Code
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm tracking-widest font-mono font-bold rounded-xl border border-neutral-200 focus:outline-hidden focus:border-neutral-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-[#0b3b2c] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#14532d] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify & Sign In</span>}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-[11px] text-neutral-500 hover:text-neutral-800 underline cursor-pointer"
                  >
                    Didn't receive code? Resend OTP
                  </button>
                </div>
              </form>
            )}

            <div className="pt-2 border-t border-neutral-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  navigateTo('login_password');
                }}
                className="text-xs font-semibold text-neutral-700 hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Password Login</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. SCREEN: FORGOT PASSWORD (SEPARATE) */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} className="space-y-4 mt-2">
            <p className="text-xs text-neutral-500 leading-relaxed">
              Enter your email address and we'll send you a link to reset your account password.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:border-neutral-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Reset Instructions</span>}
            </button>

            <div className="pt-2 border-t border-neutral-100 text-center">
              <button
                type="button"
                onClick={() => navigateTo('login_password')}
                className="text-xs font-semibold text-neutral-700 hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* 4. SCREEN: SIGNUP (WITH WHATSAPP MOBILE NUMBER) */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-3 mt-2">
            <div>
              <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                Full Name *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Abhilash"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:border-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                Email Address (For Invoices & Account) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:border-neutral-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-neutral-700">
                  WhatsApp Mobile Number *
                </label>
                <span className="text-[10px] text-emerald-600 font-bold">For Order Updates</span>
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit Mobile Number"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:border-neutral-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                Create Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:border-neutral-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-[#ff4d6d] to-[#e63956] text-white text-xs font-bold uppercase tracking-wider hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#ff4d6d]/30 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center text-xs border-t border-neutral-100">
              <p className="text-neutral-500 text-[11px]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigateTo('login_password')}
                  className="font-bold text-neutral-900 hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}