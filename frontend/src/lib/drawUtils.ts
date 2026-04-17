// Función para convertir hora 24h a formato AM/PM
export const formatTo12Hour = (time24: string): string => {
    const [hour, minute] = time24.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    let hour12 = hour % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
};

// Función para calcular si un sorteo está abierto usando hora LOCAL del dispositivo
export const isDrawOpen = (drawDate: string, drawTime: string): boolean => {
    const now = new Date();
    
    const [year, month, day] = drawDate.split('-').map(Number);
    const [hour, minute] = drawTime.split(':').map(Number);
    
    const drawDateTime = new Date(year, month - 1, day, hour, minute, 0);
    const closeDateTime = new Date(drawDateTime.getTime() - 20 * 60 * 1000);
    
    return now < closeDateTime;
};

// Función para calcular tiempo restante hasta cierre
export const getTimeUntilClose = (drawDate: string, drawTime: string): string => {
    const now = new Date();
    
    const [year, month, day] = drawDate.split('-').map(Number);
    const [hour, minute] = drawTime.split(':').map(Number);
    
    const drawDateTime = new Date(year, month - 1, day, hour, minute, 0);
    const closeDateTime = new Date(drawDateTime.getTime() - 20 * 60 * 1000);
    
    const diffMs = closeDateTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'CERRADO';
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
};

// Función para obtener fecha actual en formato YYYY-MM-DD usando hora LOCAL
export const getLocalDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Función para obtener fecha con offset usando hora LOCAL
export const getLocalDateWithOffset = (daysToAdd: number): string => {
    const now = new Date();
    now.setDate(now.getDate() + daysToAdd);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};