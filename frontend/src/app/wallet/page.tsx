'use client';
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatTransactionDate, getCurrentCostaRicaDate } from '../../lib/dateUtils';

type TabType = 'recharge' | 'withdraw' | 'history';

export default function WalletPage() {
    const [balance, setBalance] = useState({ balance: 0, bonus_balance: 0 });
    const [transactions, setTransactions] = useState<any[]>([]);
    const [publicMethods, setPublicMethods] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('recharge');
    const [sinpeReference, setSinpeReference] = useState('');
    const [sinpeAmount, setSinpeAmount] = useState('');
    const [selectedSinpeBank, setSelectedSinpeBank] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMethod, setWithdrawMethod] = useState('SINPE');
    const [withdrawDetails, setWithdrawDetails] = useState('');
    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    
    // 🔥 Filtros para historial
    const [startDate, setStartDate] = useState(getCurrentCostaRicaDate());
    const [endDate, setEndDate] = useState(getCurrentCostaRicaDate());
    const [filterType, setFilterType] = useState('ALL');
    const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);

    useEffect(() => {
        setIsMounted(true);
        fetchWalletData();
    }, []);

    // 🔥 Filtrar transacciones cuando cambian los filtros
    useEffect(() => {
        filterTransactions();
    }, [transactions, startDate, endDate, filterType]);

    const fetchWalletData = async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        
        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

    const filterTransactions = () => {
        let filtered = [...transactions];
        
        // Filtrar por rango de fechas
        if (startDate && endDate) {
            filtered = filtered.filter(tx => {
                const txDate = tx.created_at.split('T')[0];
                return txDate >= startDate && txDate <= endDate;
            });
        }
        
        // Filtrar por tipo
        if (filterType !== 'ALL') {
            filtered = filtered.filter(tx => {
                if (filterType === 'DEPOSIT') return tx.type === 'DEPÓSITO SINPE' || tx.type === 'DEPÓSITO';
                if (filterType === 'WITHDRAW') return tx.type === 'RETIRO';
                if (filterType === 'BET') return tx.type === 'BET';
                if (filterType === 'WIN') return tx.type === 'WIN';
                if (filterType === 'REFUND') return tx.type === 'REFUND';
                if (filterType === 'BONUS') return tx.type === 'BONUS';
                return true;
            });
        }
        
        setFilteredTransactions(filtered);
    };

    const handleSinpeDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = sessionStorage.getItem('token');
        if (!token) return;
        
        if (!sinpeAmount || Number(sinpeAmount) < 1000) {
            alert('El monto mínimo de recarga es ₡1,000');
            return;
        }
        
        try {
            // 🔥 CORREGIDO: endpoint correcto es '/wallet/recharge'
            const res = await api.post('/wallet/recharge', {
                amount: Number(sinpeAmount),
                reference_number: sinpeReference,
                bank_name: selectedSinpeBank
            }, token);
            
            if (res.error) {
                alert(res.error);
            } else {
                alert('✅ Solicitud de recarga enviada correctamente');
                setSinpeAmount('');
                setSinpeReference('');
                fetchWalletData();
                setActiveTab('history');
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
        
        if (!withdrawAmount || Number(withdrawAmount) < 1000) {
            alert('El monto mínimo de retiro es ₡1,000');
            return;
        }
        
        if (Number(withdrawAmount) > balance.balance) {
            alert('Saldo insuficiente. El bono promocional no es retirable.');
            return;
        }
        
        try {
            const res = await api.post('/wallet/withdraw', {
                amount: Number(withdrawAmount),
                method: withdrawMethod,
                details: withdrawDetails
            }, token);
            
            if (res.error) {
                alert(res.error);
            } else {
                alert('✅ Solicitud de retiro enviada correctamente');
                setWithdrawAmount('');
                setWithdrawDetails('');
                fetchWalletData();
                setActiveTab('history');
            }
        } catch (error) {
            console.error('Error creating withdrawal:', error);
            alert('Error al enviar la solicitud');
        }
    };

    if (!isMounted) return null;

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 pb-24">
            {/* Header con saldos */}
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 p-6 rounded-b-3xl shadow-xl">
                <h1 className="text-white text-2xl font-black italic mb-4">💰 Mi Billetera</h1>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur">
                        <p className="text-emerald-200 text-[10px] font-black uppercase tracking-wider">Saldo Disponible</p>
                        <p className="text-white text-3xl font-black">₡{Number(balance.balance).toLocaleString()}</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur">
                        <p className="text-emerald-200 text-[10px] font-black uppercase tracking-wider">Bono Promocional</p>
                        <p className="text-yellow-300 text-2xl font-black">₡{Number(balance.bonus_balance).toLocaleString()}</p>
                        <p className="text-[8px] text-white/50 mt-1">*Solo para apuestas</p>
                    </div>
                </div>
            </div>

            {/* Pestañas de navegación */}
            <div className="flex bg-gray-800/50 mx-4 mt-6 rounded-2xl p-1">
                <button
                    onClick={() => setActiveTab('recharge')}
                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                        activeTab === 'recharge' 
                            ? 'bg-emerald-500 text-white shadow-lg' 
                            : 'text-gray-400'
                    }`}
                >
                    📱 Recargar
                </button>
                <button
                    onClick={() => setActiveTab('withdraw')}
                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                        activeTab === 'withdraw' 
                            ? 'bg-emerald-500 text-white shadow-lg' 
                            : 'text-gray-400'
                    }`}
                >
                    💸 Retirar
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                        activeTab === 'history' 
                            ? 'bg-emerald-500 text-white shadow-lg' 
                            : 'text-gray-400'
                    }`}
                >
                    📋 Historial
                </button>
            </div>

            {/* Panel de Recargas */}
            {activeTab === 'recharge' && (
                <div className="mx-4 mt-6 bg-white/5 rounded-2xl p-5 border border-white/10">
                    <h2 className="text-white font-black text-lg mb-4">📱 Recargar por SINPE</h2>
                    <form onSubmit={handleSinpeDeposit} className="space-y-4">
                        <div>
                            <label className="text-gray-400 text-xs font-black uppercase block mb-2">Banco Destino</label>
                            <select 
                                value={selectedSinpeBank} 
                                onChange={(e) => setSelectedSinpeBank(e.target.value)}
                                className="w-full bg-gray-800 border border-white/10 p-4 rounded-xl text-white font-bold outline-none appearance-none"
                            >
                                {publicMethods.map((m, i) => (
                                    <option key={i} value={m.name}>{m.name} ({m.sinpePhone})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-gray-400 text-xs font-black uppercase block mb-2">Monto (₡)</label>
                            <input 
                                type="number" 
                                value={sinpeAmount} 
                                onChange={(e) => setSinpeAmount(e.target.value)} 
                                placeholder="Ej: 5000"
                                className="w-full bg-gray-800 border border-white/10 p-4 rounded-xl text-white font-black outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-gray-400 text-xs font-black uppercase block mb-2">Referencia SINPE</label>
                            <input 
                                type="text" 
                                value={sinpeReference} 
                                onChange={(e) => setSinpeReference(e.target.value)} 
                                placeholder="Código de la transferencia"
                                className="w-full bg-gray-800 border border-white/10 p-4 rounded-xl text-white font-black outline-none"
                                required
                            />
                        </div>
                        <button 
                            type="submit"
                            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl text-white font-black text-sm uppercase tracking-wider"
                        >
                            Enviar Solicitud
                        </button>
                    </form>
                </div>
            )}

            {/* Panel de Retiros */}
            {activeTab === 'withdraw' && (
                <div className="mx-4 mt-6 bg-white/5 rounded-2xl p-5 border border-white/10">
                    <h2 className="text-white font-black text-lg mb-4">💸 Solicitar Retiro</h2>
                    <div className="mb-4 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                        <p className="text-yellow-400 text-[10px] font-black uppercase">Saldo disponible para retiro</p>
                        <p className="text-white text-2xl font-black">₡{Number(balance.balance).toLocaleString()}</p>
                    </div>
                    <form onSubmit={handleWithdrawal} className="space-y-4">
                        <div>
                            <label className="text-gray-400 text-xs font-black uppercase block mb-2">Monto a retirar (₡)</label>
                            <input 
                                type="number" 
                                value={withdrawAmount} 
                                onChange={(e) => setWithdrawAmount(e.target.value)} 
                                placeholder="Mínimo ₡1,000"
                                className="w-full bg-gray-800 border border-white/10 p-4 rounded-xl text-white font-black outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-gray-400 text-xs font-black uppercase block mb-2">Método</label>
                            <select 
                                value={withdrawMethod} 
                                onChange={(e) => setWithdrawMethod(e.target.value)}
                                className="w-full bg-gray-800 border border-white/10 p-4 rounded-xl text-white font-bold outline-none appearance-none"
                            >
                                <option value="SINPE">SINPE Móvil</option>
                                <option value="IBAN">Transferencia IBAN</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-gray-400 text-xs font-black uppercase block mb-2">
                                {withdrawMethod === 'SINPE' ? 'Número de teléfono' : 'Número de cuenta IBAN'}
                            </label>
                            <input 
                                type="text" 
                                value={withdrawDetails} 
                                onChange={(e) => setWithdrawDetails(e.target.value)} 
                                placeholder={withdrawMethod === 'SINPE' ? 'Ej: 506XXXXXXXX' : 'CR00 0000 0000 0000 0000'}
                                className="w-full bg-gray-800 border border-white/10 p-4 rounded-xl text-white font-black outline-none"
                                required
                            />
                        </div>
                        <button 
                            type="submit"
                            className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl text-white font-black text-sm uppercase tracking-wider"
                        >
                            Solicitar Retiro
                        </button>
                    </form>
                </div>
            )}

            {/* Panel de Historial con filtros */}
            {activeTab === 'history' && (
                <div className="mx-4 mt-6 bg-white/5 rounded-2xl p-5 border border-white/10 mb-6">
                    <h2 className="text-white font-black text-lg mb-4">📋 Historial de Transacciones</h2>
                    
                    {/* 🔥 Filtros de fecha y tipo */}
                    <div className="mb-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-gray-400 text-[9px] font-black uppercase block mb-1">Desde</label>
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-gray-800 border border-white/10 p-2 rounded-lg text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-gray-400 text-[9px] font-black uppercase block mb-1">Hasta</label>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-gray-800 border border-white/10 p-2 rounded-lg text-white text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-gray-400 text-[9px] font-black uppercase block mb-1">Tipo de transacción</label>
                            <select 
                                value={filterType} 
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full bg-gray-800 border border-white/10 p-2 rounded-lg text-white text-sm"
                            >
                                <option value="ALL">Todos</option>
                                <option value="DEPOSIT">Depósitos</option>
                                <option value="WITHDRAW">Retiros</option>
                                <option value="BET">Apuestas</option>
                                <option value="WIN">Premios</option>
                                <option value="REFUND">Reembolsos</option>
                                <option value="BONUS">Bonos</option>
                            </select>
                        </div>
                    </div>
                    
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-gray-500">No hay transacciones para los filtros seleccionados</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTransactions.map((tx, idx) => (
                                <div key={idx} className="bg-gray-800/50 rounded-xl p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className={`text-xs font-black uppercase ${
                                                tx.type === 'DEPÓSITO' || tx.type === 'DEPÓSITO SINPE' ? 'text-emerald-400' : 
                                                tx.type === 'RETIRO' ? 'text-orange-400' : 
                                                tx.type === 'BONUS' ? 'text-yellow-400' :
                                                tx.type === 'WIN' ? 'text-green-400' : 'text-blue-400'
                                            }`}>
                                                {tx.type === 'DEPÓSITO SINPE' ? 'DEPÓSITO' : tx.type}
                                            </p>
                                            <p className="text-gray-400 text-[10px] mt-1">
                                                {formatTransactionDate(tx.created_at)}
                                            </p>
                                            <p className="text-gray-500 text-[9px] mt-1 truncate max-w-[150px]">
                                                {tx.details || 'Transacción'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black text-base ${
                                                tx.type === 'DEPÓSITO' || tx.type === 'DEPÓSITO SINPE' || tx.type === 'WIN' ? 'text-emerald-400' : 
                                                tx.type === 'BONUS' ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                                {tx.type === 'DEPÓSITO' || tx.type === 'DEPÓSITO SINPE' || tx.type === 'WIN' || tx.type === 'BONUS' ? '+' : '-'}
                                                ₡{Number(tx.amount).toLocaleString()}
                                            </p>
                                            <p className={`text-[8px] font-black uppercase mt-1 ${
                                                tx.status === 'COMPLETED' || tx.status === 'APPROVED' ? 'text-green-500' : 
                                                tx.status === 'PENDING' ? 'text-yellow-500' : 'text-red-500'
                                            }`}>
                                                {tx.status === 'PENDING' ? 'Pendiente' : 
                                                 tx.status === 'COMPLETED' ? 'Completado' :
                                                 tx.status === 'APPROVED' ? 'Aprobado' : tx.status}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}