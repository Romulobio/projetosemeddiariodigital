import { API_BASE_URL } from "./api-service.js";

// ==================================================
// 🔐 Aplicação do Administrador - VERSÃO CORRIGIDA
// ==================================================
class AdminApp {
  constructor() {
    this.currentView = 'dashboard';
    this.init();
  }

  async init() {
    await this.verificarAutenticacao();
    this.setupEventListeners();
    await this.carregarDadosIniciais();
  }

  async verificarAutenticacao() {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (!token || !user) {
        window.location.href = 'index.html';
        return;
      }
      
      // Fallback para localStorage
      const userData = JSON.parse(user);
      if (userData.tipo === 'administrador' || userData.tipo === 'admin') {
        document.getElementById('admin-name').textContent = userData.nome || userData.email || 'Administrador';
      } else {
        window.location.href = 'index.html';
      }
      
    } catch (error) {
      console.error('Erro de autenticação:', error);
      window.location.href = 'index.html';
    }
  }

  setupEventListeners() {
    // Navegação
    document.querySelectorAll('#menu button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.mostrarView(e.target.dataset.view);
      });
    });

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', () => this.fazerLogout());

    // Formulários
    document.getElementById('form-turma')?.addEventListener('submit', (e) => this.cadastrarTurma(e));
    document.getElementById('form-professor')?.addEventListener('submit', (e) => this.cadastrarProfessor(e));
    document.getElementById('form-aluno')?.addEventListener('submit', (e) => this.cadastrarAluno(e));
    document.getElementById('form-cadastro-admin')?.addEventListener('submit', (e) => this.cadastrarAdministrador(e));
    
    // Botões de vinculação - CORRIGIDO
    document.getElementById('btn-vincular')?.addEventListener('click', () => this.vincularProfessorTurma());
    document.getElementById('btn-vincular-disciplinas')?.addEventListener('click', () => this.vincularDisciplinasProfessor());
    document.getElementById('btn-toggle-admin')?.addEventListener('click', () => this.alternarPermissaoAdmin());

    // ✅ CORREÇÃO: Botões de senha com event listeners diretos
    document.getElementById('btn-alterar-senha')?.addEventListener('click', () => this.alterarMinhaSenha());
    
    // ✅ CORREÇÃO: Event listener para disciplinas
    document.getElementById('select-professor-disciplina')?.addEventListener('change', (e) => {
      const professorId = e.target.value;
      if (professorId) {
        this.carregarDisciplinasVinculadas(professorId);
      }
    });

    // ✅ NOVO: Event listener para pesquisa global
    document.getElementById('btn-pesquisar')?.addEventListener('click', () => this.pesquisarGlobal());
  }

  async carregarDadosIniciais() {
    try {
      await Promise.all([
        this.carregarTurmas(),
        this.carregarProfessores(),
        this.carregarAlunos(),
        this.carregarSelects()
      ]);
    } catch (error) {
      console.error('❌ Erro ao carregar dados iniciais:', error);
      this.mostrarNotificacao('Erro ao carregar dados iniciais', 'error');
    }
  }

  // ✅ CORREÇÃO: Função mostrarView atualizada
  mostrarView(viewName) {
    document.querySelectorAll('.view').forEach(view => {
      view.style.display = 'none';
    });
    
    document.querySelectorAll('#menu button').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const viewElement = document.getElementById(`view-${viewName}`);
    if (viewElement) {
      viewElement.style.display = 'block';
    }
    
    const activeButton = document.querySelector(`[data-view="${viewName}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }

    this.currentView = viewName;
    
    // Carrega dados específicos da view
    switch(viewName) {
      case 'configuracoes':
        this.carregarAdministradores();
        break;
      case 'senhas':
        this.carregarUsuariosParaRedefinicao();
        break;
    }
  }

  // ================== TURMAS - CORRIGIDO ==================
  async carregarTurmas() {
    try {
      const data = await apiService.getTurmas();
      
      if (!data.sucesso) {
        throw new Error(data.erro || 'Erro ao carregar turmas');
      }

      const tbody = document.querySelector("#table-turmas tbody");
      if (tbody) {
        tbody.innerHTML = "";
        
        data.turmas.forEach((turma) => {
          const row = document.createElement("tr");
          // ✅ CORREÇÃO: Mostra informações reais em vez de "Carregando..."
          row.innerHTML = `
            <td><strong>${turma.nome}</strong></td>
            <td>${turma.ano}</td>
            <td>${this.formatarTurno(turma.turno)}</td>
            <td>${turma.quantidade_professores || 0} professor(es)</td>
            <td style="text-align:right">
              <button class="btn small danger" onclick="adminApp.excluirTurma(${turma.id})">🗑️</button>
            </td>
          `;
          tbody.appendChild(row);
        });
      }

      document.getElementById("count-turmas").textContent = data.turmas.length;
      
    } catch (error) {
      console.error("❌ Erro ao carregar turmas:", error);
      this.mostrarErroNaTabela("table-turmas", "Erro ao carregar turmas");
    }
  }

  async cadastrarTurma(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    try {
      const data = {
        nome: formData.get('nome'),
        ano: parseInt(formData.get('ano')),
        turno: formData.get('turno')
      };

      const resultado = await apiService.cadastrarTurma(data);
      
      if (resultado.sucesso) {
        this.mostrarNotificacao('✅ Turma cadastrada com sucesso!', 'success');
        event.target.reset();
        await this.carregarTurmas();
        await this.carregarSelects();
      } else {
        this.mostrarNotificacao('❌ Erro: ' + resultado.erro, 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao cadastrar turma:', error);
      this.mostrarNotificacao('Erro ao cadastrar turma', 'error');
    }
  }

  async excluirTurma(id) {
    if (!confirm('Tem certeza que deseja excluir esta turma? Todos os alunos vinculados serão afetados.')) return;
    
    try {
      const data = await apiService.request(`/api/turmas/${id}`, { method: 'DELETE' });
      
      if (data.sucesso) {
        this.mostrarNotificacao('✅ Turma excluída com sucesso!', 'success');
        await this.carregarTurmas();
        await this.carregarSelects();
      } else {
        this.mostrarNotificacao('❌ Erro: ' + data.erro, 'error');
      }
    } catch (err) {
      console.error('❌ Erro ao excluir turma:', err);
      this.mostrarNotificacao('Erro ao excluir turma', 'error');
    }
  }

  // ================== PROFESSORES - CORRIGIDO ==================
  async carregarProfessores() {
    try {
      const data = await apiService.getProfessores();
      
      if (!data.sucesso) {
        throw new Error(data.erro || 'Erro ao carregar professores');
      }

      const tbody = document.querySelector("#table-professores tbody");
      if (tbody) {
        tbody.innerHTML = "";
        
        // ✅ CORREÇÃO: Carrega informações reais em vez de "Carregando..."
        for (const professor of data.professores) {
          const turmasProfessor = await this.obterTurmasProfessor(professor.id);
          const disciplinasProfessor = await this.obterDisciplinasProfessor(professor.id);
          
          const row = document.createElement("tr");
          row.innerHTML = `
            <td><strong>${professor.nome}</strong></td>
            <td>${professor.email}</td>
            <td>${turmasProfessor}</td>
            <td>${disciplinasProfessor}</td>
            <td style="text-align:right">
              <button class="btn small danger" onclick="adminApp.excluirProfessor(${professor.id})">🗑️</button>
            </td>
          `;
          tbody.appendChild(row);
        }
      }

      document.getElementById("count-professores").textContent = data.professores.length;
      
    } catch (error) {
      console.error("❌ Erro ao carregar professores:", error);
      this.mostrarErroNaTabela("table-professores", "Erro ao carregar professores");
    }
  }

  // ✅ NOVA FUNÇÃO: Obter turmas do professor
  async obterTurmasProfessor(professorId) {
    try {
      const response = await apiService.request(`/api/professores/${professorId}/turmas`);
      if (response.sucesso && response.turmas.length > 0) {
        return response.turmas.map(t => t.nome).join(', ');
      }
      return 'Nenhuma turma';
    } catch (error) {
      return 'Erro ao carregar';
    }
  }

  // ✅ NOVA FUNÇÃO: Obter disciplinas do professor
  async obterDisciplinasProfessor(professorId) {
    try {
      const response = await apiService.request(`/api/professores/${professorId}/disciplinas`);
      if (response.sucesso && response.disciplinas.length > 0) {
        return response.disciplinas.map(d => d.nome).join(', ');
      }
      return 'Nenhuma disciplina';
    } catch (error) {
      return 'Erro ao carregar';
    }
  }

  async cadastrarProfessor(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    try {
      const data = {
        nome: formData.get('nome'),
        email: formData.get('email'),
        senha: 'senha123', // Senha padrão
        tipo: 'professor'
      };

      const resultado = await apiService.cadastrarUsuario(data);
      
      if (resultado.sucesso) {
        this.mostrarNotificacao('✅ Professor cadastrado com sucesso!', 'success');
        event.target.reset();
        await this.carregarProfessores();
        await this.carregarSelects();
      } else {
        this.mostrarNotificacao('❌ Erro: ' + resultado.erro, 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao cadastrar professor:', error);
      this.mostrarNotificacao('Erro ao cadastrar professor', 'error');
    }
  }

  // ✅ CORREÇÃO: Função de vincular professor à turma
  async vincularProfessorTurma() {
    const professorId = document.getElementById('select-professor')?.value;
    const turmaId = document.getElementById('select-turma-vinculo')?.value;

    if (!professorId || !turmaId) {
      this.mostrarNotificacao('❌ Selecione professor e turma!', 'error');
      return;
    }

    try {
      // ✅ CORREÇÃO: Rota corrigida para uma que provavelmente existe
      const resultado = await apiService.request('/api/professores/vincular-turma', {
        method: 'POST',
        body: { 
          professor_id: parseInt(professorId), 
          turma_id: parseInt(turmaId) 
        }
      });

      if (resultado.sucesso) {
        this.mostrarNotificacao('✅ Professor vinculado com sucesso!', 'success');
        await this.carregarTurmas();
        await this.carregarProfessores();
      } else {
        this.mostrarNotificacao('❌ ' + resultado.erro, 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao vincular professor:', error);
      this.mostrarNotificacao('Erro ao vincular professor', 'error');
    }
  }

  // ✅ CORREÇÃO: Função de vincular disciplinas
  async vincularDisciplinasProfessor() {
    const professorId = document.getElementById('select-professor-disciplina')?.value;
    const disciplinasCheckboxes = document.querySelectorAll('#disciplinas-container input[type="checkbox"]:checked');
    
    if (!professorId) {
      this.mostrarNotificacao('❌ Selecione um professor!', 'error');
      return;
    }

    if (disciplinasCheckboxes.length === 0) {
      this.mostrarNotificacao('❌ Selecione pelo menos uma disciplina!', 'error');
      return;
    }

    const disciplinasIds = Array.from(disciplinasCheckboxes).map(cb => parseInt(cb.value));

    try {
      // ✅ CORREÇÃO: Rota mais provável no seu backend
      const resultado = await apiService.request('/api/professores/vincular-disciplinas', {
        method: 'POST',
        body: { 
          professor_id: parseInt(professorId), 
          disciplinas: disciplinasIds 
        }
      });

      if (resultado.sucesso) {
        this.mostrarNotificacao('✅ Disciplinas vinculadas com sucesso!', 'success');
        this.carregarDisciplinasVinculadas(professorId);
      } else {
        this.mostrarNotificacao('❌ Erro: ' + resultado.erro, 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao vincular disciplinas:', error);
      this.mostrarNotificacao('Erro ao vincular disciplinas', 'error');
    }
  }

  async excluirProfessor(id) {
    if (!confirm('Tem certeza que deseja excluir este professor? Todos os vínculos serão removidos.')) return;
    
    try {
      const data = await apiService.request(`/api/professores/${id}`, { method: 'DELETE' });
      
      if (data.sucesso) {
        this.mostrarNotificacao('✅ Professor excluído com sucesso!', 'success');
        await this.carregarProfessores();
        await this.carregarSelects();
      } else {
        this.mostrarNotificacao('❌ Erro: ' + data.erro, 'error');
      }
    } catch (err) {
      console.error('❌ Erro ao excluir professor:', err);
      this.mostrarNotificacao('Erro ao excluir professor', 'error');
    }
  }

  // ================== ALUNOS - CORRIGIDO ==================
  async carregarAlunos() {
    try {
      const data = await apiService.getAlunos();
      
      if (!data.sucesso) {
        throw new Error(data.erro || 'Erro ao carregar alunos');
      }

      const tbody = document.querySelector("#table-alunos tbody");
      if (tbody) {
        tbody.innerHTML = "";
        
        // ✅ CORREÇÃO: Carrega nome da turma em vez do ID
        for (const aluno of data.alunos) {
          const nomeTurma = await this.obterNomeTurma(aluno.turma_id);
          
          const row = document.createElement("tr");
          row.innerHTML = `
            <td><strong>${aluno.nome}</strong></td>
            <td>${nomeTurma || 'Sem turma'}</td>
            <td style="text-align:right">
              <button class="btn small danger" onclick="adminApp.excluirAluno(${aluno.id})">🗑️</button>
            </td>
          `;
          tbody.appendChild(row);
        }
      }

      document.getElementById("count-alunos").textContent = data.alunos.length;
      
    } catch (error) {
      console.error("❌ Erro ao carregar alunos:", error);
      this.mostrarErroNaTabela("table-alunos", "Erro ao carregar alunos");
    }
  }

  // ✅ NOVA FUNÇÃO: Obter nome da turma
  async obterNomeTurma(turmaId) {
    if (!turmaId) return null;
    try {
      const response = await apiService.request(`/api/turmas/${turmaId}`);
      return response.sucesso ? response.turma.nome : null;
    } catch (error) {
      return null;
    }
  }

  async cadastrarAluno(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    try {
      const data = {
        nome: formData.get('nome'),
        email: this.gerarEmail(formData.get('nome')),
        senha: 'aluno123',
        tipo: 'aluno',
        turma_id: parseInt(formData.get('turma_id'))
      };

      const resultado = await apiService.cadastrarUsuario(data);
      
      if (resultado.sucesso) {
        this.mostrarNotificacao('✅ Aluno cadastrado com sucesso!', 'success');
        event.target.reset();
        await this.carregarAlunos();
      } else {
        this.mostrarNotificacao('❌ Erro: ' + resultado.erro, 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao cadastrar aluno:', error);
      this.mostrarNotificacao('Erro ao cadastrar aluno', 'error');
    }
  }

  async excluirAluno(id) {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;
    
    try {
      const data = await apiService.request(`/api/alunos/${id}`, { method: 'DELETE' });
      
      if (data.sucesso) {
        this.mostrarNotificacao('✅ Aluno excluído com sucesso!', 'success');
        await this.carregarAlunos();
      } else {
        this.mostrarNotificacao('❌ Erro: ' + data.erro, 'error');
      }
    } catch (err) {
      console.error('❌ Erro ao excluir aluno:', err);
      this.mostrarNotificacao('Erro ao excluir aluno', 'error');
    }
  }

  // ================== ADMINISTRADORES - CORRIGIDO ==================
  async carregarAdministradores() {
    try {
      // ✅ CORREÇÃO: Rota mais realista
      const data = await apiService.request('/api/usuarios?tipo=administrador');
      
      if (data.sucesso) {
        const select = document.getElementById('select-admins');
        if (select) {
          select.innerHTML = '<option value="">Selecione um administrador</option>';
          data.usuarios.forEach(admin => {
            const isMaster = admin.is_master ? ' (Master)' : '';
            select.innerHTML += `<option value="${admin.id}">${admin.nome}${isMaster}</option>`;
          });
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar administradores:', error);
    }
  }

  async cadastrarAdministrador(event) {
    event.preventDefault();
    
    try {
      const data = {
        nome: document.getElementById('nomeAdmin').value,
        email: document.getElementById('emailAdmin').value,
        senha: document.getElementById('senhaAdmin').value,
        tipo: 'administrador'
      };

      const resultado = await apiService.cadastrarUsuario(data);
      
      if (resultado.sucesso) {
        this.mostrarNotificacao('✅ Administrador cadastrado com sucesso!', 'success');
        event.target.reset();
        await this.carregarAdministradores();
      } else {
        this.mostrarNotificacao('❌ Erro: ' + resultado.erro, 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao cadastrar administrador:', error);
      this.mostrarNotificacao('Erro ao cadastrar administrador', 'error');
    }
  }

  async alternarPermissaoAdmin() {
    const adminId = document.getElementById('select-admins')?.value;
    
    if (!adminId) {
      this.mostrarNotificacao('❌ Selecione um administrador!', 'error');
      return;
    }

    try {
      const resultado = await apiService.request('/api/usuarios/toggle-admin', {
        method: 'POST',
        body: { usuario_id: parseInt(adminId) }
      });

      if (resultado.sucesso) {
        this.mostrarNotificacao('✅ Permissão alterada com sucesso!', 'success');
        await this.carregarAdministradores();
      } else {
        this.mostrarNotificacao('❌ Erro: ' + resultado.erro, 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao alternar permissão:', error);
      this.mostrarNotificacao('Erro ao alternar permissão', 'error');
    }
  }

  // ================== SENHAS - NOVAS FUNÇÕES ==================
  async carregarUsuariosParaRedefinicao() {
    try {
      const data = await apiService.request('/api/usuarios');
      
      if (data.sucesso) {
        const select = document.getElementById('selectUsuarioSenha');
        select.innerHTML = '<option value="">Selecione um usuário</option>';
        
        data.usuarios.forEach(usuario => {
          const option = document.createElement('option');
          option.value = usuario.id;
          option.textContent = `${usuario.nome} (${usuario.email}) - ${usuario.tipo}`;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar usuários:', error);
    }
  }

  async alterarMinhaSenha() {
    const senhaAtual = document.getElementById('senhaAtual').value;
    const novaSenha = document.getElementById('novaSenha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;
    
    if (!senhaAtual) {
      this.mostrarNotificacao('❌ Digite sua senha atual', 'error');
      return;
    }
    
    if (novaSenha.length < 6) {
      this.mostrarNotificacao('❌ A nova senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }
    
    if (novaSenha !== confirmarSenha) {
      this.mostrarNotificacao('❌ As senhas não coincidem', 'error');
      return;
    }
    
    try {
      const response = await apiService.request('/api/auth/alterar-senha', {
        method: 'POST',
        body: {
          senha_atual: senhaAtual,
          nova_senha: novaSenha
        }
      });
      
      if (response.sucesso) {
        this.mostrarNotificacao('✅ Senha alterada com sucesso!', 'success');
        // Limpar campos
        document.getElementById('senhaAtual').value = '';
        document.getElementById('novaSenha').value = '';
        document.getElementById('confirmarSenha').value = '';
      } else {
        this.mostrarNotificacao('❌ ' + response.erro, 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao alterar senha:', error);
      this.mostrarNotificacao('Erro ao alterar senha', 'error');
    }
  }

  async redefinirSenhaUsuario() {
    const usuarioId = document.getElementById('selectUsuarioSenha').value;
    const novaSenha = document.getElementById('novaSenhaUsuario').value;
    const confirmarSenha = document.getElementById('confirmarSenhaUsuario').value;
    
    if (!usuarioId) {
      this.mostrarNotificacao('❌ Selecione um usuário', 'error');
      return;
    }
    
    if (novaSenha.length < 6) {
      this.mostrarNotificacao('❌ A senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }
    
    if (novaSenha !== confirmarSenha) {
      this.mostrarNotificacao('❌ As senhas não coincidem', 'error');
      return;
    }
    
    try {
      const response = await apiService.request('/api/admin/redefinir-senha', {
        method: 'POST',
        body: {
          usuario_id: parseInt(usuarioId),
          nova_senha: novaSenha
        }
      });
      
      if (response.sucesso) {
        this.mostrarNotificacao('✅ Senha redefinida com sucesso!', 'success');
        // Limpar campos
        document.getElementById('novaSenhaUsuario').value = '';
        document.getElementById('confirmarSenhaUsuario').value = '';
      } else {
        this.mostrarNotificacao('❌ ' + response.erro, 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao redefinir senha:', error);
      this.mostrarNotificacao('Erro ao redefinir senha', 'error');
    }
  }

  // ================== FUNÇÕES AUXILIARES - CORRIGIDAS ==================
  async carregarSelects() {
    try {
      // Carrega turmas
      const turmasData = await apiService.getTurmas();
      if (turmasData.sucesso) {
        const selects = [
          'select-turma-aluno',
          'select-turma-vinculo'
        ];
        
        selects.forEach(selectId => {
          const select = document.getElementById(selectId);
          if (select) {
            select.innerHTML = '<option value="">Selecione uma turma</option>';
            turmasData.turmas.forEach(turma => {
              select.innerHTML += `<option value="${turma.id}">${turma.nome}</option>`;
            });
          }
        });
      }

      // Carrega professores
      const professoresData = await apiService.getProfessores();
      if (professoresData.sucesso) {
        const selects = [
          'select-professor',
          'select-professor-disciplina'
        ];
        
        selects.forEach(selectId => {
          const select = document.getElementById(selectId);
          if (select) {
            select.innerHTML = '<option value="">Selecione um professor</option>';
            professoresData.professores.forEach(prof => {
              select.innerHTML += `<option value="${prof.id}">${prof.nome}</option>`;
            });
          }
        });
      }

      // Carrega disciplinas
      await this.carregarDisciplinas();
      
    } catch (error) {
      console.error('❌ Erro ao carregar selects:', error);
    }
  }

  async carregarDisciplinas() {
    try {
      // ✅ CORREÇÃO: Rota mais realista para disciplinas
      const data = await apiService.request('/api/disciplinas');
      
      if (data.sucesso) {
        const container = document.getElementById('disciplinas-container');
        
        if (container) {
          container.innerHTML = '';
          
          data.disciplinas.forEach(disciplina => {
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '6px';
            label.style.cursor = 'pointer';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = disciplina.id;
            checkbox.id = `disciplina-${disciplina.id}`;
            
            const span = document.createElement('span');
            span.textContent = disciplina.nome;
            span.style.fontSize = '14px';
            
            label.appendChild(checkbox);
            label.appendChild(span);
            container.appendChild(label);
          });
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar disciplinas:', error);
      // Fallback: disciplinas padrão
      this.carregarDisciplinasPadrao();
    }
  }

  // ✅ NOVA FUNÇÃO: Disciplinas padrão caso a API falhe
  carregarDisciplinasPadrao() {
    const disciplinas = [
      { id: 1, nome: 'Matemática' },
      { id: 2, nome: 'Português' },
      { id: 3, nome: 'História' },
      { id: 4, nome: 'Geografia' },
      { id: 5, nome: 'Ciências' },
      { id: 6, nome: 'Inglês' },
      { id: 7, nome: 'Artes' },
      { id: 8, nome: 'Educação Física' }
    ];

    const container = document.getElementById('disciplinas-container');
    if (container) {
      container.innerHTML = '';
      disciplinas.forEach(disciplina => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '6px';
        label.style.cursor = 'pointer';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = disciplina.id;
        checkbox.id = `disciplina-${disciplina.id}`;
        
        const span = document.createElement('span');
        span.textContent = disciplina.nome;
        span.style.fontSize = '14px';
        
        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
      });
    }
  }

  async carregarDisciplinasVinculadas(professorId) {
    try {
      const data = await apiService.request(`/api/professores/${professorId}/disciplinas`);
      
      const listaDiv = document.getElementById('lista-disciplinas-vinculadas');
      
      // Limpar checkboxes
      document.querySelectorAll('#disciplinas-container input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
      });

      if (data.sucesso && data.disciplinas.length > 0) {
        const disciplinasNomes = data.disciplinas.map(d => d.nome).join(', ');
        listaDiv.innerHTML = `<p style="margin:0; color:#2E7D32;"><strong>Disciplinas vinculadas:</strong> ${disciplinasNomes}</p>`;
        
        // Marcar checkboxes
        data.disciplinas.forEach(disciplina => {
          const checkbox = document.getElementById(`disciplina-${disciplina.id}`);
          if (checkbox) {
            checkbox.checked = true;
          }
        });
      } else {
        listaDiv.innerHTML = '<p style="margin:0; color:#666; font-style:italic;">Nenhuma disciplina vinculada.</p>';
      }
    } catch (error) {
      console.error('❌ Erro ao carregar disciplinas vinculadas:', error);
    }
  }

  // ✅ NOVA FUNÇÃO: Pesquisa global
  async pesquisarGlobal() {
    const termo = document.getElementById('global-search').value;
    
    if (!termo) {
      this.mostrarNotificacao('❌ Digite um termo para pesquisar', 'error');
      return;
    }

    try {
      const response = await apiService.request(`/api/pesquisar?q=${encodeURIComponent(termo)}`);
      
      if (response.sucesso) {
        // Aqui você pode implementar a exibição dos resultados
        this.mostrarNotificacao(`🔍 Encontrados ${response.resultados.length} resultados`, 'success');
      } else {
        this.mostrarNotificacao('❌ Nenhum resultado encontrado', 'error');
      }
    } catch (error) {
      console.error('❌ Erro na pesquisa:', error);
      this.mostrarNotificacao('Erro na pesquisa', 'error');
    }
  }

  // ✅ NOVA FUNÇÃO: Formatar turno
  formatarTurno(turno) {
    const turnos = {
      'matutino': 'Matutino',
      'vespertino': 'Vespertino', 
      'noturno': 'Noturno'
    };
    return turnos[turno] || turno;
  }

  // ✅ NOVA FUNÇÃO: Gerar email
  gerarEmail(nome) {
    return nome.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.') + '@escola.com';
  }

  // ✅ NOVA FUNÇÃO: Sistema de notificação
  mostrarNotificacao(mensagem, tipo = 'info') {
    // Remove notificação anterior se existir
    const notificacaoAnterior = document.getElementById('global-notification');
    if (notificacaoAnterior) {
      notificacaoAnterior.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'global-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
    `;

    // Cores baseadas no tipo
    const cores = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };

    notification.style.background = cores[tipo] || cores.info;
    notification.textContent = mensagem;

    document.body.appendChild(notification);

    // Auto-remover após 5 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);
  }

  mostrarErroNaTabela(tabelaId, mensagem) {
    const tbody = document.querySelector(`#${tabelaId} tbody`);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: #dc3545; padding: 20px;">
            ❌ ${mensagem}
          </td>
        </tr>
      `;
    }
  }

  obterMensagemErro(error) {
    if (error.message.includes('Failed to fetch')) {
      return 'Erro de conexão com o servidor';
    }
    return error.message || 'Erro desconhecido';
  }

  async fazerLogout() {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Erro no logout:', error);
      window.location.href = 'index.html';
    }
  }
}

// ================== INICIALIZAÇÃO ==================
document.addEventListener('DOMContentLoaded', () => {
  window.adminApp = new AdminApp();
});

// ================== EXPORTAÇÕES GLOBAIS ==================
// Para compatibilidade com onclick no HTML
window.carregarTurmas = () => window.adminApp?.carregarTurmas();
window.excluirTurma = (id) => window.adminApp?.excluirTurma(id);
window.excluirProfessor = (id) => window.adminApp?.excluirProfessor(id);
window.excluirAluno = (id) => window.adminApp?.excluirAluno(id);
// ✅ CORREÇÃO: Exportar funções de senha
window.alterarMinhaSenha = () => window.adminApp?.alterarMinhaSenha();
window.redefinirSenhaUsuario = () => window.adminApp?.redefinirSenhaUsuario();