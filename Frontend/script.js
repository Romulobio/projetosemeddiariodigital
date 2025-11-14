// ======================================
// script-login.js - VERSÃO PROFISSIONAL OTIMIZADA
// ======================================

// Detecta backend automaticamente
const BASE_URL = window.location.hostname.includes('localhost')
  ? 'http://localhost:5000'
  : 'https://projetosemeddiariodigital-production.up.railway.app';

console.log("🌐 Backend ativo:", BASE_URL);

// ======================================
// Função universal de requisições
// ======================================
async function apiFetch(endpoint, payload = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`📨 POST → ${url}`, payload);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let json;

    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { message: text };
    }

    if (!res.ok) {
      throw new Error(json.message || json.error || `Erro HTTP: ${res.status}`);
    }

    console.log("📩 Resposta:", json);
    return json;

  } catch (err) {
    console.error(`❌ Erro em ${endpoint}:`, err);
    throw err;
  }
}

// ======================================
// Teste CORS automático
// ======================================
async function testarCORS() {
  try {
    const res = await fetch(`${BASE_URL}/api/test-cors`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

// ======================================
// Inicialização
// ======================================
document.addEventListener('DOMContentLoaded', async () => {
  mostrarTela('tipo-login-container');

  const corsOK = await testarCORS();
  if (!corsOK) {
    alert("⚠️ CORS pode estar bloqueado no Railway.");
  }
});

// ======================================
// Funções UI
// ======================================
function esconderTodos() {
  document.querySelectorAll('.login-container').forEach(c => c.hidden = true);
}

function mostrarTela(id) {
  esconderTodos();
  const tela = document.getElementById(id);
  if (tela) tela.hidden = false;
}

function mostrarLogin(tipo) {
  mostrarTela(`login-${tipo}-container`);
}

function mostrarCadastro(tipo) {
  mostrarTela(`cadastro-${tipo}-container`);
  document.querySelectorAll(`#cadastro-${tipo}-container input`)
    .forEach(inp => inp.value = '');
}

function bloquearBotao(id, status = true) {
  const b = document.getElementById(id);
  if (!b) return;
  b.disabled = status;

  if (status) {
    b.dataset.originalText = b.textContent;
    b.textContent = "Aguarde...";
  } else {
    b.textContent = b.dataset.originalText || b.textContent;
  }
}

window.voltarSelecao = () => mostrarTela('tipo-login-container');

// ======================================
// LOGIN
// ======================================
window.fazerLogin = async function (tipo) {
  const btn = `btn-login-${tipo}`;
  bloquearBotao(btn, true);

  try {
    const email = document.getElementById(`login-${tipo}-email`).value.trim();
    const senha = document.getElementById(`login-${tipo}-senha`).value;

    if (!email || !senha) {
      alert("Preencha e-mail e senha!");
      return;
    }

    const data = await apiFetch('/api/login', { email, senha, tipo });

    if (!data.sucesso && !data.token) {
      alert(data.message || "Erro no login.");
      return;
    }

    // Salva token e usuário
    if (data.token) localStorage.setItem("token", data.token);

    const user = data.user || { nome: email.split('@')[0], email, tipo };
    localStorage.setItem("user", JSON.stringify(user));

    // Redirecionamento
    const redirect = user.tipo === "admin" || user.tipo === "administrador"
      ? "admin.html"
      : "pagina-professor.html";

    window.location.href = redirect;

  } catch (err) {
    console.error(err);

    if (err.message.includes("401")) {
      alert("Email ou senha incorretos!");
    } else {
      alert("Erro de conexão com servidor.");
    }

  } finally {
    bloquearBotao(btn, false);
  }
};

// ======================================
// CADASTRO
// ======================================
window.fazerCadastro = async function (tipo) {
  const btn = `btn-cadastrar-${tipo}`;
  bloquearBotao(btn, true);

  try {
    const nome = document.getElementById(`cadastro-${tipo}-nome`).value.trim();
    const email = document.getElementById(`cadastro-${tipo}-email`).value.trim();
    const senha = document.getElementById(`cadastro-${tipo}-senha`).value;

    if (!nome || !email || !senha) {
      alert("Preencha todos os campos!");
      return;
    }

    if (senha.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    const tipoConta = tipo === "admin" ? "administrador" : "professor";
    const data = await apiFetch("/api/cadastro", { nome, email, senha, tipo: tipoConta });

    if (data.sucesso) {
      alert("Cadastro concluído! Faça login.");
      mostrarLogin(tipo);
    }

  } catch (err) {
    console.error(err);
    alert("Erro ao cadastrar!");
  } finally {
    bloquearBotao(btn, false);
  }
};
