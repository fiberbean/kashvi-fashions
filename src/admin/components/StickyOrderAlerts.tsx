import React from 'react';
import { X, CheckCheck, Package, ShoppingBag, MapPin } from 'lucide-react';
import { OrderRecord } from '../types';

interface StickyOrderAlertsProps {
  notifications: OrderRecord[];
  onDismiss: (id: string) => void;
}

export default function StickyOrderAlerts({ notifications, onDismiss }: StickyOrderAlertsProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 sm:right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none select-none font-sans">
      {notifications.map((order, idx) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const firstItem = items[0] || null;
        const totalItemsCount = items.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);

        return (
          <div
            key={order.id + idx}
            className="pointer-events-auto bg-[#0b3b2c] text-white rounded-2xl p-4 shadow-[0_16px_36px_rgba(0,0,0,0.35)] border-2 border-[#ff4d6d] animate-in slide-in-from-right duration-300 relative flex flex-col gap-2.5"
          >
            {/* Header: Status & Dismiss */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4d6d] opacity-90"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff4d6d]"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#e5c07b]">
                  NEW PRODUCT ORDERED!
                </span>
                <span className="text-[9.5px] font-mono text-neutral-300 bg-white/10 px-2 py-0.5 rounded-md">
                  {order.id}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(order.id)}
                className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Dismiss Alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Core Body: Product Highlights (Focus on Items) */}
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
              {firstItem ? (
                <div className="flex gap-3 items-center">
                  {firstItem.image ? (
                    <img
                      src={firstItem.image}
                      alt={firstItem.name}
                      className="w-13 h-16 object-cover object-top rounded-lg border border-white/20 shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-13 h-16 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-[#e5c07b]" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-white truncate leading-snug">
                      {firstItem.name}
                    </h4>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="bg-[#ff4d6d] text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                        QTY: {firstItem.qty || 1}
                      </span>

                      {firstItem.size && (
                        <span className="bg-white/15 text-neutral-200 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          Size: {firstItem.size}
                        </span>
                      )}

                      {firstItem.color && (
                        <span className="bg-white/15 text-neutral-200 text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded-md">
                          {firstItem.color}
                        </span>
                      )}
                    </div>

                    {items.length > 1 && (
                      <div className="text-[10px] text-[#e5c07b] font-medium mt-1">
                        + {items.length - 1} other item{items.length - 1 > 1 ? 's' : ''} in this bag
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 py-1 text-neutral-300 text-xs">
                  <ShoppingBag className="w-4 h-4 text-[#e5c07b]" />
                  <span>Direct checkout order received ({totalItemsCount || 1} Product)</span>
                </div>
              )}
            </div>

            {/* Customer & Location Footer */}
            <div className="flex items-center justify-between text-[11px] text-neutral-300">
              <div>
                <span className="font-bold text-white">{order.customer_name || 'Customer'}</span>
                <span className="text-[10px] text-neutral-400 font-mono ml-1.5">({order.customer_phone})</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                ₹{Number(order.total_amount).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                Action Required (Dispatch Team)
              </span>

              <button
                type="button"
                onClick={() => onDismiss(order.id)}
                className="px-3 py-1 rounded-full bg-[#ff4d6d] hover:bg-[#e03a5a] text-white text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1 active:scale-95"
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