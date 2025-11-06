// script-login.js

document.addEventListener('DOMContentLoaded', () => {
  if (!window.apiService) {
    console.error('❌ apiService não carregado! Verifique se api-service.js está antes deste script no HTML.');
    return;
  }

  console.log('✅ Script de Login e Cadastro carregado!');
  voltarSelecao();
});

// Função auxiliar para chamadas à API com tratamento padrão
// ------------------------
async function apiFetch(path, options = {}) {
  try {
    let data;

    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      if (path === '/login') {
        data = await apiService.login(body);
      } else if (path === '/cadastro') {
        data = await apiService.cadastro(body);
      }
    }

    return data;
  } catch (error) {
    console.error('Erro no apiFetch:', error);
    throw error;
  }
}

// ------------------------
// FUNÇÕES DE MOSTRAR/OCULTAR CONTAINERS
// ------------------------
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
    if (el) el.style.display = 'none';
  });
}

function mostrarLogin(tipo) {
  esconderTodos();
  document.getElementById(`login-${tipo}-container`).style.display = 'block';
}

function mostrarCadastro(tipo) {
  esconderTodos();
  document.getElementById(`cadastro-${tipo}-container`).style.display = 'block';
}

function voltarSelecao() {
  esconderTodos();
  document.getElementById('tipo-login-container').style.display = 'block';
}

// ------------------------
// Helpers UI
// ------------------------
function bloquearBotao(botaoId, bloquear = true) {
  const btn = document.getElementById(botaoId);
  if (!btn) return;
  btn.disabled = bloquear;
  if (bloquear) {
    btn.dataset.originalText = btn.innerText;
    btn.innerText = 'Aguarde...';
  } else {
    btn.innerText = btn.dataset.originalText || btn.innerText;
  }
}

// ------------------------
// LOGIN DE PROFESSOR E ADMIN
// ------------------------
async function fazerLogin(tipo) {
  let btnId = '';

  try {
    let body;
    const emailEl = document.getElementById(`login-${tipo}-email`);
    const senhaEl = document.getElementById(`login-${tipo}-senha`);
    const email = emailEl?.value.trim();
    const senha = senhaEl?.value;

    btnId = `btn-login-${tipo}`;

    if (!email || !senha) {
      alert('Preencha e-mail e senha!');
      return;
    }

    body = { email, senha };
    bloquearBotao(btnId, true);

    const data = await apiService.login(body);
    console.log('Resposta do servidor:', data);

    if (data?.sucesso && data.usuario) {
      const usuarioParaSalvar = {
        id: data.usuario.id ?? data.usuario._id ?? null,
        nome: data.usuario.nome ?? data.usuario.name ?? '',
        tipo: data.usuario.tipo ?? data.usuario.role ?? ''
      };
      localStorage.setItem('usuarioLogado', JSON.stringify(usuarioParaSalvar));

      if (['administrador', 'admin'].includes(usuarioParaSalvar.tipo)) {
        window.location.href = 'admin.html';
      } else if (usuarioParaSalvar.tipo === 'professor') {
        window.location.href = 'pagina-professor.html';
      } else {
        alert('Login efetuado, mas tipo de usuário não reconhecido.');
      }
    } else {
      alert('Erro: ' + (data?.erro || 'Resposta inesperada do servidor.'));
    }
  } catch (error) {
    console.error('Erro no login:', error);
    alert('Erro na conexão ou credenciais incorretas:\n' + (error.message || error));
  } finally {
    if (btnId) bloquearBotao(btnId, false);
  }
}

// ------------------------
// CADASTRO DE PROFESSOR E ADMIN
// ------------------------
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

    const body = { nome, email, senha, tipo: tipo === 'admin' ? 'administrador' : 'professor' };
    bloquearBotao(btnId, true);

    const data = await apiService.cadastro(body);

    if (data?.sucesso) {
      alert('Cadastro realizado com sucesso!');
      mostrarLogin(tipo);

      ['nome', 'email', 'senha'].forEach(campo => {
        const input = document.getElementById(`cadastro-${tipo}-${campo}`);
        if (input) input.value = '';
      });
    } else {
      alert('Erro: ' + (data?.erro || 'Resposta inesperada do servidor.'));
    }
  } catch (error) {
    console.error('Erro no cadastro:', error);
    alert('Erro de conexão ou validação:\n' + (error.message || error));
  } finally {
    if (btnId) bloquearBotao(btnId, false);
  }
}

// ------------------------
// VERIFICAÇÃO AUTOMÁTICA DE LOGIN AO CARREGAR PÁGINA
// ------------------------
document.addEventListener('DOMContentLoaded', () => {
  const usuario = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
  const current = window.location.pathname.split('/').pop() || 'index.html';

  if (usuario) {
    if (usuario.tipo === 'professor' && !current.includes('pagina-professor.html')) {
      window.location.href = 'pagina-professor.html';
      return;
    } else if (['administrador', 'admin'].includes(usuario.tipo) && !current.includes('admin.html')) {
      window.location.href = 'admin.html';
      return;
    }
  } else {
    if (!current.includes('index.html') && current !== '') {
      window.location.href = 'index.html';
      return;
    }
  }

  voltarSelecao();
});
