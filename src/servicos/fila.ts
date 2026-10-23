import { SQS } from '@aws-sdk/client-sqs';
import { ambiente } from '../config/ambiente';

const sqs = new SQS({});

export function urlDaFila(nome: string | undefined) {
  return `https://sqs.${ambiente.regiao}.amazonaws.com/${ambiente.contaAws}/${nome}`;
}

export async function publicarJob(urlFila: string, jobId: string, tipo: string) {
  await sqs.sendMessage({
    QueueUrl: urlFila,
    MessageBody: JSON.stringify({ jobId }),
    MessageAttributes: {
      jobType: {
        DataType: 'String',
        StringValue: tipo
      }
    }
  });
}
