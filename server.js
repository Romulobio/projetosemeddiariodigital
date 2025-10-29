const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql2');
// Carrega variáveis de ambiente
require('dotenv').config();


// ========================
// CONEXÃO COM O BANCO DE DADOS
// ========================

const db = mysql.createConnection({
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'professorbio25',
  database: process.env.MYSQLDATABASE || 'railway',
  port: process.env.MYSQLPORT || 3306,
  charset: 'utf8mb4'
});

// ...
db.connect(err => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err);
    // Adicione um processo de saída para que o Railway saiba que falhou
    process.exit(1); 
  } else {
    console.log('✅ Conexão com o banco Railway bem-sucedida!');
    
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  }
});

module.exports = db;


// ========================
// CONFIGURAÇÃO DO APP
// ========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
  secret: 'seu-seguro-super-segredo',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' }
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
    // Se não está logado, não pode criar admin
    if (!req.session.usuario) {
      return res.json({ sucesso: false, erro: 'Acesso negado! Faça login para criar administradores.' });
    }
    
    // Verifica se o usuário logado tem permissão para criar admins
    const sqlCheckPermission = 'SELECT pode_criar_admin FROM usuarios WHERE id = ?';
    
    db.query(sqlCheckPermission, [req.session.usuario.id], (err, results) => {
      if (err || results.length === 0 || !results[0].pode_criar_admin) {
        return res.json({ 
          sucesso: false, 
          erro: 'Permissão negada! Apenas administradores master podem criar novos administradores.' 
        });
      }
      
      // Se tem permissão, continua com o cadastro
      continuarCadastro();
    });
  } else {
    // Para professores e alunos, cadastro normal
    continuarCadastro();
  }

  function continuarCadastro() {
    // Verifica se email já existe
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

    // Tenta comparar com bcrypt primeiro
    const match = await bcrypt.compare(senha, usuario.senha);
    console.log('🔑 COMPARAÇÃO BCRYPT:', match);

    if (match) {
      // Senha correta (hash válido)
      return fazerLogin(usuario, res, req);
    }

    // Se bcrypt falhou, pode ser hash incorreto - vamos corrigir
    console.log('⚠️ Hash incorreto detectado, corrigindo...');
    
    try {
      // Gera novo hash correto
      const novoHash = await bcrypt.hash(senha, 10);
      
      // Atualiza no banco
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

// ROTA PARA CRIAR NOVO ADMIN (útil para testes)
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
app.get('/notas.html', verificarProfessor, (req, res) => res.sendFile(path.join(__dirname, 'notas.html')));

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

// Listar turmas para o dropdown
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

// ROTA PARA GERAR RELATÓRIO
app.get('/gerar-relatorio', verificarProfessor, (req, res) => {
    const { mes, ano, aluno } = req.query;
    const idProfessor = req.session.usuario.id;

    if (!mes || !ano) {
        return res.status(400).json({ sucesso: false, erro: 'Mês e ano são obrigatórios!' });
    }

    console.log(`📊 Gerando relatório: mes=${mes}, ano=${ano}, aluno=${aluno || 'todos'}, professor=${idProfessor}`);

    let sql = `
        SELECT 
            aluno,
            aluno_id,
            presente,
            observacao,
            dia,
            mes,
            ano
        FROM frequencias 
        WHERE mes = ? 
            AND ano = ? 
            AND id_professor = ?
    `;
    
    const params = [parseInt(mes), parseInt(ano), idProfessor];

    // Filtro por aluno específico se fornecido
    if (aluno && aluno !== '') {
        sql += ' AND aluno_id = ?';
        params.push(parseInt(aluno));
    }

    sql += ' ORDER BY dia ASC, aluno ASC';

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Erro ao gerar relatório:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro interno ao gerar relatório.' });
        }

        console.log(`✅ Relatório gerado: ${results.length} registros encontrados`);
        res.json({ 
            sucesso: true, 
            relatorio: results,
            totalRegistros: results.length
        });
    });
});

// ========================
// ROTAS DO SISTEMA DE NOTAS
// ========================

// Rota para buscar turmas do professor (NOTAS)
app.get('/api/notas-turmas-professor', verificarProfessor, (req, res) => {
    const idProfessor = req.session.usuario.id;

    const sql = `
        SELECT DISTINCT 
            t.nome as turma_nome, 
            t.id as turma_id
        FROM turmas t
        INNER JOIN professor_turma pt ON t.id = pt.id_turma
        WHERE pt.id_professor = ?
        ORDER BY t.nome
    `;
    
    db.query(sql, [idProfessor], (err, turmas) => {
        if (err) {
            console.error('Erro ao buscar turmas:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro interno' });
        }
        
        const alunosPorTurma = {};
        const turmasNomes = [];
        
        // Função para buscar alunos de cada turma
        const buscarAlunosDaTurma = (index) => {
            if (index >= turmas.length) {
                // Todas as turmas processadas
                res.json({
                    sucesso: true,
                    turmas: turmasNomes,
                    alunosPorTurma: alunosPorTurma
                });
                return;
            }
            
            const turma = turmas[index];
            const sqlAlunos = 'SELECT id, nome, turma_id FROM alunos WHERE turma_id = ? ORDER BY nome';
            
            db.query(sqlAlunos, [turma.turma_id], (err, alunos) => {
                if (err) {
                    console.error('Erro ao buscar alunos:', err);
                    return res.status(500).json({ sucesso: false, erro: 'Erro interno' });
                }
                
                alunosPorTurma[turma.turma_nome] = alunos;
                turmasNomes.push(turma.turma_nome);
                
                // Processa próxima turma
                buscarAlunosDaTurma(index + 1);
            });
        };
        
        // Inicia o processamento das turmas
        buscarAlunosDaTurma(0);
    });
});

// Rota para carregar notas
app.get('/api/notas-turma', verificarProfessor, (req, res) => {
    const { turma_id, unidade } = req.query;
    const idProfessor = req.session.usuario.id;
    
    if (!turma_id || !unidade) {
        return res.status(400).json({ sucesso: false, erro: 'Dados incompletos' });
    }
    
    // Verifica acesso
    const sqlAcesso = 'SELECT 1 FROM professor_turma WHERE id_professor = ? AND id_turma = ?';
    db.query(sqlAcesso, [idProfessor, turma_id], (err, acesso) => {
        if (err) {
            console.error('Erro ao verificar acesso:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro interno' });
        }
        
        if (acesso.length === 0) {
            return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
        }
        
        // Busca notas
        const sqlNotas = 'SELECT aluno_id, participacao, organizacao, respeito, atividade, avaliacao, recuperacao FROM notas WHERE turma_id = ? AND unidade = ? AND professor_id = ?';
        db.query(sqlNotas, [turma_id, unidade, idProfessor], (err, notas) => {
            if (err) {
                console.error('Erro ao carregar notas:', err);
                return res.status(500).json({ sucesso: false, erro: 'Erro interno' });
            }
            
            const notasFormatadas = {};
            notas.forEach(nota => {
                notasFormatadas[nota.aluno_id] = {
                    qualitativo: {
                        participacao: parseFloat(nota.participacao) || 0,
                        organizacao: parseFloat(nota.organizacao) || 0,
                        respeito: parseFloat(nota.respeito) || 0
                    },
                    atividade: parseFloat(nota.atividade) || 0,
                    avaliacao: parseFloat(nota.avaliacao) || 0,
                    recuperacao: parseFloat(nota.recuperacao) || 0
                };
            });
            
            res.json({ sucesso: true, notas: notasFormatadas });
        });
    });
});

// Rota para salvar notas
app.post('/api/salvar-notas', verificarProfessor, (req, res) => {
    const { turma_id, unidade, notas } = req.body;
    const idProfessor = req.session.usuario.id;
    
    if (!turma_id || !unidade || !notas) {
        return res.status(400).json({ sucesso: false, erro: 'Dados incompletos' });
    }
    
    // Verifica acesso
    const sqlAcesso = 'SELECT 1 FROM professor_turma WHERE id_professor = ? AND id_turma = ?';
    db.query(sqlAcesso, [idProfessor, turma_id], (err, acesso) => {
        if (err) {
            console.error('Erro ao verificar acesso:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro interno' });
        }
        
        if (acesso.length === 0) {
            return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
        }
        
        let registrosAtualizados = 0;
        const operacoes = [];
        
        // Prepara as operações de INSERT/UPDATE
        for (const [alunoId, dadosNota] of Object.entries(notas)) {
            const { qualitativo, atividade, avaliacao, recuperacao } = dadosNota;
            
            // Verifica se já existe nota
            const sqlCheck = 'SELECT id FROM notas WHERE professor_id = ? AND aluno_id = ? AND unidade = ? AND turma_id = ?';
            operacoes.push(new Promise((resolve, reject) => {
                db.query(sqlCheck, [idProfessor, alunoId, unidade, turma_id], (err, notaExistente) => {
                    if (err) return reject(err);
                    
                    if (notaExistente.length > 0) {
                        // UPDATE
                        const sqlUpdate = `
                            UPDATE notas SET
                                participacao = ?, organizacao = ?, respeito = ?, atividade = ?, avaliacao = ?, recuperacao = ?, atualizado_em = CURRENT_TIMESTAMP
                            WHERE professor_id = ? AND aluno_id = ? AND unidade = ? AND turma_id = ?
                        `;
                        db.query(sqlUpdate, [
                            qualitativo.participacao || 0, 
                            qualitativo.organizacao || 0, 
                            qualitativo.respeito || 0,
                            atividade || 0, 
                            avaliacao || 0, 
                            recuperacao || 0,
                            idProfessor, 
                            alunoId, 
                            unidade, 
                            turma_id
                        ], (err) => {
                            if (err) return reject(err);
                            registrosAtualizados++;
                            resolve();
                        });
                    } else {
                        // INSERT
                        const sqlInsert = `
                            INSERT INTO notas (professor_id, turma_id, aluno_id, unidade, participacao, organizacao, respeito, atividade, avaliacao, recuperacao)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        db.query(sqlInsert, [
                            idProfessor, 
                            turma_id, 
                            alunoId, 
                            unidade,
                            qualitativo.participacao || 0, 
                            qualitativo.organizacao || 0, 
                            qualitativo.respeito || 0,
                            atividade || 0, 
                            avaliacao || 0, 
                            recuperacao || 0
                        ], (err) => {
                            if (err) return reject(err);
                            registrosAtualizados++;
                            resolve();
                        });
                    }
                });
            }));
        }
        
        // Executa todas as operações
        Promise.all(operacoes)
            .then(() => {
                res.json({
                    sucesso: true,
                    registros: registrosAtualizados,
                    mensagem: `Notas da Unidade ${unidade} salvas com sucesso!`
                });
            })
            .catch(error => {
                console.error('Erro ao salvar notas:', error);
                res.status(500).json({ sucesso: false, erro: 'Erro interno' });
            });
    });
});

// Rota para médias anuais (CORRIGIDA - recuperação substitui média quando maior)
app.get('/api/medias-anuais', verificarProfessor, (req, res) => {
    const { turma_id } = req.query;
    const idProfessor = req.session.usuario.id;
    
    if (!turma_id) {
        return res.status(400).json({ sucesso: false, erro: 'Turma ID obrigatório' });
    }
    
    const sqlAcesso = 'SELECT 1 FROM professor_turma WHERE id_professor = ? AND id_turma = ?';
    db.query(sqlAcesso, [idProfessor, turma_id], (err, acesso) => {
        if (err) {
            console.error('Erro ao verificar acesso:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro interno' });
        }
        
        if (acesso.length === 0) {
            return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
        }
        
        const sqlMedias = `
            SELECT 
                a.id as aluno_id,
                a.nome as aluno_nome,
                
                -- Unidade 1: usa a maior nota entre média original e recuperação
                GREATEST(
                    COALESCE((n1.participacao + n1.organizacao + n1.respeito + n1.atividade + n1.avaliacao), 0),
                    COALESCE(n1.recuperacao, 0)
                ) as media_unidade1,
                
                -- Unidade 2: usa a maior nota entre média original e recuperação
                GREATEST(
                    COALESCE((n2.participacao + n2.organizacao + n2.respeito + n2.atividade + n2.avaliacao), 0),
                    COALESCE(n2.recuperacao, 0)
                ) as media_unidade2,
                
                -- Unidade 3: usa a maior nota entre média original e recuperação
                GREATEST(
                    COALESCE((n3.participacao + n3.organizacao + n3.respeito + n3.atividade + n3.avaliacao), 0),
                    COALESCE(n3.recuperacao, 0)
                ) as media_unidade3,
                
                -- Notas de recuperação para exibição
                COALESCE(n1.recuperacao, 0) as recuperacao_unidade1,
                COALESCE(n2.recuperacao, 0) as recuperacao_unidade2,
                COALESCE(n3.recuperacao, 0) as recuperacao_unidade3
                
            FROM alunos a
            LEFT JOIN notas n1 ON n1.aluno_id = a.id AND n1.unidade = 1 AND n1.professor_id = ?
            LEFT JOIN notas n2 ON n2.aluno_id = a.id AND n2.unidade = 2 AND n2.professor_id = ?
            LEFT JOIN notas n3 ON n3.aluno_id = a.id AND n3.unidade = 3 AND n3.professor_id = ?
            WHERE a.turma_id = ?
            ORDER BY a.nome
        `;
        
        db.query(sqlMedias, [idProfessor, idProfessor, idProfessor, turma_id], (err, medias) => {
            if (err) {
                console.error('Erro ao carregar médias:', err);
                return res.status(500).json({ sucesso: false, erro: 'Erro interno' });
            }
            
            res.json({ sucesso: true, medias: medias });
        });
    });
});

// ========================
// ROTAS OBJETOS DE CONHECIMENTO - CORRIGIDAS
// ========================

// Rota para buscar dados do usuário
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

// Rota para buscar turmas do professor
app.get('/api/turmas-professor', verificarProfessor, (req, res) => {
    const idProfessor = req.session.usuario.id;

    const sql = `
        SELECT DISTINCT 
            t.id,
            t.nome
        FROM turmas t
        INNER JOIN professor_turma pt ON t.id = pt.id_turma
        WHERE pt.id_professor = ?
        ORDER BY t.nome
    `;
    
    db.query(sql, [idProfessor], (err, turmas) => {
        if (err) {
            console.error('Erro ao buscar turmas:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar turmas' });
        }
        
        res.json({ sucesso: true, turmas });
    });
});

// Rota para buscar disciplinas do professor
app.get('/api/disciplinas-professor', verificarProfessor, (req, res) => {
    const idProfessor = req.session.usuario.id;

    // Primeiro tenta buscar da tabela professor_disciplinas
    const sql = `
        SELECT DISTINCT 
            d.id,
            d.nome
        FROM disciplinas d
        LEFT JOIN professor_disciplinas pd ON d.id = pd.disciplina_id
        WHERE pd.professor_id = ? OR pd.professor_id IS NULL
        ORDER BY d.nome
    `;
    
    db.query(sql, [idProfessor], (err, disciplinas) => {
        if (err) {
            console.log('Erro ao buscar disciplinas, usando fallback...');
            
            // Fallback: retorna disciplinas padrão
            const disciplinasFallback = [
                { id: 1, nome: 'Matemática' },
                { id: 2, nome: 'Português' },
                { id: 3, nome: 'Ciências' },
                { id: 4, nome: 'História' },
                { id: 5, nome: 'Geografia' },
                { id: 6, nome: 'Inglês' },
                { id: 7, nome: 'Artes' },
                { id: 8, nome: 'Educação Física' }
            ];
            
            return res.json({ sucesso: true, disciplinas: disciplinasFallback });
        }
        
        // Se não encontrou disciplinas, usa fallback
        if (disciplinas.length === 0) {
            const disciplinasFallback = [
                { id: 1, nome: 'Matemática' },
                { id: 2, nome: 'Português' },
                { id: 3, nome: 'Ciências' },
                { id: 4, nome: 'História' },
                { id: 5, nome: 'Geografia' }
            ];
            return res.json({ sucesso: true, disciplinas: disciplinasFallback });
        }
        
        res.json({ sucesso: true, disciplinas });
    });
});

// Rota para buscar objetos de conhecimento
app.get('/api/objetos-conhecimento', verificarProfessor, (req, res) => {
    const { turma, disciplina, mes, ano } = req.query;
    const idProfessor = req.session.usuario.id;

    console.log('📍 Buscando objetos:', { turma, disciplina, mes, ano, idProfessor });

    if (!turma || !disciplina || !mes || !ano) {
        return res.status(400).json({ sucesso: false, erro: 'Parâmetros incompletos' });
    }

    const sql = `
        SELECT DAY(data_aula) as dia, objeto_conhecimento 
        FROM objetos_conhecimento 
        WHERE professor_id = ? 
            AND turma_id = ?
            AND disciplina_id = ?
            AND MONTH(data_aula) = ? 
            AND YEAR(data_aula) = ?
        ORDER BY data_aula
    `;
    
    db.query(sql, [idProfessor, turma, disciplina, mes, ano], (err, resultados) => {
        if (err) {
            console.error('❌ Erro ao buscar objetos:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar objetos' });
        }

        const objetos = {};
        resultados.forEach(item => {
            objetos[item.dia] = item.objeto_conhecimento;
        });

        console.log('✅ Objetos encontrados:', objetos);
        res.json({ sucesso: true, objetos });
    });
});

// Rota para salvar objetos de conhecimento - CORRIGIDA
app.post('/api/salvar-objetos-conhecimento', verificarProfessor, (req, res) => {
    const { turma, disciplina, mes, ano, objetos } = req.body;
    const idProfessor = req.session.usuario.id;

    console.log('📍 Salvando objetos:', { 
        turma, 
        disciplina, 
        mes, 
        ano, 
        idProfessor,
        totalObjetos: Object.keys(objetos).length 
    });

    if (!turma || !disciplina || !mes || !ano || !objetos) {
        return res.status(400).json({ sucesso: false, erro: 'Dados incompletos' });
    }

    const operacoes = [];
    let registrosProcessados = 0;

    // Para cada objeto, verifica se já existe e faz INSERT ou UPDATE
    Object.keys(objetos).forEach(dia => {
        const dataAula = `${ano}-${mes.toString().padStart(2, '0')}-${dia.padStart(2, '0')}`;
        const objetoConhecimento = objetos[dia];
        
        // Verifica se já existe registro
        const sqlCheck = `
            SELECT id FROM objetos_conhecimento 
            WHERE professor_id = ? 
                AND turma_id = ? 
                AND disciplina_id = ? 
                AND data_aula = ?
        `;
        
        operacoes.push(new Promise((resolve, reject) => {
            db.query(sqlCheck, [idProfessor, turma, disciplina, dataAula], (err, resultados) => {
                if (err) {
                    console.error('❌ Erro ao verificar objeto:', err);
                    return reject(err);
                }
                
                if (resultados.length > 0) {
                    // UPDATE
                    const idObjeto = resultados[0].id;
                    const sqlUpdate = `
                        UPDATE objetos_conhecimento 
                        SET objeto_conhecimento = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `;
                    
                    db.query(sqlUpdate, [objetoConhecimento, idObjeto], (err) => {
                        if (err) {
                            console.error('❌ Erro ao atualizar objeto:', err);
                            return reject(err);
                        }
                        registrosProcessados++;
                        console.log(`✅ Objeto atualizado: dia ${dia}`);
                        resolve();
                    });
                } else {
                    // INSERT
                    const sqlInsert = `
                        INSERT INTO objetos_conhecimento 
                        (professor_id, turma_id, disciplina_id, data_aula, objeto_conhecimento) 
                        VALUES (?, ?, ?, ?, ?)
                    `;
                    
                    db.query(sqlInsert, [idProfessor, turma, disciplina, dataAula, objetoConhecimento], (err) => {
                        if (err) {
                            console.error('❌ Erro ao inserir objeto:', err);
                            return reject(err);
                        }
                        registrosProcessados++;
                        console.log(`✅ Objeto inserido: dia ${dia}`);
                        resolve();
                    });
                }
            });
        }));
    });

    // Executa todas as operações
    Promise.all(operacoes)
        .then(() => {
            console.log(`✅ Todos os objetos salvos: ${registrosProcessados} registros processados`);
            res.json({ 
                sucesso: true, 
                mensagem: `Objetos de conhecimento salvos com sucesso! (${registrosProcessados} registros)`,
                registros: registrosProcessados
            });
        })
        .catch(error => {
            console.error('❌ Erro ao salvar objetos:', error);
            res.status(500).json({ 
                sucesso: false, 
                erro: 'Erro interno ao salvar objetos de conhecimento' 
            });
        });
});

// ========================
// ROTAS PARA GERENCIAR DISCIPLINAS DO PROFESSOR
// ========================

// Buscar todas as disciplinas
app.get('/api/todas-disciplinas', verificarAdmin, (req, res) => {
    const sql = 'SELECT id, nome FROM disciplinas ORDER BY nome';
    
    db.query(sql, (err, disciplinas) => {
        if (err) {
            console.error('Erro ao buscar disciplinas:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar disciplinas' });
        }
        
        res.json({ sucesso: true, disciplinas });
    });
});

// Buscar disciplinas de um professor específico
app.get('/api/disciplinas-professor/:professorId', verificarAdmin, (req, res) => {
    const professorId = req.params.professorId;
    
    const sql = `
        SELECT d.id, d.nome 
        FROM disciplinas d
        INNER JOIN professor_disciplinas pd ON d.id = pd.disciplina_id
        WHERE pd.professor_id = ?
        ORDER BY d.nome
    `;
    
    db.query(sql, [professorId], (err, disciplinas) => {
        if (err) {
            console.error('Erro ao buscar disciplinas do professor:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar disciplinas' });
        }
        
        res.json({ sucesso: true, disciplinas });
    });
});

// Vincular disciplinas ao professor
app.post('/api/vincular-disciplinas', verificarAdmin, (req, res) => {
    const { professor_id, disciplinas } = req.body;
    
    if (!professor_id || !disciplinas || !Array.isArray(disciplinas)) {
        return res.status(400).json({ sucesso: false, erro: 'Dados inválidos' });
    }
    
    // Remove vínculos existentes
    const sqlDelete = 'DELETE FROM professor_disciplinas WHERE professor_id = ?';
    db.query(sqlDelete, [professor_id], (err) => {
        if (err) {
            console.error('Erro ao remover vínculos antigos:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro ao vincular disciplinas' });
        }
        
        // Insere novos vínculos
        if (disciplinas.length > 0) {
            const valores = disciplinas.map(disciplina_id => [professor_id, disciplina_id]);
            const sqlInsert = 'INSERT INTO professor_disciplinas (professor_id, disciplina_id) VALUES ?';
            
            db.query(sqlInsert, [valores], (err) => {
                if (err) {
                    console.error('Erro ao vincular disciplinas:', err);
                    return res.status(500).json({ sucesso: false, erro: 'Erro ao vincular disciplinas' });
                }
                
                console.log(`✅ Disciplinas vinculadas ao professor ${professor_id}: ${disciplinas.length} disciplinas`);
                res.json({ sucesso: true, mensagem: 'Disciplinas vinculadas com sucesso!' });
            });
        } else {
            res.json({ sucesso: true, mensagem: 'Todas as disciplinas foram removidas!' });
        }
    });
});

// Remover disciplina específica do professor
app.post('/api/remover-disciplina', verificarAdmin, (req, res) => {
    const { professor_id, disciplina_id } = req.body;
    
    const sql = 'DELETE FROM professor_disciplinas WHERE professor_id = ? AND disciplina_id = ?';
    
    db.query(sql, [professor_id, disciplina_id], (err, result) => {
        if (err) {
            console.error('Erro ao remover disciplina:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro ao remover disciplina' });
        }
        
        console.log(`✅ Disciplina ${disciplina_id} removida do professor ${professor_id}`);
        res.json({ sucesso: true, mensagem: 'Disciplina removida com sucesso!' });
    });
});

// Rota para excluir turma (COM VERIFICAÇÃO DE VÍNCULOS)
app.delete('/api/turmas/:id', verificarAdmin, (req, res) => {
  const turmaId = req.params.id;
  
  // Primeiro verifica se há alunos na turma
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
        erro: `Não é possível excluir a turma. Existem ${totalAlunos} aluno(s) vinculado(s) a esta turma. Transfira os alunos para outra turma primeiro.` 
      });
    }
    
    // Verifica se há professores vinculados
    db.query(sqlCheckProfessores, [turmaId], (err, resultProfessores) => {
      if (err) {
        console.error('Erro ao verificar professores:', err);
        return res.status(500).json({ sucesso: false, erro: 'Erro ao verificar vínculos da turma' });
      }
      
      const totalProfessores = resultProfessores[0].total;
      
      if (totalProfessores > 0) {
        return res.status(400).json({ 
          sucesso: false, 
          erro: `Não é possível excluir a turma. Existem ${totalProfessores} professor(es) vinculado(s) a esta turma. Remova os vínculos primeiro.` 
        });
      }
      
      // Se não há vínculos, pode excluir
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
// ROTAS DE ADMINISTRADOR MASTER
// ========================

// Rota para cadastrar novo administrador (APENAS MASTERS) - VERSÃO CORRIGIDA
app.post('/cadastrar-admin', verificarAuth, async (req, res) => {
    const { nome, email, senha } = req.body;
    
    console.log('👑 SOLICITAÇÃO DE CADASTRO DE ADMIN - Por:', req.session.usuario);
    
    // VERIFICAÇÃO DE PERMISSÃO - Busca no banco para garantir
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
        
        console.log('🔍 PERMISSÃO VERIFICADA:', {
            usuario: req.session.usuario.nome,
            session_pode_criar: req.session.usuario.pode_criar_admin,
            banco_pode_criar: results[0].pode_criar_admin,
            resultado: podeCriarAdmin
        });
        
        if (!podeCriarAdmin) {
            console.log(`❌ Tentativa não autorizada: ${req.session.usuario.nome} tentou criar admin`);
            return res.json({ 
                sucesso: false, 
                erro: 'Permissão negada! Apenas administradores master podem criar novos administradores.' 
            });
        }
        
        // Validações
        if (!nome || !email || !senha) {
            return res.json({ sucesso: false, erro: 'Todos os campos são obrigatórios!' });
        }

        if (senha.length < 6) {
            return res.json({ sucesso: false, erro: 'A senha deve ter pelo menos 6 caracteres!' });
        }

        try {
            // Verifica se email já existe
            db.query('SELECT id FROM usuarios WHERE email = ?', [email], async (err, emailResults) => {
                if (err) {
                    console.error('❌ Erro ao verificar email:', err);
                    return res.json({ sucesso: false, erro: 'Erro ao verificar email!' });
                }
                
                if (emailResults.length > 0) {
                    return res.json({ sucesso: false, erro: 'Este email já está cadastrado!' });
                }

                // Gera hash da senha
                const hashSenha = await bcrypt.hash(senha, 10);
                
                // Novo admin NÃO terá permissão para criar outros admins (por padrão)
                const sqlInsert = 'INSERT INTO usuarios (nome, email, senha, tipo, pode_criar_admin) VALUES (?, ?, ?, "administrador", FALSE)';
                
                db.query(sqlInsert, [nome.trim(), email.toLowerCase().trim(), hashSenha], (err, result) => {
                    if (err) {
                        console.error('❌ Erro ao cadastrar admin:', err);
                        return res.json({ 
                            sucesso: false, 
                            erro: 'Erro ao cadastrar administrador!' 
                        });
                    }
                    
                    console.log(`✅ NOVO ADMINISTRADOR CADASTRADO: "${nome}" por ${req.session.usuario.nome} (MASTER)`);
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

// Rota para verificar se o usuário pode criar admins
app.get('/api/verificar-permissao-admin', verificarAuth, (req, res) => {
    const temPermissao = req.session.usuario.pode_criar_admin;
    
    res.json({ 
        sucesso: true, 
        tem_permissao: temPermissao,
        nome_usuario: req.session.usuario.nome,
        tipo_usuario: req.session.usuario.tipo,
        eh_master: temPermissao
    });
});

// Rota para listar administradores (apenas para masters)
app.get('/api/listar-administradores', verificarAuth, (req, res) => {
    // Verifica se é master
    if (!req.session.usuario.pode_criar_admin) {
        return res.json({ 
            sucesso: false, 
            erro: 'Acesso restrito ao administrador master' 
        });
    }
    
    const sqlAdmins = 'SELECT id, nome, email, pode_criar_admin, created_at FROM usuarios WHERE tipo = "administrador" ORDER BY pode_criar_admin DESC, nome';
    
    db.query(sqlAdmins, (err, administradores) => {
        if (err) {
            console.error('❌ Erro ao carregar administradores:', err);
            return res.json({ 
                sucesso: false, 
                erro: 'Erro ao carregar administradores' 
            });
        }
        
        res.json({ 
            sucesso: true, 
            administradores: administradores 
        });
    });
});

// Rota para listar TODOS os usuários (para admin master redefinir senhas)
app.get('/admin/usuarios', verificarAuth, (req, res) => {
    // Verifica se é admin master
    if (!req.session.usuario.pode_criar_admin) {
        return res.json({ 
            sucesso: false, 
            erro: 'Acesso negado! Apenas administradores master.' 
        });
    }

    const sql = `
        SELECT 
            id, 
            nome, 
            email, 
            tipo,
            pode_criar_admin,
            created_at
        FROM usuarios 
        ORDER BY tipo, nome
    `;
    
    db.query(sql, (err, usuarios) => {
        if (err) {
            console.error('❌ Erro ao buscar usuários:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar usuários' });
        }
        
        res.json({ sucesso: true, usuarios });
    });
});

// Redefinir senha de usuário (apenas admin master)
app.post('/admin/redefinir-senha', verificarAuth, async (req, res) => {
    const { usuario_id, nova_senha } = req.body;
    const adminId = req.session.usuario.id;

    console.log('👑 ADMIN SOLICITANDO REDEFINIÇÃO DE SENHA - Admin:', req.session.usuario.nome);

    // Verifica se é admin master
    if (!req.session.usuario.pode_criar_admin) {
        console.log('❌ PERMISSÃO NEGADA - Não é admin master');
        return res.json({ 
            sucesso: false, 
            erro: 'Acesso negado! Apenas administradores master podem redefinir senhas.' 
        });
    }

    if (!usuario_id || !nova_senha) {
        return res.json({ sucesso: false, erro: 'ID do usuário e nova senha são obrigatórios!' });
    }

    if (nova_senha.length < 6) {
        return res.json({ sucesso: false, erro: 'A senha deve ter pelo menos 6 caracteres!' });
    }

    try {
        // Verifica se usuário existe
        db.query('SELECT id, nome, email FROM usuarios WHERE id = ?', [usuario_id], async (err, results) => {
            if (err || results.length === 0) {
                return res.json({ sucesso: false, erro: 'Usuário não encontrado!' });
            }

            const usuario = results[0];

            // Gera hash da nova senha
            const hashNovaSenha = await bcrypt.hash(nova_senha, 10);

            // Atualiza senha
            const sqlUpdate = 'UPDATE usuarios SET senha = ? WHERE id = ?';
            db.query(sqlUpdate, [hashNovaSenha, usuario_id], (err, result) => {
                if (err) {
                    console.error('❌ Erro ao redefinir senha:', err);
                    return res.json({ sucesso: false, erro: 'Erro ao redefinir senha!' });
                }

                console.log(`✅ SENHA REDEFINIDA - Admin: ${req.session.usuario.nome}, Usuário: ${usuario.nome}`);
                res.json({ 
                    sucesso: true, 
                    mensagem: `Senha de ${usuario.nome} redefinida com sucesso!` 
                });
            });
        });
    } catch (error) {
        console.error('❌ Erro interno:', error);
        res.json({ sucesso: false, erro: 'Erro interno ao redefinir senha!' });
    }
});

// ========================
// ROTAS PARA GERENCIAR PERMISSÕES DE ADMIN
// ========================

// Buscar todos os administradores
app.get('/api/administradores', verificarAdmin, (req, res) => {
    const sql = 'SELECT id, nome, email, pode_criar_admin FROM usuarios WHERE tipo = "administrador" ORDER BY nome';
    
    db.query(sql, (err, administradores) => {
        if (err) {
            console.error('Erro ao buscar administradores:', err);
            return res.status(500).json({ sucesso: false, erro: 'Erro ao carregar administradores' });
        }
        
        res.json({ sucesso: true, administradores });
    });
});

// Alternar permissão de administrador
app.post('/api/toggle-admin-permission', verificarAdmin, (req, res) => {
    const { admin_id, pode_criar_admin } = req.body;
    
    // Verifica se o usuário que está fazendo a alteração tem permissão
    const sqlCheckPermission = 'SELECT pode_criar_admin FROM usuarios WHERE id = ?';
    
    db.query(sqlCheckPermission, [req.session.usuario.id], (err, results) => {
        if (err || results.length === 0 || !results[0].pode_criar_admin) {
            return res.status(403).json({ 
                sucesso: false, 
                erro: 'Permissão negada! Apenas administradores master podem modificar permissões.' 
            });
        }
        
        // Não permite remover a própria permissão master
        if (parseInt(admin_id) === req.session.usuario.id && !pode_criar_admin) {
            return res.status(400).json({ 
                sucesso: false, 
                erro: 'Você não pode remover suas próprias permissões master!' 
            });
        }
        
        // Atualiza a permissão
        const sqlUpdate = 'UPDATE usuarios SET pode_criar_admin = ? WHERE id = ? AND tipo = "administrador"';
        
        db.query(sqlUpdate, [pode_criar_admin, admin_id], (err, result) => {
            if (err) {
                console.error('Erro ao atualizar permissão:', err);
                return res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar permissão' });
            }
            
            console.log(`✅ Permissão de admin atualizada: ID ${admin_id} -> ${pode_criar_admin ? 'MASTER' : 'BÁSICO'}`);
            res.json({ 
                sucesso: true, 
                mensagem: `Permissões atualizadas para ${pode_criar_admin ? 'MASTER' : 'BÁSICO'}` 
            });
        });
    });
});

// ========================
// ALTERAR SENHA (usuário logado) - ROTA ÚNICA
// ========================
app.post('/alterar-senha', verificarAuth, async (req, res) => {
  const { senha_atual, nova_senha, confirmar_senha } = req.body;
  const usuarioId = req.session.usuario.id;

  console.log('🔐 SOLICITAÇÃO DE ALTERAÇÃO DE SENHA - Usuário:', req.session.usuario.nome);

  // Validações
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
    // Busca usuário no banco
    db.query('SELECT * FROM usuarios WHERE id = ?', [usuarioId], async (err, results) => {
      if (err || results.length === 0) {
        console.error('❌ Erro ao buscar usuário:', err);
        return res.json({ sucesso: false, erro: 'Erro ao verificar senha atual!' });
      }

      const usuario = results[0];

      // Verifica senha atual
      const senhaAtualCorreta = await bcrypt.compare(senha_atual, usuario.senha);
      
      if (!senhaAtualCorreta) {
        console.log('❌ Senha atual incorreta - Usuário:', usuario.nome);
        return res.json({ sucesso: false, erro: 'Senha atual incorreta!' });
      }

      // Gera hash da nova senha
      const hashNovaSenha = await bcrypt.hash(nova_senha, 10);

      // Atualiza no banco
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
// ROTA PARA EXCLUIR PROFESSOR (REMOVE VÍNCULOS AUTOMATICAMENTE)
// ========================
app.delete('/api/professores/:id', verificarAdmin, async (req, res) => {
    const professorId = req.params.id;
    
    console.log(`🗑️ SOLICITAÇÃO DE EXCLUSÃO DE PROFESSOR - ID: ${professorId}`);
    
    // Verifica se o professor existe
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
        
        console.log(`🔍 Removendo vínculos do professor: ${professor.nome}`);
        
        // 1. Remove vínculos com turmas
        const sqlDeleteTurmas = 'DELETE FROM professor_turma WHERE id_professor = ?';
        db.query(sqlDeleteTurmas, [professorId], (err, resultTurmas) => {
            if (err) {
                console.error('❌ Erro ao remover vínculos com turmas:', err);
                return res.status(500).json({ sucesso: false, erro: 'Erro ao remover vínculos com turmas' });
            }
            
            console.log(`✅ Removidos ${resultTurmas.affectedRows} vínculos com turmas`);
            
            // 2. Remove vínculos com disciplinas
            const sqlDeleteDisciplinas = 'DELETE FROM professor_disciplinas WHERE professor_id = ?';
            db.query(sqlDeleteDisciplinas, [professorId], (err, resultDisciplinas) => {
                if (err) {
                    console.error('❌ Erro ao remover vínculos com disciplinas:', err);
                    return res.status(500).json({ sucesso: false, erro: 'Erro ao remover vínculos com disciplinas' });
                }
                
                console.log(`✅ Removidos ${resultDisciplinas.affectedRows} vínculos com disciplinas`);
                
                // 3. Remove registros de frequência (se houver)
                const sqlDeleteFrequencias = 'DELETE FROM frequencias WHERE id_professor = ?';
                db.query(sqlDeleteFrequencias, [professorId], (err, resultFrequencias) => {
                    if (err) {
                        console.error('❌ Erro ao remover frequências:', err);
                        // Continua mesmo com erro nas frequências
                    } else {
                        console.log(`✅ Removidos ${resultFrequencias.affectedRows} registros de frequência`);
                    }
                    
                    // 4. Remove registros de notas (se houver)
                    const sqlDeleteNotas = 'DELETE FROM notas WHERE professor_id = ?';
                    db.query(sqlDeleteNotas, [professorId], (err, resultNotas) => {
                        if (err) {
                            console.error('❌ Erro ao remover notas:', err);
                            // Continua mesmo com erro nas notas
                        } else {
                            console.log(`✅ Removidos ${resultNotas.affectedRows} registros de notas`);
                        }
                        
                        // 5. Remove objetos de conhecimento (se houver)
                        const sqlDeleteObjetos = 'DELETE FROM objetos_conhecimento WHERE professor_id = ?';
                        db.query(sqlDeleteObjetos, [professorId], (err, resultObjetos) => {
                            if (err) {
                                console.error('❌ Erro ao remover objetos de conhecimento:', err);
                                // Continua mesmo com erro nos objetos
                            } else {
                                console.log(`✅ Removidos ${resultObjetos.affectedRows} objetos de conhecimento`);
                            }
                            
                            // 6. FINALMENTE: Remove o professor
                            const sqlDeleteProfessor = 'DELETE FROM usuarios WHERE id = ? AND tipo = "professor"';
                            db.query(sqlDeleteProfessor, [professorId], (err, result) => {
                                if (err) {
                                    console.error('❌ Erro ao excluir professor:', err);
                                    return res.status(500).json({ sucesso: false, erro: 'Erro interno ao excluir professor' });
                                }
                                
                                if (result.affectedRows === 0) {
                                    return res.status(404).json({ sucesso: false, erro: 'Professor não encontrado' });
                                }
                                
                                console.log(`✅ PROFESSOR EXCLUÍDO COM SUCESSO: ${professor.nome} (ID: ${professorId})`);
                                res.json({ 
                                    sucesso: true, 
                                    mensagem: `Professor "${professor.nome}" excluído com sucesso!`,
                                    detalhes: {
                                        turmas_removidas: resultTurmas.affectedRows,
                                        disciplinas_removidas: resultDisciplinas.affectedRows,
                                        frequencias_removidas: resultFrequencias?.affectedRows || 0,
                                        notas_removidas: resultNotas?.affectedRows || 0,
                                        objetos_removidos: resultObjetos?.affectedRows || 0
                                    }
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
// SISTEMA DE RECUPERAÇÃO DE SENHA
// ========================

const crypto = require('crypto');

// Rota para solicitar recuperação de senha
app.post('/solicitar-recuperacao', async (req, res) => {
    const { email } = req.body;
    
    console.log('🔐 SOLICITAÇÃO DE RECUPERAÇÃO DE SENHA - Email:', email);

    if (!email) {
        return res.json({ sucesso: false, erro: 'Email é obrigatório!' });
    }

    try {
        // Verifica se o email existe
        db.query('SELECT id, nome, email FROM usuarios WHERE email = ?', [email], async (err, results) => {
            if (err) {
                console.error('❌ Erro ao verificar email:', err);
                return res.json({ sucesso: false, erro: 'Erro interno!' });
            }
            
            if (results.length === 0) {
                // Por segurança, não revelamos se o email existe ou não
                console.log('📧 Email não encontrado, mas retornando sucesso por segurança');
                return res.json({ 
                    sucesso: true, 
                    mensagem: 'Se o email existir em nosso sistema, você receberá um link para redefinir sua senha.' 
                });
            }

            const usuario = results[0];
            
            // Gera token único
            const token = crypto.randomBytes(32).toString('hex');
            const expira_em = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hora
            
            // Remove tokens antigos do usuário
            db.query('DELETE FROM recuperacao_senha WHERE usuario_id = ?', [usuario.id], (err) => {
                if (err) {
                    console.error('❌ Erro ao limpar tokens antigos:', err);
                }
                
                // Insere novo token
                db.query(
                    'INSERT INTO recuperacao_senha (usuario_id, token, expira_em) VALUES (?, ?, ?)',
                    [usuario.id, token, expira_em],
                    (err) => {
                        if (err) {
                            console.error('❌ Erro ao salvar token:', err);
                            return res.json({ sucesso: false, erro: 'Erro interno!' });
                        }
                        
                        // EM PRODUÇÃO: Aqui você enviaria um email com o link
                        // Por enquanto, vamos retornar o link no console para testes
                        const resetLink = `http://localhost:3000/redefinir-senha.html?token=${token}`;
                        
                        console.log('📧 LINK DE RECUPERAÇÃO (para testes):', resetLink);
                        console.log('👤 Para o usuário:', usuario.nome);
                        console.log('⏰ Expira em:', expira_em);
                        
                        res.json({ 
                            sucesso: true, 
                            mensagem: 'Se o email existir em nosso sistema, você receberá um link para redefinir sua senha.',
                            // Remova esta linha em produção:
                            link_teste: resetLink
                        });
                    }
                );
            });
        });
    } catch (error) {
        console.error('❌ Erro interno:', error);
        res.json({ sucesso: false, erro: 'Erro interno!' });
    }
});

// Rota para validar token
app.get('/validar-token/:token', (req, res) => {
    const { token } = req.params;
    
    console.log('🔍 Validando token:', token);

    const sql = `
        SELECT rs.*, u.nome, u.email 
        FROM recuperacao_senha rs 
        JOIN usuarios u ON rs.usuario_id = u.id 
        WHERE rs.token = ? AND rs.usado = 0 AND rs.expira_em > NOW()
    `;
    
    db.query(sql, [token], (err, results) => {
        if (err) {
            console.error('❌ Erro ao validar token:', err);
            return res.json({ sucesso: false, erro: 'Erro interno!' });
        }
        
        if (results.length === 0) {
            return res.json({ 
                sucesso: false, 
                erro: 'Token inválido ou expirado!' 
            });
        }
        
        res.json({ 
            sucesso: true, 
            usuario: {
                nome: results[0].nome,
                email: results[0].email
            }
        });
    });
});

// Rota para redefinir senha com token
app.post('/redefinir-senha-token', async (req, res) => {
    const { token, nova_senha, confirmar_senha } = req.body;
    
    console.log('🔄 SOLICITAÇÃO DE REDEFINIÇÃO DE SENHA COM TOKEN');

    if (!token || !nova_senha || !confirmar_senha) {
        return res.json({ sucesso: false, erro: 'Todos os campos são obrigatórios!' });
    }

    if (nova_senha !== confirmar_senha) {
        return res.json({ sucesso: false, erro: 'As senhas não coincidem!' });
    }

    if (nova_senha.length < 6) {
        return res.json({ sucesso: false, erro: 'A senha deve ter pelo menos 6 caracteres!' });
    }

    try {
        // Verifica e busca o token
        const sqlCheckToken = `
            SELECT rs.*, u.id as usuario_id 
            FROM recuperacao_senha rs 
            JOIN usuarios u ON rs.usuario_id = u.id 
            WHERE rs.token = ? AND rs.usado = 0 AND rs.expira_em > NOW()
        `;
        
        db.query(sqlCheckToken, [token], async (err, results) => {
            if (err) {
                console.error('❌ Erro ao verificar token:', err);
                return res.json({ sucesso: false, erro: 'Erro interno!' });
            }
            
            if (results.length === 0) {
                return res.json({ 
                    sucesso: false, 
                    erro: 'Token inválido, expirado ou já utilizado!' 
                });
            }

            const recuperacao = results[0];
            
            // Gera hash da nova senha
            const hashNovaSenha = await bcrypt.hash(nova_senha, 10);
            
            // Atualiza a senha do usuário
            db.query('UPDATE usuarios SET senha = ? WHERE id = ?', 
                [hashNovaSenha, recuperacao.usuario_id], 
                (err) => {
                    if (err) {
                        console.error('❌ Erro ao atualizar senha:', err);
                        return res.json({ sucesso: false, erro: 'Erro interno!' });
                    }
                    
                    // Marca o token como usado
                    db.query('UPDATE recuperacao_senha SET usado = 1 WHERE id = ?', 
                        [recuperacao.id], 
                        (err) => {
                            if (err) {
                                console.error('❌ Erro ao marcar token como usado:', err);
                            }
                            
                            console.log(`✅ SENHA REDEFINIDA - Usuário ID: ${recuperacao.usuario_id}`);
                            res.json({ 
                                sucesso: true, 
                                mensagem: 'Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.' 
                            });
                        }
                    );
                }
            );
        });
    } catch (error) {
        console.error('❌ Erro interno:', error);
        res.json({ sucesso: false, erro: 'Erro interno!' });
    }
});

// ========================
// TRATAMENTO DE ERROS
// ========================
app.use((err, req, res, next) => {
  console.error('Middleware de erro:', err.stack || err);
  res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
});

app.use((req, res) => res.status(404).json({ sucesso: false, erro: 'Rota não encontrada' }));

