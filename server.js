// ========================
// IMPORTAÇÕES E CONFIGURAÇÕES INICIAIS (ES MODULES)
// ========================
import express from 'express';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import MySQLStoreImport from 'express-mysql-session';
import path from 'path';
import cors from 'cors';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MySQLStore = MySQLStoreImport(session);
// ========================
// CORS PARA DESENVOLVIMENTO E PRODUÇÃO
// ========================
import cors from "cors";

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://projetosemeddiariodigital-production.up.railway.app', // antigo (se ainda usa)
    'https://divine-tranquility-production.up.railway.app',        // novo backend
    'https://seu-frontend.vercel.app'                              // substitua pelo domínio do seu front-end
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
}));

// ========================
// CONEXÃO COM O BANCO DE DADOS (SERVIÇOS SEPARADOS)
// ========================
console.log('🔧 Configurando conexão com MySQL (serviços separados)...');

// CONFIGURAÇÃO PARA SERVIÇOS EM PROJETOS DIFERENTES
const dbConfig = {
  host: process.env.MYSQLHOST,        // Vem das variáveis Railway
  port: process.env.MYSQLPORT,        // Vem das variáveis Railway  
  user: process.env.MYSQLUSER,        // Vem das variáveis Railway
  password: process.env.MYSQLPASSWORD, // Vem das variáveis Railway
  database: process.env.MYSQLDATABASE, // Vem das variáveis Railway
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('📊 Configuração do banco (projetos separados):', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database
});

// Criar pool de conexão
const db = mysql.createPool(dbConfig);

// Testar conexão
(async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ Conectado ao MySQL Railway com sucesso! (projetos separados)');
    
    // Testar query básica
    const [result] = await connection.execute('SELECT 1 + 1 AS test');
    console.log('✅ Query teste executada:', result[0].test);
    
    connection.release();
  } catch (err) {
    console.error('❌ ERRO ao conectar ao MySQL Railway:');
    console.error('   Código:', err.code);
    console.error('   Mensagem:', err.message);
    console.error('   Host:', dbConfig.host);
    console.error('   Port:', dbConfig.port);
    
    if (err.code === 'ENOTFOUND') {
      console.error('\n💡 ERRO CRÍTICO: Host não encontrado.');
      console.error('   Verifique se as variáveis no Railway estão CORRETAS:');
      console.error('   - MYSQLHOST deve ser: caboose.proxy.rlwy.net');
      console.error('   - MYSQLPORT deve ser: 29311');
    }
  }
})();

// ========================
// CONFIGURAÇÃO DE SESSÃO
// ========================
const sessionStore = new MySQLStore({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000
});

app.use(session({
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // Railway usa HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'none'
  }
}));

// ========================
// CONFIGURAÇÃO DO EXPRESS
// ========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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
// FUNÇÕES AUXILIARES
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
// ROTAS PÚBLICAS
// ========================
app.get('/', (req, res) => {
  res.json({
    message: 'API Prosemed Diário Digital - Online com Railway',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'Railway MySQL'
  });
});

app.get('/health', async (req, res) => {
  try {
    await db.execute('SELECT 1');
    res.status(200).json({ 
      status: 'healthy', 
      database: 'connected', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
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
// ROTAS DE AUTENTICAÇÃO
// ========================
app.post('/cadastro', async (req, res) => {
  let { nome, email, senha, tipo } = req.body;
  
  if (!nome || !email || !senha || !tipo) {
    return res.json({ sucesso: false, erro: 'Todos os campos são obrigatórios!' });
  }

  nome = nome.trim();
  email = email.trim().toLowerCase();
  tipo = tipo.toLowerCase().trim();
  
  const tiposPermitidos = ['administrador', 'professor', 'aluno'];
  if (!tiposPermitidos.includes(tipo)) {
    return res.json({ sucesso: false, erro: 'Tipo de usuário inválido!' });
  }

  // Verificar permissão para criar administrador
  if (tipo === 'administrador' && !req.session.usuario) {
    return res.json({ sucesso: false, erro: 'Acesso negado! Faça login para criar administradores.' });
  }

  try {
    // Verificar se email já existe
    const [results] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (results.length > 0) {
      return res.json({ sucesso: false, erro: 'Este email já está cadastrado!' });
    }

    // Criar hash da senha
    const hash = await bcrypt.hash(senha, 10);
    
    // Inserir usuário
    const [result] = await db.execute(
      'INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)', 
      [nome, email, hash, tipo]
    );
    
    res.json({ 
      sucesso: true, 
      id: result.insertId, 
      mensagem: `Usuário ${tipo} cadastrado com sucesso!` 
    });
  } catch (err) {
    console.error('Erro no cadastro:', err);
    res.json({ sucesso: false, erro: 'Erro ao cadastrar usuário!' });
  }
});

app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  
  if (!email || !senha) {
    return res.json({ sucesso: false, erro: 'Email e senha são obrigatórios!' });
  }

  try {
    const [results] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    
    if (results.length === 0) {
      return res.json({ sucesso: false, erro: 'Email ou senha incorretos!' });
    }

    const usuario = results[0];
    const match = await bcrypt.compare(senha, usuario.senha);
    
    if (match) {
      fazerLogin(usuario, res, req);
    } else {
      return res.json({ sucesso: false, erro: 'Email ou senha incorretos!' });
    }
  } catch (err) {
    console.error('Erro no login:', err);
    res.json({ sucesso: false, erro: 'Erro ao fazer login!' });
  }
});

app.post('/logout', verificarAuth, (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Erro no logout:', err);
      return res.json({ sucesso: false, erro: 'Erro ao fazer logout!' });
    }
    res.json({ sucesso: true, mensagem: 'Logout realizado com sucesso!' });
  });
});

// Rota para verificar autenticação
app.get('/check-auth', verificarAuth, (req, res) => {
  res.json({ sucesso: true, usuario: req.session.usuario });
});

// ========================
// ROTAS DE SENHA
// ========================
app.post('/alterar-senha', verificarAuth, async (req, res) => {
  const { senha_atual, nova_senha, confirmar_senha } = req.body;
  const usuarioId = req.session.usuario.id;

  if (!senha_atual || !nova_senha || !confirmar_senha) {
    return res.json({ sucesso: false, erro: 'Todos os campos são obrigatórios!' });
  }
  
  if (nova_senha !== confirmar_senha) {
    return res.json({ sucesso: false, erro: 'Nova senha e confirmação não coincidem!' });
  }
  
  if (nova_senha.length < 6) {
    return res.json({ sucesso: false, erro: 'A nova senha deve ter pelo menos 6 caracteres!' });
  }

  try {
    const [results] = await db.execute('SELECT * FROM usuarios WHERE id = ?', [usuarioId]);
    
    if (results.length === 0) {
      return res.json({ sucesso: false, erro: 'Erro ao verificar senha atual!' });
    }

    const usuario = results[0];
    const senhaAtualCorreta = await bcrypt.compare(senha_atual, usuario.senha);
    
    if (!senhaAtualCorreta) {
      return res.json({ sucesso: false, erro: 'Senha atual incorreta!' });
    }

    const hashNovaSenha = await bcrypt.hash(nova_senha, 10);
    await db.execute('UPDATE usuarios SET senha = ? WHERE id = ?', [hashNovaSenha, usuarioId]);
    
    res.json({ sucesso: true, mensagem: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
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
// ROTAS DE ADMINISTRAÇÃO
// ========================
app.get('/api/turmas', verificarAdmin, async (req, res) => {
  try {
    const [results] = await db.execute(`
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
      ORDER BY t.ano ASC, t.nome ASC
    `);
    res.json({ sucesso: true, turmas: results });
  } catch (err) {
    console.error('Erro ao carregar turmas:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar turmas.' });
  }
});

app.post('/api/turmas', verificarAdmin, async (req, res) => {
  const { nome, ano, turno } = req.body;
  
  if (!nome || !ano || !turno) {
    return res.status(400).json({ sucesso: false, erro: 'Todos os campos são obrigatórios!' });
  }

  try {
    const [rows] = await db.execute('SELECT id FROM turmas WHERE nome = ? AND ano = ?', [nome, ano]);
    
    if (rows.length > 0) {
      return res.status(409).json({ sucesso: false, erro: 'Turma já existe.' });
    }

    const [result] = await db.execute('INSERT INTO turmas (nome, ano, turno) VALUES (?, ?, ?)', [nome, ano, turno]);
    
    res.json({ 
      sucesso: true, 
      mensagem: 'Turma cadastrada com sucesso!', 
      id: result.insertId 
    });
  } catch (err) {
    console.error('Erro ao cadastrar turma:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao cadastrar turma.' });
  }
});

app.get('/api/professores', verificarAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, nome, email FROM usuarios WHERE tipo = "professor" ORDER BY nome');
    res.json({ sucesso: true, professores: rows });
  } catch (err) {
    console.error('Erro ao carregar professores:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar professores.' });
  }
});

app.get('/api/alunos', verificarAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, nome, email FROM usuarios WHERE tipo = "aluno" ORDER BY nome');
    res.json({ sucesso: true, alunos: rows });
  } catch (err) {
    console.error('Erro ao carregar alunos:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar alunos.' });
  }
});

// ========================
// ROTAS DE DEBUG
// ========================
app.get('/debug/tables', async (req, res) => {
  try {
    const [tables] = await db.execute('SHOW TABLES');
    res.json({ sucesso: true, tabelas: tables });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.get('/debug/usuarios', async (req, res) => {
  try {
    const [usuarios] = await db.execute('SELECT * FROM usuarios');
    res.json({ sucesso: true, usuarios: usuarios });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.get('/debug/turmas', async (req, res) => {
  try {
    const [turmas] = await db.execute('SELECT * FROM turmas');
    res.json({ sucesso: true, turmas: turmas });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.get('/debug/estrutura/usuarios', async (req, res) => {
  try {
    const [estrutura] = await db.execute('DESCRIBE usuarios');
    res.json({ sucesso: true, estrutura: estrutura });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// ========================
// TRATAMENTO DE ERROS
// ========================
app.use((err, req, res, next) => {
  console.error('❌ Erro interno do servidor:', err);
  res.status(500).json({ 
    sucesso: false, 
    erro: 'Erro interno do servidor',
    detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.use((req, res) => {
  res.status(404).json({ sucesso: false, erro: 'Rota não encontrada' });
});
// ========================
// SERVIR FRONTEND (HTML, CSS, JS)
// ========================
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========================
// INICIAR SERVIDOR
// ========================
const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 Servidor Prosemed Diário Digital iniciado!');
  console.log(`📍 Porta: ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Database: Railway MySQL`);
  console.log(`🔗 URL: https://projetosemeddiariodigital-production.up.railway.app`);
  console.log('\n📋 Endpoints disponíveis:');
  console.log(`   GET  /health          - Status da aplicação`);
  console.log(`   GET  /debug/tables    - Listar tabelas`);
  console.log(`   POST /login           - Login de usuário`);
  console.log(`   POST /cadastro        - Cadastro de usuário`);
});

export default app;