import { APIGatewayProxyEvent } from 'aws-lambda';
import logger from '../utilitarios/logger';
import { validarEmail as validarEnderecoEmail } from '../servicos/validacaoEmail';
import { respostaJson } from '../utilitarios/resposta';

export async function validarEmail(event: APIGatewayProxyEvent) {
  try {
    const { email } = JSON.parse(event.body || '{}');

    if (!email) {
      return respostaJson(400, {
        success: false,
        error: 'Campo obrigatório: email'
      });
    }

    const resultado = await validarEnderecoEmail(email);

    return respostaJson(200, {
      success: true,
      email,
      ...resultado
    });
  } catch (error) {
    logger.error('Erro ao processar requisição', { error });

    return respostaJson(
      500,
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { credenciais: true }
    );
  }
}
