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
  source_phone?: string;
  source_name?: string;
  third_party_alert?: boolean;
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
    let mensaje = `¿Desea aprobar la recarga de ₡${Number(r.amount).toLocaleString()} para ${r.user_name}?`;
    
    if (r.third_party_alert) {
      mensaje = `⚠️ ATENCIÓN: Este SINPE es de un TERCERO.\n\nTeléfono del comprobante: ${r.source_phone}\nNombre: ${r.source_name}\n\n¿Desea aprobar la recarga de ₡${Number(r.amount).toLocaleString()} para ${r.user_name}?`;
    }
    
    if (!confirm(mensaje)) return;
    
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
        if (r.third_party_alert) {
          receiptTicket.lines.push({ label: '⚠️ ALERTA', value: 'SINPE de tercero - Aprobado manualmente', bold: true });
        }
        setApprovedReceipts(prev => ({ ...prev, [r.id]: receiptTicket }));
        alert(`✅ Recarga de ₡${Number(r.amount).toLocaleString()} aprobada exitosamente.`);
        fetchRecharges();
      }
    } catch (err) {
      alert('Error al aprobar recarga.');
    }
  };

  const handleReject = async (r: Recharge) => {
    let mensaje = `¿Por qué desea rechazar la recarga de ₡${Number(r.amount).toLocaleString()}?`;
    if (r.third_party_alert) {
      mensaje = `⚠️ ATENCIÓN: Este SINPE es de un TERCERO.\n\nTeléfono del comprobante: ${r.source_phone}\nNombre: ${r.source_name}\n\n${mensaje}`;
    }
    const note = prompt(mensaje, "Información de comprobante no concuerda");
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
    <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-10 animate-in fade-in duration-500">
      <header className="flex justify-between items-center bg-[#1e293b] p-6 md:p-8 rounded-3xl border border-emerald-500/20 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-emerald-400 hover:text-emerald-300 text-sm font-bold">← Panel Admin</Link>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">Depósitos SINPE Pendientes</h1>
          <p className="text-gray-400 font-bold text-sm mt-1">Verifica y aprueba las recargas de los jugadores</p>
        </div>
        <div className="h-12 w-12 md:h-16 md:w-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 text-2xl md:text-3xl">
          💰
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Cargando depósitos...</div>
      ) : recharges.length === 0 ? (
        <div className="glass-panel p-10 text-center border-white/5 rounded-2xl">
          <p className="text-gray-500">No hay depósitos pendientes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recharges.map((r) => (
            <div key={r.id} className={`bg-[#1e293b] rounded-2xl border-2 p-4 md:p-6 transition-all ${
              r.third_party_alert 
                ? 'border-red-500/50 shadow-red-500/20 shadow-lg' 
                : 'border-white/5'
            }`}>
              {/* Alerta de tercero destacada */}
              {r.third_party_alert && (
                <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-red-400 font-black text-sm uppercase">SINPE DE TERCERO</p>
                    <p className="text-gray-300 text-xs">Este comprobante pertenece a otra persona. Revise manualmente.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                {/* Información del jugador */}
                <div className="md:col-span-2">
                  <p className="text-white font-black text-base md:text-lg uppercase">{r.user_name}</p>
                  <p className="text-emerald-400 text-[10px] md:text-xs font-mono">{r.email}</p>
                  <p className="text-gray-500 text-[10px] font-mono mt-1">Tel: {r.phone_number}</p>
                </div>

                {/* Monto */}
                <div>
                  <p className="text-gray-400 text-[9px] uppercase font-black">Monto</p>
                  <p className="text-white text-xl md:text-2xl font-black">₡{Number(r.amount).toLocaleString()}</p>
                </div>

                {/* Referencia + Datos del comprobante */}
                <div>
                  <p className="text-gray-400 text-[9px] uppercase font-black">Referencia</p>
                  <p className="text-white text-xs md:text-sm font-mono">{r.reference_number}</p>
                  {r.source_phone && (
                    <p className="text-gray-400 text-[8px] mt-1">
                      Tel origen: {r.source_phone}
                    </p>
                  )}
                  {r.source_name && (
                    <p className="text-gray-400 text-[8px]">
                      Nombre: {r.source_name}
                    </p>
                  )}
                </div>

                {/* Fecha */}
                <div>
                  <p className="text-gray-400 text-[9px] uppercase font-black">Fecha</p>
                  <p className="text-gray-500 text-[10px] font-bold">{new Date(r.created_at).toLocaleString()}</p>
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReject(r)}
                    className="flex-1 py-2 md:py-3 bg-red-500/10 border border-red-500/20 text-red-500 font-black rounded-xl hover:bg-red-500/20 transition-all active:scale-95 uppercase text-[10px] md:text-xs"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleApprove(r)}
                    className="flex-1 py-2 md:py-3 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 uppercase text-[10px] md:text-xs"
                  >
                    Aprobar
                  </button>
                  {approvedReceipts[r.id] && (
                    <PrintButton
                      ticket={approvedReceipts[r.id]}
                      label="Recibo"
                      className="py-2 md:py-3 px-3 md:px-4 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl text-[10px] md:text-xs"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}