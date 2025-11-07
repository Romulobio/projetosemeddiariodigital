// script-admin.js - VERSÃO SEM API-SERVICE
console.log('✅ Script do admin carregado!');

// URL base do backend (Railway) - MESMA DO script-login.js
const BASE_URL = 'https://prosemeddiariodigital-production.up.railway.app';

// Função genérica de requisição à API (MESMA DO script-login.js)
async function apiFetch(endpoint, data) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro na comunicação com o servidor:', error);
    alert('Erro ao conectar ao servidor.');
    throw error;
  }
}

// Funções específicas para GET, PUT, DELETE
async function apiGet(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro na comunicação com o servidor:', error);
    alert('Erro ao conectar ao servidor.');
    throw error;
  }
}

async function apiDelete(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro na comunicação com o servidor:', error);
    alert('Erro ao conectar ao servidor.');
    throw error;
  }
}

// ================== FUNÇÕES DO SISTEMA ==================
document.addEventListener("DOMContentLoaded", () => {
  const views = document.querySelectorAll(".view");
  const menuButtons = document.querySelectorAll(".nav button");
  const msgVinculo = document.getElementById("vinculos-msg");

  // ================== Alternar abas ==================
  menuButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      menuButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      views.forEach(v => (v.style.display = "none"));
      const id = `view-${btn.dataset.view}`;
      document.getElementById(id).style.display = "block";
    });
  });

  // ================== CONFIGURAR FORMULÁRIO DE CADASTRO DE ADMIN ==================
  const formCadastroAdmin = document.getElementById('form-cadastro-admin');
  if (formCadastroAdmin) {
    formCadastroAdmin.addEventListener('submit', cadastrarNovoAdmin);
    console.log('✅ Formulário de cadastro de admin configurado');
  }
  
  // Observar quando a aba de configurações for aberta
  const configView = document.getElementById('view-configuracoes');
  if (configView) {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          if (configView.style.display !== 'none') {
            console.log('🔧 Aba de Configurações aberta - verificando permissões...');
            verificarPermissoesCadastroAdmin();
          }
        }
      });
    });
    
    observer.observe(configView, { attributes: true });
  }

  // ================== CADASTRAR TURMA ==================
  document.getElementById("form-turma").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));

    try {
      const json = await apiFetch('/api/turmas', data);
      alert(json.mensagem || json.erro || "Erro ao cadastrar turma");
      if (json.sucesso) {
        form.reset();
        carregarTurmas();
        carregarSelectsTurmas();
        atualizarContagens();
      }
    } catch (error) {
      alert("Erro ao cadastrar turma");
      console.error(error);
    }
  });

  // ================== CADASTRAR ALUNO ==================
  document.getElementById("form-aluno").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const nome = form.nome.value;
    const turma_id = form.turma_id.value;

    if (!nome || !turma_id) {
      alert("Preencha nome e selecione uma turma!");
      return;
    }

    try {
      const json = await apiFetch('/api/cadastro', { 
        nome, 
        email: `${nome.toLowerCase().replace(/\s+/g, '.')}@aluno.escola`, 
        senha: "123456",
        tipo: "aluno",
        turma_id 
      });
      if (json.sucesso) {
        alert(json.mensagem || "Aluno cadastrado com sucesso!");
        form.reset();
        carregarAlunos();
        atualizarContagens();
      } else {
        alert(json.erro || "Erro ao cadastrar aluno");
      }
    } catch (err) {
      console.error("Erro ao carregar aluno:", err);
      alert("Erro ao cadastrar aluno");
    }
  });

  // ================== CADASTRAR PROFESSOR ==================
  document.getElementById("form-professor").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      nome: form.nome.value,
      email: form.email.value,
      senha: "123456",
      tipo: "professor",
    };
    try {
      const json = await apiFetch('/api/cadastro', data);
      msgVinculo.textContent = json.mensagem || json.erro;
      msgVinculo.className = json.sucesso ? "success" : "error";
      if (json.sucesso) {
        form.reset();
        carregarProfessores();
        atualizarContagens();
      }
    } catch (error) {
      msgVinculo.textContent = "Erro ao cadastrar professor.";
      msgVinculo.className = "error";
    }
  });

  // ================== VINCULAR PROFESSOR À TURMA ==================
  document.getElementById("btn-vincular").addEventListener("click", async () => {
    const professorId = document.getElementById("select-professor").value;
    const turmaId = document.getElementById("select-turma-vinculo").value;
    if (!professorId || !turmaId) {
      msgVinculo.textContent = "Selecione um professor e uma turma!";
      msgVinculo.className = "error";
      return;
    }

    try {
      const json = await apiFetch('/api/vincular-professor', { professorId, turmaId });
      msgVinculo.textContent = json.message || json.erro;
      msgVinculo.className = json.success ? "success" : "error";
      if (json.success) {
        carregarTurmas();
        carregarProfessores();
      }
    } catch (error) {
      msgVinculo.textContent = "Erro ao vincular professor à turma.";
      msgVinculo.className = "error";
    }
  });

  // ================== LOGOUT ==================
  document.getElementById("btn-logout").addEventListener("click", async () => {
    try {
      await apiFetch('/logout', {});
      localStorage.removeItem('usuarioLogado');
      window.location.href = "index.html";
    } catch (error) {
      console.error('Erro no logout:', error);
      localStorage.removeItem('usuarioLogado');
      window.location.href = "index.html";
    }
  });

  // ================== INICIALIZAÇÃO ==================
  carregarTurmas();
  carregarAlunos();
  carregarProfessores();
  carregarSelectsTurmas();
  atualizarContagens();
  carregarAdministradores();
});

// ================== FUNÇÕES DE CARREGAMENTO DE DADOS ==================

async function carregarTurmas() {
  try {
    const data = await apiGet('/api/turmas');
    if (!data.sucesso) throw new Error(data.erro || "Erro ao carregar turmas");

    const tbody = document.querySelector("#table-turmas tbody");
    tbody.innerHTML = "";
    
    data.turmas.forEach((turma) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${turma.nome}</strong></td>
        <td>${turma.ano}</td>
        <td>${turma.turno}</td>
        <td>${turma.professores || "<span style='color:#666; font-style:italic;'>Sem professor</span>"}</td>
        <td style="text-align:right">
          <button class="btn small danger" onclick="excluirTurma(${turma.id})">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    document.getElementById("count-turmas").textContent = data.turmas.length;
  } catch (error) {
    console.error("Erro ao carregar turmas:", error);
    alert("Erro ao carregar turmas!");
  }
}

async function carregarAlunos() {
  const tbody = document.querySelector('#table-alunos tbody');
  if (!tbody) {
    console.error('Tabela de alunos não encontrada!');
    return;
  }
  tbody.innerHTML = '';
  
  try {
    const data = await apiGet('/api/alunos');
    
    if (data.sucesso && data.alunos.length > 0) {
      let turmaAtual = '';
      
      data.alunos.forEach(aluno => {
        if (aluno.turma !== turmaAtual) {
          turmaAtual = aluno.turma;
          
          const headerRow = document.createElement('tr');
          headerRow.className = 'turma-header';
          headerRow.innerHTML = `
            <td colspan="3">🏫 ${turmaAtual || 'Sem turma'}</td>
          `;
          tbody.appendChild(headerRow);
        }
        
        const tr = document.createElement('tr');
        tr.className = 'aluno-row';
        tr.innerHTML = `
          <td>${aluno.nome}</td>
          <td>${aluno.turma || 'Sem turma'}</td>
          <td style="text-align: right;">
            <button class="btn small danger" onclick="excluirAluno(${aluno.id})">🗑️</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="3" class="empty-state">
          Nenhum aluno cadastrado
        </td>
      `;
      tbody.appendChild(tr);
    }
  } catch (err) {
    console.error('Erro ao carregar alunos:', err);
  }
}

async function carregarProfessores() {
  try {
    const data = await apiGet('/api/professores');
    if (!data.sucesso) throw new Error(data.erro || "Erro ao carregar professores");

    const select = document.getElementById("select-professor");
    select.innerHTML = "<option value=''>Selecione</option>";

    const tbody = document.querySelector("#table-professores tbody");
    tbody.innerHTML = "";

    data.professores.forEach((prof) => {
      const opt = document.createElement("option");
      opt.value = prof.id;
      opt.textContent = prof.nome;
      select.appendChild(opt);

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${prof.nome}</strong></td>
        <td>${prof.email}</td>
        <td>${prof.turmas || 'Nenhuma'}</td>
        <td>${prof.disciplinas || 'Nenhuma'}</td>
        <td style="text-align:right">
          <button class="btn small danger" onclick="excluirProfessor(${prof.id})">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    document.getElementById("count-professores").textContent = data.professores.length;
  } catch (err) {
    console.error("Erro ao carregar professores:", err);
    alert("Erro ao carregar professores!");
  }
}

// ================== FUNÇÕES DE EXCLUSÃO ==================

window.excluirAluno = async function(id) {
  if (!confirm('Tem certeza que deseja excluir este aluno?')) return;
  
  try {
    const data = await apiDelete(`/api/alunos/${id}`);
    
    if (data.sucesso) {
      alert('Aluno excluído com sucesso!');
      carregarAlunos();
      atualizarContagens();
    } else {
      alert(data.erro || 'Erro ao excluir aluno');
    }
  } catch (err) {
    console.error('Erro ao excluir aluno:', err);
    alert('Erro ao excluir aluno');
  }
}

window.excluirProfessor = async function(id) {
  if (!confirm('Tem certeza que deseja excluir este professor?')) return;
  
  try {
    const data = await apiDelete(`/api/professores/${id}`);
    
    if (data.sucesso) {
      alert('Professor excluído com sucesso!');
      carregarProfessores();
      atualizarContagens();
    } else {
      alert(data.erro || 'Erro ao excluir professor');
    }
  } catch (err) {
    console.error('Erro ao excluir professor:', err);
    alert('Erro ao excluir professor');
  }
}

window.excluirTurma = async function(id) {
  if (!confirm('Tem certeza que deseja excluir esta turma?')) return;
  
  try {
    const data = await apiDelete(`/api/turmas/${id}`);
    
    if (data.sucesso) {
      alert('Turma excluída com sucesso!');
      carregarTurmas();
      carregarSelectsTurmas();
      atualizarContagens();
    } else {
      alert(data.erro || 'Erro ao excluir turma');
    }
  } catch (err) {
    console.error('Erro ao excluir turma:', err);
    alert('Erro ao excluir turma');
  }
}

// ================== FUNÇÕES AUXILIARES ==================

async function carregarSelectsTurmas() {
  const selectTurmaAluno = document.getElementById("select-turma-aluno");
  const selectTurmaVinculo = document.getElementById("select-turma-vinculo");
  try {
    const data = await apiGet('/api/turmas');
    selectTurmaAluno.innerHTML = "";
    selectTurmaVinculo.innerHTML = "";
    if (data.sucesso) {
      data.turmas.forEach((turma) => {
        const opt1 = document.createElement("option");
        opt1.value = turma.id;
        opt1.textContent = turma.nome;
        selectTurmaAluno.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = turma.id;
        opt2.textContent = turma.nome;
        selectTurmaVinculo.appendChild(opt2);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function atualizarContagens() {
  try {
    const [t1, t2, t3] = await Promise.all([
      apiGet('/api/turmas'),
      apiGet('/api/professores'),
      apiGet('/api/alunos'),
    ]);
    document.getElementById("count-turmas").textContent = t1.turmas?.length || 0;
    document.getElementById("count-professores").textContent = t2.professores?.length || 0;
    document.getElementById("count-alunos").textContent = t3.alunos?.length || 0;
  } catch (err) {
    console.error("Erro ao atualizar contagens", err);
  }
}

// ================== FUNÇÕES DE ADMIN MASTER ==================

// Verificar se o usuário atual é admin master
async function verificarAdminMaster() {
    try {
        const data = await apiGet('/api/admin/verificar-master');
        return data.sucesso && data.is_master;
    } catch (error) {
        console.error('Erro ao verificar permissões master:', error);
        return false;
    }
}

// Carregar administradores para gerenciamento (apenas para masters)
async function carregarAdministradores() {
    try {
        const isMaster = await verificarAdminMaster();
        const select = document.getElementById('select-admins');
        const secaoCadastroAdmin = document.getElementById('secaoCadastroAdmin');
        const secaoAdminMaster = document.getElementById('secaoAdminMaster');

        // Mostrar/ocultar seções baseado nas permissões
        if (secaoCadastroAdmin) {
            secaoCadastroAdmin.style.display = isMaster ? 'block' : 'none';
        }
        if (secaoAdminMaster) {
            secaoAdminMaster.style.display = isMaster ? 'block' : 'none';
        }

        if (!isMaster) {
            select.innerHTML = '<option value="">Apenas administradores masters podem gerenciar permissões</option>';
            return;
        }

        select.innerHTML = '<option value="">Carregando administradores...</option>';
        
        const data = await apiGet('/api/admin/administradores');
        
        if (data.sucesso) {
            select.innerHTML = '<option value="">Selecione um administrador</option>';
            data.administradores.forEach(admin => {
                const option = document.createElement('option');
                option.value = admin.id;
                option.textContent = `${admin.nome} (${admin.email}) ${admin.pode_criar_admin ? '👑 Master' : '👤 Básico'}`;
                option.setAttribute('data-master', admin.pode_criar_admin);
                select.appendChild(option);
            });
            
            select.addEventListener('change', mostrarInfoPermissao);
        }
    } catch (error) {
        console.error('Erro ao carregar administradores:', error);
    }
}

// Mostrar informações da permissão selecionada
function mostrarInfoPermissao() {
    const select = document.getElementById('select-admins');
    const adminId = select.value;
    const infoDiv = document.getElementById('info-permissoes');
    
    if (!adminId) {
        infoDiv.innerHTML = '<p style="margin:0; color:#666; font-style:italic;">Selecione um administrador para ver as permissões.</p>';
        return;
    }
    
    const selectedOption = select.options[select.selectedIndex];
    const isMaster = selectedOption.getAttribute('data-master') === '1';
    
    let html = '';
    if (isMaster) {
        html = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="background:#4CAF50; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">
                    👑 ADMINISTRADOR MASTER
                </div>
                <span style="color:#2E7D32; font-size:14px;">
                    Pode criar novos administradores e gerenciar todo o sistema
                </span>
            </div>
            <p style="margin:8px 0 0 0; color:#666; font-size:12px;">
                <strong>Ações permitidas:</strong> Criar administradores, gerenciar professores, turmas, alunos e configurações do sistema.
            </p>
        `;
    } else {
        html = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="background:#FF9800; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">
                    👤 ADMINISTRADOR BÁSICO
                </div>
                <span style="color:#E65100; font-size:14px;">
                    Permissões limitadas de administração
                </span>
            </div>
            <p style="margin:8px 0 0 0; color:#666; font-size:12px;">
                <strong>Ações permitidas:</strong> Gerenciar professores, turmas e alunos. <strong>Não pode</strong> criar novos administradores.
            </p>
        `;
    }
    
    infoDiv.innerHTML = html;
}

// Alternar permissão de administrador
async function alternarPermissaoAdmin() {
    const select = document.getElementById('select-admins');
    const adminId = select.value;
    
    if (!adminId) {
        alert('Selecione um administrador primeiro!');
        return;
    }
    
    const selectedOption = select.options[select.selectedIndex];
    const isCurrentlyMaster = selectedOption.getAttribute('data-master') === '1';
    const newPermission = !isCurrentlyMaster;
    
    const confirmMessage = isCurrentlyMaster 
        ? 'Tem certeza que deseja REMOVER as permissões master deste administrador?\n\nEle não poderá mais criar novos administradores.'
        : 'Tem certeza que deseja CONCEDER permissões master para este administrador?\n\nEle poderá criar novos administradores.';
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const data = await apiFetch('/api/admin/toggle-permission', {
            admin_id: adminId,
            pode_criar_admin: newPermission
        });
        
        if (data.sucesso) {
            alert(`✅ ${data.mensagem}`);
            carregarAdministradores();
        } else {
            alert('❌ ' + data.erro);
        }
    } catch (error) {
        console.error('Erro ao alternar permissão:', error);
        alert('❌ Erro de conexão ao atualizar permissões!');
    }
}

// Carregar usuários para redefinição de senha
async function carregarUsuariosRedefinicaoSenha() {
    try {
        const isMaster = await verificarAdminMaster();
        const select = document.getElementById('selectUsuarioSenha');
        
        if (!isMaster) {
            select.innerHTML = '<option value="">Apenas administradores masters</option>';
            return;
        }

        select.innerHTML = '<option value="">Carregando usuários...</option>';
        
        const data = await apiGet('/api/admin/todos-usuarios');
        
        if (data.sucesso) {
            select.innerHTML = '<option value="">Selecione um usuário</option>';
            data.usuarios.forEach(usuario => {
                const option = document.createElement('option');
                option.value = usuario.id;
                option.textContent = `${usuario.nome} (${usuario.email}) - ${usuario.tipo}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        document.getElementById('selectUsuarioSenha').innerHTML = '<option value="">Erro ao carregar usuários</option>';
    }
}

// Redefinir senha de usuário (admin master)
async function redefinirSenhaUsuario() {
    const usuarioId = document.getElementById('selectUsuarioSenha').value;
    const novaSenha = document.getElementById('novaSenhaUsuario').value;

    if (!usuarioId) {
        alert('Selecione um usuário!');
        return;
    }

    if (!novaSenha || novaSenha.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres!');
        return;
    }

    try {
        const result = await apiFetch('/admin/redefinir-senha', {
            usuario_id: usuarioId,
            nova_senha: novaSenha
        });

        if (result.sucesso) {
            alert('✅ ' + result.mensagem);
            document.getElementById('novaSenhaUsuario').value = '';
        } else {
            alert('❌ ' + result.erro);
        }
    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        alert('❌ Erro ao redefinir senha!');
    }
}

// Excluir usuário (admin master)
async function excluirUsuario(usuarioId, usuarioNome) {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${usuarioNome}"?\n\nEsta ação não pode ser desfeita!`)) {
        return;
    }
    
    try {
        const data = await apiDelete(`/api/admin/usuarios/${usuarioId}`);
        
        if (data.sucesso) {
            alert('✅ ' + data.mensagem);
            // Recarregar dados conforme necessário
            carregarUsuariosRedefinicaoSenha();
        } else {
            alert('❌ ' + data.erro);
        }
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('❌ Erro ao excluir usuário!');
    }
}

// ================== FUNÇÕES DE CADASTRO DE ADMINISTRADOR ==================

async function verificarPermissoesCadastroAdmin() {
    try {
        const isMaster = await verificarAdminMaster();
        const secaoCadastroAdmin = document.getElementById('secaoCadastroAdmin');
        const mensagemDiv = document.getElementById('mensagemCadastroAdmin');
        
        if (isMaster) {
            secaoCadastroAdmin.style.display = 'block';
            mensagemDiv.innerHTML = `<p style="color: #4CAF50; margin: 0;">✅ Você tem permissão para cadastrar novos administradores</p>`;
            mensagemDiv.style.display = 'block';
        } else {
            secaoCadastroAdmin.style.display = 'block'; // Mantém visível para mostrar mensagem
            mensagemDiv.innerHTML = `<p style="color: #f44336; margin: 0;">❌ Apenas administradores masters podem cadastrar novos administradores</p>`;
            mensagemDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        const mensagemDiv = document.getElementById('mensagemCadastroAdmin');
        mensagemDiv.innerHTML = `<p style="color: #f44336; margin: 0;">❌ Erro ao verificar permissões</p>`;
        mensagemDiv.style.display = 'block';
    }
}

async function cadastrarNovoAdmin(event) {
    if (event) event.preventDefault();
    
    // Verificar se é master antes de prosseguir
    const isMaster = await verificarAdminMaster();
    if (!isMaster) {
        alert('❌ Apenas administradores masters podem cadastrar novos administradores!');
        return;
    }
    
    const nome = document.getElementById('nomeAdmin').value.trim();
    const email = document.getElementById('emailAdmin').value.trim();
    const senha = document.getElementById('senhaAdmin').value;
    
    const mensagemDiv = document.getElementById('mensagemCadastroAdmin');
    
    // Validações
    if (!nome || !email || !senha) {
        mostrarMensagemCadastro('❌ Preencha todos os campos!', 'erro');
        return;
    }
    
    if (senha.length < 6) {
        mostrarMensagemCadastro('❌ A senha deve ter pelo menos 6 caracteres!', 'erro');
        return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
        mostrarMensagemCadastro('❌ Digite um email válido!', 'erro');
        return;
    }
    
    try {
        mostrarMensagemCadastro('⏳ Cadastrando administrador...', 'info');
        
        const result = await apiFetch('/api/cadastro', {
            nome: nome,
            email: email,
            senha: senha,
            tipo: 'administrador'
        });
        
        console.log('📨 Resposta do cadastro:', result);
        
        if (result.sucesso) {
            mostrarMensagemCadastro('✅ ' + result.mensagem, 'sucesso');
            // Limpar formulário
            document.getElementById('form-cadastro-admin').reset();
            
            // Atualizar lista de administradores
            if (typeof carregarAdministradores === 'function') {
                setTimeout(carregarAdministradores, 1000);
            }
        } else {
            mostrarMensagemCadastro('❌ ' + result.erro, 'erro');
        }
    } catch (error) {
        console.error('Erro no cadastro:', error);
        mostrarMensagemCadastro('❌ Erro de conexão ao cadastrar administrador!', 'erro');
    }
}

function mostrarMensagemCadastro(texto, tipo) {
    const mensagemDiv = document.getElementById('mensagemCadastroAdmin');
    mensagemDiv.innerHTML = `<p style="margin: 0;">${texto}</p>`;
    
    if (tipo === 'sucesso') {
        mensagemDiv.style.backgroundColor = '#d4edda';
        mensagemDiv.style.color = '#155724';
        mensagemDiv.style.border = '1px solid #c3e6cb';
    } else if (tipo === 'erro') {
        mensagemDiv.style.backgroundColor = '#f8d7da';
        mensagemDiv.style.color = '#721c24';
        mensagemDiv.style.border = '1px solid #f5c6cb';
    } else {
        mensagemDiv.style.backgroundColor = '#d1ecf1';
        mensagemDiv.style.color = '#0c5460';
        mensagemDiv.style.border = '1px solid #bee5eb';
    }
    
    mensagemDiv.style.display = 'block';
    mensagemDiv.style.padding = '12px';
    mensagemDiv.style.borderRadius = '6px';
    mensagemDiv.style.marginTop = '15px';
}

// Adicionar event listeners para funções de admin master
document.addEventListener("DOMContentLoaded", function() {
    // Botão de alternar permissão
    const btnToggleAdmin = document.getElementById('btn-toggle-admin');
    if (btnToggleAdmin) {
        btnToggleAdmin.addEventListener('click', alternarPermissaoAdmin);
    }
    
    // Observar quando a aba de senhas for aberta
    const senhasView = document.getElementById('view-Senhas');
    if (senhasView) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (senhasView.style.display !== 'none') {
                        console.log('🔧 Aba de Senhas aberta - carregando usuários...');
                        carregarUsuariosRedefinicaoSenha();
                    }
                }
            });
        });
        
        observer.observe(senhasView, { attributes: true });
    }
});