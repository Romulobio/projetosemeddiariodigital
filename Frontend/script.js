// ======================================
// script-login.js - VERSÃO OTIMIZADA E CORRIGIDA (CORS + Conexão)
// ======================================

const BASE_URL = window.location.hostname.includes('localhost')
  ? 'http://localhost:5000'
  : 'https://projetosemeddiariodigital-production.up.railway.app'; // ✅ corrigido

console.log("🌐 Backend ativo:", BASE_URL);

// ======================================
// ✅ ADICIONE ESTA FUNÇÃO API FETCH QUE ESTÁ FALTANDO
// ======================================
async function apiFetch(endpoint, data) {
  try {
    console.log(`📨 Enviando requisição para: ${BASE_URL}${endpoint}`);
    console.log('📤 Dados enviados:', data);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    console.log(`📨 Resposta - Status: ${response.status}`);
    
    // Lê a resposta como texto primeiro
    const responseText = await response.text();
    console.log('📨 Resposta - Texto bruto:', responseText);

    let result;
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      console.error('❌ Erro ao parsear JSON:', e);
      result = { message: responseText };
    }

    if (!response.ok) {
      throw new Error(result.message || result.error || `Erro HTTP: ${response.status}`);
    }

    console.log('✅ Resposta parseada:', result);
    return result;
    
  } catch (error) {
    console.error(`❌ Erro na requisição para ${endpoint}:`, error);
    throw error;
  }
}
// ======================================
// Função de teste de CORS e conexão
// ======================================
async function testarCORS() {
  try {
    const response = await fetch(`${BASE_URL}/api/test-cors`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors'
    });
    if (response.ok) {
      console.log('✅ CORS funcionando.');
      return true;
    }
    throw new Error(`Status: ${response.status}`);
  } catch (error) {
    console.error('❌ Teste CORS falhou:', error);
    return false;
  }
}

// ✅ Função usada antes de tentar login
async function testarConexao() {
  return testarCORS();
}

// ======================================
// Inicialização do sistema de login
// ======================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Sistema de login carregado e pronto.');
  mostrarTela('tipo-login-container');
  testarCORS().then(sucesso => {
    if (!sucesso) {
      alert('⚠️ Atenção: O backend não respondeu corretamente ao teste CORS.');
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
    
    // ✅ TESTE DE CONEXÃO
    try {
      await fetch(`${BASE_URL}/api/login`, { method: 'OPTIONS' });
      console.log('✅ CORS funcionando');
    } catch (e) {
      console.warn('⚠️ Teste CORS falhou, mas continuando...');
    }

    // ✅ TENTA "password" E "senha"
    let data;
    try {
      data = await apiFetch('/api/login', { 
        email: email, 
        password: senha,
        tipo: tipo 
      });
    } catch (error) {
      // Se falhar, tenta com "senha"
      console.log('🔄 Tentando com campo "senha"...');
      data = await apiFetch('/api/login', { 
        email: email, 
        senha: senha,
        tipo: tipo 
      });
    }

    console.log('📨 Resposta completa do login:', data);

    // ✅ VERIFICA DIFERENTES ESTRUTURAS
    const token = data.token || data.access_token;
    const user = data.user || data.usuario;
    
    if (token || data.sucesso) {
      console.log('✅ Login bem-sucedido!');
      
      // ✅ SALVA OS DADOS
      if (token) {
        localStorage.setItem('token', token);
      }
      
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else if (data.sucesso) {
        // Cria objeto de usuário básico
        localStorage.setItem('user', JSON.stringify({
          email: email,
          tipo: tipo,
          nome: email.split('@')[0]
        }));
      }
      
      console.log('💾 Dados salvos:');
      console.log('- Token:', localStorage.getItem('token'));
      console.log('- User:', localStorage.getItem('user'));
      
      // ✅ REDIRECIONAMENTO
      setTimeout(() => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const userTipo = userData.tipo || tipo;
        
        console.log('🔄 Redirecionando para:', userTipo);
        
        if (userTipo === 'administrador' || userTipo === 'admin') {
          window.location.href = 'admin.html';
        } else if (userTipo === 'professor') {
          window.location.href = 'pagina-professor.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      }, 1000);
      
    } else {
      console.error('❌ Estrutura inesperada:', data);
      alert(data?.message || data?.erro || 'Erro desconhecido');
    }
    
  } catch (error) {
    console.error('❌ Falha no login:', error);
    
    if (error.message.includes('401')) {
      alert('❌ Email ou senha incorretos!');
    } else if (error.message.includes('Failed to fetch')) {
      alert('🔌 Erro de conexão. Verifique: \n1. Servidor online\n2. URL correta\n3. Problemas de CORS');
    } else {
      alert('❌ Erro: ' + error.message);
    }
    
  } finally {
    bloquearBotao(btnId, false);
  }
};

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

// Tornar funções globais para o HTML
window.mostrarLogin = mostrarLogin;
window.mostrarCadastro = mostrarCadastro;
window.voltarSelecao = voltarSelecao;
window.fazerLogin = fazerLogin;
window.fazerCadastro = fazerCadastro;