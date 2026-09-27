const { Pool } = require('pg');
require('dotenv').config();


const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ast_db',
  user: process.env.DB_USER || 'ast_app_user',
  password: process.env.DB_PASSWORD,
  max: 20, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  
  query: (text, params) => pool.query(text, params),
  
  end: () => pool.end(),
};
