import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Phone, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function CompleteProfileModal() {
  const { user, customer, refreshCustomer } = useAuth();
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // యూజర్ లాగిన్ అయి ఉండి, మొబైల్ నంబర్ లేనప్పుడు మాత్రమే ఈ మోడల్ ఓపెన్ అవుతుంది
  const hasMobile = Boolean(
    customer?.mobile?.trim() || user?.user_metadata?.whatsapp_number?.trim()
  );

  if (!user || hasMobile) return null;

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

      await refreshCustomer();
    } catch (err: any) {
      console.error('Error saving WhatsApp number:', err);
      setErrorMsg(err.message || 'Failed to save WhatsApp number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 cursor-default">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
            <Phone className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#0b3b2c]">
            <Sparkles className="w-3.5 h-3.5 text-[#b38728]" />
            <span>Almost Done!</span>
          </div>
          <h3 className="text-lg font-serif font-bold text-neutral-950">
            Add Your WhatsApp Number
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
            You signed in with Google. Please link your WhatsApp mobile number to receive live dispatch & tracking updates.
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
            <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
              WhatsApp Mobile Number *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-neutral-400">
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
                className="w-full pl-12 pr-3 py-2.5 text-sm font-semibold tracking-wider rounded-xl border border-neutral-200 focus:outline-hidden focus:border-neutral-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || whatsappNumber.length !== 10}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#0b3b2c] to-[#14532d] text-white text-xs font-bold uppercase tracking-wider hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
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
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}