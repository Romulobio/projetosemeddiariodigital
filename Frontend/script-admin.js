// CORREÇÃO: script-admin.js completo e corrigido
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
      const response = await apiService.request('/check-auth');
      if (!response.sucesso || response.usuario.tipo !== 'administrador') {
        window.location.href = 'login.html';
        return;
      }
      document.getElementById('admin-name').textContent = response.usuario.nome;
    } catch (error) {
      console.error('Erro de autenticação:', error);
      window.location.href = 'login.html';
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
    document.getElementById('btn-logout').addEventListener('click', this.fazerLogout);

    // Formulários
    document.getElementById('form-turma').addEventListener('submit', (e) => this.cadastrarTurma(e));
    document.getElementById('form-professor').addEventListener('submit', (e) => this.cadastrarProfessor(e));
    document.getElementById('form-aluno').addEventListener('submit', (e) => this.cadastrarAluno(e));
    document.getElementById('form-cadastro-admin').addEventListener('submit', (e) => this.cadastrarAdministrador(e));
  }

  async carregarDadosIniciais() {
    await Promise.all([
      this.carregarTurmas(),
      this.carregarProfessores(),
      this.carregarAlunos(),
      this.carregarSelects()
    ]);
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
  }

  async carregarTurmas() {
    try {
      console.log('🔄 Carregando turmas...');
      const data = await apiService.getTurmas();
      
      if (!data.sucesso) {
        throw new Error(data.erro || 'Erro ao carregar turmas');
      }

      const tbody = document.querySelector("#table-turmas tbody");
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

      document.getElementById("count-turmas").textContent = data.turmas.length;
      console.log('✅ Turmas carregadas:', data.turmas.length);
    } catch (error) {
      console.error("❌ Erro ao carregar turmas:", error);
      alert("Erro ao carregar turmas: " + error.message);
    }
  }

  async carregarProfessores() {
    try {
      console.log('🔄 Carregando professores...');
      const data = await apiService.getProfessores();
      
      if (!data.sucesso) {
        throw new Error(data.erro || 'Erro ao carregar professores');
      }

      const tbody = document.querySelector("#table-professores tbody");
      tbody.innerHTML = "";
      
      data.professores.forEach((professor) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><strong>${professor.nome}</strong></td>
          <td>${professor.email}</td>
          <td>Carregando...</td>
          <td>Carregando...</td>
          <td style="text-align:right">
            <button class="btn small danger">🗑️</button>
          </td>
        `;
        tbody.appendChild(row);
      });

      document.getElementById("count-professores").textContent = data.professores.length;
      console.log('✅ Professores carregados:', data.professores.length);
    } catch (error) {
      console.error("❌ Erro ao carregar professores:", error);
      alert("Erro ao carregar professores: " + error.message);
    }
  }

  async carregarAlunos() {
    try {
      console.log('🔄 Carregando alunos...');
      const data = await apiService.getAlunos();
      
      if (!data.sucesso) {
        throw new Error(data.erro || 'Erro ao carregar alunos');
      }

      const tbody = document.querySelector("#table-alunos tbody");
      tbody.innerHTML = "";
      
      data.alunos.forEach((aluno) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><strong>${aluno.nome}</strong></td>
          <td>${aluno.turma_id || 'Não definida'}</td>
          <td style="text-align:right">
            <button class="btn small danger">🗑️</button>
          </td>
        `;
        tbody.appendChild(row);
      });

      document.getElementById("count-alunos").textContent = data.alunos.length;
      console.log('✅ Alunos carregados:', data.alunos.length);
    } catch (error) {
      console.error("❌ Erro ao carregar alunos:", error);
      alert("Erro ao carregar alunos: " + error.message);
    }
  }

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
    } catch (error) {
      console.error('❌ Erro ao carregar selects:', error);
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
      alert('Erro ao cadastrar turma: ' + error.message);
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

      console.log('🔄 Cadastrando professor:', data);
      const resultado = await apiService.cadastrarProfessor(data);
      
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
      alert('Erro ao cadastrar professor: ' + error.message);
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
      const resultado = await apiService.cadastrarAluno(data);
      
      if (resultado.sucesso) {
        alert('✅ Aluno cadastrado com sucesso!');
        event.target.reset();
        await this.carregarAlunos();
      } else {
        alert('❌ Erro: ' + resultado.erro);
      }
    } catch (error) {
      console.error('❌ Erro ao cadastrar aluno:', error);
      alert('Erro ao cadastrar aluno: ' + error.message);
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
      const resultado = await apiService.cadastrarProfessor(data); // Reutiliza o mesmo endpoint
      
      if (resultado.sucesso) {
        alert('✅ Administrador cadastrado com sucesso!');
        event.target.reset();
      } else {
        alert('❌ Erro: ' + resultado.erro);
      }
    } catch (error) {
      console.error('❌ Erro ao cadastrar administrador:', error);
      alert('Erro ao cadastrar administrador: ' + error.message);
    }
  }

  async excluirTurma(id) {
    if (!confirm('Tem certeza que deseja excluir esta turma?')) return;
    
    try {
      console.log(`🔄 Excluindo turma ${id}...`);
      const data = await apiService.excluirTurma(id);
      
      if (data.sucesso) {
        alert('✅ Turma excluída com sucesso!');
        await this.carregarTurmas();
        await this.carregarSelects();
      } else {
        alert('❌ Erro: ' + data.erro);
      }
    } catch (err) {
      console.error('❌ Erro ao excluir turma:', err);
      alert('Erro ao excluir turma: ' + err.message);
    }
  }

  async fazerLogout() {
    try {
      await apiService.request('/logout', { method: 'POST' });
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Erro no logout:', error);
      window.location.href = 'login.html';
    }
  }
}

// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  window.adminApp = new AdminApp();
});