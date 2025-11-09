// ✅ CONFIGURAÇÃO DA API - URL DO SEU BACKEND NO RAILWAY
const API_BASE_URL = 'https://prosemeddiariodigital-production.up.railway.app';

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

    // Validar token de recuperação
    async validarTokenRecuperacao(token) {
        return await this.request(`/api/validar-token-recuperacao?token=${token}`);
    },

    // Redefinir senha com token
    async redefinirSenhaToken(dados) {
        return await this.request('/api/redefinir-senha-token', {
            method: 'POST',
            body: JSON.stringify(dados),
        });
    }
};

// Pega o token da URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Página de redefinir senha carregada');
    
    if (!token) {
        showInvalidToken('Token não encontrado na URL!');
        return;
    }

    validateToken(token);
});

async function validateToken(token) {
    try {
        showLoading();
        
        const data = await apiService.validarTokenRecuperacao(token);
        
        hideLoading();
        
        if (data.sucesso) {
            showUserInfo(data.usuario);
            showResetForm();
        } else {
            showInvalidToken(data.erro);
        }
    } catch (error) {
        hideLoading();
        showInvalidToken('Erro ao validar token. Tente novamente.');
    }
}

function showUserInfo(usuario) {
    const userInfoDiv = document.getElementById('userInfo');
    userInfoDiv.innerHTML = `
        <p><strong>Usuário:</strong> ${usuario.nome}</p>
        <p><strong>Email:</strong> ${usuario.email}</p>
    `;
    userInfoDiv.classList.remove('hidden');
}

function showResetForm() {
    document.getElementById('resetFormContainer').classList.remove('hidden');
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showInvalidToken(message) {
    document.getElementById('invalidToken').textContent = message;
    document.getElementById('invalidToken').classList.remove('hidden');
}

// Form submission
document.getElementById('resetForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nova_senha = document.getElementById('nova_senha').value;
    const confirmar_senha = document.getElementById('confirmar_senha').value;
    const submitBtn = document.getElementById('submitBtn');
    const messageDiv = document.getElementById('message');
    
    if (nova_senha !== confirmar_senha) {
        showMessage('As senhas não coincidem!', 'error', messageDiv);
        return;
    }

    if (nova_senha.length < 6) {
        showMessage('A senha deve ter pelo menos 6 caracteres!', 'error', messageDiv);
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Redefinindo...';
        
        const data = await apiService.redefinirSenhaToken({
            token: token,
            nova_senha: nova_senha,
            confirmar_senha: confirmar_senha
        });
        
        if (data.sucesso) {
            showMessage(data.mensagem, 'success', messageDiv);
            document.getElementById('resetForm').reset();
            submitBtn.textContent = 'Senha Redefinida!';
            
            // Redireciona para login após 3 segundos
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        } else {
            showMessage(data.erro, 'error', messageDiv);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Redefinir Senha';
        }
    } catch (error) {
        showMessage('Erro de conexão. Tente novamente.', 'error', messageDiv);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Redefinir Senha';
    }
});

function showMessage(text, type, messageDiv) {
    messageDiv.innerHTML = text;
    messageDiv.className = 'message ' + type;
    messageDiv.style.display = 'block';
}