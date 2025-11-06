// =============================================
// api-service.js — versão compatível com script-login.js
// =============================================
class ApiService {
  constructor() {
    // URL do seu backend no Railway
    this.baseURL = 'https://prosemeddiariodigital-production.up.railway.app';
  }

  // ========================
  // LOGIN
  // ========================
  async login(dados) {
    try {
      const response = await fetch(`${this.baseURL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });

      const data = await response.json();
      console.log('🔹 Resposta do login:', data);
      return data;
    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw error;
    }
  }

  // ========================
  // CADASTRO (professor / admin)
  // ========================
  async cadastro(dados) {
    try {
      const response = await fetch(`${this.baseURL}/api/cadastro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });

      const data = await response.json();
      console.log('🔹 Resposta do cadastro:', data);
      return data;
    } catch (error) {
      console.error('❌ Erro no cadastro:', error);
      throw error;
    }
  }

  // ========================
  // Função genérica (se quiser reaproveitar para outras rotas)
  // ========================
  async get(path) {
    try {
      const response = await fetch(`${this.baseURL}${path}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return await response.json();
    } catch (error) {
      console.error('❌ Erro no GET:', error);
      throw error;
    }
  }
}

// Exporta globalmente (para funcionar em HTML sem import/export)
window.apiService = new ApiService();
