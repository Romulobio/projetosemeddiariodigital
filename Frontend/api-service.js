export const API_BASE_URL = "https://prosemeddiariodigital-production.up.railway.app";

console.log("🌐 API Service - Backend URL:", API_BASE_URL);

class ApiService {

  // ===============================
  // FUNÇÃO CENTRAL DE REQUISIÇÃO
  // ===============================
  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

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
      try {
        data = await response.json();
      } catch {
        console.warn("⚠️ Resposta não era JSON.");
      }

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

  // 🔥 CORRIGIDO → backend usa /logout (SEM /api)
  static logout() {
    return this.request("/logout", { method: "POST" });
  }

  // ============================
  // TURMAS  (você ainda vai criar no backend)
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
  // DISCIPLINAS (você ainda vai criar)
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
  // ADMINS E PERMISSÕES (🔥 CORRIGIDOS)
  // ============================
  
  // BACKEND: GET /api/admin/administradores
  static getAdmins() {
    return this.request("/api/admin/administradores");
  }

  // BACKEND: POST /api/cadastro (não existe rota /api/admins)
  static cadastroAdmin(data) {
    return this.request("/api/cadastro", {
      method: "POST",
      body: data,
    });
  }

  // BACKEND: POST /api/admin/toggle-permission
  static alternarPermissao(data) {
    return this.request("/api/admin/toggle-permission", {
      method: "POST",
      body: data,
    });
  }

  // ============================
  // SENHAS (não existem no backend ainda)
  // ============================
  static alterarMinhaSenha(data) {
    console.warn("⚠️ Rota /api/senhas/alterar não existe no backend!");
    return this.request("/api/senhas/alterar", {
      method: "POST",
      body: data,
    });
  }

  static redefinirSenhaUsuario(data) {
    console.warn("⚠️ Rota /api/senhas/redefinir não existe no backend!");
    return this.request("/api/senhas/redefinir", {
      method: "POST",
      body: data,
    });
  }
}

window.apiService = ApiService;
export default ApiService;
