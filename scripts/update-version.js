const fs = require('fs');
const path = require('path');

// Gerar versão baseada no timestamp
const version = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

// Caminho para o arquivo .env.local
const envPath = path.join(process.cwd(), '.env.local');

// Ler arquivo .env.local existente ou criar novo
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Atualizar ou adicionar NEXT_PUBLIC_APP_VERSION
const versionRegex = /^NEXT_PUBLIC_APP_VERSION=.*$/m;
if (versionRegex.test(envContent)) {
  envContent = envContent.replace(versionRegex, `NEXT_PUBLIC_APP_VERSION=${version}`);
} else {
  envContent += `\nNEXT_PUBLIC_APP_VERSION=${version}\n`;
}

// Escrever arquivo atualizado
fs.writeFileSync(envPath, envContent);

console.log(`✅ Versão atualizada para: ${version}`);






