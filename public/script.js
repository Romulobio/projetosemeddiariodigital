// ======================================
// script-login.js - VERSÃO OTIMIZADA
// ======================================

// Detecta automaticamente se está em localhost ou produção
const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000" // Backend local
  : "https://prosemeddiariodigital-production.up.railway.app"; // Backend Railway

console.log("🌐 Backend ativo:", BASE_URL );

// ======================================
// Função genérica de requisição à API
// ======================================
async function apiFetch(endpoint, data) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include', // Importante para sessions
    });

    // Captura a resposta de erro para exibir no alerta
    const responseData = await response.json();

    if (!response.ok) {
      // Usa a mensagem de erro do servidor, se disponível
      throw new Error(responseData.erro || `Erro HTTP: ${response.status}`);
    }

    return responseData;
  } catch (error) {
    console.error('❌ Erro na comunicação com o servidor:', error);
    // Exibe o erro específico no alerta para o usuário
    alert(`Erro ao conectar ao servidor: ${error.message}`);
    throw error;
  }
}

// ======================================
// Funções de controle da interface (UI)
// ======================================

/**
 * Função central para gerenciar qual tela é exibida.
 * @param {string} telaId O ID do contêiner a ser mostrado.
 */
function mostrarTela(telaId) {
  // Esconde todos os contêineres principais de uma vez
  document.querySelectorAll('.login-container').forEach(container => {
    container.hidden = true;
  });

  // Mostra apenas o contêiner desejado
  const telaParaMostrar = document.getElementById(telaId);
  if (telaParaMostrar) {
    telaParaMostrar.hidden = false;
  }
}

// Torna as funções de UI acessíveis globalmente para o HTML
window.mostrarLogin = window.mostrarLogin || function(tipo) {
  // sua implementação (ex: esconderTodos(); mostrar container)
  esconderTodos();
  const el = document.getElementById(`login-${tipo}-container`);
  if (el) el.hidden = false;
};

window.mostrarCadastro = function (tipo) {
  const telaId = `cadastro-${tipo}-container`;
  mostrarTela(telaId);

  // Limpa os campos do formulário de cadastro ao exibi-lo
  const form = document.getElementById(telaId);
  if (form) {
    form.querySelectorAll('input').forEach(input => input.value = '');
  }
};

window.voltarSelecao = window.voltarSelecao || function() {
  esconderTodos();
  const t = document.getElementById('tipo-login-container');
  if (t) t.hidden = false;
};
window.fazerLogin = window.fazerLogin || fazerLogin;       // se você já tem function fazerLogin() {...}
window.fazerCadastro = window.fazerCadastro || fazerCadastro; // idem
window.mostrarCadastro = window.mostrarCadastro || function(tipo){ /*...*/ };

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
// LÓGICA DE LOGIN
// ======================================
window.fazerLogin = async function (tipo) {
  const btnId = `btn-login-${tipo}`;
  bloquearBotao(btnId, true);

  try {
    const email = document.getElementById(`login-${tipo}-email`)?.value.trim();
    const senha = document.getElementById(`login-${tipo}-senha`)?.value;

    if (!email || !senha) {
      alert('Preencha e-mail e senha!');
      return; // Não continua se os campos estiverem vazios
    }

    const data = await apiFetch('/api/login', { email, senha, tipo });

    if (data?.sucesso) {
      localStorage.setItem('usuarioLogado', JSON.stringify(data.usuario));
      // Redireciona com base no tipo de usuário retornado pela API
      if (data.usuario.tipo === 'administrador') {
        window.location.href = 'admin.html';
      } else if (data.usuario.tipo === 'professor') {
        window.location.href = 'pagina-professor.html';
      } else {
        alert('Tipo de usuário não reconhecido: ' + data.usuario.tipo);
      }
    }
    // A função apiFetch já trata os alertas de erro
  } catch (error) {
    console.error('❌ Falha no processo de login:', error);
  } finally {
    bloquearBotao(btnId, false); // Garante que o botão seja desbloqueado sempre
  }
};

// ======================================
// LÓGICA DE CADASTRO
// ======================================
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
      window.mostrarLogin(tipo); // Leva para a tela de login correspondente
    }
    // A função apiFetch já trata os alertas de erro
  } catch (error) {
    console.error('❌ Falha no processo de cadastro:', error);
  } finally {
    bloquearBotao(btnId, false);
  }
};

// ======================================
// INICIALIZAÇÃO DO SCRIPT
// ======================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Sistema de login carregado e pronto.');
  // Garante que a tela inicial de seleção seja sempre a primeira a ser exibida
  
  
});
