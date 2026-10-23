export const ambiente = {
  get stage() {
    return process.env.STAGE;
  },
  get ambiente() {
    return process.env.ENVIRONMENT;
  },
  get envioDireto() {
    return process.env.IS_OFFLINE === 'true' || process.env.IS_LOCAL === 'true' || process.env.STAGE === 'dev';
  },
  get chaveApi() {
    return process.env.API_SDSEND_KEY;
  },
  get regiao() {
    return process.env.REGION || 'sa-east-1';
  },
  get contaAws() {
    return process.env.ACCOUNT_ID || '493765722411';
  },
  get filaValidacao() {
    return process.env.EMAIL_QUEUE_NAME;
  },
  get filaEnvio() {
    return process.env.SEND_EMAIL_QUEUE_NAME;
  },
  get urlBanco() {
    return process.env.DATABASE_URL;
  },
  get colecaoEmails() {
    return process.env.EMAIL_COLLECTION || 'emails';
  },
  get nivelLog() {
    return process.env.LOG_LEVEL || 'info';
  },
  get remetentePadrao() {
    return process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com';
  },
  get smtp() {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
    };
  }
};
