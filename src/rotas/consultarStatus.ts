import logger from '../utilitarios/logger';
import { jobsEmail } from '../repositorios/jobsEmail';
import { respostaJson } from '../utilitarios/resposta';
import { JobEmail } from '../tipos/email';

export async function consultarStatus(jobId: string) {
  try {
    const job = await jobsEmail.buscar(jobId) as JobEmail;

    if (!job) {
      return respostaJson(404, {
        success: false,
        error: 'Job não encontrado'
      });
    }

    return respostaJson(200, {
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
    });
  } catch (error) {
    logger.error(`Erro ao obter status do job: ${error.message}`);

    return respostaJson(500, {
      success: false,
      error: 'Erro ao obter status do job',
      message: error.message
    });
  }
}
