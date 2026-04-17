'use client';

import React, { useState, useEffect } from 'react';

interface TimerProps {
    drawTime: string;
    drawDate: string;
    isOpen: boolean;
    onExpire?: () => void;
}

export default function Timer({ drawTime, drawDate, isOpen, onExpire }: TimerProps) {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        if (!isOpen) {
            if (onExpire) onExpire();
            return;
        }

        const calculateTimeLeft = () => {
            try {
                const [year, month, day] = drawDate.split('-').map(Number);
                const [hour, minute] = drawTime.split(':').map(Number);
                
                const drawDateTime = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
                const closeDateTime = new Date(drawDateTime.getTime() - 20 * 60 * 1000);
                
                const now = new Date();
                const costaRicaOffset = -6 * 60;
                const localOffset = now.getTimezoneOffset();
                const costaRicaNow = new Date(now.getTime() + (localOffset - costaRicaOffset) * 60 * 1000);
                
                const diffMs = closeDateTime.getTime() - costaRicaNow.getTime();
                
                if (diffMs <= 0) {
                    if (onExpire) onExpire();
                    return;
                }
                
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
    }, [drawTime, drawDate, isOpen, onExpire]);
    
    if (!isOpen) {
        return <span className="text-red-500 font-bold text-xs">🔒 CERRADO</span>;
    }
    
    return <span className="text-emerald-400 font-mono text-xs">⏱️ {timeLeft}</span>;
}