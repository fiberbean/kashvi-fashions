import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Phone, ArrowRight, Loader2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function CompleteProfileModal() {
  const { user, customer, refreshCustomer } = useAuth() as any;
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  // యూజర్ లాగిన్ అయి ఉండి, మొబైల్ నంబర్ లేనప్పుడు మాత్రమే ఈ మోడల్ ఓపెన్ అవుతుంది
  const hasMobile = Boolean(
    customer?.mobile?.trim() || user?.user_metadata?.whatsapp_number?.trim()
  );

  if (!user || (hasMobile && !isSavedSuccess)) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanMobile = whatsappNumber.trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp number');
      return;
    }

    setLoading(true);
    try {
      // 1. Supabase Auth యూజర్ మెటాడేటా అప్‌డేట్
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          whatsapp_number: cleanMobile,
        },
      });
      if (authError) throw authError;

      // 2. public.customers టేబుల్ రికార్డు అప్‌డేట్
      const { error: dbError } = await supabase
        .from('customers')
        .update({
          mobile: cleanMobile,
        })
        .eq('auth_user_id', user.id);

      if (dbError) throw dbError;

      // 3. కన్ఫర్మేషన్ స్టేట్ ట్రిగ్గర్
      setIsSavedSuccess(true);
      if (typeof refreshCustomer === 'function') {
        await refreshCustomer();
      }

      // 1.5 సెకన్ల తర్వాత ఆటో-క్లోజ్
      setTimeout(() => {
        setIsSavedSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error('Error saving WhatsApp number:', err);
      setErrorMsg(err.message || 'Failed to save WhatsApp number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200 cursor-default">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(255,182,193,0.5)] overflow-hidden border border-pink-100/70 p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-200">
        {isSavedSuccess ? (
          <div className="py-6 text-center space-y-3 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-stone-900">
                WhatsApp Linked Successfully!
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                Your profile is now verified. Order receipts & courier dispatch alerts will be sent to{' '}
                <strong className="text-stone-800">+91 {whatsappNumber}</strong>.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#ff2d85] flex items-center justify-center mx-auto border border-pink-200/60 shadow-xs">
                <Phone className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#ff2d85]">
                <Sparkles className="w-3.5 h-3.5 text-[#ff2d85]" />
                <span>Almost Done!</span>
              </div>
              <h3 className="text-lg font-bold text-stone-950">
                Add Your WhatsApp Number
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
                You signed in with Google. Please link your WhatsApp mobile number to receive instant dispatch & tracking updates.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* WhatsApp Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1.5">
                  WhatsApp Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-stone-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    autoFocus
                    maxLength={10}
                    placeholder="98765 43210"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 pr-3 py-2.5 text-sm font-semibold tracking-wider rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#ff2d85] focus:ring-2 focus:ring-pink-100 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || whatsappNumber.length !== 10}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#ff2d85] to-[#ff639f] text-white text-xs font-bold uppercase tracking-wider hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_14px_rgba(255,45,133,0.3)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Save & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}