'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../../lib/api';

interface SellerDetail {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  is_active: boolean;
  created_at: string;
  daily_sales: number;
}

interface Bet {
  id: string;
  number: string;
  amount: number;
  player_name: string;
  created_at: string;
  draw_date: string;
  draw_time: string;
  status: string;
  prize_amount: number;
}

interface Totals {
  total_bets: number;
  total_sales: number;
  total_prizes: number;
}

export default function SellerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = params.id as string;
  
  const [seller, setSeller] = useState<SellerDetail | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [totals, setTotals] = useState<Totals>({ total_bets: 0, total_sales: 0, total_prizes: 0 });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [commissionPercent, setCommissionPercent] = useState(10);
  const [liquidationResult, setLiquidationResult] = useState<any>(null);

  useEffect(() => {
    fetchSellerDetail();
    fetchSellerSales();
  }, [period, startDate, endDate]);

  const fetchSellerDetail = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.get('/admin/sellers', token);
      if (Array.isArray(data)) {
        const found = data.find(s => s.id === sellerId);
        setSeller(found || null);
      }
    } catch (err) {
      console.error('Error fetching seller:', err);
    }
  };

  const fetchSellerSales = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      let url = `/admin/sellers/${sellerId}/sales`;
      if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
      } else if (period !== 'custom') {
        url += `?period=${period}`;
      }
      const data = await api.get(url, token);
      
      // 🔥 ALERTA DE DEPURACIÓN - Muestra los datos recibidos
      alert('Datos recibidos:\n' + JSON.stringify(data, null, 2).substring(0, 1000));
      
      if (data.bets) {
        setBets(data.bets);
        setTotals(data.totals);
      } else {
        alert('No hay propiedad "bets" en la respuesta. Respuesta: ' + JSON.stringify(data));
      }
    } catch (err: any) {
      console.error('Error fetching sales:', err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLiquidate = async () => {
    if (!startDate || !endDate) {
      alert('Seleccione fechas para liquidar');
      return;
    }
    
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.post('/admin/sellers/liquidate', {
        seller_id: sellerId,
        start_date: startDate,
        end_date: endDate,
        commission_percentage: commissionPercent
      }, token);
      
      if (data.error) {
        alert(data.error);
        setLiquidationResult({ error: data.error, shortfall: data.shortfall });
      } else {
        setLiquidationResult(data);
        alert(`✅ Liquidación calculada: Ventas ₡${data.summary.total_sales.toLocaleString()}, Comisión ₡${data.summary.commission_amount.toLocaleString()}, Neto ₡${data.summary.net_to_seller.toLocaleString()}`);
      }
    } catch (err) {
      alert('Error al liquidar');
    }
  };

  const handlePayPrize = async (betId: string, amount: number) => {
    if (!confirm(`¿Desea pagar el premio de ₡${amount.toLocaleString()}?`)) return;
    
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.post(`/admin/sellers/pay-prize/${betId}`, {}, token);
      if (data.error) {
        alert(data.error);
      } else {
        alert('✅ Premio marcado como pagado');
        fetchSellerSales();
      }
    } catch (err) {
      alert('Error al pagar premio');
    }
  };

  if (loading && !seller) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Link href="/admin/sellers" className="text-emerald-400 text-sm">← Volver a Vendedores</Link>
            <h1 className="text-3xl font-black text-white mt-2">{seller?.full_name}</h1>
            <p className="text-gray-400 text-sm">{seller?.email} | {seller?.phone_number}</p>
          </div>
          <div className={`px-4 py-2 rounded-xl ${seller?.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {seller?.is_active ? 'Activo' : 'Inactivo'}
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">📅 Filtros de Ventas</h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => { setPeriod('today'); setStartDate(''); setEndDate(''); }}
              className={`px-4 py-2 rounded-lg ${period === 'today' ? 'bg-emerald-500 text-white' : 'bg-[#0f172a] text-gray-400'}`}
            >
              Hoy
            </button>
            <button
              onClick={() => { setPeriod('week'); setStartDate(''); setEndDate(''); }}
              className={`px-4 py-2 rounded-lg ${period === 'week' ? 'bg-emerald-500 text-white' : 'bg-[#0f172a] text-gray-400'}`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => { setPeriod('month'); setStartDate(''); setEndDate(''); }}
              className={`px-4 py-2 rounded-lg ${period === 'month' ? 'bg-emerald-500 text-white' : 'bg-[#0f172a] text-gray-400'}`}
            >
              Este Mes
            </button>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setPeriod('custom'); setStartDate(e.target.value); }}
                className="bg-[#0f172a] border border-white/10 rounded-lg p-2 text-white"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setPeriod('custom'); setEndDate(e.target.value); }}
                className="bg-[#0f172a] border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1e293b] rounded-2xl p-6 text-center">
            <p className="text-gray-400 text-xs uppercase">Total Apuestas</p>
            <p className="text-3xl font-black text-white">{totals.total_bets}</p>
          </div>
          <div className="bg-[#1e293b] rounded-2xl p-6 text-center">
            <p className="text-gray-400 text-xs uppercase">Total Ventas</p>
            <p className="text-3xl font-black text-emerald-400">₡{Number(totals.total_sales).toLocaleString()}</p>
          </div>
          <div className="bg-[#1e293b] rounded-2xl p-6 text-center">
            <p className="text-gray-400 text-xs uppercase">Total Premios</p>
            <p className="text-3xl font-black text-amber-400">₡{Number(totals.total_prizes).toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 rounded-2xl p-6 border border-emerald-500/30">
          <h3 className="text-white font-bold mb-4">💰 Liquidación de Ventas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-gray-400 text-xs">Fecha Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#0f172a] border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs">Fecha Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#0f172a] border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs">Comisión del Vendedor (%)</label>
              <input
                type="number"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(Number(e.target.value))}
                className="w-full bg-[#0f172a] border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
          </div>
          <button
            onClick={handleLiquidate}
            className="mt-4 w-full py-3 bg-emerald-500 rounded-xl text-white font-bold"
          >
            Calcular Liquidación
          </button>
          
          {liquidationResult?.error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-red-400 font-bold">⚠️ {liquidationResult.error}</p>
            </div>
          )}
        </div>

        <div className="bg-[#1e293b] rounded-2xl overflow-hidden">
          <h3 className="text-white font-bold p-6 pb-0">📋 Apuestas Realizadas</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0f172a]">
                <tr>
                  <th className="p-4 text-left text-gray-400 text-xs">Fecha</th>
                  <th className="p-4 text-left text-gray-400 text-xs">Jugador</th>
                  <th className="p-4 text-center text-gray-400 text-xs">Número</th>
                  <th className="p-4 text-right text-gray-400 text-xs">Monto</th>
                  <th className="p-4 text-right text-gray-400 text-xs">Premio</th>
                  <th className="p-4 text-center text-gray-400 text-xs">Estado</th>
                  <th className="p-4 text-center text-gray-400 text-xs">Acción</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((bet) => (
                  <tr key={bet.id} className="border-t border-white/5">
                    <td className="p-4 text-white text-sm">{new Date(bet.created_at).toLocaleString()} </td>
                    <td className="p-4 text-white text-sm">{bet.player_name}</td>
                    <td className="p-4 text-center text-white font-bold text-xl">{bet.number}</td>
                    <td className="p-4 text-right text-emerald-400">₡{bet.amount.toLocaleString()}</td>
                    <td className="p-4 text-right text-amber-400">{bet.prize_amount > 0 ? `₡${bet.prize_amount.toLocaleString()}` : '-'}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${bet.status === 'won' ? 'bg-amber-500/20 text-amber-400' : bet.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {bet.status === 'won' ? 'Ganador' : bet.status === 'active' ? 'Activa' : 'Perdida'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {bet.status === 'won' && bet.prize_amount > 0 && (
                        <button
                          onClick={() => handlePayPrize(bet.id, bet.prize_amount)}
                          className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs hover:bg-amber-500/30"
                        >
                          Pagar Premio
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}