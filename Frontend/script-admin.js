// ================================
// 📦 Importa e inicializa o serviço de API
// ================================
import ApiService from './api-service.js';
const api = new ApiService();

// ================================
// 🔐 Função de Login do Administrador
// ================================
async function loginAdmin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value.trim();

  if (!email || !senha) {
    alert('Preencha todos os campos.');
    return;
  }

  try {
    const dados = { email, senha };
    const resposta = await api.post('/api/login', dados);

    if (resposta.success) {
      alert('Login realizado com sucesso!');
      window.location.href = 'admin.html';
    } else {
      alert(resposta.message || 'Falha no login.');
    }
  } catch (erro) {
    console.error('Erro ao fazer login:', erro);
    alert('Erro ao tentar fazer login no servidor.');
  }
}

// ================================
// 👤 Cadastrar novo usuário
// ================================
async function cadastrarUsuario(event) {
  event.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const email = document.getElementById('emailCadastro').value.trim();
  const senha = document.getElementById('senhaCadastro').value.trim();
  const tipo = document.getElementById('tipo').value;

  if (!nome || !email || !senha || !tipo) {
    alert('Preencha todos os campos.');
    return;
  }

  try {
    const novoUsuario = { nome, email, senha, tipo };
    const resposta = await api.post('/api/cadastrar', novoUsuario);

    if (resposta.success) {
      alert('Usuário cadastrado com sucesso!');
      document.getElementById('formCadastro').reset();
      carregarUsuarios(); // Atualiza a lista
    } else {
      alert(resposta.message || 'Erro ao cadastrar usuário.');
    }
  } catch (erro) {
    console.error('Erro ao cadastrar:', erro);
    alert('Erro ao conectar ao servidor.');
  }
}

// ================================
// 📋 Carregar lista de usuários
// ================================
async function carregarUsuarios() {
  try {
    const usuarios = await api.get('/api/usuarios');

    const tabela = document.getElementById('tabelaUsuarios');
    tabela.innerHTML = ''; // Limpa

    usuarios.forEach(user => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.nome}</td>
        <td>${user.email}</td>
        <td>${user.tipo}</td>
        <td>
          <button onclick="editarUsuario(${user.id})">✏️</button>
          <button onclick="excluirUsuario(${user.id})">🗑️</button>
        </td>
      `;
      tabela.appendChild(row);
    });
  } catch (erro) {
    console.error('Erro ao carregar usuários:', erro);
    alert('Falha ao obter lista de usuários.');
  }
}

// ================================
// 🗑️ Excluir usuário
// ================================
async function excluirUsuario(id) {
  if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

  try {
    const resposta = await api.delete(`/api/usuarios/${id}`);
    if (resposta.success) {
      alert('Usuário excluído com sucesso.');
      carregarUsuarios();
    } else {
      alert(resposta.message || 'Erro ao excluir usuário.');
    }
  } catch (erro) {
    console.error('Erro ao excluir:', erro);
    alert('Erro de comunicação com o servidor.');
  }
}

// ================================
// ✏️ Editar usuário
// ================================
async function editarUsuario(id) {
  const novoNome = prompt('Digite o novo nome:');
  if (!novoNome) return;

  try {
    const resposta = await api.put(`/api/usuarios/${id}`, { nome: novoNome });
    if (resposta.success) {
      alert('Usuário atualizado!');
      carregarUsuarios();
    } else {
      alert(resposta.message || 'Erro ao atualizar.');
    }
  } catch (erro) {
    console.error('Erro ao editar:', erro);
    alert('Erro de comunicação com o servidor.');
  }
}

// ================================
// 🚪 Logout
// ================================
async function logout() {
  try {
    const resposta = await api.post('/api/logout');
    if (resposta.success) {
      alert('Logout realizado.');
      window.location.href = 'index.html';
    } else {
      alert('Erro ao sair.');
    }
  } catch (erro) {
    console.error('Erro ao fazer logout:', erro);
  }
}

// ================================
// ⚡ Inicialização da Página
// ================================
document.addEventListener('DOMContentLoaded', () => {
  // Se houver uma tabela de usuários, carregue
  if (document.getElementById('tabelaUsuarios')) {
    carregarUsuarios();
  }

  // Adiciona listeners se os formulários existirem
  const formLogin = document.getElementById('formLogin');
  if (formLogin) formLogin.addEventListener('submit', loginAdmin);

  const formCadastro = document.getElementById('formCadastro');
  if (formCadastro) formCadastro.addEventListener('submit', cadastrarUsuario);

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) btnLogout.addEventListener('click', logout);
});
