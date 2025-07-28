const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: '127.0.0.1',    // 127.0.0.1 pour être sûr
  port: 3306,
  user: 'root',
  password: '',         // 🔔 Vide car Homebrew MySQL est installé "sans password" par défaut
  database: 'splitwise_db',  // ⚠️ Crée-la si elle n’existe pas encore !
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000
};

const pool = mysql.createPool(dbConfig);

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully to database:', dbConfig.database);
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };
