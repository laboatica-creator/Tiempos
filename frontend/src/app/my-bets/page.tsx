'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatDrawDate, formatTransactionDate, getCurrentCostaRicaDate } from '@/lib/dateUtils';

export default function MyBetsPage() {
  const [selectedDate, setSelectedDate] = useState(getCurrentCostaRicaDate());
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBets = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.get(`/bets?date=${selectedDate}`, token);
      setBets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Error al cargar las jugadas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
  }, [selectedDate]);

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 pb-32">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">📋 Mis Jugadas</h1>
        
        <div className="mb-6 bg-white/5 p-4 rounded-2xl">
          <label className="block text-sm font-medium text-gray-300 mb-2">Seleccionar fecha</label>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white"
          />
        </div>
        
        {loading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-xl">
            {error}
          </div>
        )}
        
        {!loading && bets.length === 0 && (
          <div className="text-center text-gray-400 py-10 bg-white/5 rounded-2xl">
            No hay jugadas para el {selectedDate}
          </div>
        )}
        
        <div className="space-y-4">
          {bets.map((bet) => (
            <div key={bet.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      bet.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 
                      bet.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {bet.status === 'ACTIVE' ? '✓ Activa' : bet.status === 'CANCELLED' ? '✗ Cancelada' : bet.status}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {formatTransactionDate(bet.created_at)}
                    </span>
                  </div>
                  <p className="text-white font-bold text-lg">
                    {bet.lottery_type} - {formatDrawDate(bet.draw_date)} {bet.draw_time}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Números: {Array.isArray(bet.items) 
                      ? bet.items.map((i: any) => `${i.number} (₡${i.amount})`).join(', ') 
                      : bet.numbers || '-'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold text-xl">₡{Number(bet.total_amount || bet.amount).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}