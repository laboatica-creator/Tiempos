'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDrawDate, getCurrentCostaRicaTime } from '@/lib/dateUtils';

interface Draw {
    id: string;
    lottery_type: string;
    draw_date: string;
    draw_time: string;
    status: string;
}

interface BetLine {
    number: string;
    amount: string;
}

export default function BettingPage() {
    const router = useRouter();
    const [draws, setDraws] = useState<Draw[]>([]);
    const [selectedDrawId, setSelectedDrawId] = useState<string>('');
    const [betLines, setBetLines] = useState<BetLine[]>([{ number: '', amount: '' }]);
    const [balance, setBalance] = useState({ balance: 0, bonus_balance: 0 });
    const [currentTime, setCurrentTime] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(getCurrentCostaRicaTime());
        }, 1000);
        setCurrentTime(getCurrentCostaRicaTime());

        fetchInitialData();

        return () => clearInterval(timer);
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            if (!token) {
                router.push('/login');
                return;
            }

            const [drawsData, balanceData] = await Promise.all([
                api.get('/draws', token),
                api.get('/wallet/balance', token)
            ]);

            if (Array.isArray(drawsData)) {
                const openDraws = drawsData.filter((d: Draw) => d.status === 'OPEN');
                setDraws(openDraws);
                if (openDraws.length > 0) {
                    setSelectedDrawId(openDraws[0].id);
                }
            } else {
                setError('No se pudieron cargar los sorteos.');
            }

            if (balanceData && !balanceData.error) {
                setBalance(balanceData);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Falla de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddLine = () => {
        if (betLines.length < 10) {
            setBetLines([...betLines, { number: '', amount: '' }]);
        }
    };

    const handleRemoveLine = (index: number) => {
        const newLines = [...betLines];
        newLines.splice(index, 1);
        setBetLines(newLines);
    };

    const handleLineChange = (index: number, field: keyof BetLine, value: string) => {
        const newLines = [...betLines];
        if (field === 'number') {
            const cleanValue = value.replace(/\D/g, '').slice(0, 2);
            newLines[index].number = cleanValue;
        } else {
            const cleanValue = value.replace(/\D/g, '');
            newLines[index].amount = cleanValue;
        }
        setBetLines(newLines);
    };

    const calculateTotal = () => {
        return betLines.reduce((acc, line) => acc + (parseInt(line.amount) || 0), 0);
    };

    const handlePlaceBets = async () => {
        const total = calculateTotal();
        const validBets = betLines.filter(l => l.number.length === 2 && parseInt(l.amount) >= 200);

        if (!selectedDrawId) {
            alert('Por favor seleccione un sorteo.');
            return;
        }

        if (validBets.length === 0) {
            alert('Por favor ingrese al menos una apuesta válida (Número de 2 dígitos y monto mínimo ₡200).');
            return;
        }

        if (total > (Number(balance.balance) + Number(balance.bonus_balance))) {
            alert('Saldo insuficiente para realizar esta apuesta.');
            return;
        }

        setSubmitting(true);
        try {
            const token = sessionStorage.getItem('token');
            const res = await api.post('/bets/place', {
                draw_id: selectedDrawId,
                bets: validBets.map(b => ({
                    number: b.number,
                    amount: parseInt(b.amount)
                }))
            }, token!);

            if (res.error) {
                alert(`Error al colocar apuesta: ${res.error}`);
            } else {
                alert('¡Apuesta colocada con éxito!');
                setBetLines([{ number: '', amount: '' }]);
                fetchInitialData(); // Update balance
            }
        } catch (err) {
            alert('Error de conexión al procesar la apuesta.');
        } finally {
            setSubmitting(false);
        }
    };

    const selectedDraw = draws.find(d => d.id === selectedDrawId);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-900">
                <div className="text-emerald-500 font-bold animate-pulse text-xl uppercase tracking-widest">Cargando Sorteos...</div>
            </div>
        );
    }

    return (
        <main className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 p-4 lg:p-10 space-y-8 animate-in fade-in duration-500">
            {/* Header / Info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl backdrop-blur-md">
                <div>
                    <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Panel de Apuestas</h1>
                    <p className="text-emerald-400 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Costa Rica: {currentTime}</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-black/40 px-8 py-4 rounded-3xl border border-white/5 text-center">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Disponible</p>
                        <p className="text-white text-3xl font-black italic tracking-tighter">₡{Number(balance.balance).toLocaleString()}</p>
                    </div>
                    {balance.bonus_balance > 0 && (
                        <div className="bg-emerald-500/10 px-8 py-4 rounded-3xl border border-emerald-500/20 text-center">
                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Bono</p>
                            <p className="text-emerald-400 text-3xl font-black italic tracking-tighter">₡{Number(balance.bonus_balance).toLocaleString()}</p>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 p-6 rounded-3xl text-red-500 font-black uppercase text-center text-xs tracking-widest">
                    ⚠️ {error}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Form Column */}
                <div className="xl:col-span-8 space-y-8">
                    <section className="bg-white/5 p-8 md:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-8">
                        {/* Draw Selector */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-4">Seleccionar Sorteo Activo</label>
                            <div className="relative">
                                <select 
                                    className="w-full bg-black/60 border border-white/10 p-6 rounded-[2rem] text-white outline-none focus:border-emerald-500 transition-all font-bold appearance-none cursor-pointer"
                                    value={selectedDrawId}
                                    onChange={(e) => setSelectedDrawId(e.target.value)}
                                >
                                    {draws.map(d => (
                                        <option key={d.id} value={d.id} className="bg-gray-900">
                                            {d.lottery_type} • {formatDrawDate(d.draw_date)} • {d.draw_time}
                                        </option>
                                    ))}
                                    {draws.length === 0 && <option value="">No hay sorteos abiertos</option>}
                                </select>
                                <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500 text-xl">⌄</div>
                            </div>
                        </div>

                        {/* Bet Items Grid */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-center ml-4">
                                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Números a Jugar</h2>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{betLines.length}/10 FILAS</p>
                            </div>

                            <div className="space-y-3">
                                {betLines.map((line, index) => (
                                    <div key={index} className="flex gap-4 items-center animate-in slide-in-from-left duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                            <div className="relative">
                                                <input 
                                                    type="text"
                                                    placeholder="00"
                                                    maxLength={2}
                                                    value={line.number}
                                                    onChange={(e) => handleLineChange(index, 'number', e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white text-center text-2xl font-black placeholder:opacity-20 outline-none focus:border-emerald-500 focus:bg-emerald-500/5 transition-all"
                                                />
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-black uppercase">#</span>
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type="text"
                                                    placeholder="200"
                                                    value={line.amount}
                                                    onChange={(e) => handleLineChange(index, 'amount', e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white text-center text-2xl font-black placeholder:opacity-20 outline-none focus:border-emerald-500 focus:bg-emerald-500/5 transition-all"
                                                />
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-black uppercase">₡</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveLine(index)}
                                            className="p-5 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                            disabled={betLines.length === 1}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button 
                                onClick={handleAddLine}
                                disabled={betLines.length >= 10}
                                className="w-full py-5 border-2 border-dashed border-white/10 rounded-2xl text-gray-500 font-black uppercase text-xs tracking-[0.3em] hover:border-emerald-500/50 hover:text-emerald-500 transition-all active:scale-[0.98]"
                            >
                                + Agregar Fila
                            </button>
                        </div>
                    </section>
                </div>

                {/* Summary Column */}
                <div className="xl:col-span-4 space-y-8">
                    <section className="bg-white/5 p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                        
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-8 flex items-center gap-4">
                            <span className="w-8 h-8 bg-emerald-500/20 text-emerald-500 flex items-center justify-center rounded-xl not-italic text-sm">✓</span>
                            Resumen Final
                        </h2>

                        <div className="space-y-6">
                            <div className="p-6 bg-black/40 rounded-3xl border border-white/5 space-y-2">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sorteo Seleccionado</p>
                                {selectedDraw ? (
                                    <div className="flex justify-between items-center text-white">
                                        <span className="font-black text-lg">{selectedDraw.lottery_type}</span>
                                        <span className="font-mono text-sm opacity-60">{formatDrawDate(selectedDraw.draw_date)} • {selectedDraw.draw_time}</span>
                                    </div>
                                ) : (
                                    <p className="text-red-400 text-xs font-bold font-black">Ninguno seleccionado</p>
                                )}
                            </div>

                            <div className="p-6 bg-black/40 rounded-3xl border border-white/5 flex justify-between items-center">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total a Pagar</p>
                                <p className="text-3xl font-black text-white italic tracking-tighter">₡{calculateTotal().toLocaleString()}</p>
                            </div>

                            <button
                                onClick={handlePlaceBets}
                                disabled={submitting || !selectedDrawId}
                                className={`w-full py-8 rounded-[2rem] font-black text-xl shadow-2xl transition-all uppercase tracking-[0.2em] relative overflow-hidden group ${
                                    submitting || !selectedDrawId
                                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:scale-[1.02] active:scale-95 shadow-emerald-500/20'
                                }`}
                            >
                                {submitting ? (
                                    <span className="flex items-center justify-center gap-3">
                                        <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        APOSTANDO...
                                    </span>
                                ) : 'REALIZAR APUESTA'}
                                {!submitting && selectedDrawId && <div className="absolute top-0 left-0 w-full h-full bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>}
                            </button>

                            <ul className="pt-4 space-y-3">
                                {['Seguridad y Soporte 24/7', 'Pago inmediato de premios', 'Límites de exposición controlados'].map((text, i) => (
                                    <li key={i} className="flex items-center gap-3 text-[9px] text-gray-600 font-black uppercase tracking-widest">
                                        <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                        {text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>
                </div>
            </div>

            <footer className="pt-10 border-t border-white/5 text-center">
                <p className="text-gray-600 text-[9px] font-black uppercase tracking-[0.8em]">Tiempos Pro • Premium Lottery Platform</p>
            </footer>
        </main>
    );
}