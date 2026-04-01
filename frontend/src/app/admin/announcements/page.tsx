'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AnnouncementsAdminPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [duration, setDuration] = useState(4);
  const [intervalSec, setIntervalSec] = useState(300);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.get('/announcements', token);
      if (Array.isArray(data)) setAnnouncements(data);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const createAnnouncement = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      await api.post('/announcements', { 
        message, 
        is_active: isActive, 
        duration_seconds: duration, 
        interval_seconds: intervalSec 
      }, sessionStorage.getItem('token'));
      setMessage('');
      fetchAnnouncements();
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const deleteAnnouncement = async (id: number) => {
    if (confirm('¿Eliminar este anuncio?')) {
      try {
        await api.delete(`/announcements/${id}`, sessionStorage.getItem('token'));
        fetchAnnouncements();
      } catch(e) {}
    }
  };

  const toggleActive = async (id: number, current: boolean) => {
    try {
      await api.put(`/announcements/${id}`, { is_active: !current }, sessionStorage.getItem('token'));
      fetchAnnouncements();
    } catch(e) {}
  };

  return (
    <ProtectedRoute role="ADMIN">
      <div className="p-6 text-white max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl font-black italic uppercase">📢 Gestión de Anuncios</h1>
        <p className="text-gray-400">Los anuncios aparecen en la parte inferior de la app móvil</p>
        
        <div className="bg-white/10 p-6 rounded-2xl space-y-4">
          <h2 className="text-xl font-bold">Nuevo Anuncio</h2>
          <textarea 
            rows={3}
            value={message} 
            onChange={e => setMessage(e.target.value)} 
            placeholder="Ej: El sistema estará en mantenimiento el domingo de 2am a 4am..." 
            className="w-full bg-black/40 border border-white/20 p-3 rounded-xl text-white outline-none"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400">Duración (segundos)</label>
              <input 
                type="number" 
                value={duration} 
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/20 p-2 rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Intervalo (segundos)</label>
              <input 
                type="number" 
                value={intervalSec} 
                onChange={e => setIntervalSec(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/20 p-2 rounded-lg"
              />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            <span>Activo desde el inicio</span>
          </label>
          <button 
            onClick={createAnnouncement} 
            disabled={loading || !message.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 font-bold px-6 py-2 rounded-xl disabled:opacity-50"
          >
            {loading ? 'Publicando...' : 'Publicar Anuncio'}
          </button>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Anuncios Activos</h2>
          {announcements.length === 0 && <p className="text-gray-500">No hay anuncios</p>}
          {announcements.map(a => (
            <div key={a.id} className="bg-white/5 border border-white/10 p-4 rounded-xl">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold text-lg">{a.message}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>Duración: {a.duration_seconds}s</span>
                    <span>Intervalo: {a.interval_seconds}s</span>
                    <span className={a.is_active ? 'text-green-400' : 'text-red-400'}>
                      {a.is_active ? '✅ Activo' : '❌ Inactivo'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleActive(a.id, a.is_active)}
                    className="px-3 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/40"
                  >
                    {a.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button 
                    onClick={() => deleteAnnouncement(a.id)} 
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