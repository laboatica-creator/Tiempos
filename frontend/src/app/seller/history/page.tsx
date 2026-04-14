'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDrawDate } from '@/lib/dateUtils';
import Logo from '@/components/Logo';

export default function SellerHistory() {
    const [bets, setBets] = useState<any[]>([]);
    const [totals, setTotals] = useState({ total_sales: 0, total_bets: 0 });
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    const router = useRouter();

    useEffect(() => {
        fetchHistory();
    }, [startDate, endDate]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const data = await api.get(`/seller/sales-history?start=${startDate}&end=${endDate}`, token);
            if (Array.isArray(data)) {
                setBets(data);
                const totalAmount = data.reduce((s: number, b: any) => s + Number(b.total_amount), 0);
                setTotals({ total_sales: totalAmount, total_bets: data.length });
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-4 pb-24">
            <header className="flex justify-between items-center mb-6 glass-panel p-4 border-emerald-500/20">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/seller/dashboard')} className="text-emerald-400">←</button>
                    <Logo size="text-xl" />
                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Historial</span>
                </div>
            </header>

            {/* FILTROS */}
            <section className="glass-panel p-6 mb-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase">Inicio</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase">Fin</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                        />
                    </div>
                </div>
            </section>

            {/* TOTALES DEL PERIODO */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="glass-panel p-4 border-emerald-500/20">
                    <p className="text-[9px] font-black text-gray-500 uppercase">Total Vendido</p>
                    <p className="text-xl font-black text-emerald-400">₡{totals.total_sales.toLocaleString()}</p>
                </div>
                <div className="glass-panel p-4 border-blue-500/20">
                    <p className="text-[9px] font-black text-gray-500 uppercase">Tickets</p>
                    <p className="text-xl font-black text-blue-400">{totals.total_bets}</p>
                </div>
            </div>

            {/* LISTA DE APUESTAS */}
            <section className="space-y-3">
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Cargando...</div>
                ) : bets.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 italic">No hay ventas registradas en este periodo</div>
                ) : (
                    bets.map((bet) => (
                        <div key={bet.id} className="glass-panel p-4 border-white/5 flex justify-between items-center group">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${bet.lottery_type === 'TICA' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        {bet.lottery_type}
                                    </span>
                                    <span className="text-white font-black italic">₡{Number(bet.total_amount).toLocaleString()}</span>
                                </div>
                                <p className="text-gray-400 text-[10px]">{formatDrawDate(bet.draw_date)} - {bet.draw_time}</p>
                                <p className="text-gray-600 text-[8px] mt-1 font-mono uppercase tracking-tighter">ID: {bet.id.substring(0,8)}... • {bet.items_count} Números</p>
                            </div>
                            <div className="text-right">
                                <p className="text-emerald-500 font-bold text-xs uppercase">{new Date(bet.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                <button className="mt-2 text-[8px] font-black text-gray-500 group-hover:text-emerald-400 uppercase tracking-widest transition-colors">Re-imprimir</button>
                            </div>
                        </div>
                    ))
                )}
            </section>

            <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t border-emerald-500/20 p-4 flex justify-around items-center z-40 bg-[#0f172a]/95 backdrop-blur-xl">
                <button onClick={() => router.push('/seller/dashboard')} className="flex flex-col items-center gap-1 text-gray-500">
                    <span className="text-xl">🏪</span>
                    <span className="text-[10px] font-black uppercase">Terminal</span>
                </button>
                <button onClick={() => router.push('/seller/history')} className="flex flex-col items-center gap-1 text-emerald-400">
                    <span className="text-xl">📜</span>
                    <span className="text-[10px] font-black uppercase">Historial</span>
                </button>
                <button onClick={() => { sessionStorage.clear(); router.push('/login'); }} className="flex flex-col items-center gap-1 text-gray-500 hover:text-rose-500 transition-colors">
                    <span className="text-xl">🚪</span>
                    <span className="text-[10px] font-black uppercase">Salir</span>
                </button>
            </nav>
        </div>
    );
}