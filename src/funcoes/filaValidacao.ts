import { SQSHandler } from 'aws-lambda';
import logger from '../utilitarios/logger';
import { ambiente } from '../config/ambiente';
import { jobsEmail } from '../repositorios/jobsEmail';
import { validarEmails } from '../servicos/validacaoEmail';
import { publicarJob, urlDaFila } from '../servicos/fila';
import { JobEmail, StatusJobEmail } from '../tipos/email';

const urlFilaEnvio = urlDaFila(ambiente.filaEnvio);

logger.info(`Construindo URL da fila de envio: ${urlFilaEnvio}`);

function destinatarios(job: JobEmail): string[] {
  const to: any = job.emailRequest.to;
  return Array.isArray(to) ? to : to.split(',').map((email: string) => email.trim());
}

async function validarJob(jobId: string) {
  logger.info(`Processando job de validação de email: ${jobId}`);

  try {
    const job = await jobsEmail.buscar(jobId) as JobEmail;

    if (!job) {
      logger.error(`Job não encontrado: ${jobId}`);
      return;
    }

    await jobsEmail.atualizar(jobId, {
      status: StatusJobEmail.VALIDANDO,
      updatedAt: new Date()
    });

    const resultado = await validarEmails(destinatarios(job));

    if (!resultado.valid) {
      await jobsEmail.atualizar(jobId, {
        status: StatusJobEmail.VALIDACAO_FALHOU,
        updatedAt: new Date(),
        errorMessage: `Email inválido: ${resultado.invalidEmails.join(', ')}`
      });

      logger.info(`Validação falhou para o job ${jobId}: Todos os emails são inválidos`);
      return;
    }

    await jobsEmail.atualizar(jobId, {
      status: StatusJobEmail.VALIDADO,
      updatedAt: new Date(),
      validationResult: resultado,
      'emailRequest.to': resultado.validEmails.join(',')
    });

    logger.info(`Validação concluída com sucesso para o job ${jobId}`);

    await publicarJob(urlFilaEnvio, jobId, 'email-send');

    logger.info(`Job ${jobId} enviado para fila de envio`);
  } catch (error) {
    logger.error(`Erro ao processar job de validação ${jobId}: ${error.message}`);

    try {
      await jobsEmail.atualizar(jobId, {
        status: StatusJobEmail.VALIDACAO_FALHOU,
        updatedAt: new Date(),
        errorMessage: `Erro na validação: ${error.message}`
      });
    } catch (erroBanco) {
      logger.error(`Erro ao atualizar status do job ${jobId}: ${erroBanco.message}`);
    }
  }
}

export const handler: SQSHandler = async (event) => {
  try {
    for (const registro of event.Records) {
      const { jobId } = JSON.parse(registro.body);

      if (!jobId) {
        logger.error('JobId não encontrado na mensagem');
        continue;
      }

      await validarJob(jobId);
    }
  } catch (error) {
    logger.error(`Erro ao processar mensagens da fila: ${error.message}`);
    throw error;
  }
};
