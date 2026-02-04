import { query, closePool } from '../config/database';
import fs from 'fs';
import path from 'path';

async function run() {
    try {
        const sqlPath = path.join(__dirname, '../db/migrations/05_app_popups.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Running migration...');
        await query(sql);
        console.log('Migration successful!');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await closePool();
    }
}

run();
