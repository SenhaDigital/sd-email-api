import { SQSHandler } from 'aws-lambda';
import { SQS } from '@aws-sdk/client-sqs';
import logger from '../utils/logger';
import mongoUtils from '../utils/mongodb';
import { validateEmails } from '../services/emailValidator';
import { EmailJob, EmailJobStatus } from '../models/email';

const sqs = new SQS({});
// Constrói a URL da fila a partir do nome e região
const region = process.env.REGION || 'sa-east-1';
const accountId = process.env.ACCOUNT_ID || '493765722411';
const queueName = process.env.SEND_EMAIL_QUEUE_NAME;
const SEND_EMAIL_QUEUE_URL = `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;

logger.info(`Construindo URL da fila de envio: ${SEND_EMAIL_QUEUE_URL}`);

/**
 * Handler para processar mensagens da fila de validação de emails
 */
export const handler: SQSHandler = async (event, context) => {
  try {
    // Processa cada mensagem da fila
    for (const record of event.Records) {
      const message = JSON.parse(record.body);
      const jobId = message.jobId;
      
      if (!jobId) {
        logger.error('JobId não encontrado na mensagem');
        continue;
      }
      
      logger.info(`Processando job de validação de email: ${jobId}`);
      
      try {
        // Busca o job no MongoDB
        const job = await mongoUtils.getItem(jobId) as EmailJob;
        
        if (!job) {
          logger.error(`Job não encontrado: ${jobId}`);
          continue;
        }
        
        // Atualiza status para VALIDATING
        await mongoUtils.updateItem(jobId, {
          status: EmailJobStatus.VALIDATING,
          updatedAt: new Date()
        });
        
        // Extrai os emails do campo 'to'
        const emailAddresses = Array.isArray(job.emailRequest.to) 
          ? job.emailRequest.to 
          : job.emailRequest.to.split(',').map(email => email.trim());
        
        // Valida os emails
        const validationResult = await validateEmails(emailAddresses);
        
        if (!validationResult.valid) {
          // Atualiza o status do job para VALIDATION_FAILED
          await mongoUtils.updateItem(jobId, {
            status: EmailJobStatus.VALIDATION_FAILED,
            updatedAt: new Date(),
            errorMessage: `Email inválido: ${validationResult.invalidEmails.join(', ')}`
          });
          
          logger.info(`Validação falhou para o job ${jobId}: Todos os emails são inválidos`);
          continue;
        }
        
        // Atualiza o job com os resultados da validação
        await mongoUtils.updateItem(jobId, {
          status: EmailJobStatus.VALIDATED,
          updatedAt: new Date(),
          validationResult: validationResult,
          'emailRequest.to': validationResult.validEmails.join(',')
        });
        
        logger.info(`Validação concluída com sucesso para o job ${jobId}`);
        
        // Envia para a fila de envio de email
        await sqs.sendMessage({
          QueueUrl: SEND_EMAIL_QUEUE_URL,
          MessageBody: JSON.stringify({
            jobId
          }),
          MessageAttributes: {
            jobType: {
              DataType: 'String',
              StringValue: 'email-send'
            }
          }
        });
        
        logger.info(`Job ${jobId} enviado para fila de envio`);
        
      } catch (error) {
        logger.error(`Erro ao processar job de validação ${jobId}: ${error.message}`);
        
        // Atualiza o job para estado de falha
        try {
          await mongoUtils.updateItem(jobId, {
            status: EmailJobStatus.VALIDATION_FAILED,
            updatedAt: new Date(),
            errorMessage: `Erro na validação: ${error.message}`
          });
        } catch (dbError) {
          logger.error(`Erro ao atualizar status do job ${jobId}: ${dbError.message}`);
        }
      }
    }
    
  } catch (error) {
    logger.error(`Erro ao processar mensagens da fila: ${error.message}`);
    throw error;
  }
};
