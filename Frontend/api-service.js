const BASE_URL = window.location.hostname.includes('localhost')
  ? 'http://localhost:5000' 
  : 'https://projetosemeddiariodigital-production.up.railway.app';

console.log("🌐 API Service - Backend URL:", BASE_URL);

class ApiService {
  static async request(endpoint, options = {}) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      console.log(`🔄 Fazendo requisição para: ${url}`);

      const config = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
        ...options,
      };

      if (config.method !== 'GET' && options.body) {
        config.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, config);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.erro || errorMessage;
        } catch (e) {}
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      throw error;
    }
  }

  // ============================
  // ✔️ Função para verificar autenticação
  // ============================
  static async checkAuth() {
    return this.request('/api/check-auth');
  }

  // ============================
  // ✔️ Função de login
  // ============================
  static async login(data) {
    return this.request('/api/login', { method: 'POST', body: data });
  }

  static getTurmas() {
    return this.request('/api/turmas');
  }

  static getProfessores() {
    return this.request('/api/professores');
  }

  static getAlunos() {
    return this.request('/api/alunos');
  }

  static cadastrarTurma(data) {
    return this.request('/api/turmas', { method: 'POST', body: data });
  }

  static cadastrarUsuario(data) {
    return this.request('/api/cadastro', { method: 'POST', body: data });
  }

  static excluirTurma(id) {
    return this.request(`/api/turmas/${id}`, { method: 'DELETE' });
  }
}

window.apiService = ApiService;
export default ApiService;
