'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

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
    created_at: string;
}

interface Totals {
    total_bets: string | number;
    total_sales: string | number;
    total_prizes: string | number;
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

// 🔧 FIX: Obtener primer día del mes actual (no hoy)
const getFirstDayOfMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

// 🔧 FIX: Obtener el último día del mes actual
const getLastDayOfMonth = () => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
};

export default function SellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: sellerId } = use(params);

    const [seller, setSeller] = useState<Seller | null>(null);
    const [bets, setBets] = useState<Bet[]>([]);
    const [totals, setTotals] = useState<Totals>({ total_bets: 0, total_sales: 0, total_prizes: 0 });
    const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [betsLoading, setBetsLoading] = useState(false);

    // 🔥 FIX PRINCIPAL: Rango = mes completo actual, NO solo hoy
    const [startDate, setStartDate] = useState(getFirstDayOfMonth());
    const [endDate, setEndDate] = useState(getLastDayOfMonth());

    const [commissionPct, setCommissionPct] = useState(10);
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');

    const router = useRouter();

    useEffect(() => {
        if (sellerId) {
            loadInitialData();
        }
    }, [sellerId]);

    useEffect(() => {
        if (sellerId && !pageLoading) {
            fetchSalesDetail();
        }
    }, [startDate, endDate]);

    const loadInitialData = async () => {
        setPageLoading(true);
        await Promise.all([
            fetchSellerData(),
            fetchSalesDetail(),
            fetchLiquidations()
        ]);
        setPageLoading(false);
    };

    const fetchSellerData = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const sellersRes = await api.get('/admin/sellers', token);
            if (Array.isArray(sellersRes)) {
                const found = sellersRes.find((s: any) => s.id === sellerId);
                if (found) {
                    setSeller(found);
                    setCommissionPct(Number(found.commission_percentage) || 10);
                }
            }
        } catch (err) {
            console.error('Error fetching seller:', err);
        }
    };

    const fetchSalesDetail = async () => {
        try {
            setBetsLoading(true);
            setApiError('');
            const token = sessionStorage.getItem('token');
            // 🔥 Enviamos 'start' y 'end' tal como espera el backend
            const url = `/admin/sellers/${sellerId}/sales?start=${startDate}&end=${endDate}`;
            console.log('[DEBUG] Fetching sales:', url);

            const data = await api.get(url, token);
            console.log('[DEBUG] Sales response:', data);

            if (data && !data.error) {
                setBets(data.bets || []);
                setTotals(data.totals || { total_bets: 0, total_sales: 0, total_prizes: 0 });
            } else if (data?.error) {
                setApiError(data.error);
            }
        } catch (err) {
            console.error('Error fetching sales:', err);
            setApiError('Error de conexión al buscar ventas');
        } finally {
            setBetsLoading(false);
        }
    };

    const fetchLiquidations = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const data = await api.get(`/admin/sellers/${sellerId}/liquidations`, token);
            if (Array.isArray(data)) setLiquidations(data);
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
            } else {
                alert(res.error || 'Error al pagar premio');
            }
        } catch (err) {
            alert('Error al procesar pago');
        }
    };

    const setQuickRange = (range: 'today' | 'week' | 'month' | 'all') => {
        const now = new Date();
        if (range === 'today') {
            const today = now.toISOString().split('T')[0];
            setStartDate(today);
            setEndDate(today);
        } else if (range === 'week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            setStartDate(weekAgo.toISOString().split('T')[0]);
            setEndDate(now.toISOString().split('T')[0]);
        } else if (range === 'month') {
            setStartDate(getFirstDayOfMonth());
            setEndDate(getLastDayOfMonth());
        } else {
            setStartDate('2024-01-01');
            setEndDate('2099-12-31');
        }
    };

    const totalSales = Number(totals.total_sales);
    const totalPrizes = Number(totals.total_prizes);
    const totalBets = Number(totals.total_bets);
    const commission = totalSales * (commissionPct / 100);
    const netAmount = totalSales - totalPrizes - commission;

    if (pageLoading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-4">
                <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
                <p className="text-gray-400 font-bold uppercase text-xs tracking-widest animate-pulse">Cargando datos...</p>
            </div>
        );
    }

    if (!seller) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-rose-500 font-black text-2xl mb-4">Vendedor no encontrado</p>
                    <p className="text-gray-500 text-sm mb-6">ID: {sellerId}</p>
                    <button onClick={() => router.push('/admin/sellers')} className="px-6 py-3 bg-white/10 rounded-2xl font-bold text-white hover:bg-white/20 transition-all">
                        ← Volver a la lista
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-4 lg:p-8 pb-16">

            {/* HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/admin/sellers')}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-sm font-bold"
                    >
                        ← Volver
                    </button>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter">{seller.full_name}</h1>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                            {seller.email} • {seller.phone_number}
                        </p>
                    </div>
                </div>
                <span className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest border ${
                    seller.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                    {seller.is_active ? '● ACTIVO' : '○ SUSPENDIDO'}
                </span>
            </header>

            {/* FILTROS DE FECHA */}
            <section className="bg-[#1e293b] rounded-3xl p-6 mb-6 border border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">📅 Período de Análisis</h2>
                    {/* ACCESOS RÁPIDOS */}
                    <div className="flex gap-2 flex-wrap">
                        {[
                            { label: 'Hoy', key: 'today' },
                            { label: '7 días', key: 'week' },
                            { label: 'Este mes', key: 'month' },
                            { label: 'Todo', key: 'all' }
                        ].map(({ label, key }) => (
                            <button
                                key={key}
                                onClick={() => setQuickRange(key as any)}
                                className="px-3 py-1.5 bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase">Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-[#0f172a] border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase">Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-[#0f172a] border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase">% Comisión del Vendedor</label>
                        <input
                            type="number"
                            value={commissionPct}
                            min={0}
                            max={100}
                            onChange={(e) => setCommissionPct(Number(e.target.value))}
                            className="w-full bg-[#0f172a] border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500 transition-all"
                        />
                    </div>
                </div>
            </section>

            {/* ERROR API */}
            {apiError && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm font-bold">
                    ⚠️ {apiError}
                </div>
            )}

            {/* TARJETAS DE RESUMEN */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#1e293b] p-5 rounded-3xl border border-white/5">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Ventas Brutas</p>
                    <p className="text-2xl lg:text-3xl font-black text-white">₡{totalSales.toLocaleString()}</p>
                    <p className="text-[9px] text-gray-600 mt-2 uppercase">{totalBets} Tickets</p>
                </div>
                <div className="bg-[#1e293b] p-5 rounded-3xl border border-white/5">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Premios Generados</p>
                    <p className="text-2xl lg:text-3xl font-black text-rose-500">₡{totalPrizes.toLocaleString()}</p>
                </div>
                <div className="bg-[#1e293b] p-5 rounded-3xl border border-white/5">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Comisión ({commissionPct}%)</p>
                    <p className="text-2xl lg:text-3xl font-black text-emerald-400">₡{commission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                <div className={`p-5 rounded-3xl border-2 ${netAmount >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {netAmount >= 0 ? 'A Entregar al Admin' : 'Déficit del Vendedor'}
                    </p>
                    <p className={`text-2xl lg:text-3xl font-black ${netAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₡{Math.abs(netAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <button
                        onClick={handleLiquidate}
                        disabled={submitting || totalSales === 0}
                        className="w-full mt-3 py-2 bg-white text-black font-black text-[9px] rounded-lg uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-30"
                    >
                        {submitting ? 'PROCESANDO...' : '💰 LIQUIDAR'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* TABLA DE JUGADAS */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">
                            📜 Jugadas del Período
                            <span className="ml-2 text-[10px] text-gray-500 font-bold bg-white/5 px-2 py-0.5 rounded-full">
                                {betsLoading ? '...' : bets.length}
                            </span>
                        </h3>
                        <button
                            onClick={fetchSalesDetail}
                            disabled={betsLoading}
                            className="text-[10px] text-emerald-400 font-black uppercase hover:underline"
                        >
                            🔄 Recargar
                        </button>
                    </div>

                    <div className="bg-[#1e293b] rounded-3xl overflow-hidden border border-white/5">
                        <div className="max-h-[520px] overflow-y-auto">
                            {betsLoading ? (
                                <div className="p-20 text-center text-gray-500 animate-pulse font-bold text-sm">Cargando ventas...</div>
                            ) : bets.length === 0 ? (
                                <div className="p-16 text-center">
                                    <p className="text-gray-500 font-bold text-sm mb-2">Sin ventas en este período</p>
                                    <p className="text-gray-600 text-xs">Intenta con "Ver Todo" para ver todas las ventas</p>
                                    <button onClick={() => setQuickRange('all')} className="mt-4 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-black uppercase border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                                        Ver Todo el Historial
                                    </button>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-[#0f172a] z-10">
                                        <tr className="border-b border-white/10">
                                            <th className="px-5 py-3 text-[9px] font-black uppercase text-gray-500">Sorteo / Cliente</th>
                                            <th className="px-5 py-3 text-[9px] font-black uppercase text-gray-500 text-center">Venta</th>
                                            <th className="px-5 py-3 text-[9px] font-black uppercase text-gray-500 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {bets.map((bet) => (
                                            <tr key={bet.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="flex gap-2 items-center mb-1">
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                                            bet.lottery_type === 'TICA' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'
                                                        }`}>
                                                            {bet.lottery_type || '?'}
                                                        </span>
                                                        <span className="text-[10px] text-white font-bold">{bet.draw_time}</span>
                                                    </div>
                                                    <div className="text-[9px] text-gray-500 uppercase">
                                                        {bet.player_name || 'Cliente de Ventanilla'}
                                                    </div>
                                                    <div className="text-[8px] text-gray-600 mt-0.5">
                                                        {formatDate(bet.created_at)}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <div className="text-sm font-black text-white">₡{Number(bet.total_amount).toLocaleString()}</div>
                                                    {Number(bet.prize_amount) > 0 && (
                                                        <div className="text-[10px] text-rose-400 font-bold mt-0.5">🏆 ₡{Number(bet.prize_amount).toLocaleString()}</div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    {Number(bet.prize_amount) > 0 && !bet.prize_paid && (
                                                        <button
                                                            onClick={() => handlePayPrize(bet.id)}
                                                            className="px-3 py-1.5 bg-emerald-500 text-white text-[9px] font-black rounded-lg hover:bg-emerald-400 transition-all"
                                                        >
                                                            Pagar
                                                        </button>
                                                    )}
                                                    {bet.prize_paid && (
                                                        <span className="text-[9px] font-black text-gray-600 uppercase">✅ Pagado</span>
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

                {/* HISTORIAL DE LIQUIDACIONES */}
                <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">💰 Liquidaciones Previas</h3>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {liquidations.length === 0 ? (
                            <div className="bg-[#1e293b] p-8 rounded-3xl text-center">
                                <p className="text-gray-500 text-sm">Sin liquidaciones registradas</p>
                            </div>
                        ) : (
                            liquidations.map((liq) => (
                                <div key={liq.id} className="bg-[#1e293b] p-4 rounded-2xl border border-white/5">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                            liq.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                            {liq.status === 'paid' ? 'Cobrado' : 'Pendiente'}
                                        </span>
                                        <span className="text-gray-500 text-[9px]">{formatDate(liq.created_at)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <div>
                                            <p className="text-[8px] text-gray-500 uppercase font-bold">Ventas</p>
                                            <p className="text-sm font-black text-white">₡{Number(liq.total_sales).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-gray-500 uppercase font-bold">Neto</p>
                                            <p className="text-sm font-black text-emerald-400">₡{Number(liq.net_amount).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-gray-600 uppercase font-black">
                                        {formatDate(liq.start_date)} → {formatDate(liq.end_date)}
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