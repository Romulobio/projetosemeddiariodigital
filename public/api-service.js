// api-service.js - versão corrigida
class ApiService {
  constructor() {
    // URL do seu backend no Railway
    this.baseURL = 'https://prosemeddiariodigital-production.up.railway.app';
  }

  async login(usuario, senha) {
    try {
      const response = await fetch(`${this.baseURL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha }),
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }
  }

  async registrar(dados) {
    try {
      const response = await fetch(`${this.baseURL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao registrar:', error);
      throw error;
    }
  }
}

export default new ApiService();
