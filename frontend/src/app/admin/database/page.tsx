'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useRouter } from 'next/navigation';

export default function DatabaseBackupPage() {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (user.role !== 'ADMIN') {
        alert('Acceso denegado. Solo el administrador maestro puede gestionar respaldos.');
        router.push('/admin');
        return;
    }
    setCurrentUser(user);
  }, [router]);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exportPassword) { alert('Digite su contraseña maestra.'); return; }
    if (!confirm('¿Seguro que deseas exportar un respaldo completo de la base de datos? Esto descargará toda la información en un archivo JSON.')) return;
    setLoading(true);
    try {
        const token = sessionStorage.getItem('token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/admin/backup/export`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ password: exportPassword })
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${await response.text()}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        // Use filename from Content-Disposition if available, else default
        const contentDisp = response.headers.get('content-disposition');
        let filename = `respaldo_tiempos_${new Date().toISOString().split('T')[0]}.json`;
        if (contentDisp && contentDisp.includes('filename=')) {
           filename = contentDisp.split('filename=')[1];
        }

        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        alert('Copia de seguridad descargada exitosamente.');
    } catch (err: any) {
        alert(`Error exportando base de datos: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (!importPassword) { alert('Digite su contraseña maestra.'); return; }

    if (!confirm('¡ADVERTENCIA CRÍTICA! Restaurar un respaldo eliminará TODOS los datos actuales irremediablemente y cargará los del archivo. ¿ESTÁ TOTALMENTE SEGURO DE CONTINUAR?')) return;
    
    setImporting(true);
    try {
        const fileData = await file.text();
        const jsonData = JSON.parse(fileData);

        const token = sessionStorage.getItem('token');
        const data = await api.post('/admin/backup/import', {
            password: importPassword,
            data: jsonData
        }, token);

        if (data.error) {
            alert(data.error);
        } else {
            alert('¡Restauración de base de datos exitosa! El sistema recargará los datos nuevos ahora.');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    } catch (err: any) {
         alert(`Error leyendo o importando archivo: ${err.message}`);
    } finally {
         setImporting(false);
         setFile(null);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 glass-panel border-red-500/20">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin" className="text-red-400 hover:text-red-300 transition-colors text-sm font-bold">← Volver al Panel</Link>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase">Respaldo & Restauración</h1>
          <p className="text-gray-400 mt-1">Módulo avanzado para gestionar copias de seguridad de la base de datos</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
        {/* Export Sector */}
        <form onSubmit={handleExport} className="glass-panel p-8 border-white/5 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-4xl shadow-lg shadow-blue-500/20 text-blue-400">
                💾
            </div>
            <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Exportar Respaldo</h2>
                <p className="text-sm text-gray-400 mt-2 px-4">
                    Genera una copia de seguridad en formato JSON estructurado conteniendo jugadores, billeteras, transacciones, historiales y sorteos.
                </p>
            </div>
            
            <div className="w-full mt-4">
                <input 
                    type="password"
                    placeholder="Contraseña Master Requerida"
                    value={exportPassword}
                    onChange={e => setExportPassword(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-center"
                />
            </div>

            <button 
                type="submit"
                disabled={loading || importing || !exportPassword}
                className="w-full py-4 mt-auto bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all shadow-lg shadow-blue-500/30 uppercase tracking-widest text-sm"
            >
                {loading ? 'Preparando archivo...' : '📥 Descargar Respaldo'}
            </button>
        </form>

        {/* Import Sector */}
        <form onSubmit={handleImport} className="glass-panel p-8 border-red-500/20 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-red-500/5 rotate-in pointer-events-none group-hover:bg-red-500/10 transition-colors" />
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-4xl shadow-lg shadow-red-500/20 text-red-500 z-10">
                ⚠️
            </div>
            <div className="z-10">
                <h2 className="text-2xl font-black text-red-400 uppercase tracking-tight">Restaurar Sistema</h2>
                <p className="text-xs text-red-500/70 font-black uppercase mt-2 px-4 italic">
                    Peligro: Esto sobrescribirá todos los datos vivos por los del archivo de respaldo proporcionado.
                </p>
            </div>
            
            <div className="w-full z-10 flex flex-col gap-4">
                <input 
                    type="password"
                    placeholder="Contraseña Master Requerida"
                    value={importPassword}
                    onChange={e => setImportPassword(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-red-500/30 rounded-xl p-3 text-white outline-none focus:border-red-500 text-center"
                />
                
                <div className="relative border border-dashed border-red-500/30 bg-black/40 rounded-xl p-4">
                    <label className="block w-full text-center cursor-pointer">
                        <span className="text-gray-400 text-sm font-bold block mb-2">{file ? file.name : 'Seleccionar Archivo .json'}</span>
                        <input 
                            type="file" 
                            accept=".json" 
                            onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                            className="hidden"
                        />
                        <div className="mx-auto w-fit px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-xs text-white uppercase font-black transition-all">
                            Explorar
                        </div>
                    </label>
                </div>
            </div>

            <button 
                type="submit"
                disabled={importing || loading || !file || !importPassword}
                className="w-full py-4 mt-auto bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all shadow-lg shadow-red-500/30 uppercase tracking-widest text-sm z-10"
            >
                {importing ? 'Reconstruyendo DB...' : '📤 Restaurar a partir de archivo'}
            </button>
        </form>

      </div>
    </div>
  );
}
