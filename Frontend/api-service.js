// ===============================
// API SERVICE - MÓDULO CENTRAL DE ACESSO À API
// ===============================

const BASE_URL = window.location.hostname.includes('localhost')
  ? 'http://localhost:8080'
  : 'https://prosemeddiariodigital-production.up.railway.app';

class ApiService {
  static async fetch(endpoint, data = {}, method = 'POST') {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'GET' ? null : JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro HTTP ${response.status}: ${errorText}`);
        throw new Error(`Erro HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erro na comunicação com o servidor:', error);
      alert('Erro de conexão com o servidor.');
      throw error;
    }
  }

  static get(endpoint) {
    return this.fetch(endpoint, {}, 'GET');
  }

  static post(endpoint, data) {
    return this.fetch(endpoint, data, 'POST');
  }

  static put(endpoint, data) {
    return this.fetch(endpoint, data, 'PUT');
  }

  static delete(endpoint) {
    return this.fetch(endpoint, {}, 'DELETE');
  }
}

export default ApiService;

console.log('✅ api-service.js carregado com sucesso:', BASE_URL);
