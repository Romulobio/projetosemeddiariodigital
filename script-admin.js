document.addEventListener("DOMContentLoaded", () => {
  const views = document.querySelectorAll(".view");
  const menuButtons = document.querySelectorAll(".nav button");
  const msgVinculo = document.getElementById("vinculos-msg");

  // ================== Alternar abas ==================
  menuButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      menuButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      views.forEach(v => (v.style.display = "none"));
      const id = `view-${btn.dataset.view}`;
      document.getElementById(id).style.display = "block";
    });
  });

  // ================== CONFIGURAR FORMULÁRIO DE CADASTRO DE ADMIN ==================
  const formCadastroAdmin = document.getElementById('form-cadastro-admin');
  if (formCadastroAdmin) {
    formCadastroAdmin.addEventListener('submit', cadastrarNovoAdmin);
    console.log('✅ Formulário de cadastro de admin configurado');
  }
  
  // Observar quando a aba de configurações for aberta
  const configView = document.getElementById('view-configuracoes');
  if (configView) {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          if (configView.style.display !== 'none') {
            console.log('🔧 Aba de Configurações aberta - verificando permissões...');
            verificarPermissoesCadastroAdmin();
          }
        }
      });
    });
    
    observer.observe(configView, { attributes: true });
  }

  // ================== CADASTRAR TURMA ==================
  document.getElementById("form-turma").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await apiFetch("/api/turmas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      alert(json.mensagem || json.erro || "Erro ao cadastrar turma");
      if (json.sucesso) {
        form.reset();
        carregarTurmas();
        carregarSelectsTurmas();
        atualizarContagens();
      }
    } catch (error) {
      alert("Erro ao cadastrar turma");
      console.error(error);
    }
  });

  // ================== CADASTRAR ALUNO ==================
  document.getElementById("form-aluno").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const nome = form.nome.value;
    const turma_id = form.turma_id.value;

    if (!nome || !turma_id) {
      alert("Preencha nome e selecione uma turma!");
      return;
    }

    try {
      const res = await apiFetch("/api/alunos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, turma_id }),
      });
      const json = await res.json();
      if (json.sucesso) {
        alert(json.mensagem || "Aluno cadastrado com sucesso!");
        form.reset();
        carregarAlunos();
        atualizarContagens();
      } else {
        alert(json.erro || "Erro ao cadastrar aluno");
      }
    } catch (err) {
      console.error("Erro ao carregar aluno:", err);
      alert("Erro ao cadastrar aluno");
    }
  });

  // ================== CADASTRAR PROFESSOR ==================
  document.getElementById("form-professor").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      nome: form.nome.value,
      email: form.email.value,
      senha: "123456",
      tipo: "professor",
    };
    try {
      const res = await apiFetch("/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      msgVinculo.textContent = json.mensagem || json.erro;
      msgVinculo.className = json.sucesso ? "success" : "error";
      if (json.sucesso) {
        form.reset();
        carregarProfessores();
        atualizarContagens();
      }
    } catch (error) {
      msgVinculo.textContent = "Erro ao cadastrar professor.";
      msgVinculo.className = "error";
    }
  });

  // ================== VINCULAR PROFESSOR À TURMA ==================
  document.getElementById("btn-vincular").addEventListener("click", async () => {
    const professorId = document.getElementById("select-professor").value;
    const turmaId = document.getElementById("select-turma-vinculo").value;
    if (!professorId || !turmaId) {
      msgVinculo.textContent = "Selecione um professor e uma turma!";
      msgVinculo.className = "error";
      return;
    }

    try {
      const res = await apiFetch("/api/vincular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professorId, turmaId }),
      });
      const json = await res.json();
      msgVinculo.textContent = json.message;
      msgVinculo.className = json.success ? "success" : "error";
      if (json.success) {
        carregarTurmas();
        carregarProfessores();
      }
    } catch (error) {
      msgVinculo.textContent = "Erro ao vincular professor à turma.";
      msgVinculo.className = "error";
    }
  });

  // ================== CARREGAR TURMAS ==================
  async function carregarTurmas() {
    try {
      const res = await apiFetch("/api/turmas");
      const data = await res.json();
      if (!data.sucesso) throw new Error(data.erro || "Erro ao carregar turmas");

      const tbody = document.querySelector("#table-turmas tbody");
      tbody.innerHTML = "";
      data.turmas.forEach((turma) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${turma.nome}</td>
          <td>${turma.ano}</td>
          <td>${turma.turno}</td>
          <td>${turma.professores || "<em>Sem professor</em>"}</td>
          <td></td>
        `;
        tbody.appendChild(row);
      });

      document.getElementById("count-turmas").textContent = data.turmas.length;
    } catch (error) {
      console.error("Erro ao carregar turmas:", error);
      alert("Erro ao carregar turmas!");
    }
  }

  // ================== CARREGAR ALUNOS ==================
  async function carregarAlunos() {
    const tbody = document.querySelector('#table-alunos tbody');
    if (!tbody) {
      console.error('Tabela de alunos não encontrada!');
      return;
    }
    tbody.innerHTML = '';
    
    try {
      const res = await apiFetch('/api/alunos');
      const data = await res.json();
      
      if (data.sucesso && data.alunos.length > 0) {
        let turmaAtual = '';
        
        data.alunos.forEach(aluno => {
          // Adiciona cabeçalho da turma quando mudar de turma
          if (aluno.turma !== turmaAtual) {
            turmaAtual = aluno.turma;
            
            const headerRow = document.createElement('tr');
            headerRow.className = 'turma-header';
            headerRow.innerHTML = `
              <td colspan="3">🏫 ${turmaAtual || 'Sem turma'}</td>
            `;
            tbody.appendChild(headerRow);
          }
          
          // Adiciona linha do aluno
          const tr = document.createElement('tr');
          tr.className = 'aluno-row';
          tr.innerHTML = `
            <td>${aluno.nome}</td>
            <td>${aluno.turma || 'Sem turma'}</td>
            <td style="text-align: right;">
              <button class="btn small danger" onclick="excluirAluno(${aluno.id})">🗑️</button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      } else {
        // Mensagem quando não há alunos
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td colspan="3" class="empty-state">
            Nenhum aluno cadastrado
          </td>
        `;
        tbody.appendChild(tr);
      }
    } catch (err) {
      console.error('Erro ao carregar alunos:', err);
    }
  }

  // ================== EXCLUIR ALUNO ==================
  window.excluirAluno = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;
    
    try {
      const res = await apiFetch(`/api/alunos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.sucesso) {
        alert('Aluno excluído com sucesso!');
        carregarAlunos();
        atualizarContagens();
      } else {
        alert(data.erro || 'Erro ao excluir aluno');
      }
    } catch (err) {
      console.error('Erro ao excluir aluno:', err);
      alert('Erro ao excluir aluno');
    }
  }

  // ================== CARREGAR PROFESSORES ==================
  async function carregarProfessores() {
    try {
      const res = await apiFetch("/api/professores");
      const data = await res.json();
      if (!data.sucesso) throw new Error(data.erro || "Erro ao carregar professores");

      const select = document.getElementById("select-professor");
      select.innerHTML = "<option value=''>Selecione</option>";

      const tbody = document.querySelector("#table-professores tbody");
      tbody.innerHTML = "";

      // Carrega todos os professores e suas disciplinas
      const professoresComDisciplinas = await Promise.all(
        data.professores.map(async (prof) => {
          try {
            const resDisciplinas = await apiFetch(`/api/disciplinas-professor/${prof.id}`);
            const dataDisciplinas = await resDisciplinas.json();
            return {
              ...prof,
              disciplinas: dataDisciplinas.sucesso ? dataDisciplinas.disciplinas : []
            };
          } catch (error) {
            console.error(`Erro ao carregar disciplinas do professor ${prof.nome}:`, error);
            return {
              ...prof,
              disciplinas: []
            };
          }
        })
      );

      professoresComDisciplinas.forEach((prof) => {
        const opt = document.createElement("option");
        opt.value = prof.id;
        opt.textContent = prof.nome;
        select.appendChild(opt);

        const row = document.createElement("tr");
        
        // Formata as disciplinas para exibição
        let disciplinasHTML = "";
        if (prof.disciplinas && prof.disciplinas.length > 0) {
          disciplinasHTML = prof.disciplinas.map(d => 
            `<span class="disciplina-tag">${d.nome}</span>`
          ).join("");
        } else {
          disciplinasHTML = '<span style="color:#666; font-style:italic; font-size:12px;">Nenhuma disciplina</span>';
        }

        row.innerHTML = `
          <td><strong>${prof.nome}</strong></td>
          <td>${prof.email}</td>
          <td>${prof.turmas}</td>
          <td>
            <div class="disciplinas-lista">
              ${disciplinasHTML}
            </div>
          </td>
          <td style="text-align:right">
            <button class="btn small danger" onclick="excluirProfessor(${prof.id}, '${prof.nome.replace(/'/g, "\\'")}')">🗑️</button>
          </td>
        `;
        tbody.appendChild(row);
      });

      document.getElementById("count-professores").textContent = data.professores.length;
    } catch (err) {
      console.error("Erro ao carregar professores:", err);
      alert("Erro ao carregar professores!");
    }
  }

  // ================== EXCLUIR PROFESSOR ==================
  window.excluirProfessor = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este professor?')) return;
    
    try {
      const res = await apiFetch(`/api/professores/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.sucesso) {
        alert('Professor excluído com sucesso!');
        carregarProfessores();
        atualizarContagens();
        carregarProfessoresDisciplinas(); // Atualiza o select de disciplinas
      } else {
        alert(data.erro || 'Erro ao excluir professor');
      }
    } catch (err) {
      console.error('Erro ao excluir professor:', err);
      alert('Erro ao excluir professor');
    }
  }

// ================== EXCLUIR TURMA ==================
window.excluirTurma = async function(id) {
  if (!confirm('Tem certeza que deseja excluir esta turma?\n\n⚠️ Esta ação não pode ser desfeita.')) return;
  
  try {
    const res = await apiFetch(`/api/turmas/${id}`, { method: 'DELETE' });
    const data = await res.json();
    
    if (data.sucesso) {
      alert('✅ Turma excluída com sucesso!');
      carregarTurmas();
      carregarSelectsTurmas();
      atualizarContagens();
    } else {
      // Mostra mensagem de erro específica
      if (data.erro.includes('aluno(s) vinculado(s)')) {
        alert(`❌ ${data.erro}\n\n💡 Solução: Transfira os alunos para outra turma antes de excluir.`);
      } else if (data.erro.includes('professor(es) vinculado(s)')) {
        alert(`❌ ${data.erro}\n\n💡 Solução: Remova os vínculos dos professores com esta turma primeiro.`);
      } else {
        alert('❌ ' + data.erro);
      }
    }
  } catch (err) {
    console.error('Erro ao excluir turma:', err);
    alert('❌ Erro de conexão ao excluir turma');
  }
}

  // ================== CARREGAR SELECTS ==================
  async function carregarSelectsTurmas() {
    const selectTurmaAluno = document.getElementById("select-turma-aluno");
    const selectTurmaVinculo = document.getElementById("select-turma-vinculo");
    try {
      const res = await apiFetch("/api/turmas");
      const data = await res.json();
      selectTurmaAluno.innerHTML = "";
      selectTurmaVinculo.innerHTML = "";
      if (data.sucesso) {
        data.turmas.forEach((turma) => {
          const opt1 = document.createElement("option");
          opt1.value = turma.id;
          opt1.textContent = turma.nome;
          selectTurmaAluno.appendChild(opt1);

          const opt2 = document.createElement("option");
          opt2.value = turma.id;
          opt2.textContent = turma.nome;
          selectTurmaVinculo.appendChild(opt2);
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ================== ATUALIZAR CONTAGENS ==================
  async function atualizarContagens() {
    try {
      const [t1, t2, t3] = await Promise.all([
        apiFetch("/api/turmas").then((r) => r.json()),
        apiFetch("/api/professores").then((r) => r.json()),
        apiFetch("/api/alunos").then((r) => r.json()),
      ]);
      document.getElementById("count-turmas").textContent = t1.turmas?.length || 0;
      document.getElementById("count-professores").textContent = t2.professores?.length || 0;
      document.getElementById("count-alunos").textContent = t3.alunos?.length || 0;
    } catch (err) {
      console.error("Erro ao atualizar contagens", err);
    }
  }

  // ================== GERENCIAR DISCIPLINAS DO PROFESSOR ==================
  
  // Carregar professores para o select de disciplinas
  async function carregarProfessoresDisciplinas() {
      try {
          const select = document.getElementById("select-professor-disciplina");
          select.innerHTML = "<option value=''>Carregando professores...</option>";
          
          const response = await apiFetch("/api/professores");
          const data = await response.json();
          
          if (data.sucesso) {
              select.innerHTML = "<option value=''>Selecione um professor</option>";
              data.professores.forEach(professor => {
                  const option = document.createElement("option");
                  option.value = professor.id;
                  option.textContent = professor.nome;
                  select.appendChild(option);
              });
              
              // Adiciona evento para carregar disciplinas quando selecionar professor
              select.addEventListener("change", carregarDisciplinasProfessor);
          }
      } catch (error) {
          console.error("Erro ao carregar professores:", error);
      }
  }

  // Carregar todas as disciplinas disponíveis
  async function carregarTodasDisciplinas() {
      try {
          const response = await apiFetch("/api/todas-disciplinas");
          const data = await response.json();
          
          if (data.sucesso) {
              const container = document.getElementById("disciplinas-container");
              container.innerHTML = "";
              
              data.disciplinas.forEach(disciplina => {
                  const label = document.createElement("label");
                  label.className = "checkbox-disciplina";
                  label.innerHTML = `
                      <input type="checkbox" value="${disciplina.id}" data-nome="${disciplina.nome}">
                      ${disciplina.nome}
                  `;
                  container.appendChild(label);
              });
          }
      } catch (error) {
          console.error("Erro ao carregar disciplinas:", error);
          // Fallback com disciplinas padrão
          const container = document.getElementById("disciplinas-container");
          container.innerHTML = `
              <label class="checkbox-disciplina"><input type="checkbox" value="1" data-nome="Matemática"> Matemática</label>
              <label class="checkbox-disciplina"><input type="checkbox" value="2" data-nome="Português"> Português</label>
              <label class="checkbox-disciplina"><input type="checkbox" value="3" data-nome="Ciências"> Ciências</label>
              <label class="checkbox-disciplina"><input type="checkbox" value="4" data-nome="História"> História</label>
              <label class="checkbox-disciplina"><input type="checkbox" value="5" data-nome="Geografia"> Geografia</label>
          `;
      }
  }

  // Carregar disciplinas vinculadas ao professor selecionado
  async function carregarDisciplinasProfessor() {
      const professorId = document.getElementById("select-professor-disciplina").value;
      
      if (!professorId) {
          document.getElementById("lista-disciplinas-vinculadas").innerHTML = "<p style='margin:0; color:#666; font-style:italic;'>Selecione um professor para ver as disciplinas vinculadas.</p>";
          return;
      }
      
      try {
          // Carrega disciplinas vinculadas
          const response = await apiFetch(`/api/disciplinas-professor/${professorId}`);
          const data = await response.json();
          
          const listaContainer = document.getElementById("lista-disciplinas-vinculadas");
          
          if (data.sucesso && data.disciplinas.length > 0) {
              let html = "<div class='lista-disciplinas'>";
              data.disciplinas.forEach(disciplina => {
                  html += `
                      <div class="item-disciplina">
                          ${disciplina.nome}
                          <button class="btn-remover-disciplina" onclick="removerDisciplina(${professorId}, ${disciplina.id})">×</button>
                      </div>
                  `;
              });
              html += "</div>";
              listaContainer.innerHTML = html;
              
              // Marca as checkboxes das disciplinas vinculadas
              data.disciplinas.forEach(disciplina => {
                  const checkbox = document.querySelector(`input[value="${disciplina.id}"]`);
                  if (checkbox) {
                      checkbox.checked = true;
                      checkbox.parentElement.classList.add("checked");
                  }
              });
          } else {
              listaContainer.innerHTML = "<p style='margin:0; color:#666; font-style:italic;'>Nenhuma disciplina vinculada a este professor.</p>";
              
              // Desmarca todas as checkboxes
              document.querySelectorAll(".checkbox-disciplina input").forEach(checkbox => {
                  checkbox.checked = false;
                  checkbox.parentElement.classList.remove("checked");
              });
          }
          
          // Adiciona evento para as checkboxes
          document.querySelectorAll(".checkbox-disciplina input").forEach(checkbox => {
              checkbox.addEventListener("change", function() {
                  this.parentElement.classList.toggle("checked", this.checked);
              });
          });
          
      } catch (error) {
          console.error("Erro ao carregar disciplinas do professor:", error);
      }
  }

  // Vincular disciplinas ao professor
  async function vincularDisciplinas() {
      const professorId = document.getElementById("select-professor-disciplina").value;
      
      if (!professorId) {
          alert("Selecione um professor!");
          return;
      }
      
      const disciplinasSelecionadas = Array.from(document.querySelectorAll(".checkbox-disciplina input:checked"))
          .map(checkbox => ({
              id: checkbox.value,
              nome: checkbox.getAttribute("data-nome")
          }));
      
      if (disciplinasSelecionadas.length === 0) {
          alert("Selecione pelo menos uma disciplina!");
          return;
      }
      
      try {
          const response = await apiFetch("/api/vincular-disciplinas", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({
                  professor_id: professorId,
                  disciplinas: disciplinasSelecionadas.map(d => d.id)
              })
          });
          
          const data = await response.json();
          
          if (data.sucesso) {
              alert("✅ Disciplinas vinculadas com sucesso!");
              carregarDisciplinasProfessor(); // Atualiza a lista
              carregarProfessores(); // Atualiza a tabela de professores
          } else {
              alert("❌ Erro ao vincular disciplinas: " + data.erro);
          }
      } catch (error) {
          console.error("Erro ao vincular disciplinas:", error);
          alert("❌ Erro de conexão ao vincular disciplinas!");
      }
  }

  // Remover disciplina do professor (precisa ser global para funcionar no onclick)
  window.removerDisciplina = async function(professorId, disciplinaId) {
      if (!confirm("Tem certeza que deseja remover esta disciplina do professor?")) {
          return;
      }
      
      try {
          const response = await apiFetch("/api/remover-disciplina", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({
                  professor_id: professorId,
                  disciplina_id: disciplinaId
              })
          });
          
          const data = await response.json();
          
          if (data.sucesso) {
              alert("✅ Disciplina removida com sucesso!");
              carregarDisciplinasProfessor(); // Atualiza a lista
              carregarProfessores(); // Atualiza a tabela de professores
          } else {
              alert("❌ Erro ao remover disciplina: " + data.erro);
          }
      } catch (error) {
          console.error("Erro ao remover disciplina:", error);
          alert("❌ Erro de conexão ao remover disciplina!");
      }
  }

 // ================== EXCLUIR PROFESSOR ==================
window.excluirProfessor = async function(id, nome) {
    const confirmacao = confirm(`Tem certeza que deseja excluir o professor "${nome}"?\n\n✅ Serão removidos automaticamente:\n• Vínculos com turmas\n• Vínculos com disciplinas\n• Registros de frequência\n• Registros de notas\n• Objetos de conhecimento`);
    
    if (!confirmacao) return;
    
    try {
        const res = await apiFetch(`/api/professores/${id}`, { 
            method: 'DELETE' 
        });
        const data = await res.json();
        
        if (data.sucesso) {
            alert('✅ ' + data.mensagem);
            carregarProfessores();
            atualizarContagens();
            carregarProfessoresDisciplinas();
        } else {
            alert('❌ ' + data.erro);
        }
    } catch (err) {
        console.error('Erro ao excluir professor:', err);
        alert('❌ Erro de conexão ao excluir professor');
    }
}
  // ================== LOGOUT ==================
  document.getElementById("btn-logout").addEventListener("click", async () => {
    await apiFetch("/logout", { method: "POST" });
    window.location.href = "/login.html";
  });

  // ================== CONFIGURAÇÕES E PERMISSÕES ==================

// Carregar administradores para gerenciamento
async function carregarAdministradores() {
    try {
        const select = document.getElementById('select-admins');
        select.innerHTML = '<option value="">Carregando administradores...</option>';
        
        const response = await apiFetch('/api/administradores');
        const data = await response.json();
        
        if (data.sucesso) {
            select.innerHTML = '<option value="">Selecione um administrador</option>';
            data.administradores.forEach(admin => {
                const option = document.createElement('option');
                option.value = admin.id;
                option.textContent = `${admin.nome} (${admin.email}) ${admin.pode_criar_admin ? '👑 Master' : '👤 Básico'}`;
                option.setAttribute('data-master', admin.pode_criar_admin);
                select.appendChild(option);
            });
            
            // Adiciona evento para mostrar informações
            select.addEventListener('change', mostrarInfoPermissao);
        }
    } catch (error) {
        console.error('Erro ao carregar administradores:', error);
    }
}

// Mostrar informações da permissão selecionada
function mostrarInfoPermissao() {
    const select = document.getElementById('select-admins');
    const adminId = select.value;
    const infoDiv = document.getElementById('info-permissoes');
    
    if (!adminId) {
        infoDiv.innerHTML = '<p style="margin:0; color:#666; font-style:italic;">Selecione um administrador para ver as permissões.</p>';
        return;
    }
    
    const selectedOption = select.options[select.selectedIndex];
    const isMaster = selectedOption.getAttribute('data-master') === 'true';
    
    let html = '';
    if (isMaster) {
        html = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="background:#4CAF50; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">
                    👑 ADMINISTRADOR MASTER
                </div>
                <span style="color:#2E7D32; font-size:14px;">
                    Pode criar novos administradores e gerenciar todo o sistema
                </span>
            </div>
            <p style="margin:8px 0 0 0; color:#666; font-size:12px;">
                <strong>Ações permitidas:</strong> Criar administradores, gerenciar professores, turmas, alunos e configurações do sistema.
            </p>
        `;
    } else {
        html = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="background:#FF9800; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">
                    👤 ADMINISTRADOR BÁSICO
                </div>
                <span style="color:#E65100; font-size:14px;">
                    Permissões limitadas de administração
                </span>
            </div>
            <p style="margin:8px 0 0 0; color:#666; font-size:12px;">
                <strong>Ações permitidas:</strong> Gerenciar professores, turmas e alunos. <strong>Não pode</strong> criar novos administradores.
            </p>
        `;
    }
    
    infoDiv.innerHTML = html;
}

// Alternar permissão de administrador
async function alternarPermissaoAdmin() {
    const select = document.getElementById('select-admins');
    const adminId = select.value;
    
    if (!adminId) {
        alert('Selecione um administrador primeiro!');
        return;
    }
    
    const selectedOption = select.options[select.selectedIndex];
    const isCurrentlyMaster = selectedOption.getAttribute('data-master') === 'true';
    const newPermission = !isCurrentlyMaster;
    
    const confirmMessage = isCurrentlyMaster 
        ? 'Tem certeza que deseja REMOVER as permissões master deste administrador?\n\nEle não poderá mais criar novos administradores.'
        : 'Tem certeza que deseja CONCEDER permissões master para este administrador?\n\nEle poderá criar novos administradores.';
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const response = await apiFetch('/api/toggle-admin-permission', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                admin_id: adminId,
                pode_criar_admin: newPermission
            })
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            alert(`✅ Permissões atualizadas com sucesso!`);
            carregarAdministradores();
        } else {
            alert('❌ Erro ao atualizar permissões: ' + data.erro);
        }
    } catch (error) {
        console.error('Erro ao alternar permissão:', error);
        alert('❌ Erro de conexão ao atualizar permissões!');
    }
}

  // ================== INICIALIZAÇÃO ==================
  carregarTurmas();
  carregarAlunos();
  carregarProfessores();
  carregarSelectsTurmas();
  atualizarContagens();
  carregarAdministradores();
  
  // ================== INICIALIZAÇÃO DAS DISCIPLINAS ==================
  carregarProfessoresDisciplinas();
  carregarTodasDisciplinas();
  
  // Adicionar evento ao botão de vincular disciplinas
  document.getElementById("btn-vincular-disciplinas").addEventListener("click", vincularDisciplinas);
  // Na seção de inicialização, adicione:
document.getElementById("btn-toggle-admin").addEventListener("click", alternarPermissaoAdmin);
});

// ================== FUNÇÕES DE CADASTRO DE ADMINISTRADOR ==================

async function verificarPermissoesCadastroAdmin() {
    try {
        const response = await apiFetch('/api/verificar-permissao-admin');
        const result = await response.json();
        
        console.log('🔍 Resultado da verificação de permissão:', result);
        
        const secaoCadastroAdmin = document.getElementById('secaoCadastroAdmin');
        const mensagemDiv = document.getElementById('mensagemCadastroAdmin');
        
        if (result.sucesso && result.tem_permissao) {
            secaoCadastroAdmin.style.display = 'block';
            mensagemDiv.innerHTML = `<p style="color: #4CAF50; margin: 0;">✅ Você tem permissão para cadastrar novos administradores</p>`;
            mensagemDiv.style.display = 'block';
        } else {
            secaoCadastroAdmin.style.display = 'block'; // Mantém visível para mostrar mensagem
            mensagemDiv.innerHTML = `<p style="color: #f44336; margin: 0;">❌ ${result.erro || 'Você não tem permissão para cadastrar administradores'}</p>`;
            mensagemDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        const mensagemDiv = document.getElementById('mensagemCadastroAdmin');
        mensagemDiv.innerHTML = `<p style="color: #f44336; margin: 0;">❌ Erro ao verificar permissões</p>`;
        mensagemDiv.style.display = 'block';
    }
}

async function cadastrarNovoAdmin(event) {
    if (event) event.preventDefault();
    
    const nome = document.getElementById('nomeAdmin').value.trim();
    const email = document.getElementById('emailAdmin').value.trim();
    const senha = document.getElementById('senhaAdmin').value;
    
    const mensagemDiv = document.getElementById('mensagemCadastroAdmin');
    
    // Validações
    if (!nome || !email || !senha) {
        mostrarMensagemCadastro('❌ Preencha todos os campos!', 'erro');
        return;
    }
    
    if (senha.length < 6) {
        mostrarMensagemCadastro('❌ A senha deve ter pelo menos 6 caracteres!', 'erro');
        return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
        mostrarMensagemCadastro('❌ Digite um email válido!', 'erro');
        return;
    }
    
    try {
        mostrarMensagemCadastro('⏳ Cadastrando administrador...', 'info');
        
        const response = await apiFetch('/cadastrar-admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: nome,
                email: email,
                senha: senha
            })
        });
        
        const result = await response.json();
        
        console.log('📨 Resposta do cadastro:', result);
        
        if (result.sucesso) {
            mostrarMensagemCadastro('✅ ' + result.mensagem, 'sucesso');
            // Limpar formulário
            document.getElementById('form-cadastro-admin').reset();
            
            // Atualizar lista de administradores
            if (typeof carregarAdministradores === 'function') {
                setTimeout(carregarAdministradores, 1000);
            }
        } else {
            mostrarMensagemCadastro('❌ ' + result.erro, 'erro');
        }
    } catch (error) {
        console.error('Erro no cadastro:', error);
        mostrarMensagemCadastro('❌ Erro de conexão ao cadastrar administrador!', 'erro');
    }
    
    function mostrarMensagemCadastro(texto, tipo) {
        mensagemDiv.innerHTML = `<p style="margin: 0;">${texto}</p>`;
        
        if (tipo === 'sucesso') {
            mensagemDiv.style.backgroundColor = '#d4edda';
            mensagemDiv.style.color = '#155724';
            mensagemDiv.style.border = '1px solid #c3e6cb';
        } else if (tipo === 'erro') {
            mensagemDiv.style.backgroundColor = '#f8d7da';
            mensagemDiv.style.color = '#721c24';
            mensagemDiv.style.border = '1px solid #f5c6cb';
        } else {
            mensagemDiv.style.backgroundColor = '#d1ecf1';
            mensagemDiv.style.color = '#0c5460';
            mensagemDiv.style.border = '1px solid #bee5eb';
        }
        
        mensagemDiv.style.display = 'block';
        mensagemDiv.style.padding = '12px';
        mensagemDiv.style.borderRadius = '6px';
        mensagemDiv.style.marginTop = '15px';
    }
}