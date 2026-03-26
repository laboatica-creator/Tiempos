'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import ProtectedRoute from '../../../components/ProtectedRoute';

export default function AdminReportsPage() {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStart, setFilterStart] = useState(new Date().toLocaleDateString('en-CA'));
    const [filterEnd, setFilterEnd] = useState(new Date().toLocaleDateString('en-CA'));

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            const data = await api.get(`/admin/stats/report?startDate=${filterStart}&endDate=${filterEnd}`, token);
            if (Array.isArray(data)) {
                setStats(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute role="ADMIN">
            <div className="max-w-7xl mx-auto p-10 space-y-10 animate-in fade-in duration-500">
                <header className="flex justify-between items-center bg-[#1e293b] p-8 rounded-3xl border border-blue-500/20 shadow-2xl">
                    <div>
                        <Link href="/admin" className="text-blue-400 hover:text-blue-300 text-sm font-bold uppercase tracking-widest">← Volver al Panel</Link>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mt-2 italic">Reporte General de Ventas</h1>
                    </div>
                </header>

                <div className="glass-panel p-8 bg-white/5 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Desde</label>
                            <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Hasta</label>
                            <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
                        </div>
                        <button onClick={fetchReports} className="py-4 bg-blue-600 text-white font-black rounded-xl uppercase tracking-widest hover:bg-blue-500 transition-all">Generar Reporte</button>
                    </div>

                    {loading ? (
                        <div className="text-center py-20 text-gray-500 animate-pulse">Procesando datos...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {stats.length > 0 ? stats.map((s, i) => (
                                <div key={i} className="glass-panel p-8 text-center bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">{s.lottery_type}</p>
                                    <p className="text-3xl font-black text-white italic">₡{Number(s.total_sales).toLocaleString()}</p>
                                    <p className="text-[10px] text-emerald-400 font-bold mt-2 uppercase">{s.count} Apuestas registradas</p>
                                </div>
                            )) : (
                                <div className="col-span-full py-20 text-center text-gray-600">No se encontraron ventas en este periodo.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
