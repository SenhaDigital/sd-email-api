import mongoose from 'mongoose';
import logger from './logger';

// Nome da coleção para armazenar informações dos emails
export const EMAIL_COLLECTION = process.env.EMAIL_COLLECTION || 'emails';

// URI de conexão com o MongoDB
const MONGODB_URI = process.env.DATABASE_URL;

if (!MONGODB_URI) {
  logger.error('Variável de ambiente DATABASE_URL não definida');
  throw new Error('DATABASE_URL é obrigatório para conexão com MongoDB');
}

// Esquema para os documentos de email
const emailSchema = new mongoose.Schema({
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

// Configuração da conexão MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('Conectado ao MongoDB com sucesso');
  })
  .catch((error) => {
    logger.error(`Erro ao conectar ao MongoDB: ${error.message}`);
  });

// Modelo para operações no MongoDB
export const EmailModel = mongoose.model('Email', emailSchema, EMAIL_COLLECTION);

// Funções auxiliares para operações CRUD
export const mongoUtils = {
  // Criar um novo documento
  async putItem(item: any): Promise<void> {
    await EmailModel.create(item);
  },

  // Obter um documento pelo id
  async getItem(id: string): Promise<any> {
    return EmailModel.findOne({ id }).lean();
  },
  
  // Atualizar um documento
  async updateItem(id: string, updateData: any): Promise<void> {
    await EmailModel.updateOne(
      { id }, 
      { 
        $set: { ...updateData, updatedAt: new Date() },
        $inc: { attempts: 1 }
      }
    );
  },
  
  // Listar documentos com filtro opcional
  async queryItems(filter: any = {}): Promise<any[]> {
    return EmailModel.find(filter).sort({ createdAt: -1 }).lean();
  }
};

export default mongoUtils;
