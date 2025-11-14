// ==================================================
// 📡 Importa o serviço da API
// ==================================================
import ApiService from './api-service.js';
const apiService = ApiService;

// ==================================================
// 🔐 Aplicação do Administrador
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
    // Verifica primeiro se há token no localStorage
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('🔐 Verificando autenticação no admin:');
    console.log('- Token:', token);
    console.log('- User:', user);
    
    if (!token || !user) {
      console.log('❌ Token ou user não encontrados, redirecionando...');
      window.location.href = 'index.html';
      return;
    }
    
    // Tenta verificar com a API
    try {
      const response = await apiService.request('/api/check-auth');
      if (response.sucesso && response.usuario.tipo === 'administrador') {
        document.getElementById('admin-name').textContent = response.usuario.nome;
        return;
      }
    } catch (apiError) {
      console.log('⚠️ API de auth falhou, usando fallback...');
    }
    
    // Fallback: verifica dados do localStorage
    const userData = JSON.parse(user);
    if (userData.tipo === 'administrador' || userData.tipo === 'admin') {
      document.getElementById('admin-name').textContent = userData.nome || userData.email || 'Administrador';
      console.log('✅ Autenticação via localStorage bem-sucedida');
    } else {
      console.log('❌ Usuário não é administrador');
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
    
    // Botões de vinculação
    document.getElementById('btn-vincular')?.addEventListener('click', () => this.vincularProfessorTurma());
    document.getElementById('btn-vincular-disciplinas')?.addEventListener('click', () => this.vincularDisciplinasProfessor());
    document.getElementById('btn-toggle-admin')?.addEventListener('click', () => this.alternarPermissaoAdmin());

    // Botões de senha (se existirem)
    const btnAlterarSenha = document.querySelector('[onclick="alterarMinhaSenha()"]');
    if (btnAlterarSenha) {
      btnAlterarSenha.onclick = () => window.alterarMinhaSenha?.();
    }

    const btnRedefinirSenha = document.querySelector('[onclick="redefinirSenhaUsuario()"]');
    if (btnRedefinirSenha) {
      btnRedefinirSenha.onclick = () => window.redefinirSenhaUsuario?.();
    }

    // ✅ CORREÇÃO: ADICIONAR EVENT LISTENER para carregar disciplinas vinculadas
    document.getElementById('select-professor-disciplina')?.addEventListener('change', (e) => {
      const professorId = e.target.value;
      if (professorId) {
        this.carregarDisciplinasVinculadas(professorId);
      } else {
        // Limpar seleção de checkboxes
        document.querySelectorAll('#disciplinas-container input[type="checkbox"]').forEach(cb => {
          cb.checked = false;
        });
        document.getElementById('lista-disciplinas-vinculadas').innerHTML = 
          '<p style="margin:0; color:#666; font-style:italic;">Selecione um professor para ver as disciplinas vinculadas.</p>';
      }
    });
  }

  async carregarDadosIniciais() {
    try {
      await Promise.all([
        this.carregarTurmas(),
        this.carregarProfessores(),
        this.carregarAlunos(),
        this.carregarSelects()
      ]);
      console.log('✅ Todos os dados iniciais carregados');
    } catch (error) {
      console.error('❌ Erro ao carregar dados iniciais:', error);
    }
  }

  mostrarView(viewName) {
    // Esconde todas as views
    document.querySelectorAll('.view').forEach(view => {
      view.style.display = 'none';
    });
    
    // Remove classe active de todos os botões
    document.querySelectorAll('#menu button').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Mostra view selecionada
    const viewElement = document.getElementById(`view-${viewName}`);
    if (viewElement) {
      viewElement.style.display = 'block';
    }
    
    // Ativa botão correspondente
    const activeButton = document.querySelector(`[data-view="${viewName}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }

    this.currentView = viewName;
    
    // Carrega dados específicos da view se necessário
    if (viewName === 'configuracoes') {
      this.carregarAdministradores();
    }
  }

  // ================== TURMAS ==================
  async carregarTurmas() {
    try {
      console.log('🔄 Carregando turmas...');
      const data = await apiService.getTurmas();
      
      if (!data.sucesso) {
        throw new Error(data.erro || 'Erro ao carregar turmas');
      }

      const tbody = document.querySelector("#table-turmas tbody");
      if (tbody) {
        tbody.innerHTML = "";
        
        data.turmas.forEach((turma) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td><strong>${turma.nome}</strong></td>
            <td>${turma.ano}</td>
            <td>${turma.turno}</td>
            <td>${turma.professores || "<span style='color:#666; font-style:italic;'>Sem professor</span>"}</td>
            <td style="text-align:right">
              <button class="btn small danger" onclick="adminApp.excluirTurma(${turma.id})">🗑️</button>
            </td>
          `;
          tbody.appendChild(row);
        });
      }

      const countElement = document.getElementById("count-turmas");
      if (countElement) {
        countElement.textContent = data.turmas.length;
      }
      
      console.log('✅ Turmas carregadas:', data.turmas.length);
    } catch (error) {
      console.error("❌ Erro ao carregar turmas:", error);
      this.mostrarErroNaTabela("table-turmas", "Erro ao carregar turmas: " + error.message);
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

      console.log('🔄 Cadastrando turma:', data);
      const resultado = await apiService.cadastrarTurma(data);
      
      if (resultado.sucesso) {
        alert('✅ Turma cadastrada com sucesso!');
        event.target.reset();
        await this.carregarTurmas();
        await this.carregarSelects();
      } else {
        alert('❌ Erro: ' + resultado.erro);
      }
    } catch (error) {
      console.error('❌ Erro ao cadastrar turma:', error);
      alert('Erro ao cadastrar turma: ' + this.obterMensagemErro(error));
    }
  }

  async excluirTurma(id) {
    if (!confirm('Tem certeza que deseja excluir esta turma?')) return;
    
    try {
      console.log(`🔄 Excluindo turma ${id}...`);
      const data = await apiService.request(`/api/turmas/${id}`, { method: 'DELETE' });
      
      if (data.sucesso) {
        alert('✅ Turma excluída com sucesso!');
        await this.carregarTurmas();
        await this.carregarSelects();
      } else {
        alert('❌ Erro: ' + data.erro);
      }
    } catch (err) {
      console.error('❌ Erro ao excluir turma:', err);
      alert('Erro ao excluir turma: ' + this.obterMensagemErro(err));
    }
  }

  // ================== PROFESSORES ==================
  // ✅ CORREÇÃO: Função atualizada para incluir o botão de exclusão com onclick
  async carregarProfessores() {
    try {
      console.log('🔄 Carregando professores...');
      const data = await apiService.getProfessores();
      
      if (!data.sucesso) {
        throw new Error(data.erro || 'Erro ao carregar professores');
      }

      const tbody = document.querySelector("#table-professores tbody");
      if (tbody) {
        tbody.innerHTML = "";
        
        data.professores.forEach((professor) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td><strong>${professor.nome}</strong></td>
            <td>${professor.email}</td>
            <td>Carregando...</td>
            <td>Carregando...</td>
            <td style="text-align:right">
              <button class="btn small danger" onclick="adminApp.excluirProfessor(${professor.id})">🗑️</button>
            </td>
          `;
          tbody.appendChild(row);
        });
      }

      const countElement = document.getElementById("count-professores");
      if (countElement) {
        countElement.textContent = data.professores.length;
      }
      
      console.log('✅ Professores carregados:', data.professores.length);
    } catch (error) {
      console.error("❌ Erro ao carregar professores:", error);
      this.mostrarErroNaTabela("table-professores", "Erro ao carregar professores: " + error.message);
    }
  }

  async cadastrarProfessor(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    try {
      const data = {
        nome: formData.get('nome'),
        email: formData.get('email'),
        senha: 'senha123',
        tipo: 'professor'
      };

      console.log('🔄 Cadastrando professor:', data);
      const resultado = await apiService.cadastrarUsuario(data);
      
      if (resultado.sucesso) {
        alert('✅ Professor cadastrado com sucesso!');
        event.target.reset();
        await this.carregarProfessores();
        await this.carregarSelects();
      } else {
        alert('❌ Erro: ' + resultado.erro);
      }
    } catch (error) {
      console.error('❌ Erro ao cadastrar professor:', error);
      alert('Erro ao cadastrar professor: ' + this.obterMensagemErro(error));
    }
  }

  async vincularProfessorTurma() {
    const professorId = document.getElementById('select-professor')?.value;
    const turmaId = document.getElementById('select-turma-vinculo')?.value;
    const mensagemDiv = document.getElementById('vinculos-msg');

    if (!professorId || !turmaId) {
      this.mostrarMensagemVinculo('❌ Selecione professor e turma!', 'erro', mensagemDiv);
      return;
    }

    try {
      this.mostrarMensagemVinculo('⏳ Vinculando...', 'info', mensagemDiv);
      
      // AJUSTE: Esta rota pode não existir no seu backend - verifique
      const resultado = await apiService.request('/api/professor-turma', {
        method: 'POST',
        body: { professor_id: professorId, turma_id: turmaId }
      });

      if (resultado.sucesso) {
        this.mostrarMensagemVinculo('✅ Professor vinculado com sucesso!', 'sucesso', mensagemDiv);
        await this.carregarTurmas();
      } else {
        this.mostrarMensagemVinculo('❌ ' + resultado.erro, 'erro', mensagemDiv);
      }
    } catch (error) {
      console.error('❌ Erro ao vincular professor:', error);
      this.mostrarMensagemVinculo('❌ Erro ao vincular professor: ' + this.obterMensagemErro(error), 'erro', mensagemDiv);
    }
  }

  async vincularDisciplinasProfessor() {
    const professorId = document.getElementById('select-professor-disciplina')?.value;
    const disciplinasCheckboxes = document.querySelectorAll('#disciplinas-container input[type="checkbox"]:checked');
    
    if (!professorId || disciplinasCheckboxes.length === 0) {
      alert('❌ Selecione um professor e pelo menos uma disciplina!');
      return;
    }

    const disciplinasIds = Array.from(disciplinasCheckboxes).map(cb => cb.value);

    try {
      // AJUSTE: Esta rota pode não existir no seu backend - verifique
      const resultado = await apiService.request('/api/professor-disciplinas', {
        method: 'POST',
        body: { professor_id: professorId, disciplinas_ids: disciplinasIds }
      });

      if (resultado.sucesso) {
        alert('✅ Disciplinas vinculadas com sucesso!');
        // Recarrega as disciplinas vinculadas para atualizar a visualização
        this.carregarDisciplinasVinculadas(professorId);
      } else {
        alert('❌ Erro: ' + resultado.erro);
      }
    } catch (error) {
      console.error('❌ Erro ao vincular disciplinas:', error);
      alert('Erro ao vincular disciplinas: ' + this.obterMensagemErro(error));
    }
  }

  // ✅ CORREÇÃO: Nova função para excluir professor
  async excluirProfessor(id) {
    if (!confirm('Tem certeza que deseja excluir este professor? Todos os vínculos com turmas e disciplinas serão removidos.')) {
      return;
    }
    
    try {
      console.log(`🔄 Excluindo professor ${id}...`);
      const data = await apiService.request(`/api/professores/${id}`, { method: 'DELETE' });
      
      if (data.sucesso) {
        alert('✅ Professor excluído com sucesso!');
        await this.carregarProfessores();
        await this.carregarSelects();
      } else {
        alert('❌ Erro: ' + data.erro);
      }
    } catch (err) {
      console.error('❌ Erro ao excluir professor:', err);
      alert('Erro ao excluir professor: ' + this.obterMensagemErro(err));
    }
  }

  // ================== ALUNOS ==================
  // ✅ CORREÇÃO: Função atualizada para incluir o botão de exclusão com onclick
  async carregarAlunos() {
    try {
      console.log('🔄 Carregando alunos...');
      const data = await apiService.getAlunos();
      
      if (!data.sucesso) {
        throw new Error(data.erro || 'Erro ao carregar alunos');
      }

      const tbody = document.querySelector("#table-alunos tbody");
      if (tbody) {
        tbody.innerHTML = "";
        
        data.alunos.forEach((aluno) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td><strong>${aluno.nome}</strong></td>
            <td>${aluno.turma_id || 'Não definida'}</td>
            <td style="text-align:right">
              <button class="btn small danger" onclick="adminApp.excluirAluno(${aluno.id})">🗑️</button>
            </td>
          `;
          tbody.appendChild(row);
        });
      }

      const countElement = document.getElementById("count-alunos");
      if (countElement) {
        countElement.textContent = data.alunos.length;
      }
      
      console.log('✅ Alunos carregados:', data.alunos.length);
    } catch (error) {
      console.error("❌ Erro ao carregar alunos:", error);
      this.mostrarErroNaTabela("table-alunos", "Erro ao carregar alunos: " + this.obterMensagemErro(error));
    }
  }

  async cadastrarAluno(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    try {
      const data = {
        nome: formData.get('nome'),
        email: `${formData.get('nome').toLowerCase().replace(/\s+/g, '.')}@escola.com`,
        senha: 'aluno123',
        tipo: 'aluno',
        turma_id: formData.get('turma_id')
      };

      console.log('🔄 Cadastrando aluno:', data);
      const resultado = await apiService.cadastrarUsuario(data);
      
      if (resultado.sucesso) {
        alert('✅ Aluno cadastrado com sucesso!');
        event.target.reset();
        await this.carregarAlunos();
      } else {
        alert('❌ Erro: ' + resultado.erro);
      }
    } catch (error) {
      console.error('❌ Erro ao cadastrar aluno:', error);
      alert('Erro ao cadastrar aluno: ' + this.obterMensagemErro(error));
    }
  }

  // ✅ CORREÇÃO: Nova função para excluir aluno
  async excluirAluno(id) {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) {
      return;
    }
    
    try {
      console.log(`🔄 Excluindo aluno ${id}...`);
      const data = await apiService.request(`/api/alunos/${id}`, { method: 'DELETE' });
      
      if (data.sucesso) {
        alert('✅ Aluno excluído com sucesso!');
        await this.carregarAlunos();
      } else {
        alert('❌ Erro: ' + data.erro);
      }
    } catch (err) {
      console.error('❌ Erro ao excluir aluno:', err);
      alert('Erro ao excluir aluno: ' + this.obterMensagemErro(err));
    }
  }

  // ================== ADMINISTRADORES ==================
  async carregarAdministradores() {
    try {
      const data = await apiService.request('/api/admin/administradores');
      
      if (data.sucesso) {
        const select = document.getElementById('select-admins');
        if (select) {
          select.innerHTML = '<option value="">Selecione um administrador</option>';
          data.administradores.forEach(admin => {
            const isMaster = admin.pode_criar_admin ? ' (Master)' : '';
            select.innerHTML += `<option value="${admin.id}">${admin.nome} (${admin.email})${isMaster}</option>`;
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

      console.log('🔄 Cadastrando administrador:', data);
      const resultado = await apiService.cadastrarUsuario(data);
      
      if (resultado.sucesso) {
        alert('✅ Administrador cadastrado com sucesso!');
        event.target.reset();
        await this.carregarAdministradores();
      } else {
        alert('❌ Erro: ' + resultado.erro);
      }
    } catch (error) {
      console.error('❌ Erro ao cadastrar administrador:', error);
      alert('Erro ao cadastrar administrador: ' + this.obterMensagemErro(error));
    }
  }

  async alternarPermissaoAdmin() {
    const adminId = document.getElementById('select-admins')?.value;
    
    if (!adminId) {
      alert('❌ Selecione um administrador!');
      return;
    }

    try {
      const adminSelect = document.getElementById('select-admins');
      const selectedOption = adminSelect.options[adminSelect.selectedIndex];
      const isCurrentlyMaster = selectedOption.text.includes('(Master)');
      const novaPermissao = !isCurrentlyMaster;

      const resultado = await apiService.request('/api/admin/toggle-permission', {
        method: 'POST',
        body: { admin_id: adminId, pode_criar_admin: novaPermissao }
      });

      if (resultado.sucesso) {
        alert('✅ Permissão alterada com sucesso!');
        await this.carregarAdministradores();
      } else {
        alert('❌ Erro: ' + resultado.erro);
      }
    } catch (error) {
      console.error('❌ Erro ao alternar permissão:', error);
      alert('Erro ao alternar permissão: ' + this.obterMensagemErro(error));
    }
  }

  // ================== FUNÇÕES AUXILIARES ==================
  // ✅ CORREÇÃO: Função atualizada para incluir o carregamento de disciplinas
  async carregarSelects() {
    try {
      // Carrega turmas para selects
      const turmasData = await apiService.getTurmas();
      if (turmasData.sucesso) {
        const selectTurmaAluno = document.getElementById('select-turma-aluno');
        const selectTurmaVinculo = document.getElementById('select-turma-vinculo');
        
        if (selectTurmaAluno) {
          selectTurmaAluno.innerHTML = '<option value="">Selecione uma turma</option>';
          turmasData.turmas.forEach(turma => {
            selectTurmaAluno.innerHTML += `<option value="${turma.id}">${turma.nome}</option>`;
          });
        }

        if (selectTurmaVinculo) {
          selectTurmaVinculo.innerHTML = '<option value="">Selecione uma turma</option>';
          turmasData.turmas.forEach(turma => {
            selectTurmaVinculo.innerHTML += `<option value="${turma.id}">${turma.nome}</option>`;
          });
        }
      }

      // Carrega professores para selects
      const professoresData = await apiService.getProfessores();
      if (professoresData.sucesso) {
        const selectProfessor = document.getElementById('select-professor');
        const selectProfessorDisciplina = document.getElementById('select-professor-disciplina');
        
        if (selectProfessor) {
          selectProfessor.innerHTML = '<option value="">Selecione um professor</option>';
          professoresData.professores.forEach(prof => {
            selectProfessor.innerHTML += `<option value="${prof.id}">${prof.nome}</option>`;
          });
        }

        if (selectProfessorDisciplina) {
          selectProfessorDisciplina.innerHTML = '<option value="">Selecione um professor</option>';
          professoresData.professores.forEach(prof => {
            selectProfessorDisciplina.innerHTML += `<option value="${prof.id}">${prof.nome}</option>`;
          });
        }
      }

      // ✅ NOVO: Carrega disciplinas para checkboxes
      await this.carregarDisciplinas();
      
    } catch (error) {
      console.error('❌ Erro ao carregar selects:', error);
    }
  }

  // ✅ CORREÇÃO: Nova função para carregar disciplinas e popular checkboxes
  async carregarDisciplinas() {
    try {
      console.log('🔄 Carregando disciplinas...');
      
      // Rota GET /api/disciplinas deve ser implementada no backend
      const data = await apiService.request('/api/disciplinas');
      
      if (data.sucesso) {
        const container = document.getElementById('disciplinas-container');
        
        if (container) {
          container.innerHTML = '';
          
          data.disciplinas.forEach(disciplina => {
            const checkboxWrapper = document.createElement('label');
            checkboxWrapper.style.display = 'flex';
            checkboxWrapper.style.alignItems = 'center';
            checkboxWrapper.style.gap = '6px';
            checkboxWrapper.style.cursor = 'pointer';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = disciplina.id;
            checkbox.id = `disciplina-${disciplina.id}`;
            
            const label = document.createElement('span');
            label.textContent = disciplina.nome;
            label.style.fontSize = '14px';
            
            checkboxWrapper.appendChild(checkbox);
            checkboxWrapper.appendChild(label);
            container.appendChild(checkboxWrapper);
          });
          
          console.log(`✅ ${data.disciplinas.length} disciplinas carregadas`);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar disciplinas:', error);
    }
  }

  // ✅ CORREÇÃO: Nova função para carregar e marcar disciplinas vinculadas
  async carregarDisciplinasVinculadas(professorId) {
    try {
      console.log(`🔄 Carregando disciplinas vinculadas ao professor ${professorId}...`);
      
      // Rota GET /api/professor/:professor_id/disciplinas deve ser implementada no backend
      const data = await apiService.request(`/api/professor/${professorId}/disciplinas`);
      
      const listaDiv = document.getElementById('lista-disciplinas-vinculadas');
      
      // Limpar todos os checkboxes antes de marcar os corretos
      document.querySelectorAll('#disciplinas-container input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
      });

      if (data.sucesso && data.disciplinas.length > 0) {
        const disciplinasNomes = data.disciplinas.map(d => d.nome).join(', ');
        listaDiv.innerHTML = `<p style="margin:0; color:#2E7D32;"><strong>Disciplinas vinculadas:</strong> ${disciplinasNomes}</p>`;
        
        // Marcar checkboxes correspondentes
        data.disciplinas.forEach(disciplina => {
          const checkbox = document.getElementById(`disciplina-${disciplina.id}`);
          if (checkbox) {
            checkbox.checked = true;
          }
        });
      } else {
        listaDiv.innerHTML = '<p style="margin:0; color:#666; font-style:italic;">Nenhuma disciplina vinculada a este professor.</p>';
      }
      
      console.log(`✅ ${data.disciplinas?.length || 0} disciplinas vinculadas`);
    } catch (error) {
      console.error('❌ Erro ao carregar disciplinas vinculadas:', error);
      const listaDiv = document.getElementById('lista-disciplinas-vinculadas');
      if (listaDiv) {
        listaDiv.innerHTML = '<p style="margin:0; color:#dc3545;">Erro ao carregar disciplinas vinculadas.</p>';
      }
    }
  }

  mostrarMensagemVinculo(texto, tipo, elemento) {
    if (!elemento) return;
    
    elemento.innerHTML = texto;
    elemento.className = `vinculo-msg ${tipo}`;
    elemento.style.display = 'block';
    
    if (tipo !== 'info') {
      setTimeout(() => {
        elemento.style.display = 'none';
      }, 5000);
    }
  }

  mostrarErroNaTabela(tabelaId, mensagem) {
    const tbody = document.querySelector(`#${tabelaId} tbody`);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: #dc3545; padding: 20px;">
            ❌ ${mensagem}<br>
            <small>Verifique sua conexão com a internet e tente novamente.</small>
          </td>
        </tr>
      `;
    }
  }

  obterMensagemErro(error) {
    if (error.message.includes('Failed to fetch')) {
      return 'Erro de conexão com o servidor. Verifique sua internet.';
    }
    if (error.message.includes('404')) {
      return 'Recurso não encontrado no servidor.';
    }
    if (error.message.includes('401') || error.message.includes('403')) {
      return 'Sem permissão para acessar este recurso.';
    }
    return error.message || 'Erro desconhecido';
  }

  async fazerLogout() {
    try {
      await apiService.request('/logout', { method: 'POST' });
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
// ✅ CORREÇÃO: Novas exportações globais para as funções de exclusão
window.excluirProfessor = (id) => window.adminApp?.excluirProfessor(id);
window.excluirAluno = (id) => window.adminApp?.excluirAluno(id);