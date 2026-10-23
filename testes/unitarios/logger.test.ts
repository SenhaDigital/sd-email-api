import { describe, expect, it } from 'vitest';
import { mascararEmails } from '../../src/utilitarios/logger';

describe('mascararEmails', () => {
  it('mascara emails dentro de textos', () => {
    expect(mascararEmails('Enviando email para: joao.silva@gmail.com,ana@senhadigital.com.br')).toBe(
      'Enviando email para: jo***@gmail.com,an***@senhadigital.com.br'
    );
  });

  it('mascara emails em objetos e listas', () => {
    expect(
      mascararEmails({ to: ['maria@empresa.com.br'], detalhes: { reply: 'x@y.com' }, total: 2 })
    ).toEqual({ to: ['ma***@empresa.com.br'], detalhes: { reply: 'x***@y.com' }, total: 2 });
  });

  it('mantém textos sem email', () => {
    expect(mascararEmails('Job 123 enviado para fila de envio')).toBe('Job 123 enviado para fila de envio');
  });
});
