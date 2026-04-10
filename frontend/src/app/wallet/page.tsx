'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

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
                api.get('/payment-methods')
            ]);

            if (bal && !bal.error) setBalance(bal);
            if (txs && Array.isArray(txs.data)) setTransactions(txs.data);
            if (Array.isArray(methods)) {
                setPublicMethods(methods);
                if (methods.length > 0) setSelectedSinpeBank(methods[0].name);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSinpeDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            const res = await api.post('/wallet/deposit/sinpe', {
                amount: Number(sinpeAmount),
                reference_number: sinpeReference,
                bank_name: selectedSinpeBank
            }, token!);
            if (res.error) alert(res.error);
            else {
                alert('¡Recarga enviada! Pendiente de aprobación.');
                setSinpeAmount(''); setSinpeReference('');
                fetchWalletData();
            }
        } catch (err) { alert('Error de conexión'); }
    };

    if (!isMounted) return null;

    return (
        <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-10 pb-32">
            {/* Balance Cards - Responsive grid */}
            <header className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 md:p-10 rounded-[2rem] border border-white/5 shadow-2xl">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2">Saldo Disponible</p>
                    <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter">₡{Number(balance.balance).toLocaleString()}</h1>
                </div>
                <div className="bg-emerald-500/5 p-6 md:p-10 rounded-[2rem] border border-emerald-500/20">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2">Bono Promocional</p>
                    <h1 className="text-4xl md:text-6xl font-black text-emerald-400 italic tracking-tighter">₡{Number(balance.bonus_balance).toLocaleString()}</h1>
                    <p className="text-[8px] text-gray-500 font-bold uppercase mt-2">* No retirable, solo para apuestas</p>
                </div>
            </header>

            {/* Forms Section - Responsive layout */}
            <section className="flex flex-col lg:flex-row gap-6 md:gap-10">
                {/* SINPE Form */}
                <div className="flex-1 glass-panel p-6 md:p-10 bg-black/20 border-blue-500/20">
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase italic mb-6">Recargar SINPE</h2>
                    <form onSubmit={handleSinpeDeposit} className="space-y-5">
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-500 uppercase ml-4">Seleccionar Banco Destino</label>
                             <select 
                                value={selectedSinpeBank}
                                onChange={(e) => setSelectedSinpeBank(e.target.value)}
                                className="w-full bg-[#1e293b] border border-white/10 p-5 rounded-2xl text-white font-bold outline-none focus:border-blue-400 appearance-none"
                             >
                                {publicMethods.map((m, i) => (
                                    <option key={i} value={m.name}>{m.name} ({m.sinpePhone})</option>
                                ))}
                             </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input 
                                type="number" value={sinpeAmount} onChange={(e) => setSinpeAmount(e.target.value)}
                                placeholder="Monto (₡)" className="bg-[#1e293b] border border-white/10 p-5 rounded-2xl text-white font-black"
                            />
                            <input 
                                type="text" value={sinpeReference} onChange={(e) => setSinpeReference(e.target.value)}
                                placeholder="Referencia" className="bg-[#1e293b] border border-white/10 p-5 rounded-2xl text-white font-black"
                            />
                        </div>
                        <button className="w-full py-6 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all">Reportar Dep&oacute;sito</button>
                    </form>
                </div>

                {/* Withdraw Form */}
                <div className="flex-1 glass-panel p-6 md:p-10 bg-black/20 border-amber-500/20">
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase italic mb-6">Retirar Premios</h2>
                    <div className="space-y-4">
                        <input type="text" placeholder="Banco" className="w-full bg-[#1e293b] border border-white/10 p-5 rounded-2xl text-white font-black" />
                        <input type="text" placeholder="Cuenta o SINPE" className="w-full bg-[#1e293b] border border-white/10 p-5 rounded-2xl text-white font-black" />
                        <input type="number" placeholder="Monto" className="w-full bg-[#1e293b] border border-white/10 p-5 rounded-2xl text-white font-black" />
                        <button className="w-full py-6 bg-gradient-to-r from-amber-600 to-amber-500 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all">Solicitar Pago</button>
                    </div>
                </div>
            </section>

            {/* History - Mobile Optimized */}
            <section className="glass-panel p-6 md:p-10 border-white/5 overflow-hidden">
                <h2 className="text-xl md:text-2xl font-black text-white uppercase italic mb-8">Movimientos de Cuenta</h2>
                <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full min-w-[600px]">
                        <thead className="text-[9px] text-gray-500 uppercase font-black tracking-widest border-b border-white/5">
                            <tr>
                                <th className="text-left pb-4">Fecha</th>
                                <th className="text-left pb-4">Tipo</th>
                                <th className="text-left pb-4">Detalles</th>
                                <th className="text-right pb-4">Monto</th>
                                <th className="text-right pb-4">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.length > 0 ? transactions.map((tx, idx) => (
                                <tr key={idx} className="group">
                                    <td className="py-6 text-[10px] text-gray-400 font-mono">{new Date(tx.created_at).toLocaleDateString()}</td>
                                    <td className="py-6 text-[10px] font-black text-white uppercase">{tx.type}</td>
                                    <td className="py-6 text-[10px] text-gray-500 truncate max-w-[150px]">{tx.details || '-'}</td>
                                    <td className={`py-6 text-right font-black italic ${tx.type.includes('DEP') || tx.type === 'WIN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        ₡{Number(tx.amount).toLocaleString()}
                                    </td>
                                    <td className="py-6 text-right">
                                        <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${
                                            tx.status === 'APPROVED' || tx.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500'
                                        }`}>{tx.status}</span>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} className="py-20 text-center text-gray-700 font-black uppercase text-[10px]">Sin movimientos registrados</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}
