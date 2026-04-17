export const getActiveDraws = async (req: AuthRequest, res: Response) => {
    try {
        const { type, date } = req.query;
        
        // Obtener fecha actual en Costa Rica
        const costaRicaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
        const todayCostaRica = costaRicaNow.toISOString().split('T')[0];
        
        console.log('📅 getActiveDraws - type:', type, 'date:', date);
        console.log('📅 Hoy Costa Rica:', todayCostaRica);
        
        // Query SIMPLE y CORRECTA
        let query = `
            SELECT 
                d.id,
                d.lottery_type,
                TO_CHAR(d.draw_date, 'YYYY-MM-DD') as draw_date,
                d.draw_time,
                -- is_open = true si la fecha del sorteo es >= hoy
                -- y si es hoy, que falten más de 20 minutos
                CASE 
                    WHEN d.draw_date > $1::DATE THEN true
                    WHEN d.draw_date = $1::DATE AND 
                         (NOW() AT TIME ZONE 'America/Costa_Rica' + INTERVAL '20 minutes') < 
                         (d.draw_date + d.draw_time) AT TIME ZONE 'America/Costa_Rica'
                    THEN true 
                    ELSE false 
                END as is_open
            FROM draws d
            WHERE d.draw_date >= $1::DATE
            AND d.draw_date <= $1::DATE + INTERVAL '7 days'
        `;
        
        const params: any[] = [todayCostaRica];
        
        if (type) {
            query += ` AND d.lottery_type = $${params.length + 1}`;
            params.push(type);
        }
        
        if (date) {
            query += ` AND d.draw_date = $${params.length + 1}::DATE`;
            params.push(date);
        }
        
        query += ` ORDER BY d.draw_date, d.draw_time`;
        
        const result = await pool.query(query, params);
        
        console.log(`✅ Sorteos encontrados: ${result.rows.length}`);
        result.rows.forEach(row => {
            console.log(`   - ${row.draw_date} ${row.draw_time}: is_open=${row.is_open}`);
        });
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching draws:', error);
        res.status(500).json({ error: 'Error fetching draws' });
    }
};