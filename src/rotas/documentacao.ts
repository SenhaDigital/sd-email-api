import { readFileSync } from 'fs';
import { join } from 'path';
import logger from '../utilitarios/logger';
import { respostaJson, respostaTexto } from '../utilitarios/resposta';

const caminhoOpenApi = join(process.cwd(), 'docs', 'openapi.yml');
let especificacaoEmCache: string | null = null;

function carregarEspecificacao(): string {
  if (especificacaoEmCache) {
    return especificacaoEmCache;
  }

  try {
    especificacaoEmCache = readFileSync(caminhoOpenApi, 'utf-8');
    return especificacaoEmCache;
  } catch (error) {
    logger.error('Erro ao carregar arquivo Swagger', { error: (error as Error).message });
    throw error;
  }
}

const paginaSwagger = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>SD Email API - Swagger</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin="anonymous"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function () {
        window.ui = SwaggerUIBundle({
          url: './swagger.yaml',
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.apis],
          layout: 'BaseLayout'
        });
      });
    </script>
  </body>
</html>`;

export function mostrarSwagger() {
  return respostaTexto(200, 'text/html; charset=utf-8', paginaSwagger);
}

export function mostrarOpenApi() {
  try {
    return respostaTexto(200, 'application/yaml; charset=utf-8', carregarEspecificacao());
  } catch (error) {
    return respostaJson(500, {
      success: false,
      error: 'Erro ao carregar documentação',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
