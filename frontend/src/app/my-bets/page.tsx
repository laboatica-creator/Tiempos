'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import PrintButton from '../../components/PrintButton';

export default function MyBetsPage() {
    const [bets, setBets] = useState<any[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setIsMounted(true);
        fetchMyBets();
    }, []);

    const fetchMyBets = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const data = await api.get('/bets/my', token);
            if (Array.isArray(data)) {
                setBets(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelBet = async (ticketId: string) => {
        if (!confirm('⚠️ ¿ESTÁ SEGURO DE ANULAR ESTA JUGADA?\nEl dinero será devuelto a su saldo de inmediato.')) return;

        try {
            const token = sessionStorage.getItem('token');
            const res = await api.post(`/bets/cancel/${ticketId}`, {}, token);
            if (res.error) alert(res.error);
            else {
                alert('✅ Jugada anulada con éxito.');
                fetchMyBets();
            }
        } catch (err) {
            alert('Error al intentar anular la jugada.');
        }
    };

    if (!isMounted) return null;

    // Group bets by ticket (bet_id)
    const groupedBets: Record<string, any> = {};
    bets.forEach(b => {
        if (!groupedBets[b.bet_id]) {
            groupedBets[b.bet_id] = {
                id: b.bet_id,
                total: b.total_amount,
                status: b.bet_status,
                created_at: b.created_at,
                lottery: b.lottery_type,
                draw_date: b.draw_date,
                draw_time: b.draw_time,
                draw_status: b.draw_status,
                items: []
            };
        }
        groupedBets[b.bet_id].items.push({
            number: b.number,
            amount: b.amount,
            status: b.item_status
        });
    });

    const tickets = Object.values(groupedBets);

    return (
        <main className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-10 animate-in fade-in duration-500">
            <header className="py-10 text-center bg-[#1e293b] rounded-3xl border border-white/5 shadow-2xl">
                <h1 className="text-4xl font-extrabold tracking-tighter text-white uppercase italic">Mis Jugadas</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Control de tus sorteos y premios</p>
            </header>

            {loading ? (
                <div className="py-20 text-center text-emerald-500 font-black animate-pulse">CARGANDO TUS JUGADAS...</div>
            ) : tickets.length === 0 ? (
                <div className="py-20 text-center bg-white/5 rounded-3xl border-2 border-dashed border-white/5 opacity-50 italic uppercase font-black tracking-widest text-gray-500">
                    No has realizado ninguna apuesta todavía.
                </div>
            ) : (
                <section className="space-y-6">
                    {tickets.map((ticket: any) => {
                        const now = new Date();
                        const [h, m] = ticket.draw_time.split(':').map(Number);
                        const drawDate = new Date(ticket.draw_date);
                        drawDate.setHours(h, m, 0, 0);
                        const diffMins = (drawDate.getTime() - now.getTime()) / (1000 * 60);

                        // Editable/Deletable only if it's OPEN and at least 20 min before the draw
                        const isActionable = ticket.draw_status === 'OPEN' && diffMins >= 20;

                        return (
                            <div key={ticket.id} className="glass-panel border-white/10 hover:border-emerald-500/30 transition-all">
                                <div className="p-6 bg-white/5 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${ticket.lottery === 'TICA' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            <span className="text-2xl font-black">{ticket.lottery}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-white text-lg">{new Date(ticket.draw_date).toLocaleDateString()} • {ticket.draw_time}</h3>
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">ID Ticket: #{ticket.id.slice(0,8)}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        {ticket.status === 'CANCELLED' ? (
                                            <span className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase ring-1 ring-red-500/50 italic">ANULADA</span>
                                        ) : isActionable ? (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleCancelBet(ticket.id)}
                                                    className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all"
                                                >
                                                    Eliminar
                                                </button>
                                                <button 
                                                    onClick={async () => {
                                                        if (confirm('¿Desea modificar esta jugada? Se anulará la actual y podrá realizar una nueva.')) {
                                                            await handleCancelBet(ticket.id);
                                                            window.location.href = '/betting';
                                                        }
                                                    }}
                                                    className="bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-500 border border-emerald-500/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all"
                                                >
                                                    Modificar
                                                </button>
                                                <span className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase ring-1 ring-yellow-500/50">PENDIENTE</span>
                                            </div>
                                        ) : ticket.draw_status === 'OPEN' || ticket.draw_status === 'CLOSED' ? (
                                            <span className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase ring-1 ring-yellow-500/50">EN TRANSIT</span>
                                        ) : ticket.status === 'WON' ? (
                                            <span className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20">GANADOR</span>
                                        ) : (
                                            <span className="bg-white/10 text-gray-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase">SORTEADO</span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-6 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                    {ticket.items.map((item: any, idx: number) => (
                                        <div key={idx} className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-1 ${
                                            item.status === 'WON' 
                                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10 scale-110 relative z-10' 
                                            : 'bg-white/5 border-white/5 text-gray-400 opacity-80'
                                        }`}>
                                            <span className="text-2xl font-black">#{item.number}</span>
                                            <span className="text-[10px] font-bold">₡{item.amount.toLocaleString()}</span>
                                            {item.status === 'WON' && <span className="absolute -top-2 bg-emerald-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black animate-bounce">PRIZE</span>}
                                        </div>
                                    ))}
                                </div>
                                <div className="px-6 py-4 bg-black/20 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-black tracking-widest uppercase text-gray-500">
                                    <div className="flex flex-col gap-1 text-center sm:text-left">
                                        <span>REALIZADA: {new Date(ticket.created_at).toLocaleString()}</span>
                                        <span className="text-white">TOTAL: ₡{ticket.total.toLocaleString()}</span>
                                    </div>
                                    <PrintButton 
                                        ticket={{
                                            title: 'TIEMPOS NICA Y TICA',
                                            subtitle: `TICKET DE APUESTA`,
                                            lines: [
                                                { label: 'Sorteo', value: `${ticket.lottery || ''} - ${ticket.draw_time}` },
                                                { label: 'Fecha', value: new Date(ticket.draw_date).toLocaleDateString() },
                                                { label: 'Hora', value: new Date(ticket.created_at).toLocaleTimeString() },
                                                { label: 'Ref.', value: `#${ticket.id.slice(0, 6) || 'N/A'}` },
                                                ...ticket.items.map((i: any) => ({ label: `Jugada #${i.number}`, value: `₡${i.amount.toLocaleString()}` })),
                                                { label: 'TOTAL APOSTADO', value: `₡${ticket.total.toLocaleString()}`, bold: true },
                                            ],
                                            footer: `Los premios se cancelarán en un máximo de 24 horas. ¡Gracias por jugar!\n--------------------------------\n${new Date(ticket.created_at).toLocaleString()}`,
                                            barcode: ticket.id.slice(0, 16) || ''
                                        }}
                                        label="IMPRIMIR"
                                        className="py-2 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all flex items-center gap-2"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}
        </main>
    );
}
