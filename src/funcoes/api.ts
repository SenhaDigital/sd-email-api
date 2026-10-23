import { APIGatewayProxyEvent } from 'aws-lambda';
import logger from '../utilitarios/logger';
import { comAutenticacao } from '../seguranca/autenticacao';
import { respostaJson } from '../utilitarios/resposta';
import { mostrarOpenApi, mostrarSwagger } from '../rotas/documentacao';
import { enviar } from '../rotas/enviar';
import { validarEmail } from '../rotas/validarEmail';
import { consultarStatus } from '../rotas/consultarStatus';

async function rotear(event: APIGatewayProxyEvent) {
  try {
    logger.info({
      message: 'Requisição recebida',
      path: event.path,
      method: event.httpMethod
    });

    const caminho = event.path.replace(/^\/(api|sdsend)/, '');
    const metodo = event.httpMethod;

    if (caminho === '/email/swagger' && metodo === 'GET') {
      return mostrarSwagger();
    }

    if (caminho === '/email/swagger.yaml' && metodo === 'GET') {
      return mostrarOpenApi();
    }

    if (caminho === '/email/send' && metodo === 'POST') {
      return await enviar(event);
    }

    if (caminho === '/email/validate-email' && metodo === 'POST') {
      return await validarEmail(event);
    }

    if (caminho.startsWith('/email/status/') && metodo === 'GET') {
      const jobId = event.pathParameters?.jobId;
      if (jobId) {
        return await consultarStatus(jobId);
      }
    }

    return respostaJson(404, { success: false, error: 'Rota não encontrada' }, { credenciais: true });
  } catch (error) {
    logger.error({
      message: 'Erro ao processar requisição',
      error: error.message,
      stack: error.stack
    });

    return respostaJson(500, {
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}

export const handler = comAutenticacao(rotear);
