require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: 'postgres',
  port: 5432,
  database: 'portfolio',
  user: 'portfolio_user',
  password: process.env.POSTGRES_PASSWORD,
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
});

module.exports = pool;
