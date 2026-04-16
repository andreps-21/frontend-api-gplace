# 📝 Documentação - Tela de Cadastro/Edição de Venda

## 🎯 Visão Geral

Esta documentação descreve como implementar a tela de cadastro e edição de venda no frontend, incluindo todas as validações, regras de negócio e o novo campo obrigatório **ICCID**.

---

## 🔗 Endpoints

### Criar Venda
```http
POST /api/v1/sales
```

**Regras de negócio:**
- **Data da venda:** não pode ser retroativa (deve ser **hoje** ou posterior). A API rejeita datas anteriores ao dia atual.
- **Documento obrigatório:** é obrigatório anexar **pelo menos um documento** à venda na criação. A requisição deve ser **multipart/form-data** com os campos da venda e um ou mais arquivos. Se não houver anexo, a API retorna 422 com a mensagem "É obrigatório anexar pelo menos um documento à venda.".
- **Para não bloquear quando há anexo:** a API aceita o arquivo em qualquer um destes nomes de campo: `document`, `documents` / `documents[]`, `file`, `files`, `anexo`, `anexos`. O frontend pode usar o que for mais conveniente. Formatos aceitos: PDF, DOC, DOCX, PNG, JPG, JPEG (máx. 10 MB por arquivo).

**Headers para criar venda:**
```http
Content-Type: multipart/form-data
Authorization: Bearer {token}
Accept: application/json
```

### Atualizar Venda
```http
PUT /api/v1/sales/{id}
```

**Autenticação:** Requerida (Bearer Token)

**Headers (para atualização, apenas JSON):**
```http
Content-Type: application/json
Authorization: Bearer {token}
Accept: application/json
```

---

## 📋 Campos do Formulário

### Campos Obrigatórios

| Campo | Tipo | Validação | Descrição |
|-------|------|-----------|-----------|
| `customer_id` | integer | required, exists:customers,id | ID do cliente |
| `category_id` | integer | required, exists:categories,id | ID da categoria |
| `establishment_id` | integer | required, exists:establishments,id | ID do estabelecimento |
| `quantity` | integer | required, min:1 | Quantidade (mínimo 1) |
| `unit_price` | decimal | required, min:0 | Preço unitário (mínimo 0) |
| `product_name` | string | required, max:255 | Nome do produto |
| `iccid` | string | **required, size:20, regex:/^[0-9]+$/** | **ICCID (20 caracteres numéricos)** ✅ |

### Campos Opcionais

| Campo | Tipo | Validação | Descrição |
|-------|------|-----------|-----------|
| `customer_code` | string | nullable | Código do cliente (formato: 1.234567890) |
| `sale_date` | date | nullable, date, **after_or_equal:today** | Data da venda (YYYY-MM-DD; **não pode ser retroativa** – deve ser hoje ou posterior) |
| `product_id` | integer | nullable, exists:products,id | ID do produto (se disponível) |
| `total_price` | decimal | nullable | Preço total (calculado automaticamente se não informado) |
| `payment_method` | string | nullable, max:50 | Método de pagamento |
| `activation_number` | string | nullable, max:20 | Número de ativação |
| `imei` | string | nullable, max:20 | IMEI do dispositivo |
| `device_value` | decimal | nullable, min:0 | Valor do dispositivo |
| `meu_tim` | boolean | nullable | Meu TIM |
| `debit_automatic` | boolean | nullable | Débito automático |
| `portability` | boolean | nullable | Portabilidade |
| `provisional_number` | string | nullable, max:20 | Número provisório |
| `rescue` | boolean | nullable | Resgate |
| `observations` | string | nullable | Observações |

---

## ✅ Campo ICCID - Detalhamento

### Especificações Técnicas

- **Nome do campo:** `iccid`
- **Tipo:** String
- **Obrigatório:** ✅ Sim
- **Tamanho:** Exatamente 20 caracteres
- **Formato:** Apenas números (0-9)
- **Validação Regex:** `/^[0-9]+$/`

### Mensagens de Erro da API

| Erro | Mensagem |
|------|----------|
| Campo vazio | `"O campo ICCID é obrigatório."` |
| Tamanho incorreto | `"O campo ICCID deve ter exatamente 20 caracteres."` |
| Formato inválido | `"O campo ICCID deve conter apenas números."` |

### Exemplo de Valores Válidos

```
✅ "12345678901234567890"
✅ "00000000000000000000"
✅ "98765432109876543210"
```

### Exemplo de Valores Inválidos

```
❌ "1234567890123456789"  (19 caracteres - muito curto)
❌ "123456789012345678901" (21 caracteres - muito longo)
❌ "1234567890123456789A" (contém letra)
❌ "" (vazio)
```

---

## 💻 Implementação no Frontend

### Validação do ICCID (JavaScript/TypeScript)

```typescript
const validateICCID = (iccid: string): { isValid: boolean; error?: string } => {
  if (!iccid) {
    return { isValid: false, error: 'O campo ICCID é obrigatório.' };
  }
  if (iccid.length !== 20) {
    return { isValid: false, error: 'O campo ICCID deve ter exatamente 20 caracteres.' };
  }
  if (!/^[0-9]+$/.test(iccid)) {
    return { isValid: false, error: 'O campo ICCID deve conter apenas números.' };
  }
  return { isValid: true };
};
```

### Criação com multipart/form-data

- Enviar todos os campos da venda no `FormData`.
- Anexos: usar um dos nomes aceitos pela API (`document`, `documents[]`, `anexo`, `anexos`, etc.). Exemplo com `documents[]`:

```typescript
const formData = new FormData();
formData.append('customer_id', String(customerId));
formData.append('establishment_id', String(establishmentId));
// ... demais campos ...
pendingDocuments.forEach((file) => formData.append('documents[]', file));
await apiService.createSaleWithDocuments(formData);
```

---

## 📚 Documentação Relacionada

- **CPF/CNPJ no cadastro:** `CADASTRO_VENDAS_CPF_CNPJ_BACKEND.md`
- **Documentos de vendas:** `DOCUMENTOS_VENDAS_BACKEND.md`

---

## ⚠️ Notas Importantes

1. **ICCID** é obrigatório na criação e na atualização de vendas (20 dígitos numéricos).
2. **Data da venda:** apenas hoje ou datas futuras.
3. **Documento:** pelo menos um anexo na criação (multipart/form-data); formatos: PDF, DOC, DOCX, PNG, JPG, JPEG (máx. 10 MB por arquivo).

---

**Última atualização:** 11/12/2025
