export const API_BASE_URL = "https://prosemeddiariodigital-production.up.railway.app";

console.log("🌐 API Service - Backend URL:", API_BASE_URL);

class ApiService {

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
  // AUTENTICAÇÃO (SEM /api/)
  // ============================
  static checkAuth() {
    return this.request("/check-auth");
  }

  static login(data) {
    return this.request("/login", {
      method: "POST",
      body: data,
    });
  }

  static logout() {
    return this.request("/logout", { method: "POST" });
  }

  // ============================
  // TURMAS
  // ============================
  static getTurmas() {
    return this.request("/turmas");
  }

  static cadastrarTurma(data) {
    return this.request("/turmas", {
      method: "POST",
      body: data,
    });
  }

  static excluirTurma(id) {
    return this.request(`/turmas/${id}`, {
      method: "DELETE",
    });
  }

  // ============================
  // PROFESSORES
  // ============================
  static getProfessores() {
    return this.request("/professores");
  }

  static cadastrarProfessor(data) {
    return this.request("/professores", {
      method: "POST",
      body: data,
    });
  }

  static excluirProfessor(id) {
    return this.request(`/professores/${id}`, {
      method: "DELETE",
    });
  }

  static vincularProfessor(data) {
    return this.request("/professores/vincular", {
      method: "POST",
      body: data,
    });
  }

  // ============================
  // DISCIPLINAS
  // ============================
  static getDisciplinas() {
    return this.request("/disciplinas");
  }

  static vincularDisciplinas(data) {
    return this.request("/professores/disciplinas", {
      method: "POST",
      body: data,
    });
  }

  static getDisciplinasProfessor(id) {
    return this.request(`/professores/${id}/disciplinas`);
  }

  // ============================
  // ALUNOS
  // ============================
  static getAlunos() {
    return this.request("/alunos");
  }

  static cadastrarAluno(data) {
    return this.request("/alunos", {
      method: "POST",
      body: data,
    });
  }

  static excluirAluno(id) {
    return this.request(`/alunos/${id}`, {
      method: "DELETE",
    });
  }

  // ============================
  // ADMINS
  // ============================
  static getAdmins() {
    return this.request("/admins");
  }

  static cadastroAdmin(data) {
    return this.request("/admins", {
      method: "POST",
      body: data,
    });
  }

  static alternarPermissao(id) {
    return this.request(`/admins/${id}/toggle`, {
      method: "PUT",
    });
  }

  // ============================
  // SENHAS
  // ============================
  static alterarMinhaSenha(data) {
    return this.request("/senhas/alterar", {
      method: "POST",
      body: data,
    });
  }

  static redefinirSenhaUsuario(data) {
    return this.request("/senhas/redefinir", {
      method: "POST",
      body: data,
    });
  }
}
function abrirFrequencia() {
  window.location.href = "professor-frequencia.html";
}

function abrirDiario() {
  window.location.href = "professor-diario.html";
}

function abrirRelatorios() {
  window.location.href = "professor-relatorios.html";
}

function abrirNotas() {
  window.location.href = "professor-notas.html";
}


window.apiService = ApiService;
export default ApiService;
