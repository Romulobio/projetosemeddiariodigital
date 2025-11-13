// ===============================
// API SERVICE - ÚNICO PONTO DE ACESSO À API
// ===============================

// Detecta automaticamente se está rodando localmente ou no Railway
const BASE_URL = window.location.hostname.includes('localhost')
  ? 'http://localhost:8080'
  : 'https://prosemeddiariodigital-production.up.railway.app';

// Função genérica para requisições
async function apiFetch(endpoint, data = {}, method = 'POST') {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'GET' ? null : JSON.stringify(data),
      credentials: 'include', // permite enviar cookies/sessões
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro HTTP ${response.status}: ${errorText}`);
      throw new Error(`Erro HTTP ${response.status}`);
    }

    const json = await response.json();
    return json;
  } catch (error) {
    console.error('❌ Erro na comunicação com o servidor:', error);
    alert('Erro de conexão com o servidor. Verifique sua internet ou tente novamente.');
    throw error;
  }
}

// Métodos auxiliares
async function apiGet(endpoint) {
  return apiFetch(endpoint, {}, 'GET');
}

async function apiPut(endpoint, data) {
  return apiFetch(endpoint, data, 'PUT');
}

async function apiDelete(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro HTTP ${response.status}: ${errorText}`);
      throw new Error(`Erro HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao excluir:', error);
    alert('Erro ao excluir no servidor.');
    throw error;
  }
}

// ✅ Exporta como módulo (para ser importado com ES Modules)
export const apiService = {
  apiFetch,
  apiGet,
  apiPut,
  apiDelete
};

console.log('✅ api-service.js carregado com sucesso:', BASE_URL);
