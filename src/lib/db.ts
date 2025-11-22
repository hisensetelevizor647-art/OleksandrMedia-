import { createPool } from '@vercel/postgres';

const pool = createPool();

export const db = {
    query: async (text: string, params?: any[]) => {
        const start = Date.now();
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: result.rowCount });
        return result;
    }
};

export default db;
