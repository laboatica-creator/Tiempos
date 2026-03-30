'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function Results() {
    const [results, setResults] = useState<any[]>([]);
    const [filterDate, setFilterDate] = useState(
        new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date())
    );
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        fetchResults();
    }, []);

    const fetchResults = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const data = await api.get('/draws', token);
            setResults(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        }
    };

    // Filtered results based on date
    const filteredResults = results.filter(r => {
        const rDate = r.draw_date.split('T')[0];
        return rDate === filterDate;
    });

    if (!isMounted) return null;

    return (
        <ProtectedRoute>
        <main className="p-6 flex-1 max-w-4xl mx-auto w-full space-y-10">
            <header className="py-10 px-8 text-center bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-1000"></div>
                <h1 className="text-5xl font-black tracking-tighter mb-4 text-white uppercase italic relative z-10">Resultados Oficiales</h1>
                <p className="text-emerald-400 font-black uppercase text-[10px] tracking-[0.4em] opacity-80 mb-8 relative z-10">Consulta los números ganadores y próximos sorteos</p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                    <div className="flex items-center gap-4 bg-black/40 px-6 py-3 rounded-2xl border border-white/10 w-full sm:w-auto">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">FECHA:</span>
                        <input 
                            type="date" 
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-transparent border-none text-white font-black text-sm outline-none cursor-pointer focus:text-emerald-400 transition-colors"
                        />
                    </div>
                </div>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredResults.length > 0 ? filteredResults.map((result, idx) => {
                    const isUpcoming = result.status !== 'FINISHED';
                    return (
                        <div key={idx} className={`glass-panel p-6 overflow-hidden relative ${isUpcoming ? 'opacity-50' : 'hover:scale-[1.02] transform transition-all cursor-pointer'}`}>
                            {isUpcoming && (
                                <div className="absolute top-4 right-4 bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest ring-1 ring-yellow-500/50">
                                    Pendiente
                                </div>
                            )}
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className={`text-2xl font-black ${result.lottery_type === 'TICA' ? 'text-emerald-400' : 'text-blue-400'}`}>
                                        {result.lottery_type}
                                    </h3>
                                    <p className="text-sm text-gray-400 font-bold uppercase tracking-tight">{new Date(result.draw_date).toLocaleDateString()} • {result.draw_time}</p>
                                </div>
                                <div className={`w-20 h-20 flex items-center justify-center rounded-2xl text-4xl font-black ${
                                    isUpcoming 
                                        ? 'bg-white/5 text-gray-600 border border-white/10' 
                                        : 'bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 border-2 border-emerald-400 ring-4 ring-emerald-500/20'
                                }`}>
                                    {isUpcoming ? '--' : result.winning_number}
                                </div>
                            </div>
                            {!isUpcoming && (
                                <div className="flex justify-between text-[10px] text-gray-500 uppercase font-black border-t border-white/5 pt-4 tracking-widest">
                                    <span>PAGO 90x</span>
                                    <span>Ver más detalles</span>
                                </div>
                            )}
                        </div>
                    );
                }) : (
                    <div className="col-span-full py-20 text-center opacity-30 select-none pointer-events-none">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em]">Sin sorteos registrados para esta fecha</p>
                    </div>
                )}
            </section>
        </main>
        </ProtectedRoute>
    );
}
