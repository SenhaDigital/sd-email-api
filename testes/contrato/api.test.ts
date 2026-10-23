import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CHAVE_API, carregarFuncao, estado, eventoHttp, limparEstado } from '../apoio/ambiente';

const BEARER = `Bearer ${CHAVE_API}`;

const payloadsDosClientes: Record<string, any> = {
  'api-sdgs-agenda': {
    to: 'cliente@senhadigital.com.br',
    subject: 'Agendamento confirmado',
    html: '<p>Seu agendamento foi confirmado</p>',
    fromName: 'Agendamento Senha Digital'
  },
  'loja e novo-modelo-agendamento': {
    fromName: 'Senha Digital',
    to: ['cliente@senhadigital.com.br'],
    subject: 'Pedido recebido',
    html: '<p>Recebemos seu pedido</p>'
  },
  'api-sdc-solicitacao-open': {
    to: 'cliente@senhadigital.com.br',
    subject: 'Organização aprovada',
    html: '<p>Aprovada</p>',
    fromName: 'SD Consulta | Organização Aprovada'
  },
  SDCRM: {
    to: 'cliente@senhadigital.com.br',
    subject: 'Contato',
    body: 'Texto simples',
    html: '<p>Texto simples</p>'
  }
};

let api: any;

beforeAll(async () => {
  api = await carregarFuncao('api');
});

beforeEach(() => {
  limparEstado();
  process.env.STAGE = 'prod';
});

describe('POST /email/send', () => {
  for (const [cliente, payload] of Object.entries(payloadsDosClientes)) {
    for (const prefixo of ['/api', '/sdsend']) {
      it(`aceita o payload de ${cliente} em ${prefixo}`, async () => {
        const resposta = await api(
          eventoHttp({ metodo: 'POST', caminho: `${prefixo}/email/send`, corpo: payload, autorizacao: BEARER })
        );

        expect(resposta.statusCode).toBe(201);
        const corpo = JSON.parse(resposta.body);
        expect(corpo).toEqual({
          success: true,
          message: 'Email enviado para processamento',
          jobId: expect.any(String)
        });
        expect(resposta.headers['Access-Control-Allow-Origin']).toBe('*');
        expect(estado.documentos).toHaveLength(1);
        expect(estado.documentos[0].id).toBe(corpo.jobId);
        expect(estado.documentos[0].status).toBe('PENDING');
      });
    }
  }

  it('em prod publica o jobId na fila de validação', async () => {
    const resposta = await api(
      eventoHttp({ metodo: 'POST', caminho: '/api/email/send', corpo: payloadsDosClientes.SDCRM, autorizacao: BEARER })
    );
    const { jobId } = JSON.parse(resposta.body);

    expect(estado.mensagensFila).toHaveLength(1);
    expect(estado.mensagensFila[0].QueueUrl).toBe('https://sqs.sa-east-1.amazonaws.com/000000000000/fila-validacao');
    expect(JSON.parse(estado.mensagensFila[0].MessageBody)).toEqual({ jobId });
    expect(estado.emailsEnviados).toHaveLength(0);
  });

  it('em dev envia direto sem passar pela fila', async () => {
    process.env.STAGE = 'dev';
    const resposta = await api(
      eventoHttp({ metodo: 'POST', caminho: '/api/email/send', corpo: payloadsDosClientes.SDCRM, autorizacao: BEARER })
    );

    expect(resposta.statusCode).toBe(201);
    expect(estado.mensagensFila).toHaveLength(0);
    expect(estado.emailsEnviados).toHaveLength(1);
    expect(estado.documentos[0].status).toBe('SENT');
    expect(estado.documentos[0].attempts).toBe(1);
  });

  it('a consulta de status traz o resultado do envio', async () => {
    process.env.STAGE = 'dev';
    const envio = await api(
      eventoHttp({ metodo: 'POST', caminho: '/api/email/send', corpo: payloadsDosClientes.SDCRM, autorizacao: BEARER })
    );
    const { jobId } = JSON.parse(envio.body);

    const resposta = await api(
      eventoHttp({ metodo: 'GET', caminho: `/api/email/status/${jobId}`, autorizacao: BEARER, jobId })
    );

    expect(JSON.parse(resposta.body).job).toMatchObject({
      status: 'SENT',
      attempts: 1,
      sendResult: { messageId: 'mensagem-1' }
    });
  });

  it('em dev responde 201 mesmo quando o SMTP falha', async () => {
    process.env.STAGE = 'dev';
    estado.falharEnvio = true;
    const resposta = await api(
      eventoHttp({ metodo: 'POST', caminho: '/api/email/send', corpo: payloadsDosClientes.SDCRM, autorizacao: BEARER })
    );

    expect(resposta.statusCode).toBe(201);
    expect(estado.documentos[0].status).toBe('FAILED');
  });

  it('usa o remetente padrão e o nome SD Consulta', async () => {
    process.env.STAGE = 'dev';
    await api(
      eventoHttp({
        metodo: 'POST',
        caminho: '/api/email/send',
        corpo: payloadsDosClientes['api-sdgs-agenda'],
        autorizacao: BEARER
      })
    );

    expect(estado.emailsEnviados[0].from).toEqual({
      name: 'SD Consulta',
      address: 'no.reply@senhadigital.com.br'
    });
  });

  it('ignora o remetente enviado pelo cliente', async () => {
    process.env.STAGE = 'dev';
    await api(
      eventoHttp({
        metodo: 'POST',
        caminho: '/api/email/send',
        corpo: { ...payloadsDosClientes.SDCRM, from: 'falso@outrodominio.com' },
        autorizacao: BEARER
      })
    );

    expect(estado.emailsEnviados[0].from.address).toBe('no.reply@senhadigital.com.br');
    expect(estado.documentos[0].emailRequest.from).toBeUndefined();
  });

  it('responde 400 sem os campos obrigatórios', async () => {
    const resposta = await api(
      eventoHttp({ metodo: 'POST', caminho: '/api/email/send', corpo: { to: 'a@b.com' }, autorizacao: BEARER })
    );

    expect(resposta.statusCode).toBe(400);
    expect(JSON.parse(resposta.body)).toEqual({
      success: false,
      error: 'Campos obrigatórios: to, subject, e body ou html'
    });
  });
});

describe('GET /email/status/{jobId}', () => {
  it('devolve o job existente', async () => {
    const envio = await api(
      eventoHttp({ metodo: 'POST', caminho: '/api/email/send', corpo: payloadsDosClientes.SDCRM, autorizacao: BEARER })
    );
    const { jobId } = JSON.parse(envio.body);

    const resposta = await api(
      eventoHttp({ metodo: 'GET', caminho: `/api/email/status/${jobId}`, autorizacao: BEARER, jobId })
    );

    expect(resposta.statusCode).toBe(200);
    const corpo = JSON.parse(resposta.body);
    expect(corpo.success).toBe(true);
    expect(corpo.job).toMatchObject({ id: jobId, status: 'PENDING', attempts: 0 });
    expect(Object.keys(corpo.job)).toEqual(['id', 'status', 'createdAt', 'updatedAt', 'attempts']);
  });

  it('responde 404 para job inexistente', async () => {
    const resposta = await api(
      eventoHttp({ metodo: 'GET', caminho: '/sdsend/email/status/nao-existe', autorizacao: BEARER, jobId: 'nao-existe' })
    );

    expect(resposta.statusCode).toBe(404);
    expect(JSON.parse(resposta.body)).toEqual({ success: false, error: 'Job não encontrado' });
  });
});

describe('POST /email/validate-email', () => {
  it('valida um email com MX', async () => {
    const resposta = await api(
      eventoHttp({
        metodo: 'POST',
        caminho: '/api/email/validate-email',
        corpo: { email: 'cliente@senhadigital.com.br' },
        autorizacao: BEARER
      })
    );

    expect(resposta.statusCode).toBe(200);
    expect(JSON.parse(resposta.body)).toEqual({ success: true, email: 'cliente@senhadigital.com.br', valid: true });
  });

  it('recusa domínio sem MX', async () => {
    const resposta = await api(
      eventoHttp({
        metodo: 'POST',
        caminho: '/api/email/validate-email',
        corpo: { email: 'cliente@semmx.com.br' },
        autorizacao: BEARER
      })
    );

    expect(JSON.parse(resposta.body)).toEqual({
      success: true,
      email: 'cliente@semmx.com.br',
      valid: false,
      reason: 'Não foi possível verificar os registros MX do domínio'
    });
  });

  it('responde 400 sem email', async () => {
    const resposta = await api(
      eventoHttp({ metodo: 'POST', caminho: '/api/email/validate-email', corpo: {}, autorizacao: BEARER })
    );

    expect(resposta.statusCode).toBe(400);
  });
});

describe('autenticação', () => {
  const envio = (autorizacao?: string) =>
    api(eventoHttp({ metodo: 'POST', caminho: '/api/email/send', corpo: payloadsDosClientes.SDCRM, autorizacao }));

  it('responde 401 sem Authorization', async () => {
    const resposta = await envio();
    expect(resposta.statusCode).toBe(401);
    expect(JSON.parse(resposta.body).message).toBe('Cabeçalho Authorization não fornecido');
  });

  it('responde 401 com chave errada', async () => {
    const resposta = await envio('Bearer outra-chave');
    expect(resposta.statusCode).toBe(401);
    expect(JSON.parse(resposta.body).message).toBe('Chave de API inválida');
  });

  it('responde 401 com formato que não é Bearer', async () => {
    const resposta = await envio(`Basic ${CHAVE_API}`);
    expect(resposta.statusCode).toBe(401);
    expect(JSON.parse(resposta.body).message).toBe('Formato de Authorization inválido');
  });

  it('recusa cabeçalho AWS4-HMAC-SHA256', async () => {
    const resposta = await envio('AWS4-HMAC-SHA256 Credential=qualquer');
    expect(resposta.statusCode).toBe(401);
    expect(JSON.parse(resposta.body).message).toBe('Formato de Authorization inválido');
    expect(estado.documentos).toHaveLength(0);
  });

  it('aceita chaves adicionais de API_SDSEND_KEYS sem invalidar a principal', async () => {
    process.env.API_SDSEND_KEYS = 'chave-loja, chave-crm';
    try {
      expect((await envio('Bearer chave-crm')).statusCode).toBe(201);
      expect((await envio('Bearer chave-loja')).statusCode).toBe(201);
      expect((await envio(BEARER)).statusCode).toBe(201);
      expect((await envio('Bearer chave-')).statusCode).toBe(401);
    } finally {
      delete process.env.API_SDSEND_KEYS;
    }
  });

  it('responde 500 quando nenhuma chave está configurada', async () => {
    const chave = process.env.API_SDSEND_KEY;
    delete process.env.API_SDSEND_KEY;
    try {
      const resposta = await envio(BEARER);
      expect(resposta.statusCode).toBe(500);
      expect(JSON.parse(resposta.body)).toEqual({ error: 'Erro de configuração do servidor' });
    } finally {
      process.env.API_SDSEND_KEY = chave;
    }
  });

  it('libera o Swagger sem autenticação', async () => {
    const ui = await api(eventoHttp({ metodo: 'GET', caminho: '/api/email/swagger' }));
    const yaml = await api(eventoHttp({ metodo: 'GET', caminho: '/api/email/swagger.yaml' }));

    expect(ui.statusCode).toBe(200);
    expect(ui.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(yaml.statusCode).toBe(200);
    expect(yaml.body).toContain('openapi');
  });
});

it('responde 404 para rota desconhecida', async () => {
  const resposta = await api(eventoHttp({ metodo: 'GET', caminho: '/api/email/outra', autorizacao: BEARER }));

  expect(resposta.statusCode).toBe(404);
  expect(JSON.parse(resposta.body)).toEqual({ success: false, error: 'Rota não encontrada' });
  expect(resposta.headers['Access-Control-Allow-Credentials']).toBe(true);
});
