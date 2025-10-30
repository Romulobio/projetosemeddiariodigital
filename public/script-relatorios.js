// script-relatorios.js - VERSÃO CORRIGIDA (SEM CÓDIGO DO SERVIDOR)
console.log('✅ Script de relatórios carregado!');

// Variáveis globais
let turmasDoProfessor = {};
let turmaSelecionadaId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('📅 Inicializando página de relatórios...');
    atualizarDataHeader();
    configurarFiltrosPadrao();
    carregarTurmasDoProfessor();
});

function voltarParaProfessor() {
    console.log('← Voltando para página do professor...');
    window.location.href = 'pagina-professor.html';
}

function atualizarDataHeader() {
    const agora = new Date();
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    const el = document.getElementById('data-relatorio');
    if (el) {
        el.textContent = agora.toLocaleDateString('pt-BR', options);
        console.log('📅 Data do header atualizada:', el.textContent);
    }
}

function configurarFiltrosPadrao() {
    const agora = new Date();
    const mesEl = document.getElementById('filtro-mes');
    const anoEl = document.getElementById('filtro-ano');
    
    if (mesEl) {
        mesEl.value = agora.getMonth();
        console.log('🔧 Mês padrão definido:', agora.getMonth());
    }
    if (anoEl) {
        anoEl.value = agora.getFullYear();
        console.log('🔧 Ano padrão definido:', agora.getFullYear());
    }
}

// Carregar turmas do professor
async function carregarTurmasDoProfessor() {
    console.log('🏫 Carregando turmas do professor...');
    try {
        const response = await fetch(`${API_URL}/api/alunos-turma-professor`);
        const data = await response.json();
        
        if (data.sucesso && data.alunosPorTurma) {
            turmasDoProfessor = data.alunosPorTurma;
            preencherDropdownTurmas(data.turmas);
            console.log(`✅ Turmas carregadas: ${data.turmas.length} turmas`);
        } else {
            console.error('❌ Erro ao carregar turmas:', data.erro);
            alert('Erro ao carregar turmas: ' + data.erro);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar turmas:', error);
        alert('Erro ao carregar turmas do professor');
    }
}

function preencherDropdownTurmas(turmas) {
    const selectTurma = document.getElementById('filtro-turma');
    if (!selectTurma) {
        console.error('❌ Elemento filtro-turma não encontrado no HTML!');
        return;
    }

    // Limpar options existentes
    selectTurma.innerHTML = '';

    if (turmas.length === 0) {
        selectTurma.innerHTML = '<option value="">Nenhuma turma disponível</option>';
        return;
    }

    // Adicionar turmas ao dropdown
    turmas.forEach((turmaNome, index) => {
        const option = document.createElement('option');
        
        // Encontrar o ID da turma (pega o primeiro aluno da turma para obter o turma_id)
        const primeiraTurma = turmasDoProfessor[turmaNome][0];
        const turmaId = primeiraTurma.turma_id;
        
        option.value = turmaId;
        option.textContent = turmaNome;
        option.setAttribute('data-turma-nome', turmaNome);
        
        // Selecionar a primeira turma por padrão
        if (index === 0) {
            option.selected = true;
            turmaSelecionadaId = turmaId;
            // Atualizar header com a turma selecionada
            document.getElementById('turma-relatorio').textContent = `Turma: ${turmaNome}`;
        }
        
        selectTurma.appendChild(option);
    });

    // Adicionar evento para quando mudar a turma selecionada
    selectTurma.addEventListener('change', function() {
        const turmaId = this.value;
        const turmaNome = this.options[this.selectedIndex].getAttribute('data-turma-nome');
        
        turmaSelecionadaId = turmaId;
        document.getElementById('turma-relatorio').textContent = `Turma: ${turmaNome}`;
        
        console.log(`🔄 Turma selecionada: ${turmaNome} (ID: ${turmaId})`);
        
        // Atualizar lista de alunos para a turma selecionada
        atualizarListaAlunos(turmaNome);
    });

    // Carregar alunos da primeira turma
    if (turmas.length > 0) {
        atualizarListaAlunos(turmas[0]);
    }
}

function atualizarListaAlunos(turmaNome) {
    const selectAluno = document.getElementById('filtro-aluno');
    if (!selectAluno) return;

    // Limpar options existentes
    selectAluno.innerHTML = '<option value="todos">Todos os Alunos</option>';

    if (turmasDoProfessor[turmaNome]) {
        turmasDoProfessor[turmaNome].forEach(aluno => {
            const option = document.createElement('option');
            option.value = aluno.id;
            option.textContent = aluno.nome;
            selectAluno.appendChild(option);
        });
        
        console.log(`👥 Lista de alunos atualizada: ${turmasDoProfessor[turmaNome].length} alunos na turma ${turmaNome}`);
    }
}

// Função principal para carregar relatórios
async function carregarRelatorios() {
    console.log('📊 Iniciando geração de relatório...');
    
    const mes = document.getElementById('filtro-mes').value;
    const ano = document.getElementById('filtro-ano').value;
    const aluno = document.getElementById('filtro-aluno').value;

    // Validação
    if (!mes || !ano) {
        alert('⚠️ Por favor, selecione mês e ano!');
        return;
    }

    if (!turmaSelecionadaId) {
        alert('⚠️ Por favor, selecione uma turma!');
        return;
    }

    console.log(`🔍 Parâmetros: mes=${mes}, ano=${ano}, aluno=${aluno}, turma=${turmaSelecionadaId}`);

    // Mostrar loading
    document.getElementById('corpo-tabela').innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 2rem; color: #666;">
                ⏳ Carregando relatório...
            </td>
        </tr>
    `;

    try {
        const queryParams = new URLSearchParams({ 
            mes, 
            ano, 
            turma_id: turmaSelecionadaId 
        });
        
        if (aluno !== 'todos') {
            queryParams.append('aluno', aluno);
        }
        
        console.log(`🌐 Fazendo requisição para: ${API_URL}/gerar-relatorio?${queryParams}`);
        
        const response = await fetch(`${API_URL}/gerar-relatorio?${queryParams}`);
        const data = await response.json();
        
        console.log('📨 Resposta recebida:', data);

        if (!data.sucesso) {
            throw new Error(data.erro || 'Erro desconhecido');
        }

        console.log(`✅ Dados processados: ${data.relatorio.length} registros`);
        renderResumoETabela(data.relatorio);
        
    } catch (error) {
        console.error('❌ Erro ao carregar relatórios:', error);
        alert(`❌ Erro ao carregar relatórios: ${error.message}`);
        
        // Limpar tabela em caso de erro
        document.getElementById('corpo-tabela').innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #ff4444; padding: 2rem;">
                    ❌ Erro ao carregar dados: ${error.message}
                </td>
            </tr>
        `;
    }
}

function renderResumoETabela(rows) {
    console.log('🎨 Renderizando tabela com', rows.length, 'registros');
    
    if (!rows || rows.length === 0) {
        console.log('📭 Nenhum dado para exibir');
        
        // Limpar resumo
        document.getElementById('total-alunos').textContent = '0';
        document.getElementById('total-presentes').textContent = '0';
        document.getElementById('total-ausentes').textContent = '0';
        document.getElementById('percentual-presenca').textContent = '0%';
        
        // Mensagem de nenhum dado
        document.getElementById('corpo-tabela').innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #666; padding: 2rem;">
                    📭 Nenhum registro de frequência encontrado para o período selecionado.
                </td>
            </tr>
        `;
        
        document.getElementById('dias-container').innerHTML = `
            <div style="text-align: center; color: #666; padding: 2rem;">
                📭 Nenhum dado disponível para exibir detalhes por data.
            </div>
        `;
        return;
    }

    // Processar dados para resumo
    const alunosUnicos = new Set();
    const diasUnicos = new Set();
    const resumoPorAluno = {};
    let totalPresentes = 0;
    let totalRegistros = 0;

    rows.forEach(registro => {
        const alunoNome = registro.aluno;
        
        // Contar alunos únicos
        alunosUnicos.add(alunoNome);
        
        // Contar dias únicos
        diasUnicos.add(`${registro.dia}/${registro.mes}/${registro.ano}`);
        
        // Inicializar contador do aluno se não existir
        if (!resumoPorAluno[alunoNome]) {
            resumoPorAluno[alunoNome] = {
                presentes: 0,
                ausentes: 0,
                total: 0
            };
        }
        
        // Contabilizar presença/ausência
        resumoPorAluno[alunoNome].total++;
        totalRegistros++;
        
        if (registro.presente === 1 || registro.presente === true) {
            resumoPorAluno[alunoNome].presentes++;
            totalPresentes++;
        } else {
            resumoPorAluno[alunoNome].ausentes++;
        }
    });

    // Calcular totais
    const totalAlunos = alunosUnicos.size;
    const totalDias = diasUnicos.size;
    const totalAusentes = totalRegistros - totalPresentes;
    const percentualGeral = totalRegistros > 0 ? Math.round((totalPresentes / totalRegistros) * 100) : 0;

    console.log(`📈 Resumo: ${totalAlunos} alunos, ${totalDias} dias, ${totalPresentes} presentes, ${percentualGeral}%`);

    // Atualizar cards de resumo
    document.getElementById('total-alunos').textContent = totalAlunos;
    document.getElementById('total-presentes').textContent = totalPresentes;
    document.getElementById('total-ausentes').textContent = totalAusentes;
    document.getElementById('percentual-presenca').textContent = `${percentualGeral}%`;

    // Preencher tabela de alunos
    const tbody = document.getElementById('corpo-tabela');
    tbody.innerHTML = '';

    Object.entries(resumoPorAluno).forEach(([alunoNome, dados]) => {
        const percentualAluno = dados.total > 0 ? Math.round((dados.presentes / dados.total) * 100) : 0;
        
        let status = '❌ Crítico';
        let statusClass = 'status-critico';
        
        if (percentualAluno >= 75) {
            status = '✅ Bom';
            statusClass = 'status-bom';
        } else if (percentualAluno >= 50) {
            status = '⚠️ Regular';
            statusClass = 'status-regular';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${alunoNome}</td>
            <td>${dados.presentes}</td>
            <td>${dados.ausentes}</td>
            <td>${dados.total}</td>
            <td>${percentualAluno}%</td>
            <td class="${statusClass}">${status}</td>
        `;
        tbody.appendChild(tr);
    });

    // Preencher detalhes por data
    renderDetalhesPorData(rows);
}

function renderDetalhesPorData(rows) {
    console.log('📅 Renderizando detalhes por data');
    const container = document.getElementById('dias-container');
    container.innerHTML = '';

    // Agrupar registros por data
    const registrosPorData = {};
    
    rows.forEach(registro => {
        const dataKey = `${registro.dia}/${registro.mes}/${registro.ano}`;
        if (!registrosPorData[dataKey]) {
            registrosPorData[dataKey] = [];
        }
        registrosPorData[dataKey].push(registro);
    });

    // Ordenar datas
    const datasOrdenadas = Object.keys(registrosPorData).sort((a, b) => {
        const [diaA, mesA, anoA] = a.split('/').map(Number);
        const [diaB, mesB, anoB] = b.split('/').map(Number);
        return new Date(anoA, mesA - 1, diaA) - new Date(anoB, mesB - 1, diaB);
    });

    // Criar cards para cada data
    datasOrdenadas.forEach(dataKey => {
        const registros = registrosPorData[dataKey];
        const card = document.createElement('div');
        card.className = 'dia-card';
        
        let html = `<h3>📅 ${dataKey}</h3>`;
        html += '<div class="lista-alunos-dia">';
        
        registros.forEach(registro => {
            const status = registro.presente ? '✅ Presente' : '❌ Ausente';
            const observacao = registro.observacao ? ` - ${registro.observacao}` : '';
            html += `<div class="aluno-dia ${registro.presente ? 'presente' : 'ausente'}">
                        <strong>${registro.aluno}</strong>: ${status}${observacao}
                     </div>`;
        });
        
        html += '</div>';
        card.innerHTML = html;
        container.appendChild(card);
    });

    console.log(`✅ Renderizadas ${datasOrdenadas.length} datas`);
}