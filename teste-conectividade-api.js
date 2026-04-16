// 🔧 Utilitário para Testar Conectividade da API
// Use este código no console do navegador para testar a API

// 1. Verificar token atual
function verificarToken() {
  const token = localStorage.getItem('auth_token');
  console.log('🔑 Token atual:', token ? 'Presente' : 'Ausente');
  console.log('📏 Tamanho do token:', token?.length || 0);
  return token;
}

// 2. Testar endpoint de produtos
async function testarProdutos() {
  const token = verificarToken();
  if (!token) {
    console.error('❌ Nenhum token encontrado');
    return;
  }

  try {
    console.log('🌐 Testando endpoint de produtos...');
    const response = await fetch('https://api-gplace.gooding.solutions/api/v1/products', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Status text:', response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Sucesso! Dados recebidos:', data);
      console.log('📦 Total de produtos:', data.data?.length || data.length || 0);
    } else {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:', errorText);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

// 3. Testar endpoint de perfil
async function testarPerfil() {
  const token = verificarToken();
  if (!token) {
    console.error('❌ Nenhum token encontrado');
    return;
  }

  try {
    console.log('🌐 Testando endpoint de perfil...');
    const response = await fetch('https://api-gplace.gooding.solutions/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('📊 Status da resposta:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Perfil carregado:', data);
    } else {
      const errorText = await response.text();
      console.error('❌ Erro no perfil:', errorText);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

// 4. Testar login
async function testarLogin() {
  const credentials = {
    email: 'vendedor.taquaralto@tim.com.br',
    password: 'sua_senha_aqui' // Substitua pela senha correta
  };

  try {
    console.log('🌐 Testando login...');
    const response = await fetch('https://api-gplace.gooding.solutions/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    console.log('📊 Status da resposta:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login realizado:', data);
      
      // Salvar token
      if (data.data?.token) {
        localStorage.setItem('auth_token', data.data.token);
        console.log('🔑 Token salvo no localStorage');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Erro no login:', errorText);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

// 5. Executar todos os testes
async function executarTodosTestes() {
  console.log('🧪 Iniciando testes de conectividade...');
  
  await testarPerfil();
  console.log('---');
  await testarProdutos();
}

// Instruções de uso:
console.log(`
🔧 INSTRUÇÕES DE USO:

1. Para verificar token atual:
   verificarToken()

2. Para testar produtos:
   testarProdutos()

3. Para testar perfil:
   testarPerfil()

4. Para testar login (substitua a senha):
   testarLogin()

5. Para executar todos os testes:
   executarTodosTestes()

📝 IMPORTANTE: 
- Certifique-se de estar logado no sistema
- Se não houver token, faça login primeiro
- Substitua 'sua_senha_aqui' pela senha real
`);
