import { APIGatewayProxyEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utilitarios/logger';
import { ambiente } from '../config/ambiente';
import { jobsEmail } from '../repositorios/jobsEmail';
import { enviarEmail } from '../servicos/envioSmtp';
import { publicarJob, urlDaFila } from '../servicos/fila';
import { respostaJson } from '../utilitarios/resposta';
import { JobEmail, SolicitacaoEmail, StatusJobEmail } from '../tipos/email';

const urlFilaValidacao = urlDaFila(ambiente.filaValidacao);

logger.info(`Construindo URL da fila SQS: ${urlFilaValidacao}`);

function limparNomeRemetente(valor: unknown): string | undefined {
  if (typeof valor !== 'string') return undefined;
  const nome = valor.replace(/[\r\n]+/g, ' ').trim().slice(0, 100);
  return nome || undefined;
}

async function processarSemFila(jobId: string, solicitacao: SolicitacaoEmail) {
  logger.info('Ambiente local detectado - executando envio de email diretamente sem SQS');

  await jobsEmail.atualizar(jobId, {
    status: StatusJobEmail.VALIDADO,
    updatedAt: new Date()
  });

  await jobsEmail.registrarTentativa(jobId, {
    status: StatusJobEmail.ENVIANDO,
    updatedAt: new Date()
  });

  logger.info(`Enviando email diretamente para ${solicitacao.to}`);
  const resultado = await enviarEmail(solicitacao);

  const statusFinal = !resultado.error ? StatusJobEmail.ENVIADO : StatusJobEmail.FALHOU;
  await jobsEmail.atualizar(jobId, {
    status: statusFinal,
    sendResult: resultado,
    updatedAt: new Date()
  });

  logger.info(`Email processado localmente com status final: ${statusFinal}`);
}

async function publicarNaFila(jobId: string) {
  logger.info(`Ambiente de produção detectado - enviando para fila SQS: ${urlFilaValidacao}`);
  await publicarJob(urlFilaValidacao, jobId, 'email-validation');
  logger.info('Mensagem enviada com sucesso para a fila SQS');
}

export async function enviar(event: APIGatewayProxyEvent) {
  try {
    const { to, subject, body, html, fromName, attachments } = JSON.parse(event.body || '{}');

    if (!to || !subject || (!body && !html)) {
      return respostaJson(400, {
        success: false,
        error: 'Campos obrigatórios: to, subject, e body ou html'
      });
    }

    const jobId = uuidv4();
    const solicitacao: SolicitacaoEmail = {
      to,
      subject,
      body,
      html,
      fromName: limparNomeRemetente(fromName),
      attachments
    };

    const job: JobEmail = {
      id: jobId,
      status: StatusJobEmail.PENDENTE,
      emailRequest: solicitacao,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: 0
    };

    await jobsEmail.criar(job);

    const envioDireto = ambiente.envioDireto;

    logger.info(`ENV: ${ambiente.ambiente}, STAGE: ${ambiente.stage}`);
    logger.info(`EMAIL_QUEUE_NAME: ${ambiente.filaValidacao}`);
    logger.info(`EMAIL_QUEUE_URL: ${urlFilaValidacao}`);
    logger.info(`isLocalDev: ${envioDireto}`);

    try {
      if (envioDireto) {
        await processarSemFila(jobId, solicitacao);
      } else {
        await publicarNaFila(jobId);
      }
    } catch (error) {
      logger.warn(`Erro ao enviar mensagem para fila ou processar localmente: ${error.message}`);
    }

    return respostaJson(
      201,
      {
        success: true,
        message: 'Email enviado para processamento',
        jobId
      },
      { credenciais: true }
    );
  } catch (error) {
    logger.error(`Erro ao processar envio de email: ${error.message}`);

    return respostaJson(500, {
      success: false,
      error: 'Erro ao processar envio de email',
      message: error.message
    });
  }
}
