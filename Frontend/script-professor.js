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
                credentials: 'include',
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

    // Verificar autenticação
    async checkAuth() {
        return await this.request('/check-auth');
    },

    // Fazer logout
    async logout() {
        return await this.request('/logout', {
            method: 'POST'
        });
    },

    // Obter dados do usuário
    async getUsuario() {
        return await this.request('/api/dados-usuario');
    }
};

// script-professor.js - VERSÃO CORRIGIDA
console.log('✅ Script do professor carregado!');

// Verificar autenticação ao carregar a página
async function verificarAutenticacao() {
    try {
        console.log('🔐 Verificando autenticação...');
        
        const data = await apiService.checkAuth();
        
        console.log('📊 Resposta da autenticação:', data);
        
        if (data.sucesso && data.usuario) {
            if (data.usuario.tipo === 'professor') {
                console.log('✅ Professor autenticado:', data.usuario.nome);
                carregarDadosProfessor(data.usuario);
                return true;
            } else {
                console.error('❌ Usuário não é professor. Tipo:', data.usuario.tipo);
                alert('Acesso permitido apenas para professores!');
                window.location.href = 'index.html';
                return false;
            }
        } else {
            console.error('❌ Não autenticado:', data.erro);
            alert('Sessão expirada! Faça login novamente.');
            window.location.href = 'index.html';
            return false;
        }
    } catch (error) {
        console.error('💥 Erro ao verificar autenticação:', error);
        alert('Erro de conexão! Verifique o servidor.');
        return false;
    }
}

// Carregar dados do professor
function carregarDadosProfessor(usuario) {
    console.log('👤 Carregando dados do professor:', usuario);
    
    document.getElementById('nome-professor').textContent = usuario.nome;
    document.getElementById('colegio-professor').textContent = 'Colégio Municipal Monsenhor Galvão';
    
    // Também salva no localStorage para backup
    localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
}

// Atualizar data atual
function atualizarData() {
    const agora = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dataElement = document.getElementById('data-atual');
    if (dataElement) {
        dataElement.textContent = agora.toLocaleDateString('pt-BR', options);
    }
}

// Menu dropdown
function toggleMenu() {
    const menu = document.getElementById('dropdownMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

// Fechar menu ao clicar fora
document.addEventListener('click', function(event) {
    const menu = document.getElementById('dropdownMenu');
    const menuBtn = document.querySelector('.header-right button');
    
    if (menu && menuBtn && !menu.contains(event.target) && !menuBtn.contains(event.target)) {
        menu.style.display = 'none';
    }
});

// Funções das funcionalidades
function abrirFrequencia() {
    console.log('📊 Abrindo frequência...');
    window.location.href = 'frequencia.html';
}

function abrirRelatorios() {
    console.log('📈 Abrindo relatórios...');
    window.location.href = 'relatorios.html';
}

function abrirDiario() {
    console.log('📖 Abrindo diário digital...');
    window.location.href = 'diario.html';
}

function abrirNotas() {
    console.log('📝 Abrindo sistema de notas...');
    window.location.href = 'notas.html';
}

// Funções do menu
function alterarSenha() {
    alert('Alterar Senha - Em desenvolvimento');
}

function abrirAjuda() {
    alert('Sistema de Ajuda - Em desenvolvimento');
}

function faleConosco() {
    alert('Fale Conosco - Em desenvolvimento');
}

// Sair do sistema
async function sair() {
    try {
        console.log('🚪 Saindo do sistema...');
        
        const data = await apiService.logout();
        
        if (data.sucesso) {
            console.log('✅ Logout realizado com sucesso');
            localStorage.removeItem('usuarioLogado');
            window.location.href = 'index.html';
        } else {
            console.error('❌ Erro no logout:', data.erro);
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('💥 Erro ao sair:', error);
        window.location.href = 'index.html';
    }
}

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Página do professor inicializada');
    
    // Primeiro verifica autenticação, depois carrega o resto
    verificarAutenticacao().then(autenticado => {
        if (autenticado) {
            atualizarData();
            // Atualizar data a cada minuto
            setInterval(atualizarData, 60000);
        }
    });
});