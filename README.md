# SDsend - API Serverless de Email Descentralizada

Este projeto implementa uma API para envio de emails de forma descentralizada usando arquitetura serverless com AWS Lambda.

## Componentes Principais

1. **API Gateway (AWS)**: Ponto de entrada único para o sistema
2. **Lambda de Validação de Emails**: Valida sintaxe e registros DNS dos emails
3. **Lambda de Envio de Emails**: Processa e envia emails via Amazon SES
4. **SQS Queues**: Filas para processamento assíncrono e resiliência
5. **DynamoDB**: Armazenamento de jobs e histórico de emails

## Tecnologias Utilizadas

- Node.js com TypeScript
- Serverless Framework
- AWS Lambda, API Gateway, SQS, DynamoDB e SES
- Nodemailer para envio de emails

## Requisitos

- Node.js v16+
- AWS CLI configurado com credenciais apropriadas
- Serverless Framework CLI

## Configuração

### Instalação de dependências

```bash
npm install
```

### Variáveis de ambiente

Crie um arquivo `.env.local` para desenvolvimento local:

```
STAGE=dev
DEFAULT_FROM_EMAIL=seu-email@example.com
```

## Executando o Projeto

### Desenvolvimento Local

```bash
npm run dev
```

Isto inicia o Serverless Offline que emula AWS Lambda e API Gateway localmente.

### Deploy na AWS

```bash
npx serverless deploy --stage dev
```

Ou para ambiente de produção:

```bash
npx serverless deploy --stage prod
```

## Endpoints da API

### Enviar Email
```
POST /api/email/send
```
Payload:
```json
{
  "to": "destinatario@example.com",
  "subject": "Assunto do Email",
  "body": "Conteúdo do email em texto",
  "html": "<p>Conteúdo do email em HTML</p>",
  "from": "remetente@example.com",
  "attachments": [
    {
      "filename": "arquivo.pdf",
      "content": "base64..."
    }
  ]
}
```

### Verificar Status de Envio
```
GET /api/email/status/:jobId
```

### Validar Email
```
POST /api/email/validate-email
```
Payload:
```json
{
  "email": "email@example.com"
}
```

## Escalabilidade

O sistema serverless escala automaticamente com a carga:

1. **Lambda**: Escala automaticamente com o número de requisições
2. **SQS**: Gerencia filas de trabalho com retry automático
3. **DynamoDB**: Banco de dados NoSQL altamente escalável
4. **SES**: Serviço de email gerenciado com alta entregabilidade

## Descentralização

A arquitetura serverless permite descentralização natural:

1. **Multi-região**: Deploy em várias regiões AWS para resiliência global
2. **Failover automático**: As funções Lambda podem ser redirecionadas entre regiões
3. **Processamento distribuído**: Cada solicitação é processada independentemente
