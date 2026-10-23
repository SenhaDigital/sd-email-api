import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import logger from '../utils/logger';

type LambdaHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

export const withApiKeyAuth = (handler: LambdaHandler) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const requestPath = event.path || '';

    if (requestPath.endsWith('/swagger') || requestPath.endsWith('/swagger.yaml')) {
      return handler(event);
    }

    const authHeader = event.headers?.Authorization || event.headers?.authorization || '';
    const trimmedHeader = authHeader.trim();

    if (!trimmedHeader) {
      logger.warn('Tentativa de acesso sem cabeçalho Authorization', {
        ip: event.requestContext.identity?.sourceIp,
        path: event.path
      });

      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Não autorizado',
          message: 'Cabeçalho Authorization não fornecido'
        })
      };
    }

    if (/^AWS4-HMAC-SHA256/i.test(trimmedHeader)) {
      logger.warn('Requisição aceita via cabeçalho AWS Signature v4', {
        ip: event.requestContext.identity?.sourceIp,
        userAgent: event.requestContext.identity?.userAgent,
        path: event.path
      });
      return handler(event);
    }

    const apiKey = process.env.API_SDSEND_KEY;

    if (!apiKey) {
      logger.error('API_SDSEND_KEY não configurada no ambiente');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Erro de configuração do servidor' })
      };
    }

    if (!trimmedHeader.startsWith('Bearer ')) {
      logger.warn('Formato de Authorization não suportado', {
        ip: event.requestContext.identity?.sourceIp,
        path: event.path
      });

      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Não autorizado',
          message: 'Formato de Authorization inválido'
        })
      };
    }

    const token = trimmedHeader.replace(/^Bearer\s+/i, '').trim();

    if (token !== apiKey) {
      logger.warn('Tentativa de acesso não autorizado', {
        ip: event.requestContext.identity?.sourceIp,
        path: event.path
      });

      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Não autorizado',
          message: 'Chave de API inválida'
        })
      };
    }

    return handler(event);
  };
};
