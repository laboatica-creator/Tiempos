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

interface CartItem {
    draw_id: string;
    draw_info: string;
    numbers: string[];
    amount: number;
}

const BET_AMOUNTS = [200, 500, 1000, 5000];

export default function BettingPage() {
    const [draws, setDraws] = useState<Draw[]>([]);
    const [selectedLottery, setSelectedLottery] = useState<'TICA' | 'NICA'>('TICA');
    const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null);
    const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
    const [selectedAmount, setSelectedAmount] = useState<number>(200);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [balance, setBalance] = useState({ balance: 0, bonus_balance: 0 });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const [showNumberGrid, setShowNumberGrid] = useState(false);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            setCurrentTime(getCurrentCostaRicaTime());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Resetear selección cuando cambia la lotería
        setSelectedDraw(null);
        setShowNumberGrid(false);
        setSelectedNumbers(new Set());
    }, [selectedLottery]);

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
                setDraws(drawsData);
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

    const handleDrawClick = (draw: Draw) => {
        setSelectedDraw(draw);
        setShowNumberGrid(true);
        setSelectedNumbers(new Set());
    };

    const handleNumberClick = (number: string) => {
        const newSelected = new Set(selectedNumbers);
        if (newSelected.has(number)) {
            newSelected.delete(number);
        } else {
            newSelected.add(number);
        }
        setSelectedNumbers(newSelected);
    };

    const clearSelection = () => {
        setSelectedNumbers(new Set());
    };

    const handleAddToCart = () => {
        if (!selectedDraw) return;
        if (selectedNumbers.size === 0) {
            alert('Seleccione al menos un número');
            return;
        }
        
        const newItem: CartItem = {
            draw_id: selectedDraw.id,
            draw_info: `${selectedDraw.lottery_type} - ${formatDrawDate(selectedDraw.draw_date)} ${selectedDraw.draw_time}`,
            numbers: Array.from(selectedNumbers),
            amount: selectedAmount
        };
        
        setCart([...cart, newItem]);
        setSelectedNumbers(new Set());
        alert(`Agregado: ${selectedNumbers.size} número(s) por ₡${selectedAmount} c/u`);
    };

    const removeFromCart = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const calculateCartTotal = () => {
        return cart.reduce((sum, item) => sum + (item.numbers.length * item.amount), 0);
    };

    const handleConfirmBet = async () => {
        if (cart.length === 0) {
            alert('No hay jugadas en el carrito');
            return;
        }
        
        const total = calculateCartTotal();
        if (total > balance.balance + balance.bonus_balance) {
            alert('Saldo insuficiente');
            return;
        }
        
        setSubmitting(true);
        try {
            const token = sessionStorage.getItem('token');
            
            // Agrupar apuestas por sorteo
            const groupedByDraw: { [key: string]: { draw_id: string; bets: { number: string; amount: number }[] } } = {};
            
            cart.forEach(item => {
                if (!groupedByDraw[item.draw_id]) {
                    groupedByDraw[item.draw_id] = {
                        draw_id: item.draw_id,
                        bets: []
                    };
                }
                item.numbers.forEach(number => {
                    groupedByDraw[item.draw_id].bets.push({ number, amount: item.amount });
                });
            });
            
            for (const drawId of Object.keys(groupedByDraw)) {
                const { bets } = groupedByDraw[drawId];
                const response = await api.post('/bets/place', {
                    draw_id: drawId,
                    bets
                }, token);
                
                if (response.error) {
                    alert(`Error: ${response.error}`);
                    return;
                }
            }
            
            alert(`✅ Apuesta realizada!\nTotal: ₡${total.toLocaleString()}`);
            setCart([]);
            setSelectedDraw(null);
            setShowNumberGrid(false);
            setSelectedNumbers(new Set());
            fetchData();
        } catch (err) {
            alert('Error al realizar la apuesta');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredDraws = draws.filter(d => 
        d.lottery_type === selectedLottery && 
        (d.status === 'OPEN' || d.status === 'CLOSED')
    );

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
                {/* Header con saldo y hora */}
                <div className="flex justify-between items-center mb-6 p-4 bg-white/5 rounded-2xl">
                    <div>
                        <p className="text-gray-400 text-xs">Saldo disponible</p>
                        <p className="text-white text-2xl font-black">₡{balance.balance.toLocaleString()}</p>
                        {balance.bonus_balance > 0 && (
                            <p className="text-emerald-400 text-xs">Bono: ₡{balance.bonus_balance.toLocaleString()}</p>
                        )}
                    </div>
                    <div className="text-right">
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

                {/* Lista de sorteos disponibles */}
                {!showNumberGrid && (
                    <div className="space-y-3 mb-6">
                        <p className="text-gray-400 text-xs mb-2">Sorteos disponibles</p>
                        {filteredDraws.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                                <p className="text-gray-400">No hay sorteos disponibles de {selectedLottery}</p>
                            </div>
                        ) : (
                            filteredDraws.map(draw => (
                                <button
                                    key={draw.id}
                                    onClick={() => handleDrawClick(draw)}
                                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:bg-white/10 transition-all"
                                >
                                    <p className="text-white font-bold">{draw.lottery_type}</p>
                                    <p className="text-gray-400 text-sm">
                                        {formatDrawDate(draw.draw_date)} - {draw.draw_time}
                                    </p>
                                    <p className={`text-xs mt-1 ${draw.status === 'OPEN' ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {draw.status === 'OPEN' ? '🟢 Abierto' : '🔵 Cerrado'}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                )}

                {/* Grid de números (aparece solo cuando se selecciona un sorteo) */}
                {showNumberGrid && selectedDraw && (
                    <>
                        {/* Información del sorteo seleccionado */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                            <p className="text-gray-400 text-xs">Sorteo seleccionado</p>
                            <p className="text-white font-bold">
                                {selectedDraw.lottery_type} - {formatDrawDate(selectedDraw.draw_date)} {selectedDraw.draw_time}
                            </p>
                        </div>

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

                        {/* Montos por número */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                            <p className="text-gray-400 text-xs mb-3">Monto por número</p>
                            <div className="flex gap-3">
                                {BET_AMOUNTS.map(amount => (
                                    <button
                                        key={amount}
                                        onClick={() => setSelectedAmount(amount)}
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
                        </div>

                        {/* Botón Agregar jugada */}
                        <button
                            onClick={handleAddToCart}
                            disabled={selectedNumbers.size === 0}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl text-white font-black text-lg uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed mb-6"
                        >
                            + AGREGAR JUGADA ({selectedNumbers.size} números - ₡{(selectedNumbers.size * selectedAmount).toLocaleString()})
                        </button>

                        {/* Botón para volver a la lista de sorteos */}
                        <button
                            onClick={() => {
                                setShowNumberGrid(false);
                                setSelectedNumbers(new Set());
                            }}
                            className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 font-black text-sm uppercase tracking-wider mb-6"
                        >
                            ← CAMBIAR SORTEO
                        </button>
                    </>
                )}

                {/* Carrito de jugadas */}
                {cart.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                        <h2 className="text-white font-black uppercase text-sm mb-3">📋 Mis jugadas ({cart.length})</h2>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {cart.map((item, idx) => (
                                <div key={idx} className="bg-black/40 rounded-xl p-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="text-white text-xs font-bold">{item.draw_info}</p>
                                            <p className="text-gray-400 text-[10px] mt-1">
                                                Números: {item.numbers.join(', ')}
                                            </p>
                                            <p className="text-emerald-400 text-xs font-black mt-1">
                                                ₡{item.amount} c/u - Total: ₡{(item.numbers.length * item.amount).toLocaleString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(idx)}
                                            className="text-red-500 text-xs font-black uppercase px-2"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                            <span className="text-white font-bold">Total apuesta:</span>
                            <span className="text-emerald-400 font-black text-xl">₡{calculateCartTotal().toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {/* Botón confirmar apuesta */}
                {cart.length > 0 && (
                    <button
                        onClick={handleConfirmBet}
                        disabled={submitting}
                        className="w-full py-6 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl text-white font-black text-xl uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'PROCESANDO...' : `CONFIRMAR APUESTA - ₡${calculateCartTotal().toLocaleString()}`}
                    </button>
                )}
            </div>
        </main>
    );
}