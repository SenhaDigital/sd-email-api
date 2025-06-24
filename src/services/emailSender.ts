import nodemailer, { Transporter } from 'nodemailer';
import logger from '../utils/logger';
import { EmailRequest, SendResult } from '../models/email';

/**
 * Cria um transportador de emails usando SMTP direto
 */
const createTransporter = (): Transporter => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
    }
  });
};

/**
 * Função para enviar um email usando SMTP direto
 * @param emailData - Dados do email a ser enviado
 * @returns Resultado do envio
 */
export async function sendEmail(emailData: EmailRequest): Promise<SendResult> {
  try {
    logger.info(`Enviando email para: ${emailData.to}`);
    
    // Cria o transportador
    const transporter = createTransporter();
    
    // Prepara o email
    const fromEmail = emailData.from || process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com';
    const fromName = emailData.fromName || 'SD Consulta';
    
    const mailOptions = {
      from: {
        name: fromName,
        address: fromEmail
      },
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.body || undefined,
      html: emailData.html || undefined,
      // Headers para melhorar o suporte a fotos de perfil
      headers: {
        'X-Entity-Ref-ID': `message-${Date.now()}`,
        'X-Gravatar-Email': fromEmail
      },
      attachments: emailData.attachments ? emailData.attachments.map(att => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType
      })) : []
    };
    
    // Envia o email
    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`Email enviado com sucesso: ${info.messageId}`);
    
    // Retorna informações sobre o envio
    return {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending,
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
