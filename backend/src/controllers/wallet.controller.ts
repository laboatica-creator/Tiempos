export const getWalletTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { limit = 50, page = 1 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        // 🔥 CORREGIDO: Usar aliases específicos para evitar ambigüedad en 'id'
        const query = `
            SELECT 
                tx_id as id,
                amount,
                type,
                status,
                created_at,
                method,
                details
            FROM (
                (SELECT 
                    sd.id as tx_id, 
                    sd.amount, 
                    'DEPÓSITO SINPE' as type, 
                    sd.status, 
                    sd.created_at, 
                    'SINPE' as method, 
                    sd.reference_number as details 
                FROM sinpe_deposits sd 
                WHERE sd.user_id = $1)
                UNION ALL
                (SELECT 
                    wr.id as tx_id, 
                    wr.amount, 
                    'RETIRO' as type, 
                    wr.status, 
                    wr.created_at, 
                    wr.method, 
                    wr.details 
                FROM withdrawal_requests wr 
                WHERE wr.user_id = $1)
                UNION ALL
                (SELECT 
                    wt.id as tx_id, 
                    wt.amount, 
                    wt.type::text, 
                    'COMPLETED' as status, 
                    wt.created_at, 
                    'SISTEMA' as method, 
                    wt.description as details 
                FROM wallet_transactions wt 
                JOIN wallets w ON wt.wallet_id = w.id 
                WHERE w.user_id = $1)
            ) as all_txs
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [userId, limit, offset]);
        res.json({ data: result.rows });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Error al obtener transacciones' });
    }
};