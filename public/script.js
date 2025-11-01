
// script.js - CONTROLE DE LOGIN E CADASTRO (PROFESSOR E ADMIN)
const API_URL = 'https://projetosemeddiariodigital-production.up.railway.app';

// ========================
// FUNÇÕES DE MOSTRAR/OCULTAR CONTAINERS
// ========================
function mostrarLogin(tipo) {
  document.getElementById('tipo-login-container').style.display = 'none';
  document.getElementById('login-professor-container').style.display = 'none';
  document.getElementById('login-admin-container').style.display = 'none';
  document.getElementById('cadastro-professor-container').style.display = 'none';
  document.getElementById('cadastro-admin-container').style.display = 'none';

  if (tipo === 'professor') {
    document.getElementById('login-professor-container').style.display = 'block';
  } else if (tipo === 'admin') {
    document.getElementById('login-admin-container').style.display = 'block';
  }
}

function mostrarCadastro(tipo) {
  document.getElementById('tipo-login-container').style.display = 'none';
  document.getElementById('login-professor-container').style.display = 'none';
  document.getElementById('login-admin-container').style.display = 'none';
  document.getElementById('cadastro-professor-container').style.display = 'none';
  document.getElementById('cadastro-admin-container').style.display = 'none';

  if (tipo === 'professor') {
    document.getElementById('cadastro-professor-container').style.display = 'block';
  } else if (tipo === 'admin') {
    document.getElementById('cadastro-admin-container').style.display = 'block';
  }
}

function voltarSelecao() {
  document.getElementById('tipo-login-container').style.display = 'block';
  document.getElementById('login-professor-container').style.display = 'none';
  document.getElementById('login-admin-container').style.display = 'none';
  document.getElementById('cadastro-professor-container').style.display = 'none';
  document.getElementById('cadastro-admin-container').style.display = 'none';
}

// ========================
// LOGIN DE PROFESSOR E ADMIN
// ========================
async function fazerLogin(tipo) {
  try {
    let body;

    if (tipo === 'professor') {
      const email = document.getElementById('login-professor-usuario').value;
      const senha = document.getElementById('login-professor-senha').value;

      if (!email || !senha) {
        alert('Preencha usuário e senha!');
        return;
      }

      body = { email, senha };
    } else if (tipo === 'admin') {
      const email = document.getElementById('login-admin-email').value;
      const senha = document.getElementById('login-admin-senha').value;

      if (!email || !senha) {
        alert('Preencha email e senha!');
        return;
      }

      body = { email, senha };
    }

    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log('Resposta do servidor:', data);

    if (data.sucesso) {
      localStorage.setItem('usuarioLogado', JSON.stringify(data.usuario));

      if (data.usuario.tipo === 'administrador') {
        window.location.href = 'admin.html';
      } else if (data.usuario.tipo === 'professor') {
        window.location.href = 'pagina-professor.html';
      } else {
        alert('Tipo de usuário não reconhecido.');
      }
    } else {
      alert('Erro: ' + data.erro);
    }
  } catch (error) {
    console.error('Erro no login:', error);
    alert('Erro de conexão! Verifique se o servidor está rodando.');
  }
}

// ========================
// CADASTRO DE PROFESSOR E ADMIN
// ========================
async function fazerCadastro(tipo) {
  try {
    let body;

    if (tipo === 'professor') {
      const nome = document.getElementById('cadastro-professor-nome').value;
      const email = document.getElementById('cadastro-professor-usuario').value;
      const senha = document.getElementById('cadastro-professor-senha').value;

      if (!nome || !email || !senha) {
        alert('Preencha todos os campos!');
        return;
      }

      body = { nome, email, senha, tipo: 'professor' };
    } else if (tipo === 'admin') {
      const nome = document.getElementById('cadastro-admin-nome').value;
      const email = document.getElementById('cadastro-admin-email').value;
      const senha = document.getElementById('cadastro-admin-senha').value;

      if (!nome || !email || !senha) {
        alert('Preencha todos os campos!');
        return;
      }

      if (senha.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres!');
        return;
      }

      body = { nome, email, senha, tipo: 'administrador' };

    }

    const res = await fetch(`${API_URL}/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (data.sucesso) {
      alert('Cadastro realizado com sucesso!');
      mostrarLogin(tipo);

      if (tipo === 'professor') {
        document.getElementById('cadastro-professor-nome').value = '';
        document.getElementById('cadastro-professor-usuario').value = '';
        document.getElementById('cadastro-professor-senha').value = '';
      } else {
        document.getElementById('cadastro-admin-nome').value = '';
        document.getElementById('cadastro-admin-email').value = '';
        document.getElementById('cadastro-admin-senha').value = '';
      }
    } else {
      alert('Erro: ' + data.erro);
    }
  } catch (error) {
    console.error('Erro no cadastro:', error);
    alert('Erro de conexão! Verifique se o servidor está rodando.');
  }
}

// ========================
// VERIFICAÇÃO AUTOMÁTICA DE LOGIN AO CARREGAR PÁGINA
// ========================
document.addEventListener('DOMContentLoaded', function () {
  const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));

  if (usuario) {
    if (usuario.tipo === 'professor' && window.location.href.endsWith('pagina-professor.html')) {
      console.log('Professor logado:', usuario.nome);
    } else if (usuario.tipo === 'admin' && window.location.href.endsWith('admin.html')) {
      console.log('Admin logado:', usuario.nome);
    } else if (!window.location.href.endsWith('index.html')) {
      window.location.href = 'index.html';
    }
  } else {
    if (!window.location.href.endsWith('index.html')) {
      window.location.href = 'index.html';
    }
  }

  voltarSelecao();
});