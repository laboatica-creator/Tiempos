'use client';
import { useState, useEffect } from 'react';

export default function AnnouncementBanner() {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    const fetchAndShow = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://tiempos-backend.onrender.com';
        // 🔥 CORREGIDO: eliminar '/api' duplicado
        const response = await fetch(`${apiUrl}/announcements/active`);
        if (!response.ok) return;
        
        const data = await response.json();
        if (data && data.message) {
          setMessage(data.message);
          setVisible(true);
          
          const duration = data.duration_seconds ? data.duration_seconds * 1000 : 4000;
          timeoutId = setTimeout(() => setVisible(false), duration);
          
          const interval = data.interval_seconds ? data.interval_seconds * 1000 : 300000;
          clearInterval(intervalId);
          intervalId = setInterval(fetchAndShow, interval);
        }
      } catch (error) {
        console.error('Error fetching announcement:', error);
      }
    };

    fetchAndShow();
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  if (!visible || !message) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-center py-3 px-4 shadow-[0_-5px_15px_rgba(0,0,0,0.5)] z-[100] animate-in slide-in-from-bottom flex justify-center items-center">
      <span className="text-sm font-bold tracking-widest uppercase">📢 {message}</span>
    </div>
  );
}