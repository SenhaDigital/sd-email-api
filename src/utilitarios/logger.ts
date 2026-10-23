import winston from 'winston';
import { ambiente } from '../config/ambiente';

const padraoEmail = /([A-Za-z0-9._%+-]{1,2})[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

export function mascararEmails<T>(valor: T): T {
  if (typeof valor === 'string') {
    return valor.replace(padraoEmail, '$1***@$2') as T;
  }

  if (Array.isArray(valor)) {
    return valor.map((item) => mascararEmails(item)) as T;
  }

  if (valor && typeof valor === 'object' && !(valor instanceof Error)) {
    return Object.fromEntries(
      Object.entries(valor).map(([chave, item]) => [chave, mascararEmails(item)])
    ) as T;
  }

  return valor;
}

const mascarar = winston.format((info) => {
  for (const chave of Object.keys(info)) {
    info[chave] = mascararEmails(info[chave]);
  }
  return info;
});

const logger = winston.createLogger({
  level: ambiente.nivelLog,
  format: winston.format.combine(
    mascarar(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'sd-email-api' },
  transports: [new winston.transports.Console()]
});

export default logger;
