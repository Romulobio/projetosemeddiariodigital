const BASE_URL = window.location.hostname.includes('localhost') 
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

      // Se a resposta não for ok, tenta obter a mensagem de erro do body
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.erro || errorMessage;
        } catch (e) {
          // Ignora se não for JSON
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      throw error;
    }
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

// Para compatibilidade
window.apiService = ApiService;
export default ApiService;