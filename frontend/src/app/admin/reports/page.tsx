'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';

type ReportType = 'sales' | 'players' | 'sinpe' | 'withdrawals' | 'winnings' | 'dashboard';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto load when changing type or dates
  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://tiempos-backend.onrender.com/api';
      let endpoint = '';
      switch (reportType) {
        case 'sales': endpoint = '/admin/reports/sales'; break;
        case 'players': endpoint = '/admin/reports/players'; break;
        case 'sinpe': endpoint = '/admin/reports/sinpe'; break;
        case 'withdrawals': endpoint = '/admin/reports/withdrawals'; break;
        case 'winnings': endpoint = '/admin/reports/winnings'; break;
        case 'dashboard': endpoint = '/admin/reports/dashboard'; break;
      }
      
      const response = await fetch(`${baseUrl}${endpoint}?start_date=${startDate}&end_date=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      
      // If it's the dashboard it might be an object, let's cast to array to use the unified table
      if (reportType === 'dashboard') {
        setData([result]);
      } else {
        setData(result);
      }
    } catch (error) {
      console.error('Error al obtener reporte:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute role="ADMIN">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 p-4 pt-10">
        <header className="bg-gradient-to-r from-blue-900/40 to-emerald-900/40 border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Reportes de Administración</h1>
        </header>
        
        <div className="glass-panel p-6 border-white/5 rounded-2xl space-y-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tipo de Reporte</label>
                <select 
                  value={reportType} 
                  onChange={(e) => setReportType(e.target.value as ReportType)} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500"
                >
                  <option value="dashboard">📈 Dashboard Resumen</option>
                  <option value="sales">📊 Ventas y Apuestas</option>
                  <option value="players">👥 Jugadores Activos/Inactivos</option>
                  <option value="sinpe">📱 Recargas SINPE</option>
                  <option value="withdrawals">💸 Retiros (SINPE/Banco)</option>
                  <option value="winnings">🏆 Premios Pagados</option>
                </select>
            </div>
            
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Desde</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500"
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Hasta</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500"
                />
            </div>

            <div className="flex items-end">
                <button 
                  onClick={fetchReport} 
                  disabled={loading} 
                  className="w-full bg-emerald-600/80 hover:bg-emerald-600 text-white font-black px-6 py-3 rounded-xl uppercase text-xs tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Consultando...' : 'Generar Reporte'}
                </button>
            </div>
          </div>
        </div>
        
        {data && data.length > 0 && (
          <div className="glass-panel overflow-x-auto rounded-2xl border-white/5 shadow-2xl relative">
            {loading && (
              <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-sm">
                 <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs animate-pulse">Sincronizando con Base de Datos...</p>
              </div>
            )}
            <table className="w-full text-left bg-transparent">
              <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                <tr>
                  {Object.keys(data[0]).map(key => (
                    <th key={key} className="p-4 whitespace-nowrap">{key.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-bold text-gray-300">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-all">
                    {Object.values(row).map((value: any, i) => (
                      <td key={i} className="p-4 whitespace-nowrap">
                        {value === null || value === undefined ? '-' : 
                           typeof value === 'boolean' ? (value ? 'Sí' : 'No') : 
                           value.toString().includes('1970') || value.toString().includes('T00:00:00') ? new Date(value).toLocaleDateString() : 
                           value.toString()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && (!data || data.length === 0) && (
          <div className="text-center text-gray-500 mt-10 p-10 border-2 border-dashed border-white/10 rounded-2xl">
              <p className="text-xs uppercase font-black tracking-[0.2em] opacity-50">No hay datos para el período seleccionado</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
