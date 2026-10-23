import winston from 'winston';
import { ambiente } from '../config/ambiente';

const logger = winston.createLogger({
  level: ambiente.nivelLog,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'sd-email-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export default logger;
