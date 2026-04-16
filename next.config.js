const path = require('path')

if (process.env.NODE_ENV === 'production' && !String(process.env.NEXT_PUBLIC_APP_TOKEN || '').trim()) {
  console.warn(
    '\n⚠️  [Gplace] NEXT_PUBLIC_APP_TOKEN não definido neste build. O site não envia o header `app` e a API responde 403. ' +
      'Define em Vercel (valor de stores.app_token) e faz redeploy.\n'
  )
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Raiz explícita para file tracing: evita o aviso de múltiplos lockfiles quando existe
  // `yarn.lock` em `api-gplace/` e `package-lock.json` aqui em `frontend-api-gplace/`.
  outputFileTracingRoot: path.join(__dirname),

  // App Router is enabled by default in Next.js 13+
  env: {
    // api-gplace (Docker): porta por omissão 8005 — ver docker-compose.yml na API
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005/api/v1',
    // Em `next dev`, omissão usa o token criado por LocalDevStoreSeeder na API (APP_ENV=local).
    NEXT_PUBLIC_APP_TOKEN:
      process.env.NEXT_PUBLIC_APP_TOKEN ||
      (process.env.NODE_ENV === 'development' ? 'gplace-local-frontend' : ''),
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Gplace',
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  },
}

module.exports = nextConfig
