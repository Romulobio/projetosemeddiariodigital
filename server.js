const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const mysql = require('mysql2');
const cors = require('cors');
const crypto = require('crypto');

// Carrega variáveis de ambiente
require('dotenv').config();

// ========================
// CONFIGURAÇÃO DO CORS (DEVE VIR PRIMEIRO)
// ========================
app.use(cors({
  origin: true, // Permite todas as origens (ajuste para produção)
  credentials: true
}));

// ========================
// CONEXÃO COM O BANCO DE DADOS RAILWAY
// ========================
const db = mysql.createConnection({
  host: process.env.MYSQLHOST || 'mysql.railway.internal',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'UsmVulfizfRRrMbMQgpyEcIpFvRHrPvY',
  database: process.env.MYSQLDATABASE || 'railway',
  port: process.env.MYSQLPORT || 3306,
  charset: 'utf8mb4'
});

db.connect(err => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err);
    process.exit(1);
  } else {
    console.log('✅ Conexão com o banco bem-sucedida!');
  }
});

// ========================
// CONFIGURAÇÃO DA SESSÃO COM MYSQL
// ========================
const sessionStore = new MySQLStore({
  host: process.env.MYSQLHOST || 'localhost',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'professorbio25',
  database: process.env.MYSQLDATABASE || 'escola'
}, db);

app.use(session({
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || 'segredo_sistema_escolar',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000, 
    sameSite: 'lax' 
  }
}));

// ========================
// CONFIGURAÇÃO DO APP
// ========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rota padrão (raiz)
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
// ROTA DE CADASTRO COM VERIFICAÇÃO DE PERMISSÃO
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

  // VERIFICAÇÃO DE PERMISSÃO PARA CRIAR ADMINISTRADOR
  if (tipo === 'administrador') {
    if (!req.session.usuario) {
      return res.json({ sucesso: false, erro: 'Acesso negado! Faça login para criar administradores.' });
    }
    
    const sqlCheckPermission = 'SELECT pode_criar_admin FROM usuarios WHERE id = ?';
    
    db.query(sqlCheckPermission, [req.session.usuario.id], (err, results) => {
      if (err || results.length === 0 || !results[0].pode_criar_admin) {
        return res.json({ 
          sucesso: false, 
          erro: 'Permissão negada! Apenas administradores master podem criar novos administradores.' 
        });
      }
      
      continuarCadastro();
    });
  } else {
    continuarCadastro();
  }

  function continuarCadastro() {
    db.query('SELECT id FROM usuarios WHERE email = ?', [email], async (err, results) => {
      if (err) {
        return res.json({ sucesso: false, erro: 'Erro ao verificar email!' });
      }
      
      if (results.length > 0) {
        return res.json({ sucesso: false, erro: 'Este email já está cadastrado!' });
      }

      try {
        const hash = await bcrypt.hash(senha, 10);
        db.query('INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)', 
          [nome, email, hash, tipo], 
          (err, result) => {
            if (err) {
              return res.json({ sucesso: false, erro: 'Erro ao cadastrar usuário!' });
            }
            
            console.log(`✅ Usuário ${tipo} cadastrado: ${nome} (${email})`);
            res.json({ 
              sucesso: true, 
              id: result.insertId, 
              mensagem: `Usuário ${tipo} cadastrado com sucesso!` 
            });
          }
        );
      } catch (error) {
        res.json({ sucesso: false, erro: 'Erro interno ao cadastrar usuário!' });
      }
    });
  }
});

// ========================
// ROTA DE LOGIN
// ========================
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  console.log('🔐 TENTATIVA DE LOGIN - Email:', email);

  if (!email || !senha) {
    return res.json({ sucesso: false, erro: 'Email e senha são obrigatórios!' });
  }

  db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('❌ ERRO NO BANCO:', err);
      return res.json({ sucesso: false, erro: 'Erro ao fazer login!' });
    }
    
    if (results.length === 0) {
      console.log('❌ EMAIL NÃO ENCONTRADO:', email);
      return res.json({ sucesso: false, erro: 'Email ou senha incorretos!' });
    }

    const usuario = results[0];
    console.log('👤 USUÁRIO ENCONTRADO:', usuario.nome);

    const match = await bcrypt.compare(senha, usuario.senha);
    console.log('🔑 COMPARAÇÃO BCRYPT:', match);

    if (match) {
      return fazerLogin(usuario, res, req);
    }

    console.log('⚠️ Hash incorreto detectado, corrigindo...');
    
    try {
      const novoHash = await bcrypt.hash(senha, 10);
      const sqlUpdate = 'UPDATE usuarios SET senha = ? WHERE id = ?';
      db.query(sqlUpdate, [novoHash, usuario.id], (err) => {
        if (err) {
          console.error('❌ Erro ao corrigir hash:', err);
          return res.json({ sucesso: false, erro: 'Erro interno!' });
        }
        
        console.log('✅ HASH CORRIGIDO NO BANCO');
        fazerLogin(usuario, res, req);
      });
    } catch (error) {
      console.error('❌ Erro ao gerar hash:', error);
      return res.json({ sucesso: false, erro: 'Email ou senha incorretos!' });
    }
  });
});

// Função auxiliar para fazer login
function fazerLogin(usuario, res, req) {
  req.session.usuario = { 
    id: usuario.id, 
    nome: usuario.nome, 
    email: usuario.email, 
    tipo: usuario.tipo.toLowerCase(),
    pode_criar_admin: Boolean(usuario.pode_criar_admin)
  };
  
  console.log('✅ LOGIN BEM-SUCEDIDO:', {
    nome: usuario.nome,
    tipo: usuario.tipo,
    master: req.session.usuario.pode_criar_admin
  });
  
  res.json({ 
    sucesso: true, 
    mensagem: 'Login realizado com sucesso!', 
    usuario: req.session.usuario 
  });
}

// ========================
// ROTAS BÁSICAS
// ========================
app.post('/logout', verificarAuth, (req, res) => {
  req.session.destroy(err => {
    if (err) return res.json({ sucesso: false, erro: 'Erro ao fazer logout!' });
    res.json({ sucesso: true, mensagem: 'Logout realizado com sucesso!' });
  });
});

// Rota para criar novo admin (testes)
app.post('/criar-novo-admin', async (req, res) => {
  try {
    const hashSenha = await bcrypt.hash('admin123', 10);
    
    const sql = `INSERT INTO usuarios (nome, email, senha, tipo, pode_criar_admin) 
                 VALUES (?, ?, ?, 'administrador', TRUE)`;
    
    db.query(sql, ['Novo Admin Master', 'novoadmin@escola.com', hashSenha], (err, result) => {
      if (err) {
        console.error('❌ Erro ao criar admin:', err);
        return res.json({ sucesso: false, erro: 'Erro ao criar administrador' });
      }
      
      console.log('✅ Novo admin master criado!');
      res.json({ 
        sucesso: true, 
        mensagem: 'Novo admin criado! Use: novoadmin@escola.com / admin123',
        credenciais: {
          email: 'novoadmin@escola.com',
          senha: 'admin123'
        }
      });
    });
  } catch (error) {
    res.json({ sucesso: false, erro: 'Erro interno' });
  }
});

// ========================
// ROTAS DE PÁGINAS
// ========================
app.get('/admin.html', verificarAdmin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/pagina-professor.html', verificarProfessor, (req, res) => res.sendFile(path.join(__dirname, 'public', 'pagina-professor.html')));
app.get('/frequencia.html', verificarProfessor, (req, res) => res.sendFile(path.join(__dirname, 'public', 'frequencia.html')));
app.get('/relatorios.html', verificarProfessor, (req, res) => res.sendFile(path.join(__dirname, 'public', 'relatorios.html')));
app.get('/notas.html', verificarProfessor, (req, res) => res.sendFile(path.join(__dirname, 'public', 'notas.html')));
app.get('/diario.html', verificarProfessor, (req, res) => res.sendFile(path.join(__dirname, 'public', 'diario.html')));

// ========================
// ROTA PARA DADOS DO USUÁRIO
// ========================
app.get('/api/dados-usuario', verificarAuth, (req, res) => {
  res.json({ 
    sucesso: true, 
    usuario: {
      id: req.session.usuario.id,
      nome: req.session.usuario.nome,
      email: req.session.usuario.email,
      tipo: req.session.usuario.tipo
    }
  });
});

// ========================
// ROTAS DE TURMAS (ADMIN)
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

app.delete('/api/turmas/:id', verificarAdmin, (req, res) => {
  const turmaId = req.params.id;
  
  const sqlCheckAlunos = 'SELECT COUNT(*) as total FROM alunos WHERE turma_id = ?';
  const sqlCheckProfessores = 'SELECT COUNT(*) as total FROM professor_turma WHERE id_turma = ?';
  
  db.query(sqlCheckAlunos, [turmaId], (err, resultAlunos) => {
    if (err) {
      console.error('Erro ao verificar alunos:', err);
      return res.status(500).json({ sucesso: false, erro: 'Erro ao verificar vínculos da turma' });
    }
    
    const totalAlunos = resultAlunos[0].total;
    
    if (totalAlunos > 0) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: `Não é possível excluir a turma. Existem ${totalAlunos} aluno(s) vinculado(s) a esta turma.` 
      });
    }
    
    db.query(sqlCheckProfessores, [turmaId], (err, resultProfessores) => {
      if (err) {
        console.error('Erro ao verificar professores:', err);
        return res.status(500).json({ sucesso: false, erro: 'Erro ao verificar vínculos da turma' });
      }
      
      const totalProfessores = resultProfessores[0].total;
      
      if (totalProfessores > 0) {
        return res.status(400).json({ 
          sucesso: false, 
          erro: `Não é possível excluir a turma. Existem ${totalProfessores} professor(es) vinculado(s).` 
        });
      }
      
      const sqlDelete = 'DELETE FROM turmas WHERE id = ?';
      db.query(sqlDelete, [turmaId], (err, result) => {
        if (err) {
          console.error('Erro ao excluir turma:', err);
          return res.status(500).json({ sucesso: false, erro: 'Erro ao excluir turma' });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ sucesso: false, erro: 'Turma não encontrada' });
        }
        
        console.log(`✅ Turma ${turmaId} excluída com sucesso`);
        res.json({ sucesso: true, mensagem: 'Turma excluída com sucesso!' });
      });
    });
  });
});

// ========================
// ROTAS DE PROFESSORES (ADMIN)
// ========================
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

app.delete('/api/professores/:id', verificarAdmin, (req, res) => {
  const professorId = req.params.id;
  
  console.log(`🗑️ SOLICITAÇÃO DE EXCLUSÃO DE PROFESSOR - ID: ${professorId}`);
  
  const sqlCheckProfessor = 'SELECT id, nome FROM usuarios WHERE id = ? AND tipo = "professor"';
  
  db.query(sqlCheckProfessor, [professorId], (err, results) => {
    if (err) {
      console.error('❌ Erro ao verificar professor:', err);
      return res.status(500).json({ sucesso: false, erro: 'Erro interno ao verificar professor' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Professor não encontrado' });
    }
    
    const professor = results[0];
    
    // Remove vínculos
    const sqlDeleteTurmas = 'DELETE FROM professor_turma WHERE id_professor = ?';
    const sqlDeleteDisciplinas = 'DELETE FROM professor_disciplinas WHERE professor_id = ?';
    const sqlDeleteFrequencias = 'DELETE FROM frequencias WHERE id_professor = ?';
    const sqlDeleteNotas = 'DELETE FROM notas WHERE professor_id = ?';
    const sqlDeleteObjetos = 'DELETE FROM objetos_conhecimento WHERE professor_id = ?';
    
    // Executa todas as exclusões em sequência
    db.query(sqlDeleteTurmas, [professorId], (err) => {
      if (err) console.error('Erro ao remover turmas:', err);
      
      db.query(sqlDeleteDisciplinas, [professorId], (err) => {
        if (err) console.error('Erro ao remover disciplinas:', err);
        
        db.query(sqlDeleteFrequencias, [professorId], (err) => {
          if (err) console.error('Erro ao remover frequências:', err);
          
          db.query(sqlDeleteNotas, [professorId], (err) => {
            if (err) console.error('Erro ao remover notas:', err);
            
            db.query(sqlDeleteObjetos, [professorId], (err) => {
              if (err) console.error('Erro ao remover objetos:', err);
              
              // Finalmente exclui o professor
              const sqlDeleteProfessor = 'DELETE FROM usuarios WHERE id = ? AND tipo = "professor"';
              db.query(sqlDeleteProfessor, [professorId], (err, result) => {
                if (err) {
                  console.error('❌ Erro ao excluir professor:', err);
                  return res.status(500).json({ sucesso: false, erro: 'Erro interno ao excluir professor' });
                }
                
                console.log(`✅ PROFESSOR EXCLUÍDO: ${professor.nome}`);
                res.json({ 
                  sucesso: true, 
                  mensagem: `Professor "${professor.nome}" excluído com sucesso!`
                });
              });
            });
          });
        });
      });
    });
  });
});

// ========================
// ROTAS DE ALUNOS (ADMIN)
// ========================
app.get('/api/alunos', verificarAdmin, (req, res) => {
  const sql = `
    SELECT 
      a.id, 
      a.nome, 
      t.nome AS turma,
      t.id AS turma_id
    FROM alunos a
    LEFT JOIN turmas t ON a.turma_id = t.id
    ORDER BY t.nome ASC, a.nome ASC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erro ao carregar alunos:', err);
      return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar alunos.' });
    }
    res.json({ sucesso: true, alunos: results });
  });
});

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

// ========================
// ROTAS PARA DROPDOWNS
// ========================
app.get('/api/turmas-dropdown', verificarAdmin, (req, res) => {
  const sql = 'SELECT id, nome FROM turmas ORDER BY nome ASC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erro ao carregar turmas:', err);
      return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar turmas.' });
    }
    res.json({ sucesso: true, turmas: results });
  });
});

// ========================
// VINCULAR PROFESSOR À TURMA
// ========================
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

// ========================
// ROTAS DE ADMINISTRADOR MASTER
// ========================
app.post('/cadastrar-admin', verificarAuth, async (req, res) => {
  const { nome, email, senha } = req.body;
  
  console.log('👑 SOLICITAÇÃO DE CADASTRO DE ADMIN - Por:', req.session.usuario);
  
  const sqlCheckPermission = 'SELECT pode_criar_admin FROM usuarios WHERE id = ?';
  
  db.query(sqlCheckPermission, [req.session.usuario.id], async (err, results) => {
    if (err || results.length === 0) {
      console.error('❌ Erro ao verificar permissão:', err);
      return res.json({ 
        sucesso: false, 
        erro: 'Erro ao verificar permissões!' 
      });
    }
    
    const podeCriarAdmin = results[0].pode_criar_admin === 1 || results[0].pode_criar_admin === true;
    
    if (!podeCriarAdmin) {
      return res.json({ 
        sucesso: false, 
        erro: 'Permissão negada! Apenas administradores master podem criar novos administradores.' 
      });
    }
    
    if (!nome || !email || !senha) {
      return res.json({ sucesso: false, erro: 'Todos os campos são obrigatórios!' });
    }

    if (senha.length < 6) {
      return res.json({ sucesso: false, erro: 'A senha deve ter pelo menos 6 caracteres!' });
    }

    try {
      db.query('SELECT id FROM usuarios WHERE email = ?', [email], async (err, emailResults) => {
        if (err) {
          console.error('❌ Erro ao verificar email:', err);
          return res.json({ sucesso: false, erro: 'Erro ao verificar email!' });
        }
        
        if (emailResults.length > 0) {
          return res.json({ sucesso: false, erro: 'Este email já está cadastrado!' });
        }

        const hashSenha = await bcrypt.hash(senha, 10);
        const sqlInsert = 'INSERT INTO usuarios (nome, email, senha, tipo, pode_criar_admin) VALUES (?, ?, ?, "administrador", FALSE)';
        
        db.query(sqlInsert, [nome.trim(), email.toLowerCase().trim(), hashSenha], (err, result) => {
          if (err) {
            console.error('❌ Erro ao cadastrar admin:', err);
            return res.json({ 
              sucesso: false, 
              erro: 'Erro ao cadastrar administrador!' 
            });
          }
          
          console.log(`✅ NOVO ADMINISTRADOR CADASTRADO: "${nome}" por ${req.session.usuario.nome}`);
          res.json({ 
            sucesso: true, 
            mensagem: 'Administrador cadastrado com sucesso!',
            id: result.insertId
          });
        });
      });
    } catch (error) {
      console.error('❌ Erro interno:', error);
      res.json({ sucesso: false, erro: 'Erro interno ao cadastrar administrador!' });
    }
  });
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
    db.query('SELECT * FROM usuarios WHERE id = ?', [usuarioId], async (err, results) => {
      if (err || results.length === 0) {
        return res.json({ sucesso: false, erro: 'Erro ao verificar senha atual!' });
      }

      const usuario = results[0];
      const senhaAtualCorreta = await bcrypt.compare(senha_atual, usuario.senha);
      
      if (!senhaAtualCorreta) {
        return res.json({ sucesso: false, erro: 'Senha atual incorreta!' });
      }

      const hashNovaSenha = await bcrypt.hash(nova_senha, 10);
      const sqlUpdate = 'UPDATE usuarios SET senha = ? WHERE id = ?';
      
      db.query(sqlUpdate, [hashNovaSenha, usuarioId], (err, result) => {
        if (err) {
          console.error('❌ Erro ao atualizar senha:', err);
          return res.json({ sucesso: false, erro: 'Erro ao alterar senha!' });
        }

        console.log('✅ SENHA ALTERADA COM SUCESSO - Usuário:', usuario.nome);
        res.json({ 
          sucesso: true, 
          mensagem: 'Senha alterada com sucesso!' 
        });
      });
    });
  } catch (error) {
    console.error('❌ Erro interno:', error);
    res.json({ sucesso: false, erro: 'Erro interno ao alterar senha!' });
  }
});

// ========================
// INICIAR SERVIDOR
// ========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📧 Sistema de Email: ${process.env.EMAIL_USER ? 'Configurado' : 'Não configurado'}`);
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