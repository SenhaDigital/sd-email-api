export interface EmailAttachment {
  filename: string;
  content: string;  // Base64 encoded content
  contentType?: string;
}

export interface EmailRequest {
  to: string;
  subject: string;
  body?: string;
  html?: string;
  from?: string;
  fromName?: string;  // Nome do remetente para exibição
  attachments?: EmailAttachment[];
}

export interface EmailJob {
  id: string;
  status: EmailJobStatus;
  emailRequest: EmailRequest;
  validationResult?: ValidationResult;
  sendResult?: SendResult;
  createdAt: string;
  updatedAt: string;
  attempts: number;
}

export enum EmailJobStatus {
  PENDING = 'PENDING',
  VALIDATING = 'VALIDATING',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATED = 'VALIDATED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED'
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  validEmails?: string[];
  invalidEmails?: Array<{
    email: string;
    reason: string;
  }>;
}

export interface SendResult {
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  pending?: string[];
  response?: string;
  error?: string;
  timestamp?: string;
}
