// api-service.js - VERSÃO CORRIGIDA PARA RAILWAY
class ApiService {
  constructor() {
    // ⚠️ CONFIGURADO PARA SEU BACKEND NO RAILWAY
    this.baseURL = 'https://projetosemeddiariodigital-production.up.railway.app';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      mode: 'cors',
      credentials: 'include', // 🔥 CRÍTICO para sessions
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (options.body && typeof options.body !== 'string') {
      config.body = JSON.stringify(options.body);
    } else if (options.body) {
      config.body = options.body;
    }

    try {
      console.log(`🌐 Fazendo requisição para: ${url}`);
      const response = await fetch(url, config);
      
      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Resposta não é JSON: ${response.status} ${response.statusText}`);
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

  // ==================== AUTENTICAÇÃO ====================
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

  // ==================== ADMIN - GERAL ====================
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

  // ==================== DEBUG ====================
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

// Tornar global para uso no frontend
if (typeof window !== 'undefined') {
  window.apiService = new ApiService();
}

// Para módulos ES6
export default ApiService;