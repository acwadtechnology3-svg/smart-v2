
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = 'postgresql://postgres.sxadrmfixlzsettqjntf:Sklans2003ezzat%40@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
    console.log('Connecting to database...');
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected.');

        const sqlPath = path.resolve(__dirname, '../../../../ADD_WAITING_TIME_LOGIC.sql');
        console.log('Reading migration file:', sqlPath);

        if (!fs.existsSync(sqlPath)) {
            console.error('File not found:', sqlPath);
            process.exit(1);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Executing SQL...');

        await client.query(sql);

        console.log('Migration executed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
