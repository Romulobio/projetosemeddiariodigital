// ======================================
// script.js - VERSÃO CORRIGIDA SEM REDIRECIONAMENTO AUTOMÁTICO
// ======================================

// Configuração da URL base do backend
const API_URL = window.location.hostname.includes('localhost') || 
                window.location.hostname.includes('127.0.0.1')
  ? 'http://localhost:5000'
  : 'https://projetosemeddiariodigital-production.up.railway.app';

console.log("🌐 Backend configurado:", API_URL);

// ========================
// FUNÇÕES DE MOSTRAR/OCULTAR CONTAINERS
// ========================
function mostrarLogin(tipo) {
  // Oculta todos os containers
  document.getElementById('tipo-login-container').style.display = 'none';
  document.getElementById('login-professor-container').style.display = 'none';
  document.getElementById('login-admin-container').style.display = 'none';
  document.getElementById('cadastro-professor-container').style.display = 'none';
  document.getElementById('cadastro-admin-container').style.display = 'none';

  // Mostra o container correto
  if (tipo === 'professor') {
    document.getElementById('login-professor-container').style.display = 'block';
  } else if (tipo === 'admin') {
    document.getElementById('login-admin-container').style.display = 'block';
  }
}

function mostrarCadastro(tipo) {
  // Oculta todos os containers
  document.getElementById('tipo-login-container').style.display = 'none';
  document.getElementById('login-professor-container').style.display = 'none';
  document.getElementById('login-admin-container').style.display = 'none';
  document.getElementById('cadastro-professor-container').style.display = 'none';
  document.getElementById('cadastro-admin-container').style.display = 'none';

  // Mostra o container correto
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
// FUNÇÕES DE LOGIN
// ========================
async function fazerLogin(tipo) {
  try {
    let email, senha;

    if (tipo === 'professor') {
      email = document.getElementById('login-professor-email').value;
      senha = document.getElementById('login-professor-senha').value;
    } else if (tipo === 'admin') {
      email = document.getElementById('login-admin-email').value;
      senha = document.getElementById('login-admin-senha').value;
    }

    // Validação básica
    if (!email || !senha) {
      alert('Por favor, preencha todos os campos!');
      return;
    }

    console.log('🔐 Tentando login:', { tipo, email });

    // Mostra loading no botão
    const botaoLogin = tipo === 'professor' 
      ? document.getElementById('btn-login-professor')
      : document.getElementById('btn-login-admin');
    
    const textoOriginal = botaoLogin.textContent;
    botaoLogin.textContent = 'Entrando...';
    botaoLogin.disabled = true;

    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // IMPORTANTE para cookies de sessão
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        senha: senha
      })
    });

    const data = await response.json();
    console.log('📨 Resposta do servidor:', data);

    // Restaura botão
    botaoLogin.textContent = textoOriginal;
    botaoLogin.disabled = false;

    if (data.sucesso) {
      // Salva informações do usuário no localStorage
      localStorage.setItem('usuarioLogado', JSON.stringify(data.usuario));
      
      // Redireciona conforme o tipo de usuário
      if (data.usuario.tipo === 'administrador') {
        window.location.href = 'admin.html';
      } else if (data.usuario.tipo === 'professor') {
        window.location.href = 'pagina-professor.html';
      } else {
        alert('Tipo de usuário não reconhecido: ' + data.usuario.tipo);
      }
    } else {
      alert('Erro no login: ' + data.erro);
    }

  } catch (error) {
    console.error('❌ Erro no login:', error);
    
    // Restaura botão em caso de erro
    const botaoLogin = tipo === 'professor' 
      ? document.getElementById('btn-login-professor')
      : document.getElementById('btn-login-admin');
    botaoLogin.textContent = tipo === 'professor' ? 'Entrar como Professor' : 'Entrar como Administrador';
    botaoLogin.disabled = false;
    
    alert('Erro de conexão! Verifique se o servidor está rodando em: ' + API_URL);
  }
}

// ========================
// FUNÇÕES DE CADASTRO
// ========================
async function fazerCadastro(tipo) {
  try {
    let nome, email, senha;

    if (tipo === 'professor') {
      nome = document.getElementById('cadastro-professor-nome').value;
      email = document.getElementById('cadastro-professor-email').value;
      senha = document.getElementById('cadastro-professor-senha').value;
    } else if (tipo === 'admin') {
      nome = document.getElementById('cadastro-admin-nome').value;
      email = document.getElementById('cadastro-admin-email').value;
      senha = document.getElementById('cadastro-admin-senha').value;
    }

    // Validação
    if (!nome || !email || !senha) {
      alert('Por favor, preencha todos os campos!');
      return;
    }

    if (senha.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres!');
      return;
    }

    console.log('📝 Tentando cadastro:', { tipo, nome, email });

    // Mostra loading no botão
    const botaoCadastro = tipo === 'professor' 
      ? document.getElementById('btn-cadastrar-professor')
      : document.getElementById('btn-cadastrar-admin');
    
    const textoOriginal = botaoCadastro.textContent;
    botaoCadastro.textContent = 'Cadastrando...';
    botaoCadastro.disabled = true;

    const response = await fetch(`${API_URL}/cadastro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha: senha,
        tipo: tipo === 'admin' ? 'administrador' : 'professor'
      })
    });

    const data = await response.json();
    console.log('📨 Resposta do cadastro:', data);

    // Restaura botão
    botaoCadastro.textContent = textoOriginal;
    botaoCadastro.disabled = false;

    if (data.sucesso) {
      alert('Cadastro realizado com sucesso!');
      
      // Limpa os campos
      if (tipo === 'professor') {
        document.getElementById('cadastro-professor-nome').value = '';
        document.getElementById('cadastro-professor-email').value = '';
        document.getElementById('cadastro-professor-senha').value = '';
      } else {
        document.getElementById('cadastro-admin-nome').value = '';
        document.getElementById('cadastro-admin-email').value = '';
        document.getElementById('cadastro-admin-senha').value = '';
      }
      
      // Volta para o login
      mostrarLogin(tipo);
    } else {
      alert('Erro no cadastro: ' + data.erro);
    }

  } catch (error) {
    console.error('❌ Erro no cadastro:', error);
    
    // Restaura botão em caso de erro
    const botaoCadastro = tipo === 'professor' 
      ? document.getElementById('btn-cadastrar-professor')
      : document.getElementById('btn-cadastrar-admin');
    botaoCadastro.textContent = tipo === 'professor' ? 'Cadastrar Professor' : 'Cadastrar Administrador';
    botaoCadastro.disabled = false;
    
    alert('Erro de conexão! Verifique se o servidor está rodando.');
  }
}

// ========================
// VERIFICAÇÃO DE CONEXÃO
// ========================
async function verificarConexao() {
  try {
    const statusElement = document.getElementById('status-conexao');
    
    const response = await fetch(`${API_URL}/`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      statusElement.textContent = '✅ Conectado';
      statusElement.style.backgroundColor = '#4CAF50';
      statusElement.style.color = 'white';
      statusElement.style.display = 'block';
      return true;
    } else {
      throw new Error('Servidor não respondeu corretamente');
    }
  } catch (error) {
    const statusElement = document.getElementById('status-conexao');
    statusElement.textContent = '❌ Servidor Offline';
    statusElement.style.backgroundColor = '#f44336';
    statusElement.style.color = 'white';
    statusElement.style.display = 'block';
    console.error('❌ Servidor offline:', error);
    return false;
  }
}

// ========================
// VERIFICAÇÃO DE USUÁRIO LOGADO (APENAS PARA OUTRAS PÁGINAS)
// ========================
function verificarUsuarioLogado() {
  // Esta função só deve ser chamada em admin.html e pagina-professor.html
  // NÃO no index.html para evitar loops
  const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
  
  if (!usuario) {
    // Se não está logado, redireciona para index.html
    window.location.href = 'index.html';
    return false;
  }
  
  // Verifica se está na página correta
  const paginaAtual = window.location.pathname;
  
  if (usuario.tipo === 'administrador' && !paginaAtual.includes('admin.html')) {
    window.location.href = 'admin.html';
    return false;
  }
  
  if (usuario.tipo === 'professor' && !paginaAtual.includes('pagina-professor.html')) {
    window.location.href = 'pagina-professor.html';
    return false;
  }
  
  return true;
}

// ========================
// INICIALIZAÇÃO (APENAS PARA INDEX.HTML)
// ========================
function inicializarPaginaLogin() {
  console.log('🚀 Página de login carregada - Iniciando...');
  
  // Verifica conexão com o servidor
  verificarConexao();
  
  // Mostra a seleção inicial
  voltarSelecao();
  
  // Adiciona event listeners para Enter nos campos
  adicionarEventListenersEnter();
  
  console.log('✅ Página de login inicializada com sucesso');
}

// ========================
// EVENT LISTENERS PARA ENTER
// ========================
function adicionarEventListenersEnter() {
  // Login Professor
  const emailProfessor = document.getElementById('login-professor-email');
  const senhaProfessor = document.getElementById('login-professor-senha');
  
  if (emailProfessor && senhaProfessor) {
    emailProfessor.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') fazerLogin('professor');
    });
    senhaProfessor.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') fazerLogin('professor');
    });
  }
  
  // Login Admin
  const emailAdmin = document.getElementById('login-admin-email');
  const senhaAdmin = document.getElementById('login-admin-senha');
  
  if (emailAdmin && senhaAdmin) {
    emailAdmin.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') fazerLogin('admin');
    });
    senhaAdmin.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') fazerLogin('admin');
    });
  }
  
  // Cadastro Professor
  const nomeProfessor = document.getElementById('cadastro-professor-nome');
  const emailCadProfessor = document.getElementById('cadastro-professor-email');
  const senhaCadProfessor = document.getElementById('cadastro-professor-senha');
  
  if (nomeProfessor && emailCadProfessor && senhaCadProfessor) {
    nomeProfessor.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') fazerCadastro('professor');
    });
    emailCadProfessor.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') fazerCadastro('professor');
    });
    senhaCadProfessor.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') fazerCadastro('professor');
    });
  }
  
  // Cadastro Admin
  const nomeAdmin = document.getElementById('cadastro-admin-nome');
  const emailCadAdmin = document.getElementById('cadastro-admin-email');
  const senhaCadAdmin = document.getElementById('cadastro-admin-senha');
  
  if (nomeAdmin && emailCadAdmin && senhaCadAdmin) {
    nomeAdmin.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') fazerCadastro('admin');
    });
    emailCadAdmin.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') fazerCadastro('admin');
    });
    senhaCadAdmin.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') fazerCadastro('admin');
    });
  }
}

// ========================
// FUNÇÃO DE LOGOUT (para outras páginas)
// ========================
function fazerLogout() {
  fetch(`${API_URL}/logout`, {
    method: 'POST',
    credentials: 'include'
  })
  .then(response => response.json())
  .then(data => {
    if (data.sucesso) {
      localStorage.removeItem('usuarioLogado');
      window.location.href = 'index.html';
    }
  })
  .catch(error => {
    console.error('Erro no logout:', error);
    // Força o logout local mesmo com erro
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'index.html';
  });
}

// ========================
// INICIALIZAÇÃO AUTOMÁTICA (APENAS SE ESTIVER NA PÁGINA DE LOGIN)
// ========================
document.addEventListener('DOMContentLoaded', function() {
  // Verifica se estamos na página de login (index.html)
  const isLoginPage = window.location.pathname.endsWith('index.html') || 
                     window.location.pathname.endsWith('/') ||
                     !window.location.pathname.includes('.html');
  
  if (isLoginPage) {
    console.log('📄 Página de login detectada - Inicializando...');
    inicializarPaginaLogin();
  } else {
    console.log('📄 Página interna detectada:', window.location.pathname);
    // Para páginas internas, a verificação deve ser feita individualmente
  }
});