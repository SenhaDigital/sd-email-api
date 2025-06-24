# Arquitetura da API Serverless de Email Descentralizada

## Visão Geral

Esta API implementa um serviço descentralizado de envio de emails usando arquitetura serverless na AWS. O sistema foi projetado para ser:

- **Escalável**: Escala automaticamente conforme a demanda
- **Resiliente**: Tolerância a falhas com retentativas automáticas
- **Descentralizado**: Processamento distribuído com componentes independentes
- **Gerenciável**: Mínima manutenção de infraestrutura (sem servidores)

## Componentes da Arquitetura

![Arquitetura](https://mermaid.ink/img/pako:eNqNksFuwjAMhl_FymmT4AGyoSGxjcMKJ3rYaSqhaTEkaoloAkOId19SAVVj07ZTnPj72_-vdA_jNAcY-XyTO0WCSUyhgTVhIaReQIOQlYgJdIOcGTJ2CyXpVnFanAIMRtAoTix4-MdxynCG_CzEjBVZKXVf1YpU6Rn6jiyuUEitPJvdvS2S5cfiMY7m63g5jV-fJk-TKML-9WaXn42Adij1EsGl53nBN6f1F2UlhTE3GfkaJAbadFRXWpfP-Z7JDdCKu3Jx2KA-yVd2Z-13zOUOHfaDbrgy3d0bdp9P4zHpgkdDVLtQnQz--xwudvWrbsinO_NDZVrwJ9Dwnoc7VF7U7ud0JpC1c5lcF9vMEftToExQWKbiV4SGuxBCXFUHqFN_R2pcgvVxTbKwu3yWPNQbdTrXHw)

### 1. API Gateway (AWS API Gateway)

Funciona como ponto de entrada para a API, processando todas as requisições HTTP. Integra-se diretamente com as funções Lambda.

**Endpoints:**
- `POST /api/email/send` - Envio de emails
- `GET /api/email/status/{jobId}` - Consulta de status de job
- `POST /api/email/validate-email` - Validação de emails

### 2. Processamento de API (Lambda Function)

Função Lambda que processa as requisições da API Gateway:
- Valida payload da requisição
- Cria jobs no DynamoDB
- Envia mensagens para filas SQS
- Responde requisições de status

### 3. Filas de Processamento (SQS)

Duas filas SQS para processamento assíncrono:
- **Fila de Validação**: Para validação de emails
- **Fila de Envio**: Para envio de emails

Benefícios:
- Desacoplamento de componentes
- Buffering em caso de picos de demanda
- Retentativas automáticas
- Processamento ordenado quando necessário

### 4. Validador de Email (Lambda Function)

Função Lambda acionada pela fila de validação:
- Valida sintaxe dos emails
- Verifica registros MX de domínios
- Identifica domínios descartáveis
- Atualiza o status no DynamoDB

### 5. Emissor de Email (Lambda Function)

Função Lambda acionada pela fila de envio:
- Busca dados do job no DynamoDB
- Envia email usando Amazon SES
- Atualiza o status final do job

### 6. Armazenamento de Estado (DynamoDB)

Banco de dados NoSQL para armazenar:
- Jobs de email e seus estados
- Resultados de validação
- Resultados de envio
- Histórico para auditoria

### 7. Serviço de Email (Amazon SES)

Serviço gerenciado de email da AWS:
- Alta entregabilidade
- Métricas de entrega
- Gerenciamento de bounces e complaints
- Reputação de domínio gerenciada

## Fluxo de Processamento

1. Cliente envia requisição para API Gateway
2. Função Lambda API valida a requisição e cria job no DynamoDB (status: PENDING)
3. Mensagem é enviada para fila de validação
4. Função Lambda Validador processa a mensagem:
   - Atualiza job para status VALIDATING
   - Executa validações de email
   - Se válido, atualiza para VALIDATED e envia para fila de envio
   - Se inválido, marca como VALIDATION_FAILED
5. Função Lambda Emissor processa a mensagem:
   - Atualiza job para status SENDING
   - Envia email via SES
   - Atualiza status final (SENT ou FAILED)
6. Cliente pode consultar o status do job a qualquer momento

## Vantagens da Arquitetura Descentralizada Serverless

### Escalabilidade
- Funções Lambda escalam automaticamente
- SQS absorve picos de demanda
- DynamoDB escala sob demanda

### Resiliência
- Filas SQS com retry automático
- Sem ponto único de falha
- Multi-AZ por padrão

### Descentralização
- Componentes independentes
- Possibilidade de deploy multi-região
- Processamento distribuído

### Custo
- Pagamento por uso (sem servidor ocioso)
- Escalonamento preciso baseado em demanda
- Sem custo de manutenção de infraestrutura

### Observabilidade
- CloudWatch Logs e Metrics integrados
- X-Ray para trace distribuído
- Alertas de falhas configuráveis

## Considerações de Segurança

- IAM Roles com menor privilégio possível
- Criptografia em trânsito e em repouso
- Autenticação via API Key ou Cognito (opcional)
- Validação de inputs
- Proteção contra DDoS via API Gateway

## Estratégias de Multi-Região

Para maior resiliência global, pode-se implementar:

1. **Deploy Redundante**: Duplicar toda a infraestrutura em regiões diferentes
2. **Roteamento Global**: Usar Route 53 com health checks para failover
3. **Replicação de Dados**: Utilizar DynamoDB Global Tables
4. **Filas Cross-Region**: SQS com redirecionamento entre regiões
