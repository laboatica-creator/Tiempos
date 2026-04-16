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
}

interface CartItem {
    number: string;
    amount: number;
}

export default function SellerDashboard() {
    const [draws, setDraws] = useState<Draw[]>([]);
    const [closedStatus, setClosedStatus] = useState<Record<string, boolean>>({});
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

    const dateTabs = Array.from({ length: 8 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return { iso: d.toISOString().split('T')[0], label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric' }) };
    });

    useEffect(() => {
        const userStr = sessionStorage.getItem('user');
        if (!userStr || JSON.parse(userStr).role !== 'SELLER') { router.push('/login'); return; }
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
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleRegisterSale = async () => {
        if (cart.length === 0 || !selectedDraw) return;
        
        // BLOQUEO PREVENTIVO (ERROR 2)
        if (closedStatus[selectedDraw.id]) {
            alert('Este sorteo ya cerró. Por favor seleccione uno activo.');
            return;
        }

        setSubmitting(true);
        try {
            const token = sessionStorage.getItem('token');
            const response = await api.post('/seller/cash-bet', {
                draw_id: selectedDraw.id,
                player_name: 'Jugador en Efectivo',
                player_phone: '00000000',
                items: cart // Enviando estructura de items (Fix ERROR 1)
            }, token);

            if (response.success) {
                const ticketData = await api.get(`/seller/ticket/${response.bet_id}`, token);
                setShowTicket(ticketData);
                setCart([]);
                setSelectedDraw(null);
                fetchInitialData();
            } else {
                alert(response.error || 'Error al registrar');
            }
        } catch (err) { alert('Error de red'); } finally { setSubmitting(false); }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-4">
            <header className="flex justify-between items-center mb-6 bg-[#1e293b] p-4 rounded-3xl">
                <Logo size="text-2xl" />
                <button onClick={() => { sessionStorage.clear(); router.push('/login'); }} className="text-rose-500 font-black text-xs">SALIR</button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    {/* Selector de Lotería */}
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setSelectedLottery('TICA')} className={`p-6 rounded-3xl border-2 transition-all ${selectedLottery === 'TICA' ? 'bg-blue-600/20 border-blue-500' : 'bg-[#1e293b] border-transparent opacity-40'}`}>🇨🇷 TICA</button>
                        <button onClick={() => setSelectedLottery('NICA')} className={`p-6 rounded-3xl border-2 transition-all ${selectedLottery === 'NICA' ? 'bg-rose-600/20 border-rose-500' : 'bg-[#1e293b] border-transparent opacity-40'}`}>🇳🇮 NICA</button>
                    </div>

                    {/* Sorteos con Bloqueo (ERROR 2) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {draws.map(draw => {
                            const isClosed = closedStatus[draw.id];
                            return (
                                <button
                                    key={draw.id}
                                    onClick={() => !isClosed && setSelectedDraw(draw)}
                                    className={`p-5 rounded-3xl border-2 transition-all text-left ${isClosed ? 'opacity-20 grayscale cursor-not-allowed border-transparent' : selectedDraw?.id === draw.id ? 'bg-emerald-500/20 border-emerald-500' : 'bg-[#1e293b] border-transparent'}`}
                                >
                                    <p className="text-[10px] font-black">{draw.lottery_type}</p>
                                    <p className="text-xl font-black">{draw.draw_time}</p>
                                    <div className="mt-2 text-[10px] font-black">
                                        ⏱️ <Timer drawDate={draw.draw_date} drawTime={draw.draw_time} onExpire={() => setClosedStatus(prev => ({...prev, [draw.id]: true}))} />
                                    </div>
                                    {isClosed && <p className="text-[8px] text-rose-500 font-bold mt-1 uppercase">Cerrado</p>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Grid de 7 (Solución visual Profesional) */}
                    {selectedDraw && (
                        <div className="bg-[#1e293b] p-6 rounded-[2.5rem]">
                            <div className="grid grid-cols-7 gap-2 mb-6">
                                {Array.from({length: 100}, (_, i) => {
                                    const num = i.toString().padStart(2, '0');
                                    return (
                                        <button key={num} onClick={() => {
                                            const newSelected = new Set(selectedNumbers);
                                            if (newSelected.has(num)) newSelected.delete(num); else newSelected.add(num);
                                            setSelectedNumbers(newSelected);
                                        }} className={`aspect-square flex items-center justify-center rounded-2xl font-black ${selectedNumbers.has(num) ? 'bg-emerald-500 text-black' : 'bg-[#0f172a] text-gray-500'}`}>{num}</button>
                                    );
                                })}
                            </div>
                            <button onClick={() => {
                                const amount = customAmount ? parseInt(customAmount) : selectedAmount;
                                const newItems = Array.from(selectedNumbers).map(num => ({ number: num, amount }));
                                setCart([...cart, ...newItems]);
                                setSelectedNumbers(new Set());
                            }} disabled={selectedNumbers.size === 0} className="w-full py-4 bg-emerald-500 rounded-2xl font-black text-black uppercase text-xs disabled:opacity-20">+ Agregar {selectedNumbers.size} Números</button>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-emerald-500/20">
                        <p className="text-[10px] font-black text-gray-500 uppercase">Ventas Hoy</p>
                        <p className="text-4xl font-black text-emerald-400">₡{Number(summary.total_volume).toLocaleString()}</p>
                    </div>

                    <div className="bg-[#1e293b] p-6 rounded-[2.5rem] flex flex-col min-h-[400px]">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Ticket Actual</h3>
                        <div className="flex-1 space-y-3 overflow-y-auto pr-2 max-h-[300px]">
                            {cart.map((item, i) => (
                                <div key={i} className="flex justify-between bg-black/40 p-4 rounded-3xl border border-white/5">
                                    <span className="text-xl font-black text-emerald-400 italic">#{item.number}</span>
                                    <span className="font-black">₡{item.amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        {cart.length > 0 && (
                            <div className="pt-6 border-t border-white/10">
                                <p className="text-2xl font-black text-center mb-4">₡{cart.reduce((s,i)=>s+i.amount,0).toLocaleString()}</p>
                                <button onClick={handleRegisterSale} disabled={submitting} className="w-full py-5 bg-emerald-500 rounded-3xl font-black text-black">💰 REGISTRAR VENTA</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ERROR 3: MODAL DE TICKET CON IMPRESIÓN */}
            {showTicket && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white text-black p-6 rounded-xl w-full max-w-[320px] font-mono shadow-2xl">
                        <div className="text-center border-b border-black pb-4 mb-4">
                            <h3 className="font-black text-xl uppercase">TIEMPOS PRO</h3>
                            <p className="text-[10px]">{new Date(showTicket.created_at).toLocaleString()}</p>
                        </div>
                        <div className="space-y-1 text-sm mb-4">
                            <p className="font-black uppercase">{showTicket.lottery_type} - {showTicket.draw_time}</p>
                            <p className="text-[10px]">{new Date(showTicket.draw_date).toLocaleDateString()}</p>
                        </div>
                        <div className="border-t border-b border-black py-4 mb-4 space-y-2">
                            {showTicket.items?.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between font-black text-lg">
                                    <span>#{item.number}</span>
                                    <span>₡{Number(item.amount).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between font-black mb-6">
                            <span>TOTAL:</span>
                            <span className="text-2xl italic">₡{Number(showTicket.total_amount).toLocaleString()}</span>
                        </div>
                        <button onClick={() => window.print()} className="w-full py-3 bg-black text-white font-black rounded-xl mb-2">🖨️ IMPRIMIR TICKET</button>
                        <button onClick={() => setShowTicket(null)} className="w-full py-2 text-black/40 font-black text-[10px]">CERRAR</button>
                    </div>
                </div>
            )}
        </div>
    );
}