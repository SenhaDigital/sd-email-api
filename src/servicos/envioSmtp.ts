import nodemailer, { Transporter } from 'nodemailer';
import logger from '../utilitarios/logger';
import { ambiente } from '../config/ambiente';
import { SolicitacaoEmail, ResultadoEnvio } from '../tipos/email';

function criarTransporte(): Transporter {
  const smtp = ambiente.smtp;
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    },
    tls: {
      rejectUnauthorized: smtp.rejectUnauthorized
    }
  });
}

export async function enviarEmail(solicitacao: SolicitacaoEmail): Promise<ResultadoEnvio> {
  try {
    logger.info(`Enviando email para: ${solicitacao.to}`);

    const transporte = criarTransporte();

    const emailRemetente = ambiente.remetentePadrao;
    const nomeRemetente = solicitacao.fromName || ambiente.nomeRemetentePadrao;

    const info = await transporte.sendMail({
      from: {
        name: nomeRemetente,
        address: emailRemetente
      },
      to: solicitacao.to,
      subject: solicitacao.subject,
      text: solicitacao.body || undefined,
      html: solicitacao.html || undefined,
      headers: {
        'X-Entity-Ref-ID': `message-${Date.now()}`,
        'X-Gravatar-Email': emailRemetente
      },
      attachments: solicitacao.attachments ? solicitacao.attachments.map(anexo => ({
        filename: anexo.filename,
        content: Buffer.from(anexo.content, 'base64'),
        contentType: anexo.contentType
      })) : []
    });

    logger.info(`Email enviado com sucesso: ${info.messageId}`);

    return {
      messageId: info.messageId,
      accepted: info.accepted as string[],
      rejected: info.rejected as string[],
      pending: (info as any).pending,
      response: info.response,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Erro ao enviar email: ${error.message}`);

    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
