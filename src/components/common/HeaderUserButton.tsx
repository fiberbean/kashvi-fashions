import React from 'react';
import { User } from 'lucide-react';

interface HeaderUserButtonProps {
  isJewellery: boolean;
}

export default function HeaderUserButton({ isJewellery }: HeaderUserButtonProps) {
  return (
    <button
      type="button"
      aria-label="User Account"
      className={`p-2 rounded-full transition-colors text-neutral-700 ${
        isJewellery ? 'hover:text-[#0b3b2c] hover:bg-[#f4f7f5]' : 'hover:text-[#ff4d6d] hover:bg-[#fff0f3]'
      }`}
      onClick={() => alert('Account login modal / profile')}
    >
      <User className="w-5 h-5" />
    </button>
  );
}