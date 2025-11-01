// script.js - CONTROLE DE LOGIN E CADASTRO (PROFESSOR E ADMIN)

// ------------------------
// API_URL - APENAS PRODUÇÃO
// ------------------------
const API_URL = 'https://projetosemeddiariodigital-production.up.railway.app';

// ------------------------
// Função auxiliar para chamadas à API com tratamento padrão
// ------------------------
async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  // enviar cookies/sessão ao backend (se o backend suportar)
  options.credentials = options.credentials || 'include';
  options.headers = options.headers || {};

  try {
    const res = await fetch(url, options);

    // tenta ler JSON (se o servidor retornou JSON)
    let body = null;
    const text = await res.text().catch(() => null);
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      // não JSON
      body = text;
    }

    if (!res.ok) {
      // res.status >= 400
      const errMsg = body && body.erro ? body.erro : (body && body.message ? body.message : `HTTP ${res.status}`);
      throw new Error(errMsg);
    }

    return body;
  } catch (err) {
    // Propaga erro para o chamador tratar
    throw err;
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
  if (tipo === 'professor') {
    document.getElementById('login-professor-container').style.display = 'block';
  } else if (tipo === 'admin') {
    document.getElementById('login-admin-container').style.display = 'block';
  }
}

function mostrarCadastro(tipo) {
  esconderTodos();
  if (tipo === 'professor') {
    document.getElementById('cadastro-professor-container').style.display = 'block';
  } else if (tipo === 'admin') {
    document.getElementById('cadastro-admin-container').style.display = 'block';
  }
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
  let btnId = ''; // ← CORREÇÃO: Declarar btnId no escopo da função

  try {
    let body;

    if (tipo === 'professor') {
      const email = document.getElementById('login-professor-email').value.trim();
      const senha = document.getElementById('login-professor-senha').value;
      btnId = 'btn-login-professor';

      if (!email || !senha) {
        alert('Preencha e-mail e senha!');
        return;
      }

      body = { email, senha };
    } else if (tipo === 'admin') {
      const email = document.getElementById('login-admin-email').value.trim();
      const senha = document.getElementById('login-admin-senha').value;
      btnId = 'btn-login-admin';

      if (!email || !senha) {
        alert('Preencha e-mail e senha!');
        return;
      }

      body = { email, senha };
    } else {
      alert('Tipo inválido.');
      return;
    }

    bloquearBotao(btnId, true);

    const data = await apiFetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    console.log('Resposta do servidor:', data);

    if (data && data.sucesso && data.usuario) {
      // Armazenar somente o necessário no localStorage
      const usuarioParaSalvar = {
        id: data.usuario.id ?? data.usuario._id ?? null,
        nome: data.usuario.nome ?? data.usuario.name ?? '',
        tipo: data.usuario.tipo ?? data.usuario.role ?? ''
      };
      localStorage.setItem('usuarioLogado', JSON.stringify(usuarioParaSalvar));

      if (usuarioParaSalvar.tipo === 'administrador' || usuarioParaSalvar.tipo === 'admin') {
        window.location.href = 'admin.html';
      } else if (usuarioParaSalvar.tipo === 'professor') {
        window.location.href = 'pagina-professor.html';
      } else {
        // caso backend use outro nome para tipo
        alert('Login efetuado, mas tipo de usuário não reconhecido. Contate o suporte.');
      }
    } else {
      const err = (data && data.erro) ? data.erro : 'Resposta inesperada do servidor.';
      alert('Erro: ' + err);
    }
  } catch (error) {
    console.error('Erro no login:', error);
    alert('Erro na conexão ou credenciais incorretas:\n' + (error.message || error));
  } finally {
    // CORREÇÃO: Usar btnId declarado no escopo da função
    if (btnId && typeof bloquearBotao === 'function') {
      bloquearBotao(btnId, false);
    }
  }
}

// ------------------------
// CADASTRO DE PROFESSOR E ADMIN
// ------------------------
async function fazerCadastro(tipo) {
  let btnId = ''; // ← CORREÇÃO: Declarar btnId no escopo da função

  try {
    let body;

    if (tipo === 'professor') {
      const nome = document.getElementById('cadastro-professor-nome').value.trim();
      const email = document.getElementById('cadastro-professor-email').value.trim();
      const senha = document.getElementById('cadastro-professor-senha').value;
      btnId = 'btn-cadastrar-professor';

      if (!nome || !email || !senha) {
        alert('Preencha todos os campos!');
        return;
      }
      if (senha.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres!');
        return;
      }

      body = { nome, email, senha, tipo: 'professor' };
    } else if (tipo === 'admin') {
      const nome = document.getElementById('cadastro-admin-nome').value.trim();
      const email = document.getElementById('cadastro-admin-email').value.trim();
      const senha = document.getElementById('cadastro-admin-senha').value;
      btnId = 'btn-cadastrar-admin';

      if (!nome || !email || !senha) {
        alert('Preencha todos os campos!');
        return;
      }
      if (senha.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres!');
        return;
      }

      body = { nome, email, senha, tipo: 'administrador' };
    } else {
      alert('Tipo inválido.');
      return;
    }

    bloquearBotao(btnId, true);

    const data = await apiFetch('/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (data && data.sucesso) {
      alert('Cadastro realizado com sucesso!');
      mostrarLogin(tipo);
      // limpar campos
      if (tipo === 'professor') {
        document.getElementById('cadastro-professor-nome').value = '';
        document.getElementById('cadastro-professor-email').value = '';
        document.getElementById('cadastro-professor-senha').value = '';
      } else {
        document.getElementById('cadastro-admin-nome').value = '';
        document.getElementById('cadastro-admin-email').value = '';
        document.getElementById('cadastro-admin-senha').value = '';
      }
    } else {
      const err = (data && data.erro) ? data.erro : 'Resposta inesperada do servidor.';
      alert('Erro: ' + err);
    }
  } catch (error) {
    console.error('Erro no cadastro:', error);
    alert('Erro de conexão ou validação:\n' + (error.message || error));
  } finally {
    // CORREÇÃO: Usar btnId declarado no escopo da função
    if (btnId && typeof bloquearBotao === 'function') {
      bloquearBotao(btnId, false);
    }
  }
}

// ------------------------
// VERIFICAÇÃO AUTOMÁTICA DE LOGIN AO CARREGAR PÁGINA
// ------------------------
document.addEventListener('DOMContentLoaded', function () {
  // Recupera usuario salvo
  const usuario = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');

  const current = window.location.pathname.split('/').pop() || 'index.html';

  // Se tiver usuário e estiver na página index, redireciona para a página dele
  if (usuario) {
    if ((usuario.tipo === 'professor' || usuario.tipo === 'professor') && !current.includes('pagina-professor.html') && !current.includes('admin.html')) {
      window.location.href = 'pagina-professor.html';
      return;
    } else if ((usuario.tipo === 'administrador' || usuario.tipo === 'admin') && !current.includes('admin.html') && !current.includes('pagina-professor.html')) {
      window.location.href = 'admin.html';
      return;
    }
  } else {
    // Se não logado e não estiver no index, volta para index
    if (!current.includes('index.html') && current !== '') {
      window.location.href = 'index.html';
      return;
    }
  }

  // Start mostrando a seleção
  voltarSelecao();
});