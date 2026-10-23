import mongoose from 'mongoose';
import logger from '../utilitarios/logger';
import { ambiente } from '../config/ambiente';

const urlBanco = ambiente.urlBanco;

if (!urlBanco) {
  logger.error('Variável de ambiente DATABASE_URL não definida');
  throw new Error('DATABASE_URL é obrigatório para conexão com MongoDB');
}

const esquemaJobEmail = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  status: { type: String, required: true },
  emailRequest: {
    to: { type: [String], required: true },
    subject: { type: String, required: true },
    body: String,
    html: String,
    from: String,
    fromName: String,
    attachments: Array
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  sentAt: Date,
  errorMessage: String,
  attempts: { type: Number, default: 0 }
});

mongoose.connect(urlBanco)
  .then(() => {
    logger.info('Conectado ao MongoDB com sucesso');
  })
  .catch((error) => {
    logger.error(`Erro ao conectar ao MongoDB: ${error.message}`);
  });

const ModeloJobEmail = mongoose.model('Email', esquemaJobEmail, ambiente.colecaoEmails);

export const jobsEmail = {
  async criar(job: any): Promise<void> {
    await ModeloJobEmail.create(job);
  },

  async buscar(id: string): Promise<any> {
    return ModeloJobEmail.findOne({ id }).lean();
  },

  async atualizar(id: string, dados: any): Promise<void> {
    await ModeloJobEmail.updateOne(
      { id },
      {
        $set: { ...dados, updatedAt: new Date() },
        $inc: { attempts: 1 }
      }
    );
  }
};
