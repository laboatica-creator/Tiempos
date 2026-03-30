'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function WalletPage() {
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [amount, setAmount] = useState('');
    const [ref, setRef] = useState('');
    const [uploading, setUploading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [systemSettings, setSystemSettings] = useState<any>({});
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [methods, setMethods] = useState<any[]>([]);
    const [selectedMethod, setSelectedMethod] = useState<'SINPE' | 'CARD'>('SINPE');
    const [showAddCard, setShowAddCard] = useState(false);
    const [newCard, setNewCard] = useState({ number: '', expiry: '', provider: 'VISA' });
    const [actionView, setActionView] = useState<'RECHARGE' | 'WITHDRAW'>('RECHARGE');
    const [withdrawalMethod, setWithdrawalMethod] = useState<'SINPE' | 'IBAN'>('SINPE');
    const [iban, setIban] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);
    const [selectedBank, setSelectedBank] = useState('');
    const [publicMethods, setPublicMethods] = useState<any[]>([]);
    
    // Filtros de historial
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterType, setFilterType] = useState('ALL');

    useEffect(() => {
        setIsMounted(true);
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        try {
            const token = sessionStorage.getItem('token');
            if (!token) return;
            
            const params = new URLSearchParams();
            if (filterStartDate) params.append('start_date', filterStartDate);
            if (filterEndDate) params.append('end_date', filterEndDate);
            if (filterType !== 'ALL') params.append('type', filterType);
            
            const [wallet, m, settings, txs, pm] = await Promise.all([
                api.get('/wallet/balance', token),
                api.get('/wallet/methods', token),
                api.get('/admin/settings', token),
                api.get(`/wallet/transactions?${params.toString()}`, token),
                api.get('/payment-methods', '')
            ]);

            if (wallet && !wallet.error) setBalance(Number(wallet.balance) || 0);
            if (Array.isArray(m)) setMethods(m);
            if (settings && !settings.error) setSystemSettings(settings);
            if (Array.isArray(pm)) setPublicMethods(pm);
            if (txs && Array.isArray(txs.data)) {
                setTransactions(txs.data);
                setLoadingSettings(false);
            }

        } catch (err: any) {
            console.error('❌ [WALLET_FETCH_ERROR]:', err);
            setLoadingSettings(false);
        }
    };

    const handleRecharge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (Number(amount) <= 0) return alert('Ingrese un monto válido');
        
        if (selectedMethod === 'CARD' && methods.length === 0) {
            return alert('Debes registrar al menos una tarjeta antes de recargar por este método.');
        }

        setUploading(true);
        try {
            const token = sessionStorage.getItem('token');
            const data = await api.post('/wallet/recharge', {
                amount: Number(amount),
                reference_number: selectedMethod === 'SINPE' ? ref : `CARD-${methods[0].last4}`,
                method_type: selectedMethod,
                bank_name: selectedBank
            }, token);
            
            if (data.error) {
                alert(data.error);
            } else {
                alert('¡Solicitud enviada! El administrador revisará y acreditará su recarga pronto.');
                setAmount('');
                setRef('');
                fetchWalletData();
            }
        } catch (err) {
            alert('Error al enviar la solicitud.');
        } finally {
            setUploading(false);
        }
    };

    const handleAddCard = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            await api.post('/wallet/methods', {
                type: 'CREDIT',
                provider: newCard.provider,
                card_number: newCard.number,
                expiry_date: newCard.expiry
            }, token);
            alert('Tarjeta registrada');
            setShowAddCard(false);
            setNewCard({ number: '', expiry: '', provider: 'VISA' });
            fetchWalletData();
        } catch (err) {
            alert('Error al registrar tarjeta');
        }
    };

    const handleWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = Number(amount);
        if (amt <= 0) return alert('Ingrese un monto válido');
        if (amt > balance) return alert('No tiene suficientes fondos para retirar esta cantidad.');
        if (withdrawalMethod === 'IBAN' && !iban) return alert('Debe introducir la cuenta IBAN.');

        const confirmMsg = withdrawalMethod === 'SINPE' 
            ? 'ADVERTENCIA: El dinero será enviado vía SINPE Móvil al número de teléfono asociado a tu registro. Si tienes dudas comunícate con soporte.'
            : 'ADVERTENCIA BANCARIA: El depósito bancario requiere que la cuenta IBAN digitada esté a tu mismo nombre, teléfono y correo electrónico registrado en esta plataforma en este momento. De no coincidir, el banco administrador podría rebotarlo.';
            
        if (!confirm(confirmMsg + '\n\n¿Desea continuar con la solicitud de retiro?')) return;

        setWithdrawing(true);
        try {
            const token = sessionStorage.getItem('token');
            const data = await api.post('/wallet/withdraw', {
                amount: amt,
                method: withdrawalMethod,
                details: withdrawalMethod === 'IBAN' ? iban : ''
            }, token);
            
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message || 'Solicitud enviada correctamente al administrador.');
                setAmount('');
                setIban('');
                fetchWalletData();
            }
        } catch (err) {
            alert('Error al procesar la solicitud de retiro.');
        } finally {
            setWithdrawing(false);
        }
    };

    if (!isMounted) return null;

    const adminPhone = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || '50688888888';

    const whatsappLink = (refCode: string, amt: string) => {
        const msg = encodeURIComponent(`Hola, acabo de realizar un SINPE por ₡${amt}. Ref: ${refCode}. Por favor acreditar a mi cuenta.`);
        return `https://wa.me/${adminPhone}?text=${msg}`;
    };

    return (
        <ProtectedRoute>
        <main className="p-4 md:p-8 flex-1 max-w-4xl mx-auto w-full space-y-10 animate-in fade-in duration-500 pb-20">
            <header className="text-center py-10 bg-[#1e293b] rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"></div>
                <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Billetera Pro v2</h1>
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.4em] mt-2 opacity-60">Control Total de Fondos</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5 space-y-8">
                    <section className="glass-panel p-10 text-center bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-emerald-500/20 shadow-2xl">
                        <p className="text-emerald-400 text-[10px] uppercase tracking-[0.3em] mb-3 font-black">Saldo de Cuenta</p>
                        <p className="text-6xl font-black text-white tracking-tighter">₡{balance.toLocaleString()}</p>
                    </section>

                    <section className="glass-panel p-6 space-y-4 border-white/5 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">Mis Tarjetas</h2>
                            <button 
                                onClick={() => setShowAddCard(!showAddCard)}
                                className="text-[10px] bg-blue-500 text-white font-black px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-all uppercase"
                            >
                                {showAddCard ? 'CANCELAR' : '+ AGREGAR'}
                            </button>
                        </div>

                        {showAddCard ? (
                            <form onSubmit={handleAddCard} className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-tighter ml-2">Proveedor</label>
                                    <select 
                                        className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-blue-500"
                                        value={newCard.provider}
                                        onChange={e => setNewCard({...newCard, provider: e.target.value})}
                                    >
                                        <option value="VISA">VISA</option>
                                        <option value="MASTERCARD">MASTERCARD</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-tighter ml-2">Número de Tarjeta</label>
                                    <input 
                                        type="text" 
                                        placeholder="0000 0000 0000 0000"
                                        className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white font-mono outline-none focus:border-blue-500"
                                        required
                                        value={newCard.number}
                                        onChange={e => setNewCard({...newCard, number: e.target.value})}
                                    />
                                </div>
                                <button type="submit" className="w-full py-3 bg-blue-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest">GUARDAR TARJETA</button>
                            </form>
                        ) : methods.length > 0 ? (
                            <div className="space-y-3">
                                {methods.map((m: any) => (
                                    <div key={m.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center group hover:border-blue-500/50 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="text-lg">💳</div>
                                            <div>
                                                <p className="text-[10px] font-black text-white">{m.provider} •••• {m.last4}</p>
                                                <p className="text-[8px] text-gray-500 font-bold uppercase">HABILITADA PARA RECARGAS</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-2xl">
                                <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">No hay tarjetas registradas</p>
                            </div>
                        )}
                    </section>
                </div>

                <div className="lg:col-span-7 space-y-8">
                    <section className="glass-panel p-8 space-y-8 shadow-2xl border-white/5 relative">
                        <div className="flex bg-black/40 rounded-2xl p-2 border border-white/10 mb-6">
                            <button
                                onClick={() => setActionView('RECHARGE')}
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${actionView === 'RECHARGE' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Recargar
                            </button>
                            <button
                                onClick={() => setActionView('WITHDRAW')}
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${actionView === 'WITHDRAW' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Retirar
                            </button>
                        </div>

                        <div className="border-b border-white/5 pb-6">
                            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                                {actionView === 'RECHARGE' ? 'Solicitar Recarga' : 'Retirar Fondos'}
                            </h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                                {actionView === 'RECHARGE' ? 'Selecciona tu método y envía los detalles' : 'Solicita un retiro de ganancias a tu banco o SINPE'}
                            </p>
                        </div>

                        {actionView === 'RECHARGE' ? (
                            <>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setSelectedMethod('SINPE')}
                                        className={`flex-1 py-4 px-6 rounded-2xl border transition-all flex flex-col items-center gap-2 ${selectedMethod === 'SINPE' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                                    >
                                        <span className="text-2xl">📱</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">SINPE Móvil</span>
                                    </button>
                                    <button 
                                        onClick={() => setSelectedMethod('CARD')}
                                        className={`flex-1 py-4 px-6 rounded-2xl border transition-all flex flex-col items-center gap-2 ${selectedMethod === 'CARD' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                                    >
                                        <span className="text-2xl">💳</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Tarjeta</span>
                                    </button>
                                </div>

                                {selectedMethod === 'SINPE' ? (
                                    <div className="bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/10 space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center mb-2">¿Cómo recargar por SINPE?</h3>
                                            {publicMethods.length > 0 ? publicMethods.map((s: any, idx: number) => (
                                                <div key={idx} className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-1">
                                                     <div className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-500 font-bold uppercase">{s.name}</span>
                                                        <span className="text-emerald-400 font-black font-mono text-lg">{s.sinpePhone}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px]">
                                                        <span className="text-gray-600 uppercase font-black">Cuenta IBAN</span>
                                                        <span className="text-white font-bold">{s.account !== 'N/A' ? s.account : 'No Requerido'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px]">
                                                        <span className="text-gray-600 uppercase font-black">Tipo</span>
                                                        <span className="text-emerald-400 font-bold px-2 bg-emerald-500/10 rounded-full">{s.type}</span>
                                                    </div>
                                                </div>
                                            )) : loadingSettings ? (
                                                <div className="p-4 text-center text-gray-500 text-[10px] font-black uppercase animate-pulse">Cargando cuentas...</div>
                                            ) : (
                                                <div className="p-4 text-center text-red-400 text-[10px] font-black uppercase">No hay cuentas configuradas</div>
                                            )}
                                        </div>

                                        {/* Dynamic Support WhatsApp Button */}
                                        <div className="pt-4 border-t border-white/5">
                                            <a 
                                                href={`https://wa.me/${adminPhone}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-3 w-full py-4 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#25D366]/20 transition-all shadow-[0_0_15px_rgba(37,211,102,0.1)]"
                                            >
                                                <span className="text-lg">📲</span> SOPORTE VÍA WHATSAPP
                                            </a>
                                        </div>
                                        
                                        <form onSubmit={handleRecharge} className="space-y-6 border-t border-white/5 pt-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Monto Transferido</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-xl">₡</span>
                                                    <input 
                                                        type="number" 
                                                        value={amount}
                                                        onChange={(e) => setAmount(e.target.value)}
                                                        placeholder="0"
                                                        className="w-full bg-white/5 border border-white/10 py-5 pl-12 pr-6 rounded-2xl text-white font-black text-3xl outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Banco Destino</label>
                                                <select 
                                                    value={selectedBank}
                                                    onChange={(e) => setSelectedBank(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-2xl text-white font-black text-lg outline-none focus:border-emerald-500 transition-all appearance-none"
                                                    required
                                                >
                                                    <option value="">Seleccione el Banco</option>
                                                    {publicMethods.map((s: any, idx: number) => (
                                                        <option key={idx} value={s.name}>{s.name} - {s.sinpePhone}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Referencia de Transferencia</label>
                                                <input 
                                                    type="text" 
                                                    value={ref}
                                                    onChange={(e) => setRef(e.target.value)}
                                                    placeholder="Ingresa el código del comprobante"
                                                    className="w-full bg-white/5 border border-white/10 py-5 px-6 rounded-2xl text-white font-mono font-black text-lg outline-none focus:border-emerald-500 transition-all placeholder:text-gray-800"
                                                    required
                                                />
                                            </div>
                                            <button 
                                                type="submit" 
                                                disabled={uploading}
                                                className="w-full py-6 bg-gradient-to-r from-emerald-600 top-emerald-400 rounded-2xl font-black text-white hover:shadow-2xl hover:shadow-emerald-500/30 active:scale-95 transition-all shadow-xl uppercase tracking-[0.3em] disabled:opacity-50"
                                            >
                                                {uploading ? 'ENVIANDO...' : 'ENVIAR COMPROBANTE'}
                                            </button>
                                            
                                            {ref && amount && whatsappLink(ref, amount) && (
                                                <a 
                                                    href={whatsappLink(ref, amount) || '#'} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="block w-full py-4 bg-[#25D366] text-white text-center rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all"
                                                >
                                                    📲 Enviar Comprobante vía WhatsApp
                                                </a>
                                            )}
                                        </form>
                                    </div>
                                ) : (
                                    <div className="bg-blue-500/5 p-6 rounded-[2rem] border border-blue-500/10 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                        {methods.length > 0 ? (
                                            <form onSubmit={handleRecharge} className="space-y-6">
                                                <div className="p-5 bg-white/5 rounded-2xl border border-blue-500/30 flex items-center gap-4">
                                                    <div className="text-3xl">💳</div>
                                                    <div>
                                                        <p className="text-white font-black text-sm uppercase">{methods[0].provider} •••• {methods[0].last4}</p>
                                                        <p className="text-[9px] text-gray-500 font-bold">CARGANDO A ESTA TARJETA</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Monto a Cargar</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 font-black text-xl">₡</span>
                                                        <input 
                                                            type="number" 
                                                            value={amount}
                                                            onChange={(e) => setAmount(e.target.value)}
                                                            placeholder="0"
                                                            className="w-full bg-white/5 border border-white/10 py-5 pl-12 pr-6 rounded-2xl text-white font-black text-3xl outline-none focus:border-blue-500 transition-all placeholder:text-gray-800"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <button 
                                                    type="submit" 
                                                    disabled={uploading}
                                                    className="w-full py-6 bg-gradient-to-r from-blue-600 top-blue-400 rounded-2xl font-black text-white shadow-xl hover:shadow-blue-500/30 transition-all uppercase tracking-[0.3em] disabled:opacity-50"
                                                >
                                                    {uploading ? 'PROCESANDO...' : 'RECARGAR CON TARJETA'}
                                                </button>
                                            </form>
                                        ) : (
                                            <div className="py-12 text-center space-y-4">
                                                <div className="text-4xl grayscale">💳</div>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">No tienes tarjetas registradas</p>
                                                <button 
                                                    onClick={() => setShowAddCard(true)}
                                                    className="py-3 px-8 bg-blue-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest"
                                                >
                                                    REGISTRAR AHORA
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="animate-in fade-in duration-500 space-y-8">
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setWithdrawalMethod('SINPE')}
                                        className={`flex-1 py-4 px-6 rounded-2xl border transition-all flex flex-col items-center gap-2 ${withdrawalMethod === 'SINPE' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                                    >
                                        <span className="text-2xl">📱</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Vía SINPE Móvil</span>
                                    </button>
                                    <button 
                                        onClick={() => setWithdrawalMethod('IBAN')}
                                        className={`flex-1 py-4 px-6 rounded-2xl border transition-all flex flex-col items-center gap-2 ${withdrawalMethod === 'IBAN' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                                    >
                                        <span className="text-2xl">🏦</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Depósito Bancario</span>
                                    </button>
                                </div>

                                <form onSubmit={handleWithdrawal} className="p-6 rounded-[2rem] border border-amber-500/10 bg-amber-500/5 space-y-6">
                                    {withdrawalMethod === 'IBAN' && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-4">Número de Cuenta IBAN</label>
                                            <input 
                                                type="text" 
                                                value={iban}
                                                onChange={(e) => setIban(e.target.value)}
                                                placeholder="CR00000000000000000000"
                                                className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-2xl text-white font-mono font-black text-sm outline-none focus:border-amber-500 transition-all placeholder:text-gray-800 uppercase"
                                                required
                                            />
                                            <p className="text-[9px] text-red-400 font-bold px-4 pt-1 uppercase">Importante: La cuenta debe estar a tu nombre EXACTO registrado en la cuenta. Se debe asociar a tu Cédula.</p>
                                        </div>
                                    )}

                                    {withdrawalMethod === 'SINPE' && (
                                        <div className="px-4 py-3 border border-amber-500/20 bg-amber-500/10 rounded-xl">
                                            <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Nota SINPE Móvil:</h4>
                                            <p className="text-[10px] text-amber-200/60 font-medium">El retiro se enviará exclusivamente al número de teléfono celular verificado y asociado a tu cuenta al momento del registro.</p>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-4">Monto a Retirar</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 font-black text-xl">₡</span>
                                            <input 
                                                type="number" 
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder="0"
                                                max={balance}
                                                className="w-full bg-white/5 border border-white/10 py-5 pl-12 pr-6 rounded-2xl text-white font-black text-3xl outline-none focus:border-amber-500 transition-all placeholder:text-gray-800"
                                                required
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-500 font-bold text-right px-4">Disponible: ₡{balance.toLocaleString()}</p>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={withdrawing || balance <= 0}
                                        className="w-full py-6 bg-gradient-to-r from-amber-600 top-amber-400 rounded-2xl font-black text-white hover:shadow-2xl hover:shadow-amber-500/30 active:scale-95 transition-all shadow-xl uppercase tracking-[0.3em] disabled:opacity-50"
                                    >
                                        {withdrawing ? 'SOLICITANDO...' : 'SOLICITAR RETIRO AL ADMINISTRADOR'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <section className="glass-panel p-8 bg-black/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Historial de Transacciones
                    </h3>
                    <button 
                        onClick={() => {
                            setFilterStartDate(''); setFilterEndDate(''); setFilterType('ALL'); fetchWalletData();
                        }}
                        className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest"
                    >Limpiar Filtros</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl mb-6">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Desde</label>
                        <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-emerald-500/50" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Hasta</label>
                        <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-emerald-500/50" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Tipo</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-emerald-500/50 appearance-none">
                            <option value="ALL">TODOS</option>
                            <option value="SINPE_DEPOSIT">RECARGAS SINPE</option>
                            <option value="BET">APUESTAS</option>
                            <option value="WIN">PREMIOS</option>
                            <option value="WITHDRAWAL">RETIROS</option>
                            <option value="ADJUSTMENT">AJUSTES</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={fetchWalletData} className="w-full py-2 bg-emerald-500/20 text-emerald-400 font-black rounded-xl border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all uppercase text-[10px] tracking-widest">
                            Aplicar
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {transactions.length > 0 ? (
                        transactions.map((tx, i) => (
                            <div key={i} className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-all">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-white text-sm uppercase">{tx.type || 'TRANSFERENCIA'}</p>
                                        {tx.method_type && <span className="text-[8px] bg-white/10 px-2 py-0.5 rounded text-gray-400 font-bold">{tx.method_type}</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1 max-w-[200px] truncate">{tx.details || ''}</p>
                                    <p className="text-[10px] text-gray-600 font-bold mt-1">{tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-black text-xl ${Number(tx.amount) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {Number(tx.amount) > 0 ? '+' : ''}₡{Math.abs(Number(tx.amount)).toLocaleString()}
                                    </p>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${tx.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{tx.status}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 opacity-30">
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.5em]">Sin Movimientos Recientes</p>
                        </div>
                    )}
                </div>
            </section>
        </main>
        </ProtectedRoute>
    );
}
