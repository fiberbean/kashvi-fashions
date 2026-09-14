"use client";

import React, { useState } from "react";
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

type AuthView = "password_login" | "otp_login" | "signup" | "signup_otp_verify" | "forgot_password";

export default function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen } = useAuth();
  const [view, setView] = useState<AuthView>("password_login");

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Status States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const resetFlow = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setOtpSent(false);
    setOtp("");
  };

  const handleClose = () => {
    setIsAuthModalOpen(false);
    resetFlow();
  };

  // 1. Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      handleClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Sign In OTP Request & Verification
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
      setOtpSent(true);
      setSuccessMsg("A 6-digit OTP has been sent to your email.");
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "email",
      });
      if (error) throw error;
      handleClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Create Account (Sign Up with metadata) -> Then trigger OTP verification
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
          },
        },
      });
      if (signUpError) throw signUpError;

      // Sync to customers table if user created
      if (data.user) {
        await supabase.from("customers").upsert({
          id: data.user.id,
          name: fullName.trim(),
          email: email.trim(),
          mobile: phone.trim(),
          auth_user_id: data.user.id,
          created_at: new Date().toISOString(),
        });
      }

      setView("signup_otp_verify");
      setSuccessMsg("Account created! Please enter the 6-digit verification code sent to your email.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  // Verify Sign Up OTP
  const handleVerifySignUpOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "signup",
      });
      if (error) throw error;
      setSuccessMsg("Email verified successfully! Welcome to Kashvi.");
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/account/reset-password`
            : undefined,
      });
      if (error) throw error;
      setSuccessMsg("Password reset link has been dispatched to your email address.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  // 5. Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      const redirectUrl = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Google authentication failed.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={handleClose} />

      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-[#ff4d6d]/20 grid grid-cols-1 md:grid-cols-12 items-stretch animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer z-30"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT COLUMN: Visual Editorial Banner (Desktop) */}
        <div className="hidden md:flex md:col-span-5 relative bg-neutral-950 flex-col justify-between p-8 overflow-hidden text-white">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1000&q=80"
            alt="Kashvi Couture Editorial"
            className="absolute inset-0 w-full h-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70" />

          <div className="relative z-10">
            <span className="text-2xl font-serif font-bold tracking-[0.25em] text-white block">
              KASHVI
            </span>
            <span className="text-[10px] uppercase tracking-[0.35em] text-[#ff4d6d] font-semibold mt-1 block">
              Haute Couture
            </span>
          </div>

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-[#ff4d6d]/25 border border-[#ff4d6d]/40 text-[#ff4d6d] px-3 py-1.5 rounded-full backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personalized Atelier</span>
            </div>
            <h4 className="text-xl font-serif font-bold leading-snug">
              Curated Designer Drops & Express Bag Access.
            </h4>
            <div className="pt-3 border-t border-white/20 flex items-center gap-2 text-xs text-neutral-300">
              <ShieldCheck className="w-4 h-4 text-[#ff4d6d]" />
              <span>100% Authentic Handcrafted Fashion</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Views */}
        <div className="col-span-1 md:col-span-7 p-7 sm:p-9 flex flex-col justify-center">
          
          {/* Top Switcher */}
          {(view === "password_login" || view === "otp_login" || view === "signup") && (
            <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#fff0f3] border border-[#ff4d6d]/20 mb-5">
              <button
                type="button"
                onClick={() => {
                  setView("password_login");
                  resetFlow();
                }}
                className={`py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all duration-200 cursor-pointer ${
                  view === "password_login" || view === "otp_login"
                    ? "bg-[#ff4d6d] text-white shadow-sm shadow-[#ff4d6d]/30"
                    : "text-neutral-600 hover:text-[#ff4d6d]"
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setView("signup");
                  resetFlow();
                }}
                className={`py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all duration-200 cursor-pointer ${
                  view === "signup"
                    ? "bg-[#ff4d6d] text-white shadow-sm shadow-[#ff4d6d]/30"
                    : "text-neutral-600 hover:text-[#ff4d6d]"
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Forgot Password Header */}
          {view === "forgot_password" && (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => {
                  setView("password_login");
                  resetFlow();
                }}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-[#ff4d6d] transition-colors mb-2.5 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Sign In</span>
              </button>
              <h3 className="text-2xl font-serif font-bold text-neutral-900">Reset Your Password</h3>
              <p className="text-sm text-neutral-500 mt-1">
                Enter your registered email address to receive password recovery instructions.
              </p>
            </div>
          )}

          {/* Sign Up OTP Verification Header */}
          {view === "signup_otp_verify" && (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => {
                  setView("signup");
                  resetFlow();
                }}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-[#ff4d6d] transition-colors mb-2.5 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <h3 className="text-2xl font-serif font-bold text-neutral-900">Enter OTP</h3>
              <p className="text-sm text-neutral-500 mt-1">
                Please enter the 6-digit code sent to <span className="font-semibold text-neutral-900">{email}</span>
              </p>
            </div>
          )}

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google Button */}
          {(view === "password_login" || view === "otp_login" || view === "signup") && (
            <div className="mb-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-xl border border-neutral-200 hover:border-[#ff4d6d]/50 bg-white hover:bg-[#fff0f3]/40 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] text-sm font-semibold text-neutral-700 hover:text-neutral-950 shadow-2xs"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span className="tracking-wide">Continue with Google</span>
              </button>

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <span className="relative bg-white px-3 text-xs uppercase font-bold tracking-wider text-neutral-400">
                  or with email
                </span>
              </div>
            </div>
          )}

          {/* VIEW A: Password Login */}
          {view === "password_login" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4 text-sm">
              <div>
                <label className="block text-neutral-700 mb-1.5 font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 mb-1.5 font-medium">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setView("otp_login");
                      resetFlow();
                    }}
                    className="text-xs font-semibold text-[#ff4d6d] hover:underline cursor-pointer"
                  >
                    Login with OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setView("forgot_password");
                      resetFlow();
                    }}
                    className="text-xs font-semibold text-neutral-500 hover:text-[#ff4d6d] cursor-pointer transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-xl bg-neutral-950 hover:bg-[#ff4d6d] text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Sign In with Password</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {/* VIEW B: OTP Login */}
          {view === "otp_login" && (
            <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4 text-sm">
              <div>
                <label className="block text-neutral-700 mb-1.5 font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    disabled={otpSent}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none transition-colors disabled:bg-neutral-50 disabled:text-neutral-400 text-sm"
                  />
                </div>

                {!otpSent && (
                  <div className="mt-2.5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setView("password_login");
                        resetFlow();
                      }}
                      className="text-xs font-semibold text-[#ff4d6d] hover:underline cursor-pointer"
                    >
                      Login with Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setView("forgot_password");
                        resetFlow();
                      }}
                      className="text-xs font-semibold text-neutral-500 hover:text-[#ff4d6d] cursor-pointer transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>

              {otpSent && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-neutral-700 font-medium">Enter 6-Digit OTP</label>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-xs font-semibold text-[#ff4d6d] hover:underline cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none tracking-widest text-center font-bold text-base transition-colors"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-xl bg-neutral-950 hover:bg-[#ff4d6d] text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{otpSent ? "Verify OTP" : "Send OTP"}</span>}
              </button>
            </form>
          )}

          {/* VIEW C: Create Account */}
          {view === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-3 text-sm">
              <div>
                <label className="block text-neutral-700 mb-1 font-medium">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 mb-1 font-medium">WhatsApp Mobile Number</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1 text-neutral-600 font-semibold border-r border-neutral-200 pr-2">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit number for order updates"
                    className="w-full pl-21 pr-3.5 py-2.5 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 mb-1 font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 mb-1 font-medium">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-xl bg-neutral-950 hover:bg-[#ff4d6d] text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
              </button>
            </form>
          )}

          {/* VIEW E: Sign Up OTP Verification Input */}
          {view === "signup_otp_verify" && (
            <form onSubmit={handleVerifySignUpOtp} className="space-y-4 text-sm mt-2">
              <div>
                <label className="block text-neutral-700 mb-1.5 font-medium">Enter 6-Digit OTP</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none tracking-widest text-center font-bold text-base transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-neutral-950 hover:bg-[#ff4d6d] text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify OTP</span>}
              </button>
            </form>
          )}

          {/* VIEW D: Forgot Password */}
          {view === "forgot_password" && (
            <form onSubmit={handleForgotPassword} className="space-y-4 text-sm mt-2">
              <div>
                <label className="block text-neutral-700 mb-1.5 font-medium">Your Registered Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-neutral-200 focus:border-[#ff4d6d] focus:outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-neutral-950 hover:bg-[#ff4d6d] text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Reset Instructions</span>}
              </button>
            </form>
          )}

          <p className="text-[11px] text-center text-neutral-400 mt-4">
            Safe & Encrypted 256-Bit SSL Checkout Protection
          </p>
        </div>
      </div>
    </div>
  );
}