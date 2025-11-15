// ===============================
// BASE URL AUTOMÁTICA
// ===============================
const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:5000"
  : "https://projetosemeddiariodigital-production.up.railway.app";

console.log("🌐 API Service - Backend URL:", BASE_URL);

class ApiService {

  // ===============================
  // FUNÇÃO CENTRAL DE REQUISIÇÃO
  // ===============================
  static async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;

    console.log(`🔄 Requisição → ${url}`);

    const config = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include",
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);

      let data = null;
      try { data = await response.json(); } catch {}

      if (!response.ok) {
        throw new Error(data?.erro || data?.error || `Erro ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error("❌ Erro na API:", err);
      throw err;
    }
  }

  // ============================
  // AUTENTICAÇÃO
  // ============================
  static checkAuth() {
    return this.request("/api/check-auth");
  }

  static login(data) {
    return this.request("/api/login", {
      method: "POST",
      body: data,
    });
  }

  static logout() {
    return this.request("/api/logout", { method: "POST" });
  }

  // ============================
  // TURMAS
  // ============================
  static getTurmas() {
    return this.request("/api/turmas");
  }

  static cadastrarTurma(data) {
    return this.request("/api/turmas", {
      method: "POST",
      body: data,
    });
  }

  static excluirTurma(id) {
    return this.request(`/api/turmas/${id}`, {
      method: "DELETE",
    });
  }

  // ============================
  // PROFESSORES
  // ============================
  static getProfessores() {
    return this.request("/api/professores");
  }

  static cadastrarProfessor(data) {
    return this.request("/api/professores", {
      method: "POST",
      body: data,
    });
  }

  static excluirProfessor(id) {
    return this.request(`/api/professores/${id}`, {
      method: "DELETE",
    });
  }

  static vincularProfessor(data) {
    return this.request("/api/professores/vincular", {
      method: "POST",
      body: data,
    });
  }

  // ============================
  // DISCIPLINAS
  // ============================
  static getDisciplinas() {
    return this.request("/api/disciplinas");
  }

  static vincularDisciplinas(data) {
    return this.request("/api/professores/disciplinas", {
      method: "POST",
      body: data,
    });
  }

  static getDisciplinasProfessor(id) {
    return this.request(`/api/professores/${id}/disciplinas`);
  }

  // ============================
  // ALUNOS
  // ============================
  static getAlunos() {
    return this.request("/api/alunos");
  }

  static cadastrarAluno(data) {
    return this.request("/api/alunos", {
      method: "POST",
      body: data,
    });
  }

  static excluirAluno(id) {
    return this.request(`/api/alunos/${id}`, {
      method: "DELETE",
    });
  }

  // ============================
  // ADMINS E PERMISSÕES
  // ============================
  static getAdmins() {
    return this.request("/api/admins");
  }

  static cadastroAdmin(data) {
    return this.request("/api/admins", {
      method: "POST",
      body: data,
    });
  }

  static alternarPermissao(id) {
    return this.request(`/api/admins/${id}/toggle`, {
      method: "PUT",
    });
  }

  // ============================
  // SENHAS
  // ============================
  static alterarMinhaSenha(data) {
    return this.request("/api/senhas/alterar", {
      method: "POST",
      body: data,
    });
  }

  static redefinirSenhaUsuario(data) {
    return this.request("/api/senhas/redefinir", {
      method: "POST",
      body: data,
    });
  }
}

// EXPORTAÇÃO GLOBAL PARA O script-admin.js
window.apiService = ApiService;
export default ApiService;
