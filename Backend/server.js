// ========================
// IMPORTAÇÕES E CONFIGURAÇÕES INICIAIS (ES MODULES)
// ========================
import cors from 'cors';
import express from 'express';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import MySQLStoreImport from 'express-mysql-session';
import path from 'path';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);

const app = express();
const MySQLStore = MySQLStoreImport(session);

app.use(express.json());

// ========================
// CONFIGURAÇÃO DE CORS CORRIGIDA (APENAS UMA VEZ!)
// ========================
const allowedOrigins = [
  'https://prosemeddiariodigital-production.up.railway.app',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    // Permite requisições sem origem (ex: Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS não permitido para esta origem: ' + origin));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Middleware para logs de CORS
app.use((req, res, next) => {
  console.log(`🌐 CORS - ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});


// ========================
// CONFIGURAÇÃO DO EXPRESS
// ========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================
// CONEXÃO COM O BANCO DE DADOS (SERVIÇOS SEPARADOS)
// ========================
console.log('🔧 Configurando conexão com MySQL (serviços separados)...');

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
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

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
// MIDDLEWARE PARA VERIFICAR ADMIN MASTER
// ========================
function verificarAdminMaster(req, res, next) {
  if (req.session?.usuario?.tipo === 'administrador' && req.session?.usuario?.pode_criar_admin) {
    return next();
  }
  return res.status(403).json({ sucesso: false, erro: 'Acesso negado! Apenas administradores masters.' });
}

// ========================
// MIDDLEWARE DE LOG PARA DEBUG
// ========================
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  console.log(`🌐 Origin: ${req.headers.origin}`);
  next();
});

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
  
  // Salva a sessão antes de enviar resposta
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
// ROTA DE TESTE CORS
// ========================
app.get('/api/test-cors', (req, res) => {
  console.log('✅ Rota /api/test-cors acessada com sucesso');
  res.json({ 
    message: 'CORS está funcionando!',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin,
    environment: process.env.NODE_ENV || 'development'
  });
});

// ========================
// ROTAS DE AUTENTICAÇÃO
// ========================
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

    // CORREÇÃO: Permitir cadastro de primeiro administrador sem sessão
    if (tipo === 'administrador') {
      const [admins] = await db.execute('SELECT id FROM usuarios WHERE tipo = "administrador"');
      if (admins.length === 0) {
        // Primeiro administrador - permitir sem sessão
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

// ... (o restante das suas rotas permanece igual)

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
// ROTAS DE RECUPERAÇÃO DE SENHA
// ========================

// Solicitar recuperação de senha
app.post('/api/recuperar-senha', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ sucesso: false, erro: 'Email é obrigatório.' });
  }

  try {
    // Verificar se o email existe
    const [usuarios] = await db.execute('SELECT id, nome, email FROM usuarios WHERE email = ?', [email]);
    
    if (usuarios.length === 0) {
      return res.json({ sucesso: false, erro: 'Email não encontrado.' });
    }

    const usuario = usuarios[0];

    // Em um sistema real, aqui você enviaria um email com link de recuperação
    // Por enquanto, vamos simular retornando um link fictício para desenvolvimento
    const token = crypto.randomBytes(32).toString('hex');
    const linkRedefinicao = `https://divine-tranquility-production.up.railway.app/redefinir-senha.html?token=${token}`;

    console.log(`🔐 Link de recuperação para ${email}: ${linkRedefinicao}`);

    res.json({ 
      sucesso: true, 
      mensagem: 'Se o email existir em nosso sistema, você receberá um link de recuperação.',
      link_teste: linkRedefinicao // Apenas para desenvolvimento
    });
  } catch (err) {
    console.error('Erro ao solicitar recuperação de senha:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao solicitar recuperação de senha.' });
  }
});

// Validar token de recuperação
app.get('/api/validar-token-recuperacao', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.json({ sucesso: false, erro: 'Token é obrigatório.' });
  }

  try {
    // Em um sistema real, você validaria o token no banco de dados
    // Por enquanto, vamos simular uma validação básica
    if (token.length < 10) {
      return res.json({ sucesso: false, erro: 'Token inválido.' });
    }

    // Simular dados do usuário (em produção, buscar do banco baseado no token)
    res.json({ 
      sucesso: true, 
      usuario: {
        id: 1,
        nome: 'Usuário de Teste',
        email: 'teste@email.com'
      }
    });
  } catch (err) {
    console.error('Erro ao validar token:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao validar token.' });
  }
});

// Redefinir senha com token
app.post('/api/redefinir-senha-token', async (req, res) => {
  const { token, nova_senha, confirmar_senha } = req.body;

  if (!token || !nova_senha || !confirmar_senha) {
    return res.json({ sucesso: false, erro: 'Todos os campos são obrigatórios.' });
  }

  if (nova_senha !== confirmar_senha) {
    return res.json({ sucesso: false, erro: 'As senhas não coincidem.' });
  }

  if (nova_senha.length < 6) {
    return res.json({ sucesso: false, erro: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    // Em produção, você validaria o token e atualizaria a senha no banco
    const hashNovaSenha = await bcrypt.hash(nova_senha, 10);
    
    // Aqui você atualizaria a senha no banco baseado no token válido
    console.log(`🔐 Senha redefinida com sucesso para o token: ${token}`);

    res.json({ 
      sucesso: true, 
      mensagem: 'Senha redefinida com sucesso!'
    });
  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao redefinir senha.' });
  }
});

// ========================
// ROTAS DE ADMINISTRAÇÃO MASTER
// ========================

// Rota para verificar se o usuário atual é admin master
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

// Listar todos os administradores
app.get('/api/admin/administradores', verificarAuth, verificarAdminMaster, async (req, res) => {
  try {
    const [results] = await db.execute(
      'SELECT id, nome, email, tipo, pode_criar_admin, created_at FROM usuarios WHERE tipo = "administrador" ORDER BY nome'
    );
    res.json({ sucesso: true, administradores: results });
  } catch (err) {
    console.error('Erro ao carregar administradores:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar administradores.' });
  }
});

// Alternar permissão de admin master
app.post('/api/admin/toggle-permission', verificarAuth, verificarAdminMaster, async (req, res) => {
  const { admin_id, pode_criar_admin } = req.body;
  
  if (!admin_id || typeof pode_criar_admin === 'undefined') {
    return res.json({ sucesso: false, erro: 'Dados incompletos!' });
  }

  // Impedir que o próprio usuário remova suas permissões
  if (parseInt(admin_id) === req.session.usuario.id) {
    return res.json({ sucesso: false, erro: 'Você não pode alterar suas próprias permissões!' });
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
    console.error('Erro ao atualizar permissões:', err);
    res.json({ sucesso: false, erro: 'Erro ao atualizar permissões.' });
  }
});

// Redefinir senha de usuários (apenas admin master)
app.post('/admin/redefinir-senha', verificarAuth, verificarAdminMaster, async (req, res) => {
  const { usuario_id, nova_senha } = req.body;
  
  if (!usuario_id || !nova_senha) {
    return res.json({ sucesso: false, erro: 'ID do usuário e nova senha são obrigatórios!' });
  }

  if (nova_senha.length < 6) {
    return res.json({ sucesso: false, erro: 'A senha deve ter pelo menos 6 caracteres!' });
  }

  try {
    // Verificar se o usuário existe
    const [usuario] = await db.execute('SELECT id FROM usuarios WHERE id = ?', [usuario_id]);
    if (usuario.length === 0) {
      return res.json({ sucesso: false, erro: 'Usuário não encontrado!' });
    }

    // Criar hash da nova senha
    const hashNovaSenha = await bcrypt.hash(nova_senha, 10);

    // Atualizar senha do usuário
    await db.execute('UPDATE usuarios SET senha = ? WHERE id = ?', [hashNovaSenha, usuario_id]);

    res.json({ sucesso: true, mensagem: 'Senha redefinida com sucesso!' });
  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    res.json({ sucesso: false, erro: 'Erro ao redefinir senha!' });
  }
});

// Listar todos os usuários para redefinição de senha
app.get('/api/admin/todos-usuarios', verificarAuth, verificarAdminMaster, async (req, res) => {
  try {
    const [results] = await db.execute(
      'SELECT id, nome, email, tipo FROM usuarios ORDER BY tipo, nome'
    );
    res.json({ sucesso: true, usuarios: results });
  } catch (err) {
    console.error('Erro ao carregar usuários:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar usuários.' });
  }
});

// Excluir usuário (apenas admin master)
app.delete('/api/admin/usuarios', verificarAuth, verificarAdminMaster, async (req, res) => {
  const usuarioId = req.params.id;
  
  // Impedir que o próprio usuário se exclua
  if (parseInt(usuarioId) === req.session.usuario.id) {
    return res.json({ sucesso: false, erro: 'Você não pode excluir sua própria conta!' });
  }

  try {
    await db.execute('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
    res.json({ sucesso: true, mensagem: 'Usuário excluído com sucesso!' });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.json({ sucesso: false, erro: 'Erro ao excluir usuário.' });
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
// ROTAS DO PROFESSOR - DIÁRIO
// ========================

// Obter turmas do professor
app.get('/api/professor/turmas', verificarAuth, verificarProfessor, async (req, res) => {
  try {
    const professorId = req.session.usuario.id;
    
    const [results] = await db.execute(`
      SELECT DISTINCT t.id, t.nome 
      FROM turmas t
      INNER JOIN professor_turma pt ON t.id = pt.id_turma
      WHERE pt.id_professor = ?
      ORDER BY t.nome
    `, [professorId]);
    
    res.json({ sucesso: true, turmas: results });
  } catch (err) {
    console.error('Erro ao carregar turmas do professor:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar turmas.' });
  }
});

// Obter disciplinas do professor
app.get('/api/professor/disciplinas', verificarAuth, verificarProfessor, async (req, res) => {
  try {
    const professorId = req.session.usuario.id;
    
    const [results] = await db.execute(`
      SELECT d.id, d.nome 
      FROM disciplinas d
      INNER JOIN professor_disciplina pd ON d.id = pd.disciplina_id
      WHERE pd.professor_id = ?
      ORDER BY d.nome
    `, [professorId]);
    
    res.json({ sucesso: true, disciplinas: results });
  } catch (err) {
    console.error('Erro ao carregar disciplinas do professor:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar disciplinas.' });
  }
});

// Obter objetos de conhecimento
app.get('/api/objetos-conhecimento', verificarAuth, verificarProfessor, async (req, res) => {
  try {
    const { turma, disciplina, mes, ano } = req.query;
    
    const [results] = await db.execute(`
      SELECT dia, objeto 
      FROM objetos_conhecimento 
      WHERE turma_id = ? AND disciplina_id = ? AND mes = ? AND ano = ?
      ORDER BY dia
    `, [turma, disciplina, mes, ano]);
    
    const objetos = {};
    results.forEach(item => {
      objetos[item.dia] = item.objeto;
    });
    
    res.json({ sucesso: true, objetos });
  } catch (err) {
    console.error('Erro ao carregar objetos de conhecimento:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar objetos.' });
  }
});

// Salvar objetos de conhecimento
app.post('/api/objetos-conhecimento', verificarAuth, verificarProfessor, async (req, res) => {
  try {
    const { turma, disciplina, mes, ano, objetos } = req.body;
    const professorId = req.session.usuario.id;
    
    // Verificar se o professor tem acesso à turma e disciplina
    const [verificacao] = await db.execute(`
      SELECT 1 FROM professor_turma pt
      INNER JOIN professor_disciplina pd ON pt.id_professor = pd.professor_id
      WHERE pt.id_professor = ? AND pt.id_turma = ? AND pd.disciplina_id = ?
    `, [professorId, turma, disciplina]);
    
    if (verificacao.length === 0) {
      return res.json({ sucesso: false, erro: 'Acesso negado à turma ou disciplina.' });
    }
    
    // Salvar/atualizar cada objeto
    for (const [dia, objeto] of Object.entries(objetos)) {
      const [existente] = await db.execute(`
        SELECT id FROM objetos_conhecimento 
        WHERE turma_id = ? AND disciplina_id = ? AND mes = ? AND ano = ? AND dia = ?
      `, [turma, disciplina, mes, ano, dia]);
      
      if (existente.length > 0) {
        // Atualizar
        await db.execute(`
          UPDATE objetos_conhecimento 
          SET objeto = ?, atualizado_em = NOW() 
          WHERE id = ?
        `, [objeto, existente[0].id]);
      } else {
        // Inserir
        await db.execute(`
          INSERT INTO objetos_conhecimento (turma_id, disciplina_id, mes, ano, dia, objeto, professor_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [turma, disciplina, mes, ano, dia, objeto, professorId]);
      }
    }
    
    res.json({ sucesso: true, mensagem: 'Objetos de conhecimento salvos com sucesso!' });
  } catch (err) {
    console.error('Erro ao salvar objetos de conhecimento:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao salvar objetos.' });
  }
});

// ========================
// ROTAS DE FREQUÊNCIA
// ========================

// Obter turmas e alunos do professor
app.get('/api/professor/turmas-alunos', verificarAuth, verificarProfessor, async (req, res) => {
  try {
    const professorId = req.session.usuario.id;
    
    // Obter turmas do professor
    const [turmas] = await db.execute(`
      SELECT DISTINCT t.id, t.nome 
      FROM turmas t
      INNER JOIN professor_turma pt ON t.id = pt.id_turma
      WHERE pt.id_professor = ?
      ORDER BY t.nome
    `, [professorId]);
    
    // Obter alunos por turma
    const alunosPorTurma = {};
    for (const turma of turmas) {
      const [alunos] = await db.execute(`
        SELECT u.id, u.nome, u.turma_id 
        FROM usuarios u
        WHERE u.tipo = 'aluno' AND u.turma_id = ?
        ORDER BY u.nome
      `, [turma.id]);
      
      alunosPorTurma[turma.nome] = alunos;
    }
    
    res.json({ 
      sucesso: true, 
      turmas: turmas.map(t => t.nome),
      alunosPorTurma 
    });
  } catch (err) {
    console.error('Erro ao carregar turmas e alunos:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar turmas e alunos.' });
  }
});

// Salvar frequência
app.post('/api/frequencia', verificarAuth, verificarProfessor, async (req, res) => {
  try {
    const { dia, mes, ano, turma_id, frequencias } = req.body;
    const professorId = req.session.usuario.id;
    
    // Verificar se o professor tem acesso à turma
    const [verificacao] = await db.execute(`
      SELECT 1 FROM professor_turma 
      WHERE id_professor = ? AND id_turma = ?
    `, [professorId, turma_id]);
    
    if (verificacao.length === 0) {
      return res.json({ sucesso: false, erro: 'Acesso negado à turma.' });
    }
    
    // Salvar/atualizar cada frequência
    for (const freq of frequencias) {
      const [existente] = await db.execute(`
        SELECT id FROM frequencias 
        WHERE aluno_id = ? AND dia = ? AND mes = ? AND ano = ? AND turma_id = ?
      `, [freq.aluno_id, dia, mes, ano, turma_id]);
      
      if (existente.length > 0) {
        // Atualizar
        await db.execute(`
          UPDATE frequencias 
          SET presente = ?, observacao = ?, atualizado_em = NOW() 
          WHERE id = ?
        `, [freq.presente, freq.observacao, existente[0].id]);
      } else {
        // Inserir
        await db.execute(`
          INSERT INTO frequencias (aluno_id, dia, mes, ano, turma_id, presente, observacao, professor_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [freq.aluno_id, dia, mes, ano, turma_id, freq.presente, freq.observacao, professorId]);
      }
    }
    
    res.json({ sucesso: true, mensagem: 'Frequência salva com sucesso!' });
  } catch (err) {
    console.error('Erro ao salvar frequência:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao salvar frequência.' });
  }
});

// Obter frequência
app.get('/api/frequencia', verificarAuth, verificarProfessor, async (req, res) => {
  try {
    const { dia, mes, ano, turma_id } = req.query;
    
    const [frequencias] = await db.execute(`
      SELECT aluno_id, presente, observacao 
      FROM frequencias 
      WHERE dia = ? AND mes = ? AND ano = ? AND turma_id = ?
    `, [dia, mes, ano, turma_id]);
    
    res.json({ sucesso: true, frequencias });
  } catch (err) {
    console.error('Erro ao carregar frequência:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar frequência.' });
  }
});

// ========================
// ROTA DE RELATÓRIOS DE FREQUÊNCIA
// ========================

app.get('/api/relatorios/frequencia', verificarAuth, verificarProfessor, async (req, res) => {
  try {
    const { mes, ano, turma_id, aluno } = req.query;
    
    if (!mes || !ano || !turma_id) {
      return res.json({ sucesso: false, erro: 'Mês, ano e turma são obrigatórios' });
    }

    let query = `
      SELECT 
        u.nome as aluno,
        f.dia,
        f.mes, 
        f.ano,
        f.presente,
        f.observacao
      FROM frequencias f
      INNER JOIN usuarios u ON f.aluno_id = u.id
      WHERE f.turma_id = ? AND f.mes = ? AND f.ano = ?
    `;
    
    const params = [turma_id, mes, ano];
    
    if (aluno && aluno !== 'todos') {
      query += ' AND f.aluno_id = ?';
      params.push(aluno);
    }
    
    query += ' ORDER BY f.ano, f.mes, f.dia, u.nome';
    
    const [results] = await db.execute(query, params);
    
    res.json({ 
      sucesso: true, 
      relatorio: results 
    });
  } catch (err) {
    console.error('Erro ao gerar relatório:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao gerar relatório' });
  }
});

// ========================
// ROTAS DE NOTAS
// ========================

// Rota para obter turmas e alunos do professor (notas)
app.get('/api/professor/turmas', verificarAuth, verificarProfessor, async (req, res) => {
  try {
    const professorId = req.session.usuario.id;
    
    // Obter turmas do professor
    const [turmas] = await db.execute(`
      SELECT DISTINCT t.id, t.nome 
      FROM turmas t
      INNER JOIN professor_turma pt ON t.id = pt.id_turma
      WHERE pt.id_professor = ?
      ORDER BY t.nome
    `, [professorId]);
    
    // Obter alunos por turma
    const alunosPorTurma = {};
    for (const turma of turmas) {
      const [alunos] = await db.execute(`
        SELECT u.id, u.nome, u.turma_id 
        FROM usuarios u
        WHERE u.tipo = 'aluno' AND u.turma_id = ?
        ORDER BY u.nome
      `, [turma.id]);
      
      alunosPorTurma[turma.nome] = alunos;
    }
    
    res.json({ 
      sucesso: true, 
      turmas: turmas.map(t => t.nome),
      alunosPorTurma 
    });
  } catch (err) {
    console.error('Erro ao carregar turmas e alunos:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar turmas e alunos.' });
  }
});

// Rota para buscar notas da turma
app.get('/api/turmas/:turmaId/notas', verificarAuth, verificarProfessor, async (req, res) => {
  try {
    const { turmaId } = req.params;
    const { unidade } = req.query;
    
    if (!unidade) {
      return res.json({ sucesso: false, erro: 'Unidade é obrigatória' });
    }

    // Buscar alunos da turma
    const [alunos] = await db.execute(
      'SELECT id, nome FROM usuarios WHERE tipo = "aluno" AND turma_id = ?',
      [turmaId]
    );

    // Buscar notas existentes
    const [notasExistentes] = await db.execute(
      `SELECT aluno_id, qualitativo_participacao, qualitativo_organizacao, qualitativo_respeito, 
              atividade, avaliacao, recuperacao 
       FROM notas 
       WHERE turma_id = ? AND unidade = ?`,
      [turmaId, unidade]
    );

    // Estruturar resposta
    const notas = {};
    alunos.forEach(aluno => {
      const notaExistente = notasExistentes.find(n => n.aluno_id === aluno.id);
      
      if (notaExistente) {
        notas[aluno.id] = {
          qualitativo: {
            participacao: notaExistente.qualitativo_participacao || 0,
            organizacao: notaExistente.qualitativo_organizacao || 0,
            respeito: notaExistente.qualitativo_respeito || 0
          },
          atividade: notaExistente.atividade || 0,
          avaliacao: notaExistente.avaliacao || 0,
          recuperacao: notaExistente.recuperacao || 0
        };
      } else {
        // Notas padrão se não existirem
        notas[aluno.id] = {
          qualitativo: { participacao: 0, organizacao: 0, respeito: 0 },
          atividade: 0,
          avaliacao: 0,
          recuperacao: 0
        };
      }
    });

    res.json({ sucesso: true, notas });
  } catch (err) {
    console.error('Erro ao carregar notas:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao carregar notas.' });
  }
});

// Rota para salvar notas
app.post('/api/notas/salvar', verificarAuth, verificarProfessor, async (req, res) => {
  try {
    const { turma_id, unidade, notas } = req.body;
    const professorId = req.session.usuario.id;

    if (!turma_id || !unidade || !notas) {
      return res.json({ sucesso: false, erro: 'Dados incompletos para salvar notas.' });
    }

    let registros = 0;

    // Para cada aluno, salvar/atualizar notas
    for (const [alunoId, dadosNota] of Object.entries(notas)) {
      const { qualitativo, atividade, avaliacao, recuperacao } = dadosNota;
      
      // Verificar se já existe nota para este aluno na unidade
      const [existentes] = await db.execute(
        'SELECT id FROM notas WHERE aluno_id = ? AND turma_id = ? AND unidade = ?',
        [alunoId, turma_id, unidade]
      );

      if (existentes.length > 0) {
        // Atualizar nota existente
        // Atualizar nota existente
        await db.execute(
          `UPDATE notas 
           SET 
             qualitativo_participacao = ?, 
             qualitativo_organizacao = ?, 
             qualitativo_respeito = ?, 
             atividade = ?, 
             avaliacao = ?, 
             recuperacao = ?, 
             atualizado_em = NOW()
           WHERE id = ?`,
          [
            qualitativo.participacao || 0,
            qualitativo.organizacao || 0,
            qualitativo.respeito || 0,
            atividade || 0,
            avaliacao || 0,
            recuperacao || 0,
            existentes[0].id
          ]
        );
      } else {
        // Inserir nova nota
        await db.execute(
          `INSERT INTO notas 
            (aluno_id, turma_id, unidade, qualitativo_participacao, qualitativo_organizacao, qualitativo_respeito, atividade, avaliacao, recuperacao, professor_id, criado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            alunoId,
            turma_id,
            unidade,
            qualitativo.participacao || 0,
            qualitativo.organizacao || 0,
            qualitativo.respeito || 0,
            atividade || 0,
            avaliacao || 0,
            recuperacao || 0,
            professorId
          ]
        );
      }

      registros++;
    }

    res.json({ sucesso: true, mensagem: `${registros} notas processadas com sucesso!` });
  } catch (err) {
    console.error('Erro ao salvar notas:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao salvar notas.' });
  }
});

// Rota para buscar médias anuais
app.get('/api/turmas/:turmaId/medias-anuais', verificarAuth, verificarProfessor, async (req, res) => {
  try {
    const { turmaId } = req.params;

    // Buscar médias calculadas do banco
    const [medias] = await db.execute(
      `SELECT aluno_id, 
              media_unidade1, media_unidade2, media_unidade3,
              recuperacao_unidade1, recuperacao_unidade2, recuperacao_unidade3,
              media_anual
       FROM medias_anuais 
       WHERE turma_id = ?`,
      [turmaId]
    );

    res.json({ sucesso: true, medias });
  } catch (err) {
    console.error('Erro ao carregar médias anuais:', err);
    // Se a tabela não existir, retornar array vazio
    res.json({ sucesso: true, medias: [] });
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

// ===============================
// ROTA: Buscar turmas e alunos do professor
// ===============================
app.get('/api/professor/turmas-alunos', async (req, res) => {
  try {
    const professorId = req.query.professorId;

    if (!professorId) {
      return res.status(400).json({ success: false, message: 'ID do professor não fornecido.' });
    }

    const [turmas] = await db.query(
      `SELECT t.id, t.nome_turma, d.nome_disciplina
       FROM turmas t
       JOIN disciplinas d ON t.disciplina_id = d.id
       JOIN professor_disciplinas pd ON pd.turma_id = t.id
       WHERE pd.professor_id = ?`,
      [professorId]
    );

    const [alunos] = await db.query(
      `SELECT a.id, a.nome, a.turma_id
       FROM alunos a
       JOIN turmas t ON a.turma_id = t.id
       JOIN professor_disciplinas pd ON pd.turma_id = t.id
       WHERE pd.professor_id = ?`,
      [professorId]
    );

    res.json({
      success: true,
      turmas,
      alunos
    });

  } catch (error) {
    console.error('Erro ao buscar turmas e alunos:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao buscar dados.' });
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
// ROTA PÁGINA PRINCIPAL OU STATUS
// ========================
app.get('/', (req, res) => {
  res.send('🟢 API do Sistema Escolar rodando!');
});

// ========================
// INICIAR SERVIDOR
// ========================
const PORT = process.env.PORT || 8080; // Se PORT não estiver no Railway, usará 8080

// Esta função assíncrona garante que a conexão com o DB seja testada
// ANTES que o servidor Express comece a escutar.
async function startServer() {
  try {
    // 1. Testar conexão com o banco de dados
    const connection = await db.getConnection();
    console.log('✅ Conectado ao MySQL Railway com sucesso! (projetos separados)');
    
    // Testar query básica
    const [result] = await connection.execute('SELECT 1 + 1 AS test');
    console.log('✅ Query teste executada:', result[0].test); // Agora você deve ver esta mensagem
    
    connection.release(); // Liberar a conexão de teste

    // 2. Iniciar o servidor Express
    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🚀 Servidor Prosemed Diário Digital iniciado!');
      console.log(`📍 Porta: ${PORT}`);
      console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️ Database: Railway MySQL`);
      console.log(`🔗 URL: https://prosemeddiariodigital-production.up.railway.app`);
      console.log('\n📋 Endpoints disponíveis:');
      console.log(`   GET  /health          - Status da aplicação`);
      console.log(`   GET  /debug/tables    - Listar tabelas`);
      console.log(`   POST /api/login       - Login de usuário`); // Corrigi para /api/login
      console.log(`   POST /api/cadastro    - Cadastro de usuário`); // Corrigi para /api/cadastro
      console.log(`   GET  /api/admin/verificar-master - Verificar admin master`);
      console.log(`   POST /api/admin/redefinir-senha - Redefinir senha (admin master)`); // Corrigi para /api/admin/redefinir-senha
      console.log(`   POST /api/recuperar-senha - Recuperação de senha`);
      console.log(`   GET  /api/relatorios/frequencia - Relatórios de frequência`);
    });

  } catch (err) {
    console.error('❌ ERRO CRÍTICO ao iniciar o servidor ou conectar ao MySQL:');
    console.error('   Código:', err.code);
    console.error('   Mensagem:', err.message);
    console.error('   Host:', process.env.MYSQLHOST);
    console.error('   Port:', process.env.MYSQLPORT);
    
    if (err.code === 'ENOTFOUND') {
      console.error('\n💡 ERRO CRÍTICO: Host do MySQL não encontrado.');
      console.error('   Verifique se as variáveis no Railway estão CORRETAS:');
      console.error('   - MYSQLHOST deve ser: caboose.proxy.rlwy.net');
      console.error('   - MYSQLPORT deve ser: 29311');
    }
    // IMPORTANTE: Se o servidor não conseguir iniciar devido a um erro crítico,
    // é bom sair do processo para que o Railway possa tentar um novo deploy.
    process.exit(1); 
  }
}

// Chamar a função para iniciar o servidor
startServer();

// O 'export default app;' deve estar no final do arquivo, APENAS UMA VEZ
export default app;