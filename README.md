# sd-email-api

API de envio de emails da Senha Digital. Recebe o pedido por HTTP, grava um job no MongoDB e entrega o email via SMTP (Zoho).

## Como funciona

```
cliente --POST /send--> api --grava job--> MongoDB
                         |
                         +--> fila de validação --> processEmail --> fila de envio --> sendEmail --> SMTP
```

- `api` responde `201` com o `jobId` assim que grava o job. O envio acontece depois.
- `processEmail` valida os destinatários (sintaxe, domínio descartável e registro MX) e descarta os inválidos.
- `sendEmail` envia pelo SMTP e grava o resultado no job. Se o SMTP falhar, a fila tenta de novo; depois de 3 tentativas a mensagem vai para a fila de erro (`<fila>-dlq`), onde fica por 14 dias.
- Com `ENVIO_DIRETO=true` o envio é feito direto pela `api`, sem fila, sem validação de destinatário e sem retentativa. Hoje está ligado no `env.dev.yml` porque a api-sdgs-agenda usa a URL de dev.

## Ambientes

| Stage | Conta AWS | Região | URL base |
|---|---|---|---|
| dev | 874224893857 | us-east-2 | `https://dev-api.sdconsulta.com.br/api/email` |
| prod | 493765722411 | sa-east-1 | `https://api.sdconsulta.com.br/api/email` |

As rotas também respondem com o prefixo `/sdsend/email` no lugar de `/api/email`.

## Contrato da API

Todas as rotas, exceto a documentação, exigem `Authorization: Bearer <chave>`. São aceitas a chave de `API_SDSEND_KEY` e as chaves listadas em `API_SDSEND_KEYS`, separadas por vírgula, o que permite dar uma chave própria para cada sistema.

### `POST /send`

```json
{
  "to": "destinatario@exemplo.com",
  "subject": "Assunto",
  "html": "<p>Conteúdo</p>",
  "body": "Conteúdo em texto",
  "fromName": "Nome exibido como remetente",
  "attachments": [
    { "filename": "arquivo.pdf", "content": "<base64>", "contentType": "application/pdf" }
  ]
}
```

- Obrigatórios: `to`, `subject` e pelo menos um entre `body` e `html`.
- `to` aceita um email, uma lista ou emails separados por vírgula.
- O endereço do remetente é sempre o configurado em `DEFAULT_FROM_EMAIL`. Um `from` enviado pelo cliente é ignorado.
- O nome exibido é o `fromName` enviado (até 100 caracteres, sem quebras de linha). Sem `fromName`, usa `DEFAULT_FROM_NAME` ou, se não estiver definido, "SD Consulta".

Respostas:

| Status | Corpo |
|---|---|
| 201 | `{ "success": true, "message": "Email enviado para processamento", "jobId": "..." }` |
| 400 | `{ "success": false, "error": "Campos obrigatórios: to, subject, e body ou html" }` |
| 401 | `{ "error": "Não autorizado", "message": "..." }` |

### `GET /status/{jobId}`

Retorna `{ "success": true, "job": { "id", "status", "createdAt", "updatedAt", "attempts", "validationResult", "sendResult" } }` ou `404` se o job não existir. `validationResult` e `sendResult` aparecem quando a etapa já aconteceu, e `attempts` conta as tentativas de envio.

Status possíveis: `PENDING`, `VALIDATING`, `VALIDATION_FAILED`, `VALIDATED`, `SENDING`, `SENT`, `FAILED`.

### `POST /validate-email`

Recebe `{ "email": "..." }` e retorna `{ "success": true, "email": "...", "valid": true|false, "reason"?: "..." }`.

### Documentação

- `GET /swagger`: interface do Swagger
- `GET /swagger.yaml`: especificação em [`docs/openapi.yml`](docs/openapi.yml)

## Estrutura

```
src/
  funcoes/        entradas das Lambdas: api, filaValidacao e filaEnvio
  rotas/          uma rota HTTP por arquivo
  seguranca/      autenticação por chave de API
  servicos/       envio SMTP, validação de email e filas SQS
  repositorios/   acesso ao MongoDB
  config/         leitura das variáveis de ambiente
  tipos/          tipos compartilhados
  utilitarios/    logger e montagem das respostas HTTP
testes/
  contrato/       garantem que o contrato da API e das filas não muda
  apoio/          mocks de MongoDB, SQS, SMTP e DNS
  unitarios/      testes de funções isoladas
```

Os nomes das funções no `serverless.yml` (`api`, `processEmail` e `sendEmail`) não devem ser alterados: eles definem os nomes das Lambdas e das filas já em uso.

## Desenvolvimento

Requer Node 20 ou superior.

```bash
npm install
npm test
npx tsc --noEmit -p .
```

## Deploy

```bash
AWS_PROFILE=DEV_SD npm run deploy:dev
AWS_PROFILE=PROD_SD_2 npm run deploy:prod
```

As variáveis de cada stage vêm de `env.<stage>.yml`.
