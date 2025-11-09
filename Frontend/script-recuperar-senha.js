const BASE_URL = window.location.hostname.includes('localhost')
  ? 'http://localhost:8080'
  : 'https://prosemeddiariodigital-production.up.railway.app';


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

    // Solicitar recuperação de senha
    async solicitarRecuperacaoSenha(dados) {
        return await this.request('/api/recuperar-senha', {
            method: 'POST',
            body: JSON.stringify(dados),
        });
    }
};

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Página de recuperação de senha carregada');
    
    document.getElementById('recoveryForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const messageDiv = document.getElementById('message');
        
        if (!email) {
            showMessage('Por favor, informe seu email.', 'error');
            return;
        }

        try {
            showMessage('Enviando solicitação...', 'info');
            
            const data = await apiService.solicitarRecuperacaoSenha({ email });
            
            if (data.sucesso) {
                showMessage(data.mensagem, 'success');
                document.getElementById('recoveryForm').reset();
                
                // Se estiver em desenvolvimento, mostra o link no console
                if (data.link_teste) {
                    console.log('🔗 Link de recuperação (desenvolvimento):', data.link_teste);
                    showMessage(data.mensagem + '<br><br><strong>Link para testes:</strong><br>' + data.link_teste, 'info');
                }
            } else {
                showMessage(data.erro, 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            showMessage('Erro de conexão. Tente novamente.', 'error');
        }
    });

    function showMessage(text, type) {
        const messageDiv = document.getElementById('message');
        messageDiv.innerHTML = text;
        messageDiv.className = 'message ' + type;
        messageDiv.style.display = 'block';
    }
});