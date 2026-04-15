'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import Link from 'next/link';

interface Stats {
  todaySales: number;
  todayWinnings: number;
  totalUsers: number;
  pendingSinpe: number;
  pendingWithdrawals: number;
  sinpeTotal: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    todaySales: 0,
    todayWinnings: 0,
    totalUsers: 0,
    pendingSinpe: 0,
    pendingWithdrawals: 0,
    sinpeTotal: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [draws, setDraws] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const statsData = await api.get('/admin/reports/dashboard', token);
      const drawsData = await api.get('/draws', token);

      if (statsData && !statsData.error) {
        setStats({
          todaySales: Number(statsData.total_sales || 0),
          todayWinnings: Number(statsData.total_winnings || 0),
          totalUsers: Number(statsData.total_players || 0),
          pendingSinpe: Number(statsData.sinpe_deposits_count || 0),
          pendingWithdrawals: Number(statsData.pending_withdrawals || 0),
          sinpeTotal: Number(statsData.sinpe_deposits_total || 0)
        });
        setChartData(statsData.chart_data || []);
      } else if (statsData.error) {
        console.error('Stats error:', statsData.error);
        setError('Error al cargar estadísticas.');
      }

      if (Array.isArray(drawsData)) {
        setDraws(drawsData.filter(d => d.status === 'OPEN' || d.status === 'CLOSED').slice(0, 5));
      }
    } catch (err) {
      setError('Falla de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Ventas Hoy', value: stats.todaySales, icon: '💰', color: 'from-emerald-500 to-emerald-700', prefix: '₡' },
    { label: 'Depósitos Hoy', value: stats.sinpeTotal, icon: '📊', color: 'from-blue-500 to-blue-700', prefix: '₡' },
    { label: 'Jugadores', value: stats.totalUsers, icon: '👥', color: 'from-purple-500 to-purple-700' },
    { label: 'Premios Mes', value: stats.todayWinnings, icon: '🏆', color: 'from-amber-500 to-amber-700', prefix: '₡' },
    { label: 'SINPE Pendientes', value: stats.pendingSinpe, icon: '🕒', color: 'from-red-500 to-rose-700', link: '/admin/recharges', alert: stats.pendingSinpe > 0 },
    { label: 'Retiros Pendientes', value: stats.pendingWithdrawals, icon: '💸', color: 'from-orange-500 to-orange-700', link: '/admin/withdrawals', alert: stats.pendingWithdrawals > 0 }
  ];

  // 🔥 QUICK ACTIONS MODIFICADO: Eliminado "Gestionar Jugadores", agregado "Gestión de Vendedores"
  const quickActions = [
    { label: '🏪 Gestión de Vendedores', path: '/admin/sellers', icon: '🏪', desc: 'Supervisar ventas y rendimiento' },
    { label: 'Sorteos y Resultados', path: '/admin/results', icon: '🎰', desc: 'Definir ganadores y controlar ventas' },
    { label: 'Verificar Depósitos', path: '/admin/recharges', icon: '💳', desc: 'Aprobar recargas SINPE' },
    { label: 'Procesar Retiros', path: '/admin/withdrawals', icon: '💵', desc: 'Transferir dinero a ganadores' },
    { label: 'Reportes Detallados', path: '/admin/reports', icon: '📝', desc: 'Auditoría y estados financieros' },
    { label: 'Configuración', path: '/admin/settings', icon: '⚙️', desc: 'Límites, horarios y sistema' }
  ];

  return (
    <main className="min-h-screen bg-[#0f172a] p-4 lg:p-8 space-y-8 pb-32">
      <header className="flex justify-between items-center text-white">
        <div className="flex items-center gap-6">
          <Logo size="text-4xl" showSub={false} />
          <div className="h-10 w-[1px] bg-white/10 hidden md:block"></div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic text-emerald-500">Centro de Control</h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Gestión General del Sistema</p>
          </div>
        </div>
        <button 
            onClick={() => fetchData()}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-emerald-500/20 transition-all active:scale-95"
            title="Refrescar datos"
        >
          🔄
        </button>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-2xl text-red-500 text-xs font-black uppercase text-center">
             ⚠️ {error}
        </div>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className={`relative overflow-hidden group p-5 rounded-3xl border border-white/5 bg-gradient-to-br transition-all hover:scale-[1.03] ${card.alert ? 'animate-pulse border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : ''}`}>
             <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${card.color} opacity-20 blur-2xl group-hover:scale-150 transition-transform`}></div>
             <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{card.label}</p>
             <div className="flex items-end gap-1">
                <span className="text-white text-lg font-black">{card.prefix || ''}</span>
                <span className="text-white text-2xl font-black tracking-tighter">
                    {loading ? '...' : card.value.toLocaleString()}
                </span>
             </div>
             <div className="mt-3 flex justify-between items-center">
                <span className="text-2xl opacity-40 group-hover:opacity-100 transition-opacity">{card.icon}</span>
                {card.link && (
                    <Link href={card.link} className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter hover:underline">Ir ahora &rarr;</Link>
                )}
             </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8 space-y-6">
            <h2 className="text-white font-black uppercase text-xs tracking-widest ml-1">Atajos de Administración</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action, i) => (
                    <Link key={i} href={action.path} className="flex items-center gap-5 p-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all group active:scale-[0.98]">
                        <div className="w-14 h-14 bg-[#1e293b] rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-xl">
                            {action.icon}
                        </div>
                        <div>
                            <p className="text-white font-black text-sm uppercase">{action.label}</p>
                            <p className="text-gray-500 text-[10px] font-bold mt-0.5">{action.desc}</p>
                        </div>
                        <div className="ml-auto opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity">⚡</div>
                    </Link>
                ))}
            </div>
        </section>

        <section className="lg:col-span-4 space-y-6">
            <h2 className="text-white font-black uppercase text-xs tracking-widest ml-1">Sorteos Próximos</h2>
            <div className="bg-white/5 rounded-[2.5rem] p-6 border border-white/5 space-y-4">
                {draws.length > 0 ? draws.map((d, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-black/20 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${d.lottery_type === 'TICA' ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
                            <div>
                                <p className="text-white font-black text-[10px] uppercase">{d.lottery_type} • {d.draw_time}</p>
                                <p className="text-gray-600 text-[8px] font-mono">{new Date(d.draw_date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] text-emerald-500 font-black">₡{Number(d.total_sold || 0).toLocaleString()}</p>
                             <span className="text-[7px] text-gray-400 font-black uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded-lg border border-white/5">{d.status}</span>
                        </div>
                    </div>
                )) : (
                    <div className="py-20 text-center opacity-30">
                        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white">Buscando sorteos...</p>
                    </div>
                )}
                <Link href="/admin/results" className="block w-full text-center py-4 bg-white/5 rounded-2xl text-gray-400 text-[9px] font-black uppercase tracking-widest hover:text-white transition-colors">Ver todos los sorteos</Link>
            </div>
        </section>
      </div>

      <footer className="pt-10 border-t border-white/5 text-center">
            <p className="text-gray-600 text-[9px] font-black uppercase tracking-[0.5em]">Tiempos Pro • Dashboard v2.0</p>
      </footer>
    </main>
  );
}