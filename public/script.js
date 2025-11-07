// ======================================
// script-login.js - VERSÃO CORRIGIDA
// ======================================

// URL base do backend (Railway)
const BASE_URL = 'https://prosemeddiariodigital-production.up.railway.app';

// Função genérica de requisição à API
async function apiFetch(endpoint, data) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include', // Importante para sessions
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro na comunicação com o servidor:', error);
    alert('Erro ao conectar ao servidor. Verifique sua conexão.');
    throw error;
  }
}

// ======================================
// Funções de exibição e controle da UI
// ======================================
function esconderTodos() {
  const containers = [
    'tipo-login-container',
    'login-professor-container',
    'login-admin-container',
    'cadastro-professor-container',
    'cadastro-admin-container'
  ];
  
  containers.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.hidden = true;
    }
  });
}

function mostrarLogin(tipo) {
  esconderTodos();
  const container = document.getElementById(`login-${tipo}-container`);
  if (container) {
    container.hidden = false;
    // Limpar campos ao mostrar
    document.getElementById(`login-${tipo}-email`).value = '';
    document.getElementById(`login-${tipo}-senha`).value = '';
  }
}

function mostrarCadastro(tipo) {
  esconderTodos();
  const container = document.getElementById(`cadastro-${tipo}-container`);
  if (container) {
    container.hidden = false;
    // Limpar campos ao mostrar
    document.getElementById(`cadastro-${tipo}-nome`).value = '';
    document.getElementById(`cadastro-${tipo}-email`).value = '';
    document.getElementById(`cadastro-${tipo}-senha`).value = '';
  }
}

function voltarSelecao() {
  esconderTodos();
  document.getElementById('tipo-login-container').hidden = false;
}

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
async function fazerLogin(tipo) {
  let btnId = '';
  try {
    const emailEl = document.getElementById(`login-${tipo}-email`);
    const senhaEl = document.getElementById(`login-${tipo}-senha`);
    const email = emailEl?.value.trim();
    const senha = senhaEl?.value;
    btnId = `btn-login-${tipo}`;

    if (!email || !senha) {
      alert('Preencha e-mail e senha!');
      return;
    }

    bloquearBotao(btnId, true);
    const data = await apiFetch('/api/login', { email, senha });

    console.log('Resposta do login:', data);

    if (data?.sucesso) {
      // Salvar informações do usuário
      localStorage.setItem('usuarioLogado', JSON.stringify(data.usuario));
      
      // Redirecionar baseado no tipo
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
    console.error('Erro no login:', error);
    alert('Falha ao fazer login. Tente novamente.');
  } finally {
    if (btnId) bloquearBotao(btnId, false);
  }
}

// ======================================
// CADASTRO
// ======================================
async function fazerCadastro(tipo) {
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
      tipo: tipo === 'admin' ? 'administrador' : 'professor'
    });

    console.log('Resposta do cadastro:', data);

    if (data?.sucesso) {
      alert(data.mensagem || 'Cadastro realizado com sucesso!');
      mostrarLogin(tipo); // Voltar para tela de login
    } else {
      alert('Erro: ' + (data?.erro || 'Não foi possível cadastrar.'));
    }
  } catch (error) {
    console.error('Erro no cadastro:', error);
    alert('Erro de conexão. Verifique sua internet e tente novamente.');
  } finally {
    if (btnId) bloquearBotao(btnId, false);
  }
}

// ======================================
// INICIALIZAÇÃO
// ======================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 Inicializando sistema de login...');
  voltarSelecao();
});