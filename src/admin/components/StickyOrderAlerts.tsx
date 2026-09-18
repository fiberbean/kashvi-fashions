import React from 'react';
import { X, CheckCheck } from 'lucide-react';
import { OrderRecord } from '../types';

interface StickyOrderAlertsProps {
  notifications: OrderRecord[];
  onDismiss: (id: string) => void;
}

export default function StickyOrderAlerts({ notifications, onDismiss }: StickyOrderAlertsProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-18 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
      {notifications.map((order, idx) => (
        <div
          key={order.id + idx}
          className="pointer-events-auto bg-[#0b3b2c] text-white rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.28)] border-2 border-[#ff4d6d] animate-in slide-in-from-right duration-300 relative flex flex-col gap-2 font-sans"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4d6d] opacity-90"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff4d6d]"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#e5c07b]">
                NEW ONLINE ORDER!
              </span>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(order.id)}
              className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Close Notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="text-lg font-sans font-bold text-white tracking-tight">
              ₹{Number(order.total_amount).toLocaleString('en-IN')}
            </div>
            <div className="text-xs font-semibold text-neutral-200">
              {order.customer_name || 'Direct Shopper'}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">
              {order.id} • {order.customer_phone}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-0.5">
            <span className="text-[10px] text-amber-300 font-medium">Action Required</span>
            <button
              type="button"
              onClick={() => onDismiss(order.id)}
              className="px-2.5 py-1 rounded-full bg-[#ff4d6d] hover:bg-[#e03a5a] text-white text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" />
              <span>Acknowledge</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}