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

    // Verificar permissão de admin
    async verificarPermissaoAdmin() {
        return await this.request('/api/admin/verificar-master');
    },

    // Alterar senha do próprio usuário
    async alterarSenha(dados) {
        return await this.request('/alterar-senha', {
            method: 'POST',
            body: JSON.stringify(dados),
        });
    },

    // Redefinir senha como admin
    async redefinirSenhaAdmin(dados) {
        return await this.request('/admin/redefinir-senha', {
            method: 'POST',
            body: JSON.stringify(dados),
        });
    },

    // Obter usuários para admin
    async getUsuariosAdmin() {
        return await this.request('/api/admin/todos-usuarios');
    }
};

// senhas-admin.js - Sistema de Gerenciamento de Senhas

// ================== ALTERAR PRÓPRIA SENHA ==================
async function alterarMinhaSenha() {
    const senhaAtual = document.getElementById('senhaAtual').value;
    const novaSenha = document.getElementById('novaSenha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;
    const mensagemDiv = document.getElementById('mensagemSenha');

    // Validações
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
        mostrarMensagemSenha('❌ Preencha todos os campos!', 'erro', mensagemDiv);
        return;
    }

    if (novaSenha !== confirmarSenha) {
        mostrarMensagemSenha('❌ As senhas não coincidem!', 'erro', mensagemDiv);
        return;
    }

    if (novaSenha.length < 6) {
        mostrarMensagemSenha('❌ A nova senha deve ter pelo menos 6 caracteres!', 'erro', mensagemDiv);
        return;
    }

    try {
        mostrarMensagemSenha('⏳ Alterando senha...', 'info', mensagemDiv);

        const data = await apiService.alterarSenha({
            senha_atual: senhaAtual,
            nova_senha: novaSenha,
            confirmar_senha: confirmarSenha
        });

        if (data.sucesso) {
            mostrarMensagemSenha('✅ ' + data.mensagem, 'sucesso', mensagemDiv);
            // Limpar formulário
            document.getElementById('senhaAtual').value = '';
            document.getElementById('novaSenha').value = '';
            document.getElementById('confirmarSenha').value = '';
        } else {
            mostrarMensagemSenha('❌ ' + data.erro, 'erro', mensagemDiv);
        }
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        mostrarMensagemSenha('❌ Erro de conexão ao alterar senha!', 'erro', mensagemDiv);
    }
}

// ================== REDEFINIR SENHA DE USUÁRIOS (APENAS ADMIN MASTER) ==================
async function redefinirSenhaUsuario() {
    const usuarioId = document.getElementById('selectUsuarioSenha').value;
    const novaSenha = document.getElementById('novaSenhaUsuario').value;
    const mensagemDiv = document.getElementById('mensagemSenha');

    // Validações
    if (!usuarioId) {
        mostrarMensagemSenha('❌ Selecione um usuário!', 'erro', mensagemDiv);
        return;
    }

    if (!novaSenha || novaSenha.length < 6) {
        mostrarMensagemSenha('❌ A nova senha deve ter pelo menos 6 caracteres!', 'erro', mensagemDiv);
        return;
    }

    const confirmacao = confirm(`Tem certeza que deseja redefinir a senha deste usuário?\n\nA nova senha será: "${novaSenha}"`);
    
    if (!confirmacao) {
        return;
    }

    try {
        mostrarMensagemSenha('⏳ Redefinindo senha...', 'info', mensagemDiv);

        const data = await apiService.redefinirSenhaAdmin({
            usuario_id: usuarioId,
            nova_senha: novaSenha
        });

        if (data.sucesso) {
            mostrarMensagemSenha('✅ ' + data.mensagem, 'sucesso', mensagemDiv);
            // Limpar campo de senha
            document.getElementById('novaSenhaUsuario').value = '';
        } else {
            mostrarMensagemSenha('❌ ' + data.erro, 'erro', mensagemDiv);
        }
    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        mostrarMensagemSenha('❌ Erro de conexão ao redefinir senha!', 'erro', mensagemDiv);
    }
}

// ================== CARREGAR USUÁRIOS PARA REDEFINIÇÃO DE SENHA ==================
async function carregarUsuariosParaRedefinicao() {
    try {
        const select = document.getElementById('selectUsuarioSenha');
        select.innerHTML = '<option value="">Carregando usuários...</option>';

        const data = await apiService.getUsuariosAdmin();

        if (data.sucesso) {
            select.innerHTML = '<option value="">Selecione um usuário</option>';
            
            data.usuarios.forEach(usuario => {
                const option = document.createElement('option');
                option.value = usuario.id;
                option.textContent = `${usuario.nome} (${usuario.email}) - ${usuario.tipo}`;
                select.appendChild(option);
            });

            console.log(`✅ ${data.usuarios.length} usuários carregados para redefinição de senha`);
        } else {
            select.innerHTML = '<option value="">Erro ao carregar usuários</option>';
            console.error('Erro ao carregar usuários:', data.erro);
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        const select = document.getElementById('selectUsuarioSenha');
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

// ================== VERIFICAR PERMISSÕES DE ADMIN MASTER ==================
async function verificarPermissoesAdminMaster() {
    try {
        const result = await apiService.verificarPermissaoAdmin();
        
        const secaoAdminMaster = document.getElementById('secaoAdminMaster');
        
        if (result.sucesso && result.tem_permissao) {
            secaoAdminMaster.style.display = 'block';
            carregarUsuariosParaRedefinicao();
        } else {
            secaoAdminMaster.style.display = 'none';
        }
    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        document.getElementById('secaoAdminMaster').style.display = 'none';
    }
}

// ================== FUNÇÃO AUXILIAR PARA MOSTRAR MENSAGENS ==================
function mostrarMensagemSenha(texto, tipo, elemento) {
    elemento.innerHTML = texto;
    
    // Remove classes anteriores
    elemento.classList.remove('sucesso', 'erro', 'info');
    
    // Adiciona classe conforme o tipo
    elemento.classList.add(tipo);
    
    // Mostra o elemento
    elemento.style.display = 'block';
    
    // Esconde a mensagem após 5 segundos (exceto para mensagens de sucesso)
    if (tipo !== 'info') {
        setTimeout(() => {
            elemento.style.display = 'none';
        }, 5000);
    }
}

// ================== INICIALIZAÇÃO ==================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Sistema de senhas carregado!');
    
    // Verifica permissões quando a aba de senhas for aberta
    const senhasView = document.getElementById('view-Senhas');
    if (senhasView) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (senhasView.style.display !== 'none') {
                        console.log('🔐 Aba de Senhas aberta - verificando permissões...');
                        verificarPermissoesAdminMaster();
                    }
                }
            });
        });
        
        observer.observe(senhasView, { attributes: true });
    }

    // Adiciona estilos CSS para as mensagens
    const style = document.createElement('style');
    style.textContent = `
        .mensagem-senha {
            padding: 12px;
            border-radius: 6px;
            margin-top: 15px;
            text-align: center;
            display: none;
            font-weight: 500;
        }
        
        .mensagem-senha.sucesso {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .mensagem-senha.erro {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .mensagem-senha.info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        
        .card-section.senha-propria,
        .card-section.senha-admin {
            margin-bottom: 24px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid;
        }
        
        .card-section.senha-propria {
            border-left-color: #28a745;
        }
        
        .card-section.senha-admin {
            border-left-color: #007bff;
        }
    `;
    document.head.appendChild(style);
});