// api-service.js - versão robusta (ES Modules, export default)
class ApiService {
  constructor() {
    this.baseURL = 'https://proje­tosemeddiariodigital-production.up.railway.app'; // ajuste se precisar
    // Se futuro: ler de variável window.__API_BASE__ ou similar
  }

  // helper interno para fetch com tratamento e credentials
  async _fetchJson(url, options = {}) {
    const cfg = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      credentials: 'include' // MUITO IMPORTANTE para cookies/sessão
    };

    try {
      const res = await fetch(url, cfg);

      // Se 204 No Content, retornar objeto vazio
      if (res.status === 204) return {};

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // tenta ler texto para debug
        const text = await res.text();
        return { sucesso: false, erro: `Resposta não-JSON (${res.status}): ${text}` };
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Erro no fetch:', err);
      return { sucesso: false, erro: 'Erro de conexão: ' + err.message };
    }
  }

  // LOGIN: espera um objeto { email, senha } (compatível com script-login.js)
  async login(dados) {
    // normalizar: aceitar (email, senha) ou um objeto
    let bodyObj = {};
    if (dados && typeof dados === 'object' && ('email' in dados || 'usuario' in dados)) {
      // se chamado com { email, senha } — ok
      bodyObj.email = dados.email ?? dados.usuario ?? '';
      bodyObj.senha = dados.senha ?? dados.password ?? '';
    } else {
      // quando chamado como login(usuario, senha) — compatibilidade mínima
      bodyObj.email = arguments[0] ?? '';
      bodyObj.senha = arguments[1] ?? '';
    }

    // endpoints possíveis (tenta /api/login primeiro, depois /login)
    const attempts = [
      `${this.baseURL}/api/login`,
      `${this.baseURL}/login`
    ];

    for (const url of attempts) {
      const response = await this._fetchJson(url, {
        method: 'POST',
        body: JSON.stringify(bodyObj)
      });

      // Se servidor respondeu com sucesso ou erro estruturado, devolve
      if (response && typeof response === 'object' && ('sucesso' in response || 'erro' in response || response.usuario)) {
        return response;
      }

      // Se a resposta indicar 404/rota não encontrada, o helper já converteu pra objeto com erro
      // Continuamos para o próximo endpoint
    }

    // se nenhum endpoint funcionou
    return { sucesso: false, erro: 'Nenhum endpoint de login respondeu. Verifique se o backend tem /login ou /api/login.' };
  }

  // CADASTRO: espera objeto { nome, email, senha, tipo }
  async cadastro(dados) {
    // tenta /api/cadastro e /cadastro (fallback)
    const attempts = [
      `${this.baseURL}/api/cadastro`,
      `${this.baseURL}/cadastro`
    ];

    for (const url of attempts) {
      const response = await this._fetchJson(url, {
        method: 'POST',
        body: JSON.stringify(dados)
      });

      if (response && typeof response === 'object' && ('sucesso' in response || 'erro' in response)) {
        return response;
      }
    }

    return { sucesso: false, erro: 'Nenhum endpoint de cadastro respondeu. Verifique se o backend tem /cadastro ou /api/cadastro.' };
  }

  // exemplo de GET com credenciais (útil para check-auth / dados-usuario)
  async get(path) {
    return this._fetchJson(`${this.baseURL}${path}`, { method: 'GET' });
  }

  // fallback genérico POST
  async post(path, dados) {
    return this._fetchJson(`${this.baseURL}${path}`, {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }
}

const apiService = new ApiService();
export default apiService;

// também, se você usa import { apiService } em vez do default, opcionalmente:
export { apiService };
