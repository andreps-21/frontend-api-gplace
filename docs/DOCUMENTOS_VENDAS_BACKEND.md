# Documentação: Sistema de Documentos Anexados em Vendas

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Endpoints da API](#endpoints-da-api)
3. [Estrutura de Dados](#estrutura-de-dados)
4. [Permissões Atuais](#permissões-atuais)
5. [Fluxo de Funcionamento](#fluxo-de-funcionamento)
6. [Requisitos para Ocultar Documentos](#requisitos-para-ocultar-documentos)
7. [Implementação Backend](#implementação-backend)

---

## 🎯 Visão Geral

O sistema de documentos anexados permite que usuários façam upload de documentos relacionados a vendas (CPF, RG, comprovantes, contratos, etc.). Atualmente, **todos os usuários podem visualizar os documentos anexados**, mas apenas usuários com roles específicas podem excluí-los.

### Objetivo da Mudança
**Ocultar a visualização de documentos anexados para vendedores e gerentes**, permitindo acesso apenas para roles de nível superior (gestor, master, administrador).

---

## 🔌 Endpoints da API

### 1. Listar Documentos de uma Venda
```
GET /api/v1/sales/{saleId}/documents
```

**Descrição:** Retorna a lista de todos os documentos anexados a uma venda específica.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Parâmetros:**
- `saleId` (path, obrigatório): ID da venda

**Resposta de Sucesso (200):**
```json
{
  "data": [
    {
      "id": 1,
      "filename": "documento_123456789.pdf",
      "original_name": "CPF_Cliente.pdf",
      "document_type": "cpf",
      "description": "CPF do cliente",
      "file_size": 245760,
      "mime_type": "application/pdf",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "user": {
        "id": 5,
        "name": "João Silva"
      }
    }
  ]
}
```

**Resposta de Erro (403 - Acesso Negado):**
```json
{
  "message": "Você não tem permissão para visualizar documentos desta venda",
  "error": "Forbidden"
}
```

---

### 2. Upload de Documento
```
POST /api/v1/sales/{saleId}/documents
```

**Descrição:** Faz upload de um documento para uma venda específica.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Parâmetros:**
- `saleId` (path, obrigatório): ID da venda
- `file` (form-data, obrigatório): Arquivo a ser enviado
- `document_type` (form-data, obrigatório): Tipo do documento
- `description` (form-data, opcional): Descrição do documento

**Tipos de Documento Aceitos:**
- `cpf` - CPF
- `rg` - RG/Identidade
- `comprovante_endereco` - Comprovante de Endereço
- `comprovante_renda` - Comprovante de Renda
- `contrato` - Contrato
- `termo_aceite` - Termo de Aceite
- `autorizacao` - Autorização
- `outros` - Outros

**Formatos Aceitos:**
- PDF (`.pdf`)
- Word (`.doc`, `.docx`)
- Imagens (`.png`, `.jpg`, `.jpeg`)

**Tamanho Máximo:** 10MB por arquivo

**Resposta de Sucesso (201):**
```json
{
  "data": {
    "id": 1,
    "filename": "documento_123456789.pdf",
    "original_name": "CPF_Cliente.pdf",
    "document_type": "cpf",
    "description": "CPF do cliente",
    "file_size": 245760,
    "mime_type": "application/pdf",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### 3. Download de Documento
```
GET /api/v1/sales/{saleId}/documents/{documentId}/download
```

**Descrição:** Faz download de um documento específico.

**Headers:**
```
Authorization: Bearer {token}
```

**Parâmetros:**
- `saleId` (path, obrigatório): ID da venda
- `documentId` (path, obrigatório): ID do documento

**Resposta de Sucesso (200):**
- Content-Type: `application/octet-stream` ou tipo específico do arquivo
- Body: Blob/Binary do arquivo

**Resposta de Erro (403 - Acesso Negado):**
```json
{
  "message": "Você não tem permissão para baixar este documento",
  "error": "Forbidden"
}
```

---

### 4. Excluir Documento
```
DELETE /api/v1/sales/{saleId}/documents/{documentId}
```

**Descrição:** Exclui um documento de uma venda.

**Headers:**
```
Authorization: Bearer {token}
```

**Parâmetros:**
- `saleId` (path, obrigatório): ID da venda
- `documentId` (path, obrigatório): ID do documento

**Resposta de Sucesso (200):**
```json
{
  "message": "Documento excluído com sucesso"
}
```

**Resposta de Erro (403 - Acesso Negado):**
```json
{
  "message": "Você não tem permissão para excluir documentos",
  "error": "Forbidden"
}
```

---

## 📊 Estrutura de Dados

### Modelo de Documento
```typescript
interface Document {
  id: number;
  filename: string;              // Nome do arquivo no servidor
  original_name: string;          // Nome original do arquivo
  document_type: string;         // Tipo do documento (cpf, rg, etc.)
  description?: string;           // Descrição opcional
  file_size: number;             // Tamanho em bytes
  mime_type: string;             // Tipo MIME do arquivo
  created_at: string;            // Data de criação (ISO 8601)
  updated_at: string;            // Data de atualização (ISO 8601)
  user?: {                        // Usuário que fez upload
    id: number;
    name: string;
  };
  sale_id: number;               // ID da venda relacionada
}
```

### Tipos de Documento
```typescript
type DocumentType = 
  | 'cpf'
  | 'rg'
  | 'comprovante_endereco'
  | 'comprovante_renda'
  | 'contrato'
  | 'termo_aceite'
  | 'autorizacao'
  | 'outros';
```

---

## 🔐 Permissões Atuais

### Frontend (Atual)

#### Visualização de Documentos
- **Status:** ✅ Todos os usuários podem visualizar
- **Componente:** `SaleDocumentsList`
- **Endpoint:** `GET /sales/{saleId}/documents`

#### Upload de Documentos
- **Status:** ✅ Vendedores e superiores podem fazer upload
- **Componente:** `DocumentUpload`
- **Endpoint:** `POST /sales/{saleId}/documents`

#### Download de Documentos
- **Status:** ✅ Todos os usuários podem baixar
- **Componente:** `SaleDocumentsList` → Botão Download
- **Endpoint:** `GET /sales/{saleId}/documents/{documentId}/download`

#### Exclusão de Documentos
- **Status:** ⚠️ Apenas roles específicas podem excluir
- **Roles Permitidas:** `gerente`, `gestor`, `master`, `administrador`
- **Componente:** `SaleDocumentsList` → Botão Delete (condicional)
- **Endpoint:** `DELETE /sales/{saleId}/documents/{documentId}`

### Hierarquia de Roles
```
vendedor (nível mais baixo)
  ↓
gerente
  ↓
gestor
  ↓
master / administrador (nível mais alto)
```

---

## 🔄 Fluxo de Funcionamento

### 1. Upload de Documento

```
[Frontend] DocumentUpload Component
    ↓
[Seleciona arquivo + tipo + descrição]
    ↓
[POST /sales/{saleId}/documents]
    ↓
[Backend] Valida arquivo, tipo, permissões
    ↓
[Salva arquivo no storage]
    ↓
[Salva registro no banco]
    ↓
[Retorna documento criado]
    ↓
[Frontend] Atualiza lista (se visível)
```

### 2. Visualização de Documentos

```
[Frontend] SaleDocumentsList Component
    ↓
[GET /sales/{saleId}/documents]
    ↓
[Backend] Busca documentos da venda
    ↓
[Retorna lista de documentos]
    ↓
[Frontend] Renderiza cards com documentos
    ↓
[Usuário pode baixar ou excluir (se permitido)]
```

### 3. Download de Documento

```
[Frontend] Botão Download
    ↓
[GET /sales/{saleId}/documents/{documentId}/download]
    ↓
[Backend] Valida permissões
    ↓
[Busca arquivo no storage]
    ↓
[Retorna blob do arquivo]
    ↓
[Frontend] Cria link de download
    ↓
[Usuário baixa arquivo]
```

---

## 🎯 Requisitos para Ocultar Documentos

### Objetivo
**Ocultar a visualização de documentos anexados para vendedores e gerentes**, permitindo acesso apenas para:
- ✅ Gestores
- ✅ Masters
- ✅ Administradores

### Comportamento Esperado

#### Para Vendedores e Gerentes:
- ❌ **NÃO podem visualizar** a lista de documentos anexados
- ✅ **PODEM fazer upload** de documentos
- ❌ **NÃO podem baixar** documentos
- ❌ **NÃO podem excluir** documentos

#### Para Gestores, Masters e Administradores:
- ✅ **PODEM visualizar** a lista de documentos anexados
- ✅ **PODEM fazer upload** de documentos
- ✅ **PODEM baixar** documentos
- ✅ **PODEM excluir** documentos (conforme regra atual)

---

## 🛠️ Implementação Backend

### 1. Middleware de Autorização

Criar/atualizar middleware para verificar permissões de visualização de documentos:

```php
// app/Http/Middleware/CheckDocumentViewPermission.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckDocumentViewPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        // Roles permitidas para visualizar documentos
        $allowedRoles = ['gestor', 'master', 'administrador'];
        
        if (!in_array($user->role, $allowedRoles)) {
            return response()->json([
                'message' => 'Você não tem permissão para visualizar documentos desta venda',
                'error' => 'Forbidden'
            ], 403);
        }
        
        return $next($request);
    }
}
```

### 2. Atualizar Rotas

Aplicar middleware nas rotas de visualização e download:

```php
// routes/api.php

use App\Http\Middleware\CheckDocumentViewPermission;

// Listar documentos (visualização)
Route::get('/sales/{saleId}/documents', [SaleDocumentController::class, 'index'])
    ->middleware(['auth:sanctum', CheckDocumentViewPermission::class]);

// Download de documento
Route::get('/sales/{saleId}/documents/{documentId}/download', [SaleDocumentController::class, 'download'])
    ->middleware(['auth:sanctum', CheckDocumentViewPermission::class]);

// Upload de documento (mantém acesso para todos)
Route::post('/sales/{saleId}/documents', [SaleDocumentController::class, 'store'])
    ->middleware(['auth:sanctum']);

// Excluir documento (mantém regra atual)
Route::delete('/sales/{saleId}/documents/{documentId}', [SaleDocumentController::class, 'destroy'])
    ->middleware(['auth:sanctum', 'can:delete-documents']);
```

### 3. Atualizar Controller

Atualizar métodos do controller para aplicar validação de permissões:

```php
// app/Http/Controllers/SaleDocumentController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Sale;
use App\Models\SaleDocument;

class SaleDocumentController extends Controller
{
    /**
     * Listar documentos de uma venda
     * 
     * Apenas gestores, masters e administradores podem visualizar
     */
    public function index(Request $request, $saleId)
    {
        $user = $request->user();
        
        // Verificar permissão de visualização
        $allowedRoles = ['gestor', 'master', 'administrador'];
        if (!in_array($user->role, $allowedRoles)) {
            return response()->json([
                'message' => 'Você não tem permissão para visualizar documentos desta venda',
                'error' => 'Forbidden'
            ], 403);
        }
        
        // Verificar se a venda existe e usuário tem acesso
        $sale = Sale::findOrFail($saleId);
        
        // Buscar documentos
        $documents = SaleDocument::where('sale_id', $saleId)
            ->with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json([
            'data' => $documents
        ]);
    }
    
    /**
     * Download de documento
     * 
     * Apenas gestores, masters e administradores podem baixar
     */
    public function download(Request $request, $saleId, $documentId)
    {
        $user = $request->user();
        
        // Verificar permissão de download
        $allowedRoles = ['gestor', 'master', 'administrador'];
        if (!in_array($user->role, $allowedRoles)) {
            return response()->json([
                'message' => 'Você não tem permissão para baixar este documento',
                'error' => 'Forbidden'
            ], 403);
        }
        
        $document = SaleDocument::where('sale_id', $saleId)
            ->where('id', $documentId)
            ->firstOrFail();
        
        // Buscar arquivo do storage
        $filePath = storage_path('app/documents/' . $document->filename);
        
        if (!file_exists($filePath)) {
            return response()->json([
                'message' => 'Arquivo não encontrado',
                'error' => 'Not Found'
            ], 404);
        }
        
        return response()->download($filePath, $document->original_name);
    }
    
    /**
     * Upload de documento
     * 
     * Vendedores e superiores podem fazer upload
     */
    public function store(Request $request, $saleId)
    {
        $request->validate([
            'file' => 'required|file|max:10240|mimes:pdf,doc,docx,png,jpg,jpeg',
            'document_type' => 'required|string|in:cpf,rg,comprovante_endereco,comprovante_renda,contrato,termo_aceite,autorizacao,outros',
            'description' => 'nullable|string|max:500'
        ]);
        
        $sale = Sale::findOrFail($saleId);
        
        // Upload do arquivo
        $file = $request->file('file');
        $filename = time() . '_' . $file->getClientOriginalName();
        $file->storeAs('documents', $filename);
        
        // Criar registro no banco
        $document = SaleDocument::create([
            'sale_id' => $saleId,
            'filename' => $filename,
            'original_name' => $file->getClientOriginalName(),
            'document_type' => $request->document_type,
            'description' => $request->description,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'user_id' => $request->user()->id
        ]);
        
        return response()->json([
            'data' => $document->load('user:id,name')
        ], 201);
    }
    
    /**
     * Excluir documento
     * 
     * Apenas gerentes, gestores, masters e administradores podem excluir
     */
    public function destroy(Request $request, $saleId, $documentId)
    {
        $user = $request->user();
        
        // Verificar permissão de exclusão
        $allowedRoles = ['gerente', 'gestor', 'master', 'administrador'];
        if (!in_array($user->role, $allowedRoles)) {
            return response()->json([
                'message' => 'Você não tem permissão para excluir documentos',
                'error' => 'Forbidden'
            ], 403);
        }
        
        $document = SaleDocument::where('sale_id', $saleId)
            ->where('id', $documentId)
            ->firstOrFail();
        
        // Excluir arquivo do storage
        $filePath = storage_path('app/documents/' . $document->filename);
        if (file_exists($filePath)) {
            unlink($filePath);
        }
        
        // Excluir registro do banco
        $document->delete();
        
        return response()->json([
            'message' => 'Documento excluído com sucesso'
        ]);
    }
}
```

### 4. Política de Acesso (Opcional - Laravel)

Criar política para gerenciar permissões de forma mais elegante:

```php
// app/Policies/SaleDocumentPolicy.php

namespace App\Policies;

use App\Models\User;
use App\Models\SaleDocument;

class SaleDocumentPolicy
{
    /**
     * Determinar se o usuário pode visualizar documentos
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['gestor', 'master', 'administrador']);
    }
    
    /**
     * Determinar se o usuário pode visualizar um documento específico
     */
    public function view(User $user, SaleDocument $document): bool
    {
        return in_array($user->role, ['gestor', 'master', 'administrador']);
    }
    
    /**
     * Determinar se o usuário pode fazer upload de documentos
     */
    public function create(User $user): bool
    {
        // Vendedores e superiores podem fazer upload
        return true;
    }
    
    /**
     * Determinar se o usuário pode baixar documentos
     */
    public function download(User $user, SaleDocument $document): bool
    {
        return in_array($user->role, ['gestor', 'master', 'administrador']);
    }
    
    /**
     * Determinar se o usuário pode excluir documentos
     */
    public function delete(User $user, SaleDocument $document): bool
    {
        return in_array($user->role, ['gerente', 'gestor', 'master', 'administrador']);
    }
}
```

### 5. Testes de Integração

Criar testes para validar as permissões:

```php
// tests/Feature/SaleDocumentPermissionTest.php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Sale;
use App\Models\SaleDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SaleDocumentPermissionTest extends TestCase
{
    use RefreshDatabase;
    
    public function test_vendedor_nao_pode_visualizar_documentos()
    {
        $vendedor = User::factory()->create(['role' => 'vendedor']);
        $sale = Sale::factory()->create();
        
        $response = $this->actingAs($vendedor)
            ->getJson("/api/v1/sales/{$sale->id}/documents");
        
        $response->assertStatus(403);
    }
    
    public function test_gerente_nao_pode_visualizar_documentos()
    {
        $gerente = User::factory()->create(['role' => 'gerente']);
        $sale = Sale::factory()->create();
        
        $response = $this->actingAs($gerente)
            ->getJson("/api/v1/sales/{$sale->id}/documents");
        
        $response->assertStatus(403);
    }
    
    public function test_gestor_pode_visualizar_documentos()
    {
        $gestor = User::factory()->create(['role' => 'gestor']);
        $sale = Sale::factory()->create();
        SaleDocument::factory()->create(['sale_id' => $sale->id]);
        
        $response = $this->actingAs($gestor)
            ->getJson("/api/v1/sales/{$sale->id}/documents");
        
        $response->assertStatus(200);
        $response->assertJsonStructure(['data' => [['id', 'filename', 'original_name']]]);
    }
    
    public function test_vendedor_pode_fazer_upload()
    {
        $vendedor = User::factory()->create(['role' => 'vendedor']);
        $sale = Sale::factory()->create();
        
        $file = \Illuminate\Http\UploadedFile::fake()->create('document.pdf', 100);
        
        $response = $this->actingAs($vendedor)
            ->postJson("/api/v1/sales/{$sale->id}/documents", [
                'file' => $file,
                'document_type' => 'cpf',
                'description' => 'CPF do cliente'
            ]);
        
        $response->assertStatus(201);
    }
    
    public function test_vendedor_nao_pode_baixar_documento()
    {
        $vendedor = User::factory()->create(['role' => 'vendedor']);
        $sale = Sale::factory()->create();
        $document = SaleDocument::factory()->create(['sale_id' => $sale->id]);
        
        $response = $this->actingAs($vendedor)
            ->getJson("/api/v1/sales/{$sale->id}/documents/{$document->id}/download");
        
        $response->assertStatus(403);
    }
}
```

---

## 📝 Resumo das Mudanças Necessárias

### Backend

1. ✅ Criar middleware `CheckDocumentViewPermission`
2. ✅ Aplicar middleware nas rotas de visualização e download
3. ✅ Atualizar controller para validar permissões
4. ✅ Manter upload disponível para todos
5. ✅ Manter exclusão apenas para roles permitidas
6. ✅ Criar testes de integração

### Frontend

1. ✅ Atualizar componente `SaleDocumentsList` para tratar erro 403
2. ✅ Ocultar seção de documentos para vendedores e gerentes
3. ✅ Manter funcionalidade de upload visível
4. ✅ Exibir mensagem apropriada quando não houver permissão

---

## 🔍 Validação e Testes

### Cenários de Teste

1. **Vendedor tenta visualizar documentos**
   - ✅ Deve retornar 403 Forbidden
   - ✅ Frontend não deve exibir lista

2. **Gerente tenta visualizar documentos**
   - ✅ Deve retornar 403 Forbidden
   - ✅ Frontend não deve exibir lista

3. **Gestor visualiza documentos**
   - ✅ Deve retornar 200 OK com lista
   - ✅ Frontend deve exibir lista completa

4. **Vendedor faz upload**
   - ✅ Deve retornar 201 Created
   - ✅ Documento deve ser salvo

5. **Vendedor tenta baixar documento**
   - ✅ Deve retornar 403 Forbidden

6. **Gestor baixa documento**
   - ✅ Deve retornar arquivo para download

---

## 📞 Contato e Suporte

Para dúvidas sobre a implementação, entre em contato com a equipe de desenvolvimento.

**Última atualização:** Janeiro 2024

