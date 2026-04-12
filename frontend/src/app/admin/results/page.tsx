'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { formatDrawDate, getCurrentCostaRicaTime } from '../../../lib/dateUtils';

interface Draw {
    id: string;
    lottery_type: string;
    draw_date: string;
    draw_time: string;
    status: string;
    winning_number: string | null;
    is_settled: boolean;
}

export default function AdminResultsPage() {
    const [draws, setDraws] = useState<Draw[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null);
    const [winningNumber, setWinningNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [currentTime, setCurrentTime] = useState('');
    const [searchDate, setSearchDate] = useState('');
    const [showDateSearch, setShowDateSearch] = useState(false);

    // Obtener fecha actual en Costa Rica para el filtro inicial
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    const [filterDate, setFilterDate] = useState(today);

    useEffect(() => {
        fetchDraws();
        const interval = setInterval(() => {
            setCurrentTime(getCurrentCostaRicaTime());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchDraws();
    }, [filterDate]);

    const fetchDraws = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await api.get('/draws', token);
            
            if (Array.isArray(response)) {
                // Filtrar sorteos por la fecha seleccionada
                const filtered = response.filter((draw: Draw) => draw.draw_date === filterDate);
                setDraws(filtered);
            } else if (response.error) {
                setMessage({ type: 'error', text: response.error });
            }
        } catch (err) {
            console.error('Error fetching draws:', err);
            setMessage({ type: 'error', text: 'Error al cargar los sorteos' });
        } finally {
            setLoading(false);
        }
    };

    const handleSetWinner = async () => {
        if (!selectedDraw) {
            setMessage({ type: 'error', text: 'Seleccione un sorteo primero' });
            return;
        }

        if (!winningNumber || winningNumber.length !== 2) {
            setMessage({ type: 'error', text: 'Ingrese un número de 2 dígitos (00-99)' });
            return;
        }

        setSubmitting(true);
        setMessage(null);

        try {
            const token = sessionStorage.getItem('token');
            const response = await api.post('/admin/draws/set-winner', {
                draw_id: selectedDraw.id,
                winning_number: winningNumber
            }, token);

            if (response.error) {
                setMessage({ type: 'error', text: response.error });
            } else {
                setMessage({ type: 'success', text: `✅ Número ganador ${winningNumber} registrado para ${selectedDraw.lottery_type} - ${selectedDraw.draw_time}` });
                setWinningNumber('');
                setSelectedDraw(null);
                fetchDraws(); // Recargar lista
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Error al registrar el número ganador' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleLiquidate = async (draw: Draw) => {
        if (!draw.winning_number) {
            setMessage({ type: 'error', text: 'Este sorteo no tiene número ganador aún' });
            return;
        }

        if (draw.is_settled) {
            setMessage({ type: 'error', text: 'Este sorteo ya fue liquidado' });
            return;
        }

        setSubmitting(true);
        setMessage(null);

        try {
            const token = sessionStorage.getItem('token');
            const response = await api.post('/admin/draws/liquidate', {
                draw_id: draw.id
            }, token);

            if (response.error) {
                setMessage({ type: 'error', text: response.error });
            } else {
                setMessage({ type: 'success', text: `🎉 Sorteo liquidado correctamente. Premios distribuidos.` });
                fetchDraws();
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Error al liquidar el sorteo' });
        } finally {
            setSubmitting(false);
        }
    };

    const pendingDraws = draws.filter(d => !d.winning_number && d.draw_date === filterDate);
    const settledDraws = draws.filter(d => d.winning_number);

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header con hora */}
                <div className="flex justify-between items-center mb-6 p-4 bg-white/5 rounded-2xl">
                    <div>
                        <h1 className="text-white text-2xl font-black">🎰 Liquidación de Sorteos</h1>
                        <p className="text-gray-400 text-xs">Registro de números ganadores</p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 text-xs">Hora CR</p>
                        <p className="text-emerald-400 text-sm font-black">{currentTime}</p>
                    </div>
                </div>

                {/* Mensajes */}
                {message && (
                    <div className={`mb-6 p-4 rounded-2xl ${
                        message.type === 'success' 
                            ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' 
                            : 'bg-red-500/20 border border-red-500/50 text-red-400'
                    }`}>
                        {message.text}
                    </div>
                )}

                {/* Selector de fecha */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                    <button
                        onClick={() => setShowDateSearch(!showDateSearch)}
                        className="w-full flex justify-between items-center text-white font-bold"
                    >
                        <span>📅 BUSCAR SORTEOS ANTIGUOS</span>
                        <span className="text-gray-400">{showDateSearch ? '▲' : '▼'}</span>
                    </button>
                    
                    {showDateSearch && (
                        <div className="mt-4">
                            <input
                                type="date"
                                value={searchDate}
                                onChange={(e) => setSearchDate(e.target.value)}
                                className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white"
                            />
                            <button
                                onClick={() => {
                                    if (searchDate) {
                                        setFilterDate(searchDate);
                                        setShowDateSearch(false);
                                    }
                                }}
                                className="w-full mt-3 py-3 bg-emerald-600 rounded-xl text-white font-bold"
                            >
                                Buscar
                            </button>
                        </div>
                    )}
                </div>

                {/* Fecha actual mostrada */}
                <div className="text-center mb-4">
                    <p className="text-gray-400 text-sm">Mostrando sorteos del:</p>
                    <p className="text-white font-black text-xl">{formatDrawDate(filterDate)}</p>
                </div>

                {/* Sorteos pendientes (sin ganador) */}
                <div className="mb-8">
                    <h2 className="text-white font-black uppercase text-sm mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        Sorteos Pendientes ({pendingDraws.length})
                    </h2>
                    
                    {pendingDraws.length === 0 ? (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                            <p className="text-emerald-400">✅ Todos los sorteos tienen número ganador</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingDraws.map(draw => (
                                <div key={draw.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <div>
                                            <p className="text-white font-bold">{draw.lottery_type}</p>
                                            <p className="text-gray-400 text-sm">{draw.draw_time}</p>
                                        </div>
                                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
                                            Sin ganador
                                        </span>
                                    </div>
                                    
                                    {selectedDraw?.id === draw.id ? (
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                maxLength={2}
                                                value={winningNumber}
                                                onChange={(e) => setWinningNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                                placeholder="Número ganador (00-99)"
                                                className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white text-center text-2xl font-black"
                                            />
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setSelectedDraw(null)}
                                                    className="flex-1 py-2 bg-white/10 rounded-xl text-gray-400"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleSetWinner}
                                                    disabled={submitting || !winningNumber}
                                                    className="flex-1 py-2 bg-emerald-600 rounded-xl text-white font-bold disabled:opacity-50"
                                                >
                                                    {submitting ? 'Guardando...' : 'Guardar Ganador'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setSelectedDraw(draw);
                                                setWinningNumber('');
                                            }}
                                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl text-white font-bold"
                                        >
                                            Ingresar Número Ganador
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sorteos ya liquidados (con ganador) */}
                {settledDraws.length > 0 && (
                    <div>
                        <h2 className="text-white font-black uppercase text-sm mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Sorteos Liquidados ({settledDraws.length})
                        </h2>
                        
                        <div className="space-y-3">
                            {settledDraws.map(draw => (
                                <div key={draw.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-white font-bold">{draw.lottery_type} - {draw.draw_time}</p>
                                            <p className="text-emerald-400 text-2xl font-black mt-1">
                                                {draw.winning_number}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs px-3 py-1 rounded-full ${
                                                draw.is_settled 
                                                    ? 'bg-green-500/20 text-green-400' 
                                                    : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                                {draw.is_settled ? '✅ Liquidado' : '⚠️ Por liquidar'}
                                            </span>
                                            {!draw.is_settled && draw.winning_number && (
                                                <button
                                                    onClick={() => handleLiquidate(draw)}
                                                    disabled={submitting}
                                                    className="block mt-2 text-xs text-emerald-400 font-bold"
                                                >
                                                    Liquidar premios →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center mt-8 pt-4 border-t border-white/10">
                    <p className="text-gray-600 text-xs">© 2026 Tiempos Pro. Todos los derechos reservados.</p>
                </div>
            </div>
        </main>
    );
}