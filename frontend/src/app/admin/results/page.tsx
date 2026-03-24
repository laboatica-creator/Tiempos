'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../../lib/api';

interface Draw {
    id: string;
    lottery_type: string;
    draw_date: string;
    draw_time: string;
    status: string;
    winning_number?: string;
    total_sold?: number;
}

export default function AdminResultsPage() {
    const [draws, setDraws] = useState<Draw[]>([]);
    const [selectedDraw, setSelectedDraw] = useState('');
    const [winningNumber, setWinningNumber] = useState('');
    const [processing, setProcessing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [countdown, setCountdown] = useState('--:--:--');
    const [resultsDate, setResultsDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));
    const drawsRef = useRef<Draw[]>([]);

    // Keep drawsRef in sync
    useEffect(() => { drawsRef.current = draws; }, [draws]);

    useEffect(() => {
        setIsMounted(true);
        fetchDraws();
        const interval = setInterval(() => updateClosestDraw(), 1000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchDraws = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const data = await api.get('/draws', token);
            if (Array.isArray(data)) {
                setDraws(data);
                drawsRef.current = data;
                // Auto-select the first OPEN or CLOSED draw
                const actionable = data.find((d: Draw) => d.status === 'OPEN' || d.status === 'CLOSED');
                if (actionable) setSelectedDraw(actionable.id);
                else if (data.length > 0) setSelectedDraw(data[0].id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const updateClosestDraw = useCallback(() => {
        const current = drawsRef.current;
        const next = current.find(d => d.status === 'OPEN');
        if (!next) { setCountdown('--:--:--'); return; }

        const now = new Date();
        const [h, m, s] = next.draw_time.split(':').map(Number);
        const drawDate = new Date(next.draw_date);
        drawDate.setHours(h, m, s || 0, 0);
        const diff = drawDate.getTime() - now.getTime();

        if (diff <= 0) { setCountdown('EN PROCESO'); return; }
        if (diff < 20 * 60 * 1000) { setCountdown('CERRADO (LIMITADO)'); return; }

        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, []);

    const handleAdjustBalance = async () => {
        const action = confirm('¿Desea realizar una RECARGA (Depósito)? Cancelar para realizar un REBAJO (Extracción).');
        const type = action ? 'CREDIT' : 'DEBIT';
        const typeLabel = action ? 'RECARGA' : 'REBAJO';

        const source = prompt(`¿Origen de la ${typeLabel}?\n1: SINPE Móvil\n2: Tarjeta\n3: Ajuste Administrativo`);
        let description = `Ajuste manual: ${typeLabel}`;
        if (source === '1') description += ' via SINPE Móvil';
        else if (source === '2') description += ' via Tarjeta';
        else description += ' (Ajuste Administrativo)';

        const userId = prompt('Ingrese el ID del Usuario\n(cópialo desde la sección Afiliación de Jugadores):');
        if (!userId || userId.trim() === '') return;
        const amount = prompt(`Monto de ${typeLabel} (ej: 5000):`);
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            alert('Monto inválido.');
            return;
        }

        try {
            const token = sessionStorage.getItem('token');
            const res = await api.post('/wallet/adjust', {
                userId: userId.trim(),
                amount: Number(amount),
                type,
                description
            }, token);

            if (res.error) alert(`Error: ${res.error}`);
            else alert(`¡Éxito! ${typeLabel} de ₡${Number(amount).toLocaleString()} aplicada.\nNuevo saldo: ₡${Number(res.newBalance).toLocaleString()}`);
        } catch (err) {
            alert('Error de conexión al procesar el ajuste.');
        }
    };

    const handleProcessDraw = async () => {
        if (!winningNumber || winningNumber.length !== 2 || !selectedDraw) {
            alert('Ingrese un número de 2 dígitos y seleccione un sorteo.');
            return;
        }

        const draw = draws.find(d => d.id === selectedDraw);
        if (!draw) return;
        if (draw.status === 'FINISHED') {
            alert('Este sorteo ya ha sido procesado.');
            return;
        }

        if (confirm(`¿Confirma el número GANADOR: ${winningNumber} para el sorteo\n${draw.lottery_type} ${draw.draw_time} del ${new Date(draw.draw_date).toLocaleDateString()}?`)) {
            setProcessing(true);
            try {
                const token = sessionStorage.getItem('token');
                const data = await api.post(`/draws/${selectedDraw}/win`, { winning_number: winningNumber }, token);
                if (data.error) alert(data.error);
                else {
                    alert(`✅ Éxito: ${data.message}`);
                    setWinningNumber('');
                    fetchDraws();
                }
            } catch (err) {
                alert('Error al procesar.');
            } finally {
                setProcessing(false);
            }
        }
    };

    const handleCancelDraw = async (drawId: string) => {
        const draw = draws.find(d => d.id === drawId);
        if (!draw) return;

        if (confirm(`⚠️ ¿ESTÁ SEGURO DE CANCELAR EL SORTEO?\n${draw.lottery_type} ${draw.draw_time} del ${new Date(draw.draw_date).toLocaleDateString()}\n\nEsta acción devolverá el dinero a TODOS los jugadores que apostaron en este sorteo.`)) {
            try {
                const token = sessionStorage.getItem('token');
                const data = await api.post(`/draws/${drawId}/cancel`, {}, token);
                if (data.error) alert(data.error);
                else {
                    alert(`✅ Sorteo Cancelado: ${data.message}`);
                    fetchDraws();
                }
            } catch (err) {
                alert('Error al cancelar el sorteo.');
            }
        }
    };

    // Today's upcoming open draws (using local date)
    const todayStr = new Date().toLocaleDateString('en-CA');
    const todayDraws = draws.filter(d => {
        // d.draw_date is already a string like "2026-03-23T06:00:00.000Z"
        // We ensure we get the local YYYY-MM-DD
        const dDate = new Date(d.draw_date).toLocaleDateString('en-CA');
        
        if (dDate !== todayStr || d.status !== 'OPEN') return false;
        
        const now = new Date();
        const [h, m] = d.draw_time.split(':').map(Number);
        const dt = new Date();
        dt.setHours(h, m, 0, 0);
        return dt.getTime() > now.getTime();
    }).sort((a, b) => a.draw_time.localeCompare(b.draw_time));

    // Draws for the selected resultsDate that can receive a winning number
    const actionableDraws = draws.filter(d => {
        const dDate = new Date(d.draw_date).toLocaleDateString('en-CA');
        return dDate === resultsDate && (d.status === 'OPEN' || d.status === 'CLOSED');
    });

    // Reminder draws (today or past, status closed, time passed)
    const reminderDraws = draws.filter(d => {
        if (d.status !== 'CLOSED') return false;
        const now = new Date();
        const drawDateStr = d.draw_date.split('T')[0];
        const dt = new Date(`${drawDateStr}T${d.draw_time}`);
        return dt.getTime() <= now.getTime();
    });

    // Filtered historical draws (sorted chronologically: closest to furthest)
    const filteredDraws = [...draws].filter(d => {
        const dDate = new Date(d.draw_date).toLocaleDateString('en-CA');
        return dDate >= startDate && dDate <= endDate;
    }).sort((a, b) => {
        const dateA = new Date(`${a.draw_date.split('T')[0]}T${a.draw_time}`).getTime();
        const dateB = new Date(`${b.draw_date.split('T')[0]}T${b.draw_time}`).getTime();
        return dateA - dateB;
    });

    const setQuickFilter = (type: string) => {
        const today = new Date();
        const start = new Date(today);
        const end = new Date(today);

        if (type === 'today') {
            // Default
        } else if (type === 'this_week') {
            const day = today.getDay(); // 0-6
            const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
            start.setDate(diff);
        } else if (type === 'last_week') {
            const day = today.getDay();
            const diff = today.getDate() - day - 6; // Last Monday
            start.setDate(diff);
            const lastSunday = new Date(start);
            lastSunday.setDate(start.getDate() + 6);
            end.setTime(lastSunday.getTime());
        } else if (type === 'all') {
            start.setFullYear(2025); // Some far date
        }

        setStartDate(start.toLocaleDateString('en-CA'));
        setEndDate(end.toLocaleDateString('en-CA'));
    };


    if (!isMounted) return null;

    return (
        <main className="p-8 max-w-7xl mx-auto w-full space-y-10 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#1e293b] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <div className="relative z-10">
                    <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">Central de Sorteos</h1>
                    <p className="text-emerald-400 font-bold uppercase text-[10px] tracking-[0.4em] mt-2 opacity-80">Dashboard Administrativo de Control</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto relative z-10">
                    <button
                        onClick={handleAdjustBalance}
                        className="flex-1 md:flex-none bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 px-8 py-4 rounded-2xl text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-3"
                    >
                        <span>⚡</span> RECARGA / REBAJO
                    </button>
                    <div className="hidden md:flex flex-col items-end justify-center px-6 border-l border-white/10">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Estado Servidor</p>
                        <p className="text-emerald-400 font-black text-xs">EN LÍNEA ✓</p>
                    </div>
                </div>
            </header>

            <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Status Column */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Próximos sorteos del día */}
                    <div className="glass-panel p-8 bg-black/40 border-blue-500/20">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Sorteos de Hoy</h2>
                            <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black tracking-widest animate-pulse border border-emerald-500/30 font-mono">EN VIVO</div>
                        </div>

                        {todayDraws.length > 0 ? (
                            <div className="space-y-3">
                                {todayDraws.map(d => {
                                    const now = new Date();
                                    const [h, m] = d.draw_time.split(':').map(Number);
                                    const dt = new Date(); dt.setHours(h, m, 0, 0);
                                    const diff = dt.getTime() - now.getTime();
                                    const hrs = Math.floor(diff / (1000 * 60 * 60));
                                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                    const secs = Math.floor((diff % (1000 * 60)) / 1000);
                                    const isNext = d.id === todayDraws[0].id;
                                    return (
                                        <div key={d.id} className={`p-4 rounded-2xl border flex justify-between items-center ${isNext ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5'}`}>
                                            <div>
                                                <p className={`font-black text-sm uppercase ${isNext ? 'text-emerald-400' : 'text-white'}`}>{d.lottery_type}</p>
                                                <p className="text-[10px] text-gray-500 font-mono">{d.draw_time}</p>
                                                <p className="text-[9px] text-gray-600 font-mono mt-1">{new Date(d.draw_date).toLocaleDateString('es-CR')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-black font-mono text-sm ${isNext ? 'text-blue-400' : 'text-gray-400'}`}>
                                                    {diff <= 0 ? 'SORTEANDO...' : `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`}
                                                </p>
                                                <p className="text-[10px] text-gray-600 uppercase">₡{Number(d.total_sold || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-10 text-center opacity-30">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sin sorteos pendientes hoy</p>
                            </div>
                        )}

                        {/* Schedules reference */}
                        <div className="pt-6 border-t border-white/5 mt-6 space-y-2">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Horario Oficial</p>
                            <div className="flex justify-between text-[10px]">
                                <span className="text-emerald-400 font-bold">TICA:</span>
                                <span className="text-gray-400 font-mono">1:00 PM • 4:00 PM • 7:30 PM</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                                <span className="text-blue-400 font-bold">NICA:</span>
                                <span className="text-gray-400 font-mono">12:00 PM • 3:00 PM • 9:00 PM</span>
                            </div>
                            <p className="text-[9px] text-gray-600 mt-2">Cierre de ventas: <span className="text-red-400">20 min antes</span>. Sáb/Dom NICA agrega las <span className="text-white">6:00 PM</span>.</p>
                        </div>
                    </div>
                </div>

                {/* Main Column */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Recording Results */}
                    <div className="glass-panel p-10 bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.05)]">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter flex items-center gap-4">
                                <span className="w-10 h-10 bg-red-500/20 text-red-500 flex items-center justify-center rounded-2xl not-italic">🎯</span>
                                Registrar Número Ganador
                            </h2>
                            <div className="flex items-center gap-4 bg-black/40 px-6 py-3 rounded-2xl border border-white/10 w-full md:w-auto">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">FECHA SORTEO:</span>
                                <input 
                                    type="date" 
                                    value={resultsDate}
                                    onChange={(e) => setResultsDate(e.target.value)}
                                    className="bg-transparent border-none text-white font-black text-sm outline-none cursor-pointer focus:text-red-400 transition-colors"
                                />
                            </div>
                        </div>

                        {reminderDraws.length > 0 && (
                            <div className="mb-8 p-6 bg-red-500/10 border-2 border-dashed border-red-500/30 rounded-3xl animate-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl animate-bounce">🔔</span>
                                    <div>
                                        <h4 className="text-red-400 font-black uppercase text-xs tracking-widest">Atención: Recordatorio</h4>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                            Hay {reminderDraws.length} sorteos que ya han concluido y aún no tienen número ganador registrado.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const first = reminderDraws[0];
                                            setResultsDate(new Date(first.draw_date).toLocaleDateString('en-CA'));
                                            setSelectedDraw(first.id);
                                        }}
                                        className="ml-auto bg-red-500 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-95"
                                    >
                                        Ir al sorteo
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-4">Seleccionar Sorteo</label>
                                    <select
                                        value={selectedDraw}
                                        onChange={(e) => setSelectedDraw(e.target.value)}
                                        className="w-full bg-black/60 border border-white/10 p-5 rounded-[2rem] text-white outline-none focus:border-red-500 transition-all font-bold"
                                    >
                                        {actionableDraws.length === 0 && <option value="">Sin sorteos para procesar</option>}
                                        {actionableDraws.map(d => (
                                            <option key={d.id} value={d.id}>
                                                {d.lottery_type} • {new Date(d.draw_date).toLocaleDateString()} • {d.draw_time} [{d.status}]
                                            </option>
                                        ))}
                                        {draws.filter(d => d.status === 'FINISHED').map(d => (
                                            <option key={d.id} value={d.id} disabled>
                                                ✓ {d.lottery_type} • {new Date(d.draw_date).toLocaleDateString()} • {d.draw_time} (#{d.winning_number})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 text-center flex flex-col items-center justify-center h-64">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4">Número Ganador</p>
                                    <input
                                        type="text"
                                        maxLength={2}
                                        value={winningNumber}
                                        onChange={(e) => setWinningNumber(e.target.value.replace(/\D/g, ''))}
                                        placeholder="--"
                                        className="w-full text-[10rem] font-black bg-transparent border-none text-center outline-none transition-all text-red-500 placeholder:text-gray-900 leading-none"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col justify-between py-2 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Resumen del Proceso</h3>
                                    <ul className="space-y-3">
                                        {['Validación de apuestas cerradas', 'Cálculo de premios instantáneo', 'Acreditación automática de saldos', 'Notificación global a ganadores'].map((text, i) => (
                                            <li key={i} className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                {text}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <button
                                    onClick={handleProcessDraw}
                                    disabled={processing || !selectedDraw || winningNumber.length !== 2}
                                    className={`w-full py-8 rounded-[2rem] font-black text-xl shadow-2xl transition-all uppercase tracking-[0.2em] relative overflow-hidden group ${
                                        processing || !selectedDraw || winningNumber.length !== 2
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:scale-[1.02] active:scale-95 shadow-red-500/20'
                                    }`}
                                >
                                    {processing ? 'Liquidando Sorteo...' : 'PROCESAR GANADORES'}
                                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Historical Table */}
                    <div className="glass-panel overflow-hidden border-white/5">
                        <div className="p-8 bg-white/5 border-b border-white/5 flex flex-col space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest italic">Archivo de Sorteos</h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Historial de registros y auditoría</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {[
                                        { label: 'Hoy', value: 'today' },
                                        { label: 'Esta Semana', value: 'this_week' },
                                        { label: 'Semana Pasada', value: 'last_week' },
                                        { label: 'Todo', value: 'all' }
                                    ].map(f => (
                                        <button 
                                            key={f.value}
                                            onClick={() => setQuickFilter(f.value)}
                                            className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:text-white hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all"
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex flex-col md:flex-row items-center gap-4 bg-black/20 p-4 rounded-3xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Desde:</span>
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-bold focus:border-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Hasta:</span>
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-bold focus:border-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="hidden md:block ml-auto text-[9px] text-gray-600 font-black uppercase tracking-widest px-4">
                                    {filteredDraws.length} Resultados encontrados
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#1e293b] text-gray-400 text-[9px] uppercase font-black tracking-widest">
                                    <tr>
                                        <th className="px-8 py-5">Lotería / Fecha</th>
                                        <th className="px-8 py-5">Hora</th>
                                        <th className="px-8 py-5">Vendido</th>
                                        <th className="px-8 py-5">Número</th>
                                        <th className="px-8 py-5">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredDraws.length > 0 ? filteredDraws.map((d) => (
                                        <tr key={d.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-8 py-6 uppercase font-bold text-xs text-white">
                                                <span className={d.lottery_type === 'TICA' ? 'text-emerald-400' : 'text-blue-400'}>{d.lottery_type}</span>
                                                <span className="text-gray-500 ml-3 font-medium">{new Date(d.draw_date).toLocaleDateString()}</span>
                                            </td>
                                            <td className="px-8 py-6 text-gray-400 font-black text-xs font-mono">{d.draw_time}</td>
                                            <td className="px-8 py-6 text-white font-black text-xs italic">₡{Number(d.total_sold || 0).toLocaleString()}</td>
                                            <td className="px-8 py-6">
                                                {d.status === 'FINISHED' ? (
                                                    <span className="w-10 h-10 bg-emerald-500 text-white font-black flex items-center justify-center rounded-xl text-lg shadow-lg shadow-emerald-500/20 border-2 border-emerald-400">{d.winning_number}</span>
                                                ) : (
                                                    <span className="text-gray-600 font-black text-lg">--</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                        d.status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        d.status === 'FINISHED' ? 'bg-purple-500/20 text-purple-400' :
                                                        d.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-gray-500/20 text-gray-500'
                                                    }`}>
                                                        {d.status === 'OPEN' ? 'ABIERTO' : 
                                                         d.status === 'CLOSED' ? 'CERRADO' : 
                                                         d.status === 'FINISHED' ? 'FINALIZADO' : 
                                                         d.status === 'CANCELLED' ? 'CANCELADO' : d.status}
                                                    </span>
                                                    {(d.status === 'OPEN' || d.status === 'CLOSED') && (
                                                        <button 
                                                            onClick={() => handleCancelDraw(d.id)}
                                                            className="text-[8px] font-black uppercase tracking-tighter text-red-500/40 hover:text-red-500 transition-colors border border-red-500/10 hover:border-red-500/50 px-2 py-1 rounded-lg"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center opacity-20 uppercase font-black text-xs tracking-[0.5em]">
                                                No hay registros para esta fecha
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
