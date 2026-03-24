'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ todaySales: 0, todayWinnings: 0, totalUsers: 0, pendingSinpe: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ticaExposure, setTicaExposure] = useState<Record<string, number>>({});
  const [nicaExposure, setNicaExposure] = useState<Record<string, number>>({});
  const [openDraws, setOpenDraws] = useState<any[]>([]);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [countdown, setCountdown] = useState('--:--:--');
  const [nextDraw, setNextDraw] = useState<any>(null);

  // Filters state
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterPlayer, setFilterPlayer] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  
  const [currentUser, setCurrentUser] = useState<any>(null);

  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    setCurrentUser(user);
    fetchData();
    fetchExposure();
    
    const exposureInterval = setInterval(() => {
        fetchExposure();
    }, 10000); // Every 10s

    return () => {
        clearInterval(exposureInterval);
    };
  }, []); // Run only on mount

  useEffect(() => {
    if (!nextDraw) {
        setCountdown('--, --, --');
        return;
    }

    const timer = setInterval(() => {
        const now = new Date();
        const drawDateStr = nextDraw.draw_date.split('T')[0];
        const drawDate = new Date(`${drawDateStr}T${nextDraw.draw_time}`);

        const diff = drawDate.getTime() - now.getTime();
        if (diff <= 0) {
            setCountdown('SORTEANDO...');
            return;
        }

        if (diff < 20 * 60 * 1000) {
            setCountdown('CERRADO');
            return;
        }

        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        setCountdown(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [nextDraw]);

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const [statsData, drawsData] = await Promise.all([
        api.get('/admin/stats', token),
        api.get('/draws', token)
      ]);

      if (statsData && !statsData.error) {
        setStats(statsData);
      }
      
      fetchTransactions();

      if (Array.isArray(drawsData)) {
        const today = new Date().toLocaleDateString('en-CA');
        const upcomingOpen = drawsData.filter((d: any) => {
            const dDate = new Date(d.draw_date).toLocaleDateString('en-CA');
            return dDate >= today && d.status === 'OPEN';
        }).sort((a,b) => (a.draw_date + a.draw_time).localeCompare(b.draw_date + b.draw_time));

        setOpenDraws(upcomingOpen);
        
        const now = new Date();
        const found = upcomingOpen.find((d: any) => {
            const dt = new Date(`${d.draw_date.split('T')[0]}T${d.draw_time}`);
            return dt.getTime() > now.getTime();
        });
        if (found) setNextDraw(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyClose = async (drawId: string) => {
     if (!confirm('¿Seguro que desea cerrar este sorteo de emergencia? Se reembolsarán las apuestas.')) return;
     try {
         const token = sessionStorage.getItem('token');
         await api.post(`/draws/${drawId}/cancel`, {}, token);
         setShowCloseModal(false);
         fetchData();
         alert('Sorteo cerrado exitosamente.');
     } catch (err: any) {
         alert(err.response?.data?.error || 'Error al cerrar sorteo');
     }
  };

  const fetchTransactions = async () => {
    try {
        const token = sessionStorage.getItem('token');
        const params = new URLSearchParams();
        if (filterStartDate) params.append('startDate', filterStartDate);
        if (filterEndDate) params.append('endDate', filterEndDate);
        if (filterPlayer) params.append('player', filterPlayer);
        if (filterType !== 'ALL') params.append('type', filterType);

        const txData = await api.get(`/admin/transactions?${params.toString()}`, token);
        if (Array.isArray(txData)) {
            setTransactions(txData);
        }
    } catch (err) {
        console.error('Error fetching transactions:', err);
    }
  };

  const fetchExposure = async () => {
    try {
        const token = sessionStorage.getItem('token');
        const [tica, nica] = await Promise.all([
            api.get('/admin/exposure/TICA', token),
            api.get('/admin/exposure/NICA', token)
        ]);
        if (tica && tica.exposure) setTicaExposure(tica.exposure);
        if (nica && nica.exposure) setNicaExposure(nica.exposure);
    } catch (err) {
        console.error(err);
    }
  };

  if (!isMounted) return null;

  const displayStats = [
    { name: 'Ventas (Hoy)', value: `₡${Number(stats?.todaySales || 0).toLocaleString()}`, color: 'text-emerald-400' },
    { name: 'Usuarios Totales', value: (stats?.totalUsers ?? 0).toString(), color: 'text-blue-400' },
    { name: 'Premios (Hoy)', value: `₡${Number(stats?.todayWinnings || 0).toLocaleString()}`, color: 'text-red-400' },
    { name: 'SINPE Pendientes', value: (stats?.pendingSinpe ?? 0).toString(), color: 'text-purple-400' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* Emergency Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <div className="glass-panel w-full max-w-lg p-8 bg-[#0f172a] border-red-500/30">
                <h2 className="text-2xl font-black text-white italic uppercase mb-6">Cierre de Emergencia</h2>
                <div className="space-y-3 mb-8 max-h-[400px] overflow-y-auto pr-2">
                    {openDraws.length > 0 ? openDraws.map(d => (
                        <div key={d.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center group hover:border-red-500/50 transition-all">
                            <div>
                                <p className="font-black text-white">{d.lottery_type} - {d.draw_time}</p>
                                <p className="text-[10px] text-gray-500 uppercase">{new Date(d.draw_date).toLocaleDateString('es-CR')}</p>
                            </div>
                            <button 
                                onClick={() => handleEmergencyClose(d.id)}
                                className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                            >
                                CERRAR YA
                            </button>
                        </div>
                    )) : <p className="text-gray-600 italic">No hay sorteos abiertos para cerrar...</p>}
                </div>
                <button 
                    onClick={() => setShowCloseModal(false)}
                    className="w-full py-3 text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] hover:text-white"
                >
                    Cancelar Operación
                </button>
            </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 bg-gradient-to-r from-emerald-600/20 via-blue-900/20 to-purple-900/20 border border-white/10 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-500"></div>
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-blue-300 tracking-[-0.02em] uppercase italic drop-shadow-sm">Panel Maestro</h1>
          <p className="text-blue-200/60 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Centro de Control y Gráficos en Vivo</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto relative z-10">
          <Link href="/admin/results" className="flex-1 md:flex-none py-4 px-8 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-black rounded-2xl hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 transition-all text-center uppercase text-xs tracking-widest active:scale-95">
            Gestionar Sorteos
          </Link>
          <button className="flex-1 md:flex-none py-4 px-8 bg-white/5 border border-white/10 text-gray-300 font-black rounded-2xl hover:bg-white/10 hover:text-white transition-all uppercase text-xs tracking-widest active:scale-95">
            Descargar Reporte
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayStats.map((stat, i) => {
          const colors = [
            'from-emerald-500/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/5',
            'from-blue-500/20 to-blue-900/10 border-blue-500/30 text-blue-400 shadow-blue-500/5',
            'from-purple-500/20 to-purple-900/10 border-purple-500/30 text-purple-400 shadow-purple-500/5',
            'from-amber-500/20 to-amber-900/10 border-amber-500/30 text-amber-400 shadow-amber-500/5'
          ];
          const colorClass = colors[i % colors.length];

          return (
            <div key={i} className={`glass-panel p-6 bg-gradient-to-br ${colorClass} shadow-xl transform hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/10 transition-colors"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">{stat.name}</p>
              <div className="flex items-end justify-between mt-2">
                <p className="text-5xl font-black text-white tracking-tighter drop-shadow-md">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Risk Monitor Chart Simulation */}
        <div className="lg:col-span-2 glass-panel p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-gray-100 uppercase tracking-tight">Riesgo por Número (TICA)</h2>
            <div className="flex gap-2">
               <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded text-[10px] text-emerald-400 font-bold uppercase tracking-widest">En Vivo</div>
            </div>
          </div>
          
          <div className="h-64 flex items-end gap-1">
             {Array.from({ length: 100 }, (_, i) => {
               const num = i.toString().padStart(2, '0');
               const exposure = ticaExposure[num] || 0;
               const h = Math.min((exposure / 50000) * 100, 100);
               return (
                 <div 
                   key={i} 
                   className={`flex-1 rounded-t-sm transition-all hover:brightness-125 cursor-help ${h > 80 ? 'bg-red-500' : h > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                   style={{ height: `${Math.max(h, 2)}%` }}
                   title={`Número ${num}: ₡${exposure.toLocaleString()}`}
                 />
               );
             })}
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-4 font-mono tracking-tighter">TICA (Límite: ₡50,000)</p>
        </div>

        {/* NICA Chart */}
        <div className="lg:col-span-1 glass-panel p-8">
           <div className="flex justify-between items-center mb-8">
             <h2 className="text-xl font-bold text-gray-100 uppercase tracking-tight">Riesgo NICA</h2>
           </div>
           <div className="h-64 flex items-end gap-1">
             {Array.from({ length: 100 }, (_, i) => {
               const num = i.toString().padStart(2, '0');
               const exposure = nicaExposure[num] || 0;
               const h = Math.min((exposure / 50000) * 100, 100);
               return (
                 <div 
                   key={i} 
                   className={`flex-1 rounded-t-sm transition-all hover:brightness-125 cursor-help ${h > 80 ? 'bg-red-500' : h > 50 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                   style={{ height: `${Math.max(h, 2)}%` }}
                   title={`Número ${num}: ₡${exposure.toLocaleString()}`}
                 />
               );
             })}
           </div>
           <p className="text-center text-[10px] text-gray-400 mt-4 font-mono tracking-tighter">NICA (Límite: ₡50,000)</p>
        </div>

        {/* Action Center & Next Draw */}
        <div className="glass-panel p-8 space-y-8">
           <div className="pb-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-tighter italic">Próximo Sorteo</h2>
              {nextDraw ? (
                  <div className="space-y-4">
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                          <div className="flex justify-between items-center">
                              <span className="text-2xl font-black text-white italic">{nextDraw.lottery_type}</span>
                              <span className={`text-lg font-mono font-black ${countdown.includes('CERRADO') ? 'text-red-500' : 'text-blue-400'}`}>{countdown}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{new Date(nextDraw.draw_date).toLocaleDateString('es-CR')} @ {nextDraw.draw_time}</p>
                      </div>
                      <div className="flex justify-between items-center px-2">
                          <span className="text-[10px] text-gray-500 font-bold uppercase">Monto Vendido</span>
                          <span className="text-lg font-black text-emerald-400">₡{Number(nextDraw.total_sold || 0).toLocaleString()}</span>
                      </div>
                  </div>
              ) : (
                  <p className="text-gray-600 italic text-sm py-4">No hay sorteos abiertos...</p>
              )}
           </div>

           <div className="space-y-4">
              <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">Acciones Rápidas</h2>
              <Link href="/admin/players" className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group block">
                <p className="font-bold group-hover:text-blue-400 text-sm">Afiliación de Jugadores</p>
                <p className="text-[10px] text-gray-500 uppercase">Gestionar cuentas de usuario</p>
              </Link>
              <Link href="/admin/recharges" className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group block">
                <p className="font-bold group-hover:text-emerald-400 text-sm">Verificar SINPE</p>
                <p className="text-[10px] text-gray-500 uppercase">{stats.pendingSinpe} depósitos pendientes</p>
              </Link>
              <button 
                onClick={() => setShowCloseModal(true)}
                className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/5 transition-all group block"
              >
                <p className="font-bold group-hover:text-red-400 text-sm">Emergencia: Cerrar Ventas</p>
                <p className="text-[10px] text-gray-500 uppercase">Bloqueo global inmediato</p>
              </button>
              {currentUser?.role === 'ADMIN' && (
                <Link href="/admin/database" className="w-full text-left p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/20 transition-all group block mt-4">
                  <p className="font-bold group-hover:text-white text-purple-400 text-sm">💾 Respaldo & Restauración</p>
                  <p className="text-[10px] text-gray-500 uppercase mt-1">Exportar e Importar Base de Datos</p>
                </Link>
              )}
           </div>
        </div>
      </div>

      {/* Recents Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-8 border-b border-white/5 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Transacciones Recientes</h2>
            <button 
                onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setFilterPlayer('');
                    setFilterType('ALL');
                }}
                className="text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"
            >
                Limpiar Filtros
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-white/5 rounded-[2rem] border border-white/5">
            <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Rango Desde</label>
                <input 
                    type="date"
                    value={filterStartDate}
                    onChange={e => setFilterStartDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-emerald-500/50 transition-colors"
                />
            </div>
            <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Rango Hasta</label>
                <input 
                    type="date"
                    value={filterEndDate}
                    onChange={e => setFilterEndDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-emerald-500/50 transition-colors"
                />
            </div>
            <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Jugador / ID</label>
                <input 
                    type="text"
                    placeholder="Nombre, email o cel..."
                    value={filterPlayer}
                    onChange={e => setFilterPlayer(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-emerald-500/50 transition-colors placeholder:text-gray-700"
                />
            </div>
            <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Tipo Acción</label>
                <select 
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                >
                    <option value="ALL">TODOS</option>
                    <option value="DEPOSIT">DEPÓSITOS</option>
                    <option value="BET">APUESTAS</option>
                    <option value="WIN">PREMIOS</option>
                    <option value="REFUND">REEMBOLSOS</option>
                    <option value="WITHDRAW">RETIROS</option>
                </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase font-black tracking-widest">
              <tr>
                <th className="px-8 py-4">ID</th>
                <th className="px-8 py-4">Usuario</th>
                <th className="px-8 py-4">Tipo</th>
                <th className="px-8 py-4">Monto</th>
                <th className="px-8 py-4">Estado</th>
                <th className="px-8 py-4">Tiempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map((tx, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors cursor-pointer">
                   <td className="px-8 py-5 text-gray-400 font-mono text-sm">#{tx.id.slice(0,4)}</td>
                   <td className="px-8 py-5 text-white font-bold">{tx.user_name}</td>
                   <td className="px-8 py-5">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${tx.type === 'BET' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {tx.type}
                      </span>
                   </td>
                   <td className="px-8 py-5 text-white font-black">₡{Number(tx.amount).toLocaleString()}</td>
                   <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-sm font-medium">Completado</span>
                      </div>
                   </td>
                   <td className="px-8 py-5 text-gray-600 text-sm">{new Date(tx.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                   <td colSpan={6} className="px-8 py-10 text-center text-gray-500">No hay transacciones hoy</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
