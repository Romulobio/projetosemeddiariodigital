// ======================================
// script-login.js - VERSÃO OTIMIZADA E CORRIGIDA
// ======================================

const BASE_URL = window.location.hostname.includes('localhost')
  ? 'http://localhost:5000'
  : 'https://prosemeddiariodigital-production.up.railway.app';



console.log("🌐 Backend ativo:", BASE_URL );

// ======================================
// Função genérica de requisição à API CORRIGIDA
// ======================================
async function apiFetch(endpoint, data) {
  try {
    console.log(`📨 Enviando requisição para: ${BASE_URL}${endpoint}`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data),
      credentials: 'include', // Importante para sessions
      mode: 'cors' // ⬅️ Isso deve ser suficiente para habilitar CORS
    });

    console.log(`📨 Resposta recebida - Status: ${response.status}`);
    
    // Se a resposta não for ok, lança um erro
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Resposta da API:', result);
    return result;
    
  } catch (error) {
    console.error(`❌ Erro na requisição para ${endpoint}:`, error);
    
    // Se for um erro de CORS, o erro será "Failed to fetch" ou similar
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.error('💥 Erro de CORS ou de rede. Verifique a configuração do backend.');
      alert('Erro de conexão. Verifique se o backend está configurado para aceitar requisições do seu domínio.');
    }
    
    throw error;
  }
}

// Função para testar CORS
async function testarCORS() {
  try {
    const response = await fetch(`${BASE_URL}/api/test-cors`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors'
    });
    console.log('✅ Teste CORS bem-sucedido:', response.status);
    return true;
  } catch (error) {
    console.error('❌ Teste CORS falhou:', error);
    return false;
  }
}

// Chame esta função no carregamento da página para verificar
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Sistema de login carregado e pronto.');
  mostrarTela('tipo-login-container');
  testarCORS().then(sucesso => {
    if (!sucesso) {
      alert('Atenção: Problema de CORS detectado. O login pode não funcionar.');
    }
  });
});
// ======================================
// Funções de controle da interface (UI)
// ======================================

function esconderTodos() {
  document.querySelectorAll('.login-container').forEach(container => {
    container.hidden = true;
  });
}

function mostrarTela(telaId) {
  esconderTodos();
  const telaParaMostrar = document.getElementById(telaId);
  if (telaParaMostrar) {
    telaParaMostrar.hidden = false;
  }
}

function mostrarLogin(tipo) {
  esconderTodos();
  const el = document.getElementById(`login-${tipo}-container`);
  if (el) el.hidden = false;
}

function mostrarCadastro(tipo) {
  const telaId = `cadastro-${tipo}-container`;
  mostrarTela(telaId);
  
  const form = document.getElementById(telaId);
  if (form) {
    form.querySelectorAll('input').forEach(input => input.value = '');
  }
}

function voltarSelecao() {
  esconderTodos();
  const t = document.getElementById('tipo-login-container');
  if (t) t.hidden = false;
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
// LÓGICA DE LOGIN - MELHORADA
// ======================================
window.fazerLogin = async function (tipo) {
  const btnId = `btn-login-${tipo}`;
  bloquearBotao(btnId, true);

  try {
    const email = document.getElementById(`login-${tipo}-email`)?.value.trim();
    const senha = document.getElementById(`login-${tipo}-senha`)?.value;

    if (!email || !senha) {
      alert('Preencha e-mail e senha!');
      bloquearBotao(btnId, false);
      return;
    }

    console.log('🔐 Tentando login para:', email);
    
    // Testa a conexão primeiro
    const conexaoOk = await testarConexao();
    if (!conexaoOk) {
      alert('❌ Servidor indisponível. Verifique sua conexão.');
      bloquearBotao(btnId, false);
      return;
    }

    const data = await apiFetch('/api/login', { email, senha, tipo });

    if (data?.sucesso) {
      console.log('✅ Login bem-sucedido! Usuário:', data.usuario);
      localStorage.setItem('usuarioLogado', JSON.stringify(data.usuario));
      
      // Pequeno delay para feedback visual
      setTimeout(() => {
        if (data.usuario.tipo === 'administrador') {
          window.location.href = 'admin.html';
        } else if (data.usuario.tipo === 'professor') {
          window.location.href = 'pagina-professor.html';
        } else {
          alert('Tipo de usuário não reconhecido: ' + data.usuario.tipo);
        }
      }, 500);
      
    } else {
      // Se a API retornou sucesso: false mas não lançou erro
      alert(data?.erro || 'Erro desconhecido no login');
    }
    
  } catch (error) {
    console.error('❌ Falha no processo de login:', error);
    
    // Mensagens de erro mais amigáveis
    if (error.message.includes('Timeout') || error.message.includes('não respondeu')) {
      alert('⏰ Servidor demorou para responder. Tente novamente.');
    } else if (error.message.includes('Failed to fetch')) {
      alert('🔌 Erro de conexão. Verifique se o servidor está online.');
    } else {
      alert('❌ Erro ao fazer login: ' + error.message);
    }
    
  } finally {
    bloquearBotao(btnId, false);
  }
};

// ======================================
// LÓGICA DE LOGIN
// ======================================
async function fazerLogin(tipo) {
  const btnId = `btn-login-${tipo}`;
  bloquearBotao(btnId, true);

  try {
    const email = document.getElementById(`login-${tipo}-email`)?.value.trim();
    const senha = document.getElementById(`login-${tipo}-senha`)?.value;

    if (!email || !senha) {
      alert('Preencha e-mail e senha!');
      bloquearBotao(btnId, false);
      return;
    }

    console.log('🔐 Tentando login para:', email);
    
    const data = await apiFetch('/api/login', { email, senha, tipo });

    if (data?.sucesso) {
      console.log('✅ Login bem-sucedido! Usuário:', data.usuario);
      localStorage.setItem('usuarioLogado', JSON.stringify(data.usuario));
      
      setTimeout(() => {
        if (data.usuario.tipo === 'administrador') {
          window.location.href = 'admin.html';
        } else if (data.usuario.tipo === 'professor') {
          window.location.href = 'pagina-professor.html';
        } else {
          alert('Tipo de usuário não reconhecido: ' + data.usuario.tipo);
        }
      }, 500);
      
    } else {
      alert(data?.erro || 'Erro desconhecido no login');
    }
    
  } catch (error) {
    console.error('❌ Falha no processo de login:', error);
    
    if (error.message.includes('Failed to fetch')) {
      alert('🔌 Erro de conexão. Verifique se o servidor está online na porta 5000.');
    } else {
      alert('❌ Erro ao fazer login: ' + error.message);
    }
    
  } finally {
    bloquearBotao(btnId, false);
  }
}

// ======================================
// LÓGICA DE CADASTRO
// ======================================
async function fazerCadastro(tipo) {
  const btnId = `btn-cadastrar-${tipo}`;
  bloquearBotao(btnId, true);

  try {
    const nome = document.getElementById(`cadastro-${tipo}-nome`)?.value.trim();
    const email = document.getElementById(`cadastro-${tipo}-email`)?.value.trim();
    const senha = document.getElementById(`cadastro-${tipo}-senha`)?.value;

    if (!nome || !email || !senha) {
      alert('Preencha todos os campos!');
      return;
    }
    if (senha.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres!');
      return;
    }

    const tipoDeConta = tipo === 'admin' ? 'administrador' : 'professor';
    const data = await apiFetch('/api/cadastro', { nome, email, senha, tipo: tipoDeConta });

    if (data?.sucesso) {
      alert(data.mensagem || 'Cadastro realizado com sucesso! Faça o login.');
      mostrarLogin(tipo);
    }
  } catch (error) {
    console.error('❌ Falha no processo de cadastro:', error);
  } finally {
    bloquearBotao(btnId, false);
  }
}

// ======================================
// INICIALIZAÇÃO
// ======================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Sistema de login carregado e pronto.');
  mostrarTela('tipo-login-container');
});

// Tornar funções globais para o HTML
window.mostrarLogin = mostrarLogin;
window.mostrarCadastro = mostrarCadastro;
window.voltarSelecao = voltarSelecao;
window.fazerLogin = fazerLogin;
window.fazerCadastro = fazerCadastro;