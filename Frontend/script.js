// ======================================
// script-login.js - VERSÃO OTIMIZADA E CORRIGIDA
// ======================================

const BASE_URL = window.location.hostname.includes('localhost')
  ? 'http://localhost:8080'
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

// ADICIONADO: Definição da função esconderTodos
/**
 * Esconde todos os contêineres principais de login/cadastro.
 */
function esconderTodos() {
  document.querySelectorAll('.login-container').forEach(container => {
    container.hidden = true;
  });
}

/**
 * Função central para gerenciar qual tela é exibida.
 * @param {string} telaId O ID do contêiner a ser mostrado.
 */
function mostrarTela(telaId) {
  // Esconde todos os contêineres principais de uma vez
  esconderTodos(); // MODIFICADO: Chama a função corretamente
  // document.querySelectorAll('.login-container').forEach(container => { // REMOVIDO: Já coberto por esconderTodos()
  //   container.hidden = true;
  // });

  // Mostra apenas o contêiner desejado
  const telaParaMostrar = document.getElementById(telaId);
  if (telaParaMostrar) {
    telaParaMostrar.hidden = false;
  }
}

// MODIFICADO: Simplificado para declarações diretas, não precisa do `window.foo = window.foo || function()`
// Como as funções `mostrarLogin`, `mostrarCadastro`, `voltarSelecao` e `fazerLogin`/`fazerCadastro`
// são chamadas diretamente no HTML via `onclick`, elas precisam estar no escopo global.
// Declará-las como `function nomeDaFuncao() {}` ou `window.nomeDaFuncao = function() {}`
// as torna globais. Optaremos por declarações diretas e limpas onde possível.

/**
 * Exibe a tela de login para um tipo específico (professor ou admin).
 * @param {string} tipo O tipo de login ('professor' ou 'admin').
 */
function mostrarLogin(tipo) { // REMOVIDO: `window.mostrarLogin = window.mostrarLogin ||`
  esconderTodos();
  const el = document.getElementById(`login-${tipo}-container`);
  if (el) el.hidden = false;
}
// MODIFICADO: Atribuição direta para garantir acessibilidade global se necessário,
// especialmente se outras partes do código ainda usarem `window.mostrarLogin`.
// Mas a declaração `function mostrarLogin(tipo)` já faz isso quando não há `import/export`.
window.mostrarLogin = mostrarLogin;


/**
 * Exibe a tela de cadastro para um tipo específico (professor ou admin).
 * @param {string} tipo O tipo de cadastro ('professor' ou 'admin').
 */
function mostrarCadastro(tipo) { // REMOVIDO: `window.mostrarCadastro = function (tipo)`
  const telaId = `cadastro-${tipo}-container`;
  mostrarTela(telaId);

  // Limpa os campos do formulário de cadastro ao exibi-lo
  const form = document.getElementById(telaId);
  if (form) {
    form.querySelectorAll('input').forEach(input => input.value = '');
  }
}
// MODIFICADO: Atribuição direta para garantir acessibilidade global.
window.mostrarCadastro = mostrarCadastro;


/**
 * Retorna à tela de seleção de tipo de acesso.
 */
function voltarSelecao() { // REMOVIDO: `window.voltarSelecao = window.voltarSelecao ||`
  esconderTodos();
  const t = document.getElementById('tipo-login-container');
  if (t) t.hidden = false;
}
// MODIFICADO: Atribuição direta para garantir acessibilidade global.
window.voltarSelecao = voltarSelecao;


// REMOVIDO: As linhas redundantes abaixo, já que as funções são definidas diretamente ou como `window.fazerLogin = async function(...)`
// window.fazerLogin = window.fazerLogin || fazerLogin;       // se você já tem function fazerLogin() {...}
// window.fazerCadastro = window.fazerCadastro || fazerCadastro; // idem
// window.mostrarCadastro = window.mostrarCadastro || function(tipo){ /*...*/ };


/**
 * Bloqueia ou desbloqueia um botão para evitar cliques duplos.
 * @param {string} botaoId O ID do botão.
 * @param {boolean} bloquear True para bloquear, false para desbloquear.
 */
function bloquearBotao(botaoId, bloquear = true) {
  const btn = document.getElementById(botaoId);
  if (!btn) return;

  btn.disabled = bloquear;
  if (bloquear) {
    btn.dataset.originalText = btn.textContent; // Salva o texto original
    btn.textContent = 'Aguarde...';
  } else {
    // Restaura o texto original salvo anteriormente
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
// LÓGICA DE CADASTRO
// ======================================
// MODIFICADO: Mantido como atribuição a `window` para clareza e garantia de escopo global
// para `onclick="fazerCadastro(...)"`
window.fazerCadastro = async function (tipo) {
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
      mostrarLogin(tipo); // Leva para a tela de login correspondente
    }
    // A função apiFetch já trata os alertas de erro
  } catch (error) {
    console.error('❌ Falha no processo de cadastro:', error);
  } finally {
    bloquearBotao(btnId, false);
  }
};

function atualizarStatusConexao(status) {
  const elemento = document.getElementById('status-conexao');
  if (!elemento) return;
  
  elemento.style.display = 'block';
  if (status === 'testando') {
    elemento.innerHTML = '🔄 Conectando...';
    elemento.style.background = '#fff3cd';
    elemento.style.color = '#856404';
  } else if (status === 'online') {
    elemento.innerHTML = '✅ Conectado';
    elemento.style.background = '#d1edff';
    elemento.style.color = '#004085';
    setTimeout(() => elemento.style.display = 'none', 3000);
  } else if (status === 'offline') {
    elemento.innerHTML = '❌ Offline';
    elemento.style.background = '#f8d7da';
    elemento.style.color = '#721c24';
  }
}
// ======================================
// INICIALIZAÇÃO DO SCRIPT
// ======================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Sistema de login carregado e pronto.');
  // ADICIONADO: Garante que a tela inicial de seleção seja sempre a primeira a ser exibida
  mostrarTela('tipo-login-container');
});