// ================================
// 📦 api-service.js
// Serviço central de comunicação com o backend
// ================================

// 🚀 URL base do seu backend no Railway
const BASE_URL = 'https://projetosemeddiariodigital-production.up.railway.app';

// Classe que concentra todas as chamadas à API
class ApiService {
  constructor() {
    this.baseURL = BASE_URL;
  }

  // ===========================
  // 🔐 LOGIN / AUTENTICAÇÃO
  // ===========================
  async login(email, senha, tipo) {
    return this._fetch('/api/login', 'POST', { email, senha, tipo });
  }

  async logout() {
    return this._fetch('/api/logout', 'POST');
  }

  async verificarSessao() {
    return this._fetch('/api/verificar-sessao', 'GET');
  }

  // ===========================
  // 🧑‍🏫 PROFESSORES
  // ===========================
  async getProfessores() {
    return this._fetch('/api/professores', 'GET');
  }

  async cadastrarProfessor(nome, email, senha, disciplinas) {
    return this._fetch('/api/professores', 'POST', { nome, email, senha, disciplinas });
  }

  async excluirProfessor(id) {
    return this._fetch(`/api/professores/${id}`, 'DELETE');
  }

  // ===========================
  // 🎓 ALUNOS
  // ===========================
  async getAlunos() {
    return this._fetch('/api/alunos', 'GET');
  }

  async cadastrarAluno(nome, email, senha, turma_id) {
    return this._fetch('/api/alunos', 'POST', { nome, email, senha, turma_id });
  }

  async excluirAluno(id) {
    return this._fetch(`/api/alunos/${id}`, 'DELETE');
  }

  // ===========================
  // 🏫 TURMAS
  // ===========================
  async getTurmas() {
    return this._fetch('/api/turmas', 'GET');
  }

  async cadastrarTurma(nome, ano, curso) {
    return this._fetch('/api/turmas', 'POST', { nome, ano, curso });
  }

  async excluirTurma(id) {
    return this._fetch(`/api/turmas/${id}`, 'DELETE');
  }

  // ===========================
  // 📘 DISCIPLINAS
  // ===========================
  async getDisciplinas() {
    return this._fetch('/api/disciplinas', 'GET');
  }

  async cadastrarDisciplina(nome, carga_horaria) {
    return this._fetch('/api/disciplinas', 'POST', { nome, carga_horaria });
  }

  async excluirDisciplina(id) {
    return this._fetch(`/api/disciplinas/${id}`, 'DELETE');
  }

  // ===========================
  // 💾 Função genérica de fetch
  // ===========================
  async _fetch(endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // mantém cookies/sessões
    };

    if (body) options.body = JSON.stringify(body);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, options);

      // tenta converter para JSON
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error(`❌ Erro em ${endpoint}:`, data || response.statusText);
        throw new Error(data?.message || `Erro: ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`🚨 Falha ao acessar ${endpoint}:`, err.message);
      throw err;
    }
  }
}

// 🔧 Cria instância global (disponível no navegador)
window.apiService = new ApiService();
