require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
});

module.exports = pool;
