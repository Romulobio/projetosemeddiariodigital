// ========================
// IMPORTAÇÕES E CONFIGURAÇÕES INICIAIS (ES MODULES)
// ========================
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import MySQLStoreImport from 'express-mysql-session';
import path from 'path';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const MySQLStore = MySQLStoreImport(session);

// ========================
// ⚙️ CONFIGURAÇÃO DO CORS 
// ========================

const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://projetosemeddiariodigital-production.up.railway.app"
  // coloque aqui o domínio final do frontend quando publicar
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // permite ferramentas e testes
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ========================
// CONFIGURAÇÕES EXPRESS
// ========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1); 

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

// Backend/server.js (Bloco de Sessão)

app.use(session({
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    // 💡 CORREÇÃO 1: Forçar 'secure: true'
    // Em ambientes de produção (HTTPS), 'secure' deve ser true.
    // Isso é obrigatório quando 'sameSite' é 'none'.
    secure: true, 
    
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    
    // 💡 CORREÇÃO 2: Forçar 'sameSite: 'none''
    // Essencial para permitir que o cookie seja enviado entre domínios diferentes (Vercel -> Railway ).
    sameSite: 'none' 
  }
}));


// ========================
// 🔍 ROTA DE TESTE CORS
// ========================
app.get("/api/test-cors", (req, res) => {
  console.log("✅ [CORS] Teste recebido de:", req.headers.origin);
  res.json({
    success: true,
    message: "✅ CORS funcionando corretamente!",
    origin: req.headers.origin,
    environment: process.env.NODE_ENV || 'development'
  });
});


// ========================
// CONEXÃO COM O BANCO DE DADOS
// ========================
console.log('🔧 Configurando conexão com MySQL...');

const dbConfig = {
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const db = mysql.createPool(dbConfig);

// Testar conexão
(async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ Conectado ao MySQL Railway com sucesso!');
    connection.release();
  } catch (err) {
    console.error('❌ ERRO ao conectar ao MySQL:', err.message);
  }
})();

// ========================
// MIDDLEWARES DE AUTENTICAÇÃO
// ========================
function verificarAuth(req, res, next) {
  if (req.session && req.session.usuario) return next();
  return res.status(401).json({ sucesso: false, erro: 'Acesso negado! Faça login primeiro.' });
}

function verificarAdmin(req, res, next) {
  if (req.session?.usuario?.tipo === 'administrador') return next();
  return res.status(403).json({ sucesso: false, erro: 'Acesso negado! Apenas administradores.' });
}

function verificarAdminMaster(req, res, next) {
  if (req.session?.usuario?.tipo === 'administrador' && req.session?.usuario?.pode_criar_admin) {
    return next();
  }
  return res.status(403).json({ sucesso: false, erro: 'Acesso negado! Apenas administradores masters.' });
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
  
  req.session.save((err) => {
    if (err) {
      console.error('❌ Erro ao salvar sessão:', err);
      return res.status(500).json({ 
        sucesso: false, 
        erro: 'Erro ao criar sessão' 
      });
    }
    
    console.log('✅ Sessão criada para:', usuario.email);
    res.status(200).json({ 
      sucesso: true, 
      mensagem: 'Login realizado com sucesso!', 
      usuario: req.session.usuario 
    });
  });
}

// ========================
// ROTAS DE AUTENTICAÇÃO
// ========================

// Verificar autenticação
app.get('/api/check-auth', verificarAuth, (req, res) => {
  res.json({ 
    sucesso: true, 
    usuario: req.session.usuario 
  });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  
  if (!email || !senha) {
    return res.status(400).json({ 
      sucesso: false, 
      erro: 'Email e senha são obrigatórios!' 
    });
  }

  try {
    const [results] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    
    if (results.length === 0) {
      return res.status(401).json({ 
        sucesso: false, 
        erro: 'Email ou senha incorretos!' 
      });
    }

    const usuario = results[0];
    const match = await bcrypt.compare(senha, usuario.senha);
    
    if (match) {
      console.log('✅ Login bem-sucedido para:', usuario.email);
      fazerLogin(usuario, res, req);
    } else {
      return res.status(401).json({ 
        sucesso: false, 
        erro: 'Email ou senha incorretos!' 
      });
    }
  } catch (err) {
    console.error('❌ Erro no login:', err);
    return res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro interno do servidor!' 
    });
  }
});

// Cadastro de usuário
app.post('/api/cadastro', async (req, res) => {
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

  try {
    // Verificar se email já existe
    const [results] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (results.length > 0) {
      return res.json({ sucesso: false, erro: 'Este email já está cadastrado!' });
    }

    // Permitir cadastro de primeiro administrador sem sessão
    if (tipo === 'administrador') {
      const [admins] = await db.execute('SELECT id FROM usuarios WHERE tipo = "administrador"');
      if (admins.length === 0) {
        console.log('🆕 Criando primeiro administrador do sistema');
      } else if (!req.session.usuario || req.session.usuario.tipo !== 'administrador' || !req.session.usuario.pode_criar_admin) {
        return res.json({ sucesso: false, erro: 'Apenas administradores masters podem criar novos administradores.' });
      }
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

// Logout
app.post('/logout', verificarAuth, (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Erro no logout:', err);
      return res.json({ sucesso: false, erro: 'Erro ao fazer logout!' });
    }
    res.json({ sucesso: true, mensagem: 'Logout realizado com sucesso!' });
  });
});

// ========================
// ROTAS DE ADMINISTRAÇÃO
// ========================

// Listar todos os administradores
app.get('/api/admin/administradores', verificarAuth, verificarAdmin, async (req, res) => {
  try {
    const [results] = await db.execute(
      `SELECT id, nome, email, tipo, pode_criar_admin, created_at 
       FROM usuarios 
       WHERE tipo = 'administrador' 
       ORDER BY nome`
    );
    
    res.json({ 
      sucesso: true, 
      administradores: results 
    });
  } catch (err) {
    console.error('❌ Erro ao carregar administradores:', err);
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro ao carregar administradores.' 
    });
  }
});

// Alternar permissão de admin master
app.post('/api/admin/toggle-permission', verificarAuth, verificarAdmin, async (req, res) => {
  const { admin_id, pode_criar_admin } = req.body;
  
  if (!admin_id || typeof pode_criar_admin === 'undefined') {
    return res.json({ 
      sucesso: false, 
      erro: 'Dados incompletos!' 
    });
  }

  if (parseInt(admin_id) === req.session.usuario.id) {
    return res.json({ 
      sucesso: false, 
      erro: 'Você não pode alterar suas próprias permissões!' 
    });
  }

  try {
    await db.execute(
      'UPDATE usuarios SET pode_criar_admin = ? WHERE id = ? AND tipo = "administrador"',
      [pode_criar_admin ? 1 : 0, admin_id]
    );
    
    res.json({ 
      sucesso: true, 
      mensagem: `Permissões ${pode_criar_admin ? 'concedidas' : 'revogadas'} com sucesso!` 
    });
  } catch (err) {
    console.error('❌ Erro ao atualizar permissões:', err);
    res.json({ 
      sucesso: false, 
      erro: 'Erro ao atualizar permissões.' 
    });
  }
});

// Verificar se é admin master
app.get('/api/admin/verificar-master', verificarAuth, async (req, res) => {
  try {
    const [results] = await db.execute(
      'SELECT pode_criar_admin FROM usuarios WHERE id = ?', 
      [req.session.usuario.id]
    );
    
    const isMaster = results.length > 0 && Boolean(results[0].pode_criar_admin);
    
    res.json({ 
      sucesso: true, 
      is_master: isMaster,
      usuario: req.session.usuario
    });
  } catch (err) {
    console.error('Erro ao verificar permissões:', err);
    res.json({ sucesso: false, is_master: false });
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

// ========================
// ROTA PÁGINA PRINCIPAL
// ========================
app.get('/', (req, res) => {
  res.send('🟢 API do Sistema Escolar SEMED rodando!');
});

// ========================
// SERVIR ARQUIVOS ESTÁTICOS
// ========================
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

// Rota padrão para o frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========================
// INICIAR SERVIDOR
// ========================
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const connection = await db.getConnection();
    console.log('✅ Conectado ao MySQL Railway com sucesso!');
    connection.release();

    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🚀 Servidor Projeto SEMED Diário Digital iniciado!');
      console.log(`📍 Porta: ${PORT}`);
      console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️ Database: Railway MySQL`);
      console.log(`🔗 URL: https://projetosemeddiariodigital-production.up.railway.app`);
      console.log('\n📋 Endpoints principais:');
      console.log(`   GET  /api/check-auth          - Verificar autenticação`);
      console.log(`   POST /api/login               - Login`);
      console.log(`   POST /api/cadastro            - Cadastro`);
      console.log(`   GET  /api/turmas              - Listar turmas (admin)`);
      console.log(`   GET  /api/professores         - Listar professores (admin)`);
      console.log(`   GET  /api/alunos              - Listar alunos (admin)`);
      console.log(`   GET  /api/admin/administradores - Listar administradores`);
      console.log(`   POST /api/admin/toggle-permission - Alternar permissões`);
    });

  } catch (err) {
    console.error('❌ ERRO CRÍTICO ao iniciar o servidor:', err.message);
    process.exit(1);
  }
}

startServer();

export default app;