require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'portfolio',
  user: process.env.POSTGRES_USER || 'portfolio_user',
  password: process.env.POSTGRES_PASSWORD,
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
});

module.exports = pool;
