// ======================================
// script-login.js - VERSÃO FINAL CORRIGIDA (2025)
// ======================================

// Detecta automaticamente se está em localhost ou produção
const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000" // Backend local
  : "https://prosemeddiariodigital-production.up.railway.app"; // Backend Railway

console.log("🌐 Backend ativo:", BASE_URL);

// ======================================
// Função genérica de requisição à API
// ======================================
async function apiFetch(endpoint, data) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include', // importante para sessions
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Erro na comunicação com o servidor:', error);
    alert('Erro ao conectar ao servidor. Verifique sua conexão.');
    throw error;
  }
}

// ======================================
// Funções de exibição e controle da interface
// ======================================
function esconderTodos() {
  const ids = [
    'tipo-login-container',
    'login-professor-container',
    'login-admin-container',
    'cadastro-professor-container',
    'cadastro-admin-container'
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
}
// ==================================================
// Torna funções acessíveis ao HTML (escopo global)
// ==================================================
window.mostrarLogin = function (tipo) {
  document.getElementById("tipo-login-container").hidden = true;
  document.getElementById(`login-${tipo}-container`).hidden = false;
};

window.voltarSelecao = function () {
  document.getElementById("login-professor-container").hidden = true;
  document.getElementById("login-admin-container").hidden = true;
  document.getElementById("cadastro-professor-container").hidden = true;
  document.getElementById("cadastro-admin-container").hidden = true;
  document.getElementById("tipo-login-container").hidden = false;
};

// ✅ Função global: mostrar tela de cadastro
window.mostrarCadastro = function (tipo) {
  esconderTodos();
  const el = document.getElementById(`cadastro-${tipo}-container`);
  if (el) {
    el.hidden = false;
    const nome = document.getElementById(`cadastro-${tipo}-nome`);
    const email = document.getElementById(`cadastro-${tipo}-email`);
    const senha = document.getElementById(`cadastro-${tipo}-senha`);
    if (nome) nome.value = '';
    if (email) email.value = '';
    if (senha) senha.value = '';
  }
};

// ✅ Função global: voltar para a tela de seleção
window.voltarSelecao = function () {
  esconderTodos();
  const tipo = document.getElementById('tipo-login-container');
  if (tipo) tipo.hidden = false;
};

// Bloqueia botão enquanto processa
function bloquearBotao(botaoId, bloquear = true) {
  const btn = document.getElementById(botaoId);
  if (!btn) return;

  btn.disabled = bloquear;
  if (bloquear) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Aguarde...';
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
  }
}

// ======================================
// LOGIN
// ======================================
window.fazerLogin = async function (tipo) {
  let btnId = '';
  try {
    const email = document.getElementById(`login-${tipo}-email`)?.value.trim();
    const senha = document.getElementById(`login-${tipo}-senha`)?.value;
    btnId = `btn-login-${tipo}`;

    if (!email || !senha) {
      alert('Preencha e-mail e senha!');
      return;
    }

    bloquearBotao(btnId, true);

    const data = await apiFetch('/api/login', { email, senha });
    console.log('🔑 Resposta do login:', data);

    if (data?.sucesso) {
      localStorage.setItem('usuarioLogado', JSON.stringify(data.usuario));

      if (data.usuario.tipo === 'administrador') {
        window.location.href = 'admin.html';
      } else if (data.usuario.tipo === 'professor') {
        window.location.href = 'pagina-professor.html';
      } else {
        alert('Tipo de usuário não reconhecido: ' + data.usuario.tipo);
      }
    } else {
      alert('Erro: ' + (data?.erro || 'Credenciais inválidas.'));
    }
  } catch (error) {
    console.error('❌ Erro no login:', error);
    alert('Falha ao fazer login. Tente novamente.');
  } finally {
    if (btnId) bloquearBotao(btnId, false);
  }
};

// ======================================
// CADASTRO
// ======================================
window.fazerCadastro = async function (tipo) {
  let btnId = '';
  try {
    const nome = document.getElementById(`cadastro-${tipo}-nome`)?.value.trim();
    const email = document.getElementById(`cadastro-${tipo}-email`)?.value.trim();
    const senha = document.getElementById(`cadastro-${tipo}-senha`)?.value;
    btnId = `btn-cadastrar-${tipo}`;

    if (!nome || !email || !senha) {
      alert('Preencha todos os campos!');
      return;
    }
    if (senha.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres!');
      return;
    }

    bloquearBotao(btnId, true);

    const data = await apiFetch('/api/cadastro', {
      nome,
      email,
      senha,
      tipo: tipo === 'admin' ? 'administrador' : 'professor',
    });

    console.log('📝 Resposta do cadastro:', data);

    if (data?.sucesso) {
      alert(data.mensagem || 'Cadastro realizado com sucesso!');
      mostrarLogin(tipo);
    } else {
      alert('Erro: ' + (data?.erro || 'Não foi possível cadastrar.'));
    }
  } catch (error) {
    console.error('❌ Erro no cadastro:', error);
    alert('Erro de conexão. Verifique sua internet e tente novamente.');
  } finally {
    if (btnId) bloquearBotao(btnId, false);
  }
};

// ======================================
// INICIALIZAÇÃO
// ======================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Sistema de login carregado.');
  window.voltarSelecao();
});
