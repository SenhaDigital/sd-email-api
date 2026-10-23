export interface AnexoEmail {
  filename: string;
  content: string;
  contentType?: string;
}

export interface SolicitacaoEmail {
  to: string;
  subject: string;
  body?: string;
  html?: string;
  from?: string;
  fromName?: string;
  attachments?: AnexoEmail[];
}

export interface JobEmail {
  id: string;
  status: StatusJobEmail;
  emailRequest: SolicitacaoEmail;
  validationResult?: ResultadoValidacao;
  sendResult?: ResultadoEnvio;
  createdAt: string;
  updatedAt: string;
  attempts: number;
}

export enum StatusJobEmail {
  PENDENTE = 'PENDING',
  VALIDANDO = 'VALIDATING',
  VALIDACAO_FALHOU = 'VALIDATION_FAILED',
  VALIDADO = 'VALIDATED',
  ENVIANDO = 'SENDING',
  ENVIADO = 'SENT',
  FALHOU = 'FAILED'
}

export interface ResultadoValidacao {
  valid: boolean;
  reason?: string;
  validEmails?: string[];
  invalidEmails?: Array<{
    email: string;
    reason: string;
  }>;
}

export interface ResultadoEnvio {
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  pending?: string[];
  response?: string;
  error?: string;
  timestamp?: string;
}
