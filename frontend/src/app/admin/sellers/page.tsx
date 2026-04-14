'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import Logo from '@/components/Logo';

export default function AdminSellers() {
    const [sellers, setSellers] = useState<any[]>([]);
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const [sellersRes, statsRes] = await Promise.all([
                api.get('/admin/sellers', token),
                api.get('/admin/sellers/stats', token)
            ]);
            
            if (Array.isArray(sellersRes)) setSellers(sellersRes);
            if (Array.isArray(statsRes)) setStats(statsRes);
        } catch (err) {
            console.error('Error fetching admin sellers:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (sellerId: string, currentStatus: boolean) => {
        try {
            const token = sessionStorage.getItem('token');
            await api.post(`/admin/sellers/${sellerId}/toggle-status`, { is_active: !currentStatus }, token);
            fetchData();
        } catch (err) {
            alert('Error al cambiar estado');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#010816] text-white p-6">
            <header className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/admin')} className="p-2 hover:bg-white/5 rounded-full transition-colors">←</button>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter">Gestión de Vendedores</h1>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Panel de Administración</p>
                    </div>
                </div>
            </header>

            {/* CARDS DE RESUMEN GLOBAL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="glass-panel p-6 border-emerald-500/20">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Vendedores</p>
                    <p className="text-4xl font-black text-white">{sellers.length}</p>
                    <p className="text-[10px] text-emerald-400 font-bold mt-2">● {sellers.filter(s => s.is_active).length} Activos</p>
                </div>
                <div className="glass-panel p-6 border-blue-500/20">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ventas Hoy (Admin)</p>
                    <p className="text-4xl font-black text-blue-400">₡{sellers.reduce((s, u) => s + Number(u.sales_today), 0).toLocaleString()}</p>
                </div>
                <div className="glass-panel p-6 border-rose-500/20">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pendientes Liquidar</p>
                    <p className="text-4xl font-black text-rose-500">{sellers.length}</p>
                </div>
            </div>

            {/* TABLA DE VENDEDORES */}
            <div className="glass-panel overflow-hidden border-white/5">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Vendedor</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Contacto</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 text-center">Ventas Hoy</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 text-center">Estado</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sellers.map((seller) => {
                            const sellerStat = stats.find(s => s.seller_id === seller.id);
                            return (
                                <tr 
                                    key={seller.id} 
                                    className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                                    onClick={() => router.push(`/admin/sellers/${seller.id}`)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-black text-white group-hover:text-emerald-400 transition-colors">{seller.full_name}</div>
                                        <div className="text-[10px] text-gray-500 uppercase">{new Date(seller.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-gray-300">{seller.email}</div>
                                        <div className="text-[10px] text-emerald-500 font-bold">{seller.phone_number}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="font-black text-white">₡{Number(seller.sales_today).toLocaleString()}</div>
                                        <div className="text-[9px] text-gray-500 uppercase">Mes: ₡{Number(sellerStat?.total_sales_month || 0).toLocaleString()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest ${seller.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            {seller.is_active ? 'ACTIVO' : 'INACTIVO'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => toggleStatus(seller.id, seller.is_active)}
                                                className={`p-2 rounded-lg transition-all ${seller.is_active ? 'text-rose-400 hover:bg-rose-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
                                                title={seller.is_active ? 'Desactivar' : 'Activar'}
                                            >
                                                {seller.is_active ? '👤 🚫' : '👤 ✅'}
                                            </button>
                                            <button 
                                                onClick={() => router.push(`/admin/sellers/${seller.id}`)}
                                                className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                                title="Detalle y Liquidación"
                                            >
                                                📊
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}