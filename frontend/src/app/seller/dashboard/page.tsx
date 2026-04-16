'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Logo from '@/components/Logo';
import Timer from '@/components/Timer';

interface Draw {
    id: string;
    lottery_type: string;
    draw_date: string;
    draw_time: string;
    is_open: boolean;
    can_bet?: boolean; // Seteado por el Timer
}

interface CartItem {
    number: string;
    amount: number;
}

export default function SellerDashboard() {
    const [draws, setDraws] = useState<Draw[]>([]);
    const [selectedLottery, setSelectedLottery] = useState<'TICA' | 'NICA'>('TICA');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null);
    const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
    const [selectedAmount, setSelectedAmount] = useState<number>(500);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [summary, setSummary] = useState({ total_tickets: 0, total_volume: 0, tica_total: 0, nica_total: 0 });
    const [recentBets, setRecentBets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showTicket, setShowTicket] = useState<any>(null);
    
    const router = useRouter();

    // Generar pestañas de fechas (Hoy + 7 días)
    const dateTabs = Array.from({ length: 8 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const iso = d.toISOString().split('T')[0];
        const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric' });
        return { iso, label };
    });

    useEffect(() => {
        const userStr = sessionStorage.getItem('user');
        if (!userStr || JSON.parse(userStr).role !== 'SELLER') {
            router.push('/login');
            return;
        }
        fetchInitialData();
    }, [selectedLottery, selectedDate]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const [drawsRes, salesRes] = await Promise.all([
                api.get(`/seller/draws?type=${selectedLottery}&date=${selectedDate}`, token),
                api.get('/seller/today-sales', token)
            ]);

            if (Array.isArray(drawsRes)) setDraws(drawsRes);
            if (salesRes && !salesRes.error) {
                setSummary(salesRes.summary);
                setRecentBets(salesRes.recent_bets);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNumberClick = (num: string) => {
        const newSelected = new Set(selectedNumbers);
        if (newSelected.has(num)) newSelected.delete(num);
        else newSelected.add(num);
        setSelectedNumbers(newSelected);
    };

    const addToCart = () => {
        const amount = customAmount ? parseInt(customAmount) : selectedAmount;
        if (amount < 200) return alert('Monto mínimo ₡200');
        
        const newItems = Array.from(selectedNumbers).map(num => ({ number: num, amount }));
        setCart([...cart, ...newItems]);
        setSelectedNumbers(new Set());
        setCustomAmount('');
    };

    const handleRegisterSale = async () => {
        if (cart.length === 0 || !selectedDraw) return;
        setSubmitting(true);
        try {
            const token = sessionStorage.getItem('token');
            const response = await api.post('/seller/cash-bet', {
                draw_id: selectedDraw.id,
                player_name: 'Jugador en Efectivo',
                player_phone: '00000000',
                items: cart
            }, token);

            if (response.success) {
                const ticketData = await api.get(`/seller/ticket/${response.bet_id}`, token);
                setShowTicket(ticketData);
                setCart([]);
                setSelectedDraw(null);
                fetchInitialData();
            } else {
                alert(response.error || 'Error al registrar venta');
            }
        } catch (err) {
            alert('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-4 lg:p-6 pb-28">
            
            {/* HEADER PROFESIONAL */}
            <header className="flex justify-between items-center mb-8 bg-[#1e293b] p-4 rounded-3xl border border-white/5 shadow-2xl">
                <div className="flex items-center gap-4">
                    <Logo size="text-2xl" />
                    <div className="h-8 w-[1px] bg-white/10 hidden md:block"></div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-tighter text-emerald-400">Terminal de Ventas</h1>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Punto de Venta Autorizado</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => router.push('/seller/history')} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">📜 Historial</button>
                    <button onClick={() => { sessionStorage.clear(); router.push('/login'); }} className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Salir</button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* PANEL IZQUIERDO: SELECCIÓN (3/4) */}
                <div className="lg:col-span-3 space-y-6">
                    
                    {/* 1. SELECTOR DE LOTERÍA */}
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setSelectedLottery('TICA')}
                            className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${selectedLottery === 'TICA' ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-[#1e293b] border-transparent opacity-50'}`}
                        >
                            <span className="text-4xl">🇨🇷</span>
                            <span className="font-black text-xl italic uppercase tracking-tighter text-blue-400 font-outfit">LOTERÍA TICA</span>
                        </button>
                        <button 
                            onClick={() => setSelectedLottery('NICA')}
                            className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${selectedLottery === 'NICA' ? 'bg-rose-600/20 border-rose-500 shadow-lg shadow-rose-500/20' : 'bg-[#1e293b] border-transparent opacity-50'}`}
                        >
                            <span className="text-4xl">🇳🇮</span>
                            <span className="font-black text-xl italic uppercase tracking-tighter text-rose-500 font-outfit">LOTERÍA NICA</span>
                        </button>
                    </div>

                    {/* 2. PESTAÑAS DE FECHAS */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {dateTabs.map(tab => (
                            <button
                                key={tab.iso}
                                onClick={() => { setSelectedDate(tab.iso); setSelectedDraw(null); }}
                                className={`px-6 py-3 rounded-2xl whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all border ${selectedDate === tab.iso ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 text-gray-400 border-white/5'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* 3. GRID DE SORTEOS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {loading ? (
                            Array.from({length: 4}).map((_, i) => <div key={i} className="h-24 bg-white/5 animate-pulse rounded-3xl"></div>)
                        ) : draws.length === 0 ? (
                            <div className="col-span-full py-10 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                <p className="text-gray-500 text-sm font-bold uppercase">No hay sorteos programados</p>
                            </div>
                        ) : (
                            draws.map(draw => (
                                <button
                                    key={draw.id}
                                    onClick={() => setSelectedDraw(draw)}
                                    className={`p-5 rounded-3xl border-2 transition-all text-left relative overflow-hidden group ${selectedDraw?.id === draw.id ? 'bg-emerald-500/20 border-emerald-500' : 'bg-[#1e293b] border-transparent hover:border-white/10'}`}
                                >
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{draw.lottery_type}</p>
                                    <p className="text-xl font-black italic">{draw.draw_time}</p>
                                    <div className="mt-2 text-[10px] font-black flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-xl w-fit">
                                        ⏱️ <Timer drawDate={draw.draw_date} drawTime={draw.draw_time} />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* 4. GRID DE NÚMEROS (7 COLUMNAS) */}
                    {selectedDraw && (
                        <div className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-white/5 animate-in fade-in zoom-in-95">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 text-center">Seleccionar Números</h3>
                            <div className="grid grid-cols-7 gap-2 mb-8">
                                {Array.from({length: 100}, (_, i) => {
                                    const num = i.toString().padStart(2, '0');
                                    const isSelected = selectedNumbers.has(num);
                                    return (
                                        <button
                                            key={num}
                                            onClick={() => handleNumberClick(num)}
                                            className={`aspect-square flex items-center justify-center rounded-2xl font-black text-lg transition-all border-2 ${isSelected ? 'bg-emerald-500 border-emerald-400 scale-95 shadow-lg shadow-emerald-500/40 text-black' : 'bg-[#0f172a] border-white/5 text-gray-500 hover:border-white/20'}`}
                                        >
                                            {num}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-gray-500 uppercase text-center">Montos Rápidos</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[200, 500, 1000, 5000].map(amt => (
                                            <button
                                                key={amt}
                                                onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                                                className={`py-3 rounded-2xl font-black text-xs transition-all border ${selectedAmount === amt && !customAmount ? 'bg-blue-500 border-blue-400 text-black' : 'bg-black/40 border-white/5 text-gray-400'}`}
                                            >
                                                ₡{amt >= 1000 ? (amt/1000)+'k' : amt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <input 
                                        type="number" 
                                        placeholder="Monto personalizado..."
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                        className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-4 text-center font-black outline-none focus:border-emerald-500 transition-all"
                                    />
                                    <button 
                                        onClick={addToCart}
                                        disabled={selectedNumbers.size === 0}
                                        className="w-full py-4 bg-emerald-500 rounded-2xl font-black text-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 disabled:opacity-20 transition-all active:scale-95"
                                    >
                                        + Agregar {selectedNumbers.size} Números
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* PANEL DERECHO: CARRITO Y RESUMEN (1/4) */}
                <div className="space-y-6">
                    
                    {/* STATS DEL DÍA */}
                    <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">💰</div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Ventas Hoy</p>
                        <p className="text-4xl font-black text-emerald-400 italic tracking-tighter font-outfit">₡{Number(summary.total_volume).toLocaleString()}</p>
                        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-2">
                            <div>
                                <p className="text-[8px] font-bold text-gray-600 uppercase">🇨🇷 Tica</p>
                                <p className="text-xs font-black text-blue-400 italic">₡{Number(summary.tica_total).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-bold text-gray-600 uppercase">🇳🇮 Nica</p>
                                <p className="text-xs font-black text-rose-500 italic">₡{Number(summary.nica_total).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* CARRITO DE COMPRA */}
                    <div className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-white/5 flex flex-col h-full max-h-[600px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Ticket Actual</h3>
                            {cart.length > 0 && <button onClick={() => setCart([])} className="text-rose-500 text-[10px] font-black uppercase">Vaciar</button>}
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 mb-6 min-h-[100px]">
                            {cart.length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center text-gray-600 opacity-20">
                                    <span className="text-4xl mb-2">📥</span>
                                    <p className="text-[10px] font-black uppercase">Sin jugadas</p>
                                </div>
                            ) : (
                                cart.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center bg-black/30 p-4 rounded-3xl border border-white/5 group">
                                        <div className="flex items-center gap-4">
                                            <span className="text-2xl font-black text-emerald-400 italic">#{item.number}</span>
                                            <div>
                                                <p className="text-[10px] font-black text-white italic">₡{item.amount.toLocaleString()}</p>
                                                <p className="text-[8px] font-bold text-gray-600 uppercase">Efectivo</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setCart(cart.filter((_, idx)=>idx!==i))} className="text-rose-500 p-2 opacity-50 hover:opacity-100 transition-opacity">✕</button>
                                    </div>
                                ))
                            )}
                        </div>

                        {cart.length > 0 && selectedDraw && (
                            <div className="pt-6 border-t border-white/10 space-y-4">
                                <div className="flex justify-between items-end">
                                    <p className="text-[10px] font-black text-gray-500 uppercase">Monto Total</p>
                                    <p className="text-3xl font-black text-white italic">₡{cart.reduce((s,i)=>s+i.amount,0).toLocaleString()}</p>
                                </div>
                                <button
                                    onClick={handleRegisterSale}
                                    disabled={submitting}
                                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-3xl font-black text-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/20 active:scale-95 transition-all"
                                >
                                    {submitting ? 'PROCESANDO...' : '💰 REGISTRAR VENTA'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL DE TICKET PROFESIONAL */}
            {showTicket && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                    <div className="bg-white text-black p-8 rounded-[2rem] w-full max-w-[340px] font-mono shadow-2xl relative animate-in zoom-in-95">
                        <div className="text-center border-b-4 border-double border-black pb-4 mb-4">
                            <h3 className="font-black text-3xl italic tracking-tighter uppercase mb-1">TIEMPOS PRO</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Ticket de Venta Oficial</p>
                        </div>
                        <div className="flex justify-between text-[10px] font-black mb-1 uppercase tracking-tighter">
                            <span>Sorteo: {showTicket.lottery_type}</span>
                            <span>ID: {showTicket.id.slice(0,8)}</span>
                        </div>
                        <div className="text-center bg-black/5 p-3 rounded-xl mb-4">
                            <p className="text-lg font-black uppercase italic">{showTicket.draw_time}</p>
                            <p className="text-[10px] font-bold">{new Date(showTicket.draw_date).toLocaleDateString('es-CR', { dateStyle: 'long' })}</p>
                        </div>
                        <div className="space-y-2 mb-6 max-h-[200px] overflow-y-auto">
                            {showTicket.items.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between font-black text-lg border-b border-black/5 pb-1">
                                    <span>#{item.number}</span>
                                    <span>₡{Number(item.amount).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-baseline mb-6 border-t-4 border-double border-black pt-4">
                            <span className="text-xs font-black uppercase">Total:</span>
                            <span className="text-3xl font-black italic tracking-tighter">₡{Number(showTicket.total_amount).toLocaleString()}</span>
                        </div>
                        <div className="space-y-3 print:hidden">
                            <button onClick={() => window.print()} className="w-full py-4 bg-black text-white font-black rounded-2xl shadow-xl uppercase text-xs">🖨️ Imprimir</button>
                            <button onClick={() => setShowTicket(null)} className="w-full py-2 text-black/30 font-black text-[10px] uppercase">Cerrar</button>
                        </div>
                        <p className="text-[8px] text-center mt-6 font-bold uppercase leading-tight opacity-40">¡Gracias por preferir TIEMPOS PRO!<br/>Validez según reglamento.</p>
                    </div>
                </div>
            )}
        </div>
    );
}