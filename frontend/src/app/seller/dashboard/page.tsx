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

export default function SellerDashboard() {
    const [selectedType, setSelectedType] = useState<'TICA' | 'NICA' | null>(null);
    const [draws, setDraws] = useState<Draw[]>([]);
    const [closedDraws, setClosedDraws] = useState<Record<string, boolean>>({});
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null);
    const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
    const [selectedAmount, setSelectedAmount] = useState<number>(500);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [showTicket, setShowTicket] = useState<any>(null);
    
    const router = useRouter();

    const dateTabs = Array.from({ length: 8 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return { iso: d.toISOString().split('T')[0], label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric' }) };
    });

    useEffect(() => {
        const user = sessionStorage.getItem('user');
        if (!user || JSON.parse(user).role !== 'SELLER') router.push('/login');
        if (selectedType) fetchDraws();
    }, [selectedType, selectedDate]);

    const fetchDraws = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const data = await api.get(`/seller/draws?type=${selectedType}&date=${selectedDate}`, token);
            if (Array.isArray(data)) setDraws(data);
        } catch (err) { console.error(err); }
    };

    const handleRegister = async () => {
        if (!selectedDraw || selectedNumbers.size === 0) return;
        if (closedDraws[selectedDraw.id]) return alert('Este sorteo ya cerró.');

        setSubmitting(true);
        try {
            const token = sessionStorage.getItem('token');
            const amount = customAmount ? parseInt(customAmount) : selectedAmount;
            
            const response = await api.post('/seller/cash-bet', {
                draw_id: selectedDraw.id,
                player_name: 'Jugador en efectivo', // Requerimiento #5 y #8
                player_phone: '00000000',
                items: Array.from(selectedNumbers).map(n => ({ number: n, amount }))
            }, token);

            if (response.success) {
                const ticket = await api.get(`/seller/ticket/${response.bet_id}`, token);
                setShowTicket(ticket);
                setSelectedNumbers(new Set());
                setSelectedDraw(null);
            } else {
                alert(response.error || 'Error al registrar');
            }
        } catch (err) { alert('Fallo de red'); } finally { setSubmitting(false); }
    };

    // VISTA INICIAL: SOLO DOS BOTONES GRANDES (Requerimiento #1)
    if (!selectedType) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
                <Logo size="text-4xl" className="mb-12" />
                <h1 className="text-white font-black text-2xl uppercase tracking-tighter mb-8 italic">Seleccione Lotería</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                    <button 
                        onClick={() => setSelectedType('TICA')}
                        className="aspect-square md:aspect-auto md:h-64 bg-[#1e293b] rounded-[3rem] border-4 border-blue-500/20 hover:border-blue-500 flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 group shadow-2xl"
                    >
                        <span className="text-8xl group-hover:scale-110 transition-transform">🇨🇷</span>
                        <span className="text-blue-400 font-black text-4xl italic uppercase">TICA</span>
                    </button>
                    <button 
                        onClick={() => setSelectedType('NICA')}
                        className="aspect-square md:aspect-auto md:h-64 bg-[#1e293b] rounded-[3rem] border-4 border-rose-500/20 hover:border-rose-500 flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 group shadow-2xl"
                    >
                        <span className="text-8xl group-hover:scale-110 transition-transform">🇳🇮</span>
                        <span className="text-rose-500 font-black text-4xl italic uppercase">NICA</span>
                    </button>
                </div>
                <button onClick={() => { sessionStorage.clear(); router.push('/login'); }} className="mt-12 text-gray-500 font-bold uppercase tracking-widest text-xs hover:text-white">Regresar al Login</button>
            </div>
        );
    }

    // VISTA DE TERMINAL (Requerimiento #2, #3, #4, #5)
    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-4">
            <header className="flex justify-between items-center mb-6 bg-[#1e293b] p-4 rounded-3xl border border-white/5">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedType(null)} className="text-2xl hover:scale-110 transition-transform">🔙</button>
                    <Logo size="text-xl" />
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${selectedType === 'TICA' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-500'}`}>{selectedType}</span>
                </div>
                <button onClick={() => router.push('/seller/history')} className="text-[10px] font-black uppercase text-gray-400">📜 Historial</button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Pestañas de Fechas */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {dateTabs.map(tab => (
                            <button key={tab.iso} onClick={() => setSelectedDate(tab.iso)} className={`px-6 py-3 rounded-2xl whitespace-nowrap text-[10px] font-black uppercase transition-all ${selectedDate === tab.iso ? 'bg-white text-black' : 'bg-white/5 text-gray-400'}`}>{tab.label}</button>
                        ))}
                    </div>

                    {/* Sorteos con Timer y Bloqueo */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {draws.map(draw => {
                            const isClosed = closedDraws[draw.id];
                            return (
                                <button
                                    key={draw.id}
                                    onClick={() => !isClosed && setSelectedDraw(draw)}
                                    className={`p-5 rounded-3xl border-2 transition-all text-left relative ${isClosed ? 'opacity-20 grayscale cursor-not-allowed border-transparent' : selectedDraw?.id === draw.id ? 'bg-emerald-500/20 border-emerald-500' : 'bg-[#1e293b] border-transparent'}`}
                                >
                                    <p className="text-xl font-black italic">{draw.draw_time}</p>
                                    <div className="mt-2 text-[10px] font-black">
                                        <Timer drawTime={draw.draw_time} drawDate={draw.draw_date} onExpire={() => setClosedDraws(prev => ({...prev, [draw.id]: true}))} />
                                    </div>
                                    {isClosed && <p className="text-[8px] text-rose-500 font-bold uppercase mt-1">Cerrado</p>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Grid de 7 Columnas (Requerimiento #3) */}
                    {selectedDraw && (
                        <div className="bg-[#1e293b] p-6 rounded-[3rem] border border-white/5">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase text-center mb-6 tracking-widest">Seleccione Números</h3>
                            <div className="grid grid-cols-7 gap-2">
                                {Array.from({length: 100}, (_, i) => {
                                    const num = i.toString().padStart(2, '0');
                                    const isSelected = selectedNumbers.has(num);
                                    return (
                                        <button 
                                            key={num} 
                                            onClick={() => {
                                                const news = new Set(selectedNumbers);
                                                if (news.has(num)) news.delete(num); else news.add(num);
                                                setSelectedNumbers(news);
                                            }}
                                            className={`aspect-square flex items-center justify-center rounded-2xl font-black text-lg transition-all border-2 ${isSelected ? 'bg-emerald-500 border-emerald-400 text-black scale-95' : 'bg-[#0f172a] border-transparent text-gray-500'}`}
                                        >
                                            {num}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Panel Derecho de Pago (Requerimiento #4) */}
                <div className="space-y-6">
                    <div className="bg-[#1e293b] p-8 rounded-[3rem] border border-white/5 flex flex-col gap-6">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Resumen de Venta</h3>
                        
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-gray-500 uppercase text-center">Monto por Número</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[200, 500, 1000, 5000].map(amt => (
                                    <button key={amt} onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }} className={`py-4 rounded-2xl font-black text-sm border ${selectedAmount === amt && !customAmount ? 'bg-blue-600 border-blue-400' : 'bg-black/40 border-white/5 text-gray-500'}`}>₡{amt.toLocaleString()}</button>
                                ))}
                            </div>
                            <input type="number" placeholder="Monto Manual" value={customAmount} onChange={e=>setCustomAmount(e.target.value)} className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-4 text-center font-black outline-none focus:border-emerald-500" />
                        </div>

                        {selectedNumbers.size > 0 && selectedDraw && (
                            <div className="space-y-4 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-bottom-5">
                                <div className="flex justify-between items-end">
                                    <p className="text-[10px] font-black text-gray-500 uppercase">Total a Cobrar</p>
                                    <p className="text-4xl font-black italic">₡{( (customAmount ? parseInt(customAmount) : selectedAmount ) * selectedNumbers.size ).toLocaleString()}</p>
                                </div>
                                <button 
                                    onClick={handleRegister}
                                    disabled={submitting}
                                    className="w-full py-6 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all text-black"
                                >
                                    {submitting ? 'GUARDANDO...' : '💰 REGISTRAR VENTA'}
                                </button>
                                <p className="text-[9px] text-gray-500 text-center font-bold">REGISTRO COMO: JUGADOR EN EFECTIVO</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL DE TICKET (Requerimiento #7, #8) */}
            {showTicket && (
                <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white text-black p-8 rounded-[2rem] w-full max-w-[340px] font-mono shadow-2xl">
                        <div className="text-center border-b-4 border-double border-black pb-4 mb-4">
                            <h3 className="font-black text-2xl uppercase italic">TIEMPOS PRO</h3>
                            <p className="text-[10px] font-bold">COMPROBANTE DE VENTA</p>
                        </div>
                        <div className="space-y-1 text-xs mb-4">
                            <p className="font-black uppercase">{showTicket.lottery_type} - {showTicket.draw_time}</p>
                            <p className="text-[10px]">{new Date(showTicket.draw_date).toLocaleDateString()}</p>
                            <p className="text-[10px] pt-1">Cliente: Jugador en efectivo</p>
                        </div>
                        <div className="border-y-2 border-dashed border-black py-4 mb-4 space-y-2">
                            {showTicket.items?.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between font-black text-lg">
                                    <span>#{item.number}</span>
                                    <span>₡{Number(item.amount).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-baseline mb-8">
                            <span className="text-xs font-black uppercase">Total:</span>
                            <span className="text-3xl font-black italic">₡{Number(showTicket.total_amount).toLocaleString()}</span>
                        </div>
                        <button onClick={() => window.print()} className="w-full py-4 bg-black text-white font-black rounded-2xl shadow-xl uppercase text-xs mb-2">🖨️ Imprimir</button>
                        <button onClick={() => setShowTicket(null)} className="w-full py-2 text-black/40 font-black text-[10px] uppercase">Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
}