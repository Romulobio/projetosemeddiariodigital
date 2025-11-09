// ⭐⭐ SISTEMA DE NOTAS - CONECTADO AO RAILWAY ⭐⭐

console.log('✅ Script de notas carregado!');

// Detecta automaticamente se está em localhost ou produção
const API_URL = process.env.API_URL || "https://prosemeddiariodigital-production.up.railway.app";

// ✅ SERVIÇO DE API SIMPLIFICADO
const apiService = {
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                credentials: 'include', // IMPORTANTE: para enviar cookies de sessão
                ...options,
            });
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erro na requisição:', error);
            return { sucesso: false, erro: error.message };
        }
    },

    // Buscar turmas do professor (CORRIGIDO: rota correta)
    async getTurmasNotasProfessor() {
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        return await this.request(`/api/professor/${usuario.id}/turmas`);
    },

    // Buscar notas da turma (CORRIGIDO: rota correta)
    async getNotasTurma(turmaId, unidade) {
        return await this.request(`/api/turmas/${turmaId}/notas?unidade=${unidade}`);
    },

    // Buscar médias anuais (CORRIGIDO: rota correta)
    async getMediasAnuais(turmaId) {
        return await this.request(`/api/turmas/${turmaId}/medias-anuais`);
    },

    // Salvar notas (CORRIGIDO: rota correta)
    async salvarNotas(dadosNotas) {
        return await this.request('/api/notas/salvar', {
            method: 'POST',
            body: JSON.stringify(dadosNotas),
        });
    }
};

// ⭐⭐ SISTEMA DE NOTAS - CONECTADO AO RAILWAY ⭐⭐

console.log('✅ Script de notas carregado!');

let estado = {
    turmaSelecionada: null,
    unidadeSelecionada: 1,
    alunos: [],
    notas: {},
    mediasAnuais: [],
    mediasFinaisCache: {} // Cache para manter as médias finais não salvas
};

// Aguarda o DOM carregar completamente
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM completamente carregado - Sistema de Notas');
    
    // Configurar data atual
    const dataElement = document.getElementById('data-relatorio');
    if (dataElement) {
        const agora = new Date();
        dataElement.textContent = agora.toLocaleDateString('pt-BR');
    }
    
    carregarTurmasProfessor();
    configurarEventListeners();
    
    // Configurar usuário logado
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (usuario.nome) {
        // Se houver elementos para exibir o nome do usuário, preencha-os
        const userNameElement = document.getElementById('userName');
        const userInitialElement = document.getElementById('userInitial');
        if (userNameElement) userNameElement.textContent = usuario.nome;
        if (userInitialElement) userInitialElement.textContent = usuario.nome.charAt(0).toUpperCase();
    }
});

function voltarParaProfessor() {
    window.location.href = 'pagina-professor.html';
}

function configurarEventListeners() {
    const selectTurma = document.getElementById('selectTurma');
    if (selectTurma) {
        selectTurma.addEventListener('change', function(e) {
            estado.turmaSelecionada = e.target.value;
            carregarAlunosETabela();
        });
    }
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const unidade = this.getAttribute('data-unidade');
            selecionarUnidade(unidade);
        });
    });
    
    const btnSalvar = document.getElementById('btnSalvar');
    if (btnSalvar) {
        btnSalvar.addEventListener('click', salvarTodasNotas);
    }
}

async function carregarTurmasProfessor() {
    console.log('📍 Carregando turmas do professor...');
    
    try {
        const selectTurma = document.getElementById('selectTurma');
        if (!selectTurma) {
            console.error('❌ Select turma não encontrado!');
            return;
        }
        
        selectTurma.innerHTML = '<option value="">Carregando turmas...</option>';
        
        // ✅ CORRIGIDO: usando apiService com rota correta
        const data = await apiService.getTurmasNotasProfessor();
        console.log('📡 Resposta da API:', data);
        
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
        const selectTurma = document.getElementById('selectTurma');
        if (selectTurma) {
            selectTurma.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }
}

async function carregarAlunosETabela() {
    console.log('📍 Carregando alunos da turma...');
    
    const selectTurma = document.getElementById('selectTurma');
    if (!selectTurma) {
        console.error('❌ Select turma não encontrado!');
        return;
    }
    
    const turmaNome = selectTurma.value;
    console.log('Turma selecionada:', turmaNome);
    
    if (!turmaNome || !window.alunosPorTurma) {
        estado.turmaSelecionada = null;
        estado.alunos = [];
        console.log('⚠️ Turma não selecionada ou dados não carregados');
        return;
    }
    
    estado.turmaSelecionada = turmaNome;
    estado.alunos = window.alunosPorTurma[turmaNome] || [];
    
    if (estado.alunos.length > 0) {
        await carregarNotas();
        await carregarMediasAnuais();
        atualizarTabelaNotas();
        atualizarTabelaAnual();
    } else {
        document.getElementById('tabelaNotasBody').innerHTML = 
            '<tr><td colspan="8" class="loading">Nenhum aluno encontrado nesta turma</td></tr>';
        document.getElementById('tabelaAnualBody').innerHTML = 
            '<tr><td colspan="6" class="loading">Nenhum aluno encontrado</td></tr>';
    }
}

async function carregarNotas() {
    if (!estado.turmaSelecionada || estado.alunos.length === 0) return;

    const turmaId = estado.alunos[0].turma_id;
    
    try {
        // ✅ CORRIGIDO: usando apiService com rota correta
        const data = await apiService.getNotasTurma(turmaId, estado.unidadeSelecionada);
        
        if (data.sucesso) {
            // CORREÇÃO: Cria um novo objeto de notas apenas para a unidade atual
            const novasNotas = {};
            
            // Para cada aluno, carrega as notas da unidade atual
            estado.alunos.forEach(aluno => {
                const notasUnidadeAtual = data.notas[aluno.id] || {
                    qualitativo: { participacao: 0, organizacao: 0, respeito: 0 },
                    atividade: 0,
                    avaliacao: 0,
                    recuperacao: 0
                };
                
                novasNotas[aluno.id] = notasUnidadeAtual;
            });
            
            estado.notas = novasNotas;
            console.log(`✅ Notas carregadas da unidade ${estado.unidadeSelecionada}: ${Object.keys(estado.notas).length} alunos`);
        } else {
            console.error('❌ Erro ao carregar notas:', data.erro);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar notas:', error);
    }
}

async function carregarMediasAnuais() {
    if (!estado.turmaSelecionada || estado.alunos.length === 0) return;

    const turmaId = estado.alunos[0].turma_id;
    
    try {
        // ✅ CORRIGIDO: usando apiService com rota correta
        const data = await apiService.getMediasAnuais(turmaId);
        
        if (data.sucesso) {
            estado.mediasAnuais = data.medias || [];
            console.log(`✅ Médias anuais carregadas: ${estado.mediasAnuais.length} alunos`);
        } else {
            console.error('❌ Erro ao carregar médias:', data.erro);
            estado.mediasAnuais = [];
        }
    } catch (error) {
        console.error('❌ Erro ao carregar médias:', error);
        estado.mediasAnuais = [];
    }
}

async function selecionarUnidade(unidade) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-unidade="${unidade}"]`).classList.add('active');
    
    estado.unidadeSelecionada = parseInt(unidade);
    
    if (estado.turmaSelecionada && estado.alunos.length > 0) {
        await carregarNotas();
        atualizarTabelaNotas();
    }
}

// ========================
// FUNÇÕES DE CÁLCULO
// ========================
function calcularMediaUnidade(notas) {
    const { qualitativo, atividade, avaliacao } = notas;
    const somaQualitativo = (qualitativo.participacao || 0) + (qualitativo.organizacao || 0) + (qualitativo.respeito || 0);
    const media = (somaQualitativo || 0) + (atividade || 0) + (avaliacao || 0);
    return Math.min(media, 10.0); // Limita a 10.0
}

function determinarRecuperacao(mediaUnidade) {
    return mediaUnidade < 5.0 ? "Sim" : "Não";
}

function determinarStatusAnual(mediaAnual) {
    if (mediaAnual === 0) return "--";
    return mediaAnual >= 5.0 ? "Aprovado" : "Reprovado";
}

function formatarNumero(numero) {
    return numero.toFixed(1).replace('.', ',');
}

function validarNota(nota, maximo) {
    nota = parseFloat(nota) || 0;
    return Math.max(0, Math.min(nota, maximo));
}

// ========================
// CÁLCULO AUTOMÁTICO DA MÉDIA
// ========================
function calcularMediaAluno(alunoId) {
    const linha = document.querySelector(`input[data-aluno="${alunoId}"]`).closest('tr');
    
    const participacao = parseFloat(linha.querySelector('.participacao').value) || 0;
    const organizacao = parseFloat(linha.querySelector('.organizacao').value) || 0;
    const respeito = parseFloat(linha.querySelector('.respeito').value) || 0;
    const atividade = parseFloat(linha.querySelector('.atividade').value) || 0;
    const avaliacao = parseFloat(linha.querySelector('.avaliacao').value) || 0;
    
    const somaQualitativo = participacao + organizacao + respeito;
    const mediaUnidade = somaQualitativo + atividade + avaliacao;
    
    const mediaCell = linha.querySelector('.coluna-media');
    mediaCell.textContent = formatarNumero(mediaUnidade);
    
    // CORREÇÃO: Aplica cor vermelha se média for menor que 5.0
    if (mediaUnidade < 5.0) {
        mediaCell.style.color = '#e74c3c';
        mediaCell.style.fontWeight = 'bold';
    } else {
        mediaCell.style.color = '';
        mediaCell.style.fontWeight = '';
    }
    
    const recuperacaoCell = linha.querySelector('.coluna-recuperacao');
    const recuperacao = determinarRecuperacao(mediaUnidade);
    
    if (recuperacao === "Sim" && !recuperacaoCell.querySelector('input')) {
        recuperacaoCell.innerHTML = `
            <input type="number" step="0.1" min="0" max="10.0" 
                   class="input-nota recuperacao" 
                   value="0"
                   data-aluno="${alunoId}" data-tipo="recuperacao"
                   placeholder="Nota recuperação"
                   oninput="calcularMediaAluno(${aluno.id})">
        `;
        recuperacaoCell.className = 'coluna-recuperacao recuperacao-sim';
    } 
    else if (recuperacao === "Não" && recuperacaoCell.querySelector('input')) {
        recuperacaoCell.innerHTML = "Não";
        recuperacaoCell.className = 'coluna-recuperacao recuperacao-nao';
    }
    else if (recuperacao === "Sim") {
        recuperacaoCell.className = 'coluna-recuperacao recuperacao-sim';
    } else {
        recuperacaoCell.className = 'coluna-recuperacao recuperacao-nao';
    }
    
    if (!estado.notas[alunoId]) {
        estado.notas[alunoId] = {
            qualitativo: { participacao: 0, organizacao: 0, respeito: 0 },
            atividade: 0,
            avaliacao: 0,
            recuperacao: 0
        };
    }
    
    estado.notas[alunoId].qualitativo.participacao = participacao;
    estado.notas[alunoId].qualitativo.organizacao = organizacao;
    estado.notas[alunoId].qualitativo.respeito = respeito;
    estado.notas[alunoId].atividade = atividade;
    estado.notas[alunoId].avaliacao = avaliacao;
    
    const inputRecuperacao = linha.querySelector('.recuperacao');
    if (inputRecuperacao) {
        estado.notas[alunoId].recuperacao = parseFloat(inputRecuperacao.value) || 0;
    }
    
    // Atualiza o cache de médias finais APENAS para a unidade atual
    const mediaOriginal = calcularMediaUnidade(estado.notas[alunoId]);
    const recuperacaoNota = estado.notas[alunoId].recuperacao || 0;
    const mediaFinal = Math.max(mediaOriginal, recuperacaoNota);
    
    if (!estado.mediasFinaisCache[alunoId]) {
        estado.mediasFinaisCache[alunoId] = {};
    }
    estado.mediasFinaisCache[alunoId][estado.unidadeSelecionada] = mediaFinal;
    
    console.log(`📊 Aluno ${alunoId}: Média ${mediaUnidade}, Recuperação: ${estado.notas[alunoId].recuperacao}, Média Final: ${mediaFinal}`);
    atualizarTabelaAnual();
}

function atualizarTabelaNotas() {
    const tbody = document.getElementById('tabelaNotasBody');
    const tabelaAnual = document.getElementById('tabelaAnualBody');
    
    if (!estado.turmaSelecionada || !estado.alunos || estado.alunos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Selecione uma turma para visualizar as notas</td></tr>';
        tabelaAnual.innerHTML = '<tr><td colspan="6" class="loading">Selecione uma turma para calcular as médias anuais</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    estado.alunos.forEach(aluno => {
        const notas = estado.notas[aluno.id] || {
            qualitativo: { participacao: 0, organizacao: 0, respeito: 0 },
            atividade: 0,
            avaliacao: 0,
            recuperacao: 0
        };
        
        const mediaUnidade = calcularMediaUnidade(notas);
        const recuperacao = determinarRecuperacao(mediaUnidade);
        
        const row = criarLinhaTabela(aluno, notas, mediaUnidade, recuperacao);
        tbody.appendChild(row);
    });
    
    atualizarTabelaAnual();
}

function criarLinhaTabela(aluno, notas, mediaUnidade, recuperacao) {
    const row = document.createElement('tr');
    
    const mostrarInputRecuperacao = mediaUnidade < 5.0;
    const notaRecuperacao = notas.recuperacao || 0;
    
    row.innerHTML = `
        <td class="coluna-aluno">${aluno.nome}</td>
        
        <td class="coluna-qualitativo">
            <input type="number" step="0.1" min="0" max="2.0" 
                   class="input-nota participacao" 
                   value="${notas.qualitativo.participacao}"
                   data-aluno="${aluno.id}" data-tipo="participacao"
                   oninput="calcularMediaAluno(${aluno.id})">
        </td>
        <td class="coluna-qualitativo">
            <input type="number" step="0.1" min="0" max="1.0" 
                   class="input-nota organizacao" 
                   value="${notas.qualitativo.organizacao}"
                   data-aluno="${aluno.id}" data-tipo="organizacao"
                   oninput="calcularMediaAluno(${aluno.id})">
        </td>
        <td class="coluna-qualitativo">
            <input type="number" step="0.1" min="0" max="1.0" 
                   class="input-nota respeito" 
                   value="${notas.qualitativo.respeito}"
                   data-aluno="${aluno.id}" data-tipo="respeito"
                   oninput="calcularMediaAluno(${aluno.id})">
        </td>
        
        <td class="coluna-atividade">
            <input type="number" step="0.1" min="0" max="3.0" 
                   class="input-nota atividade" 
                   value="${notas.atividade}"
                   data-aluno="${aluno.id}" data-tipo="atividade"
                   oninput="calcularMediaAluno(${aluno.id})">
        </td>
        
        <td class="coluna-avaliacao">
            <input type="number" step="0.1" min="0" max="3.0" 
                   class="input-nota avaliacao" 
                   value="${notas.avaliacao}"
                   data-aluno="${aluno.id}" data-tipo="avaliacao"
                   oninput="calcularMediaAluno(${aluno.id})">
        </td>
        
        <td class="coluna-media ${mediaUnidade < 5.0 ? 'media-baixa' : ''}" id="media-${aluno.id}">
            ${formatarNumero(mediaUnidade)}
        </td>
        
        <td class="coluna-recuperacao ${mediaUnidade < 5.0 ? 'recuperacao-sim' : 'recuperacao-nao'}" id="recuperacao-${aluno.id}">
            ${mostrarInputRecuperacao ? 
                `<input type="number" step="0.1" min="0" max="10.0" 
                        class="input-nota recuperacao" 
                        value="${notaRecuperacao}"
                        data-aluno="${aluno.id}" data-tipo="recuperacao"
                        placeholder="Nota recuperação"
                        oninput="calcularMediaAluno(${aluno.id})">` : 
                "Não"
            }
        </td>
    `;
    
    return row;
}

function atualizarTabelaAnual() {
    const tabelaAnual = document.getElementById('tabelaAnualBody');
    
    if (!estado.turmaSelecionada || !estado.alunos || estado.alunos.length === 0) {
        tabelaAnual.innerHTML = '<tr><td colspan="6" class="loading">Selecione uma turma para calcular as médias anuais</td></tr>';
        return;
    }
    
    tabelaAnual.innerHTML = '';
    
    estado.alunos.forEach(aluno => {
        // Busca os dados do aluno nas médias anuais
        const mediaAnualAluno = estado.mediasAnuais.find(m => m.aluno_id === aluno.id);
        
        let mediasFinais = [0, 0, 0];
        let recuperacoes = [0, 0, 0];
        let mediasOriginais = [0, 0, 0];
        
        // Para cada unidade, determina a média final
        for (let unidade = 1; unidade <= 3; unidade++) {
            let mediaOriginal = 0;
            let recuperacao = 0;
            let mediaFinal = 0;
            
            // Se é a unidade atual em edição, usa os dados em tempo real
            if (unidade === estado.unidadeSelecionada && estado.notas[aluno.id]) {
                const notasAtuais = estado.notas[aluno.id];
                mediaOriginal = calcularMediaUnidade(notasAtuais);
                recuperacao = notasAtuais.recuperacao || 0;
                mediaFinal = Math.max(mediaOriginal, recuperacao);
                
                // Salva no cache
                if (!estado.mediasFinaisCache[aluno.id]) {
                    estado.mediasFinaisCache[aluno.id] = {};
                }
                estado.mediasFinaisCache[aluno.id][unidade] = mediaFinal;
            }
            // Se temos dados em cache (alterações não salvas), usa eles
            else if (estado.mediasFinaisCache[aluno.id] && estado.mediasFinaisCache[aluno.id][unidade] !== undefined) {
                mediaFinal = estado.mediasFinaisCache[aluno.id][unidade];
                // Para determinar se foi recuperação, usa dados do backend
                if (mediaAnualAluno) {
                    mediaOriginal = mediaAnualAluno[`media_unidade${unidade}`] || 0;
                    recuperacao = mediaAnualAluno[`recuperacao_unidade${unidade}`] || 0;
                }
            }
            // Se não é a unidade atual, usa os dados do backend
            else if (mediaAnualAluno) {
                mediaOriginal = mediaAnualAluno[`media_unidade${unidade}`] || 0;
                recuperacao = mediaAnualAluno[`recuperacao_unidade${unidade}`] || 0;
                mediaFinal = Math.max(mediaOriginal, recuperacao);
            }
            
            mediasFinais[unidade - 1] = mediaFinal;
            recuperacoes[unidade - 1] = recuperacao;
            mediasOriginais[unidade - 1] = mediaOriginal;
        }
        
        // Calcula média anual (soma das 3 unidades / 3)
        const somaMedias = mediasFinais.reduce((total, media) => total + media, 0);
        const mediaAnual = somaMedias / 3;
        const statusAnual = determinarStatusAnual(mediaAnual);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="coluna-aluno">${aluno.nome}</td>
            <td class="${mediasFinais[0] < 5.0 ? 'media-baixa' : ''}">
                ${formatarNumero(mediasFinais[0])}
                ${recuperacoes[0] > 0 && recuperacoes[0] > mediasOriginais[0] ? 
                    `<br><small class="recuperacao-info">(recuperação)</small>` : ''}
            </td>
            <td class="${mediasFinais[1] < 5.0 ? 'media-baixa' : ''}">
                ${formatarNumero(mediasFinais[1])}
                ${recuperacoes[1] > 0 && recuperacoes[1] > mediasOriginais[1] ? 
                    `<br><small class="recuperacao-info">(recuperação)</small>` : ''}
            </td>
            <td class="${mediasFinais[2] < 5.0 ? 'media-baixa' : ''}">
                ${formatarNumero(mediasFinais[2])}
                ${recuperacoes[2] > 0 && recuperacoes[2] > mediasOriginais[2] ? 
                    `<br><small class="recuperacao-info">(recuperação)</small>` : ''}
            </td>
            <td class="${mediaAnual > 0 ? (statusAnual === 'Aprovado' ? 'status-aprovado' : 'status-reprovado') : ''} media-destaque ${mediaAnual < 5.0 ? 'media-baixa' : ''}">
                ${formatarNumero(mediaAnual)}
            </td>
            <td class="${mediaAnual > 0 ? (statusAnual === 'Aprovado' ? 'status-aprovado' : 'status-reprovado') : ''}">
                ${statusAnual}
            </td>
        `;
        tabelaAnual.appendChild(row);
    });
}

async function salvarTodasNotas() {
    if (!estado.turmaSelecionada || estado.alunos.length === 0) {
        alert('Selecione uma turma primeiro!');
        return;
    }
    
    const turmaId = estado.alunos[0].turma_id;
    const inputsNota = document.querySelectorAll('.input-nota');
    const notasPorAluno = {};
    
    inputsNota.forEach(input => {
        const alunoId = parseInt(input.getAttribute('data-aluno'));
        const tipo = input.getAttribute('data-tipo');
        const valor = parseFloat(input.value) || 0;
        
        if (!notasPorAluno[alunoId]) {
            notasPorAluno[alunoId] = {
                qualitativo: { participacao: 0, organizacao: 0, respeito: 0 },
                atividade: 0,
                avaliacao: 0,
                recuperacao: 0
            };
        }
        
        if (tipo === 'participacao' || tipo === 'organizacao' || tipo === 'respeito') {
            notasPorAluno[alunoId].qualitativo[tipo] = validarNota(valor, 
                tipo === 'participacao' ? 2.0 : 1.0);
        } else if (tipo === 'recuperacao') {
            notasPorAluno[alunoId][tipo] = validarNota(valor, 10.0);
        } else {
            notasPorAluno[alunoId][tipo] = validarNota(valor, 3.0);
        }
    });
    
    try {
        // ✅ CORRIGIDO: usando apiService
        const result = await apiService.salvarNotas({
            turma_id: turmaId,
            unidade: estado.unidadeSelecionada,
            notas: notasPorAluno
        });
        
        if (result.sucesso) {
            alert(`✅ Notas da Unidade ${estado.unidadeSelecionada} salvas com sucesso! ${result.registros} registros atualizados.`);
            
            // Limpa o cache após salvar
            estado.mediasFinaisCache = {};
            
            await carregarNotas();
            await carregarMediasAnuais();
            atualizarTabelaNotas();
        } else {
            alert('❌ Erro ao salvar notas: ' + result.erro);
        }
    } catch (error) {
        console.error('❌ Erro ao salvar notas:', error);
        alert('❌ Erro de conexão ao salvar notas!');
    }
}