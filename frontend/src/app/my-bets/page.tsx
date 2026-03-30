'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function MyBetsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleString('en-CA', { timeZone: 'America/Costa_Rica' }).split(',')[0]);
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBets();
  }, [selectedDate]);

  const fetchBets = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const response = await api.get(`/bets?date=${selectedDate}`, token);
      if (Array.isArray(response)) {
        setBets(response as never[]);
      } else {
        setBets([]);
      }
    } catch (error) {
      console.error('Error al obtener jugadas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 pt-10 pb-20 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="bg-gradient-to-r from-emerald-900/40 to-blue-900/40 border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500"></div>
         <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Historial de Jugadas</h1>
      </header>

      <div className="glass-panel p-6 border-white/5 rounded-2xl flex flex-col md:flex-row gap-4 items-center mb-6 shadow-2xl">
        <label className="text-xs font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Fecha de Apuestas</label>
        <input 
          type="date" 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full md:w-auto p-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500 transition-all font-mono"
        />
      </div>
      
      {loading && (
        <div className="text-center py-10 text-emerald-400 uppercase tracking-widest text-xs font-black animate-pulse">
            Cargando Tiquetes...
        </div>
      )}
      
      {!loading && bets.length === 0 && (
        <div className="py-16 text-center border border-white/5 bg-black/20 rounded-2xl">
           <span className="text-4xl grayscale opacity-30">🎫</span>
           <p className="mt-4 text-gray-500 font-bold uppercase tracking-widest text-xs">No hay jugadas para este día</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bets.map((bet: any) => (
          <div key={bet.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-xl hover:border-emerald-500/50 transition-all">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <span className="font-black text-white text-lg tracking-tighter uppercase">{bet.lottery_type}</span>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                     Sorteo: {new Date(bet.draw_date).toLocaleDateString()} {bet.draw_time}
                  </div>
               </div>
               <span className="text-emerald-400 font-black text-xl">₡{Number(bet.total_amount).toLocaleString()}</span>
            </div>

            <div className="space-y-2 border-t border-white/5 pt-4">
               {bet.items && bet.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-gray-400 font-mono font-bold">🎯 {item.number}</span>
                      <span className="text-emerald-500/80">₡{Number(item.amount).toLocaleString()}</span>
                  </div>
               ))}
               {!bet.items && <div className="text-xs text-gray-500">Sin detalle de números (legacy)</div>}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
               <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Estado</span>
               <span className={`text-[10px] uppercase font-black px-2 py-1 rounded bg-black/40 border ${bet.status === 'WON' ? 'border-emerald-500 text-emerald-400' : bet.status === 'LOST' ? 'border-red-500/50 text-red-400/80' : 'border-gray-500 text-gray-400'}`}>
                  {bet.status}
               </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
