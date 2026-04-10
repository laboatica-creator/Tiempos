'use client';
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function WalletPage() {
    const [balance, setBalance] = useState({ balance: 0, bonus_balance: 0 });
    const [transactions, setTransactions] = useState<any[]>([]);
    const [publicMethods, setPublicMethods] = useState<any[]>([]);
    const [sinpeReference, setSinpeReference] = useState('');
    const [sinpeAmount, setSinpeAmount] = useState('');
    const [selectedSinpeBank, setSelectedSinpeBank] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMethod, setWithdrawMethod] = useState('SINPE');
    const [withdrawDetails, setWithdrawDetails] = useState('');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        
        try {
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
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        }
    };

    const handleSinpeDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = sessionStorage.getItem('token');
        if (!token) return;
        
        try {
            const res = await api.post('/wallet/deposit/sinpe', {
                amount: Number(sinpeAmount),
                reference_number: sinpeReference,
                bank_name: selectedSinpeBank
            }, token);
            
            if (res.error) {
                alert(res.error);
            } else {
                alert('Solicitud de recarga enviada correctamente');
                setSinpeAmount('');
                setSinpeReference('');
                fetchWalletData();
            }
        } catch (error) {
            console.error('Error creating deposit:', error);
            alert('Error al enviar la solicitud');
        }
    };

    const handleWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = sessionStorage.getItem('token');
        if (!token) return;
        
        try {
            const res = await api.post('/wallet/withdraw', {
                amount: Number(withdrawAmount),
                method: withdrawMethod,
                details: withdrawDetails
            }, token);
            
            if (res.error) {
                alert(res.error);
            } else {
                alert('Solicitud de retiro enviada correctamente');
                setWithdrawAmount('');
                setWithdrawDetails('');
                fetchWalletData();
            }
        } catch (error) {
            console.error('Error creating withdrawal:', error);
            alert('Error al enviar la solicitud');
        }
    };

    if (!isMounted) return null;

    return (
        <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-10 pb-32">
            <header className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 md:p-10 rounded-[2rem] border border-white/5 shadow-2xl">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Saldo Disponible</p>
                    <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter">
                        ₡{Number(balance.balance).toLocaleString()}
                    </h1>
                </div>
                <div className="bg-emerald-500/5 p-6 md:p-10 rounded-[2rem] border border-emerald-500/20">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Bono Promocional</p>
                    <h1 className="text-4xl md:text-6xl font-black text-emerald-400 italic tracking-tighter">
                        ₡{Number(balance.bonus_balance).toLocaleString()}
                    </h1>
                </div>
            </header>

            <section className="flex flex-col lg:flex-row gap-6 md:gap-10">
                <div className="flex-1 glass-panel p-6 md:p-10 bg-black/20 border-blue-500/20 rounded-[2rem]">
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase italic mb-6">Recargar SINPE</h2>
                    <form onSubmit={handleSinpeDeposit} className="space-y-5">
                        <select 
                            value={selectedSinpeBank} 
                            onChange={(e) => setSelectedSinpeBank(e.target.value)}
                            className="w-full bg-[#1e293b] border border-white/10 p-5 rounded-2xl text-white font-bold outline-none appearance-none"
                        >
                            {publicMethods.map((m, i) => (
                                <option key={i} value={m.name}>{m.name} ({m.sinpePhone})</option>
                            ))}
                        </select>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input 
                                type="number" 
                                value={sinpeAmount} 
                                onChange={(e) => setSinpeAmount(e.target.value)} 
                                placeholder="Monto (₡)" 
                                className="bg-[#1e293b] border border-white/10 p-5 rounded-2xl text-white font-black outline-none"
                                required
                            />
                            <input 
                                type="text" 
                                value={sinpeReference} 
                                onChange={(e) => setSinpeReference(e.target.value)} 
                                placeholder="Referencia" 
                                className="bg-[#1e293b] border border-white/10 p-5 rounded-2xl text-white font-black outline-none"
                                required
                            />
                        </div>
                        <button 
                            type="submit"
                            className="w-full py-6 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all"
                        >
                            Reportar Depósito
                        </button>
                    </form>
                </div>

                <div className="flex-1 glass-panel p-6 md:p-10 bg-black/20 border-amber-500/20 rounded-[2rem]">
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase italic mb-6">Solicitar Retiro</h2>
                    <form onSubmit={handleWithdrawal} className="space-y-5">
                        <input 
                            type="number" 
                            value={withdrawAmount} 
                            onChange={(e) => setWithdrawAmount(e.target.value)} 
                            placeholder="Monto (₡)" 
                            className="w-full bg-[#1e293b] border border-white/10 p-5 rounded-2xl text-white font-black outline-none"
                            required
                        />
                        <select 
                            value={withdrawMethod} 
                            onChange={(e) => setWithdrawMethod(e.target.value)}
                            className="w-full bg-[#1e293b] border border-white/10 p-5 rounded-2xl text-white font-bold outline-none appearance-none"
                        >
                            <option value="SINPE">SINPE Móvil</option>
                            <option value="IBAN">Transferencia IBAN</option>
                        </select>
                        <input 
                            type="text" 
                            value={withdrawDetails} 
                            onChange={(e) => setWithdrawDetails(e.target.value)} 
                            placeholder="Número de cuenta / teléfono" 
                            className="w-full bg-[#1e293b] border border-white/10 p-5 rounded-2xl text-white font-black outline-none"
                            required={withdrawMethod === 'IBAN'}
                        />
                        <button 
                            type="submit"
                            className="w-full py-6 bg-gradient-to-r from-amber-600 to-amber-500 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all"
                        >
                            Solicitar Retiro
                        </button>
                    </form>
                </div>
            </section>

            <section className="glass-panel p-6 md:p-10 border-white/5 rounded-[2rem] overflow-hidden">
                <h2 className="text-xl md:text-2xl font-black text-white uppercase italic mb-8">Historial Unificado</h2>
                <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full min-w-[600px]">
                        <thead className="text-[9px] text-gray-500 uppercase font-black tracking-widest border-b border-white/5">
                            <tr className="text-left">
                                <th className="pb-4">Fecha</th>
                                <th className="pb-4">Tipo</th>
                                <th className="pb-4">Detalles</th>
                                <th className="pb-4 text-right">Monto</th>
                                <th className="pb-4 text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.map((tx, idx) => (
                                <tr key={idx} className="group">
                                    <td className="py-4 text-[10px] text-gray-400 font-mono">
                                        {new Date(tx.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="py-4 text-[10px] font-black text-white uppercase">{tx.type}</td>
                                    <td className="py-4 text-[10px] text-gray-500 truncate max-w-[150px]">{tx.details || '-'}</td>
                                    <td className={`py-4 text-right font-black italic ${tx.type === 'DEPÓSITO' || tx.type === 'WIN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        ₡{Number(tx.amount).toLocaleString()}
                                    </td>
                                    <td className="py-4 text-right">
                                        <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${
                                            tx.status === 'APPROVED' || tx.status === 'COMPLETED' 
                                                ? 'bg-emerald-500/20 text-emerald-400' 
                                                : 'bg-amber-500/20 text-amber-500'
                                        }`}>
                                            {tx.status === 'PENDING' ? 'PENDIENTE' : tx.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-10 text-center text-gray-500">
                                        No hay transacciones registradas
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}