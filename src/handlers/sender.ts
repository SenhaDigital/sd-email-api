import { SQSHandler } from 'aws-lambda';
import logger from '../utils/logger';
import mongoUtils from '../utils/mongodb';
import { sendEmail } from '../services/emailSender';
import { EmailJob, EmailJobStatus } from '../models/email';

/**
 * Handler para processar mensagens da fila de envio de emails
 */
export const handler: SQSHandler = async (event, context) => {
  try {
    // Processa cada mensagem da filaa
    for (const record of event.Records) {
      const message = JSON.parse(record.body);
      const jobId = message.jobId;
      
      if (!jobId) {
        logger.error('JobId não encontrado na mensagem');
        continue;
      }
      
      logger.info(`Processando job de envio de email: ${jobId}`);
      
      try {
        // Busca o job no MongoDB
        const job = await mongoUtils.getItem(jobId) as EmailJob;
        
        if (!job) {
          logger.error(`Job não encontrado: ${jobId}`);
          continue;
        }
        
        // Verifica se o job já foi processado com sucesso
        if (job.status === EmailJobStatus.SENT) {
          logger.info(`Job ${jobId} já foi processado com sucesso`);
          continue;
        }
        
        // Atualiza status para SENDING
        await mongoUtils.updateItem(jobId, {
          status: EmailJobStatus.SENDING,
          updatedAt: new Date(),
          $inc: { attempts: 1 }
        });
        
        // Envia o email
        const sendResult = await sendEmail(job.emailRequest);
        
        // Determina o status final com base no resultado
        const finalStatus = !sendResult.error ? EmailJobStatus.SENT : EmailJobStatus.FAILED;
        
        // Atualiza o job com os resultados do envio
        await mongoUtils.updateItem(jobId, {
          status: finalStatus,
          sendResult: sendResult,
          updatedAt: new Date()
        });
        
        logger.info(`Processamento concluído para o job ${jobId} com status ${finalStatus}`);
        
      } catch (error) {
        logger.error(`Erro ao processar job de envio ${jobId}: ${error.message}`);
        
        // Atualiza o job para estado de falha
        try {
          await mongoUtils.updateItem(jobId, {
            status: EmailJobStatus.FAILED,
            updatedAt: new Date()
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
