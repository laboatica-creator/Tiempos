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
    const [selectedDrawId, setSelectedDrawId] = useState<string | null>(null);
    const [winningNumber, setWinningNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [currentTime, setCurrentTime] = useState('');
    const [searchDate, setSearchDate] = useState('');
    const [showDateSearch, setShowDateSearch] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [correctionReason, setCorrectionReason] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentDrawForAction, setCurrentDrawForAction] = useState<Draw | null>(null);
    const [isCorrection, setIsCorrection] = useState(false);

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

    const openWinnerModal = (draw: Draw) => {
        const esCorreccion = draw.winning_number !== null;
        setIsCorrection(esCorreccion);
        setCurrentDrawForAction(draw);
        setWinningNumber('');
        setAdminPassword('');
        setCorrectionReason('');
        
        if (esCorreccion) {
            setShowPasswordModal(true);
        } else {
            // Verificar si está fuera de horario (después de 1 hora)
            const ahora = new Date();
            const horaSorteo = new Date(`${draw.draw_date}T${draw.draw_time}:00`);
            const horaGracia = new Date(horaSorteo.getTime() + 60 * 60 * 1000);
            const fueraDeTiempo = ahora > horaGracia;
            
            if (fueraDeTiempo) {
                setShowPasswordModal(true);
            } else {
                // Dentro de horario, mostrar input de número directamente
                setSelectedDrawId(draw.id);
                setWinningNumber('');
            }
        }
    };

    const handleSetWinner = async () => {
        if (!currentDrawForAction) return;
        
        if (!winningNumber || winningNumber.length !== 2) {
            setMessage({ type: 'error', text: 'Ingrese un número de 2 dígitos (00-99)' });
            return;
        }

        setSubmitting(true);
        setMessage(null);

        try {
            const token = sessionStorage.getItem('token');
            const response = await api.post(`/admin/draws/set-winner/${currentDrawForAction.id}`, {
                winning_number: winningNumber,
                admin_password: adminPassword,
                is_correction: isCorrection,
                reason: correctionReason
            }, token);

            if (response.error) {
                setMessage({ type: 'error', text: response.error });
            } else {
                setMessage({ type: 'success', text: response.message || `✅ Número ganador ${winningNumber} registrado` });
                setWinningNumber('');
                setSelectedDrawId(null);
                setShowPasswordModal(false);
                setCurrentDrawForAction(null);
                setAdminPassword('');
                setCorrectionReason('');
                fetchDraws();
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Error al registrar el número' });
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

    const ticaDraws = draws.filter(d => d.lottery_type === 'TICA').sort((a, b) => a.draw_time.localeCompare(b.draw_time));
    const nicaDraws = draws.filter(d => d.lottery_type === 'NICA').sort((a, b) => a.draw_time.localeCompare(b.draw_time));

    const DrawCard = ({ draw }: { draw: Draw }) => {
        const isExpanded = selectedDrawId === draw.id;
        const hasWinner = draw.winning_number !== null;
        const isSettled = draw.is_settled;

        return (
            <div 
                className={`bg-white/5 border rounded-2xl p-4 transition-all relative overflow-hidden ${
                    hasWinner 
                        ? 'border-green-500/30 bg-green-500/5' 
                        : 'border-yellow-500/30 bg-yellow-500/5'
                }`}
            >
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                    <span className="text-8xl">
                        {draw.lottery_type === 'TICA' ? '🇨🇷' : '🇳🇮'}
                    </span>
                </div>

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <p className="text-white font-black text-lg">
                                {draw.lottery_type === 'TICA' ? '🇨🇷 TICA' : '🇳🇮 NICA'}
                            </p>
                            <p className="text-gray-400 text-sm font-bold">{draw.draw_time}</p>
                            <p className="text-gray-500 text-xs">{formatDrawDate(draw.draw_date)}</p>
                        </div>
                        {hasWinner && (
                            <div className="text-right">
                                <p className="text-emerald-400 text-2xl font-black">{draw.winning_number}</p>
                                <p className={`text-xs ${isSettled ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {isSettled ? 'Liquidado' : 'Por liquidar'}
                                </p>
                            </div>
                        )}
                        {!hasWinner && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
                                Pendiente
                            </span>
                        )}
                    </div>

                    {!hasWinner && !isExpanded && (
                        <button
                            onClick={() => openWinnerModal(draw)}
                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl text-white font-bold text-sm"
                        >
                            Ingresar Número Ganador
                        </button>
                    )}

                    {!hasWinner && isExpanded && (
                        <div className="space-y-3 mt-2">
                            <input
                                type="text"
                                maxLength={2}
                                value={winningNumber}
                                onChange={(e) => setWinningNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder="N° (00-99)"
                                className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white text-center text-2xl font-black"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedDrawId(null)}
                                    className="flex-1 py-2 bg-white/10 rounded-xl text-gray-400 text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        setCurrentDrawForAction(draw);
                                        handleSetWinner();
                                    }}
                                    disabled={submitting || !winningNumber}
                                    className="flex-1 py-2 bg-emerald-600 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                                >
                                    {submitting ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {hasWinner && (
                        <div className="flex gap-3 mt-3">
                            <button
                                onClick={() => openWinnerModal(draw)}
                                disabled={submitting}
                                className="flex-1 py-2 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 rounded-xl font-bold text-sm"
                            >
                                ✏️ Modificar
                            </button>
                            {!isSettled && (
                                <button
                                    onClick={() => handleLiquidate(draw)}
                                    disabled={submitting}
                                    className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl text-white font-bold text-sm"
                                >
                                    Liquidar Premios
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-[#0f172a]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
            <div className="max-w-6xl mx-auto">
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

                {message && (
                    <div className={`mb-6 p-4 rounded-2xl ${
                        message.type === 'success' 
                            ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' 
                            : 'bg-red-500/20 border border-red-500/50 text-red-400'
                    }`}>
                        {message.text}
                    </div>
                )}

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
                                        setSelectedDrawId(null);
                                    }
                                }}
                                className="w-full mt-3 py-3 bg-emerald-600 rounded-xl text-white font-bold"
                            >
                                Buscar
                            </button>
                        </div>
                    )}
                </div>

                <div className="text-center mb-6">
                    <p className="text-gray-400 text-sm">Mostrando sorteos del:</p>
                    <p className="text-white font-black text-2xl">{formatDrawDate(filterDate)}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                            <span className="text-3xl">🇨🇷</span>
                            <h2 className="text-white font-black text-xl uppercase">TICA</h2>
                            <span className="text-gray-500 text-sm ml-auto">{ticaDraws.length} sorteos</span>
                        </div>
                        <div className="space-y-4">
                            {ticaDraws.length === 0 ? (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                                    <p className="text-gray-400">No hay sorteos TICA para esta fecha</p>
                                </div>
                            ) : (
                                ticaDraws.map(draw => <DrawCard key={draw.id} draw={draw} />)
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                            <span className="text-3xl">🇳🇮</span>
                            <h2 className="text-white font-black text-xl uppercase">NICA</h2>
                            <span className="text-gray-500 text-sm ml-auto">{nicaDraws.length} sorteos</span>
                        </div>
                        <div className="space-y-4">
                            {nicaDraws.length === 0 ? (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                                    <p className="text-gray-400">No hay sorteos NICA para esta fecha</p>
                                </div>
                            ) : (
                                nicaDraws.map(draw => <DrawCard key={draw.id} draw={draw} />)
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-center mt-8 pt-4 border-t border-white/10">
                    <p className="text-gray-600 text-xs">© 2026 Tiempos Pro. Todos los derechos reservados.</p>
                </div>
            </div>

            {/* Modal para contraseña (corrección o fuera de horario) */}
            {showPasswordModal && currentDrawForAction && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-white font-black text-lg mb-4">
                            {isCorrection ? '✏️ Modificar Número Ganador' : '⚠️ Fuera de Horario'}
                        </h3>
                        <p className="text-gray-300 text-sm mb-4">
                            {isCorrection 
                                ? `Sorteo: ${currentDrawForAction.lottery_type} - ${currentDrawForAction.draw_time}\nNúmero actual: ${currentDrawForAction.winning_number}`
                                : `El horario de gracia (1 hora después del sorteo) ha expirado. Ingrese su contraseña de administrador.`
                            }
                        </p>
                        {isCorrection && (
                            <input
                                type="text"
                                placeholder="Motivo de la corrección"
                                value={correctionReason}
                                onChange={(e) => setCorrectionReason(e.target.value)}
                                className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white mb-3"
                            />
                        )}
                        <input
                            type="password"
                            placeholder="Contraseña de administrador"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white mb-4"
                            autoFocus
                        />
                        <input
                            type="text"
                            maxLength={2}
                            placeholder="Número ganador (00-99)"
                            value={winningNumber}
                            onChange={(e) => setWinningNumber(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white text-center text-2xl font-black mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setCurrentDrawForAction(null);
                                    setAdminPassword('');
                                    setWinningNumber('');
                                    setCorrectionReason('');
                                }}
                                className="flex-1 py-2 bg-white/10 rounded-xl text-gray-400"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSetWinner}
                                disabled={submitting || !winningNumber || !adminPassword || (isCorrection && !correctionReason)}
                                className="flex-1 py-2 bg-emerald-600 rounded-xl text-white font-bold disabled:opacity-50"
                            >
                                {submitting ? 'Procesando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}