'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

type ReportType = 'sales' | 'players' | 'sinpe' | 'withdrawals' | 'winnings' | 'dashboard';

const reportLabels = {
  sales: '📊 Ventas y Apuestas',
  players: '👥 Jugadores',
  sinpe: '📱 Recargas SINPE',
  withdrawals: '💸 Retiros',
  winnings: '🏆 Premios Pagados',
  dashboard: '📈 Dashboard'
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('dashboard');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = sessionStorage.getItem('token');
    setToken(t);
  }, []);

  const fetchReport = async () => {
    if (!token) {
      console.error('No token found');
      return;
    }
    
    setLoading(true);
    try {
      let endpoint = '';
      switch (reportType) {
        case 'sales': endpoint = '/admin/reports/sales'; break;
        case 'players': endpoint = '/admin/reports/players'; break;
        case 'sinpe': endpoint = '/admin/reports/sinpe'; break;
        case 'withdrawals': endpoint = '/admin/reports/withdrawals'; break;
        case 'winnings': endpoint = '/admin/reports/winnings'; break;
        case 'dashboard': endpoint = '/admin/reports/dashboard'; break;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://tiempos-backend.onrender.com'}${endpoint}?start_date=${startDate}&end_date=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      
      // Si es dashboard, mostrar como objeto único
      if (reportType === 'dashboard') {
        setData([result]);
      } else {
        setData(Array.isArray(result) ? result : []);
      }
    } catch (error) {
      console.error('Error al obtener reporte:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Columnas a mostrar en cada reporte (excluyendo UUIDs y columnas vacías)
  const getDisplayColumns = (type: ReportType): string[] => {
    switch (type) {
      case 'sales':
        return ['#', 'Fecha', 'Total Apuestas', 'Monto Total', 'Jugadores Únicos'];
      case 'players':
        return ['#', 'Nombre', 'Email', 'Teléfono', 'Rol', 'Estado', 'Fecha Registro', 'Total Apuestas', 'Monto Apostado'];
      case 'sinpe':
        return ['#', 'Fecha', 'Usuario', 'Email', 'Monto', 'Referencia', 'Estado'];
      case 'withdrawals':
        return ['#', 'Fecha', 'Usuario', 'Email', 'Monto', 'Método', 'Estado'];
      case 'winnings':
        return ['#', 'Fecha Sorteo', 'Lotería', 'Usuario', 'Email', 'Teléfono', 'Monto', 'Estado'];
      case 'dashboard':
        return ['Métrica', 'Valor'];
      default:
        return [];
    }
  };

  // Mapear datos a filas con números secuenciales
  const getDisplayRows = (type: ReportType, rows: any[]): any[] => {
    if (type === 'dashboard') {
      const metrics = rows[0] || {};
      return Object.entries(metrics).map(([key, value], idx) => ({
        '#': idx + 1,
        'Métrica': key,
        'Valor': typeof value === 'number' ? `₡${value.toLocaleString()}` : value
      }));
    }

    return rows.map((row, idx) => {
      const baseRow: any = { '#': idx + 1 };
      
      switch (type) {
        case 'sales':
          baseRow['Fecha'] = row.date ? new Date(row.date).toLocaleDateString() : '-';
          baseRow['Total Apuestas'] = row.total_bets || 0;
          baseRow['Monto Total'] = `₡${parseFloat(row.total_amount || 0).toLocaleString()}`;
          baseRow['Jugadores Únicos'] = row.unique_players || 0;
          break;
          
        case 'players':
          baseRow['Nombre'] = row.username || row.name || '-';
          baseRow['Email'] = row.email || '-';
          baseRow['Teléfono'] = row.phone || row.phone_number || '-';
          baseRow['Rol'] = row.role || '-';
          baseRow['Estado'] = row.status || (row.is_active ? 'ACTIVO' : 'INACTIVO');
          baseRow['Fecha Registro'] = row.registered_date ? new Date(row.registered_date).toLocaleDateString() : '-';
          baseRow['Total Apuestas'] = row.total_bets || 0;
          baseRow['Monto Apostado'] = `₡${parseFloat(row.total_bet_amount || 0).toLocaleString()}`;
          break;
          
        case 'sinpe':
          baseRow['Fecha'] = row.created_at ? new Date(row.created_at).toLocaleString() : '-';
          baseRow['Usuario'] = row.user_name || row.name || '-';
          baseRow['Email'] = row.user_email || row.email || '-';
          baseRow['Monto'] = `₡${parseFloat(row.amount || 0).toLocaleString()}`;
          baseRow['Referencia'] = row.reference_number || row.details || '-';
          baseRow['Estado'] = row.status || '-';
          break;
          
        case 'withdrawals':
          baseRow['Fecha'] = row.created_at ? new Date(row.created_at).toLocaleString() : '-';
          baseRow['Usuario'] = row.user_name || row.name || '-';
          baseRow['Email'] = row.user_email || row.email || '-';
          baseRow['Monto'] = `₡${parseFloat(row.amount || 0).toLocaleString()}`;
          baseRow['Método'] = row.method || '-';
          baseRow['Estado'] = row.status || '-';
          break;
          
        case 'winnings':
          baseRow['Fecha Sorteo'] = row.draw_date ? new Date(row.draw_date).toLocaleDateString() : '-';
          baseRow['Lotería'] = row.lottery_type || '-';
          baseRow['Usuario'] = row.user_name || row.name || '-';
          baseRow['Email'] = row.user_email || row.email || '-';
          baseRow['Teléfono'] = row.user_phone || row.phone || '-';
          baseRow['Monto'] = `₡${parseFloat(row.amount || 0).toLocaleString()}`;
          baseRow['Estado'] = row.status || 'COMPLETED';
          break;
      }
      
      return baseRow;
    });
  };

  const displayColumns = getDisplayColumns(reportType);
  const displayRows = getDisplayRows(reportType, data);

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">📊 Reportes de Administración</h1>
        <p className="text-gray-400 mb-6">Visualiza y exporta los datos de la plataforma</p>
        
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Reporte</label>
              <select 
                value={reportType} 
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white"
              >
                {Object.entries(reportLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Desde</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Hasta</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white"
              />
            </div>
            
            <div className="flex items-end">
              <button 
                onClick={fetchReport} 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Cargando...' : 'Generar Reporte'}
              </button>
            </div>
            
            {displayRows.length > 0 && (
              <div className="flex items-end">
                <button 
                  onClick={() => {
                    const csv = displayRows.map(row => displayColumns.map(col => row[col]).join(',')).join('\n');
                    const blob = new Blob([`${displayColumns.join(',')}\n${csv}`], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${reportType}_report_${startDate}_to_${endDate}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  📥 Exportar CSV
                </button>
              </div>
            )}
          </div>
        </div>
        
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        )}
        
        {!loading && displayRows.length > 0 && (
          <div className="bg-white/5 backdrop-blur rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-white/10">
                  <tr>
                    {displayColumns.map(col => (
                      <th key={col} className="px-4 py-3 text-left text-sm font-semibold text-gray-200">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {displayRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      {displayColumns.map(col => (
                        <td key={col} className="px-4 py-3 text-sm text-gray-300">
                          {row[col] !== undefined && row[col] !== null ? String(row[col]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {!loading && displayRows.length === 0 && data.length === 0 && (
          <div className="text-center text-gray-400 py-20">
            No hay datos para el período seleccionado
          </div>
        )}
      </div>
    </div>
  );
}