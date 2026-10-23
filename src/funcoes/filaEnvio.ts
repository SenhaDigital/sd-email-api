import { SQSHandler } from 'aws-lambda';
import logger from '../utilitarios/logger';
import { jobsEmail } from '../repositorios/jobsEmail';
import { enviarEmail } from '../servicos/envioSmtp';
import { JobEmail, StatusJobEmail } from '../tipos/email';

async function enviarJob(jobId: string) {
  logger.info(`Processando job de envio de email: ${jobId}`);

  let falhaSmtp: string | undefined;

  try {
    const job = await jobsEmail.buscar(jobId) as JobEmail;

    if (!job) {
      logger.error(`Job não encontrado: ${jobId}`);
      return;
    }

    if (job.status === StatusJobEmail.ENVIADO) {
      logger.info(`Job ${jobId} já foi processado com sucesso`);
      return;
    }

    await jobsEmail.registrarTentativa(jobId, {
      status: StatusJobEmail.ENVIANDO,
      updatedAt: new Date()
    });

    const resultado = await enviarEmail(job.emailRequest);

    const statusFinal = !resultado.error ? StatusJobEmail.ENVIADO : StatusJobEmail.FALHOU;

    await jobsEmail.atualizar(jobId, {
      status: statusFinal,
      sendResult: resultado,
      updatedAt: new Date()
    });

    logger.info(`Processamento concluído para o job ${jobId} com status ${statusFinal}`);

    if (resultado.error) {
      falhaSmtp = resultado.error;
    }
  } catch (error) {
    logger.error(`Erro ao processar job de envio ${jobId}: ${error.message}`);

    try {
      await jobsEmail.atualizar(jobId, {
        status: StatusJobEmail.FALHOU,
        updatedAt: new Date()
      });
    } catch (erroBanco) {
      logger.error(`Erro ao atualizar status do job ${jobId}: ${erroBanco.message}`);
    }
  }

  if (falhaSmtp) {
    throw new Error(`Falha no envio SMTP do job ${jobId}: ${falhaSmtp}`);
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

      await enviarJob(jobId);
    }
  } catch (error) {
    logger.error(`Erro ao processar mensagens da fila: ${error.message}`);
    throw error;
  }
};
