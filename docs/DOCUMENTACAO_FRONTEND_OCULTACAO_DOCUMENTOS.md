# Documentação Frontend: Ocultação de Documentos em Vendas

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Resumo Rápido](#resumo-rápido)
3. [Mudanças na API](#mudanças-na-api)
4. [Estrutura de Respostas](#estrutura-de-respostas)
5. [Implementação Frontend](#implementação-frontend)
6. [Componentes e Hooks](#componentes-e-hooks)
7. [Exemplos de Código](#exemplos-de-código)
8. [Tratamento de Erros](#tratamento-de-erros)
9. [Boas Práticas](#boas-práticas)
10. [Testes](#testes)
11. [Checklist de Implementação](#checklist-de-implementação)

---

## 🎯 Visão Geral

O sistema de documentos anexados em vendas foi atualizado para **ocultar os detalhes dos documentos** para vendedores e gerentes. Esses usuários podem apenas saber que existem documentos anexados, mas não podem visualizar, baixar nem excluir os arquivos.

### Objetivo
- **Vendedores e Gerentes**: 
  - ✅ Veem apenas informação de que existem documentos (contagem)
  - ✅ Podem fazer upload de documentos
  - ❌ **NÃO podem** visualizar detalhes dos documentos
  - ❌ **NÃO podem** baixar documentos
  - ❌ **NÃO podem** excluir documentos

- **Gestores e Masters**: 
  - ✅ Veem lista completa com todos os detalhes
  - ✅ Podem visualizar documentos específicos
  - ✅ Podem baixar documentos
  - ✅ Podem excluir documentos
  - ✅ Podem fazer upload de documentos

---

## ⚡ Resumo Rápido

### O que mudou?

1. **Endpoint de listagem** (`GET /sales/{saleId}/documents`):
   - Vendedores/Gerentes: Recebem objeto com `has_documents`, `documents_count` e `message`
   - Gestores/Masters: Recebem array completo de documentos

2. **Endpoints bloqueados para Vendedores/Gerentes**:
   - `GET /sales/{saleId}/documents/{documentId}` → Retorna 403
   - `GET /sales/{saleId}/documents/{documentId}/download` → Retorna 403
   - `DELETE /sales/{saleId}/documents/{documentId}` → Retorna 403

3. **Endpoint sempre disponível**:
   - `POST /sales/{saleId}/documents` → Todos podem fazer upload

### Como implementar?

1. **Detectar tipo de resposta**: Verificar se é array ou objeto com `has_documents`
2. **Renderizar condicionalmente**: Mostrar mensagem simples ou lista completa
3. **Ocultar ações**: Esconder botões de download/visualização/exclusão para vendedores/gerentes
4. **Tratar erros 403**: Exibir mensagem apropriada quando tentarem acessar recursos bloqueados

### Exemplo Rápido

```typescript
// Hook retorna informações diferentes baseado no role
const { documents, isBasicInfo, canDownload, canDelete } = useSaleDocuments(saleId);

// Para vendedores/gerentes: documents será um objeto
if (isBasicInfo) {
  // Mostrar: "Existem 3 documento(s) anexado(s)"
  // Sem botões de ação
}

// Para gestores/masters: documents será um array
else {
  // Mostrar lista completa com botões de download/exclusão
  documents.map(doc => (
    <DocumentCard 
      document={doc}
      canDownload={canDownload}
      canDelete={canDelete}
    />
  ));
}
```

### Permissões por Role

| Funcionalidade | Vendedor | Gerente | Gestor | Master |
|----------------|----------|---------|--------|--------|
| Ver informação básica (contagem) | ✅ | ✅ | ✅ | ✅ |
| Ver lista completa de documentos | ❌ | ❌ | ✅ | ✅ |
| Visualizar documento específico | ❌ | ❌ | ✅ | ✅ |
| Baixar documento | ❌ | ❌ | ✅ | ✅ |
| Fazer upload | ✅ | ✅ | ✅ | ✅ |
| Excluir documento | ❌ | ❌ | ✅ | ✅ |

---

## 🔌 Mudanças na API

### Endpoint: Listar Documentos

**URL:** `GET /api/v1/sales/{saleId}/documents`

#### Resposta para Vendedores e Gerentes

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

**Quando não há documentos:**
```json
{
  "success": true,
  "message": "Informação de documentos retornada com sucesso.",
  "data": {
    "has_documents": false,
    "documents_count": 0,
    "message": "Nenhum documento anexado a esta venda."
  }
}
```

#### Resposta para Gestores e Masters

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
      "file_name": "uuid-gerado.pdf",
      "file_path": "sale-documents/123/uuid-gerado.pdf",
      "mime_type": "application/pdf",
      "file_size": 245760,
      "description": "CPF do cliente",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00.000000Z",
      "updated_at": "2024-01-15T10:30:00.000000Z",
      "file_url": "http://api.exemplo.com/storage/sale-documents/123/uuid-gerado.pdf",
      "file_size_human": "240 KB",
      "file_extension": "pdf"
    }
  ]
}
```

### Endpoint: Visualizar Documento Específico

**URL:** `GET /api/v1/sales/{saleId}/documents/{documentId}`

#### Resposta para Vendedores e Gerentes

```json
{
  "success": false,
  "message": "Você não tem permissão para visualizar documentos desta venda.",
  "error": null
}
```

**Status Code:** `403 Forbidden`

### Endpoint: Download de Documento

**URL:** `GET /api/v1/sales/{saleId}/documents/{documentId}/download`

#### Resposta para Vendedores e Gerentes

```json
{
  "success": false,
  "message": "Você não tem permissão para baixar documentos desta venda.",
  "error": null
}
```

**Status Code:** `403 Forbidden`

### Endpoint: Excluir Documento

**URL:** `DELETE /api/v1/sales/{saleId}/documents/{documentId}`

#### Resposta para Vendedores e Gerentes

```json
{
  "success": false,
  "message": "Você não tem permissão para excluir documentos desta venda.",
  "error": null
}
```

**Status Code:** `403 Forbidden`

#### Resposta para Gestores e Masters

```json
{
  "success": true,
  "message": "Documento excluído com sucesso.",
  "data": null
}
```

**Status Code:** `200 OK`

---

## 📊 Estrutura de Respostas

### Tipo: Informação Básica (Vendedor/Gerente)

```typescript
interface DocumentsBasicInfo {
  has_documents: boolean;
  documents_count: number;
  message: string;
}
```

### Tipo: Lista Completa (Gestor/Master)

```typescript
interface Document {
  id: number;
  sale_id: number;
  document_type: string;
  original_name: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  file_url: string;
  file_size_human: string;
  file_extension: string;
}

type DocumentsResponse = Document[] | DocumentsBasicInfo;
```

### Função Helper para Detectar Tipo

```typescript
function isBasicInfo(data: DocumentsResponse): data is DocumentsBasicInfo {
  return 'has_documents' in data && 'documents_count' in data;
}

function isDocumentList(data: DocumentsResponse): data is Document[] {
  return Array.isArray(data);
}
```

---

## 🛠️ Implementação Frontend

### Arquivos Implementados

#### 1. Hook: `useSaleDocuments`
**Caminho:** `lib/hooks/use-sale-documents.ts`

**Funcionalidades:**
- Detecta automaticamente o tipo de resposta da API
- Suporta `response.data.data` e `response.data`
- Gerencia estados de loading e erro
- Retorna flags de permissão (`canViewDetails`, `canDownload`, `canDelete`)

#### 2. Hook: `useDocumentPermissions`
**Caminho:** `lib/hooks/use-document-permissions.ts`

**Funcionalidades:**
- Centraliza lógica de permissões baseada em roles
- Retorna flags booleanas para cada ação
- **Importante:** `canDelete` apenas para Gestores e Masters (não Gerentes)

#### 3. Utilitário: `document-error-handler`
**Caminho:** `lib/utils/document-error-handler.ts`

**Funcionalidades:**
- Tratamento padronizado de erros relacionados a documentos
- Categoriza erros em tipos: `permission`, `not_found`, `generic`

#### 4. Componente: `SaleDocumentsList`
**Caminho:** `components/sales/sale-documents-list.tsx`

**Funcionalidades:**
- Renderização condicional baseada em permissões
- Exibe informação básica para vendedores/gerentes
- Exibe lista completa para gestores/masters
- Tratamento de erros 403

#### 5. Componente: `SaleDocuments`
**Caminho:** `components/documents/sale-documents.tsx`

**Funcionalidades:**
- Integra lista de documentos e área de upload
- Gerencia estado de exibição do formulário

---

## ⚠️ Tratamento de Erros

### Erro 403 - Sem Permissão

```typescript
// lib/utils/document-error-handler.ts
export function handleDocumentError(error: any): DocumentErrorInfo {
  if (error.response?.status === 403) {
    return {
      message: 'Você não tem permissão para realizar esta ação.',
      type: 'permission',
    };
  }
  
  if (error.response?.status === 404) {
    return {
      message: 'Documento não encontrado.',
      type: 'not_found',
    };
  }
  
  return {
    message: error.response?.data?.message || 'Erro ao processar solicitação.',
    type: 'generic',
  };
}
```

### Exemplo de Uso

```typescript
try {
  await apiService.downloadDocument(saleId, documentId);
} catch (error) {
  const errorInfo = handleDocumentError(error);
  
  if (errorInfo.type === 'permission') {
    notifications.custom.error('Você não tem permissão para baixar este documento');
  } else {
    notifications.custom.error(errorInfo.message);
  }
}
```

---

## 💡 Boas Práticas

### 1. Detecção de Tipo de Resposta

Sempre verifique o tipo de resposta antes de renderizar:

```typescript
// ✅ CORRETO
if (isBasicInfo(documents)) {
  // Renderizar mensagem simples
} else if (isDocumentList(documents)) {
  // Renderizar lista completa
}

// ❌ INCORRETO - Não assuma que sempre será array
documents.map(doc => ...) // Pode quebrar se for objeto
```

### 2. Tratamento de Erros

Sempre trate erros 403 especificamente:

```typescript
// ✅ CORRETO
try {
  await downloadDocument(id);
} catch (error) {
  if (error.response?.status === 403) {
    toast.error('Você não tem permissão para baixar este documento.');
  } else {
    toast.error('Erro ao baixar documento.');
  }
}
```

### 3. Ocultação de Elementos

Use renderização condicional ao invés de apenas CSS:

```typescript
// ✅ CORRETO
{canDownload && (
  <button onClick={handleDownload}>Baixar</button>
)}

// ❌ INCORRETO - Ainda pode ser acessado via DevTools
<button 
  onClick={handleDownload}
  className={!canDownload ? 'hidden' : ''}
>
  Baixar
</button>
```

### 4. Feedback Visual

Sempre forneça feedback claro ao usuário:

```typescript
// ✅ CORRETO - Mensagem clara sobre limitações
{documents.has_documents && (
  <p className="text-xs text-blue-600 mt-2">
    Você não tem permissão para visualizar, baixar ou excluir os documentos.
  </p>
)}
```

### 5. Validação no Frontend

Valide permissões antes de fazer requisições:

```typescript
// ✅ CORRETO - Evita requisição desnecessária
const handleDownload = async () => {
  if (!canDownload) {
    toast.error('Você não tem permissão para baixar documentos.');
    return;
  }
  // Fazer requisição...
};
```

---

## 📝 Checklist de Implementação

### Backend (já implementado ✅)
- [x] Validação de permissões no método `index()`
- [x] Validação de permissões no método `show()`
- [x] Validação de permissões no método `download()`
- [x] Validação de permissões no método `destroy()`
- [x] Upload disponível para todos

### Frontend
- [x] Criar hook `useSaleDocuments` com detecção de tipo de resposta
- [x] Criar hook `useDocumentPermissions` para gerenciar permissões
- [x] Atualizar componente `SaleDocumentsList` para renderizar condicionalmente
- [x] Implementar tratamento de erro 403 para todas as ações bloqueadas
- [x] Ocultar botões de download/visualização/exclusão para vendedores e gerentes
- [x] Adicionar mensagem informativa quando houver documentos mas sem permissão
- [x] Manter funcionalidade de upload disponível e visível para todos
- [x] Suportar estrutura de resposta `response.data.data`
- [x] Adicionar loading states apropriados
- [x] Implementar feedback visual para ações bloqueadas
- [x] Corrigir permissão de exclusão (apenas Gestores e Masters)

### Testes
- [ ] Testes unitários para `useSaleDocuments`
- [ ] Testes unitários para `useDocumentPermissions`
- [ ] Testes de componente para `SaleDocumentsList`
- [ ] Testes de integração para fluxo completo
- [ ] Testes E2E para diferentes roles

---

## 🔗 Referências

- **API Backend:** `/api/v1/sales/{saleId}/documents`
- **Endpoint Base:** `GET /api/v1/sales/{saleId}/documents`
- **Upload:** `POST /api/v1/sales/{saleId}/documents`
- **Download:** `GET /api/v1/sales/{saleId}/documents/{documentId}/download`
- **Exclusão:** `DELETE /api/v1/sales/{saleId}/documents/{documentId}`
- **Tipos de Documento:** `GET /api/v1/document-types`
- **Documentação Backend:** Ver `docs/DOCUMENTOS_VENDAS_BACKEND.md`

---

## 📞 Suporte

Para dúvidas sobre a implementação:
1. Consulte esta documentação completa
2. Verifique os exemplos de código fornecidos
3. Entre em contato com a equipe de backend para questões de API
4. Entre em contato com a equipe de frontend para questões de UI/UX

---

**Última atualização:** Janeiro 2024  
**Versão:** 1.1.0  
**Status:** ✅ Implementação Completa

