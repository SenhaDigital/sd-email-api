# 📚 Documentação da API SDsend

Bem-vindo à documentação da API SDsend. Aqui você encontrará todas as informações necessárias para integrar e utilizar nossa API de envio de emails.

## 🔌 Endpoints

### 1. Enviar Email

Envia um novo email para um ou mais destinatários.

- **Método**: `POST`
- **Endpoint**: `/api/email/send`
- **Autenticação**: Obrigatória

**Parâmetros do Corpo (JSON):**

| Parâmetro   | Tipo     | Obrigatório | Descrição                                   |
|-------------|----------|-------------|-------------------------------------------|
| to          | String/Array | Sim        | Email(s) do(s) destinatário(s)            |
| subject     | String   | Sim         | Assunto do email                          |
| text        | String   | Não*        | Corpo do email em texto simples           |
| html        | String   | Não*        | Corpo do email em HTML                    |
| from        | String   | Não         | Email do remetente                        |
| fromName    | String   | Não         | Nome do remetente                         |
| attachments | Array    | Não         | Anexos (ver formato abaixo)               |
| cc          | String/Array | Não      | Email(s) em cópia                         |
| bcc         | String/Array | Não      | Email(s) em cópia oculta                 |
| replyTo     | String   | Não         | Email para resposta                       |
| metadata    | Object   | Não         | Metadados adicionais                      |


> *Pelo menos um dos campos `text` ou `html` deve ser fornecido.

**Formato dos Anexos:**
```json
[
  {
    "filename": "arquivo.pdf",
    "content": "base64encodedstring",
    "contentType": "application/pdf"
  }
]
```

**Exemplo de Requisição:**
```http
POST /api/email/send
Authorization: Bearer sua-chave-api
Content-Type: application/json

{
  "to": ["destinatario@exemplo.com", "outro@exemplo.com"],
  "subject": "Assunto do Email",
  "text": "Olá, este é um email de teste.",
  "html": "<p>Olá, <strong>este é um email de teste</strong>.</p>",
  "from": "contato@empresa.com",
  "fromName": "Empresa",
  "cc": ["copia@exemplo.com"],
  "metadata": {
    "campaignId": "12345",
    "userId": "67890"
  }
}
```

**Resposta de Sucesso (202 Accepted):**
```json
{
  "success": true,
  "message": "Email adicionado à fila para processamento",
  "jobId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### 2. Validar Email

Valida um endereço de email.

- **Método**: `POST`
- **Endpoint**: `/api/email/validate-email`
- **Autenticação**: Obrigatória

**Parâmetros do Corpo (JSON):**

| Parâmetro | Tipo   | Obrigatório | Descrição                |
|-----------|--------|-------------|--------------------------|
| email     | String | Sim         | Email a ser validado     |


**Exemplo de Requisição:**
```http
POST /api/email/validate-email
Authorization: Bearer sua-chave-api
Content-Type: application/json

{
  "email": "usuario@exemplo.com"
}
```

**Resposta de Sucesso (200 OK):**
```json
{
  "valid": true,
  "email": "usuario@exemplo.com",
  "domain": "exemplo.com",
  "message": "O email é válido"
}
```

### 3. Verificar Status do Job

Verifica o status de um job de envio de email.

- **Método**: `GET`
- **Endpoint**: `/api/email/status/:jobId`
- **Autenticação**: Obrigatória

**Parâmetros de Caminho:**

| Parâmetro | Tipo   | Obrigatório | Descrição                |
|-----------|--------|-------------|--------------------------|
| jobId     | String | Sim         | ID do job de envio      |


**Exemplo de Requisição:**
```http
GET /api/email/status/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer sua-chave-api
```

**Resposta de Sucesso (200 OK):**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "SENT",
  "createdAt": "2023-06-24T12:00:00.000Z",
  "updatedAt": "2023-06-24T12:00:05.000Z",
  "emailRequest": {
    "to": ["destinatario@exemplo.com"],
    "subject": "Assunto do Email"
  },
  "sendResult": {
    "messageId": "<20230624120000.123456@exemplo.com>",
    "accepted": ["destinatario@exemplo.com"],
    "rejected": [],
    "timestamp": "2023-06-24T12:00:05.123Z"
  }
}
```

## 🔒 Autenticação

Todas as requisições à API devem incluir um cabeçalho de autorização com uma chave de API válida.

```
Authorization: Bearer sua-chave-api
```

## 🚦 Códigos de Status

A API retorna os seguintes códigos de status HTTP:

| Código | Status                | Descrição                                      |
|--------|-----------------------|-----------------------------------------------|
| 200    | OK                   | Requisição bem-sucedida                       |
| 201    | Created              | Recurso criado com sucesso                    |
| 202    | Accepted             | Requisição aceita para processamento          |
| 400    | Bad Request          | Dados inválidos na requisição                 |
| 401    | Unauthorized         | Autenticação necessária ou inválida           |
| 403    | Forbidden            | Acesso negado                                 |
| 404    | Not Found            | Recurso não encontrado                        |
| 429    | Too Many Requests    | Muitas requisições em um curto período        |
| 500    | Internal Server Error| Erro interno do servidor                      |

## 🛠️ Exemplos de Uso

### Enviando um email simples

```javascript
const response = await fetch('https://api.sdconsulta.com.br/api/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sua-chave-api'
  },
  body: JSON.stringify({
    to: 'cliente@exemplo.com',
    subject: 'Bem-vindo ao nosso serviço!',
    text: 'Obrigado por se cadastrar em nossa plataforma.',
    from: 'contato@empresa.com',
    fromName: 'Empresa'
  })
});

const data = await response.json();
console.log(data);
```

### Verificando o status de um job

```javascript
const jobId = '123e4567-e89b-12d3-a456-426614174000';
const response = await fetch(`https://api.sdconsulta.com.br/api/email/status/${jobId}`, {
  headers: {
    'Authorization': 'Bearer sua-chave-api'
  }
});

const status = await response.json();
console.log(status);
```

## 📝 Notas Adicionais

- A API tem um limite de taxa (rate limit) de 1000 requisições por hora por chave de API.
- Emails com anexos grandes podem levar mais tempo para serem processados.
- Recomenda-se sempre verificar o status do job após o envio para confirmar o sucesso da operação.
- Em ambiente de desenvolvimento, os emails não são realmente enviados, a menos que configurado explicitamente.

Para mais informações, entre em contato com nossa equipe de suporte.
