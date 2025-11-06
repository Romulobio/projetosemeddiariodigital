// ================================
// api-service.js
// Versão ES Modules (compatível com import/export)
// ================================

class ApiService {
  constructor() {
    // ⚙️ Base URL do seu backend no Railway
    this.baseURL = 'https://prosemeddiariodigital-production.up.railway.app';
  }

  // ============================
  // Método genérico de requisição
  // ============================
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      method: options.method || 'GET',
      mode: 'cors',
      credentials: 'include', // 🔥 importante p/ cookies de sessão
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body
        ? typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body)
        : undefined
    };

    try {
      console.log(`🌐 Requisição: ${url}`, config);

      const response = await fetch(url, config);
      const contentType = response.headers.get('content-type');

      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Resposta não é JSON (${response.status} ${response.statusText})`);
      }

      const data = await response.json();
      console.log('📨 Resposta recebida:', data);
      return data;

    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      return {
        sucesso: false,
        erro: 'Erro de conexão: ' + error.message
      };
    }
  }

  // ============================
  // ROTAS DE AUTENTICAÇÃO
  // ============================
  async login(credenciais) {
    return this.request('/login', {
      method: 'POST',
      body: credenciais
    });
  }

  async cadastro(dados) {
    return this.request('/cadastro', {
      method: 'POST',
      body: dados
    });
  }

  async logout() {
    return this.request('/logout', { method: 'POST' });
  }

  async getUsuario() {
    return this.request('/api/dados-usuario');
  }

  async alterarSenha(dados) {
    return this.request('/alterar-senha', {
      method: 'POST',
      body: dados
    });
  }

  async checkAuth() {
    return this.request('/check-auth');
  }

  // ============================
  // ROTAS ADMINISTRATIVAS
  // ============================
  async getTurmas() {
    return this.request('/api/turmas');
  }

  async criarTurma(dados) {
    return this.request('/api/turmas', {
      method: 'POST',
      body: dados
    });
  }

  async getProfessores() {
    return this.request('/api/professores');
  }

  async getAlunos() {
    return this.request('/api/alunos');
  }

  // ============================
  // ROTAS DE DEPURAÇÃO
  // ============================
  async getDebugTables() {
    return this.request('/debug/tables');
  }

  async getDebugUsuarios() {
    return this.request('/debug/usuarios');
  }

  async getHealth() {
    return this.request('/health');
  }
}

// ====================================================
// Exporta para uso com "import { apiService } from './api-service.js'"
// ====================================================
export const apiService = new ApiService();

// Também deixa disponível no navegador (uso global opcional)
if (typeof window !== 'undefined') {
  window.apiService = apiService;
}
