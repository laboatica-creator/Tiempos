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

interface BetItem {
    number: string;
    amount: number;
}

const BET_AMOUNTS = [200, 500, 1000, 5000];

export default function BettingPage() {
    const [draws, setDraws] = useState<Draw[]>([]);
    const [selectedLottery, setSelectedLottery] = useState<'TICA' | 'NICA'>('TICA');
    const [selectedDrawId, setSelectedDrawId] = useState<string>('');
    const [balance, setBalance] = useState({ balance: 0, bonus_balance: 0 });
    const [betItems, setBetItems] = useState<BetItem[]>([]);
    const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
    const [selectedAmount, setSelectedAmount] = useState<number>(200);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>('');

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            setCurrentTime(getCurrentCostaRicaTime());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedLottery && draws.length > 0) {
            const lotteryDraws = draws.filter(d => d.lottery_type === selectedLottery);
            const dates = [...new Set(lotteryDraws.map(d => d.draw_date))].sort();
            setAvailableDates(dates);
            if (dates.length > 0 && !selectedDate) {
                setSelectedDate(dates[0]);
            }
        }
    }, [selectedLottery, draws]);

    useEffect(() => {
        if (selectedDate && selectedLottery) {
            const draw = draws.find(d => d.lottery_type === selectedLottery && d.draw_date === selectedDate);
            if (draw) {
                setSelectedDrawId(draw.id);
            }
        }
    }, [selectedDate, selectedLottery, draws]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            if (!token) return;
            
            const [drawsData, balanceData] = await Promise.all([
                api.get('/draws', token),
                api.get('/wallet/balance', token)
            ]);
            
            if (Array.isArray(drawsData)) {
                setDraws(drawsData.filter(d => d.status === 'OPEN'));
            }
            if (balanceData && !balanceData.error) {
                setBalance(balanceData);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNumberClick = (number: string) => {
        const newSelected = new Set(selectedNumbers);
        if (newSelected.has(number)) {
            newSelected.delete(number);
            setBetItems(betItems.filter(item => item.number !== number));
        } else {
            newSelected.add(number);
            setBetItems([...betItems, { number, amount: selectedAmount }]);
        }
        setSelectedNumbers(newSelected);
    };

    const handleAmountChangeForNumber = (number: string, amount: number) => {
        setBetItems(betItems.map(item => 
            item.number === number ? { ...item, amount } : item
        ));
    };

    const handleBatchAmountChange = (amount: number) => {
        setSelectedAmount(amount);
        const newBetItems = betItems.map(item => ({ ...item, amount }));
        setBetItems(newBetItems);
    };

    const clearSelection = () => {
        setSelectedNumbers(new Set());
        setBetItems([]);
    };

    const calculateTotal = () => {
        return betItems.reduce((sum, item) => sum + item.amount, 0);
    };

    const handleSubmit = async () => {
        if (!selectedDrawId) {
            alert('Seleccione un sorteo');
            return;
        }
        
        if (betItems.length === 0) {
            alert('Seleccione al menos un número');
            return;
        }
        
        const total = calculateTotal();
        if (total > balance.balance + balance.bonus_balance) {
            alert('Saldo insuficiente');
            return;
        }
        
        setSubmitting(true);
        try {
            const token = sessionStorage.getItem('token');
            const response = await api.post('/bets/place', {
                draw_id: selectedDrawId,
                bets: betItems.map(item => ({ number: item.number, amount: item.amount }))
            }, token);
            
            if (response.error) {
                alert(response.error);
            } else {
                alert(`✅ Apuesta realizada!\nTotal: ₡${total.toLocaleString()}`);
                clearSelection();
                fetchData();
            }
        } catch (err) {
            alert('Error al realizar la apuesta');
        } finally {
            setSubmitting(false);
        }
    };

    const currentDraw = draws.find(d => d.id === selectedDrawId);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-[#0f172a]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 pb-32">
            <div className="max-w-4xl mx-auto">
                {/* Header con saldo */}
                <div className="flex justify-between items-center mb-6 p-4 bg-white/5 rounded-2xl">
                    <div>
                        <p className="text-gray-400 text-xs">Saldo disponible</p>
                        <p className="text-white text-2xl font-black">₡{balance.balance.toLocaleString()}</p>
                    </div>
                    {balance.bonus_balance > 0 && (
                        <div className="text-right">
                            <p className="text-gray-400 text-xs">Bono</p>
                            <p className="text-emerald-400 text-xl font-black">₡{balance.bonus_balance.toLocaleString()}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-gray-400 text-xs">Hora CR</p>
                        <p className="text-emerald-400 text-sm font-black">{currentTime}</p>
                    </div>
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

                {/* Selector de fecha (próximos 7 días) */}
                {availableDates.length > 0 && (
                    <div className="mb-6">
                        <label className="block text-xs font-black text-gray-400 uppercase mb-2">Fecha del sorteo</label>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {availableDates.map(date => (
                                <button
                                    key={date}
                                    onClick={() => setSelectedDate(date)}
                                    className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                                        selectedDate === date
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-white/5 text-gray-400 border border-white/10'
                                    }`}
                                >
                                    {formatDrawDate(date)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Información del sorteo seleccionado */}
                {currentDraw && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                        <p className="text-gray-400 text-xs">Sorteo seleccionado</p>
                        <p className="text-white font-bold">
                            {currentDraw.lottery_type} - {formatDrawDate(currentDraw.draw_date)} {currentDraw.draw_time}
                        </p>
                    </div>
                )}

                {/* Parrilla de números 00-99 */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-white font-black uppercase text-sm">Selecciona números (00-99)</h2>
                        <button
                            onClick={clearSelection}
                            className="text-red-400 text-xs font-black uppercase"
                        >
                            Limpiar todo
                        </button>
                    </div>
                    <div className="grid grid-cols-10 gap-1">
                        {Array.from({ length: 100 }, (_, i) => {
                            const num = i.toString().padStart(2, '0');
                            const isSelected = selectedNumbers.has(num);
                            return (
                                <button
                                    key={num}
                                    onClick={() => handleNumberClick(num)}
                                    className={`aspect-square rounded-lg text-sm font-black transition-all ${
                                        isSelected
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-black/40 text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    {num}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Montos predefinidos */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                    <h2 className="text-white font-black uppercase text-sm mb-3">Monto por número</h2>
                    <div className="flex gap-3 mb-4">
                        {BET_AMOUNTS.map(amount => (
                            <button
                                key={amount}
                                onClick={() => handleBatchAmountChange(amount)}
                                className={`flex-1 py-3 rounded-xl font-black transition-all ${
                                    selectedAmount === amount
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white/5 text-gray-400 border border-white/10'
                                }`}
                            >
                                ₡{amount.toLocaleString()}
                            </button>
                        ))}
                    </div>
                    
                    {/* Lista de números seleccionados con montos individuales */}
                    {betItems.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-gray-400 text-xs mb-2">Números seleccionados:</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {betItems.map(item => (
                                    <div key={item.number} className="flex justify-between items-center bg-black/40 p-2 rounded-lg">
                                        <span className="text-white font-black text-lg">{item.number}</span>
                                        <div className="flex gap-2">
                                            {BET_AMOUNTS.map(amount => (
                                                <button
                                                    key={amount}
                                                    onClick={() => handleAmountChangeForNumber(item.number, amount)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                                                        item.amount === amount
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-white/10 text-gray-400'
                                                    }`}
                                                >
                                                    ₡{amount}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                                <span className="text-white font-bold">Total:</span>
                                <span className="text-emerald-400 font-black text-xl">₡{calculateTotal().toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Botón de confirmar apuesta */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting || betItems.length === 0}
                    className="w-full py-6 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl text-white font-black text-xl uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? 'PROCESANDO...' : `CONFIRMAR APUESTA - ₡${calculateTotal().toLocaleString()}`}
                </button>
            </div>
        </main>
    );
}