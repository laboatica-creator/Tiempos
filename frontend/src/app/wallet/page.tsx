'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

/**
 * Wallet Page: Player profile, balance, deposits and history.
 */
export default function WalletPage() {
    const [balance, setBalance] = useState({ balance: 0, bonus_balance: 0 });
    const [transactions, setTransactions] = useState<any[]>([]);
    const [publicMethods, setPublicMethods] = useState<any[]>([]);
    const [withdrawalAmount, setWithdrawalAmount] = useState('');
    const [withdrawalBank, setWithdrawalBank] = useState('');
    const [withdrawalAccount, setWithdrawalAccount] = useState('');
    const [sinpeReference, setSinpeReference] = useState('');
    const [sinpeAmount, setSinpeAmount] = useState('');
    const [selectedSinpeBank, setSelectedSinpeBank] = useState('');
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            if (!token) return;

            const [bal, txs, methods] = await Promise.all([
                api.get('/wallet/balance', token),
                api.get('/wallet/transactions', token),
                api.get('/payment-methods') // Usar endpoint público consolidado
            ]);

            if (bal && !bal.error) setBalance(bal);
            if (txs && Array.isArray(txs.data)) setTransactions(txs.data);
            
            // 🔥 CORRECCIÓN CRÍTICA: Asegurar que los métodos de pago se carguen en el estado
            if (Array.isArray(methods)) {
                setPublicMethods(methods);
                if (methods.length > 0) setSelectedSinpeBank(methods[0].name);
            }
        } catch (err) {
            console.error('Wallet fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSinpeDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sinpeAmount || !sinpeReference || !selectedSinpeBank) {
            alert('Complete todos los campos de la recarga.');
            return;
        }

        try {
            const token = sessionStorage.getItem('token');
            const res = await api.post('/wallet/deposit/sinpe', {
                amount: Number(sinpeAmount),
                reference_number: sinpeReference,
                bank_name: selectedSinpeBank
            }, token!);

            if (res.error) alert(res.error);
            else {
                alert('¡Solicitud enviada! Se acreditará al ser verificada.');
                setSinpeAmount('');
                setSinpeReference('');
                fetchWalletData();
            }
        } catch (err) {
            alert('Error al procesar depósito.');
        }
    };

    const handleWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (Number(withdrawalAmount) > Number(balance.balance)) {
            alert('No dispone de saldo suficiente (el bono no es retirable).');
            return;
        }

        try {
            const token = sessionStorage.getItem('token');
            const res = await api.post('/wallet/withdraw', {
                amount: Number(withdrawalAmount),
                method: 'TRANSFER',
                details: `Banco: ${withdrawalBank}, Cuenta: ${withdrawalAccount}`
            }, token!);

            if (res.error) alert(res.error);
            else {
                alert('Solicitud de retiro recibida.');
                setWithdrawalAmount('');
                fetchWalletData();
            }
        } catch (err) {
            alert('Error al solicitar retiro.');
        }
    };

    if (!isMounted) return null;

    return (
        <main className="p-4 lg:p-8 max-w-7xl mx-auto space-y-10 pb-32">
            <header className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Mi Billetera</h1>
                    <p className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest mt-1">Gesti&oacute;n de saldo y premios</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-black/40 px-8 py-4 rounded-3xl border border-white/5 text-center">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Disponible</p>
                        <p className="text-white text-3xl font-black italic tracking-tighter">₡{Number(balance.balance).toLocaleString()}</p>
                    </div>
                    <div className="bg-black/40 px-8 py-4 rounded-3xl border border-emerald-500/20 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>
                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Bono Promocional</p>
                        <p className="text-emerald-400 text-3xl font-black italic tracking-tighter">₡{Number(balance.bonus_balance).toLocaleString()}</p>
                    </div>
                </div>
            </header>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* SINPE DEPOSIT */}
                <div className="glass-panel p-8 bg-black/20 border-blue-500/20">
                    <h2 className="text-xl font-black text-white uppercase italic mb-6">Recargar con SINPE M&oacute;vil</h2>
                    
                    <div className="space-y-6">
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 italic">Bancos Autorizados:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {publicMethods.length > 0 ? publicMethods.map((m: any, i: number) => (
                                    <div key={i} className="p-4 bg-black/40 rounded-2xl border border-white/5 flex flex-col">
                                        <span className="text-white font-black text-xs uppercase">{m.name}</span>
                                        <span className="text-emerald-400 font-black font-mono text-sm mt-1">{m.sinpePhone}</span>
                                    </div>
                                )) : <div className="text-gray-600 text-[10px] uppercase font-bold py-4">Cargando métodos...</div>}
                            </div>
                        </div>

                        <form onSubmit={handleSinpeDeposit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Enviar a:</label>
                                <select 
                                    value={selectedSinpeBank}
                                    onChange={(e) => setSelectedSinpeBank(e.target.value)}
                                    className="w-full bg-[#1e293b] border border-white/10 p-4 rounded-2xl text-white font-bold outline-none focus:border-blue-500"
                                >
                                    {publicMethods.map((m: any, i: number) => (
                                        <option key={i} value={m.name}>{m.name} ({m.sinpePhone})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Monto</label>
                                    <input 
                                        type="number" 
                                        value={sinpeAmount}
                                        onChange={(e) => setSinpeAmount(e.target.value)}
                                        placeholder="5000"
                                        className="w-full bg-[#1e293b] border border-white/10 p-4 rounded-2xl text-white font-black outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Comprobante</label>
                                    <input 
                                        type="text" 
                                        value={sinpeReference}
                                        onChange={(e) => setSinpeReference(e.target.value)}
                                        placeholder="8 digitos"
                                        className="w-full bg-[#1e293b] border border-white/10 p-4 rounded-2xl text-white font-black outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <button className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Reportar Dep&oacute;sito</button>
                        </form>
                    </div>
                </div>

                {/* WITHDRAWAL */}
                <div className="glass-panel p-8 bg-black/20 border-amber-500/20">
                    <h2 className="text-xl font-black text-white uppercase italic mb-6">Solicitar Retiro</h2>
                    <form onSubmit={handleWithdrawal} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Banco Destino</label>
                            <input 
                                type="text"
                                value={withdrawalBank}
                                onChange={(e) => setWithdrawalBank(e.target.value)}
                                placeholder="Ej: Banco Nacional"
                                className="w-full bg-[#1e293b] border border-white/10 p-4 rounded-2xl text-white font-black outline-none focus:border-amber-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Cuenta IBAN</label>
                            <input 
                                type="text"
                                value={withdrawalAccount}
                                onChange={(e) => setWithdrawalAccount(e.target.value)}
                                placeholder="CR00..."
                                className="w-full bg-[#1e293b] border border-white/10 p-4 rounded-2xl text-white font-black outline-none focus:border-amber-500 font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Monto a Retirar</label>
                            <input 
                                type="number"
                                value={withdrawalAmount}
                                onChange={(e) => setWithdrawalAmount(e.target.value)}
                                placeholder="A partir de 1000"
                                className="w-full bg-[#1e293b] border border-white/10 p-4 rounded-2xl text-white font-black outline-none focus:border-amber-500"
                            />
                        </div>
                        <button className="w-full py-5 bg-gradient-to-r from-amber-600 to-amber-500 rounded-2xl text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Solicitar Transferencia</button>
                        <p className="text-[8px] text-gray-500 text-center font-bold uppercase tracking-widest pt-2">Plazo de entrega: 2 a 12 horas h&aacute;biles.</p>
                    </form>
                </div>
            </section>

            {/* HISTORY */}
            <section className="glass-panel p-8 border-white/5">
                <h2 className="text-xl font-black text-white uppercase italic mb-8">Historial de Transacciones</h2>
                <div className="overflow-x-auto rounded-3xl border border-white/5">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-gray-500 uppercase text-[9px] font-black tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Fecha</th>
                                <th className="px-8 py-5">Tipo</th>
                                <th className="px-8 py-5">Detalles</th>
                                <th className="px-8 py-5">Monto</th>
                                <th className="px-8 py-5">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.map((tx, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-all group">
                                    <td className="px-8 py-6 text-[10px] text-gray-400 font-mono">
                                        {new Date(tx.created_at).toLocaleDateString()}
                                        <span className="block text-[8px] text-gray-600 font-sans">{new Date(tx.created_at).toLocaleTimeString()}</span>
                                    </td>
                                    <td className="px-8 py-6 text-xs font-black text-white uppercase italic tracking-tighter">{tx.type}</td>
                                    <td className="px-8 py-6 text-[10px] text-gray-500 font-bold max-w-xs truncate">{tx.details || '-'}</td>
                                    <td className={`px-8 py-6 text-sm font-black italic ${tx.type.includes('DEPOSIT') || tx.type === 'WIN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {tx.type.includes('DEPOSIT') || tx.type === 'WIN' ? '+' : '-'} ₡{Number(tx.amount).toLocaleString()}
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                            tx.status === 'APPROVED' || tx.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                                            tx.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}
