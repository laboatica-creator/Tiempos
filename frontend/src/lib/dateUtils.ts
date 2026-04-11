export const getCurrentCostaRicaDate = (): string => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
};

export const getCurrentCostaRicaTime = (): string => {
    return new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Costa_Rica', hour12: false });
};

export const formatDrawDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-CR', {
        timeZone: 'America/Costa_Rica',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

export const formatDrawDateTime = (dateString: string, timeString: string): string => {
    // Combinar fecha y hora en un objeto Date respetando zona horaria
    const [year, month, day] = dateString.split('T')[0].split('-');
    const [hours, minutes] = timeString.split(':');
    const date = new Date(Date.UTC(parseInt(year), parseInt(month)-1, parseInt(day), parseInt(hours), parseInt(minutes)));
    return date.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });
};