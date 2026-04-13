'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';

interface Bet {
  id: string;
  player_name: string;
  number: string;
  amount: number;
  loteria_type: string;
  draw_time: string;
  created_at: string;
}

export default function SellerHistory() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalBets, setTotalBets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      let url = '/seller/sales-history';
      if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
      }
      const data = await api.get(url, token);
      if (data.bets) {
        setBets(data.bets);
        setTotalSales(data.total_sales);
        setTotalBets(data.total_bets);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchHistory();
  };

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <header className="bg-[#1e293b] p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-white">📊 Historial de Ventas</h1>
          </div>
          <Link href="/seller/dashboard" className="text-emerald-400">
            ← Volver a Terminal
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* Filtros */}
        <div className="bg-[#1e293b] rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-gray-400 text-xs uppercase">Fecha inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#0f172a] border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs uppercase">Fecha fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#0f172a] border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
          <button
            onClick={handleFilter}
            className="bg-emerald-500 px-6 py-2 rounded-lg text-white font-bold"
          >
            Filtrar
          </button>
        </div>

        {/* Totales */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#1e293b] rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs">Total Ventas</p>
            <p className="text-3xl font-black text-emerald-400">₡{Number(totalSales).toLocaleString()}</p>
          </div>
          <div className="bg-[#1e293b] rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs">Total Apuestas</p>
            <p className="text-3xl font-black text-white">{totalBets}</p>
          </div>
        </div>

        {/* Tabla de apuestas */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Cargando historial...</div>
        ) : bets.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No hay ventas en este período</div>
        ) : (
          <div className="bg-[#1e293b] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0f172a]">
                  <tr>
                    <th className="p-3 text-left text-gray-400 text-xs">Fecha</th>
                    <th className="p-3 text-left text-gray-400 text-xs">Jugador</th>
                    <th className="p-3 text-left text-gray-400 text-xs">Número</th>
                    <th className="p-3 text-left text-gray-400 text-xs">Lotería</th>
                    <th className="p-3 text-right text-gray-400 text-xs">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {bets.map((bet) => (
                    <tr key={bet.id} className="border-t border-white/5">
                      <td className="p-3 text-white text-sm">{new Date(bet.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-white text-sm">{bet.player_name}</td>
                      <td className="p-3 text-white font-bold">{bet.number}</td>
                      <td className="p-3 text-white">{bet.loteria_type}</td>
                      <td className="p-3 text-right text-emerald-400 font-bold">₡{bet.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}