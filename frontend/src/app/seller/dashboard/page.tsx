'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';

interface Draw {
  id: string;
  draw_date: string;
  draw_time: string;
  loteria_type: string;
  is_open: boolean;
}

interface Bet {
  id: string;
  player_name: string;
  number: string;
  amount: number;
  loteria_type: string;
  draw_time: string;
  created_at: string;
}

interface SalesSummary {
  total_bets: number;
  total_amount: number;
  tica_bets: number;
  nica_bets: number;
}

export default function SellerDashboard() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [selectedNumber, setSelectedNumber] = useState('');
  const [amount, setAmount] = useState(200);
  const [loteriaType, setLoteriaType] = useState<'TICA' | 'NICA'>('TICA');
  const [loading, setLoading] = useState(false);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [recentBets, setRecentBets] = useState<Bet[]>([]);
  const [showTicket, setShowTicket] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const router = useRouter();

  // Montos predefinidos
  const amounts = [200, 500, 1000, 5000];

  useEffect(() => {
    checkAuth();
    fetchDraws();
    fetchTodaySales();
  }, []);

  const checkAuth = () => {
    const token = sessionStorage.getItem('token');
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    
    if (!token) {
      router.push('/login');
    }
    
    if (user.role !== 'SELLER') {
      router.push('/betting');
    }
  };

  const fetchDraws = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.get('/seller/draws', token);
      if (Array.isArray(data)) {
        setDraws(data);
        // Seleccionar el primer sorteo abierto
        const openDraw = data.find(d => d.is_open);
        if (openDraw) setSelectedDraw(openDraw);
      }
    } catch (err) {
      console.error('Error fetching draws:', err);
    }
  };

  const fetchTodaySales = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.get('/seller/today-sales', token);
      if (data.summary) {
        setSalesSummary(data.summary);
        setRecentBets(data.recent_bets || []);
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
    }
  };

  const handleNumberClick = (num: string) => {
    setSelectedNumber(num);
  };

  const handlePlaceBet = async () => {
    if (!selectedDraw) {
      setError('Seleccione un sorteo');
      return;
    }
    if (!playerName.trim()) {
      setError('Ingrese el nombre del jugador');
      return;
    }
    if (!playerPhone.trim()) {
      setError('Ingrese el teléfono del jugador');
      return;
    }
    if (!selectedNumber) {
      setError('Seleccione un número');
      return;
    }
    if (amount < 200) {
      setError('El monto mínimo es ₡200');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = sessionStorage.getItem('token');
      const data = await api.post('/seller/cash-bet', {
        player_name: playerName,
        player_phone: playerPhone,
        number: selectedNumber,
        amount: amount,
        draw_id: selectedDraw.id,
        loteria_type: loteriaType
      }, token);

      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(`✅ Apuesta registrada: ${selectedNumber} por ₡${amount.toLocaleString()}`);
        setShowTicket(data.bet);
        
        // Limpiar formulario
        setPlayerName('');
        setPlayerPhone('');
        setSelectedNumber('');
        setAmount(200);
        
        // Actualizar ventas del día
        fetchTodaySales();
        
        // Auto-ocultar mensaje después de 3 segundos
        setTimeout(() => setSuccess(''), 3000);
        setTimeout(() => setShowTicket(null), 5000);
      }
    } catch (err) {
      setError('Error al registrar la apuesta');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintTicket = () => {
    if (!showTicket) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante Tiempos Pro</title>
        <style>
          body { font-family: monospace; padding: 20px; text-align: center; }
          .ticket { border: 1px solid #000; padding: 20px; max-width: 300px; margin: 0 auto; }
          .title { font-size: 20px; font-weight: bold; }
          .number { font-size: 48px; font-weight: bold; margin: 20px 0; }
          .amount { font-size: 24px; color: green; }
          .footer { margin-top: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="title">TIEMPOS PRO</div>
          <div class="subtitle">Comprobante de Apuesta</div>
          <hr/>
          <div>Número: <strong>${showTicket.number}</strong></div>
          <div>Monto: ₡${showTicket.amount.toLocaleString()}</div>
          <div>Lotería: ${showTicket.loteria_type}</div>
          <div>Jugador: ${playerName}</div>
          <div>Teléfono: ${playerPhone}</div>
          <div>Fecha: ${new Date().toLocaleString()}</div>
          <div class="footer">¡Buena suerte!</div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  // Generar números del 00 al 99 en 7 columnas
  const numbers = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <header className="bg-[#1e293b] p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-white">🏪 Terminal de Ventas</h1>
            <p className="text-emerald-400 text-xs">Vendedor - Apuestas en efectivo</p>
          </div>
          <div className="flex gap-3">
            <Link href="/seller/history" className="text-gray-400 hover:text-white text-sm">📊 Historial</Link>
            <button
              onClick={() => {
                sessionStorage.clear();
                router.push('/login');
              }}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              🔚 Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Alertas */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400 font-bold">
            🚫 {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-4 text-emerald-400 font-bold">
            {success}
          </div>
        )}

        {/* Selector de sorteo y tipo de lotería */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1e293b] rounded-xl p-4">
            <label className="text-gray-400 text-xs uppercase font-black">Sorteo</label>
            <select
              className="w-full mt-1 bg-[#0f172a] border border-white/10 rounded-lg p-2 text-white"
              value={selectedDraw?.id || ''}
              onChange={(e) => {
                const draw = draws.find(d => d.id === e.target.value);
                setSelectedDraw(draw || null);
              }}
            >
              <option value="">Seleccionar sorteo</option>
              {draws.map(draw => (
                <option key={draw.id} value={draw.id}>
                  {draw.draw_date} - {draw.draw_time} ({draw.loteria_type}) {!draw.is_open && '🔒 CERRADO'}
                </option>
              ))}
            </select>
          </div>
          
          <div className="bg-[#1e293b] rounded-xl p-4">
            <label className="text-gray-400 text-xs uppercase font-black">Tipo de Lotería</label>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setLoteriaType('TICA')}
                className={`flex-1 py-2 rounded-lg font-bold ${
                  loteriaType === 'TICA' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-[#0f172a] text-gray-400'
                }`}
              >
                🇨🇷 TICA
              </button>
              <button
                onClick={() => setLoteriaType('NICA')}
                className={`flex-1 py-2 rounded-lg font-bold ${
                  loteriaType === 'NICA' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-[#0f172a] text-gray-400'
                }`}
              >
                🇳🇮 NICA
              </button>
            </div>
          </div>
          
          <div className="bg-[#1e293b] rounded-xl p-4">
            <label className="text-gray-400 text-xs uppercase font-black">Monto (₡)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {amounts.map(a => (
                <button
                  key={a}
                  onClick={() => setAmount(a)}
                  className={`px-4 py-2 rounded-lg font-bold ${
                    amount === a 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-[#0f172a] text-gray-400'
                  }`}
                >
                  ₡{a.toLocaleString()}
                </button>
              ))}
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-24 bg-[#0f172a] border border-white/10 rounded-lg p-2 text-white text-right"
              />
            </div>
          </div>
        </div>

        {/* Datos del jugador */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#1e293b] rounded-xl p-4">
            <label className="text-gray-400 text-xs uppercase font-black">Nombre del Jugador</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Nombre completo"
              className="w-full mt-1 bg-[#0f172a] border border-white/10 rounded-lg p-3 text-white"
            />
          </div>
          <div className="bg-[#1e293b] rounded-xl p-4">
            <label className="text-gray-400 text-xs uppercase font-black">Teléfono del Jugador</label>
            <input
              type="tel"
              value={playerPhone}
              onChange={(e) => setPlayerPhone(e.target.value)}
              placeholder="+506 8888-8888"
              className="w-full mt-1 bg-[#0f172a] border border-white/10 rounded-lg p-3 text-white"
            />
          </div>
        </div>

        {/* Grid de números */}
        <div className="bg-[#1e293b] rounded-xl p-4">
          <h3 className="text-white font-bold mb-4">Seleccione un número</h3>
          <div className="grid grid-cols-7 gap-2">
            {numbers.map(num => (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                className={`py-3 rounded-xl font-black text-lg transition-all ${
                  selectedNumber === num
                    ? 'bg-emerald-500 text-white scale-105 shadow-lg'
                    : 'bg-[#0f172a] text-white hover:bg-emerald-500/50'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Botón de registrar */}
        <button
          onClick={handlePlaceBet}
          disabled={loading || !selectedDraw?.is_open}
          className={`w-full py-5 rounded-xl font-black text-xl transition-all ${
            loading || !selectedDraw?.is_open
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-600 to-emerald-400 hover:brightness-110'
          } text-white`}
        >
          {loading ? '🔄 Registrando...' : '💰 REGISTRAR APUESTA EN EFECTIVO'}
        </button>

        {/* Resumen de ventas del día */}
        {salesSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1e293b] rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs">Total Apuestas</p>
              <p className="text-2xl font-black text-white">{salesSummary.total_bets}</p>
            </div>
            <div className="bg-[#1e293b] rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs">Ventas Hoy</p>
              <p className="text-2xl font-black text-emerald-400">₡{Number(salesSummary.total_amount).toLocaleString()}</p>
            </div>
            <div className="bg-[#1e293b] rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs">TICA</p>
              <p className="text-xl font-black text-white">{salesSummary.tica_bets}</p>
            </div>
            <div className="bg-[#1e293b] rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs">NICA</p>
              <p className="text-xl font-black text-white">{salesSummary.nica_bets}</p>
            </div>
          </div>
        )}

        {/* Apuestas recientes */}
        {recentBets.length > 0 && (
          <div className="bg-[#1e293b] rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">📋 Apuestas recientes</h3>
            <div className="space-y-2 max-h-64 overflow-auto">
              {recentBets.map(bet => (
                <div key={bet.id} className="flex justify-between items-center p-3 bg-[#0f172a] rounded-lg">
                  <div>
                    <p className="text-white font-bold">{bet.number}</p>
                    <p className="text-gray-400 text-xs">{bet.player_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-bold">₡{bet.amount.toLocaleString()}</p>
                    <p className="text-gray-500 text-[10px]">{new Date(bet.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de ticket para imprimir */}
      {showTicket && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black rounded-2xl p-6 max-w-sm w-full text-center">
            <h2 className="text-2xl font-black">🎫 COMPROBANTE</h2>
            <div className="my-4">
              <p className="text-gray-500 text-sm">Número</p>
              <p className="text-5xl font-black text-emerald-600">{showTicket.number}</p>
            </div>
            <div className="my-2">
              <p className="text-gray-500 text-sm">Monto</p>
              <p className="text-2xl font-bold">₡{showTicket.amount.toLocaleString()}</p>
            </div>
            <div className="my-2">
              <p className="text-gray-500 text-sm">Jugador</p>
              <p className="font-bold">{playerName}</p>
            </div>
            <div className="my-2">
              <p className="text-gray-500 text-sm">Teléfono</p>
              <p>{playerPhone}</p>
            </div>
            <div className="my-4 pt-4 border-t">
              <button
                onClick={handlePrintTicket}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold"
              >
                🖨️ IMPRIMIR
              </button>
              <button
                onClick={() => setShowTicket(null)}
                className="w-full mt-2 py-2 text-gray-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}