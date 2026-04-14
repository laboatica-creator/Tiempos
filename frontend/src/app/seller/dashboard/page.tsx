'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { formatDrawDate, getCurrentCostaRicaTime } from '../../../lib/dateUtils';
import Logo from '@/components/Logo';

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
    const [selectedLottery, setSelectedLottery] = useState<'TICA' | 'NICA'>('TICA');
    const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null);
    const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
    const [selectedAmount, setSelectedAmount] = useState<number>(500);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [summary, setSummary] = useState({ total_tickets: 0, total_volume: 0, tica_total: 0, nica_total: 0 });
    const [recentBets, setRecentBets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const [showTicket, setShowTicket] = useState<any>(null);
    
    const router = useRouter();

    useEffect(() => {
        const userStr = sessionStorage.getItem('user');
        if (!userStr) {
            router.push('/login');
            return;
        }
        const user = JSON.parse(userStr);
        if (user.role !== 'SELLER') {
            router.push('/login');
            return;
        }

        fetchInitialData();
        const interval = setInterval(() => {
            setCurrentTime(getCurrentCostaRicaTime());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const [drawsData, salesData] = await Promise.all([
                api.get('/seller/draws', token),
                api.get('/seller/today-sales', token)
            ]);

            if (Array.isArray(drawsData)) setDraws(drawsData);
            if (salesData && !salesData.error) {
                setSummary(salesData.summary);
                setRecentBets(salesData.recent_bets);
            }
        } catch (err) {
            console.error('Error fetching seller data:', err);
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
        if (amount < 200) {
            alert('Monto mínimo ₡200');
            return;
        }
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
                player_name: customerName,
                player_phone: customerPhone,
                items: cart
            }, token);

            if (response.success) {
                // Obtener datos completos del ticket para imprimir
                const ticketData = await api.get(`/seller/ticket/${response.bet_id}`, token);
                setShowTicket(ticketData);
                
                // Limpiar y refrescar
                setCart([]);
                setCustomerName('');
                setCustomerPhone('');
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

    if (loading) return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
            <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-4 pb-24">
            {/* HEADER */}
            <header className="flex justify-between items-center mb-6 glass-panel p-4 border-emerald-500/20">
                <div className="flex items-center gap-3">
                    <Logo size="text-xl" />
                    <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">Terminal de Ventas</span>
                </div>
                <div className="text-right">
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter">Hora Local (CR)</p>
                    <p className="text-emerald-400 font-black text-lg">{currentTime}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COLUMNA IZQUIERDA: CONFIGURACIÓN Y GRID */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* SELECTORES DE SORTEO */}
                    <section className="glass-panel p-6">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">1. Seleccionar Sorteo</h2>
                        <div className="flex gap-4 mb-6">
                            {(['TICA', 'NICA'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => { setSelectedLottery(type); setSelectedDraw(null); }}
                                    className={`flex-1 py-4 rounded-2xl font-black text-xl transition-all ${selectedLottery === type ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-gray-500'}`}
                                >
                                    {type === 'TICA' ? '🇨🇷 TICA' : '🇳🇮 NICA'}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {draws.filter(d => d.lottery_type === selectedLottery && d.is_open).map(draw => (
                                <button
                                    key={draw.id}
                                    onClick={() => setSelectedDraw(draw)}
                                    className={`px-6 py-3 rounded-xl whitespace-nowrap border transition-all ${selectedDraw?.id === draw.id ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-400'}`}
                                >
                                    <p className="text-[10px] font-bold uppercase">{formatDrawDate(draw.draw_date)}</p>
                                    <p className="font-black">{draw.draw_time}</p>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* GRID DE NÚMEROS */}
                    {selectedDraw && (
                        <section className="glass-panel p-6 animate-in slide-in-from-bottom-5">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">2. Seleccionar Números</h2>
                                <button onClick={() => setSelectedNumbers(new Set())} className="text-[10px] font-black text-rose-500 uppercase">Limpiar</button>
                            </div>
                            <div className="grid grid-cols-7 md:grid-cols-10 gap-2 mb-6">
                                {Array.from({ length: 100 }, (_, i) => {
                                    const num = i.toString().padStart(2, '0');
                                    const isSelected = selectedNumbers.has(num);
                                    return (
                                        <button
                                            key={num}
                                            onClick={() => handleNumberClick(num)}
                                            className={`aspect-square flex items-center justify-center rounded-xl font-black text-lg transition-all ${isSelected ? 'bg-emerald-500 text-white scale-95 shadow-lg shadow-emerald-500/40' : 'bg-black/30 text-gray-400 border border-white/5 hover:bg-white/10'}`}
                                        >
                                            {num}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Monto por número</p>
                                <div className="grid grid-cols-4 gap-3">
                                    {[200, 500, 1000, 5000].map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                                            className={`py-3 rounded-xl font-black ${selectedAmount === amt && !customAmount ? 'bg-blue-500' : 'bg-white/5 text-gray-400'}`}
                                        >
                                            ₡{amt.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    placeholder="Otro monto..."
                                    value={customAmount}
                                    onChange={(e) => setCustomAmount(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-emerald-500 text-center font-black"
                                />
                                <button
                                    onClick={addToCart}
                                    disabled={selectedNumbers.size === 0}
                                    className="w-full py-4 bg-emerald-500 rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 disabled:opacity-30 disabled:grayscale transition-all"
                                >
                                    AGREGAR {selectedNumbers.size} NÚMEROS
                                </button>
                            </div>
                        </section>
                    )}
                </div>

                {/* COLUMNA DERECHA: CARRITO Y RESUMEN */}
                <div className="space-y-6">
                    
                    {/* RESUMEN DE VENTAS */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="glass-panel p-4 border-blue-500/20">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">TICA Hoy</p>
                            <p className="text-xl font-black text-blue-400">₡{Number(summary.tica_total).toLocaleString()}</p>
                        </div>
                        <div className="glass-panel p-4 border-rose-500/20">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">NICA Hoy</p>
                            <p className="text-xl font-black text-rose-400">₡{Number(summary.nica_total).toLocaleString()}</p>
                        </div>
                        <div className="glass-panel p-4 border-emerald-500/20 col-span-2 text-center">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ventas Totales</p>
                            <p className="text-3xl font-black text-emerald-400">₡{Number(summary.total_volume).toLocaleString()}</p>
                            <p className="text-[9px] text-gray-600 mt-1">{summary.total_tickets} Tickets emitidos</p>
                        </div>
                    </div>

                    {/* CARRITO Y CLIENTE */}
                    <section className="glass-panel p-6 bg-black/40 border-white/5">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">🛒 Carrito de Venta</h2>
                        
                        <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {cart.length === 0 ? (
                                <p className="text-gray-600 text-center py-10 italic text-sm">Carrito vacío</p>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div>
                                            <span className="text-xl font-black text-emerald-400 mr-3">{item.number}</span>
                                            <span className="text-gray-400 text-xs">Monto: ₡{item.amount.toLocaleString()}</span>
                                        </div>
                                        <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-rose-500 p-1">✕</button>
                                    </div>
                                ))
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="space-y-4 border-t border-white/10 pt-4">
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Nombre del Cliente"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-blue-500"
                                    />
                                    <input
                                        type="tel"
                                        placeholder="Teléfono/WhatsApp"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="flex justify-between items-end mb-2">
                                    <p className="text-gray-400 text-[10px] font-black uppercase">Total a Cobrar</p>
                                    <p className="text-3xl font-black text-white">₡{cart.reduce((s, i) => s + i.amount, 0).toLocaleString()}</p>
                                </div>
                                <button
                                    onClick={handleRegisterSale}
                                    disabled={submitting}
                                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl font-black text-xl shadow-2xl shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all"
                                >
                                    {submitting ? 'PROCESANDO...' : '💰 REGISTRAR VENTA'}
                                </button>
                                <button onClick={() => setCart([])} className="w-full py-2 text-gray-500 font-bold text-[10px] uppercase">Cancelar Venta</button>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* BARRA INFERIOR DE ACCESO RÁPIDO */}
            <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t border-emerald-500/20 p-4 flex justify-around items-center z-40 bg-[#0f172a]/95 backdrop-blur-xl">
                <button onClick={() => router.push('/seller/dashboard')} className="flex flex-col items-center gap-1 text-emerald-400">
                    <span className="text-xl">🏪</span>
                    <span className="text-[10px] font-black uppercase">Terminal</span>
                </button>
                <button onClick={() => router.push('/seller/history')} className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors">
                    <span className="text-xl">📜</span>
                    <span className="text-[10px] font-black uppercase">Historial</span>
                </button>
                <button onClick={() => { sessionStorage.clear(); router.push('/login'); }} className="flex flex-col items-center gap-1 text-gray-500 hover:text-rose-500 transition-colors">
                    <span className="text-xl">🚪</span>
                    <span className="text-[10px] font-black uppercase">Salir</span>
                </button>
            </nav>

            {/* MODAL DE TICKET / COMPROBANTE */}
            {showTicket && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white text-black p-6 rounded-lg w-full max-w-[320px] font-mono shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4">
                            <h3 className="font-black text-2xl uppercase">Tiempos Pro</h3>
                            <p className="text-[10px]">COBRADO EN EFECTIVO</p>
                            <p className="text-[10px]">{new Date(showTicket.created_at).toLocaleString()}</p>
                        </div>
                        <div className="space-y-1 text-sm mb-4">
                            <div className="flex justify-between font-black uppercase">
                                <span>{showTicket.lottery_type}</span>
                                <span>{showTicket.draw_time}</span>
                            </div>
                            <p className="text-[10px]">{formatDrawDate(showTicket.draw_date)}</p>
                            <p className="text-[10px] border-t border-black/10 pt-1">Cliente: {showTicket.player_name || 'General'}</p>
                            <p className="text-[10px]">Sugerencia: Revisar resultados en app</p>
                        </div>
                        <div className="border-t-2 border-b-2 border-dashed border-black py-4 mb-4">
                            <p className="text-[10px] font-bold mb-2 uppercase">Detalle de Jugadas:</p>
                            {showTicket.items.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between font-black">
                                    <span>#{item.number}</span>
                                    <span>₡{Number(item.amount).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-baseline mb-6">
                            <span className="text-sm font-bold uppercase">Total Pagado:</span>
                            <span className="text-2xl font-black italic">₡{Number(showTicket.total_amount).toLocaleString()}</span>
                        </div>
                        <div className="text-center space-y-4">
                            <button onClick={() => window.print()} className="w-full py-3 bg-black text-white font-black text-sm rounded shadow-lg uppercase">🖨️ Imprimir Ticket</button>
                            <button onClick={() => setShowTicket(null)} className="w-full py-2 text-black/40 font-black text-[10px] uppercase">Cerrar Ventana</button>
                        </div>
                        <p className="text-[8px] text-center mt-6 uppercase leading-tight font-bold opacity-40">¡Gracias por su compra!<br/>Validez según reglamento vigente.</p>
                    </div>
                </div>
            )}
        </div>
    );
}