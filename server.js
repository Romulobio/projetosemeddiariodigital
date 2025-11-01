// ========================
// IMPORTAÇÕES
// ========================
const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ========================
// MIDDLEWARES
// ========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================
// CONFIGURAÇÃO CORS
// ========================
app.use(cors({
  origin: [
    'https://projetosemeddiariodigital.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// ========================
// CONEXÃO COM BANCO DE DADOS
// ========================
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT || 3306,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Testa conexão inicial
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err);
  } else {
    console.log('✅ Conexão com o banco bem-sucedida!');
    connection.release();
  }
});

// ========================
// CONFIGURAÇÃO DE SESSÃO
// ========================
const sessionStore = new MySQLStore({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'chavesecreta123',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { secure: false } // deixe false se não estiver usando HTTPS localmente
}));

// ========================
// ROTA RAIZ (TESTE)
// ========================
app.get('/', (req, res) => {
  res.send('🚀 Servidor rodando corretamente no Railway!');
});

// ========================
// INICIAR SERVIDOR
// ========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
});
