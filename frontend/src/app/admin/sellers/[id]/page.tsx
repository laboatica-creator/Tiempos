'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { formatDrawDate } from '../../../lib/dateUtils';

export default function SellerDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id: sellerId } = use(params);
    const [seller, setSeller] = useState<any>(null);
    const [bets, setBets] = useState<any[]>([]);
    const [totals, setTotals] = useState({ total_bets: 0, total_sales: 0, total_prizes: 0 });
    const [liquidations, setLiquidations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [commissionPct, setCommissionPct] = useState(10);
    const [submitting, setSubmitting] = useState(false);
    
    const router = useRouter();

    useEffect(() => {
        fetchSellerData();
    }, [sellerId]);

    useEffect(() => {
        if (sellerId) fetchSalesDetail();
    }, [sellerId, startDate, endDate]);

    const fetchSellerData = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const sellersRes = await api.get('/admin/sellers', token);
            const found = sellersRes.find((s: any) => s.id === sellerId);
            if (found) {
                setSeller(found);
                setCommissionPct(Number(found.commission_percentage) || 10);
            }
            const liqs = await api.get(`/admin/sellers/${sellerId}/liquidations`, token);
            if (Array.isArray(liqs)) setLiquidations(liqs);
        } catch (err) { console.error(err); }
    };

    const fetchSalesDetail = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const data = await api.get(`/admin/sellers/${sellerId}/sales?start=${startDate}&end=${endDate}`, token);
            if (data && !data.error) {
                setBets(data.bets);
                setTotals(data.totals);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleLiquidate = async () => {
        if (!window.confirm('¿Desea generar la liquidación para este periodo?')) return;
        setSubmitting(true);
        try {
            const token = sessionStorage.getItem('token');
            const res = await api.post('/admin/sellers/liquidate', {
                seller_id: sellerId,
                start_date: startDate,
                end_date: endDate,
                commission_percentage: commissionPct
            }, token);

            if (res.success) {
                alert('✅ Liquidación generada correctamente');
                fetchSellerData();
            } else {
                alert(res.error || 'Error al liquidar');
            }
        } catch (err) { alert('Error de conexión'); }
        finally { setSubmitting(false); }
    };

    const handlePayPrize = async (betId: string) => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await api.post(`/admin/sellers/pay-prize/${betId}`, {}, token);
            if (res.success) {
                alert('✅ Premio marcado como pagado');
                fetchSalesDetail();
            }
        } catch (err) { alert('Error al procesar pago'); }
    };

    const calculateCommission = () => Number(totals.total_sales) * (commissionPct / 100);
    const calculateNet = () => Number(totals.total_sales) - Number(totals.total_prizes) - calculateCommission();

    if (!seller) return <div className="p-20 text-center text-gray-500">Cargando vendedor...</div>;

    return (
        <div className="min-h-screen bg-[#010816] text-white p-6">
            {/* HEADER */}
            <header className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/admin/sellers')} className="p-2 hover:bg-white/5 rounded-full transition-colors">←</button>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter">{seller.full_name}</h1>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">{seller.email} • {seller.phone_number}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${seller.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {seller.is_active ? 'ESTADO: ACTIVO' : 'ESTADO: INACTIVO'}
                    </span>
                </div>
            </header>

            {/* FILTROS DE PERIODO */}
            <section className="glass-panel p-6 mb-8 border-white/5 bg-white/[0.02]">
                <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Período de Análisis</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase">Fecha Inicial</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase">Fecha Final</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase">% Comisión</label>
                        <input type="number" value={commissionPct} onChange={(e) => setCommissionPct(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl p-3" />
                    </div>
                </div>
            </section>

            {/* RESUMEN DE LIQUIDACIÓN */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
                <div className="glass-panel p-6 bg-white/5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Ventas Totales</p>
                    <p className="text-3xl font-black text-white">₡{Number(totals.total_sales).toLocaleString()}</p>
                    <p className="text-[9px] text-gray-500 uppercase mt-2">{totals.total_bets} Tickets</p>
                </div>
                <div className="glass-panel p-6 bg-white/5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Premios a Pagar</p>
                    <p className="text-3xl font-black text-rose-500">₡{Number(totals.total_prizes).toLocaleString()}</p>
                </div>
                <div className="glass-panel p-6 bg-white/5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Comisión ({commissionPct}%)</p>
                    <p className="text-3xl font-black text-emerald-400">₡{calculateCommission().toLocaleString()}</p>
                </div>
                <div className={`glass-panel p-6 border-2 ${calculateNet() >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{calculateNet() >= 0 ? 'Neto a Recibir' : 'Déficit (Vendedor Paga)'}</p>
                    <p className={`text-4xl font-black ${calculateNet() >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>₡{Math.abs(calculateNet()).toLocaleString()}</p>
                    <button 
                        onClick={handleLiquidate}
                        disabled={submitting || Number(totals.total_sales) === 0}
                        className="w-full mt-4 py-2 bg-white text-black font-black text-[10px] rounded-lg uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-30"
                    >
                        {submitting ? 'PROCESANDO...' : 'GENERAR LIQUIDACIÓN'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* TABLA DE APUESTAS DEL PERIODO */}
                <div className="lg:col-span-2">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        📜 Detalle de Jugadas <span className="text-[10px] text-gray-500 font-bold bg-white/5 px-2 py-0.5 rounded-full">{bets.length}</span>
                    </h3>
                    <div className="glass-panel overflow-hidden border-white/5">
                        <div className="max-h-[600px] overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-[#0f172a] z-10">
                                    <tr className="border-b border-white/10">
                                        <th className="px-6 py-4 text-[9px] font-black uppercase text-gray-500">Info / Fecha</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase text-gray-500 text-center">Monto / Premio</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase text-gray-500 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {bets.map((bet) => (
                                        <tr key={bet.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2 items-center mb-1">
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${bet.lottery_type === 'TICA' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                        {bet.lottery_type}
                                                    </span>
                                                    <span className="text-[10px] text-white font-bold">{formatDrawDate(bet.draw_date)} • {bet.draw_time}</span>
                                                </div>
                                                <div className="text-[9px] text-gray-500 uppercase">{bet.player_name || 'Sin nombre'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="text-xs font-bold text-white">₡{Number(bet.total_amount).toLocaleString()}</div>
                                                {Number(bet.prize_amount) > 0 && (
                                                    <div className="text-[10px] text-rose-400 font-bold">🏆 ₡{Number(bet.prize_amount).toLocaleString()}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {bet.prize_amount > 0 && !bet.prize_paid && (
                                                    <button 
                                                        onClick={() => handlePayPrize(bet.id)}
                                                        className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black rounded hover:bg-emerald-600 transition-all uppercase"
                                                    >
                                                        Pagar
                                                    </button>
                                                )}
                                                {bet.prize_paid && (
                                                    <span className="text-[9px] font-black text-gray-500 uppercase border border-white/10 px-2 py-1 rounded">Pagado ✅</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* HISTORIAL DE LIQUIDACIONES */}
                <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">💰 Historial de Liquidaciones</h3>
                    <div className="space-y-4">
                        {liquidations.map((liq) => (
                            <div key={liq.id} className="glass-panel p-4 border-white/5 bg-white/[0.02]">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${liq.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                        {liq.status === 'paid' ? 'COBRADO' : 'PENDIENTE'}
                                    </span>
                                    <span className="text-gray-500 text-[9px]">{new Date(liq.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    <div>
                                        <p className="text-[8px] text-gray-500 uppercase font-bold">Ventas</p>
                                        <p className="text-sm font-black text-white">₡{Number(liq.total_sales).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] text-gray-500 uppercase font-bold">Neto</p>
                                        <p className="text-sm font-black text-emerald-400">₡{Number(liq.net_amount).toLocaleString()}</p>
                                    </div>
                                </div>
                                <p className="text-[8px] text-gray-600 mt-2 uppercase font-black tracking-tighter">Periodo: {formatDrawDate(liq.start_date)} al {formatDrawDate(liq.end_date)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}