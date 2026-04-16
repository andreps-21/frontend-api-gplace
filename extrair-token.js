// 🔑 Script para Extrair Bearer Token
// Cole este código no console do navegador (F12 → Console)

function getBearerToken() {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    console.log('❌ Nenhum token encontrado. Faça login primeiro.');
    return null;
  }
  
  console.log('🔑 Token encontrado:');
  console.log('Raw Token:', token);
  console.log('Bearer Format:', `Bearer ${token}`);
  
  // Tentar copiar para área de transferência
  if (navigator.clipboard) {
    navigator.clipboard.writeText(token).then(() => {
      console.log('✅ Token copiado para área de transferência!');
    }).catch(() => {
      console.log('⚠️ Não foi possível copiar automaticamente. Copie manualmente.');
    });
  }
  
  return token;
}

// Executar função
getBearerToken();

// 📧 Informações para enviar ao desenvolvedor
console.log(`
📧 INFORMAÇÕES PARA O DESENVOLVEDOR BACKEND:

🔑 Bearer Token: ${localStorage.getItem('auth_token') || 'NENHUM TOKEN ENCONTRADO'}

📋 Como usar:
1. Adicione o header: Authorization: Bearer [TOKEN]
2. Use em requisições para endpoints protegidos
3. Exemplo: curl -H "Authorization: Bearer [TOKEN]" https://api.alpharstelecom.com.br/api/v1/auth/me

⚠️ IMPORTANTE: Este token expira e deve ser renovado quando necessário.
`);
