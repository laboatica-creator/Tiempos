'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';

interface Seller {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  daily_sales: number;
  created_at: string;
  is_active: boolean;
}

interface SellerStats {
  seller_id: string;
  seller_name: string;
  total_sales_today: number;
  total_bets_today: number;
  total_sales_week: number;
  total_bets_week: number;
  total_sales_month: number;
  total_bets_month: number;
}

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [stats, setStats] = useState<SellerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);

  useEffect(() => {
    fetchSellers();
    fetchSellerStats();
  }, []);

  const fetchSellers = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.get('/admin/sellers', token);
      if (Array.isArray(data)) {
        setSellers(data);
      }
    } catch (err) {
      console.error('Error fetching sellers:', err);
    }
  };

  const fetchSellerStats = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.get('/admin/sellers/stats', token);
      if (Array.isArray(data)) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching seller stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSellerStatus = async (sellerId: string, currentStatus: boolean) => {
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.post(`/admin/sellers/${sellerId}/toggle-status`, { is_active: !currentStatus }, token);
      if (!data.error) {
        fetchSellers();
      }
    } catch (err) {
      console.error('Error toggling seller status:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-10">
      <header className="flex justify-between items-center bg-[#1e293b] p-6 md:p-8 rounded-3xl border border-emerald-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-emerald-400 hover:text-emerald-300 text-sm font-bold">← Panel Admin</Link>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">🏪 Gestión de Vendedores</h1>
          <p className="text-gray-400 font-bold text-sm mt-1">Supervisa las ventas y el rendimiento de tus vendedores</p>
        </div>
        <div className="h-12 w-12 md:h-16 md:w-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 text-2xl md:text-3xl">
          🏪
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Cargando vendedores...</div>
      ) : sellers.length === 0 ? (
        <div className="bg-[#1e293b] p-10 text-center rounded-2xl">
          <p className="text-gray-500">No hay vendedores registrados aún.</p>
        </div>
      ) : (
        <>
          {/* Tabla de vendedores */}
          <div className="bg-[#1e293b] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0f172a]">
                  <tr>
                    <th className="p-4 text-left text-gray-400 text-xs uppercase">Vendedor</th>
                    <th className="p-4 text-left text-gray-400 text-xs uppercase">Contacto</th>
                    <th className="p-4 text-right text-gray-400 text-xs uppercase">Ventas Hoy</th>
                    <th className="p-4 text-right text-gray-400 text-xs uppercase">Ventas Semana</th>
                    <th className="p-4 text-right text-gray-400 text-xs uppercase">Ventas Mes</th>
                    <th className="p-4 text-center text-gray-400 text-xs uppercase">Estado</th>
                    <th className="p-4 text-center text-gray-400 text-xs uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.map((seller) => {
                    const sellerStats = stats.find(s => s.seller_id === seller.id);
                    return (
                      <tr key={seller.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <p className="text-white font-bold">{seller.full_name}</p>
                          <p className="text-gray-500 text-xs">Registro: {new Date(seller.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-gray-300 text-sm">{seller.email}</p>
                          <p className="text-gray-500 text-xs">{seller.phone_number}</p>
                        </td>
                        <td className="p-4 text-right">
                          <p className="text-emerald-400 font-bold">₡{sellerStats?.total_sales_today?.toLocaleString() || 0}</p>
                          <p className="text-gray-500 text-xs">{sellerStats?.total_bets_today || 0} apuestas</p>
                        </td>
                        <td className="p-4 text-right">
                          <p className="text-white font-bold">₡{sellerStats?.total_sales_week?.toLocaleString() || 0}</p>
                          <p className="text-gray-500 text-xs">{sellerStats?.total_bets_week || 0} apuestas</p>
                        </td>
                        <td className="p-4 text-right">
                          <p className="text-white font-bold">₡{sellerStats?.total_sales_month?.toLocaleString() || 0}</p>
                          <p className="text-gray-500 text-xs">{sellerStats?.total_bets_month || 0} apuestas</p>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${seller.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {seller.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleSellerStatus(seller.id, seller.is_active)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold ${seller.is_active ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                          >
                            {seller.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen general */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1e293b] rounded-2xl p-6 text-center">
              <p className="text-gray-400 text-xs uppercase">Total Vendedores</p>
              <p className="text-3xl font-black text-white">{sellers.length}</p>
            </div>
            <div className="bg-[#1e293b] rounded-2xl p-6 text-center">
              <p className="text-gray-400 text-xs uppercase">Ventas Totales Hoy</p>
              <p className="text-3xl font-black text-emerald-400">
                ₡{stats.reduce((sum, s) => sum + (s.total_sales_today || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-[#1e293b] rounded-2xl p-6 text-center">
              <p className="text-gray-400 text-xs uppercase">Apuestas Totales Hoy</p>
              <p className="text-3xl font-black text-white">{stats.reduce((sum, s) => sum + (s.total_bets_today || 0), 0)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}