<div align="center">
  <h1>🚀 SDsend - API de Email Descentralizada</h1>
  <p>API escalável e segura para envio de emails com arquitetura serverless</p>
  
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
  [![Serverless](https://img.shields.io/badge/Serverless-Framework-FD5750?logo=serverless&logoColor=white)](https://www.serverless.com/)
  [![AWS](https://img.shields.io/badge/AWS-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
</div>

## 📋 Visão Geral

O SDsend é uma solução robusta para envio de emails em larga escala, projetada com arquitetura serverless para garantir alta disponibilidade e escalabilidade. A API oferece endpoints para envio de emails com suporte a templates, anexos e rastreamento de status.

### ✨ Principais Recursos

- ✅ **Envio de emails** com suporte a HTML e texto simples
- 🔄 **Processamento assíncrono** com filas SQS
- 🔒 **Autenticação segura** via chave de API
- 📊 **Rastreamento de status** em tempo real
- 📦 **Suporte a anexos**
- 🚀 **Alta disponibilidade** com arquitetura serverless
- 🔍 **Logs detalhados** para monitoramento

## 🛠 Tecnologias

- **Backend**: Node.js com TypeScript
- **Infraestrutura**: AWS (Lambda, API Gateway, SQS)
- **Banco de Dados**: MongoDB Atlas
- **Email**: Nodemailer com SMTP
- **Autenticação**: API Key
- **Monitoramento**: CloudWatch Logs

## 🚀 Como Começar

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta na AWS com permissões apropriadas
- MongoDB Atlas (para produção) ou MongoDB local
- Servidor SMTP para envio de emails

### Instalação

1. **Clone o repositório**
   ```bash
   git clone https://github.com/seu-usuario/sd-email-api.git
   cd sd-email-api
   ```

2. **Instale as dependências**
   ```bash
   npm install
   # ou
   yarn
   ```

3. **Configure as variáveis de ambiente**
   - Copie o arquivo de exemplo de ambiente:
     ```bash
     cp env.example.yml env.dev.yml
     ```
   - Edite o arquivo `env.dev.yml` com suas configurações locais

4. **Inicie o ambiente de desenvolvimento**
   ```bash
   npm run dev
   ```

## 📚 Documentação da API

A documentação completa da API está disponível em [DOCS.md](./docs/DOCS.md).

### Endpoints Principais

- `POST /api/email/send` - Envia um novo email
- `POST /api/email/validate-email` - Valida um endereço de email
- `GET /api/email/status/:jobId` - Verifica o status de um job de email

## 🔒 Autenticação

Todas as requisições devem incluir o header de autorização:

```
Authorization: Bearer sua-chave-api
```

## 🌐 Ambientes

- **Desenvolvimento**: `dev` - http://localhost:3000
- **Homologação**: `staging` - https://stg-api.sdconsulta.com.br
- **Produção**: `prod` - https://api.sdconsulta.com.br

## 🤝 Contribuição

Contribuições são bem-vindas! Siga estes passos:

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/NovaFeature`)
3. Adicione suas mudanças (`git add .`)
4. Comite suas mudanças (`git commit -m 'Adiciona nova feature'`)
5. Faça o Push da Branch (`git push origin feature/NovaFeature`)
6. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

Para suporte, entre em contato:
- Email: suporte@sdconsulta.com.br
- Telefone: +55 (11) 99999-9999

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
