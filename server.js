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
// CONFIGURAÇÃO CORS - ADICIONADO REPLIT
// ========================
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://*.repl.co', // ← ADICIONADO PARA REPLIT
    'https://*.repl.dev'  // ← ADICIONADO PARA REPLIT
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// ========================
// CONEXÃO COM O BANCO DE DADOS (AIVEN)
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
  queueLimit: 0,
  ssl: { 
    rejectUnauthorized: true // ← ALTERADO PARA TRUE (AIVEN EXIGE SSL)
  },
  acquireTimeout: 60000,
  timeout: 60000
});

// Testa conexão inicial (versão async para melhor diagnóstico)
db.getConnection()
  .then(connection => {
    console.log('✅ Conexão com Aiven MySQL bem-sucedida!');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao Aiven:', err.message);
    console.log('💡 Verifique: Variáveis de ambiente e SSL configuration');
  });

// ========================
// CONFIGURAÇÃO DE SESSÃO - OTIMIZADA PARA AIVEN
// ========================
const sessionStore = new MySQLStore({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  ssl: { // ← ADICIONADO SSL PARA SESSÕES
    rejectUnauthorized: true
  }
});

app.use(session({
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || 'professor_super_secreto',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // ← ALTERADO PARA TRUE (REPLIT USA HTTPS)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'none' // ← ALTERADO PARA NONE (CROSS-DOMAIN)
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
    message: 'API Prosemed Diário Digital - Online com Aiven',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rota health atualizada para async/await
app.get('/health', async (req, res) => {
  try {
    await db.execute('SELECT 1');
    res.status(200).json({ 
      status: 'healthy', 
      database: 'connected', 
      timestamp: new Date().toISOString() 
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: err.message 
    });
  }
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

  async function continuarCadastro() {
    try {
      const [results] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
      if (results.length > 0) return res.json({ sucesso: false, erro: 'Este email já está cadastrado!' });

      const hash = await bcrypt.hash(senha, 10);
      const [result] = await db.execute('INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)', [nome, email, hash, tipo]);
      
      res.json({ sucesso: true, id: result.insertId, mensagem: `Usuário ${tipo} cadastrado com sucesso!` });
    } catch (err) {
      res.json({ sucesso: false, erro: 'Erro ao cadastrar usuário!' });
    }
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

  try {
    const [results] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (results.length === 0) return res.json({ sucesso: false, erro: 'Email ou senha incorretos!' });

    const usuario = results[0];
    const match = await bcrypt.compare(senha, usuario.senha);
    
    if (match) {
      return fazerLogin(usuario, res, req);
    } else {
      // Se a senha não bate, tenta re-hash (para senhas antigas sem bcrypt)
      const novoHash = await bcrypt.hash(senha, 10);
      await db.execute('UPDATE usuarios SET senha = ? WHERE id = ?', [novoHash, usuario.id]);
      fazerLogin(usuario, res, req);
    }
  } catch (err) {
    res.json({ sucesso: false, erro: 'Erro ao fazer login!' });
  }
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

  try {
    const [results] = await db.execute('SELECT * FROM usuarios WHERE id = ?', [usuarioId]);
    if (results.length === 0) return res.json({ sucesso: false, erro: 'Erro ao verificar senha atual!' });

    const usuario = results[0];
    const senhaAtualCorreta = await bcrypt.compare(senha_atual, usuario.senha);
    if (!senhaAtualCorreta) return res.json({ sucesso: false, erro: 'Senha atual incorreta!' });

    const hashNovaSenha = await bcrypt.hash(nova_senha, 10);
    await db.execute('UPDATE usuarios SET senha = ? WHERE id = ?', [hashNovaSenha, usuarioId]);
    
    res.json({ sucesso: true, mensagem: 'Senha alterada com sucesso!' });
  } catch (err) {
    res.json({ sucesso: false, erro: 'Erro ao alterar senha!' });
  }
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
app.get('/api/turmas', verificarAdmin, async (req, res) => {
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
  try {
    const [results] = await db.execute(sql);
    res.json({ sucesso: true, turmas: results });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar turmas.' });
  }
});

app.post('/api/turmas', verificarAdmin, async (req, res) => {
  const { nome, ano, turno } = req.body;
  if (!nome || !ano || !turno) return res.status(400).json({ sucesso: false, erro: 'Todos os campos são obrigatórios!' });

  try {
    const [rows] = await db.execute('SELECT id FROM turmas WHERE nome = ? AND ano = ?', [nome, ano]);
    if (rows.length > 0) return res.status(409).json({ sucesso: false, erro: 'Turma já existe.' });

    const [result] = await db.execute('INSERT INTO turmas (nome, ano, turno) VALUES (?, ?, ?)', [nome, ano, turno]);
    res.json({ sucesso: true, mensagem: 'Turma cadastrada com sucesso!', id: result.insertId });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao cadastrar turma.' });
  }
});

// ========================
// ROTAS DE PROFESSORES (CRUD)
// ========================
app.get('/api/professores', verificarAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, nome, email FROM usuarios WHERE tipo = "professor" ORDER BY nome');
    res.json({ sucesso: true, professores: rows });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar professores.' });
  }
});

// ========================
// ROTAS DE ALUNOS (CRUD)
// ========================
app.get('/api/alunos', verificarAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, nome, email FROM usuarios WHERE tipo = "aluno" ORDER BY nome');
    res.json({ sucesso: true, alunos: rows });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar alunos.' });
  }
});
// ========================
// ROTAS DE DEBUG - VISUALIZAR DADOS (ADICIONAR ESTE BLOCO)
// ========================

// Ver todas as tabelas
app.get('/debug/tables', async (req, res) => {
  try {
    const [tables] = await db.execute('SHOW TABLES');
    res.json({ sucesso: true, tabelas: tables });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// Ver usuários
app.get('/debug/usuarios', async (req, res) => {
  try {
    const [usuarios] = await db.execute('SELECT * FROM usuarios');
    res.json({ sucesso: true, usuarios: usuarios });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// Ver turmas
app.get('/debug/turmas', async (req, res) => {
  try {
    const [turmas] = await db.execute('SELECT * FROM turmas');
    res.json({ sucesso: true, turmas: turmas });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// Ver estrutura da tabela usuarios
app.get('/debug/estrutura/usuarios', async (req, res) => {
  try {
    const [estrutura] = await db.execute('DESCRIBE usuarios');
    res.json({ sucesso: true, estrutura: estrutura });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// ========================
// TRATAMENTO DE ERROS (ISSO JÁ DEVE EXISTIR NO SEU CÓDIGO)
// ========================
app.use((err, req, res, next) => {
  console.error('Middleware de erro:', err.stack || err);
  res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
});

app.use((req, res) => {
  res.status(404).json({ sucesso: false, erro: 'Rota não encontrada' });
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
  console.log(`🗄️  Database: Aiven MySQL`);
  console.log(`🔐 SSL: Ativo`);
});