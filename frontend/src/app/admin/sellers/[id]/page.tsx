'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Logo from '@/components/Logo';

interface Seller {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    is_active: boolean;
    commission_percentage?: number;
}

interface Bet {
    id: string;
    lottery_type: string;
    draw_date: string;
    draw_time: string;
    total_amount: number;
    prize_amount: number;
    prize_paid: boolean;
    created_at: string;
    status: string;
}

export default function AdminSellerDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id: sellerId } = use(params);
    const [seller, setSeller] = useState<Seller | null>(null);
    const [bets, setBets] = useState<Bet[]>([]);
    const [totals, setTotals] = useState({ total_sales: 0, total_prizes: 0, total_count: 0 });
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [commissionPct, setCommissionPct] = useState(10);
    const [isLiquidating, setIsLiquidating] = useState(false);
    
    const router = useRouter();

    useEffect(() => {
        fetchSellerDetail();
    }, [sellerId, startDate, endDate]);

    const fetchSellerDetail = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const data = await api.get(`/admin/sellers/${sellerId}/detail?start=${startDate}&end=${endDate}`, token);
            
            if (data && !data.error) {
                setSeller(data.seller);
                setBets(data.bets || []);
                setTotals({
                    total_sales: Number(data.totals.total_sales) || 0,
                    total_prizes: Number(data.totals.total_prizes) || 0,
                    total_count: Number(data.totals.total_count) || 0
                });
                setCommissionPct(Number(data.seller.commission_percentage) || 10);
            }
        } catch (err) {
            console.error('Error fetching detail:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLiquidate = async () => {
        if (!confirm('¿Desea marcar este período como liquidado?')) return;
        setIsLiquidating(true);
        try {
            const token = sessionStorage.getItem('token');
            const res = await api.post('/admin/sellers/liquidate', {
                seller_id: sellerId,
                start_date: startDate,
                end_date: endDate,
                commission_pct: commissionPct
            }, token);
            if (res.success) {
                alert('Periodo liquidado exitosamente');
                fetchSellerDetail();
            }
        } catch (err) {
            alert('Error al liquidar');
        } finally {
            setIsLiquidating(false);
        }
    };

    const payPrize = async (betId: string) => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await api.post(`/admin/sellers/pay-prize/${betId}`, {}, token);
            if (res.success) {
                alert('Premio marcado como pagado');
                fetchSellerDetail();
            }
        } catch (err) {
            alert('Error al pagar');
        }
    };

    if (loading && !seller) {
        return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">Cargando vendedor...</div>;
    }

    const commissionAmount = totals.total_sales * (commissionPct / 100);
    const netAmount = totals.total_sales - totals.total_prizes - commissionAmount;

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-6 lg:p-12 pb-24">
            
            {/* HEADER */}
            <header className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.push('/admin/sellers')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">← Lista</button>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter">{seller?.full_name}</h1>
                        <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest">{seller?.email} • {seller?.phone_number}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-[0.2em] border ${seller?.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                        {seller?.is_active ? 'VENDEDOR ACTIVO' : 'VENDEDOR INACTIVO'}
                    </span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* COLUMNA FILTROS Y LIQUIDACIÓN */}
                <div className="space-y-6">
                    <section className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-4">
                        <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">📅 Rango de Fechas</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[9px] font-bold text-gray-500 mb-1 uppercase">Desde</p>
                                <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs" />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-500 mb-1 uppercase">Hasta</p>
                                <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs" />
                            </div>
                        </div>
                    </section>

                    <section className="bg-gradient-to-br from-[#1e293b] to-[#161e2e] p-8 rounded-[2.5rem] border-2 border-emerald-500/10 shadow-3xl space-y-6">
                        <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] text-center">Resumen Financiero</h2>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm font-bold">
                                <span className="text-gray-500">Ventas Brutas:</span>
                                <span>₡{totals.total_sales.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-rose-500">
                                <span className="text-gray-500">Premios:</span>
                                <span>- ₡{totals.total_prizes.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-blue-400">
                                <span className="text-gray-500">Comisión ({commissionPct}%):</span>
                                <span>- ₡{commissionAmount.toLocaleString()}</span>
                            </div>
                            <div className="h-[1px] bg-white/5 pt-2"></div>
                            <div className={`p-4 rounded-2xl flex flex-col items-center gap-1 ${netAmount >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Neto a Liquidar</span>
                                <span className={`text-2xl font-black italic ${netAmount >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>₡{Math.abs(netAmount).toLocaleString()}</span>
                                <span className="text-[8px] font-bold uppercase opacity-50">{netAmount >= 0 ? 'Cobrar al vendedor' : 'Pagar al vendedor'}</span>
                            </div>
                            
                            {netAmount < 0 && (
                                <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-[10px] text-rose-400 font-bold text-center animate-pulse">
                                    ⚠️ ALERTA: Premios superan las ventas del período.
                                </div>
                            )}

                            <button
                                onClick={handleLiquidate}
                                disabled={isLiquidating || totals.total_sales === 0}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all uppercase text-xs tracking-widest disabled:opacity-20"
                            >
                                {isLiquidating ? 'PROCESANDO...' : '💰 LIQUIDAR PERIODO'}
                            </button>
                        </div>
                    </section>
                </div>

                {/* COLUMNA TABLA DE APUESTAS (3/4) */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-[#1e293b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest italic">Historial Detallado del Período</h3>
                            <span className="text-[10px] bg-white/5 px-3 py-1 rounded-full font-bold">{totals.total_count} Apuestas</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#0f172a]">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Sorteo / Fecha</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 text-center">Monto</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 text-center">Premio</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {bets.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-black uppercase text-xs tracking-widest">Sin apuestas en este período</td></tr>
                                    ) : (
                                        bets.map((bet) => (
                                            <tr key={bet.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black ${bet.lottery_type === 'TICA' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                            {bet.lottery_type}
                                                        </span>
                                                        <p className="font-black text-sm">{bet.draw_time}</p>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">{new Date(bet.draw_date).toLocaleDateString()}</p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <p className="font-black text-lg italic">₡{Number(bet.total_amount).toLocaleString()}</p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {Number(bet.prize_amount) > 0 ? (
                                                        <div className="space-y-1">
                                                            <p className="text-rose-500 font-black text-lg italic tracking-tighter shadow-sm shadow-rose-500/20 animate-pulse">🏆 ₡{Number(bet.prize_amount).toLocaleString()}</p>
                                                            {bet.prize_paid ? (
                                                                <span className="text-[8px] font-black text-emerald-400 uppercase">✅ Entregado</span>
                                                            ) : (
                                                                <span className="text-[8px] font-black text-rose-400 uppercase">⌛ Pendiente Pago</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-600 font-bold uppercase">Sin premio</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {Number(bet.prize_amount) > 0 && !bet.prize_paid && (
                                                        <button 
                                                            onClick={() => payPrize(bet.id)}
                                                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] rounded-xl uppercase tracking-tighter"
                                                        >
                                                            Entregar Premio
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}