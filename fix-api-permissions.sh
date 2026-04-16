#!/bin/bash

# Script para corrigir permissões da API Laravel em nuvem
# Execute este script no servidor da API

echo "🔧 Iniciando correção de permissões da API Laravel..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se está no diretório correto
if [ ! -f "artisan" ]; then
    print_error "Execute este script no diretório raiz do Laravel (onde está o arquivo artisan)"
    exit 1
fi

print_status "Diretório Laravel encontrado"

# 1. Corrigir permissões do storage
print_status "Corrigindo permissões do diretório storage..."
sudo chmod -R 775 storage/
sudo chown -R www-data:www-data storage/

# 2. Corrigir permissões do bootstrap/cache
print_status "Corrigindo permissões do bootstrap/cache..."
sudo chmod -R 775 bootstrap/cache/
sudo chown -R www-data:www-data bootstrap/cache/

# 3. Limpar caches
print_status "Limpando caches do Laravel..."
php artisan cache:clear
php artisan config:clear
php artisan view:clear
php artisan route:clear

# 4. Recriar caches otimizados
print_status "Recriando caches otimizados..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 5. Verificar permissões
print_status "Verificando permissões..."
ls -la storage/framework/views/ | head -5

# 6. Testar escrita
print_status "Testando escrita no diretório de views..."
if touch storage/framework/views/test_write.txt 2>/dev/null; then
    print_status "Teste de escrita bem-sucedido"
    rm storage/framework/views/test_write.txt
else
    print_error "Falha no teste de escrita"
fi

# 7. Verificar configuração
print_status "Verificando configuração do Laravel..."
php artisan --version

print_status "Correção de permissões concluída!"
print_warning "Teste a API agora: curl -I https://api-gplace.gooding.solutions/api/v1/auth/login"

echo ""
echo "📋 Próximos passos:"
echo "1. Teste a API: curl -I https://api-gplace.gooding.solutions/api/v1/auth/login"
echo "2. Verifique os logs: tail -f storage/logs/laravel.log"
echo "3. Teste o frontend: http://localhost:3000/login"
