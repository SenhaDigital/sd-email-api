import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { join } from 'path';
import { vi } from 'vitest';

export const CHAVE_API = 'chave-de-teste';

process.env.DATABASE_URL = 'mongodb://teste';
process.env.API_SDSEND_KEY = CHAVE_API;
process.env.REGION = 'sa-east-1';
process.env.ACCOUNT_ID = '000000000000';
process.env.EMAIL_QUEUE_NAME = 'fila-validacao';
process.env.SEND_EMAIL_QUEUE_NAME = 'fila-envio';
process.env.DEFAULT_FROM_EMAIL = 'no.reply@senhadigital.com.br';
process.env.LOG_LEVEL = 'error';

export const estado = {
  documentos: [] as any[],
  mensagensFila: [] as any[],
  emailsEnviados: [] as any[],
  falharEnvio: false
};

vi.mock('mongoose', () => {
  const aplicarSet = (doc: any, set: any) => {
    for (const [chave, valor] of Object.entries(set)) {
      const partes = chave.split('.');
      let alvo = doc;
      while (partes.length > 1) {
        const parte = partes.shift() as string;
        alvo[parte] = alvo[parte] || {};
        alvo = alvo[parte];
      }
      alvo[partes[0]] = valor;
    }
  };

  const modelo = {
    create: async (item: any) => {
      estado.documentos.push(JSON.parse(JSON.stringify(item)));
    },
    findOne: (filtro: any) => ({
      lean: async () => estado.documentos.find((d) => d.id === filtro.id) || null
    }),
    updateOne: async (filtro: any, atualizacao: any) => {
      const doc = estado.documentos.find((d) => d.id === filtro.id);
      if (!doc) return;
      if (atualizacao.$set) aplicarSet(doc, atualizacao.$set);
      if (atualizacao.$inc) {
        for (const [chave, valor] of Object.entries(atualizacao.$inc)) {
          doc[chave] = (doc[chave] || 0) + (valor as number);
        }
      }
    },
    find: () => ({
      sort: () => ({ lean: async () => estado.documentos })
    })
  };

  class Schema {
    constructor(public definicao: any) {}
  }

  const mongoose = {
    Schema,
    connect: async () => undefined,
    model: () => modelo
  };

  return { default: mongoose, ...mongoose };
});

vi.mock('@aws-sdk/client-sqs', () => ({
  SQS: class {
    async sendMessage(parametros: any) {
      estado.mensagensFila.push(parametros);
      return {};
    }
  }
}));

function criarTransporte() {
  return {
    sendMail: async (opcoes: any) => {
      if (estado.falharEnvio) throw new Error('falha smtp');
      estado.emailsEnviados.push(opcoes);
      return {
        messageId: 'mensagem-1',
        accepted: [opcoes.to],
        rejected: [],
        pending: [],
        response: '250 OK'
      };
    }
  };
}

const requireCjs = createRequire(__filename);
const { transformSync } = requireCjs('esbuild');
const Modulo = requireCjs('module');

Modulo._extensions['.ts'] = (modulo: any, arquivo: string) => {
  const { code } = transformSync(readFileSync(arquivo, 'utf-8'), { loader: 'ts', format: 'cjs' });
  modulo._compile(code, arquivo);
};

requireCjs('nodemailer').createTransport = criarTransporte;

vi.mock('nodemailer', () => {
  const nodemailer = { createTransport: criarTransporte };
  return { default: nodemailer, ...nodemailer };
});

vi.mock('dns', () => {
  const dns = {
    resolveMx: (dominio: string, retorno: Function) => {
      if (dominio === 'semmx.com.br') return retorno(new Error('ENOTFOUND'));
      retorno(null, [{ exchange: `mx.${dominio}`, priority: 10 }]);
    }
  };
  return { default: dns, ...dns };
});

export function limparEstado() {
  estado.documentos.length = 0;
  estado.mensagensFila.length = 0;
  estado.emailsEnviados.length = 0;
  estado.falharEnvio = false;
}

export async function carregarFuncao(nome: string) {
  const serverless = readFileSync(join(__dirname, '..', '..', 'serverless.yml'), 'utf-8');
  const encontrado = serverless.match(new RegExp(`^  ${nome}:\\n    handler: (\\S+)`, 'm'));
  if (!encontrado) throw new Error(`Função ${nome} não encontrada no serverless.yml`);
  const caminho = encontrado[1];
  const separador = caminho.lastIndexOf('.');
  const modulo = await import(join(__dirname, '..', '..', caminho.slice(0, separador)));
  return modulo[caminho.slice(separador + 1)];
}

export function eventoHttp(opcoes: {
  metodo: string;
  caminho: string;
  corpo?: any;
  autorizacao?: string;
  jobId?: string;
}): any {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opcoes.autorizacao !== undefined) headers.Authorization = opcoes.autorizacao;
  return {
    httpMethod: opcoes.metodo,
    path: opcoes.caminho,
    headers,
    body: opcoes.corpo === undefined ? null : JSON.stringify(opcoes.corpo),
    pathParameters: opcoes.jobId ? { jobId: opcoes.jobId } : null,
    requestContext: { identity: { sourceIp: '10.0.0.1', userAgent: 'teste' } }
  };
}

export function eventoFila(jobId: string): any {
  return { Records: [{ body: JSON.stringify({ jobId }) }] };
}
