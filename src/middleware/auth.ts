import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import logger from '../utils/logger';

type LambdaHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

export const withApiKeyAuth = (handler: LambdaHandler) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const apiKey = process.env.API_SDSEND_KEY;
    
    // Se a chave de API não estiver configurada, retorna erro
    if (!apiKey) {
      logger.error('API_SDSEND_KEY não configurada no ambiente');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Erro de configuração do servidor' })
      };
    }

    // Obtém a chave do cabeçalho Authorization
    const authHeader = event.headers?.Authorization || event.headers?.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    // Verifica se a chave é válida
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
          message: 'Chave de API inválida ou não fornecida'
        })
      };
    }

    // Se a autenticação for bem-sucedida, chama o handler original
    return handler(event);
  };
};
