import validator from 'email-validator';
import dns from 'dns';
import { promisify } from 'util';
import logger from '../utils/logger';
import { ValidationResult } from '../models/email';

// Promisify DNS functions
const resolveMx = promisify(dns.resolveMx);

/**
 * Lista de domínios descartáveis conhecidos
 */
const disposableDomains = [
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'mailinator.com',
  'throwawaymail.com',
  // Adicione mais conforme necessário
];

/**
 * Valida um endereço de email
 * @param email - Endereço de email a ser validado
 * @returns Resultado da validação
 */
export async function validateEmail(email: string): Promise<ValidationResult> {
  try {
    // Verifica sintaxe
    const isValidSyntax = validator.validate(email);
    
    if (!isValidSyntax) {
      return {
        valid: false,
        reason: 'Sintaxe de email inválida'
      };
    }
    
    // Obtém o domínio
    const domain = email.split('@')[1];
    
    // Verifica se é um domínio descartável
    const isDisposable = disposableDomains.includes(domain);
    
    if (isDisposable) {
      return {
        valid: false,
        reason: 'Domínio de email descartável'
      };
    }
    
    // Verifica registros MX
    try {
      const mxRecords = await resolveMx(domain);
      
      if (!mxRecords || mxRecords.length === 0) {
        return {
          valid: false,
          reason: 'Domínio não possui registros MX válidos'
        };
      }
      
      // Email válido
      return {
        valid: true
      };
      
    } catch (error) {
      logger.error(`Erro ao verificar registros MX para ${domain}: ${error.message}`);
      
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

/**
 * Valida uma lista de endereços de email
 */
export async function validateEmails(emails: string[]): Promise<ValidationResult> {
  const validEmails: string[] = [];
  const invalidEmails: Array<{ email: string; reason: string }> = [];
  
  for (const email of emails) {
    const result = await validateEmail(email);
    
    if (result.valid) {
      validEmails.push(email);
    } else {
      invalidEmails.push({
        email,
        reason: result.reason || 'Razão desconhecida'
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
