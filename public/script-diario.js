// ⭐⭐ ADICIONE ISSO NO TOPO DE CADA ARQUIVO .js ⭐⭐
const API_URL = 'https://projetosemeddiariodigital-production.up.railway.app';

console.log('✅ Script de Objetos de Conhecimento carregado!');

let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let turmaSelecionada = null;
let disciplinaSelecionada = null;
let objetosCarregados = {};

// Aguarda o DOM carregar completamente
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM completamente carregado');
    console.log('📍 Iniciando funções...');
    
    carregarNomeProfessor(); // ← CARREGA O NOME DO PROFESSOR
    atualizarDataHora();
    carregarTurmasProfessor();
    carregarDisciplinasProfessor();
    gerarTabelaObjetos();
    
    // Event listeners
    document.getElementById('select-turma').addEventListener('change', function() {
        turmaSelecionada = this.value;
        console.log('Turma selecionada:', turmaSelecionada);
        if (turmaSelecionada && disciplinaSelecionada) {
            carregarObjetosConhecimento();
        }
    });
    
    document.getElementById('select-disciplina').addEventListener('change', function() {
        disciplinaSelecionada = this.value;
        console.log('Disciplina selecionada:', disciplinaSelecionada);
        if (turmaSelecionada && disciplinaSelecionada) {
            carregarObjetosConhecimento();
        }
    });
    
    // Atualizar data e hora a cada segundo
    setInterval(atualizarDataHora, 1000);
});

// FUNÇÃO NOVA PARA CARREGAR O NOME DO PROFESSOR
async function carregarNomeProfessor() {
    try {
        const response = await fetch('/api/dados-usuario');
        if (!response.ok) throw new Error('Erro ao carregar dados');
        
        const data = await response.json();
        if (data.sucesso) {
            document.getElementById('professor-nome').textContent = data.usuario.nome;
            console.log('✅ Nome do professor carregado:', data.usuario.nome);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar nome do professor:', error);
        document.getElementById('professor-nome').textContent = 'Professor';
    }
}

function voltarParaProfessor() {
    window.location.href = 'pagina-professor.html';
}

function atualizarDataHora() {
    const agora = new Date();
    
    // Formata data
    const dataFormatada = agora.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    // Formata hora
    const horaFormatada = agora.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    document.getElementById('data-atual').textContent = dataFormatada;
    document.getElementById('hora-atual').textContent = horaFormatada;
}

function mudarMes(direcao) {
    console.log('📍 Mudando mês:', direcao);
    
    const secoes = document.querySelectorAll('.calendario-objetos, .tabela-objetos-container');
    secoes.forEach(sec => sec.style.opacity = '0.7');
    
    setTimeout(() => {
        mesAtual += direcao;
        
        if (mesAtual < 0) {
            mesAtual = 11;
            anoAtual--;
        } else if (mesAtual > 11) {
            mesAtual = 0;
            anoAtual++;
        }
        
        gerarTabelaObjetos();
        
        if (turmaSelecionada && disciplinaSelecionada) {
            carregarObjetosConhecimento();
        }
        
        secoes.forEach(sec => sec.style.opacity = '1');
    }, 300);
}

function gerarTabelaObjetos() {
    console.log('📍 Gerando tabela de objetos:', mesAtual, anoAtual);
    
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Atualiza título do mês
    document.getElementById('mes-ano-atual').textContent = `📅 ${meses[mesAtual]} de ${anoAtual}`;
    
    // Gera dias do mês
    const tabelaBody = document.getElementById('tabela-objetos-body');
    const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const hoje = new Date();
    
    tabelaBody.innerHTML = '';
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = new Date(anoAtual, mesAtual, dia);
        const diaSemana = obterDiaSemana(data.getDay());
        const isHoje = data.toDateString() === hoje.toDateString() && 
                      mesAtual === hoje.getMonth() && 
                      anoAtual === hoje.getFullYear();
        
        const tr = document.createElement('tr');
        if (isHoje) {
            tr.style.background = 'linear-gradient(135deg, #1808f7, #4facfe)';
            tr.style.color = 'white';
        }
        
        tr.innerHTML = `
            <td>
                <span class="dia-numero" style="${isHoje ? 'color: white;' : ''}">${dia}</span>
            </td>
            <td>
                <span class="dia-semana" style="${isHoje ? 'color: white;' : ''}">${diaSemana}</span>
            </td>
            <td>
                <textarea 
                    class="campo-objeto" 
                    data-dia="${dia}"
                    placeholder="Digite o objeto de conhecimento/conteúdo da aula para ${dia}/${mesAtual + 1}/${anoAtual}..."
                    ${isHoje ? 'style="border-color: white; background: rgba(255,255,255,0.9);"' : ''}
                ></textarea>
            </td>
        `;
        
        tabelaBody.appendChild(tr);
    }
    
    console.log('✅ Tabela de objetos gerada com sucesso!');
}

function obterDiaSemana(dia) {
    const dias = [
        'Domingo', 'Segunda-feira', 'Terça-feira', 
        'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
    ];
    return dias[dia];
}

async function carregarTurmasProfessor() {
    console.log('📍 Carregando turmas do professor...');
    
    try {
        const selectTurma = document.getElementById('select-turma');
        selectTurma.innerHTML = '<option value="">Carregando turmas...</option>';
        
        // MUDEI A ROTA PARA A NOVA
        const response = await fetch('/api/turmas-professor');
        console.log('📡 Resposta da API turmas:', response.status);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Dados turmas recebidos:', data);
        
        if (data.sucesso) {
            selectTurma.innerHTML = '<option value="">Selecione uma turma</option>';
            
            if (data.turmas && data.turmas.length > 0) {
                data.turmas.forEach(turma => {
                    const option = document.createElement('option');
                    option.value = turma.id; // USA O ID
                    option.textContent = turma.nome;
                    selectTurma.appendChild(option);
                });
                
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
        selectTurma.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

async function carregarDisciplinasProfessor() {
    console.log('📍 Carregando disciplinas do professor...');
    
    try {
        const response = await fetch('/api/disciplinas-professor');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.sucesso && data.disciplinas) {
            const selectDisciplina = document.getElementById('select-disciplina');
            selectDisciplina.innerHTML = '<option value="">Selecione a disciplina</option>';
            
            data.disciplinas.forEach(disciplina => {
                const option = document.createElement('option');
                option.value = disciplina.id;
                option.textContent = disciplina.nome;
                selectDisciplina.appendChild(option);
            });
            
            console.log('✅ Disciplinas carregadas:', data.disciplinas);
        } else {
            console.error('❌ Erro ao carregar disciplinas:', data.erro);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar disciplinas:', error);
        // Fallback com disciplinas padrão
        const selectDisciplina = document.getElementById('select-disciplina');
        selectDisciplina.innerHTML = `
            <option value="">Selecione a disciplina</option>
            <option value="1">Matemática</option>
            <option value="2">Português</option>
            <option value="3">Ciências</option>
            <option value="4">História</option>
            <option value="5">Geografia</option>
        `;
    }
}

async function carregarObjetosConhecimento() {
    if (!turmaSelecionada || !disciplinaSelecionada) {
        console.log('⚠️ Turma ou disciplina não selecionada');
        return;
    }
    
    console.log('📍 Carregando objetos de conhecimento...', {
        turma: turmaSelecionada,
        disciplina: disciplinaSelecionada,
        mes: mesAtual + 1,
        ano: anoAtual
    });
    
    try {
        const response = await fetch(`/api/objetos-conhecimento?turma=${turmaSelecionada}&disciplina=${disciplinaSelecionada}&mes=${mesAtual + 1}&ano=${anoAtual}`);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.sucesso) {
            objetosCarregados = data.objetos || {};
            preencherCamposObjetos();
            mostrarMensagem('Objetos de conhecimento carregados com sucesso!', 'sucesso');
        } else {
            throw new Error(data.erro || 'Erro ao carregar objetos');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar objetos:', error);
        objetosCarregados = {};
        mostrarMensagem('Erro ao carregar objetos: ' + error.message, 'erro');
    }
}

function preencherCamposObjetos() {
    console.log('📍 Preenchendo campos com objetos carregados:', objetosCarregados);
    
    const campos = document.querySelectorAll('.campo-objeto');
    campos.forEach(campo => {
        const dia = campo.getAttribute('data-dia');
        if (objetosCarregados[dia]) {
            campo.value = objetosCarregados[dia];
        } else {
            campo.value = '';
        }
    });
}

async function salvarObjetosConhecimento() {
    if (!turmaSelecionada || !disciplinaSelecionada) {
        mostrarMensagem('Selecione uma turma e disciplina primeiro!', 'erro');
        return;
    }
    
    console.log('📍 Salvando objetos de conhecimento...');
    
    const btnSalvar = document.querySelector('.btn-salvar');
    const textoOriginal = btnSalvar.innerHTML;
    
    try {
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '💾 Salvando...';
        
        // Coleta todos os objetos
        const objetos = {};
        const campos = document.querySelectorAll('.campo-objeto');
        
        campos.forEach(campo => {
            const dia = campo.getAttribute('data-dia');
            const valor = campo.value.trim();
            if (valor) {
                objetos[dia] = valor;
            }
        });
        
        console.log('📝 Objetos a serem salvos:', objetos);
        
        if (Object.keys(objetos).length === 0) {
            mostrarMensagem('Nenhum objeto de conhecimento para salvar!', 'info');
            return;
        }
        
        const response = await fetch('/api/salvar-objetos-conhecimento', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                turma: turmaSelecionada,
                disciplina: disciplinaSelecionada,
                mes: mesAtual + 1, // +1 porque JavaScript usa 0-11
                ano: anoAtual,
                objetos: objetos
            })
        });
        
        // Verifica se a resposta é JSON válido
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.erro || `Erro HTTP: ${response.status}`);
        }
        
        if (result.sucesso) {
            mostrarMensagem(`✅ ${result.mensagem}`, 'sucesso');
            objetosCarregados = { ...objetosCarregados, ...objetos };
        } else {
            throw new Error(result.erro || 'Erro desconhecido ao salvar objetos');
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar objetos:', error);
        
        // Mensagem mais amigável para o usuário
        let mensagemErro = 'Erro ao salvar objetos';
        if (error.message.includes('Erro HTTP: 500')) {
            mensagemErro = 'Erro interno do servidor. Tente novamente.';
        } else if (error.message.includes('Erro HTTP: 400')) {
            mensagemErro = 'Dados inválidos. Verifique os campos.';
        } else {
            mensagemErro = error.message;
        }
        
        mostrarMensagem(`❌ ${mensagemErro}`, 'erro');
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = textoOriginal;
    }
}


function limparCampos() {
    if (!confirm('Tem certeza que deseja limpar todos os campos deste mês?')) {
        return;
    }
    
    const campos = document.querySelectorAll('.campo-objeto');
    campos.forEach(campo => {
        campo.value = '';
    });
    
    mostrarMensagem('Campos limpos com sucesso!', 'info');
}

function mostrarMensagem(mensagem, tipo) {
    const divMensagem = document.getElementById('mensagem');
    divMensagem.textContent = mensagem;
    divMensagem.className = `mensagem ${tipo}`;
    divMensagem.style.display = 'block';
    
    setTimeout(() => {
        divMensagem.style.display = 'none';
    }, 5000);
}

// Auto-save quando o usuário para de digitar
let autoSaveTimeout;
document.addEventListener('input', function(e) {
    if (e.target.classList.contains('campo-objeto')) {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            if (turmaSelecionada && disciplinaSelecionada) {
                salvarObjetosConhecimento();
            }
        }, 2000);
    }
});