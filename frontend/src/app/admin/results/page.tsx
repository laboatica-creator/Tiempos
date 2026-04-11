'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';

interface Draw {
    id: string;
    lottery_type: string;
    draw_date: string;
    draw_time: string;
    status: string;
    winning_number?: string;
}

export default function AdminResultsPage() {
    const [draws, setDraws] = useState<Draw[]>([]);
    const [selectedDraw, setSelectedDraw] = useState('');
    const [winningNumber, setWinningNumber] = useState('');
    const [processing, setProcessing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [resultsDate, setResultsDate] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [showFilter, setShowFilter] = useState(false);
    const [todayWinningNumbers, setTodayWinningNumbers] = useState<any[]>([]);

    useEffect(() => {
        setIsMounted(true);
        // Obtener fecha actual en formato YYYY-MM-DD
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
        setResultsDate(today);
        setFilterDate(today);
        fetchDraws();
    }, []);

    useEffect(() => {
        if (draws.length > 0) {
            loadTodayWinningNumbers();
        }
    }, [draws]);

    const fetchDraws = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const data = await api.get('/draws', token);
            if (Array.isArray(data)) {
                setDraws(data);
                // Seleccionar el primer sorteo abierto o cerrado del día
                const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
                const todayDraw = data.find(d => d.draw_date === today && (d.status === 'OPEN' || d.status === 'CLOSED'));
                if (todayDraw) setSelectedDraw(todayDraw.id);
            }
        } catch (err) { 
            console.error(err); 
        }
    };

    const loadTodayWinningNumbers = () => {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
        const todayDraws = draws.filter(d => d.draw_date === today && d.winning_number);
        
        const numbers = todayDraws.map(d => ({
            number: d.winning_number!,
            draw_time: d.draw_time,
            lottery: d.lottery_type
        }));
        
        setTodayWinningNumbers(numbers);
    };

    const handleProcessDraw = async () => {
        if (!winningNumber || winningNumber.length !== 2 || !selectedDraw) {
            alert('Ingrese un número de 2 dígitos y seleccione un sorteo.');
            return;
        }
        const draw = draws.find(d => d.id === selectedDraw);
        if (confirm(`¿Confirma el número GANADOR: ${winningNumber} para el sorteo ${draw?.lottery_type} de las ${draw?.draw_time}?`)) {
            setProcessing(true);
            try {
                const token = sessionStorage.getItem('token');
                const data = await api.post(`/draws/${selectedDraw}/win`, { winning_number: winningNumber }, token);
                if (data.error) alert(data.error);
                else {
                    alert('✅ Éxito al procesar sorteo.');
                    setWinningNumber('');
                    fetchDraws();
                }
            } catch (err) { alert('Error al procesar.'); }
            finally { setProcessing(false); }
        }
    };

    // Formatear fecha de YYYY-MM-DD a DD/MM/YYYY
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    if (!isMounted) return null;

    // Sorteos del día seleccionado para el selector
    const actionableDraws = draws.filter(d => d.draw_date === resultsDate && (d.status === 'OPEN' || d.status === 'CLOSED'));

    // Sorteos pendientes del día ACTUAL
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    const pendingWinnerDraws = draws.filter(d => 
        d.draw_date === today && 
        d.status === 'CLOSED' && 
        !d.winning_number
    );

    // Sorteos para el filtro de fechas pasadas
    const filteredDrawsByDate = draws.filter(d => d.draw_date === filterDate);

    return (
        <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 pb-20">
            {/* Header */}
            <header className="bg-[#1e293b] p-6 md:p-8 rounded-2xl border border-white/5 shadow-2xl">
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter">Resultados</h1>
                <p className="text-emerald-400 font-bold uppercase text-[10px] tracking-[0.4em] mt-1">Liquidación de Sorteos</p>
            </header>

            {/* Números ganadores del día */}
            {todayWinningNumbers.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 border border-emerald-500/20 rounded-2xl p-4">
                    <h2 className="text-emerald-400 font-black text-xs uppercase tracking-widest mb-3">📊 Números ganadores de hoy</h2>
                    <div className="flex flex-wrap gap-3">
                        {todayWinningNumbers.map((item, idx) => (
                            <div key={idx} className="bg-black/40 rounded-xl p-3 min-w-[100px] text-center">
                                <span className="text-3xl font-black text-emerald-400">{item.number}</span>
                                <p className="text-gray-500 text-[9px] mt-1">{item.lottery} - {item.draw_time}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filtro de fechas pasadas */}
            <div className="flex justify-end">
                <button
                    onClick={() => setShowFilter(!showFilter)}
                    className="text-gray-400 text-xs font-black uppercase tracking-widest flex items-center gap-2"
                >
                    📅 BUSCAR SORTEOS ANTIGUOS
                    <span className="text-emerald-400">{showFilter ? '▲' : '▼'}</span>
                </button>
            </div>

            {showFilter && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <input 
                            type="date" 
                            value={filterDate} 
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-black/40 border border-white/10 p-3 rounded-xl text-white font-black"
                        />
                        <div className="flex-1">
                            {filteredDrawsByDate.length === 0 ? (
                                <p className="text-gray-500 text-sm">No hay sorteos para esta fecha</p>
                            ) : (
                                <div className="space-y-2">
                                    {filteredDrawsByDate.map(draw => (
                                        <div key={draw.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                                            <div>
                                                <p className="text-white font-bold text-sm">{draw.lottery_type} - {draw.draw_time}</p>
                                                <p className="text-gray-500 text-[10px]">{formatDate(draw.draw_date)}</p>
                                            </div>
                                            <div>
                                                {draw.winning_number ? (
                                                    <span className="text-emerald-400 font-black text-xl">{draw.winning_number}</span>
                                                ) : (
                                                    <span className="text-gray-500 text-xs">Sin resultado</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Sección principal */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                {/* Columna izquierda - Registrar ganador */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="glass-panel p-6 md:p-8 bg-black/20 rounded-2xl">
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <select 
                                value={selectedDraw} 
                                onChange={(e) => {
                                    setSelectedDraw(e.target.value);
                                    setWinningNumber('');
                                }}
                                className="flex-1 bg-black/40 border border-white/10 p-4 rounded-xl text-white font-bold outline-none"
                            >
                                <option value="">Seleccionar sorteo...</option>
                                {actionableDraws.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.lottery_type} - {d.draw_time} ({formatDate(d.draw_date)})
                                    </option>
                                ))}
                            </select>
                            <input 
                                type="date" 
                                value={resultsDate} 
                                onChange={(e) => setResultsDate(e.target.value)}
                                className="bg-black/40 border border-white/10 p-4 rounded-xl text-white font-black"
                            />
                        </div>

                        <div className="flex flex-col items-center gap-6 py-8 bg-white/5 rounded-2xl border border-white/5">
                            <p className="font-black text-gray-500 uppercase tracking-widest text-xs">Ingresar Número Ganador</p>
                            <input 
                                type="text" 
                                maxLength={2} 
                                value={winningNumber}
                                onChange={(e) => setWinningNumber(e.target.value.replace(/\D/g, ''))}
                                placeholder="--"
                                className="text-7xl md:text-9xl font-black text-red-500 bg-transparent text-center outline-none leading-none placeholder:text-gray-800 w-40"
                            />
                            <button 
                                onClick={handleProcessDraw} 
                                disabled={processing || winningNumber.length !== 2 || !selectedDraw}
                                className="w-full max-w-md py-5 bg-gradient-to-r from-red-600 to-red-500 rounded-xl text-white font-black text-lg uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? 'PROCESANDO...' : 'LIQUIDAR PREMIOS'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Columna derecha - Sorteos pendientes del día */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5">
                        <h3 className="text-red-400 font-black uppercase text-xs tracking-widest mb-4">⚠️ Sorteos sin Ganador (Hoy)</h3>
                        <div className="space-y-3">
                            {pendingWinnerDraws.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-6">No hay sorteos pendientes para hoy</p>
                            ) : (
                                pendingWinnerDraws.map(d => (
                                    <div key={d.id} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex justify-between items-center">
                                        <div>
                                            <p className="text-white font-black text-sm">{d.lottery_type} • {d.draw_time}</p>
                                            <p className="text-[10px] text-gray-500">{formatDate(d.draw_date)}</p>
                                        </div>
                                        <button 
                                            onClick={() => { 
                                                setResultsDate(d.draw_date); 
                                                setSelectedDraw(d.id);
                                                setWinningNumber('');
                                            }} 
                                            className="text-[10px] font-black uppercase text-red-400 px-3 py-1 border border-red-400/30 rounded-lg"
                                        >
                                            Liquidar →
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}