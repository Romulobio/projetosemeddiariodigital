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
app.use(cors({
  origin: [
    "https://projetosemeddiariodigital-lwzl1.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// MUITO IMPORTANTE
app.options("*", cors()); // libera preflight OPTIONS

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
    secure: false,       // FUNCIONA LOCALHOST E PRODUÇÃO
    httpOnly: true,
    sameSite: 'lax',     // NÃO BLOQUEIA
    maxAge: 24 * 60 * 60 * 1000 
  }
}));


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
// ROTAS DE LOGIN / CADASTRO
// ========================
app.post('/cadastro', async (req, res) => {
  let { nome, email, senha, tipo } = req.body;
  if (!nome || !email || !senha || !tipo) return res.json({ sucesso: false, erro: 'Todos os campos são obrigatórios!' });

  nome = nome.trim();
  email = email.trim().toLowerCase();
  tipo = tipo.toLowerCase().trim();
  const tiposPermitidos = ['administrador', 'professor', 'aluno'];
  if (!tiposPermitidos.includes(tipo)) return res.json({ sucesso: false, erro: 'Tipo de usuário inválido!' });

  db.query('SELECT id FROM usuarios WHERE email = ?', [email], async (err, results) => {
    if (err) return res.json({ sucesso: false, erro: 'Erro ao verificar email!' });
    if (results.length > 0) return res.json({ sucesso: false, erro: 'Este email já está cadastrado!' });

    try {
      const hash = await bcrypt.hash(senha, 10);
      db.query('INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)', [nome, email, hash, tipo], (err, result) => {
        if (err) return res.json({ sucesso: false, erro: 'Erro ao cadastrar usuário!' });
        console.log(`✅ Usuário ${tipo} cadastrado: ${nome} (${email})`);
        res.json({ sucesso: true, id: result.insertId, mensagem: `Usuário ${tipo} cadastrado com sucesso!` });
      });
    } catch (error) {
      res.json({ sucesso: false, erro: 'Erro interno ao cadastrar usuário!' });
    }
  });
});

app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.json({ sucesso: false, erro: 'Email e senha são obrigatórios!' });

  db.query('SELECT * FROM usuarios WHERE email = ?', [email], (err, results) => {
    if (err) return res.json({ sucesso: false, erro: 'Erro ao fazer login!' });
    if (results.length === 0) return res.json({ sucesso: false, erro: 'Email ou senha incorretos!' });

    const usuario = results[0];
    bcrypt.compare(senha, usuario.senha, (err, match) => {
      if (err || !match) return res.json({ sucesso: false, erro: 'Email ou senha incorretos!' });
      req.session.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo.toLowerCase() };
      console.log(`✅ Login: ${usuario.tipo} - ${usuario.nome} (${usuario.email})`);
      res.json({ sucesso: true, mensagem: 'Login realizado com sucesso!', usuario: req.session.usuario });
    });
  });
});

app.post('/logout', verificarAuth, (req, res) => {
  req.session.destroy(err => {
    if (err) return res.json({ sucesso: false, erro: 'Erro ao fazer logout!' });
    res.json({ sucesso: true, mensagem: 'Logout realizado com sucesso!' });
  });
});

// ========================
// ROTAS DE PÁGINAS
// ========================
app.get('/admin.html', verificarAdmin, (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/pagina-professor.html', verificarProfessor, (req, res) => res.sendFile(path.join(__dirname, 'pagina-professor.html')));
app.get('/frequencia.html', verificarProfessor, (req, res) => res.sendFile(path.join(__dirname, 'frequencia.html')));
app.get('/relatorios.html', verificarProfessor, (req, res) => res.sendFile(path.join(__dirname, 'relatorios.html')));



// ========================
// ROTAS DE TURMAS E PROFESSORES
// ========================

// Listar turmas com professores
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

// Listar professores com turmas
app.get('/api/professores', verificarAdmin, (req, res) => {
  const sql = `
    SELECT 
      u.id,
      u.nome,
      u.email,
      COALESCE(GROUP_CONCAT(t.nome SEPARATOR ', '), 'Nenhuma turma vinculada') AS turmas
    FROM usuarios u
    LEFT JOIN professor_turma pt ON pt.id_professor = u.id
    LEFT JOIN turmas t ON t.id = pt.id_turma
    WHERE u.tipo = 'professor'
    GROUP BY u.id, u.nome, u.email
    ORDER BY u.nome ASC;
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar professores.' });
    res.json({ sucesso: true, professores: results });
  });
});


/// Listar turmas para o dropdown
app.get('/api/turmas', verificarAdmin, (req, res) => {
  const sql = 'SELECT id, nome FROM turmas ORDER BY nome ASC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erro ao carregar turmas:', err);
      return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar turmas.' });
    }
    res.json({ sucesso: true, turmas: results });
  });
});

// Listar alunos cadastrados
app.get('/api/alunos', verificarAdmin, (req, res) => {
  const sql = `
    SELECT 
      a.id, 
      a.nome, 
      t.nome AS turma,
      t.id AS turma_id
    FROM alunos a
    LEFT JOIN turmas t ON a.turma_id = t.id
    ORDER BY 
      t.nome ASC,  -- Ordena por nome da turma primeiro
      a.nome ASC   -- Depois por nome do aluno
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erro ao carregar alunos:', err);
      return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar alunos.' });
    }
    res.json({ sucesso: true, alunos: results });
  });
});

// Cadastrar aluno
app.post('/api/alunos', verificarAdmin, (req, res) => {
  const { nome, turma_id } = req.body;

  if (!nome || !turma_id) {
    return res.status(400).json({ sucesso: false, erro: 'Nome e turma são obrigatórios!' });
  }

  const sqlInsert = 'INSERT INTO alunos (nome, turma_id) VALUES (?, ?)';
  db.query(sqlInsert, [nome.trim(), parseInt(turma_id, 10)], (err, result) => {
    if (err) {
      console.error('Erro ao cadastrar aluno:', err);
      return res.status(500).json({ sucesso: false, erro: 'Erro ao cadastrar aluno.' });
    }
    res.json({ sucesso: true, mensagem: 'Aluno cadastrado com sucesso!', id: result.insertId });
  });
});

app.delete('/api/alunos/:id', verificarAdmin, (req, res) => {
  const alunoId = req.params.id;
  
  const sql = 'DELETE FROM alunos WHERE id = ?';
  db.query(sql, [alunoId], (err, result) => {
    if (err) {
      console.error('Erro ao excluir aluno:', err);
      return res.status(500).json({ sucesso: false, erro: 'Erro ao excluir aluno.' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Aluno não encontrado.' });
    }
    
    res.json({ sucesso: true, mensagem: 'Aluno excluído com sucesso!' });
  });
});

// Cadastrar turma
app.post('/api/turmas', verificarAdmin, (req, res) => {
  let { nome, ano, turno } = req.body;
  if (!nome || !ano || !turno) return res.status(400).json({ sucesso: false, erro: 'Todos os campos são obrigatórios!' });

  const sqlCheck = 'SELECT id FROM turmas WHERE nome = ? AND ano = ?';
  db.query(sqlCheck, [nome, ano], (err, rows) => {
    if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao verificar turma.' });
    if (rows.length > 0) return res.status(409).json({ sucesso: false, erro: 'Turma já existe.' });

    const sqlInsert = 'INSERT INTO turmas (nome, ano, turno) VALUES (?, ?, ?)';
    db.query(sqlInsert, [nome, ano, turno], (err, result) => {
      if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao cadastrar turma.' });
      console.log(`✅ Turma cadastrada: ${nome} (${ano} - ${turno})`);
      res.json({ sucesso: true, mensagem: 'Turma cadastrada com sucesso!', id: result.insertId });
    });
  });
});

// Vincular professor à turma
app.post('/api/vincular', verificarAdmin, (req, res) => {
  const { professorId, turmaId } = req.body;
  if (!professorId || !turmaId) return res.status(400).json({ success: false, message: 'Professor e/ou turma não selecionados' });

  const sqlCheck = 'SELECT * FROM professor_turma WHERE id_professor = ? AND id_turma = ?';
  db.query(sqlCheck, [professorId, turmaId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao verificar vínculo' });
    if (results.length > 0) return res.status(400).json({ success: false, message: 'Esse professor já está vinculado a essa turma.' });

    const sqlInsert = 'INSERT INTO professor_turma (id_professor, id_turma) VALUES (?, ?)';
    db.query(sqlInsert, [professorId, turmaId], (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Erro ao vincular professor à turma.' });
      console.log(`✅ Professor ${professorId} vinculado à turma ${turmaId}`);
      res.json({ success: true, message: 'Professor vinculado à turma com sucesso!' });
    });
  });
});

// Buscar alunos da turma do professor
app.get('/api/alunos-turma-professor', verificarProfessor, (req, res) => {
    const idProfessor = req.session.usuario.id;

    const sql = `
        SELECT 
            a.id, 
            a.nome,
            t.id AS turma_id,
            t.nome AS turma_nome
        FROM alunos a
        INNER JOIN turmas t ON a.turma_id = t.id
        INNER JOIN professor_turma pt ON pt.id_turma = t.id
        WHERE pt.id_professor = ?
        ORDER BY a.nome ASC
    `;
    
    db.query(sql, [idProfessor], (err, results) => {
        if (err) {
            console.error('Erro ao buscar alunos da turma:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar alunos!' });
        }

        // Agrupar alunos por turma
        const alunosPorTurma = {};
        results.forEach(aluno => {
            if (!alunosPorTurma[aluno.turma_nome]) {
                alunosPorTurma[aluno.turma_nome] = [];
            }
            alunosPorTurma[aluno.turma_nome].push({
                id: aluno.id,
                nome: aluno.nome,
                turma_id: aluno.turma_id
            });
        });

        res.json({ 
            sucesso: true, 
            alunosPorTurma,
            turmas: Object.keys(alunosPorTurma)
        });
    });
});

// ========================
// ROTAS DE FREQUÊNCIA
// ========================

// Buscar alunos da turma do professor
app.get('/api/alunos-turma-professor', verificarProfessor, (req, res) => {
    const idProfessor = req.session.usuario.id;

    const sql = `
        SELECT 
            a.id, 
            a.nome,
            t.id AS turma_id,
            t.nome AS turma_nome
        FROM alunos a
        INNER JOIN turmas t ON a.turma_id = t.id
        INNER JOIN professor_turma pt ON pt.id_turma = t.id
        WHERE pt.id_professor = ?
        ORDER BY t.nome ASC, a.nome ASC
    `;
    
    db.query(sql, [idProfessor], (err, results) => {
        if (err) {
            console.error('Erro ao buscar alunos da turma:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar alunos!' });
        }

        // Agrupar alunos por turma
        const alunosPorTurma = {};
        results.forEach(aluno => {
            if (!alunosPorTurma[aluno.turma_nome]) {
                alunosPorTurma[aluno.turma_nome] = [];
            }
            alunosPorTurma[aluno.turma_nome].push({
                id: aluno.id,
                nome: aluno.nome,
                turma_id: aluno.turma_id
            });
        });

        res.json({ 
            sucesso: true, 
            alunosPorTurma,
            turmas: Object.keys(alunosPorTurma)
        });
    });
});

// Salvar frequências
app.post('/salvar-frequencias', verificarProfessor, (req, res) => {
    const { dia, mes, ano, frequencias, turma_id } = req.body;
    const idProfessor = req.session.usuario.id;

    if (!dia || !mes || !ano || !frequencias || !Array.isArray(frequencias) || !turma_id) {
        return res.status(400).json({ sucesso: false, erro: 'Dados inválidos!' });
    }

    // Primeiro, remove frequências existentes para esta data e turma
    const sqlDelete = 'DELETE FROM frequencias WHERE dia = ? AND mes = ? AND ano = ? AND id_professor = ? AND turma_id = ?';
    db.query(sqlDelete, [dia, mes, ano, idProfessor, turma_id], (err) => {
        if (err) {
            console.error('Erro ao limpar frequências antigas:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro ao salvar frequência!' });
        }

        // Se não há frequências para salvar, retorna sucesso
        if (frequencias.length === 0) {
            return res.json({ sucesso: true, mensagem: 'Frequência salva com sucesso!' });
        }

        // Insere as novas frequências
        const sqlInsert = 'INSERT INTO frequencias (aluno, aluno_id, presente, observacao, dia, mes, ano, id_professor, turma_id) VALUES ?';
        
        const values = frequencias.map(freq => [
            freq.aluno,
            freq.aluno_id,
            freq.presente ? 1 : 0,
            freq.observacao || '',
            dia,
            mes,
            ano,
            idProfessor,
            turma_id
        ]);

        db.query(sqlInsert, [values], (err, result) => {
            if (err) {
                console.error('Erro ao salvar frequências:', err);
                return res.status(500).json({ sucesso: false, erro: 'Erro ao salvar frequência!' });
            }
            
            console.log(`✅ Frequência salva: ${dia}/${mes+1}/${ano} - Turma ${turma_id} - ${frequencias.length} alunos`);
            res.json({ sucesso: true, mensagem: 'Frequência salva com sucesso!' });
        });
    });
});

// Obter frequência por data e turma
app.get('/obter-frequencia', verificarProfessor, (req, res) => {
    const { dia, mes, ano, turma_id } = req.query;
    const idProfessor = req.session.usuario.id;

    if (!dia || !mes || !ano || !turma_id) {
        return res.status(400).json({ sucesso: false, erro: 'Data ou turma inválida!' });
    }

    const sql = 'SELECT aluno_id, aluno, presente, observacao FROM frequencias WHERE dia = ? AND mes = ? AND ano = ? AND id_professor = ? AND turma_id = ?';
    
    db.query(sql, [parseInt(dia), parseInt(mes), parseInt(ano), idProfessor, turma_id], (err, results) => {
        if (err) {
            console.error('Erro ao buscar frequência:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar frequência!' });
        }

        const frequencias = results.map(row => ({
            aluno_id: row.aluno_id,
            aluno: row.aluno,
            presente: row.presente === 1,
            observacao: row.observacao
        }));

        res.json({ sucesso: true, frequencias });
    });
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