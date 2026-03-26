'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';

interface Withdrawal {
  id: string;
  user_name: string;
  phone_number: string;
  email: string;
  amount: number;
  method: string;
  details: string;
  status: string;
  created_at: string;
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    setIsMounted(true);
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;
      const data = await api.get('/admin/withdrawals', token);
      if (Array.isArray(data)) {
        setWithdrawals(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const actionText = status === 'APPROVED' ? 'aprobar' : 'rechazar';
    if (!confirm(`¿Seguro que desea ${actionText} este retiro?`)) return;
    
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.post(`/admin/withdrawals/${id}/process`, {
        status,
        admin_notes: adminNotes[id] || ''
      }, token);

      if (data.error) {
        alert(data.error);
      } else {
        alert(`Solicitud de retiro ${status.toLowerCase()} exitosamente.`);
        fetchWithdrawals();
      }
    } catch (err) {
      alert('Error al procesar el retiro.');
    }
  };

  if (!isMounted) return null;

  return (
    <div className="max-w-7xl mx-auto p-10 space-y-10 animate-in fade-in duration-500">
      <header className="flex justify-between items-center bg-[#1e293b] p-8 rounded-3xl border border-blue-500/20 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-blue-400 hover:text-blue-300 text-sm font-bold">← Panel Admin</Link>
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Solicitudes de Retiro</h1>
          <p className="text-gray-400 font-bold mt-1">Gestión de transferencias a jugadores</p>
        </div>
        <div className="h-16 w-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 text-3xl">
          🏧
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 text-gray-500 font-black uppercase tracking-widest animate-pulse">Cargando solicitudes...</div>
      ) : (
        <div className="glass-panel overflow-hidden border-white/5">
          <table className="w-full text-left">
            <thead className="bg-[#1e293b] text-gray-400 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-8 py-6">Jugador</th>
                <th className="px-8 py-6">Monto</th>
                <th className="px-8 py-6">Método / Cuenta</th>
                <th className="px-8 py-6">Notas</th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {withdrawals.map((w) => (
                <tr key={w.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-white font-black uppercase text-sm">{w.user_name}</span>
                      <span className="text-[10px] text-blue-400 font-bold">{w.email}</span>
                      <span className="text-[10px] text-gray-500 font-mono italic">{w.phone_number}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-xl font-black text-white">₡{Number(w.amount).toLocaleString()}</td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-blue-400">{w.method}</span>
                      <span className="text-xs text-gray-300 font-mono mt-1 break-all max-w-xs">{w.details}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <input 
                      type="text" 
                      placeholder="Nota interna..."
                      className="bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50"
                      value={adminNotes[w.id] || ''}
                      onChange={(e) => setAdminNotes(prev => ({ ...prev, [w.id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                       <button
                        onClick={() => handleAction(w.id, 'REJECTED')}
                        className="py-2 px-4 bg-red-500/10 text-red-500 font-black rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all text-[10px]"
                      >
                        RECHAZAR
                      </button>
                      <button
                        onClick={() => handleAction(w.id, 'APPROVED')}
                        className="py-2 px-6 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 transition-all shadow-lg active:scale-95 text-[10px]"
                      >
                        MARCAR PAGADO
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-500 font-bold uppercase italic border-2 border-dashed border-white/5 rounded-3xl m-8">No hay solicitudes de retiro pendientes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
