'use client';
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { formatTransactionDate, getCurrentCostaRicaDate } from '../../lib/dateUtils';
import { useComprobanteOCR, DatosComprobante } from '../../components/ComprobanteOCR';

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
    
    // OCR states
    const { extraerDatos, processing, progress, error: ocrError } = useComprobanteOCR();
    const [userPhone, setUserPhone] = useState('');
    const [showOcrAlert, setShowOcrAlert] = useState(false);
    const [ocrData, setOcrData] = useState<DatosComprobante | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Filtros para historial
    const [startDate, setStartDate] = useState(getCurrentCostaRicaDate());
    const [endDate, setEndDate] = useState(getCurrentCostaRicaDate());
    const [filterType, setFilterType] = useState('ALL');
    const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);

    useEffect(() => {
        setIsMounted(true);
        fetchWalletData();
        fetchUserData();
    }, []);

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

    const fetchUserData = async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        try {
            const userData = await api.get('/user/profile', token);
            if (userData && userData.phone_number) {
                setUserPhone(userData.phone_number);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const filterTransactions = () => {
        let filtered = [...transactions];
        
        if (startDate && endDate) {
            filtered = filtered.filter(tx => {
                const txDate = tx.created_at.split('T')[0];
                return txDate >= startDate && txDate <= endDate;
            });
        }
        
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

    const handleFileShare = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const datos = await extraerDatos(file);
        if (datos) {
            setOcrData(datos);
            
            if (datos.referencia) setSinpeReference(datos.referencia);
            if (datos.monto && datos.monto > 0) setSinpeAmount(datos.monto.toString());
            
            // Verificar si es tercero (comparar teléfono emisor con usuario)
            const telefonoLimpio = datos.telefonoEmisor.replace(/\D/g, '');
            const userPhoneLimpio = userPhone.replace(/\D/g, '');
            const esTercero = telefonoLimpio !== '' && userPhoneLimpio !== '' && telefonoLimpio !== userPhoneLimpio;
            
            if (esTercero) {
                setShowOcrAlert(true);
            } else if (telefonoLimpio !== '' && telefonoLimpio === userPhoneLimpio) {
                alert('✅ Comprobante verificado. Los datos coinciden con tu cuenta.');
            }
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSinpeDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = sessionStorage.getItem('token');
        if (!token) return;
        
        if (!sinpeAmount || Number(sinpeAmount) < 1000) {
            alert('El monto mínimo de recarga es ₡1,000');
            return;
        }
        
        const thirdPartyAlert = showOcrAlert;
        
        try {
            const res = await api.post('/wallet/recharge', {
                amount: Number(sinpeAmount),
                reference_number: sinpeReference,
                bank_name: selectedSinpeBank,
                telefono_emisor: ocrData?.telefonoEmisor || '',
                telefono_receptor: ocrData?.telefonoReceptor || '',
                nombre_emisor: ocrData?.nombreEmisor || '',
                nombre_receptor: ocrData?.nombreReceptor || '',
                concepto: ocrData?.concepto || '',
                banco_detectado: ocrData?.bancoDetectado || '',
                third_party_alert: thirdPartyAlert,
                ocr_texto_completo: ocrData?.textoCompleto || ''
            }, token);
            
            if (res.error) {
                alert(res.error);
            } else {
                if (thirdPartyAlert) {
                    alert('⚠️ ATENCIÓN: El comprobante pertenece a otra persona. Tu solicitud será revisada manualmente por el administrador en un plazo de 24-72 horas.');
                } else {
                    alert('✅ Solicitud de recarga enviada correctamente');
                }
                setSinpeAmount('');
                setSinpeReference('');
                setShowOcrAlert(false);
                setOcrData(null);
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
                    
                    {/* Botón para compartir comprobante */}
                    <div className="mb-4">
                        <label className="text-gray-400 text-xs font-black uppercase block mb-2">Compartir comprobante SINPE</label>
                        <div className="flex gap-3">
                            <label className="flex-1 py-3 bg-blue-600 rounded-xl text-white font-black text-center text-sm cursor-pointer transition-all hover:bg-blue-700">
                                📎 Compartir comprobante
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleFileShare}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        {processing && (
                            <div className="mt-2">
                                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-gray-400 text-[10px] mt-1">Leyendo comprobante... {progress}%</p>
                            </div>
                        )}
                        {ocrError && (
                            <p className="text-red-400 text-[10px] mt-1">{ocrError}</p>
                        )}
                    </div>

                    {/* Datos extraídos del comprobante */}
                    {ocrData && (
                        <div className="mb-4 bg-gray-800/50 rounded-xl p-3 border border-white/10">
                            <p className="text-emerald-400 text-[10px] font-black uppercase mb-2">📋 Datos extraídos del comprobante</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {ocrData.bancoDetectado && (
                                    <div><span className="text-gray-400">Banco:</span> <span className="text-white font-bold">{ocrData.bancoDetectado}</span></div>
                                )}
                                {ocrData.fecha && (
                                    <div><span className="text-gray-400">Fecha:</span> <span className="text-white">{ocrData.fecha}</span></div>
                                )}
                                {ocrData.telefonoEmisor && (
                                    <div><span className="text-gray-400">Teléfono emisor:</span> <span className="text-white">{ocrData.telefonoEmisor}</span></div>
                                )}
                                {ocrData.telefonoReceptor && (
                                    <div><span className="text-gray-400">Teléfono receptor:</span> <span className="text-white">{ocrData.telefonoReceptor}</span></div>
                                )}
                                {ocrData.nombreEmisor && (
                                    <div className="col-span-2"><span className="text-gray-400">Nombre emisor:</span> <span className="text-white">{ocrData.nombreEmisor}</span></div>
                                )}
                                {ocrData.nombreReceptor && (
                                    <div className="col-span-2"><span className="text-gray-400">Nombre receptor:</span> <span className="text-white">{ocrData.nombreReceptor}</span></div>
                                )}
                                {ocrData.concepto && (
                                    <div className="col-span-2"><span className="text-gray-400">Concepto:</span> <span className="text-white">{ocrData.concepto}</span></div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Alerta de tercero */}
                    {showOcrAlert && ocrData && (
                        <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                            <p className="text-red-400 font-black text-xs uppercase">⚠️ ATENCIÓN: SINPE DE TERCERO</p>
                            <p className="text-gray-300 text-[10px] mt-1">
                                El comprobante pertenece a: {ocrData.nombreEmisor || 'Desconocido'} ({ocrData.telefonoEmisor || 'Sin teléfono'})
                            </p>
                            <p className="text-gray-400 text-[9px] mt-1">
                                Tu solicitud será revisada manualmente por el administrador.
                            </p>
                        </div>
                    )}
                    
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
                            <p className="text-gray-500 text-[8px] mt-1">* Si el banco detectado no aparece, selecciónelo manualmente.</p>
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