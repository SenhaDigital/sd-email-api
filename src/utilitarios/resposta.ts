import { APIGatewayProxyResult } from 'aws-lambda';

export function respostaJson(
  statusCode: number,
  corpo: unknown,
  opcoes: { credenciais?: boolean } = {}
): APIGatewayProxyResult {
  const headers: Record<string, string | boolean> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (opcoes.credenciais) {
    headers['Access-Control-Allow-Credentials'] = true;
  }

  return { statusCode, headers, body: JSON.stringify(corpo) };
}

export function respostaNaoAutorizada(statusCode: number, corpo: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  };
}

export function respostaTexto(statusCode: number, contentType: string, corpo: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    },
    body: corpo
  };
}
