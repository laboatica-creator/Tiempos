'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDrawDate } from '@/lib/dateUtils';

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
    player_name: string;
    total_amount: number;
    prize_amount: number;
    prize_paid: boolean;
}

interface Totals {
    total_bets: number;
    total_sales: number;
    total_prizes: number;
}

interface Liquidation {
    id: string;
    start_date: string;
    end_date: string;
    total_sales: number;
    net_amount: number;
    status: string;
    created_at: string;
}

export default function SellerDetailPage({ params }: { params: { id: string } }) {
    const sellerId = params.id;
    
    const [seller, setSeller] = useState<Seller | null>(null);
    const [bets, setBets] = useState<Bet[]>([]);
    const [totals, setTotals] = useState<Totals>({ total_bets: 0, total_sales: 0, total_prizes: 0 });
    const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [commissionPct, setCommissionPct] = useState(10);
    const [submitting, setSubmitting] = useState(false);
    
    const router = useRouter();

    useEffect(() => {
        if (sellerId) {
            fetchSellerData();
            fetchSalesDetail();
            fetchLiquidations();
        }
    }, [sellerId]);

    useEffect(() => {
        if (sellerId) {
            fetchSalesDetail();
        }
    }, [startDate, endDate]);

    const fetchSellerData = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const sellersRes = await api.get('/admin/sellers', token);
            if (Array.isArray(sellersRes)) {
                const found = sellersRes.find((s: any) => s.id === sellerId);
                if (found) {
                    setSeller(found);
                    setCommissionPct(Number(found.commission_percentage) || 10);
                    setLoading(false);
                }
            }
        } catch (err) { 
            console.error('Error fetching seller:', err);
            setLoading(false);
        }
    };

    const fetchSalesDetail = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const data = await api.get(`/admin/sellers/${sellerId}/sales?start=${startDate}&end=${endDate}`, token);
            if (data && !data.error) {
                setBets(data.bets || []);
                setTotals(data.totals || { total_bets: 0, total_sales: 0, total_prizes: 0 });
            }
        } catch (err) { 
            console.error('Error fetching sales:', err); 
        }
    };

    const fetchLiquidations = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const data = await api.get(`/admin/sellers/${sellerId}/liquidations`, token);
            if (Array.isArray(data)) {
                setLiquidations(data);
            }
        } catch (err) { 
            console.error('Error fetching liquidations:', err); 
        }
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
                fetchLiquidations();
            } else {
                alert(res.error || 'Error al liquidar');
            }
        } catch (err) { 
            alert('Error de conexión'); 
        } finally { 
            setSubmitting(false); 
        }
    };

    const handlePayPrize = async (betId: string) => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await api.post(`/admin/sellers/pay-prize/${betId}`, {}, token);
            if (res.success) {
                alert('✅ Premio marcado como pagado');
                fetchSalesDetail();
            }
        } catch (err) { 
            alert('Error al procesar pago'); 
        }
    };

    const calculateCommission = () => Number(totals.total_sales) * (commissionPct / 100);
    const calculateNet = () => Number(totals.total_sales) - Number(totals.total_prizes) - calculateCommission();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!seller) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="text-rose-500 font-bold">Vendedor no encontrado</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-6 pb-24">
            {/* HEADER */}
            <header className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push('/admin/sellers')} 
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"
                    >
                        ← Volver
                    </button>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter">{seller.full_name}</h1>
                        <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest opacity-70">
                            {seller.email} • {seller.phone_number}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest ${
                        seller.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                        {seller.is_active ? 'CUENTA ACTIVA' : 'CUENTA SUSPENDIDA'}
                    </span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Ventas Brutas</p>
                    <p className="text-3xl font-black text-white">₡{Number(totals.total_sales).toLocaleString()}</p>
                    <p className="text-[9px] text-gray-500 uppercase mt-2">{totals.total_bets} Tickets emitidos</p>
                </div>
                <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Premios Generados</p>
                    <p className="text-3xl font-black text-rose-500">₡{Number(totals.total_prizes).toLocaleString()}</p>
                </div>
                <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Comisión ({commissionPct}%)</p>
                    <p className="text-3xl font-black text-emerald-400">₡{calculateCommission().toLocaleString()}</p>
                </div>
                <div className={`p-6 rounded-2xl border-2 ${
                    calculateNet() >= 0 
                        ? 'border-emerald-500/30 bg-emerald-500/5' 
                        : 'border-rose-500/30 bg-rose-500/5'
                }`}>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                        {calculateNet() >= 0 ? 'Balance a Recibir' : 'Déficit de Caja'}
                    </p>
                    <p className={`text-4xl font-black ${calculateNet() >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₡{Math.abs(calculateNet()).toLocaleString()}
                    </p>
                    <button 
                        onClick={handleLiquidate}
                        disabled={submitting || Number(totals.total_sales) === 0}
                        className="w-full mt-4 py-3 bg-white text-black font-black text-xs rounded-xl uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-30"
                    >
                        {submitting ? 'GENERANDO...' : 'LIQUIDAR CAJA'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* DETALLE DE JUGADAS */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center bg-[#1e293b] p-6 rounded-3xl border border-white/5">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">📜 Historial de Ventas</h3>
                        <div className="flex gap-2">
                             <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e)=>setStartDate(e.target.value)} 
                                className="bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-emerald-500" 
                            />
                             <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e)=>setEndDate(e.target.value)} 
                                className="bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-emerald-500" 
                            />
                        </div>
                    </div>
                    
                    <div className="bg-[#1e293b] rounded-2xl overflow-hidden border border-white/5">
                        <div className="max-h-[500px] overflow-y-auto">
                            {bets.length === 0 ? (
                                <div className="p-20 text-center text-gray-500">
                                    No hay ventas en este período
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-[#0f172a]">
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
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                                            bet.lottery_type === 'TICA' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'
                                                        }`}>
                                                            {bet.lottery_type}
                                                        </span>
                                                        <span className="text-[10px] text-white font-bold">
                                                            {formatDrawDate(bet.draw_date)} • {bet.draw_time}
                                                        </span>
                                                    </div>
                                                    <div className="text-[9px] text-gray-500 uppercase">{bet.player_name || 'Venta Local'}</div>
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
                                                            className="px-4 py-1.5 bg-emerald-500 text-white text-[9px] font-black rounded-lg hover:bg-emerald-400 transition-all uppercase shadow-lg shadow-emerald-500/20"
                                                        >
                                                            Pagar
                                                        </button>
                                                    )}
                                                    {bet.prize_paid && (
                                                        <span className="text-[9px] font-black text-gray-600 uppercase">Pagado ✅</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* HISTORIAL LIQUIDACIONES */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest px-2">💰 Liquidaciones Previas</h3>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {liquidations.length === 0 ? (
                            <div className="bg-[#1e293b] p-6 rounded-2xl text-center text-gray-500">
                                No hay liquidaciones previas
                            </div>
                        ) : (
                            liquidations.map((liq) => (
                                <div key={liq.id} className="bg-[#1e293b] p-5 rounded-2xl border border-white/5">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                            liq.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                            {liq.status === 'paid' ? 'COBRADO' : 'PENDIENTE'}
                                        </span>
                                        <span className="text-gray-500 text-[9px] font-bold">{formatDrawDate(liq.created_at)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <div>
                                            <p className="text-[8px] text-gray-500 uppercase font-bold">Ventas</p>
                                            <p className="text-sm font-black text-white">₡{Number(liq.total_sales).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-gray-500 uppercase font-bold">Recibido</p>
                                            <p className="text-sm font-black text-emerald-400">₡{Number(liq.net_amount).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-gray-600 uppercase font-black tracking-tighter italic">
                                        Periodo: {formatDrawDate(liq.start_date)} al {formatDrawDate(liq.end_date)}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}