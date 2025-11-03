// ========================
// IMPORTAÇÕES E CONFIGURAÇÕES INICIAIS
// ========================
const express = require('express');
const app = express();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();
const mysql = require('mysql2/promise');

// ========================
// CONFIGURAÇÃO CORS
// ========================
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// ========================
// CONEXÃO COM O BANCO DE DADOS (Railway)
// ========================
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false }
});

// Testa conexão inicial
db.getConnection((err, connection) => {
  if (err) console.error('❌ Erro ao conectar ao banco:', err);
  else {
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
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || 'professor_super_secreto',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// ========================
// CONFIGURAÇÃO DO EXPRESS
// ========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ========================
// MIDDLEWARES DE AUTENTICAÇÃO
// ========================
function verificarAuth(req, res, next) {
  if (req.session && req.session.usuario) return next();
  return res.status(403).json({ sucesso: false, erro: 'Acesso negado! Faça login primeiro.' });
}

function verificarAdmin(req, res, next) {
  if (req.session?.usuario?.tipo === 'administrador') return next();
  return res.status(403).json({ sucesso: false, erro: 'Acesso negado! Apenas administradores.' });
}

function verificarProfessor(req, res, next) {
  if (req.session?.usuario?.tipo === 'professor') return next();
  return res.status(403).json({ sucesso: false, erro: 'Acesso negado! Apenas professores.' });
}

// ========================
// ROTAS PÚBLICAS
// ========================
app.get('/', (req, res) => {
  res.json({
    message: 'API Prosemed Diário Digital - Online',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  db.query('SELECT 1', (err) => {
    if (err) return res.status(500).json({ status: 'unhealthy', database: 'disconnected' });
    res.status(200).json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  });
});

app.get('/status', (req, res) => {
  res.json({
    app: 'Prosemed Diário Digital',
    status: 'operacional',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 8080,
    timestamp: new Date().toISOString()
  });
});

// ========================
// FUNÇÕES AUXILIARES LOGIN
// ========================
function fazerLogin(usuario, res, req) {
  req.session.usuario = { 
    id: usuario.id, 
    nome: usuario.nome, 
    email: usuario.email, 
    tipo: usuario.tipo.toLowerCase(),
    pode_criar_admin: Boolean(usuario.pode_criar_admin)
  };
  res.json({ sucesso: true, mensagem: 'Login realizado com sucesso!', usuario: req.session.usuario });
}

// ========================
// ROTAS DE CADASTRO
// ========================
app.post('/cadastro', async (req, res) => {
  let { nome, email, senha, tipo } = req.body;
  if (!nome || !email || !senha || !tipo) return res.json({ sucesso: false, erro: 'Todos os campos são obrigatórios!' });

  nome = nome.trim();
  email = email.trim().toLowerCase();
  tipo = tipo.toLowerCase().trim();
  const tiposPermitidos = ['administrador', 'professor', 'aluno'];
  if (!tiposPermitidos.includes(tipo)) return res.json({ sucesso: false, erro: 'Tipo de usuário inválido!' });

  function continuarCadastro() {
    db.query('SELECT id FROM usuarios WHERE email = ?', [email], async (err, results) => {
      if (err) return res.json({ sucesso: false, erro: 'Erro ao verificar email!' });
      if (results.length > 0) return res.json({ sucesso: false, erro: 'Este email já está cadastrado!' });

      const hash = await bcrypt.hash(senha, 10);
      db.query('INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)', 
        [nome, email, hash, tipo], 
        (err, result) => {
          if (err) return res.json({ sucesso: false, erro: 'Erro ao cadastrar usuário!' });
          res.json({ sucesso: true, id: result.insertId, mensagem: `Usuário ${tipo} cadastrado com sucesso!` });
        }
      );
    });
  }

  if (tipo === 'administrador' && !req.session.usuario) {
    return res.json({ sucesso: false, erro: 'Acesso negado! Faça login para criar administradores.' });
  } else continuarCadastro();
});

// ========================
// ROTAS DE LOGIN
// ========================
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.json({ sucesso: false, erro: 'Email e senha são obrigatórios!' });

  db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
    if (err) return res.json({ sucesso: false, erro: 'Erro ao fazer login!' });
    if (results.length === 0) return res.json({ sucesso: false, erro: 'Email ou senha incorretos!' });

    const usuario = results[0];
    const match = await bcrypt.compare(senha, usuario.senha);
    if (match) return fazerLogin(usuario, res, req);

    const novoHash = await bcrypt.hash(senha, 10);
    db.query('UPDATE usuarios SET senha = ? WHERE id = ?', [novoHash, usuario.id], () => {
      fazerLogin(usuario, res, req);
    });
  });
});

// ========================
// LOGOUT
// ========================
app.post('/logout', verificarAuth, (req, res) => {
  req.session.destroy(err => {
    if (err) return res.json({ sucesso: false, erro: 'Erro ao fazer logout!' });
    res.json({ sucesso: true, mensagem: 'Logout realizado com sucesso!' });
  });
});

// ========================
// ROTAS DE SENHA
// ========================
app.post('/alterar-senha', verificarAuth, async (req, res) => {
  const { senha_atual, nova_senha, confirmar_senha } = req.body;
  const usuarioId = req.session.usuario.id;

  if (!senha_atual || !nova_senha || !confirmar_senha) return res.json({ sucesso: false, erro: 'Todos os campos são obrigatórios!' });
  if (nova_senha !== confirmar_senha) return res.json({ sucesso: false, erro: 'Nova senha e confirmação não coincidem!' });
  if (nova_senha.length < 6) return res.json({ sucesso: false, erro: 'A nova senha deve ter pelo menos 6 caracteres!' });

  db.query('SELECT * FROM usuarios WHERE id = ?', [usuarioId], async (err, results) => {
    if (err || results.length === 0) return res.json({ sucesso: false, erro: 'Erro ao verificar senha atual!' });

    const usuario = results[0];
    const senhaAtualCorreta = await bcrypt.compare(senha_atual, usuario.senha);
    if (!senhaAtualCorreta) return res.json({ sucesso: false, erro: 'Senha atual incorreta!' });

    const hashNovaSenha = await bcrypt.hash(nova_senha, 10);
    db.query('UPDATE usuarios SET senha = ? WHERE id = ?', [hashNovaSenha, usuarioId], (err) => {
      if (err) return res.json({ sucesso: false, erro: 'Erro ao alterar senha!' });
      res.json({ sucesso: true, mensagem: 'Senha alterada com sucesso!' });
    });
  });
});

// ========================
// ROTAS DE USUÁRIO
// ========================
app.get('/api/dados-usuario', verificarAuth, (req, res) => {
  res.json({ 
    sucesso: true, 
    usuario: req.session.usuario 
  });
});

// ========================
// ROTAS DE TURMAS (CRUD)
// ========================
app.get('/api/turmas', verificarAdmin, (req, res) => {
  const sql = `
    SELECT 
      t.id, 
      t.nome, 
      t.ano, 
      t.turno, 
      COALESCE(GROUP_CONCAT(u.nome SEPARATOR ', '), 'Sem professor') AS professores
    FROM turmas t
    LEFT JOIN professor_turma pt ON t.id = pt.id_turma
    LEFT JOIN usuarios u ON u.id = pt.id_professor
    GROUP BY t.id, t.nome, t.ano, t.turno
    ORDER BY t.ano ASC, t.nome ASC;
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar turmas.' });
    res.json({ sucesso: true, turmas: results });
  });
});

app.post('/api/turmas', verificarAdmin, (req, res) => {
  const { nome, ano, turno } = req.body;
  if (!nome || !ano || !turno) return res.status(400).json({ sucesso: false, erro: 'Todos os campos são obrigatórios!' });

  db.query('SELECT id FROM turmas WHERE nome = ? AND ano = ?', [nome, ano], (err, rows) => {
    if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao verificar turma.' });
    if (rows.length > 0) return res.status(409).json({ sucesso: false, erro: 'Turma já existe.' });

    db.query('INSERT INTO turmas (nome, ano, turno) VALUES (?, ?, ?)', [nome, ano, turno], (err, result) => {
      if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao cadastrar turma.' });
      res.json({ sucesso: true, mensagem: 'Turma cadastrada com sucesso!', id: result.insertId });
    });
  });
});

// ========================
// ROTAS DE PROFESSORES (CRUD)
// ========================
app.get('/api/professores', verificarAdmin, (req, res) => {
  db.query('SELECT id, nome, email FROM usuarios WHERE tipo = "professor" ORDER BY nome', (err, rows) => {
    if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar professores.' });
    res.json({ sucesso: true, professores: rows });
  });
});

// ========================
// ROTAS DE ALUNOS (CRUD)
// ========================
app.get('/api/alunos', verificarAdmin, (req, res) => {
  db.query('SELECT id, nome, email FROM usuarios WHERE tipo = "aluno" ORDER BY nome', (err, rows) => {
    if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar alunos.' });
    res.json({ sucesso: true, alunos: rows });
  });
});

// ========================
// TRATAMENTO DE ERROS
// ========================
app.use((err, req, res, next) => {
  console.error('Middleware de erro:', err.stack || err);
  res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
});

app.use((req, res) => {
  res.status(404).json({ sucesso: false, erro: 'Rota não encontrada' });
});

// ========================
// INICIAR SERVIDOR
// ========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
