'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Logo from '@/components/Logo';

interface HistoryItem {
    id: string;
    total_amount: number;
    created_at: string;
    lottery_type: string;
    draw_date: string;
    draw_time: string;
    status: string;
}

export default function SellerHistory() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [totals, setTotals] = useState({ total_sales: 0, total_bets: 0 });
    
    const router = useRouter();

    useEffect(() => {
        fetchHistory();
    }, [startDate, endDate]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const data = await api.get(`/seller/history?start=${startDate}&end=${endDate}`, token);
            if (data && !data.error) {
                setHistory(data.bets || []);
                setTotals({
                    total_sales: data.total_sales || 0,
                    total_bets: data.total_bets || 0
                });
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-4 lg:p-8 pb-24">
            
            {/* HEADER */}
            <header className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/seller/dashboard')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">← Terminal</button>
                    <Logo size="text-xl" />
                </div>
                <h1 className="text-sm font-black uppercase tracking-widest text-emerald-400">Historial de Ventas</h1>
            </header>

            {/* FILTROS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#1e293b] p-6 rounded-3xl border border-white/5 shadow-2xl space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Desde</label>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-emerald-500"
                    />
                </div>
                <div className="bg-[#1e293b] p-6 rounded-3xl border border-white/5 shadow-2xl space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Hasta</label>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-emerald-500"
                    />
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl flex flex-col justify-center items-center text-center">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Ventas del Período</p>
                    <p className="text-3xl font-black text-emerald-400 font-outfit">₡{Number(totals.total_sales).toLocaleString()}</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase">{totals.total_bets} Tickets</p>
                </div>
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="bg-[#1e293b] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black/30">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Fecha / Hora</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Lotería</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Monto</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">ID Ticket</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array.from({length: 5}).map((_, i) => (
                                    <tr key={i} className="animate-pulse"><td colSpan={5} className="px-6 py-6 bg-white/5"></td></tr>
                                ))
                            ) : history.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 uppercase font-black text-xs italic tracking-widest">No hay ventas registradas</td></tr>
                            ) : (
                                history.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-5">
                                            <p className="font-black text-sm">{new Date(item.created_at).toLocaleDateString()}</p>
                                            <p className="text-[10px] text-gray-500 font-bold">{new Date(item.created_at).toLocaleTimeString()}</p>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${item.lottery_type === 'TICA' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                {item.lottery_type} | {item.draw_time}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <p className="font-black text-lg italic tracking-tighter">₡{Number(item.total_amount).toLocaleString()}</p>
                                        </td>
                                        <td className="px-6 py-5 text-center text-[10px] font-mono text-gray-600">
                                            {item.id.split('-')[0].toUpperCase()}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">✅ Activo</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}