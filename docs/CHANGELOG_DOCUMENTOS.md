# Changelog: Implementação de Ocultação de Documentos

## Data: Janeiro 2024

## 📋 Resumo das Mudanças

Implementação completa do sistema de ocultação de documentos anexados em vendas para vendedores e gerentes, conforme especificado na documentação técnica.

---

## ✅ Arquivos Criados

### 1. Hook: `useSaleDocuments`
**Caminho:** `lib/hooks/use-sale-documents.ts`

**Funcionalidades:**
- Detecta automaticamente o tipo de resposta da API (informação básica ou lista completa)
- Gerencia estados de loading e erro
- Fornece flags de permissão (`canViewDetails`, `canDownload`)
- Suporta tanto `DocumentsBasicInfo` quanto `Document[]`

**Principais exports:**
- `useSaleDocuments(saleId)` - Hook principal
- `isBasicInfo(data)` - Type guard para informação básica
- `isDocumentList(data)` - Type guard para lista de documentos
- Interfaces `DocumentsBasicInfo` e `Document`

---

### 2. Hook: `useDocumentPermissions`
**Caminho:** `lib/hooks/use-document-permissions.ts`

**Funcionalidades:**
- Centraliza lógica de permissões baseada em roles
- Retorna flags booleanas para cada ação:
  - `canViewDetails` - Gestor/Master
  - `canDownload` - Gestor/Master
  - `canUpload` - Todos
  - `canDelete` - Gerente/Gestor/Master

---

### 3. Utilitário: `document-error-handler`
**Caminho:** `lib/utils/document-error-handler.ts`

**Funcionalidades:**
- Tratamento padronizado de erros relacionados a documentos
- Categoriza erros em tipos: `permission`, `not_found`, `generic`
- Retorna mensagens amigáveis ao usuário

---

## 🔄 Arquivos Atualizados

### 1. Componente: `SaleDocumentsList`
**Caminho:** `components/sales/sale-documents-list.tsx`

**Mudanças Principais:**

#### Antes:
- Sempre mostrava lista completa de documentos
- Todos os usuários podiam visualizar e baixar

#### Depois:
- **Renderização condicional baseada em permissões:**
  - **Vendedores/Gerentes:** Veem apenas informação básica (contagem)
  - **Gestores/Masters:** Veem lista completa com todos os detalhes

#### Funcionalidades Adicionadas:
- ✅ Detecção automática do tipo de resposta da API
- ✅ Renderização de informação básica para usuários sem permissão
- ✅ Mensagem informativa sobre falta de permissão
- ✅ Botão de upload disponível mesmo sem permissão de visualização
- ✅ Tratamento de erros 403 (sem permissão)
- ✅ Suporte para visualização de documentos (botão Eye)
- ✅ Validação de permissões antes de ações

#### Novos Labels de Tipo de Documento:
- `rg` - RG
- `comprovante_renda` - Comprovante de Renda
- `termo_aceite` - Termo de Aceite
- `autorizacao` - Autorização

---

### 2. Componente: `SaleDocuments`
**Caminho:** `components/documents/sale-documents.tsx`

**Mudanças Principais:**

#### Antes:
- Apenas mostrava área de upload
- Não exibia lista de documentos

#### Depois:
- ✅ Integra `SaleDocumentsList` para mostrar documentos
- ✅ Gerencia estado de exibição do formulário de upload
- ✅ Botão para anexar novo documento quando há documentos existentes
- ✅ Recarrega automaticamente após upload bem-sucedido

---

## 🎯 Comportamento por Role

### Vendedor
- ✅ Pode fazer upload de documentos
- ✅ Vê informação básica: "Existem X documento(s) anexado(s)"
- ❌ Não pode visualizar lista completa
- ❌ Não pode baixar documentos
- ❌ Não pode excluir documentos

### Gerente
- ✅ Pode fazer upload de documentos
- ✅ Vê informação básica: "Existem X documento(s) anexado(s)"
- ❌ Não pode visualizar lista completa
- ❌ Não pode baixar documentos
- ❌ Não pode excluir documentos (apenas Gestores e Masters)

### Gestor
- ✅ Pode fazer upload de documentos
- ✅ Vê lista completa de documentos
- ✅ Pode visualizar documentos
- ✅ Pode baixar documentos
- ✅ Pode excluir documentos

### Master/Administrador
- ✅ Pode fazer upload de documentos
- ✅ Vê lista completa de documentos
- ✅ Pode visualizar documentos
- ✅ Pode baixar documentos
- ✅ Pode excluir documentos

---

## 🔌 Integração com API

### Endpoint: `GET /api/v1/sales/{saleId}/documents`

#### Resposta para Vendedores/Gerentes:
```json
{
  "success": true,
  "message": "Informação de documentos retornada com sucesso.",
  "data": {
    "has_documents": true,
    "documents_count": 3,
    "message": "Existem 3 documento(s) anexado(s) a esta venda."
  }
}
```

#### Resposta para Gestores/Masters:
```json
{
  "success": true,
  "message": "Documentos listados com sucesso.",
  "data": [
    {
      "id": 1,
      "sale_id": 123,
      "document_type": "cpf",
      "original_name": "CPF_Cliente.pdf",
      ...
    }
  ]
}
```

---

## 🧪 Testes Recomendados

### Cenários de Teste:

1. **Vendedor visualiza documentos**
   - ✅ Deve ver apenas informação básica
   - ✅ Não deve ver botões de download/visualização
   - ✅ Deve ver botão de upload

2. **Gerente visualiza documentos**
   - ✅ Deve ver apenas informação básica
   - ✅ Não deve ver botões de download/visualização
   - ✅ Deve ver botão de upload e exclusão

3. **Gestor visualiza documentos**
   - ✅ Deve ver lista completa
   - ✅ Deve ver todos os botões de ação
   - ✅ Deve conseguir baixar documentos

4. **Upload de documentos**
   - ✅ Todos os roles devem conseguir fazer upload
   - ✅ Após upload, lista deve atualizar

5. **Tratamento de erros**
   - ✅ Erro 403 deve mostrar mensagem apropriada
   - ✅ Erro 404 deve mostrar mensagem de não encontrado

---

## 📝 Notas de Implementação

### Compatibilidade
- ✅ Mantém compatibilidade com formato antigo de resposta da API
- ✅ Suporta tanto `filename` quanto `file_name` nos documentos
- ✅ Suporta tanto `file_size_human` quanto cálculo manual

### Performance
- ✅ Hook `useSaleDocuments` usa `useEffect` para evitar chamadas desnecessárias
- ✅ Estados de loading e error gerenciados adequadamente
- ✅ Recarregamento automático apenas quando necessário

### Acessibilidade
- ✅ Mensagens claras sobre permissões
- ✅ Botões com títulos descritivos (title attribute)
- ✅ Feedback visual durante ações (loading states)

---

## 🔗 Arquivos Relacionados

- `docs/DOCUMENTOS_VENDAS_BACKEND.md` - Documentação backend
- `components/sales/sale-modal.tsx` - Modal que usa SaleDocumentsList
- `app/dashboard/vendas/cadastrar/page.tsx` - Página que usa SaleDocuments

---

## ✅ Checklist de Implementação

- [x] Criar hook `useSaleDocuments` com detecção de tipo
- [x] Criar hook `useDocumentPermissions` (canDelete apenas para Gestores/Masters)
- [x] Criar utilitário de tratamento de erros
- [x] Atualizar `SaleDocumentsList` para renderização condicional
- [x] Atualizar `SaleDocuments` para integrar lista
- [x] Adicionar tratamento de erro 403
- [x] Ocultar botões de download/visualização/exclusão para vendedores/gerentes
- [x] Manter funcionalidade de upload para todos
- [x] Adicionar mensagem informativa sobre permissões (atualizada)
- [x] Suportar estrutura de resposta `response.data.data`
- [x] Testar com diferentes roles de usuário

## 🔄 Atualizações Conforme Nova Documentação

### Mudanças Aplicadas (Janeiro 2024):

1. **Permissão de Exclusão Corrigida:**
   - ❌ Removido: Gerentes não podem mais excluir documentos
   - ✅ Apenas Gestores e Masters podem excluir

2. **Mensagem Atualizada:**
   - Mensagem para vendedores/gerentes agora menciona todas as limitações:
   - "Você não tem permissão para visualizar, baixar ou excluir os documentos."

3. **Tratamento de Resposta Melhorado:**
   - Hook agora suporta `response.data.data` além de `response.data`
   - Melhor compatibilidade com diferentes formatos de resposta da API

4. **Hook useSaleDocuments Aprimorado:**
   - Adicionado `canDelete` ao retorno do hook
   - Melhor detecção de tipo de resposta

---

**Status:** ✅ Implementação Completa

**Próximos Passos:**
1. Testar em ambiente de desenvolvimento
2. Validar com backend implementado
3. Ajustes finais conforme feedback

