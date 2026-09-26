import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  const { user, customer, refreshCustomer } = useAuth() as any;

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Profile Form States
  const [name, setName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');

  // Password Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(customer?.name || user?.user_metadata?.name || '');
      setWhatsappNumber(customer?.mobile || user?.user_metadata?.whatsapp_number || '');
      setEmail(customer?.email || user?.email || '');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, customer, user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanMobile = whatsappNumber.trim().replace(/\D/g, '');
    if (cleanMobile && cleanMobile.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp number');
      return;
    }

    setLoading(true);
    try {
      if (!user) throw new Error('No authenticated user session');

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: name.trim(),
          whatsapp_number: cleanMobile,
        },
      });
      if (authError) throw authError;

      const { error: dbError } = await supabase
        .from('customers')
        .update({
          name: name.trim(),
          mobile: cleanMobile,
        })
        .eq('auth_user_id', user.id);

      if (dbError) throw dbError;

      if (typeof refreshCustomer === 'function') {
        await refreshCustomer();
      }
      setSuccessMsg('Profile updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Password must contain at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setSuccessMsg('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(255,182,193,0.35)] overflow-hidden border border-pink-100 cursor-default my-auto animate-in zoom-in-95 duration-200 p-6 space-y-4 text-stone-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-pink-50 text-[#ff2d85] flex items-center justify-center shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 leading-tight">
                Profile Settings
              </h2>
              <p className="text-[10px] text-stone-400 font-medium">
                Manage personal credentials and security
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-stone-100 hover:bg-pink-50 text-stone-500 hover:text-[#ff2d85] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-stone-100 border border-stone-200/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Personal Details
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'password'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Security & Password
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: Personal Details */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="space-y-3.5 animate-in fade-in duration-200">
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:outline-hidden focus:border-[#ff2d85]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                Email Address (Primary Login ID)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="email"
                  readOnly
                  disabled
                  value={email}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-100 text-stone-500 cursor-not-allowed font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-stone-700">
                  WhatsApp Mobile Number
                </label>
                <span className="text-[10px] text-emerald-600 font-bold">For Order Alerts</span>
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  maxLength={10}
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit Mobile Number"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:outline-hidden focus:border-[#ff2d85] font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-[#ff2d85] to-[#ff639f] hover:brightness-105 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Changes</span>}
            </button>
          </form>
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === 'password' && (
          <form onSubmit={handleUpdatePassword} className="space-y-3.5 animate-in fade-in duration-200">
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:outline-hidden focus:border-[#ff2d85]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:outline-hidden focus:border-[#ff2d85]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-[#ff2d85] to-[#ff639f] hover:brightness-105 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
            </button>

            <div className="flex items-center justify-center gap-1 text-[10px] text-stone-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
              <span>Password updates will securely refresh your active sessions</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}