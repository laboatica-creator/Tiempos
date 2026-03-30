'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import ProtectedRoute from '../../../components/ProtectedRoute';

export default function AdminReportsPage() {
    const [reportType, setReportType] = useState('sales');
    const [datePreset, setDatePreset] = useState('30');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const limit = 50;

    useEffect(() => {
        applyPreset(datePreset);
    }, [datePreset]);

    const applyPreset = (preset: string) => {
        const end = new Date();
        const start = new Date();
        if (preset === 'today') {
            start.setHours(0,0,0,0);
        } else if (preset === '7') {
            start.setDate(end.getDate() - 7);
        } else if (preset === '30') {
            start.setDate(end.getDate() - 30);
        } else if (preset === 'month') {
            start.setDate(1);
        } else if (preset === 'custom') {
            return;
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            params.append('page', page.toString());
            params.append('limit', limit.toString());

            const res = await api.get(`/admin/reports/${reportType}?${params.toString()}`, token);
            if (res && res.data) {
                setData(res.data);
            } else {
                setData([]);
            }
        } catch (e) {
            alert('Error generando el reporte');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const token = sessionStorage.getItem('token');
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        params.append('format', 'csv');

        // Simple download link using API base URL logic
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://tiempos-backend.onrender.com/api';
        const exportUrl = `${baseUrl}/admin/reports/${reportType}?${params.toString()}`;

        // Create a temporary anchor element
        const a = document.createElement('a');
        a.href = exportUrl;
        // Optionally pass token via headers if needed, but standard file downloads via href can't pass Authorization header easily.
        // If security blocks this, we would use fetch blob. Using fetch for blob instead:
        fetch(exportUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = `reporte-${reportType}-${startDate}-${endDate}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        });
    };

    const renderTable = () => {
        if (data.length === 0) return <div className="p-8 text-center text-gray-500 uppercase tracking-widest text-xs font-black">No hay datos para el período seleccionado</div>;

        if (reportType === 'sales') {
            return (
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 text-xs uppercase font-black tracking-widest">
                        <tr><th>ID</th><th>Fecha</th><th>Usuario</th><th>Monto</th><th>Sorteo</th><th>Estado</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm font-bold text-gray-300">
                        {data.map(d => (
                            <tr key={d.id} className="hover:bg-white/5">
                                <td className="py-3 px-2 font-mono text-gray-500">#{d.id.slice(0,4)}</td>
                                <td>{new Date(d.created_at).toLocaleString()}</td>
                                <td className="text-white">{d.username}</td>
                                <td className="text-emerald-400">₡{Number(d.total_amount).toLocaleString()}</td>
                                <td>{d.lottery_type} {d.draw_time}</td>
                                <td>{d.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }

        if (reportType === 'players') {
            return (
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 text-xs uppercase font-black tracking-widest">
                        <tr><th>Jugador</th><th>Correo</th><th>Teléfono</th><th>Registro</th><th>Saldo</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm font-bold text-gray-300">
                        {data.map(d => (
                            <tr key={d.id} className="hover:bg-white/5">
                                <td className="py-3 px-2 text-white">{d.username}</td>
                                <td>{d.email}</td>
                                <td>{d.phone}</td>
                                <td>{new Date(d.created_at).toLocaleDateString()}</td>
                                <td className="text-emerald-400">₡{Number(d.wallet_balance).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }
        
        if (reportType === 'withdrawals') {
            return (
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 text-xs uppercase font-black tracking-widest">
                        <tr><th>Fecha</th><th>Usuario</th><th>Monto</th><th>Método</th><th>Estado</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm font-bold text-gray-300">
                        {data.map(d => (
                            <tr key={d.id} className="hover:bg-white/5">
                                <td className="py-3 px-2">{new Date(d.created_at).toLocaleString()}</td>
                                <td className="text-white">{d.username}</td>
                                <td className="text-amber-400">₡{Number(d.amount).toLocaleString()}</td>
                                <td>{d.method}</td>
                                <td>{d.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }

        if (reportType === 'sinpe-deposits') {
            return (
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 text-xs uppercase font-black tracking-widest">
                        <tr><th>Fecha</th><th>Usuario</th><th>Referencia</th><th>Monto</th><th>Estado</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm font-bold text-gray-300">
                        {data.map(d => (
                            <tr key={d.id} className="hover:bg-white/5">
                                <td className="py-3 px-2">{new Date(d.created_at).toLocaleString()}</td>
                                <td className="text-white">{d.username}</td>
                                <td className="font-mono text-gray-400">{d.reference_number}</td>
                                <td className="text-emerald-400">₡{Number(d.amount).toLocaleString()}</td>
                                <td className="text-blue-400">{d.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }

        if (reportType === 'winners') {
            return (
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 text-xs uppercase font-black tracking-widest">
                        <tr><th>Fecha Premio</th><th>Sorteo</th><th>Usuario</th><th>Monto Ganado</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm font-bold text-gray-300">
                        {data.map(d => (
                            <tr key={d.id} className="hover:bg-white/5">
                                <td className="py-3 px-2">{new Date(d.created_at).toLocaleString()}</td>
                                <td>{d.lottery_type} {new Date(d.draw_date).toLocaleDateString()}</td>
                                <td className="text-white">{d.username}</td>
                                <td className="text-emerald-400 text-lg">₡{Number(d.amount).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }

        return null;
    };

    return (
        <ProtectedRoute role="ADMIN">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 p-4">
                <header className="bg-gradient-to-r from-blue-900/40 to-emerald-900/40 border border-white/10 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
                    <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Centro de Reportes</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Exportación y Análisis de Datos Duros</p>
                </header>

                <div className="glass-panel p-6 border-white/5 rounded-2xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tipo de Reporte</label>
                            <select 
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500"
                            >
                                <option value="sales">Ventas y Apuestas</option>
                                <option value="players">Jugadores Activos</option>
                                <option value="withdrawals">Retiros de Fondos</option>
                                <option value="sinpe-deposits">Depósitos SINPE</option>
                                <option value="winners">Ganadores / Premios</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Período Predefinido</label>
                            <select 
                                value={datePreset}
                                onChange={(e) => setDatePreset(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500"
                            >
                                <option value="today">Hoy</option>
                                <option value="7">Últimos 7 Días</option>
                                <option value="30">Últimos 30 Días</option>
                                <option value="month">Este Mes</option>
                                <option value="custom">Personalizado</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Desde</label>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Hasta</label>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                        <button 
                            onClick={handleGenerate}
                            disabled={loading}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-black px-6 py-3 rounded-xl uppercase text-xs tracking-widest transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Consultando BD...' : 'Generar Reporte'}
                        </button>
                        <button 
                            onClick={handleExport}
                            disabled={data.length === 0}
                            className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500 hover:text-white font-black px-8 py-3 rounded-xl uppercase text-xs tracking-widest transition-all active:scale-95 disabled:opacity-50"
                        >
                            Exportar CSV
                        </button>
                    </div>
                </div>

                <div className="glass-panel overflow-x-auto rounded-2xl border-white/5">
                    {renderTable()}
                    
                    {data.length > 0 && (
                        <div className="p-4 border-t border-white/5 flex justify-between items-center bg-black/20">
                            <button 
                                disabled={page === 1} 
                                onClick={() => { setPage(p => p - 1); handleGenerate(); }}
                                className="px-4 py-2 bg-white/5 rounded text-gray-300 disabled:opacity-30 uppercase text-xs font-bold"
                            >
                                Anterior
                            </button>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Página {page}</span>
                            <button 
                                onClick={() => { setPage(p => p + 1); handleGenerate(); }}
                                className="px-4 py-2 bg-white/5 rounded text-gray-300 disabled:opacity-30 uppercase text-xs font-bold"
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
