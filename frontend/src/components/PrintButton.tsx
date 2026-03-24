'use client';

import React, { useState } from 'react';
import { printTicket, TicketData } from '../lib/print';

interface PrintButtonProps {
  ticket: TicketData;
  label?: string;
  className?: string;
  icon?: string;
}

export default function PrintButton({ ticket, label = 'Imprimir', className = '', icon = '🖨️' }: PrintButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [printing, setPrinting] = useState(false);

  const handlePrint = async (bluetooth: boolean) => {
    setShowMenu(false);
    setPrinting(true);
    try {
      await printTicket(ticket, bluetooth);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={printing}
        className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${className}`}
      >
        <span>{icon}</span>
        {printing ? 'Imprimiendo...' : label}
        <span className="text-[10px] opacity-60">▾</span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 bottom-full mb-2 z-50 bg-[#1e293b] border border-white/10 rounded-2xl p-2 shadow-2xl min-w-[200px] animate-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={() => handlePrint(false)}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-3 text-sm font-bold text-white"
            >
              <span className="text-xl">🖥️</span>
              <div>
                <p className="font-black uppercase text-[11px]">Impresora Normal</p>
                <p className="text-[9px] text-gray-500">Usa el diálogo del navegador</p>
              </div>
            </button>
            <button
              onClick={() => handlePrint(true)}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-blue-500/10 transition-colors flex items-center gap-3 text-sm font-bold text-white border border-transparent hover:border-blue-500/30"
            >
              <span className="text-xl">📱</span>
              <div>
                <p className="font-black uppercase text-[11px] text-blue-400">Impresora Bluetooth</p>
                <p className="text-[9px] text-gray-500">ESC/POS térmica vía BT</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
