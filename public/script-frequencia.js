console.log('✅ Script de frequência carregado!');

let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let turmaSelecionada = null;
let alunosDaTurma = [];
let turmaIdSelecionada = null;

// Aguarda o DOM carregar completamente
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM completamente carregado');
    console.log('📍 Iniciando funções...');
    
    atualizarDataHeader();
    gerarCalendario(mesAtual, anoAtual);
    carregarTurmasProfessor();
    
    // Adiciona evento de change ao select
    const selectTurma = document.getElementById('select-turma');
    if (selectTurma) {
        selectTurma.addEventListener('change', carregarAlunosTurma);
        console.log('✅ Event listener do select adicionado');
    } else {
        console.error('❌ Select turma não encontrado!');
    }
});

function voltarParaProfessor() {
    window.location.href = 'pagina-professor.html';
}

function atualizarDataHeader() {
    console.log('📍 Atualizando data do header...');
    const agora = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dataHeader = document.getElementById('data-header');
    if (dataHeader) {
        dataHeader.textContent = '📅 ' + agora.toLocaleDateString('pt-BR', options);
        console.log('✅ Data do header atualizada');
    } else {
        console.error('❌ Elemento data-header não encontrado!');
    }
}

function mudarMes(direcao) {
    console.log('📍 Mudando mês:', direcao);
    const calendario = document.querySelector('.calendario-mensal');
    if (!calendario) {
        console.error('❌ Calendário não encontrado!');
        return;
    }
    
    calendario.style.opacity = '0';
    
    setTimeout(() => {
        mesAtual += direcao;
        if (mesAtual < 0) {
            mesAtual = 11;
            anoAtual--;
        } else if (mesAtual > 11) {
            mesAtual = 0;
            anoAtual++;
        }
        gerarCalendario(mesAtual, anoAtual);
        calendario.style.opacity = '1';
    }, 200);
}

function gerarCalendario(mes, ano) {
    console.log('📍 Gerando calendário:', mes, ano);
    
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Atualiza título do mês
    const mesAnoElement = document.getElementById('mes-ano-atual');
    if (mesAnoElement) {
        mesAnoElement.textContent = `📅 ${meses[mes]} de ${ano}`;
    } else {
        console.error('❌ Elemento mes-ano-atual não encontrado!');
        return;
    }
    
    // Gera dias do calendário
    const diasMes = document.getElementById('dias-mes');
    if (!diasMes) {
        console.error('❌ Elemento dias-mes não encontrado!');
        return;
    }
    
    diasMes.innerHTML = '';
    
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const hoje = new Date();
    
    console.log(`📍 Primeiro dia: ${primeiroDia}, Último dia: ${ultimoDia.getDate()}`);
    
    // Dias vazios no início do mês
    for (let i = 0; i < primeiroDia.getDay(); i++) {
        const diaVazio = document.createElement('div');
        diaVazio.className = 'dia-calendario outro-mes';
        diasMes.appendChild(diaVazio);
    }
    
    // Dias do mês
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        const diaElement = document.createElement('div');
        diaElement.className = 'dia-calendario';
        diaElement.innerHTML = `<div class="numero-dia">${dia}</div>`;
        
        const dataAtual = new Date(ano, mes, dia);
        
        // Destacar hoje
        if (dataAtual.toDateString() === hoje.toDateString() && 
            mes === hoje.getMonth() && 
            ano === hoje.getFullYear()) {
            diaElement.classList.add('hoje');
        }
        
        // Destacar fins de semana
        if (dataAtual.getDay() === 0 || dataAtual.getDay() === 6) {
            diaElement.style.background = 'linear-gradient(135deg, #f3e5f5, #e1bee7)';
        }
        
        diaElement.onclick = function() {
            console.log('📍 Clicou no dia:', dia, mes, ano);
            abrirListaAlunos(dia, mes, ano);
        };
        
        diasMes.appendChild(diaElement);
    }
    
    console.log('✅ Calendário gerado com sucesso!');
}

async function carregarTurmasProfessor() {
    console.log('📍 Carregando turmas do professor...');
    
    try {
        const selectTurma = document.getElementById('select-turma');
        if (!selectTurma) {
            console.error('❌ Select turma não encontrado!');
            return;
        }
        
        selectTurma.innerHTML = '<option value="">Carregando turmas...</option>';
        
        const response = await fetch(`${API_URL}/api/alunos-turma-professor`);
        console.log('📡 Resposta da API:', response.status);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Dados recebidos:', data);
        
        if (data.sucesso) {
            selectTurma.innerHTML = '<option value="">Selecione uma turma</option>';
            
            if (data.turmas && data.turmas.length > 0) {
                data.turmas.forEach(turma => {
                    const option = document.createElement('option');
                    option.value = turma;
                    option.textContent = turma;
                    selectTurma.appendChild(option);
                });
                
                window.alunosPorTurma = data.alunosPorTurma;
                console.log('✅ Turmas carregadas:', data.turmas);
            } else {
                selectTurma.innerHTML = '<option value="">Nenhuma turma encontrada</option>';
                console.log('⚠️ Nenhuma turma encontrada para o professor');
            }
        } else {
            console.error('❌ Erro na API:', data.erro);
            selectTurma.innerHTML = '<option value="">Erro ao carregar turmas</option>';
        }
    } catch (error) {
        console.error('❌ Erro ao carregar turmas:', error);
        const selectTurma = document.getElementById('select-turma');
        if (selectTurma) {
            selectTurma.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }
}

function carregarAlunosTurma() {
    console.log('📍 Carregando alunos da turma...');
    
    const selectTurma = document.getElementById('select-turma');
    if (!selectTurma) {
        console.error('❌ Select turma não encontrado!');
        return;
    }
    
    const turmaNome = selectTurma.value;
    console.log('Turma selecionada:', turmaNome);
    
    if (!turmaNome || !window.alunosPorTurma) {
        turmaSelecionada = null;
        alunosDaTurma = [];
        turmaIdSelecionada = null;
        console.log('⚠️ Turma não selecionada ou dados não carregados');
        return;
    }
    
    turmaSelecionada = turmaNome;
    alunosDaTurma = window.alunosPorTurma[turmaNome] || [];
    
    // Pega o turma_id do primeiro aluno (todos são da mesma turma)
    if (alunosDaTurma.length > 0) {
        turmaIdSelecionada = alunosDaTurma[0].turma_id;
    }
    
    console.log(`✅ Alunos carregados para ${turmaNome}:`, alunosDaTurma.length);
}

function abrirListaAlunos(dia, mes, ano) {
    console.log('📍 Abrindo lista de alunos...', dia, mes, ano);
    
    if (!turmaSelecionada || alunosDaTurma.length === 0) {
        alert('Selecione uma turma primeiro!');
        return;
    }
    
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const dataSelecionada = `${dia} de ${meses[mes]} de ${ano}`;
    
    const dataSelecionadaElement = document.getElementById('data-selecionada');
    if (dataSelecionadaElement) {
        dataSelecionadaElement.textContent = `📋 Frequência - ${dataSelecionada} - ${turmaSelecionada}`;
    }
    
    const container = document.querySelector('.alunos-container');
    if (!container) {
        console.error('❌ Container de alunos não encontrado!');
        return;
    }
    
    container.innerHTML = '';
    
    alunosDaTurma.forEach((aluno, index) => {
        const alunoItem = document.createElement('div');
        alunoItem.className = 'aluno-item';
        alunoItem.innerHTML = `
            <span class="nome-aluno">${aluno.nome}</span>
            <div class="controles-frequencia">
                <div class="opcoes-presenca">
                    <label class="radio-container">
                        <input type="radio" name="presenca-${index}" value="presente" class="radio-presenca" data-aluno-id="${aluno.id}">
                        <span class="radio-mark presente">✅ Presente</span>
                    </label>
                    <label class="radio-container">
                        <input type="radio" name="presenca-${index}" value="ausente" class="radio-presenca" data-aluno-id="${aluno.id}">
                        <span class="radio-mark ausente">❌ Ausente</span>
                    </label>
                </div>
                <input type="text" class="observacao" placeholder="Observação..." data-aluno-id="${aluno.id}">
            </div>
        `;
        container.appendChild(alunoItem);
    });

    // Carrega frequência salva anteriormente
    if (turmaIdSelecionada) {
        carregarFrequenciaServidor(dia, mes, ano, turmaIdSelecionada);
    }

    // Animação de abertura
    const lista = document.getElementById('lista-alunos');
    if (lista) {
        lista.style.display = 'block';
        lista.style.opacity = '0';
        lista.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            lista.style.opacity = '1';
            lista.style.transform = 'translateY(0)';
        }, 100);
        
        lista.scrollIntoView({ behavior: 'smooth' });
        console.log('✅ Lista de alunos aberta');
    } else {
        console.error('❌ Lista de alunos não encontrada!');
    }
}

function fecharListaAlunos() {
    console.log('📍 Fechando lista de alunos...');
    
    const lista = document.getElementById('lista-alunos');
    if (lista) {
        lista.style.opacity = '0';
        lista.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            lista.style.display = 'none';
        }, 500);
    }
}

async function salvarFrequencia() {
    if (!turmaSelecionada || !turmaIdSelecionada || alunosDaTurma.length === 0) {
        alert('Selecione uma turma primeiro!');
        return;
    }

    const dataSelecionada = document.getElementById('data-selecionada').textContent;
    const match = dataSelecionada.match(/(\d+) de (\w+) de (\d+)/);
    if (!match) {
        alert('Data inválida!');
        return;
    }

    const dia = parseInt(match[1]);
    const mes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].indexOf(match[2]);
    const ano = parseInt(match[3]);

    let frequencias = [];
    alunosDaTurma.forEach((aluno) => {
        const radio = document.querySelector(`.radio-presenca[data-aluno-id="${aluno.id}"]:checked`);
        const observacaoInput = document.querySelector(`.observacao[data-aluno-id="${aluno.id}"]`);
        const observacao = observacaoInput ? observacaoInput.value : '';
        
        if (radio) {
            frequencias.push({
                aluno_id: aluno.id,
                aluno: aluno.nome,
                presente: radio.value === 'presente',
                observacao: observacao
            });
        }
    });

    if (frequencias.length === 0) {
        alert('Selecione a frequência de pelo menos um aluno!');
        return;
    }

    try {
        console.log('Enviando frequências:', { dia, mes, ano, turma_id: turmaIdSelecionada, frequencias });
        
        const response = await fetch(`${API_URL}/salvar-frequencias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                dia, 
                mes, 
                ano, 
                turma_id: turmaIdSelecionada, 
                frequencias 
            })
        });
        
        const result = await response.json();
        console.log('Resposta do servidor:', result);
        
        if (result.sucesso) {
            alert('✅ Frequência salva com sucesso!');
            fecharListaAlunos();
        } else {
            alert('❌ Erro ao salvar frequência: ' + result.erro);
        }
    } catch (error) {
        console.error('Erro ao salvar frequência:', error);
        alert('❌ Erro de conexão ao salvar frequência!');
    }
}

async function carregarFrequenciaServidor(dia, mes, ano, turmaId) {
    try {
        const response = await fetch(`${API_URL}/obter-frequencia?dia=${dia}&mes=${mes}&ano=${ano}&turma_id=${turmaId}`);
        const result = await response.json();
        
        if (!result.sucesso) return;

        result.frequencias.forEach(dado => {
            const radioPresente = document.querySelector(`.radio-presenca[data-aluno-id="${dado.aluno_id}"][value="presente"]`);
            const radioAusente = document.querySelector(`.radio-presenca[data-aluno-id="${dado.aluno_id}"][value="ausente"]`);
            const observacao = document.querySelector(`.observacao[data-aluno-id="${dado.aluno_id}"]`);

            if (radioPresente && radioAusente) {
                if (dado.presente) {
                    radioPresente.checked = true;
                } else {
                    radioAusente.checked = true;
                }
            }
            
            if (observacao && dado.observacao) {
                observacao.value = dado.observacao;
            }
        });
    } catch (error) {
        console.error('Erro ao carregar frequência do servidor:', error);
    }
}