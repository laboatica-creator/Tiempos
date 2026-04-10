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
    const [suggestions, setSuggestions] = useState<{ number: string | null, waiting: boolean, message: string }>({ number: null, waiting: false, message: '' });
    const drawsRef = useRef<Draw[]>([]);

    useEffect(() => { drawsRef.current = draws; }, [draws]);

    useEffect(() => {
        setIsMounted(true);
        fetchDraws();
        const interval = setInterval(() => updateClosestDraw(), 1000);
        return () => clearInterval(interval);
    }, []);

    // Buscar sugerencias cuando cambia el sorteo seleccionado
    useEffect(() => {
        if (selectedDraw) {
            fetchSuggestions();
        }
    }, [selectedDraw]);

    const fetchDraws = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const data = await api.get('/draws', token);
            if (Array.isArray(data)) {
                setDraws(data);
                const actionable = data.find((d: Draw) => d.status === 'OPEN' || d.status === 'CLOSED');
                if (actionable) setSelectedDraw(actionable.id);
            }
        } catch (err) { console.error(err); }
    };

    const fetchSuggestions = async () => {
        try {
            const token = sessionStorage.getItem('token');
            if (!selectedDraw) return;
            
            console.log('[FRONTEND] Buscando sugerencias para drawId:', selectedDraw);
            const data = await api.get(`/draws/suggestions?drawId=${selectedDraw}`, token);
            console.log('[FRONTEND] Sugerencias recibidas:', data);
            
            if (data && !data.error) {
                setSuggestions({
                    number: data.number || null,
                    waiting: data.waiting || false,
                    message: data.message || ''
                });
            }
        } catch (err) { 
            console.error('Error fetching suggestions:', err); 
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
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, []);

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
                    fetchSuggestions();
                }
            } catch (err) { alert('Error al procesar.'); }
            finally { setProcessing(false); }
        }
    };

    const useSuggestion = () => {
        if (suggestions.number) {
            setWinningNumber(suggestions.number);
        }
    };

    if (!isMounted) return null;

    const pendingWinnerDraws = draws.filter(d => d.status === 'CLOSED' && !d.winning_number);
    const actionableDraws = draws.filter(d => {
        const dDate = new Date(d.draw_date).toLocaleDateString('en-CA');
        return dDate === resultsDate && (d.status === 'OPEN' || d.status === 'CLOSED');
    });

    // Obtener el sorteo seleccionado con todos sus datos
    const selectedDrawObj = draws.find(d => d.id === selectedDraw);

    return (
        <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-10 pb-20">
            <header className="bg-[#1e293b] p-8 md:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter">Resultados</h1>
                    <p className="text-emerald-400 font-bold uppercase text-[10px] tracking-[0.4em]">Liquidaci&oacute;n de Sorteos</p>
                </div>
            </header>

            {/* 🔥 SECCIÓN DE SUGERENCIAS CON INFORMACIÓN COMPLETA DEL SORTEO */}
            <section className="grid grid-cols-1 gap-4">
                {suggestions.waiting ? (
                    <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl text-center">
                        <p className="text-amber-400 font-black text-sm uppercase">⏳ {suggestions.message}</p>
                    </div>
                ) : suggestions.number ? (
                    <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl">
                        <div className="flex justify-between items-start flex-wrap gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                                        🔥 SUGERENCIA PARA {selectedDrawObj?.lottery_type || 'SORTEO'}
                                    </p>
                                    {selectedDrawObj && (
                                        <div className="flex gap-3 text-[9px] text-gray-400">
                                            <span>📅 {new Date(selectedDrawObj.draw_date).toLocaleDateString('es-CR')}</span>
                                            <span>⏰ {selectedDrawObj.draw_time}</span>
                                            <span className={selectedDrawObj.status === 'OPEN' ? 'text-green-400' : 'text-yellow-400'}>
                                                {selectedDrawObj.status === 'OPEN' ? '🟢 ABIERTO' : '🔵 CERRADO'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-white text-3xl md:text-4xl font-black italic mt-3">
                                    Número sugerido: <span className="text-emerald-400">{suggestions.number}</span>
                                </p>
                                {suggestions.message && (
                                    <p className="text-gray-500 text-[9px] mt-2">{suggestions.message}</p>
                                )}
                                <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[9px] text-yellow-500/70">
                                    ⚠️ Verifique que este número corresponda al sorteo de {selectedDrawObj?.lottery_type} a las {selectedDrawObj?.draw_time}
                                </div>
                            </div>
                            <button 
                                onClick={useSuggestion} 
                                className="px-6 py-3 bg-emerald-500 text-white font-black rounded-2xl hover:scale-105 transition-all whitespace-nowrap"
                            >
                                USAR NÚMERO
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 bg-gray-500/10 border border-gray-500/20 rounded-3xl text-center">
                        <p className="text-gray-400 font-black text-sm">🔍 No hay sugerencia disponible para este sorteo</p>
                        <p className="text-gray-500 text-[8px] mt-1">
                            {selectedDrawObj 
                                ? `Los resultados para ${selectedDrawObj.lottery_type} a las ${selectedDrawObj.draw_time} estarán disponibles 2 minutos después del sorteo`
                                : 'Seleccione un sorteo para obtener sugerencias automáticas'}
                        </p>
                    </div>
                )}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
                {/* Selector y Registro */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="glass-panel p-6 md:p-10 bg-black/20">
                        <div className="flex flex-col md:flex-row gap-4 mb-8">
                            <select 
                                value={selectedDraw} 
                                onChange={(e) => {
                                    setSelectedDraw(e.target.value);
                                    setWinningNumber('');
                                }}
                                className="flex-1 bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none"
                            >
                                <option value="">Seleccionar sorteo...</option>
                                {actionableDraws.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.lottery_type} - {d.draw_time} ({new Date(d.draw_date).toLocaleDateString()})
                                    </option>
                                ))}
                            </select>
                            <input 
                                type="date" value={resultsDate} onChange={(e) => setResultsDate(e.target.value)}
                                className="bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black"
                            />
                        </div>

                        <div className="flex flex-col items-center gap-8 py-10 bg-white/5 rounded-[3rem] border border-white/5">
                            <p className="font-black text-gray-500 uppercase tracking-widest">Ingresar N&uacute;mero Ganador</p>
                            <input 
                                type="text" maxLength={2} value={winningNumber}
                                onChange={(e) => setWinningNumber(e.target.value.replace(/\D/g, ''))}
                                placeholder="--"
                                className="text-8xl md:text-[12rem] font-black text-red-500 bg-transparent text-center outline-none leading-none placeholder:text-gray-900"
                            />
                            <button 
                                onClick={handleProcessDraw} disabled={processing || winningNumber.length !== 2 || !selectedDraw}
                                className="w-full max-w-md py-6 bg-gradient-to-r from-red-600 to-red-500 rounded-[2rem] text-white font-black text-xl hover:scale-105 transition-all active:scale-95 disabled:opacity-20"
                            >
                                {processing ? 'PROCESANDO...' : 'LIQUIDAR PREMIOS'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Pendientes */}
                <div className="lg:col-span-4 space-y-6">
                    <h3 className="text-white font-black uppercase text-xs tracking-widest">Sorteos sin Ganador</h3>
                    <div className="space-y-4">
                        {pendingWinnerDraws.map(d => (
                            <div key={d.id} className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl flex justify-between items-center">
                                <div>
                                    <p className="text-white font-black text-xs">{d.lottery_type} • {d.draw_time}</p>
                                    <p className="text-[10px] text-gray-500">{new Date(d.draw_date).toLocaleDateString()}</p>
                                </div>
                                <button 
                                    onClick={() => { 
                                        setResultsDate(new Date(d.draw_date).toLocaleDateString('en-CA')); 
                                        setSelectedDraw(d.id);
                                        setWinningNumber('');
                                    }} 
                                    className="text-[10px] font-black uppercase text-red-400"
                                >
                                    Liquidar &rarr;
                                </button>
                            </div>
                        ))}
                        {pendingWinnerDraws.length === 0 && (
                            <div className="p-5 bg-white/5 rounded-2xl text-center">
                                <p className="text-gray-500 text-xs">No hay sorteos pendientes</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}