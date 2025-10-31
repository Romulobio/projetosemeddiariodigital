// ⭐⭐ ADICIONE ISSO NO TOPO DE CADA ARQUIVO .js ⭐⭐
const API_URL = 'https://projetosemeddiariodigital-production.up.railway.app';

// script-professor.js - VERSÃO CORRIGIDA
console.log('✅ Script do professor carregado!');

// Verificar autenticação ao carregar a página
async function verificarAutenticacao() {
    try {
        console.log('🔐 Verificando autenticação...');
        
        const response = await fetch('/check-auth');
        const data = await response.json();
        
        console.log('📊 Resposta da autenticação:', data);
        
        if (data.sucesso && data.usuario) {
            if (data.usuario.tipo === 'professor') {
                console.log('✅ Professor autenticado:', data.usuario.nome);
                carregarDadosProfessor(data.usuario);
                return true;
            } else {
                console.error('❌ Usuário não é professor. Tipo:', data.usuario.tipo);
                alert('Acesso permitido apenas para professores!');
                window.location.href = '/';
                return false;
            }
        } else {
            console.error('❌ Não autenticado:', data.erro);
            alert('Sessão expirada! Faça login novamente.');
            window.location.href = '/';
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
    document.getElementById('colegio-professor').textContent = 'Colégio Municipal';
    
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
    const menuBtn = document.querySelector('.menu-btn');
    
    if (menu && menuBtn && !menu.contains(event.target) && !menuBtn.contains(event.target)) {
        menu.style.display = 'none';
    }
});

// Funções das funcionalidades
function abrirFrequencia() {
    console.log('📊 Abrindo frequência...');
    alert('Sistema de Frequência - Em desenvolvimento');
}

function abrirRelatorios() {
    console.log('📈 Abrindo relatórios...');
    alert('Sistema de Relatórios - Em desenvolvimento');
}

function abrirDiario() {
    console.log('📖 Abrindo diário digital...');
    alert('Diário Digital - Em desenvolvimento');
}

function abrirNotas() {
    console.log('📝 Abrindo sistema de notas...');
    alert('Sistema de Notas - Em desenvolvimento');
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
        const response = await fetch('/logout', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            console.log('✅ Logout realizado com sucesso');
            localStorage.removeItem('usuarioLogado');
            window.location.href = '/';
        } else {
            console.error('❌ Erro no logout:', data.erro);
            window.location.href = '/';
        }
    } catch (error) {
        console.error('💥 Erro ao sair:', error);
        window.location.href = '/';
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