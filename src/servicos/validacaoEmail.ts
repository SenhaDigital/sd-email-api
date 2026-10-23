import validator from 'email-validator';
import dns from 'dns';
import { promisify } from 'util';
import logger from '../utilitarios/logger';
import { ResultadoValidacao } from '../tipos/email';

const resolverMxUmaVez = promisify(dns.resolveMx);

const ERROS_DNS_TRANSITORIOS = ['ETIMEOUT', 'ESERVFAIL', 'ECONNREFUSED', 'ECONNRESET', 'EAI_AGAIN'];
const TENTATIVAS_DNS = 3;

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function resolverMx(dominio: string) {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await resolverMxUmaVez(dominio);
    } catch (error) {
      if (tentativa >= TENTATIVAS_DNS || !ERROS_DNS_TRANSITORIOS.includes(error.code)) throw error;
      logger.warn(`Falha temporária de DNS para ${dominio} (tentativa ${tentativa}): ${error.code}`);
      await esperar(100 * tentativa);
    }
  }
}

const dominiosDescartaveis = [
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'mailinator.com',
  'throwawaymail.com'
];

export async function validarEmail(email: string): Promise<ResultadoValidacao> {
  try {
    if (!validator.validate(email)) {
      return {
        valid: false,
        reason: 'Sintaxe de email inválida'
      };
    }

    const dominio = email.split('@')[1];

    if (dominiosDescartaveis.includes(dominio)) {
      return {
        valid: false,
        reason: 'Domínio de email descartável'
      };
    }

    try {
      const registrosMx = await resolverMx(dominio);

      if (!registrosMx || registrosMx.length === 0) {
        return {
          valid: false,
          reason: 'Domínio não possui registros MX válidos'
        };
      }

      return {
        valid: true
      };
    } catch (error) {
      logger.error(`Erro ao verificar registros MX para ${dominio}: ${error.message}`);

      return {
        valid: false,
        reason: 'Não foi possível verificar os registros MX do domínio'
      };
    }
  } catch (error) {
    logger.error(`Erro ao validar email: ${error.message}`);
    throw new Error(`Erro ao validar email: ${error.message}`);
  }
}

export async function validarEmails(emails: string[]): Promise<ResultadoValidacao> {
  const validEmails: string[] = [];
  const invalidEmails: Array<{ email: string; reason: string }> = [];

  for (const email of emails) {
    const resultado = await validarEmail(email);

    if (resultado.valid) {
      validEmails.push(email);
    } else {
      invalidEmails.push({
        email,
        reason: resultado.reason || 'Razão desconhecida'
      });
    }
  }

  return {
    valid: validEmails.length > 0,
    validEmails,
    invalidEmails,
    reason: validEmails.length === 0 ? 'Todos os emails são inválidos' : undefined
  };
}
