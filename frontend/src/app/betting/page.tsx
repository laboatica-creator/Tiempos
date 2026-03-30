'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import PrintButton from '../../components/PrintButton';
import ProtectedRoute from '../../components/ProtectedRoute';

interface CartItem {
  number: string;
  amount: number;
}

export default function BettingPage() {
  const [balance, setBalance] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [betAmount, setBetAmount] = useState<number>(1000);
  const [countdown, setCountdown] = useState('--:--:--');
  const [lotteryType, setLotteryType] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date())
  );
  const [availableDraws, setAvailableDraws] = useState<any[]>([]);
  const [activeDraw, setActiveDraw] = useState<any>(null);
  const [numbers, setNumbers] = useState<{number: string, exposure: number}[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [selectionStep, setSelectionStep] = useState(1); // 1: Lottery, 2: Date/Time, 3: Numbers
  const [lastBetTicket, setLastBetTicket] = useState<any>(null);

  const next7Days = Array.from({length: 8}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(d);
  });

  useEffect(() => {
    setIsMounted(true);
    fetchBalance();
  }, []);

  useEffect(() => {
    if (activeDraw) {
      const interval = setInterval(() => {
        updateCountdown();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeDraw]);

  useEffect(() => {
      if (selectionStep === 2 && lotteryType) {
          fetchDrawsForSelection();
      }
  }, [selectedDate, lotteryType, selectionStep]);

  const fetchBalance = async () => {
    try {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const wallet = await api.get('/wallet/balance', token);
        if (wallet && !wallet.error) setBalance(Number(wallet.balance));
    } catch (e) {
        console.error(e);
    }
  };

  const fetchDrawsForSelection = async () => {
    try {
        const token = sessionStorage.getItem('token');
        const draws = await api.get('/draws', token);
        if (Array.isArray(draws)) {
          const filtered = draws.filter((d: any) => {
            const datePart = d.draw_date.split('T')[0];
            return d.lottery_type === lotteryType && d.status === 'OPEN' && datePart === selectedDate;
          });
          setAvailableDraws(filtered);
        }
    } catch (e) {
        console.error(e);
    }
  };

  const handleSelectLottery = (type: string) => {
    setLotteryType(type);
    setSelectionStep(2);
  };

  const getDrawFullDate = (draw: any) => {
    // draw.draw_date is likely "YYYY-MM-DD" or ISO string
    const datePart = draw.draw_date.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = draw.draw_time.split(':').map(Number);
    
    // Create date using local time parts
    return new Date(year, month - 1, day, hours, minutes, seconds || 0);
  };

  const handleSelectDraw = async (draw: any) => {
    const drawFullDate = getDrawFullDate(draw);
    const now = new Date();
    const diff = drawFullDate.getTime() - now.getTime();

    if (diff < 20 * 60 * 1000) {
      alert('Sorteo cerrado. Las ventas cierran 20 minutos antes.');
      return;
    }

    setActiveDraw(draw);
    setSelectionStep(3);
    const token = sessionStorage.getItem('token');
    const exposureData = await api.get(`/bets/exposure/${draw.id}`, token);
    let numsGrid = Array.from({ length: 100 }, (_, i) => ({
        number: i.toString().padStart(2, '0'),
        exposure: 0
    }));

    if (exposureData && exposureData.exposure) {
        Object.entries(exposureData.exposure).forEach(([num, exp]) => {
            const idx = parseInt(num);
            if (numsGrid[idx]) numsGrid[idx].exposure = Number(exp);
        });
    }
    setNumbers(numsGrid);
  };

  const updateCountdown = () => {
    if (!activeDraw) return;
    const now = new Date();
    const drawFullDate = getDrawFullDate(activeDraw);
    const diff = drawFullDate.getTime() - now.getTime();

    if (diff <= 0) {
      setCountdown('SORTEANDO...');
      return;
    }

    if (diff < 20 * 60 * 1000) {
      setCountdown('CERRADO');
      return;
    }

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
  };

  const handleConfirmBet = async () => {
    if (cart.length === 0 || !activeDraw) return;
    if (countdown === 'CERRADO' || countdown === 'SORTEANDO...') {
        alert('El sorteo ha cerrado. No se pueden procesar más apuestas.');
        return;
    }

    try {
        // Show immediate feedback
        const confirmBtn = document.activeElement as HTMLButtonElement;
        if (confirmBtn) confirmBtn.disabled = true;
        
        const token = sessionStorage.getItem('token');
        const data = await api.post('/bets/place', {
            draw_id: activeDraw.id,
            bets: cart
        }, token);

        if (data.error) {
            alert(`Error: ${data.error}`);
            if (confirmBtn) confirmBtn.disabled = false;
        } else {
            const totalAmount = cart.reduce((s, i) => s + i.amount, 0);
            
            // Generate ticket
            const datePart = activeDraw.draw_date.split('T')[0];
            const [y, mo, d] = datePart.split('-').map(Number);
            const localDrawDate = new Date(y, mo-1, d).toLocaleDateString();

            const ticketData = {
                title: 'TIEMPOS NICA Y TICA',
                subtitle: `TICKET DE APUESTA`,
                lines: [
                    { label: 'Sorteo', value: `${lotteryType || ''} - ${activeDraw.draw_time}` },
                    { label: 'Fecha Sorteo', value: localDrawDate },
                    { label: 'Fecha Compra', value: new Date().toLocaleString() },
                    { label: 'Ref.', value: `#${data.bet_id?.slice(0, 8) || 'N/A'}` },
                    ...cart.map(i => ({ label: `Jugada #${i.number}`, value: `₡${i.amount.toLocaleString()}` })),
                    { label: 'TOTAL APOSTADO', value: `₡${totalAmount.toLocaleString()}`, bold: true },
                ],
                footer: `¡Gracias por jugar!\nVerifique su ticket.\n--------------------------------\n${new Date().toLocaleString()}`,
                barcode: data.bet_id || ''
            };
            setLastBetTicket(ticketData);
            alert('¡APUESTA PROCESADA EXITOSAMENTE!\nSu ticket ha sido generado.');
            fetchBalance();
            setCart([]);
            setSelectionStep(1); // Reset to start
        }
    } catch (err) {
        alert('Error crítico al realizar la apuesta. Por favor verifique su historial.');
    }
  };

  const addToCart = () => {
    if (selectedNumbers.length > 0) {
      if (betAmount < 200) {
        alert('Monto mínimo: 200 CRC');
        return;
      }
      setCart((prev) => {
        let newCart = [...prev];
        selectedNumbers.forEach(num => {
            const existingIdx = newCart.findIndex((item) => item.number === num);
            if (existingIdx !== -1) {
                newCart[existingIdx] = { ...newCart[existingIdx], amount: newCart[existingIdx].amount + betAmount };
            } else {
                newCart.push({ number: num, amount: betAmount });
            }
        });
        return newCart;
      });
      setSelectedNumbers([]);
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-[#0f172a]" />;

  return (
    <ProtectedRoute>
    <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
      {/* Selection Column */}
      <section className="lg:col-span-2 space-y-6">
        <header className="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl">
           <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Realizar Apuesta</h1>
              <div className="flex gap-2 mt-2">
                 <span className={`w-3 h-3 rounded-full ${selectionStep >= 1 ? 'bg-emerald-500' : 'bg-gray-700'}`}></span>
                 <span className={`w-3 h-3 rounded-full ${selectionStep >= 2 ? 'bg-emerald-500' : 'bg-gray-700'}`}></span>
                 <span className={`w-3 h-3 rounded-full ${selectionStep >= 3 ? 'bg-emerald-500' : 'bg-gray-700'}`}></span>
              </div>
           </div>
           <div className="text-right bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
             <p className="text-[10px] text-emerald-400 font-black uppercase">Balance</p>
             <p className="text-xl font-black text-white">₡{balance.toLocaleString()}</p>
           </div>
        </header>

        {selectionStep === 1 && (
            <div className="glass-panel p-4 sm:p-10 text-center space-y-6 sm:space-y-8 animate-in zoom-in duration-300">
                <h2 className="text-xl sm:text-3xl font-black text-white uppercase italic">Seleccione la Lotería</h2>
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                    {['TICA', 'NICA'].map(t => (
                        <button 
                            key={t}
                            onClick={() => handleSelectLottery(t)}
                            className="group relative h-32 sm:h-52 flex flex-col items-center justify-center bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-3xl sm:rounded-[2.5rem] hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all duration-300 transform hover:-translate-y-1 sm:hover:-translate-y-2 hover:scale-[1.02] active:scale-95 overflow-hidden shadow-2xl"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6 sm:-mr-10 sm:-mt-10 group-hover:bg-emerald-500/10 transition-colors"></div>
                            
                            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 sm:p-4 opacity-20 group-hover:opacity-100 transition-opacity">
                                <span className="text-2xl sm:text-4xl">{t === 'TICA' ? '🇨🇷' : '🇳🇮'}</span>
                            </div>
                            <span className="text-3xl sm:text-6xl font-black text-white tracking-[0.2em] group-hover:scale-110 transition-transform drop-shadow-2xl italic">{t}</span>
                            <span className="text-[8px] sm:text-[10px] text-gray-500 font-black uppercase mt-2 sm:mt-4 tracking-[0.3em] group-hover:text-emerald-400 transition-colors">Lotería de {t === 'TICA' ? 'Costa Rica' : 'Nicaragua'}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {selectionStep === 2 && (
            <div className="glass-panel p-4 sm:p-10 space-y-6 sm:space-y-8 animate-in slide-in-from-right duration-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectionStep(1)} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">← Volver</button>
                        <h2 className="text-lg sm:text-2xl font-black text-white uppercase italic">Sorteos de {lotteryType}</h2>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                    {next7Days.map(date => {
                        const dateParts = date.split('-').map(Number);
                        const d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0); 
                        const isSelected = selectedDate === date;
                        const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                        return (
                            <button 
                                key={date}
                                onClick={() => setSelectedDate(date)}
                                className={`px-4 py-2 sm:px-5 sm:py-3 rounded-xl font-bold uppercase text-[9px] sm:text-[10px] whitespace-nowrap transition-all border ${
                                    isSelected 
                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                                }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {availableDraws.length > 0 ? availableDraws.map(d => (
                        <button 
                            key={d.id}
                            onClick={() => handleSelectDraw(d)}
                            className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-2xl flex justify-between items-center group hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all active:scale-95"
                        >
                            <div className="flex flex-col text-left">
                                <span className="text-[9px] sm:text-xs text-gray-500 font-black uppercase mb-1">Hora del Sorteo</span>
                                <span className="text-xl sm:text-2xl font-black text-white">{d.draw_time}</span>
                            </div>
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                →
                            </div>
                        </button>
                    )) : (
                        <div className="col-span-2 py-8 sm:py-10 text-center text-gray-500 italic uppercase font-black text-[9px] sm:text-xs tracking-widest opacity-30 border-2 border-dashed border-white/5 rounded-2xl">
                            No hay sorteos disponibles.
                        </div>
                    )}
                </div>
            </div>
        )}

        {selectionStep === 3 && activeDraw && (
            <div className="space-y-6 animate-in zoom-in duration-300">
                 <div className="glass-panel p-6 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectionStep(2)} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">←</button>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase italic">{lotteryType} - {activeDraw.draw_time}</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{new Date(activeDraw.draw_date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-2xl border border-white/10">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 font-black uppercase">Cierra en</span>
                                <span className={`font-mono text-xl font-black tracking-tighter ${countdown === 'CERRADO' ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>{countdown}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-4 sm:p-6">
                    <h2 className="text-sm sm:text-lg font-black text-gray-300 uppercase mb-4 sm:mb-6 tracking-widest">Pizarra de Números</h2>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-2">
                        {numbers.map((item) => {
                            const isLimitReached = item.exposure >= 50000;
                            return (
                                <button
                                    key={item.number}
                                    onClick={() => {
                                        if (!isLimitReached) {
                                            setSelectedNumbers(prev => 
                                                prev.includes(item.number) 
                                                ? prev.filter(n => n !== item.number) 
                                                : [...prev, item.number]
                                            );
                                        }
                                    }}
                                    className={`relative h-12 flex flex-col items-center justify-center rounded-xl font-black transition-all text-lg ${
                                        selectedNumbers.includes(item.number) 
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                                        : isLimitReached 
                                            ? 'bg-red-500/10 text-red-500/40 cursor-not-allowed border border-red-500/20' 
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                                    }`}
                                    disabled={isLimitReached}
                                >
                                    {item.number}
                                    {isLimitReached && <span className="absolute -top-1 -right-1 text-[8px] bg-red-500 text-white px-1 rounded-full uppercase">Full</span>}
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-4 text-[10px] text-gray-500 uppercase font-bold text-center">Toca un número para seleccionar el monto de tu apuesta</p>
                </div>
            </div>
        )}
      </section>

      <aside className="space-y-6">
          {selectedNumbers.length > 0 && selectionStep === 3 && (
              <div className="glass-panel p-6 border-emerald-500/50 bg-emerald-500/5 animate-in slide-in-from-bottom duration-300">
                  <h3 className="text-lg font-black text-white uppercase mb-4">Números Seleccionados: <span className="text-emerald-400">{selectedNumbers.map(n => `#${n}`).join(', ')}</span></h3>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                      {[200, 500, 1000, 5000].map(amt => (
                          <button 
                            key={amt} 
                            onClick={() => setBetAmount(amt)}
                            className={`py-3 rounded-xl font-black transition-all border ${betAmount === amt ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
                          >
                            ₡{amt.toLocaleString()}
                          </button>
                      ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-xs">₡</span>
                          <input 
                            type="number" 
                            value={betAmount} 
                            onChange={(e) => setBetAmount(Number(e.target.value))}
                            className="w-full bg-black/40 border border-white/10 p-4 pl-8 rounded-xl text-white font-black text-center outline-none focus:border-emerald-500"
                            min={200}
                          />
                      </div>
                      <button 
                        onClick={addToCart} 
                        className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-black px-8 py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20 uppercase text-sm"
                      >
                        Añadir Jugada
                      </button>
                  </div>
              </div>
          )}

          <div className="glass-panel flex flex-col min-h-[400px]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-xl font-black text-white uppercase italic">Resumen</h2>
                <span className="bg-white/5 px-2 py-1 rounded text-[10px] text-gray-400 font-bold">{cart.length} ITEMS</span>
            </div>
            <div className="flex-1 p-4 space-y-3">
                {cart.map((item, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                            <span className="text-2xl font-black text-emerald-400">#{item.number}</span>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 font-black uppercase">Monto</span>
                                <span className="text-white font-black">₡{item.amount.toLocaleString()}</span>
                            </div>
                        </div>
                        <button onClick={() => setCart(c => c.filter(x => x.number !== item.number))} className="w-8 h-8 rounded-full bg-white/5 text-gray-500 hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center">×</button>
                    </div>
                ))}
                {cart.length === 0 && <div className="py-20 text-center text-gray-600 font-bold uppercase italic opacity-20 text-sm">Carrito Vacío</div>}
            </div>
            <div className="p-6 bg-black/40 rounded-b-3xl border-t border-white/5">
                <div className="flex justify-between items-end mb-4">
                    <span className="text-xs text-gray-500 font-black uppercase">Total Apostado</span>
                    <span className="text-3xl font-black text-white tracking-tighter">₡{cart.reduce((s,i) => s+i.amount, 0).toLocaleString()}</span>
                </div>
                <button 
                    onClick={handleConfirmBet}
                    disabled={cart.length === 0 || countdown === 'CERRADO' || (cart.reduce((s,i) => s+i.amount, 0) > balance)}
                    className={`w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition-all transform active:scale-95 uppercase tracking-widest ${
                        cart.length > 0 && countdown !== 'CERRADO' && (cart.reduce((s,i) => s+i.amount, 0) <= balance)
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 text-white shadow-emerald-500/30' 
                        : 'bg-white/5 text-gray-600 cursor-not-allowed'
                    }`}
                >
                    Confirmar Jugada
                </button>

                {lastBetTicket && (
                    <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex justify-between items-center">
                        <div>
                            <p className="text-emerald-400 font-black text-xs uppercase">✓ Apuesta Confirmada</p>
                            <p className="text-gray-500 text-[10px]">Imprima su comprobante</p>
                        </div>
                        <PrintButton
                            ticket={lastBetTicket}
                            label="Ticket"
                            className="py-3 px-5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl"
                        />
                    </div>
                )}
            </div>
          </div>
      </aside>

      {/* Mobile Sticky Checkout Bar */}
      {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40 animate-in slide-in-from-bottom-10 duration-500">
              <div className="bg-emerald-600 p-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-400/30 flex justify-between items-center">
                  <div>
                      <p className="text-[10px] text-emerald-100 font-black uppercase tracking-widest">Total en Carrito ({cart.length})</p>
                      <p className="text-xl font-black text-white italic">₡{cart.reduce((s,i) => s+i.amount, 0).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={handleConfirmBet}
                    className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest active:scale-95 shadow-lg"
                  >
                    CONFIRMAR
                  </button>
              </div>
          </div>
      )}
    </main>
    </ProtectedRoute>
  );
}
