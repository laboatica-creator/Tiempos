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
                // CORRECCIÓN: Usar hora Costa Rica explícitamente
                // Formato drawDate: "2026-04-16", drawTime: "13:00:00"
                const [year, month, day] = drawDate.split('-').map(Number);
                const [hour, minute, second] = drawTime.split(':').map(Number);
                
                // Crear fecha del sorteo en Costa Rica
                const drawDateTime = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
                
                // Cierre = 20 minutos antes del sorteo
                const closeDateTime = new Date(drawDateTime.getTime() - 20 * 60 * 1000);
                
                // Hora actual en Costa Rica (UTC-6)
                const now = new Date();
                const costaRicaOffset = -6 * 60; // Costa Rica UTC-6 en minutos
                const localOffset = now.getTimezoneOffset();
                const costaRicaNow = new Date(now.getTime() + (localOffset - costaRicaOffset) * 60 * 1000);
                
                if (costaRicaNow >= closeDateTime) {
                    setIsClosed(true);
                    setTimeLeft('CERRADO');
                    if (onExpire) onExpire();
                    return;
                }
                
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
        const interval = setInterval(calculateTimeLeft, 1000); // Actualizar cada segundo
        
        return () => clearInterval(interval);
    }, [drawTime, drawDate, onExpire]);
    
    if (isClosed) {
        return <span className="text-red-500 font-bold text-xs">🔒 CERRADO</span>;
    }
    
    return <span className="text-emerald-400 font-mono text-xs">⏱️ {timeLeft}</span>;
}