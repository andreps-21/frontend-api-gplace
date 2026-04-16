# Cadastro de Vendas – CPF e CNPJ (Frontend e Backend)

## Índice

1. [Visão geral](#visão-geral)
2. [Como o frontend funciona hoje (após implementação)](#como-o-frontend-funciona-hoje)
3. [Fluxo Pessoa Física (CPF)](#fluxo-pessoa-física-cpf)
4. [Fluxo Pessoa Jurídica (CNPJ)](#fluxo-pessoa-jurídica-cnpj)
5. [Contratos da API para o Backend](#contratos-da-api-para-o-backend)
6. [O que o Backend precisa garantir](#o-que-o-backend-precisa-garantir)

---

## Visão geral

No cadastro de vendas, o usuário pode registrar um cliente como **Pessoa Física (CPF)** ou **Pessoa Jurídica (CNPJ)**. Em ambos os casos:

- O frontend **busca** se já existe cliente com aquele documento (CPF ou CNPJ).
- Se **existir**, preenche os dados e usa o `customer_id` na venda.
- Se **não existir**, o usuário preenche os dados manualmente e, ao submeter, o frontend **cria o cliente** e em seguida cria a venda vinculada a ele.

O backend precisa aceitar **NIF** (CPF 11 dígitos ou CNPJ 14 dígitos) na busca e na criação de clientes, e tratar **Pessoa Jurídica** sem obrigatoriedade de nome composto nem data de nascimento.

---

## Como o frontend funciona hoje

### Seletor de tipo de pessoa

- No topo do bloco de dados do cliente há um campo **“Tipo de pessoa”**:
  - **Pessoa Física (CPF)** – fluxo com CPF, Nome, Sobrenome, Data de Nascimento.
  - **Pessoa Jurídica (CNPJ)** – fluxo com CNPJ, Razão Social, sem Sobrenome e sem Data de Nascimento.

### Campos exibidos por tipo

| Tipo            | Campo documento | Nome / Razão      | Sobrenome | Data de nascimento | Telefone | E-mail |
|-----------------|-----------------|-------------------|-----------|--------------------|----------|--------|
| Pessoa Física   | CPF *           | Nome *            | Sobrenome * | Opcional          | *        | Opcional |
| Pessoa Jurídica | CNPJ *          | Razão Social *    | —         | —                  | *        | Opcional |

Endereço (CEP, logradouro, número, complemento, bairro, cidade, estado) é comum aos dois e opcional conforme regra de negócio.

---

## Fluxo Pessoa Física (CPF)

1. Usuário seleciona **“Pessoa Física (CPF)”** e digita o **CPF** (11 dígitos, máscara `000.000.000-00`).
2. Ao completar 11 dígitos, o frontend chama:
   - `POST /customers/search-by-nif` com `{ "nif": "<cpf_sem_máscara>" }` (ex.: `"12345678909"`).
3. **Se o cliente existir:**
   - Resposta com dados do cliente (nome, telefone, email, endereço, etc.).
   - Frontend preenche Nome, Sobrenome, Telefone, E-mail, Data de Nascimento e endereço.
   - No submit da venda, usa `customer_id` do cliente encontrado (e pode atualizar endereço do cliente).
4. **Se o cliente não existir (erro 404 ou equivalente):**
   - Frontend mostra aviso: “Cliente não encontrado – Preencha os dados do cliente manualmente.”
   - Usuário preenche Nome, Sobrenome, Telefone, E-mail, Data de Nascimento (e endereço se quiser).
   - No submit:
     - Chama `POST /customers` com: `name` (nome + sobrenome), `nif` (CPF), `email`, `phone`, `birth_date`, e campos de endereço.
     - Usa o `id` do cliente criado como `customer_id` da venda.

Validação no frontend: apenas CPFs válidos (algoritmo de dígitos verificadores) são aceitos no envio.

---

## Fluxo Pessoa Jurídica (CNPJ)

1. Usuário seleciona **“Pessoa Jurídica (CNPJ)”** e digita o **CNPJ** (14 dígitos, máscara `00.000.000/0001-00`).
2. Ao completar 14 dígitos, o frontend chama:
   - `POST /customers/search-by-nif` com `{ "nif": "<cnpj_sem_máscara>" }` (ex.: `"12345678000199"`).
3. **Se o cliente existir:**
   - Resposta com dados do cliente.
   - Frontend preenche Razão Social, Telefone, E-mail e endereço (Razão Social vem do campo `name` do cliente).
   - No submit, usa `customer_id` do cliente encontrado.
4. **Se o cliente não existir:**
   - Frontend mostra: “Cliente não encontrado – Preencha Razão Social, Telefone e E-mail manualmente.”
   - Usuário preenche **Razão Social ***, Telefone, E-mail e endereço (se necessário).
   - No submit:
     - Chama `POST /customers` com: `name` = Razão Social, `nif` = CNPJ (sem máscara), `email`, `phone`, e campos de endereço.
     - **Não envia** `birth_date` para PJ.
     - Usa o `id` do cliente criado como `customer_id` da venda.

Validação no frontend: apenas CNPJs válidos (algoritmo oficial) são aceitos; Razão Social é obrigatória para PJ.

---

## Contratos da API para o Backend

### 1. Busca de cliente por documento (CPF ou CNPJ)

**Endpoint:** `POST /customers/search-by-nif`

**Request (body):**

```json
{
  "nif": "12345678909"
}
```

ou

```json
{
  "nif": "12345678000199"
}
```

- `nif`: string, **apenas números**, 11 dígitos (CPF) ou 14 dígitos (CNPJ).

**Comportamento esperado:**

- Se existir cliente com esse NIF (CPF ou CNPJ): retornar **200** com o cliente no formato usado hoje (incluindo `id`, `name`, `nif`, `email`, `phone`, endereço, etc.).
- Se **não** existir: retornar **404** (ou outro código que o front trate como “não encontrado”) para o frontend mostrar “Cliente não encontrado” e permitir preenchimento manual.

**Resposta de sucesso (exemplo):**

```json
{
  "message": "...",
  "data": {
    "id": 1,
    "name": "Razão Social ou Nome Completo",
    "nif": "12345678000199",
    "email": "contato@empresa.com",
    "phone": "11999999999",
    "zip_code": "...",
    "address": "...",
    "number": "...",
    "complement": "...",
    "neighborhood": "...",
    "city": "...",
    "state": "...",
    ...
  }
}
```

O frontend usa o mesmo endpoint para CPF e CNPJ; a diferença é apenas o tamanho de `nif` (11 vs 14).

---

### 2. Criação de cliente (Pessoa Física)

**Endpoint:** `POST /customers`

**Request (body) – PF (exemplo):**

```json
{
  "name": "João da Silva",
  "nif": "12345678909",
  "email": "joao@email.com",
  "phone": "11999999999",
  "birth_date": "1990-01-15",
  "zip_code": "01310100",
  "address": "Av. Paulista",
  "number": "1000",
  "complement": "Sala 1",
  "neighborhood": "Bela Vista",
  "city": "São Paulo",
  "state": "SP"
}
```

- `name`: obrigatório (Nome + Sobrenome).
- `nif`: obrigatório, 11 dígitos (CPF).
- `birth_date`: opcional, formato `YYYY-MM-DD`.
- Demais campos opcionais conforme regras do backend.

---

### 3. Criação de cliente (Pessoa Jurídica)

**Request (body) – PJ (exemplo):**

```json
{
  "name": "Empresa Exemplo Ltda",
  "nif": "12345678000199",
  "email": "contato@empresa.com",
  "phone": "1133334444",
  "zip_code": "01310100",
  "address": "Av. Paulista",
  "number": "500",
  "complement": "",
  "neighborhood": "Bela Vista",
  "city": "São Paulo",
  "state": "SP"
}
```

- `name`: obrigatório – no frontend é a **Razão Social**.
- `nif`: obrigatório, **14 dígitos** (CNPJ).
- **Não é enviado** `birth_date` para PJ; o backend deve aceitar criação de cliente sem `birth_date` (campo opcional).

Resposta esperada: **201** (ou 200) com `data.id` do cliente criado, para o frontend usar como `customer_id` na venda.

---

## O que o Backend precisa garantir

1. **`POST /customers/search-by-nif`**
   - Aceitar `nif` com **11 dígitos (CPF)** ou **14 dígitos (CNPJ)**.
   - Buscar cliente por CPF ou CNPJ conforme o tamanho (ou por um único campo “NIF” que armazene ambos).
   - Retornar 404 (ou equivalente) quando não houver cliente com esse documento.

2. **`POST /customers`**
   - Aceitar criação com:
     - `name` (obrigatório) – para PJ é Razão Social; para PF é Nome completo.
     - `nif` (obrigatório) – 11 ou 14 dígitos.
     - `birth_date` **opcional** – não enviado para PJ; enviado para PF quando informado.
   - Não exigir “sobrenome” nem “data de nascimento” para cliente PJ (o frontend não envia esses campos para PJ).

3. **Modelo de cliente**
   - Ter um único campo de documento (ex.: `nif`) que armazene CPF (11) ou CNPJ (14), ou dois campos (cpf/cnpj) desde que a busca por NIF consiga consultar ambos.
   - Permitir `birth_date` nulo para Pessoa Jurídica.

4. **Respostas**
   - Busca: mesmo formato de cliente para CPF e CNPJ (ex.: `id`, `name`, `nif`, `email`, `phone`, endereço).
   - Criação: retornar o objeto do cliente criado incluindo `id`, para uso em `customer_id` na criação da venda.

Com isso, o frontend mantém o mesmo fluxo de “buscar → se não achar, preencher manualmente → ao submeter, criar cliente e depois criar venda” tanto para CPF quanto para CNPJ, e o backend fica alinhado a esse comportamento.
