// ========================
// IMPORTAÇÕES E CONFIGURAÇÕES INICIAIS
// ========================
import express from 'express';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import MySQLStoreImport from 'express-mysql-session';
import path from 'path';
import cors from 'cors';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MySQLStore = MySQLStoreImport(session);

// ========================
// CONFIGURAÇÃO DO CORS (opcional)
// ========================
// Se o frontend estiver em outro domínio Railway, mantenha isso.
// Se o frontend estiver na pasta /public, você pode remover.
app.use(cors({
  origin: [
    'https://prosemeddiariodigital-production.up.railway.app', // substitua se tiver outro frontend
    'http://localhost:3000' // útil para testes locais
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================
// CONEXÃO COM O BANCO DE DADOS (RAILWAY)
// ========================
const db = mysql.createPool({
  host: process.env.MYSQLHOST || 'caboose.proxy.rlwy.net',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
  try {
    await db.query('SELECT 1');
    console.log('🗄️ Conectado ao MySQL Railway com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao conectar ao MySQL Railway:', err.message);
  }
})();

// ========================
// CONFIGURAÇÃO DE SESSÃO
// ========================
const sessionStore = new MySQLStore({
  host: process.env.MYSQLHOST || 'caboose.proxy.rlwy.net',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'railway'
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
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// ========================
// SERVE O FRONTEND LOCAL (public/)
// ========================
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
// ROTAS DE STATUS E DEBUG
// ========================
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

app.get('/status', (req, res) => {
  res.json({
    app: 'Prosemed Diário Digital',
    status: 'operacional',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 8080
  });
});

app.get('/debug/tables', async (req, res) => {
  try {
    const [tables] = await db.query('SHOW TABLES');
    res.json({ sucesso: true, tabelas: tables });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// ========================
// EXEMPLO DE CADASTRO DE USUÁRIO
// ========================
app.post('/cadastro', async (req, res) => {
  const { nome, email, senha, tipo } = req.body;
  if (!nome || !email || !senha || !tipo)
    return res.json({ sucesso: false, erro: 'Todos os campos são obrigatórios!' });

  try {
    const [exist] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (exist.length > 0)
      return res.json({ sucesso: false, erro: 'Este email já está cadastrado!' });

    const hash = await bcrypt.hash(senha, 10);
    const [result] = await db.query(
      'INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
      [nome.trim(), email.toLowerCase(), hash, tipo.toLowerCase()]
    );

    res.json({ sucesso: true, id: result.insertId, mensagem: 'Usuário cadastrado com sucesso!' });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// ========================
// INICIALIZA O SERVIDOR
// ========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

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
// TRATAMENTO DE ERROS (apenas 1x)
// ========================
app.use((err, req, res, next) => {
  console.error('Erro interno:', err.stack || err);
  res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
});

app.use((req, res) => {
  res.status(404).json({ sucesso: false, erro: 'Rota não encontrada' });
});
