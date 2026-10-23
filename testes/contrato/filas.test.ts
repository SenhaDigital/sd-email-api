import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { carregarFuncao, estado, eventoFila, limparEstado } from '../apoio/ambiente';

let validacao: any;
let envio: any;

const job = (id: string, to: any, status = 'PENDING') => ({
  id,
  status,
  emailRequest: { to, subject: 'Assunto', html: '<p>oi</p>', fromName: 'Agendamento Senha Digital' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  attempts: 0
});

beforeAll(async () => {
  validacao = await carregarFuncao('processEmail');
  envio = await carregarFuncao('sendEmail');
});

beforeEach(() => {
  limparEstado();
});

describe('fila de validação', () => {
  it('valida, grava os emails válidos e publica na fila de envio', async () => {
    estado.documentos.push(job('j1', 'a@senhadigital.com.br, b@semmx.com.br'));

    await validacao(eventoFila('j1'), {} as any, () => undefined);

    const doc = estado.documentos[0];
    expect(doc.status).toBe('VALIDATED');
    expect(doc.attempts).toBe(0);
    expect(doc.validationResult.validEmails).toEqual(['a@senhadigital.com.br']);
    expect(doc.emailRequest.to).toBe('a@senhadigital.com.br');
    expect(estado.mensagensFila).toHaveLength(1);
    expect(estado.mensagensFila[0].QueueUrl).toBe('https://sqs.sa-east-1.amazonaws.com/000000000000/fila-envio');
    expect(JSON.parse(estado.mensagensFila[0].MessageBody)).toEqual({ jobId: 'j1' });
  });

  it('marca VALIDATION_FAILED quando nenhum email é válido', async () => {
    estado.documentos.push(job('j2', ['x@semmx.com.br']));

    await validacao(eventoFila('j2'), {} as any, () => undefined);

    expect(estado.documentos[0].status).toBe('VALIDATION_FAILED');
    expect(estado.documentos[0].errorMessage).toBe(
      'Email inválido: x@semmx.com.br (Não foi possível verificar os registros MX do domínio)'
    );
    expect(estado.mensagensFila).toHaveLength(0);
  });

  it('ignora job inexistente', async () => {
    await validacao(eventoFila('nao-existe'), {} as any, () => undefined);
    expect(estado.mensagensFila).toHaveLength(0);
  });
});

describe('fila de envio', () => {
  it('envia e marca SENT', async () => {
    estado.documentos.push(job('j3', 'a@senhadigital.com.br', 'VALIDATED'));

    await envio(eventoFila('j3'), {} as any, () => undefined);

    expect(estado.emailsEnviados).toHaveLength(1);
    expect(estado.emailsEnviados[0].to).toBe('a@senhadigital.com.br');
    expect(estado.emailsEnviados[0].from.name).toBe('Agendamento Senha Digital');
    expect(estado.documentos[0].status).toBe('SENT');
    expect(estado.documentos[0].sendResult.messageId).toBe('mensagem-1');
    expect(estado.documentos[0].attempts).toBe(1);
  });

  it('marca FAILED e devolve erro para a fila tentar de novo quando o SMTP falha', async () => {
    estado.falharEnvio = true;
    estado.documentos.push(job('j4', 'a@senhadigital.com.br', 'VALIDATED'));

    await expect(envio(eventoFila('j4'), {} as any, () => undefined)).rejects.toThrow('falha smtp');

    expect(estado.documentos[0].status).toBe('FAILED');
    expect(estado.documentos[0].sendResult.error).toBe('falha smtp');
    expect(estado.documentos[0].attempts).toBe(1);
  });

  it('envia na nova tentativa depois de uma falha', async () => {
    estado.falharEnvio = true;
    estado.documentos.push(job('j6', 'a@senhadigital.com.br', 'VALIDATED'));
    await expect(envio(eventoFila('j6'), {} as any, () => undefined)).rejects.toThrow();

    estado.falharEnvio = false;
    await envio(eventoFila('j6'), {} as any, () => undefined);

    expect(estado.emailsEnviados).toHaveLength(1);
    expect(estado.documentos[0].status).toBe('SENT');
    expect(estado.documentos[0].attempts).toBe(2);
  });

  it('não reenvia job já enviado', async () => {
    estado.documentos.push(job('j5', 'a@senhadigital.com.br', 'SENT'));

    await envio(eventoFila('j5'), {} as any, () => undefined);

    expect(estado.emailsEnviados).toHaveLength(0);
  });
});
