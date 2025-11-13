// CORREÇÃO: Mude para isso no api-service.js
const BASE_URL = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
  ? 'http://localhost:8080'
  : 'https://prosemeddiariodigital-production.up.railway.app';

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
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      throw error;
    }
  }

  // Métodos específicos para facilitar
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

  static cadastrarProfessor(data) {
    return this.request('/api/cadastro', { method: 'POST', body: data });
  }

  static cadastrarAluno(data) {
    return this.request('/api/cadastro', { method: 'POST', body: data });
  }

  static excluirTurma(id) {
    return this.request(`/api/turmas/${id}`, { method: 'DELETE' });
  }
}

// Para compatibilidade
window.apiService = ApiService;
export default ApiService;