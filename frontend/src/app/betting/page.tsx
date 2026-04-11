'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatDrawDate, getCurrentCostaRicaTime } from '../../lib/dateUtils';

interface Draw {
    id: string;
    lottery_type: string;
    draw_date: string;
    draw_time: string;
    status: string;
}

export default function BettingPage() {
    const [allDraws, setAllDraws] = useState<Draw[]>([]);
    const [selectedLottery, setSelectedLottery] = useState<'TICA' | 'NICA'>('TICA');
    const [selectedDraw, setSelectedDraw] = useState<string>('');
    const [numbers, setNumbers] = useState<{ number: string; amount: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentTime, setCurrentTime] = useState('');

    // Cargar todos los sorteos al iniciar
    useEffect(() => {
        fetchDraws();
        const interval = setInterval(() => {
            setCurrentTime(getCurrentCostaRicaTime());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Cuando cambia la lotería seleccionada, actualizar el sorteo seleccionado
    useEffect(() => {
        const drawsForLottery = allDraws.filter(d => d.lottery_type === selectedLottery);
        if (drawsForLottery.length > 0) {
            setSelectedDraw(drawsForLottery[0].id);
        } else {
            setSelectedDraw('');
        }
    }, [selectedLottery, allDraws]);

    const fetchDraws = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const data = await api.get('/draws', token);
            if (Array.isArray(data)) {
                // Filtrar solo sorteos OPEN
                const openDraws = data.filter((d: Draw) => d.status === 'OPEN');
                setAllDraws(openDraws);
            }
        } catch (err) {
            console.error('Error fetching draws:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNumber = () => {
        if (numbers.length >= 10) {
            alert('Máximo 10 números por apuesta');
            return;
        }
        setNumbers([...numbers, { number: '', amount: 200 }]);
    };

    const handleRemoveNumber = (index: number) => {
        const newNumbers = [...numbers];
        newNumbers.splice(index, 1);
        setNumbers(newNumbers);
    };

    const handleNumberChange = (index: number, value: string) => {
        const newNumbers = [...numbers];
        newNumbers[index].number = value.slice(0, 2);
        setNumbers(newNumbers);
    };

    const handleAmountChange = (index: number, value: string) => {
        const newNumbers = [...numbers];
        newNumbers[index].amount = parseInt(value) || 0;
        setNumbers(newNumbers);
    };

    const calculateTotal = () => {
        return numbers.reduce((sum, n) => sum + (n.amount || 0), 0);
    };

    const handleSubmit = async () => {
        if (!selectedDraw) {
            alert('Seleccione un sorteo');
            return;
        }
        
        const validNumbers = numbers.filter(n => n.number && n.number.length === 2 && n.amount >= 200);
        if (validNumbers.length === 0) {
            alert('Agregue al menos un número válido (2 dígitos, monto mínimo ₡200)');
            return;
        }
        
        setSubmitting(true);
        try {
            const token = sessionStorage.getItem('token');
            const response = await api.post('/bets/place', {
                draw_id: selectedDraw,
                bets: validNumbers.map(n => ({ number: n.number, amount: n.amount }))
            }, token);
            
            if (response.error) {
                alert(response.error);
            } else {
                alert(`✅ Apuesta realizada exitosamente!\nTotal: ₡${calculateTotal().toLocaleString()}`);
                setNumbers([]);
                fetchDraws();
            }
        } catch (err) {
            console.error('Error placing bet:', err);
            alert('Error al realizar la apuesta');
        } finally {
            setSubmitting(false);
        }
    };

    // Obtener los sorteos filtrados por la lotería seleccionada
    const filteredDraws = allDraws.filter(d => d.lottery_type === selectedLottery);
    const selectedDrawObj = allDraws.find(d => d.id === selectedDraw);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-[#0f172a]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 pb-32">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-black text-white uppercase italic">🎲 Apostar</h1>
                    <p className="text-emerald-400 text-xs uppercase tracking-widest mt-1">
                        Hora Costa Rica: {currentTime}
                    </p>
                </div>

                {/* Botones TICA / NICA */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setSelectedLottery('TICA')}
                        className={`flex-1 py-4 rounded-2xl font-black text-xl uppercase transition-all ${
                            selectedLottery === 'TICA'
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg'
                                : 'bg-white/5 text-gray-400 border border-white/10'
                        }`}
                    >
                        🎰 TICA
                    </button>
                    <button
                        onClick={() => setSelectedLottery('NICA')}
                        className={`flex-1 py-4 rounded-2xl font-black text-xl uppercase transition-all ${
                            selectedLottery === 'NICA'
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg'
                                : 'bg-white/5 text-gray-400 border border-white/10'
                        }`}
                    >
                        🎲 NICA
                    </button>
                </div>

                {/* Mostrar cantidad de sorteos encontrados */}
                <div className="text-center mb-4">
                    <p className="text-gray-500 text-xs">
                        {filteredDraws.length} {filteredDraws.length === 1 ? 'sorteo disponible' : 'sorteos disponibles'} de {selectedLottery}
                    </p>
                </div>

                {filteredDraws.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                        <p className="text-gray-400">No hay sorteos abiertos de {selectedLottery}</p>
                        <p className="text-gray-500 text-xs mt-2">Los sorteos se generan automáticamente</p>
                    </div>
                ) : (
                    <>
                        {/* Selector de sorteo */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2">Seleccionar sorteo</label>
                            <select
                                value={selectedDraw}
                                onChange={(e) => setSelectedDraw(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none"
                            >
                                {filteredDraws.map(draw => (
                                    <option key={draw.id} value={draw.id}>
                                        {formatDrawDate(draw.draw_date)} - {draw.draw_time}
                                    </option>
                                ))}
                            </select>
                            
                            {selectedDrawObj && (
                                <div className="mt-4 p-3 bg-white/5 rounded-xl">
                                    <p className="text-gray-400 text-xs">📅 Fecha: {formatDrawDate(selectedDrawObj.draw_date)}</p>
                                    <p className="text-gray-400 text-xs">⏰ Hora: {selectedDrawObj.draw_time}</p>
                                </div>
                            )}
                        </div>

                        {/* Números y montos */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-white font-black uppercase text-sm">Números (00-99)</h2>
                                <button
                                    onClick={handleAddNumber}
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase"
                                >
                                    + Agregar número
                                </button>
                            </div>
                            
                            {numbers.length === 0 ? (
                                <p className="text-gray-500 text-center py-8 text-sm">
                                    Agrega números del 00 al 99 (mínimo ₡200 por número)
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {numbers.map((item, idx) => (
                                        <div key={idx} className="flex gap-3 items-center">
                                            <input
                                                type="text"
                                                maxLength={2}
                                                value={item.number}
                                                onChange={(e) => handleNumberChange(idx, e.target.value)}
                                                placeholder="00"
                                                className="w-20 bg-black/40 border border-white/10 rounded-xl p-3 text-white text-center font-black text-xl outline-none"
                                            />
                                            <input
                                                type="number"
                                                value={item.amount || ''}
                                                onChange={(e) => handleAmountChange(idx, e.target.value)}
                                                placeholder="Monto"
                                                className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none"
                                            />
                                            <button
                                                onClick={() => handleRemoveNumber(idx)}
                                                className="bg-red-500/20 text-red-500 w-10 h-10 rounded-xl font-black"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {numbers.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-gray-400 text-sm">Total:</span>
                                    <span className="text-emerald-400 font-black text-xl">₡{calculateTotal().toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting || numbers.length === 0}
                            className="w-full py-6 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl text-white font-black text-xl uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'PROCESANDO...' : `APOSTAR ₡${calculateTotal().toLocaleString()}`}
                        </button>
                    </>
                )}
            </div>
        </main>
    );
}