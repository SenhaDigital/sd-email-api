import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SQS } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';
import { validateEmail } from '../services/emailValidator';
import logger from '../utils/logger';
import mongoUtils from '../utils/mongodb';
import { EmailJob, EmailJobStatus, EmailRequest } from '../models/email';
import { withApiKeyAuth } from '../middleware/auth';

const sqs = new SQS({});
// Constrói a URL da fila a partir do nome e região
const region = process.env.REGION || 'sa-east-1';
const accountId = process.env.ACCOUNT_ID || '493765722411';
const queueName = process.env.EMAIL_QUEUE_NAME;
const EMAIL_QUEUE_URL = `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;

logger.info(`Construindo URL da fila SQS: ${EMAIL_QUEUE_URL}`);

const swaggerYamlPath = join(process.cwd(), 'docs', 'openapi.yml');
let cachedSwaggerSpec: string | null = null;

const getSwaggerSpec = (): string => {
  if (cachedSwaggerSpec) {
    return cachedSwaggerSpec;
  }

  try {
    cachedSwaggerSpec = readFileSync(swaggerYamlPath, 'utf-8');
    return cachedSwaggerSpec;
  } catch (error) {
    logger.error('Erro ao carregar arquivo Swagger', { error: (error as Error).message });
    throw error;
  }
};

const swaggerHtml = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>SD Email API - Swagger</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin="anonymous"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function () {
        window.ui = SwaggerUIBundle({
          url: './swagger.yaml',
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.apis],
          layout: 'BaseLayout'
        });
      });
    </script>
  </body>
</html>`;

/**
 * Handler principal para os endpoints da API
 */
// Handler interno sem autenticação
const internalHandler = async (event: APIGatewayProxyEvent) => {
  try {
    logger.info({
      message: 'Requisição recebida',
      path: event.path,
      method: event.httpMethod
    });

    // Normaliza o path removendo o prefixo /api ou /sdsend
    const normalizedPath = event.path.replace(/^\/(api|sdsend)/, '');

    // Documentação Swagger (UI)
    if (normalizedPath === '/email/swagger' && event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        },
        body: swaggerHtml
      };
    }

    // Documento Swagger (YAML)
    if (normalizedPath === '/email/swagger.yaml' && event.httpMethod === 'GET') {
      try {
        const swaggerSpec = getSwaggerSpec();
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/yaml; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          },
          body: swaggerSpec
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Erro ao carregar documentação',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
          })
        };
      }
    }

    // Endpoint de envio de email
    if (normalizedPath === '/email/send' && event.httpMethod === 'POST') {
      return await handleSendEmail(event);
    }
    
    // Endpoint de validação de email
    if (normalizedPath === '/email/validate-email' && event.httpMethod === 'POST') {
      return await handleValidateEmail(event);
    }
    
    // Endpoint de status do job
    if (normalizedPath && normalizedPath.startsWith('/email/status/') && event.httpMethod === 'GET') {
      const jobId = event.pathParameters?.jobId;
      if (jobId) {
        return await handleGetJobStatus(jobId);
      }
    }
    
    // Rota não encontrada
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        success: false,
        error: 'Rota não encontrada'
      })
    };
    
  } catch (error) {
    logger.error({
      message: 'Erro ao processar requisição',
      error: error.message,
      stack: error.stack
    });
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      })
    };
  }
};

/**
 * Processa o envio de email
 */
async function handleSendEmail(event: any) {
  try {
    const body = JSON.parse(event.body || '{}');
    const { to, subject, body: emailBody, html, from, attachments } = body;
    
    // Validação básica
    if (!to || !subject || (!emailBody && !html)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Campos obrigatórios: to, subject, e body ou html'
        })
      };
    }
    
    // Cria ID único para o job
    const jobId = uuidv4();
    
    // Cria o objeto de requisição de email
    const emailRequest: EmailRequest = {
      to,
      subject,
      body: emailBody,
      html,
      from,
      attachments
    };
    
    // Cria o job de email
    const emailJob: EmailJob = {
      id: jobId,
      status: EmailJobStatus.PENDING,
      emailRequest,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: 0
    };
    
    // Salva o job no MongoDB
    await mongoUtils.putItem(emailJob);
    
    // Verifica se estamos em ambiente de desenvolvimento local
    const isLocalDev = process.env.IS_OFFLINE === 'true' || process.env.IS_LOCAL === 'true' || process.env.STAGE === 'dev';
    
    // LOGS ADICIONAIS PARA DIAGNÓSTICO
    logger.info(`ENV: ${process.env.ENVIRONMENT}, STAGE: ${process.env.STAGE}`);
    logger.info(`EMAIL_QUEUE_NAME: ${process.env.EMAIL_QUEUE_NAME}`);
    logger.info(`EMAIL_QUEUE_URL: ${EMAIL_QUEUE_URL}`);
    logger.info(`isLocalDev: ${isLocalDev}`);
    
    try {
      if (isLocalDev) {
        logger.info(`Ambiente local detectado - executando envio de email diretamente sem SQS`);
        // Em ambiente local, processar diretamente
        
        // 1. Marca como validado
        emailJob.status = EmailJobStatus.VALIDATED;
        await mongoUtils.updateItem(jobId, {
          status: EmailJobStatus.VALIDATED,
          updatedAt: new Date()
        });
        
        // 2. Importa a função de envio e envia o email diretamente
        const { sendEmail } = require('../services/emailSender');
        
        // 3. Atualiza status para enviando
        await mongoUtils.updateItem(jobId, {
          status: EmailJobStatus.SENDING,
          updatedAt: new Date()
          // O field attempts é incrementado automaticamente pelo mongoUtils.updateItem
        });
        
        // 4. Envia o email
        logger.info(`Enviando email diretamente para ${emailRequest.to}`);
        const sendResult = await sendEmail(emailRequest);
        
        // 5. Determina o status final e atualiza o job
        const finalStatus = !sendResult.error ? EmailJobStatus.SENT : EmailJobStatus.FAILED;
        await mongoUtils.updateItem(jobId, {
          status: finalStatus,
          sendResult: sendResult,
          updatedAt: new Date()
        });
        
        logger.info(`Email processado localmente com status final: ${finalStatus}`);
      } else {
        // Envia o job para a fila SQS em ambiente de produção
        logger.info(`Ambiente de produção detectado - enviando para fila SQS: ${EMAIL_QUEUE_URL}`);
        
        await sqs.sendMessage({
          QueueUrl: EMAIL_QUEUE_URL,
          MessageBody: JSON.stringify({
            jobId
          }),
          MessageAttributes: {
            jobType: {
              DataType: 'String',
              StringValue: 'email-validation'
            }
          }
        });
        
        logger.info(`Mensagem enviada com sucesso para a fila SQS`);
      }
    } catch (error) {
      logger.warn(`Erro ao enviar mensagem para fila ou processar localmente: ${error.message}`);
      // Continua a execução mesmo com erro na fila
    }
    
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        success: true,
        message: 'Email enviado para processamento',
        jobId
      })
    };
  } catch (error) {
    logger.error(`Erro ao processar envio de email: ${error.message}`);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Erro ao processar envio de email',
        message: error.message
      })
    };
  }
}

/**
 * Processa a validação direta de um email
 */
async function handleValidateEmail(event: any) {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email } = body;
    
    if (!email) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Campo obrigatório: email'
        })
      };
    }
    
    const validationResult = await validateEmail(email);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        email,
        ...validationResult
      })
    };
  } catch (error) {
    logger.error('Erro ao processar requisição', { error });
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    };
  }
};

// Exporta o handler com autenticação
export const handler = withApiKeyAuth(internalHandler);

/**
 * Obtém o status de um job
 */
async function handleGetJobStatus(jobId: string) {
  try {
    // Busca o job no MongoDB
    const job = await mongoUtils.getItem(jobId) as EmailJob;
    
    if (!job) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Job não encontrado'
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        job: {
          id: job.id,
          status: job.status,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          attempts: job.attempts,
          validationResult: job.validationResult,
          sendResult: job.sendResult
        }
      })
    };
  } catch (error) {
    logger.error(`Erro ao obter status do job: ${error.message}`);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Erro ao obter status do job',
        message: error.message
      })
    };
  }
}
