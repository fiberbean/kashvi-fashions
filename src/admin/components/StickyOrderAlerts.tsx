import React from 'react';
import { X, CheckCheck, Package, ShoppingBag, Radio, Sparkles } from 'lucide-react';
import { OrderRecord } from '../types';

interface StickyOrderAlertsProps {
  notifications: OrderRecord[];
  onDismiss: (id: string) => void;
}

export default function StickyOrderAlerts({ notifications, onDismiss }: StickyOrderAlertsProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 sm:right-6 z-50 flex flex-col gap-3.5 max-w-md w-full pointer-events-none select-none font-sans">
      {notifications.map((order, idx) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const firstItem = items[0] || null;
        const totalItemsCount = items.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);

        return (
          <div
            key={order.id + idx}
            className="pointer-events-auto relative bg-[rgba(16,22,40,0.96)] backdrop-blur-2xl text-white rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(255,107,107,0.25)] border border-[#ff6b6b]/50 animate-in slide-in-from-right duration-300 flex flex-col gap-3 overflow-hidden group"
          >
            {/* Ambient Animated Top Neon Glow Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#ff6b6b] via-[#6d4aff] to-[#00d9ff]" />

            {/* Header: Status & Dismiss */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6b6b] opacity-90" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff6b6b]" />
                </span>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#ff6b6b] flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" /> LIVE ORDER DETECTED
                </span>
                <span className="text-[9.5px] font-mono text-[#00d9ff] bg-[#00d9ff]/10 border border-[#00d9ff]/30 px-2 py-0.5 rounded-md font-bold">
                  {order.id}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(order.id)}
                className="p-1 rounded-xl bg-white/5 hover:bg-white/15 text-[#8b9bb4] hover:text-white transition-colors cursor-pointer"
                title="Dismiss Alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Core Body: Product Highlights */}
            <div className="bg-[#0a0e17]/80 rounded-2xl p-3 border border-white/10 shadow-inner">
              {firstItem ? (
                <div className="flex gap-3 items-center">
                  {firstItem.image ? (
                    <img
                      src={firstItem.image}
                      alt={firstItem.name}
                      className="w-14 h-16 object-cover object-top rounded-xl border border-white/20 shrink-0 bg-[#151c33] shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-16 rounded-xl bg-[#151c33] border border-white/10 flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-[#00d9ff]" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-xs text-white truncate leading-snug group-hover:text-[#00d9ff] transition-colors">
                      {firstItem.name}
                    </h4>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="bg-[#ff6b6b]/20 text-[#ff6b6b] border border-[#ff6b6b]/40 text-[9.5px] font-mono font-black px-2 py-0.5 rounded-lg shadow-xs">
                        QTY: {firstItem.qty || 1}
                      </span>

                      {firstItem.size && (
                        <span className="bg-white/10 text-slate-200 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-lg border border-white/15">
                          Size: {firstItem.size}
                        </span>
                      )}

                      {firstItem.color && (
                        <span className="bg-[#6d4aff]/20 text-[#00d9ff] text-[9.5px] font-medium capitalize px-2 py-0.5 rounded-lg border border-[#6d4aff]/40">
                          {firstItem.color}
                        </span>
                      )}
                    </div>

                    {items.length > 1 && (
                      <div className="text-[10px] text-[#ffa500] font-mono mt-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>+ {items.length - 1} other item{items.length - 1 > 1 ? 's' : ''} in cart</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 py-1 text-[#8b9bb4] text-xs">
                  <ShoppingBag className="w-4 h-4 text-[#00d9ff]" />
                  <span>Direct cart checkout confirmed ({totalItemsCount || 1} Item)</span>
                </div>
              )}
            </div>

            {/* Customer & Location Footer */}
            <div className="flex items-center justify-between text-[11px] px-1">
              <div>
                <span className="font-bold text-white">{order.customer_name || 'Direct Customer'}</span>
                <span className="text-[10px] text-[#8b9bb4] font-mono ml-1.5">({order.customer_phone})</span>
              </div>
              <span className="text-xs font-mono font-extrabold text-[#00ff9d]">
                ₹{Number(order.total_amount).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-[10px] font-mono text-[#ffa500] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffa500] animate-ping" />
                Dispatch Required
              </span>

              <button
                type="button"
                onClick={() => onDismiss(order.id)}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#00ff9d] hover:text-neutral-950 text-white text-[10.5px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_4px_15px_rgba(109,74,255,0.4)] flex items-center gap-1.5 active:scale-95 border border-white/10"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Acknowledge</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}