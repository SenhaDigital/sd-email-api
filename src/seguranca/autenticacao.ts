import { createHash, timingSafeEqual } from 'crypto';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import logger from '../utilitarios/logger';
import { ambiente } from '../config/ambiente';
import { respostaNaoAutorizada } from '../utilitarios/resposta';

type FuncaoHttp = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

function origem(event: APIGatewayProxyEvent) {
  return {
    ip: event.requestContext.identity?.sourceIp,
    path: event.path
  };
}

function resumo(valor: string) {
  return createHash('sha256').update(valor).digest();
}

function chaveValida(token: string, chaves: string[]) {
  const recebida = resumo(token);
  return chaves.some((chave) => timingSafeEqual(recebida, resumo(chave)));
}

function naoAutorizado(mensagem: string) {
  return respostaNaoAutorizada(401, { error: 'Não autorizado', message: mensagem });
}

export const comAutenticacao = (funcao: FuncaoHttp): FuncaoHttp => {
  return async (event) => {
    const caminho = event.path || '';

    if (caminho.endsWith('/swagger') || caminho.endsWith('/swagger.yaml')) {
      return funcao(event);
    }

    const cabecalho = (event.headers?.Authorization || event.headers?.authorization || '').trim();

    if (!cabecalho) {
      logger.warn('Tentativa de acesso sem cabeçalho Authorization', origem(event));
      return naoAutorizado('Cabeçalho Authorization não fornecido');
    }

    if (/^AWS4-HMAC-SHA256/i.test(cabecalho)) {
      logger.warn('Requisição aceita via cabeçalho AWS Signature v4', {
        ip: event.requestContext.identity?.sourceIp,
        userAgent: event.requestContext.identity?.userAgent,
        path: event.path
      });
      return funcao(event);
    }

    const chavesApi = ambiente.chavesApi;

    if (chavesApi.length === 0) {
      logger.error('API_SDSEND_KEY não configurada no ambiente');
      return respostaNaoAutorizada(500, { error: 'Erro de configuração do servidor' });
    }

    if (!cabecalho.startsWith('Bearer ')) {
      logger.warn('Formato de Authorization não suportado', origem(event));
      return naoAutorizado('Formato de Authorization inválido');
    }

    const token = cabecalho.replace(/^Bearer\s+/i, '').trim();

    if (!chaveValida(token, chavesApi)) {
      logger.warn('Tentativa de acesso não autorizado', origem(event));
      return naoAutorizado('Chave de API inválida');
    }

    return funcao(event);
  };
};
