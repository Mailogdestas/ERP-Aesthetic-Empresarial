import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL!;
  console.log('Connecting to:', url);
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const res = await client.query('SELECT current_user, inet_client_addr(), inet_client_port();');
    console.log('Connected as:', res.rows[0]);
  } catch (e: any) {
    console.error('PG connect error:', e.message);
  } finally {
    await client.end().catch(() => {});
  }
}

main();