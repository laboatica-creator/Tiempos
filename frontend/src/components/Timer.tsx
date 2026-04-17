'use client';

import React, { useState, useEffect } from 'react';

interface TimerProps {
    drawTime: string;
    drawDate: string;
    onExpire?: () => void;
}

export default function Timer({ drawTime, drawDate, onExpire }: TimerProps) {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isClosed, setIsClosed] = useState<boolean>(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            try {
                // Parsear fecha y hora del sorteo
                const [year, month, day] = drawDate.split('-').map(Number);
                const [hour, minute] = drawTime.split(':').map(Number);
                
                // Crear fecha del sorteo en UTC
                const drawDateTime = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
                
                // Cierre = 20 minutos antes del sorteo
                const closeDateTime = new Date(drawDateTime.getTime() - 20 * 60 * 1000);
                
                // Hora actual en Costa Rica (UTC-6)
                const now = new Date();
                const costaRicaOffset = -6 * 60; // UTC-6 en minutos
                const localOffset = now.getTimezoneOffset();
                const costaRicaNow = new Date(now.getTime() + (localOffset - costaRicaOffset) * 60 * 1000);
                
                // Fecha actual (solo día, sin hora) en Costa Rica
                const todayDateOnly = new Date(Date.UTC(
                    costaRicaNow.getUTCFullYear(), 
                    costaRicaNow.getUTCMonth(), 
                    costaRicaNow.getUTCDate(), 
                    0, 0, 0
                ));
                
                // Fecha del sorteo (solo día, sin hora)
                const drawDateOnly = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
                
                // Si el sorteo es en un día FUTURO -> está ABIERTO
                if (drawDateOnly > todayDateOnly) {
                    setIsClosed(false);
                    // Mostrar tiempo hasta cierre
                    const diffMs = closeDateTime.getTime() - costaRicaNow.getTime();
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    
                    if (diffHours >= 24) {
                        const days = Math.floor(diffHours / 24);
                        const hours = diffHours % 24;
                        setTimeLeft(`${days}d ${hours}h ${diffMins}m`);
                    } else if (diffHours > 0) {
                        setTimeLeft(`${diffHours}h ${diffMins}m`);
                    } else if (diffMins > 0) {
                        setTimeLeft(`${diffMins}m`);
                    } else {
                        setTimeLeft('0m');
                    }
                    return;
                }
                
                // Si el sorteo es HOY o PASADO, verificar si ya cerró
                if (costaRicaNow >= closeDateTime) {
                    setIsClosed(true);
                    setTimeLeft('CERRADO');
                    if (onExpire) onExpire();
                    return;
                }
                
                // Sorteo de hoy que aún no ha cerrado
                setIsClosed(false);
                
                const diffMs = closeDateTime.getTime() - costaRicaNow.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                const secs = Math.floor((diffMs % 60000) / 1000);
                
                if (hours > 0) {
                    setTimeLeft(`${hours}h ${mins}m ${secs}s`);
                } else if (mins > 0) {
                    setTimeLeft(`${mins}m ${secs}s`);
                } else {
                    setTimeLeft(`${secs}s`);
                }
            } catch (error) {
                console.error('Timer error:', error);
                setTimeLeft('ERROR');
            }
        };
        
        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);
        
        return () => clearInterval(interval);
    }, [drawTime, drawDate, onExpire]);
    
    if (isClosed) {
        return <span className="text-red-500 font-bold text-xs">🔒 CERRADO</span>;
    }
    
    return <span className="text-emerald-400 font-mono text-xs">⏱️ {timeLeft}</span>;
}