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
                // Parsear fecha y hora correctamente
                const [year, month, day] = drawDate.split('-');
                const [hour, minute] = drawTime.split(':');
                
                const drawDateTime = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day),
                    parseInt(hour),
                    parseInt(minute),
                    0
                );
                
                // Cierre 20 minutos antes
                const closeDateTime = new Date(drawDateTime.getTime() - 20 * 60 * 1000);
                const now = new Date();
                
                if (now >= closeDateTime) {
                    setIsClosed(true);
                    setTimeLeft('CERRADO');
                    if (onExpire) onExpire();
                    return;
                }
                
                setIsClosed(false);
                
                const diffMs = closeDateTime.getTime() - now.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                
                if (hours > 0) {
                    setTimeLeft(`${hours}h ${mins}m`);
                } else {
                    setTimeLeft(`${mins}m`);
                }
            } catch (error) {
                console.error('Timer error:', error);
                setTimeLeft('ERROR');
            }
        };
        
        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 60000);
        
        return () => clearInterval(interval);
    }, [drawTime, drawDate, onExpire]);
    
    if (isClosed) {
        return <span className="text-red-500 font-bold text-xs">🔒 CERRADO</span>;
    }
    
    return <span className="text-emerald-400 font-mono text-xs">⏱️ {timeLeft}</span>;
}