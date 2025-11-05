// api-service.js - VERSÃO CORRIGIDA DEFINITIVA
class ApiService {
  constructor() {
    this.baseURL = '';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      mode: 'cors',
      credentials: 'include', // 🔥 IMPORTANTE para sessões
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (options.body) {
      config.body = options.body;
    }

    try {
      console.log(`🌐 Fazendo requisição para: ${url}`);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📨 Resposta recebida:', data);
      return data;
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      
      // Mensagem mais específica para CORS
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        return { 
          sucesso: false, 
          erro: 'Erro de CORS. O servidor precisa ser configurado para permitir requisições do Vercel.' 
        };
      }
      
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
      body: JSON.stringify(credenciais)
    });
  }

  async cadastro(dados) {
    return this.request('/cadastro', {
      method: 'POST',
      body: JSON.stringify(dados)
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
      body: JSON.stringify(dados)
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
      body: JSON.stringify(dados)
    });
  }

  async excluirTurma(id) {
    return this.request(`/api/turmas/${id}`, {
      method: 'DELETE'
    });
  }

  async getProfessores() {
    return this.request('/api/professores');
  }

  async getAlunos() {
    return this.request('/api/alunos');
  }

  async criarAluno(dados) {
    return this.request('/api/alunos', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async excluirAluno(id) {
    return this.request(`/api/alunos/${id}`, {
      method: 'DELETE'
    });
  }

  async excluirProfessor(id) {
    return this.request(`/api/professores/${id}`, {
      method: 'DELETE'
    });
  }

  async vincularProfessor(professorId, turmaId) {
    return this.request('/api/vincular-professor', {
      method: 'POST',
      body: JSON.stringify({ professor_id: professorId, turma_id: turmaId })
    });
  }

  // ==================== ADMIN - CONFIGURAÇÕES ====================
  async getUsuariosAdmin() {
    return this.request('/admin/usuarios');
  }

  async getAdministradores() {
    return this.request('/admin/administradores');
  }

  async cadastrarAdmin(dados) {
    return this.request('/admin/cadastrar-admin', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async redefinirSenhaAdmin(dados) {
    return this.request('/admin/redefinir-senha', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async verificarPermissaoAdmin() {
    return this.request('/api/verificar-permissao-admin');
  }

  async toggleAdminPermission(dados) {
    return this.request('/admin/toggle-permission', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  // ==================== ADMIN - DISCIPLINAS ====================
  async getTodasDisciplinas() {
    return this.request('/api/disciplinas');
  }

  async getDisciplinasProfessor(professorId) {
    return this.request(`/api/professor/${professorId}/disciplinas`);
  }

  async vincularDisciplinas(dados) {
    return this.request('/api/vincular-disciplinas', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async removerDisciplina(dados) {
    return this.request('/api/remover-disciplina', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  // ==================== PROFESSOR ====================
  async getTurmasProfessor() {
    return this.request('/api/turmas-professor');
  }

  async getAlunosTurmaProfessor() {
    return this.request('/api/alunos-turma-professor');
  }

  async getTurmasNotasProfessor() {
    return this.request('/api/notas-turmas-professor');
  }

  // ==================== FREQUÊNCIA ====================
  async salvarFrequencia(dados) {
    return this.request('/api/frequencia', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async getFrequencia(dia, mes, ano, turmaId) {
    return this.request(`/api/frequencia/${dia}/${mes}/${ano}/${turmaId}`);
  }

  // ==================== NOTAS ====================
  async getNotasTurma(turmaId, unidade) {
    return this.request(`/api/notas/${turmaId}/${unidade}`);
  }

  async salvarNotas(dados) {
    return this.request('/api/notas', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async getMediasAnuais(turmaId) {
    return this.request(`/api/medias-anuais/${turmaId}`);
  }

  // ==================== OBJETOS DE CONHECIMENTO ====================
  async getObjetosConhecimento(turmaId, disciplinaId, mes, ano) {
    return this.request(`/api/objetos-conhecimento/${turmaId}/${disciplinaId}/${mes}/${ano}`);
  }

  async salvarObjetosConhecimento(dados) {
    return this.request('/api/objetos-conhecimento', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  // ==================== RELATÓRIOS ====================
  async gerarRelatorio(queryParams) {
    return this.request(`/gerar-relatorio?${queryParams}`);
  }

  // ==================== DIÁRIO/AULAS ====================
  async getAulasTurma(turmaId, data) {
    return this.request(`/api/aulas/${turmaId}/${data}`);
  }

  async salvarAula(dados) {
    return this.request('/api/aulas', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async atualizarAula(aulaId, dados) {
    return this.request(`/api/aulas/${aulaId}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async excluirAula(aulaId) {
    return this.request(`/api/aulas/${aulaId}`, {
      method: 'DELETE'
    });
  }
}

window.apiService = new ApiService();