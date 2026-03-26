'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import PrintButton from '../../../components/PrintButton';

interface Recharge {
  id: string;
  user_name: string;
  phone_number: string;
  email: string;
  amount: number;
  reference_number: string;
  method_type?: string;
  status: string;
  created_at: string;
}

export default function AdminRechargesPage() {
  const [recharges, setRecharges] = useState<Recharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [approvedReceipts, setApprovedReceipts] = useState<Record<string, any>>({});

  useEffect(() => {
    setIsMounted(true);
    fetchRecharges();
  }, []);

  const fetchRecharges = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;
      const data = await api.get('/wallet/pending', token);
      if (Array.isArray(data)) {
        setRecharges(data);
      } else if (data && data.error) {
        console.error('Recharges Error:', data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (r: Recharge) => {
    if (!confirm(`¿Desea aprobar la recarga de ₡${Number(r.amount).toLocaleString()} para ${r.user_name}?`)) return;
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.post(`/wallet/recharge/${r.id}/approve`, {}, token);
      if (data.error) {
        alert(data.error);
      } else {
        const receiptTicket = {
          title: 'TIEMPOS PRO',
          subtitle: 'Comprobante de Recarga SINPE',
          lines: [
            { label: 'Cliente', value: r.user_name, bold: true },
            { label: 'Email', value: r.email },
            { label: 'Teléfono', value: r.phone_number },
            { label: 'Método', value: r.method_type || 'SINPE' },
            { label: 'Referencia', value: r.reference_number },
            { label: 'Monto Aprobado', value: `₡${Number(r.amount).toLocaleString()}`, bold: true },
            { label: 'Aprobado el', value: new Date().toLocaleString() },
          ],
          footer: 'Recarga aplicada. Tiempos Pro.'
        };
        setApprovedReceipts(prev => ({ ...prev, [r.id]: receiptTicket }));
        alert(`✅ Recarga de ₡${Number(r.amount).toLocaleString()} aprobada exitosamente.`);
        fetchRecharges();
      }
    } catch (err) {
      alert('Error al aprobar recarga.');
    }
  };

  const handleReject = async (r: Recharge) => {
    const note = prompt(`¿Por qué desea rechazar la recarga de ₡${Number(r.amount).toLocaleString()}?`, "Información de comprobante no concuerda");
    if (note === null) return;
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.post(`/wallet/recharge/${r.id}/reject`, { note }, token);
      if (data.error) {
        alert(data.error);
      } else {
        alert(`❌ Recarga de ₡${Number(r.amount).toLocaleString()} rechazada.`);
        fetchRecharges();
      }
    } catch (err) {
      alert('Error al rechazar recarga.');
    }
  };

  if (!isMounted) return null;

  return (
    <div className="max-w-7xl mx-auto p-10 space-y-10 animate-in fade-in duration-500">
      <header className="flex justify-between items-center bg-[#1e293b] p-8 rounded-3xl border border-emerald-500/20 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-emerald-400 hover:text-emerald-300 text-sm font-bold">← Panel Admin</Link>
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Depósitos SINPE Pendientes</h1>
          <p className="text-gray-400 font-bold mt-1">Verifica y aprueba las recargas de los jugadores</p>
        </div>
        <div className="h-16 w-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 text-3xl">
          💰
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Cargando depósitos...</div>
      ) : (
        <div className="glass-panel overflow-hidden border-white/5">
          <table className="w-full text-left">
            <thead className="bg-[#1e293b] text-gray-400 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-8 py-6">Información Jugador</th>
                <th className="px-8 py-6">Monto</th>
                <th className="px-8 py-6">Método / Ref</th>
                <th className="px-8 py-6">Fecha</th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recharges.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-white font-black uppercase text-sm">{r.user_name}</span>
                      <span className="text-[10px] text-emerald-400 font-bold">{r.email}</span>
                      <span className="text-[10px] text-gray-500 font-mono italic">{r.phone_number}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-xl font-black text-white">₡{Number(r.amount).toLocaleString()}</td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase ${r.method_type === 'CARD' ? 'text-blue-400' : 'text-emerald-400'}`}>
                        {r.method_type || 'SINPE'}
                      </span>
                      <span className="text-xs text-gray-400 font-mono mt-1">{r.reference_number}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-gray-500 text-[10px] font-bold uppercase">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3 items-center">
                      <button
                        onClick={() => handleReject(r)}
                        className="py-3 px-6 bg-red-500/10 border border-red-500/20 text-red-500 font-black rounded-2xl hover:bg-red-500/20 transition-all active:scale-95 uppercase text-[10px]"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleApprove(r)}
                        className="py-3 px-6 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 uppercase text-xs"
                      >
                        Aplicar
                      </button>
                      {approvedReceipts[r.id] && (
                        <PrintButton
                          ticket={approvedReceipts[r.id]}
                          label="Recibo"
                          className="py-3 px-4 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-2xl"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {recharges.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-500">No hay depósitos pendientes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
