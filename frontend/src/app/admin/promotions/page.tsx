'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function PromotionsAdminPage() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [bonus, setBonus] = useState(2000);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchPromos = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.get('/admin/promotions', token);
      if (Array.isArray(data)) setPromotions(data);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { fetchPromos(); }, []);

  const createPromo = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.post('/admin/promotions', { 
        name, 
        description: `Bono de bienvenida: ₡${bonus}`, 
        type: 'NEW_USER_BONUS', 
        bonus_amount: bonus,
        is_active: isActive
      }, sessionStorage.getItem('token'));
      setName('');
      fetchPromos();
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const toggleActive = async (id: number, current: boolean) => {
    try {
      await api.put(`/admin/promotions/${id}`, { is_active: !current }, sessionStorage.getItem('token'));
      fetchPromos();
    } catch(e) {}
  };

  const deletePromo = async (id: number) => {
    if (confirm('¿Eliminar esta promoción?')) {
      try {
        await api.delete(`/admin/promotions/${id}`, sessionStorage.getItem('token'));
        fetchPromos();
      } catch(e) {}
    }
  };

  return (
    <ProtectedRoute role="ADMIN">
      <div className="p-6 text-white max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl font-black italic uppercase">🎁 Promociones</h1>
        <p className="text-gray-400">Bonos automáticos para nuevos usuarios</p>
        
        <div className="bg-white/10 p-6 rounded-2xl space-y-4">
          <h2 className="text-xl font-bold">Nueva Promoción</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400">Nombre</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Ej: Bono de Bienvenida"
                className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Monto (₡)</label>
              <input 
                type="number" 
                value={bonus} 
                onChange={e => setBonus(Number(e.target.value))} 
                className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white"
              />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            <span>Activo</span>
          </label>
          <button 
            onClick={createPromo} 
            disabled={loading || !name.trim()}
            className="bg-blue-600 hover:bg-blue-700 font-bold px-6 py-2 rounded-xl disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Promoción'}
          </button>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Promociones Activas</h2>
          {promotions.length === 0 && <p className="text-gray-500">No hay promociones</p>}
          {promotions.map(p => (
            <div key={p.id} className="bg-white/5 border border-white/10 p-4 rounded-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-xl">{p.name}</p>
                  <p className="text-emerald-400 text-lg">₡{Number(p.bonus_amount).toLocaleString()}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>Tipo: {p.type}</span>
                    <span>Aplicada: {p.applied_count || 0} veces</span>
                    <span className={p.is_active ? 'text-green-400' : 'text-red-400'}>
                      {p.is_active ? '✅ Activo' : '❌ Inactivo'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleActive(p.id, p.is_active)}
                    className="px-3 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/40"
                  >
                    {p.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button 
                    onClick={() => deletePromo(p.id)} 
                    className="px-3 py-1 rounded bg-red-500/20 text-red-500 hover:bg-red-500/40"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}